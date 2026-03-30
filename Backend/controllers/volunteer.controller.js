const Issue = require("../models/issue");
const Resolution = require("../models/resolution");
const { RESOLUTION_TYPES } = require("../models/resolution");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { assertIssueStatusChange, HANDLING_MODE } = require("../config/issueStatusMachine");
const {
  createNotification,
  notifyVolunteerClaimed,
  notifyIssueResolved,
  notifyCitizenVerificationRequest,
} = require("../services/notification.service");
const { normalizeMulterFiles, persistUploadedFiles } = require("../services/imageAsset.service");
const { normalizeImageArray } = require("../utils/imageNormalize");
const { recomputeIssuePriority } = require("../services/priority.service");
const appConfig = require("../config/appConfig");
const { logAudit } = require("../services/audit.service");

function auditCtx(req) {
  return {
    ip: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 512),
    requestPath: req.originalUrl || "",
    requestMethod: req.method || "",
  };
}

function normalizeProofInput(rawProof) {
  if (Array.isArray(rawProof)) return normalizeImageArray(rawProof);
  if (typeof rawProof !== "string") return [];

  const trimmed = rawProof.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeImageArray(parsed);
      }
    } catch (_) {}
  }

  return normalizeImageArray(
    trimmed
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
  );
}

exports.getAvailableIssues = async (req, res) => {
  try {
    const issues = await Issue.find({
      $and: [
        { status: { $in: [ISSUE_STATUS.REPORTED, ISSUE_STATUS.UNDER_REVIEW] } },
        { $or: [{ volunteer: { $exists: false } }, { volunteer: null }] },
        { reportedBy: { $ne: req.user._id } },
        {
          $or: [
            { handlingMode: { $exists: false } },
            { handlingMode: null },
            { handlingMode: HANDLING_MODE.UNASSIGNED },
          ],
        },
      ],
    })
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(100)
      .populate("reportedBy", "name");

    return apiResponse(res, 200, "Available issues fetched", issues);
  } catch (error) {
    console.error("Volunteer available issues error:", error);
    return apiResponse(res, 500, "Failed to fetch available issues");
  }
};

exports.claimIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const issue = await Issue.findById(issueId);

    if (!issue) return apiResponse(res, 404, "Issue not found");
    if (String(issue.reportedBy) === String(req.user._id)) {
      return apiResponse(res, 400, "You cannot volunteer on an issue you reported.");
    }
    if (issue.handlingMode === HANDLING_MODE.OFFICER_WORKER) {
      return apiResponse(
        res,
        409,
        "This issue is already being handled through the municipal worker workflow. Volunteers cannot claim it."
      );
    }
    if (issue.volunteer && String(issue.volunteer) !== String(req.user._id)) {
      return apiResponse(res, 400, "Issue already claimed by another volunteer");
    }

    if (![ISSUE_STATUS.REPORTED, ISSUE_STATUS.UNDER_REVIEW].includes(issue.status)) {
      return apiResponse(res, 400, "Issue is not available for volunteer claim");
    }

    const ac = assertIssueStatusChange({
      issue,
      nextStatus: ISSUE_STATUS.VOLUNTEER_CLAIMED,
      user: req.user,
      context: { isVolunteerAssignee: true },
    });
    if (!ac.ok) {
      return apiResponse(res, ac.statusCode, ac.message);
    }

    issue.volunteer = req.user._id;
    issue.status = ISSUE_STATUS.VOLUNTEER_CLAIMED;
    issue.handlingMode = HANDLING_MODE.VOLUNTEER;
    issue.volunteerClaimedAt = new Date();
    await issue.save();

    await notifyVolunteerClaimed(issue, req.user);
    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "volunteer.claim",
      resourceType: "issue",
      resourceId: issue._id,
      detail: "Volunteer claimed issue",
      ...auditCtx(req),
    });

    return apiResponse(res, 200, "Issue claimed successfully", issue);
  } catch (error) {
    console.error("Volunteer claim error:", error);
    return apiResponse(res, 500, "Failed to claim issue");
  }
};

exports.unclaimIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const issue = await Issue.findById(issueId);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    const isAdmin = req.user.role === ROLES.ADMIN;
    const isOfficer = req.user.role === ROLES.OFFICER;
    const isVolunteerSelf = req.user.role === ROLES.VOLUNTEER && String(issue.volunteer) === String(req.user._id);

    if (!isAdmin && !isOfficer && !isVolunteerSelf) {
      return apiResponse(res, 403, "You cannot release this claim.");
    }

    if (isOfficer && String(issue.assignedDepartment) !== String(req.user.department)) {
      return apiResponse(res, 403, "Officer can only release claims for their department's issues.");
    }

    if (issue.status !== ISSUE_STATUS.VOLUNTEER_CLAIMED || !issue.volunteer) {
      return apiResponse(res, 400, "Issue is not in a volunteer-claimed state.");
    }

    const ac = assertIssueStatusChange({
      issue,
      nextStatus: ISSUE_STATUS.REPORTED,
      user: req.user,
      context: { isVolunteerAssignee: !!isVolunteerSelf },
    });
    if (!ac.ok && !isAdmin) {
      return apiResponse(res, ac.statusCode, ac.message);
    }

    const prevVolunteer = issue.volunteer;
    issue.volunteer = null;
    issue.handlingMode = HANDLING_MODE.UNASSIGNED;
    issue.volunteerClaimedAt = null;
    issue.status = ISSUE_STATUS.REPORTED;
    await issue.save();

    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "volunteer.unclaim",
      resourceType: "issue",
      resourceId: issue._id,
      detail: "Volunteer claim released",
      ...auditCtx(req),
    });

    if (prevVolunteer) {
      await createNotification({
        userId: prevVolunteer,
        title: "Claim released",
        message: "Your volunteer claim has been released.",
        issueId: issue._id,
      });
    }

    return apiResponse(res, 200, "Claim released", issue);
  } catch (error) {
    console.error("Volunteer unclaim error:", error);
    return apiResponse(res, 500, "Failed to release claim");
  }
};

exports.updateCommunityProgress = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { notes, progressImages } = req.body || {};
    const issue = await Issue.findById(issueId);

    if (!issue) return apiResponse(res, 404, "Issue not found");
    if (String(issue.volunteer) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only claiming volunteer can update this issue");
    }

    if (issue.status === ISSUE_STATUS.VOLUNTEER_CLAIMED) {
      const ac = assertIssueStatusChange({
        issue,
        nextStatus: ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS,
        user: req.user,
        context: { isVolunteerAssignee: true },
      });
      if (!ac.ok) {
        return apiResponse(res, ac.statusCode, ac.message);
      }
      issue.status = ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS;
    } else if (issue.status !== ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS) {
      return apiResponse(res, 400, "Issue is not in volunteer progress flow");
    }

    const noteParts = [];
    if (typeof notes === "string" && notes.trim()) {
      noteParts.push(notes.trim());
    }
    if (Array.isArray(progressImages) && progressImages.length) {
      noteParts.push(`Images: ${progressImages.slice(0, 5).join(", ")}`);
    }
    if (noteParts.length) {
      issue.statusHistory = issue.statusHistory || [];
      issue.statusHistory.push({
        from: issue.status,
        to: issue.status,
        changedBy: req.user._id,
        changedAt: new Date(),
        note: noteParts.join(" — ").slice(0, 2000),
      });
    }

    await issue.save();

    return apiResponse(res, 200, "Community progress updated", issue);
  } catch (error) {
    console.error("Volunteer progress error:", error);
    return apiResponse(res, 500, "Failed to update progress");
  }
};

exports.submitCommunityResolution = async (req, res) => {
  try {
    const { issueId } = req.params;
    const reportText = String(req.body?.report ?? req.body?.reportText ?? "").trim();
    const proofFromBody = normalizeProofInput(req.body?.proof);
    const uploadedFiles = normalizeMulterFiles(req, ["proofImages"]);
    const proofFromFiles = uploadedFiles.length
      ? await persistUploadedFiles(req, uploadedFiles, req.user?._id || null)
      : [];
    const issue = await Issue.findById(issueId);

    if (!issue) return apiResponse(res, 404, "Issue not found");
    if (String(issue.volunteer) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only claiming volunteer can resolve this issue");
    }

    const ac = assertIssueStatusChange({
      issue,
      nextStatus: ISSUE_STATUS.RESOLVED_BY_COMMUNITY,
      user: req.user,
      context: { isVolunteerAssignee: true },
    });
    if (!ac.ok) {
      return apiResponse(res, ac.statusCode, ac.message);
    }

    if (!reportText) {
      return apiResponse(res, 400, "Community resolution report is required");
    }

    const safeProof = normalizeImageArray([...proofFromFiles, ...proofFromBody]);
    if (!safeProof.length) {
      return apiResponse(res, 400, "At least one proof item is required");
    }

    const resolution = await Resolution.create({
      issue: issue._id,
      type: RESOLUTION_TYPES.VOLUNTEER,
      resolvedBy: req.user._id,
      report: reportText,
      proofImages: safeProof,
    });

    issue.communityProof = safeProof.map((p) => p.url || p);
    issue.communityResolutionReport = {
      text: reportText,
      submittedBy: req.user._id,
      submittedAt: new Date(),
    };
    issue.acceptedResolution = resolution._id;
    issue.status = ISSUE_STATUS.RESOLVED_BY_COMMUNITY;
    issue.resolvedAt = new Date();
    issue.verificationDeadline = new Date(Date.now() + appConfig.citizenVerificationDays * appConfig.dayMs);
    await recomputeIssuePriority(issue);
    await issue.save();

    await notifyIssueResolved(issue, "volunteer");
    await notifyCitizenVerificationRequest(issue);

    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "volunteer.resolve",
      resourceType: "resolution",
      resourceId: resolution._id,
      detail: "Community resolution submitted",
      ...auditCtx(req),
    });

    return apiResponse(res, 200, "Issue marked resolved by community", issue);
  } catch (error) {
    console.error("Volunteer resolution error:", error);
    return apiResponse(res, 500, "Failed to resolve issue");
  }
};

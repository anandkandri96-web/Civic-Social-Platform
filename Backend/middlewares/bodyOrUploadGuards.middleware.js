const { normalizeMulterFiles } = require("../services/imageAsset.service");

/** After multer: at least one proof URI in body or uploaded proofImages */
function requireVolunteerResolutionProof(req, res, next) {
  const proof = Array.isArray(req.body?.proof) ? req.body.proof.filter(Boolean) : [];
  const files = normalizeMulterFiles(req, ["proofImages"]);
  if (proof.length + files.length < 1) {
    return res.status(400).json({
      errors: [
        {
          field: "proof",
          message: "At least one proof image is required (upload files or provide proof URIs)",
        },
      ],
    });
  }
  return next();
}

/** After multer on POST .../progress: notes, URI images, completion text, uploads, or any combination with at least one substantive input */
function requireTaskAddProgressPayload(req, res, next) {
  const files = normalizeMulterFiles(req, ["progressImages"]);
  const uriImgs = Array.isArray(req.body?.progressImages) ? req.body.progressImages.filter(Boolean) : [];
  const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
  if (notes.length > 0 && notes.length < 5) {
    return res.status(400).json({
      errors: [{ field: "notes", message: "notes must be at least 5 characters when provided" }],
    });
  }
  const cr = typeof req.body?.completionReport === "string" ? req.body.completionReport.trim() : "";
  const cx = typeof req.body?.complicationReport === "string" ? req.body.complicationReport.trim() : "";

  const ok =
    files.length > 0 ||
    uriImgs.length > 0 ||
    (notes.length >= 5) ||
    cr.length > 0 ||
    cx.length > 0;

  if (!ok) {
    return res.status(400).json({
      errors: [
        {
          field: "body",
          message:
            "Provide at least one of: notes (min 5 chars), progressImages URIs, completionReport, complicationReport, or uploaded progress images",
        },
      ],
    });
  }
  return next();
}

module.exports = {
  requireVolunteerResolutionProof,
  requireTaskAddProgressPayload,
};

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const ImageAsset = require("../models/imageAsset");
const { cloudinary, configured } = require("../config/cloudinary");
const logger = require("../utils/logger");
const appConfig = require("../config/appConfig");

function normalizeMulterFiles(req, fieldNames = ["image", "images"]) {
  if (!req) return [];

  if (Array.isArray(req.files)) {
    return req.files.filter((f) => f && f.buffer && f.mimetype);
  }

  const list = [];
  if (req.file && req.file.buffer && req.file.mimetype) {
    list.push(req.file);
  }

  if (req.files && typeof req.files === "object") {
    fieldNames.forEach((field) => {
      const entries = req.files[field];
      if (Array.isArray(entries)) {
        entries.forEach((f) => {
          if (f && f.buffer && f.mimetype) list.push(f);
        });
      }
    });
  }

  return list;
}

async function uploadBufferToCloudinary(buffer, opts = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: opts.folder || "civic-platform", resource_type: "auto" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

async function writeLocalUpload(req, file) {
  const uploadsDir = path.join(__dirname, "..", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(file.originalname || "") || ".bin";
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const full = path.join(uploadsDir, name);
  await fs.writeFile(full, file.buffer);

  const base =
    appConfig.publicApiBaseUrl ||
    `${req.protocol}://${req.get("host")}`;
  const url = `${base.replace(/\/$/, "")}/uploads/${name}`;
  return { url, cloudinaryId: "" };
}

/**
 * Persists uploaded files and returns [{ url, cloudinaryId }] for issue/comment/task payloads.
 * Writes ImageAsset as audit row (no proxy serving — URLs point to CDN or static /uploads).
 */
async function persistUploadedFiles(req, files, uploadedBy = null) {
  const results = [];
  for (const file of files) {
    try {
      let url = "";
      let cloudinaryId = "";

      if (configured) {
        const res = await uploadBufferToCloudinary(file.buffer, { folder: "civic-platform" });
        url = res.secure_url || res.url;
        cloudinaryId = res.public_id || "";
      } else {
        const local = await writeLocalUpload(req, file);
        url = local.url;
        cloudinaryId = local.cloudinaryId;
      }

      // Always store the buffer in the DB
      const asset = await ImageAsset.create({
        contentType: file.mimetype,
        originalName: String(file.originalname || "").slice(0, 255),
        size: Number(file.size || file.buffer?.length || 0),
        data: file.buffer,
        url,
        cloudinaryPublicId: cloudinaryId,
        uploadedBy,
      });

      // Return the _id for DB reference, and url for legacy/compat
      results.push({ _id: asset._id, url, cloudinaryId });
    } catch (e) {
      logger.error("Image upload failed", { message: e.message });
      throw e;
    }
  }
  return results;
}

async function deleteCloudinaryAssets(publicIds = []) {
  const ids = [...new Set((publicIds || []).filter(Boolean))];
  if (!ids.length || !configured) return;
  for (const pid of ids) {
    try {
      await cloudinary.uploader.destroy(pid);
    } catch (e) {
      logger.warn("Cloudinary delete failed", { publicId: pid, message: e.message });
    }
  }
}

module.exports = {
  normalizeMulterFiles,
  persistUploadedFiles,
  deleteCloudinaryAssets,
};

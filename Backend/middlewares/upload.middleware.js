const multer = require("multer");

const memoryStorage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
  }
  cb(null, true);
};

const baseUploader = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
});

/**
 * Accept issue images from either `image` (single) or `images` (multiple).
 */
exports.uploadIssueImage = baseUploader.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

/**
 * Generic multiple image uploader.
 */
exports.uploadImages = (field = "images", maxCount = 5) =>
  multer({
    storage: memoryStorage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: maxCount,
    },
  }).array(field, maxCount);
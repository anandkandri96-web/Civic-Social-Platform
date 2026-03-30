const mongoose = require("mongoose");

const idempotencyRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    key: { type: String, required: true, trim: true, maxlength: 128 },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: "Issue", required: true },
  },
  { timestamps: true }
);

idempotencyRecordSchema.index({ user: 1, key: 1 }, { unique: true });
idempotencyRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 15 });

module.exports = mongoose.model("IdempotencyRecord", idempotencyRecordSchema);

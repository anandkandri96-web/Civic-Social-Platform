const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

voteSchema.index({ user: 1, issue: 1 }, { unique: true });
voteSchema.index({ issue: 1, createdAt: -1 });

module.exports = mongoose.model("Vote", voteSchema);

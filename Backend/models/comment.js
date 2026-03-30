const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 1000,
    },

    images: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      validate: {
        validator(arr) {
          return !Array.isArray(arr) || arr.length <= 3;
        },
        message: "At most 3 images allowed",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
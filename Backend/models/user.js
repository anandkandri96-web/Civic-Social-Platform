const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../config/roles");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CITIZEN,
      lowercase: true,
      trim: true,
    },

    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Serial IDs for staff roles. These are assigned by the system/admin to enable human-friendly references.
    // Examples: W-001, O-001
    workerId: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^W-\d{3,}$/, "workerId must match W-001 format"],
      default: null,
    },

    officerId: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^O-\d{3,}$/, "officerId must match O-001 format"],
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index(
  { workerId: 1 },
  { unique: true, partialFilterExpression: { workerId: { $type: "string", $ne: "" } } }
);
userSchema.index(
  { officerId: 1 },
  { unique: true, partialFilterExpression: { officerId: { $type: "string", $ne: "" } } }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);

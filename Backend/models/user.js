// backend/models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// const pointSchema = new mongoose.Schema( ❌ user location not used yet
//   {
//     type: {
//       type: String,
//       enum: ["Point"],
//       required: true,
//     },
//     coordinates: {
//       type: [Number], // [lng, lat]
//       required: true,
//     },
//   },
//   { _id: false }
// );

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
  enum: ["user", "admin", "volunteer"],
  default: "user",
  lowercase: true,   // ⭐ IMPORTANT (auto-normalizes)
  trim: true,
},


    // location: { ❌ not used yet
    //   type: pointSchema,
    //   required: false,
    // },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// userSchema.index({ location: "2dsphere" }, { sparse: true }); ❌ not needed yet

/**
 * Password hashing (REQUIRED)
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/**
 * Password comparison (REQUIRED)
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// userSchema.methods.toJSON = function () { ❌ optional
//   const obj = this.toObject();
//   delete obj.password;
//   return obj;
// };

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  bmdcNo: {
    type: Number,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  contactNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  aoaNo: {
    type: String,
    default: null,
  },
  isBmdcVerified: {
    type: Boolean,
    default: null, // Will be true after OTP verification
  },
  password: {
    type: String,
    required: true,
  }, // For authentication
  isEmailVerified: {
    type: Boolean,
    default: false, // Will be true after OTP verification
  },
  otp: {
    type: String, // Changed from Number to String to preserve leading zeros
    default: null, // Use null to indicate no OTP by default
  },
  otpExpiration: {
    type: Date,
    default: null, // Will be set when OTP is generated
  },
  picture: [
    {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
  ],

  // Arrays to hold multiple workplace and post-graduation details
  currentWorkingPlace: [
    {
      name: { type: String, default: null },
      designation: { type: String, default: null },
    },
  ],

  postGraduationDegrees: [
    {
      degreeName: {
        type: String,
        default: null,
      },
      yearOfGraduation: {
        type: String,
        default: null,
      },
      isCompleted: {
        type: Boolean,
        default: false,
      },
    },
  ],

  isAccountVerified: {
    type: Boolean,
    default: false, // Will be true after OTP verification
  },

  courses: [
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true, // this makes _id = courseId required
    },
    status: {
      type: String,
      enum: ["yes", "no", null],
      default: null,
    },
    documents: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        name: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    completionYear: {
      type: String,
    },
  }
],
  remarks: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("Student", StudentSchema);

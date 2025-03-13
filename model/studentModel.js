const mongoose = require("mongoose");

const SingleSupportDocumentSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  document: {
    type: String, // Single document URL
    required: function () {
      return this.status === "Yes";
    },
  },
});

const MultiSupportDocumentSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  documents: {
    type: [String], // Array of document URLs
    validate: {
      validator: function (docs) {
        return this.status === "No" || (docs.length >= 1 && docs.length <= 5);
      },
      message:
        "You must upload at least 1 and at most 5 documents if status is Yes.",
    },
  },
});

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  bmdcNo: {
    type: String,
    unique: true,
    required: true,
  },
  isBmdcVerified: {
    type: Boolean,
    default: false, // Will be true after OTP verification
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  contactNumber: {
    type: String,
    required: true,
    unique: true,
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
      name: { type: String },
      designation: { type: String },
    },
  ],

  postGraduationDegrees: [
    {
      degreeName: {
        type: String,
        required: true,
      },
      yearOfGraduation: {
        type: Number,
        required: true,
      },
    },
  ],
  isAccountVerified: {
    type: Boolean,
    default: false, // Will be true after OTP verification
  },
  // Fields that require only ONE document if status is "Yes"
  aoBasicCourse: SingleSupportDocumentSchema,
  aoAdvanceCourse: SingleSupportDocumentSchema,
  aoMastersCourse: SingleSupportDocumentSchema,
  aoaPediatricSeminar: SingleSupportDocumentSchema,
  aoaPelvicSeminar: SingleSupportDocumentSchema,
  aoaFootAnkleSeminar: SingleSupportDocumentSchema,

  // Fields that allow multiple documents (1 to 5) if status is "Yes"
  aoaOtherCourses: MultiSupportDocumentSchema,
  aoaFellowship: MultiSupportDocumentSchema,
  tableFaculty: MultiSupportDocumentSchema,
  nationalFaculty: MultiSupportDocumentSchema,
});

module.exports = mongoose.model("Student", StudentSchema);

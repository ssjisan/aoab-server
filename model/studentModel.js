const mongoose = require("mongoose");

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
    default: null, // Will be true after OTP verification
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

  // aoBasicCourse schema embedded inside StudentSchema
  aoBasicCourse: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the single document
        public_id: { type: String, required: true }, // Public ID for the document
      },
    ],
  },
  aoAdvanceCourse: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the single document
        public_id: { type: String, required: true }, // Public ID for the document
      },
    ],
  },
  aoMastersCourse: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the single document
        public_id: { type: String, required: true }, // Public ID for the document
      },
    ],
  },
  aoaPediatricSeminar: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the single document
        public_id: { type: String, required: true }, // Public ID for the document
      },
    ],
  },
  aoaPelvicSeminar: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the single document
        public_id: { type: String, required: true }, // Public ID for the document
      },
    ],
  },
  aoaFootAnkleSeminar: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the single document
        public_id: { type: String, required: true }, // Public ID for the document
      },
    ],
  },
  aoaOtherCourses: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the document
        public_id: { type: String, required: true }, // Public ID for each document
      },
    ],
  },
  aoaFellowship: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the document
        public_id: { type: String, required: true }, // Public ID for each document
      },
    ],
  },
  tableFaculty: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the document
        public_id: { type: String, required: true }, // Public ID for each document
      },
    ],
  },
  nationalFaculty: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // URL of the document
        public_id: { type: String, required: true }, // Public ID for each document
      },
    ],
  },
});

module.exports = mongoose.model("Student", StudentSchema);

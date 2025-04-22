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
    unique: true,
    default: null,
    sparse: true,
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

  // aoBasicCourse schema embedded inside StudentSchema
  aoBasicCourse: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoAdvanceCourse: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoMastersCourse: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoaPediatricSeminar: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoaPelvicSeminar: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoaFootAnkleSeminar: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoPeer: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoaOtherCourses: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoNonOperativeCourse: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  aoaFellowship: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  tableFaculty: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  nationalFaculty: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  regionalFaculty: {
    status: {
      type: String,
      enum: ["yes", "no", null], // Added null as a valid status
      default: null, // Default to null
    },
    documents: [
      {
        url: { type: String, required: true }, // File URL
        public_id: { type: String, required: true }, // Cloudinary Public ID
        name: { type: String, required: true }, // Original file name
        size: { type: Number, required: true }, // File size in bytes
      },
    ],
    completionYear: {
      type: String, // This stores the full date (you can set it to the first day of the month)
    },
  },
  remarks: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("Student", StudentSchema);

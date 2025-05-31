const mongoose = require("mongoose");

const courseEventSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseCategory", // fixed from "CourseSetup" to match your actual mod
      required: true,
    },
    title: { type: String, required: true },
    location: { type: String },
    fee: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    registrationStartDate: { type: Date },
    registrationEndDate: { type: Date },
    paymentReceiveStartDate: { type: Date },
    paymentReceiveEndDate: { type: Date },
    studentCap: { type: Number },
    waitlistCap: { type: Number },

    contactPersons: [
      {
        name: { type: String },
        email: { type: String },
      },
    ],

    details: { type: String },
    coverPhoto: {
      url: String,
      public_id: String,
    },

    prerequisites: {
      // ✅ 1. Post Graduation required
      postGraduationRequired: {
        type: String,
        enum: ["yes", "no"],
        default: "no",
      },

      postGraduationYearRange: {
        start: { type: String }, // e.g., "2009"
        end: { type: String }, // e.g., "2020"
      },

      // ✅ 2. Must have completed another course?
      mustHave: {
        type: String,
        enum: ["yes", "no"],
        default: "no",
      },

      requiredCourseCategory: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CourseCategory",
        },
      ],

      // ✅ 3. Restrict re-enrollment based on category
      restrictReenrollment: {
        type: Boolean,
        default: true,
      },
    },

    recipients: [
      {
        role: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CourseCategory",
          required: true,
        },
        profiles: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
          },
        ],
      },
    ],
    signatures: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CourseEvent", courseEventSchema);

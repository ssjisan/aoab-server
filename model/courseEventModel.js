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
    studentCap: { type: Number },
    waitlistCap: { type: Number },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    contactPersons: [
      {
        name: { type: String },
        email: { type: String },
      },
    ],

    details: { type: String },
    cover: {
      url: String,
      public_id: String,
    },

    prerequisites: {
      // ✅ 1. Post Graduation required
      postGraduationRequired: { type: Boolean, default: false },

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
        students: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
          },
        ],
      },
    ],
    signatures: [
      {
        recipient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CourseEvent.recipients", // reference to a recipient entry
        },
        signature: {
          url: String,
          public_id: String,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CourseEvent", courseEventSchema);

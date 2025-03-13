const mongoose = require("mongoose");

const courseEventSchema = new mongoose.Schema(
  {
    coverPhoto: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    title: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    fees: {
      type: Number,
      required: true,
    },
    contactPerson: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      trim: true,
      required: true,
    },
    endDate: {
      type: Date,
      trim: true,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CourseEvent", courseEventSchema);

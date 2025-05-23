const mongoose = require("mongoose");

const courseCategorySchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    typeOfParticipation: {
      type: Number, // 0 = Single, 1 = Multiple
      enum: [0, 1],
      default: 0,
      required: true,
    },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CourseCategory", courseCategorySchema);

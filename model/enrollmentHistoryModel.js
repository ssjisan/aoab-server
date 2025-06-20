const mongoose = require("mongoose");

const enrollmentSchema  = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CourseEvent",
    unique: true,
    required: true,
  },
  courseTitle: {
    type: String,
    required: true, // optional if you want to allow it empty
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CourseCategory",
    required: true,
  },
  enrollments: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
      status: {
        type: String,
        enum: ["enrolled", "waitlist", "confirmed", "expired"],
        default: "enrolled",
      },
      enrolledAt: { type: Date, default: Date.now },
      paymentReceived: {
        type: String,
        enum: ["no", "pending", "approved", "rejected"],
        default: "no",
      },
      paymentReceivedAt: { type: Date },
      paymentProof: {
        url: { type: String },
        public_id: { type: String },
      },
      isAttend: { type: Boolean, default: false },
      remark: { type: String },
    },
  ],
});

module.exports = mongoose.model("EnrollmentHistory", enrollmentSchema );

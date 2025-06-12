const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CourseEvent",
    required: true,
  },
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
  remark: {
    type: String,
  },
});

module.exports = mongoose.model("EnrollmentHistory", enrollmentSchema);

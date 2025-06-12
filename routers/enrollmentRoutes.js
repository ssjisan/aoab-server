const express = require("express");
const router = express.Router();
const {
  enrollEligibility,
  enrollStudent,
  getEnrollmentsByCourse,
  getEnrollmentsByStudent,
  uploadPaymentProof,
  rejectEnrollmentPayment,
  acceptEnrollmentPayment,
  moveToEnrolled,
  getFinalListByCourse
} = require("../controller/enrollmentController.js");

const { requiredSignIn } = require("../middlewares/authMiddleware.js");
const multer = require("multer");

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/eligibility-check", requiredSignIn, enrollEligibility);
router.post("/enrollment", requiredSignIn, enrollStudent);
router.get(
  "/enrollment-history/:courseId",
  requiredSignIn,
  getEnrollmentsByCourse
);
router.get(
  "/enrollment-history/confirmed/:courseId",
  requiredSignIn,
  getFinalListByCourse
);
router.get(
  "/enrollment-history/student/:studentId",
  requiredSignIn,
  getEnrollmentsByStudent
);
router.post(
  "/enrollment/upload-payment-proof",
  requiredSignIn,
  upload.single("paymentProof"),
  uploadPaymentProof
);
router.patch("/enrollment/reject", requiredSignIn, rejectEnrollmentPayment);
router.patch("/enrollment/accept", requiredSignIn, acceptEnrollmentPayment);
router.post("/enrollment/move", requiredSignIn, moveToEnrolled);

module.exports = router;

const express = require("express");
const {
  registerStudent,
  verifyOtp,
  resendOtp,
  studentLogin,
  forgotPassword,
  verifyOtpForReset,
  resetPassword,
} = require("../controller/studentController.js");

const {
  getProfileData,
  updateProfileImage,
  updateCourseDocument,
} = require("../controller/studentProfileController.js");
const router = express.Router();
const { requiredSignIn } = require("../middlewares/authMiddleware");
const multer = require("multer");

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to register a student
router.post("/registration", registerStudent);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/student-login", studentLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp-for-reset", verifyOtpForReset);
router.post("/reset-password", resetPassword);
router.get("/my-profile-data", requiredSignIn, getProfileData);
router.post(
  "/update-profile-image",
  requiredSignIn,
  upload.single("picture"),
  updateProfileImage
);
router.post(
  "/update-course",
  requiredSignIn,
  upload.array("documents"), // Allow multiple file uploads
  updateCourseDocument
);
router.get("/auth-check", requiredSignIn, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;

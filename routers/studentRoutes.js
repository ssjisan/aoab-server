const express = require("express");
const {
  registerStudent,
  verifyOtp,
  resendOtp,
  studentLogin,
  forgotPassword,
  verifyOtpForReset,
  resetPassword,
  getProfileData
} = require("../controller/studentController.js");
const router = express.Router();
const { requiredSignIn } = require("../middlewares/authMiddleware");

// Route to register a student
router.post("/registration", registerStudent);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/student-login", studentLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp-for-reset", verifyOtpForReset);
router.post("/reset-password", resetPassword);
router.get("/my-profile-data", requiredSignIn, getProfileData);

router.get("/auth-check", requiredSignIn, (req, res) => {
  res.json({ ok: true });
});


module.exports = router;

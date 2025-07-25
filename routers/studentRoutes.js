const express = require("express");
const {
  registerStudent,
  verifyOtp,
  resendOtp,
  studentLogin,
  forgotPassword,
  verifyOtpForReset,
  resetPassword,
  changeStudentPassword,
} = require("../controller/studentAuthController.js");

const {
  getProfileData,
  updateProfileImage,
  updateStudentDetails,
  getUnverifiedStudents,
  approveStudent,
  getVerifiedStudents,
  denyStudent,
  getStudentProfileByAdmin,
  getAllStudentStatusSummary,
  getUnverifiedEmail,
  removeUnverifiedEmailById,
  updateSignature,
  courseDocument,
  getStudentsByStatus,
  managePostGradCertificates
} = require("../controller/studentProfileController.js");
const router = express.Router();
const {
  requiredSignIn,
  isSuperAdmin,
} = require("../middlewares/authMiddleware");
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
router.put("/update-basic-info", requiredSignIn, updateStudentDetails);
router.post("/change-student-password", requiredSignIn, changeStudentPassword);
router.get("/unverified-accounts", requiredSignIn, getUnverifiedStudents);
router.get("/verified-accounts", requiredSignIn, getVerifiedStudents);
router.get("/approve/:studentId", requiredSignIn, approveStudent);
router.put("/deny/:studentId", requiredSignIn, denyStudent);
router.get("/student/:studentId", requiredSignIn, getStudentProfileByAdmin);
router.get("/all-student", requiredSignIn, getAllStudentStatusSummary);
router.get("/unverified-email", requiredSignIn, getUnverifiedEmail);
router.delete(
  "/remove-unverified/:id",
  requiredSignIn,
  removeUnverifiedEmailById
);

router.post(
  "/update-profile-image",
  requiredSignIn,
  upload.single("picture"),
  updateProfileImage
);
router.post(
  "/update-signature",
  requiredSignIn,
  upload.single("signature"),
  updateSignature
);

router.post(
  "/course_document",
  requiredSignIn,
  upload.array("documents"),
  courseDocument
);

router.put(
  "/course_document/:courseId",
  requiredSignIn,
  upload.array("documents"),
  courseDocument
);

router.get("/account-not-complete", getStudentsByStatus);
router.post(
  "/upload-postgrad-certificate",
  requiredSignIn,
  upload.array("postGradCertificate", 2),
  managePostGradCertificates
);

router.get("/auth-check", requiredSignIn, (req, res) => {
  res.json({ ok: true });
  console.log(res.data);
});

module.exports = router;

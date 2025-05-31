const express = require("express");
const router = express.Router();
const {
  checkEnrollmentEligibility,
} = require("../controller/enrollmentController.js");

const { requiredSignIn } = require("../middlewares/authMiddleware.js");

router.post("/check-eligibility", requiredSignIn, checkEnrollmentEligibility);

module.exports = router;

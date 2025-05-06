const express = require("express");
const router = express.Router();
// import controller
const {
  createCourseSetup,
  listOfSetupCourse,
  updateSetupCourseSequence,
  removeCourseSetup,
  updateCourseSetup,
} = require("../controller/courseSetupController.js");

// import middleware
const { requiredSignIn } = require("../middlewares/authMiddleware.js");

router.post("/course_setup", requiredSignIn, createCourseSetup);
router.get("/setup_course", requiredSignIn, listOfSetupCourse);
router.post(
  "/update-setup-course-order",
  requiredSignIn,
  updateSetupCourseSequence
);
router.delete("/course_setup/:id", requiredSignIn, removeCourseSetup);
router.put("/course_setup/:id", requiredSignIn, updateCourseSetup); // <-- New endpoint for updating course setup

module.exports = router;

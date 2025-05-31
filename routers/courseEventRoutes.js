const express = require("express");
const { requiredSignIn } = require("../middlewares/authMiddleware.js");
const {
  createOrUpdateCourseEvent,
  listofAllCoursesEvents,
  updateCoursesEventsSequence,
  getEventsByStatus,
  getFilteredCoursesEvents,
  deleteCourseEvent,
  readCourseEvent,
  getClassifiedCourses
} = require("../controller/courseEventController.js");
const multer = require("multer");

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new router instance
const router = express.Router();

// Route to create a new doctor profile
router.post(
  "/courses",
  requiredSignIn,
  upload.single("coverPhoto"),
  createOrUpdateCourseEvent
);
router.put(
  "/courses/:id",  // param name should match `req.params.id`
  requiredSignIn,
  upload.single("coverPhoto"),
  createOrUpdateCourseEvent
);
router.post("/update-course-event-order", requiredSignIn, updateCoursesEventsSequence);
router.delete("/courses_events/:courseEventId", requiredSignIn, deleteCourseEvent);
router.get("/courses/status", getClassifiedCourses);
router.get("/courses_events/:courseEventId", readCourseEvent);
router.get("/all_courses_events", listofAllCoursesEvents);
router.get("/events-by-status", requiredSignIn, getEventsByStatus);
router.get("/courses_events", getFilteredCoursesEvents);

module.exports = router;

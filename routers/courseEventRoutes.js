// profileRoutes.js
import express from "express";
import { requiredSignIn } from "../middlewares/authMiddleware.js";
import {
  createCourseEvent,
  listofAllCoursesEvents,
  updateCoursesEventsSequence,
  getEventsByStatus,
  getFilteredCoursesEvents,
  deleteCourseEvent,
  readCourseEvent,
  updateCourseEvent
} from "../controller/courseEventController.js";
import multer from "multer";

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new router instance
const router = express.Router();

// Route to create a new doctor profile
router.post(
  "/create-course-event",
  requiredSignIn,
  upload.single("coverPhoto"),
  createCourseEvent
);
router.get("/all_courses_events", listofAllCoursesEvents);
router.post("/update-course-event-order", requiredSignIn, updateCoursesEventsSequence);
router.get("/events-by-status", requiredSignIn, getEventsByStatus);
router.get("/courses_events", getFilteredCoursesEvents);
router.delete("/courses_events/:courseEventId", requiredSignIn, deleteCourseEvent);
router.get("/courses_events/:courseEventId", readCourseEvent);
router.put("/courses_events/:courseEventId", requiredSignIn,upload.single("coverPhoto"), updateCourseEvent);
export default router;
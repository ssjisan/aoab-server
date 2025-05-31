const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const CourseEvent = require("../model/courseEventModel.js");
const dayjs = require("dayjs");

dotenv.config();

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  throw new Error(
    "Cloudinary configuration is missing. Check your environment variables."
  );
}

// ********************************************** The Cloudinary upload function start here ********************************************** //

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

const uploadImageToCloudinary = async (imageBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "aoa-bd/courses", // Specify the folder name here
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );
    stream.end(imageBuffer);
  });
};

// ********************************************** The Cloudinary upload function end here ********************************************** //

// ********************************************** The Create Course Event Function Start Here ********************************************** //

exports.createOrUpdateCourseEvent = async (req, res) => {
  try {
    const {
      category,
      title,
      location,
      fee,
      startDate,
      endDate,
      contactPersons,
      details,
      requiresPrerequisite,
      postGradRequired,
      yearFrom,
      yearTo,
      selectedPrerequisiteCourses,
      restrictReenrollment,
      studentCap,
      waitlistCap,
      registrationStartDate,
      registrationEndDate,
      paymentReceiveStartDate,
      paymentReceiveEndDate,
      recipients,
      signatures,
    } = req.body;
    console.log(req.body);

    // Basic validation
    if (!category || !title) {
      return res
        .status(400)
        .json({ message: "Category and Title are required." });
    }

    // Build prerequisites structure
    const prerequisites = {
      mustHave: requiresPrerequisite === "yes" ? "yes" : "no",
      postGraduationRequired: postGradRequired === "yes" ? "yes" : "no",
      postGraduationYearRange: {
        start: yearFrom || "",
        end: yearTo || "",
      },
      requiredCourseCategory: Array.isArray(selectedPrerequisiteCourses)
        ? selectedPrerequisiteCourses
        : [],
      restrictReenrollment:
        restrictReenrollment !== undefined ? restrictReenrollment : true,
    };

    // Prepare fields for create or update
    const updateFields = {
      category,
      title,
      location,
      fee,
      startDate,
      endDate,
      contactPersons,
      details,
      studentCap,
      waitlistCap,
      registrationStartDate,
      registrationEndDate,
      paymentReceiveStartDate,
      paymentReceiveEndDate,
      recipients,
      signatures,
    };

    if (
      requiresPrerequisite !== undefined ||
      postGradRequired !== undefined ||
      yearFrom !== undefined ||
      yearTo !== undefined ||
      selectedPrerequisiteCourses !== undefined ||
      restrictReenrollment !== undefined
    ) {
      updateFields.prerequisites = {
        mustHave: requiresPrerequisite === "yes" ? "yes" : "no",
        postGraduationRequired: postGradRequired === "yes" ? "yes" : "no",
        postGraduationYearRange: {
          start: yearFrom || "",
          end: yearTo || "",
        },
        requiredCourseCategory: Array.isArray(selectedPrerequisiteCourses)
          ? selectedPrerequisiteCourses
          : [],
        restrictReenrollment:
          restrictReenrollment !== undefined ? restrictReenrollment : true,
      };
    }

    // Upload cover photo if provided
    if (req.file) {
      try {
        const uploaded = await uploadImageToCloudinary(req.file.buffer);
        updateFields.coverPhoto = {
          url: uploaded.url,
          public_id: uploaded.public_id,
        };
      } catch (err) {
        console.error("Cloudinary upload failed:", err);
        return res.status(500).json({ message: "Cover photo upload failed" });
      }
    }

    // If ID is provided -> Update
    if (req.params.id) {
      const updated = await CourseEvent.findByIdAndUpdate(
        req.params.id,
        updateFields,
        {
          new: true,
        }
      );
      if (!updated)
        return res.status(404).json({ message: "Course not found." });
      return res.status(200).json(updated);
    }

    // Else -> Create
    const newCourse = new CourseEvent(updateFields);
    const saved = await newCourse.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error("Course event error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ********************************************** The Create Course Event Function End Here ********************************************** //

// For Get all Data from DB //
exports.listofAllCoursesEvents = async (req, res) => {
  try {
    const coursesEvents = await CourseEvent.find().sort({
      sequence: 1,
      createdAt: -1,
    }); // Sort by sequence, then by createdAt
    res.status(200).json(coursesEvents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//  Update Sequence of Resource
exports.updateCoursesEventsSequence = async (req, res) => {
  try {
    const { reorderedCourseEvent } = req.body; // Array of resources with updated sequences
    console.log(req.body);

    const bulkOps = reorderedCourseEvent.map((resource, index) => ({
      updateOne: {
        filter: { _id: resource._id },
        update: { $set: { sequence: index + 1 } }, // Update the sequence field
      },
    }));

    await CourseEvent.bulkWrite(bulkOps);

    res
      .status(200)
      .json({ message: "Course & Event sequence updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating course & event sequence" });
  }
};

// getEventsByStatus controller
exports.getEventsByStatus = async (req, res) => {
  const currentDate = new Date();
  const { status } = req.query; // Extract status from query parameters

  try {
    // Build query based on status
    let query = {};
    if (status === "archived") {
      query = { endDate: { $lt: currentDate } }; // Archived events
    } else if (status === "running") {
      query = { endDate: { $gte: currentDate } }; // Running events
    }

    // Fetch data from the database
    const events = await CourseEvent.find(query).sort({ endDate: 1 }); // Sort by endDate
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller for fetching a limited number of course & events

// Consolidated controller for fetching courses/events with filters and pagination
exports.getFilteredCoursesEvents = async (req, res) => {
  try {
    // Extract query parameters
    const limit = parseInt(req.query.limit) || 5; // Default limit to 5
    const skip = parseInt(req.query.skip) || 0; // Default skip to 0
    const { status } = req.query; // Extract status (running, archived)

    const currentDate = new Date();
    let query = {}; // Default query fetches all courses/events

    // Build query based on status
    if (status === "archived") {
      query = { endDate: { $lt: currentDate } }; // Archived events (endDate < currentDate)
    } else if (status === "running") {
      query = {
        $or: [
          { endDate: { $gte: currentDate } }, // Running events where endDate is in the future
          { endDate: { $exists: false } }, // Events without an endDate (still running)
        ],
      };
    }

    // Fetch filtered and paginated courses/events
    const coursesEvents = await CourseEvent.find(query)
      .sort({ sequence: 1, createdAt: -1 }) // Sort by sequence first, then creation date
      .skip(skip)
      .limit(limit);

    // Check if there are more courses/events left to load
    const totalCoursesEvents = await CourseEvent.countDocuments(query); // Count documents matching the query
    const hasMore = skip + limit < totalCoursesEvents;

    // Respond with filtered and paginated data
    res.status(200).json({ coursesEvents, hasMore });
  } catch (err) {
    console.error("Error fetching filtered courses/events:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ----------------------------------------------------------- For Delete Event or Course Start Here ----------------------------------------------------------- //
exports.deleteCourseEvent = async (req, res) => {
  try {
    const { courseEventId } = req.params;
    const courseEvent = await CourseEvent.findByIdAndDelete(courseEventId);

    if (!courseEvent) {
      return res.status(404).json({ message: "Course or Event not found" });
    }

    // Delete profile photo from Cloudinary
    if (courseEvent.coverPhoto && courseEvent.coverPhoto.public_id) {
      try {
        const publicId = courseEvent.coverPhoto.public_id;
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        return res.status(500).json({ message: error.message });
      }
    }
    res.status(200).json({ message: "Course or Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ----------------------------------------------------------- For Delete Event or Course End Here ----------------------------------------------------------- //

// For Specific Profile Read //
exports.readCourseEvent = async (req, res) => {
  try {
    const { courseEventId } = req.params;
    const courseEvent = await CourseEvent.findById(courseEventId);
    if (!courseEvent) {
      return res.status(404).json({ error: "Course Event not found" });
    }
    res.json(courseEvent);
  } catch (error) {
    console.error("Error fetching album:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ----------------------------------------------------- For Getting all Course Start Here----------------------------------------------------------- //

exports.getClassifiedCourses = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    // Get limit and skip from query params, with defaults
    const limit = parseInt(req.query.limit) || 5;
    const upcomingSkip = parseInt(req.query.upcomingSkip) || 0;
    const archivedSkip = parseInt(req.query.archivedSkip) || 0;

    // Upcoming Courses
    const upcoming = await CourseEvent.find({
      endDate: { $gte: startOfToday },
    })
      .select("_id title startDate endDate coverPhoto.url fee location")
      .sort({ sequence: 1, startDate: 1 })
      .skip(upcomingSkip)
      .limit(limit)
      .lean();

    // Archived Courses
    const archived = await CourseEvent.find({
      endDate: { $lt: startOfToday },
    })
      .select("_id title startDate endDate coverPhoto.url fee location")
      .sort({ sequence: 1, endDate: -1 })
      .skip(archivedSkip)
      .limit(limit)
      .lean();

    // Coming Next (only first 1 upcoming course)
    const comingNext = await CourseEvent.findOne({
      endDate: { $gte: startOfToday },
    })
      .select("_id title startDate endDate coverPhoto.url fee location")
      .sort({ startDate: 1 })
      .lean();

    return res.json({
      comingNextCourse: comingNext,
      upcomingCourses: upcoming,
      archivedCourses: archived,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

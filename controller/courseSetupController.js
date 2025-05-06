const CourseSetup = require("../model/courseSetupModel.js");

const createCourseSetup = async (req, res) => {
  try {
    const { courseName, typeOfParticipation } = req.body;

    // Check if both fields are provided
    if (!courseName || typeof courseName !== "string") {
      return res.status(400).json({ error: "Invalid or missing Course Name" });
    }

    if (![0, 1].includes(typeOfParticipation)) {
      return res.status(400).json({
        error: "Invalid typeOfParticipation. It must be Single or Multiple",
      });
    }

    // Normalize input (trim + lowercase)
    const normalizedCourseName = courseName.trim().toLowerCase();

    // Find if any existing course matches normalized name
    const existingSetup = await CourseSetup.findOne({
      courseName: { $regex: new RegExp(`^${normalizedCourseName}$`, "i") },
    });

    if (existingSetup) {
      return res
        .status(400)
        .json({ error: "Course setup with this name already exists." });
    }

    const newSetup = new CourseSetup({
      courseName,
      typeOfParticipation,
    });

    await newSetup.save();
    res
      .status(201)
      .json({ message: "Course setup created successfully.", data: newSetup });
  } catch (error) {
    console.error("Error creating course setup:", error);
    res.status(500).json({ error: "Server error." });
  }
};

const listOfSetupCourse = async (req, res) => {
  try {
    const setupCourse = await CourseSetup.find().sort({
      sequence: 1,
      createdAt: -1,
    }); // Sort by sequence, then by createdAt
    res.json(setupCourse);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

//  Update Sequence of List
const updateSetupCourseSequence = async (req, res) => {
  try {
    const { reorderedSetupCourse } = req.body; // Array of forms with updated sequences

    const bulkOps = reorderedSetupCourse.map((resource, index) => ({
      updateOne: {
        filter: { _id: resource._id },
        update: { $set: { sequence: index + 1 } }, // Update the sequence field
      },
    }));

    await CourseSetup.bulkWrite(bulkOps);

    res.status(200).json({ message: "List sequence updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating List sequence" });
  }
};

//  Remove Data using Id
const removeCourseSetup = async (req, res) => {
  try {
    const { id } = req.params; // Get the data ID from the request parameters

    // Find and delete the data by ID
    const courseData = await CourseSetup.findByIdAndDelete(id);

    if (!courseData) {
      return res.status(404).json({ error: "Data not found" }); // Return error if the form doesn't exist
    }

    res.json({ message: "Deleted successfully" }); // Send success message
  } catch (error) {
    console.error("Error deleting form:", error);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

const updateCourseSetup = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseName, typeOfParticipation } = req.body;

    // Validate if at least one field is provided
    if (!courseName && typeOfParticipation === undefined) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const updateFields = {};

    if (courseName) {
      if (typeof courseName !== "string") {
        return res.status(400).json({ error: "Invalid Course Name" });
      }
      const normalizedCourseName = courseName.trim().toLowerCase();

      // Check if another course with the same name exists
      const existingSetup = await CourseSetup.findOne({
        courseName: { $regex: new RegExp(`^${normalizedCourseName}$`, "i") },
        _id: { $ne: id }, // Exclude the current record
      });

      if (existingSetup) {
        return res
          .status(400)
          .json({ error: "Another course setup with this name already exists." });
      }

      updateFields.courseName = courseName.trim();
    }

    if (typeOfParticipation !== undefined) {
      if (![0, 1].includes(typeOfParticipation)) {
        return res
          .status(400)
          .json({ error: "Invalid typeOfParticipation. It must be Single or Multiple" });
      }
      updateFields.typeOfParticipation = typeOfParticipation;
    }

    const updatedCourse = await CourseSetup.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    if (!updatedCourse) {
      return res.status(404).json({ error: "Course setup not found" });
    }

    res
      .status(200)
      .json({ message: "Course setup updated successfully", data: updatedCourse });
  } catch (error) {
    console.error("Error updating course setup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createCourseSetup,
  listOfSetupCourse,
  updateSetupCourseSequence,
  removeCourseSetup,
  updateCourseSetup
};

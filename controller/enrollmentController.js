const Course = require("../model/courseEventModel.js");
const dotenv = require("dotenv");
const Student = require("../model/studentModel.js");
const CourseCategory = require("../model/courseCategoryModel.js"); // ✅ Add this
const Enrollment = require("../model/enrollmentHistoryModel.js");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
dotenv.config();

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  throw new Error(
    "Cloudinary configuration is missing. Check your environment variables."
  );
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});


exports.enrollEligibility = async (req, res) => {
  const { studentId, courseId } = req.body;

  if (!studentId || !courseId) {
    return res
      .status(400)
      .json({ success: false, reasons: ["Missing student or course ID"] });
  }

  try {
    const course = await Course.findById(courseId);
    const student = await Student.findById(studentId);

    if (!course || !student) {
      return res
        .status(404)
        .json({ success: false, reasons: ["Course or Student not found"] });
    }

    const courseCategoryId =
      typeof course.category === "object" && course.category?._id
        ? course.category._id.toString()
        : course.category.toString();

    const {
      restrictReenrollment,
      postGraduationRequired,
      postGraduationYearRange,
      mustHave,
      requiredCourseCategory = [],
    } = course.prerequisites || {};

    const reasons = [];

    // ✅ Restrict re-enrollment check
    if (restrictReenrollment) {
      const matchedCategory = student.courses.find(
        (entry) => entry.courseCategoryId.toString() === courseCategoryId
      );

      if (!matchedCategory) {
        reasons.push(
          "Please update your profile with all courses info. If not avaibale then mark as no."
        );
      } else if (matchedCategory.status === "yes") {
        reasons.push(
          "You have already completed this course category. Re-enrollment is not allowed."
        );
      }
    }

    // ✅ Post-graduation degree check
    if (postGraduationRequired === "yes") {
      const degrees = student.postGraduationDegrees || [];
      const hasValidDegree = degrees.some((deg) => {
        const year = parseInt(deg.yearOfGraduation, 10);
        return (
          deg.isCompleted === true &&
          !isNaN(year) &&
          parseInt(postGraduationYearRange?.start) <= year &&
          year <= parseInt(postGraduationYearRange?.end)
        );
      });

      if (!hasValidDegree) {
        const start = postGraduationYearRange?.start || "N/A";
        const end = postGraduationYearRange?.end || "N/A";
        reasons.push(
          `Post-graduation degree required within the year range ${start}–${end}.`
        );
      }
    }

    // ✅ Must-have required course categories check
    if (mustHave === "yes" && requiredCourseCategory.length > 0) {
      const requiredIds = requiredCourseCategory.map((id) => id.toString());

      // 🔍 Fetch course categories
      const categories = await CourseCategory.find({
        _id: { $in: requiredIds },
      });

      const categoryMap = {};
      categories.forEach((cat) => {
        categoryMap[cat._id.toString()] = cat.courseName;
      });

      requiredIds.forEach((requiredId) => {
        const matchedCourse = student.courses.find(
          (course) =>
            course.courseCategoryId &&
            course.courseCategoryId.toString() === requiredId
        );

        const categoryTitle = categoryMap[requiredId] || "Unknown Category";

        if (!matchedCourse) {
          reasons.push(
            `Missing required course category "${categoryTitle}". Enrollment not allowed.`
          );
        } else if (matchedCourse.status !== "yes") {
          reasons.push(
            `Course category "${categoryTitle}" is incomplete or not passed.`
          );
        }
      });
    }

    if (reasons.length > 0) {
      return res.status(400).json({ success: false, reasons });
    }

    return res
      .status(200)
      .json({ success: true, message: "Eligible for enrollment." });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ success: false, reasons: ["Server error"] });
  }
};



exports.enrollStudent = async (req, res) => {
  try {
    const { courseId, studentId } = req.body;
    if (!courseId || !studentId) {
      return res.status(400).json({ error: "Missing courseId or studentId" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const now = new Date();

    // Check if registration is open
    if (
      now < course.registrationStartDate ||
      now > course.registrationEndDate
    ) {
      return res
        .status(403)
        .json({ error: "Registration window is closed." });
    }

    // Count current enrollments
    const totalEnrolled = await Enrollment.countDocuments({
      courseId,
      status: "enrolled",
    });

    const totalWaitlist = await Enrollment.countDocuments({
      courseId,
      status: "waitlist",
    });

    let status = "enrolled";

    if (totalEnrolled >= course.studentCap) {
      if (totalWaitlist < course.waitlistCap) {
        status = "waitlist";
      } else {
        return res.status(403).json({
          error: "Both student and waitlist capacities are full.",
        });
      }
    }

    // Prevent duplicate
    const alreadyEnrolled = await Enrollment.findOne({
      courseId,
      studentId,
    });
    if (alreadyEnrolled) {
      return res
        .status(409)
        .json({ error: "You already enrolled or waitlisted." });
    }

    const newEnrollment = new Enrollment({
      courseId,
      studentId,
      status,
    });

    await newEnrollment.save();

    return res.status(201).json({
      message: `Successfully ${status === "waitlist" ? "waitlisted" : "enrolled"}.`,
      data: newEnrollment,
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};


exports.getEnrollmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollments = await Enrollment.find({ courseId })
      .populate("studentId", "name bmdcNo email contactNumber") // get student info
      .populate("courseId", "title"); // optional, for title confirmation

    return res.json(enrollments);
  } catch (error) {
    console.error("Error fetching enrollments by course:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getFinalListByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollments = await Enrollment.find({
      courseId,
      status: "confirmed", // Only confirmed enrollments
    })
      .populate("studentId", "name bmdcNo email contactNumber")
      .populate("courseId", "title");

    return res.json(enrollments);
  } catch (error) {
    console.error("Error fetching confirmed enrollments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getEnrollmentsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const enrollments = await Enrollment.find({ studentId })
      .populate("courseId", "title"); // optional, for title confirmation

    return res.json(enrollments);
  } catch (error) {
    console.error("Error fetching enrollments by course:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const uploadPaymentProofToCloudinary = async (imageBuffer, courseTitleShortForm, courseStartDate) => {
  // Format: MMMYYYY (e.g., Jun2025)
  const monthYear = new Date(courseStartDate).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  }).replace(" ", "");

  const folderName = `aoa-bd/payment/${courseTitleShortForm}/${monthYear}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
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

const deleteFromCloudinary = async (publicId) => {
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res;
  } catch (error) {
    throw new Error("Cloudinary deletion failed");
  }
}

const generateShortForm = function (title = "") {
  return title
    .split(/[\s—–\-]+/) // Split on spaces, hyphens, em-dash etc.
    .map(word => word[0]?.toUpperCase())
    .filter(Boolean)
    .join("");
};

exports.uploadPaymentProof = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const file = req.file;

    console.log("Body", req.body);
    console.log("File", req.file);

    if (!studentId || !courseId || !file) {
      return res.status(400).json({ error: "Missing studentId, courseId, or file." });
    }

    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found." });
    }

    if (enrollment.status !== "enrolled") {
      return res.status(403).json({ error: "Only enrolled students can upload payment proof." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    const now = new Date();
    const { paymentReceiveStartDate, paymentReceiveEndDate, title } = course;

  if (now < paymentReceiveStartDate) {
  return res.status(403).json({ error: "Payment window is not open yet." });
}

if (now > paymentReceiveEndDate) {
  return res.status(403).json({ error: "Payment window is closed." });
}
    const titleShortForm = generateShortForm(title);

    const uploaded = await uploadPaymentProofToCloudinary(
      file.buffer,
      titleShortForm,
      paymentReceiveStartDate
    );

    enrollment.paymentProof = {
      url: uploaded.url,
      public_id: uploaded.public_id,
    };
    enrollment.paymentReceived = "pending";
    enrollment.paymentReceivedAt = new Date();

    await enrollment.save();

    return res.status(200).json({
      message: "Payment proof uploaded successfully.",
      data: enrollment,
    });
  } catch (error) {
    console.error("Upload Payment Proof Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.rejectEnrollmentPayment = async (req, res) => {
  try {
    const { id, remark } = req.body; // Get enrollment ID and remark from request body

    if (!id) return res.status(400).json({ error: "Enrollment ID is required" });

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });

    // Delete payment proof from Cloudinary if it exists
    if (enrollment.paymentProof?.public_id) {
      await deleteFromCloudinary(enrollment.paymentProof.public_id);
    }

    // Update fields
    enrollment.paymentProof = {};
    enrollment.paymentReceived = "rejected";
    enrollment.remark = remark || ""; // Use frontend remark or empty string
    await enrollment.save();

    res.json({ message: "Payment rejected and payment proof removed." });
  } catch (error) {
    console.error("Reject Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.acceptEnrollmentPayment = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Enrollment ID is required" });
    }

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // Update enrollment details
    enrollment.paymentReceived = "approved";
    enrollment.status = "confirmed";
    enrollment.remark = "";

    await enrollment.save();

    res.json({ message: "Payment accepted and enrollment confirmed." });
  } catch (error) {
    console.error("Accept Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.moveToEnrolled = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: "Missing studentId or courseId." });
    }

    const enrollment = await Enrollment.findOne({ studentId, courseId });

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found." });
    }

    if (enrollment.status !== "waitlist") {
      return res.status(400).json({
        error: `Only 'waitlist' students can be moved to 'enrolled'. Current status: ${enrollment.status}`,
      });
    }

    enrollment.status = "enrolled";
    await enrollment.save();

    return res.status(200).json({
      message: "Enrollment status changed to 'enrolled' successfully.",
      data: enrollment,
    });
  } catch (error) {
    console.error("Move to enrolled error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
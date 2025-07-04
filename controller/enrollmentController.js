const Course = require("../model/courseEventModel.js");
const dotenv = require("dotenv");
const Student = require("../model/studentModel.js");
const CourseCategory = require("../model/courseCategoryModel.js"); // ✅ Add this
const Enrollment = require("../model/enrollmentHistoryModel.js");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

dotenv.config();

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;
const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

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

// --------------------------------------------- Check Enrollment Eligibility Start Here ------------------------------------------------------------- //

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
    if (!student.isAccountVerified) {
      return res.status(403).json({
        success: false,
        reasons: [
          "Your account is not verified. Please wait for verification.",
        ],
      });
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

// --------------------------------------------- Check Enrollment Eligibility End Here ------------------------------------------------------------- //

// --------------------------------------------- Enrollment Function Start Here ------------------------------------------------------------- //

exports.enrollStudent = async (req, res) => {
  try {
    const { courseId, studentId, courseTitle, categoryId } = req.body;

    if (!courseId || !studentId || !courseTitle || !categoryId) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ✅ Verify student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    if (!student.isAccountVerified) {
      return res.status(403).json({ error: "Please wait for verification." });
    }

    const now = new Date();

    // ✅ Find or create enrollment doc for the course
    let enrollmentDoc = await Enrollment.findOne({ courseId });
    if (
      now < course.registrationStartDate ||
      now > course.registrationEndDate
    ) {
      return res.status(403).json({ error: "Registration window is closed." });
    }

    if (!enrollmentDoc) {
      enrollmentDoc = new Enrollment({
        courseId,
        courseTitle,
        categoryId,
        enrollments: [],
      });
    }

    const existing = enrollmentDoc.enrollments.find(
      (entry) => entry.studentId.toString() === studentId
    );

    if (existing) {
      return res
        .status(409)
        .json({ error: "You already enrolled or waitlisted." });
    }

    // ✅ Calculate current enrolled/waitlist count
    const totalEnrolled = enrollmentDoc.enrollments.filter(
      (e) => e.status === "enrolled"
    ).length;
    const totalWaitlist = enrollmentDoc.enrollments.filter(
      (e) => e.status === "waitlist"
    ).length;

    // Improved fallback cap logic
    const studentCap = course.studentCap ?? 0;
    const waitlistCap = course.waitlistCap ?? 0;

    let status = "enrolled";

    if (totalEnrolled >= studentCap) {
      if (totalWaitlist < waitlistCap) {
        status = "waitlist";
      } else {
        return res.status(403).json({
          error: "Both student and waitlist capacities are full.",
        });
      }
    }

    // ✅ Add enrollment
    enrollmentDoc.enrollments.push({
      studentId,
      status,
    });

    await enrollmentDoc.save();

    return res.status(201).json({
      message: `Successfully ${
        status === "waitlist" ? "waitlisted" : "enrolled"
      }.`,
      data: { courseId, studentId, status },
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
// --------------------------------------------- Enrollment Function End Here ------------------------------------------------------------- //

// --------------------------------------------- Get Enrollment Data Start Here ------------------------------------------------------------- //

exports.getEnrollmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Find enrollment doc for the course and populate nested studentId fields
    const enrollmentDoc = await Enrollment.findOne({ courseId })
      .populate("enrollments.studentId", "name bmdcNo email contactNumber")
      .populate("courseId", "title");

    if (!enrollmentDoc) {
      return res
        .status(404)
        .json({ error: "No enrollment history found for this course." });
    }

    // Return the document as-is, or you can shape it like this:
    const result = {
      _id: enrollmentDoc._id,
      courseId: enrollmentDoc.courseId._id,
      title: enrollmentDoc.courseId.title,
      categoryId: enrollmentDoc.categoryId,
      enrollments: enrollmentDoc.enrollments,
    };

    return res.json(result);
  } catch (error) {
    console.error("Error fetching enrollments by course:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// --------------------------------------------- Get Enrollment Data End Here ------------------------------------------------------------- //

// --------------------------------------------- Get Confirm List Start Here ------------------------------------------------------------- //

exports.getConfirmListByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Find the EnrollmentHistory document for this course
    const enrollmentHistory = await Enrollment.findOne({ courseId })
      .populate("enrollments.studentId", "name bmdcNo email contactNumber")
      .lean();

    if (!enrollmentHistory) {
      return res
        .status(404)
        .json({ error: "No enrollment history found for this course." });
    }

    // Filter only confirmed enrollments from the enrollments array
    const confirmedEnrollments = enrollmentHistory.enrollments.filter(
      (enrollment) => enrollment.status === "confirmed"
    );

    return res.json(confirmedEnrollments);
  } catch (error) {
    console.error("Error fetching confirmed enrollments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// --------------------------------------------- Get Confirm List End Here ------------------------------------------------------------- //

// --------------------------------------------- Get Final List Start Here ------------------------------------------------------------- //

exports.getFinalListByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required." });
    }

    const enrollmentHistory = await Enrollment.findOne({ courseId })
      .populate("enrollments.studentId", "name bmdcNo email contactNumber")
      .lean();

    if (!enrollmentHistory) {
      return res
        .status(404)
        .json({ error: "No enrollment history found for this course." });
    }

    const attendedEnrollments = enrollmentHistory.enrollments.filter(
      (enroll) => enroll.status === "confirmed" && enroll.isAttend === true
    );

    return res.json({
      courseId: enrollmentHistory.courseId,
      courseTitle: enrollmentHistory.courseTitle,
      categoryId: enrollmentHistory.categoryId,
      enrollments: attendedEnrollments,
    });
  } catch (error) {
    console.error("Error fetching attended confirmed enrollments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// --------------------------------------------- Get Final List End Here ------------------------------------------------------------- //

// --------------------------------------------- Get Enrollment By Student Start Here ------------------------------------------------------------- //

exports.getEnrollmentsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find EnrollmentHistory docs with student's enrollment, populate course title
    const enrollments = await Enrollment.find({
      "enrollments.studentId": studentId,
    }).populate("courseId", "title");

    const filtered = enrollments.map((doc) => {
      const enrollmentForStudent = doc.enrollments.find(
        (e) => e.studentId.toString() === studentId
      );

      return {
        _id: doc._id,
        title: doc.courseId?.title || "", // pull title from populated courseId
        courseId: doc.courseId?._id || null, // just the ObjectId string
        categoryId: doc.categoryId,
        enrollment: enrollmentForStudent,
      };
    });

    return res.json(filtered);
  } catch (error) {
    console.error("Error fetching enrollments by student:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// --------------------------------------------- Get Enrollment By Student End Here ------------------------------------------------------------- //

// --------------------------------------------- Upload Payment Prove to cloudinery Start Here ------------------------------------------------------------- //

const uploadPaymentProofToCloudinary = async (
  imageBuffer,
  courseTitleShortForm,
  courseStartDate
) => {
  // Format: MMMYYYY (e.g., Jun2025)
  const monthYear = new Date(courseStartDate)
    .toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    })
    .replace(" ", "");

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
};

const generateShortForm = function (title = "") {
  return title
    .split(/[\s—–\-]+/) // Split on spaces, hyphens, em-dash etc.
    .map((word) => word[0]?.toUpperCase())
    .filter(Boolean)
    .join("");
};

// --------------------------------------------- Upload Payment Prove to cloudinery End Here ------------------------------------------------------------- //

// --------------------------------------------- Payment Prove Start Here ------------------------------------------------------------- //

exports.uploadPaymentProof = async (req, res) => {
  try {
    const { studentId, enrollmentId } = req.body;
    const file = req.file;

    if (!studentId || !enrollmentId || !file) {
      return res
        .status(400)
        .json({ error: "Missing studentId, enrollmentId, or file." });
    }

    // Find the main document that contains the enrollment subdocument
    const enrollmentDoc = await Enrollment.findOne({
      "enrollments._id": enrollmentId,
    });

    if (!enrollmentDoc) {
      return res.status(404).json({ error: "Enrollment not found." });
    }

    const targetEnrollment = enrollmentDoc.enrollments.id(enrollmentId);

    if (!targetEnrollment) {
      return res.status(404).json({ error: "Enrollment entry not found." });
    }

    if (targetEnrollment.studentId.toString() !== studentId) {
      return res.status(403).json({ error: "Student ID mismatch." });
    }

    if (targetEnrollment.status !== "enrolled") {
      return res
        .status(403)
        .json({ error: "Only enrolled students can upload payment proof." });
    }

    const course = await Course.findById(enrollmentDoc.courseId);
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

    targetEnrollment.paymentProof = {
      url: uploaded.url,
      public_id: uploaded.public_id,
    };
    targetEnrollment.paymentReceived = "pending";
    targetEnrollment.paymentReceivedAt = new Date();

    await enrollmentDoc.save();

    return res.status(200).json({
      message: "Payment proof uploaded successfully.",
      data: targetEnrollment,
    });
  } catch (error) {
    console.error("Upload Payment Proof Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// --------------------------------------------- Payment Prove End Here ------------------------------------------------------------- //

// --------------------------------------------- Payment Reject Start Here ------------------------------------------------------------- //

exports.rejectEnrollmentPayment = async (req, res) => {
  try {
    const { courseId, studentId, remark } = req.body;

    if (!courseId || !studentId) {
      return res
        .status(400)
        .json({ error: "courseId and studentId are required" });
    }

    // Find the enrollment document for the course
    const enrollmentDoc = await Enrollment.findOne({ courseId });
    if (!enrollmentDoc) {
      return res
        .status(404)
        .json({ error: "Enrollment record not found for this course." });
    }

    // Find the specific student's enrollment inside the enrollments array
    const enrollment = enrollmentDoc.enrollments.find(
      (e) => e.studentId.toString() === studentId.toString()
    );

    if (!enrollment) {
      return res
        .status(404)
        .json({ error: "Student is not enrolled in this course." });
    }

    // Delete payment proof from Cloudinary if it exists
    if (enrollment.paymentProof?.public_id) {
      await deleteFromCloudinary(enrollment.paymentProof.public_id);
    }

    // Update the enrollment record fields
    enrollment.paymentProof = {};
    enrollment.paymentReceived = "rejected";
    enrollment.remark = remark || "";

    await enrollmentDoc.save();

    res.json({ message: "Payment rejected and payment proof removed." });
  } catch (error) {
    console.error("Reject Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --------------------------------------------- Payment Reject End Here ------------------------------------------------------------- //

// --------------------------------------------- Payment Accept Start Here ------------------------------------------------------------- //

exports.acceptEnrollmentPayment = async (req, res) => {
  try {
    const { courseId, studentId } = req.body;

    if (!courseId || !studentId) {
      return res
        .status(400)
        .json({ error: "courseId and studentId are required" });
    }

    const enrollmentDoc = await Enrollment.findOne({ courseId });
    if (!enrollmentDoc) {
      return res
        .status(404)
        .json({ error: "Enrollment record not found for this course." });
    }

    const enrollment = enrollmentDoc.enrollments.find(
      (e) => e.studentId?.toString() === String(studentId)
    );

    if (!enrollment) {
      return res
        .status(404)
        .json({ error: "Student is not enrolled in this course." });
    }

    // ✅ Update enrollment
    enrollment.paymentReceived = "approved";
    enrollment.status = "confirmed";
    enrollment.remark = "";
    enrollment.paymentReceivedAt = new Date();

    enrollmentDoc.markModified("enrollments"); // 👈 required for subdocs
    await enrollmentDoc.save();

    res.json({ message: "Payment accepted and enrollment confirmed." });
  } catch (error) {
    console.error("❌ Accept Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --------------------------------------------- Payment Accept End Here ------------------------------------------------------------- //

// --------------------------------------------- Move to enroll start Here ------------------------------------------------------------- //

exports.moveToEnrolled = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: "Missing studentId or courseId." });
    }

    // Find enrollment document by courseId
    const enrollmentDoc = await Enrollment.findOne({ courseId });
    if (!enrollmentDoc) {
      return res
        .status(404)
        .json({ error: "Enrollment record not found for this course." });
    }

    // Find specific student's enrollment
    const enrollment = enrollmentDoc.enrollments.find(
      (e) => e.studentId.toString() === studentId.toString()
    );

    if (!enrollment) {
      return res
        .status(404)
        .json({ error: "Student is not enrolled in this course." });
    }

    if (enrollment.status !== "waitlist") {
      return res.status(400).json({
        error: `Only 'waitlist' students can be moved to 'enrolled'. Current status: ${enrollment.status}`,
      });
    }

    // Update status inside the enrollments array
    enrollment.status = "enrolled";

    await enrollmentDoc.save();

    return res.status(200).json({
      message: "Enrollment status changed to 'enrolled' successfully.",
      data: enrollment,
    });
  } catch (error) {
    console.error("Move to enrolled error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// --------------------------------------------- Move to enroll End Here ------------------------------------------------------------- //

// --------------------------------------------- Update isAttend = true for selected students ------------------------------------------------------------- //

exports.markStudentsAsPresent = async (req, res) => {
  try {
    const { ids = [] } = req.body; // ids here are enrollment subdocument _ids
    const { courseId } = req.params;

    if (!Array.isArray(ids) || !courseId) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // Step 1: Set isAttend: true for selected enrollment subdocuments
    await Enrollment.updateOne(
      { courseId },
      {
        $set: { "enrollments.$[elem].isAttend": true },
      },
      {
        arrayFilters: [{ "elem._id": { $in: ids } }],
      }
    );

    // Step 2: Set isAttend: false for enrollment subdocuments NOT in selected ids
    await Enrollment.updateOne(
      { courseId },
      {
        $set: { "enrollments.$[elem].isAttend": false },
      },
      {
        arrayFilters: [{ "elem._id": { $nin: ids } }],
      }
    );

    return res.json({ success: true, message: "Attendance status updated" });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ error: "Failed to update attendance" });
  }
};

// --------------------------------------------- Update isAttend = true for selected students ------------------------------------------------------------- //

// --------------------------------------------- Certificate issue start here ------------------------------------------------------------- //
exports.markCertificateIssued = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { courseCategoryId } = req.body;

    if (!courseId || !courseCategoryId) {
      return res
        .status(400)
        .json({ error: "Course ID and Course Category ID are required." });
    }

    // Fetch course with recipients and title
    const course = await Course.findById(courseId)
      .populate("recipients.role")
      .select("title recipients");

    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    const courseTitleFormatted = course.title.replace(/\s+/g, "_");
    const enrollmentDoc = await Enrollment.findOne({ courseId }).populate(
      "enrollments.studentId",
      "_id"
    );

    if (!enrollmentDoc) {
      return res.status(404).json({ error: "Enrollment history not found" });
    }

    const attendedStudents = enrollmentDoc.enrollments.filter(
      (e) => e.isAttend === true
    );

    const currentYear = new Date().getFullYear().toString();

    // Enrolled student updates
    const updates = attendedStudents.map((entry) => {
      const studentId = entry.studentId?._id;
      if (!studentId) return;

      const previewUrl = `${BASE_URL}/certificate-preview?studentId=${studentId}&courseId=${courseId}&categoryId=${courseCategoryId}`;
      const document = {
        url: previewUrl,
        public_id: `preview-${studentId}-${courseId}`,
        name: courseTitleFormatted,
        size: 0,
      };

      return Student.updateOne(
        { _id: studentId, "courses.courseCategoryId": courseCategoryId },
        {
          $set: {
            "courses.$.status": "yes",
            "courses.$.completionYear": currentYear,
            "courses.$.systemUpload": true,
            "courses.$.documents": [document],
          },
        },
        { upsert: false }
      ).then(async (result) => {
        if (result.matchedCount === 0) {
          return Student.updateOne(
            { _id: studentId },
            {
              $push: {
                courses: {
                  courseCategoryId,
                  status: "yes",
                  completionYear: currentYear,
                  systemUpload: true,
                  documents: [document],
                },
              },
            }
          );
        }
      });
    });

    await Promise.all(updates);

    // Handle recipients
    for (const recipient of course.recipients) {
      const role = recipient.role;
      if (!role || !role._id) continue;

      const roleCategoryId = role._id.toString();
      const isMultiple = role.typeOfParticipation === 1;
      const profiles = recipient.profiles || [];

      const recipientUpdates = profiles.map(async (studentId) => {
        const student = await Student.findById(studentId);
        if (!student) return;

        const previewUrl = `${BASE_URL}/certificate-preview?studentId=${studentId}&courseId=${courseId}&categoryId=${roleCategoryId}`;
        const document = {
          url: previewUrl,
          public_id: `preview-${studentId}-${courseId}`,
          name: courseTitleFormatted,
          size: 0,
        };

        if (!Array.isArray(student.courses)) {
          student.courses = [];
        }

        const existingEntries = student.courses.filter(
          (c) => c.courseCategoryId?.toString() === roleCategoryId
        );

        if (!isMultiple) {
          // Single participation: replace old entry or add new
          student.courses = student.courses.filter(
            (c) => c.courseCategoryId?.toString() !== roleCategoryId
          );

          const completionYear = existingEntries.length
            ? existingEntries[0].completionYear
            : currentYear;

          student.courses.push({
            courseCategoryId: roleCategoryId,
            status: "yes",
            completionYear,
            systemUpload: true,
            documents: [document],
          });

          await student.save();
        } else {
          // Multiple participation: merge documents in existing entry or add new

          // Find existing course entry
          let courseEntry = student.courses.find(
            (c) => c.courseCategoryId?.toString() === roleCategoryId
          );

          if (courseEntry) {
            // Check if this document already exists in documents array
            const docExists = courseEntry.documents.some(
              (doc) => doc.public_id === document.public_id
            );

            if (!docExists) {
              courseEntry.documents.push(document);

              // Only set completionYear if not already set
              if (!courseEntry.completionYear) {
                courseEntry.completionYear = currentYear;
              }

              courseEntry.status = "yes";
              courseEntry.systemUpload = true;

              await student.save();
            }
          } else {
            // No existing course entry, add new

            // Check if there are already 10 entries with this courseCategoryId (rare, but let's keep it)
            const entriesWithCategory = student.courses.filter(
              (c) => c.courseCategoryId?.toString() === roleCategoryId
            );
            if (entriesWithCategory.length >= 10) {
              const indexToRemove = student.courses.findIndex(
                (c) => c.courseCategoryId?.toString() === roleCategoryId
              );
              if (indexToRemove !== -1) {
                student.courses.splice(indexToRemove, 1);
              }
            }

            student.courses.push({
              courseCategoryId: roleCategoryId,
              status: "yes",
              completionYear: currentYear,
              systemUpload: true,
              documents: [document],
            });

            await student.save();
          }
        }
      });

      await Promise.all(recipientUpdates);
    }

    return res.json({
      message:
        "Certificates marked as issued or updated (with systemUpload) for enrolled and recipient students.",
    });
  } catch (error) {
    console.error("Error issuing certificate metadata:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// --------------------------------------------- Certificate issue start here ------------------------------------------------------------- //

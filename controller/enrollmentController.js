const Course = require("../model/courseEventModel.js");
const Student = require("../model/studentModel.js");

exports.checkEnrollmentEligibility = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    console.log("✅ Route hit! Body:", req.body);

    const course = await Course.findById(courseId);
    const student = await Student.findById(studentId);

    if (!course || !student) {
      return res.status(404).json({
        success: false,
        message: "Student or Course not found",
      });
    }

    console.log("Course full object:", course);
    console.log("Student courses:", student.courses);

    const courseCategoryId = course.courseCategoryId || course.category;

    if (!courseCategoryId) {
      return res.status(500).json({
        success: false,
        message: "Course category ID not found in course data",
      });
    }

    // === 1️⃣ Course Category Enrollment Check ===
    const enrolledCourse = (student.courses || []).find((c) =>
      c.courseCategoryId && c.courseCategoryId.toString() === courseCategoryId.toString()
    );

    let passedCourseCategoryCheck = false;
    let courseCategoryMessage = "";

    if (!enrolledCourse) {
      passedCourseCategoryCheck = false;
      courseCategoryMessage = "❌ You have not enrolled in this course category before, so enrollment is not allowed.";
    } else if (enrolledCourse.status === "no") {
      passedCourseCategoryCheck = true;
      courseCategoryMessage = "✅ Your previous enrollment status is 'no', so you can enroll in this course category.";
    } else if (enrolledCourse.status === "yes") {
      passedCourseCategoryCheck = false;
      courseCategoryMessage = "❌ You have an active enrollment in this course category, so you cannot enroll again.";
    }

    // === 2️⃣ Post Graduation Check ===
    const { postGraduationRequired, postGraduationYearRange } = course.prerequisites || {};
    let passedPostGradCheck = true; // Default to true if not required
    let postGradMessage = "";

    if (postGraduationRequired === "yes") {
      const degrees = student.postGraduationDegrees || [];

      passedPostGradCheck = degrees.some((deg) => {
        if (!deg?.isCompleted || !deg?.yearOfGraduation) return false;

        if (postGraduationYearRange?.start && postGraduationYearRange?.end) {
          const year = parseInt(deg.yearOfGraduation);
          return (
            year >= parseInt(postGraduationYearRange.start) &&
            year <= parseInt(postGraduationYearRange.end)
          );
        }

        return true; // If no year range specified, any completed degree passes
      });

      const yearRangeText =
        postGraduationYearRange?.start && postGraduationYearRange?.end
          ? `between ${postGraduationYearRange.start} and ${postGraduationYearRange.end}`
          : "";

      postGradMessage = passedPostGradCheck
        ? `✅ You meet the post-graduation requirement ${yearRangeText}.`
        : `❌ Post-graduation required ${yearRangeText}, but not found in your records.`;
    } else {
      postGradMessage = "✅ Post-graduation requirement not applicable.";
    }

    // === Collect all prerequisites ===
    const prerequisitesList = [
      {
        title: "Course Category Enrollment Check",
        passed: passedCourseCategoryCheck,
        message: courseCategoryMessage,
      },
      {
        title: "Post-Graduation Requirement",
        passed: passedPostGradCheck,
        message: postGradMessage,
      },
    ];

    const allPassed = prerequisitesList.every((item) => item.passed);

    const summaryMessage = allPassed
      ? "🎉 You are eligible to enroll in this course."
      : "⚠️ You do not meet the enrollment requirements.";

    const fullMessage =
      summaryMessage + "\n" + prerequisitesList.map((p) => p.message).join("\n");

    return res.status(allPassed ? 200 : 403).json({
      success: allPassed,
      eligible: allPassed,
      prerequisites: prerequisitesList,
      message: fullMessage,
    });
  } catch (error) {
    console.error("Eligibility check failed:", error);
    res.status(500).json({
      success: false,
      message: "Server error during eligibility check",
    });
  }
};

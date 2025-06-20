const cron = require("node-cron");
const Enrollment = require("../model/enrollmentHistoryModel.js");
const Course = require("../model/courseEventModel.js");

const checkPaymentWindowExpiry = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("🔄 Running payment expiry check...");

    try {
      const now = new Date();

      // Step 1: Get all courses
      const allCourses = await Course.find({});

      const toExpire = [];
      const toReinstate = [];

      for (const course of allCourses) {
        if (!course.paymentReceiveEndDate) continue;

        if (course.paymentReceiveEndDate < now) {
          // Expire if past the window
          toExpire.push(course._id);
        } else {
          // Reinstate if extended
          toReinstate.push(course._id);
        }
      }

      // ✅ Step 2: Expire enrollments
      if (toExpire.length) {
        const result = await Enrollment.updateMany(
          {
            courseId: { $in: toExpire },
            "enrollments.status": "enrolled",
          },
          {
            $set: {
              "enrollments.$[elem].status": "expired",
              "enrollments.$[elem].remark": "",
            },
          },
          {
            arrayFilters: [{ "elem.status": "enrolled" }],
          }
        );
        console.log(`⏳ Expired ${result.modifiedCount} enrollments.`);
      }

      // ✅ Step 3: Reinstate expired if deadline was extended
      if (toReinstate.length) {
        const result = await Enrollment.updateMany(
          {
            courseId: { $in: toReinstate },
            "enrollments.status": "expired",
          },
          {
            $set: {
              "enrollments.$[elem].status": "enrolled",
            },
          },
          {
            arrayFilters: [{ "elem.status": "expired" }],
          }
        );
        console.log(`✅ Reinstated ${result.modifiedCount} expired enrollments.`);
      }
    } catch (error) {
      console.error("❌ Error in cron job:", error);
    }
  });
};

module.exports = checkPaymentWindowExpiry;

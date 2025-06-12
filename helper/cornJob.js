const cron = require("node-cron");
const Enrollment = require("../model/enrollmentHistoryModel.js");
const Course = require("../model/courseEventModel.js");

const checkPaymentWindowExpiry = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("🔄 Running payment expiry check...");

    try {
      const now = new Date();

      // Step 1: Find courses where paymentReceiveEndDate has passed
      const expiredCourses = await Course.find({
        paymentReceiveEndDate: { $lt: now },
      });

      const courseIds = expiredCourses.map((course) => course._id);

      if (courseIds.length > 0) {
        // Step 2: Update enrollments with status "enrolled" only
        const updated = await Enrollment.updateMany(
          {
            courseId: { $in: courseIds },
            status: "enrolled",
          },
          {
            $set: {
              status: "expired",
              remark: "", // Clear any existing remarks
            },
          }
        );

        console.log(`✅ Expired ${updated.modifiedCount} enrollments with cleared remarks.`);
      } else {
        console.log("ℹ️ No expired courses found.");
      }
    } catch (error) {
      console.error("❌ Error in cron job:", error);
    }
  });
};

module.exports = checkPaymentWindowExpiry;

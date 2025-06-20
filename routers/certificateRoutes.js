// routes/testRoutes.js
const express = require("express");
const router = express.Router();
const generateCertificateImageBuffer = require("../controller/certificateController.js");

router.get("/certificate-preview", async (req, res) => {
  try {
    const buffer = await generateCertificateImageBuffer({
      studentName: "Dr. Sadman Sakib",
      courseTitle: "AO Alliance Seminar Pediatric Fracture Management",
      role: "faculty",
      issuedDate: "15 June 2025",
      location: "Dhaka, Bangladesh",
    });

    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating preview");
  }
});

module.exports = router;

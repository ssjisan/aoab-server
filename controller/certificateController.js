const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const Student = require("../model/studentModel.js");
const Course = require("../model/courseEventModel.js");
const Category = require("../model/courseCategoryModel.js");

// Register fonts (only once)
registerFont(path.join(__dirname, "../assets/FuturaCyrillicDemi.ttf"), {
  family: "FuturaPtMedium",
});
registerFont(path.join(__dirname, "../assets/cour.ttf"), {
  family: "CourierCustom",
});
registerFont(path.join(__dirname, "../assets/Ubuntu/Ubuntu-Regular.ttf"), {
  family: "Ubuntu",
  weight: "normal",
});
registerFont(path.join(__dirname, "../assets/Ubuntu/Ubuntu-Medium.ttf"), {
  family: "Ubuntu",
  weight: "500",
});
registerFont(path.join(__dirname, "../assets/Ubuntu/Ubuntu-Bold.ttf"), {
  family: "Ubuntu",
  weight: "bold",
});

const generateCertificateImageBuffer = async ({
  studentName,
  courseTitle,
  issuedDate,
  location,
  role,
  signers = [],
}) => {
  const width = 1600;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Load background template
  const templatePath = path.join(__dirname, "../assets/certificate_main.png");
  const background = await loadImage(templatePath);
  ctx.drawImage(background, 0, 0, width, height);

  // === Name ===
  ctx.font = "36px FuturaPtMedium";
  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.fillText(studentName, width / 2 - 400, 440);

  // === Course Title (wrap if needed) ===
  ctx.font = "32px CourierCustom";
  const wrapText = (ctx, text, maxWidth) => {
    if (!text || typeof text !== "string") return [];
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        lines.push(line.trim());
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    return lines;
  };

  const maxLineWidth = 1400;
  const titleX = width / 2 - 656;
  const titleY = 590;
  const lineHeight = 48;
  const lines = wrapText(ctx, courseTitle, maxLineWidth);
  lines.forEach((line, index) => {
    ctx.fillText(line, titleX, titleY + index * lineHeight);
  });

  // === Role ===
  ctx.font = "bold 18px Ubuntu";
  ctx.fillText(role, width / 2 - 624, 712);

  // === Issued Date & Location ===
  ctx.font = "32px CourierCustom";
  ctx.fillText(issuedDate, width / 2 - 654, 850);
  ctx.fillText(location, width / 2 - 180, 850);

  // === Signatures (max 2) ===
  const signWidth = 200;
  const signHeight = 80;

  // Signature 1 position config
  const sign1ImageX = 860;
  const sign1ImageY = 950;
  const sign1NameX = 776 + signWidth / 2;
  const sign1NameY = sign1ImageY + signHeight + 40;
  const sign1RoleX = sign1NameX;
  const sign1RoleY = sign1ImageY + signHeight + 68;

  // Signature 2 position config
  const sign2ImageX = 1140;
  const sign2ImageY = 950;
  const sign2NameX = 1045 + signWidth / 2;
  const sign2NameY = sign2ImageY + signHeight + 40;
  const sign2RoleX = sign2NameX;
  const sign2RoleY = sign2ImageY + signHeight + 68;

  const [sig1, sig2] = signers;

  // === Signature 1 ===
  if (sig1) {
    if (sig1.signature?.url) {
      const signImg1 = await loadImage(sig1.signature.url);
      ctx.drawImage(signImg1, sign1ImageX, sign1ImageY, signWidth, signHeight);
    }
    ctx.font = "bold 20px Ubuntu";
    ctx.textAlign = "left";
    ctx.fillText(sig1.name, sign1NameX, sign1NameY);
    ctx.font = "normal 20px Ubuntu";
    ctx.fillText(sig1.roleTitle, sign1RoleX, sign1RoleY);
  }

  // === Signature 2 ===
  if (sig2) {
    if (sig2.signature?.url) {
      const signImg2 = await loadImage(sig2.signature.url);
      ctx.drawImage(signImg2, sign2ImageX, sign2ImageY, signWidth, signHeight);
    }
    ctx.font = "bold 20px Ubuntu";
    ctx.textAlign = "left";
    ctx.fillText(sig2.name, sign2NameX, sign2NameY);
    ctx.font = "normal 20px Ubuntu";
    ctx.fillText(sig2.roleTitle, sign2RoleX, sign2RoleY);
  }

  return canvas.toBuffer("image/png");
};

const certificatePreview = async (req, res) => {
  console.log("📩 [certificatePreview] Request received", req.query);

  try {
    const { studentId, courseId, categoryId } = req.query;

    if (!studentId || !courseId || !categoryId) {
      return res.status(400).json({
        error: "studentId, courseId, and categoryId are required.",
      });
    }

    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId)
      .populate("recipients.role")
      .populate("recipients.profiles");
    const category = await Category.findById(categoryId);

    if (!student || !course || !category) {
      return res
        .status(404)
        .json({ error: "Student, course, or category not found." });
    }

    const signers = [];

    for (const signerId of course.signatures || []) {
      // Loop through recipients to find matching student
      for (const recipient of course.recipients) {
        const matchingStudent = recipient.profiles.find(
          (profile) => profile._id.toString() === signerId.toString()
        );

        if (matchingStudent && recipient.role) {
          signers.push({
            name: matchingStudent.name,
            roleTitle:
              recipient.role.title || recipient.role.courseName || "Role",
            signature: matchingStudent.signature?.[0] || {},
          });
          break; // break inner loop once match is found
        }
      }

      if (signers.length >= 2) break; // we only show 2 max
    }

    const start = new Date(course.startDate);
    const end = new Date(course.endDate);

    let issuedDate;

    if (
      start.getDate() === end.getDate() &&
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      // If same day
      issuedDate = `${start.getDate()} ${start.toLocaleString("en-US", {
        month: "long",
      })}, ${start.getFullYear()}`;
    } else {
      // If different days (most cases)
      issuedDate = `${start.getDate()}-${end.getDate()} ${start.toLocaleString(
        "en-US",
        {
          month: "long",
        }
      )}, ${start.getFullYear()}`;
    }
    let userRoleLabel = "Participant"; // default

    for (const recipient of course.recipients) {
      if (
        recipient.profiles.some(
          (profile) => profile._id.toString() === student._id.toString()
        )
      ) {
        userRoleLabel =
          recipient.role?.title || recipient.role?.courseName || "Participant";
        break;
      }
    }
    const buffer = await generateCertificateImageBuffer({
      studentName: student.name,
      courseTitle: course.title,
      issuedDate,
      location: course.location,
      role: userRoleLabel,
      signers,
    });

    console.log(
      `✅ Certificate generated for: ${student.name} with ${signers.length} signer(s)`
    );

    res.set("Content-Type", "image/png");
    return res.send(buffer);
  } catch (err) {
    console.error("🔥 Error generating certificate preview:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate certificate preview" });
  }
};

module.exports = {
  generateCertificateImageBuffer,
  certificatePreview,
};

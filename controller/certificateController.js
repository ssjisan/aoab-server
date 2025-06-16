const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

// Register fonts
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
}) => {
  const width = 1600;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const templatePath = path.join(__dirname, "../assets/certificate_main.png");
  const background = await loadImage(templatePath);
  ctx.drawImage(background, 0, 0, width, height);

  // Name
  ctx.font = "bold 36px Ubuntu";
  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.fillText(studentName, 1600 / 2 - 656, 420);

  // Course Title (wrapped)
  ctx.font = "normal 32px Ubuntu";
  const maxLineWidth = 1400;
  const titleX = 1600 / 2 - 656;
  const startY = 590;
  const lineHeight = 48;

  const wrapText = (ctx, text, maxWidth) => {
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

  const lines = wrapText(ctx, courseTitle, maxLineWidth);
  lines.forEach((line, index) => {
    ctx.fillText(line, titleX, startY + index * lineHeight);
  });

  // Role
  ctx.font = "bold 18px Ubuntu";
  ctx.fillText(role, 1600 / 2 - 624, 712);

  // Issued Date
  ctx.font = "normal 32px Ubuntu";
  ctx.fillText(issuedDate, 1600 / 2 - 654, 850);

  // Location
  ctx.fillText(location, 1600 / 2 - 392, 850);

  // === Signatures ===
  const sign1Path = path.join(__dirname, "../assets/sign1.png");
  const sign2Path = path.join(__dirname, "../assets/sign2.png");

  const sign1 = await loadImage(sign1Path);
  const sign2 = await loadImage(sign2Path);

  // Customize X, Y positions as needed
  const sign1X = 760;
  const sign1Y = 970;
  const sign2X = 1040;
  const sign2Y = 970;
  const signWidth = 200;
  const signHeight = 80;

  // Draw signatures
  ctx.drawImage(sign1, 860, 950, signWidth, signHeight);
  ctx.drawImage(sign2, 1140, 950, signWidth, signHeight);

  // Names and Roles under signatures
  ctx.font = "bold 22px Ubuntu";
  ctx.textAlign = "left";
  ctx.fillText(
    "Dr. Name One",
    sign1X + signWidth / 2,
    sign1Y + signHeight + 25
  );
  ctx.font = "normal 18px Ubuntu";
  ctx.fillText(
    "Position One",
    sign1X + signWidth / 2,
    sign1Y + signHeight + 45
  );

  ctx.font = "bold 22px Ubuntu";
  ctx.fillText(
    "Dr. Name Two",
    sign2X + signWidth / 2,
    sign2Y + signHeight + 25
  );
  ctx.font = "normal 18px Ubuntu";
  ctx.fillText(
    "Position Two",
    sign2X + signWidth / 2,
    sign2Y + signHeight + 45
  );

  return canvas.toBuffer("image/png");
};

module.exports = generateCertificateImageBuffer;

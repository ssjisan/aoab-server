const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");

const authRoutes = require("./routers/authRoutes");
const onlineLearningRoutes = require("./routers/onlineLearningRoutes");
const videoRoutes = require("./routers/videoRoutes");
const courseEventRoutes = require("./routers/courseEventRoutes");
const importantLinksRoutes = require("./routers/importantLinksRoutes");
const formsRoutes = require("./routers/formsRoutes");
const albumRoutes = require("./routers/albumRoutes");
const studentRoutes = require("./routers/studentRoutes");
const webMessage = require("./helper/webMessage.js");
const courseCategoryRoutes = require("./routers/courseCategoryRoutes.js")

dotenv.config();

// Initialize Express App
const app = express();

// connect database //
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Router middleware
app.use(authRoutes);
app.use(onlineLearningRoutes);
app.use(videoRoutes);
app.use(courseEventRoutes);
app.use(courseCategoryRoutes);
app.use(importantLinksRoutes);
app.use(formsRoutes);
app.use(albumRoutes);
app.use(studentRoutes);

const port = process.env.PORT || 8001;

// Basic Route
app.get("/", (req, res) => {
  res.send(webMessage);
});

app.listen(port, () => {
  console.log(`🔊 Server running on http://localhost:${port}`);
});

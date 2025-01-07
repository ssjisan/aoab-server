import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";
import cors from "cors";
import authRoutes from "./routers/authRoutes.js";
import onlineLearningRoutes from "./routers/onlineLearningRoutes.js";
import videoRoutes from "./routers/videoRoutes.js";
import courseEventRoutes from "./routers/courseEventRoutes.js";

dotenv.config();
// exercise
const app = express();

// Connect to the database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Database connected"))
  .catch((err) => console.error(err));

// CORS configuration

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Router middleware
app.use(authRoutes);
app.use(onlineLearningRoutes);
app.use(videoRoutes);
app.use(courseEventRoutes);

const port = process.env.PORT || 8001;

app.get("/", (req, res) => {
  res.send("Hi!!! Your are getting data");
});

app.listen(port, () => {
  console.log(`This is running ${port}`);
});

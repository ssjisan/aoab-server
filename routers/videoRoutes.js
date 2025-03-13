const express = require("express");
const { requiredSignIn } = require("../middlewares/authMiddleware.js");
const {
  uploadNewVideo,
  getVideoList,
  updateVideoSequence,
  deleteVideo,
  readVideo,
  updateVideo,
  getLimitedVideo
} = require("../controller/videoController.js");
const multer = require("multer");

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Route to upload a new video with an optional thumbnail
router.post(
  "/upload_video",
  requiredSignIn,
  upload.single("thumbnail"), // Middleware to handle thumbnail upload
  uploadNewVideo
);

router.get("/list_videos", getVideoList);
router.get("/videos", getLimitedVideo);
router.post("/update-video-order", requiredSignIn, updateVideoSequence);
router.delete("/video/:slug", requiredSignIn, deleteVideo);
router.get("/video/:slug", readVideo);
router.put("/video/:slug", requiredSignIn, upload.single("thumbnail"), updateVideo);

module.exports = router;

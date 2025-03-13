const { v2: cloudinary } = require("cloudinary");
const dotenv = require("dotenv");
const Videos = require("../model/videoModel.js");
const slugify = require("slugify"); // Assuming you have slugify installed

dotenv.config();

const CLOUD_NAME = process.env.CLOUD_NAME;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

const uploadImageToCloudinary = async (imageBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "aoa-bd/videos", // Specify the folder name here
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

const uploadNewVideo = async (req, res) => {
  try {
    const { title, url } = req.body;
    const thumbnail = req.file;

    // Upload the profile photo to Cloudinary
    let uploadThumbnail = null;
    if (thumbnail) {
      uploadThumbnail = await uploadImageToCloudinary(thumbnail.buffer);
    }

    // Validate required fields
    switch (true) {
      case !title.trim():
        return res.json({ error: "Name is required" });
      case !url.trim():
        return res.json({ error: "Video URL is required" });
    }

    // Create video type
    let videoType;
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    const googleDriveRegex = /^(https?:\/\/)?(drive\.google\.com\/.*)$/; // Basic regex for Google Drive links

    // Determine video type
    if (youtubeRegex.test(url)) {
      videoType = "youtube";
    } else if (googleDriveRegex.test(url)) {
      videoType = "google-drive";
    } else {
      return res.status(400).json({ error: "Invalid video URL" });
    }

    // Generate slug from title
    const slug = slugify(title, {
      lower: true,
      remove: /[&\/\\#,+()$~%.'":*?<>{}]/g,
    });
    // Create a new member document
    const video = new Videos({
      thumbnail: uploadThumbnail ? [uploadThumbnail] : [], // Store the uploaded image data
      title,
      url,
      slug,
      videoType,
    });

    // Save the member to the database
    await video.save();

    // Send the created member as a response
    res.status(201).json(video);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

// Controller for fetching all video
const getVideoList = async (req, res) => {
  try {
    // Fetch all albums from the database
    const videos = await Videos.find().sort({
      sequence: 1,
      createdAt: -1,
    });
    // Return the list of albums as a JSON response
    res.status(200).json(videos);
  } catch (err) {
    console.error("Error fetching albums:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Update Sequence of Resource
const updateVideoSequence = async (req, res) => {
  try {
    const { reorderedVideos } = req.body; // Array of videos with updated sequences

    const bulkOps = reorderedVideos.map((resource, index) => ({
      updateOne: {
        filter: { _id: resource._id },
        update: { $set: { sequence: index + 1 } }, // Update the sequence field
      },
    }));

    await Videos.bulkWrite(bulkOps);

    res.status(200).json({ message: "Video sequence updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating video sequence" });
  }
};

// Controller for Delete video
const deleteVideo = async (req, res) => {
  try {
    // Extract slug from the request parameters (assuming it's passed in the URL)
    const { slug } = req.params;

    // Find the video by the slug and remove it from the database
    const deletedVideo = await Videos.findOneAndDelete({ slug });

    // If no video is found with the given slug
    if (!deletedVideo) {
      return res.status(404).json({ message: "Video not found" });
    }
    if (deletedVideo.thumbnail && deletedVideo.thumbnail.length > 0) {
      try {
        const publicId = deletedVideo.thumbnail[0].public_id;
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        res.json({ message: error.message });
      }
    }
    // Respond with success message
    res.status(200).json({ message: `Video deleted successfully` });
  } catch (err) {
    console.error("Error deleting video: ", err);

    // Handle any errors
    res
      .status(500)
      .json({ message: "Failed to delete video. Please try again later." });
  }
};

// Controller for reading a single video
const readVideo = async (req, res) => {
  try {
    const { slug } = req.params; // This is correctly pulling albumId from the route parameters.
    const video = await Videos.findOne({ slug }); // Use findById with albumId

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }
    res.json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller for Updating a single video
const updateVideo = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, url } = req.body;
    const newThumbnail = req.file;

    // Find the existing video by ID
    const video = await Videos.findOne({ slug });
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Update text fields
    video.title = title || video.title;
    video.url = url || video.url;
    video.slug = title
      ? slugify(title, {
          lower: true,
          remove: /[&\/\\#,+()$~%.'":*?<>{}]/g,
        })
      : video.slug;

    // Determine the video type based on the URL
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    const googleDriveRegex = /^(https?:\/\/)?(drive\.google\.com\/.*)$/;

    if (youtubeRegex.test(url)) {
      video.videoType = "youtube";
    } else if (googleDriveRegex.test(url)) {
      video.videoType = "google-drive";
    } else {
      return res.status(400).json({ error: "Invalid video URL" });
    }

    // Handle thumbnail update if a new image is uploaded
    if (newThumbnail) {
      // Remove the old thumbnail from Cloudinary
      if (video.thumbnail && video.thumbnail.length > 0) {
        const publicId = video.thumbnail[0].public_id;
        await cloudinary.uploader.destroy(publicId);
      }

      // Upload the new thumbnail to Cloudinary
      const uploadedThumbnail = await uploadImageToCloudinary(
        newThumbnail.buffer
      );
      video.thumbnail = [uploadedThumbnail]; // Update thumbnail data
    }

    // Save updated video to the database
    await video.save();

    // Return updated video
    res.status(200).json(video);
  } catch (err) {
    console.error("Error updating video:", err);
    res.status(500).json({ message: err.message });
  }
};

// Controller for fetching a limited number of videos
const getLimitedVideo = async (req, res) => {
  try {
    // Parse limit and skip from query parameters
    const limit = parseInt(req.query.limit) || 1; // Default to 5 if not provided
    const skip = parseInt(req.query.skip) || 0; // Default to 0 if not provided

    // Fetch videos from the database with limit and skip
    const videos = await Videos.find()
      .sort({
        sequence: 1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);

    // Check if there are more videos left to load
    const totalVideos = await Videos.countDocuments();
    const hasMore = skip + limit < totalVideos;

    // Respond with the videos and whether more videos are available
    res.status(200).json({ videos, hasMore });
  } catch (err) {
    console.error("Error fetching limited videos:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  uploadNewVideo,
  getVideoList,
  updateVideoSequence,
  deleteVideo,
  readVideo,
  updateVideo,
  getLimitedVideo,
};

const slugify = require("slugify");
const Albums = require("../model/albumModel");
const { v2: cloudinary } = require("cloudinary");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const CLOUD_NAME = process.env.CLOUD_NAME;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

// Function to upload image to Cloudinary
const uploadImageToCloudinary = async (imageBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "aoab/album", // Specify the folder name here
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result); // Return the full result for name and size processing
        }
      }
    );
    stream.end(imageBuffer);
  });
};

// Utility function to delete local files
const deleteLocalFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Failed to delete local file: ${filePath}`);
    } else {
    }
  });
};

// Controller to create an album
const uploadNewAlbum = async (req, res) => {
  try {
    const { name } = req.body;

    // Check if album name is provided
    if (!name) {
      return res.status(400).json({ message: "Album name is required" });
    }

    const images = req.files;

    // Check if any images are uploaded
    if (!images || images.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const uploadedImages = [];

    // Upload each image to Cloudinary
    for (const image of images) {
      const uploadResult = await uploadImageToCloudinary(image.buffer);

      uploadedImages.push({
        src: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        name: image.originalname, // Get original name from the uploaded file
        size: (image.size / (1024 * 1024)).toFixed(2), // Convert size to MB
      });
    }

    // Create a new album document
    const album = new Albums({
      name,
      slug: slugify(name, { lower: true }),
      images: uploadedImages,
    });

    // Save the album to the database
    await album.save();

    // Send the created album as a response
    res.status(201).json({
      message: "Album created successfully",
      album,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API for list of albums
const listOfAllAlbums = async (req, res) => {
  try {
    // Fetch all albums from the database
    const albums = await Albums.find();

    // Return the list of albums as a JSON response
    res.status(200).json(albums);
  } catch (err) {
    console.error("Error fetching albums:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller for reading a single album
const readAlbum = async (req, res) => {
  try {
    const { albumId } = req.params; // This is correctly pulling albumId from the route parameters.
    const album = await Albums.findById(albumId); // Use findById with albumId

    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }
    res.json(album);
  } catch (error) {
    console.error("Error fetching album:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller for Delete Album from db
const deleteAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;

    // Find the album by id
    const album = await Albums.findById(albumId);
    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    // Delete images from Cloudinary
    for (const image of album.images) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
      } catch (error) {
        console.error(`Error deleting image from Cloudinary: ${error.message}`);
      }
    }

    // Delete album from database
    await Albums.findByIdAndDelete(albumId);

    res
      .status(200)
      .json({ message: "Album and its images deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update album controller

const updateAlbum = async (req, res) => {
  try {
    const { albumName } = req.body;

    // Parse existingImages from request body
    let existingImages = [];
    if (req.body.existingImages) {
      existingImages = JSON.parse(req.body.existingImages);
    }

    // Find the album by ID
    const album = await Albums.findById(req.params.albumId);
    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    // Remove old images that are not in the existingImages array
    const imagesToRemove = album.images.filter(
      (image) =>
        !existingImages.some((img) => img.public_id === image.public_id)
    );

    // Remove images from Cloudinary
    for (const image of imagesToRemove) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
      } catch (error) {
        console.error(`Error deleting image from Cloudinary: ${error.message}`);
      }
    }

    // Upload new images to Cloudinary
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadImageToCloudinary(file.buffer);
        uploadedImages.push({
          src: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          name: file.originalname,
          size: (file.size / (1024 * 1024)).toFixed(2), // Convert size to MB
        });
      }
    }

    // Combine existing images and newly uploaded images
    const finalImages = [...existingImages, ...uploadedImages];

    // Update album with new data
    album.name = albumName;
    album.images = finalImages;

    // Save the updated album
    await album.save();

    res.status(200).json({ message: "Album updated successfully", album });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

//  Update Sequence of Album
const updateAlbumSequence = async (req, res) => {
  try {
    const { reorderedAlbums } = req.body;

    // Clear the current collection
    await Albums.deleteMany({});

    // Insert the reordered videos
    await Albums.insertMany(reorderedAlbums);

    res.status(200).json({ message: "Album sequence updated successfully" });
  } catch (err) {
    console.error("Error updating album sequence:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  uploadNewAlbum,
  listOfAllAlbums,
  readAlbum,
  deleteAlbum,
  updateAlbum,
  updateAlbumSequence,
};

const Student = require("../model/studentModel.js");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;

dotenv.config();

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  throw new Error(
    "Cloudinary configuration is missing. Check your environment variables."
  );
}

// ********************************************** The Cloudinary upload function start here ********************************************** //

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

const uploadImageToCloudinary = async (imageBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "aoa-bd/student-profile", // Specify the folder name here
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

// ********************************************** The Cloudinary upload function end here ********************************************** //

// ********************************************** Get Profile Data function start here ********************************************** //

const getProfileData = async (req, res) => {
  try {
    // Get the user ID from the verified JWT token
    const userId = req.user.id;

    // Fetch the user's profile using the ID
    const userProfile = await Student.findById(userId);

    if (!userProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    // Return the user profile data
    res.json(userProfile);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching profile data", error: err.message });
  }
};

// ********************************************** Get Profile Data function end here ********************************************** //

// ********************************************** Update Profile Photo function start here ********************************************** //

const updateProfileImage = async (req, res) => {
  try {
    // Get the user ID from the verified JWT token
    const userId = req.user.id;

    // Get the uploaded file from the request
    const profileImage = req.file;

    // Find the student profile
    const studentProfile = await Student.findById(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // If user already has a profile image, delete it from Cloudinary
    if (studentProfile.picture.length > 0) {
      const oldImage = studentProfile.picture[0]; // Get the first (only) image
      if (oldImage.public_id) {
        try {
          await cloudinary.uploader.destroy(oldImage.public_id); // Delete from Cloudinary
          console.log("Old image deleted:", oldImage.public_id);
        } catch (err) {
          console.error("Error deleting old image from Cloudinary:", err);
        }
      }
    }

    // Upload the new image to Cloudinary
    let uploadedImage;
    try {
      uploadedImage = await uploadImageToCloudinary(profileImage.buffer);
    } catch (err) {
      console.error("Error uploading image to Cloudinary:", err);
      return res.status(500).json({ error: "Failed to upload profile image" });
    }

    // Replace the old picture with the new one (ensure it's an array)
    studentProfile.picture = [
      {
        url: uploadedImage.url,
        public_id: uploadedImage.public_id,
      },
    ];

    // Save the updated profile
    await studentProfile.save();

    // Respond with the updated profile
    res.status(200).json(studentProfile);
  } catch (err) {
    console.error("Error updating profile image:", err);
    res
      .status(500)
      .json({ message: "Error updating profile image", error: err.message });
  }
};

// ********************************************** Update Profile Photo function start here ********************************************** //

module.exports = {
  getProfileData,
  updateProfileImage,
};

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

// ********************************************** Upload PDF to Cloudinary ********************************************** //

const uploadPdfToCloudinary = async (pdfBuffer, studentName) => {
  return new Promise((resolve, reject) => {
    const folderPath = `aoa-bd/documents/${studentName.replace(/\s+/g, "_")}`; // Replace spaces with underscores for folder name

    const stream = cloudinary.uploader.upload_stream(
      { folder: folderPath, resource_type: "raw" }, // Set folder dynamically
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(pdfBuffer);
  });
};

const deletePdfFromCloudinary = async (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: "raw" },
      (error, result) => {
        if (error) {
          reject(error); // Reject the promise if an error occurs
        } else {
          resolve(result); // Resolve with the result if successful
        }
      }
    );
  });
};

// ********************************************** The Cloudinary upload function end here ********************************************** //

// ********************************************** Get Profile Data function start here ********************************************** //

const getProfileData = async (req, res) => {
  try {
    // Get the user ID from the verified JWT token
    const userId = req.user._id;

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
    const userId = req.user._id;

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

// ********************************************** Upload PDF & Update Status ********************************************** //

const updateCourseDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fieldName, status } = req.body; // Expecting a field name like "aoBasicCourse"
    const pdfFiles = req.files; // This will be an array if using upload.array("documents")
    console.log("Request Body:", req.body); // Logs fieldName and status
    console.log("Uploaded Files:", pdfFiles); // Logs files received by multer

    if (!fieldName) {
      return res.status(400).json({ error: "Field name is required" });
    }

    const studentProfile = await Student.findById(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // Ensure the field exists in the schema
    if (!(fieldName in studentProfile)) {
      return res.status(400).json({ error: "Invalid field name" });
    }

    // Update status if provided
    if (status) {
      studentProfile[fieldName].status = status;
    }

    // Determine whether the field allows multiple files
    const isMultipleFilesAllowed = [
      "aoaOtherCourses",
      "aoaFellowship",
      "tableFaculty",
      "nationalFaculty",
    ].includes(fieldName);

    if (pdfFiles && pdfFiles.length > 0) {
      let uploadedPdf;
      try {
        // If the field allows only one file (aoBasicCourse, aoAdvanceCourse, aoMastersCourse, etc.)
        if (!isMultipleFilesAllowed) {
          // Delete the previous document from Cloudinary if it's there
          if (studentProfile[fieldName].documents.length > 0) {
            const oldDocument = studentProfile[fieldName].documents[0];
            await deletePdfFromCloudinary(oldDocument.public_id); // Assuming you have this function to delete the old document
          }

          // Upload the new file to Cloudinary
          uploadedPdf = await uploadPdfToCloudinary(
            pdfFiles[0].buffer,
            studentProfile.name
          );

          // Replace the document with the new one (only one document is allowed)
          studentProfile[fieldName].documents = [
            {
              url: uploadedPdf.url,
              public_id: uploadedPdf.public_id,
            },
          ];
        } else {
          // If the field allows multiple files, add them to the documents array
          for (let file of pdfFiles) {
            uploadedPdf = await uploadPdfToCloudinary(
              file.buffer,
              studentProfile.name
            );

            studentProfile[fieldName].documents.push({
              url: uploadedPdf.url,
              public_id: uploadedPdf.public_id,
            });
          }
        }
      } catch (err) {
        console.log(err.message);
        return res.status(500).json({
          error: "Failed to upload PDF document",
          details: err.message,
        });
      }
    }

    // Save the updated profile
    await studentProfile.save();

    res.status(200).json(studentProfile);
  } catch (err) {
    console.error("Error updating course document:", err); // Detailed logging
    res
      .status(500)
      .json({ message: "Error updating course document", error: err.message });
  }
};

module.exports = {
  getProfileData,
  updateProfileImage,
  updateCourseDocument,
};

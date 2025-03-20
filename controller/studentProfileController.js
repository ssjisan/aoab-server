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
    const sanitizedStudentName = studentName.replace(/\s+/g, "_"); // Replace spaces with underscores
    const timestamp = Date.now(); // Unique timestamp
    const uniqueFilename = `document_${timestamp}`; // Ensuring unique file name

    const folderPath = `aoa-bd/documents/${sanitizedStudentName}`;

    const stream = cloudinary.uploader.upload_stream(
      { folder: folderPath, public_id: uniqueFilename, resource_type: "raw" }, // Set unique file name
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
    const { fieldName, status, removeFileId, removedFiles, completionYear } =
      req.body; // Capture removeFileId
    const pdfFiles = req.files;

    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", pdfFiles);
    console.log("File to Remove:", removedFiles);

    if (!fieldName) {
      return res.status(400).json({ error: "Field name is required" });
    }

    const studentProfile = await Student.findById(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    if (!(fieldName in studentProfile)) {
      return res.status(400).json({ error: "Invalid field name" });
    }

    if (removedFiles && removedFiles.length > 0) {
      for (const removeFileId of removedFiles) {
        console.log("Removing file with public_id:", removeFileId); // Debugging removeFileId

        const docIndex = studentProfile[fieldName].documents.findIndex(
          (doc) => doc.public_id === removeFileId
        );

        if (docIndex !== -1) {
          console.log(
            "Found document to remove:",
            studentProfile[fieldName].documents[docIndex]
          );

          // Delete the file from Cloudinary
          try {
            await deletePdfFromCloudinary(removeFileId);
            console.log("Deleted file from Cloudinary:", removeFileId); // Debugging Cloudinary delete success
          } catch (err) {
            console.error("Error deleting file from Cloudinary:", err); // Debugging Cloudinary delete failure
            return res.status(500).json({
              error: "Failed to delete document from Cloudinary",
              details: err.message,
            });
          }

          // Remove file from the documents array in the database
          studentProfile[fieldName].documents.splice(docIndex, 1);
          console.log(
            "Updated documents array after removal:",
            studentProfile[fieldName].documents
          ); // Debugging documents after removal
        } else {
          console.log("No document found with public_id:", removeFileId); // Debugging when document is not found
        }
      }
    }

    // Remove files from Cloudinary if status is "no" and there are documents to remove
    if (status === "no") {
      if (studentProfile[fieldName].documents.length > 0) {
        for (let doc of studentProfile[fieldName].documents) {
          await deletePdfFromCloudinary(doc.public_id);
        }
        studentProfile[fieldName].documents = [];
      }
      studentProfile[fieldName].status = "no";
      studentProfile[fieldName].completionYear = null;
      await studentProfile.save();
      return res
        .status(200)
        .json({ message: "Documents deleted successfully", studentProfile });
    }

    // ✅ If "Yes" is selected, document upload is mandatory
    if (
      status === "yes" &&
      (!pdfFiles || pdfFiles.length === 0) &&
      studentProfile[fieldName].documents.length === 0
    ) {
      return res.status(400).json({
        error: "You must upload at least one document when selecting 'Yes'.",
      });
    }

    // ✅ Define which labels allow multiple files
    const isMultipleFilesAllowed = [
      "aoaOtherCourses",
      "aoaFellowship",
      "tableFaculty",
      "nationalFaculty",
    ].includes(fieldName);

    // ✅ Validate File Size
    let totalSize = studentProfile[fieldName].documents.reduce(
      (acc, file) => acc + file.size,
      0
    );
    if (pdfFiles && pdfFiles.length > 0) {
      totalSize += pdfFiles.reduce((acc, file) => acc + file.size, 0);
    }

    if (
      !isMultipleFilesAllowed &&
      pdfFiles.length > 0 &&
      pdfFiles[0].size > 1024 * 1024
    ) {
      return res
        .status(400)
        .json({ error: "Single file size must not exceed 1MB." });
    }

    if (isMultipleFilesAllowed && totalSize > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: "Each file must be max 1MB, and total must not exceed 5MB.",
      });
    }

    // ✅ Upload New Files and Replace Old Ones
    if (pdfFiles.length > 0) {
      let uploadedPdf;
      try {
        if (!isMultipleFilesAllowed) {
          // Delete old document before replacing it
          if (studentProfile[fieldName].documents.length > 0) {
            const oldDocument = studentProfile[fieldName].documents[0];
            await deletePdfFromCloudinary(oldDocument.public_id);
          }

          // Upload new file
          uploadedPdf = await uploadPdfToCloudinary(
            pdfFiles[0].buffer,
            studentProfile.name
          );
          studentProfile[fieldName].documents = [
            {
              url: uploadedPdf.url,
              public_id: uploadedPdf.public_id,
              name: pdfFiles[0].originalname,
              size: pdfFiles[0].size,
            },
          ];
        } else {
          // Check if we are exceeding max limit (5 files)
          if (
            studentProfile[fieldName].documents.length + pdfFiles.length >
            5
          ) {
            return res
              .status(400)
              .json({ error: "You can upload a maximum of 5 documents." });
          }

          for (let file of pdfFiles) {
            uploadedPdf = await uploadPdfToCloudinary(
              file.buffer,
              studentProfile.name
            );
            studentProfile[fieldName].documents.push({
              url: uploadedPdf.url,
              public_id: uploadedPdf.public_id,
              name: file.originalname,
              size: file.size,
            });
          }
        }
      } catch (err) {
        console.error("Error uploading document:", err.message);
        return res.status(500).json({
          error: "Failed to upload PDF document",
          details: err.message,
        });
      }
    }

    // ✅ Update Status
    studentProfile[fieldName].status = "yes";
    if (completionYear) {
      studentProfile[fieldName].completionYear = completionYear; // Update completionYear if provided
    }
    await studentProfile.save();

    res.status(200).json(studentProfile);
  } catch (err) {
    console.error("Error updating course document:", err);
    res
      .status(500)
      .json({ message: "Error updating course document", error: err.message });
  }
};

// ************************************************** Upload PDF & Update Status ************************************************** //

// ************************************************** Update Student Profile Data ************************************************** //
const updateStudentDetails = async (req, res) => {
  try {
    const studentId = req.user._id;
    let updateData = req.body;
    console.log("Request Body:", updateData);
    console.log("studentId:", studentId);

    // Find the student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check for duplicate email (if email is being updated)
    if (updateData.email && updateData.email !== student.email) {
      const existingEmail = await Student.findOne({ email: updateData.email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email is already in use." });
      }
    }

    // Check for duplicate BMDC number (if being updated)
    if (updateData.bmdcNo && updateData.bmdcNo !== student.bmdcNo) {
      const existingBmdc = await Student.findOne({ bmdcNo: updateData.bmdcNo });
      if (existingBmdc) {
        return res
          .status(400)
          .json({ message: "BMDC number is already in use." });
      }
    }

    // Check for duplicate contact number (if being updated)
    if (
      updateData.contactNumber &&
      updateData.contactNumber !== student.contactNumber
    ) {
      const existingContact = await Student.findOne({
        contactNumber: updateData.contactNumber,
      });
      if (existingContact) {
        return res
          .status(400)
          .json({ message: "Contact number is already in use." });
      }
    }

    // Prevent updates to `name` and `bmdcNo` if BMDC is verified
    if (student.isBmdcVerified) {
      delete updateData.name; // Prevent name change
      delete updateData.bmdcNo; // Prevent BMDC number change
    }

    // Update the student document with the allowed fields
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: "Student details updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student details:", error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]; // Get the duplicate field
      return res.status(400).json({ message: `${field} is already in use.` });
    }

    res.status(500).json({
      message: "Error updating student details",
      error: error.message,
    });
  }
};

// Is AccountVerified Data list //
const getUnverifiedStudents = async (req, res) => {
  try {
    const unverifiedStudents = await Student.find({ isAccountVerified: false });
    res.json(unverifiedStudents);
  } catch (error) {
    res.json("Error fetching unverified students:", error);
  }
};

// True account verified data
const getVerifiedStudents = async (req, res) => {
  try {
    const { label, status } = req.query;

    const query = { isAccountVerified: true };
    
    const validLabels = [
      "aoBasicCourse",
      "aoAdvanceCourse",
      "aoMastersCourse",
      "aoaPediatricSeminar",
      "aoaPelvicSeminar",
      "aoaFootAnkleSeminar",
      "aoPeer",
      "aoaOtherCourses",
      "aoaFellowship",
      "tableFaculty",
      "nationalFaculty",
    ];
    
    if (label && validLabels.includes(label)) {
      if (status === "yes" || status === "no") {
        query[`${label}.status`] = status;
      } else {
        query[`${label}.status`] = { $exists: true }; // Includes fields with any value (null included)
      }
    }
    console.log("Final",query);

    const verifiedStudents = await Student.find(query);

    if (verifiedStudents.length === 0) {
      return res.status(200).json([]); // Return empty array with a successful status code
    }

    res.json(verifiedStudents);
  } catch (error) {
    console.error("Error fetching verified students:", error);
    res.status(500).json({ message: "Error fetching verified students" });
  }
};

// Controlel for approve student //
const approveStudent = async (req, res) => {
  const { studentId } = req.params; // Expecting studentId in the URL

  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        isAccountVerified: true,
        isBmdcVerified: true,
        remarks: null,
      },
      { new: true } // This option ensures the updated document is returned
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    console.log("Student Approved:", updatedStudent);
    res.json(updatedStudent);
  } catch (error) {
    console.error("Error approving student:", error);
    res.status(500).json({ message: "Error approving student" });
  }
};

module.exports = {
  getProfileData,
  updateProfileImage,
  updateCourseDocument,
  updateStudentDetails,
  getUnverifiedStudents,
  approveStudent,
  getVerifiedStudents,
};

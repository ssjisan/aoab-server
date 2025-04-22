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

const uploadPdfToCloudinary = async (pdfBuffer, studentName, bmdcNo) => {
  return new Promise((resolve, reject) => {
    const sanitizedStudentName = studentName.replace(/\s+/g, "_"); // Replace spaces with underscores
    const timestamp = Date.now(); // Unique timestamp
    const uniqueFilename = `document_${timestamp}`; // Ensuring unique file name

    // Convert bmdcNo to string if it's a number
    const sanitizedBdmcNo = String(bmdcNo).replace(/\s+/g, "_");

    const folderPath = `aoa-bd/documents/${sanitizedStudentName}_${sanitizedBdmcNo}`;

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

const getStudentProfileByAdmin = async (req, res) => {
  try {
    // Extract studentId from the request parameters
    const { studentId } = req.params;

    // Fetch the student's profile using the ID
    const studentProfile = await Student.findById(studentId);

    if (!studentProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // Return the student profile data
    res.json(studentProfile);
  } catch (err) {
    console.error("Error fetching student profile:", err);
    res
      .status(500)
      .json({ message: "Error fetching student profile", error: err.message });
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
      req.body;
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
        console.log("Removing file with public_id:", removeFileId);

        const docIndex = studentProfile[fieldName].documents.findIndex(
          (doc) => doc.public_id === removeFileId
        );

        if (docIndex !== -1) {
          try {
            await deletePdfFromCloudinary(removeFileId);
            console.log("Deleted file from Cloudinary:", removeFileId);
          } catch (err) {
            console.error("Error deleting file from Cloudinary:", err);
            return res.status(500).json({
              error: "Failed to delete document from Cloudinary",
              details: err.message,
            });
          }

          studentProfile[fieldName].documents.splice(docIndex, 1);
          console.log(
            "Updated documents array after removal:",
            studentProfile[fieldName].documents
          );
        } else {
          console.log("No document found with public_id:", removeFileId);
        }
      }
    }

    // ✅ If status is "no", delete all existing documents
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

    // ✅ Check for required documents and completion year when status is 'yes'
    if (
      status === "yes" &&
      (!pdfFiles || pdfFiles.length === 0) &&
      studentProfile[fieldName].documents.length === 0
    ) {
      return res.status(400).json({
        error: "You must upload at least one document when selecting 'Yes'.",
      });
    }

    if (status === "yes" && !completionYear) {
      return res.status(400).json({
        error: "Completion year is required when selecting 'Yes'.",
      });
    }

    // ✅ Define allowed fields for multiple files
    const isMultipleFilesAllowed = [
      "aoaOtherCourses",
      "aoaFellowship",
      "aoNonOperativeCourse",
      "tableFaculty",
      "nationalFaculty",
      "regionalFaculty",
    ].includes(fieldName);

    // ✅ Validate total file size
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

    // ✅ Reject files that are not PDF (added this block)
    if (pdfFiles && pdfFiles.length > 0) {
      const invalidFiles = pdfFiles.filter(
        (file) => file.mimetype !== "application/pdf"
      );
      if (invalidFiles.length > 0) {
        return res.status(400).json({
          error: "Only PDF files are allowed.",
          invalidFiles: invalidFiles.map((file) => file.originalname),
        });
      }
    }

    // ✅ Upload New Files
    if (pdfFiles.length > 0) {
      let uploadedPdf;
      try {
        if (!isMultipleFilesAllowed) {
          if (studentProfile[fieldName].documents.length > 0) {
            const oldDocument = studentProfile[fieldName].documents[0];
            await deletePdfFromCloudinary(oldDocument.public_id);
          }

          uploadedPdf = await uploadPdfToCloudinary(
            pdfFiles[0].buffer,
            studentProfile.name,
            studentProfile.bmdcNo
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
              studentProfile.name,
              studentProfile.bmdcNo
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

    // ✅ Update status & completion year
    studentProfile[fieldName].status = "yes";
    if (completionYear) {
      studentProfile[fieldName].completionYear = completionYear;
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

// ************************************************** Upload PDF & Update Status ****************************************** //

// ************************************************** Update Student Profile Data ************************************************** //
const updateStudentDetails = async (req, res) => {
  try {
    const studentId = req.user._id;
    let updateData = req.body;
    console.log("Request Body:", updateData);

    // Find the student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Validate and sanitize postGraduationDegrees[0]
    if (Array.isArray(updateData.postGraduationDegrees)) {
      const degree = updateData.postGraduationDegrees[0];

      if (degree?.isCompleted === true) {
        const cleanedDegreeName = degree.degreeName?.trim();
        const cleanedYearString = degree.yearOfGraduation?.replace(/\D/g, "");
        const year = Number(cleanedYearString);
        const currentYear = new Date().getFullYear();

        // Basic presence validation
        if (!cleanedDegreeName || !cleanedYearString) {
          return res.status(400).json({
            message:
              "To mark post graduation as complete, both 'Degree Name' and a valid 'Year of Post Graduation' are required.",
          });
        }

        // Year validation
        if (isNaN(year)) {
          return res.status(400).json({
            message: "Year of Post Graduation must be a valid number.",
          });
        }

        if (year < 1971) {
          return res.status(400).json({
            message: "'Year of Post Graduation' cannot be before 1971.",
          });
        }

        if (year > currentYear) {
          return res.status(400).json({
            message: `'Year of Post Graduation' cannot be later than ${currentYear}.`,
          });
        }

        // Update cleaned values
        degree.degreeName = cleanedDegreeName;
        degree.yearOfGraduation = String(year);
      } else {
        // If not completed, reset values
        degree.degreeName = "Not Yet";
        degree.yearOfGraduation = "Not Yet";
      }

      // Put back updated degree object
      updateData.postGraduationDegrees[0] = degree;
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

// ************************************************** Is AccountVerified Data list ************************************************** //
const getUnverifiedStudents = async (req, res) => {
  try {
    const unverifiedStudents = await Student.find({
      isAccountVerified: false,
      isEmailVerified: true,

      // Ensure currentWorkingPlace has at least one entry with both name and designation
      currentWorkingPlace: {
        $elemMatch: {
          name: { $nin: [null, "", "N/A"] },
          designation: { $nin: [null, "", "N/A"] },
        },
      },

      // Ensure postGraduationDegrees has at least one entry with degreeName and yearOfGraduation
      postGraduationDegrees: {
        $elemMatch: {
          degreeName: { $ne: null, $ne: "" },
          yearOfGraduation: { $ne: null },
        },
      },

      // Ensure picture array is not empty and contains at least one with url and public_id
      picture: {
        $elemMatch: {
          url: { $ne: null, $ne: "" },
          public_id: { $ne: null, $ne: "" },
        },
      },
    });
    res.json(unverifiedStudents);
  } catch (error) {
    console.error("Error fetching unverified students:", error);
    res.status(500).json({ message: "Error fetching unverified students." });
  }
};
// ************************************************** True account verified data ************************************************** //

// const getVerifiedStudents = async (req, res) => {
//   try {
//     const { label, status } = req.query;

//     const query = { isAccountVerified: true };

//     const validLabels = [
//       "aoBasicCourse",
//       "aoAdvanceCourse",
//       "aoMastersCourse",
//       "aoaPediatricSeminar",
//       "aoaPelvicSeminar",
//       "aoaFootAnkleSeminar",
//       "aoPeer",
//       "aoaOtherCourses",
//       "aoNonOperativeCourse",
//       "aoaFellowship",
//       "tableFaculty",
//       "nationalFaculty",
//       "regionalFaculty",
//     ];

//     if (label && validLabels.includes(label)) {
//       if (status === "yes" || status === "no") {
//         query[`${label}.status`] = status;
//       } else {
//         query[`${label}.status`] = { $exists: true }; // Includes fields with any value (null included)
//       }
//     }
//     console.log("Final", query);

//     const verifiedStudents = await Student.find(query);

//     if (verifiedStudents.length === 0) {
//       return res.status(200).json([]); // Return empty array with a successful status code
//     }

//     res.json(verifiedStudents);
//   } catch (error) {
//     console.error("Error fetching verified students:", error);
//     res.status(500).json({ message: "Error fetching verified students" });
//   }
// };








const getVerifiedStudents = async (req, res) => {
  try {
    const { search, yearFrom, yearTo } = req.query;

    const query = {
      isAccountVerified: true,
    };

    // Search filter
    if (search) {
      const regex = new RegExp(search, 'i');
      const orConditions = [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$bmdcNo' },
              regex: regex,
            },
          },
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$contactNumber' },
              regex: regex,
            },
          },
        },
      ];

      query.$or = orConditions;
    }


    
    // Year filter (on postGraduationDegrees.yearOfGraduation)
    if (yearFrom || yearTo) {
      query.postGraduationDegrees = {
        $elemMatch: {isCompleted: true},
      };
      if (yearFrom) {
        query.postGraduationDegrees.$elemMatch.yearOfGraduation = {
          ...(query.postGraduationDegrees.$elemMatch.yearOfGraduation || {}),
          $gte: yearFrom.toString(),
        };
      }

      if (yearTo) {
        query.postGraduationDegrees.$elemMatch.yearOfGraduation = {
          ...(query.postGraduationDegrees.$elemMatch.yearOfGraduation || {}),
          $lte: yearTo.toString(),
        };
      }
      // Year filter (on postGraduationDegrees.yearOfGraduation)
    }

    console.log('Final Query:', JSON.stringify(query, null, 2));

    const verifiedStudents = await Student.find(query);
    res.status(200).json(verifiedStudents);
  } catch (error) {
    console.error('Error fetching verified students:', error);
    res.status(500).json({ message: 'Error fetching verified students' });
  }
};









// ************************************************** Controller for approve student ************************************************** //

const approveStudent = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Set verification fields
    student.isAccountVerified = true;
    student.isBmdcVerified = true;
    student.remarks = null;

    // Set aoaNo only if not already set
    if (!student.aoaNo && student.bmdcNo) {
      student.aoaNo = `AOA-${student.bmdcNo}`;
    }

    await student.save();

    console.log("Student Approved:", student);
    res.json(student);
  } catch (error) {
    console.error("Error approving student:", error);
    res.status(500).json({ message: "Error approving student" });
  }
};

// ************************************************** Controlel for deny student ************************************************** //
const denyStudent = async (req, res) => {
  const { studentId } = req.params;
  const { remarks } = req.body;
  console.log(studentId);
  console.log(remarks);

  // Validate that remarks are provided
  if (!remarks || remarks.trim() === "") {
    return res.status(400).json({ message: "Remarks are required" });
  }

  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        isAccountVerified: false,
        isBmdcVerified: null,
        remarks,
      },
      { new: true } // Return the updated document
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    console.log("Student Denied:", updatedStudent);
    res.json(updatedStudent);
  } catch (error) {
    console.error("Error denying student:", error);
    res.status(500).json({ message: "Error denying student" });
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
  denyStudent,
  getStudentProfileByAdmin,
};

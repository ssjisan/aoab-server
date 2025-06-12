const Student = require("../model/studentModel.js");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const CourseCategory = require("../model/courseCategoryModel.js");
dotenv.config();

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  throw new Error(
    "Cloudinary configuration is missing. Check your environment variables."
  );
}

// ********************************************** The Cloudinary Profile Picture upload function start here ********************************************** //

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

// ********************************************** The Cloudinary Profile Picture upload function End here ********************************************** //


// ********************************************** The Cloudinary Signature upload function start here ********************************************** //

const uploadSignatureToCloudinary = async (imageBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "aoa-bd/singature", // Specify the folder name here
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

// ********************************************** The Cloudinary Signature upload function end here ********************************************** //


// ********************************************** Upload and delete PDF to Cloudinary start here ********************************************** //

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

// ********************************************** Upload and delete PDF to Cloudinary End here ********************************************** //


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

// ********************************************** Get Profile Data function start here ********************************************** //

// ********************************************** Get Profile Data By admin function start here ********************************************** //

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

// ********************************************** Get Profile Data By admin function end here ********************************************** //


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

// ********************************************** Update Signature function start here ********************************************** //

const updateSignature = async (req, res) => {
  try {
    const userId = req.user._id;
    const signatureFile = req.file;

    const studentProfile = await Student.findById(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // If the user already has a signature, delete the old one from Cloudinary
    if (studentProfile.signature?.length > 0) {
      const oldSignature = studentProfile.signature[0];
      if (oldSignature.public_id) {
        try {
          await cloudinary.uploader.destroy(oldSignature.public_id);
          console.log("Old signature deleted:", oldSignature.public_id);
        } catch (err) {
          console.error("Error deleting old signature from Cloudinary:", err);
        }
      }
    }

    // Upload new signature image to Cloudinary
    let uploadedSignature;
    try {
      uploadedSignature = await uploadSignatureToCloudinary(
        signatureFile.buffer
      );
    } catch (err) {
      console.error("Error uploading signature to Cloudinary:", err);
      return res.status(500).json({ error: "Failed to upload signature" });
    }

    // Replace old signature with new one
    studentProfile.signature = [
      {
        url: uploadedSignature.url,
        public_id: uploadedSignature.public_id,
      },
    ];

    await studentProfile.save();

    res.status(200).json({ signature: studentProfile.signature });
  } catch (err) {
    console.error("Error uploading signature:", err);
    res
      .status(500)
      .json({ message: "Error uploading signature", error: err.message });
  }
};

// ********************************************** Update Signature function End here ********************************************** //



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
// ************************************************** Controller for Verified Student Data start here ************************************************** //

const getVerifiedStudents = async (req, res) => {
  try {
    const { search, yearFrom, yearTo, courses } = req.query;

    const query = {
      isAccountVerified: true,
    };

    // Search filter (name, email, bmdcNo, contactNumber)
    if (search) {
      const regex = new RegExp(search, "i");
      const orConditions = [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$bmdcNo" },
              regex: regex,
            },
          },
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$contactNumber" },
              regex: regex,
            },
          },
        },
      ];
      query.$or = orConditions;
    }

    // Year filter on postGraduationDegrees.yearOfGraduation
    if (yearFrom || yearTo) {
      query.postGraduationDegrees = {
        $elemMatch: { isCompleted: true },
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
    }

    // Courses filter
    if (courses) {
      const courseArray = Array.isArray(courses)
        ? courses
        : courses.split(",").map((id) => id.trim());
      console.log(courseArray, "This is the course array");

      // Build an array of $elemMatch conditions for each course
      const courseConditions = courseArray.map((id) => ({
        courses: {
          $elemMatch: {
            _id: id, // MongoDB can match string _id
            status: "yes",
          },
        },
      }));

      // Add all courseConditions to the query using $and
      if (courseConditions.length > 0) {
        query.$and = [...(query.$and || []), ...courseConditions];
      }
    }

    console.log("Final Query:", JSON.stringify(query, null, 2));

    const includeExtraFields = yearFrom || yearTo || courses;

    const projection = includeExtraFields
      ? undefined
      : "name bmdcNo email contactNumber aoaNo signature";

    const verifiedStudents = await Student.find(query)
      .select(projection)
      .lean();

    // Return the results
    res.status(200).json(verifiedStudents);
  } catch (error) {
    console.error("Error fetching verified students:", error);
    res.status(500).json({ message: "Error fetching verified students" });
  }
};

// ************************************************** Controller for Verified Student Data End here ************************************************** //

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
// ************************************************** Controller for approve student End Here************************************************** //

// ************************************************** Controller for deny student Start Here************************************************** //
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

// ************************************************** Controller for deny student End Here************************************************** //

// ************************************************** Controller for Summary Start Here************************************************** //

const getAllStudentStatusSummary = async (req, res) => {
  try {
    // Step 1: Aggregate counts for approved, wrong entry, total
    const result = await Student.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          approved: [
            { $match: { isAccountVerified: true } },
            { $count: "count" },
          ],
          wrongEntry: [
            { $match: { isEmailVerified: false } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const formatCount = (arr) => (arr[0] ? arr[0].count : 0);

    const data = result[0];
    const total = formatCount(data.total);
    const approved = formatCount(data.approved);
    const wrongEntry = formatCount(data.wrongEntry);

    // Step 2: Get pending count using your existing pending logic
    const pendingStudents = await Student.find({
      isAccountVerified: false,
      isEmailVerified: true,
      currentWorkingPlace: {
        $elemMatch: {
          name: { $nin: [null, "", "N/A"] },
          designation: { $nin: [null, "", "N/A"] },
        },
      },
      postGraduationDegrees: {
        $elemMatch: {
          degreeName: { $ne: null, $ne: "" },
          yearOfGraduation: { $ne: null },
        },
      },
      picture: {
        $elemMatch: {
          url: { $ne: null, $ne: "" },
          public_id: { $ne: null, $ne: "" },
        },
      },
    });

    const pending = pendingStudents.length;

    // Step 3: Derive incomplete accounts
    const accountNotComplete = total - (approved + wrongEntry + pending);

    // Step 4: Respond
    res.json({
      summary: {
        total,
        approved,
        wrongEntry,
        pending,
        accountNotComplete,
      },
    });
  } catch (error) {
    console.error("Error in getAllStudentStatusSummary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ************************************************** Controller for Summary End Here************************************************** //

// ************************************************** Controller for Unverified email address controller Start Here************************************************** //

const getUnverifiedEmail = async (req, res) => {
  try {
    const unverifiedStudents = await Student.find(
      { isEmailVerified: false } // Filter condition
    ).sort({ createdAt: 1 }); // Optional: sort by creation date (oldest first)
    res.status(200).json(unverifiedStudents);
  } catch (error) {
    console.error("Error fetching unverified students:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// remove uinverified acconunt
const removeUnverifiedEmailById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the student first
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.isEmailVerified) {
      return res
        .status(400)
        .json({ message: "Student email is already verified. Cannot delete." });
    }

    // Delete if not verified
    await Student.findByIdAndDelete(id);

    res
      .status(200)
      .json({ message: "Unverified student account deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ************************************************** Controller for Unverified email address controller End Here************************************************** //

const courseDocument = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      courseCategoryId,
      status,
      completionYear,
      courseId,
      removedFiles // <-- Expect this from frontend as array of file IDs to remove
    } = req.body;

    console.log(req.body);
    console.log(req.files);

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseCategoryId)) {
      return res.status(400).json({ error: "Invalid courseCategoryId" });
    }
    if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid courseId" });
    }

    // Validate status
    if (!["yes", "no"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'yes' or 'no'" });
    }

    const user = await Student.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const courseCategory = await CourseCategory.findById(courseCategoryId);
    if (!courseCategory)
      return res.status(404).json({ error: "Course category not found" });

    // Find existing course by _id (passed from frontend)
    const existingIndex = user.courses.findIndex(
      (course) => course._id?.toString() === courseId
    );
    const existingCourse =
      existingIndex > -1 ? user.courses[existingIndex] : null;

    if (existingCourse?.status === "yes" && status === "no") {
      return res
        .status(400)
        .json({ error: "Cannot change status. Contact with admin." });
    }

    let documents = existingCourse?.documents || [];

    // Normalize removedFiles to array of strings (IDs)
    const removedFilesArray = removedFiles
      ? Array.isArray(removedFiles)
        ? removedFiles
        : [removedFiles]
      : [];

    // Delete only the files that are in removedFilesArray from Cloudinary
    for (let doc of documents) {
      if (removedFilesArray.includes(doc._id?.toString() || doc.id?.toString())) {
        try {
          await deletePdfFromCloudinary(doc.public_id);
        } catch (err) {
          console.warn(`Failed to delete ${doc.public_id}:`, err);
        }
      }
    }

    // Filter documents to keep only those NOT removed
    documents = documents.filter(
      (doc) => !removedFilesArray.includes(doc._id?.toString() || doc.id?.toString())
    );

    if (status === "yes") {
      if (!completionYear) {
        return res.status(400).json({ error: "Completion year is required" });
      }

      // const validFormat =
      //   /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),\s\d{4}$/;
      // if (!validFormat.test(completionYear)) {
      //   return res.status(400).json({
      //     error: "Invalid completion year format (expected: 'Jan, 2024')",
      //   });
      // }

      // Handle file upload (PDFs only)
      if (req.files && req.files.length > 0) {
        for (let file of req.files) {
          if (file.mimetype !== "application/pdf") {
            return res.status(400).json({
              error: `${file.originalname} is not a valid PDF`,
            });
          }
          if (file.size > 1024 * 1024) {
            return res.status(400).json({
              error: `${file.originalname} exceeds 1MB limit`,
            });
          }
        }

        // Upload new files and add them to documents
        const studentName = user.name || "Unknown";
        const bmdcNo = user.bmdcNo || "Unknown";

        try {
          const uploads = req.files.map((file) =>
            uploadPdfToCloudinary(file.buffer, studentName, bmdcNo).then(
              (uploaded) => ({
                url: uploaded.url,
                public_id: uploaded.public_id,
                name: file.originalname,
                size: file.size,
                uploadedAt: new Date(),
              })
            )
          );

          const newDocuments = await Promise.all(uploads);

          // Append new documents to the filtered existing documents
          documents = documents.concat(newDocuments);
        } catch (uploadErr) {
          console.error("Cloudinary upload error:", uploadErr);
          return res.status(500).json({ error: "PDF upload failed" });
        }
      }
    } else {
      // If status is not yes, clear documents
      documents = [];
    }

    // Final course data
    const courseData = {
      _id: courseId || new mongoose.Types.ObjectId(), // Keep original _id or assign if new
      courseCategoryId,
      status,
      completionYear: status === "yes" ? completionYear : undefined,
      documents,
    };

    if (existingIndex > -1) {
      user.courses.splice(existingIndex, 1, courseData);
    } else {
      user.courses.push(courseData);
    }

    await user.save();

    return res.status(200).json({
      message: "Course info updated successfully.",
      courses: user.courses,
    });
  } catch (error) {
    console.error("Update course error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// -------------------------------------------------------------------------- Update end here --------------------------------------------------------------------//


const getStudentsByStatus = async (req, res) => {
  try {
    const students = await Student.find({
      isAccountVerified: false,
      isEmailVerified: true,
      $or: [
        {
          currentWorkingPlace: {
            $not: {
              $elemMatch: {
                name: { $nin: [null, "", "N/A"] },
                designation: { $nin: [null, "", "N/A"] },
              },
            },
          },
        },
        {
          postGraduationDegrees: {
            $not: {
              $elemMatch: {
                degreeName: { $ne: null, $ne: "" },
                yearOfGraduation: { $ne: null },
              },
            },
          },
        },
        {
          picture: {
            $not: {
              $elemMatch: {
                url: { $ne: null, $ne: "" },
                public_id: { $ne: null, $ne: "" },
              },
            },
          },
        },
      ],
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=accountNotComplete.json"
    );
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(students, null, 2));
  } catch (error) {
    console.error("Error in getAccountNotCompleteStudents:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getProfileData,
  updateProfileImage,
  updateSignature,
  updateStudentDetails,
  getUnverifiedStudents,
  approveStudent,
  getVerifiedStudents,
  denyStudent,
  getStudentProfileByAdmin,
  getAllStudentStatusSummary,
  getUnverifiedEmail,
  removeUnverifiedEmailById,
  courseDocument,
  getStudentsByStatus,
};

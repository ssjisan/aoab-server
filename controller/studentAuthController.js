const jwt = require("jsonwebtoken");
const { hashPassword, comparePassword } = require("../helper/passwordHash.js");
const Student = require("../model/studentModel.js");
const sendOtp = require("../helper/sendOTP.js");
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

// ************************************* Function to generate a random 6-digit OTP *************************************  //
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
};

// *************************************  Generate JWT Token  ************************************* //
const generateToken = (student) => {
  return jwt.sign({ _id: student._id }, process.env.JWT_SECURE, {
    expiresIn: "7d",
  });
};

// *************************************  Registration Student  ************************************* //

const registerStudent = async (req, res) => {
  try {
    // 1. Destructure request body
    const { name, bmdcNo, email, contactNumber, password, confirmPassword } =
      req.body;

    // 2. Validate required fields
    if (!name?.trim()) return res.json({ error: "Name is required" });
    if (!bmdcNo)
      return res.json({ error: "BM&DC Registration No is required" });
    if (!email?.trim()) return res.json({ error: "Email is required" });
    if (!contactNumber?.trim())
      return res.json({ error: "Contact number is required" });

    if (!password || password.length < 8) {
      return res.json({ error: "Password should be longer than 8 characters" });
    }

    if (password !== confirmPassword) {
      return res.json({ error: "Password and confirm password must match" });
    }

    // 3. Clean and normalize contact number (remove +88 / 88 / 0 prefix)
    let cleanedContactNumber = contactNumber.trim();

    // Remove country code prefixes
    if (cleanedContactNumber.startsWith("+88")) {
      cleanedContactNumber = cleanedContactNumber.slice(3);
    } else if (cleanedContactNumber.startsWith("88")) {
      cleanedContactNumber = cleanedContactNumber.slice(2);
    } else if (cleanedContactNumber.startsWith("0")) {
      cleanedContactNumber = cleanedContactNumber.slice(1);
    }

    // Ensure the final cleaned number is exactly 10 digits and starts with valid Bangladeshi prefix (1XXX...)
    if (!/^[1][0-9]{9}$/.test(cleanedContactNumber)) {
      return res.status(400).json({
        error:
          "Invalid mobile number. Please enter a valid Bangladeshi number (e.g., 01XXXXXXXXX or +8801XXXXXXXXX)",
      });
    }

    // 4. Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // 5. Password strength validation
    if (!/[A-Za-z]/.test(password)) {
      return res
        .status(400)
        .json({ error: "Password must include at least one letter." });
    }
    if (!/\d/.test(password)) {
      return res
        .status(400)
        .json({ error: "Password must include at least one number." });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res
        .status(400)
        .json({
          error: "Password must include at least one special character.",
        });
    }

    // 6. Uniqueness checks (use cleaned contact number)
    const existingBmdc = await Student.findOne({ bmdcNo });
    if (existingBmdc) {
      return res.json({ error: "BM&DC Registration No is already registered" });
    }

    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return res.json({ error: "Email is already taken" });
    }

    const existingContact = await Student.findOne({
      contactNumber: cleanedContactNumber,
    });
    if (existingContact) {
      return res.json({ error: "Contact number is already registered" });
    }

    // 7. Generate OTP
    const otp = generateOtp();
    const otpExpiration = new Date(Date.now() + 2 * 60 * 1000); // OTP expires in 2 minutes

    // 8. Send OTP via email
    try {
      await sendOtp(email, otp);
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError);
      return res
        .status(500)
        .json({ error: "Failed to send OTP. Please try again later." });
    }

    // 9. Hash the password
    const hashedPassword = await hashPassword(password);

    // 10. Create and save student
    const newStudent = await new Student({
      name,
      bmdcNo,
      email,
      contactNumber: cleanedContactNumber,
      password: hashedPassword,
      otp: otp.toString(),
      otpExpiration,
    }).save();

    // 11. Respond with success message
    return res.json({
      newStudent: {
        name: newStudent.name,
        bmdcNo: newStudent.bmdcNo,
        email: newStudent.email,
        contactNumber: newStudent.contactNumber,
      },
      message: "Please check your email for the OTP to verify your account.",
    });
  } catch (err) {
    console.error("Error registering student:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//******************************************************************** Mail Verification USING OTP Controller *********************************************//
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(req.body);

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (student.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (student.otpExpiration < new Date()) {
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request for OTP again" });
    }
    // Convert both to strings for comparison
    if (student.otp !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    student.otp = ""; // Clear OTP after successful verification
    student.otpExpiration = null;
    student.isEmailVerified = true;

    await student.save();

    const token = generateToken(student);
    res.status(200).json({
      user: {
        _id: student._id,
        name: student.name,
        email: student.email,
      },
      token,
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// *************************************  Resend OTP  ************************************* //

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Find student by email
    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // Generate a new OTP
    const newOtp = generateOtp();
    const newOtpExpiration = new Date(Date.now() + 2 * 60 * 1000); // Set expiration to 2 minutes

    // Update student record with new OTP and expiration
    student.otp = newOtp.toString();
    student.otpExpiration = newOtpExpiration;
    await student.save();

    // Send the new OTP to the student's email
    await sendOtp(email, newOtp);

    res.status(200).json({
      message:
        "A new OTP has been sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// *********************************************** Login Function *********************************************** //

const studentLogin = async (req, res) => {
  try {
    // 1. Destructure the request body
    const { email, password } = req.body;

    // 2. Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 3. Check if student exists
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ error: "No account found" });
    }

    // 4. Check if the password matches
    const match = await comparePassword(password, student.password);
    if (!match) {
      return res.status(401).json({ error: "Wrong password" });
    }

    // 5. Check if the student is verified
    if (!student.isEmailVerified) {
      return res
        .status(403)
        .json({ error: "Please verify your account first" });
    }

    // 6. Generate JWT Token
    const token = jwt.sign({ _id: student._id }, process.env.JWT_SECURE, {
      expiresIn: "7d",
    });

    // 7. Send response
    res.status(200).json({
      user: {
        _id: student._id,
        name: student.name,
        email: student.email,
      },
      token,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// ************************************* Forgot Password - Send OTP ************************************* //
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Check if student exists
    const student = await Student.findOne({ email });
    if (!student) {
      return res
        .status(404)
        .json({ message: "No account found with this email." });
    }

    // Generate OTP
    const otp = generateOtp();
    const otpExpiration = new Date(Date.now() + 2 * 60 * 1000); // 2-minute expiration

    // Save OTP in database
    student.otp = otp.toString();
    student.otpExpiration = otpExpiration;
    await student.save();

    // Send OTP to email
    await sendOtp(email, otp);

    res.status(200).json({
      message: "OTP sent to your email. Please verify to reset password.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// ************************************* Verify OTP for Reset Password ************************************* //
const verifyOtpForReset = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const student = await Student.findOne({ email });
    if (!student) {
      return res
        .status(404)
        .json({ message: "No account found with this email." });
    }

    if (student.otp !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (student.otpExpiration < new Date()) {
      return res
        .status(400)
        .json({ message: "OTP has expired. Request a new OTP." });
    }

    // Mark OTP as verified
    student.otp = "";
    student.otpExpiration = null;
    await student.save();

    res
      .status(200)
      .json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// ************************************* Reset Password ************************************* //
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Password validation
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, contain at least one number, and one special character.",
      });
    }

    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password in DB
    student.password = hashedPassword;
    await student.save();

    res
      .status(200)
      .json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

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

// ******************************************* Password Chnage **********************************************************//

const changeStudentPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const studentId = req.user._id; // Extracting user ID from request

    // 1. Validate input fields
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 2. Find student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // 3. Check if old password is correct
    const isMatch = await comparePassword(oldPassword, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect." });
    }

    // 4. Check if new password matches confirmation
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "New password and confirm password must match." });
    }

    // 5. Validate new password strength
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, contain at least one number, and one special character.",
      });
    }

    // 6. Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // 7. Save new password
    student.password = hashedNewPassword;
    await student.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

module.exports = {
  registerStudent,
  verifyOtp,
  resendOtp,
  studentLogin,
  forgotPassword,
  verifyOtpForReset,
  resetPassword,
  getProfileData,
  updateProfileImage,
  changeStudentPassword,
};

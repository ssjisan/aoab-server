const jwt = require("jsonwebtoken");
const { hashPassword, comparePassword } = require("../helper/passwordHash.js");
const Student = require("../model/studentModel.js");
const sendOtp = require("../helper/sendOTP.js");
const dotenv = require("dotenv");

dotenv.config();

// ************************************* Function to generate a random 6-digit OTP *************************************  //
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
};

// *************************************  Generate JWT Token  ************************************* //
const generateToken = (student) => {
  return jwt.sign({ id: student._id }, process.env.JWT_SECURE, {
    expiresIn: "7d",
  });
};

// *************************************  Registration Student  ************************************* //

const registerStudent = async (req, res) => {
  try {
    // 1. destruct the elements
    const { name, bmdcNo, email, contactNumber, password, confirmPassword } =
      req.body;

    // 2. Validate inputs
    if (!name.trim()) {
      return res.json({ error: "Name is required" });
    }
    if (!bmdcNo) {
      return res.json({ error: "BM&DC Registration No is required" });
    }
    if (!email) {
      return res.json({ error: "Email is required" });
    }
    if (!contactNumber) {
      return res.json({ error: "Contact number is required" });
    }
    if (!password || password.length < 8) {
      return res.json({ error: "Password should be longer than 8 characters" });
    }
    if (password !== confirmPassword) {
      return res.json({ error: "Password and confirm password must match" });
    }

    // 3. Check if the email or contact number is already taken
    const existingBmdc = await Student.findOne({ bmdcNo });
    if (existingBmdc) {
      return res.json({ error: "BM&DC Registration No is already registered" });
    }
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.json({ error: "Email is already taken" });
    }
    const existingContact = await Student.findOne({ contactNumber });
    if (existingContact) {
      return res.json({ error: "Contact number is already registered" });
    }

    // 4. Hash the password
    const hashedPassword = await hashPassword(password);
    // 5. Password validation: Minimum 8 characters, 1 number, 1 special character
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/; //
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, contain at least one number, and one special character.",
      });
    }

    // 6. Create the student in the Student collection
    const newStudent = await new Student({
      name,
      bmdcNo,
      email,
      contactNumber,
      password: hashedPassword,
    }).save();

    // 7. Generate OTP and set expiration time
    const otp = generateOtp();
    const otpExpiration = new Date(Date.now() + 2 * 60 * 1000); // OTP expiration time set to 2 minutes

    // Save the OTP and expiration time in the student's record
    newStudent.otp = otp.toString();
    newStudent.otpExpiration = otpExpiration;
    await newStudent.save();

    // 8. Send OTP to the student's email
    await sendOtp(email, otp); // Sending OTP to student's email

    // 9. Return the response with the student details and message
    res.json({
      newStudent: {
        name: newStudent.name,
        bmdcNo: newStudent.bmdcNo,
        email: newStudent.email,
        contactNumber: newStudent.contactNumber,
      },
      message: "Please check your email for the OTP to verify your account.",
    });
  } catch (err) {
    console.log(err);
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

    res
      .status(200)
      .json({
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
    const userId = req.user._id;

    // Fetch the user's profile using the ID
    const userProfile = await Student.findById(userId);

    if (!userProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    // Return the user profile data
    res.json(userProfile);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile data", error: err.message });
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
  getProfileData
};

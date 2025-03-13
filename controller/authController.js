const jwt = require("jsonwebtoken");
const { comparePassword, hashPassword } = require("../helper/passwordHash.js");
const UserModel = require("../model/userModel.js");
const dotenv = require("dotenv");

dotenv.config();

const registerUser = async (req, res) => {
  try {
    // 1. destruct the element
    const { name, email, password, role } = req.body;
    // 2. Add Validation
    if (!name.trim()) {
      return res.json({ error: "Name is required" });
    }
    if (!email) {
      return res.json({ error: "Email is required" });
    }
    if (!password || password.length < 6) {
      return res.json({ error: "Password should be longer than 6 charecter" });
    }
    if (role === undefined) {
      return res.json({ error: "Role is required" });
    }
    // 3. Check the email is taken or not
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.json({ error: "Email is already taken" });
    }
    // 4. Hased the password
    const hashedPassword = await hashPassword(password);
    // 5. Create User
    const newUser = await new UserModel({
      name,
      email,
      password: hashedPassword,
      role
    }).save();
    // 6. Use JWT for auth
    const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECURE, {
      expiresIn: "7d",
    });
    // 7. Save User
    res.json({
      newUser: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      token,
    });
  } catch (err) {
    console.log(err);
  }
};

const loginUser = async (req, res) => {
  try {
    // 1. destruct the element
    const { email, password } = req.body;
    // 2. Add Validation
    if (!email) {
      return res.json({ error: "Email is required" });
    }
    if (!password || password.length < 6) {
      return res.json({ error: "Password should be longer than 6 charecter" });
    }
    // 3. Check the email is taken or not
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.json({ error: "No account found" });
    }
    // 4. Hased the password
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.json({ error: "Wrong Password" });
    }

    // 5. Use JWT for auth
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECURE, {
      expiresIn: "7d",
    });
    // 6. Save User
    res.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.log(err);
  }
};

const userList = async (req, res) => {
  try {
    // Check the current user's role (assuming `req.user` contains authenticated user information)
    const currentUser = await UserModel.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    let users;
    // If the current user is a super admin, show all users
    if (currentUser.role === 0) {
      users = await UserModel.find({});
    } 
    // If the current user is an admin, exclude super admins from the list
    else if (currentUser.role === 1) {
      users = await UserModel.find({ role: { $ne: 0 } });
    } else {
      return res.status(403).json({ error: "Access Denied" });
    }

    // Send the list of users to the front-end
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};



const removeUser = async (req, res) => {
  try {
    // Fetch the user to be removed
    const userToRemove = await UserModel.findById(req.params.userId);
    
    // Check if the logged-in user is trying to delete their own Super Admin account
    if (req.user.role === 0 && req.user._id.toString() === req.params.userId) {
      return res.status(400).json({ error: "Super Admin cannot remove their own account" });
    }

    // Proceed with the deletion if not the same Super Admin account
    const user = await UserModel.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User removed successfully", user });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: "Access Denied!" });
  }
};

const privateRoute = async (req, res) => {
  res.json({ currentUser: req.user });
};


// Change Password Controller

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !oldPassword.trim()) {
      return res.status(400).json({ error: "Old password is required" });
    }
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: "New password is required" });
    }
    if (!confirmPassword || !confirmPassword.trim()) {
      return res.status(400).json({ error: "Confirm password is required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password should be longer than 6 characters" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New password and confirm password do not match" });
    }

    const existingUser = await UserModel.findById(req.user._id);
    const match = await comparePassword(oldPassword, existingUser.password);
    if (!match) {
      return res.status(400).json({ error: "Old password is incorrect" });
    }

    const hashedPassword = await hashPassword(newPassword);
    existingUser.password = hashedPassword;
    await existingUser.save();

    res.json({ message: "Password changed successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    // Hash the new default password
    const hashedPassword = await hashPassword('123456');

    // Find the user and update their password
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Password has been reset to '123456'" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  userList,
  removeUser,
  privateRoute,
  changePassword,
  resetPassword,
};
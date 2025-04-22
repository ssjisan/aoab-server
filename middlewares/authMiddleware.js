const jwt = require("jsonwebtoken");
const UserModel = require("../model/userModel.js");

const requiredSignIn = (req, res, next) => {
  try {
    const decoded = jwt.verify(
      req.headers.authorization,
      process.env.JWT_SECURE
    );
    req.user = decoded;
    // console.log("Authorized",decoded);
    next();
  } catch (err) {
    console.log("Unauthorized access attempt:", err.message);
    res.status(401).json("Unauthorized: " + err.message);
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user._id);
    if (user.role !== 1) {
      return res.status(401).send("Unauthorized");
    } else {
      next();
    }
  } catch (err) {
    res.status(401).json(err.message);
  }
};

const isModarator = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user._id);
    if (user.role !== 2) {
      return res.status(401).send("Unauthorized");
    } else {
      next();
    }
  } catch (err) {
    res.status(401).json(err.message);
  }
};


const isSuperAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user._id);
    if (user.role !== 0) {
      return res.status(401).send("Unauthorized");
    } else {
      next();
    }
  } catch (err) {
    res.status(401).json(err.message);
  }
};

module.exports = {
  requiredSignIn,
  isAdmin,
  isSuperAdmin,
  isModarator
};

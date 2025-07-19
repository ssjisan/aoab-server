const express = require("express");
const router = express.Router();
const { backupMongoDB } = require("../controller/backupController.js");
const { requiredSignIn } = require("../middlewares/authMiddleware");

router.get("/mongodb-backup", backupMongoDB);

module.exports = router;

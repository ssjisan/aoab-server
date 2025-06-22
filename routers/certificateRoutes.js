// routes/testRoutes.js
const express = require("express");
const router = express.Router();
const {
  certificatePreview,
} = require("../controller/certificateController.js");

router.get("/certificate-preview", certificatePreview);

module.exports = router;

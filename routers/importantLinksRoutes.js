const express = require("express");
const router = express.Router();
// import controller
const {
  createLink,
  listOfLinks,
  getLimitedLinks,
  updateLinksSequence,
  readLink,
  updateLink,
  removeLink,
  searchLinks,
} = require("../controller/importantLinksController.js");

// import middleware
const { requiredSignIn } = require("../middlewares/authMiddleware.js");

router.post("/add_links", requiredSignIn, createLink);
router.get("/links", listOfLinks);
router.get("/search-links", searchLinks);
router.get("/limited-links", getLimitedLinks);
router.post("/update-link-order", requiredSignIn, updateLinksSequence);
router.get("/link/:linkId", requiredSignIn, readLink);
router.put("/link/:linkId", requiredSignIn, updateLink);
router.delete("/link/:linkId", removeLink);

module.exports = router;

const express = require("express");
const router = express.Router();
// import controller
const {
  createResource,
  listOfResources,
  updateResourcesSequence,
  readResource,
  updateResource,
  removeResource,
  getLimitedResources,
  searchResources,
} = require("../controller/onlineLearningController.js");

// Import middleware
const {
  requiredSignIn,
  isAdmin,
  isSuperAdmin,
} = require("../middlewares/authMiddleware");

router.post("/add_resource", requiredSignIn, createResource);
router.get("/resources", listOfResources);
router.get("/search-resources", searchResources);
router.get("/limited-resources", getLimitedResources);
router.post("/update-resource-order", requiredSignIn, updateResourcesSequence);
router.get("/resource/:resourceId", requiredSignIn, readResource);
router.put("/resource/:resourceId", requiredSignIn, updateResource);
router.delete("/resource/:resourceId", removeResource);

module.exports = router;

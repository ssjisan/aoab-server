import express from "express";
const router = express.Router();
// import controller
import {
  createResource,
  listOfResources,
  updateResourcesSequence,
  readResource,
  updateResource,
  removeResource,
  getLimitedResources,
  searchResources,
} from "../controller/onlineLearningController.js";

// import middleware
import { requiredSignIn } from "../middlewares/authMiddleware.js";

router.post("/add_resource", requiredSignIn, createResource);
router.get("/resources", listOfResources);
router.get("/search-resources", searchResources);
router.get("/limited-resources", getLimitedResources);
router.post("/update-resource-order", requiredSignIn, updateResourcesSequence);
router.get("/resource/:resourceId", requiredSignIn, readResource);
router.put("/resource/:resourceId", requiredSignIn, updateResource);
router.delete("/resource/:resourceId", removeResource);

export default router;

import express from "express";
const router = express.Router();
// import controller
import {
  createLink,
  listOfLinks,
  getLimitedLinks,
  updateLinksSequence,
  readLink,
  updateLink,
  removeLink,
  searchLinks
} from "../controller/importantLinksController.js";

// import middleware
import { requiredSignIn } from "../middlewares/authMiddleware.js";

router.post("/add_links", requiredSignIn, createLink);
router.get("/links", listOfLinks);
router.get("/search-links", searchLinks);
router.get("/limited-links", getLimitedLinks);
router.post("/update-link-order", requiredSignIn, updateLinksSequence);
router.get("/link/:linkId", requiredSignIn, readLink);
router.put("/link/:linkId", requiredSignIn, updateLink);
router.delete("/link/:linkId", removeLink);

export default router;

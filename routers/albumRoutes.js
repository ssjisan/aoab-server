import express from "express";
const router = express.Router();
import { requiredSignIn } from "../middlewares/authMiddleware.js";
import {
  uploadNewAlbum,
  listOfAllAlbums,
  deleteAlbum,
  readAlbum,
  updateAlbum,
  updateAlbumSequence,
} from "../controller/albumController.js";
import multer from "multer";

// Use memoryStorage as you don't need to save files to disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/upload_album",
  requiredSignIn,
  upload.array("images", 50),
  uploadNewAlbum
);
router.get("/albums", listOfAllAlbums);
router.delete("/album/:albumId", requiredSignIn, deleteAlbum);
router.get("/album/:albumId", readAlbum);
router.put(
  "/album/:albumId",
  upload.array("newImages", 50),
  requiredSignIn,
  updateAlbum
);
router.post("/update-album-order", requiredSignIn, updateAlbumSequence);

export default router;

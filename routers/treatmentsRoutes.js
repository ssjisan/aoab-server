import express from "express";
const router = express.Router();
import { requiredSignIn } from "../middlewares/authMiddleware.js";
import {
  createTreatment,
  listOfTreatments,
  readTreatment,
  updateTreatment,
  deleteTreatment
} from "../controller/treatmentsController.js";

router.post("/create_treatment", requiredSignIn, createTreatment);
router.get("/treatments_list", listOfTreatments);
router.delete("/treatment/:treatmentId", requiredSignIn, deleteTreatment);
router.get("/treatment/:treatmentId", readTreatment);
router.put("/treatment/:treatmentId", requiredSignIn, updateTreatment);

export default router;
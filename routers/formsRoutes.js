const express = require("express");
const router = express.Router();
// import controller
const {
  createForm,
  listOfForms,
  searchForms,
  getLimitedForms,
  updateFormsSequence,
  readForm,
  updateForm,
  removeForm,
} = require("../controller/formsController.js");

// import middleware
const { requiredSignIn } = require("../middlewares/authMiddleware.js");

router.post("/add_form", requiredSignIn, createForm);
router.get("/forms", listOfForms);
router.get("/search-forms", searchForms);
router.get("/limited-forms", getLimitedForms);
router.post("/update-form-order", requiredSignIn, updateFormsSequence);
router.get("/form/:formId", requiredSignIn, readForm);
router.put("/form/:formId", requiredSignIn, updateForm);
router.delete("/form/:formId", removeForm);

module.exports = router;

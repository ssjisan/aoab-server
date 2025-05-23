const express = require("express");
const router = express.Router();
// import controller
const {
  createCourseCategory,
  courseCategoryList,
  updateCategoryListSequence,
  removeCourseCategory,
  updateCourseCategory,
} = require("../controller/courseSetupController.js");

// import middleware
const { requiredSignIn } = require("../middlewares/authMiddleware.js");

router.post("/category_setup", requiredSignIn, createCourseCategory);
router.get("/category_list", requiredSignIn, courseCategoryList);
router.post(
  "/update-category-list-order",
  requiredSignIn,
  updateCategoryListSequence
);
router.delete("/category_list/:id", requiredSignIn, removeCourseCategory);
router.put("/category_list/:id", requiredSignIn, updateCourseCategory); // <-- New endpoint for updating course setup

module.exports = router;

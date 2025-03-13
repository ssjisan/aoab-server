const Forms =require ("../model/formsModel.js");

const createForm = async (req, res) => {
  try {
    const { title, link } = req.body;

    switch (true) {
      case !title.trim():
        return res.json({ error: "Title is required" });
      case !link.trim():
        return res.json({ error: "Link is required" });
    }

    const newForm = new Forms({
      title,
      link,
    });

    await newForm.save();
    res.json(newForm);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

//  List of Important Forms
const listOfForms = async (req, res) => {
  try {
    const forms = await Forms.find().sort({
      sequence: 1,
      createdAt: -1,
    }); // Sort by sequence, then by createdAt
    res.json(forms);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller for fetching a limited number of forms
const getLimitedForms = async (req, res) => {
  try {
    // Parse limit and skip from query parameters
    const limit = parseInt(req.query.limit) || 1; // Default to 5 if not provided
    const skip = parseInt(req.query.skip) || 0; // Default to 0 if not provided

    // Fetch Forms from the database with limit and skip
    const forms = await Forms.find().skip(skip).limit(limit);

    // Check if there are more Form left to load
    const totalForms = await Forms.countDocuments();
    const hasMore = skip + limit < totalForms;

    // Respond with the Form and whether more Forms are available
    res.status(200).json({ forms, hasMore });
  } catch (err) {
    console.error("Error fetching limited forms:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Update Sequence of Form
const updateFormsSequence = async (req, res) => {
  try {
    const { reorderedForms } = req.body; // Array of forms with updated sequences

    const bulkOps = reorderedForms.map((resource, index) => ({
      updateOne: {
        filter: { _id: resource._id },
        update: { $set: { sequence: index + 1 } }, // Update the sequence field
      },
    }));

    await Forms.bulkWrite(bulkOps);

    res.status(200).json({ message: "Form sequence updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating resources sequence" });
  }
};

//  Read Form
const readForm = async (req, res) => {
  try {
    const { formId } = req.params; // Get the form ID from the request params
    const form = await Forms.findById(formId); // Find the form by ID

    if (!form) {
      return res.status(404).json({ error: "Forms not found" }); // Return error if the form doesn't exist
    }

    res.json(form); // Send the form data as a response
  } catch (error) {
    console.error("Error fetching forms:", error);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

//  Update form
const updateForm = async (req, res) => {
  try {
    const { formId } = req.params; // Get the form ID from the request parameters
    const { title, link } = req.body; // Get the updated data from the request body

    // Find the form by ID and update it with the new data
    const updatedForm = await Forms.findByIdAndUpdate(
      formId,
      {
        title,
        link,
      },
      { new: true, runValidators: true } // Return the updated form and run validation
    );

    if (!updatedForm) {
      return res.status(404).json({ error: "Form not found" });
    }

    res.json(updatedForm); // Send back the updated fomr data
  } catch (err) {
    console.error("Error updating form:", err);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

//  Remove Forms
const removeForm = async (req, res) => {
  try {
    const { formId } = req.params; // Get the form ID from the request parameters

    // Find and delete the form by ID
    const form = await Forms.findByIdAndDelete(formId);

    if (!form) {
      return res.status(404).json({ error: "Form not found" }); // Return error if the form doesn't exist
    }

    res.json({ message: "Form deleted successfully" }); // Send success message
  } catch (error) {
    console.error("Error deleting form:", error);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

const searchForms = async (req, res) => {
  try {
    const searchQuery = req.query.searchQuery || ""; // Get search query, default to an empty string
    const limit = parseInt(req.query.limit) || 5; // Default limit to 5
    const skip = parseInt(req.query.skip) || 0; // Default skip to 0

    // Perform a case-insensitive search in the database and sort by sequence and createdAt
    const forms = await Forms.find({
      title: { $regex: searchQuery, $options: "i" }, // Match title with search query
    })
      .sort({ sequence: 1, createdAt: -1 }) // Sort by sequence, then by createdAt
      .skip(skip)
      .limit(limit);

    // Total matching documents for search query
    const totalForms = await Forms.countDocuments({
      title: { $regex: searchQuery, $options: "i" },
    });

    // Check if there are more results
    const hasMore = skip + limit < totalForms;

    res.status(200).json({ forms, hasMore });
  } catch (err) {
    console.error("Error searching form:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createForm,
  listOfForms,
  getLimitedForms,
  updateFormsSequence,
  readForm,
  updateForm,
  searchForms,
  removeForm,
};

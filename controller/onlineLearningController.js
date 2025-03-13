const OnlineLearning = require("../model/onlineLearningModel.js");

const createResource = async (req, res) => {
  try {
    const { title, link } = req.body;

    switch (true) {
      case !title.trim():
        return res.json({ error: "Title is required" });
      case !link.trim():
        return res.json({ error: "Link is required" });
    }

    const newResource = new OnlineLearning({
      title,
      link,
    });

    await newResource.save();
    res.json(newResource);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

//  List of Online Learning Resources
const listOfResources = async (req, res) => {
  try {
    const resources = await OnlineLearning.find().sort({
      sequence: 1,
      createdAt: -1,
    }); // Sort by sequence, then by createdAt
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller for fetching a limited number of videos
const getLimitedResources = async (req, res) => {
  try {
    // Parse limit and skip from query parameters
    const limit = parseInt(req.query.limit) || 1; // Default to 5 if not provided
    const skip = parseInt(req.query.skip) || 0; // Default to 0 if not provided

    // Fetch resources from the database with limit and skip
    const resources = await OnlineLearning.find().skip(skip).limit(limit);

    // Check if there are more resources left to load
    const totalResources = await OnlineLearning.countDocuments();
    const hasMore = skip + limit < totalResources;

    // Respond with the resources and whether more resources are available
    res.status(200).json({ resources, hasMore });
  } catch (err) {
    console.error("Error fetching limited videos:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Update Sequence of Resource
const updateResourcesSequence = async (req, res) => {
  try {
    const { reorderedResources } = req.body; // Array of resources with updated sequences

    const bulkOps = reorderedResources.map((resource, index) => ({
      updateOne: {
        filter: { _id: resource._id },
        update: { $set: { sequence: index + 1 } }, // Update the sequence field
      },
    }));

    await OnlineLearning.bulkWrite(bulkOps);

    res
      .status(200)
      .json({ message: "Resources sequence updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating resources sequence" });
  }
};

//  Read Resource
const readResource = async (req, res) => {
  try {
    const { resourceId } = req.params; // Get the resource ID from the request params
    const resource = await OnlineLearning.findById(resourceId); // Find the resource by ID

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" }); // Return error if the resource doesn't exist
    }

    res.json(resource); // Send the resource data as a response
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

//  Update Resource
const updateResource = async (req, res) => {
  try {
    const { resourceId } = req.params; // Get the resource ID from the request parameters
    const { title, link } = req.body; // Get the updated data from the request body

    // Find the Resource by ID and update it with the new data
    const updatedResource = await OnlineLearning.findByIdAndUpdate(
      resourceId,
      {
        title,
        link,
      },
      { new: true, runValidators: true } // Return the updated resource and run validation
    );

    if (!updatedResource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    res.json(updatedResource); // Send back the updated resource data
  } catch (err) {
    console.error("Error updating resource:", err);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

//  Remove Resource
const removeResource = async (req, res) => {
  try {
    const { resourceId } = req.params; // Get the resource ID from the request parameters

    // Find and delete the resource by ID
    const deletedResource = await OnlineLearning.findByIdAndDelete(resourceId);

    if (!deletedResource) {
      return res.status(404).json({ error: "Link not found" }); // Return error if the resource doesn't exist
    }

    res.json({ message: "Resource deleted successfully" }); // Send success message
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

const searchResources = async (req, res) => {
  try {
    const searchQuery = req.query.searchQuery || ""; // Get search query, default to an empty string
    const limit = parseInt(req.query.limit) || 5; // Default limit to 5
    const skip = parseInt(req.query.skip) || 0; // Default skip to 0

    // Perform a case-insensitive search in the database and sort by sequence and createdAt
    const resources = await OnlineLearning.find({
      title: { $regex: searchQuery, $options: "i" }, // Match title with search query
    })
      .sort({ sequence: 1, createdAt: -1 }) // Sort by sequence, then by createdAt
      .skip(skip)
      .limit(limit);

    // Total matching documents for search query
    const totalResources = await OnlineLearning.countDocuments({
      title: { $regex: searchQuery, $options: "i" },
    });

    // Check if there are more results
    const hasMore = skip + limit < totalResources;

    res.status(200).json({ resources, hasMore });
  } catch (err) {
    console.error("Error searching resources:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createResource,
  listOfResources,
  getLimitedResources,
  updateResourcesSequence,
  readResource,
  updateResource,
  searchResources,
  removeResource,
};

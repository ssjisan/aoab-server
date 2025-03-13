const ImportantLinks = require ("../model/importantLinksModel.js");

const createLink = async (req, res) => {
  try {
    const { title, link } = req.body;

    switch (true) {
      case !title.trim():
        return res.json({ error: "Title is required" });
      case !link.trim():
        return res.json({ error: "Link is required" });
    }

    const newLink = new ImportantLinks({
      title,
      link,
    });

    await newLink.save();
    res.json(newLink);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

//  List of Important Links
const listOfLinks = async (req, res) => {
  try {
    const links = await ImportantLinks.find().sort({
      sequence: 1,
      createdAt: -1,
    }); // Sort by sequence, then by createdAt
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller for fetching a limited number of links
const getLimitedLinks = async (req, res) => {
  try {
    // Parse limit and skip from query parameters
    const limit = parseInt(req.query.limit) || 1; // Default to 5 if not provided
    const skip = parseInt(req.query.skip) || 0; // Default to 0 if not provided

    // Fetch Links from the database with limit and skip
    const links = await ImportantLinks.find().skip(skip).limit(limit);

    // Check if there are more link left to load
    const totalLinks = await ImportantLinks.countDocuments();
    const hasMore = skip + limit < totalLinks;

    // Respond with the link and whether more Links are available
    res.status(200).json({ links, hasMore });
  } catch (err) {
    console.error("Error fetching limited links:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Update Sequence of Link
const updateLinksSequence = async (req, res) => {
  try {
    const { reorderedLinks } = req.body; // Array of links with updated sequences

    const bulkOps = reorderedLinks.map((resource, index) => ({
      updateOne: {
        filter: { _id: resource._id },
        update: { $set: { sequence: index + 1 } }, // Update the sequence field
      },
    }));

    await ImportantLinks.bulkWrite(bulkOps);

    res.status(200).json({ message: "Link sequence updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating resources sequence" });
  }
};

//  Read Link
const readLink = async (req, res) => {
  try {
    const { linkId } = req.params; // Get the link ID from the request params
    const link = await ImportantLinks.findById(linkId); // Find the link by ID

    if (!link) {
      return res.status(404).json({ error: "Links not found" }); // Return error if the link doesn't exist
    }

    res.json(link); // Send the link data as a response
  } catch (error) {
    console.error("Error fetching links:", error);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

//  Update Link
const updateLink = async (req, res) => {
  try {
    const { linkId } = req.params; // Get the link ID from the request parameters
    const { title, link } = req.body; // Get the updated data from the request body

    // Find the link by ID and update it with the new data
    const updatedLink = await ImportantLinks.findByIdAndUpdate(
      linkId,
      {
        title,
        link,
      },
      { new: true, runValidators: true } // Return the updated link and run validation
    );

    if (!updatedLink) {
      return res.status(404).json({ error: "Link not found" });
    }

    res.json(updatedLink); // Send back the updated link data
  } catch (err) {
    console.error("Error updating link:", err);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

//  Remove Links
const removeLink = async (req, res) => {
  try {
    const { linkId } = req.params; // Get the link ID from the request parameters

    // Find and delete the resource by ID
    const link = await ImportantLinks.findByIdAndDelete(linkId);

    if (!link) {
      return res.status(404).json({ error: "Link not found" }); // Return error if the link doesn't exist
    }

    res.json({ message: "Link deleted successfully" }); // Send success message
  } catch (error) {
    console.error("Error deleting link:", error);
    res.status(500).json({ error: "Internal server error" }); // Handle server errors
  }
};

const searchLinks = async (req, res) => {
  try {
    const searchQuery = req.query.searchQuery || ""; // Get search query, default to an empty string
    const limit = parseInt(req.query.limit) || 5; // Default limit to 5
    const skip = parseInt(req.query.skip) || 0; // Default skip to 0

    // Perform a case-insensitive search in the database and sort by sequence and createdAt
    const links = await ImportantLinks.find({
      title: { $regex: searchQuery, $options: "i" }, // Match title with search query
    })
      .sort({ sequence: 1, createdAt: -1 }) // Sort by sequence, then by createdAt
      .skip(skip)
      .limit(limit);

    // Total matching documents for search query
    const totalLinks = await ImportantLinks.countDocuments({
      title: { $regex: searchQuery, $options: "i" },
    });

    // Check if there are more results
    const hasMore = skip + limit < totalLinks;

    res.status(200).json({ links, hasMore });
  } catch (err) {
    console.error("Error searching resources:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createLink,
  listOfLinks,
  getLimitedLinks,
  updateLinksSequence,
  readLink,
  updateLink,
  searchLinks,
  removeLink
};

const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
dotenv.config();

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  throw new Error(
    "Cloudinary configuration is missing. Check your environment variables."
  );
}

// ********************************************** The Cloudinary Profile Picture upload function start here ********************************************** //

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

const uploadPostGradCertificateToCloudinary = async (
  pdfBuffer,
  studentName,
  bmdcNo
) => {
  return new Promise((resolve, reject) => {
    const sanitizedStudentName = studentName.replace(/\s+/g, "_");
    const sanitizedBdmcNo = String(bmdcNo).replace(/\s+/g, "_");
    const timestamp = Date.now();
    const uniqueFilename = `postgrad_certificate_${timestamp}`;
    const folderPath = `aoa-bd/postgrad-certificate/${sanitizedStudentName}_${sanitizedBdmcNo}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderPath,
        public_id: uniqueFilename,
        resource_type: "auto", // Allows PDF with image transformations
        format: "pdf", // Optional but ensures format
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url, // Final URL to be stored
            public_id: result.public_id, // Needed for future deletion
            name: result.original_filename,
            size: result.bytes, // File size in bytes
          });
        }
      }
    );

    stream.end(pdfBuffer);
  });
};

const deletePostGradCertificateFromCloudinary = async (publicId) => {
  const tryDelete = (resourceType) =>
    new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: resourceType, invalidate: true },
        (error, result) => {
          if (error || result.result === "not found") {
            reject({ error, resourceType });
          } else {
            resolve(result);
          }
        }
      );
    });

  // Try all types sequentially
  const typesToTry = ["raw", "image", "video"];
  for (const type of typesToTry) {
    try {
      const res = await tryDelete(type);
      console.log(`✅ Deleted from Cloudinary as ${type}`);
      return res;
    } catch (e) {
      console.warn(`⚠️ Failed delete with type ${e.resourceType}`);
    }
  }

  throw new Error("❌ Failed to delete file from Cloudinary in all types.");
};

module.exports = {
  uploadPostGradCertificateToCloudinary,
  deletePostGradCertificateFromCloudinary,
};

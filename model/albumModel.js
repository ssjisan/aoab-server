import mongoose from "mongoose";

const albumSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    images: [
      {
        src: { type: String, required: true },
        public_id: { type: String, required: true },
        name: { type: String, required: true }, // Image name
        size: { type: Number, required: true }, // Image size in bytes
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Albums", albumSchema);

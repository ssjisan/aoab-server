import mongoose from "mongoose";

const formsModel = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
      maxlength: 160,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Forms", formsModel);
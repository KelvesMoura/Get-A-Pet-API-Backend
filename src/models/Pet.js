const mongoose = require("mongoose");
const { Schema } = mongoose;

const Pet = mongoose.model(
  "Pet",
  new Schema(
    {
      name: { type: String, required: true },
      age: { type: Number, required: true },
      weight: { type: Number, required: true },
      color: { type: String },
      images: { type: Array, required: true },
      available: { type: Boolean, default: true },
      user: { type: Object },
      adopter: { type: Object },
    },
    { timestamps: true },
  ),
);

module.exports = Pet;

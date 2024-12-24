const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  category: { type: String, required: true },
  images: [{ type: String, required: true }],
  long_desc: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: String, required: true },
  short_desc: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
});

module.exports = mongoose.model("Product", productSchema);

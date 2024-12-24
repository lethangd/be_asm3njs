const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User tạo đơn
  recipientName: { type: String, required: false }, // Tên người nhận đơn
  recipientEmail: { type: String, required: false }, // Email người nhận đơn
  recipientPhone: { type: String, required: false }, // Số điện thoại người nhận
  recipientAddress: { type: String, required: false }, // Địa chỉ người nhận
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);

const Order = require("../models/order");
const Product = require("../models/product");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
require("dotenv").config();

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.MAIL_KEY,
    },
  })
);

// Create Order
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession(); // Bắt đầu session cho giao dịch
  session.startTransaction();

  try {
    const {
      products,
      totalAmount,
      recipientName,
      recipientEmail,
      recipientPhone,
      recipientAddress,
    } = req.body;

    // Kiểm tra và giảm tồn kho cho từng sản phẩm
    for (const item of products) {
      console.log(item.product);
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        );
      }

      // Giảm tồn kho
      product.stock -= item.quantity;
      await product.save({ session }); // Lưu lại trong transaction
    }

    const order = new Order({
      user: req.user._id, // User ID từ middleware
      products,
      totalAmount,
      recipientName,
      recipientEmail,
      recipientPhone,
      recipientAddress,
      orderDate: new Date(),
    });
    await order.save();

    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    // Populating thông tin sản phẩm từ bảng Product
    await order.populate({
      path: "products.product",
      select: "name price",
    });

    const itemsList = order.products
      .map(
        (item) =>
          `<tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.product.name
          }</td> <!-- Tên sản phẩm -->
          <td style="border: 1px solid #ddd; padding: 8px;">${
            item.quantity
          }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${(
            item.product.price * item.quantity
          ).toLocaleString()} VND</td> <!-- Tính tổng giá trị -->
        </tr>`
      )
      .join("");

    const emailContent = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: black;
            color: white;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
            font-size: 24px;
          }
          h2 {
            color: #555;
            font-size: 18px;
          }
          p {
            font-size: 16px;
            line-height: 1.5;
          }
          .order-summary {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .order-summary th, .order-summary td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .order-summary th {
            background-color: #f9f9f9;
          }
          .total {
            font-size: 18px;
            font-weight: bold;
            text-align: left;
            padding-top: 10px;
          }
          .footer {
            margin-top: 30px;
            font-size: 14px;
            text-align: left;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Xin chào ${order.recipientName}</h1>
          <p>Phone: ${order.recipientPhone}</p>
          <p>Address: ${order.recipientAddress}</p>

          <table class="order-summary">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>

          <div class="total">
            <p>Tổng thanh toán:</p>
            <p>${order.totalAmount.toLocaleString()} VND</p>
          </div>


          <div class="footer">
          <h1>Cảm ơn bạn!</h1>
          </div>
        </div>
      </body>
    </html>
  `;
    try {
      // Gửi email xác nhận
      await transporter.sendMail({
        to: order.recipientEmail,
        from: "lethangd@gmail.com",
        subject: "Order Confirmation",
        html: emailContent,
      });

      // Trả về phản hồi thành công
      res.status(200).json({
        message: "Order created successfully and confirmation email sent!",
      });
    } catch (error) {
      console.error("Error sending email", error);
      res
        .status(500)
        .json({ message: "Error creating order or sending email." });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create order", error: err });
  }
};

// Get All Orders (Admin: tất cả, Customer: chỉ của họ)
exports.getAllOrders = async (req, res) => {
  try {
    let orders;
    if (req.user.role === "admin") {
      // Admin có thể xem tất cả đơn hàng, bao gồm cả người nhận
      orders = await Order.find().populate("user", "fullname email phone");
    } else {
      // Customer chỉ có thể xem đơn hàng của mình
      orders = await Order.find({ user: req.user._id }).populate(
        "user",
        "fullname email phone"
      );
    }

    // Trả về đơn hàng kèm thông tin người nhận hoặc thông tin người đặt nếu không có
    const orderData = orders.map((order) => ({
      ...order.toObject(),
      recipientName: order.recipientName || order.user.fullname,
      recipientEmail: order.recipientEmail || order.user.email,
      recipientPhone: order.recipientPhone || order.user.phone,
      recipientAddress: order.recipientAddress || "N/A", // Nếu không có địa chỉ người nhận, có thể để mặc định 'N/A'
    }));

    res.status(200).json(orderData);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err });
  }
};

// Get Order by ID
exports.getOrder = async (req, res) => {
  const { orderId } = req.params;
  try {
    // Tìm kiếm đơn hàng theo ID
    const order = await Order.findById(orderId).populate({
      path: "products.product", // Tham chiếu đến các sản phẩm trong mảng products
      model: "Product", // Chỉ định model là Product
    });

    // Kiểm tra nếu không tìm thấy đơn hàng
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Kiểm tra quyền truy cập (admin có thể xem tất cả đơn hàng, người dùng chỉ xem đơn của mình)
    if (
      req.user.role !== "admin" &&
      req.user._id.toString() !== order.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    // Trả về thông tin đơn hàng cùng với chi tiết các sản phẩm
    res.status(200).json(order);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch order", error: err });
  }
};
// Update Order
exports.updateOrder = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;

    await order.save();
    res.status(200).json({ message: "Order updated successfully", order });
  } catch (err) {
    res.status(500).json({ message: "Failed to update order", error: err });
  }
};

// Delete Order
exports.deleteOrder = async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.remove();
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete order", error: err });
  }
};

require("dotenv").config(); // Load biến môi trường từ .env

const jwt = require("jsonwebtoken");
const User = require("../models/user");

const checkAuth = (roleRequired) => {
  return async (req, res, next) => {
    try {
      // Lấy thông tin Origin hoặc Referer
      let token;

      if (roleRequired === "admin") {
        token = req.cookies.tokena;
      } else if (roleRequired === "customer") {
        token = req.cookies.token;
      } else {
        if (req.headers["x-role"] === "admin") {
          token = req.cookies.tokena; // Token cho admin
        } else if (req.headers["x-role"] === "customer") {
          token = req.cookies.token; // Token cho customer
        }
      }

      // Nếu không tìm thấy token
      if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Xác minh token
      const decodedToken = jwt.verify(token, "somesupersecretsecret");
      const user = await User.findById(decodedToken.userId);

      // Nếu không tìm thấy user
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Kiểm tra quyền
      if (roleRequired && user.role !== roleRequired && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Thêm thông tin user vào request để sử dụng ở middleware tiếp theo
      req.user = user;
      next();
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err });
    }
  };
};

module.exports = { checkAuth };

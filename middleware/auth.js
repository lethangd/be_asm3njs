require("dotenv").config(); // Load biến môi trường từ .env

const jwt = require("jsonwebtoken");
const User = require("../models/user");

const checkAuth = (roleRequired) => {
  return async (req, res, next) => {
    try {
      // Lấy thông tin Origin hoặc Referer
      const origin = req.get("Origin") || req.get("Referer");
      let token;

      // Kiểm tra URL từ môi trường local và production
      const CLIENT_URL = process.env.CLIENT_URL;
      const ADMIN_URL = process.env.ADMIN_URL;

      // Xác định token dựa trên Origin
      if (origin && origin.includes(CLIENT_URL)) {
        token = req.cookies.token; // Token cho Client
      } else if (origin && origin.includes(ADMIN_URL)) {
        token = req.cookies.tokena; // Token cho Admin
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

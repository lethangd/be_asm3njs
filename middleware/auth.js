const jwt = require("jsonwebtoken");
const User = require("../models/user");

const checkAuth = (roleRequired) => {
  return async (req, res, next) => {
    try {
      // Kiểm tra yêu cầu đến từ đâu: Customer (localhost:3000) hay Admin (localhost:3001)
      const origin = req.get("Origin") || req.get("Referer"); // Sử dụng cả Origin và Referer nếu cần
      let token;

      // Kiểm tra nếu yêu cầu từ Customer hoặc Admin để lấy đúng token
      if (origin && origin.includes("localhost:3000")) {
        token = req.cookies.token; // Customer token
      } else if (origin && origin.includes("localhost:3001")) {
        token = req.cookies.tokena; // Admin token
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

      // Kiểm tra quyền của user (ví dụ như roleRequired là 'admin')
      if (roleRequired && user.role !== roleRequired && user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Thêm thông tin user vào request để sử dụng ở các middleware tiếp theo
      req.user = user;
      next();
    } catch (err) {
      return res.status(500).json({ message: "Server error", error: err });
    }
  };
};

module.exports = { checkAuth };

const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const fullname = req.body.fullname;
  const phone = req.body.phone;
  const password = req.body.password;
  try {
    const user = new User({
      email: email,
      password: password,
      fullname: fullname,
      phone: phone,
    });
    const result = await user.save();
    res.status(201).json({ message: "User created!", userId: result._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Validate request
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      "somesupersecretsecret", // Replace with your actual secret key
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    // Return success with token
    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.getUser = async (req, res) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    // Remove "Bearer " if it exists to just get the token part
    const tokenWithoutBearer = token.startsWith("Bearer ")
      ? token.slice(7)
      : token;

    // Verify token using async/await
    const decoded = jwt.verify(tokenWithoutBearer, "somesupersecretsecret");

    // After decoding, retrieve the user
    const user = await User.findById(decoded.userId);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("JWT Error:", err);
    return res.status(401).json({ message: "Invalid or expired token", err });
  }
};

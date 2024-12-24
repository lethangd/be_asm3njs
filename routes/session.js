const express = require("express");
const { checkAuth } = require("../middleware/auth");
const Session = require("../models/session");
const { body, query, validationResult } = require("express-validator");
const router = express.Router();
const socket = require("../socket");

// Middleware xử lý lỗi validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

console.log("Socket.IO instance in session router:", typeof socket.getIo);

// Lấy danh sách các phiên chat đang hoạt động
router.get("/getAllRoom", async (req, res) => {
  try {
    const sessions = await Session.find()
      .populate("userId", "fullname")
      .sort({ updatedAt: -1 }); // Sắp xếp theo thời gian cập nhật gần nhất
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sessions", error: err });
  }
});

// Lấy tin nhắn theo roomId
router.get(
  "/getById",
  query("roomId").notEmpty().withMessage("roomId is required"),
  validate,
  async (req, res) => {
    const { roomId } = req.query;

    try {
      const session = await Session.findById(roomId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json({ content: session.messages });
    } catch (err) {
      res.status(500).json({ message: "Error fetching messages", error: err });
    }
  }
);

// Tạo phiên chat mới
router.post("/createNewRoom", checkAuth(), async (req, res) => {
  const userId = req.user._id;

  try {
    const existingSession = await Session.findOne({ userId });
    if (existingSession) {
      return res
        .status(200)
        .json({ message: "Session already exists", session: existingSession });
    }

    const newSession = new Session({ userId, messages: [] });
    await newSession.save();

    // Emit sự kiện tạo room mới qua Socket.IO
    const io = socket.getIo();
    if (io) {
      io.emit("room_created", { room: newSession });
    }

    res.status(201).json({
      message: "Session created successfully",
      session: newSession,
    });
  } catch (err) {
    res.status(500).json({ message: "Error creating session", error: err });
  }
});

// Thêm tin nhắn vào phiên chat
router.put(
  "/addMessage",
  body("roomId").notEmpty().withMessage("roomId is required"),
  body("message").notEmpty().withMessage("message is required"),
  validate,
  async (req, res) => {
    const { roomId, message, is_admin } = req.body;

    try {
      const session = await Session.findById(roomId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const newMessage = {
        sender: is_admin ? "admin" : "customer",
        content: message,
        timestamp: new Date(),
        status: "sent",
      };

      session.messages.push(newMessage);
      await session.save();

      // Emit tin nhắn mới qua Socket.IO
      const io = socket.getIo();
      if (io) {
        io.to(roomId).emit("new_message", { message: newMessage });
      }

      res.status(200).json({ message: "Message added successfully", session });
    } catch (err) {
      res.status(500).json({ message: "Error adding message", error: err });
    }
  }
);

module.exports = router;

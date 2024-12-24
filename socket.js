const Session = require("./models/session");

let io;
module.exports = {
  init: (httpServer) => {
    console.log("Initializing Socket.IO");
    io = require("socket.io")(httpServer, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("User connected: " + socket.id);

      // Khi client tạo hoặc tham gia room
      socket.on("createRoom", async ({ userId }) => {
        try {
          let session = await Session.findOne({ userId });

          // Nếu chưa có room thì tạo mới
          if (!session) {
            session = new Session({ userId, messages: [] });
            await session.save();
          }

          const roomId = session._id.toString();
          socket.join(roomId);

          // Emit roomId cho client
          io.to(roomId).emit("roomCreated", { roomId });
          console.log(`User ${userId} joined room: ${roomId}`);
        } catch (error) {
          console.error("Error creating room:", error);
          socket.emit("error", { message: "Failed to create/join room" });
        }
      });

      // Khi client gửi tin nhắn
      socket.on("sendMessage", async ({ roomId, sender, content }) => {
        try {
          const session = await Session.findById(roomId);

          if (!session) {
            socket.emit("error", { message: "Room not found" });
            return;
          }

          const message = {
            sender,
            content,
            timestamp: new Date(),
            status: "sent", // Đánh dấu trạng thái tin nhắn
          };

          session.messages.push(message);
          await session.save();

          // Gửi tin nhắn đến tất cả các socket trong room
          io.to(roomId).emit("newMessage", message);
          console.log(`Message sent to room ${roomId}:`, message);
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // Khi client muốn kết thúc room chat
      socket.on("endSession", async ({ roomId }) => {
        try {
          const session = await Session.findByIdAndDelete(roomId);

          if (!session) {
            socket.emit("error", { message: "Room not found" });
            return;
          }

          // Emit thông báo cho tất cả các socket trong room
          io.to(roomId).emit("sessionEnded", { roomId });
          io.socketsLeave(roomId);
          console.log(`Session ended for room: ${roomId}`);
        } catch (error) {
          console.error("Error ending session:", error);
          socket.emit("error", { message: "Failed to end session" });
        }
      });

      // Khi client ngắt kết nối
      socket.on("disconnect", () => {
        console.log("User disconnected: " + socket.id);
        // Bạn có thể bổ sung logic cập nhật trạng thái offline nếu cần
      });
    });

    return io;
  },

  getIo: () => {
    console.log("Getting Socket.IO instance:", !!io);
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};

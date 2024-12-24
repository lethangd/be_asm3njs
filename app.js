const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");

const productRoutes = require("./routes/product");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/session");
const socketIo = require("./socket");

const app = express();
const server = http.createServer(app);

// Cấu hình lưu trữ file
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + sanitizedFilename
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Cấu hình CORS
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(multer({ storage: fileStorage, fileFilter }).array("images", 5));

app.use("/images", express.static(path.join(__dirname, "images")));

// Routes
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/chatrooms", chatRoutes);

// Error handling
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message, data });
});

// Database và Socket.IO
mongoose
  .connect(
    "mongodb+srv://root:123@cluster0.s4kkp.mongodb.net/asm3?retryWrites=true&w=majority"
  )
  .then(() => {
    server.listen(process.env.PORT || 5000, () => {
      console.log("Server is running on port 5000");
    });

    const io = socketIo.init(server);

    io.on("connection", (socket) => {
      console.log("Client connected: " + socket.id);

      socket.on("disconnect", () => {
        console.log("Client disconnected: " + socket.id);
      });
    });
  })
  .catch((err) => console.log(err));

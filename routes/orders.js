const express = require("express");
const { checkAuth } = require("../middleware/auth");
const orderController = require("../controllers/orders");

const router = express.Router();

router.post("/create", checkAuth("customer"), orderController.createOrder);
router.get("/:orderId", checkAuth(), orderController.getOrder);
router.put("/update/:orderId", checkAuth("admin"), orderController.updateOrder);
router.delete(
  "/delete/:orderId",
  checkAuth("admin"),
  orderController.deleteOrder
);
// Get All Orders
router.get("/", checkAuth(), orderController.getAllOrders);

module.exports = router;

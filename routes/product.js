const express = require("express");
const { checkAuth } = require("../middleware/auth");
const productController = require("../controllers/product");

const router = express.Router();

router.post("/create", checkAuth("admin"), productController.createProduct);
router.get("/", productController.getProducts);
router.put(
  "/update/:productId",
  checkAuth("admin"),
  productController.updateProduct
);
router.delete(
  "/delete/:productId",
  checkAuth("admin"),
  productController.deleteProduct
);
// Get Product Details
router.get("/:productId", productController.getProductDetails);

module.exports = router;

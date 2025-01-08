const Product = require("../models/product");

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const { name, price, category, long_desc, short_desc, stock } = req.body;

    // Lấy danh sách đường dẫn của các hình ảnh
    const images = req.files.map((file) => file.path);

    // Kiểm tra nếu không có ít nhất một hình ảnh
    if (!images || images.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one image is required" });
    }

    const product = new Product({
      name,
      price,
      category,
      images,
      long_desc,
      short_desc,
      stock: stock || 0,
    });

    await product.save();
    res.status(201).json({ message: "Product created successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to create product", error: err });
  }
};

// Get all Products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: err });
  }
};

// Get Product Details
exports.getProductDetails = async (req, res) => {
  const { productId } = req.params;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product", error: err });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  const { productId } = req.params;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { name, price, category, long_desc, short_desc, stock } = req.body;

    // Nếu có file mới được upload, cập nhật hình ảnh
    if (req.files && req.files.length > 0) {
      const images = req.files.map((file) => file.path);
      product.images = images;
    }

    product.name = name || product.name;
    product.price = price || product.price;
    product.category = category || product.category;
    product.long_desc = long_desc || product.long_desc;
    product.short_desc = short_desc || product.short_desc;
    product.stock = stock || product.stock;

    await product.save();
    res.status(200).json({ message: "Product updated successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product", error: err });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.deleteOne({ _id: productId });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to delete product", error: err });
  }
};

const productService = require('../services/productService');

// 1. Create Product
const createProduct = async (req, res) => {
  console.log('----------------------------------------------------');
  console.log('[CONTROLLER] createProduct called');
  console.log('[CONTROLLER] Request Body:', req.body);
  if (req.file) console.log('[CONTROLLER] File attached:', req.file.filename);

  try {
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      stock: parseInt(req.body.stock),
      category: req.body.category,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null
    };

    const newProduct = await productService.createProduct(productData);

    console.log(`[CONTROLLER] Product created successfully with ID: ${newProduct.id}`);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('[CONTROLLER] createProduct Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All
const getAllProducts = async (req, res) => {
  console.log('----------------------------------------------------');
  console.log('[CONTROLLER] getAllProducts called');

  try {
    // 1. EXTRACT BOTH PARAMS
    // Example URL: /products?category=HEADPHONE&search=Sony
    const { category, search } = req.query; 

    console.log(`[CONTROLLER] Filters - Category: ${category || 'NONE'}, Search: ${search || 'NONE'}`);

    // 2. PASS BOTH TO SERVICE
    const products = await productService.getAllProducts(category, search);
    
    console.log(`[CONTROLLER] Sending ${products.length} products to client`);
    res.json(products);
  } catch (error) {
    console.error('[CONTROLLER] getAllProducts Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 3. Get One
const getProductById = async (req, res) => {
  const { id } = req.params;
  console.log('----------------------------------------------------');
  console.log(`[CONTROLLER] getProductById called for ID: ${id}`);

  try {
    const product = await productService.getProductById(id);

    if (!product) {
      console.warn(`[CONTROLLER] Product ID ${id} not found`);
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`[CONTROLLER] Product ID ${id} found and sending to client`);
    res.json(product);
  } catch (error) {
    console.error(`[CONTROLLER] getProductById Error for ID ${id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
};

// 4. Update Product
const updateProduct = async (req, res) => {
  const { id } = req.params;
  console.log('----------------------------------------------------');
  console.log(`[CONTROLLER] updateProduct called for ID: ${id}`);
  console.log('[CONTROLLER] Update Payload:', req.body);

  try {
    // A. Start with the text fields from the body
    const productData = { ...req.body };

    // B. Handle Numbers
    if (productData.price) productData.price = parseFloat(productData.price);
    if (productData.stock) productData.stock = parseInt(productData.stock);

    // C. Handle Image
    if (req.file) {
      console.log(`[CONTROLLER] New image uploaded: ${req.file.filename}`);
      productData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await productService.updateProduct(id, productData);

    console.log(`[CONTROLLER] Product ID ${id} updated successfully`);
    res.json(updatedProduct);

  } catch (error) {
    if (error.message.includes('Product not found')) {
      console.warn(`[CONTROLLER] Cannot update. Product ID ${id} not found`);
      return res.status(404).json({ error: error.message });
    }
    console.error(`[CONTROLLER] updateProduct Error for ID ${id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
};

// 5. Soft Delete Product
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  console.log('----------------------------------------------------');
  console.log(`[CONTROLLER] deleteProduct called for ID: ${id}`);

  try {
    await productService.deleteProduct(id);

    console.log(`[CONTROLLER] Product ID ${id} soft-deleted successfully`);
    res.status(204).send();
  } catch (error) {
    console.error(`[CONTROLLER] deleteProduct Error for ID ${id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middlewares/uploadMiddleware');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// 1. Create (POST)
router.post(
  '/', 
  authenticateToken, 
  authorizeRoles('SHOP_OWNER', 'DEVELOPER'), 
  upload.single('image'), 
  productController.createProduct
);

// 2. Get All (GET)
router.get('/', productController.getAllProducts);

// 3. Get One (GET)
router.get('/:id', productController.getProductById);

// 4. Update (PUT)
router.put(
  '/:id', 
  authenticateToken, 
  authorizeRoles('SHOP_OWNER', 'DEVELOPER'), 
  upload.single('image'), // <--- Critical: Allows updating the image OR text
  productController.updateProduct
);

// 5. Delete (DELETE)
router.delete(
  '/:id', 
  authenticateToken, 
  authorizeRoles('SHOP_OWNER', 'DEVELOPER'), 
  productController.deleteProduct
);

module.exports = router;
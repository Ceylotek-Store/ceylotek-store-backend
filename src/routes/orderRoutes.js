const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// 1. Create Order (Any logged-in user can buy)
router.post('/', authenticateToken, orderController.createOrder);

// 2. Get My Orders (Logged-in user sees their own history)
router.get('/my-orders', authenticateToken, orderController.getMyOrders);

// 3. Get All Orders (Admin/Shop Owner only)
router.get('/admin/all', authenticateToken, authorizeRoles('SHOP_OWNER', 'DEVELOPER'), orderController.getAllOrders);

// 4. Update Order Status (Admin/Shop Owner only)
router.patch('/:id/status', authenticateToken, authorizeRoles('SHOP_OWNER', 'DEVELOPER'), orderController.updateStatus);

router.get('/:id', authenticateToken, orderController.getOrderById);

module.exports = router;
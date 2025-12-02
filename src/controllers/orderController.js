const { get } = require('../routes/orderRoutes');
const orderService = require('../services/orderService');

const createOrder = async (req, res) => {
  try {
    const userId = req.user.id; 
    const orderData = req.body;
    
    // LOG 1: Incoming Request
    console.log(`\n--- [CreateOrder] Request Started ---`);
    console.log(`User ID: ${userId}`);
    console.log(`Items Received:`, orderData.items); // See exactly what items are being sent

    // Validation
    if (!orderData.items || orderData.items.length === 0) {
      console.warn(`[CreateOrder] Aborted: Cart is empty for User ${userId}`);
      return res.status(400).json({ error: "Cart is empty" });
    }

    const newOrder = await orderService.createOrder(userId, orderData);
    
    // LOG 2: Success
    console.log(`[CreateOrder] Success! Created Order ID: ${newOrder.id}`);
    console.log(`Total Amount: ${newOrder.totalAmount}`);
    
    res.status(201).json(newOrder);
  } catch (error) {
    // LOG 3: Failure
    console.error(`[CreateOrder] FAILED:`, error.message);
    res.status(400).json({ error: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`\n[GetMyOrders] Fetching orders for User ID: ${userId}`);

    const orders = await orderService.getMyOrders(userId);
    
    console.log(`[GetMyOrders] Found ${orders.length} orders.`);
    res.json(orders);
  } catch (error) {
    console.error(`[GetMyOrders] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    // Note: req.user exists here because of the authenticateToken middleware
    console.log(`\n[GetAllOrders] Admin Request by User ID: ${req.user.id}`);

    const orders = await orderService.getAllOrders();
    
    console.log(`[GetAllOrders] Returning all ${orders.length} orders in system.`);
    res.json(orders);
  } catch (error) {
    console.error(`[GetAllOrders] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`\n[UpdateStatus] Request for Order ID: ${id}`);
    console.log(`[UpdateStatus] New Status: ${status}`);

    const updatedOrder = await orderService.updateOrderStatus(id, status);
    
    console.log(`[UpdateStatus] Success. Order ${id} is now ${updatedOrder.status}`);
    res.json(updatedOrder);
  } catch (error) {
    console.error(`[UpdateStatus] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // From auth middleware
    const userRole = req.user.role; // From auth middleware

    console.log(`\n[GetOrderById] Fetching Order #${id} for User ${userId}`);

    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // SECURITY CHECK:
    // Allow access ONLY if:
    // 1. The user is the owner of the order OR
    // 2. The user is an ADMIN / SHOP_OWNER
    if (order.userId !== userId && userRole !== 'ADMIN' && userRole !== 'SHOP_OWNER') {
      console.warn(`[GetOrderById] Unauthorized access attempt by User ${userId}`);
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(order);
  } catch (error) {
    console.error(`[GetOrderById] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
};




module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateStatus,
  getOrderById
};
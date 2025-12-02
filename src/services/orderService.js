const prisma = require('../config/prisma');
const { sendToQueue } = require('../config/rabbitmq');
const redis = require('../config/redis'); // Import Redis

// Cache TTL (Time To Live) in seconds
const CACHE_TTL_USER_LIST = 300; // 5 minutes (User history)
const CACHE_TTL_ORDER = 600;     // 10 minutes (Single receipt)
const CACHE_TTL_ADMIN = 60;      // 1 minute (Admin dashboard - keep it fresh)

const createOrder = async (userId, orderData) => {
  const { items, shippingAddress, contactPhone, paymentMethod } = orderData;

  // 1. Database Transaction (Unchanged)
  const newOrder = await prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: parseInt(item.productId) }
      });

      if (!product) throw new Error(`Product ID ${item.productId} not found`);
      if (product.stock < item.quantity) throw new Error(`Product ${product.name} is out of stock`);

      const price = parseFloat(product.price);
      totalAmount += price * item.quantity;

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      });

      await tx.product.update({
        where: { id: product.id },
        data: { stock: product.stock - item.quantity }
      });
    }

    return await tx.order.create({
      data: {
        userId,
        totalAmount,
        status: 'PENDING',
        paymentMethod,
        paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
        shippingAddress,
        contactPhone,
        items: { create: orderItemsData }
      },
      include: { items: { include: { product: true } } }
    });
  });

  // 2. 🗑️ INVALIDATE CACHE (Write Operation)
  // The user has a new order, so their history list is now outdated.
  // The admin list is also outdated.
  await redis.del(`USER_ORDERS:${userId}`);
  await redis.del('ALL_ORDERS_ADMIN');

  // 3. RabbitMQ (Unchanged)
  try {
    const payload = { orderId: newOrder.id };
    await sendToQueue('ORDER_QUEUE', payload);
    console.log(`🐰 Order #${newOrder.id} event sent to RabbitMQ`);
  } catch (err) {
    console.error("⚠️ Failed to send order to queue:", err.message);
  }

  return newOrder;
};

const getMyOrders = async (userId) => {
  const cacheKey = `USER_ORDERS:${userId}`;

  // 1. ⚡ CHECK REDIS
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // 2. 🐢 QUERY DB
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' }
  });

  // 3. 💾 SAVE TO CACHE
  await redis.set(cacheKey, JSON.stringify(orders), 'EX', CACHE_TTL_USER_LIST);

  return orders;
};

const getAllOrders = async () => {
  const cacheKey = 'ALL_ORDERS_ADMIN';

  // 1. ⚡ CHECK REDIS
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // 2. 🐢 QUERY DB
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, imageUrl: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 3. 💾 SAVE TO CACHE
  await redis.set(cacheKey, JSON.stringify(orders), 'EX', CACHE_TTL_ADMIN);

  return orders;
};

const updateOrderStatus = async (orderId, status) => {
  // 1. Update DB
  const updatedOrder = await prisma.order.update({
    where: { id: parseInt(orderId) },
    data: { status }
  });

  // 2. 🗑️ INVALIDATE CACHE (Crucial step)
  // We need to clear multiple keys because this update affects several views:
  
  // A. The Single Order view (if user is looking at receipt)
  await redis.del(`ORDER:${orderId}`);
  
  // B. The User's History list (status changed there too)
  await redis.del(`USER_ORDERS:${updatedOrder.userId}`);
  
  // C. The Admin Dashboard list
  await redis.del('ALL_ORDERS_ADMIN');

  return updatedOrder;
};

const getOrderById = async (orderId) => {
  const cacheKey = `ORDER:${orderId}`;

  // 1. ⚡ CHECK REDIS
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // 2. 🐢 QUERY DB
  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
    include: {
      items: {
        include: { product: true }
      },
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // 3. 💾 SAVE TO CACHE
  if (order) {
    await redis.set(cacheKey, JSON.stringify(order), 'EX', CACHE_TTL_ORDER);
  }

  return order;
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById
};
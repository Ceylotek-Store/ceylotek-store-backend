const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Import Middleware
const { authenticateToken, authorizeRoles } = require('./middlewares/authMiddleware');

const { connectRabbitMQ } = require('./config/rabbitmq');

// 1. Initialize App FIRST
const app = express();

// 2. Middleware Configuration
app.use(cors({
  // Allow BOTH localhost (for dev) AND the Frontend VM IP (for prod)
  origin: [
    'http://localhost:3000', 
    'http://192.168.56.30:3000' 
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// 3. Static Files (Images)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// --- 4. HEALTH CHECK / DEFAULT ROUTE (ADD THIS HERE) ---
// This handles GET requests to http://localhost:5000/
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Ecommerce Backend is running successfully',
    timestamp: new Date().toISOString()
  });
});

// --- 5. API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// --- EXAMPLE PROTECTED ROUTES ---
app.get('/api/owner-dashboard', authenticateToken, authorizeRoles('SHOP_OWNER'), (req, res) => {
    res.json({ message: "Welcome Shop Owner! You can see this." });
});

app.get('/api/logs', authenticateToken, authorizeRoles('DEVELOPER', 'SHOP_OWNER'), (req, res) => {
    res.json({ message: "System logs..." });
});

connectRabbitMQ();

module.exports = app;
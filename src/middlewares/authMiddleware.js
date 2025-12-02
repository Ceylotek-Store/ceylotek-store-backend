const jwt = require('jsonwebtoken');

// 1. Verify Token Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Token usually comes as: "Bearer eyJhbGci..."
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user info (id, role) to the request
        next(); // Pass to the next handler
    } catch (error) {
        res.status(403).json({ error: 'Invalid token.' });
    }
};

// 2. Role Check Middleware (Factory Function)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRoles };
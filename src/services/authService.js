const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper: Generate Token
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // Short life
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Long life
    );

    return { accessToken, refreshToken };
};

const registerUser = async (userData) => {
    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
    });
    if (existingUser) {
        throw new Error('User already exists');
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // 3. Create User
    const user = await prisma.user.create({
        data: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role || 'CUSTOMER'
        }
    });

    // --- STANDARD WAY UPDATE START ---
    // 4. Generate Tokens immediately (Just like Login)
    const { accessToken, refreshToken } = generateTokens(user);

    // 5. Save Refresh Token to DB
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
    });

    // 6. Return User + Tokens
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
    // --- STANDARD WAY UPDATE END ---
};

const loginUser = async (email, password) => {
    // 1. Find User
    const user = await prisma.user.findUnique({
        where: { email }
    });
    if (!user) {
        throw new Error('Invalid credentials');
    }

    // 2. Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    // 3. Generate Token
    const { accessToken, refreshToken } = generateTokens(user);

    // Update user in DB with new refresh token
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
    });

    // 4. Return user info and token
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
};

// 3. The New Refresh Logic
const refreshAccessToken = async (incomingRefreshToken) => {
    if (!incomingRefreshToken) throw new Error('No token provided');

    // Verify the token
    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.JWT_SECRET);
    } catch (err) {
        throw new Error('Invalid Refresh Token');
    }

    // Check if this token is in the DB (Token Reuse Detection)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== incomingRefreshToken) {
        throw new Error('Invalid Refresh Token');
    }

    // Generate NEW tokens
    const tokens = generateTokens(user);

    // Update DB with the NEW refresh token (Rotation)
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken }
    });

    return tokens;
};

const logoutUser = async (refreshToken) => {
    // 1. Find the user by their refresh token
    // (If you are doing token rotation correctly, this should be unique)
    const user = await prisma.user.findFirst({
        where: { refreshToken: refreshToken }
    });

    if (!user) {
        // If no user found with this token, they are already effectively logged out
        // or the token was invalid/stolen. No DB update needed.
        return;
    }

    // 2. Invalidate the token in the DB
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null } // Set to NULL to revoke access
    });
};

module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser
};
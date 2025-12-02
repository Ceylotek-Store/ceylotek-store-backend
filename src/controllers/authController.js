const authService = require('../services/authService');

const register = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const login = async (req, res) => {
    console.log("Login request body:", req.body);
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

        // Set HttpOnly Cookie
        res.cookie('jwt', refreshToken, {
            httpOnly: true, // JS cannot read this (Security)
            secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
            sameSite: 'strict', // Protects against CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Send only Access Token to frontend
        res.status(200).json({ user, accessToken });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

const refresh = async (req, res) => {
    const cookies = req.cookies;
    console.log("Cookies received:", cookies);
    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const { accessToken, refreshToken } = await authService.refreshAccessToken(cookies.jwt);

        // Send new cookie
        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ accessToken });
    } catch (error) {
        console.log("Refresh Error:", error.message);
        res.status(403).json({ message: 'Forbidden', error: error.message });
    }
};

const logout = async (req, res) => {
    const cookies = req.cookies;

    // If no cookie, they are already logged out on the client side
    if (!cookies?.jwt) return res.sendStatus(204); // No content

    const refreshToken = cookies.jwt;

    try {
        // 1. (NEW) Call service to remove token from DB
        await authService.logoutUser(refreshToken);

        // 2. Clear the cookie from the browser
        res.clearCookie('jwt', {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production' // IMPORTANT: Must match login setting
        });

        res.status(200).json({ message: 'Successfully logged out' });

    } catch (error) {
        console.error("Logout Error:", error.message);
        // Even if DB fails, try to clear cookie. 500 Internal Server Error.
        res.status(500).json({ error: "Logout failed on server" });
    }
}

module.exports = { register, login, refresh, logout };
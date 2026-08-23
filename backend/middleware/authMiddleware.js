const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Check whether token was sent
        if (!authHeader) {
            return res.status(401).json({
                message: 'Access token is required.'
            });
        }

        // Expected format:
        // Authorization: Bearer <token>
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'Invalid authorization format.'
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'super_secret_key'
        );

        // Store verified user information
        req.user = decoded;

        // Continue to the route
        next();

    } catch (error) {
        return res.status(403).json({
            message: 'Invalid or expired token.'
        });
    }
};

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'You do not have permission to access this resource.'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};
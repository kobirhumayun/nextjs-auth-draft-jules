const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

// Critical: Ensure the secret key is defined during startup.
if (!ACCESS_TOKEN_SECRET) {
    console.error("FATAL ERROR: ACCESS_TOKEN_SECRET is not defined in environment variables.");
    process.exit(1); // Exit if the secret is missing.
}

/**
 * @description Middleware to authenticate requests using JWT.
 * Verifies the 'Authorization: Bearer <token>' header.
 * Attaches the decoded user payload to req.user upon success.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const authenticate = async (req, res, next) => {

    const authHeader = req.headers['authorization'];

    // Check for Authorization header and 'Bearer ' prefix
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: No token provided or malformed header.'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Token missing after Bearer prefix.'
        });
    }

    try {

        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

        req.user = decoded;

        next(); // Token is valid, proceed.

    } catch (error) {
        console.error(`Authentication Error: ${error.name} - ${error.message}`);

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: Token has expired.'
            });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: Invalid token.'
            });
        }

        // Generic Error Handling
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error during authentication.'
            // Avoid sending raw error.message in production for security.
        });
    }
};

module.exports = { authenticate };
const express = require('express');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const router = express.Router();

// --- Controller & Middleware Imports ---
const userController = require('../controllers/user');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const {
    registerValidationRules,
    loginValidationRules,
    requestPasswordResetValidationRules,
    resetPasswordValidationRules,
    handleValidationErrors
} = require('../validators/validatorsIndex');

// --- Middleware Configurations ---

/**
 * @description Slows down responses for sensitive endpoints after a few attempts
 * to mitigate brute-force attacks.
 */
const authSlowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 5,            // Start delaying after 5 requests within windowMs
    delayMs: (hits) => hits * 100, // Increment delay by 100ms for each request after delayAfter
    maxDelayMs: 3000,         // Cap the delay at 3 seconds
});

/**
 * @description Rate limit for authentication actions (login, register, password reset).
 * Limits the number of requests per IP within a time window.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                  // Limit each IP to 10 requests per windowMs
    standardHeaders: 'draft-7', // Use RFC 7231 / IETF draft 7 standard headers
    legacyHeaders: false,       // Disable X-RateLimit-* headers
    message: { error: 'Too many attempts from this IP, please try again after 15 minutes.' }, // Send JSON response
    handler: (req, res, next, options) => { // Custom handler for logging/actions
        // console.warn(`Rate limit exceeded for IP: ${req.ip}`); // Optional: Log exceeded attempts
        res.status(options.statusCode).send(options.message);
    }
});

/**
 * @description Rate limit for refreshing tokens. Allows more frequent requests
 * than auth actions but still provides protection.
 */
const refreshLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 minutes
    max: 20,                  // Limit to 20 requests per 5 minutes
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many refresh requests, please try again later.' }
});

// --- Middleware Bundles ---

// Combine slowdown and rate limiting for public auth routes
const publicAuthProtection = [authSlowDown, authLimiter];

// --- Route Definitions ---

// ## Authentication & Registration

// User Registration Route
router.post('/register',
    ...publicAuthProtection, // Apply slowdown & rate limit
    registerValidationRules(),
    handleValidationErrors,
    userController.registerUser
);

// User Login Route
router.post('/login',
    ...publicAuthProtection, // Apply slowdown & rate limit
    loginValidationRules(),
    handleValidationErrors,
    userController.loginUser
);

// User Logout Route (Requires authentication, less likely to be brute-forced)
router.post('/logout',
    authenticate, // Ensure user is logged in
    userController.logoutUser
);

// Refresh Access Token Route
router.post('/refresh-token',
    refreshLimiter, // Apply specific limiter for token refreshes
    userController.refreshAccessToken
);


// ## Password Reset

// Request Password Reset Route
router.post('/request-password-reset',
    ...publicAuthProtection, // Apply slowdown & rate limit
    requestPasswordResetValidationRules(),
    handleValidationErrors,
    authController.requestPasswordReset
);

// Reset Password Route
router.post('/reset-password',
    ...publicAuthProtection, // Apply slowdown & rate limit (consider if a token is used - might need different limits)
    resetPasswordValidationRules(),
    handleValidationErrors,
    authController.resetPassword
);

module.exports = router;
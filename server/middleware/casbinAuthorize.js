// middleware/authorize.js
const { getEnforcer } = require('../services/casbin.js');
// Helper function to map HTTP methods to Casbin actions
function mapMethodToAction(method) {
    switch (method.toUpperCase()) {
        case 'GET': return 'read';
        case 'POST': return 'write';
        case 'PUT': return 'update';
        case 'PATCH': return 'update'; // Or a separate 'patch' action if needed
        case 'DELETE': return 'delete';
        default: return method.toLowerCase(); // Fallback
    }
}

/**
 * Express middleware to enforce Casbin authorization.
 * Assumes JWT authentication middleware runs first and attaches user info to req.user.
 *
 * Example req.user structure expected:
 * req.user = {
 * id: 'user_id_alice', // The User ID (subject in Casbin)
 * plan: 'professional' // The user's current plan (domain in Casbin)
 * };
 *
 * @param {string} resource - The resource identifier (object in Casbin).
 * Can be a static string like 'resource1' or dynamic like req.path.
 * @param {string} [action] - Optional explicit action (action in Casbin). If not provided, derived from req.method.
 */
const authorize = (resource, explicitAction = null) => {
    return async (req, res, next) => {
        const enforcer = await getEnforcer();

        // --- 1. Extract Subject (User ID) and Domain (Plan) ---
        // IMPORTANT: Ensure your JWT authentication middleware (e.g., passport-jwt, express-jwt)
        // runs BEFORE this middleware and populates req.user correctly.
        if (!req.user || !req.user._id || !req.user.plan) {
            console.warn('Authorization middleware requires req.user with id and plan.');
            // Return 401 Unauthorized if user info isn't present (authentication issue)
            // Or 403 Forbidden if technically authenticated but missing required attributes for authorization
            return res.status(401).json({ message: 'Unauthorized: User information missing.' });
        }
        const sub = req.user.role;      // User ID from JWT payload
        const dom = req.user.plan;    // User's plan from JWT payload

        // --- 2. Determine Object (Resource) ---
        // Use the provided resource string directly. You might use req.path for RESTful APIs.
        const obj = resource; // e.g., 'resource1', 'resource2', or potentially req.params.id for specific items

        // --- 3. Determine Action ---
        const act = explicitAction || mapMethodToAction(req.method); // e.g., 'read', 'write'

        // --- 4. Enforce Policy ---
        console.log(`Checking access: User='${sub}', Plan='${dom}', Resource='${obj}', Action='${act}'`); // For debugging
        const hasPermission = await enforcer.enforce(sub, dom, obj, act);

        if (hasPermission) {
            console.log(`Access GRANTED: User='${sub}', Plan='${dom}', Resource='${obj}', Action='${act}'`);
            next(); // User has permission, proceed to the route handler
        } else {
            console.warn(`Access DENIED: User='${sub}', Plan='${dom}', Resource='${obj}', Action='${act}'`);
            // User does not have permission
            res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
        }
    };
};

module.exports = { authorize };
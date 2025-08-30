const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/casbinAuthorize');
const { reloadPolicies } = require('../services/casbin');

// --- Controller & Middleware Imports ---
const userController = require('../controllers/user');

// Example of a protected route
router.put('/reload-policies',
    authenticate,
    authorize("admin"),
    async (req, res) => {
        try {
            await reloadPolicies();
            res.json({ message: 'Policies reloaded successfully. by', user: req.user });
        } catch (error) {
            res.status(500).json({ message: 'Error reloading policies.', error: error.message });
        }
    });

router.get('/user-profile',
    authenticate,
    authorize("admin"),
    userController.getUserProfile
);

router.patch('/user-profile/:userId',
    authenticate,
    authorize("admin"),
    userController.updateUserProfileByAdmin
);

router.post('/basic-info',
    authenticate,
    authorize("basic"),
    async (req, res) => {
        res.json({ message: 'This is a protected route. accessed by', user: req.user });
    });

router.post('/professional-info',
    authenticate,
    authorize("professional"),
    async (req, res) => {
        res.json({ message: 'This is a protected route. accessed by', user: req.user });
    });

router.post('/business-info',
    authenticate,
    authorize("business"),
    async (req, res) => {
        res.json({ message: 'This is a protected route. accessed by', user: req.user });
    });

router.post('/enterprise-info',
    authenticate,
    authorize("enterprise"),
    async (req, res) => {
        res.json({ message: 'This is a protected route. accessed by', user: req.user });
    });

router.get('/user-info',
    authenticate,
    async (req, res) => {
        res.json({ message: 'This is a protected route.', user: req.user });
    });

module.exports = router;

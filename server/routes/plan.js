const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/casbinAuthorize');
const { paymentValidationRules,
    planValidationRules,
    changePlanValidationRules,
    handleValidationErrors } = require('../validators/validatorsIndex');

// Optional: Add rate limiting middleware

// Add plan route
router.post('/plan',
    planValidationRules(),
    handleValidationErrors,
    authenticate,
    authorize("admin"),
    planController.addPlan);

// Delete plan route
router.delete('/plan',
    planValidationRules(),
    handleValidationErrors,
    authenticate,
    authorize("admin"),
    planController.deletePlan);

// Update plan route
router.put('/plan',
    planValidationRules(),
    handleValidationErrors,
    authenticate,
    authorize("admin"),
    planController.updatePlan);

// Get subscription details route
router.get('/my-plan',
    authenticate,
    planController.getSubscriptionDetails);

// Change plan route
router.post('/approve-plan',
    changePlanValidationRules(),
    handleValidationErrors,
    authenticate,
    authorize("admin"),
    planController.activatedPlan);

// Get all plans route
router.get('/all-plans',
    planController.getAllPlans);

// place order
router.post('/order',
    authenticate,
    planController.placeOrder);

router.post('/manual-payment',
    paymentValidationRules(),
    handleValidationErrors,
    authenticate,
    planController.manualPaymentSubmit);

// Get payments by status route
router.get('/payment',
    authenticate,
    authorize("admin"),
    planController.getPaymentsByStatus);

// Export the router

module.exports = router;

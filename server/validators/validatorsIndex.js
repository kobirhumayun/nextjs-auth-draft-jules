const { validationResult, matchedData } = require('express-validator');
const authValidators = require('./authValidators');
const paymentValidators = require('./paymentValidators');
const planValidators = require('./planValidators');

/**
 * Middleware to handle validation results.
 * It first checks for validation errors from express-validator.
 * Then, it checks if req.body contains any fields that were not specified in the validation rules.
 * If unknown fields are found, it returns a 400 error.
 */
const handleValidationErrors = (req, res, next) => {
    // 1. Check for standard validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // 2. Check for unspecified fields in req.body
    // We only perform this check if req.body exists and has keys.
    // For GET requests or requests with empty bodies, this check will be skipped.
    if (req.body && Object.keys(req.body).length > 0) {
        // Get data that was actually defined in validation chains for the 'body' location
        const validatedBodyData = matchedData(req, {
            locations: ['body'],
            includeOptionals: true, // Important to include keys of optional fields defined in validators
        });
        const validatedBodyKeys = Object.keys(validatedBodyData);
        const actualBodyKeys = Object.keys(req.body);

        const unknownFields = actualBodyKeys.filter(key => !validatedBodyKeys.includes(key));

        if (unknownFields.length > 0) {
            return res.status(400).json({
                message: 'Request body contains unspecified fields.',
                errorDetails: `Unknown fields provided: ${unknownFields.join(', ')}. Only specified fields are allowed.`,
                unknownFields: unknownFields,
            });
        }
    }

    next();
};

module.exports = {
    registerValidationRules: authValidators.registerValidationRules,
    loginValidationRules: authValidators.loginValidationRules,
    requestPasswordResetValidationRules: authValidators.requestPasswordResetValidationRules,
    resetPasswordValidationRules: authValidators.resetPasswordValidationRules,
    paymentValidationRules: paymentValidators.paymentValidationRules,
    planValidationRules: planValidators.planValidationRules,
    changePlanValidationRules: planValidators.changePlanValidationRules,
    handleValidationErrors,
};
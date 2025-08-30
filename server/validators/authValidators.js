const { oneOf } = require('express-validator');
const {
    isNotEmptyString,
    isEmailField,
    isStrongPassword,
    isLength,
    isAlphanumericField,
    isNumericField,
} = require('./commonValidators');

const registerValidationRules = () => {
    return [
        isAlphanumericField('username'),
        isLength('username', { min: 3, max: 30 }),
        isEmailField('email'),
        isStrongPassword('password'),
    ];
};

const loginValidationRules = () => {
    return [
        oneOf([
            isEmailField('identifier'), // Validates if 'identifier' is an email
            isAlphanumericField('identifier') // Validates if 'identifier' is alphanumeric (username)
                .bail() // stop validation if not alphanumeric, proceed to length check only if it is
                .isLength({ min: 3, max: 30 }) // Length check specific for username
                .withMessage('Username identifier must be between 3 and 30 characters.'),
        ], { message: 'Identifier must be a valid email or an alphanumeric username (3-30 characters).' }),
        isNotEmptyString('password'), // For login, a simple non-empty check is usually sufficient
    ];
};

const requestPasswordResetValidationRules = () => {
    return [
        isEmailField('email'),
    ];
};
const resetPasswordValidationRules = () => {
    return [
        isEmailField('email'),
        isStrongPassword('newPassword'),
        isLength('otp', { min: 6, max: 6 }),
    ];
};

module.exports = {
    registerValidationRules,
    loginValidationRules,
    requestPasswordResetValidationRules,
    resetPasswordValidationRules,
};
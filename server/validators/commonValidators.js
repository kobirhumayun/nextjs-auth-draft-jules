const { body, param, query } = require('express-validator');

/**
 * Validates that a field is a string, trims whitespace, and escapes HTML characters.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field ('body', 'param', 'query').
 * @returns {object} Express-validator chain.
 */
const isStringField = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isString().withMessage(`${fieldName} must be a string.`)
        .trim()
        .escape();
};

/**
 * Validates that a string field is not empty after trimming and escapes HTML characters.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isNotEmptyString = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isString().withMessage(`${fieldName} must be a string.`)
        .trim()
        .notEmpty().withMessage(`${fieldName} cannot be empty.`)
        .escape();
};

/**
 * Validates the length of a string field, trims, and escapes.
 * @param {string} fieldName - The name of the field to validate.
 * @param {object} options - Min and/or max length options (e.g., { min: 2, max: 50 }).
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isLength = (fieldName, options, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    let message = `${fieldName} must be between ${options.min} and ${options.max} characters.`;
    if (options.min === undefined && options.max !== undefined) {
        message = `${fieldName} must be at most ${options.max} characters long.`;
    } else if (options.max === undefined && options.min !== undefined) {
        message = `${fieldName} must be at least ${options.min} characters long.`;
    } else if (options.min === undefined && options.max === undefined) {
        message = `${fieldName} has an unspecified length constraint.`; // Should not happen if used correctly
    }
    return field
        .isString().withMessage(`${fieldName} must be a string.`)
        .trim()
        .isLength(options).withMessage(message)
        .escape();
};

/**
 * Validates that a field is a valid email address and normalizes it.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isEmailField = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isEmail().withMessage('Please provide a valid email address.')
        .normalizeEmail();
};

/**
 * Validates that a field meets password strength requirements.
 * Passwords are not escaped to preserve their original value for hashing.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isStrongPassword = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })
        .withMessage(
            `${fieldName} must be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one number, and one symbol.`
        );
};

/**
 * Validates that a field is a valid MongoDB ObjectId, trims, and escapes.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isMongoIdField = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isMongoId().withMessage(`${fieldName} must be a valid ID.`)
        .trim()
        .escape();
};

/**
 * Validates that a field is numeric and converts to float.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isNumericField = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isNumeric().withMessage(`${fieldName} must be a numeric value.`)
        .toFloat();
};

/**
 * Validates that a field is a float with optional min/max and converts to float.
 * @param {string} fieldName - The name of the field to validate.
 * @param {object} [options={}] - Min and/or max options (e.g., { min: 0.01 }).
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isFloatField = (fieldName, options = {}, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    let message = `${fieldName} must be a valid number.`;
    if (options.min !== undefined && options.max !== undefined) {
        message = `${fieldName} must be a number between ${options.min} and ${options.max}.`;
    } else if (options.min !== undefined) {
        message = `${fieldName} must be a number greater than or equal to ${options.min}.`;
    } else if (options.max !== undefined) {
        message = `${fieldName} must be a number less than or equal to ${options.max}.`;
    }
    return field
        .isFloat(options).withMessage(message)
        .toFloat();
};

/**
 * Validates that a field's value is one of the allowed values. Trims and escapes if it's a string.
 * @param {string} fieldName - The name of the field to validate.
 * @param {Array<string|number>} allowedValues - Array of allowed values.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isInValues = (fieldName, allowedValues, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .trim() // Applicable for string values in enum
        .isIn(allowedValues).withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}.`)
        .escape(); // Applicable for string values in enum
};

/**
 * Validates that a field is an array of strings. Each string element is trimmed and escaped.
 * @param {string} fieldName - The name of the field to validate.
 * @param {object} [options={min:0}] - Min/max number of elements (e.g. {min: 1}).
 * @param {string} [location='body'] - The location of the field ('body', 'param', 'query').
 * @returns {Array<object>} Express-validator chain array (one for array, one for elements).
 */
const isArrayOfStringsField = (fieldName, options = { min: 0 }, location = 'body') => {
    const fieldLocator = location === 'param' ? param : location === 'query' ? query : body;
    const field = fieldLocator(fieldName);
    const elementField = fieldLocator(`${fieldName}.*`); // Targets each element in the array

    return [
        field
            .isArray(options).withMessage(`${fieldName} must be an array` + (options.min && options.min > 0 ? ` with at least ${options.min} element(s).` : '.')),
        elementField // Apply to each element of the array
            .isString().withMessage(`Each element in ${fieldName} must be a string.`)
            .trim()
            .escape()
            .notEmpty().withMessage(`Each element in ${fieldName} cannot be an empty string.`) // Optional: ensure strings in array are not empty
    ];
};

/**
 * Validates that a field is alphanumeric, trims, and escapes.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isAlphanumericField = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isString().withMessage(`${fieldName} must be a string.`)
        .trim()
        .isAlphanumeric().withMessage(`${fieldName} must contain only letters and numbers.`)
        .escape();
};

/**
 * Validates that a field is a valid slug (lowercase, alphanumeric, hyphens). Trims, lowercases, and escapes.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isSlugField = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isString().withMessage(`${fieldName} must be a string.`)
        .trim()
        .toLowerCase() // Sanitize to lowercase
        .custom((value) => {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
                throw new Error(`${fieldName} must be a valid slug (e.g., 'my-plan'). It can only contain lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen, nor have consecutive hyphens.`);
            }
            return true;
        })
        .escape();
};

/**
 * Validates that a field is an object.
 * @param {string} fieldName - The name of the field to validate.
 * @param {string} [location='body'] - The location of the field.
 * @returns {object} Express-validator chain.
 */
const isObjectField = (fieldName, location = 'body') => {
    const field = location === 'param' ? param(fieldName) : location === 'query' ? query(fieldName) : body(fieldName);
    return field
        .isObject().withMessage(`${fieldName} must be an object.`);
    // Note: Deep sanitization of object properties requires specific rules for each property.
};

module.exports = {
    isStringField,
    isNotEmptyString,
    isLength,
    isEmailField,
    isStrongPassword,
    isMongoIdField,
    isNumericField,
    isFloatField,
    isInValues,
    isArrayOfStringsField,
    isAlphanumericField,
    isSlugField,
    isObjectField,
};
const { sendEmail } = require('./emailService');

/**
 * Sends a notification based on the specified method.
 * Central point for sending different types of notifications (email, SMS).
 * @param {object} options
 * @param {string} options.method - 'email' or 'sms'
 * @param {object} options.user - The user object (must have email for 'email' method)
 * @param {string} options.subject - Subject line (for email)
 * @param {string} options.text - The main text content (e.g., the OTP message)
 * @param {string} [options.html] - Optional HTML content (for email)
 */
const sendNotification = async ({ method, user, subject, text, html }) => {
    try {
        switch (method) {
            case 'email':
                if (!user.email) {
                    throw new Error('User email address is missing.');
                }
                await sendEmail({
                    to: user.email,
                    subject: subject,
                    text: text,
                    html: html, // Optional
                });
                break;

            case 'sms':
                // --- Future Implementation ---
                if (!user.phone) {
                    throw new Error('User phone number is missing.');
                }
                // Example: await sendSms(user.phone, text);
                throw new Error('SMS sending not yet implemented.'); // Remove when implemented
                break;

            default:
                throw new Error('Unsupported notification method.');
        }
        return true; // Indicate success
    } catch (error) {
        console.error(`Failed to send notification via ${method}:`, error);
        // Depending on requirements, you might want to retry or log persistently
        return false; // Indicate failure
    }
};

module.exports = {
    sendNotification,
};
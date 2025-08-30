const nodemailer = require('nodemailer');
/**
 * Sends an email. To be replace with actual email sending implementation.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - Optional HTML body
 */
const sendEmail = async ({ to, subject, text, html }) => {
    // console.log("--- Sending Email ---");
    // console.log(`To: ${to}`);
    // console.log(`Subject: ${subject}`);
    // console.log(`Text: ${text}`);
    // if (html) {
    //     console.log(`HTML: ${html}`);
    // }
    // Create a transporter object
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your email address
            pass: process.env.EMAIL_PASS, // Your email password or app-specific password
        },
        // For development/testing with self-signed certificates on a local SMTP server
        // tls: {
        //   rejectUnauthorized: false
        // }
    });
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text, html });

    return true;
};

module.exports = {
    sendEmail,
};
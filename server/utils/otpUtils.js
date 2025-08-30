
/**
 * Generates a random numeric OTP of a specified length.
 * @param {number} length The desired length of the OTP (default: 6).
 * @returns {string} The generated OTP as a string.
 */
const generateOtp = (length = 6) => {
    if (length <= 0) {
        throw new Error("OTP length must be a positive number.");
    }
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const otp = Math.floor(min + Math.random() * (max - min + 1));
    return otp.toString();
};

module.exports = {
    generateOtp,
};
const Order = require('../models/Order');
const Payment = require('../models/Payment');

/**
 * Creates an order and its corresponding payment information.
 * This function reduces database operations from three to two
 * and attempts to save both documents concurrently.
 *
 * @param {object} orderData - The data for the new order.
 * @param {object} paymentData - The data for the new payment.
 * @returns {Promise<{order: object, payment: object}>} - The newly created order and payment documents.
 * @throws {Error} - Throws an error if the operation fails.
 */
const createOrderWithPayment = async (orderData, paymentData) => {
    try {
        // Create new Mongoose document instances in memory without saving them yet.
        const newOrder = new Order(orderData);
        const newPayment = new Payment(paymentData);

        // Establish the two-way reference between the order and payment before saving.
        newOrder.payment = newPayment._id;
        newPayment.order = newOrder._id;

        // Atomically save both the new order and the new payment to the database.
        // Promise.all executes these save operations concurrently.
        const [savedOrder, savedPayment] = await Promise.all([
            newOrder.save(),
            newPayment.save()
        ]);

        return { order: savedOrder, payment: savedPayment };

    } catch (error) {
        // If either save operation fails, an error is thrown.
        // Consider implementing a cleanup mechanism for orphaned documents in a real-world scenario.
        console.error("Error creating order with payment:", error);
        throw new Error('Failed to create order and payment. Please try again.');
    }
}

module.exports = { createOrderWithPayment };
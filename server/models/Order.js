const mongoose = require('mongoose');
const Counter = require('./Counter');

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
            required: true,
        },
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
            required: true,
        },
        orderID: {
            type: String,
            unique: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'cancelled', 'expired'],
            default: 'inactive',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Amount cannot be negative'],
        },
        currency: {
            type: String,
            required: true,
            default: 'BDT',
        },
        startDate: {
            type: Date,
        },
        endDate: {
            type: Date,
        },
        renewalDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);

// ### Middleware for Sequential Order ID

orderSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'orderID' },
                { $inc: { sequence_value: 1 } },
                { new: true, upsert: true }
            );
            this.orderID = counter.sequence_value.toString().padStart(6, '0');
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// ### Instance Methods

/**
 * Checks if the subscription is currently active.
 * @returns {boolean} - True if the subscription is active, false otherwise.
 */
orderSchema.methods.isSubscriptionActive = function () {
    const now = new Date();
    return this.status === 'active' && this.endDate > now;
};

// ### Static Methods

/**
 * Finds all orders for a specific user.
 * @param {mongoose.Schema.Types.ObjectId} userID - The ID of the user.
 * @returns {Promise<IOrder[]>} - A promise that resolves to an array of orders.
 */
orderSchema.statics.findOrdersByUser = function (userID) {
    return this.find({ user: userID }).populate('plan').populate('payment');
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
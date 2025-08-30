const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Represents a single financial transaction record.
 */
const paymentSchema = new Schema({
    /**
     * Reference to the User who initiated or is associated with the payment.
     */
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Links to the User model
        required: [true, 'User ID is required for a payment record.'],
        index: true // Essential for quickly finding a user's payment history
    },
    /**
     * Reference to the Plan being paid for, if applicable (e.g., for subscriptions).
     * Can be null for other types of payments (e.g., one-time purchases).
     */
    planId: {
        type: Schema.Types.ObjectId,
        ref: 'Plan', // Links to the Plan model
        index: true // Useful for analyzing payments per plan
    },
    order: {
        // Not required, as it will be added after the order is created
        type: Schema.Types.ObjectId,
        ref: 'Order',
        index: true,
    },
    /**
     * The monetary amount of the transaction. Using Decimal128 for precision.
     */
    amount: {
        type: Schema.Types.Decimal128,
        required: [true, 'Payment amount is required.'],
        get: v => v ? parseFloat(v.toString()) : 0.00 // Optional getter to convert Decimal128 to float when accessed
    },
    /**
     * The currency code (ISO 4217) for the amount (e.g., 'USD', 'EUR', 'BDT').
     */
    currency: {
        type: String,
        required: [true, 'Currency code is required.'],
        uppercase: true,
        trim: true,
        maxlength: 3
    },
    /**
     * The current status of the payment transaction.
     */
    status: {
        type: String,
        required: [true, 'Payment status is required.'],
        enum: [
            'pending',          // Initial status, awaiting confirmation
            'succeeded',        // Payment completed successfully
            'failed',           // Payment failed
            'refunded',         // Payment fully refunded
            'partially_refunded',// Payment partially refunded
            'requires_action',  // Needs additional user action (e.g., 3D Secure)
            'canceled'          // Payment was explicitly canceled before completion
        ],
        default: 'pending',
        index: true // Useful for querying payments by status (e.g., finding failed payments)
    },
    /**
     * Identifies the payment processor used (e.g., stripe, paypal, bkash, sslcommerz, manual).
     */
    paymentGateway: {
        type: String,
        required: [true, 'Payment gateway identifier is required.'],
        lowercase: true,
        trim: true,
        index: true
    },
    // add Schema in future when implement gateway
    gatewaySessionId: {
        type: Schema.Types.ObjectId,
        ref: 'GatewaySession', // Links to the GatewaySession model
        index: true
    },
    /**
     * The unique transaction identifier provided by the payment gateway.
     * Crucial for reconciliation and looking up transactions in the gateway's system.
     */
    gatewayTransactionId: {
        type: String,
        unique: true, // Ensures no duplicate records for the same gateway transaction
        index: true // Essential for webhook processing and lookups
    },
    /**
     * The reason or context for this payment.
     */
    purpose: {
        type: String,
        required: [true, 'Payment purpose is required.'],
        enum: [
            'subscription_initial', // First payment for a new subscription
            'subscription_renewal', // Recurring payment for an existing subscription
            'plan_upgrade',         // Payment for changing to a higher-tier plan (could be prorated)
            'plan_downgrade',       // Usually no payment, but record might be needed if credit issued
            'one_time_purchase',    // For non-recurring items (e.g., credits, specific feature access)
            'service_fee',          // Specific charges like setup fees, consultation fees
            'manual_payment',       // Payment recorded manually by an admin
            'refund',               // Represents a refund transaction itself (amount might be negative or use refundedAmount)
            'top_up'                // Adding funds to an account balance/wallet
        ],
        index: true // Allows querying payments by their purpose
    },
    /**
     * Optional field to store details about the payment method used, provided by the gateway.
     * Store only non-sensitive information (e.g., card brand, last 4 digits, masked email).
     */
    paymentMethodDetails: {
        type: Schema.Types.Mixed // Flexible object for various details
    },
    /**
     * Optional field to store the full or partial response from the payment gateway,
     * useful for debugging and detailed auditing. Can be large.
     */
    gatewayResponse: {
        type: Schema.Types.Mixed,
        select: false // Exclude potentially large field from default queries
    },
    /**
     * Link to an invoice document, if your system generates invoices.
     */
    invoiceId: {
        type: String, // Or Schema.Types.ObjectId if referencing an Invoice collection
        index: true
    },
    /**
     * The amount that has been refunded for this transaction (if status is 'refunded' or 'partially_refunded').
     */
    refundedAmount: {
        type: Schema.Types.Decimal128,
        default: 0.00,
        get: v => v ? parseFloat(v.toString()) : 0.00 // Optional getter
    },
    /**
     * Timestamp indicating when the payment was successfully processed or reached its final state.
     * Might differ from `createdAt` (when the record was created) or `updatedAt`.
     */
    processedAt: {
        type: Date
    }
}, {
    // Automatically add `createdAt` and `updatedAt` timestamps
    timestamps: true,
    // Enable the getter for amount/refundedAmount if you want JS Numbers instead of Decimal128 objects by default
    // toJSON: { getters: true },
    // toObject: { getters: true }
});

// Optional: Compound index if needed, e.g., to quickly find a user's payments via a specific gateway
// paymentSchema.index({ userId: 1, paymentGateway: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

/**
 * Notes on Payment Schema:
 * - `userId`: Links payment to the user account.
 * - `planId`: Links payment to a specific subscription plan (optional).
 * - `amount`/`refundedAmount`: Uses Decimal128 for financial precision. Consider storing amounts in cents (integer) as an alternative if Decimal128 proves complex for your stack.
 * - `status`: Tracks the lifecycle of the payment. Critical for business logic.
 * - `paymentGateway` & `gatewayTransactionId`: Essential for identifying the transaction externally. `gatewayTransactionId` MUST be unique.
 * - `purpose`: Provides context for the payment, useful for reporting and logic.
 * - `paymentMethodDetails`: Store limited, non-sensitive info (e.g., card last4, brand). NEVER store full card numbers, CVV, etc.
 * - `gatewayResponse`: Useful for debugging but excluded by default (`select: false`).
 * - `timestamps`: Automatically manages `createdAt` and `updatedAt`.
 * - Indexes: Added on key fields frequently used for querying. Ensure these match your application's query patterns.
 */
const mongoose = require('mongoose');
const Counter = require('./Counter');
const Schema = mongoose.Schema;


/**
 * @description Mongoose Schema for an Invoice.
 */
const invoiceSchema = new Schema({
    invoiceNumber: {
        type: String,
        unique: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    payment: {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    plan: {
        type: Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true,
        default: 'USD'
    },
    subscriptionStartDate: {
        type: Date,
        required: true
    },
    subscriptionEndDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['paid', 'unpaid', 'cancelled'],
        default: 'paid'
    },
    issuedDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date
    }
}, {
    timestamps: true // Adds createdAt and updatedAt timestamps
});

/**
 * @description Mongoose pre-save middleware for the Invoice schema.
 * This function generates a sequential invoice number before saving a new invoice.
 * The invoice number format is INV-YYYY-XXXXX where YYYY is the current year
 * and XXXXX is a zero-padded sequential number that resets each year.
 */
invoiceSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const doc = this;
            const currentYear = new Date().getFullYear().toString();

            // Find the counter for the current year and increment it.
            // If it doesn't exist, create a new one.
            const counter = await Counter.findByIdAndUpdate(
                { _id: `${currentYear}-invoice-counter` },
                { $inc: { sequence_value: 1 } },
                { new: true, upsert: true }
            );

            // Pad the sequence number with leading zeros to make it 5 digits
            const sequenceNumber = counter.sequence_value.toString().padStart(5, '0');

            // Construct the invoice number
            doc.invoiceNumber = `INV-${currentYear}-${sequenceNumber}`;
            next();

        } catch (error) {
            return next(error);
        }
    } else {
        next();
    }
});


/**
 * @description Static method to find an invoice by its number.
 * @param {string} invoiceNumber - The invoice number to search for.
 * @returns {Promise<Document>} - A promise that resolves to the invoice document if found.
 */
invoiceSchema.statics.findByInvoiceNumber = function (invoiceNumber) {
    return this.findOne({ invoiceNumber: invoiceNumber });
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// const { Decimal128 } = mongoose.Schema.Types; // Uncomment if using Decimal128 for amount

/**
 * @description Represents a single cash inflow or outflow transaction for a project.
 */
const transactionSchema = new Schema({
    project_id: {
        type: Schema.Types.ObjectId,
        ref: 'Project', // Establishes a reference to the Project model
        required: [true, 'Project ID is required.'],
        index: true // Index for querying transactions by project
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Establishes a reference to the User model (denormalized)
        required: [true, 'User ID is required.'],
        index: true // Index for querying transactions directly by user
    },
    type: {
        type: String,
        required: [true, 'Transaction type is required.'],
        enum: { // Restrict values to 'cash_in' or 'cash_out'
            values: ['cash_in', 'cash_out'],
            message: '{VALUE} is not a supported transaction type.'
        },
        index: true // Index for filtering by type
    },
    amount: {
        // Using Number for simplicity. Consider using Decimal128 for high-precision finance.
        type: Number,
        // type: Decimal128, // Recommended for precise financial calculations
        required: [true, 'Amount is required.'],
        validate: {
            validator: function (v) {
                // Ensure amount is positive. Type ('cash_in'/'cash_out') indicates direction.
                return v > 0;
            },
            message: props => `${props.value} is not a valid amount! Amount must be positive.`
        }
    },
    subcategory: {
        type: String,
        required: [true, 'Subcategory is required.'],
        trim: true,
        index: true // Index for querying/grouping by subcategory
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    transaction_date: {
        type: Date,
        required: [true, 'Transaction date is required.'],
        index: true // Index for date-range queries
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
});

// --- Compound Indexes for Transactions (based on query requirements) ---

// 1. Efficiently query transactions within a project, ordered by date (most recent first)
transactionSchema.index({ project_id: 1, transaction_date: -1 });

// 2. Efficiently query transactions by project and type (for totals)
transactionSchema.index({ project_id: 1, type: 1 });

// 3. Efficiently query transactions by project, subcategory, and date (for grouped reports)
transactionSchema.index({ project_id: 1, subcategory: 1, transaction_date: -1 });

// 4. Efficiently query transactions by user across projects, ordered by date
transactionSchema.index({ user_id: 1, transaction_date: -1 });


const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
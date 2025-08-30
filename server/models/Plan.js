const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const planSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Plan name is required.'],
        unique: true,
        trim: true,
        index: true // Index for faster lookups by name
    },
    slug: {
        type: String,
        required: [true, 'Plan slug is required.'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true // Index for faster lookups by slug
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number, // Use Number for simplicity; consider Decimal128 for high-precision finance
        required: [true, 'Price is required.'],
        default: 0.00
    },
    billingCycle: {
        type: String,
        required: [true, 'Billing cycle is required.'],
        enum: ['monthly', 'annually', 'lifetime', 'free'], // Allowed values
        default: 'free'
    },
    currency: {
        type: String,
        required: true,
        default: 'BDT',
        uppercase: true,
        trim: true
    },
    features: {
        type: [String], // Array of feature descriptions
        default: []
    },
    limits: {
        type: Schema.Types.Mixed, // Flexible object for limits, e.g., { projects: 5, storageGB: 10 }
        default: {}
    },
    stripePriceId: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple null/undefined values but unique when set
        trim: true,
        index: true // Index if frequently looking up plans by Stripe ID
    },
    isPublic: {
        type: Boolean,
        default: true,
        index: true // Index if querying frequently for public plans
    },
    displayOrder: {
        type: Number,
        default: 0 // For sorting plans on a pricing page
    }
}, {
    // Automatically add createdAt and updatedAt fields
    timestamps: true
});

// Ensure compound uniqueness or specific index types if needed,
// but individual indexes are defined above.

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;

/**
 * Notes on Plan Schema:
 * - `name` and `slug` are unique identifiers.
 * - `price`: Using Number. For critical financial calculations, research and potentially use mongoose-currency or Schema.Types.Decimal128, though Number is often sufficient.
 * - `billingCycle`: Enum restricts values to predefined options.
 * - `limits`: Schema.Types.Mixed offers flexibility. Define a nested schema if limits have a consistent structure.
 * - `stripePriceId`: Indexed and sparsely unique, useful for payment gateway integration.
 * - `timestamps: true`: Adds `createdAt` and `updatedAt` managed by Mongoose.
 */
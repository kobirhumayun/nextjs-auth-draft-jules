const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @description Represents a financial project belonging to a user.
 */
const projectSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Establishes a reference to the User model
        required: [true, 'User ID is required.'],
        index: true // Index for querying projects by user
    },
    name: {
        type: String,
        required: [true, 'Project name is required.'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    currency: {
        type: String,
        required: [true, 'Currency code is required.'],
        uppercase: true,
        trim: true,
        default: 'BDT' // Default currency
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
});

// Optional: Add a compound index if project names must be unique per user.
// This is often better handled at the application layer to provide clearer user feedback,
// but can be enforced at the database level if needed.
// projectSchema.index({ user_id: 1, name: 1 }, { unique: true });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
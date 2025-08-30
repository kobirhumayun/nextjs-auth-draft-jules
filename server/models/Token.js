const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const tokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // Reference to the User model
    },
    token: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['passwordReset', 'emailVerification', 'subscriptionToken'], // Add other types as needed
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// --- Best Practice: TTL Index ---
// MongoDB will automatically delete documents where the 'expiresAt' field
// value is older than the current time.
// 'expireAfterSeconds: 0' means delete immediately when 'expiresAt' is reached.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// --- Best Practice: Hash the token before saving ---
// Although OTPs are short-lived, hashing adds a layer of security
// in case the database is compromised.
tokenSchema.pre('save', async function (next) {
    // Only hash the token if it has been modified (or is new)
    if (!this.isModified('token')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.token = await bcrypt.hash(this.token, salt);
        next();
    } catch (error) {
        next(error); // Pass error to Mongoose/Express error handler
    }
});

// --- Instance method to compare submitted token with hashed token ---
tokenSchema.methods.compareToken = async function (candidateToken) {
    return bcrypt.compare(candidateToken, this.token);
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
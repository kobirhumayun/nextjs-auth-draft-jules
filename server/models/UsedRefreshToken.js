const mongoose = require('mongoose');

const usedRefreshTokenSchema = new mongoose.Schema({
    // The token string itself, indexed for fast lookups.
    token: {
        type: String,
        required: true,
        index: true,
    },
    // The user this token belonged to.
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    accessToken: {
        type: String,
        required: true,
    },
    // This is the core of the TTL strategy. MongoDB will automatically delete
    // this document 30 seconds after its creation time.
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '10s', // Grace period of 10 seconds. Adjust as needed.
    },
});

const UsedRefreshToken = mongoose.model('UsedRefreshToken', usedRefreshTokenSchema);

module.exports = UsedRefreshToken;
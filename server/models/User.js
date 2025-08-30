const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Environment variables for token secrets and expiry (ensure these are set in your .env)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * @description Represents a user account in the system.
 */
const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Username is required.'],
        unique: true,
        trim: true,
        index: true // Index for faster username lookups
    },
    email: {
        type: String,
        required: [true, 'Email is required.'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address.'], // Basic email validation
        index: true // Index for faster email lookups
    },
    password_hash: {
        type: String,
        required: [true, 'Password hash is required.'],
        select: false // Exclude password hash from query results by default
    },
    refreshToken: {
        type: String,
        select: false // Exclude refresh token from query results by default
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    profilePictureUrl: {
        type: String,
        trim: true
    },
    planId: {
        type: Schema.Types.ObjectId,
        ref: 'Plan', // Reference to the Plan model
        index: true // Index for queries filtering/populating by plan
        // Consider making this required depending on your logic (e.g., assign a default 'free' plan on signup)
        // required: [true, 'User must have a plan assigned.']
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'trialing', 'canceled', 'past_due', 'pending', 'free'], // Added 'free', 'pending'
        default: 'pending', // Default status until activation/payment
        index: true
    },
    subscriptionStartDate: {
        type: Date
    },
    subscriptionEndDate: { // End of current billing cycle or trial
        type: Date,
        index: true
    },
    trialEndsAt: {
        type: Date,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'editor', 'support'], // Define role
        default: 'user',
        index: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    authProvider: {
        type: String,
        enum: ['local', 'google', 'facebook', 'github'], // Add providers as needed
        default: 'local',
        index: true
    },
    providerId: { // User ID from the external provider (e.g., Google ID)
        type: String,
        index: true,
        sparse: true // Allows multiple nulls, unique when set (compound index with authProvider might be better)
    },
    isActive: { // For soft deletion or suspension
        type: Boolean,
        default: true,
        index: true
    },
    lastLoginAt: {
        type: Date
    },
    preferences: { // User-specific settings
        type: Schema.Types.Mixed,
        default: {}
    },
    metadata: { // Flexible field for extra data
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
});

// Mongoose Pre-Save Hook for Password Hashing
userSchema.pre('save', async function (next) {
    if (this.isModified('password_hash')) {
        try {
            const saltRounds = 10;
            this.password_hash = await bcrypt.hash(this.password_hash, saltRounds);
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

/**
 * @description Compares a plain password with the user's stored hashed password.
 * @param {string} passwordAttempt - The plain password to verify.
 * @returns {Promise<boolean>} - True if passwords match, false otherwise.
 */
userSchema.methods.isPasswordCorrect = async function (passwordAttempt) {
    if (!passwordAttempt || !this.password_hash) {
        // this.password_hash might be undefined if not selected in the query
        return false;
    }
    return await bcrypt.compare(passwordAttempt, this.password_hash);
};

/**
 * @description Generates a JWT Access Token for the user.
 * @returns {string} - The generated access token.
 * @throws {Error} - If ACCESS_TOKEN_SECRET is not defined.
 */
userSchema.methods.generateAccessToken = function () {
    if (!ACCESS_TOKEN_SECRET) {
        throw new Error('ACCESS_TOKEN_SECRET is not defined in environment variables.');
    }
    // Assumes planId is populated if its properties like 'slug' are accessed.
    // Original controller logic ensures 'planId' is populated before token generation.
    let planSlug = "free"; // Default plan slug
    if (this.planId && typeof this.planId === 'object' && this.planId.slug) {
        planSlug = this.planId.slug;
    } else if (this.planId && this.subscriptionStatus === 'free') { // Fallback if planId not populated but status is free
        planSlug = 'free';
    }
    return jwt.sign(
        {
            _id: this._id,
            role: this.role,
            plan: planSlug
        },
        ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

/**
 * @description Generates a JWT Refresh Token for the user.
 * @returns {string} - The generated refresh token.
 * @throws {Error} - If REFRESH_TOKEN_SECRET is not defined.
 */
userSchema.methods.generateRefreshToken = function () {
    if (!REFRESH_TOKEN_SECRET) {
        throw new Error('REFRESH_TOKEN_SECRET is not defined in environment variables.');
    }
    return jwt.sign(
        { _id: this._id },
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

/**
 * @description Checks and updates user's subscription status if expired.
 * Modifies the user instance directly.
 * @returns {Promise<boolean>} - True if the subscription status was updated.
 */
userSchema.methods.checkAndUpdateExpiredStatus = async function () {
    const now = new Date();
    let updated = false;
    if ((this.subscriptionStatus === 'active' && this.subscriptionEndDate && this.subscriptionEndDate <= now) ||
        (this.subscriptionStatus === 'trialing' && this.trialEndsAt && this.trialEndsAt <= now)) {
        const defaultExpiredStatus = 'canceled';
        const revertToFree = true;
        let updateData = { subscriptionStatus: defaultExpiredStatus };

        if (revertToFree) {
            const Plan = mongoose.model('Plan'); // Access Plan model dynamically
            const freePlan = await Plan.findOne({ slug: 'free' }).select('_id'); //
            if (freePlan) {
                updateData = {
                    planId: freePlan._id,
                    subscriptionStatus: 'free',
                    subscriptionStartDate: now,
                    subscriptionEndDate: null,
                    trialEndsAt: null,
                };
            } else {
                // console.warn(`User Model: Default "free" plan not found for user ${this.email}.`);
            }
        }
        Object.assign(this, updateData); // Update the user document instance
        updated = true;
    }
    return updated;
};

/**
 * @description Generates Access and Refresh Tokens, updates subscription status,
 * and saves the user's refresh token.
 * @returns {Promise<{accessToken: string, refreshToken: string}>} - The generated tokens.
 * @throws {Error} - If token generation or DB update fails.
 */
userSchema.methods.generateAccessAndRefereshTokens = async function () {
    try {
        // Ensure planId is populated if it's an ObjectId and its properties are needed.
        // Controllers (login, refresh) already populate planId. This is a safeguard.
        if (this.planId && !(this.planId instanceof mongoose.Model) && mongoose.Types.ObjectId.isValid(this.planId)) {
            await this.populate('planId');
        }

        await this.checkAndUpdateExpiredStatus(); // Check and update status on the instance

        const accessToken = this.generateAccessToken();
        const refreshToken = this.generateRefreshToken();

        this.refreshToken = refreshToken;
        // The pre-save hook handles password hashing
        await this.save();

        return { accessToken, refreshToken };
    } catch (error) {
        // console.error("Error in userSchema.methods.generateAccessAndRefereshTokens:", error.message);
        throw new Error(`Failed to generate tokens or update user: ${error.message}`);
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
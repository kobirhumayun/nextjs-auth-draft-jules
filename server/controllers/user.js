const User = require('../models/User');
const UsedRefreshToken = require('../models/UsedRefreshToken');
const jwt = require('jsonwebtoken');
const { isValidObjectId } = require('mongoose');

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict', // Mitigate CSRF attacks
};

/**
 * @description Registers a new user.
 * @route POST /api/users/register
 * @access Public
 */
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide username, email, and password.' });
        } //

        const existingUser = await User.findOne({ $or: [{ username }, { email }] }); //
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists.' });
        }

        // Create new user instance.
        const newUser = new User({
            username,
            email,
            password_hash: password // Assign plain password
        });

        await newUser.save(); // Pre-save hook will hash password

        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        // console.error('Error registering user:', error);
        if (error.code === 11000) { // Handle duplicate key error from MongoDB
            return res.status(400).json({ message: 'Username or email already exists.' });
        }
        res.status(500).json({ message: 'Error registering user.', error: error.message });
    }
};

/**
 * @description Logs in a user.
 * @route POST /api/users/login
 * @access Public
 */
const loginUser = async (req, res) => {
    try {
        const { identifier, password } = req.body; //

        if (!identifier || !password) {
            return res.status(400).json({ message: 'Please provide username/email and password.' });
        } //

        // Find user by username or email
        // Select '+password_hash' as it's excluded by default but needed for isPasswordCorrect method.
        // Populate 'planId' as it's used by model methods for token generation/subscription checks.
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }]
        }).select('+password_hash +refreshToken').populate('planId'); //

        if (!user) {
            return res.status(404).json({ message: 'Invalid credentials.' }); //
        }

        // Verify password using the instance method from User model
        const isMatch = await user.isPasswordCorrect(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' }); //
        }

        // Passwords match, generate tokens using the instance method
        // This model method also handles subscription checks and saving the refresh token.
        const { accessToken, refreshToken } = await user.generateAccessAndRefereshTokens();

        res.status(200).json({
            message: 'Login successful.',
            accessToken,
            refreshToken,
            user: { // Send back non-sensitive user info
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                plan: user.planId && typeof user.planId === 'object' ? user.planId.slug : (user.subscriptionStatus === 'free' ? 'free' : null),
                subscriptionStatus: user.subscriptionStatus
            }
        });

    } catch (error) {
        // console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Error logging in user.', error: error.message });
    }
};

/**
 * @description Logs out a user by clearing the refresh token.
 * @route POST /api/users/logout
 * @access Private (Requires authentication)
 */
const logoutUser = async (req, res) => {
    const userId = req.user?._id; // From auth middleware
    const incomingRefreshToken = req.body?.refreshToken; //

    try {
        // Unset the refresh token in the database
        if (userId) { // If user authenticated
            await User.updateOne({ _id: userId }, { $unset: { refreshToken: "" } }); // logic using $unset
        } else if (incomingRefreshToken) { // Fallback, less secure, if user not identified by middleware but token exists
            await User.updateOne({ refreshToken: incomingRefreshToken }, { $unset: { refreshToken: "" } });
        }

        res.status(200).json({ message: 'User logged out successfully.' }); //

    } catch (error) {
        // console.error('Error logging out user:', error);
        res.status(500).json({ message: 'Error logging out user.', error: error.message });
    }
};

/**
 * @description Refreshes the access token using a valid refresh token.
 * @route POST /api/users/refresh-token
 * @access Public (but requires a valid refresh token cookie)
 */

const refreshAccessToken = async (req, res) => {
    const incomingRefreshToken = req.body?.refreshToken;

    if (!incomingRefreshToken) {
        return res.status(401).json({ message: 'Unauthorized: No refresh token provided.' });
    }

    try {
        // 1. Verify the JWT signature and decode the payload
        const decoded = jwt.verify(incomingRefreshToken, REFRESH_TOKEN_SECRET);

        // 2. Find the user associated with the token
        const user = await User.findById(decoded._id)
            .select('+refreshToken') // Explicitly request the refreshToken
            .populate('planId'); // Populate necessary fields

        if (!user) {
            console.log('User not found:', incomingRefreshToken);
            return res.status(403).json({ message: 'Forbidden: User not found.' });
        }

        // 3. --- The Core Logic for Handling Race Conditions ---

        // HAPPY PATH: The token matches the current one in the DB.
        if (user.refreshToken === incomingRefreshToken) {
            // Generate new tokens
            const { accessToken, refreshToken: newRefreshToken } = await user.generateAccessAndRefereshTokens();

            // Add the just-used token to the grace period list
            await UsedRefreshToken.create({
                token: incomingRefreshToken,
                userId: user._id,
                accessToken
            });

            // Note: The `generateAccessAndRefereshTokens` method should handle saving the newRefreshToken to the user document.
            console.log('Token sussesfully refreshed:', incomingRefreshToken);

            return res.status(200).json({
                message: 'Access token refreshed.',
                accessToken,
                refreshToken: newRefreshToken,
            });
        }

        // GRACE PERIOD PATH: The token doesn't match the current one,
        // so check if it's a recently used token.
        const isInGraceList = await UsedRefreshToken.findOne({ token: incomingRefreshToken });

        if (isInGraceList) {
            console.log('Token sussesfully refreshed: (grace period)', incomingRefreshToken);
            // It's a concurrent request. The token is valid for this short window.
            // We issue a new access token but return the *already rotated* refresh token
            // that is now stored on the user object to keep all clients in sync.
            const accessToken = isInGraceList.accessToken;
            return res.status(200).json({
                message: 'Access token refreshed (grace period).',
                accessToken,
                refreshToken: user.refreshToken, // Send the newest token
            });
        }

        // FAILURE PATH: The token is not the current one and not in the grace list.
        // It's an old, invalid, or compromised token.
        console.log('Token invalid:', incomingRefreshToken);
        return res.status(403).json({ message: 'Forbidden: Invalid refresh token.' });

    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(403).json({ message: 'Forbidden: Refresh token expired.' });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Forbidden: Malformed refresh token.' });
        }
        console.error('Error refreshing access token:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * @desc   Get user profile based on identifier
 * @route  GET /api/user-profile?identifier=your_username_or_email
 * @access Private (Adjust access control as needed, e.g., Admin only)
 * @query  identifier=your_username_or_email
 */
const getUserProfile = async (req, res) => {
    try {

        const { identifier } = req.query;

        if (!identifier) {
            return res.status(400).json({ message: 'Please provide a username or email in the query parameters (e.g., /user-profile?identifier=your_username_or_email).' });
        }

        // Find user by username or email
        // Ensure you have database indexes on 'username' and 'email' fields for performance.
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }]
        }).populate('planId');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            message: 'User profile fetched successfully.',
            user
        });

    } catch (error) {
        // Log the error for debugging purposes on the server
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching user profile.', error: error.message });
    }
}

/**
 * @desc   Update user profile based on identifier
 * @route  PATCH /api/auth/user-profile/_id
 * @access Private (Adjust access control as needed, e.g., Admin only)
 */

const updateUserProfileByAdmin = async (req, res) => {
    const { userId } = req.params;
    const updateData = req.body;

    // 1. Validate userId
    if (!isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // 2. Basic Validation for updateData
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No update data provided.' });
    }

    // 3. Define allowed fields for an admin to update
    //    (Prevents unwanted fields like '_id' or 'password' from being directly updated here)
    const allowedUpdates = ['username', 'email', 'firstName', 'lastName', 'profilePictureUrl', 'planId', 'subscriptionStatus', 'subscriptionStartDate', 'subscriptionEndDate', 'trialEndsAt', 'role', 'isActive' /*, other fields as needed */];
    const requestedUpdates = Object.keys(updateData);

    const isValidOperation = requestedUpdates.every(field => allowedUpdates.includes(field));

    if (!isValidOperation) {
        return res.status(400).json({ message: 'Invalid update fields provided.' });
    }

    try {
        // 4. Check for uniqueness if username or email is being updated
        if (updateData.username) {
            const existingUserByUsername = await User.findOne({ username: updateData.username, _id: { $ne: userId } });
            if (existingUserByUsername) {
                return res.status(409).json({ message: 'Username is already taken by another user.' });
            }
        }
        if (updateData.email) {
            const existingUserByEmail = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
            if (existingUserByEmail) {
                return res.status(409).json({ message: 'Email is already registered to another user.' });
            }
        }

        // 5. Find the user and update their profile
        //    - { new: true } returns the modified document rather than the original.
        //    - { runValidators: true } ensures that schema validations are applied during the update.
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData }, // Use $set to only update provided fields
            { new: true, runValidators: true, context: 'query' }
        ).select('-password'); // Exclude password from the returned user object

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            message: 'User profile updated successfully by admin.',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error updating user profile by admin:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation error.', errors: error.errors });
        }
        // Handle other potential errors (e.g., duplicate key error if not caught above specifically)
        if (error.code === 11000) { // MongoDB duplicate key error
            return res.status(409).json({ message: 'A field (e.g., username or email) is already taken.', field: error.keyValue });
        }
        res.status(500).json({ message: 'Error updating user profile.', error: error.message });
    }
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUserProfile,
    updateUserProfileByAdmin,
};
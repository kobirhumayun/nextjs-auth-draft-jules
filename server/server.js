const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/authRoutes');
const planRoutes = require('./routes/plan');
const { initializeEnforcer } = require('./services/casbin');
const { scheduleSubscriptionExpiryCheck } = require('./jobs/subscriptionJobs');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/errorHandler');
const morgan = require('morgan');

dotenv.config();
const port = process.env.PORT || 5000;

const app = express();
// Secure HTTP headers
app.use(helmet());

// Middleware
app.use(
    cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "DELETE", "PUT"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "Cache-Control",
            "Expires",
            "Pragma",
        ],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// Use morgan middleware with the 'dev' format
// 'dev' provides concise, color-coded output for development
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
    res.send('Backend is running!');
});
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);


// Handle 404 Not Found for any routes not matched above
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware (MUST BE LAST)
app.use(globalErrorHandler);

// --- Start Server Function ---
const startServer = async () => {
    try {
        // 1. Connect to Database (and wait for it)
        await connectDB();
        initializeEnforcer();
        scheduleSubscriptionExpiryCheck();

        // 2. Start Listening for Requests
        const server = app.listen(port, () => {
            console.log(`Server is running on port: ${port}`);
        });

    } catch (error) {
        // Catch errors during initial startup (e.g., DB connection failure handled in connectDB)
        console.error('Failed to start server:', error);
        process.exit(1); // Exit if server cannot start
    }
};

// --- Initialize Server ---
startServer();
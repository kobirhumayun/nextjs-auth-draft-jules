const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error('Error: MONGO_URI is not defined in the environment variables.');
    process.exit(1);
}

// Keep track of the connection state to avoid multiple connection attempts
let connectionPromise = null;

/**
 * Establishes and manages the MongoDB connection using Mongoose.
 * Implements a singleton pattern to ensure only one connection is attempted/established.
 * Includes enhanced error handling and reconnection logging.
 */
const connectDB = async () => {
    // If a connection attempt is already in progress or established, return it
    if (connectionPromise) {
        return connectionPromise;
    }

    // Start a new connection attempt
    connectionPromise = (async () => {
        console.log('Attempting to connect to MongoDB...');

        try {
            // Mongoose 6+ uses these defaults, but explicitly setting some options can be useful.
            // Consider adding options like `serverSelectionTimeoutMS`, `socketTimeoutMS`, etc., if needed.
            const conn = await mongoose.connect(mongoUri, {
                // Mongoose 6 defaults are generally good.
                // autoIndex: true, // Consider 'false' in production for performance, manage indexes manually.
                // bufferCommands: true, // Default, useful but can hide connection issues.
            });

            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return conn;

        } catch (error) {
            console.error(`Initial MongoDB Connection Error: ${error.message}`);
            // Reset the promise on failure to allow for retry attempts if desired
            connectionPromise = null;
            // Exit or implement a retry mechanism. Exiting is simpler but less resilient.
            process.exit(1);
        }
    })();

    return connectionPromise;
};

// --- Connection Event Listeners ---

// Fired when the connection is established
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB.');
});

// Fired if an error occurs after the initial connection
mongoose.connection.on('error', (err) => {
    console.error(`Mongoose connection error: ${err.message}`);
    // Consider logging or alerting systems here. Mongoose will attempt to reconnect.
});

// Fired when the connection is lost
mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected. Attempting to reconnect...');
    // Mongoose handles basic reconnection. You might add custom logic or alerts here.
});

// Fired when Mongoose re-establishes a connection
mongoose.connection.on('reconnected', () => {
    console.log('Mongoose reconnected to DB.');
});

// --- Graceful Shutdown ---

/**
 * Closes the Mongoose connection gracefully.
 */
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Closing MongoDB connection...`);
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
};

// Listen for termination signals (e.g., from Ctrl+C or deployment tools)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = connectDB;
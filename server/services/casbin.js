// services/casbin.js
const { newEnforcer, FileAdapter } = require('casbin');
const path = require('path');

const modelPath = path.resolve(__dirname, '../config/model.conf');
const policyPath = path.resolve(__dirname, '../config/policy.csv');
// --- End Configuration ---


let enforcerInstance = null;

/**
 * Initializes and returns a singleton Casbin enforcer instance.
 * Uses FileAdapter for policies initially.
 * @returns {Promise<Enforcer>} The initialized Casbin enforcer.
 */
async function initializeEnforcer() {
    if (enforcerInstance) {
        return enforcerInstance;
    }

    try {
        const adapter = new FileAdapter(policyPath);
        const enforcer = await newEnforcer(modelPath, adapter);

        // Load policies from storage (CSV file in this case)
        await enforcer.loadPolicy();

        // Optional: Enable auto-saving policies back to the file if you modify them programmatically
        // enforcer.enableAutoSave(true);

        // Optional: Enable logging.
        // enforcer.enableLog(true);

        console.log('Casbin enforcer initialized successfully.');
        enforcerInstance = enforcer;
        return enforcer;

    } catch (error) {
        console.error('Failed to initialize Casbin enforcer:', error);
        // Depending on your app's needs, you might want to throw the error
        // or handle it differently (e.g., exit the process if authz is critical)
        throw error;
    }
}

/**
 * Returns the singleton Casbin enforcer instance.
 * Ensures initialization is complete before returning.
 * @returns {Promise<Enforcer>} The initialized Casbin enforcer.
 * @throws {Error} If the enforcer hasn't been initialized yet (should not happen if initializeEnforcer is called on app start).
 */
async function getEnforcer() {
    if (!enforcerInstance) {
        // This can happen if getEnforcer is called before initializeEnforcer finishes.
        // Option 1: Wait for initialization (safer)
        return await initializeEnforcer();
        // Option 2: Throw an error (if you guarantee initialization happens first)
        // throw new Error('Casbin enforcer is not initialized. Call initializeEnforcer first.');
    }
    return enforcerInstance;
}

/**
 * Reloads policies from the storage adapter (e.g., CSV file or DB).
 * Call this function after you know policies have been updated externally
 * or via administrative actions.
 * @returns {Promise<void>}
 * @throws {Error} If reloading fails or enforcer is not initialized.
 */
async function reloadPolicies() {
    const enforcer = await getEnforcer(); // Ensures enforcer is ready
    try {
        await enforcer.loadPolicy();
        console.log('Casbin policies reloaded successfully.');
    } catch (error) {
        console.error('Failed to reload Casbin policies:', error);
        throw error; // Re-throw for upstream handling if necessary
    }
}

// Initialize on import (call this early in your app's startup)
// await initializeEnforcer(); // Or call it in your main app file

module.exports = { initializeEnforcer, getEnforcer, reloadPolicies };

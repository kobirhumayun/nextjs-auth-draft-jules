// lib/redis.js
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Reuse across HMR in Next dev
let _client = globalThis.__IOREDIS_CLIENT__;
let _shutdownInstalled = globalThis.__IOREDIS_SHUTDOWN_INSTALLED__ || false;

/**
 * Return a single shared ioredis client instance.
 * - Fail-fast if not connected (enableOfflineQueue: false)
 * - Modest retry backoff and reconnect on READONLY/timeout/reset errors
 * - Graceful shutdown on SIGINT/SIGTERM (PM2-friendly)
 */
export function getRedis() {
    if (_client) return _client;

    _client = new Redis(REDIS_URL, {
        // Security: use "rediss://" in REDIS_URL for TLS
        enableOfflineQueue: false,          // fail fast if Redis is down
        maxRetriesPerRequest: 1,            // don't stall requests
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 10_000),
        retryStrategy(times) {
            // Exponential-ish, cap at 2s
            return Math.min(50 * times, 2000);
        },
        reconnectOnError(err) {
            const msg = String(err?.message || "");
            if (msg.includes("READONLY")) return true;
            if (msg.includes("ETIMEDOUT")) return true;
            if (msg.includes("ECONNRESET")) return true;
            return false;
        },
    });

    _client.on("error", (err) => {
        console.error("[ioredis] error:", err?.message || err);
    });
    _client.on("end", () => {
        console.warn("[ioredis] connection ended");
    });

    // Graceful shutdown so PM2 restarts don't leak sockets
    if (!_shutdownInstalled) {
        const shutdown = async () => {
            try {
                await _client.quit();   // polite QUIT
            } catch {
                try { _client.disconnect(); } catch { }
            }
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
        globalThis.__IOREDIS_SHUTDOWN_INSTALLED__ = true;
        _shutdownInstalled = true;
    }

    globalThis.__IOREDIS_CLIENT__ = _client;
    return _client;
}

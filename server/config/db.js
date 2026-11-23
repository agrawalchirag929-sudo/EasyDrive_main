/**
 * config/db.js
 * Mongoose connection helpers.
 * - connect()    : called once at server startup.
 * - disconnect() : called in tests so the process can exit cleanly.
 */

'use strict';

const mongoose = require('mongoose');

/**
 * Open a connection to MongoDB using MONGODB_URI from the environment.
 * Throws if the URI is missing so the server fails loudly rather than
 * silently operating without a database.
 *
 * Timeouts:
 *  - serverSelectionTimeoutMS (5 s): how long the driver looks for a usable
 *    server before giving up. Without this, a bad URI hangs forever.
 *  - connectTimeoutMS (10 s): how long a single TCP connect attempt may take.
 */
async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  await mongoose.connect(uri, {
    // Fail fast if MongoDB is unreachable instead of hanging indefinitely.
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    // Suppress the buffering deprecation warning.
    bufferCommands: false,
  });

  console.log(`[DB] Connected to MongoDB: ${mongoose.connection.host}`);

  // Log and exit cleanly if the connection is lost after startup, instead of
  // letting subsequent requests fail with cryptic MongoNetworkErrors.
  mongoose.connection.on('error', (err) => {
    console.error('[DB] Connection error after startup:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected. Requests will fail until reconnection.');
  });
}

/**
 * Close the Mongoose connection.
 * Used by the test suite so the Node process exits after tests finish.
 */
async function disconnect() {
  await mongoose.disconnect();
  console.log('[DB] Disconnected from MongoDB.');
}

module.exports = { connect, disconnect };

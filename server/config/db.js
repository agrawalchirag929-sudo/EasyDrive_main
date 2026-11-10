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
 */
async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  await mongoose.connect(uri, {
    // Suppress the deprecation warning about buffering commands before
    // the connection is open.
    bufferCommands: false,
  });

  console.log(`[DB] Connected to MongoDB: ${mongoose.connection.host}`);
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

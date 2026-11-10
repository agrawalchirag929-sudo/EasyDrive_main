/**
 * models/User.js
 * Mongoose schema for registered users.
 *
 * Security rules enforced here:
 *  - passwordHash is excluded from every toJSON / toObject call so it is
 *    NEVER accidentally returned in an API response.
 *  - email is stored lowercase + trimmed for case-insensitive uniqueness.
 *  - phone is optional; when provided it must be a 10-digit Indian mobile number.
 *  - Register endpoint only needs { name, email, password }; the schema
 *    accepts phone as an optional field for future profile updates.
 */

'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [80, 'Name must not exceed 80 characters.'],
    },

    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address.'],
    },

    passwordHash: {
      type: String,
      required: true,
      // select: false ensures passwordHash is excluded from query results
      // by default.  The toJSON transform below provides a second layer of
      // protection.
      select: false,
    },

    // Optional Indian mobile number — 10 digits, starting with 6-9.
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Phone must be a valid 10-digit Indian mobile number.'],
      default: null,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true, // createdAt, updatedAt

    toJSON: {
      transform(_doc, ret) {
        // Always strip the password hash before the object is serialised.
        delete ret.passwordHash;
        // Remove internal Mongoose version key from responses.
        delete ret.__v;
        return ret;
      },
    },

    toObject: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);

/**
 * seed/seedCars.js
 * Populates the MongoDB 'cars' collection from client/assets/cars.json.
 *
 * Rules:
 *  - Uses upsert (updateOne with { upsert: true }) so running the script
 *    multiple times is safe — no duplicates, no data loss.
 *  - The seed NEVER deletes existing cars. Extra cars in the database that
 *    are not in cars.json are left untouched.
 *  - The JSON 'id' field maps to the Car schema's 'slug' field.
 */

'use strict';

// Load .env from the server/ directory.
require('dotenv').config();

const path    = require('path');
const fs      = require('fs');
const { connect, disconnect } = require('../config/db');
const Car     = require('../models/Car');

async function seed() {
  // Resolve path relative to this file so it works from any CWD.
  const carsJsonPath = path.resolve(__dirname, '../../client/assets/cars.json');

  if (!fs.existsSync(carsJsonPath)) {
    console.error(`[SEED] cars.json not found at: ${carsJsonPath}`);
    process.exit(1);
  }

  const carsData = JSON.parse(fs.readFileSync(carsJsonPath, 'utf-8'));

  await connect();

  let upserted = 0;
  let modified  = 0;

  for (const car of carsData) {
    // Map JSON 'id' → schema 'slug', keep all other fields.
    const { id, ...rest } = car;

    const result = await Car.updateOne(
      { slug: id },       // filter: match by slug
      { $set: { slug: id, ...rest } }, // update: set all fields
      { upsert: true }    // insert if not found
    );

    if (result.upsertedCount) upserted++;
    else if (result.modifiedCount) modified++;
  }

  console.log(
    `[SEED] Done. ${upserted} car(s) inserted, ${modified} car(s) updated, ` +
    `${carsData.length - upserted - modified} car(s) unchanged.`
  );

  await disconnect();
}

seed().catch((err) => {
  console.error('[SEED] Error:', err.message);
  process.exit(1);
});

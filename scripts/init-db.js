/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

/**
 * Initialise la DB en appliquant scripts/init-db.sql
 *
 * Par défaut on se connecte avec DATABASE_URL si présent.
 * Si votre user applicatif n'a pas les droits pour créer la table/role,
 * vous pouvez passer ADMIN_DATABASE_URL en variable d'environnement.
 */

async function main() {
  const sqlPath = path.join(__dirname, 'init-db.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or ADMIN_DATABASE_URL is required');
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log('✅ DB initialized');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ DB init failed:', err);
  process.exit(1);
});

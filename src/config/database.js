const { Pool } = require('pg');

/**
 * DB config - Security by Default
 * - Pas de credentials en dur.
 * - Utilise DATABASE_URL si présent, sinon variables séparées.
 *
 * IMPORTANT : en production, crée un user PostgreSQL dédié (moindre privilège)
 * et ne réutilise JAMAIS un compte admin/root.
 */

function buildConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  } = process.env;

  return {
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  };
}

const pool = new Pool(buildConfig());

module.exports = pool;

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "credentials.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initTables(db);
  }
  return db;
}

function initTables(db) {
  db.exec(`
    -- Approved organizations that can issue credentials
    CREATE TABLE IF NOT EXISTS issuers (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL CHECK (type IN ('school', 'nonprofit', 'rec_center', 'workforce_program', 'government', 'other')),
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      address       TEXT,
      status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'revoked')),
      approved_by   TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Youth participants who earn credentials
    CREATE TABLE IF NOT EXISTS youth (
      id            TEXT PRIMARY KEY,
      first_name    TEXT NOT NULL,
      last_name     TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      email         TEXT,
      phone         TEXT,
      city          TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Definitions of available credential types
    CREATE TABLE IF NOT EXISTS credential_definitions (
      id            TEXT PRIMARY KEY,
      issuer_id     TEXT NOT NULL REFERENCES issuers(id),
      name          TEXT NOT NULL,
      category      TEXT NOT NULL CHECK (category IN ('skill', 'completion', 'certification', 'badge', 'hours', 'other')),
      description   TEXT,
      requirements  TEXT,
      hours_required INTEGER DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Issued credentials — the core ledger
    CREATE TABLE IF NOT EXISTS credentials (
      id              TEXT PRIMARY KEY,
      credential_def_id TEXT NOT NULL REFERENCES credential_definitions(id),
      issuer_id       TEXT NOT NULL REFERENCES issuers(id),
      youth_id        TEXT NOT NULL REFERENCES youth(id),
      issued_at       TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at      TEXT,
      status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
      evidence_url    TEXT,
      notes           TEXT,
      verification_code TEXT NOT NULL UNIQUE,
      revoked_at      TEXT,
      revoked_reason  TEXT
    );

    -- Index for fast verification lookups
    CREATE INDEX IF NOT EXISTS idx_credentials_verification
      ON credentials(verification_code);

    -- Index for youth wallet queries
    CREATE INDEX IF NOT EXISTS idx_credentials_youth
      ON credentials(youth_id, status);

    -- Index for issuer queries
    CREATE INDEX IF NOT EXISTS idx_credentials_issuer
      ON credentials(issuer_id);
  `);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };

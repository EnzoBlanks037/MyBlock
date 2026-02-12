const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { getDb } = require("../db");

function computeHash(seq, event_type, entity_id, data, prev_hash) {
  const payload = `${seq}:${event_type}:${entity_id}:${data}:${prev_hash || "GENESIS"}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

const LedgerModel = {
  /**
   * Append an immutable entry to the shared ledger.
   * Each entry is hash-chained to the previous one for tamper evidence.
   */
  append({ event_type, entity_type, entity_id, data, actor }) {
    const db = getDb();
    const id = uuidv4();
    const dataJson = typeof data === "string" ? data : JSON.stringify(data || {});

    // Get the previous entry's hash (or null for the first entry)
    const prev = db.prepare("SELECT hash FROM ledger ORDER BY seq DESC LIMIT 1").get();
    const prev_hash = prev ? prev.hash : null;

    // Insert to get the autoincrement seq
    const result = db.prepare(`
      INSERT INTO ledger (id, event_type, actor, entity_type, entity_id, data, prev_hash, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, '')
    `).run(id, event_type, actor || null, entity_type, entity_id, dataJson, prev_hash);

    const seq = result.lastInsertRowid;
    const hash = computeHash(seq, event_type, entity_id, dataJson, prev_hash);

    db.prepare("UPDATE ledger SET hash = ? WHERE seq = ?").run(hash, seq);

    return { seq, id, event_type, entity_type, entity_id, data: dataJson, prev_hash, hash };
  },

  /**
   * Query ledger entries with optional filters.
   */
  findAll({ event_type, entity_type, entity_id, limit, offset } = {}) {
    const db = getDb();
    let sql = "SELECT * FROM ledger WHERE 1=1";
    const params = [];

    if (event_type) {
      sql += " AND event_type = ?";
      params.push(event_type);
    }
    if (entity_type) {
      sql += " AND entity_type = ?";
      params.push(entity_type);
    }
    if (entity_id) {
      sql += " AND entity_id = ?";
      params.push(entity_id);
    }

    sql += " ORDER BY seq DESC";

    if (limit) {
      sql += " LIMIT ?";
      params.push(limit);
      if (offset) {
        sql += " OFFSET ?";
        params.push(offset);
      }
    }

    return db.prepare(sql).all(...params);
  },

  /**
   * Get all ledger entries for a specific entity.
   */
  findByEntity(entity_type, entity_id) {
    const db = getDb();
    return db.prepare(
      "SELECT * FROM ledger WHERE entity_type = ? AND entity_id = ? ORDER BY seq ASC"
    ).all(entity_type, entity_id);
  },

  /**
   * Verify the integrity of the entire hash chain.
   * Returns { valid, entries_checked, broken_at }
   */
  verifyIntegrity() {
    const db = getDb();
    const entries = db.prepare("SELECT * FROM ledger ORDER BY seq ASC").all();

    if (entries.length === 0) {
      return { valid: true, entries_checked: 0 };
    }

    let prev_hash = null;

    for (const entry of entries) {
      // Verify prev_hash links correctly
      if (entry.prev_hash !== prev_hash) {
        return {
          valid: false,
          entries_checked: entry.seq,
          broken_at: entry.seq,
          reason: "Previous hash mismatch",
        };
      }

      // Recompute and verify the hash
      const expected = computeHash(entry.seq, entry.event_type, entry.entity_id, entry.data, entry.prev_hash);
      if (entry.hash !== expected) {
        return {
          valid: false,
          entries_checked: entry.seq,
          broken_at: entry.seq,
          reason: "Hash mismatch — entry may have been tampered with",
        };
      }

      prev_hash = entry.hash;
    }

    return { valid: true, entries_checked: entries.length };
  },

  /**
   * Get ledger statistics.
   */
  stats() {
    const db = getDb();
    const total = db.prepare("SELECT COUNT(*) AS count FROM ledger").get().count;
    const byType = db.prepare(
      "SELECT event_type, COUNT(*) AS count FROM ledger GROUP BY event_type ORDER BY count DESC"
    ).all();
    const latest = db.prepare("SELECT * FROM ledger ORDER BY seq DESC LIMIT 1").get();

    return { total_entries: total, by_event_type: byType, latest_entry: latest || null };
  },
};

module.exports = LedgerModel;

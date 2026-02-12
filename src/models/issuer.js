const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db");
const LedgerModel = require("./ledger");

const IssuerModel = {
  create({ name, type, contact_email, contact_phone, address }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO issuers (id, name, type, contact_email, contact_phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, type, contact_email, contact_phone || null, address || null);
    return IssuerModel.findById(id);
  },

  findById(id) {
    const db = getDb();
    return db.prepare("SELECT * FROM issuers WHERE id = ?").get(id);
  },

  findAll({ status } = {}) {
    const db = getDb();
    if (status) {
      return db.prepare("SELECT * FROM issuers WHERE status = ? ORDER BY created_at DESC").all(status);
    }
    return db.prepare("SELECT * FROM issuers ORDER BY created_at DESC").all();
  },

  approve(id, approved_by) {
    const db = getDb();
    db.prepare(`
      UPDATE issuers SET status = 'approved', approved_by = ?, updated_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(approved_by, id);

    const issuer = IssuerModel.findById(id);
    if (issuer && issuer.status === "approved") {
      LedgerModel.append({
        event_type: "issuer_approved",
        entity_type: "issuer",
        entity_id: id,
        actor: approved_by,
        data: { issuer_name: issuer.name, type: issuer.type },
      });
    }
    return issuer;
  },

  suspend(id) {
    const db = getDb();
    db.prepare(`
      UPDATE issuers SET status = 'suspended', updated_at = datetime('now')
      WHERE id = ? AND status = 'approved'
    `).run(id);

    const issuer = IssuerModel.findById(id);
    if (issuer && issuer.status === "suspended") {
      LedgerModel.append({
        event_type: "issuer_suspended",
        entity_type: "issuer",
        entity_id: id,
        data: { issuer_name: issuer.name, type: issuer.type },
      });
    }
    return issuer;
  },

  revoke(id) {
    const db = getDb();
    db.prepare(`
      UPDATE issuers SET status = 'revoked', updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    const issuer = IssuerModel.findById(id);
    if (issuer && issuer.status === "revoked") {
      LedgerModel.append({
        event_type: "issuer_revoked",
        entity_type: "issuer",
        entity_id: id,
        data: { issuer_name: issuer.name, type: issuer.type },
      });
    }
    return issuer;
  },
};

module.exports = IssuerModel;

const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { getDb } = require("../db");
const LedgerModel = require("./ledger");

function generateVerificationCode() {
  // 8-char alphanumeric code, uppercase for easy sharing
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

const CredentialModel = {
  issue({ credential_def_id, issuer_id, youth_id, expires_at, evidence_url, notes }) {
    const db = getDb();

    // Verify issuer is approved
    const issuer = db.prepare("SELECT status FROM issuers WHERE id = ?").get(issuer_id);
    if (!issuer) throw new Error("Issuer not found");
    if (issuer.status !== "approved") throw new Error("Issuer is not approved to issue credentials");

    // Verify credential definition belongs to this issuer
    const def = db.prepare("SELECT issuer_id FROM credential_definitions WHERE id = ?").get(credential_def_id);
    if (!def) throw new Error("Credential definition not found");
    if (def.issuer_id !== issuer_id) throw new Error("Credential definition does not belong to this issuer");

    // Verify youth exists
    const youth = db.prepare("SELECT id FROM youth WHERE id = ?").get(youth_id);
    if (!youth) throw new Error("Youth not found");

    const id = uuidv4();
    const verification_code = generateVerificationCode();

    db.prepare(`
      INSERT INTO credentials (id, credential_def_id, issuer_id, youth_id, expires_at, evidence_url, notes, verification_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, credential_def_id, issuer_id, youth_id, expires_at || null, evidence_url || null, notes || null, verification_code);

    const credential = CredentialModel.findById(id);

    LedgerModel.append({
      event_type: "credential_issued",
      entity_type: "credential",
      entity_id: id,
      actor: credential.issuer_name,
      data: {
        credential_name: credential.credential_name,
        category: credential.category,
        youth_name: credential.youth_first_name + " " + credential.youth_last_name,
        issuer_name: credential.issuer_name,
        verification_code,
      },
    });

    return credential;
  },

  findById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT c.*,
             cd.name AS credential_name,
             cd.category,
             cd.description AS credential_description,
             i.name AS issuer_name,
             i.type AS issuer_type,
             y.first_name AS youth_first_name,
             y.last_name AS youth_last_name
      FROM credentials c
      JOIN credential_definitions cd ON cd.id = c.credential_def_id
      JOIN issuers i ON i.id = c.issuer_id
      JOIN youth y ON y.id = c.youth_id
      WHERE c.id = ?
    `).get(id);
  },

  verify(verification_code) {
    const db = getDb();
    const credential = db.prepare(`
      SELECT c.*,
             cd.name AS credential_name,
             cd.category,
             cd.description AS credential_description,
             cd.hours_required,
             i.name AS issuer_name,
             i.type AS issuer_type,
             y.first_name AS youth_first_name,
             y.last_name AS youth_last_name
      FROM credentials c
      JOIN credential_definitions cd ON cd.id = c.credential_def_id
      JOIN issuers i ON i.id = c.issuer_id
      JOIN youth y ON y.id = c.youth_id
      WHERE c.verification_code = ?
    `).get(verification_code);

    if (!credential) return { valid: false, reason: "Credential not found" };

    if (credential.status === "revoked") {
      return { valid: false, reason: "Credential has been revoked", credential };
    }

    if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
      return { valid: false, reason: "Credential has expired", credential };
    }

    return { valid: true, credential };
  },

  findByYouth(youth_id) {
    const db = getDb();
    return db.prepare(`
      SELECT c.*,
             cd.name AS credential_name,
             cd.category,
             cd.description AS credential_description,
             i.name AS issuer_name,
             i.type AS issuer_type
      FROM credentials c
      JOIN credential_definitions cd ON cd.id = c.credential_def_id
      JOIN issuers i ON i.id = c.issuer_id
      WHERE c.youth_id = ?
      ORDER BY c.issued_at DESC
    `).all(youth_id);
  },

  findByYouthActive(youth_id) {
    const db = getDb();
    return db.prepare(`
      SELECT c.*,
             cd.name AS credential_name,
             cd.category,
             cd.description AS credential_description,
             i.name AS issuer_name,
             i.type AS issuer_type
      FROM credentials c
      JOIN credential_definitions cd ON cd.id = c.credential_def_id
      JOIN issuers i ON i.id = c.issuer_id
      WHERE c.youth_id = ? AND c.status = 'active'
        AND (c.expires_at IS NULL OR c.expires_at > datetime('now'))
      ORDER BY c.issued_at DESC
    `).all(youth_id);
  },

  findByIssuer(issuer_id) {
    const db = getDb();
    return db.prepare(`
      SELECT c.*,
             cd.name AS credential_name,
             cd.category,
             y.first_name AS youth_first_name,
             y.last_name AS youth_last_name
      FROM credentials c
      JOIN credential_definitions cd ON cd.id = c.credential_def_id
      JOIN youth y ON y.id = c.youth_id
      WHERE c.issuer_id = ?
      ORDER BY c.issued_at DESC
    `).all(issuer_id);
  },

  revoke(id, reason) {
    const db = getDb();
    db.prepare(`
      UPDATE credentials
      SET status = 'revoked', revoked_at = datetime('now'), revoked_reason = ?
      WHERE id = ? AND status = 'active'
    `).run(reason || null, id);

    const credential = CredentialModel.findById(id);

    if (credential && credential.status === "revoked") {
      LedgerModel.append({
        event_type: "credential_revoked",
        entity_type: "credential",
        entity_id: id,
        data: {
          credential_name: credential.credential_name,
          youth_name: credential.youth_first_name + " " + credential.youth_last_name,
          issuer_name: credential.issuer_name,
          reason: reason || null,
        },
      });
    }

    return credential;
  },
};

module.exports = CredentialModel;

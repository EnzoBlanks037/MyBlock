const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db");

const CredentialDefinitionModel = {
  create({ issuer_id, name, category, description, requirements, hours_required }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO credential_definitions (id, issuer_id, name, category, description, requirements, hours_required)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, issuer_id, name, category, description || null, requirements || null, hours_required || 0);
    return CredentialDefinitionModel.findById(id);
  },

  findById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT cd.*, i.name AS issuer_name
      FROM credential_definitions cd
      JOIN issuers i ON i.id = cd.issuer_id
      WHERE cd.id = ?
    `).get(id);
  },

  findByIssuer(issuer_id) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM credential_definitions WHERE issuer_id = ? ORDER BY name
    `).all(issuer_id);
  },

  findAll() {
    const db = getDb();
    return db.prepare(`
      SELECT cd.*, i.name AS issuer_name
      FROM credential_definitions cd
      JOIN issuers i ON i.id = cd.issuer_id
      ORDER BY cd.name
    `).all();
  },
};

module.exports = CredentialDefinitionModel;

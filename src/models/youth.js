const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db");

const YouthModel = {
  create({ first_name, last_name, date_of_birth, email, phone, city }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO youth (id, first_name, last_name, date_of_birth, email, phone, city)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, first_name, last_name, date_of_birth, email || null, phone || null, city || null);
    return YouthModel.findById(id);
  },

  findById(id) {
    const db = getDb();
    return db.prepare("SELECT * FROM youth WHERE id = ?").get(id);
  },

  findAll() {
    const db = getDb();
    return db.prepare("SELECT * FROM youth ORDER BY last_name, first_name").all();
  },

  update(id, fields) {
    const db = getDb();
    const allowed = ["first_name", "last_name", "email", "phone", "city"];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (sets.length === 0) return YouthModel.findById(id);
    sets.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE youth SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return YouthModel.findById(id);
  },
};

module.exports = YouthModel;

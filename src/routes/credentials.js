const express = require("express");
const CredentialModel = require("../models/credential");
const CredentialDefinitionModel = require("../models/credentialDefinition");

const router = express.Router();

// --- Credential Definitions ---

// Create a new credential definition (what can be awarded)
router.post("/definitions", (req, res) => {
  const { issuer_id, name, category, description, requirements, hours_required } = req.body;
  if (!issuer_id || !name || !category) {
    return res.status(400).json({ error: "issuer_id, name, and category are required" });
  }
  try {
    const def = CredentialDefinitionModel.create({
      issuer_id, name, category, description, requirements, hours_required,
    });
    res.status(201).json(def);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all credential definitions
router.get("/definitions", (req, res) => {
  const defs = req.query.issuer_id
    ? CredentialDefinitionModel.findByIssuer(req.query.issuer_id)
    : CredentialDefinitionModel.findAll();
  res.json(defs);
});

// Get a single credential definition
router.get("/definitions/:id", (req, res) => {
  const def = CredentialDefinitionModel.findById(req.params.id);
  if (!def) return res.status(404).json({ error: "Credential definition not found" });
  res.json(def);
});

// --- Credentials (Issuance & Management) ---

// Issue a credential to a youth
router.post("/", (req, res) => {
  const { credential_def_id, issuer_id, youth_id, expires_at, evidence_url, notes } = req.body;
  if (!credential_def_id || !issuer_id || !youth_id) {
    return res.status(400).json({ error: "credential_def_id, issuer_id, and youth_id are required" });
  }
  try {
    const credential = CredentialModel.issue({
      credential_def_id, issuer_id, youth_id, expires_at, evidence_url, notes,
    });
    res.status(201).json(credential);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a single credential by ID
router.get("/:id", (req, res) => {
  const credential = CredentialModel.findById(req.params.id);
  if (!credential) return res.status(404).json({ error: "Credential not found" });
  res.json(credential);
});

// Revoke a credential
router.post("/:id/revoke", (req, res) => {
  const { reason } = req.body;
  try {
    const credential = CredentialModel.revoke(req.params.id, reason);
    if (!credential) return res.status(404).json({ error: "Credential not found" });
    res.json(credential);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

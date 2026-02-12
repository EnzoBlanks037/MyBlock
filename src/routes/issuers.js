const express = require("express");
const IssuerModel = require("../models/issuer");

const router = express.Router();

// Register a new issuer (starts as "pending")
router.post("/", (req, res) => {
  const { name, type, contact_email, contact_phone, address } = req.body;
  if (!name || !type || !contact_email) {
    return res.status(400).json({ error: "name, type, and contact_email are required" });
  }
  try {
    const issuer = IssuerModel.create({ name, type, contact_email, contact_phone, address });
    res.status(201).json(issuer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all issuers (optionally filter by status)
router.get("/", (req, res) => {
  const issuers = IssuerModel.findAll({ status: req.query.status });
  res.json(issuers);
});

// Get a single issuer
router.get("/:id", (req, res) => {
  const issuer = IssuerModel.findById(req.params.id);
  if (!issuer) return res.status(404).json({ error: "Issuer not found" });
  res.json(issuer);
});

// Approve a pending issuer
router.post("/:id/approve", (req, res) => {
  const { approved_by } = req.body;
  if (!approved_by) return res.status(400).json({ error: "approved_by is required" });
  const issuer = IssuerModel.approve(req.params.id, approved_by);
  if (!issuer) return res.status(404).json({ error: "Issuer not found" });
  res.json(issuer);
});

// Suspend an approved issuer
router.post("/:id/suspend", (req, res) => {
  const issuer = IssuerModel.suspend(req.params.id);
  if (!issuer) return res.status(404).json({ error: "Issuer not found" });
  res.json(issuer);
});

// Revoke an issuer
router.post("/:id/revoke", (req, res) => {
  const issuer = IssuerModel.revoke(req.params.id);
  if (!issuer) return res.status(404).json({ error: "Issuer not found" });
  res.json(issuer);
});

module.exports = router;

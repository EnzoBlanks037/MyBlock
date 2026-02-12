const express = require("express");
const YouthModel = require("../models/youth");
const CredentialModel = require("../models/credential");

const router = express.Router();

// Register a new youth participant
router.post("/", (req, res) => {
  const { first_name, last_name, date_of_birth, email, phone, city } = req.body;
  if (!first_name || !last_name || !date_of_birth) {
    return res.status(400).json({ error: "first_name, last_name, and date_of_birth are required" });
  }
  try {
    const youth = YouthModel.create({ first_name, last_name, date_of_birth, email, phone, city });
    res.status(201).json(youth);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all youth
router.get("/", (req, res) => {
  const youth = YouthModel.findAll();
  res.json(youth);
});

// Get a single youth profile
router.get("/:id", (req, res) => {
  const youth = YouthModel.findById(req.params.id);
  if (!youth) return res.status(404).json({ error: "Youth not found" });
  res.json(youth);
});

// Update youth profile
router.patch("/:id", (req, res) => {
  const youth = YouthModel.update(req.params.id, req.body);
  if (!youth) return res.status(404).json({ error: "Youth not found" });
  res.json(youth);
});

// Get a youth's credential wallet (all active, non-expired credentials)
router.get("/:id/wallet", (req, res) => {
  const youth = YouthModel.findById(req.params.id);
  if (!youth) return res.status(404).json({ error: "Youth not found" });
  const credentials = CredentialModel.findByYouthActive(req.params.id);
  res.json({
    youth: { id: youth.id, first_name: youth.first_name, last_name: youth.last_name },
    credentials,
  });
});

// Get full credential history for a youth
router.get("/:id/credentials", (req, res) => {
  const youth = YouthModel.findById(req.params.id);
  if (!youth) return res.status(404).json({ error: "Youth not found" });
  const credentials = CredentialModel.findByYouth(req.params.id);
  res.json(credentials);
});

module.exports = router;

const { Router } = require("express");
const LedgerModel = require("../models/ledger");

const router = Router();

// GET /api/ledger — list ledger entries with optional filters
router.get("/", (req, res) => {
  const { event_type, entity_type, entity_id, limit, offset } = req.query;
  const entries = LedgerModel.findAll({
    event_type,
    entity_type,
    entity_id,
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  });
  res.json(entries);
});

// GET /api/ledger/verify — verify the integrity of the hash chain
router.get("/verify", (req, res) => {
  const result = LedgerModel.verifyIntegrity();
  res.json(result);
});

// GET /api/ledger/stats — ledger summary statistics
router.get("/stats", (req, res) => {
  const stats = LedgerModel.stats();
  res.json(stats);
});

// GET /api/ledger/entity/:type/:id — full history for a specific entity
router.get("/entity/:type/:id", (req, res) => {
  const entries = LedgerModel.findByEntity(req.params.type, req.params.id);
  res.json(entries);
});

module.exports = router;

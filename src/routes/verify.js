const express = require("express");
const CredentialModel = require("../models/credential");

const router = express.Router();

// Public verification endpoint — anyone can check a credential code
// No auth required. This is the endpoint employers/mentors use.
router.get("/:code", (req, res) => {
  const result = CredentialModel.verify(req.params.code.toUpperCase());
  if (!result.valid) {
    return res.status(result.credential ? 200 : 404).json(result);
  }
  res.json(result);
});

module.exports = router;

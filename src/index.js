const express = require("express");
const path = require("path");
const { closeDb } = require("./db");
const issuersRouter = require("./routes/issuers");
const youthRouter = require("./routes/youth");
const credentialsRouter = require("./routes/credentials");
const verifyRouter = require("./routes/verify");
const ledgerRouter = require("./routes/ledger");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Force browsers to always fetch fresh content
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

app.use(express.static(path.join(__dirname, "..", "public")));

// --- Routes ---
app.use("/api/issuers", issuersRouter);
app.use("/api/youth", youthRouter);
app.use("/api/credentials", credentialsRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/ledger", ledgerRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "myblock-credentials" });
});

// --- Start ---
const server = app.listen(PORT, () => {
  console.log(`MyBlock Credential API running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  closeDb();
  server.close();
});

module.exports = app;

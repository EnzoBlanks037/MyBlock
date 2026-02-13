const express = require("express");
const path = require("path");
const fs = require("fs");
const { closeDb } = require("./db");
const issuersRouter = require("./routes/issuers");
const youthRouter = require("./routes/youth");
const credentialsRouter = require("./routes/credentials");
const verifyRouter = require("./routes/verify");
const ledgerRouter = require("./routes/ledger");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- API Routes ---
app.use("/api/issuers", issuersRouter);
app.use("/api/youth", youthRouter);
app.use("/api/credentials", credentialsRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/ledger", ledgerRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "myblock-credentials" });
});

// Serve the frontend — read from disk on every request to avoid caching issues
app.get("/", (req, res) => {
  const htmlPath = path.join(__dirname, "..", "public", "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  res.set("Cache-Control", "no-store");
  res.set("Content-Type", "text/html");
  res.send(html);
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

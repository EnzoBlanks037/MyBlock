const express = require("express");
const { closeDb } = require("./db");
const issuersRouter = require("./routes/issuers");
const youthRouter = require("./routes/youth");
const credentialsRouter = require("./routes/credentials");
const verifyRouter = require("./routes/verify");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- Routes ---
app.use("/api/issuers", issuersRouter);
app.use("/api/youth", youthRouter);
app.use("/api/credentials", credentialsRouter);
app.use("/api/verify", verifyRouter);

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

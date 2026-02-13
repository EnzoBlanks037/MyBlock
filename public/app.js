/* ===== Navigation ===== */
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("page-" + btn.dataset.page).classList.add("active");

    // Auto-load data when switching pages
    if (btn.dataset.page === "issuers") loadIssuers();
    if (btn.dataset.page === "wallet") loadYouthSelect();
    if (btn.dataset.page === "ledger") loadLedger();
    if (btn.dataset.page === "admin") loadAdminSelects();
  });
});

/* ===== Helpers ===== */
async function api(path, opts) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return res.json();
}

function formData(form) {
  const data = {};
  new FormData(form).forEach((v, k) => {
    if (v !== "") data[k] = v;
  });
  return data;
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function badgeFor(value, type) {
  const cls = "badge badge-" + (value || "other");
  return '<span class="' + cls + '">' + escapeHtml(value) + "</span>";
}

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso + "Z").toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function issuerTypeLabel(type) {
  const labels = {
    school: "School",
    nonprofit: "Nonprofit",
    rec_center: "Rec Center",
    workforce_program: "Workforce Program",
    government: "Government",
    other: "Other",
  };
  return labels[type] || type;
}

/* ===== Verify ===== */
document.getElementById("verify-btn").addEventListener("click", doVerify);
document.getElementById("verify-code").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doVerify();
});

async function doVerify() {
  const code = document.getElementById("verify-code").value.trim().toUpperCase();
  if (!code) return;

  const container = document.getElementById("verify-result");
  container.innerHTML = '<div class="empty-state">Checking...</div>';

  const result = await api("/verify/" + encodeURIComponent(code));

  if (!result.valid && !result.credential) {
    container.innerHTML =
      '<div class="verify-status invalid"><span class="verify-icon invalid">&#10007;</span> Credential not found</div>' +
      '<p style="color:var(--text-dim)">No credential matches the code <strong>' + escapeHtml(code) + "</strong>. Double-check and try again.</p>";
    return;
  }

  const c = result.credential;
  const statusClass = result.valid ? "valid" : "invalid";
  const statusText = result.valid ? "Verified" : result.reason;
  const statusIcon = result.valid ? "&#10003;" : "&#10007;";

  container.innerHTML =
    '<div class="verify-status ' + statusClass + '"><span class="verify-icon ' + statusClass + '">' + statusIcon + "</span> " + escapeHtml(statusText) + "</div>" +
    '<div class="credential-card ' + statusClass + '">' +
      '<div class="card-header">' +
        '<span class="card-title">' + escapeHtml(c.credential_name) + "</span>" +
        badgeFor(c.category) +
      "</div>" +
      '<div class="card-meta">' +
        "<div><div class='label'>Issued To</div><div class='value'>" + escapeHtml(c.youth_first_name + " " + c.youth_last_name) + "</div></div>" +
        "<div><div class='label'>Issued By</div><div class='value'>" + escapeHtml(c.issuer_name) + " (" + escapeHtml(issuerTypeLabel(c.issuer_type)) + ")</div></div>" +
        "<div><div class='label'>Issued On</div><div class='value'>" + formatDate(c.issued_at) + "</div></div>" +
        "<div><div class='label'>Expires</div><div class='value'>" + (c.expires_at ? formatDate(c.expires_at) : "No expiry") + "</div></div>" +
        "<div><div class='label'>Status</div><div class='value'>" + badgeFor(c.status) + "</div></div>" +
        "<div><div class='label'>Code</div><div class='value'><span class='wallet-code'>" + escapeHtml(c.verification_code) + "</span></div></div>" +
        (c.credential_description ? "<div><div class='label'>Description</div><div class='value'>" + escapeHtml(c.credential_description) + "</div></div>" : "") +
        (c.notes ? "<div><div class='label'>Notes</div><div class='value'>" + escapeHtml(c.notes) + "</div></div>" : "") +
      "</div>" +
    "</div>";
}

/* ===== Wallet ===== */
async function loadYouthSelect() {
  const select = document.getElementById("wallet-youth-select");
  const youth = await api("/youth");
  const current = select.value;
  select.innerHTML = '<option value="">Select a youth...</option>';
  youth.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y.id;
    opt.textContent = y.first_name + " " + y.last_name;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

document.getElementById("wallet-btn").addEventListener("click", loadWallet);

async function loadWallet() {
  const youthId = document.getElementById("wallet-youth-select").value;
  if (!youthId) return;

  const container = document.getElementById("wallet-result");
  container.innerHTML = '<div class="empty-state">Loading...</div>';

  const data = await api("/youth/" + youthId + "/wallet");

  if (!data.credentials || data.credentials.length === 0) {
    container.innerHTML = '<div class="empty-state">No active credentials found.</div>';
    return;
  }

  let html =
    '<div class="wallet-header">' + escapeHtml(data.youth.first_name + " " + data.youth.last_name) +
    ' <span class="count">(' + data.credentials.length + " credential" + (data.credentials.length !== 1 ? "s" : "") + ")</span></div>";

  data.credentials.forEach((c) => {
    html +=
      '<div class="credential-card valid">' +
        '<div class="card-header">' +
          '<span class="card-title">' + escapeHtml(c.credential_name) + "</span>" +
          badgeFor(c.category) +
        "</div>" +
        '<div class="card-meta">' +
          "<div><div class='label'>Issued By</div><div class='value'>" + escapeHtml(c.issuer_name) + "</div></div>" +
          "<div><div class='label'>Issued</div><div class='value'>" + formatDate(c.issued_at) + "</div></div>" +
          "<div><div class='label'>Expires</div><div class='value'>" + (c.expires_at ? formatDate(c.expires_at) : "No expiry") + "</div></div>" +
          "<div><div class='label'>Verification Code</div><div class='value'><span class='wallet-code'>" + escapeHtml(c.verification_code) + "</span></div></div>" +
          (c.notes ? "<div><div class='label'>Notes</div><div class='value'>" + escapeHtml(c.notes) + "</div></div>" : "") +
        "</div>" +
      "</div>";
  });

  container.innerHTML = html;
}

/* ===== Issuers ===== */
document.getElementById("issuer-load-btn").addEventListener("click", loadIssuers);

async function loadIssuers() {
  const filter = document.getElementById("issuer-filter").value;
  const container = document.getElementById("issuers-list");
  container.innerHTML = '<div class="empty-state">Loading...</div>';

  const qs = filter ? "?status=" + filter : "";
  const issuers = await api("/issuers" + qs);

  if (issuers.length === 0) {
    container.innerHTML = '<div class="empty-state">No issuers found.</div>';
    return;
  }

  let html = "";
  issuers.forEach((i) => {
    html +=
      '<div class="issuer-card">' +
        '<div class="issuer-info">' +
          "<h4>" + escapeHtml(i.name) + "</h4>" +
          '<div class="issuer-detail">' + escapeHtml(issuerTypeLabel(i.type)) + " &middot; " + escapeHtml(i.contact_email) +
            (i.address ? " &middot; " + escapeHtml(i.address) : "") +
          "</div>" +
        "</div>" +
        badgeFor(i.status) +
      "</div>";
  });
  container.innerHTML = html;
}

/* ===== Credential Catalog ===== */
document.getElementById("cred-defs-load").addEventListener("click", loadCredDefs);

async function loadCredDefs() {
  const container = document.getElementById("cred-defs-list");
  container.innerHTML = '<div class="empty-state">Loading...</div>';

  const defs = await api("/credentials/definitions");

  if (defs.length === 0) {
    container.innerHTML = '<div class="empty-state">No credential definitions found. Create one in Admin.</div>';
    return;
  }

  let html = "";
  defs.forEach((d) => {
    html +=
      '<div class="credential-card">' +
        '<div class="card-header">' +
          '<span class="card-title">' + escapeHtml(d.name) + "</span>" +
          badgeFor(d.category) +
        "</div>" +
        '<div class="card-meta">' +
          "<div><div class='label'>Issuer</div><div class='value'>" + escapeHtml(d.issuer_name) + "</div></div>" +
          (d.hours_required ? "<div><div class='label'>Hours</div><div class='value'>" + d.hours_required + "</div></div>" : "") +
          (d.description ? "<div><div class='label'>Description</div><div class='value'>" + escapeHtml(d.description) + "</div></div>" : "") +
          (d.requirements ? "<div><div class='label'>Requirements</div><div class='value'>" + escapeHtml(d.requirements) + "</div></div>" : "") +
        "</div>" +
      "</div>";
  });
  container.innerHTML = html;
}

/* ===== Ledger ===== */
document.getElementById("ledger-load-btn").addEventListener("click", loadLedgerEntries);

async function loadLedger() {
  loadLedgerIntegrity();
  loadLedgerStats();
  loadLedgerEntries();
}

async function loadLedgerIntegrity() {
  const container = document.getElementById("ledger-integrity");
  container.innerHTML = "Verifying chain...";
  const result = await api("/ledger/verify");

  if (result.valid) {
    container.innerHTML =
      '<div class="ledger-chain-status valid">' +
        '<span class="verify-icon valid">&#10003;</span> ' +
        "Chain intact &mdash; " + result.entries_checked + " entries verified" +
      "</div>";
  } else {
    container.innerHTML =
      '<div class="ledger-chain-status invalid">' +
        '<span class="verify-icon invalid">&#10007;</span> ' +
        "Chain broken at entry #" + result.broken_at + ": " + escapeHtml(result.reason) +
      "</div>";
  }
}

async function loadLedgerStats() {
  const container = document.getElementById("ledger-stats");
  const stats = await api("/ledger/stats");

  let html = '<div class="ledger-stats-grid">';
  html += '<div class="stat-item"><div class="stat-value">' + stats.total_entries + '</div><div class="stat-label">Total Entries</div></div>';

  stats.by_event_type.forEach(function(t) {
    html += '<div class="stat-item"><div class="stat-value">' + t.count + '</div><div class="stat-label">' + escapeHtml(formatEventType(t.event_type)) + '</div></div>';
  });
  html += "</div>";
  container.innerHTML = html;
}

function formatEventType(type) {
  var labels = {
    credential_issued: "Issued",
    credential_revoked: "Revoked",
    issuer_approved: "Approved",
    issuer_suspended: "Suspended",
    issuer_revoked: "Issuer Revoked",
  };
  return labels[type] || type;
}

function eventBadge(type) {
  var cls = "badge badge-ledger-" + type;
  return '<span class="' + cls + '">' + escapeHtml(formatEventType(type)) + "</span>";
}

async function loadLedgerEntries() {
  var filter = document.getElementById("ledger-filter-type").value;
  var container = document.getElementById("ledger-list");
  container.innerHTML = '<div class="empty-state">Loading...</div>';

  var qs = filter ? "?event_type=" + filter : "";
  var entries = await api("/ledger" + qs);

  if (entries.length === 0) {
    container.innerHTML = '<div class="empty-state">No ledger entries found.</div>';
    return;
  }

  var html = "";
  entries.forEach(function(e) {
    var data = {};
    try { data = JSON.parse(e.data); } catch (err) { /* ignore */ }

    html +=
      '<div class="ledger-entry">' +
        '<div class="ledger-entry-header">' +
          '<span class="ledger-seq">#' + e.seq + "</span>" +
          eventBadge(e.event_type) +
          '<span class="ledger-time">' + formatDate(e.timestamp) + "</span>" +
        "</div>" +
        '<div class="ledger-entry-body">' +
          (data.credential_name ? '<span class="ledger-detail"><strong>' + escapeHtml(data.credential_name) + "</strong></span>" : "") +
          (data.issuer_name ? '<span class="ledger-detail">' + escapeHtml(data.issuer_name) + "</span>" : "") +
          (data.youth_name ? '<span class="ledger-detail">' + escapeHtml(data.youth_name) + "</span>" : "") +
          (data.reason ? '<span class="ledger-detail" style="color:var(--red)">Reason: ' + escapeHtml(data.reason) + "</span>" : "") +
          (e.actor ? '<span class="ledger-detail" style="color:var(--text-dim)">by ' + escapeHtml(e.actor) + "</span>" : "") +
        "</div>" +
        '<div class="ledger-hash" title="' + escapeHtml(e.hash) + '">' +
          '<span class="hash-label">Hash</span> ' + escapeHtml(e.hash.substring(0, 16)) + "&hellip;" +
        "</div>" +
      "</div>";
  });
  container.innerHTML = html;
}

/* ===== Admin Forms ===== */
async function loadAdminSelects() {
  // Pending issuers for approval
  const pending = await api("/issuers?status=pending");
  const approveSelect = document.getElementById("approve-issuer-select");
  approveSelect.innerHTML = '<option value="">Select pending issuer...</option>';
  pending.forEach((i) => {
    const opt = document.createElement("option");
    opt.value = i.id;
    opt.textContent = i.name;
    approveSelect.appendChild(opt);
  });

  // Approved issuers for credential def & issuance
  const approved = await api("/issuers?status=approved");
  document.querySelectorAll(".issuer-select-approved").forEach((sel) => {
    sel.innerHTML = '<option value="">Select issuer...</option>';
    approved.forEach((i) => {
      const opt = document.createElement("option");
      opt.value = i.id;
      opt.textContent = i.name;
      sel.appendChild(opt);
    });
  });

  // Youth for issuance
  const youth = await api("/youth");
  const youthSelect = document.getElementById("issue-youth");
  youthSelect.innerHTML = '<option value="">Select youth...</option>';
  youth.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y.id;
    opt.textContent = y.first_name + " " + y.last_name;
    youthSelect.appendChild(opt);
  });
}

// When issuer changes on the Issue form, reload their credential definitions
document.getElementById("issue-issuer").addEventListener("change", async (e) => {
  const defSelect = document.getElementById("issue-creddef");
  defSelect.innerHTML = '<option value="">Select credential...</option>';
  if (!e.target.value) return;

  const defs = await api("/credentials/definitions?issuer_id=" + e.target.value);
  defs.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    defSelect.appendChild(opt);
  });
});

function handleForm(formId, resultId, method, pathFn, onSuccess) {
  document.getElementById(formId).addEventListener("submit", async (e) => {
    e.preventDefault();
    const resultEl = document.getElementById(resultId);
    resultEl.className = "form-result";
    resultEl.textContent = "Submitting...";

    const data = formData(e.target);
    try {
      const result = await api(pathFn(data), {
        method,
        body: JSON.stringify(data),
      });

      if (result.error) {
        resultEl.className = "form-result error";
        resultEl.textContent = result.error;
      } else {
        resultEl.className = "form-result success";
        resultEl.textContent = onSuccess(result);
        e.target.reset();
        loadAdminSelects();
      }
    } catch (err) {
      resultEl.className = "form-result error";
      resultEl.textContent = "Request failed.";
    }
  });
}

handleForm("form-issuer", "result-issuer", "POST", () => "/issuers",
  (r) => "Registered \"" + r.name + "\" (status: " + r.status + ")");

handleForm("form-approve", "result-approve", "POST",
  (d) => "/issuers/" + d.issuer_id + "/approve",
  (r) => "\"" + r.name + "\" is now approved!");

handleForm("form-youth", "result-youth", "POST", () => "/youth",
  (r) => "Enrolled " + r.first_name + " " + r.last_name);

handleForm("form-creddef", "result-creddef", "POST", () => "/credentials/definitions",
  (r) => "Created \"" + r.name + "\"");

handleForm("form-issue", "result-issue", "POST", () => "/credentials",
  (r) => "Issued! Verification code: " + r.verification_code);

/* ===== Ledger Tab Failsafe ===== */
(function ensureLedgerTab() {
  if (document.querySelector('[data-page="ledger"]')) return;
  var adminBtn = document.querySelector('[data-page="admin"]');
  if (!adminBtn) return;
  var btn = document.createElement("button");
  btn.className = "nav-btn";
  btn.setAttribute("data-page", "ledger");
  btn.textContent = "Ledger";
  adminBtn.parentNode.insertBefore(btn, adminBtn);
  btn.addEventListener("click", function () {
    document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
    btn.classList.add("active");
    document.getElementById("page-ledger").classList.add("active");
    loadLedger();
  });
})();

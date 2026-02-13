/* ===== MyBlock — Universal Youth Credential Ledger ===== */

/* ---------- Navigation ---------- */
document.querySelectorAll(".nav-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
    btn.classList.add("active");
    var page = document.getElementById("page-" + btn.dataset.page);
    if (page) page.classList.add("active");

    if (btn.dataset.page === "ledger") loadLedger();
    if (btn.dataset.page === "issue") loadIssueSelects();
    if (btn.dataset.page === "wallet") loadWalletYouthSelect();
    if (btn.dataset.page === "admin") loadAdminSelects();
  });
});

/* ---------- Helpers ---------- */
function api(path, opts) {
  return fetch("/api" + path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts))
    .then(function (res) { return res.json(); });
}

function formData(form) {
  var data = {};
  new FormData(form).forEach(function (v, k) { if (v !== "") data[k] = v; });
  return data;
}

function esc(str) {
  if (!str) return "";
  var d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function badge(value) {
  return '<span class="badge badge-' + (value || "other") + '">' + esc(value) + "</span>";
}

function fmtDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso + "Z").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function issuerTypeLabel(type) {
  var m = { school: "School", nonprofit: "Nonprofit", rec_center: "Rec Center", workforce_program: "Workforce Program", government: "Government", other: "Other" };
  return m[type] || type;
}

function eventLabel(type) {
  var m = { credential_issued: "Issued", credential_revoked: "Revoked", credential_verified: "Verified", issuer_created: "Issuer Created", issuer_approved: "Approved", issuer_suspended: "Suspended", issuer_revoked: "Issuer Revoked", youth_registered: "Youth Registered" };
  return m[type] || type;
}

function eventBadge(type) {
  return '<span class="badge badge-ledger-' + type + '">' + esc(eventLabel(type)) + "</span>";
}

function populateSelect(el, items, textFn) {
  var first = el.querySelector("option");
  var placeholder = first ? first.textContent : "";
  el.innerHTML = '<option value="">' + esc(placeholder) + "</option>";
  items.forEach(function (item) {
    var opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = textFn(item);
    el.appendChild(opt);
  });
}

/* ---------- Generic form handler ---------- */
function handleForm(formId, resultId, method, pathFn, onSuccess) {
  var form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var el = document.getElementById(resultId);
    el.className = "form-result";
    el.textContent = "Submitting...";
    var data = formData(e.target);
    api(pathFn(data), { method: method, body: JSON.stringify(data) })
      .then(function (result) {
        if (result.error) {
          el.className = "form-result error";
          el.textContent = result.error;
        } else {
          el.className = "form-result success";
          el.textContent = onSuccess(result);
          e.target.reset();
        }
      })
      .catch(function () {
        el.className = "form-result error";
        el.textContent = "Request failed.";
      });
  });
}

/* ================================================================
   LEDGER  (default page — loads on startup)
   ================================================================ */
function loadLedger() {
  loadLedgerIntegrity();
  loadLedgerStats();
  loadLedgerEntries();
}

function loadLedgerIntegrity() {
  var el = document.getElementById("ledger-integrity");
  el.innerHTML = "Verifying chain\u2026";
  api("/ledger/verify").then(function (r) {
    if (r.valid) {
      el.innerHTML = '<div class="ledger-chain-status valid"><span class="verify-icon valid">&#10003;</span> Chain intact &mdash; ' + r.entries_checked + " entries verified</div>";
    } else {
      el.innerHTML = '<div class="ledger-chain-status invalid"><span class="verify-icon invalid">&#10007;</span> Chain broken at #' + r.broken_at + ": " + esc(r.reason) + "</div>";
    }
  });
}

function loadLedgerStats() {
  var el = document.getElementById("ledger-stats");
  api("/ledger/stats").then(function (s) {
    var h = '<div class="ledger-stats-grid">';
    h += '<div class="stat-item"><div class="stat-value">' + s.total_entries + '</div><div class="stat-label">Total Entries</div></div>';
    if (s.by_event_type) {
      s.by_event_type.forEach(function (t) {
        h += '<div class="stat-item"><div class="stat-value">' + t.count + '</div><div class="stat-label">' + esc(eventLabel(t.event_type)) + "</div></div>";
      });
    }
    h += "</div>";
    el.innerHTML = h;
  });
}

function loadLedgerEntries() {
  var filterType = document.getElementById("ledger-filter-type").value;
  var filterEntity = document.getElementById("ledger-filter-entity").value;
  var el = document.getElementById("ledger-list");
  el.innerHTML = '<div class="empty-state">Loading\u2026</div>';

  var qs = [];
  if (filterType) qs.push("event_type=" + filterType);
  if (filterEntity) qs.push("entity_type=" + filterEntity);
  var query = qs.length ? "?" + qs.join("&") : "";

  api("/ledger" + query).then(function (entries) {
    if (!entries.length) {
      el.innerHTML = '<div class="empty-state">No ledger entries found.</div>';
      return;
    }
    var h = "";
    entries.forEach(function (e) {
      var data = {};
      try { data = JSON.parse(e.data); } catch (err) { /* skip */ }
      h +=
        '<div class="ledger-entry">' +
          '<div class="ledger-entry-header">' +
            '<span class="ledger-seq">#' + e.seq + "</span>" +
            eventBadge(e.event_type) +
            '<span class="ledger-time">' + fmtDate(e.timestamp) + "</span>" +
          "</div>" +
          '<div class="ledger-entry-body">' +
            (data.credential_name ? '<span class="ledger-detail"><strong>' + esc(data.credential_name) + "</strong></span>" : "") +
            (data.issuer_name ? '<span class="ledger-detail">' + esc(data.issuer_name) + "</span>" : "") +
            (data.youth_name ? '<span class="ledger-detail">' + esc(data.youth_name) + "</span>" : "") +
            (data.name ? '<span class="ledger-detail">' + esc(data.name) + "</span>" : "") +
            (data.reason ? '<span class="ledger-detail" style="color:var(--red)">Reason: ' + esc(data.reason) + "</span>" : "") +
            (e.actor ? '<span class="ledger-detail" style="color:var(--text-dim)">by ' + esc(e.actor) + "</span>" : "") +
          "</div>" +
          '<div class="ledger-hash" title="' + esc(e.hash) + '">' +
            '<span class="hash-label">Hash</span> ' + esc((e.hash || "").substring(0, 16)) + "&hellip;" +
          "</div>" +
        "</div>";
    });
    el.innerHTML = h;
  });
}

var ledgerLoadBtn = document.getElementById("ledger-load-btn");
if (ledgerLoadBtn) ledgerLoadBtn.addEventListener("click", loadLedgerEntries);

/* ================================================================
   VERIFY
   ================================================================ */
var verifyForm = document.getElementById("form-verify");
if (verifyForm) {
  verifyForm.addEventListener("submit", function (e) {
    e.preventDefault();
    doVerify();
  });
}

function doVerify() {
  var code = document.getElementById("verify-code").value.trim().toUpperCase();
  if (!code) return;
  var el = document.getElementById("result-verify");
  el.innerHTML = '<div class="empty-state">Checking\u2026</div>';

  api("/verify/" + encodeURIComponent(code)).then(function (result) {
    if (!result.valid && !result.credential) {
      el.innerHTML =
        '<div class="verify-status invalid"><span class="verify-icon invalid">&#10007;</span> Credential not found</div>' +
        '<p style="color:var(--text-dim)">No credential matches <strong>' + esc(code) + "</strong>.</p>";
      return;
    }
    var c = result.credential;
    var cls = result.valid ? "valid" : "invalid";
    var icon = result.valid ? "&#10003;" : "&#10007;";
    var label = result.valid ? "Verified" : result.reason;

    el.innerHTML =
      '<div class="verify-status ' + cls + '"><span class="verify-icon ' + cls + '">' + icon + "</span> " + esc(label) + "</div>" +
      '<div class="credential-card ' + cls + '">' +
        '<div class="card-header"><span class="card-title">' + esc(c.credential_name) + "</span>" + badge(c.category) + "</div>" +
        '<div class="card-meta">' +
          "<div><div class='label'>Issued To</div><div class='value'>" + esc(c.youth_first_name + " " + c.youth_last_name) + "</div></div>" +
          "<div><div class='label'>Issued By</div><div class='value'>" + esc(c.issuer_name) + " (" + esc(issuerTypeLabel(c.issuer_type)) + ")</div></div>" +
          "<div><div class='label'>Issued On</div><div class='value'>" + fmtDate(c.issued_at) + "</div></div>" +
          "<div><div class='label'>Expires</div><div class='value'>" + (c.expires_at ? fmtDate(c.expires_at) : "No expiry") + "</div></div>" +
          "<div><div class='label'>Status</div><div class='value'>" + badge(c.status) + "</div></div>" +
          "<div><div class='label'>Code</div><div class='value'><span class='wallet-code'>" + esc(c.verification_code) + "</span></div></div>" +
          (c.credential_description ? "<div><div class='label'>Description</div><div class='value'>" + esc(c.credential_description) + "</div></div>" : "") +
          (c.notes ? "<div><div class='label'>Notes</div><div class='value'>" + esc(c.notes) + "</div></div>" : "") +
        "</div>" +
      "</div>";
  });
}

/* ================================================================
   ISSUE  (credential definitions + issuance)
   ================================================================ */
function loadIssueSelects() {
  api("/issuers?status=approved").then(function (issuers) {
    populateSelect(document.getElementById("creddef-issuer"), issuers, function (i) { return i.name; });
    populateSelect(document.getElementById("issue-issuer"), issuers, function (i) { return i.name; });
  });
  api("/youth").then(function (youth) {
    populateSelect(document.getElementById("issue-youth"), youth, function (y) { return y.first_name + " " + y.last_name; });
  });
}

var issueIssuerEl = document.getElementById("issue-issuer");
if (issueIssuerEl) {
  issueIssuerEl.addEventListener("change", function () {
    var defSelect = document.getElementById("issue-creddef");
    defSelect.innerHTML = '<option value="">Select credential\u2026</option>';
    if (!issueIssuerEl.value) return;
    api("/credentials/definitions?issuer_id=" + issueIssuerEl.value).then(function (defs) {
      defs.forEach(function (d) {
        var opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.name;
        defSelect.appendChild(opt);
      });
    });
  });
}

handleForm("form-creddef", "result-creddef", "POST",
  function () { return "/credentials/definitions"; },
  function (r) { return 'Created "' + r.name + '"'; });

handleForm("form-issue", "result-issue", "POST",
  function () { return "/credentials"; },
  function (r) { return "Issued! Verification code: " + r.verification_code; });

/* ================================================================
   WALLET  (My Credentials)
   ================================================================ */
function loadWalletYouthSelect() {
  api("/youth").then(function (youth) {
    populateSelect(document.getElementById("wallet-youth"), youth, function (y) { return y.first_name + " " + y.last_name; });
  });
}

var walletBtn = document.getElementById("wallet-load-btn");
if (walletBtn) {
  walletBtn.addEventListener("click", function () {
    var youthId = document.getElementById("wallet-youth").value;
    if (!youthId) return;
    var el = document.getElementById("wallet-result");
    el.innerHTML = '<div class="empty-state">Loading\u2026</div>';

    api("/youth/" + youthId + "/wallet").then(function (data) {
      if (!data.credentials || !data.credentials.length) {
        el.innerHTML = '<div class="empty-state">No active credentials found.</div>';
        return;
      }
      var h = '<div class="wallet-header">' + esc(data.youth.first_name + " " + data.youth.last_name) +
        ' <span class="count">(' + data.credentials.length + " credential" + (data.credentials.length !== 1 ? "s" : "") + ")</span></div>";

      data.credentials.forEach(function (c) {
        h +=
          '<div class="credential-card valid">' +
            '<div class="card-header"><span class="card-title">' + esc(c.credential_name) + "</span>" + badge(c.category) + "</div>" +
            '<div class="card-meta">' +
              "<div><div class='label'>Issued By</div><div class='value'>" + esc(c.issuer_name) + "</div></div>" +
              "<div><div class='label'>Issued</div><div class='value'>" + fmtDate(c.issued_at) + "</div></div>" +
              "<div><div class='label'>Expires</div><div class='value'>" + (c.expires_at ? fmtDate(c.expires_at) : "No expiry") + "</div></div>" +
              "<div><div class='label'>Code</div><div class='value'><span class='wallet-code'>" + esc(c.verification_code) + "</span></div></div>" +
              (c.notes ? "<div><div class='label'>Notes</div><div class='value'>" + esc(c.notes) + "</div></div>" : "") +
            "</div>" +
          "</div>";
      });
      el.innerHTML = h;
    });
  });
}

/* ================================================================
   ADMIN  (register issuers, approve, enroll youth, directory)
   ================================================================ */
function loadAdminSelects() {
  api("/issuers?status=pending").then(function (pending) {
    populateSelect(document.getElementById("approve-issuer-select"), pending, function (i) { return i.name; });
  });
}

handleForm("form-issuer", "result-issuer", "POST",
  function () { return "/issuers"; },
  function (r) { return 'Registered "' + r.name + '" (status: ' + r.status + ")"; });

handleForm("form-approve", "result-approve", "POST",
  function (d) { return "/issuers/" + d.issuer_id + "/approve"; },
  function (r) { return '"' + r.name + '" is now approved!'; });

handleForm("form-youth", "result-youth", "POST",
  function () { return "/youth"; },
  function (r) { return "Enrolled " + r.first_name + " " + r.last_name; });

/* Issuer Directory */
var loadIssuersBtn = document.getElementById("load-issuers-btn");
if (loadIssuersBtn) {
  loadIssuersBtn.addEventListener("click", function () {
    var filter = document.getElementById("issuer-filter").value;
    var el = document.getElementById("issuer-directory");
    el.innerHTML = '<div class="empty-state">Loading\u2026</div>';

    var qs = filter ? "?status=" + filter : "";
    api("/issuers" + qs).then(function (issuers) {
      if (!issuers.length) {
        el.innerHTML = '<div class="empty-state">No issuers found.</div>';
        return;
      }
      var h = "";
      issuers.forEach(function (i) {
        h +=
          '<div class="issuer-card">' +
            '<div class="issuer-info">' +
              "<h4>" + esc(i.name) + "</h4>" +
              '<div class="issuer-detail">' + esc(issuerTypeLabel(i.type)) + " &middot; " + esc(i.contact_email) +
                (i.address ? " &middot; " + esc(i.address) : "") +
              "</div>" +
            "</div>" +
            badge(i.status) +
          "</div>";
      });
      el.innerHTML = h;
    });
  });
}

/* ================================================================
   AUTO-LOAD: Ledger is the default page, load it on startup
   ================================================================ */
loadLedger();

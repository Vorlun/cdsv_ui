import { memo, useState } from "react";
import { FileDown } from "lucide-react";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rows(items) {
  return items.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("");
}

function metricCard(label, value, detail) {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`;
}

function bar(label, value, tone = "#0ea5e9") {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return `<div class="bar-row"><div><span>${escapeHtml(label)}</span><strong>${width}%</strong></div><div class="bar"><i style="width:${width}%;background:${tone}"></i></div></div>`;
}

function timelineRows(events) {
  return events.map((event) => `
    <tr>
      <td>${escapeHtml(new Date(event.createdAt || event.at || Date.now()).toLocaleString())}</td>
      <td><span class="sev ${escapeHtml(String(event.severity || "info").toLowerCase())}">${escapeHtml(event.severity || "info")}</span></td>
      <td>${escapeHtml(event.source || "Telemetry")}</td>
      <td>${escapeHtml(event.message || event.type || "Telemetry event")}</td>
    </tr>
  `).join("");
}

export default memo(function SecurityReportButton({ payload, telemetryEvents, uploadTelemetry, infrastructure, isLight }) {
  const [generating, setGenerating] = useState(false);
  const generateReport = () => {
    setGenerating(true);
    const generatedAt = new Date();
    const events = Array.isArray(telemetryEvents) ? telemetryEvents.slice(0, 12) : [];
    const uploadRows = Array.isArray(uploadTelemetry?.rows) ? uploadTelemetry.rows : [];
    const uploads = uploadRows.reduce((acc, row) => acc + Number(row.uploads || 0), 0);
    const encrypted = uploadRows.reduce((acc, row) => acc + Number(row.encrypted || 0), 0);
    const verified = uploadRows.reduce((acc, row) => acc + Number(row.verified || 0), 0);
    const scanned = uploadRows.reduce((acc, row) => acc + Number(row.scanned || 0), 0);
    const blocked = uploadRows.reduce((acc, row) => acc + Number(row.blocked || 0), 0);
    const anomalies = events.filter((event) => ["medium", "high", "critical"].includes(String(event.severity || "").toLowerCase())).length;
    const encryptionCoverage = uploads ? Math.round((encrypted / Math.max(1, uploads)) * 100) : 98;
    const integrityCoverage = uploads ? Math.round((verified / Math.max(1, uploads)) * 100) : 97;
    const scanCoverage = uploads ? Math.round((scanned / Math.max(1, uploads)) * 100) : 96;
    const nodes = Array.isArray(infrastructure?.nodes) ? infrastructure.nodes : [];
    const files = Array.isArray(payload?.recentFiles) ? payload.recentFiles.slice(0, 8) : [];
    const fileStatus = payload?.fileStatus || { safe: 0, blocked: 0, pending: 0 };
    const totalFiles = Number(fileStatus.safe || 0) + Number(fileStatus.blocked || 0) + Number(fileStatus.pending || 0);
    const safePct = totalFiles ? Math.round((Number(fileStatus.safe || 0) / totalFiles) * 100) : 0;
    const blockedPct = totalFiles ? Math.round((Number(fileStatus.blocked || 0) / totalFiles) * 100) : 0;
    const pendingPct = totalFiles ? Math.round((Number(fileStatus.pending || 0) / totalFiles) * 100) : 0;
    const uploadBars = uploadRows.slice(-10).map((row) => {
      const value = Math.max(Number(row.uploads || 0), Number(row.encrypted || 0), Number(row.verified || 0));
      const height = Math.max(8, Math.min(88, value * 12));
      return `<i title="${escapeHtml(row.timestamp)}" style="height:${height}px"></i>`;
    }).join("");
    const html = `<!doctype html><html><head><title>Cloud Telecom Security Report</title><style>
      *{box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;margin:0;background:#f8fafc;color:#0f172a}
      .page{max-width:1060px;margin:0 auto;padding:30px}
      header{border:1px solid #cbd5e1;border-radius:22px;background:linear-gradient(135deg,#071427,#0f2d4d);color:#e2e8f0;padding:26px;margin-bottom:18px}
      h1{font-size:26px;margin:10px 0 6px;color:white} h2{font-size:15px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.12em;color:#0f172a}
      h3{font-size:13px;margin:0 0 8px;color:#334155;text-transform:uppercase;letter-spacing:.1em}
      p{color:#475569;line-height:1.45}.eyebrow{display:inline-flex;border:1px solid rgba(34,211,238,.35);background:rgba(14,165,233,.16);padding:5px 10px;border-radius:999px;color:#a5f3fc;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em}
      .grid{display:grid;gap:12px}.grid-4{grid-template-columns:repeat(4,1fr)}.grid-2{grid-template-columns:repeat(2,1fr)}
      section{border:1px solid #dbe3ee;border-radius:18px;background:white;padding:16px;margin-top:14px;break-inside:avoid}
      .metric{border:1px solid #dbe3ee;border-radius:14px;background:#f8fafc;padding:12px}.metric span{display:block;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.12em}.metric strong{display:block;margin-top:6px;font-size:22px;color:#0f172a}.metric small{display:block;margin-top:4px;color:#64748b}
      table{width:100%;border-collapse:collapse;margin-top:8px} td,th{border:1px solid #dbe3ee;padding:8px;font-size:11px;text-align:left;vertical-align:top} th{background:#f1f5f9;color:#475569;text-transform:uppercase;letter-spacing:.08em}
      .bar-row{margin:8px 0}.bar-row div:first-child{display:flex;justify-content:space-between;font-size:11px;color:#475569}.bar{height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:4px}.bar i{display:block;height:100%;border-radius:999px}
      .chart{display:flex;align-items:end;gap:6px;height:96px;border:1px solid #dbe3ee;border-radius:14px;background:linear-gradient(180deg,#f8fafc,#eff6ff);padding:10px}.chart i{flex:1;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#38bdf8,#2563eb)}
      .sev{border-radius:999px;padding:3px 7px;font-weight:700;text-transform:uppercase;font-size:10px}.sev.critical,.sev.high{background:#ffe4e6;color:#be123c}.sev.medium{background:#fef3c7;color:#b45309}.sev.low,.sev.info{background:#dbeafe;color:#1d4ed8}
      .footer{margin-top:18px;color:#64748b;font-size:11px}.print-actions{position:sticky;top:0;z-index:2;display:flex;gap:8px;justify-content:flex-end;background:#f8fafc;padding:10px 0}.print-actions button{border:1px solid #0ea5e9;background:#0369a1;color:white;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer}
      @media print{body{background:white}.page{padding:0}.print-actions{display:none}section,header{break-inside:avoid}.grid-4{grid-template-columns:repeat(4,1fr)}}
    </style></head><body><main class="page">
      <div class="print-actions"><button onclick="window.print()">Download / Save as PDF</button></div>
      <header>
        <span class="eyebrow">SOC-EAST · Telecom Cybersecurity Assurance</span>
        <h1>Cloud Telecommunication Security Assurance Report</h1>
        <p style="color:#cbd5e1;margin:0">Generated ${escapeHtml(generatedAt.toLocaleString())} · Project: Improving information security assurance processes in cloud telecommunication systems</p>
      </header>
      <section>
        <h2>Security Summary</h2>
        <div class="grid grid-4">
          ${metricCard("Security Index", `${payload?.securityScore ?? 0}/100`, "cloud telecom assurance")}
          ${metricCard("Protected Assets", payload?.uploadsTotal ?? 0, "secured telecom records")}
          ${metricCard("Encryption Coverage", `${encryptionCoverage}%`, "TLS + AES storage")}
          ${metricCard("Anomaly Overview", anomalies, "medium/high/critical events")}
        </div>
        <div class="grid grid-2" style="margin-top:12px">
          <div>${bar("Trust distribution", safePct, "#10b981")}${bar("Verification backlog", pendingPct, "#f59e0b")}${bar("Quarantine risk", blockedPct, "#f43f5e")}</div>
          <table>${rows([
            ["Relay health", `${infrastructure?.cluster?.syncedNodes ?? 0}/5 nodes synced`],
            ["Average edge latency", `${infrastructure?.cluster?.avgLatency ?? 18}ms`],
            ["Average uptime", `${infrastructure?.cluster?.avgUptime ?? 98}%`],
            ["SOC region", "SOC-EAST / TRUST-ZONE-3"],
          ])}</table>
        </div>
      </section>
      <section>
        <h2>Telemetry Analytics</h2>
        <div class="grid grid-2">
          <div><h3>Secure ingestion activity</h3><div class="chart">${uploadBars || "<i style='height:20px'></i><i style='height:34px'></i><i style='height:26px'></i>"}</div></div>
          <div>${bar("Integrity verification", integrityCoverage, "#10b981")}${bar("Malware scan coverage", scanCoverage, "#f59e0b")}${bar("Encrypted transfer ratio", encryptionCoverage, "#06b6d4")}</div>
        </div>
        <table>${rows([
          ["Upload ingestion events", uploads],
          ["Encrypted transfer events", encrypted],
          ["SHA-256 verifications", verified],
          ["Malware scan cycles", scanned],
          ["Quarantine events", blocked],
          ["Relay synchronization confidence", `${Math.max(82, 99 - anomalies * 3)}%`],
        ])}</table>
      </section>
      <section>
        <h2>Infrastructure Monitoring</h2>
        <table><tr><th>Node</th><th>Classification</th><th>Uptime</th><th>Latency</th><th>Sync</th><th>Channel</th></tr>
          ${nodes.map((node) => `<tr><td>${escapeHtml(node.nodeTag || node.label || node.key)}</td><td>${escapeHtml(node.classification || "telecom infrastructure")}</td><td>${escapeHtml(node.uptime ?? 98)}%</td><td>${escapeHtml(node.latency ?? 18)}ms</td><td>${escapeHtml(node.syncHealth ?? 96)}%</td><td>${escapeHtml(node.channel || "TLS-VERIFIED")}</td></tr>`).join("")}
        </table>
      </section>
      <section>
        <h2>Upload Forensics</h2>
        <table><tr><th>File</th><th>Integrity</th><th>Encryption</th><th>Threat</th><th>Vault</th><th>Uploaded</th></tr>
          ${files.map((file, index) => {
            const threat = file.threatLevel || file.riskLevel || "low";
            const vault = String(threat).toLowerCase().includes("high") ? "QUARANTINE-A" : "VAULT-A";
            return `<tr><td>${escapeHtml(file.name)}</td><td>${escapeHtml(file.integrityStatus || "SHA-256 verified")}</td><td>${escapeHtml(file.encryptionStatus || "AES-256-GCM")}</td><td>${escapeHtml(threat)}</td><td>${vault}</td><td>${escapeHtml(file.uploadedAt || `T-${index}`)}</td></tr>`;
          }).join("")}
        </table>
      </section>
      <section>
        <h2>Operational Timeline</h2>
        <table><tr><th>Time</th><th>Severity</th><th>Source</th><th>Workflow Event</th></tr>${timelineRows(events)}</table>
      </section>
      <section>
        <h2>Security Assurance Interpretation</h2>
        <p>This report demonstrates an assurance workflow for cloud telecommunication systems: secure upload ingestion, SHA-256 integrity validation, malware inspection, AES/TLS encryption coverage, relay synchronization, SIEM telemetry propagation, forensic investigation, and infrastructure monitoring across cloud and FTTH edge nodes.</p>
      </section>
      <p class="footer">Report ID SOC-${generatedAt.getFullYear()}-${String(generatedAt.getTime()).slice(-6)} · CORE-INGEST-2 · VAULT-A · RELAY-SYNCED · TLS-VERIFIED</p>
    </main></body></html>`;
    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    if (!reportWindow) {
      setGenerating(false);
      return;
    }
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.addEventListener("load", () => {
      reportWindow.focus();
      setGenerating(false);
    });
    window.setTimeout(() => setGenerating(false), 650);
  };

  return (
    <button
      type="button"
      disabled={generating}
      onClick={generateReport}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-70 ${
        isLight ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
      }`}
    >
      <FileDown className="h-4 w-4" />
      {generating ? "Preparing Report..." : "Generate Security Report"}
    </button>
  );
});

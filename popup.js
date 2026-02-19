const toggle = document.getElementById("toggle");
const statusLine = document.getElementById("statusLine");
const lastPing = document.getElementById("lastPing");
const lastResult = document.getElementById("lastResult");

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

async function load() {
  const data = await chrome.storage.sync.get(["enabled", "lastPingISO", "lastResult"]);
  const enabled = data.enabled !== false; // default true

  toggle.checked = enabled;
  statusLine.textContent = `Status: ${enabled ? "On" : "Off"}`;
  lastPing.textContent = fmtTime(data.lastPingISO);
  lastResult.textContent = data.lastResult || "—";
}

toggle.addEventListener("change", async () => {
  const enabled = toggle.checked;
  await chrome.storage.sync.set({ enabled });
  statusLine.textContent = `Status: ${enabled ? "On" : "Off"}`;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.lastPingISO || changes.lastResult || changes.enabled) load();
});

load();

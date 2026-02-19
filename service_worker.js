const ALARM_NAME = "childsmath_keepalive";
const DEFAULTS = {
  enabled: true,
  intervalMinutes: 6,
  lastPingISO: null,
  lastResult: "Never"
};

function pingUrl() {
  // Keep this as a same-origin request so cookies apply.
  return "https://www.childsmath.ca/childsa/forms/1lsStuff/student_admin.php?keepalive=1";
}

async function doPing() {
  const url = pingUrl();
  let result = "OK";

  try {
    // Include cookies for session keepalive.
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { "X-Requested-With": "XMLHttpRequest" }
    });

    const text = await res.text();

    // Basic detection of logout/disconnect pages.
    const looksLoggedOut =
      res.redirected ||
      /disconnect=1/i.test(res.url) ||
      /disconnected.*inactivity/i.test(text);

    if (!res.ok) result = `HTTP ${res.status}`;
    if (looksLoggedOut) result = "Logged out detected";
  } catch (e) {
    result = "Network error";
  }

  await chrome.storage.sync.set({
    lastPingISO: new Date().toISOString(),
    lastResult: result
  });
}

async function ensureDefaults() {
  const current = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const toSet = {};
  for (const [k, v] of Object.entries(DEFAULTS)) {
    if (current[k] === undefined) toSet[k] = v;
  }
  if (Object.keys(toSet).length) await chrome.storage.sync.set(toSet);
}

async function scheduleAlarm(enabled, intervalMinutes) {
  await chrome.alarms.clear(ALARM_NAME);

  if (!enabled) return;

  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: Math.max(1, Number(intervalMinutes) || DEFAULTS.intervalMinutes)
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  const { enabled, intervalMinutes } = await chrome.storage.sync.get(["enabled", "intervalMinutes"]);
  await scheduleAlarm(enabled, intervalMinutes);
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
  const { enabled, intervalMinutes } = await chrome.storage.sync.get(["enabled", "intervalMinutes"]);
  await scheduleAlarm(enabled, intervalMinutes);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync") return;

  const enabled = changes.enabled?.newValue;
  const intervalMinutes = changes.intervalMinutes?.newValue;

  if (enabled !== undefined || intervalMinutes !== undefined) {
    const current = await chrome.storage.sync.get(["enabled", "intervalMinutes"]);
    await scheduleAlarm(current.enabled, current.intervalMinutes);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const { enabled } = await chrome.storage.sync.get(["enabled"]);
  if (!enabled) return;

  await doPing();
});

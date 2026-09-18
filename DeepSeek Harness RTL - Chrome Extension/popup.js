"use strict";
const toggle = document.getElementById("enabled");
const status = document.getElementById("status");
const retry = document.getElementById("retry");
const stateLabel = document.getElementById("state-label");
const stateDetail = document.getElementById("state-detail");
let savedEnabled = true;
let busy = false;

document.getElementById("version").textContent = "v" + chrome.runtime.getManifest().version;

function render(state) {
  document.body.dataset.state = state;
  const labels = {
    loading: ["Loading settings…", "Please wait"],
    saving: ["Saving preference…", "Please wait"],
    enabled: ["Auto-direction enabled", "Runs automatically"],
    disabled: ["Auto-direction paused", "Original layout"],
    error: ["Settings unavailable", "Try again below"]
  };
  [stateLabel.textContent, stateDetail.textContent] = labels[state];
}
function message(text, error = false) {
  status.hidden = !text;
  status.textContent = text;
  status.dataset.error = String(error);
}
function load() {
  busy = true;
  toggle.disabled = true;
  retry.hidden = true;
  message("");
  render("loading");
  chrome.storage.local.get({enabled:true}, settings => {
    busy = false;
    if (chrome.runtime.lastError) {
      render("error");
      message("Could not load your preference. Please try again.", true);
      retry.hidden = false;
      return;
    }
    savedEnabled = settings.enabled !== false;
    toggle.checked = savedEnabled;
    toggle.disabled = false;
    render(savedEnabled ? "enabled" : "disabled");
  });
}
toggle.addEventListener("change", () => {
  if (busy) return;
  busy = true;
  toggle.disabled = true;
  message("");
  render("saving");
  const next = toggle.checked;
  chrome.storage.local.set({enabled:next}, () => {
    busy = false;
    toggle.disabled = false;
    if (chrome.runtime.lastError) {
      toggle.checked = savedEnabled;
      render(savedEnabled ? "enabled" : "disabled");
      message("Could not save your preference. Please try the switch again.", true);
      return;
    }
    savedEnabled = next;
    render(next ? "enabled" : "disabled");
    message(next ? "Automatic direction is on for supported Harness tabs." : "Paused. Supported tabs now use their original text direction.");
  });
});
retry.addEventListener("click", load);
load();

// Update notice: compare the installed version with the latest GitHub release,
// at most once every 24 hours. The GitHub API sends open CORS headers, so no
// extra host permissions are needed. Fails silently when offline.
const UPDATE_REPO = "AbolDev/deepseek-harness-rtl-extension";
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const updateBox = document.getElementById("update");

function isNewer(current, latest) {
  const parts = value => String(value).replace(/^v/, "").split("-")[0].split(".").map(Number);
  const [c, l] = [parts(current), parts(latest)];
  if (c.some(Number.isNaN) || l.some(Number.isNaN)) return false;
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}
function showUpdate(latest) {
  document.getElementById("update-text").textContent = "New version available — v" + latest.replace(/^v/, "");
  updateBox.hidden = false;
}
function checkForUpdates() {
  chrome.storage.local.get({updateCheckAt: 0, latestVersion: "", dismissedVersion: ""}, async settings => {
    if (chrome.runtime.lastError) return;
    const current = chrome.runtime.getManifest().version;
    if (settings.latestVersion && settings.latestVersion !== settings.dismissedVersion && isNewer(current, settings.latestVersion)) showUpdate(settings.latestVersion);
    if (Date.now() - (settings.updateCheckAt || 0) < UPDATE_INTERVAL_MS) return;
    try {
      if (typeof fetch !== "function") return; // offline/test environments
      let latest = null;
      const release = await fetch("https://api.github.com/repos/" + UPDATE_REPO + "/releases/latest", {cache: "no-store"});
      if (release.ok) latest = (await release.json()).tag_name;
      else if (release.status === 404) { // no releases published yet: fall back to the newest tag
        const tags = await fetch("https://api.github.com/repos/" + UPDATE_REPO + "/tags", {cache: "no-store"});
        if (tags.ok) latest = (await tags.json())[0]?.name;
      }
      chrome.storage.local.set({updateCheckAt: Date.now(), ...(latest ? {latestVersion: latest} : {})}, () => void chrome.runtime.lastError);
      if (latest && latest !== settings.dismissedVersion && isNewer(current, latest)) showUpdate(latest);
    } catch { /* offline or blocked: retry on next popup open after the interval */ }
  });
}
document.getElementById("update-dismiss").addEventListener("click", () => {
  chrome.storage.local.get({latestVersion: ""}, settings => {
    if (!chrome.runtime.lastError) chrome.storage.local.set({dismissedVersion: settings.latestVersion}, () => void chrome.runtime.lastError);
  });
  updateBox.hidden = true;
});
checkForUpdates();

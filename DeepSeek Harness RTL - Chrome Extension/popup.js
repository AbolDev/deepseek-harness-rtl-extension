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

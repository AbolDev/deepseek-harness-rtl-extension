(() => {
  "use strict";
  // Chrome match patterns cannot restrict ports. Do not touch other local apps.
  if (location.port !== "3080" || !/DeepSeek Harness/i.test(document.title)) return;
  const blocks = "p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,figcaption,div,textarea,[contenteditable='true'],[contenteditable='plaintext-only']";
  const skip = "pre,code,kbd,samp,script,style,svg,math,button,nav,[role='navigation'],.monaco-editor,.cm-editor,.xterm,[data-dsh-rtl-ignore]";
  const attr = "data-dsh-auto-dir";
  let enabled = true;
  let timer = null;
  const pending = new Set();

  function direction(text) {
    // Ignore punctuation/digits; a Persian clause after an English product name
    // still reads RTL. URLs and code are ignored when detecting language.
    const prose = text.replace(/https?:\/\/\S+|\x60[^\x60]*\x60/g, "");
    for (const letter of prose) {
      if (/\p{Letter}/u.test(letter) && /\p{Script=Arabic}|\p{Script=Hebrew}/u.test(letter)) return "rtl";
    }
    return "ltr";
  }

  function update(el) {
    if (!(el instanceof HTMLElement)) return;
    const editable = el.matches("textarea,[contenteditable='true'],[contenteditable='plaintext-only']");
    const invalid = el.closest(skip) || (!editable && el.closest("[contenteditable],textarea"));
    // Never set direction on layout containers, message toolbars, or the app root.
    const layout = !editable && el.tagName === "DIV" && (el.querySelector(blocks + ",pre,table,button,nav,section,article,form") || !el.textContent.trim());
    if (!enabled || invalid || layout) {
      el.removeAttribute(attr);
      return;
    }
    let text = editable ? (el.value ?? el.textContent) : "";
    if (!editable) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return node.parentElement.closest(skip + ",a") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode()) text += walker.currentNode.textContent;
    }
    const dir = direction(text || "");
    if (el.getAttribute(attr) !== dir) el.setAttribute(attr, dir);
  }

  function scan(root) {
    if (!root.isConnected) return;
    if (root.matches?.(blocks)) update(root);
    root.querySelectorAll?.(blocks).forEach(update);
  }

  function enqueue(root) {
    if (!enabled || !root) return;
    pending.add(root);
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      const roots = [...pending];
      pending.clear();
      for (const node of roots) {
        if (!roots.some(other => other !== node && other.contains(node))) scan(node);
      }
    }, 60);
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      const parent = record.target.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target;
      enqueue(parent?.closest(blocks) || parent);
    }
  });
  function apply(value) {
    enabled = value !== false;
    observer.disconnect();
    clearTimeout(timer);
    timer = null;
    pending.clear();
    if (!enabled) {
      document.querySelectorAll("[" + attr + "]").forEach(el => el.removeAttribute(attr));
      document.documentElement.removeAttribute("data-dsh-rtl-active");
      return;
    }
    document.documentElement.setAttribute("data-dsh-rtl-active", "");
    scan(document.body);
    // Own data attributes are intentionally not observed: no feedback loop.
    observer.observe(document.body, {subtree:true, childList:true, characterData:true});
  }
  document.addEventListener("input", event => {
    if (enabled && event.target instanceof HTMLElement && event.target.matches("textarea,[contenteditable]")) update(event.target);
    else if (enabled) enqueue(event.target?.closest?.("[contenteditable]"));
  }, true);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) apply(changes.enabled.newValue);
  });
  chrome.storage.local.get({enabled:true}, settings => {
    if (chrome.runtime.lastError) console.warn("DSH RTL: settings unavailable; using defaults.");
    apply(settings?.enabled);
  });
})();

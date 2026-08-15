(function () {
  "use strict";
  const marker = "data-resume-copilot-id";

  function labelFor(element) {
    if (element.labels && element.labels.length) return Array.from(element.labels).map(function (label) { return label.innerText; }).join(" ");
    if (element.id) {
      const label = document.querySelector('label[for="' + CSS.escape(element.id) + '"]');
      if (label) return label.innerText;
    }
    const parent = element.closest("label");
    if (parent) return parent.innerText;
    const container = element.closest(".form-item, .form-group, [class*=field], [class*=item]");
    return container ? (container.innerText || "").slice(0, 120) : "";
  }

  function editableFields() {
    return Array.from(document.querySelectorAll("input, textarea, select")).filter(function (element) {
      const type = (element.type || "").toLowerCase();
      return !element.disabled && !element.readOnly && !["hidden", "password", "file", "submit", "button", "reset", "image", "checkbox", "radio"].includes(type);
    });
  }

  function scan(profile) {
    let sequence = 0;
    return editableFields().map(function (element) {
      let id = element.getAttribute(marker);
      if (!id) {
        sequence += 1;
        id = "rc-" + Date.now() + "-" + sequence;
        element.setAttribute(marker, id);
      }
      const meta = {
        label: labelFor(element),
        placeholder: element.placeholder || "",
        name: element.name || "",
        id: element.id || "",
        autocomplete: element.autocomplete || "",
        ariaLabel: element.getAttribute("aria-label") || ""
      };
      const match = ResumeCopilotMapper.planField(meta, profile);
      if (!match) return null;
      return Object.assign({ elementId: id, fieldLabel: meta.label || meta.placeholder || meta.name || meta.id, tag: element.tagName.toLowerCase(), type: element.type || "" }, match);
    }).filter(Boolean);
  }

  function setValue(element, value) {
    if (element.tagName === "SELECT") {
      const normalized = ResumeCopilotMapper.normalize(value);
      const option = Array.from(element.options).find(function (candidate) {
        const text = ResumeCopilotMapper.normalize(candidate.textContent);
        return text === normalized || text.includes(normalized) || normalized.includes(text);
      });
      if (!option) return false;
      element.value = option.value;
    } else {
      element.focus();
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur();
    return true;
  }

  function fill(items) {
    let filled = 0;
    items.forEach(function (item) {
      const element = document.querySelector("[" + marker + '="' + CSS.escape(item.elementId) + '"]');
      if (element && setValue(element, item.value)) filled += 1;
    });
    return filled;
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "resume-copilot-scan") sendResponse({ items: scan(message.profile) });
    if (message.type === "resume-copilot-fill") sendResponse({ filled: fill(message.items || []) });
  });
})();

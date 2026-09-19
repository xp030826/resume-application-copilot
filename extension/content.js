(function () {
  "use strict";
  if (window.__resumeCopilotContentLoaded) return;
  window.__resumeCopilotContentLoaded = true;

  const marker = "data-resume-copilot-id";
  const ignoredTypes = ["hidden", "password", "file", "submit", "button", "reset", "image"];

  function labelFor(element) {
    if (element.labels && element.labels.length) return Array.from(element.labels).map(function (label) { return label.innerText; }).join(" ");
    if (element.id) {
      const label = document.querySelector('label[for="' + CSS.escape(element.id) + '"]');
      if (label) return label.innerText;
    }
    const parent = element.closest("label");
    if (parent) return parent.innerText;
    const container = element.closest(".form-item, .form-group, [class*=field], [class*=item], li, td, tr");
    return container ? (container.innerText || "").slice(0, 180) : "";
  }

  function choiceLabel(element) {
    const parent = element.closest("label");
    if (parent) return parent.innerText.trim();
    return element.getAttribute("aria-valuetext") || element.getAttribute("aria-label") || element.value || element.innerText || "";
  }

  function editableFields() {
    const controls = Array.from(new Set(Array.from(document.querySelectorAll("input, textarea, select, [role=combobox], [aria-haspopup=listbox], .ant-select, .el-select, .select2-selection, [data-testid*=select]"))));
    return controls.filter(function (element) {
      const type = (element.type || "").toLowerCase();
      return !element.disabled && !element.readOnly && !ignoredTypes.includes(type) && element.getAttribute("aria-disabled") !== "true";
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
        choiceLabel: choiceLabel(element),
        placeholder: element.placeholder || "",
        name: element.name || "",
        id: element.id || "",
        autocomplete: element.autocomplete || "",
        ariaLabel: element.getAttribute("aria-label") || ""
      };
      const match = ResumeCopilotMapper.planField(meta, profile);
      const result = {
        elementId: id,
        fieldLabel: meta.label || meta.choiceLabel || meta.placeholder || meta.name || meta.id || "未命名字段",
        tag: element.tagName.toLowerCase(),
        type: element.type || "",
        controlType: element.tagName === "SELECT" ? "select" : (isCustomSelectElement(element) ? "custom-select" : "input"),
        pageName: meta.name || meta.id || "",
        matched: Boolean(match)
      };
      if (!match) return Object.assign(result, { confidence: 0, value: "", path: "", sensitive: false, reason: "资料库中没有明确匹配项" });
      return Object.assign(result, match);
    });
  }

  function setNativeValue(element, value) {
    const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) descriptor.set.call(element, value);
    else element.value = value;
  }

  function valuesMatch(left, right) {
    const a = ResumeCopilotMapper.normalize(left);
    const b = ResumeCopilotMapper.normalize(right);
    if (!a || !b) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    const groups = [
      ["博士", "博士研究生", "phd", "doctor"],
      ["硕士", "硕士研究生", "研究生", "master", "mba"],
      ["本科", "大学本科", "本科生", "学士", "bachelor"],
      ["大专", "专科", "专科生", "associate"],
      ["高中", "中专", "highschool"]
      , ["男", "男性", "male", "m"]
      , ["女", "女性", "female", "f"]
      , ["其他", "other", "nonbinary", "nonbinarygender"]
    ];
    return groups.some(function (group) {
      return group.some(function (item) { return a === ResumeCopilotMapper.normalize(item); }) &&
        group.some(function (item) { return b === ResumeCopilotMapper.normalize(item); });
    });
  }

  function isCustomSelectElement(element) {
    return element.matches("[role=combobox], [aria-haspopup=listbox], .ant-select, .el-select, .select2-selection, [data-testid*=select]");
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function customOptionNodes(control) {
    const nodes = [];
    const controlledIds = [control.getAttribute("aria-controls"), control.getAttribute("aria-owns")].filter(Boolean);
    controlledIds.forEach(function (id) {
      const root = document.getElementById(id);
      if (root) nodes.push.apply(nodes, Array.from(root.querySelectorAll("[role=option], li, [data-value]")));
    });
    nodes.push.apply(nodes, Array.from(document.querySelectorAll("[role=option], [role=listbox] li, .ant-select-item-option, .el-select-dropdown__item, [data-value]")));
    return Array.from(new Set(nodes)).filter(isVisible);
  }

  function matchingCustomOption(control, value) {
    return customOptionNodes(control).find(function (option) {
      return valuesMatch(option.innerText || option.textContent || "", value) ||
        valuesMatch(option.getAttribute("data-value") || "", value);
    });
  }

  function waitForCustomOption(control, value, attempt) {
    const option = matchingCustomOption(control, value);
    if (option) {
      option.click();
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
      return Promise.resolve(true);
    }
    if (attempt >= 12) return Promise.resolve(false);
    return new Promise(function (resolve) {
      window.setTimeout(function () { resolve(waitForCustomOption(control, value, attempt + 1)); }, 50);
    });
  }

  async function setCustomValue(element, value) {
    const existing = matchingCustomOption(element, value);
    if (existing) {
      existing.click();
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (element.getAttribute("aria-expanded") !== "true") element.click();
    return waitForCustomOption(element, value, 0);
  }

  async function setValue(element, item) {
    const type = (element.type || "").toLowerCase();
    const value = String(item.value || "");
    if (type === "radio") {
      if (!(valuesMatch(choiceLabel(element), value) || valuesMatch(element.value, value))) return false;
      element.checked = true;
    } else if (type === "checkbox") {
      const target = ResumeCopilotMapper.normalize(value);
      const truthy = ["true", "yes", "是", "有", "同意", "接受", "1"].includes(target);
      element.checked = truthy || valuesMatch(choiceLabel(element), value);
    } else if (element.tagName === "SELECT") {
      const option = Array.from(element.options).find(function (candidate) {
        return valuesMatch(candidate.textContent, value) || valuesMatch(candidate.value, value);
      });
      if (!option) return false;
      element.value = option.value;
    } else if (isCustomSelectElement(element)) {
      return setCustomValue(element, value);
    } else {
      element.focus();
      setNativeValue(element, value);
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur();
    return true;
  }

  async function fill(items) {
    let filled = 0;
    for (const item of (items || [])) {
      const element = document.querySelector("[" + marker + '="' + CSS.escape(item.elementId) + '"]');
      if (element && item.matched !== false && await setValue(element, item)) filled += 1;
    }
    return filled;
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "resume-copilot-scan") sendResponse({ items: scan(message.profile || {}) });
    if (message.type === "resume-copilot-fill") {
      fill(message.items || []).then(function (filled) { sendResponse({ filled: filled }); });
      return true;
    }
  });
})();

(function () {
  "use strict";
  if (window.__resumeCopilotContentLoaded) return;
  window.__resumeCopilotContentLoaded = true;

  const marker = "data-resume-copilot-id";
  const ignoredTypes = ["hidden", "password", "file", "submit", "button", "reset", "image"];
  const customSelectSelector = "[role=combobox], [aria-haspopup=listbox], .ant-select, .el-select, .select2, .select2-selection, [data-testid*=select], [class*=select], [class*=Select], [class*=dropdown], [class*=Dropdown], [class*=picker], [class*=Picker]";
  const specificCustomSelectSelector = "[role=combobox], [aria-haspopup=listbox], .ant-select, .el-select, .select2, .select2-selection, [data-testid*=select], [class*=dropdown], [class*=Dropdown], [class*=picker], [class*=Picker]";
  const genericSelectClassSelector = "[class*=select], [class*=Select]";

  function compactText(value) {
    return String(value || "").replace(/[\u00a0\t\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
  }

  function usefulLabel(value) {
    const text = compactText(value).replace(/[＊*]+/g, "").trim();
    if (!text || /^(请选择|请输入|请选择\.\.\.|请输入\.\.\.|必填项未填写|未填写|\+?\d{1,4})$/i.test(text)) return "";
    return text.slice(0, 180);
  }

  function customRoot(element) {
    if (!element) return element;
    const specificAncestor = element.closest ? element.closest(specificCustomSelectSelector) : null;
    if (specificAncestor) return specificAncestor;
    if (element.matches && element.matches(specificCustomSelectSelector)) return element;
    if (element.matches && element.matches(genericSelectClassSelector) && !/^(INPUT|TEXTAREA)$/i.test(element.tagName)) return element;
    const genericAncestor = element.closest ? element.closest(genericSelectClassSelector) : null;
    return genericAncestor && !/^(INPUT|TEXTAREA)$/i.test(genericAncestor.tagName) ? genericAncestor : element;
  }

  function isSelectLike(element) {
    if (!element) return false;
    if (element.tagName === "SELECT") return true;
    if (element.matches && element.matches(customSelectSelector)) return true;
    if (element.getAttribute("role") === "combobox" || element.getAttribute("aria-haspopup") === "listbox") return true;
    return element.tagName === "INPUT" && (/请选择|select|选择/.test(element.placeholder || "") || element.readOnly);
  }

  function labelFor(element) {
    if (element.labels && element.labels.length) return Array.from(element.labels).map(function (label) { return label.innerText; }).join(" ");
    if (element.id) {
      const label = document.querySelector('label[for="' + CSS.escape(element.id) + '"]');
      if (label) return label.innerText;
    }
    const parent = element.closest("label");
    if (parent) return parent.innerText;
    const labelledBy = (element.getAttribute("aria-labelledby") || "").split(/\s+/).map(function (id) {
      const node = id ? document.getElementById(id) : null;
      return node ? node.innerText : "";
    }).filter(Boolean).join(" ");
    if (labelledBy) return labelledBy;
    const dataLabel = element.getAttribute("data-label") || element.getAttribute("data-field-label") || element.getAttribute("data-title") || element.getAttribute("title");
    if (dataLabel) return dataLabel;

    const containerSelector = ".form-item, .form-group, .form-field, .formItem, .formField, [class*=form-item], [class*=formItem], [class*=field], [class*=Field], [class*=question], [class*=Question], li, td, tr";
    let node = element;
    for (let level = 0; node && level < 7; level += 1, node = node.parentElement) {
      const labelNodes = Array.from(node.querySelectorAll("label, [class*=label], [class*=Label], [class*=title], [class*=Title], [data-label], [data-field-label]"));
      const explicit = labelNodes.map(function (candidate) {
        return usefulLabel(candidate.getAttribute("data-label") || candidate.getAttribute("data-field-label") || candidate.innerText);
      }).filter(Boolean);
      if (explicit.length) return explicit[0];
      if (node.matches && node.matches(containerSelector)) {
        const lines = compactText(node.innerText).split(/\s{2,}|(?=必填)/).map(usefulLabel).filter(Boolean);
        if (lines.length) {
          const placeholder = usefulLabel(element.getAttribute("placeholder"));
          const filtered = lines.filter(function (line) { return line !== placeholder && line !== usefulLabel(element.value); });
          if (filtered.length) return filtered[0];
        }
      }
    }
    return usefulLabel(element.getAttribute("aria-label")) || usefulLabel(element.placeholder) || usefulLabel(element.name) || "";
  }

  function choiceLabel(element) {
    const parent = element.closest("label");
    if (parent) return parent.innerText.trim();
    return element.getAttribute("aria-valuetext") || element.getAttribute("aria-label") || element.value || element.innerText || "";
  }

  function editableFields() {
    const rawControls = Array.from(document.querySelectorAll("input, textarea, select, " + customSelectSelector));
    const controls = Array.from(new Set(rawControls.map(customRoot)));
    return controls.filter(function (element) {
      const type = (element.type || "").toLowerCase();
      return !element.disabled && (!element.readOnly || isSelectLike(element)) && !ignoredTypes.includes(type) && element.getAttribute("aria-disabled") !== "true";
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
      const fieldContainer = element.closest(".form-item, .form-group, .form-field, .formItem, .formField, [class*=form-item], [class*=formItem], [class*=field], [class*=Field], [class*=question], [class*=Question], li, td, tr");
      const meta = {
        label: labelFor(element),
        choiceLabel: choiceLabel(element),
        placeholder: element.placeholder || "",
        name: element.name || "",
        id: element.id || "",
        autocomplete: element.autocomplete || "",
        ariaLabel: element.getAttribute("aria-label") || "",
        dataLabel: element.getAttribute("data-label") || element.getAttribute("data-field-label") || "",
        title: element.getAttribute("title") || "",
        inputType: element.type || "",
        controlType: element.tagName === "SELECT" ? "select" : (isCustomSelectElement(element) ? "custom-select" : "input"),
        optionsText: element.tagName === "SELECT" ? Array.from(element.options).map(function (option) { return option.textContent || option.value || ""; }).join(" ") : "",
        formLabel: labelFor(element),
        context: fieldContainer ? compactText(fieldContainer.innerText).slice(0, 320) : ""
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
    const numeric = function (value) {
      const match = String(value || "").match(/(?:^|[^0-9])(\d{1,4})(?:年|月|日)?(?:$|[^0-9])/);
      return match ? Number(match[1]) : NaN;
    };
    const numericLeft = numeric(left);
    const numericRight = numeric(right);
    if (Number.isFinite(numericLeft) && Number.isFinite(numericRight) && numericLeft === numericRight) return true;
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

  function dateParts(value) {
    const text = String(value || "").trim();
    const match = text.match(/(?:^|[^0-9])((?:19|20)\d{2})\s*(?:年|[./-])\s*(\d{1,2})(?:\s*(?:月|[./-])\s*(\d{1,2})\s*日?)?/);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: match[3] ? Number(match[3]) : null };
  }

  function dateOptionScore(optionText, desiredValue) {
    const optionDate = dateParts(optionText);
    const desiredDate = dateParts(desiredValue);
    if (!optionDate || !desiredDate) return 0;
    if (optionDate.year !== desiredDate.year) return 0;
    if (desiredDate.month && optionDate.month !== desiredDate.month) return 0;
    if (desiredDate.day && optionDate.day && optionDate.day !== desiredDate.day) return 0;
    if (!desiredDate.day && optionDate.day) return 0;
    return desiredDate.day && optionDate.day ? 100 : 98;
  }

  function optionMatchScore(left, right) {
    const leftText = String(left || "").trim();
    const rightText = String(right || "").trim();
    if (!leftText || /^(请选择|请选择\.\.\.|选择|全部|不限|请选择一项)$/i.test(leftText)) return 0;
    if ((leftText.includes("男") && leftText.includes("女")) || /^(请选择|选择)/.test(leftText)) return 0;
    const a = ResumeCopilotMapper.normalize(leftText);
    const b = ResumeCopilotMapper.normalize(rightText);
    if (!a || !b) return 0;
    if (a === b) return 100;
    const dateScore = dateOptionScore(leftText, rightText);
    if (dateScore) return dateScore;
    const numberOf = function (value) {
      const match = String(value || "").match(/(?:^|[^0-9])(\d{1,4})(?:年|月|日)?(?:$|[^0-9])/);
      return match ? Number(match[1]) : NaN;
    };
    const leftNumber = numberOf(leftText);
    const rightNumber = numberOf(rightText);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber === rightNumber) return 95;
    if (valuesMatch(leftText, rightText)) return 90;
    const targets = rightText.split(/[，,、/／;；\s]+/).map(function (item) { return item.trim(); }).filter(Boolean);
    if (targets.some(function (target) { return ResumeCopilotMapper.normalize(target) === a; })) return 85;
    if (a.includes(b) || b.includes(a)) return 60;
    return 0;
  }

  function bestOption(options, value, textFor) {
    let best = null;
    let bestScore = 0;
    options.forEach(function (option) {
      const text = textFor(option);
      const score = optionMatchScore(text, value);
      if (score > bestScore) {
        best = option;
        bestScore = score;
      }
    });
    return best;
  }

  function isCustomSelectElement(element) {
    return element && element.tagName !== "SELECT" && isSelectLike(element);
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function customOptionNodes(control) {
    control = customRoot(control);
    const nodes = [];
    const controlledIds = [control.getAttribute("aria-controls"), control.getAttribute("aria-owns")].filter(Boolean);
    controlledIds.forEach(function (id) {
      const root = document.getElementById(id);
      if (root) nodes.push.apply(nodes, Array.from(root.querySelectorAll("[role=option], li, [data-value]")));
    });
    nodes.push.apply(nodes, Array.from(document.querySelectorAll("[role=option], [role=listbox] li, .ant-select-item-option, .el-select-dropdown__item, [data-value], [class*=option], [class*=Option], [class*=menu-item], [class*=MenuItem], [class*=dropdown-item], [class*=DropdownItem]")));
    return Array.from(new Set(nodes)).filter(function (node) {
      return isVisible(node) && node.getAttribute("aria-disabled") !== "true" && !node.disabled;
    });
  }

  function matchingCustomOption(control, value) {
    control = customRoot(control);
    return bestOption(customOptionNodes(control), value, function (option) {
      return option.innerText || option.textContent || option.getAttribute("data-value") || "";
    });
  }

  function clickLikeUser(element) {
    if (!element) return;
    ["mousedown", "mouseup"].forEach(function (type) {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    if (typeof element.click === "function") element.click();
  }

  function customTrigger(element) {
    const root = customRoot(element);
    if (!root || !root.querySelector) return root;
    return root.querySelector(".ant-select-selector, .el-select__wrapper, .select2-selection, [role=combobox], input:not([type=hidden]), button") || root;
  }

  function waitForCustomOption(control, value, attempt) {
    const option = matchingCustomOption(control, value);
    if (option) {
      clickLikeUser(option);
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
      return Promise.resolve(true);
    }
    if (attempt >= 30) return Promise.resolve(false);
    return new Promise(function (resolve) {
      window.setTimeout(function () { resolve(waitForCustomOption(control, value, attempt + 1)); }, 50);
    });
  }

  async function setCustomValue(element, value) {
    element = customRoot(element);
    const existing = matchingCustomOption(element, value);
    if (existing) {
      clickLikeUser(existing);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    const trigger = customTrigger(element);
    if (element.getAttribute("aria-expanded") !== "true" && trigger.getAttribute("aria-expanded") !== "true") clickLikeUser(trigger);
    let option = await waitForCustomOption(element, value, 0);
    if (option) return true;

    const searchInput = element.querySelector ? element.querySelector("input:not([type=hidden])") : null;
    if (searchInput && searchInput !== trigger && !searchInput.readOnly) {
      searchInput.focus();
      setNativeValue(searchInput, value);
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
      option = await waitForCustomOption(element, value, 0);
      if (option) return true;
    }
    return false;
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
      const option = bestOption(Array.from(element.options), value, function (candidate) {
        return candidate.textContent || candidate.value || "";
      }) || bestOption(Array.from(element.options), value, function (candidate) { return candidate.value || ""; });
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

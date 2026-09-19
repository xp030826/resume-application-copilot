(function () {
  "use strict";
  let profile = ResumeCopilotProfile.blankProfile();
  let pendingCandidates = [];
  let unlockedPassword = "";
  let autoUnlocked = false;
  let autoSaveTimer = null;
  const form = document.getElementById("profileForm");
  const jsonBox = document.getElementById("profileJson");
  const password = document.getElementById("password");
  const status = document.getElementById("status");
  const importStatus = document.getElementById("importStatus");
  const candidateNode = document.getElementById("candidates");
  const applyCandidatesButton = document.getElementById("applyCandidates");
  const extractedTextPanel = document.getElementById("extractedTextPanel");
  const extractedText = document.getElementById("extractedText");
  const savedAttachments = document.getElementById("savedAttachments");
  const savedMaterials = document.getElementById("savedMaterials");
  const autoUnlock = document.getElementById("autoUnlock");

  const sections = [
    ["personal", "基础与联系信息", "个人身份、联系方式、籍贯和公开链接"],
    ["intent", "求职偏好", "目标岗位、城市、到岗时间和工作偏好"],
    ["education", "教育信息", "最高学历和其他教育经历"],
    ["language_records", "语言能力记录", "分别记录英语、日语、普通话等语言的等级、成绩、证书和听说读写能力"],
    ["experience", "实习与工作经历", "记录每段实习/工作中的公司、岗位、职责、工具和可量化成果"],
    ["projects", "项目经历", "记录课程、科研、业务、竞赛和个人项目中的具体贡献"],
    ["campus_experience", "学生干部与校园经历", "记录学生组织、班级职务、社团和校园活动经历"],
    ["volunteer_experience", "志愿与社会实践", "记录志愿服务、社会调研和其他实践经历"],
    ["certificates", "证书、竞赛与荣誉", "记录证书、奖项、竞赛和奖学金等成果"],
    ["skills", "技能与证书", "技能、语言、证书和资格"],
    ["answers", "常见申请答案", "开放式问题的事实基础和可复用答案"],
    ["ai", "AI 辅助设置", "使用你自己的 OpenAI-compatible API；密钥会随资料库一起加密"],
    ["sensitive", "敏感信息", "身份证、家庭、银行卡和紧急联系人；与其他匹配字段一样参与填充"]
  ];

  function show(node, message, error) {
    node.textContent = message || "";
    node.className = "status" + (error ? " error" : "");
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function inputFor(definition, value) {
    const node = definition.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    if (node.tagName !== "TEXTAREA") {
      node.type = definition.type === "list" ? "text" : definition.type;
      if (definition.type === "date" && String(value || "") === "至今") {
        node.type = "text";
        node.placeholder = "YYYY-MM-DD 或 至今";
      }
    }
    node.value = definition.type === "list" ? (Array.isArray(value) ? value.join("、") : String(value || "")) : String(value || "");
    if (definition.type === "textarea") node.rows = 3;
    node.dataset.path = definition.path;
    node.dataset.valueType = definition.type;
    node.autocomplete = "off";
    return node;
  }

  function renderScalarFields(sectionKey, container) {
    ResumeCopilotProfile.fieldDefinitions.filter(function (definition) {
      return definition.path.split(".")[0] === sectionKey && !definition.path.startsWith("education.0.");
    }).forEach(function (definition) {
      const field = element("div", "field");
      const label = element("label", "field-label", definition.label + (definition.sensitive ? " · 敏感" : ""));
      const input = inputFor(definition, ResumeCopilotProfile.getPath(profile, definition.path));
      if (definition.sensitive) field.classList.add("restricted-field");
      const provenance = profile.provenance && profile.provenance[definition.path];
      const meta = element("small", "field-meta", provenance ? ((provenance.sourceDocument || "手动填写") + " · " + Math.round((provenance.confidence || 1) * 100) + "%") : "未记录来源");
      field.append(label, input, meta);
      container.append(field);
    });
  }

  function renderCollection(key, container) {
    const definition = ResumeCopilotProfile.collectionDefinitions[key];
    const records = Array.isArray(profile[key]) ? profile[key] : [];
    const list = element("div", "collection-list");
    records.forEach(function (record, index) {
      const card = element("div", "collection-item");
      const title = element("div", "collection-item-header", definition.label + " #" + (index + 1));
      const remove = element("button", "text-button danger", "删除");
      remove.type = "button";
      remove.dataset.removeCollection = key;
      remove.dataset.index = String(index);
      title.append(remove);
      card.append(title);
      definition.fields.forEach(function (fieldDefinition) {
        const field = element("div", "field");
        const label = element("label", "field-label", fieldDefinition[1]);
        const longTextKeys = ["description", "contribution", "achievements", "results", "tools", "skills", "notes", "activity"];
        const input = document.createElement(longTextKeys.includes(fieldDefinition[0]) ? "textarea" : "input");
        if (input.tagName !== "TEXTAREA" && /(?:^|_)(?:date|start_date|end_date|valid_until)$/.test(fieldDefinition[0])) {
          input.type = String(record[fieldDefinition[0]] || "") === "至今" ? "text" : "date";
          if (input.type === "text") input.placeholder = "YYYY-MM-DD 或 至今";
        }
        if (input.tagName === "TEXTAREA") input.rows = 3;
        input.value = Array.isArray(record[fieldDefinition[0]]) ? record[fieldDefinition[0]].join("、") : String(record[fieldDefinition[0]] || "");
        input.dataset.collection = key;
        input.dataset.index = String(index);
        input.dataset.key = fieldDefinition[0];
        field.append(label, input);
        card.append(field);
      });
      list.append(card);
    });
    const add = element("button", "secondary", "+ 添加" + definition.label);
    add.type = "button";
    add.dataset.addCollection = key;
    container.append(list, add);
  }

  function render() {
    form.replaceChildren();
    sections.forEach(function (section) {
      const card = element("section", "card profile-section");
      const header = element("div", "section-title");
      const title = element("div");
      title.append(element("h2", "", section[1]), element("p", "section-description", section[2]));
      header.append(title);
      card.append(header);
      const fields = element("div", "field-grid");
      if (section[0] === "education") {
        const highest = element("div", "field-grid");
        ResumeCopilotProfile.fieldDefinitions.filter(function (definition) { return definition.path.startsWith("education.0."); }).forEach(function (definition) {
          const field = element("div", "field");
          field.append(element("label", "field-label", definition.label), inputFor(definition, ResumeCopilotProfile.getPath(profile, definition.path)));
          highest.append(field);
        });
        card.append(element("h3", "subheading", "最高学历"), highest);
        const collectionArea = element("div", "education-other");
        renderCollection("education", collectionArea);
        card.append(element("h3", "subheading", "其他教育经历"), collectionArea);
      } else if (Object.prototype.hasOwnProperty.call(ResumeCopilotProfile.collectionDefinitions, section[0])) {
        const collectionArea = element("div", "collection-area");
        renderCollection(section[0], collectionArea);
        card.append(collectionArea);
      } else {
        renderScalarFields(section[0], fields);
        card.append(fields);
      }
      form.append(card);
    });
    jsonBox.value = JSON.stringify(profile, null, 2);
    renderSavedAttachments();
    renderSavedMaterials();
  }

  function renderSavedAttachments() {
    savedAttachments.replaceChildren();
    const attachments = Array.isArray(profile.attachments) ? profile.attachments : [];
    if (!attachments.length) return;
    savedAttachments.append(element("strong", "", "已保存材料（仅保存本地记录，不会自动重新读取文件）"));
    attachments.forEach(function (attachment) {
      const detail = [attachment.name, attachment.type, attachment.extractedCharacters ? attachment.extractedCharacters + " 字" : ""].filter(Boolean).join(" · ");
      savedAttachments.append(element("div", "field-meta", "✓ " + detail));
    });
  }

  function renderSavedMaterials() {
    savedMaterials.replaceChildren();
    const materials = Array.isArray(profile.imported_materials) ? profile.imported_materials : [];
    if (!materials.length) return;
    savedMaterials.append(element("strong", "", "已固定保存的解析材料"));
    materials.forEach(function (material) {
      const candidateCount = Array.isArray(material.candidates) ? material.candidates.length : 0;
      const detail = [material.name, material.extractionMethod || "文本读取", (material.extractedCharacters || 0) + " 字", candidateCount + " 个候选"].join(" · ");
      savedMaterials.append(element("div", "field-meta", "✓ " + detail));
    });
  }

  function restoreImportedMaterials() {
    const materials = Array.isArray(profile.imported_materials) ? profile.imported_materials : [];
    pendingCandidates = materials.reduce(function (all, material) {
      return all.concat(Array.isArray(material.candidates) ? material.candidates : []);
    }, []);
    const text = materials.filter(function (material) { return material.extractedText; }).map(function (material) {
      return "===== " + material.name + " =====\n" + material.extractedText;
    }).join("\n\n");
    extractedText.value = text;
    extractedTextPanel.hidden = !text;
    renderCandidates();
  }

  function readForm() {
    const next = ResumeCopilotProfile.clone(profile);
    form.querySelectorAll("[data-path]").forEach(function (input) {
      let value = input.value.trim();
      if (input.dataset.valueType === "list") value = ResumeCopilotProfile.asList(value);
      ResumeCopilotProfile.setPath(next, input.dataset.path, value);
      next.provenance[input.dataset.path] = { sourceDocument: "手动填写", confidence: 1, updatedAt: new Date().toISOString() };
    });
    form.querySelectorAll("[data-collection]").forEach(function (input) {
      const key = input.dataset.collection;
      const index = Number(input.dataset.index);
      if (!Array.isArray(next[key])) next[key] = [];
      if (!next[key][index]) next[key][index] = {};
      next[key][index][input.dataset.key] = input.value.trim();
    });
    return ResumeCopilotProfile.ensureProfile(next);
  }

  async function persistProfile(message) {
    const key = unlockedPassword || password.value;
    if ((!key || key.length < 8) && !autoUnlocked) return false;
    profile = readForm();
    const updates = {};
    if (key && key.length >= 8) {
      updates.resumeCopilotVault = await ResumeCopilotCrypto.encrypt(profile, key);
      unlockedPassword = key;
    }
    if (autoUnlock.checked) updates.resumeCopilotAutoVault = await ResumeCopilotCrypto.encryptForDevice(profile);
    else await chrome.storage.local.remove("resumeCopilotAutoVault");
    await chrome.storage.local.set(updates);
    autoUnlocked = autoUnlock.checked;
    if (message) show(status, message, false);
    return true;
  }

  function scheduleAutoSave() {
    if (!unlockedPassword && !autoUnlocked) return;
    if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(function () {
      persistProfile("资料已自动保存到本机").catch(function (error) { show(status, "自动保存失败：" + error.message, true); });
    }, 700);
  }

  function candidateValue(candidate) {
    if (candidate.path === "__profile__") return "完整 JSON 资料";
    return String(candidate.value || "");
  }

  function renderCandidates() {
    candidateNode.replaceChildren();
    if (!pendingCandidates.length) {
      candidateNode.append(element("p", "empty-state", "没有提取到可用候选。若这是扫描件或图片型 PDF，请先 OCR；若 PDF 可以复制文字但仍为空，请尝试重新加载扩展后再导入。"));
    }
    pendingCandidates.forEach(function (candidate, index) {
      const row = element("label", "candidate-row" + (candidate.sensitive ? " restricted" : ""));
      const check = document.createElement("input");
      check.type = "checkbox";
      check.dataset.index = String(index);
      check.checked = Number(candidate.confidence || 0) >= 0.7;
      const body = element("span");
      body.append(element("strong", "", candidate.label || candidate.path), element("span", "candidate-value", " → " + candidateValue(candidate)), element("small", "field-meta", candidate.sourceDocument + " · 置信度 " + Math.round(candidate.confidence * 100) + "%" + (candidate.sensitive ? " · 敏感字段" : "")));
      row.append(check, body);
      candidateNode.append(row);
    });
    applyCandidatesButton.disabled = pendingCandidates.length === 0;
  }

  function applyCandidates() {
    profile = readForm();
    const selected = Array.from(candidateNode.querySelectorAll("input:checked")).map(function (node) { return pendingCandidates[Number(node.dataset.index)]; }).filter(Boolean);
    selected.forEach(function (candidate) {
      if (candidate.path === "__profile__") {
        profile = ResumeCopilotProfile.ensureProfile(ResumeCopilotProfile.merge(profile, candidate.value));
        return;
      }
      const path = candidate.path === "personal.national_id" ? "sensitive.national_id" : candidate.path;
      ResumeCopilotProfile.setPath(profile, path, candidate.value);
      profile.provenance[path] = { sourceDocument: candidate.sourceDocument, confidence: candidate.confidence, updatedAt: new Date().toISOString() };
    });
    profile.imported_materials = (profile.imported_materials || []).map(function (material) {
      return Object.assign({}, material, {
        candidates: (material.candidates || []).map(function (candidate) {
          const applied = selected.some(function (item) {
            return item.path === candidate.path && item.sourceDocument === candidate.sourceDocument && item.value === candidate.value;
          });
          return applied ? Object.assign({}, candidate, { applied: true }) : candidate;
        })
      });
    });
    render();
    show(importStatus, "已应用 " + selected.length + " 个候选，请检查表单后保存。", false);
  }

  document.getElementById("documents").addEventListener("change", async function (event) {
    try {
      const result = await ResumeCopilotDocuments.importFiles(event.target.files);
      pendingCandidates = result.candidates;
      renderCandidates();
      const extractedDocuments = result.documents.filter(function (document) { return document.extractedText; });
      extractedText.value = extractedDocuments.map(function (document) {
        return "===== " + document.name + " =====\n" + document.extractedText;
      }).join("\n\n");
      extractedTextPanel.hidden = !extractedText.value;
      const warning = result.warnings.length ? " 注意：" + Array.from(new Set(result.warnings)).join(" ") : "";
      const detail = result.documents.map(function (document) {
        return document.name + "：" + (document.extractedCharacters || 0) + " 字，" + (document.extractionMethod || "已读取");
      }).join("；");
      show(importStatus, "已从 " + result.documents.length + " 个文件提取 " + pendingCandidates.length + " 个候选。" + detail + warning, Boolean(result.warnings.length));
      profile = readForm();
      if (!Array.isArray(profile.imported_materials)) profile.imported_materials = [];
      result.documents.forEach(function (document) {
        const material = Object.assign({}, document, {
          warnings: result.warnings.slice(),
          candidates: result.candidates.filter(function (candidate) { return candidate.sourceDocument === document.name; })
        });
        const existingIndex = profile.imported_materials.findIndex(function (item) {
          return item.name === material.name && item.size === material.size;
        });
        if (existingIndex >= 0) profile.imported_materials[existingIndex] = material;
        else profile.imported_materials.push(material);
      });
      result.documents.forEach(function (document) {
        if (!profile.attachments.some(function (item) { return item.name === document.name; })) {
          const attachment = Object.assign({}, document);
          delete attachment.extractedText;
          profile.attachments.push(attachment);
        }
      });
      renderSavedMaterials();
      await persistProfile(unlockedPassword ? "材料记录和资料已自动保存到本机" : "材料已读取。请应用候选后点击“加密保存资料”");
    } catch (error) { show(importStatus, "导入失败：" + error.message, true); }
    event.target.value = "";
  });
  applyCandidatesButton.addEventListener("click", async function () {
    await applyCandidates();
    if (unlockedPassword) await persistProfile("已应用候选并自动保存资料");
  });

  form.addEventListener("input", scheduleAutoSave);
  form.addEventListener("change", scheduleAutoSave);

  document.getElementById("applyJson").addEventListener("click", function () {
    try {
      profile = ResumeCopilotProfile.ensureProfile(JSON.parse(jsonBox.value));
      render();
      show(status, "JSON 已应用到资料表单，请检查后保存。", false);
    } catch (error) { show(status, "JSON 无法应用：" + error.message, true); }
  });

  document.getElementById("sample").addEventListener("click", async function () {
    try {
      profile = ResumeCopilotProfile.ensureProfile(await (await fetch("profile-example.json")).json());
      render();
      show(status, "已载入虚拟示例。请替换为真实信息后再保存。", false);
    } catch (error) { show(status, "示例加载失败：" + error.message, true); }
  });

  document.getElementById("export").addEventListener("click", function () {
    if (!unlockedPassword && !autoUnlocked) {
      show(status, "资料库当前处于锁定状态，请先输入主密码并点击“解密现有资料”，再导出备份。", true);
      return;
    }
    const data = JSON.stringify(readForm(), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "candidate-profile.json";
    link.click();
    URL.revokeObjectURL(url);
    show(status, "已导出未加密 JSON 备份。请妥善保存，不要把真实资料提交到 GitHub。", false);
  });

  form.addEventListener("click", function (event) {
    const addKey = event.target.dataset.addCollection;
    const removeKey = event.target.dataset.removeCollection;
    if (addKey) {
      profile = readForm();
      profile[addKey].push({});
      render();
    }
    if (removeKey) {
      profile = readForm();
      profile[removeKey].splice(Number(event.target.dataset.index), 1);
      render();
    }
  });

  document.getElementById("save").addEventListener("click", async function () {
    try {
      if (password.value.length < 8 && !autoUnlocked) throw new Error("主密码至少需要 8 位");
      if (autoUnlocked && !autoUnlock.checked && password.value.length < 8) throw new Error("关闭自动解锁前，请输入主密码以重新加密保存资料");
      await persistProfile();
      show(status, "资料已在本机加密保存，共保存 " + Object.keys(profile.provenance || {}).length + " 个来源记录。", false);
    } catch (error) { show(status, error.message, true); }
  });

  document.getElementById("unlock").addEventListener("click", async function () {
    try {
      const stored = await chrome.storage.local.get("resumeCopilotVault");
      if (!stored.resumeCopilotVault) throw new Error("还没有保存资料库");
      profile = ResumeCopilotProfile.ensureProfile(await ResumeCopilotCrypto.decrypt(stored.resumeCopilotVault, password.value));
      unlockedPassword = password.value;
      autoUnlocked = autoUnlock.checked;
      render();
      restoreImportedMaterials();
      if (autoUnlock.checked) await persistProfile();
      show(status, "解密成功。资料只在当前设置页内存中使用。", false);
    } catch (error) { show(status, "解密失败：" + error.message, true); }
  });

  password.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("unlock").click();
    }
  });

  autoUnlock.addEventListener("change", function () {
    if (!autoUnlock.checked && autoUnlocked && !unlockedPassword) {
      autoUnlock.checked = true;
      show(status, "如需关闭自动解锁，请先输入主密码后再点击保存。", true);
    }
  });

  async function loadInitialProfile() {
    const stored = await chrome.storage.local.get(["resumeCopilotVault", "resumeCopilotAutoVault"]);
    if (stored.resumeCopilotAutoVault) {
      try {
        profile = ResumeCopilotProfile.ensureProfile(await ResumeCopilotCrypto.decryptForDevice(stored.resumeCopilotAutoVault));
        autoUnlocked = true;
        autoUnlock.checked = true;
        render();
        restoreImportedMaterials();
        show(status, "已使用本机自动解锁，旧资料和导入材料已恢复。", false);
        return;
      } catch (error) {
        show(status, "本机自动解锁失败，请输入主密码手动解锁。", true);
      }
    }
    if (stored.resumeCopilotVault) {
      show(status, "检测到本机已有加密资料库。请输入一次主密码并点击“解密现有资料”；勾选自动解锁后以后无需重复输入。", false);
    }
  }

  render();
  loadInitialProfile().catch(function (error) { show(status, "读取本机资料库失败：" + error.message, true); });
})();

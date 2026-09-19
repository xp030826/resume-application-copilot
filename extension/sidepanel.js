(function () {
  "use strict";
  let plan = [];
  let currentProfile = null;
  let currentTab = null;
  const status = document.getElementById("status");
  const planNode = document.getElementById("plan");
  const fillButton = document.getElementById("fill");
  const selectSafeButton = document.getElementById("selectSafe");
  const summary = document.getElementById("summary");
  const draftTarget = document.getElementById("draftTarget");
  const draft = document.getElementById("draft");
  const fillDraftButton = document.getElementById("fillDraft");
  const aiStatus = document.getElementById("aiStatus");

  function showNode(node, message, error) {
    node.textContent = message;
    node.className = "status" + (error ? " error" : "");
  }

  function show(message, error) {
    showNode(status, message, error);
  }

  function isDropdown(item) {
    return item && (item.controlType === "select" || item.controlType === "custom-select");
  }

  async function activeTab() {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const candidate = tabs.find(function (tab) { return tab && tab.id; });
    if (!candidate || !candidate.id) throw new Error("没有找到当前页面，请先打开招聘网页");
    // Re-read the tab after the side panel is focused. Without the tabs
    // permission some Chromium builds return a tab object without `url` here.
    const tab = await chrome.tabs.get(candidate.id);
    const url = tab.url || tab.pendingUrl || "";
    if (!url) throw new Error("无法读取当前页面地址，请重新加载扩展后再试");
    return Object.assign({}, tab, { url: url });
  }

  function pagePermissionPattern(tab) {
    try {
      const parsed = new URL(tab.url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.origin + "/*";
      if (parsed.protocol === "file:") return "file:///*";
    } catch (error) {
      // The caller will produce the user-facing invalid-page message.
    }
    return "";
  }

  async function requestPageAccess(tab) {
    const pattern = pagePermissionPattern(tab);
    if (!pattern) throw new Error("当前页面地址无效，无法申请网页访问权限");
    if (!chrome.permissions || !chrome.permissions.contains || !chrome.permissions.request) return;
    const alreadyGranted = await chrome.permissions.contains({ origins: [pattern] });
    if (alreadyGranted) return;
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) throw new Error("未获得 " + pattern + " 的访问权限。请在权限提示中点击允许后再扫描");
  }

  async function prepareContentScript(tab) {
    if (!/^https?:\/\/|^file:\/\//i.test(tab.url || "")) {
      throw new Error("当前页面不允许注入扩展脚本（" + (tab.url || "未知页面") + "），请打开招聘官网或本地测试页面");
    }
    await requestPageAccess(tab);
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["lib/field-mapper.js", "content.js"] });
  }

  function render(items) {
    planNode.replaceChildren();
    const matched = items.filter(function (item) { return item.matched; });
    const unresolved = items.length - matched.length;
    const dropdowns = matched.filter(isDropdown);
    const textFields = matched.filter(function (item) { return !isDropdown(item); });
    summary.textContent = "共识别 " + items.length + " 个可编辑字段，文字直填 " + textFields.length + " 个，下拉待确认 " + dropdowns.length + " 个" + (unresolved ? "，未匹配 " + unresolved + " 个" : "");
    selectSafeButton.hidden = dropdowns.length === 0;
    items.forEach(function (item, index) {
      const row = document.createElement("label");
      row.className = "plan-row" + (!item.matched ? " unresolved" : "") + (item.sensitive ? " restricted" : "");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.dataset.index = String(index);
      check.disabled = !item.matched || !isDropdown(item);
      check.checked = Boolean(item.matched && isDropdown(item) && item.confidence >= 0.7);
      const body = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = item.fieldLabel || "未命名字段";
      const value = document.createElement("span");
      value.className = "plan-value";
      value.textContent = item.matched ? (item.autoFilled ? " ✓ 已直接填充 → " : (isDropdown(item) ? " → 建议选择：" : " → ")) + item.value : " → 未找到明确资料";
      const meta = document.createElement("small");
      meta.textContent = item.matched ? (item.path + " · " + Math.round(item.confidence * 100) + "% · " + (item.sourceDocument || "资料库")) : (item.reason || "请手动填写");
      body.append(title, value, meta);
      row.append(check, body);
      planNode.append(row);
    });
    fillButton.disabled = dropdowns.length === 0;
    draftTarget.replaceChildren();
    const textTargets = matched.filter(function (item) {
      return item.tag === "textarea" || /自我|介绍|动机|优势|规划|说明|why|motivation|about/i.test(item.fieldLabel || "");
    });
    textTargets.forEach(function (item) {
      const option = document.createElement("option");
      option.value = String(items.indexOf(item));
      option.textContent = item.fieldLabel + " → " + item.path;
      draftTarget.append(option);
    });
    draftTarget.disabled = textTargets.length === 0;
    fillDraftButton.disabled = textTargets.length === 0 || !draft.value.trim();
  }

  function aiContext(profile) {
    return {
      personal: { full_name: profile.personal && profile.personal.full_name, current_city: profile.personal && profile.personal.current_city },
      intent: profile.intent || {},
      education: profile.education || [],
      experience: profile.experience || [],
      projects: profile.projects || [],
      skills: profile.skills || {},
      verified_answers: profile.answers || {}
    };
  }

  document.getElementById("options").addEventListener("click", function () { chrome.runtime.openOptionsPage(); });
  selectSafeButton.addEventListener("click", function () {
    planNode.querySelectorAll("input[type=checkbox]:not(:disabled)").forEach(function (box, index) {
      const item = plan[Number(box.dataset.index)];
      box.checked = Boolean(item && isDropdown(item) && item.matched && item.confidence >= 0.7);
    });
  });

  document.getElementById("scan").addEventListener("click", async function () {
    try {
      const password = document.getElementById("password").value;
      const stored = await chrome.storage.local.get(["resumeCopilotVault", "resumeCopilotAutoVault"]);
      let profile = null;
      if (stored.resumeCopilotAutoVault) {
        try { profile = await ResumeCopilotCrypto.decryptForDevice(stored.resumeCopilotAutoVault); } catch (error) { profile = null; }
      }
      if (!profile) {
        if (!password) throw new Error("请输入主密码，或先在资料库设置中开启本机自动解锁");
        if (!stored.resumeCopilotVault) throw new Error("请先在资料库设置中建立并保存个人资料");
        profile = await ResumeCopilotCrypto.decrypt(stored.resumeCopilotVault, password);
      }
      const tab = await activeTab();
      await prepareContentScript(tab);
      const response = await chrome.tabs.sendMessage(tab.id, { type: "resume-copilot-scan", profile: profile });
      currentProfile = profile;
      currentTab = tab;
      plan = response.items || [];
      const textItems = plan.filter(function (item) {
        return item.matched && !isDropdown(item) && item.confidence >= 0.7;
      });
      let textFilled = 0;
      if (textItems.length) {
        const textResponse = await chrome.tabs.sendMessage(tab.id, { type: "resume-copilot-fill", items: textItems });
        textFilled = Number(textResponse && textResponse.filled || 0);
        textItems.forEach(function (item) { item.autoFilled = true; });
      }
      render(plan);
      const dropdownCount = plan.filter(function (item) { return item.matched && isDropdown(item) && item.confidence >= 0.7; }).length;
      show("已直接填充文字字段 " + textFilled + " 个；发现 " + dropdownCount + " 个下拉框，请确认建议选项。");
    } catch (error) {
      show("扫描失败：" + (error.message || error), true);
    }
  });

  fillButton.addEventListener("click", async function () {
    try {
      const selected = Array.from(planNode.querySelectorAll("input:checked")).map(function (box) { return plan[Number(box.dataset.index)]; }).filter(function (item) { return item && isDropdown(item); });
      const tab = await activeTab();
      const response = await chrome.tabs.sendMessage(tab.id, { type: "resume-copilot-fill", items: selected });
      show("已填充 " + response.filled + " 个字段。请人工复核，系统不会提交。");
    } catch (error) {
      show("填充失败：" + (error.message || error), true);
    }
  });

  document.getElementById("generate").addEventListener("click", async function () {
    try {
      if (!currentProfile) throw new Error("请先解锁并扫描当前页面");
      const question = document.getElementById("question").value.trim();
      const jobDescription = document.getElementById("jobDescription").value.trim();
      if (!question) throw new Error("请先填写申请问题");
      const config = currentProfile.ai || {};
      if (!config.api_key) throw new Error("请先在资料库设置中配置自己的 API Key");
      if (!config.endpoint || !/^https?:\/\//i.test(config.endpoint)) throw new Error("AI 接口地址必须是 http(s) 地址");
      showNode(aiStatus, "正在生成草稿…");
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + config.api_key },
        body: JSON.stringify({
          model: config.model || "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            { role: "system", content: "你是求职申请助手。只能根据候选人的真实资料写作，不得编造经历、数字、技能或证书。输出一版简洁、自然、可直接修改的中文申请答案。" },
            { role: "user", content: JSON.stringify({ question: question, job_description: jobDescription, candidate_profile: aiContext(currentProfile) }) }
          ]
        })
      });
      if (!response.ok) throw new Error("AI 服务返回 HTTP " + response.status);
      const payload = await response.json();
      const answer = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      if (!answer) throw new Error("AI 服务没有返回可用答案");
      draft.value = String(answer).trim();
      fillDraftButton.disabled = draftTarget.disabled;
      showNode(aiStatus, "草稿已生成，请核对事实后再写入页面。");
    } catch (error) { showNode(aiStatus, "生成失败：" + (error.message || error), true); }
  });

  draft.addEventListener("input", function () { fillDraftButton.disabled = draftTarget.disabled || !draft.value.trim(); });
  fillDraftButton.addEventListener("click", async function () {
    try {
      const item = plan[Number(draftTarget.value)];
      if (!item || !currentTab) throw new Error("请先扫描页面并选择文本框");
      if (!window.confirm("确认把已审核的 AI 草稿写入“" + item.fieldLabel + "”吗？")) return;
      const response = await chrome.tabs.sendMessage(currentTab.id, { type: "resume-copilot-fill", items: [Object.assign({}, item, { value: draft.value.trim() })] });
      showNode(aiStatus, response.filled ? "草稿已写入页面，请继续人工复核。" : "没有写入，请检查页面字段。", !response.filled);
    } catch (error) { showNode(aiStatus, "写入失败：" + (error.message || error), true); }
  });
})();

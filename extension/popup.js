(function () {
  "use strict";
  let plan = [];
  const status = document.getElementById("status");
  const planNode = document.getElementById("plan");
  const fillButton = document.getElementById("fill");

  function show(message, error) {
    status.textContent = message;
    status.style.color = error ? "#a33a3a" : "#3157a4";
  }

  function activeTab() {
    return chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) { return tabs[0]; });
  }

  function render(items) {
    planNode.replaceChildren();
    items.forEach(function (item, index) {
      const row = document.createElement("label");
      row.className = "plan-row";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.dataset.index = String(index);
      check.checked = !item.sensitive && item.confidence >= 0.7;
      const text = document.createElement("span");
      text.textContent = (item.fieldLabel || "未命名字段") + " → " + item.value;
      const meta = document.createElement("small");
      meta.textContent = item.path + " · 置信度 " + Math.round(item.confidence * 100) + "%";
      if (item.sensitive) { meta.textContent += " · 敏感字段"; meta.className = "sensitive"; }
      text.appendChild(meta); row.append(check, text); planNode.appendChild(row);
    });
    fillButton.disabled = items.length === 0;
  }

  document.getElementById("options").addEventListener("click", function () { chrome.runtime.openOptionsPage(); });
  document.getElementById("scan").addEventListener("click", async function () {
    try {
      const stored = await chrome.storage.local.get("resumeCopilotVault");
      if (!stored.resumeCopilotVault) throw new Error("请先在资料库设置中导入并保存个人资料");
      const profile = await ResumeCopilotCrypto.decrypt(stored.resumeCopilotVault, document.getElementById("password").value);
      const tab = await activeTab();
      const response = await chrome.tabs.sendMessage(tab.id, { type: "resume-copilot-scan", profile: profile });
      plan = response.items || [];
      render(plan);
      show("识别到 " + plan.length + " 个可映射字段，请检查后再填充。");
    } catch (error) { show("扫描失败：" + error.message, true); }
  });
  fillButton.addEventListener("click", async function () {
    try {
      const selected = Array.from(planNode.querySelectorAll("input:checked")).map(function (box) { return plan[Number(box.dataset.index)]; });
      const tab = await activeTab();
      const response = await chrome.tabs.sendMessage(tab.id, { type: "resume-copilot-fill", items: selected });
      show("已填充 " + response.filled + " 个字段。请人工复核，系统不会提交。");
    } catch (error) { show("填充失败：" + error.message, true); }
  });
})();

(function () {
  "use strict";
  const profile = document.getElementById("profile");
  const password = document.getElementById("password");
  const status = document.getElementById("status");
  const file = document.getElementById("file");

  function show(message, error) {
    status.textContent = message;
    status.style.color = error ? "#a33a3a" : "#3157a4";
  }

  document.getElementById("sample").addEventListener("click", async function () {
    profile.value = JSON.stringify(await (await fetch("profile-example.json")).json(), null, 2);
    show("已载入虚拟示例，设置主密码后保存。");
  });
  document.getElementById("import").addEventListener("click", function () { file.click(); });
  file.addEventListener("change", async function () {
    if (!file.files.length) return;
    profile.value = JSON.stringify(JSON.parse(await file.files[0].text()), null, 2);
    show("JSON 已导入。");
  });
  document.getElementById("save").addEventListener("click", async function () {
    try {
      if (password.value.length < 8) throw new Error("主密码至少需要 8 位");
      const parsed = JSON.parse(profile.value);
      const vault = await ResumeCopilotCrypto.encrypt(parsed, password.value);
      await chrome.storage.local.set({ resumeCopilotVault: vault });
      show("资料已在本机加密保存。");
    } catch (error) { show(error.message, true); }
  });
  document.getElementById("unlock").addEventListener("click", async function () {
    try {
      const stored = await chrome.storage.local.get("resumeCopilotVault");
      if (!stored.resumeCopilotVault) throw new Error("还没有保存资料库");
      const parsed = await ResumeCopilotCrypto.decrypt(stored.resumeCopilotVault, password.value);
      profile.value = JSON.stringify(parsed, null, 2);
      show("解密成功。");
    } catch (error) { show("解密失败：" + error.message, true); }
  });
})();

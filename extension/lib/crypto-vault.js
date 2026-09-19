(function (root) {
  "use strict";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const iterations = 250000;
  const autoUnlockDbName = "resume-copilot-device-key";
  const autoUnlockStoreName = "keys";

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach(function (byte) { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, function (char) { return char.charCodeAt(0); });
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encrypt(profile, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const plaintext = encoder.encode(JSON.stringify(profile));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plaintext);
    return { version: 1, kdf: "PBKDF2-SHA256", iterations: iterations, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
  }

  async function decrypt(vault, password) {
    const salt = base64ToBytes(vault.salt);
    const iv = base64ToBytes(vault.iv);
    const key = await deriveKey(password, salt);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, base64ToBytes(vault.ciphertext));
    return JSON.parse(decoder.decode(plaintext));
  }

  function openAutoUnlockDb() {
    return new Promise(function (resolve, reject) {
      const request = indexedDB.open(autoUnlockDbName, 1);
      request.onupgradeneeded = function () { request.result.createObjectStore(autoUnlockStoreName); };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("无法打开本机自动解锁存储")); };
    });
  }

  async function getDeviceKey() {
    const db = await openAutoUnlockDb();
    const existing = await new Promise(function (resolve, reject) {
      const request = db.transaction(autoUnlockStoreName, "readonly").objectStore(autoUnlockStoreName).get("device-key");
      request.onsuccess = function () { resolve(request.result || null); };
      request.onerror = function () { reject(request.error || new Error("无法读取本机自动解锁密钥")); };
    });
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await new Promise(function (resolve, reject) {
      const request = db.transaction(autoUnlockStoreName, "readwrite").objectStore(autoUnlockStoreName).put(key, "device-key");
      request.onsuccess = function () { resolve(); };
      request.onerror = function () { reject(request.error || new Error("无法保存本机自动解锁密钥")); };
    });
    return key;
  }

  async function encryptForDevice(profile) {
    const key = await getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = encoder.encode(JSON.stringify(profile));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plaintext);
    return { version: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
  }

  async function decryptForDevice(vault) {
    if (!vault) return null;
    const key = await getDeviceKey();
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(vault.iv) }, key, base64ToBytes(vault.ciphertext));
    return JSON.parse(decoder.decode(plaintext));
  }

  root.ResumeCopilotCrypto = {
    encrypt: encrypt,
    decrypt: decrypt,
    encryptForDevice: encryptForDevice,
    decryptForDevice: decryptForDevice
  };
})(globalThis);

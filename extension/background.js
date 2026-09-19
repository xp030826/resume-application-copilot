(function () {
  "use strict";
  if (!chrome.sidePanel || !chrome.sidePanel.setPanelBehavior) return;
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () {
    // Older Chromium/Edge builds may not implement action-click side panels.
  });
})();

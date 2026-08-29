/**
 * ============================================================================
 * SevaSetuHub – Client-Side Security Shield (security.js)
 * Blocks casual inspection of source code and DevTools access.
 * ============================================================================
 */
(function () {
  "use strict";

  // 1. Disable Right-Click Context Menu
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    return false;
  });

  // 2. Block DevTools Keyboard Shortcuts
  document.addEventListener("keydown", function (e) {
    var key = e.key || "";
    var code = e.keyCode || 0;

    // F12
    if (code === 123) { e.preventDefault(); return false; }

    // Ctrl+Shift+I (DevTools Elements)
    if (e.ctrlKey && e.shiftKey && (key === "I" || key === "i" || code === 73)) { e.preventDefault(); return false; }

    // Ctrl+Shift+J (DevTools Console)
    if (e.ctrlKey && e.shiftKey && (key === "J" || key === "j" || code === 74)) { e.preventDefault(); return false; }

    // Ctrl+Shift+C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && (key === "C" || key === "c" || code === 67)) { e.preventDefault(); return false; }

    // Ctrl+U (View Source)
    if (e.ctrlKey && !e.shiftKey && (key === "U" || key === "u" || code === 85)) { e.preventDefault(); return false; }

    // Ctrl+S (Save Page)
    if (e.ctrlKey && !e.shiftKey && (key === "S" || key === "s" || code === 83)) { e.preventDefault(); return false; }
  }, true);

  // 3. Detect DevTools Open via window dimension heuristic
  var _devToolsOpen = false;

  function _checkDevTools() {
    var threshold = 160;
    var widthDiff  = window.outerWidth  - window.innerWidth;
    var heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) {
      if (!_devToolsOpen) {
        _devToolsOpen = true;
        _onDevToolsOpen();
      }
    } else {
      _devToolsOpen = false;
    }
  }

  function _onDevToolsOpen() {
    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;font-family:Inter,sans-serif;">' +
      '<div style="text-align:center;padding:2rem;">' +
      '<div style="font-size:4rem;margin-bottom:1rem;">&#128274;</div>' +
      '<h1 style="color:#f87171;font-size:1.5rem;font-weight:700;margin-bottom:0.5rem;">Access Restricted</h1>' +
      '<p style="color:#94a3b8;font-size:0.95rem;">Developer tools are not permitted on this platform.</p>' +
      '<p style="color:#64748b;font-size:0.8rem;margin-top:1rem;">Please close DevTools and refresh the page to continue.</p>' +
      '</div></div>';
  }

  setInterval(_checkDevTools, 1000);

  // 4. Disable drag-drop to prevent DOM drag inspection
  document.addEventListener("dragstart", function (e) {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  });

})();

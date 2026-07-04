function buildBootBannerSilencer() {
  return `(function __ylSilenceBootUI() {
    if (window.__ylSilenceBootOn) return;
    window.__ylSilenceBootOn = !0;
    try {
      if (window.__ylBannerObs) { window.__ylBannerObs.disconnect(); window.__ylBannerObs = null; }
      if (window.__ylBannerTick) { clearInterval(window.__ylBannerTick); window.__ylBannerTick = null; }
      if (window._ylVldTimer) { clearInterval(window._ylVldTimer); window._ylVldTimer = null; }
    } catch (_e) {}
    function killBanner() {
      var el = document.getElementById("ylBootBanner");
      if (el) el.remove();
    }
    killBanner();
    try {
      if (!document.getElementById("ylBootBannerKillStyle")) {
        var st = document.createElement("style");
        st.id = "ylBootBannerKillStyle";
        st.textContent = "#ylBootBanner{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}";
        (document.head || document.documentElement).appendChild(st);
      }
    } catch (_e) {}
    try {
      if (!Node.prototype.__ylBannerHooked) {
        Node.prototype.__ylBannerHooked = !0;
        var _append = Node.prototype.appendChild;
        var _insert = Node.prototype.insertBefore;
        function blockBanner(node) {
          if (!node || node.id !== "ylBootBanner") return node;
          try { node.style.setProperty("display", "none", "important"); } catch (_e) {}
          return node;
        }
        Node.prototype.appendChild = function(child) {
          return _append.call(this, blockBanner(child));
        };
        Node.prototype.insertBefore = function(child, ref) {
          return _insert.call(this, blockBanner(child), ref);
        };
      }
    } catch (_e) {}
    try {
      document.querySelectorAll("script[data-yl-boot]").forEach(function (s) { s.remove(); });
    } catch (_e) {}
    try {
      ["yl_license_until", "yl_license_ver", "yl_cache_update_until", "yl_cache_license_until", "yl_cache_app_code", "yl_cache_app_sha", "yl_cache_manifest_ver", "yl_cache_app_at"].forEach(function (k) {
        try { localStorage.removeItem(k); } catch (_e) {}
      });
    } catch (_e) {}
    window.__ylHideBootBanner = killBanner;
  })();`;
}

function buildLicenseGate(baseUrl) {
  const base = String(baseUrl || "https://sanguosha-stratagem.onrender.com").replace(/\/$/, "");
  return `
  var __YL_BASE = "${base}";
  function __ylHideBootBanner() {
    var el = document.getElementById("ylBootBanner");
    if (el) el.remove();
  }
  window.__ylCloudBase = __YL_BASE;
  window.__ylRenewLicense = async function () { return { ok: true }; };
  window.__ylLicensed = function () { return true; };
  window.__ylHideBootBanner = __ylHideBootBanner;
  __ylHideBootBanner();
`;
}

module.exports = { buildLicenseGate, buildBootBannerSilencer };

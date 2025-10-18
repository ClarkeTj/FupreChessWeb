/* ==========================================================
   FUPRE Chess Club – Install Controller (Responsive Final)
   ----------------------------------------------------------
   • Shows Install CTA 7s after splash completes
   • No “Update App” logic (removed)
   • Auto-resizes CTA smoothly when text changes
   • Auto-refreshes when new SW activates
   ========================================================== */

(() => {
  // ---------- Elements ----------
  const cta = document.getElementById("install-btn");
  const ctaLabel = cta?.querySelector(".label");
  const toast = document.getElementById("toast");

  // ---------- Config ----------
  const SHOW_DELAY_AFTER_SPLASH_MS = 7000;
  const LS_PWA_FLAG = "fcc_pwa_installed_v1";
  const ACTION = { idle: "idle", installing: "installing" };
  let state = ACTION.idle;

  let deferredPrompt = null;
  let splashDoneAt = null;

  // ---------- Utilities ----------
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const show = () => {
    if (!cta) return;
    cta.classList.remove("is-hidden");
    cta.classList.add("show-slide", "pulse-loop");
  };

  const hide = () => {
    if (!cta) return;
    cta.classList.add("is-hidden");
  };

  function setCTAInstall() {
    if (!cta) return;
    cta.dataset.mode = "install";
    cta.classList.remove("is-update");
    cta.classList.add("is-install");
    if (ctaLabel) ctaLabel.textContent = "Install App";
  }

  function showToast(msg, type = "info") {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `show ${type}`;
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  async function clearStaleCachesIfNeeded() {
    const flag = localStorage.getItem(LS_PWA_FLAG) === "true";
    if (flag && !isStandalone()) {
      localStorage.removeItem(LS_PWA_FLAG);
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith("fcc-") || k.startsWith("fcc"))
            .map((k) => caches.delete(k))
        );
      }
    }
  }

  // ---------- Splash timing ----------
  document.addEventListener("fcc:splash-done", () => {
    splashDoneAt = Date.now();
    hide();
    if (cta?.dataset.mode === "install") scheduleInstallCTA();
  });

  function scheduleInstallCTA() {
    if (!cta) return;
    setCTAInstall();

    const ready = () => {
      if (state !== ACTION.idle) return;
      show();
    };

    if (!splashDoneAt) {
      document.addEventListener(
        "fcc:splash-done",
        () => setTimeout(ready, SHOW_DELAY_AFTER_SPLASH_MS),
        { once: true }
      );
    } else {
      const elapsed = Date.now() - splashDoneAt;
      const wait = Math.max(0, SHOW_DELAY_AFTER_SPLASH_MS - elapsed);
      setTimeout(ready, wait);
    }
  }

  // ---------- Install flow ----------
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (!isStandalone()) {
      setCTAInstall();
      scheduleInstallCTA();
    }
  });

  window.addEventListener("appinstalled", () => {
    localStorage.setItem(LS_PWA_FLAG, "true");
    showToast("✅ Installation successful!", "success");
    if (ctaLabel) ctaLabel.textContent = "Installation successful!";
    state = ACTION.idle;
    setTimeout(() => hide(), 1500);
  });

  async function doInstall() {
    if (!deferredPrompt) {
      showToast("Install not available yet. Try browser menu → ‘Install App’", "warn");
      return;
    }
    if (state !== ACTION.idle) return;
    state = ACTION.installing;

    try {
      cta.disabled = true;
      cta.classList.add("is-busy", "adjust-width");
      if (ctaLabel) ctaLabel.textContent = "Waiting for confirmation…";

      await deferredPrompt.prompt();
      const outcome = await deferredPrompt.userChoice;
      deferredPrompt = null;

      if (outcome?.outcome === "accepted") {
        if (ctaLabel) ctaLabel.textContent = "Installing…";
      } else {
        cta.disabled = false;
        cta.classList.remove("is-busy");
        if (ctaLabel) ctaLabel.textContent = "Install App";
        state = ACTION.idle;
      }
    } catch (err) {
      console.error(err);
      showToast("Install failed. Please try again.", "error");
      cta.disabled = false;
      cta.classList.remove("is-busy");
      if (ctaLabel) ctaLabel.textContent = "Install App";
      state = ACTION.idle;
    } finally {
      // Smooth width transition for text changes
      cta.style.transition = "width 0.25s ease, padding 0.25s ease";
    }
  }

  // ---------- Click handler ----------
  if (cta) {
    cta.addEventListener("click", () => {
      const mode = cta.dataset.mode;
      if (mode === "install") return doInstall();
    });
  }

  // ---------- SW auto-update ----------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }

  // ---------- Boot ----------
  (async function boot() {
    hide();
    await clearStaleCachesIfNeeded();

    if (!isStandalone()) {
      setCTAInstall();
      scheduleInstallCTA();
    } else {
      hide();
    }
  })();
})();

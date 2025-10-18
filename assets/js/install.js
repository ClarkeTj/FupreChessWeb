/* ==========================================================
   FUPRE Chess Club – Install Controller (Stable Prompt Update)
   ----------------------------------------------------------
   • Install App works normally (Chrome prompt restored)
   • Detects new SW → prompts user to reload
   • One-time reload after confirmation (no loop)
   ========================================================== */

(() => {
  const cta = document.getElementById("install-btn");
  const ctaLabel = cta?.querySelector(".label");
  const toast = document.getElementById("toast");

  const SHOW_DELAY_AFTER_SPLASH_MS = 7000;
  const LS_PWA_FLAG = "fcc_pwa_installed_v1";
  const ACTION = { idle: "idle", installing: "installing" };
  let state = ACTION.idle;
  let deferredPrompt = null;
  let splashDoneAt = null;
  let updatePromptShown = false;

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
    cta.classList.add("is-install");
    if (ctaLabel) ctaLabel.textContent = "Install App";
  }

  function showToast(msg, type = "info") {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `show ${type}`;
    setTimeout(() => toast.classList.remove("show"), 3000);
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
      showToast(
        "You may already have the latest version installed. Check your browser menu and select ‘Open in App’ or ‘Install App’ if available.",
        "warn"
      );
      return;
    }
    if (state !== ACTION.idle) return;
    state = ACTION.installing;

    try {
      cta.disabled = true;
      cta.classList.add("is-busy");
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
    }
  }

  // ✅ FIX: Restore Install Button Click Handler
  if (cta) {
    cta.addEventListener("click", () => {
      const mode = cta.dataset.mode;
      if (mode === "install") doInstall();
    });
  }

  // ---------- SW update handling ----------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (
        event.data &&
        event.data.type === "NEW_VERSION_AVAILABLE" &&
        !updatePromptShown
      ) {
        updatePromptShown = true;
        const confirmReload = confirm(
          "A new update is available! Click OK to refresh and apply the latest version."
        );
        if (confirmReload) {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg && reg.waiting) {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          });
        }
      }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (updatePromptShown) {
        updatePromptShown = false;
        window.location.reload();
      }
    });
  }

  // ---------- Splash + Install CTA ----------
  document.addEventListener("fcc:splash-done", () => {
    splashDoneAt = Date.now();
    hide();
    if (cta?.dataset.mode === "install") scheduleInstallCTA();
  });

  function scheduleInstallCTA() {
    const ready = () => {
      if (state === ACTION.idle) show();
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

  // ---------- Boot ----------
  (async function boot() {
    hide();
    if (!isStandalone()) {
      setCTAInstall();
      scheduleInstallCTA();
    } else {
      hide();
    }
  })();
})();

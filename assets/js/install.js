/* ==========================================================
   FUPRE Chess Club – Install / Update Controller 
   ----------------------------------------------------------
   • Restores splash logic integrity
   • Adds slide-in animation for Install/Update CTA
   • Adds glow + pulse effects for CTA visibility
   • Full compatibility with PWA standalone replay logic
   ========================================================== */

(() => {
  const cta = document.getElementById("install-btn");
  const ctaLabel = cta?.querySelector(".label");
  const toast = document.getElementById("toast");

  const SHOW_DELAY_AFTER_SPLASH_MS = 7000;
  const LS_PWA_FLAG = "fcc_pwa_installed_v1";
  const ACTION = { idle: "idle", installing: "installing", updating: "updating" };
  let state = ACTION.idle;
  let deferredPrompt = null;
  let swRegistration = null;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const show = () => {
    if (!cta) return;
    cta.classList.remove("is-hidden");
    cta.classList.add("show-slide", "pulse-loop");
  };
  const hide = () => cta && cta.classList.add("is-hidden");

  function setCTA(mode) {
    if (!cta) return;
    cta.dataset.mode = mode;
    cta.classList.remove("is-install", "is-update");
    cta.classList.add(mode === "install" ? "is-install" : "is-update");
    ctaLabel.textContent = mode === "install" ? "Install App" : "Update App";
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
        await Promise.all(keys.filter(k => k.startsWith("fcc-")).map(k => caches.delete(k)));
      }
    }
  }

  async function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    swRegistration = await navigator.serviceWorker.getRegistration();
    if (!swRegistration) return;

    if (swRegistration.waiting) scheduleCTA("update");

    swRegistration.addEventListener("updatefound", () => {
      const newWorker = swRegistration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          scheduleCTA("update");
        }
      });
    });

    navigator.serviceWorker.addEventListener("message", (evt) => {
      if (evt?.data === "UPDATE_AVAILABLE") scheduleCTA("update");
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (state === ACTION.updating) {
        sessionStorage.setItem("showUpdateSuccess", "true");
        location.reload();
      }
    });

    if (sessionStorage.getItem("showUpdateSuccess") === "true") {
      sessionStorage.removeItem("showUpdateSuccess");
      setTimeout(() => showToast("✅ App updated successfully!", "success"), 600);
    }
  }

  let splashDoneAt = null;
  document.addEventListener("fcc:splash-done", () => {
    splashDoneAt = Date.now();
    hide();
    if (cta.dataset.mode) scheduleCTA(cta.dataset.mode);
  });

  function scheduleCTA(mode) {
    if (!cta) return;
    setCTA(mode);
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

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone()) scheduleCTA("install");
  });

  window.addEventListener("appinstalled", () => {
    localStorage.setItem(LS_PWA_FLAG, "true");
    showToast("✅ Installation successful!", "success");
    state = ACTION.idle;
    hide();
  });

  async function doInstall() {
    if (!deferredPrompt) {
      showToast("Install not available yet. Try browser menu → Install App", "warn");
      return;
    }
    if (state !== ACTION.idle) return;
    state = ACTION.installing;

    try {
      cta.disabled = true;
      cta.classList.add("is-busy");
      ctaLabel.textContent = "Waiting for confirmation…";
      await deferredPrompt.prompt();
      const outcome = await deferredPrompt.userChoice;
      deferredPrompt = null;

      if (outcome?.outcome === "accepted") {
        ctaLabel.textContent = "Installing…";
      } else {
        cta.disabled = false;
        cta.classList.remove("is-busy");
        ctaLabel.textContent = "Install App";
        state = ACTION.idle;
      }
    } catch (err) {
      showToast("Install failed. Please try again.", "error");
      cta.disabled = false;
      cta.classList.remove("is-busy");
      ctaLabel.textContent = "Install App";
      state = ACTION.idle;
    }
  }

  async function doUpdate() {
    if (state !== ACTION.idle) return;
    if (!swRegistration)
      swRegistration = await navigator.serviceWorker.getRegistration();
    const waiting = swRegistration?.waiting;
    if (!waiting) return;

    state = ACTION.updating;
    cta.disabled = true;
    cta.classList.add("is-busy");
    ctaLabel.textContent = "Updating…";
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  if (cta) {
    cta.addEventListener("click", () => {
      const mode = cta.dataset.mode;
      if (mode === "install") return doInstall();
      if (mode === "update") return doUpdate();
    });
  }

  (async function boot() {
    hide();
    await clearStaleCachesIfNeeded();
    await setupServiceWorker();

    if (isStandalone()) {
      hide();
    } else {
      scheduleCTA("install");
      if (deferredPrompt) scheduleCTA("install");
    }

    if (swRegistration?.waiting) scheduleCTA("update");
  })();
})();

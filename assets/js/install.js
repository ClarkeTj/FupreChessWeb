// install.js — unified install + update progress animation
let deferredPrompt = null;

const installBtn = document.getElementById("install-btn");
const toast = document.getElementById("toast");
const hero = document.querySelector(".pc-hero") || document.querySelector(".hero");

// ---------- Helpers ----------
function showToast(msg, type = "info") {
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function moveButtonForMobile() {
  if (window.innerWidth <= 768 && hero && installBtn) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("hero-install-wrapper");
    hero.insertAdjacentElement("afterend", wrapper);
    wrapper.appendChild(installBtn);
  }
}

function showInstallButtonWithDelay() {
  setTimeout(() => {
    installBtn.style.display = "inline-flex";
    installBtn.classList.add("visible", "show-slide");
    installBtn.textContent = "📲 Install App";
  }, 2000);
}

function hideInstallButton() {
  installBtn.style.display = "none";
  installBtn.classList.remove("visible", "show-slide", "update-glow", "loading");
}

// ---------- Initial Setup ----------
document.addEventListener("DOMContentLoaded", () => {
  moveButtonForMobile();
  if (isStandalone()) hideInstallButton();
});

// ---------- INSTALL FLOW ----------
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone()) showInstallButtonWithDelay();
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  // Waiting for Chrome prompt
  installBtn.innerHTML = "📲 Waiting for confirmation…";
  installBtn.disabled = true;
  installBtn.classList.add("waiting");
  showToast("🕓 Waiting for install confirmation…");

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      // Transition to installing view
      installBtn.classList.remove("waiting");
      installBtn.disabled = true;
      installBtn.classList.add("loading");
      installBtn.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;">
          <span>📲 Installing…</span>
          <div class="install-progress"></div>
        </div>
      `;

      const bar = installBtn.querySelector(".install-progress");
      requestAnimationFrame(() => {
        bar.style.opacity = "1";
        bar.style.width = "100%";
      });

      showToast("📲 Installing app…");

      setTimeout(() => {
        showToast("✅ App installed successfully!", "success");
        installBtn.textContent = "Installed ✓";
        setTimeout(hideInstallButton, 1200);
      }, 1800);
    } else {
      installBtn.classList.remove("waiting");
      installBtn.textContent = "📲 Install App";
      installBtn.disabled = false;
      showToast("❌ Installation canceled.", "warn");
    }
  } catch (err) {
    console.error("[PWA] Install failed:", err);
    installBtn.classList.remove("waiting");
    installBtn.textContent = "📲 Install App";
    installBtn.disabled = false;
    showToast("⚠️ Installation failed. Please try again.", "error");
  } finally {
    deferredPrompt = null;
  }
});

window.addEventListener("appinstalled", hideInstallButton);

// ---------- UPDATE FLOW ----------
function showUpdatePrompt() {
  installBtn.style.display = "inline-flex";
  installBtn.classList.add("show-slide", "update-glow");
  installBtn.disabled = false;
  installBtn.textContent = "🚀 Update App";

  installBtn.onclick = () => {
    sessionStorage.setItem("manualUpdate", "true");

    installBtn.classList.remove("update-glow");
    installBtn.classList.add("loading");
    installBtn.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;">
        <span>🚀 Updating…</span>
        <div class="install-progress"></div>
      </div>
    `;

    const bar = installBtn.querySelector(".install-progress");
    requestAnimationFrame(() => {
      bar.style.opacity = "1";
      bar.style.width = "100%";
    });

    showToast("Updating app…");

    // Ask SW to activate new version
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.waiting) reg.waiting.postMessage({ action: "skipWaiting" });
    });
  };
}

// ---------- SERVICE WORKER UPDATE DETECTION ----------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;
    if (reg.waiting) showUpdatePrompt();

    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdatePrompt();
        }
      });
    });
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data === "updateAvailable") {
      showUpdatePrompt();
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    const manuallyTriggered = sessionStorage.getItem("manualUpdate") === "true";
    if (manuallyTriggered) {
      // Delay slightly for SW to finish takeover
      setTimeout(() => {
        showToast("✅ App updated successfully! You're now on the latest version.", "success");
        installBtn.classList.remove("loading");
        installBtn.textContent = "Updated ✓";
        sessionStorage.removeItem("manualUpdate");
        setTimeout(hideInstallButton, 1200);
      }, 1000);
    }
  });
}

// install.js — with visual progress bar
let deferredPrompt = null;

const installBtn = document.getElementById("install-btn");
const toast = document.getElementById("toast");
const hero = document.querySelector(".pc-hero") || document.querySelector(".hero");

// Create progress bar inside the button
const progressBar = document.createElement("div");
progressBar.classList.add("install-progress");
installBtn.appendChild(progressBar);

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
  installBtn.classList.remove("visible", "show-slide", "update-glow");
}

// ---------- Initial Setup ----------
document.addEventListener("DOMContentLoaded", () => {
  moveButtonForMobile();
  if (isStandalone()) hideInstallButton();
});

// ---------- Install Flow ----------
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone()) showInstallButtonWithDelay();
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  // Step 1: Enter waiting state (for Chrome popup)
  installBtn.innerHTML = '📲 Waiting for confirmation…';
  installBtn.disabled = true;
  installBtn.classList.add("waiting");
  showToast("🕓 Waiting for install confirmation…");

  try {
    // Show Chrome install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Step 2: Handle outcome
    if (outcome === "accepted") {
      installBtn.classList.remove("waiting");
      installBtn.disabled = true;
      installBtn.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <span>📲 Installing…</span>
          <div class="install-progress"></div>
        </div>
      `;

      // Animate the progress bar
      const bar = installBtn.querySelector(".install-progress");
      bar.style.opacity = "1";
      bar.style.transition = "width 1.5s ease";
      bar.style.width = "100%";
      showToast("📲 Installing app…");

      // Simulate the visual installation
      setTimeout(() => {
        showToast("✅ App installed successfully!", "success");
        installBtn.innerHTML = "Installed ✓";
        setTimeout(hideInstallButton, 1200);
      }, 1800);
    } else {
      // User canceled install
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

window.addEventListener("appinstalled", () => hideInstallButton());

// ---------- Update Flow ----------
let userInitiatedUpdate = false;

function showUpdatePrompt() {
  installBtn.style.display = "inline-flex";
  installBtn.classList.add("show-slide", "update-glow");
  installBtn.disabled = false;
  installBtn.textContent = "🚀 Update App";
  installBtn.appendChild(progressBar);

  installBtn.onclick = () => {
    userInitiatedUpdate = true;
    sessionStorage.setItem("manualUpdate", "true");

    installBtn.classList.remove("update-glow");
    installBtn.classList.add("loading");
    installBtn.innerHTML = '🚀 Updating…';
    installBtn.appendChild(progressBar);
    showToast("Updating app…");

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.waiting) reg.waiting.postMessage({ action: "skipWaiting" });
    });

    // allow SW to activate before reload
    setTimeout(() => location.reload(), 1500);
  };
}

// ---------- Service Worker Update Detection ----------
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
      setTimeout(() => {
        installBtn.classList.remove("loading");
        showToast("✅ App updated successfully! You're now on the latest version.", "success");
        sessionStorage.removeItem("manualUpdate");
      }, 800);
    }
  });
}

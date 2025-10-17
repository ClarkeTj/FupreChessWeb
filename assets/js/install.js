let deferredPrompt = null;

const installBtn = document.getElementById("install-btn");
const toast = document.getElementById("toast");
const hero = document.querySelector(".pc-hero") || document.querySelector(".hero");

// Create one reusable progress bar element
const progressBar = document.createElement("div");
progressBar.classList.add("install-progress");

// ---------- Helpers ----------
function showToast(msg, type = "info") {
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
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
  }, 5000);
}

function hideInstallButton() {
  installBtn.style.display = "none";
  installBtn.classList.remove(
    "visible",
    "show-slide",
    "update-glow",
    "loading"
  );
}

// ---------- Initial Setup ----------
document.addEventListener("DOMContentLoaded", () => {
  moveButtonForMobile();
  if (isStandalone()) hideInstallButton();

  //  Show update success toast AFTER reload
  if (sessionStorage.getItem("showUpdateSuccess") === "true") {
    setTimeout(() => {
      showToast(
        "✅ App updated successfully! You're now on the latest version.",
        "success"
      );
      sessionStorage.removeItem("showUpdateSuccess");
    }, 800);
  }
});

// ---------- INSTALL FLOW ----------
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone()) showInstallButtonWithDelay();
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  installBtn.textContent = "📲 Waiting for confirmation…";
  installBtn.disabled = true;
  installBtn.classList.add("waiting");
  showToast("🕓 Waiting for install confirmation…");

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      installBtn.classList.remove("waiting");
      installBtn.disabled = true;
      installBtn.classList.add("loading");
      installBtn.textContent = "📲 Installing…";

      installBtn.appendChild(progressBar);
      progressBar.style.opacity = "1";
      progressBar.style.width = "0%";

      requestAnimationFrame(() => {
        progressBar.style.transition = "width 1.8s ease";
        progressBar.style.width = "100%";
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
    installBtn.textContent = "🚀 Updating…";

    installBtn.appendChild(progressBar);
    progressBar.style.opacity = "1";
    progressBar.style.width = "0%";

    requestAnimationFrame(() => {
      progressBar.style.transition = "width 1.8s ease";
      progressBar.style.width = "100%";
    });

    showToast("Updating app…");

    // Ask SW to activate new version
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ action: "skipWaiting" });

        //  Wait a bit for progress animation, then reload automatically
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // If no waiting worker, just force a refresh to pull updates
        setTimeout(() => window.location.reload(), 1500);
      }
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
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          showUpdatePrompt();
        }
      });
    });
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data === "updateAvailable") showUpdatePrompt();
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    const manuallyTriggered = sessionStorage.getItem("manualUpdate") === "true";
    if (manuallyTriggered) {
      //  Show toast AFTER reload completes
      sessionStorage.setItem("showUpdateSuccess", "true");
      sessionStorage.removeItem("manualUpdate");
    }
  });
}

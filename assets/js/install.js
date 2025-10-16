// install.js 
let deferredPrompt;
const installBtn = document.getElementById("install-btn");
const toast = document.getElementById("toast");

// === Helper: Toast Notification ===
function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// === Handle beforeinstallprompt ===
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.add("visible");
});

// === Handle install click ===
installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  installBtn.disabled = true;
  installBtn.innerHTML = `<span class="spinner"></span> Installing…`;
  showToast("📲 Installing app…");

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      showToast("✅ App installed successfully!", "success");
      installBtn.innerHTML = "✅ Installed!";
    } else {
      showToast("❌ Installation canceled.", "warn");
      installBtn.innerHTML = "📲 Install App";
    }
  } catch (err) {
    console.error("[PWA] Install failed:", err);
    showToast("⚠️ Installation failed. Please try again.", "error");
  } finally {
    deferredPrompt = null;
    setTimeout(() => {
      installBtn.classList.remove("visible");
      installBtn.disabled = false;
      installBtn.innerHTML = "📲 Install App";
    }, 3000);
  }
});

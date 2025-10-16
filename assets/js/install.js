// install.js — Fupre Chess Club PWA installer
let deferredPrompt;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "block";
});

installBtn.addEventListener("click", async () => {
  installBtn.style.display = "none";
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log("[PWA] Install prompt:", outcome);
  deferredPrompt = null;
});

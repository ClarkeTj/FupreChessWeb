// ==========================
// Theme + Navbar Logic
// ==========================


document.addEventListener("DOMContentLoaded", () => {
  const darkToggle = document.getElementById("dark-toggle");
  const hamburger  = document.getElementById("hamburger");
  const navLinks   = document.getElementById("nav-links");

  // --- Mobile menu toggle ---
  function toggleMenu(forceOpen) {
    if (!hamburger || !navLinks) return;

    const shouldOpen =
      typeof forceOpen === "boolean"
        ? forceOpen
        : !navLinks.classList.contains("show");

    // Toggle menu visibility
    navLinks.classList.toggle("show", shouldOpen);
    hamburger.classList.toggle("active", shouldOpen);
    hamburger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");

    // Animate + swap icon
    hamburger.style.transition = "transform 0.3s ease";
    hamburger.style.transform = "rotate(180deg)";

    setTimeout(() => {
      hamburger.textContent = shouldOpen ? "✖" : "☰";
      hamburger.style.transform = "rotate(0deg)";
    }, 150); // swap mid-spin
  }

  // A11y attributes
  hamburger?.setAttribute("aria-controls", "nav-links");
  hamburger?.setAttribute("aria-expanded", "false");

  // Click to toggle
  hamburger?.addEventListener("click", () => toggleMenu());

  // Close when a nav link is clicked
  navLinks?.addEventListener("click", (e) => {
    if (e.target.closest("a")) toggleMenu(false);
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleMenu(false);
  });

  // Close on click outside
  document.addEventListener("click", (e) => {
    if (!navLinks?.classList.contains("show")) return;
    const inside = navLinks.contains(e.target) || hamburger?.contains(e.target);
    if (!inside) toggleMenu(false);
  });

  // Reset menu when resizing to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) toggleMenu(false);
  });

  // --- Dark mode logic ---
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }

  darkToggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
});




// ==========================
// Chess Quotes Generator
// ==========================
function generateQuote() {
  const quotes = [
    { text: "When you see a good move, look for a better one.", author: "Emanuel Lasker" },
    { text: "The beauty of a move lies not in its appearance but in the thought behind it.", author: "Aaron Nimzowitsch" },
    { text: "Chess is the gymnasium of the mind.", author: "Blaise Pascal" },
    { text: "Tactics flow from a superior position.", author: "Bobby Fischer" },
    { text: "Even a poor plan is better than no plan at all.", author: "Mikhail Chigorin" },
    { text: "In life, as in chess, forethought wins.", author: "Charles Buxton" },
    { text: "You must take your opponent into a deep dark forest where 2+2=5...", author: "Mikhail Tal" },
    { text: "One bad move nullifies forty good ones.", author: "Horowitz" },
    { text: "The hardest game to win is a won game.", author: "Emanuel Lasker" },
    { text: "No one ever won a game by resigning.", author: "Savielly Tartakower" },
    { text: "In Chess as in life, an opportunity missed is an opportunity lost.", author: "Savielly Tartakower" },
    { text: "Chess is Life.", author: "Bobby Fischer" },
    { text: "If you're losing, find a way to complicate. If you're winning, keep it simple.", author: "Hikaru Nakamura" },
    { text: "The worst enemy of the strategist is the clock.", author: "Garry Kasparov" },
    { text: "The Chess speaks for itself.", author: "Hans Niemann" },
    { text: "Every chess master was once a beginner.", author: "Irving Chernev" },
    { text: "The blunders are all there on the board, waiting to be made.", author: "Savielly Tartakower" },
    { text: "Play the opening like a book, the middlegame like a magician, and the endgame like a machine.", author: "Rudolf Spielmann" },
  ];


  // Pick a random quote
  const random = quotes[Math.floor(Math.random() * quotes.length)];
  const quoteBox = document.getElementById("quote-box");

  // Play move sound if available
  const moveSound = document.getElementById("move-sound");
  moveSound?.play();

  // Restart fade animation
  quoteBox.classList.remove("fade");
  void quoteBox.offsetWidth; // force reflow
  quoteBox.classList.add("fade");

  // Display quote
  quoteBox.innerHTML = `“${random.text}”<br><span class="quote-author">– ${random.author}</span>`;
}

// Change quote every 10 seconds
setInterval(generateQuote, 10000);

// ==========================
// Countdown Timer
// ==========================
let timerId; // global so it can be cleared later

function startCountdown(targetDateStr) {
  const targetDate = new Date(targetDateStr).getTime();

  function updateCountdown() {
    const now = Date.now();
    const diff = targetDate - now;

    // Countdown finished
    if (diff <= 0) {
      clearInterval(timerId);
      showTournamentLiveBanner();
      return;
    }

    // Convert to time units
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Update DOM
    document.getElementById("days").textContent = String(days).padStart(2, "0");
    document.getElementById("hours").textContent = String(hours).padStart(2, "0");
    document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
    document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
  }

  // Run immediately, then every second
  updateCountdown();
  timerId = setInterval(updateCountdown, 1000);
}

// ==========================
// Tournament Banner Logic
// ==========================
function showTournamentLiveBanner() {
  const el = document.getElementById("tournamentStatus");
  if (!el) return;

  el.classList.remove("is-hidden");
  el.classList.add("show");

  // Launch confetti
  fireMiniConfetti(el);
}

// Dismiss banner when close button clicked
document.getElementById("dismissBanner")?.addEventListener("click", () => {
  const el = document.getElementById("tournamentStatus");
  el?.classList.add("is-hidden");
  el?.classList.remove("show");
});

// ==========================
// Confetti Animation
// ==========================
function fireMiniConfetti(container) {
  const n = 16; // number of pieces

  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "confetti";

    // randomize position + animation
    p.style.left = (10 + Math.random() * 80) + "%";
    p.style.setProperty("--tx", (Math.random() * 160 - 80) + "px");
    p.style.setProperty("--tz", (Math.random() * 1.2 + 0.3));
    p.style.animationDelay = (Math.random() * 0.25) + "s";

    container.appendChild(p);

    // remove after animation finishes
    setTimeout(() => p.remove(), 1600);
  }
}

// ==========================
// Kick things off
// ==========================
startCountdown("2025-09-12 10:44:00");


// Lightbox functionality with slideshow
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const closeBtn = document.querySelector(".close-btn");
const nextBtn = document.querySelector(".next-btn");
const prevBtn = document.querySelector(".prev-btn");

const galleryImages = document.querySelectorAll(".gallery-item img");
let currentIndex = 0;

function openLightbox(index) {
  lightbox.style.display = "flex";
  lightboxImg.src = galleryImages[index].src;
  lightboxImg.alt = galleryImages[index].alt;
  currentIndex = index;
}

// Open on image click
galleryImages.forEach((img, index) => {
  img.addEventListener("click", () => openLightbox(index));
});

// Navigation
nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % galleryImages.length;
  openLightbox(currentIndex);
});

prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  openLightbox(currentIndex);
});

// Close
closeBtn.addEventListener("click", () => lightbox.style.display = "none");
lightbox.addEventListener("click", e => {
  if (e.target === lightbox) lightbox.style.display = "none";
});

// Optional: keyboard navigation
document.addEventListener("keydown", e => {
  if (lightbox.style.display === "flex") {
    if (e.key === "ArrowRight") nextBtn.click();
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "Escape") lightbox.style.display = "none";
  }
});


// Remove shimmer after image loads
document.querySelectorAll(".gallery-item img").forEach(img => {
  img.addEventListener("load", () => {
    img.parentElement.style.animation = "none"; // stop shimmer
    img.parentElement.style.background = "none"; // clear shimmer bg
  });
});



/* =========================================
   Fupre Chess Club — Site Script 
========================================= */

/* ---------- Global shim (legacy HTML) ---------- */
// If some page still calls generateQuote(), make it safe.
window.generateQuote = function () {
  if (typeof window.__quotesNext === "function") {
    window.__quotesNext(); // advance + reset timer safely
  }
  // else: no-op (prevents console errors)
};

/* ---------- Theme + Navbar ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const darkToggle = document.getElementById("dark-toggle");
  const hamburger  = document.getElementById("hamburger");
  const navLinks   = document.getElementById("nav-links");

  function toggleMenu(forceOpen) {
    if (!hamburger || !navLinks) return;
    const shouldOpen =
      typeof forceOpen === "boolean"
        ? forceOpen
        : !navLinks.classList.contains("show");

    navLinks.classList.toggle("show", shouldOpen);
    hamburger.classList.toggle("active", shouldOpen);
    hamburger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");

    hamburger.style.transition = "transform 0.3s ease";
    hamburger.style.transform = "rotate(180deg)";
    setTimeout(() => {
      hamburger.textContent = shouldOpen ? "✖" : "☰";
      hamburger.style.transform = "rotate(0deg)";
    }, 150);
  }

  // a11y
  hamburger?.setAttribute("aria-controls", "nav-links");
  hamburger?.setAttribute("aria-expanded", "false");

  // events
  hamburger?.addEventListener("click", () => toggleMenu());
  navLinks?.addEventListener("click", (e) => { if (e.target.closest("a")) toggleMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleMenu(false); });
  document.addEventListener("click", (e) => {
    if (!navLinks?.classList.contains("show")) return;
    const inside = navLinks.contains(e.target) || hamburger?.contains(e.target);
    if (!inside) toggleMenu(false);
  });
  window.addEventListener("resize", () => { if (window.innerWidth > 768) toggleMenu(false); });

  // theme
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
  darkToggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
});


/* ---------- Active nav link ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname.split("/").pop();
  document.querySelectorAll(".nav-links a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPath || (href === "index.html" && currentPath === "")) {
      link.classList.add("active");
    }
  });
});


/* ------------------------------
   Quotes 
------------------------------ */
(function initQuotes() {
  const quoteBox = document.getElementById("quote-box");
  if (!quoteBox) return; // this page has no quotes

  // Allow either #next-quote OR an existing .quote-btn
  const nextBtn = document.querySelector("#next-quote, .quote-btn");
  const moveSound = document.getElementById("move-sound");

  // Gate audio until the user interacts with the page at least once
  let userInteracted = false;
  ["click", "keydown", "touchstart"].forEach(ev => {
    document.addEventListener(ev, () => {
      userInteracted = true;
      // if you started with muted audio, you can unmute here if desired:
      // if (moveSound) moveSound.muted = false;
    }, { once: true });
  });

  const QUOTES = [
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
    { text: "Chess is a contributor to the net human unhappiness, since the pleasure of victory is greatly exceeded by the pain of defeat.", author: "Bill Hartston" },
    { text: "Play the opening like a book, the middlegame like a magician, and the endgame like a machine.", author: "Rudolf Spielmann" }
  ];

  const INTERVAL_MS = 10000;
  const RECENT_N = 3;
  let recent = [];      // last N indices
  let timerId = null;

  function playMove() {
    // Only attempt sound after a user gesture, and swallow any promise rejection
    if (!userInteracted || !moveSound || !moveSound.play) return;
    const p = moveSound.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  function pickIndex() {
    if (QUOTES.length <= RECENT_N) {
      // Not enough unique quotes: only avoid immediate last one
      const last = recent[recent.length - 1];
      let i;
      do { i = Math.floor(Math.random() * QUOTES.length); }
      while (QUOTES.length > 1 && i === last);
      return i;
    }
    let i, guard = 0;
    do {
      i = Math.floor(Math.random() * QUOTES.length);
      guard++;
    } while (recent.includes(i) && guard < 50);
    return i;
  }

  function render(index, { withSound = false } = {}) {
    const q = QUOTES[index];
    if (!q) return;

    if (withSound) playMove();

    // restart fade
    quoteBox.classList.remove("fade");
    void quoteBox.offsetWidth; // force reflow
    quoteBox.classList.add("fade");

    quoteBox.innerHTML = `“${q.text}”<br><span class="quote-author">– ${q.author}</span>`;

    recent.push(index);
    if (recent.length > RECENT_N) recent.shift();
  }

  function nextQuote({ manual = false } = {}) {
    // only play sound when the user triggers the change
    render(pickIndex(), { withSound: manual });
  }

  function startRotation() {
    stopRotation();
    timerId = setInterval(() => nextQuote({ manual: false }), INTERVAL_MS);
  }
  function stopRotation() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }
  function resetRotation() {
    startRotation(); // clears then restarts to full 10s
  }

  // initial quote (silent) + start loop
  nextQuote({ manual: false });
  startRotation();

  // manual next (button) + reset timer
  nextBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    userInteracted = true;
    nextQuote({ manual: true });
    resetRotation();
  });

  // If your HTML still has onclick="generateQuote()", expose a safe shim
  window.generateQuote = function () {
    userInteracted = true;
    nextQuote({ manual: true });
    resetRotation();
  };

  // pause when tab hidden, resume fresh interval when visible
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopRotation();
    else resetRotation();
  });
})();




/* ---------- Countdown (only if DOM exists) ---------- */
let countdownTimerId;

function countdownDomReady() {
  return (
    document.getElementById("days") &&
    document.getElementById("hours") &&
    document.getElementById("minutes") &&
    document.getElementById("seconds")
  );
}

async function loadCountdown() {
  if (!countdownDomReady()) return;
  try {
    const res = await fetch("data/countdown.json?nocache=" + Date.now());
    const cfg = await res.json();

    const titleEl = document.getElementById("event-title");
    if (titleEl) titleEl.textContent = cfg.eventName || "Event";

    startCountdown(cfg.targetDate);
    showLocalTime(cfg.targetDate);
  } catch (err) {
    console.error("Failed to load countdown config:", err);
  }
}

function startCountdown(targetDateStr) {
  if (!countdownDomReady()) return;
  const target = new Date(targetDateStr).getTime();

  function tick() {
    if (!countdownDomReady()) { clearInterval(countdownTimerId); return; }
    const diff = target - Date.now();

    if (diff <= 0) {
      clearInterval(countdownTimerId);
      showTournamentLiveBanner();
      return;
    }

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById("days").textContent    = String(days).padStart(2, "0");
    document.getElementById("hours").textContent   = String(hours).padStart(2, "0");
    document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
    document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
  }

  tick();
  countdownTimerId = setInterval(tick, 1000);
}

function showLocalTime(targetDateStr) {
  const el = document.getElementById("local-time");
  if (!el) return;
  const d = new Date(targetDateStr);
  el.textContent = d.toLocaleString([], {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short"
  });
}

if (countdownDomReady()) loadCountdown();

/* ---------- Tournament banner ---------- */
function showTournamentLiveBanner() {
  const el = document.getElementById("tournamentStatus");
  if (!el) return;
  el.classList.remove("is-hidden");
  el.classList.add("show");
  fireMiniConfetti(el);
}
document.getElementById("dismissBanner")?.addEventListener("click", () => {
  const el = document.getElementById("tournamentStatus");
  el?.classList.add("is-hidden");
  el?.classList.remove("show");
});

/* ---------- Confetti ---------- */
function fireMiniConfetti(container) {
  if (!container) return;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "confetti";
    p.style.left = (10 + Math.random() * 80) + "%";
    p.style.setProperty("--tx", (Math.random() * 160 - 80) + "px");
    p.style.setProperty("--tz", (Math.random() * 1.2 + 0.3));
    p.style.animationDelay = (Math.random() * 0.25) + "s";
    container.appendChild(p);
    setTimeout(() => p.remove(), 1600);
  }
}

/* ---------- Lightbox (only if present) ---------- */
(function initLightbox() {
  const lightbox      = document.getElementById("lightbox");
  const lightboxImg   = document.getElementById("lightbox-img");
  const closeBtn      = document.querySelector(".close-btn");
  const nextBtnLB     = document.querySelector(".next-btn");
  const prevBtnLB     = document.querySelector(".prev-btn");
  const galleryImages = document.querySelectorAll(".gallery-item img");

  if (!lightbox || !lightboxImg || !galleryImages.length) return;

  let currentIndex = 0;

  function openLightbox(index) {
    lightbox.style.display = "flex";
    lightboxImg.src = galleryImages[index].src;
    lightboxImg.alt = galleryImages[index].alt || "";
    currentIndex = index;
  }

  galleryImages.forEach((img, index) => {
    img.addEventListener("click", () => openLightbox(index));
  });

  nextBtnLB?.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % galleryImages.length;
    openLightbox(currentIndex);
  });
  prevBtnLB?.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    openLightbox(currentIndex);
  });
  closeBtn?.addEventListener("click", () => { lightbox.style.display = "none"; });

  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) lightbox.style.display = "none";
  });

  document.addEventListener("keydown", e => {
    if (lightbox.style.display === "flex") {
      if (e.key === "ArrowRight") nextBtnLB?.click();
      if (e.key === "ArrowLeft")  prevBtnLB?.click();
      if (e.key === "Escape")     lightbox.style.display = "none";
    }
  });

  // stop shimmer on load
  galleryImages.forEach(img => {
    img.addEventListener("load", () => {
      if (img.parentElement) {
        img.parentElement.style.animation = "none";
        img.parentElement.style.background = "none";
      }
    });
  });
})();



/* =========================================
         Developer Credit Widget 
========================================= */
(function devCredit(){
  if (document.getElementById('dev-credit')) return; // avoid duplicates

  // 🔧 Change this to your real portfolio URL
  const PORTFOLIO_URL = 'https://clarketj.github.io/ClarkeTJ-portfolio/';

  const DEV_TAGLINE = 'Code the plan. Checkmate the bugs.';

  const wrap = document.createElement('div');
  wrap.id = 'dev-credit';
  wrap.className = 'dev-credit';
  wrap.innerHTML = `
    <button class="chip" id="dev-credit-toggle"
            aria-expanded="false"
            aria-controls="dev-credit-panel"
            title="About the developer">
      <span class="dot" aria-hidden="true"></span>
      <span>Developed by <strong>ClarkeTJ</strong></span>
    </button>

    <div class="panel" id="dev-credit-panel" role="dialog" aria-label="Developer credit" aria-modal="false">
      <div class="row" style="margin-bottom:.4rem;">
        <div>${DEV_TAGLINE}</div>
        <button class="btn" id="dev-close" aria-label="Close">×</button>
      </div>
      <div class="actions">
        <a class="btn btn-accent" id="dev-about" href="${PORTFOLIO_URL}"
           target="_blank" rel="noopener">About me</a>
        <button class="btn" id="dev-celebrate" title="Celebrate">Spark! ✨</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const toggleBtn    = wrap.querySelector('#dev-credit-toggle');
  const panel        = wrap.querySelector('#dev-credit-panel');
  const closeBtn     = wrap.querySelector('#dev-close');
  const celebrateBtn = wrap.querySelector('#dev-celebrate');
  const aboutBtn     = wrap.querySelector('#dev-about');

  function setOpen(open){
    wrap.classList.toggle('open', open);
    toggleBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // open/close controls
  toggleBtn?.addEventListener('click', () => setOpen(!wrap.classList.contains('open')));
  closeBtn?.addEventListener('click', () => setOpen(false));

  // close on outside click / Esc
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  // celebrate action (reuses your confetti if available)
  celebrateBtn?.addEventListener('click', () => {
    if (typeof fireMiniConfetti === 'function') {
      fireMiniConfetti(wrap);
    } else {
      const s = document.createElement('span');
      s.textContent = '✨';
      s.style.position='absolute'; s.style.right='0'; s.style.bottom='46px';
      wrap.appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
    toggleBtn.animate(
      [{transform:'translateY(0)'},{transform:'translateY(-4px)'},{transform:'translateY(0)'}],
      {duration: 400}
    );
  });

  // optional: close the panel after opening the portfolio
  aboutBtn?.addEventListener('click', () => setTimeout(() => setOpen(false), 50));
})();




/* ================================
   Google Analytics Custom Tracking
   ================================ */

function trackEvent(eventName, params = {}) {
  if (typeof gtag === "function") {
    gtag("event", eventName, params);
    console.log("GA Event:", eventName, params);
  } else {
    console.warn("gtag not found – GA event not sent:", eventName);
  }
}

// 1. Dark Mode Toggle
document.getElementById("dark-toggle")?.addEventListener("click", () => {
  trackEvent("dark_mode_toggle", {
    event_category: "ui_interaction",
    event_label: "Dark Mode Button"
  });
});

// 2. Navbar Link Clicks
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    trackEvent("nav_click", {
      event_category: "navigation",
      event_label: link.textContent.trim()
    });
  });
});

// 3. Gallery Interactions
document.querySelectorAll(".gallery-item img").forEach(img => {
  img.addEventListener("click", () => {
    trackEvent("gallery_open", {
      event_category: "engagement",
      event_label: img.alt || "Unnamed Image"
    });
  });
});

// 4. Quote Button
document.getElementById("next-quote")?.addEventListener("click", () => {
  trackEvent("quote_refresh", {
    event_category: "engagement",
    event_label: "Quote Button Click"
  });
});

// 5. Countdown Section Viewed
const countdownSection = document.querySelector(".countdown-section");
if (countdownSection) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      trackEvent("countdown_viewed", {
        event_category: "content",
        event_label: "Countdown Section"
      });
      observer.disconnect();
    }
  }, { threshold: 0.5 });
  observer.observe(countdownSection);
}

// 6. Event Sign-Up Buttons
document.querySelectorAll(".events .btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const eventName = btn.closest(".card")?.querySelector("h3")?.textContent.trim() || "Unknown Event";
    trackEvent("register_click", {
      event_category: "conversion",
      event_label: eventName
    });
  });
});

// 7. Partner Site Click
document.querySelector(".fcc-partner a.fcc-btn")?.addEventListener("click", () => {
  trackEvent("partner_site_visit", {
    event_category: "outbound",
    event_label: "Fupre Sports Media"
  });
});

// 8. Contact Links
document.querySelectorAll(".fcc-contact a, .footer-contact a").forEach(link => {
  link.addEventListener("click", () => {
    trackEvent("contact_click", {
      event_category: "engagement",
      event_label: link.textContent.trim()
    });
  });
});

// 9. Developer Credit Widget
document.getElementById("dev-credit-toggle")?.addEventListener("click", () => {
  trackEvent("dev_credit_toggle", {
    event_category: "ui_interaction",
    event_label: "Dev Widget Toggle"
  });
});

document.getElementById("dev-celebrate")?.addEventListener("click", () => {
  trackEvent("dev_credit_celebrate", {
    event_category: "engagement",
    event_label: "Celebrate Spark"
  });
});

document.getElementById("dev-about")?.addEventListener("click", () => {
  trackEvent("dev_credit_about", {
    event_category: "outbound",
    event_label: "About Me Portfolio"
  });
});


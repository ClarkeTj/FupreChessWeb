
/* ==============================
   Intersection Animations
============================== */
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".tournaments-info, .proposal-box");
  if (!sections.length) return;

  const io = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  sections.forEach(section => io.observe(section));
});

/* ==============================
   Load Calendar from JSON
============================== */
async function loadCalendar() {
  try {
    const response = await fetch("data/calendar.json?nocache=" + Date.now());
    const data = await response.json();

    const tbody = document.querySelector("#calendar-table tbody");
    tbody.innerHTML = "";

    data.months.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Month">${item.month}</td>
        <td data-label="Weekly">${item.weekly}</td>
        <td data-label="Monthly">${item.monthly}</td>
        <td data-label="Major Events">${item.events}</td>
      `;
      tbody.appendChild(row);
    });

    makeCalendarCollapsible("calendar-table");
  } catch (err) {
    console.error("Failed to load calendar:", err);
  }
}


/* ==============================
   Collapsible Rows (with glowing arrow)
============================== */
function makeCalendarCollapsible(tableId, maxRows = (window.innerWidth <= 480 ? 3 : 4)) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (rows.length <= maxRows) return;

  rows.forEach(r => r.classList.add("calendar-row"));

  // Show first set
  rows.slice(0, maxRows).forEach((row, i) => {
    row.style.display = table.classList.contains("card-view") ? "block" : "table-row";
    setTimeout(() => row.classList.add("show"), i * 100);
  });

  // Hide the rest
  rows.slice(maxRows).forEach(row => {
    row.classList.add("hidden");
    row.style.display = "none";
  });

  // Remove any old toggle to prevent duplicates
  const oldBtn = table.parentElement.querySelector(".show-toggle");
  if (oldBtn) oldBtn.remove();

  // Create glowing SVG arrow toggle
  const btn = document.createElement("button");
  btn.className = "show-toggle";
  btn.innerHTML = `
    <svg class="arrow-icon" viewBox="0 0 24 24" width="32" height="32">
      <defs>
        <linearGradient id="glowArrow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00e6ff"/>
          <stop offset="100%" stop-color="#4a00e0"/>
        </linearGradient>
      </defs>
      <path d="M6 9l6 6 6-6"
            stroke="url(#glowArrow)" stroke-width="3" fill="none"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  table.insertAdjacentElement("afterend", btn);

  let expanded = false;
  btn.addEventListener("click", () => {
    expanded = !expanded;
    btn.classList.toggle("active", expanded); // rotate arrow

    rows.slice(maxRows).forEach((row, i) => {
      if (expanded) {
        row.style.display = table.classList.contains("card-view") ? "block" : "table-row";
        row.classList.remove("show", "glow");
        row.style.opacity = 0;
        row.style.transform = "translateY(15px)";

        setTimeout(() => {
          row.classList.add("show");
          row.style.opacity = "";
          row.style.transform = "";

          void row.offsetWidth;
          row.classList.add("glow");
        }, i * 150);
      } else {
        setTimeout(() => {
          row.classList.remove("show");
          setTimeout(() => {
            row.style.display = "none";
            row.classList.add("hidden");
          }, 400);
        }, i * 150);
      }
    });
  });
}


/* ==============================
   Swipe Hint (mobile, table only)
============================== */
function initCalendarSwipeHints() {
  if (window.innerWidth > 768) return;

  const container = document.querySelector(".calendar-wrapper");
  if (!container) return;

  const table = container.querySelector("#calendar-table");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (
        entry.isIntersecting &&
        table.classList.contains("table-view") &&
        container.classList.contains("table-mode")
      ) {
        let hint = container.querySelector(".table-scroll-hint");
        if (!hint) {
          hint = document.createElement("div");
          hint.className = "table-scroll-hint";
          hint.textContent = "Swipe to see more ➡️";
          container.style.position = "relative";
          container.appendChild(hint);
        }

        hint.classList.add("show");

        setTimeout(() => hint.classList.remove("show"), 4000);

        container.addEventListener("scroll", () => {
          hint.classList.remove("show");
        }, { once: true });
      }
    });
  }, { threshold: 0.3 });

  observer.observe(container);
}

/* ==============================
   View Switcher
============================== */
function applyCalendarView(view) {
  const table = document.getElementById("calendar-table");
  const container = document.querySelector(".calendar-wrapper");
  const toggleBtn = document.getElementById("calendar-toggle");
  if (!table || !container || !toggleBtn) return;

  if (view === "card") {
    table.classList.remove("table-view");
    table.classList.add("card-view");
    container.classList.remove("table-mode");
    container.classList.add("card-mode");

    toggleBtn.textContent = "Switch to Table View";

    // remove hints (no scroll in card view)
    container.querySelectorAll(".table-scroll-hint").forEach(h => h.remove());
  } else {
    table.classList.remove("card-view");
    table.classList.add("table-view");
    container.classList.remove("card-mode");
    container.classList.add("table-mode");

    toggleBtn.textContent = "Switch to Card View";

    initCalendarSwipeHints();
  }

  makeCalendarCollapsible("calendar-table");
}

/* ==============================
   Boot
============================== */
document.addEventListener("DOMContentLoaded", () => {
  loadCalendar();

  const savedView = localStorage.getItem("calendarView") || "table";
  applyCalendarView(savedView);

  const toggleBtn = document.getElementById("calendar-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const table = document.getElementById("calendar-table");
      const newView = table.classList.contains("table-view") ? "card" : "table";
      applyCalendarView(newView);
      localStorage.setItem("calendarView", newView);
    });
  }

  initCalendarSwipeHints();
});

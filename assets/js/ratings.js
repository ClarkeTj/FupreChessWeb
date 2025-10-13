   
/* ---------- View toggle (table <-> card) ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("ratings-table");
  const toggleBtn = document.getElementById("toggle-view");
  const container = document.querySelector(".table-container");

  function applyView(view) {
    if (view === "card") {
      table.classList.remove("table-view");
      table.classList.add("card-view");
      toggleBtn.textContent = "Switch to Table View";
      toggleBtn.classList.remove("table-mode");
      toggleBtn.classList.add("card-mode");

      // disable horizontal scroll on the container while in card mode
      container?.classList.add("card-mode");
    } else {
      table.classList.remove("card-view");
      table.classList.add("table-view");
      toggleBtn.textContent = "Switch to Card View";
      toggleBtn.classList.remove("card-mode");
      toggleBtn.classList.add("table-mode");

      // restore horizontal scroll for table mode on small screens
      container?.classList.remove("card-mode");
    }

    // Rebuild collapsibles for the new layout
    setupCollapsibles();
  }

  // Load saved preference
  const savedView = localStorage.getItem("ratingsView") || "table";
  applyView(savedView);

  toggleBtn.addEventListener("click", () => {
    const newView = table.classList.contains("table-view") ? "card" : "table";
    applyView(newView);
    localStorage.setItem("ratingsView", newView);
  });
});


/* ---------- Data + render ---------- */

// Global storage
let allPlayers = [];

// Load player ratings
async function loadRatings() {
  try {
    const response = await fetch("data/ratings.json?nocache=" + Date.now());
    allPlayers = await response.json();

    renderRatings(allPlayers);
    renderLeaderboards(allPlayers);
    setupCollapsibles();

    // ensure collapsibles are created AFTER rows exist
    setupCollapsibles();

  } catch (err) {
    console.error("Failed to load ratings:", err);
  }
}

// Highlight helper
function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

// Render Ratings Table (alphabetical, with highlight)
function renderRatings(players, query = "") {
  const tableBody = document.querySelector("#ratings-table tbody");
  tableBody.innerHTML = "";

  const alphabetical = [...players].sort((a, b) => a.name.localeCompare(b.name));

  alphabetical.forEach(player => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Player">${highlightMatch(player.name, query)}</td>
      <td data-label="Dept">${player.department}</td>
      <td data-label="Lv">${player.level}</td>
      <td data-label="Rapid">${player.rapid}</td>
      <td data-label="Blitz">${player.blitz}</td>
<td data-label="Achievements">
  ${
    player.achievements.length > 0
      ? highlightMatch(player.achievements.join("<br>"), query)
      : "<span class='no-achievement'>🚀 No achievements yet</span>"
  }
</td>

    `;
    tableBody.appendChild(row);
  });
}

// Render Leaderboards
function renderLeaderboards(players) {
  // Rapid
  const rapidSorted = [...players].sort((a, b) => b.rapid - a.rapid);
  const rapidBody = document.querySelector("#rapid-leaderboard tbody");
  rapidBody.innerHTML = "";
  rapidSorted.forEach((player, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${medal}</td>
      <td>${player.name}</td>
      <td>${player.rapid}</td>
    `;
    rapidBody.appendChild(row);
  });

  // Blitz
  const blitzSorted = [...players].sort((a, b) => b.blitz - a.blitz);
  const blitzBody = document.querySelector("#blitz-leaderboard tbody");
  blitzBody.innerHTML = "";
  blitzSorted.forEach((player, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${medal}</td>
      <td>${player.name}</td>
      <td>${player.blitz}</td>
    `;
    blitzBody.appendChild(row);
  });
}

// === Search Functionality ===
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-player");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      const query = e.target.value.toLowerCase();
      const filtered = allPlayers.filter(player =>
        player.name.toLowerCase().includes(query) ||
        player.achievements.join(" ").toLowerCase().includes(query)
      );
      renderRatings(filtered, query);
      setupCollapsibles(); // tables changed -> rebuild collapsibles
    });
  }
});




/* -----------------------------
   Collapsible tables 
-------------------------------- */

/** Call this AFTER rows are rendered/changed */
function setupCollapsibles() {
  // Remove existing buttons to avoid duplicates
  document.querySelectorAll(".collapse-btn").forEach(btn => btn.remove());

  // Reset any previous row styles/classes
  ["ratings-table", "rapid-leaderboard", "blitz-leaderboard"].forEach(id => {
    const tb = document.getElementById(id)?.querySelector("tbody");
    if (!tb) return;
    tb.querySelectorAll("tr").forEach(tr => {
      tr.classList.remove("collapsible-row", "show");
      tr.style.display = "";            // back to default
    });
  });

  // Re-apply collapsibles
  makeTableCollapsible("ratings-table");
  makeTableCollapsible("rapid-leaderboard");
  makeTableCollapsible("blitz-leaderboard");
}

/** Builds one collapsible table with stagger + glow */
function makeTableCollapsible(tableId, maxRows = (window.innerWidth <= 480 ? 10 : 8)) {
  const table = document.getElementById(tableId);
  if (!table) return;

  //  Prevent duplicate arrows if function runs again
  const nextElem = table.nextElementSibling;
  if (nextElem && nextElem.classList.contains("show-toggle")) return;

  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (rows.length <= maxRows) return; // nothing to collapse

  // Hide extra rows initially
  rows.slice(maxRows).forEach(row => {
    row.classList.add("hidden");
  });

  // Create glowing arrow toggle button
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
    btn.classList.toggle("active", expanded); // rotates arrow

    rows.slice(maxRows).forEach((row, i) => {
      if (expanded) {
        row.classList.remove("hidden");
        setTimeout(() => {
          row.classList.add("show", "glow");
          setTimeout(() => row.classList.remove("glow"), 1200);
        }, i * 120);
      } else {
        setTimeout(() => {
          row.classList.remove("show", "glow");
          setTimeout(() => row.classList.add("hidden"), 400);
        }, i * 120);
      }
    });
  });
}


// Init
loadRatings();




document.addEventListener("DOMContentLoaded", () => {
  const achievements = document.querySelector(".achievements-info");
  if (!achievements) return;

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          achievements.classList.add("reveal");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  io.observe(achievements);
});



function initTableHints() {
  if (window.innerWidth > 768) return; // Only on mobile

  const containers = document.querySelectorAll(".table-container");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const container = entry.target;

      if (entry.isIntersecting && !container.classList.contains("hint-active")) {
        container.classList.add("hint-active");

        // Reuse or create the hint element
        let hint = container.querySelector(".table-scroll-hint");
        if (!hint) {
          hint = document.createElement("div");
          hint.className = "table-scroll-hint";
          hint.textContent = "Swipe to see more ➡️";
          container.style.position = "relative";
          container.appendChild(hint);
        }

        // Animate in
        hint.classList.add("show");

        // Hide after 4s
        setTimeout(() => hint.classList.remove("show"), 4000);

        // Hide instantly if user scrolls horizontally
        container.addEventListener("scroll", () => {
          hint.classList.remove("show");
        });
      }

      if (!entry.isIntersecting) {
        container.classList.remove("hint-active");
      }
    });
  }, { threshold: 0.3 });

  containers.forEach(c => observer.observe(c));
}

document.addEventListener("DOMContentLoaded", () => {
  initTableHints();

  const toggleBtn = document.getElementById("toggle-view");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      setTimeout(() => {
        if (!document.querySelector(".table-container")?.classList.contains("card-mode")) {
          initTableHints();
        }
      }, 200);
    });
  }
});

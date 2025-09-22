/* fcc.js — All code is scoped to this page and its fcc-* elements only.
   Vanilla JS only. Avoids conflicts with existing global script.js. */

/* =========================
   Constants & State
   ========================= */
const FCC_JSON_URL = 'data/tour.json';
const FCC_COLLAPSE_KEY = 'fcc-tour-collapsed'; // stores boolean ("true"/"false")
let fccPlayers = [];            // raw list from JSON
let fccComputed = [];           // list with computed rank
let fccCollapsed = true;        // default: collapsed
let fccSortMode = 'points';     // 'points' (desc) or 'rank' (asc)
let fccSearchText = '';         // case-insensitive search

/* =========================
   DOM Elements
   ========================= */
const elDates = document.getElementById('fcc-tour-dates');
const elCollapse = document.getElementById('fcc-collapsible');
const elCollapseBtn = document.getElementById('fcc-collapse-btn');
const elTableBody = document.getElementById('fcc-table-body');
const elSort = document.getElementById('fcc-sort');
const elSearch = document.getElementById('fcc-search');
const elYear = document.getElementById('fcc-year');

/* Footer year */
if (elYear) elYear.textContent = new Date().getFullYear();

/* =========================
   Helpers
   ========================= */

/** Convert a status string to a class suffix */
function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('qualified')) return 'fcc-status--q';
  if (s.includes('contention')) return 'fcc-status--c';
  return 'fcc-status--n'; // Not Qualified or everything else
}

/** Sort + rank the array. Returns a new array. */
function computeStandings(players, sortMode = 'points') {
  const list = players.map(p => ({ ...p })); // shallow copy
  // Default ranking is by points (desc). Ties: higher eventsPlayed, then name ASC.
  list.sort((a, b) => {
    if (sortMode === 'rank') {
      // If sorting by 'rank', assume incoming players already have a 'rank' field.
      return (a.rank ?? 1e9) - (b.rank ?? 1e9);
    }
    // sort by points desc
    if (b.points !== a.points) return b.points - a.points;
    if (b.eventsPlayed !== a.eventsPlayed) return b.eventsPlayed - a.eventsPlayed;
    return a.name.localeCompare(b.name);
  });

  // Recompute rank positions after sort
  let currentRank = 0;
  let lastPoints = null;
  list.forEach((p, idx) => {
    if (p.points !== lastPoints) {
      currentRank = idx + 1;
      lastPoints = p.points;
    }
    p.rank = currentRank;
  });

  // If user selected 'rank', re-sort by rank asc explicitly
  if (sortMode === 'rank') {
    list.sort((a, b) => a.rank - b.rank);
  }

  return list;
}

/** Apply search filter */
function filterBySearch(players, term) {
  if (!term) return players;
  const q = term.trim().toLowerCase();
  return players.filter(p => p.name.toLowerCase().includes(q));
}

/** Render one row */
function renderRow(p) {
  const row = document.createElement('div');
  row.className = 'fcc-row';
  row.setAttribute('role', 'row');
  row.innerHTML = `
    <div class="fcc-cell" role="cell">${p.rank}</div>
    <div class="fcc-cell fcc-player-cell" role="cell">
      <img class="fcc-player-ava" src="${p.photo}" alt="${p.name}"/>
      <span class="fcc-player-label">${p.name}</span>
    </div>
    <div class="fcc-cell" role="cell">${p.points}</div>
    <div class="fcc-cell" role="cell">${p.eventsPlayed}</div>
    <div class="fcc-cell" role="cell" title="${p.bestFinish}">${p.bestFinish}</div>
    <div class="fcc-cell" role="cell">
      <span class="fcc-status ${statusClass(p.status)}">${p.status}</span>
    </div>
  `;
  return row;
}

/** Render the table body from fccComputed + controls state */
function renderTable() {
  const filtered = filterBySearch(fccComputed, fccSearchText);
  elTableBody.innerHTML = '';
  filtered.forEach(p => elTableBody.appendChild(renderRow(p)));
}

/** Update computed standings based on sort mode */
function updateComputed() {
  fccComputed = computeStandings(fccPlayers, fccSortMode);
}

/** Apply collapse/expand with a11y + persistence */
function setCollapsed(collapsed) {
  fccCollapsed = collapsed;
  if (fccCollapsed) {
    elCollapse.hidden = true;
    elCollapseBtn.setAttribute('aria-expanded', 'false');
    elCollapseBtn.textContent = 'Show Standings';
  } else {
    elCollapse.hidden = false;
    elCollapseBtn.setAttribute('aria-expanded', 'true');
    elCollapseBtn.textContent = 'Hide Standings';
  }
  localStorage.setItem(FCC_COLLAPSE_KEY, String(fccCollapsed));
}

/* =========================
   Init
   ========================= */
async function init() {
  try {
    // Restore collapse state
    const saved = localStorage.getItem(FCC_COLLAPSE_KEY);
    setCollapsed(saved === null ? true : saved === 'true');

    // Load JSON
    const res = await fetch(FCC_JSON_URL, { cache: 'no-store' });
    const data = await res.json();

    // Dates
    if (elDates) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const dateFmt = (d) => isNaN(d) ? 'TBA' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      elDates.textContent = `${data.tourName}: ${dateFmt(start)} — ${dateFmt(end)}`;
    }

    // Players
    fccPlayers = Array.isArray(data.players) ? data.players : [];
    updateComputed();
    renderTable();

    // Events
    elCollapseBtn.addEventListener('click', () => setCollapsed(!fccCollapsed));

    elSort.addEventListener('change', () => {
      fccSortMode = elSort.value;
      updateComputed();
      renderTable();
    });

    elSearch.addEventListener('input', () => {
      fccSearchText = elSearch.value;
      renderTable();
    });
  } catch (err) {
    console.error('[fcc] Failed to load tour.json', err);
    if (elDates) elDates.textContent = 'Failed to load Tour data.';
  }
}

document.addEventListener('DOMContentLoaded', init);

/* =========================
   Testing checklist (read & tick off manually)
   ----------------------------------------------------------------
   - Collapsible works on desktop + mobile, remembers state (localStorage).
   - tour.json loads and table renders with 12+ players.
   - Sorting dropdown:
       * "Points" sorts by points DESC; ties broken by eventsPlayed DESC then name ASC.
       * "Rank" sorts by computed rank ASC.
   - Search filters players in real time; case-insensitive.
   - Rank recalculates correctly when sorting mode changes.
   - Edit tour.json (dates, players) and refresh — UI updates.
   - Responsive check:
       * Desktop: full grid with avatars.
       * Tablet/mobile: fonts/row height scale down, grid remains readable without overflow.
   ---------------------------------------------------------------- */

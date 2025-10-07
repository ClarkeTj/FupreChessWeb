
/* =========================
   Matches Page 
========================= */
(() => {
  'use strict';

  // ------- tiny scoped helpers -------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

  const state = {
    matches: []
  };

  // ---------- boot ----------
  document.addEventListener('DOMContentLoaded', async () => {
    await loadMatches();

    // filters
    on($("#playerFilter"), "change", render);
    on($("#startDate"), "change", render);
    on($("#endDate"), "change", render);
    on($("#sortFilter"), "change", render);

    // modal close (bind once)
    const modal = $("#matchModal");
    const closeBtn = $(".close-btn");
    on(closeBtn, "click", () => modal.style.display = "none");
    on(window, "click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    // first render
    render();
  });

  // ---------- data ----------
  async function loadMatches() {
    try {
      const res = await fetch("data/matches.json?nocache=" + Date.now());
      const data = await res.json();
      state.matches = data.matches || [];
      buildPlayerFilter();
    } catch (e) {
      console.error("Failed to load matches.json", e);
      state.matches = [];
    }
  }

  function buildPlayerFilter() {
    const sel = $("#playerFilter");
    if (!sel) return;
    const players = new Set();
    state.matches.forEach(m => { players.add(m.playerA); players.add(m.playerB); });
    sel.innerHTML = `<option value="">Filter by Player</option>` +
      [...players].sort((a,b)=>a.localeCompare(b))
                  .map(p=>`<option value="${p}">${p}</option>`).join("");
  }

  // ---------- filters/sort ----------
  function getFilters() {
    return {
      player: $("#playerFilter")?.value?.trim() || "",
      start:  $("#startDate")?.value || "",
      end:    $("#endDate")?.value || "",
      sort:   $("#sortFilter")?.value || "recent",
    };
  }

  function withinRange(dateStr, start, end) {
    if (!start && !end) return true;
    const d = new Date(dateStr);
    if (start && d < new Date(start)) return false;
    if (end   && d > new Date(end))   return false;
    return true;
  }

  function getWinner(m) {
    const [a,b] = (m.result || "").split("-").map(v=>parseFloat(v));
    if (isNaN(a) || isNaN(b)) return "Draw";
    if (a > b) return m.playerA;
    if (b > a) return m.playerB;
    return "Draw";
  }

  function filteredSorted() {
    const { player, start, end, sort } = getFilters();

    const list = state.matches.filter(m => {
      const plays = !player || m.playerA === player || m.playerB === player;
      return plays && withinRange(m.date, start, end);
    });

    switch (sort) {
      case "recent": list.sort((a,b)=> new Date(b.date) - new Date(a.date)); break;
      case "oldest": list.sort((a,b)=> new Date(a.date) - new Date(b.date)); break;
      case "winner": list.sort((a,b)=> getWinner(a).localeCompare(getWinner(b))); break;
    }
    return list;
  }

  // Smart handling for Start/End Date
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  if (startInput && endInput) {
    endInput.disabled = true;
    startInput.addEventListener("change", () => {
      if (startInput.value) {
        endInput.disabled = false;
        endInput.min = startInput.value;
        if (endInput.value && endInput.value < startInput.value) {
          endInput.value = "";
        }
      } else {
        endInput.value = "";
        endInput.disabled = true;
        endInput.removeAttribute("min");
      }
    });
  }

  // ---------- render ----------
  function render() {
    updatePlayerBadge();

    const wrapper = $(".matches-wrapper");
    if (!wrapper) return;

    wrapper.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "matches-grid";
    wrapper.appendChild(grid);

    const data = filteredSorted();

    data.forEach((m,i) => {
      const w = getWinner(m);
      const winA = w === m.playerA, winB = w === m.playerB, draw = (w === "Draw");
      const aTone = winA ? "win" : draw ? "draw" : "loss";
      const bTone = winB ? "win" : draw ? "draw" : "loss";
      const icon = draw ? "🤝" : "👑";

      const card = document.createElement("article");
      card.className = "match-card hidden";
      card.dataset.index = String(i);
      card.innerHTML = `
        <div class="mc-row">
          <span class="player ${aTone}">${m.playerA}${winA ? " "+icon : ""}</span>
          <span class="vs">vs</span>
          <span class="player ${bTone}">${m.playerB}${winB ? " "+icon : ""}</span>
        </div>
        <div class="mc-row">
          <span class="result"><strong>${m.result}</strong></span>
          <span class="date">${m.date}</span>
        </div>
        <div class="mc-meta"><em>${m.event || "Friendly"} • ${m.timeControl || "—"}</em></div>
      `;
      grid.appendChild(card);
    });

    applyCollapsible();
    attachOpenModalHandlers();
    buildLeaderboard();
  }

  /* =====================
     Leaderboard Handling
  ===================== */
  function buildLeaderboard(){
    const winCount = {};
    state.matches.forEach(m => {
      const winner = getWinner(m);
      if (winner !== "Draw") {
        winCount[winner] = (winCount[winner] || 0) + 1;
      }
    });

    const sorted = Object.entries(winCount)
      .sort((a,b) => b[1] - a[1])
      .slice(0,5);

    const list = document.getElementById("leaderboardList");
    if (!list) return;
    list.innerHTML = "";

    sorted.forEach(([player, wins], idx) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="player-name">${idx===0 ? "👑 " : ""}${player}</span>
        <span class="wins">${wins} Wins</span>
      `;
      list.appendChild(li);
    });
  }

  // ---------- collapsible w/ glow ----------
  function applyCollapsible() {
    $$(".collapse-btn").forEach(b => b.remove());

    const items = $$(".match-card");
    if (!items.length) return;

    const maxRows = window.innerWidth <= 480 ? 4 : 8;

    items.forEach(el => { el.classList.remove("show","glow"); el.style.display = "block"; });
    items.forEach(el => el.classList.add("hidden"));

    items.slice(0, maxRows).forEach((el,i) => {
      setTimeout(() => {
        el.classList.remove("hidden");
        el.classList.add("show");
        void el.offsetWidth;
        el.classList.add("glow");
      }, i * 80);
    });

    if (items.length <= maxRows) return;

    items.slice(maxRows).forEach(el => { el.classList.add("hidden"); el.style.display = "none"; });

    const host = $(".matches-wrapper");
    const btn = document.createElement("button");
    btn.className = "collapse-btn";
    btn.innerHTML = `Show More <span class="chev">▼</span>`;
    host.insertAdjacentElement("afterend", btn);

    let expanded = false;
    on(btn, "click", () => {
      expanded = !expanded;
      items.slice(maxRows).forEach((el,i) => {
        if (expanded) {
          el.style.display = "block";
          void el.offsetWidth;
          setTimeout(() => {
            el.classList.remove("hidden");
            el.classList.add("show");
            void el.offsetWidth;
            el.classList.add("glow");
          }, i * 90);
        } else {
          setTimeout(() => {
            el.classList.remove("show");
            setTimeout(() => {
              el.classList.add("hidden");
              el.style.display = "none";
            }, 260);
          }, i * 80);
        }
      });
      btn.innerHTML = expanded ? `Show Less <span class="chev">▲</span>`
                               : `Show More <span class="chev">▼</span>`;
      btn.classList.toggle("expanded", expanded);
    });
  }

  // ---------- badge ----------
  function updatePlayerBadge() {
    const badge = $("#playerBadge");
    if (!badge) return;

    const { player, start, end } = getFilters();
    if (!player) { badge.textContent = ""; return; }

    const pool = state.matches.filter(m => withinRange(m.date, start, end));
    let w=0,l=0,d=0;
    pool.forEach(m=>{
      if (m.playerA !== player && m.playerB !== player) return;
      const winner = getWinner(m);
      if (winner === "Draw") d++;
      else if (winner === player) w++;
      else l++;
    });
    badge.textContent = `${player}: ${w}W - ${l}L - ${d}D`;
  }

  // ---------- modal ----------
  function attachOpenModalHandlers(){
    const cards = $$(".match-card");
    cards.forEach(el => {
      on(el, "click", () => {
        const idx = Number(el.dataset.index || 0);
        const m = filteredSorted()[idx];
        openModal(m);
      });
    });
  }

  function openModal(m) {
    const modal = $("#matchModal");
    const modalTitle = $("#modalTitle");
    const modalDetails = $("#modalDetails");
    const headToHead = $("#headToHead");
    if (!modal || !m) return;

    modal.style.display = "flex";
    modalTitle.textContent = `${m.playerA} vs ${m.playerB}`;

    modalDetails.innerHTML = `
      <p><strong>Result:</strong> ${m.result}</p>
      <p><strong>Date:</strong> ${m.date}</p>
      <p><strong>Event:</strong> ${m.event || "Friendly"}</p>
      <p><strong>Time Control:</strong> ${m.timeControl || "—"}</p>
    `;

    const h2h = state.matches.filter(x =>
      (x.playerA === m.playerA && x.playerB === m.playerB) ||
      (x.playerA === m.playerB && x.playerB === m.playerA)
    );

    let aW=0,bW=0,dr=0;
    h2h.forEach(x => {
      const w = getWinner(x);
      if (w === m.playerA) aW++;
      else if (w === m.playerB) bW++;
      else dr++;
    });

    headToHead.innerHTML = `
      <h4>Head-to-Head</h4>
      <p>${m.playerA}: ${aW} wins</p>
      <p>${m.playerB}: ${bW} wins</p>
      <p>Draws: ${dr}</p>
      <small>Total: ${h2h.length}</small>
    `;
  }
})();

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("data/matches.json");
    let matches = await res.json();

    // ✅ Handle both {matches: [...]} or [...] formats
    if (matches.matches) matches = matches.matches;

    const total = matches.length || 0;
    const blitz = matches.filter(m => m.timeControl?.toLowerCase() === "blitz").length;
    const rapid = matches.filter(m => m.timeControl?.toLowerCase() === "rapid").length;

    // Animated count-up function
    const animateCount = (el, value, duration = 1200) => {
      if (!el) return;
      let start = 0;
      const stepTime = Math.max(Math.floor(duration / (value || 1)), 20);
      const timer = setInterval(() => {
        start += 1;
        el.textContent = start;
        if (start >= value) clearInterval(timer);
      }, stepTime);
    };

    animateCount(document.getElementById("totalMatches"), total);
    animateCount(document.getElementById("blitzCount"), blitz);
    animateCount(document.getElementById("rapidCount"), rapid);

  } catch (err) {
    console.error("Error loading match data:", err);
  }
});



(function(){
  const q = (s,el=document)=>el.querySelector(s);
  const qa = (s,el=document)=>[...el.querySelectorAll(s)];

  async function loadMatches() {
    const res = await fetch("data/matches.json");
    let data = await res.json();
    const matches = Array.isArray(data) ? data : (data.matches || []);

    const normalizeTC = v => (v||"").toString().trim().toLowerCase();
    const total = matches.length;
    const blitz = matches.filter(m => normalizeTC(m.timeControl)==="blitz").length;
    const rapid = matches.filter(m => normalizeTC(m.timeControl)==="rapid").length;

    // Latest date
    const latest = matches.reduce((max,m)=>{
      const d = Date.parse(m.date || "");
      return isNaN(d) ? max : Math.max(max,d);
    }, 0);

    // Animate numbers (already present in your code)
    const animateCount = (el, value, duration = 1200) => {
      if (!el) return;
      let start = 0;
      const step = Math.max(Math.floor(duration / Math.max(value,1)), 18);
      const t = setInterval(()=>{ start++; el.textContent = start; if (start>=value) clearInterval(t); }, step);
    };
    animateCount(q("#totalMatches"), total);
    animateCount(q("#blitzCount"), blitz);
    animateCount(q("#rapidCount"), rapid);

    // Percentages + bars
    const pct = (n)=> total ? Math.round((n/total)*100) : 0;
    const pTotal = 100, pBlitz = pct(blitz), pRapid = pct(rapid);

    const setText = (sel, txt)=>{ const el=q(sel); if(el) el.textContent = txt; };
    setText("#pctTotal", `${pTotal}% of dataset`);
    setText("#pctBlitz", `${pBlitz}% of total`);
    setText("#pctRapid", `${pRapid}% of total`);

    const w = (sel, val)=>{ const el=q(sel); if(el) el.style.width = val + "%"; };
    w("#barTotal", pTotal);
    w("#barBlitz", pBlitz);
    w("#barRapid", pRapid);

    if (latest) {
      const d = new Date(latest);
      setText("#latestDate", d.toISOString().slice(0,10)); // YYYY-MM-DD
    }

    // Click-to-filter — non-invasive (hides cards by timeControl)
    const setActive = (which)=>{
      qa(".match-counter .counter-item").forEach(i=>i.classList.toggle("active", i.dataset.filter===which));
    };

    const detectAndTagCards = ()=>{
      // Tag existing rendered cards with data-timecontrol for cheap filtering
      const candidates = qa(".match-card, .match, .match-item, .card"); // broad selectors
      candidates.forEach(card=>{
        if (card.dataset.timecontrol) return;
        const t = card.textContent.toLowerCase();
        if (t.includes("blitz")) card.dataset.timecontrol = "blitz";
        else if (t.includes("rapid")) card.dataset.timecontrol = "rapid";
      });
      return candidates;
    };

    const applyFilter = (which)=>{
      const cards = detectAndTagCards();
      cards.forEach(card=>{
        const tc = (card.dataset.timecontrol||"").toLowerCase();
        const show = (which==="all") || (tc===which);
        card.classList.toggle("is-hidden", !show);
      });
      setActive(which);
    };

    // Attach clicks
    const totalTile = q(".counter-item.total");
    const blitzTile = q(".counter-item.blitz");
    const rapidTile = q(".counter-item.rapid");
    totalTile?.addEventListener("click", ()=>applyFilter("all"));
    blitzTile?.addEventListener("click", ()=>applyFilter("blitz"));
    rapidTile?.addEventListener("click", ()=>applyFilter("rapid"));

    // Initial active = all
    setActive("all");

    // Expose for other UI controls if needed
    window.fccFilterMatches = applyFilter;

    // Scroll-reveal for counter (IntersectionObserver)
    const counter = q("#match-counter");
    if (counter) {
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (e.isIntersecting){
            counter.classList.add("in-view");
            io.unobserve(counter);
          }
        });
      }, {threshold:.25});
      io.observe(counter);
    }
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    loadMatches().catch(err=>console.error("Counter setup failed:", err));
  });
})();




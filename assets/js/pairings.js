/* Fupre Chess Club — Pairings & Standings (static, view-only)*/

/* ---------- Utilities ---------- */
async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}
const by = (k, dir = "desc") => (a, b) => {
  const va = a[k], vb = b[k];
  if (va === vb) return 0;
  return (dir === "asc" ? (va > vb) : (va < vb)) ? 1 : -1;
};
function clone(obj) {
  return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}
function fmtScore(p) {
  const pts = Number((p.wins * 1 + p.draws * 0.5).toFixed(1));
  return pts;
}

/* ---------- Pairing Helpers ---------- */
function buildOpponentMap(tournament) {
  const map = new Map(); // id -> Set(opponentId)
  tournament.players.forEach(p => map.set(p.id, new Set()));
  (tournament.rounds || []).forEach(r => {
    (r.pairings || []).forEach(pr => {
      const w = pr.white, b = pr.black;
      if (w != null && b != null) {
        map.get(w)?.add(b);
        map.get(b)?.add(w);
      }
    });
  });
  return map;
}
function playersWithComputedPoints(players) {
  return players.map(p => ({ ...p, points: fmtScore(p) }));
}
function pickByeCandidate(players, hadByeIds) {
  const sorted = [...players].sort((a, b) => {
    if (a.points !== b.points) return a.points - b.points;
    if (a.rating !== b.rating) return a.rating - b.rating;
    return String(a.name).localeCompare(String(b.name));
  });
  return sorted.find(p => !hadByeIds.has(p.id)) ?? sorted[0];
}

/* ---------- Round Robin: circle method ---------- */
function generateRoundRobinSchedule(playerIds) {
  const ids = [...playerIds];
  const isOdd = ids.length % 2 === 1;
  if (isOdd) ids.push(null); // null = bye
  const n = ids.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const p1 = ids[i], p2 = ids[n - 1 - i];
      if (p1 != null && p2 != null) {
        const white = (r % 2 === 0) ? p1 : p2;
        const black = (r % 2 === 0) ? p2 : p1;
        pairs.push({ white, black });
      }
    }
    rounds.push(pairs);
    const fixed = ids[0];
    const rest = ids.slice(1);
    rest.unshift(rest.pop());
    ids.splice(0, ids.length, fixed, ...rest);
  }
  return rounds;
}

/* ---------- Enhanced Swiss Pairing (no rematch + colour balance) ---------- */
function swissSuggestNextRound(tournament, rules) {
  const players = playersWithComputedPoints(tournament.players);
  const oppMap = buildOpponentMap(tournament);

  // --- Build BYE history
  const hadByeIds = new Set();
  (tournament.rounds || []).forEach(r => {
    (r.pairings || []).forEach(pr => {
      if (pr.white && pr.black) return;
      const byeId = pr.white ?? pr.black;
      if (byeId) hadByeIds.add(byeId);
    });
  });

  // --- Sort players (by points → rating → name)
  players.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return String(a.name).localeCompare(String(b.name));
  });

  // --- Colour history tracker
  const colorHist = new Map(); // id -> {W: count, B: count, last: 'W' | 'B' | null}
  (tournament.rounds || []).forEach(r => {
    (r.pairings || []).forEach(pr => {
      if (!pr.white || !pr.black) return;
      const w = colorHist.get(pr.white) || { W: 0, B: 0, last: null };
      const b = colorHist.get(pr.black) || { W: 0, B: 0, last: null };
      w.W++; w.last = 'W';
      b.B++; b.last = 'B';
      colorHist.set(pr.white, w);
      colorHist.set(pr.black, b);
    });
  });

  // --- Pick BYE if odd number of players
  const resultPairs = [];
  const used = new Set();

  if (players.length % 2 === 1) {
    const byeCandidate = pickByeCandidate(players, hadByeIds);
    used.add(byeCandidate.id);
    resultPairs.push({ white: byeCandidate.id, black: null, note: "BYE (1 point)" });

     // OPTIONAL automatic scoring:
  const playerRef = tournament.players.find(p => p.id === byeCandidate.id);
  if (playerRef) playerRef.wins += 1;  // adds 1 point automatically
  }

  // --- Function to check if two players can face each other
  function canPlay(a, b) {
    if (!rules?.avoidRematches) return true;
    return !oppMap.get(a.id)?.has(b.id);
  }

  // --- Simple colour bias scoring
  function colorBias(id, desired) {
    const c = colorHist.get(id) || { W: 0, B: 0, last: null };
    const bias = (desired === 'W')
      ? c.W - c.B + (c.last === 'W' ? 0.5 : 0)
      : c.B - c.W + (c.last === 'B' ? 0.5 : 0);
    return bias; // lower = better for desired colour
  }

  // --- Recursive pairing search (tiny backtracking)
  function pairPlayers(queue, acc = []) {
    if (queue.length === 0) return acc;

    const [a, ...rest] = queue;
    if (used.has(a.id)) return pairPlayers(rest, acc);

    for (let i = 0; i < rest.length; i++) {
      const b = rest[i];
      if (used.has(b.id)) continue;
      if (!canPlay(a, b)) continue;

      // --- Choose colour based on history
      const aWhiteBias = colorBias(a.id, 'W');
      const bWhiteBias = colorBias(b.id, 'W');
      const white = (aWhiteBias <= bWhiteBias) ? a.id : b.id;
      const black = (white === a.id) ? b.id : a.id;

      // --- Mark used & push
      used.add(a.id); used.add(b.id);
      const newPair = { white, black };
      const newAcc = acc.concat(newPair);

      const remaining = rest.filter(p => !used.has(p.id));
      const result = pairPlayers(remaining, newAcc);
      if (result) return result; // success!

      // --- Backtrack
      used.delete(a.id); used.delete(b.id);
    }

    // --- Could not find valid pair → give bye if absolutely necessary
    if (!used.has(a.id)) {
      used.add(a.id);
      acc.push({ white: a.id, black: null, note: "BYE (1 point)" });
      return pairPlayers(rest.filter(p => !used.has(p.id)), acc);
    }

    return acc;
  }

  const queue = players.filter(p => !used.has(p.id));
  const finalPairs = pairPlayers(queue);
  resultPairs.push(...finalPairs);

  return resultPairs;
}


/* ---------- DOM helpers ---------- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function nameOf(players, id) {
  return players.find(p => p.id === id)?.name ?? (id == null ? "BYE" : `#${id}`);
}
function ratingOf(players, id) {
  return players.find(p => p.id === id)?.rating ?? "";
}

/* ---------- Standings (Active) with toggle ---------- */
function renderStandings(tournament, cardBody) {
  const computed = playersWithComputedPoints(tournament.players)
    .sort((a, b) => {
      const ap = fmtScore(a), bp = fmtScore(b);
      if (bp !== ap) return bp - ap;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return String(a.name).localeCompare(String(b.name));
    });

  const tableTitle = el('div', 'round-header', 'Standings');
  cardBody.appendChild(tableTitle);

  // wrapper (kept for future horizontal scroll if needed)
  const wrap = el('div', 'table-wrap');

  // mark as active-standings (CSS collapses columns on very small screens)
  const table = el('table', 'table active-standings');
  const thead = el('thead');
  const thr = el('tr');
  ["#", "Player", "Rating", "W", "D", "L", "Pts"].forEach(h => thr.appendChild(el('th', null, h)));
  thead.appendChild(thr);
  table.appendChild(thead);

  const tbody = el('tbody');
  const rows = [];
  computed.forEach((p, idx) => {
    const tr = el('tr', idx === 0 ? 'leader' : null);
    [idx + 1, p.name, p.rating, p.wins, p.draws, p.losses, fmtScore(p).toFixed(1)]
      .forEach(c => tr.appendChild(el('td', null, String(c))));
    rows.push(tr);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
  cardBody.appendChild(wrap);

  // Collapsible: Top 5 by default
  if (rows.length > 5) {
    const extraRows = rows.slice(5);
    extraRows.forEach(r => r.classList.add('hidden'));

    const btnRow = el('div', 'btn-row');
    const btn = el('button', 'toggle-btn', 'Show Full Standings');
    let expanded = false;
    btn.addEventListener('click', () => {
      expanded = !expanded;
      extraRows.forEach(r => r.classList.toggle('hidden', !expanded));
      btn.textContent = expanded ? 'Hide Standings' : 'Show Full Standings';
    });
    btnRow.appendChild(btn);
    cardBody.appendChild(btnRow);
  }
}

/* ---------- Rounds (Historical) with toggle ---------- */
function renderHistoricalRounds(tournament, cardBody) {
  const rounds = tournament.rounds || [];
  if (rounds.length === 0) {
    cardBody.appendChild(el('div', 'notice', 'No rounds recorded yet.'));
    return;
  }

  const wrap = el('div');
  const roundBlocks = [];

  rounds.forEach((r, idx) => {
    const block = el('div');
    block.appendChild(el('div', 'round-header', `Round ${r.round}`));

    const list = el('div', 'pairings-list');
    (r.pairings || []).forEach(pr => {
      const row = el('div', 'pairing-row');
      const left = el('div', 'color-w', `${nameOf(tournament.players, pr.white)} (${ratingOf(tournament.players, pr.white)})`);
      const vs = el('div', 'pairing-vs', 'vs');
      const rightName = pr.black ? `${nameOf(tournament.players, pr.black)} (${ratingOf(tournament.players, pr.black)})` : 'BYE';
      const right = el('div', 'color-b', rightName);
      row.append(left, vs, right);

      if (pr.result) {
        const res = el('div', 'badge', `Result: ${pr.result}`);
        res.style.marginTop = '.25rem';
        row.appendChild(res);
      } else if (pr.note) {
        const res = el('div', 'badge', pr.note);
        res.style.marginTop = '.25rem';
        row.appendChild(res);
      }
      list.appendChild(row);
    });

    block.appendChild(list);
    if (idx > 0) block.classList.add('hidden'); // only Round 1 visible by default
    wrap.appendChild(block);
    roundBlocks.push(block);
  });

  cardBody.appendChild(wrap);

  if (roundBlocks.length > 1) {
    const btnRow = el('div', 'btn-row');
    const btn = el('button', 'toggle-btn', 'Show All Rounds');
    let expanded = false;
    btn.addEventListener('click', () => {
      expanded = !expanded;
      roundBlocks.forEach((blk, idx) => { if (idx > 0) blk.classList.toggle('hidden', !expanded); });
      btn.textContent = expanded ? 'Hide Rounds' : 'Show All Rounds';
    });
    btnRow.appendChild(btn);
    cardBody.appendChild(btnRow);
  }
}

/* ---------- Suggested Next Round ---------- */
function renderSuggestedNextRound(tournament, systemRules, cardBody) {
  const sysId = tournament.pairingSystemId;
  cardBody.appendChild(el('div', 'round-header', `Next Round ${(tournament.rounds?.length || 0) + 1} Pairings`));

  let pairs = [];
  if (sysId === 'roundrobin') {
    const ids = tournament.players.map(p => p.id);
    const schedule = generateRoundRobinSchedule(ids);
    const nextIdx = (tournament.rounds?.length || 0);

    const isDoubleRR = systemRules?.rules?.doubleRound === true;
if (isDoubleRR) {
  const secondHalf = schedule.map(round =>
    round.map(({ white, black }) => ({ white: black, black: white }))
  );
  schedule.push(...secondHalf);
}

    if (nextIdx >= schedule.length) {
      cardBody.appendChild(el('div', 'notice', 'Round Robin schedule complete.'));
      return;
    }
    pairs = schedule[nextIdx];
  } else if (sysId === 'swiss') {
    pairs = swissSuggestNextRound(tournament, systemRules?.rules || {});
  } else {
    cardBody.appendChild(el('div', 'notice', `Pairing system "${sysId}" not supported yet.`));
    return;
  }

  const list = el('div', 'pairings-list');
  pairs.forEach(pr => {
    const row = el('div', 'pairing-row');
    const left = el('div', 'color-w', `${nameOf(tournament.players, pr.white)} (${ratingOf(tournament.players, pr.white)})`);
    const vs = el('div', 'pairing-vs', 'vs');
    const rightName = pr.black ? `${nameOf(tournament.players, pr.black)} (${ratingOf(tournament.players, pr.black)})` : 'BYE';
    const right = el('div', 'color-b', rightName);
    row.append(left, vs, right);

    if (pr.note) {
      const res = el('div', 'badge', pr.note);
      res.style.marginTop = '.25rem';
      row.appendChild(res);
    }
    list.appendChild(row);
  });
  cardBody.appendChild(list);

  const hint = el('div', 'notice',
    'Next round pairings will be available, once the current round is completed'
  );
  hint.style.marginTop = '.5rem';
  cardBody.appendChild(hint);
}

/* ---------- Cards ---------- */
function renderActiveTournamentCard(tournament, pairingSystems) {
  const system = pairingSystems.find(s => s.id === tournament.pairingSystemId) || { name: tournament.pairingSystemId };
  const card = el('article', 'card');
  const header = el('div', 'card-header');

  const h = el('h3', 'card-title', tournament.name);
  const badges = el('div', 'badges');
  badges.append(
    Object.assign(el('span', 'badge accent'), { textContent: system.name || 'Pairing System' }),
    Object.assign(el('span', 'badge'), { textContent: `Time: ${tournament.timeControl || '-'}` }),
    Object.assign(el('span', 'badge green'), { textContent: `${tournament.players?.length || 0} players` })
  );
  header.append(h, badges);

  const body = el('div', 'card-body');

  // Standings (collapsible)
  renderStandings(tournament, body);

  // Historical rounds (collapsible)
  renderHistoricalRounds(tournament, body);

  // Suggested next round
  renderSuggestedNextRound(tournament, system, body);

  card.append(header, body);
  return card;
}

function renderCompletedTournamentCard(t) {
  const card = el('article', 'card');

  // Header (✅ no stringified DOM)
  const header = el('div', 'card-header');
  const h = el('h3', 'card-title', t.name);
  const badges = el('div', 'badges');
  badges.appendChild(el('span', 'badge', 'Completed'));
  header.append(h, badges);

  // Body
  const body = el('div', 'card-body');

  const title = el('div', 'round-header', 'Final Standings');
  body.appendChild(title);

  // final-standings table (3 columns)
  const table = el('table', 'table final-standings');
  const thead = el('thead');
  const thr = el('tr');
  ["#", "Player", "Points"].forEach(hh => thr.appendChild(el('th', null, hh)));
  thead.appendChild(thr);
  table.appendChild(thead);

  const tbody = el('tbody');
  const sorted = (t.finalStandings || []).slice().sort((a, b) => b.points - a.points);
  const rows = [];
  sorted.forEach((row, idx) => {
    const tr = el('tr', idx === 0 ? 'leader' : null);
    tr.appendChild(el('td', null, String(idx + 1)));
    tr.appendChild(el('td', null, row.name));
    tr.appendChild(el('td', null, String(row.points)));
    rows.push(tr);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);

  if (rows.length > 5) {
    const extraRows = rows.slice(5);
    extraRows.forEach(r => r.classList.add('hidden'));

    const btnRow = el('div', 'btn-row');
    const btn = el('button', 'toggle-btn', 'Show Full Standings');
    let expanded = false;
    btn.addEventListener('click', () => {
      expanded = !expanded;
      extraRows.forEach(r => r.classList.toggle('hidden', !expanded));
      btn.textContent = expanded ? 'Hide Standings' : 'Show Full Standings';
    });
    btnRow.appendChild(btn);
    body.appendChild(btnRow);
  }

  card.append(header, body);
  return card;
}

/* ---------- Boot ---------- */
(async function boot() {
  const activeGrid = document.getElementById('active-grid');
  const completedGrid = document.getElementById('completed-grid');

  try {
    const [activeData, pastData, systemsData] = await Promise.all([
      loadJSON('data/active_tournaments.json'),
      loadJSON('data/past_tournaments.json'),
      loadJSON('data/pairings.json'),
    ]);

    const pairingSystems = systemsData?.systems || [];

    // Active tournaments
    const active = activeData?.activeTournaments || [];
    if (active.length === 0) {
      activeGrid.appendChild(el('div', 'notice', 'No active tournaments.'));
    } else {
      active.forEach(t => {
        const tCopy = clone(t);
        tCopy.players = tCopy.players || [];
        tCopy.rounds = tCopy.rounds || [];
        activeGrid.appendChild(renderActiveTournamentCard(tCopy, pairingSystems));
      });
    }

    // Completed tournaments
    const completed = pastData?.completedTournaments || [];
    if (completed.length === 0) {
      completedGrid.appendChild(el('div', 'notice', 'No completed tournaments yet.'));
    } else {
      completed.forEach(t => completedGrid.appendChild(renderCompletedTournamentCard(t)));
    }

  } catch (err) {
    console.error(err);
    activeGrid.appendChild(el('div', 'notice', `Error loading data: ${err.message}`));
  }
})();

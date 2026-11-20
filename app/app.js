// Leonida Trophy Guide — tracker logic. Plain ES module, no libraries, no
// network at run time: it fetches only data/trophies.json from its own app/
// and keeps progress in localStorage. Views: checklist, roadmap, missables,
// sources. Query params: ?view=roadmap|missables|sources, ?q=<search>,
// ?grade=<grade>, ?demo=1 (shows sample earned progress, in memory only).
import { ROADMAP_PHASES, ROADMAP_TOTAL_HOURS, phaseOf } from './roadmap.js';
import {
  buildTonightPlan,
  copyText,
  currentPhaseIndex,
  estimateRemainingHours,
  guideText,
  recentlyEarned,
} from './plan.js';

const STORE_KEY = 'leonida-trophy-guide-v2';
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const KIND_LABELS = {
  story: 'Story',
  side: 'Strangers & side',
  activities: 'Activities',
  collectibles: 'Collectibles',
  crime: 'Crime',
  money: 'Money',
};

const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const byName = new Map(trophies.map((t) => [t.name, t]));

// Which roadmap phase each trophy belongs to, from the phases' own rules
// (roadmap.js): the first phase whose test passes claims it. phaseIndex
// maps an unphased trophy (-1) to 99 so it sorts last, visible instead of
// silently landing first.
const PHASE_OF = new Map(trophies.map((t) => [t.id, phaseOf(t)]));
const phaseIndex = (trophy) => {
  const phase = PHASE_OF.get(trophy.id);
  return phase >= 0 ? phase : 99;
};

// --- Stored state: earned dates, per-trophy notes, spoiler setting. ---
function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (raw && typeof raw === 'object') return raw;
  } catch { /* a corrupt store starts empty */ }
  return { earned: {}, notes: {}, spoilers: false };
}
let store = loadStore();
const earned = new Map(Object.entries(store.earned ?? {}));
const notes = new Map(Object.entries(store.notes ?? {}));
const demoMode = params.get('demo') === '1';

function saveStore() {
  // Demo mode never writes: it shows sample progress in memory only, so a
  // first look cannot pollute a real player's saved progress.
  if (demoMode) return;
  store = {
    earned: Object.fromEntries(earned),
    notes: Object.fromEntries(notes),
    spoilers: hideSpoilers,
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

let hideSpoilers = Boolean(store.spoilers);
let selectedName = null;

// Demo mode seeds a spread of earned trophies in memory only, so a first
// look shows the tracker at work.
if (demoMode) {
  const demoIds = [2, 3, 4, 5, 6, 8, 9, 15, 16, 18, 20, 21, 35, 53];
  const today = new Date().toISOString().slice(0, 10);
  for (const id of demoIds) earned.set(byId.get(id).name, today);
}

// --- DOM handles ---
const $ = (id) => document.getElementById(id);
const listEl = $('trophy-list');
const detailEl = $('detail');
const searchEl = $('search');
const kindEl = $('kind');
const gradeEl = $('grade');
const statusEl = $('status');
const sortEl = $('sort');
const chapterEl = $('chapter');
const planSizeEl = $('plan-size');
const spoilersEl = $('spoilers');

// --- Helpers ---
function isSpoilerHidden(trophy) {
  return hideSpoilers && trophy.story && !earned.has(trophy.name);
}
function trophyLabel(trophy) {
  return isSpoilerHidden(trophy) ? 'Hidden story trophy' : trophy.name;
}
function trophyDescription(trophy) {
  return isSpoilerHidden(trophy)
    ? 'Earn this trophy to reveal its official description.'
    : trophy.description;
}
function formatDate(iso) {
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function badge(text, className) {
  return el('span', `badge ${className}`, text);
}

// --- Progress: ring, stats bars, next-up hint ---
function renderProgress() {
  const done = earned.size;
  const total = trophies.length;
  $('ring-count').textContent = `${done} / ${total}`;
  const circle = 2 * Math.PI * 52;
  $('ring-fill').style.strokeDashoffset = String(circle * (1 - done / total));
  $('progress-ring').setAttribute(
    'aria-label', `${done} of ${total} trophies earned`,
  );

  const stats = $('stats');
  stats.replaceChildren();
  const gradeGroup = el('div', 'stat-group');
  gradeGroup.append(el('h3', null, 'By grade'));
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const group = trophies.filter((t) => t.grade === grade);
    const got = group.filter((t) => earned.has(t.name)).length;
    gradeGroup.append(statRow(grade, got, group.length));
  }
  const kindGroup = el('div', 'stat-group');
  kindGroup.append(el('h3', null, 'By kind'));
  for (const kind of Object.keys(KIND_LABELS)) {
    const group = trophies.filter((t) => t.kind === kind);
    const got = group.filter((t) => earned.has(t.name)).length;
    kindGroup.append(statRow(KIND_LABELS[kind], got, group.length));
  }
  stats.append(gradeGroup, kindGroup);

  const timeGroup = el('div', 'stat-group');
  timeGroup.append(el('h3', null, 'Time left'));
  const left = estimateRemainingHours(trophies, earned);
  timeGroup.append(el(
    'p',
    'stat-hours',
    earned.size === trophies.length
      ? 'Nothing left — the Platinum is yours.'
      : `About ${Math.round(left)} hours of trophies left, at the roadmap's pace.`,
  ));
  stats.append(timeGroup);
  renderPlan();

  const next = trophies
    .filter((t) => t.story && !earned.has(t.name))
    .slice(0, 3);
  $('next-up').textContent = next.length
    ? `Next up in the story: ${next.map((t) => trophyLabel(t)).join(' · ')}`
    : 'Story complete — everything left is free-roam cleanup.';
}

// --- Tonight's plan + recently earned ---
let planSize = 5;
function renderPlan() {
  const wrap = $('plan-list');
  const plan = buildTonightPlan(trophies, earned, planSize);
  wrap.replaceChildren();
  if (!plan.groups.length) {
    $('plan-hours').textContent = 'Platinum earned — nothing left to plan.';
    wrap.append(el('p', null, 'Every trophy is ticked. Vice Got a Price! is yours.'));
  } else {
    const picked = plan.groups.reduce((n, g) => n + g.items.length, 0);
    $('plan-hours').textContent =
      `${picked} ${picked === 1 ? 'trophy' : 'trophies'}, about ${Math.round(plan.totalHours)} hours — ${plan.remaining} still to earn after these.`;
    for (const group of plan.groups) {
      const block = el('div', 'plan-group');
      block.append(el('h4', null, group.title));
      const list = el('ul', 'plan-items');
      for (const { trophy, hours } of group.items) {
        const item = el('li');
        const pick = el('button', 'plan-pick', trophyLabel(trophy));
        pick.type = 'button';
        pick.addEventListener('click', () => {
          selectedName = trophy.name;
          renderList();
          renderDetail(trophy);
        });
        item.append(
          pick,
          document.createTextNode(` — ${hours < 1 ? 'under an hour' : `about ${Math.round(hours)}h`}`),
        );
        list.append(item);
      }
      block.append(list);
      wrap.append(block);
    }
  }

  const recentWrap = $('recent-list');
  recentWrap.replaceChildren();
  const recent = recentlyEarned(earned, trophies);
  if (!recent.length) {
    recentWrap.append(el('li', null, 'Nothing earned in the last 7 days yet.'));
  }
  for (const { trophy, date } of recent) {
    recentWrap.append(el('li', null, `${trophyLabel(trophy)} — ${formatDate(date)}`));
  }
}

function statRow(name, got, total) {
  const row = el('div', 'stat-row');
  row.append(el('span', 'stat-name', name));
  const bar = el('div', 'stat-bar');
  const fill = el('div', 'stat-fill');
  fill.style.width = `${total ? Math.round((got / total) * 100) : 0}%`;
  bar.append(fill);
  row.append(bar, el('span', 'stat-num', `${got}/${total}`));
  return row;
}

// --- Checklist ---
function visibleTrophies() {
  const query = searchEl.value.trim().toLowerCase();
  const kind = kindEl.value;
  const grade = gradeEl.value;
  const status = statusEl.value;
  const chapter = chapterEl.value;
  let list = trophies.filter((t) => {
    if (kind === 'missable' && !t.missable) return false;
    if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (chapter !== 'all' && String(t.chapter ?? '') !== chapter) return false;
    if (status === 'earned' && !earned.has(t.name)) return false;
    if (status === 'remaining' && earned.has(t.name)) return false;
    if (query) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  if (sortEl.value === 'name') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortEl.value === 'grade') {
    list = [...list].sort(
      (a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]
        || a.name.localeCompare(b.name),
    );
  } else {
    // Default: roadmap order — the phase the trophy is earned in, then
    // chapter, then name, so the list reads as a walkthrough, not as the
    // raw file order.
    list = [...list].sort(
      (a, b) => phaseIndex(a) - phaseIndex(b)
        || (a.chapter ?? 99) - (b.chapter ?? 99)
        || a.name.localeCompare(b.name),
    );
  }
  return list;
}

function renderList() {
  const list = visibleTrophies();
  $('count-line').textContent = list.length === trophies.length
    ? `Showing all ${trophies.length} trophies`
    : `Showing ${list.length} of ${trophies.length} trophies`;
  listEl.replaceChildren();
  for (const trophy of list) {
    const item = el('li', 'trophy-row');
    if (earned.has(trophy.name)) item.classList.add('earned');
    if (selectedName === trophy.name) item.classList.add('selected');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(trophy.name);
    box.setAttribute('aria-label', `Earned: ${trophyLabel(trophy)}`);
    box.addEventListener('change', (event) => {
      event.stopPropagation();
      toggleEarned(trophy, box.checked);
    });
    // A click on the checkbox must not reach the row: the row's click
    // handler re-renders the list, which detaches this checkbox mid-click
    // and the change event never fires, so the tick silently does nothing.
    box.addEventListener('click', (event) => event.stopPropagation());
    const body = el('div');
    const head = el('div', 'trophy-name');
    head.append(el('h3', null, trophyLabel(trophy)));
    head.append(badge(trophy.grade, trophy.grade));
    head.append(badge(KIND_LABELS[trophy.kind] ?? trophy.kind, 'kind-badge'));
    if (trophy.missable) head.append(badge('Possibly missable', 'missable-badge'));
    if (!trophy.confirmed) head.append(badge('Not yet confirmed', 'unconfirmed-badge'));
    if (trophy.hidden) head.append(badge('Hidden', 'hidden-badge'));
    body.append(head);
    body.append(el('p', 'trophy-desc', trophyDescription(trophy)));
    const meta = [];
    if (trophy.target) meta.push(`Target: ${trophy.target.toLocaleString()}`);
    if (trophy.chapter) meta.push(`Chapter ${trophy.chapter}`);
    if (earned.has(trophy.name)) meta.push(`Earned ${formatDate(earned.get(trophy.name))}`);
    if (meta.length) body.append(el('p', 'trophy-meta', meta.join(' · ')));
    item.append(box, body);
    item.addEventListener('click', () => {
      selectedName = trophy.name;
      renderList();
      renderDetail(trophy);
    });
    listEl.append(item);
  }
  if (list.length === 0) {
    listEl.append(el('li', 'trophy-desc', 'No trophies match these filters.'));
  }
}

function toggleEarned(trophy, isEarned) {
  if (isEarned) earned.set(trophy.name, new Date().toISOString().slice(0, 10));
  else earned.delete(trophy.name);
  saveStore();
  renderProgress();
  renderList();
  renderRoadmap();
  if (selectedName === trophy.name) renderDetail(trophy);
}

// --- Detail pane ---
function renderDetail(trophy) {
  detailEl.replaceChildren();
  if (!trophy) {
    detailEl.append(el('p', 'detail-empty', 'Pick a trophy on the left to see its full guide, steps, and source.'));
    return;
  }
  const head = el('div', 'trophy-name');
  head.append(el('h3', null, trophyLabel(trophy)));
  head.append(badge(trophy.grade, trophy.grade));
  detailEl.append(head);
  detailEl.append(el('p', 'official', `Official: “${trophyDescription(trophy)}”`));
  if (isSpoilerHidden(trophy)) {
    detailEl.append(el('p', null, 'This is a hidden story trophy. Earn it in the game to reveal its guide here — the spoiler setting is hiding it until then.'));
    return;
  }
  if (trophy.missable) {
    detailEl.append(el('p', null, '⚠ Possibly missable — see the Missables tab before you play past Chapter 1.'));
  }
  if (!trophy.confirmed) {
    detailEl.append(el('p', null, '⚠ Not yet confirmed — no published guide had pinned down this trophy\u2019s exact trigger when this entry was written. This guide guesses nothing: watch for player confirmations.'));
  }
  detailEl.append(el('h4', null, 'Guide'));
  detailEl.append(el('p', null, trophy.guide));
  if (trophy.steps?.length) {
    detailEl.append(el('h4', null, 'Steps'));
    const steps = el('ol');
    for (const step of trophy.steps) steps.append(el('li', null, step));
    detailEl.append(steps);
  }
  detailEl.append(el('h4', null, 'Source'));
  const sourceLine = el('p', 'source-line');
  const link = document.createElement('a');
  link.href = trophy.source_url;
  link.textContent = trophy.source;
  link.target = '_blank';
  link.rel = 'noopener';
  sourceLine.append(link);
  detailEl.append(sourceLine);
  const copyBtn = el('button', 'copy-btn', 'Copy guide');
  copyBtn.type = 'button';
  copyBtn.addEventListener('click', async () => {
    const ok = await copyText(guideText(trophy));
    copyBtn.textContent = ok ? 'Copied ✓' : 'Copy failed — select the text instead';
    setTimeout(() => { copyBtn.textContent = 'Copy guide'; }, 2000);
  });
  detailEl.append(copyBtn);
  if (earned.has(trophy.name)) {
    detailEl.append(el('p', 'earned-date', `✓ Earned ${formatDate(earned.get(trophy.name))}`));
  }
  const noteLabel = el('label', 'note-label', 'Your note');
  const noteBox = document.createElement('textarea');
  noteBox.value = notes.get(trophy.name) ?? '';
  noteBox.placeholder = 'Where you left off, a good spot, a reminder…';
  noteBox.addEventListener('input', () => {
    const value = noteBox.value.trim();
    if (value) notes.set(trophy.name, value);
    else notes.delete(trophy.name);
    saveStore();
  });
  noteLabel.append(noteBox);
  detailEl.append(noteLabel);
}

// --- Roadmap view ---
function renderRoadmap() {
  const wrap = $('roadmap');
  wrap.replaceChildren();
  const current = currentPhaseIndex(trophies, earned);
  let phaseIndex = 0;
  for (const phase of ROADMAP_PHASES) {
    const card = el('article', 'phase');
    if (phaseIndex === current) {
      card.classList.add('current');
    }
    const title = el('h3');
    title.append(document.createTextNode(`${phase.title} `));
    title.append(el('span', 'phase-hours', `· about ${phase.hours} hours`));
    card.append(title, el('p', null, phase.text));
    if (phaseIndex === current) {
      card.append(el('p', 'phase-now', 'You are here — this is the phase you are standing in.'));
    }
    phaseIndex += 1;
    const members = trophies.filter((t) => phase.test(t));
    const names = members.map((t) => trophyLabel(t));
    card.append(el('p', 'phase-trophies', names.join(' · ')));
    const got = members.filter((t) => earned.has(t.name)).length;
    const bar = el('div', 'phase-progress');
    const fill = el('div', 'phase-fill');
    fill.style.width = `${Math.round((got / members.length) * 100)}%`;
    bar.append(fill);
    card.append(bar);
    card.append(el('p', 'phase-trophies', `${got} of ${members.length} earned in this phase`));
    wrap.append(card);
  }
  wrap.append(el('p', null, `Total: about ${ROADMAP_TOTAL_HOURS} hours to the platinum.`));
}

// --- Missables view ---
function renderMissables() {
  const wrap = $('missables');
  wrap.replaceChildren();
  const missable = trophies.find((t) => t.missable);
  const card = el('article', 'missable-card');
  card.append(el('h3', null, 'Positive Mental Attitude'));
  card.append(el('p', 'official', 'Official: “Meditate at every spot across Leonida.” (Bronze)'));
  card.append(el('p', null, missable.guide));
  const steps = el('ol');
  for (const step of missable.steps) steps.append(el('li', null, step));
  card.append(steps);
  const sourceLine = el('p', 'source-line');
  const link = document.createElement('a');
  link.href = missable.source_url;
  link.textContent = missable.source;
  link.target = '_blank';
  link.rel = 'noopener';
  sourceLine.append(link);
  card.append(sourceLine);
  wrap.append(card);

  wrap.append(el('h3', null, 'Everything else can be done after the story'));
  const safe = el('ul');
  for (const line of [
    'Story trophies unlock automatically and cannot be missed.',
    'Free roam continues after the credits, so side missions, activities, robberies and collectibles all stay open.',
    'There are no online trophies, no mission gold medals and no mission replay to worry about.',
    'Using a cheat disables trophies and saving for that session — save cheats for a throwaway save, or for after the list is done.',
  ]) safe.append(el('li', null, line));
  wrap.append(safe);

  wrap.append(el('h3', null, 'Still unconfirmed — do not chase guesses'));
  const unconfirmed = el('ul', 'unconfirmed-list');
  for (const t of trophies.filter((t) => !t.confirmed)) {
    const item = el('li');
    item.append(el('strong', null, t.name), document.createTextNode(` — ${t.description} `));
    item.append(badge('Not yet confirmed', 'unconfirmed-badge'));
    unconfirmed.append(item);
  }
  wrap.append(unconfirmed);
}

// --- Sources view ---
function renderSources() {
  const wrap = $('sources');
  wrap.replaceChildren();
  const seen = new Map();
  for (const t of trophies) {
    if (!seen.has(t.source_url)) seen.set(t.source_url, { name: t.source, count: 0 });
    seen.get(t.source_url).count += 1;
  }
  const list = el('ul', 'source-list');
  for (const [url, info] of seen) {
    const item = el('li');
    const link = document.createElement('a');
    link.href = url;
    link.textContent = info.name;
    link.target = '_blank';
    link.rel = 'noopener';
    item.append(link, document.createTextNode(` — cited by ${info.count} trophy guide${info.count === 1 ? '' : 's'}.`));
    list.append(item);
  }
  wrap.append(list);
  wrap.append(el('p', null, 'Links open only when you follow them. The app itself fetches nothing: it works with the network off, and your checklist is saved only in your own browser.'));
}

// --- Tabs ---
const views = ['checklist', 'roadmap', 'missables', 'sources'];
function showView(name) {
  for (const view of views) {
    $(`view-${view}`).classList.toggle('hidden', view !== name);
  }
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === name);
  }
  if (name === 'roadmap') renderRoadmap();
  if (name === 'missables') renderMissables();
  if (name === 'sources') renderSources();
}
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => showView(tab.dataset.view));
}

// --- Toolbar wiring ---
for (const control of [searchEl, kindEl, gradeEl, statusEl, sortEl, chapterEl]) {
  control.addEventListener('input', renderList);
}
planSizeEl.addEventListener('change', () => {
  planSize = Number(planSizeEl.value) || 5;
  renderPlan();
});

// Keyboard: / focuses the search box, n jumps to the next unearned trophy
// in the list as filtered right now.
document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, select')) return;
  if (event.key === '/') {
    event.preventDefault();
    searchEl.focus();
  } else if (event.key === 'n') {
    const next = visibleTrophies().find((t) => !earned.has(t.name));
    if (next) {
      selectedName = next.name;
      renderList();
      renderDetail(next);
    }
  }
});
spoilersEl.checked = hideSpoilers;
spoilersEl.addEventListener('change', () => {
  hideSpoilers = spoilersEl.checked;
  saveStore();
  renderList();
  if (selectedName) renderDetail(byName.get(selectedName));
});

// --- Export / import / reset ---
$('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({
    game: 'Grand Theft Auto VI',
    exported: new Date().toISOString(),
    earned: Object.fromEntries(earned),
    notes: Object.fromEntries(notes),
  }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
});
$('import').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const incoming = data.earned ?? data;
    let added = 0;
    for (const [name, date] of Object.entries(incoming)) {
      if (!byName.has(name)) continue;
      earned.set(name, typeof date === 'string' ? date : new Date().toISOString().slice(0, 10));
      added += 1;
    }
    for (const [name, note] of Object.entries(data.notes ?? {})) {
      if (byName.has(name) && typeof note === 'string') notes.set(name, note);
    }
    saveStore();
    renderProgress();
    renderList();
    renderRoadmap();
    alert(`Imported ${added} earned trophies.`);
  } catch {
    alert('That file could not be read as progress — is it a Leonida Trophy Guide export?');
  }
  event.target.value = '';
});
$('reset').addEventListener('click', () => {
  if (!confirm('Clear every tick and note? This cannot be undone — export first if you want a copy.')) return;
  earned.clear();
  notes.clear();
  selectedName = null;
  saveStore();
  renderProgress();
  renderList();
  renderDetail(null);
  renderRoadmap();
});

// --- First paint, honoring the address bar ---
if (params.get('q')) searchEl.value = params.get('q');
if (params.get('grade') && ['platinum', 'gold', 'silver', 'bronze'].includes(params.get('grade'))) {
  gradeEl.value = params.get('grade');
}
if (params.get('view') && views.includes(params.get('view'))) showView(params.get('view'));
renderProgress();
renderList();
renderRoadmap();
renderMissables();
renderSources();
// ?trophy=<id> deep-links straight to a trophy's guide in the detail pane.
const focusId = Number(params.get('trophy'));
if (focusId && byId.has(focusId)) {
  selectedName = byId.get(focusId).name;
  renderList();
  renderDetail(byId.get(focusId));
}

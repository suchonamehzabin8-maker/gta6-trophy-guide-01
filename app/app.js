// Leonida Trophy Guide — checklist, roadmap, tonight's plan, missables.
// All data comes from data/trophies.json. Progress lives in this browser only.

import { PHASES, trophiesInPhase, phaseProgress, hoursLeft } from "./roadmap.js";
import { buildPlan, planSummary } from "./plan.js";

const STORAGE_KEY = "leonida-trophies-v1";

const $ = (selector) => document.querySelector(selector);

const state = {
  trophies: [],
  earned: new Set(),
  view: "checklist",
  query: "",
  kind: "all",
  chapter: "all",
  show: "all",
  spoiler: false,
  detailId: null,
};

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed.earned) ? parsed.earned : []);
  } catch {
    return new Set();
  }
}

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...state.earned].sort((a, b) => a - b) }));
}

function gradeLabel(trophy) {
  return trophy.grade.charAt(0).toUpperCase() + trophy.grade.slice(1);
}

function targetLabel(trophy) {
  if (!trophy.target) return null;
  if (trophy.target >= 1000) return `$${trophy.target.toLocaleString("en-US")}`;
  return `× ${trophy.target}`;
}

function trophyTags(trophy) {
  const tags = [];
  tags.push({ text: gradeLabel(trophy), cls: "" });
  tags.push({ text: trophy.kind, cls: "" });
  if (trophy.chapter) tags.push({ text: `Chapter ${trophy.chapter}`, cls: "" });
  const target = targetLabel(trophy);
  if (target) tags.push({ text: target, cls: "target" });
  if (trophy.missable) tags.push({ text: "Missable", cls: "warn" });
  if (!trophy.confirmed) tags.push({ text: "Unconfirmed", cls: "unconfirmed" });
  return tags;
}

function tagsHtml(trophy) {
  return trophyTags(trophy)
    .map((tag) => `<span class="tag${tag.cls ? ` ${tag.cls}` : ""}">${tag.text}</span>`)
    .join("");
}

function descriptionFor(trophy) {
  if (state.spoiler && trophy.story && !state.earned.has(trophy.id)) {
    return "Hidden story trophy — earn it to reveal the description.";
  }
  return trophy.description;
}

function matchesFilters(trophy) {
  if (state.query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!haystack.includes(state.query)) return false;
  }
  if (state.kind !== "all" && trophy.kind !== state.kind) return false;
  if (state.chapter !== "all") {
    if (state.chapter === "none" && trophy.chapter !== null) return false;
    if (state.chapter !== "none" && trophy.chapter !== Number(state.chapter)) return false;
  }
  if (state.show === "earned" && !state.earned.has(trophy.id)) return false;
  if (state.show === "remaining" && state.earned.has(trophy.id)) return false;
  return true;
}

function trophyRow(trophy) {
  const earned = state.earned.has(trophy.id);
  const li = document.createElement("li");
  li.className = `trophy${earned ? " earned" : ""}`;
  li.dataset.id = trophy.id;
  const spoilerHidden = state.spoiler && trophy.story && !earned;
  li.innerHTML = `
    <input type="checkbox" class="trophy-check" ${earned ? "checked" : ""} aria-label="Mark ${trophy.name} as earned">
    <span class="grade-dot grade-${trophy.grade}" title="${gradeLabel(trophy)}"></span>
    <div class="trophy-body">
      <div class="trophy-name">${trophy.name}</div>
      <p class="trophy-desc${spoilerHidden ? " spoiler-hidden" : ""}">${descriptionFor(trophy)}</p>
      <div class="tag-row">${tagsHtml(trophy)}</div>
    </div>`;
  li.querySelector(".trophy-check").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleEarned(trophy.id);
  });
  li.addEventListener("click", () => openDetail(trophy.id));
  return li;
}

function renderList() {
  const list = $("#trophy-list");
  list.replaceChildren();
  const visible = state.trophies.filter(matchesFilters);
  for (const trophy of visible) list.appendChild(trophyRow(trophy));
  $("#list-count").textContent = `${visible.length} of ${state.trophies.length} shown`;
  $("#empty-note").hidden = visible.length > 0;
}

function renderMissables() {
  const list = $("#missables-list");
  list.replaceChildren();
  for (const trophy of state.trophies.filter((t) => t.missable)) {
    list.appendChild(trophyRow(trophy));
  }
}

function renderProgress() {
  const total = state.trophies.length;
  const done = state.earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("#progress-ring").style.setProperty("--pct", String(pct));
  $("#progress-text").textContent = `${done} / ${total}`;
  $("#progress-note").textContent =
    done === total
      ? "Platinum earned — Leonida Legend!"
      : `${done} earned · ${total - done} to go`;
  const left = hoursLeft(state.trophies, state.earned);
  $("#time-left").textContent =
    done === total ? "About 0 hours left — enjoy the platinum." : `About ${left} hours to the platinum`;
}

function renderRoadmap() {
  const list = $("#roadmap-list");
  list.replaceChildren();
  for (const phase of PHASES) {
    const { total, done } = phaseProgress(state.trophies, state.earned, phase.id);
    const names = trophiesInPhase(state.trophies, phase.id)
      .map((t) => t.name)
      .join(" · ");
    const li = document.createElement("li");
    li.className = "phase";
    li.innerHTML = `
      <div class="phase-head"><h3>${phase.title}</h3><span class="phase-hours">${done}/${total} · ~${phase.hours}h</span></div>
      <p>${phase.blurb}</p>
      <p class="phase-trophies">${names}</p>`;
    list.appendChild(li);
  }
}

function renderPlan() {
  const hours = Number($("#plan-hours").value) || 2;
  const plan = buildPlan(state.trophies, state.earned, hours);
  const out = $("#plan-output");
  out.replaceChildren();
  const summary = document.createElement("p");
  summary.className = "plan-total";
  summary.textContent = planSummary(plan);
  out.appendChild(summary);
  for (const { trophy, minutes } of plan.picks) {
    const div = document.createElement("div");
    div.className = "plan-item";
    div.innerHTML = `<strong>${trophy.name}</strong> <span class="tag">${minutes} min</span>
      <p>${trophy.description} ${trophy.guide}</p>`;
    div.addEventListener("click", () => openDetail(trophy.id));
    out.appendChild(div);
  }
}

function renderAll() {
  renderProgress();
  renderList();
  renderMissables();
  renderRoadmap();
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveEarned();
  renderAll();
  if (state.detailId === id) fillDetail(id);
}

function openDetail(id) {
  state.detailId = id;
  fillDetail(id);
  $("#detail").hidden = false;
}

function closeDetail() {
  state.detailId = null;
  $("#detail").hidden = true;
}

function fillDetail(id) {
  const trophy = state.trophies.find((t) => t.id === id);
  if (!trophy) return;
  $("#detail-grade").textContent = gradeLabel(trophy);
  $("#detail-grade").className = `detail-grade grade-${trophy.grade}`;
  $("#detail-name").textContent = trophy.name;
  $("#detail-desc").textContent = trophy.description;
  $("#detail-tags").innerHTML = tagsHtml(trophy);
  $("#detail-guide").textContent = trophy.guide;
  const steps = $("#detail-steps");
  steps.replaceChildren();
  for (const step of trophy.steps) {
    const li = document.createElement("li");
    li.textContent = step;
    steps.appendChild(li);
  }
  const source = $("#detail-source");
  source.replaceChildren();
  source.append("Source: ");
  const link = document.createElement("a");
  link.href = trophy.source_url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = trophy.source;
  source.appendChild(link);
  if (!trophy.confirmed) {
    source.append(" — trigger not yet confirmed by published guides.");
  }
  const earned = state.earned.has(id);
  $("#detail-toggle").textContent = earned ? "Mark as not earned" : "Mark as earned";
}

function setView(view) {
  state.view = view;
  for (const button of document.querySelectorAll(".tab")) {
    button.classList.toggle("active", button.dataset.view === view);
  }
  for (const section of document.querySelectorAll(".view")) {
    section.hidden = section.id !== `view-${view}`;
  }
  if (view === "plan") renderPlan();
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
  return Promise.resolve();
}

function guideText() {
  const lines = ["Leonida Trophy Guide — my progress", ""];
  lines.push(`Earned ${state.earned.size} of ${state.trophies.length}.`);
  const remaining = state.trophies.filter((t) => !state.earned.has(t.id));
  lines.push("", "Still to earn:");
  for (const trophy of remaining) {
    lines.push(`- ${trophy.name} (${gradeLabel(trophy)}): ${trophy.description}`);
    lines.push(`  ${trophy.guide}`);
  }
  return lines.join("\n");
}

function wireEvents() {
  for (const button of document.querySelectorAll(".tab")) {
    button.addEventListener("click", () => setView(button.dataset.view));
  }
  $("#search").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderList();
  });
  $("#kind-filter").addEventListener("change", (event) => {
    state.kind = event.target.value;
    renderList();
  });
  $("#chapter-filter").addEventListener("change", (event) => {
    state.chapter = event.target.value;
    renderList();
  });
  $("#earned-filter").addEventListener("change", (event) => {
    state.show = event.target.value;
    renderList();
  });
  $("#spoiler-toggle").addEventListener("change", (event) => {
    state.spoiler = event.target.checked;
    renderList();
  });
  $("#detail-close").addEventListener("click", closeDetail);
  $("#detail-toggle").addEventListener("click", () => {
    if (state.detailId !== null) toggleEarned(state.detailId);
  });
  $("#plan-build").addEventListener("click", renderPlan);
  $("#copy-btn").addEventListener("click", async (event) => {
    await copyText(guideText());
    event.target.textContent = "Copied!";
    setTimeout(() => { event.target.textContent = "Copy my guide"; }, 1500);
  });
  $("#export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ earned: [...state.earned].sort((a, b) => a - b) }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leonida-trophies-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  });
  $("#import-btn").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const ids = new Set(state.trophies.map((t) => t.id));
      state.earned = new Set((parsed.earned ?? []).filter((id) => ids.has(id)));
      saveEarned();
      renderAll();
    } catch {
      alert("That file is not a progress export from this guide.");
    }
    event.target.value = "";
  });
  $("#reset-btn").addEventListener("click", () => {
    if (!confirm("Clear every earned trophy?")) return;
    state.earned.clear();
    saveEarned();
    renderAll();
  });
  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    if (event.key === "/") {
      event.preventDefault();
      $("#search").focus();
    } else if (event.key === "n" || event.key === "N") {
      const next = state.trophies.find((t) => !state.earned.has(t.id));
      if (next) openDetail(next.id);
    } else if (event.key === "Escape") {
      closeDetail();
    }
  });
}

async function init() {
  const response = await fetch("data/trophies.json");
  const data = await response.json();
  state.trophies = data.trophies;
  state.earned = loadEarned();
  wireEvents();
  renderAll();
  window.__guide = {
    state,
    openTrophy: openDetail,
    setView,
    setEarned(ids) {
      state.earned = new Set(ids);
      saveEarned();
      renderAll();
    },
    clearEarned() {
      state.earned.clear();
      saveEarned();
      renderAll();
    },
  };
  window.__guideReady = true;
}

init();

// Tonight's plan, time left, and recent activity. Pure functions over the
// trophy list, the earned map and the roadmap phases, so the checklist can
// render them without touching its own state.
//
// Time is estimated, never promised: each phase's hours are spread evenly
// across the trophies it covers, so a trophy's share is its phase's hours
// divided by that phase's trophy count. A phase with one trophy (the
// missable meditation) gives that trophy the whole phase.
import { ROADMAP_PHASES, phaseOf } from './roadmap.js';

// Hours one trophy is worth, from its phase's share.
export function hoursPerTrophy(trophies) {
  const counts = new Map();
  for (const trophy of trophies) {
    const phase = phaseOf(trophy);
    counts.set(phase, (counts.get(phase) ?? 0) + 1);
  }
  const hours = new Map();
  for (const trophy of trophies) {
    const phase = phaseOf(trophy);
    const share = phase >= 0
      ? ROADMAP_PHASES[phase].hours / (counts.get(phase) ?? 1)
      : 0;
    hours.set(trophy.id, share);
  }
  return hours;
}

// How many hours the trophies still to earn are worth, about.
export function estimateRemainingHours(trophies, earned) {
  const hours = hoursPerTrophy(trophies);
  let left = 0;
  for (const trophy of trophies) {
    if (!earned.has(trophy.name)) left += hours.get(trophy.id) ?? 0;
  }
  return left;
}

// The next `size` unearned trophies in roadmap order (phase, then chapter,
// then name), each with its hour share, grouped by phase for display.
export function buildTonightPlan(trophies, earned, size) {
  const ordered = trophies
    .filter((t) => !earned.has(t.name))
    .sort((a, b) =>
      phaseOf(a) - phaseOf(b) ||
      (a.chapter ?? 99) - (b.chapter ?? 99) ||
      a.name.localeCompare(b.name));
  const picked = ordered.slice(0, Math.max(1, size));
  const hours = hoursPerTrophy(trophies);
  const groups = [];
  for (const trophy of picked) {
    const phase = phaseOf(trophy);
    let group = groups.find((g) => g.phase === phase);
    if (!group) {
      group = {
        phase,
        title: phase >= 0 ? ROADMAP_PHASES[phase].title : 'Unphased',
        items: [],
      };
      groups.push(group);
    }
    group.items.push({ trophy, hours: hours.get(trophy.id) ?? 0 });
  }
  const totalHours = picked.reduce((sum, t) => sum + (hours.get(t.id) ?? 0), 0);
  return { groups, totalHours, remaining: ordered.length };
}

// Trophies earned in the last `days` days, newest first, with their dates.
export function recentlyEarned(earned, trophies, days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const byName = new Map(trophies.map((t) => [t.name, t]));
  return [...earned.entries()]
    .map(([name, date]) => ({ trophy: byName.get(name), date }))
    .filter((entry) => entry.trophy && new Date(`${entry.date}T00:00:00Z`) >= cutoff)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// The phase the player is standing in: the first phase with a trophy
// still to earn, or -1 when the whole roadmap is done.
export function currentPhaseIndex(trophies, earned) {
  for (let i = 0; i < ROADMAP_PHASES.length; i++) {
    if (trophies.some((t) => phaseOf(t) === i && !earned.has(t.name))) return i;
  }
  return -1;
}

// Plain text of a trophy's guide, for the copy button in the detail pane.
export function guideText(trophy) {
  const lines = [`${trophy.name} (${trophy.grade})`, `Official: ${trophy.description}`, '', trophy.guide];
  if (trophy.steps?.length) {
    lines.push('');
    trophy.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  lines.push('', `Source: ${trophy.source} — ${trophy.source_url}`);
  return lines.join('\n');
}

// Copy text with the clipboard API where it exists, falling back to the
// old textarea trick for browsers without it. Returns true when copied.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const box = document.createElement('textarea');
      box.value = text;
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.append(box);
      box.select();
      const ok = document.execCommand('copy');
      box.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

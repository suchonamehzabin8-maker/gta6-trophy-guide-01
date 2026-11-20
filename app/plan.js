// Tonight's plan: given the trophies still to earn and the hours available,
// pick a session in roadmap order — the missable one first if it is still
// open — and say how long each step should take. Estimates are rough on
// purpose: a session that ends early beats one that overruns.

import { PHASES } from "./roadmap.js";

// Minutes a trophy of each kind usually takes once you are set up for it.
const MINUTES = {
  story: 45,
  side: 40,
  activities: 30,
  crime: 25,
  collectibles: 45,
  money: 20,
};

function minutesFor(trophy) {
  if (trophy.target && trophy.target >= 100) return 90;
  if (trophy.target && trophy.target >= 20) return 60;
  return MINUTES[trophy.kind] ?? 30;
}

export function buildPlan(trophies, earned, hours) {
  const budget = Math.max(1, Math.min(12, hours || 2)) * 60;
  const remaining = trophies.filter((trophy) => !earned.has(trophy.id));
  // Missable first, then roadmap order, then the shortest jobs first inside
  // a phase so a short session still finishes something.
  const ordered = [...remaining].sort((a, b) => {
    if (a.missable !== b.missable) return a.missable ? -1 : 1;
    if (a.phase !== b.phase) return a.phase - b.phase;
    return minutesFor(a) - minutesFor(b);
  });

  const picks = [];
  let spent = 0;
  for (const trophy of ordered) {
    const cost = minutesFor(trophy);
    if (spent + cost > budget && picks.length > 0) continue;
    if (spent + cost > budget * 1.25) continue;
    picks.push({ trophy, minutes: cost });
    spent += cost;
    if (spent >= budget) break;
  }

  const phaseName = (id) => PHASES.find((phase) => phase.id === id)?.title ?? "Cleanup";
  return {
    picks,
    spent,
    budget,
    left: remaining.length - picks.length,
    describe: () =>
      picks.map(
        ({ trophy, minutes }) =>
          `${trophy.name} — about ${minutes} min (${phaseName(trophy.phase)})`,
      ),
  };
}

export function planSummary(plan) {
  if (plan.picks.length === 0) return "Nothing fits in that session — try more hours.";
  const names = plan.picks.map(({ trophy }) => trophy.name).join(", ");
  const tail =
    plan.left > 0
      ? ` ${plan.left} ${plan.left === 1 ? "trophy" : "trophies"} still waiting after tonight.`
      : " That clears the whole list.";
  return `Tonight: ${names}. About ${plan.spent} minutes of play.${tail}`;
}

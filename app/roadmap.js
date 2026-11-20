// The road to the platinum, in six phases. Hours are hunter estimates that
// add up to about 200 for the whole list; a phase's trophies come from the
// phase field in app/data/trophies.json, so the counts can never drift.

export const PHASES = [
  {
    id: 0,
    title: "Play the story",
    hours: 25,
    blurb:
      "Chapters 1 to 5, start to credits. Every chapter trophy and every named-mission trophy pops on its own as the plot reaches it. Do not detour yet — side content waits in free roam.",
  },
  {
    id: 1,
    title: "The one missable, now",
    hours: 1,
    blurb:
      "A single trophy, a single habit: meditate at Jason's house the first chance you get in Chapter 1, then keep meditating at every spot you pass. It is the only trophy the guides flag as possibly missable.",
  },
  {
    id: 2,
    title: "Stranger strands",
    hours: 15,
    blurb:
      "The people of Leonida: Andy, Kenton, Billy, Randy, Tyrone and Bret, plus the eight-strand count. Take every stranger marker you pass and finish each strand to its final mission.",
  },
  {
    id: 3,
    title: "Activities",
    hours: 35,
    blurb:
      "The taster tour and the grinds: 250 stunts, 42 gold shooting-range challenges, 14 drone-race venues, 20 different race wins, 50 challenges, fishing with Cal, the arcade and the bowling alley.",
  },
  {
    id: 4,
    title: "Crime and money",
    hours: 45,
    blurb:
      "The wanted-level work, the robberies and the cash: five bank vaults, armored trucks, shop chains with your partner, gang operations, 500 Criminal Profile actions, and the money trophies that ride along.",
  },
  {
    id: 5,
    title: "Collectibles and cleanup",
    hours: 79,
    blurb:
      "The long tail: card sets, 100 WAiNK locations, 100 vehicles, every corner of the map, the five still-unconfirmed trophies to check back on — and 100% Completion, then the platinum itself.",
  },
];

export const TOTAL_HOURS = PHASES.reduce((sum, phase) => sum + phase.hours, 0);

export function trophiesInPhase(trophies, phaseId) {
  return trophies.filter((trophy) => trophy.phase === phaseId);
}

export function phaseProgress(trophies, earned, phaseId) {
  const inPhase = trophiesInPhase(trophies, phaseId);
  const done = inPhase.filter((trophy) => earned.has(trophy.id)).length;
  return { total: inPhase.length, done };
}

export function hoursLeft(trophies, earned) {
  // A phase counts as partly done in proportion to its earned trophies.
  let left = 0;
  for (const phase of PHASES) {
    const { total, done } = phaseProgress(trophies, earned, phase.id);
    if (total === 0) continue;
    left += phase.hours * (1 - done / total);
  }
  return Math.round(left);
}

// Roadmap to the platinum: six phases in order, about 200 hours in all.
// A phase is a rule, not a list: each phase names the trophies it covers by
// testing the trophy itself (story flag, missable flag, kind, confirmed),
// so a trophy can only land in one phase and a miscounted list shows up as
// an empty phase or a trophy with no phase instead of a silent omission.
// The platinum itself is the last phase's payoff: it pops with 100%
// Completion, so it sits in phase 6, not with the story trophies.
export const ROADMAP_PHASES = [
  {
    key: 'story',
    title: 'Phase 1 — Play the story',
    hours: 30,
    text: 'Play the story start to finish before grinding anything else. The twelve story trophies land on their own as the chapters fall, and finishing the story opens the whole map, the gangs and the activities that everything else on this list needs.',
    test: (t) => t.story === true,
  },
  {
    key: 'missable',
    title: 'Phase 2 — The one missable, first',
    hours: 2,
    text: 'One meditation spot sits at Jason\u2019s house in Chapter 1, and it is the only one you can lose. Meditate there before the story moves on, then pick up the other seventeen spots whenever you pass one — none of the rest are ever locked away.',
    test: (t) => t.missable === true,
  },
  {
    key: 'side',
    title: 'Phase 3 — Strangers & side missions',
    hours: 15,
    text: 'Work the stranger strands as you find them: eight strands for the Strangers & Freaks trophy, plus the named characters\u2019 final missions. It all counts toward 100% Completion too, so none of this time is wasted.',
    test: (t) => t.kind === 'side',
  },
  {
    key: 'activities',
    title: 'Phase 4 — Activities, races & skills',
    hours: 40,
    text: 'The long activity grind, in free roam: stunts, gold in every Shooting Range challenge, drone races at the Top Fun venues, race wins, the fishing challenge, bowling, one arcade game, the challenge count and maxing strength with both Jason and Lucia.',
    test: (t) => t.kind === 'activities' && !t.missable && t.confirmed,
  },
  {
    key: 'crime',
    title: 'Phase 5 — Crime & money',
    hours: 38,
    text: 'Crime pays, slowly: bank vaults, armored trucks, shop robberies with your partner, a jewelry store robbed unseen, a stolen tank, one illegal operation per gang — and the money trophies that ride along with them, laundering marked bills and spending across the shops.',
    test: (t) => (t.kind === 'crime' || t.kind === 'money') && t.confirmed,
  },
  {
    key: 'cleanup',
    title: 'Phase 6 — Collectibles, the unconfirmed five & 100%',
    hours: 75,
    text: 'Cleanup. Card sets, WAiNK spots, vehicle discovery, every region of Leonida explored, garages bought and vehicles registered — plus the five trophies whose exact triggers players have not pinned down yet, once they do. A Long Road (100% Completion) pops last, and the Platinum pops with it.',
    test: (t) =>
      t.kind === 'collectibles' ||
      !t.confirmed ||
      t.id === 14 ||
      t.grade === 'platinum',
  },
];

// Every trophy in the list must match exactly one phase, in order: the
// first phase whose test passes claims it. main.ts checks this at hand-in.
export function phaseOf(trophy) {
  for (let i = 0; i < ROADMAP_PHASES.length; i++) {
    if (ROADMAP_PHASES[i].test(trophy)) return i;
  }
  return -1;
}

export const ROADMAP_TOTAL_HOURS = ROADMAP_PHASES.reduce(
  (sum, phase) => sum + phase.hours,
  0,
);

// Screenshot scenes for shots.json. Read ?shot= and stage the guide into a
// fixed, deterministic state, then raise __shotReady for the screenshot tool.
// Scenes: checklist (early story progress), guide (the missable trophy open),
// roadmap (phases), missables (the one trophy that can be missed).

function waitForGuide() {
  return new Promise((resolve) => {
    if (window.__guideReady && window.__guide) return resolve(window.__guide);
    const timer = setInterval(() => {
      if (window.__guideReady && window.__guide) {
        clearInterval(timer);
        resolve(window.__guide);
      }
    }, 50);
    setTimeout(() => {
      clearInterval(timer);
      resolve(window.__guide ?? null);
    }, 5000);
  });
}

async function stage() {
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  if (!shot) return;
  const guide = await waitForGuide();
  if (!guide) {
    window.__shotReady = true;
    return;
  }

  // Every scene starts from the same clean slate, then stages its own state.
  guide.clearEarned();

  if (shot === "checklist") {
    // Early story: the first chapter's story trophies earned.
    guide.setEarned([2, 3, 28]);
    guide.setView("checklist");
  } else if (shot === "guide") {
    guide.setEarned([2, 3]);
    guide.setView("checklist");
    guide.openTrophy(28);
  } else if (shot === "roadmap") {
    guide.setEarned([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 28]);
    guide.setView("roadmap");
  } else if (shot === "missables") {
    guide.setView("missables");
  }

  // Let the render settle, then signal the screenshot tool.
  requestAnimationFrame(() => {
    setTimeout(() => {
      window.__shotReady = true;
    }, 350);
  });
}

stage();

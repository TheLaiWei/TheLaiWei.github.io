import { skillPreview } from "./preview.mjs";
import { snapshot, playBattle } from "./battle.mjs";
import { supports } from "./synergy.mjs";
import { eventText } from "./events.mjs";
import {
  zh,
  t,
  setLanguage,
  preferredLanguage,
  cardName,
  cardText,
  skillText,
  draftText,
} from "./language.mjs";
setLanguage(preferredLanguage());
import {
  classes,
  cards,
  skills,
  qualities,
  byId,
  replacement,
  slotsFor,
  dependencies,
} from "./catalog.mjs";
import {
  newMatch,
  art,
  luck,
  eligibleOdds,
  startRound,
  eligible,
  applyCard,
  offer,
  resolve,
} from "./engine.mjs";
const $ = (s) => document.querySelector(s),
  table = $("#table"),
  info = $("#info");
const paths = [
  ["Guardian", "Assassin", "Duelist"],
  ["Elementalist", "Warden", "Battlemage"],
  ["Healer", "Inquisitor", "Blessing"],
];
const baseArt = ["fighter-guardian", "mage-elementalist", "priest-healer"];
const image = (name, alt = "") =>
  '<img src="./art/' + name + '.svg" alt="' + alt + '">';
function drawPaths() {
  $("#paths").innerHTML = classes
    .map(
      (name, i) =>
        "<article>" +
        image(baseArt[i]) +
        "<div><h3>" +
        t(name) +
        "</h3><p>" +
        paths[i].map(t).join(" · ") +
        "</p></div></article>",
    )
    .join("");
}
const btn = (action, label, cls = "", disabled = false) =>
  '<button type="button" data-action="' +
  action +
  '" class="' +
  cls +
  '" ' +
  (disabled ? "disabled" : "") +
  ">" +
  t(label) +
  "</button>";
function dialog(title, html, side = 0) {
  info.classList.toggle("reverse", side === 1);
  $("#info-body").innerHTML = "<h2>" + t(title) + "</h2>" + html;
  if (!info.open) info.showModal();
}
info.querySelector(".exit").onclick = () => info.close();
const instructions = [
  "Place your phone between you. Shield your edge with one hand and open your private tray. Choose a skill and target for every living hero.",
  "Lock both plans. Faster actions resolve first. Guard and barriers have priority. Speed ties alternate favored seats each round. An action aimed at a fallen target misses.",
  "Read the results, then privately draft one of three cards. Both picks are revealed together. Drafted passives last the match. A replacement can change your hero\u2019s role.",
  "Marks add 4 damage to the next active hit. Specialized cards enter the draft when a living hero can use their effect. Taunt redirects single-target attacks, while Flame Storm hits every living enemy.",
  "Defeat all three enemies to win.",
];
$("#rules").onclick = () =>
  dialog(
    "How to play",
    "<ol>" +
      instructions.map((line) => "<li>" + t(line) + "</li>").join("") +
      "</ol>",
  );
const summary = (c) =>
  cardText(c) +
  " " +
  (c.skill
    ? t("Replaces one skill.")
    : c.limit === Infinity
      ? t("Unlimited stacks.")
      : zh
        ? (c.id === "exploit" ? "每队" : "每名英雄") +
          "最多叠加 " +
          c.limit +
          " 次。"
        : "Max " +
          c.limit +
          " per " +
          (c.id === "exploit" ? "party" : "hero") +
          ".");
const illustrations = {
  Taunt: "fighter-guardian",
  Ambush: "fighter-assassin",
  Riposte: "fighter-duelist",
  Guard: "fighter-guardian",
  Aegis: "mage-warden",
  Discharge: "mage-battlemage",
  Flare: "mage-elementalist",
  Judgment: "priest-inquisitor",
  Bless: "priest-blessing",
  Haste: "priest-blessing",
  Mend: "priest-healer",
};
const motifs = {
  guard: ["plate", "feint", "iron", "mail", "guarded", "cover", "stalwart"],
  speed: ["foot", "tempo", "pilgrim", "stride", "rally"],
  strike: [
    "edge",
    "execution",
    "drill",
    "comet",
    "focus",
    "concentrate",
    "afterburn",
  ],
  mark: [
    "quarry",
    "pursuit",
    "cinder",
    "sight",
    "exploit",
    "cleanse",
    "aim",
    "shadowstep",
  ],
  barrier: [
    "thread",
    "cloak",
    "lattice",
    "mirror",
    "feedback",
    "surge",
    "sanctuary",
    "relay",
    "overflow",
    "pulse",
    "prayer",
  ],
  holy: ["votive", "prism", "verdict", "holyverdict"],
  blessing: ["mercy", "fervor", "dawn", "ration", "vigor", "doublebless"],
  luck: ["luck"],
};
function cardFace(c) {
  const icon =
    illustrations[c.skill] ||
    "card-" + Object.keys(motifs).find((k) => motifs[k].includes(c.id));
  return (
    '<div class="card-face q' +
    c.tier +
    '">' +
    image(icon) +
    "<div><small>" +
    t(qualities[c.tier]) +
    " · " +
    t(c.group) +
    "</small><strong>" +
    cardName(c) +
    "</strong><p>" +
    summary(c) +
    "</p></div></div>"
  );
}
$("#library").onclick = () =>
  dialog(
    "Card collection",
    classes
      .concat("Any")
      .map(
        (n) =>
          "<details><summary>" +
          t(n === "Any" ? "Shared party" : n) +
          " · " +
          cards.filter((c) => c.group === n).length +
          " " +
          (zh ? "张卡牌" : "cards") +
          "</summary>" +
          cards
            .filter((c) => c.group === n)
            .map(cardFace)
            .join("") +
          "</details>",
      )
      .join(""),
  );
let g,
  phase,
  plans,
  locked,
  opened,
  panels,
  offers,
  picks,
  cursor,
  results = [];
function resetTrays() {
  locked = [false, false];
  opened = [false, false];
  panels = [null, null];
  cursor = [0, 0];
}
function beginPlan() {
  startRound(g);
  phase = "plan";
  plans = [[], []];
  resetTrays();
  cursor = g.teams.map((team) => team.findIndex((h) => h.hp));
}
$("#start").onclick = () => {
  g = newMatch();
  results = [];
  beginPlan();
  $("#welcome").hidden = true;
  table.hidden = false;
  document.body.classList.add("playing");
  window.scrollTo(0, 0);
  render();
};
function publicHero(h, i) {
  const status = [
    h.ward ? "◇" + h.ward.left : "",
    h.mark ? t("Marked") : "",
    h.guard?.source.hp ? t("Guard") : "",
    h.bless ? t("Blessed") : "",
    h.bonusSpeed || h.nextSpeed ? t("Haste") : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return btn(
    "hero-" + i,
    image(art(h)) +
      "<span>" +
      t(h.name) +
      " <b>" +
      h.hp +
      "/" +
      h.max +
      '</b></span><meter min="0" max="' +
      h.max +
      '" value="' +
      h.hp +
      '"></meter><small>' +
      status +
      "</small>",
    "unit" + (!h.hp ? " out" : ""),
  );
}
function partyBar(s) {
  return (
    '<div data-side="' +
    s +
    '" class="roster ' +
    (s ? "reverse" : "") +
    '">' +
    g.teams[s].map(publicHero).join("") +
    "</div>"
  );
}
function privatePlan(s) {
  const i = cursor[s],
    h = g.teams[s][i],
    plan = plans[s][i];
  const choices = h.skills
    .map((name, slot) =>
      btn(
        "skill-" + slot,
        name,
        "choice " + (plan?.slot === slot ? "selected" : ""),
      ),
    )
    .join("");
  const skill = plan && skills[h.skills[plan.slot]];
  const automatic = skill && ["all", "self"].includes(skill[0]);
  const targets = automatic
    ? skill[0] === "self"
      ? t(h.name)
      : g.teams[1 - s]
          .filter((a) => a.hp)
          .map((a) => t(a.name))
          .join(" · ")
    : skill
      ? g.teams[skill[0] === "ally" ? s : 1 - s]
          .map((tgt, j) =>
            btn(
              "target-" + j,
              t(tgt.name) + " " + tgt.hp,
              "choice " + (plan.target === j ? "selected" : ""),
              !tgt.hp,
            ),
          )
          .join("")
      : "";
  const ready = g.teams[s].every(
    (a, j) => !a.hp || Number.isInteger(plans[s][j]?.target),
  );
  return (
    '<div class="tabs">' +
    g.teams[s]
      .map((a, j) =>
        btn(
          "actor-" + j,
          t(a.name) + (Number.isInteger(plans[s][j]?.target) ? " ✓" : ""),
          i === j ? "selected" : "",
          !a.hp,
        ),
      )
      .join("") +
    '</div><div class="options">' +
    choices +
    "</div>" +
    (skill
      ? '<div class="note">' +
        skillText(h.skills[plan.slot]) +
        skillPreview(g, s, i, plan.slot) +
        " " +
        t(
          automatic
            ? skill[0] === "all"
              ? "All living enemies"
              : "Self"
            : skill[0] === "ally"
              ? "Choose an ally."
              : "Choose an enemy.",
        ) +
        '</div><div class="options">' +
        targets +
        "</div>"
      : '<p class="note">' + t("Choose a skill.") + "</p>") +
    btn("lock", "Lock plan", "seal", !ready)
  );
}
function privateDraft(s) {
  const previous = offers[s];
  if (previous.some((c) => !eligible(g.teams[s], c, g.teams[1 - s]).length)) {
    offers[s] = offer(g.teams[s], Math.random, g.teams[1 - s], previous);
    if (!offers[s].includes(picks[s]?.card)) picks[s] = null;
  }
  const pick = picks[s],
    c = pick?.card;
  const hero = g.teams[s][pick?.target];
  const slotOptions = hero && c?.skill ? slotsFor(hero, c) : [];
  const needsSlot = c?.skill && !Number.isInteger(pick.slot);
  let warning = "";
  if (hero && c.skill && !needsSlot) {
    const team = g.teams[s];
    const after = team.map((a) =>
      a === hero
        ? {
            ...a,
            skills: a.skills.map((name, i) =>
              i === pick.slot ? c.skill : name,
            ),
          }
        : a,
    );
    const lost = team.flatMap((a, i) =>
      a.hp
        ? Object.keys(a.cards).filter(
            (id) =>
              supports(team, a, byId[id]) &&
              !supports(after, after[i], byId[id]) &&
              !(
                a === hero && dependencies[id]?.includes(hero.skills[pick.slot])
              ),
          )
        : [],
    );
    if (lost.length)
      warning =
        " " +
        t("Inactive after swap:") +
        " " +
        [...new Set(lost)].map((id) => cardName(byId[id])).join(" · ");
  }
  return (
    '<div class="draft-list">' +
    offers[s]
      .map(
        (c, i) =>
          '<button class="draft-option ' +
          (pick?.card === c ? "selected" : "") +
          '" data-action="card-' +
          i +
          '">' +
          cardFace(c) +
          '<small class="recipients">' +
          (zh ? "可选英雄" : "Eligible heroes") +
          " · " +
          eligible(g.teams[s], c, g.teams[1 - s])
            .map((j) => t(g.teams[s][j].name))
            .join(" / ") +
          "</small>" +
          "</button>",
      )
      .join("") +
    "</div>" +
    (c
      ? '<div class="options">' +
        eligible(g.teams[s], c)
          .map((j) =>
            btn(
              "recipient-" + j,
              g.teams[s][j].name,
              "choice " + (pick.target === j ? "selected" : ""),
            ),
          )
          .join("") +
        "</div>" +
        (slotOptions.length > 1
          ? '<p class="note">' +
            t("Choose a skill to replace") +
            '</p><div class="options">' +
            slotOptions
              .map((j) =>
                btn(
                  "swap-" + j,
                  t(hero.skills[j]) + " → " + t(c.skill),
                  "choice " + (pick.slot === j ? "selected" : ""),
                ),
              )
              .join("") +
            "</div>"
          : "") +
        (Number.isInteger(pick.target) && !needsSlot
          ? '<p class="note"><b>' +
            t(g.teams[s][pick.target].name) +
            "</b> · " +
            (replacement(g.teams[s][pick.target], c, {
              slot: pick.slot,
              skillName: t,
              skillText,
              cardName,
              inactive: t("Inactive after swap:"),
            }) || cardText(c)) +
            warning +
            "</p>"
          : "")
      : "") +
    btn(
      "lock",
      "Lock card",
      "seal",
      !Number.isInteger(pick?.target) || needsSlot,
    )
  );
}
function tray(s) {
  let body = "";
  if (panels[s])
    body =
      btn("closepanel", zh ? "返回" : "Back", "choice") +
      "<h3>" +
      t(panels[s].title) +
      "</h3>" +
      panels[s].html;
  else if (phase === "over")
    body =
      "<h3>" +
      t(g.winner === "draw" ? "Draw" : g.winner === s ? "Victory" : "Defeat") +
      "</h3>" +
      btn("replay", "Replay round", "choice") +
      " " +
      btn("restart", "Return to game room", "seal");
  else if (["combat", "reveal"].includes(phase))
    body =
      "<h3>" +
      t(phase === "combat" ? "Combat resolved" : "Cards revealed") +
      "</h3>" +
      (phase === "combat"
        ? btn("replay", "Replay round", "choice") + " "
        : "") +
      btn("log", "Read results", "choice") +
      " " +
      btn(
        "continue",
        phase === "combat" ? "Draft cards →" : "Plan next round →",
        "seal",
      );
  else if (locked[s])
    body =
      "<h3>" +
      t("Locked in") +
      '</h3><p class="note">' +
      t("Waiting for the other player.") +
      "</p>";
  else if (!opened[s])
    body =
      "<h3>" +
      t(phase === "plan" ? "Plan your moves" : "Choose a buff") +
      "</h3>" +
      btn(
        "open",
        phase === "plan" ? "Open private plan" : "Open private draft",
        "seal",
        false,
      );
  else body = phase === "plan" ? privatePlan(s) : privateDraft(s);
  return (
    '<section data-side="' +
    s +
    '" class="tray ' +
    (s ? "reverse" : "") +
    '"><header><strong>' +
    t("Player") +
    " " +
    (s + 1) +
    "</strong>" +
    btn("language", zh ? "English" : "简体中文", "link") +
    btn("luck", t("Luck") + " " + luck(g.teams[s]), "link") +
    (opened[s] ? btn("hide", "Hide", "link") : "") +
    '</header><div class="tray-content">' +
    body +
    "</div></section>"
  );
}
function render() {
  if (phase === "playback") return;
  table.innerHTML =
    tray(1) +
    '<section class="field">' +
    partyBar(1) +
    '<div class="roundline"><b>' +
    t("Round") +
    " " +
    g.round +
    "</b><span>" +
    t(
      {
        plan: "Secret planning",
        combat: "Combat results",
        draft: "Private draft",
        reveal: "Draft results",
        over: "Duel complete",
      }[phase],
    ) +
    "</span>" +
    btn("log", "Log", "link") +
    '</div><div class="ticker">' +
    (phase === "reveal"
      ? results.map(draftText).join("<br>")
      : results
          .slice(-2)
          .map((line) => (line.id ? draftText(line) : eventText(line, t, zh)))
          .join("<br>") || t("Choose one skill per hero, then lock in.")) +
    "</div>" +
    partyBar(0) +
    "</section>" +
    tray(0);
}
function lock(s) {
  locked[s] = true;
  opened[s] = false;
  panels[s] = null;
  if (!locked.every(Boolean)) return;
  panels = [null, null];
  if (phase === "plan") {
    battle = { initial: snapshot(g.teams), steps: [] };
    resolve(g, plans, (event) =>
      battle.steps.push({ event, after: snapshot(g.teams) }),
    );
    results = g.history.at(-1).events;
    launchPlayback();
  } else {
    results = picks.map(({ card, target, slot }, side) => {
      applyCard(g.teams[side], card, target, slot);
      return { side, hero: g.teams[side][target].name, id: card.id };
    });
    g.history.at(-1).picks = results.slice();
    phase = "reveal";
  }
}
function heroCards(h, s) {
  const entries = Object.entries(h.cards);
  if (!entries.length)
    return (
      '<p class="note">' +
      (zh ? "尚未选牌。" : "No cards drafted yet.") +
      "</p>"
    );
  return entries
    .map(([id, k]) => {
      const c = byId[id],
        rounds = g.history
          .filter((r) =>
            r.picks?.some(
              (p) => p.side === s && p.hero === h.name && p.id === id,
            ),
          )
          .map((r) => r.round);
      const active = c.skill
        ? h.skills.includes(c.skill)
        : supports(g.teams[s], h, c, g.teams[1 - s]);
      const state = c.skill
        ? active
          ? zh
            ? "已装备"
            : "Equipped"
          : zh
            ? "已替换"
            : "Replaced"
        : !active
          ? zh
            ? "联动未激活"
            : "Synergy inactive"
          : "";
      return (
        '<div class="owned-card">' +
        cardFace(c) +
        "<small>" +
        [
          k > 1 ? "×" + k : "",
          state,
          rounds.length ? t("Round") + " " + rounds.join(", ") : "",
        ]
          .filter(Boolean)
          .join(" · ") +
        "</small>" +
        (c.skill ? '<p class="note">' + skillText(c.skill) + "</p>" : "") +
        "</div>"
      );
    })
    .join("");
}
function redrawSide(s, resetScroll = false) {
  const old = table.querySelector('.tray[data-side="' + s + '"]');
  if (!old) return;
  const scroll = old.querySelector(".tray-content").scrollTop;
  old.outerHTML = tray(s);
  if (!resetScroll)
    table.querySelector(
      '.tray[data-side="' + s + '"] .tray-content',
    ).scrollTop = scroll;
}
function action(code, s) {
  const [type, raw] = code.split("-"),
    n = Number(raw),
    team = g.teams[s];
  if (type === "skip") {
    finishPlayback();
    return;
  }
  if (type === "replay") {
    launchPlayback();
    return;
  }
  if (type === "language") {
    switchLanguage();
    return;
  }
  const previousPhase = phase;
  if (type === "closepanel") panels[s] = null;
  if (type === "open" && !locked[s]) opened[s] = true;
  if (type === "hide") {
    panels[s] = null;
    opened[s] = false;
  }
  if (type === "actor") cursor[s] = n;
  if (type === "skill") {
    const i = cursor[s],
      mode = skills[team[i].skills[n]][0];
    plans[s][i] = {
      slot: n,
      target: mode === "all" ? -1 : mode === "self" ? i : undefined,
    };
  }
  if (type === "target") {
    plans[s][cursor[s]].target = n;
    const next = team.findIndex(
      (h, i) => h.hp && !Number.isInteger(plans[s][i]?.target),
    );
    if (next >= 0) cursor[s] = next;
  }
  if (type === "card") {
    const card = offers[s][n],
      targets = eligible(team, card, g.teams[1 - s]);
    picks[s] = { card, target: targets.length === 1 ? targets[0] : undefined };
  }
  if (type === "recipient") picks[s].target = n;
  if (type === "card" || type === "recipient") {
    const pick = picks[s];
    const opts =
      pick.card.skill && team[pick.target]
        ? slotsFor(team[pick.target], pick.card)
        : [];
    pick.slot = opts.length === 1 ? opts[0] : undefined;
  }
  if (type === "swap") picks[s].slot = n;
  if (type === "lock") lock(s);
  if (type === "continue") {
    if (phase === "combat") {
      phase = "draft";
      offers = g.teams.map((team, side) =>
        offer(team, Math.random, g.teams[1 - side]),
      );
      picks = [null, null];
      resetTrays();
    } else if (phase === "reveal") {
      g.round++;
      beginPlan();
    }
  }
  function showPanel(title, html) {
    panels[s] = { title, html };
  }
  if (type === "log")
    showPanel(
      "Combat log",
      g.history.length
        ? g.history
            .slice()
            .reverse()
            .map(
              (x) =>
                "<h3>" +
                t("Round") +
                " " +
                x.round +
                "</h3><ul>" +
                x.events
                  .map((ev) => eventText(ev, t, zh))
                  .concat((x.picks || []).map(draftText))
                  .map((y) => "<li>" + y + "</li>")
                  .join("") +
                "</ul>",
            )
            .join("")
        : "<p>" + t("No combat resolved yet.") + "</p>",
      s,
    );
  if (type === "luck") {
    showPanel(
      t("Party Luck") + " · " + luck(team),
      "<p>" +
        team.map((h) => t(h.name) + " " + h.luck).join(" + ") +
        "</p><p>" +
        t(
          "Current chance for the first offer. Later rolls exclude cards already drawn.",
        ) +
        "</p>" +
        eligibleOdds(team, g.teams[1 - s])
          .map(
            (v, i) =>
              "<p>" +
              t(qualities[i]) +
              " <b>" +
              Number(v.toFixed(1)) +
              "%</b></p>",
          )
          .join(""),
      s,
    );
  }
  if (type === "hero") {
    const h = team[n];
    showPanel(
      (zh ? "玩家" : "P") + (s + 1) + " · " + t(h.name),
      image(art(h)) +
        "<p>" +
        t("HP") +
        " " +
        h.hp +
        "/" +
        h.max +
        " · " +
        t("ATK") +
        " " +
        h.atk +
        " · " +
        t("DEF") +
        " " +
        h.def +
        " · " +
        t("Magic") +
        " " +
        h.mag +
        " · " +
        t("Resist") +
        " " +
        h.res +
        " · " +
        t("Speed") +
        " " +
        (h.speed + h.bonusSpeed) +
        " · " +
        t("Luck") +
        " " +
        h.luck +
        "</p>" +
        h.skills
          .map(
            (name, slot) =>
              "<p><b>" +
              t(name) +
              "</b> — " +
              skillText(name) +
              "</p>" +
              skillPreview(g, s, n, slot),
          )
          .join("") +
        "<h4>" +
        (zh ? "已选卡牌" : "Drafted cards") +
        "</h4>" +
        heroCards(h, s),
      s,
    );
  }
  if (type === "restart") {
    table.hidden = true;
    $("#welcome").hidden = false;
    document.body.classList.remove("playing");
    return;
  }
  if (phase === previousPhase)
    redrawSide(
      s,
      ["hero", "luck", "log", "closepanel", "lock", "open"].includes(type),
    );
  else render();
}
function activate(button) {
  if (!button?.isConnected || button.disabled) return;
  action(
    button.dataset.action,
    Number(button.closest("[data-side]")?.dataset.side || 0),
  );
}
const touches = new Map();
table.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch") {
    const button = e.target.closest("[data-action]");
    if (button)
      touches.set(e.pointerId, { button, x: e.clientX, y: e.clientY });
  }
});
table.addEventListener("pointercancel", (e) => touches.delete(e.pointerId));
table.addEventListener("pointerup", (e) => {
  const tap = touches.get(e.pointerId);
  touches.delete(e.pointerId);
  if (!tap) return;
  if (
    Math.hypot(tap.x - e.clientX, tap.y - e.clientY) < 12 &&
    document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-action]") === tap.button
  ) {
    e.preventDefault();
    activate(tap.button);
  }
});
table.addEventListener("click", (e) => {
  if (e.pointerType === "touch" || e.sourceCapabilities?.firesTouchEvents)
    return;
  activate(e.target.closest("[data-action]"));
});
function conceal() {
  if (g && opened.some(Boolean)) {
    opened = [false, false];
    panels = [null, null];
    render();
  }
}
window.addEventListener("blur", conceal);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) conceal();
});

let battle, playbackController;
function finishPlayback() {
  if (phase !== "playback") return;
  playbackController.abort();
  phase = g.winner === null ? "combat" : "over";
  render();
}
function launchPlayback() {
  phase = "playback";
  playbackController = new AbortController();
  playBattle(table, g.round, battle, {
    t,
    zh,
    signal: playbackController.signal,
    onDone: finishPlayback,
  });
}
// Only the landing page contains static copy. Keep its original text for switching back.
const walker = document.createTreeWalker($("#welcome"), NodeFilter.SHOW_TEXT);
const originals = [];
while (walker.nextNode()) {
  const node = walker.currentNode;
  if (node.parentElement.closest("#language,#paths")) continue;
  const key = node.textContent.trim().replace(/\s+/g, " ");
  if (key) originals.push([node, key, node.textContent]);
}
const attrs = [...document.querySelectorAll("[alt],[aria-label]")].flatMap(
  (el) =>
    ["alt", "aria-label"]
      .filter((k) => el.hasAttribute(k))
      .map((k) => [el, k, el.getAttribute(k)]),
);
function drawLanguage() {
  for (const [node, key, original] of originals)
    node.textContent = zh
      ? original.replace(original.trim(), t(key))
      : original;
  for (const [el, key, en] of attrs) el.setAttribute(key, t(en));
  document.title = t("Threefold Duel · Lai Wei");
  document.querySelector('meta[name="description"]').content = t(
    "A face-to-face fantasy tactics game for two players on one phone.",
  );
  $("#language").textContent = zh ? "English" : "简体中文";
  drawPaths();
  if (g && !table.hidden) render();
}
function switchLanguage() {
  if (panels) panels = [null, null];
  const value = zh ? "en" : "zh";
  setLanguage(value);
  try {
    localStorage.setItem("duel-lang", value);
  } catch {}
  const url = new URL(location.href);
  url.searchParams.set("lang", value);
  history.replaceState(null, "", url);
  drawLanguage();
}
$("#language").onclick = switchLanguage;
drawLanguage();

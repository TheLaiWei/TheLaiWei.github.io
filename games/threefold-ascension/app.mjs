import {
  createRun,
  VERSION,
  restoreRun,
  useSupply,
  available,
  pickCard,
  vote,
  continueRound,
  camp,
  buy,
  leaveShop,
  potion,
} from "./campaign.mjs";
import { setPlan, targetsFor, ready, unit } from "./combat.mjs";
import { showTargets, animateEvent } from "./effects.mjs";
import { setLanguage, lang, T } from "./display.mjs";
import { landing, endScreen, modal } from "./screens.mjs";

import { gameTable, mapY } from "./journey.mjs";

const SAVE = "threefold.ascension.run.v1",
  LANG = "threefold.ascension.language";
const app = document.getElementById("app"),
  dlg = document.getElementById("dialog"),
  dialogBody = document.getElementById("dialog-body");
let lastEvent = null,
  saveAvailable = true,
  invalidSave = false,
  stamp = 0;
function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key, v) {
  try {
    localStorage.setItem(key, v);
    return true;
  } catch {
    return false;
  }
}
function decode(raw) {
  if (!raw) return null;
  try {
    const box = JSON.parse(raw),
      x = box.run;
    if (
      x.v === VERSION &&
      x.heroes.length === 6 &&
      x.map.length === 10 &&
      x.players.length === 2 &&
      Array.isArray(x.relics) &&
      [
        "draft",
        "map",
        "combat",
        "round",
        "rest",
        "shop",
        "relic",
        "event",
        "victory",
        "defeat",
      ].includes(x.phase)
    ) {
      stamp = box.stamp || 0;
      return restoreRun(x);
    }
  } catch {}
  invalidSave = true;
  return null;
}
let g = decode(read(SAVE)),
  page = "home",
  dialogKind = "",
  dialogArg = null,
  timer = 0,
  noticeTimer = 0;
const ui = {
  seats: [{ tab: "base" }, { tab: "base" }],
  focusNode: "",
  group: "Fighter",
  lastPanel: 0,
  playing: false,
  cursor: -1,
  lines: false,
};
const initial = new URL(location.href).searchParams.get("lang");
setLanguage(
  initial ||
    read(LANG) ||
    ((navigator.language || "").startsWith("zh") ? "zh" : "en"),
);
function notice(msg) {
  const n = document.getElementById("notice");
  n.textContent = msg;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    n.textContent = "";
  }, 3500);
}
function save() {
  stamp = Math.max(stamp + 1, Date.now());
  saveAvailable = store(SAVE, JSON.stringify({ stamp, run: g }));
  if (!saveAvailable)
    notice(
      T(
        "This browser could not save. Keep this tab open to continue.",
        "此浏览器无法存档。请保持标签页打开以继续游戏。",
      ),
    );
}
function resetSeats() {
  ui.seats = [{ tab: "base" }, { tab: "base" }];
  ui.focusNode = "";
  ui.lastPanel = 0;
}
function stopPlayback() {
  lastEvent = null;
  clearTimeout(timer);
  ui.playing = false;
  ui.cursor = -1;
}
function startPlayback(force = false) {
  stopPlayback();
  if (
    g?.phase !== "round" ||
    !g.battle.events.length ||
    (!force && matchMedia("(prefers-reduced-motion: reduce)").matches)
  )
    return;
  ui.cursor = 0;
  ui.playing = true;
  const advance = () => {
    if (!ui.playing || page !== "play" || g?.phase !== "round") return;
    if (ui.cursor + 1 >= g.battle.events.length) {
      ui.playing = false;
      ui.cursor = -1;
      paint();
      return;
    }
    ui.cursor++;
    paint();
    timer = setTimeout(advance, 410);
  };
  timer = setTimeout(advance, 410);
}
// Updating existing controls in place lets a second finger complete its tap while
// the other seat edits a plan. It also preserves focus and each seat’s scroll.
function sync(oldNode, newNode) {
  if (
    oldNode.nodeType !== newNode.nodeType ||
    oldNode.nodeName !== newNode.nodeName
  ) {
    oldNode.replaceWith(newNode.cloneNode(true));
    return;
  }
  if (oldNode.nodeType === Node.TEXT_NODE) {
    if (oldNode.nodeValue !== newNode.nodeValue)
      oldNode.nodeValue = newNode.nodeValue;
    return;
  }
  if (oldNode.nodeType !== Node.ELEMENT_NODE) return;
  for (const { name } of Array.from(oldNode.attributes)) {
    if (oldNode.tagName === "CANVAS" && ["width", "height"].includes(name))
      continue;
    if (!newNode.hasAttribute(name)) oldNode.removeAttribute(name);
  }
  for (const { name, value } of Array.from(newNode.attributes))
    if (oldNode.getAttribute(name) !== value) oldNode.setAttribute(name, value);
  if (oldNode.classList.contains("effects")) return;
  let i = 0;
  for (const next of newNode.childNodes) {
    if (oldNode.childNodes[i]) sync(oldNode.childNodes[i], next);
    else oldNode.append(next.cloneNode(true));
    i++;
  }
  while (oldNode.childNodes.length > i) oldNode.lastChild.remove();
}
function bodyPatch(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  if (!app.firstElementChild) app.append(template.content);
  else sync(app.firstElementChild, template.content.firstElementChild);
}
function roads() {
  const canvas = document.getElementById("roads");
  if (!canvas || !g) return;
  const w = canvas.clientWidth,
    h = canvas.clientHeight,
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const nodes = g.map.flat(),
    byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const choices = available(g),
    cur = g.node?.id;
  for (const n of nodes)
    for (const id of n.next) {
      const next = byId[id],
        on = g.path.includes(n.id) && g.path.includes(next.id),
        front = n.id === cur || (!cur && choices.some((a) => a.id === n.id));
      const x1 = n.x * w,
        y1 = (mapY(n.row) * h) / 100,
        x2 = next.x * w,
        y2 = (mapY(next.row) * h) / 100;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1, (y1 + y2) / 2, x2, (y1 + y2) / 2, x2, y2);
      ctx.lineCap = "round";
      ctx.setLineDash([]);
      ctx.lineWidth = on || front ? 6 : 3.8;
      ctx.strokeStyle = on || front ? "#352913d9" : "#403525b5";
      ctx.stroke();
      ctx.lineWidth = on || front ? 3.2 : 2.2;
      ctx.strokeStyle = on ? "#e9bd63" : front ? "#fff2b1" : "#ead7aa";
      ctx.setLineDash(on || front ? [] : [3, 5]);
      ctx.stroke();
    }
}
function paint() {
  document.title = T("Threefold Ascension · Lai Wei", "三英登塔 · Lai Wei");
  if (page === "home" || !g) bodyPatch(landing(g));
  else if (["victory", "defeat"].includes(g.phase)) bodyPatch(endScreen(g));
  else bodyPatch(gameTable(g, ui));
  if (page === "play" && g?.phase === "map") roads();
  if (page === "play" && g?.phase === "combat") showTargets(g, ui.lines);
  const event =
    page === "play" && g?.phase === "round" && ui.playing
      ? g.battle.events[ui.cursor]
      : null;
  if (event && event !== lastEvent) {
    lastEvent = event;
    animateEvent(g, event);
  }
}
function show(kind, arg = null) {
  dialogKind = kind;
  dialogArg = arg;
  dialogBody.innerHTML = modal(g, ui, kind, arg);
  if (!dlg.open) dlg.showModal();
  dialogBody.parentElement.scrollTop = 0;
}
function close() {
  if (dlg.open) dlg.close();
  dialogKind = "";
  dialogArg = null;
}
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) {
    const r = dlg.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      close();
  }
});
dlg.addEventListener("close", () => {
  dialogKind = "";
  dialogArg = null;
});
function seatView(p, tab, extra = {}) {
  ui.seats[p] = { tab, ...extra };
  ui.lastPanel = p;
  paint();
  const panel = document.querySelector('[data-panel="' + p + '"]');
  if (panel) panel.scrollTop = 0;
}
function chooseSkill(p, id, skill, to) {
  const h = unit(g, id),
    opts = targetsFor(g, h, skill);
  const previous = g.battle.plans[id]?.target;
  const target =
    to || (opts.some((o) => o.id === previous) ? previous : opts[0]?.id);
  return setPlan(g, p, id, skill, target);
}
function mutation(f) {
  const before = g.phase,
    beforeRound = g.battle?.round,
    beforeAct = g.act;
  if (!f()) {
    notice(T("That choice is no longer available.", "该选项当前不可用。"));
    paint();
    return false;
  }
  if (
    g.phase !== before ||
    beforeRound !== g.battle?.round ||
    beforeAct !== g.act
  ) {
    stopPlayback();
    resetSeats();
    if (g.phase === "round") startPlayback();
  }
  save();
  paint();
  return true;
}
function newGame() {
  g = createRun();
  invalidSave = false;
  page = "play";
  close();
  stopPlayback();
  resetSeats();
  save();
  paint();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-act]");
  if (!b || b.disabled) return;
  const a = b.dataset.act,
    { id, k, v, to, hero } = b.dataset,
    p = Number(b.dataset.p),
    slot = b.dataset.slot != null ? Number(b.dataset.slot) : undefined;
  if (a === "lang") {
    setLanguage(lang === "en" ? "zh" : "en");
    store(LANG, lang);
    const u = new URL(location.href);
    u.searchParams.set("lang", lang);
    history.replaceState(null, "", u);
    paint();
    if (dlg.open) show(dialogKind, dialogArg);
    return;
  }
  if (a === "close") {
    close();
    return;
  }
  if (
    [
      "guide",
      "rules",
      "cards",
      "relics",
      "atlasguide",
      "menu",
      "log",
      "confirm-new",
    ].includes(a)
  ) {
    show(a);
    return;
  }
  if (a === "chapter") {
    show(a, b.dataset.i);
    return;
  }
  if (a === "group") {
    ui.group = k;
    show("cards");
    return;
  }
  if (a === "new") {
    if (
      (invalidSave || (g && !["victory", "defeat"].includes(g.phase))) &&
      dialogKind !== "confirm-new"
    ) {
      show("confirm-new");
      return;
    }
    newGame();
    return;
  }
  if (a === "resume") {
    if (!g) return;
    page = "play";
    stopPlayback();
    resetSeats();
    paint();
    return;
  }
  if (!g) return;
  if (a === "home") {
    stopPlayback();
    page = "home";
    close();
    paint();
    return;
  }
  if (a === "lines") {
    ui.lines = !ui.lines;
    paint();
    return;
  }
  if (a === "inspect-node") {
    ui.focusNode = id;
    paint();
    return;
  }
  if (a === "playback") {
    if (ui.playing) stopPlayback();
    else startPlayback(true);
    paint();
    return;
  }
  if (a === "back") {
    seatView(p, "base");
    return;
  }
  if (a === "panel-back") {
    const prior = ui.seats[p];
    if (prior.tab === "book")
      seatView(p, prior.from || "base", { id: prior.id });
    else seatView(p, prior.tab === "supply" ? "bag" : "room");
    return;
  }
  if (a === "book") {
    seatView(p, "book", { id, from: ui.seats[p].tab });
    return;
  }
  if (["room", "bag", "order", "supply"].includes(a)) {
    seatView(p, a, { id });
    return;
  }
  if (a === "foe") {
    show(a, id);
    return;
  }
  if (a === "use-supply") {
    if (mutation(() => useSupply(g, p, id, to))) {
      seatView(p, "bag");
      notice(T("Supply used.", "已使用补给。"));
    }
    return;
  }
  if (a === "hero") {
    const edit =
      g.phase === "combat" && !g.battle.ready[p] && unit(g, id)?.hp > 0;
    seatView(p, edit ? "hero" : "book", { id, from: "base" });
    return;
  }
  if (a === "opentrain") {
    seatView(p, "train");
    return;
  }
  if (a === "pick" || a === "recip") {
    seatView(p, "pick", { id, recip: hero });
    return;
  }
  if (a === "skill") {
    mutation(() => chooseSkill(p, id, k));
    return;
  }
  if (a === "target") {
    if (mutation(() => chooseSkill(p, id, g.battle.plans[id].skill, to)))
      seatView(p, "base");
    return;
  }
  if (a === "ready") {
    if (mutation(() => ready(g, p)) && g.phase === "combat")
      seatView(p, "base");
    return;
  }
  if (a === "continue") {
    mutation(() => continueRound(g));
    return;
  }
  if (a === "vote") {
    if (
      mutation(() => vote(g, p, g.phase === "event" ? Number(v) : v)) &&
      ["relic", "event"].includes(g.phase)
    )
      seatView(p, "base");
    return;
  }
  if (["take", "buycard"].includes(a)) {
    const acquired = mutation(() =>
      a === "take" ? pickCard(g, p, id, hero, slot) : buy(g, p, id, hero, slot),
    );
    if (acquired)
      seatView(p, a === "buycard" && g.phase === "shop" ? "room" : "base");
    return;
  }
  if (a === "skip") {
    if (mutation(() => pickCard(g, p, "skip"))) seatView(p, "base");
    return;
  }
  if (a === "potion") {
    mutation(() => potion(g, p, id));
    return;
  }
  if (a === "buy") {
    mutation(() => buy(g, p, id));
    return;
  }
  if (a === "leave") {
    if (mutation(() => leaveShop(g, p))) seatView(p, "base");
    return;
  }
  if (a === "campheal") {
    if (mutation(() => camp(g, p, "heal"))) seatView(p, "base");
    return;
  }
  if (a === "train") {
    if (mutation(() => camp(g, p, "train", hero, id))) seatView(p, "base");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || dlg.open || page !== "play") return;
  const p = [ui.lastPanel, 1 - ui.lastPanel].find(
    (p) => ui.seats[p].tab !== "base",
  );
  if (p != null) seatView(p, "base");
});
window.addEventListener("storage", (e) => {
  if (e.key !== SAVE || !e.newValue) return;
  const updated = decode(e.newValue);
  if (updated) {
    g = updated;
    close();
    stopPlayback();
    resetSeats();
    paint();
  }
});
window.addEventListener("resize", () => {
  if (g?.phase === "map" && page === "play") roads();
  if (g?.phase === "combat" && page === "play") showTargets(g, ui.lines);
});
paint();
if (invalidSave)
  notice(
    T(
      "This browser’s saved expedition could not be read.",
      "此浏览器的登塔存档无法读取。",
    ),
  );

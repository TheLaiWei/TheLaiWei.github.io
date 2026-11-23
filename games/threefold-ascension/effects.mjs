import { SKILL } from "./party.mjs";

function locate(table, id) {
  return (
    table.querySelector('[data-unit="' + id + '"]') ||
    table.querySelector('.hero-tile[data-id="' + id + '"]')
  );
}
function center(el, origin) {
  const box = el.getBoundingClientRect();
  return {
    x: box.left - origin.left + box.width / 2,
    y: box.top - origin.top + box.height / 2,
  };
}
export function showTargets(g, on) {
  const table = document.querySelector(".table"),
    canvas = table?.querySelector(".target-lines");
  if (!canvas) return;
  const rect = table.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx || !on || g.phase !== "combat") return;
  ctx.scale(dpr, dpr);
  for (const h of g.heroes.filter((u) => u.hp > 0)) {
    const src = locate(table, h.id),
      plan = g.battle.plans[h.id];
    if (!src || !plan) continue;
    const targets =
      SKILL[plan.skill][0] === "all"
        ? g.battle.enemies.filter((e) => e.hp > 0).map((e) => e.id)
        : [plan.target];
    for (const id of targets) {
      const dest = locate(table, id);
      if (!dest || id === h.id) continue;
      const a = center(src, rect),
        z = center(dest, rect);
      const dx = z.x - a.x,
        dy = z.y - a.y,
        dist = Math.max(1, Math.hypot(dx, dy));
      const end = { x: z.x - (dx / dist) * 13, y: z.y - (dy / dist) * 13 };
      ctx.strokeStyle = h.owner === 0 ? "#d08736" : "#65b9a5";
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(
        end.x - (7 * dx) / dist + (4 * dy) / dist,
        end.y - (7 * dy) / dist - (4 * dx) / dist,
      );
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(
        end.x - (7 * dx) / dist - (4 * dy) / dist,
        end.y - (7 * dy) / dist + (4 * dx) / dist,
      );
      ctx.stroke();
    }
  }
}
export const FLIGHT_MS = 780;
const hitIcons = {
  Slash: "⚔️", Ambush: "🗡️", Riposte: "🗡️", Spark: "⚡", Discharge: "⚡",
  Twin: "🌠", Smite: "☀️", Judgment: "☀️", aimed: "arrow", volley: "arrow",
  spring: "🐾", worry: "🐾", ram: "🛡️", drop: "⛓️", shard: "💎", fan: "💎",
  rake: "💎", refraction: "💎", ring: "⚡", stamp: "🔨", needle: "arrow",
  seal: "🔥", scythe: "🌙", thrust: "🗡️", eclipse: "🌑", edict: "🌑",
  Flare: "fireball", pitch: "fireball", spark: "fireball", whiteheat: "fireball",
};
const supportIcons = {
  heal: "💚", ward: "🛡️", guard: "🛡️", taunt: "🛡️", intercept: "🛡️",
  bless: "✨", speed: "🪽", summon: "📯", interrupt: "💥", miss: "💨",
};
// A cast seal forms at the guardian and lands on the actual event target.
function guardianSeal(layer, point, type, impact, support) {
  const seal = document.createElement("i");
  seal.className = "guardian-seal guardian-" + type + (support ? " support-seal" : "");
  seal.style.left = point.x + "px";
  seal.style.top = point.y + "px";
  layer.append(seal);
  const from = impact ? 0.3 : 1.25, to = impact ? 1.65 : 0.45;
  const animation = seal.animate([
    { transform: "translate(-50%,-50%) scale(" + from + ") rotate(-26deg)", opacity: 0 },
    { offset: 0.28, opacity: 0.95 },
    { transform: "translate(-50%,-50%) scale(" + to + ") rotate(22deg)", opacity: 0 },
  ], { duration: impact ? 385 : 560, delay: impact ? FLIGHT_MS : 0, fill: "both" });
  animation.onfinish = () => seal.remove();
}
export function animateEvent(g, event) {
  if (!event || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const table = document.querySelector(".table"),
    layer = document.querySelector(".effects");
  if (!layer || !table) return;
  const target = locate(table, event.to),
    source = locate(table, event.src);
  if (!target || !source) return;
  const rect = layer.getBoundingClientRect();
  const aim = el => center(el.querySelector(".hero-sprite, .foe-sprite") || el, rect);
  const start = aim(source), end = aim(target);
  const isHit = event.k === "hit", heal = event.k === "heal";
  const icon = isHit ? hitIcons[event.skill] || "⚔️" : supportIcons[event.k] || "✨";
  if (source.classList.contains("guardian")) {
    const type = g.battle.enemies.find(en => en.id === event.src).type;
    const support = ["summon", "ward", "heal"].includes(event.k);
    guardianSeal(layer, start, type, false, support);
    if (event.k !== "miss") guardianSeal(layer, end, type, true, support);
    source.querySelector(".foe-sprite").animate([
      { transform: "scale(1)" }, { offset: 0.28, transform: "scale(1.08)" },
      { transform: "scale(1)" }
    ], { duration: 530 });
  }
  const dx = end.x - start.x, dy = end.y - start.y;
  const token = document.createElement("i");
  token.className = "cast-token";
  if (icon === "fireball" || icon === "arrow") {
    token.classList.add(icon);
    token.style.setProperty("--heading", Math.atan2(dy, dx) + "rad");
  } else token.textContent = icon;
  token.style.left = start.x + "px";
  token.style.top = start.y + "px";
  layer.append(token);
  const flight = token.animate([
    { transform: "translate(-50%, -50%) scale(.75)", opacity: .9 },
    { transform: "translate(calc(-50% + " + dx + "px),calc(-50% + " + dy + "px)) scale(1)", opacity: 1 },
  ], {duration: FLIGHT_MS, easing: "ease-in-out", fill: "forwards"});
  flight.onfinish = () => {
    token.remove();
    if (icon !== "fireball" || !layer.isConnected) return;
    const burst = document.createElement("i");
    burst.className = "ember-impact";
    burst.style.left = end.x + "px";
    burst.style.top = end.y + "px";
    layer.append(burst);
    burst.animate([
      {transform:"translate(-50%,-50%) scale(.35)",opacity:1},
      {transform:"translate(-50%,-50%) scale(1.3)",opacity:0},
    ], {duration:240}).onfinish = () => burst.remove();
  };
  if (isHit || heal || event.k === "ward") {
    const number = document.createElement("b");
    number.className = "combat-number " + (isHit ? "loss" : "gain");
    number.textContent = (isHit ? "−" : "+") + event.n;
    number.style.left = end.x + "px";
    number.style.top = end.y + "px";
    layer.append(number);
    const rise = number.animate(
      [
        { opacity: 0, transform: "translate(-50%,-20%)" },
        { offset: 0.3, opacity: 1 },
        { opacity: 0, transform: "translate(-50%,-135%)" },
      ],
      { duration: 430, delay: FLIGHT_MS, fill: "both" },
    );
    rise.onfinish = () => number.remove();
  }
}

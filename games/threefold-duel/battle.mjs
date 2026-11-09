import { art } from "./engine.mjs";
import { eventText } from "./events.mjs";

export const snapshot = (teams) =>
  teams.map((team) =>
    team.map((h) => ({
      name: h.name,
      image: art(h),
      hp: h.hp,
      max: h.max,
      shield: h.ward?.left || 0,
      marked: h.mark,
      guarded: Boolean(h.guard?.source.hp),
      blessed: Boolean(h.bless),
    })),
  );

const effects = {
  Slash: "blade",
  Ambush: "ambush",
  Counter: "blade",
  Spark: "spark",
  Flare: "fire",
  Discharge: "spark",
  Smite: "beam",
  Judgment: "beam",
  Mend: "heal",
  "Arcane Feedback": "heal",
  "Mirror Ward": "spark",
  Aegis: "ward",
  Guard: "ward",
  Riposte: "ward",
  Bless: "bless",
  Haste: "bless",
};
const glyphs = {
  blade:
    '<path fill="#fff9cf" stroke="#694420" stroke-width="2" d="M67 6 62 25 34 53 27 47Z"/><path fill="#dfac51" d="m19 43 20 15 3-4-21-15z"/><path stroke="#68412a" stroke-width="6" d="m29 49-11 13"/><path fill="#fff1bc" d="M6 25Q25 68 69 41Q24 81 6 25Z"/>',
  fire: '<path fill="#d54a21" d="M3 36 29 31 19 21 45 27Q63 19 71 35Q76 53 54 57Q42 57 30 49L12 47 28 42Z"/><path fill="#ffac36" d="m26 38 24-7q14-3 16 10-2 13-18 9Z"/><circle cx="55" cy="40" r="7" fill="#fff9bc"/>',
  spark:
    '<path fill="#d9ffff" stroke="#3ebec5" stroke-width="3" d="M8 45 40 18 36 34 68 26 34 59 40 41Z"/>',
  beam: '<path fill="#fff3b3" stroke="#d9a23f" stroke-width="2" d="m37 4 8 23 24 8-24 8-8 25-8-25-24-8 24-8Z"/>',
  heal: '<circle cx="38" cy="38" r="30" fill="none" stroke="#f5d374" stroke-width="3"/><path fill="#fff7c4" d="M32 16h12v15h15v12H44v15H32V43H17V31h15z"/>',
  ward: '<path fill="#71d3ce" stroke="#efffde" stroke-width="3" d="M37 6 64 16v20q0 17-27 32Q11 54 11 36V16Z"/><path fill="#fff8ce" d="m37 17 5 16 12 4-12 5-5 15-4-15-12-5 12-4Z"/>',
  bless:
    '<path fill="#fff5ab" stroke="#cf963c" stroke-width="2" d="m37 6 6 23 21 8-21 6-6 24-7-24-21-6 21-8Z"/>',
};
const glyph = (key) =>
  '<svg aria-hidden="true" viewBox="0 0 76 76">' +
  glyphs[key === "ambush" ? "blade" : key] +
  "</svg>";
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
function heroMarkup(h, seat, slot, t) {
  return (
    '<div class="combatant" data-position="' +
    seat +
    "-" +
    slot +
    '"><div class="figure"><img src="./art/' +
    h.image +
    '.svg" alt=""></div><strong>' +
    t(h.name) +
    '</strong><div class="health"><i></i></div><span class="vitals"></span><small class="conditions"></small></div>'
  );
}
export async function playBattle(
  table,
  round,
  battle,
  { t, zh, onDone, signal },
) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const side = (s) =>
    '<div class="battle-side ' +
    (s ? "reverse" : "") +
    '"><header><span>' +
    t("Player") +
    " " +
    (s + 1) +
    "</span><span>" +
    t("Round") +
    " " +
    round +
    '</span><button data-action="skip">' +
    t("Skip animation") +
    '</button></header><div class="formation">' +
    battle.initial[s].map((h, i) => heroMarkup(h, s, i, t)).join("") +
    "</div></div>";
  const caption = (css) =>
    '<div class="battle-caption ' +
    css +
    '"><small></small><strong></strong></div>';
  table.innerHTML =
    '<section class="battle-stage">' +
    side(1) +
    caption("reverse") +
    '<div class="arena-rule">✦</div>' +
    caption("") +
    side(0) +
    '<div class="fx-layer" aria-hidden="true"></div></section>';
  const stage = table.querySelector(".battle-stage"),
    fx = stage.querySelector(".fx-layer");
  const node = (pos) =>
    stage.querySelector('[data-position="' + pos.join("-") + '"]');
  const captions = stage.querySelectorAll(".battle-caption");
  function paint(teams) {
    teams.forEach((team, s) =>
      team.forEach((h, i) => {
        const el = node([s, i]);
        el.classList.toggle("fallen", !h.hp);
        el.querySelector(".health i").style.width = (100 * h.hp) / h.max + "%";
        el.querySelector(".vitals").textContent = h.hp + " / " + h.max;
        el.querySelector(".conditions").textContent = [
          h.shield ? "◇ " + h.shield : "",
          h.marked ? t("Marked") : "",
          h.guarded ? t("Guard") : "",
          h.blessed ? t("Blessed") : "",
        ]
          .filter(Boolean)
          .join(" · ");
      }),
    );
  }
  function point(pos) {
    const r = node(pos).querySelector(".figure").getBoundingClientRect(),
      box = stage.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - box.left,
      y: r.top + r.height / 2 - box.top,
    };
  }
  function sprite(cls, pos, markup) {
    const el = document.createElement("div");
    el.className = "battle-fx " + cls;
    el.innerHTML = markup;
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";
    fx.append(el);
    return el;
  }
  paint(battle.initial);
  for (const [index, { event, after }] of battle.steps.entries()) {
    if (signal.aborted) return;
    fx.replaceChildren();
    const src = node(event.from),
      dest = node(event.to),
      effect = effects[event.skill] || "beam";
    const miss = ["skipped", "miss"].includes(event.kind);
    for (const cap of captions) {
      cap.querySelector("small").textContent =
        t("Action") + " " + (index + 1) + " / " + battle.steps.length;
      cap.querySelector("strong").textContent =
        t(battle.initial[event.from[0]][event.from[1]].name) +
        " · " +
        t(event.skill);
    }
    src.classList.add("casting");
    dest.classList.add("targeted");
    const from = point(event.from),
      to = point(event.to);
    if (
      !miss &&
      !reduce &&
      !same(event.from, event.to) &&
      !["blade", "ambush"].includes(effect)
    ) {
      const dx = to.x - from.x,
        dy = to.y - from.y,
        angle = effect === "fire" ? (Math.atan2(dy, dx) * 180) / Math.PI : 0;
      const spell = sprite("travel " + effect, from, glyph(effect));
      spell.animate(
        [
          {
            transform:
              "translate(-50%,-50%) rotate(" + angle + "deg) scale(.55)",
          },
          {
            transform:
              "translate(calc(-50% + " +
              dx +
              "px),calc(-50% + " +
              dy +
              "px)) rotate(" +
              angle +
              "deg) scale(1.05)",
          },
        ],
        { duration: 430, easing: "ease-in", fill: "forwards" },
      );
    }
    await pause(reduce ? 150 : 430);
    if (signal.aborted) return;
    fx.replaceChildren();
    paint(after);
    for (const cap of captions)
      cap.querySelector("strong").textContent = eventText(event, t, zh);
    if (!miss) {
      sprite("impact " + effect, to, glyph(effect));
      dest.classList.add(event.kind === "damage" ? "struck" : "radiant");
      if (
        event.kind === "damage" ||
        event.kind === "heal" ||
        event.kind === "ward"
      ) {
        const value =
          event.kind === "ward"
            ? "◇ " + event.shield
            : event.kind === "heal"
              ? "+" + event.delta
              : event.delta === 0
                ? "0"
                : "−" + Math.abs(event.delta);
        const label = sprite(
          "amount " +
            (event.kind === "damage" ? "negative" : "positive") +
            (event.to[0] ? " inverted" : ""),
          { x: to.x, y: to.y - 30 },
          "",
        );
        label.textContent = value;
      }
    }
    await pause(reduce ? 700 : 750);
    if (signal.aborted) return;
    src.classList.remove("casting");
    dest.classList.remove("targeted", "struck", "radiant");
  }
  if (!signal.aborted) onDone();
}

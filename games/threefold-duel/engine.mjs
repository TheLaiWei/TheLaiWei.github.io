import { classes, cards, skills } from "./catalog.mjs";

const bases = [
  [72, 17, 8, 6, 4, 10, 4, "Slash", "Guard"],
  [55, 6, 4, 19, 8, 12, 5, "Spark", "Flare"],
  [60, 7, 5, 16, 7, 11, 6, "Smite", "Mend"],
];
function party() {
  return bases.map(([max, atk, def, mag, res, speed, luck, a, b], index) => ({
    name: classes[index],
    max,
    hp: max,
    atk,
    def,
    mag,
    res,
    speed,
    luck,
    skills: [a, b],
    cards: {},
    used: {},
    round: {},
    mark: false,
    bless: 0,
    nextSpeed: 0,
    bonusSpeed: 0,
    ward: null,
    guard: null,
  }));
}
export function newMatch() {
  return { teams: [party(), party()], round: 1, history: [], winner: null };
}
const living = (team) => team.filter((h) => h.hp > 0);
const heal = (h, n) => {
  h.hp = Math.min(h.max, h.hp + n);
};
export const luck = (team) => team.reduce((sum, h) => sum + h.luck, 0);
export function odds(value) {
  const anchors = [
    [65, 27, 7, 1],
    [48, 35, 14, 3],
    [32, 40, 21, 7],
  ];
  const n = Math.max(0, Math.min(30, value)) / 15,
    i = Math.min(1, Math.floor(n));
  return anchors[i].map((v, j) => v + (anchors[i + 1][j] - v) * (n - i));
}
export function eligible(team, c) {
  return team
    .map((h, i) => ({ h, i }))
    .filter(
      ({ h }) =>
        h.hp > 0 &&
        (c.group === "Any" || c.group === h.name) &&
        (c.skill
          ? h.skills[c.slot] !== c.skill
          : (h.cards[c.id] || 0) < c.limit) &&
        (c.id !== "luck" || h.luck < 10) &&
        (c.id !== "exploit" || !team.some((member) => member.cards.exploit)),
    )
    .map(({ i }) => i);
}
export function eligibleOdds(team) {
  const weights = odds(luck(team)).map((value, tier) =>
    cards.some((c) => c.tier === tier && eligible(team, c).length) ? value : 0,
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((n) => (sum ? (100 * n) / sum : 0));
}
export function offer(team, rng = Math.random) {
  const chosen = [],
    weights = odds(luck(team));
  for (let draw = 0; draw < 3; draw++) {
    const pools = weights.map((_, tier) =>
      cards.filter(
        (c) =>
          c.tier === tier && !chosen.includes(c) && eligible(team, c).length,
      ),
    );
    const total = pools.reduce((n, p, i) => n + (p.length ? weights[i] : 0), 0);
    if (!total) break;
    let roll = rng() * total;
    let tier = pools.findIndex((p, i) => p.length && (roll -= weights[i]) < 0);
    chosen.push(pools[tier][Math.floor(rng() * pools[tier].length)]);
  }
  return chosen;
}
const boosts = {
  plate: { def: 3 },
  edge: { atk: 3 },
  foot: { speed: 3 },
  focus: { mag: 3 },
  cloak: { res: 3 },
  bulwark: { def: 2 },
  flare: { mag: 2 },
  renew: { res: 2 },
  drill: { atk: 2, mag: 2 },
  mail: { def: 2, res: 2 },
  stride: { speed: 4 },
};
export function applyCard(team, c, i) {
  if (!eligible(team, c).includes(i)) throw Error("Ineligible card or target");
  const h = team[i];
  if (c.skill) h.skills[c.slot] = c.skill;
  // A stance can be restored after a pivot. Its permanent stat bonus is awarded only once.
  const first = !h.cards[c.id];
  if (!c.skill || first)
    for (const [k, n] of Object.entries(boosts[c.id] || {})) h[k] += n;
  h.cards[c.id] = c.skill ? 1 : (h.cards[c.id] || 0) + 1;
  if (c.id === "luck") h.luck = Math.min(10, h.luck + 3);
  if (c.id === "ration" || c.id === "vigor") {
    h.max += c.id === "ration" ? 2 : 12;
    heal(h, 12);
  }
}
export function art(h) {
  if (h.name === "Fighter")
    return (
      "fighter-" +
      { Ambush: "assassin", Riposte: "duelist", Guard: "guardian" }[h.skills[1]]
    );
  if (h.name === "Mage")
    return (
      "mage-" +
      (h.skills.includes("Aegis")
        ? "warden"
        : h.skills.includes("Discharge")
          ? "battlemage"
          : "elementalist")
    );
  return (
    "priest-" +
    (h.skills.includes("Judgment")
      ? "inquisitor"
      : h.skills.some((x) => ["Bless", "Haste"].includes(x))
        ? "blessing"
        : "healer")
  );
}
function ward(target, source, n) {
  const amount = Math.round(n * (1 + 0.15 * (source.cards.thread || 0)));
  if (amount > 0 && amount >= (target.ward?.left || 0))
    target.ward = { source, left: amount, absorbed: 0 };
}
export function startRound(g) {
  for (const team of g.teams) {
    for (const h of team) {
      h.round = {};
      h.guard = null;
      h.ward = null;
      h.bonusSpeed = h.nextSpeed;
      h.nextSpeed = 0;
      if (h.hp && h.mark && h.cards.cleanse) {
        h.mark = false;
        heal(h, 4);
      }
    }
    const allies = living(team);
    for (const h of allies) {
      if (h.cards.lattice) ward(h, h, 6);
      if (h.cards.relay)
        ward(
          allies.reduce((a, b) => (a.hp <= b.hp ? a : b)),
          h,
          4,
        );
      if (
        h.cards.dawn &&
        !h.used.dawn &&
        allies.some((a) => a.hp < a.max / 2)
      ) {
        allies.forEach((a) => heal(a, 12));
        h.used.dawn = true;
      }
    }
  }
}
const physical = new Set(["Slash", "Ambush", "Counter"]);
const power = {
  Slash: 1,
  Counter: 0.5,
  Spark: 1.05,
  Flare: 1.25,
  Discharge: 1,
  Smite: 1,
  Judgment: 1.55,
};
function hit(g, side, h, t, skill, log) {
  const team = g.teams[side],
    enemy = g.teams[1 - side],
    marked = t.mark;
  const p = physical.has(skill);
  let raw =
    (p ? h.atk : h.mag) *
    (skill === "Ambush" ? (marked ? 1.65 : 1.1) : power[skill]);
  if (skill === "Smite" || skill === "Judgment")
    raw += 3 * (h.cards.votive || 0);
  if (skill === "Discharge" && team.some((a) => a.ward && a.hp)) raw += 8;
  if (marked) {
    raw +=
      (h.cards.pursuit ? 9 : 0) +
      (skill === "Judgment" && h.cards.verdict ? 10 : 0);
    const exploit = team.find((a) => a.cards.exploit);
    if (exploit && !exploit.round.exploit) {
      raw += 8;
      exploit.round.exploit = true;
    }
    t.mark = false;
  }
  if (h.cards.comet && !h.used.comet) {
    raw += 18;
    t.mark = true;
    h.used.comet = true;
  }
  if (h.cards.surge && !p && h.ward) raw += 7;
  if (h.cards.guarded && h.guard?.source.hp) raw += 6;
  if (h.cards.execution && !h.round.execution && t.hp < 0.35 * t.max) {
    raw *= 2;
    h.round.execution = true;
  }
  let amount =
    Math.max(1, Math.round(raw - 0.55 * (p ? t.def : t.res))) + h.bless;
  h.bless = 0;
  if (t.cards.iron && t.hp < t.max / 2) amount = Math.max(1, amount - 5);
  const guard = t.guard?.source.hp ? t.guard : null;
  if (guard)
    amount = Math.max(1, Math.round(amount * (guard.counter ? 0.7 : 0.55)));
  const barrier = t.ward;
  let absorbed = 0,
    reflect = 0,
    saved = false;
  if (barrier) {
    absorbed = Math.min(amount, barrier.left);
    barrier.left -= absorbed;
    barrier.absorbed += absorbed;
    amount -= absorbed;
    const mage = enemy[1];
    if (!barrier.left) {
      if (mage.cards.mirror && !mage.round.mirror) {
        reflect = Math.round(barrier.absorbed * 0.5);
        mage.round.mirror = true;
      }
      t.ward = null;
    }
    if (
      barrier.source === mage &&
      mage.cards.sanctuary &&
      !mage.used.sanctuary &&
      amount >= t.hp
    ) {
      amount = t.hp - 1;
      t.ward = null;
      mage.used.sanctuary = true;
      saved = true;
    }
  }
  const loss = Math.min(t.hp, amount);
  t.hp -= loss;
  log.push(
    "P" +
      (side + 1) +
      " " +
      h.name +
      " · " +
      skill +
      " → " +
      t.name +
      " −" +
      loss +
      " HP" +
      (absorbed ? " (" + absorbed + " shielded)" : "") +
      (saved ? " · Sanctuary" : "") +
      (!t.hp ? " · defeated" : ""),
  );
  if (absorbed && barrier.source.cards.feedback && t.hp) heal(t, 3);
  if (reflect) {
    h.hp = Math.max(0, h.hp - reflect);
    log.push("Mirror Ward reflects " + reflect + " damage to " + h.name + ".");
  }
  if (
    (h.cards.quarry && skill === "Slash") ||
    (h.cards.cinder && skill === "Flare") ||
    (h.cards.prism && skill === "Smite") ||
    (h.cards.sight && !h.round.sight)
  ) {
    t.mark = true;
  }
  h.round.sight = true;
  if (guard) {
    if (guard.source.cards.feint) h.mark = true;
    if (guard.source.cards.tempo)
      guard.source.nextSpeed = Math.max(guard.source.nextSpeed, 6);
    if (guard.counter && skill !== "Counter" && guard.source.hp && h.hp)
      hit(g, 1 - side, guard.source, h, "Counter", log);
  }
}
export function resolve(g, plans) {
  const log = [],
    queue = [];
  for (const [s, team] of g.teams.entries())
    for (const [i, h] of team.entries()) {
      if (!h.hp) continue;
      const action = plans[s][i],
        skill = h.skills[action?.slot];
      const targets = g.teams[skills[skill]?.[0] === "ally" ? s : 1 - s];
      if (!skill || !targets[action.target]?.hp) throw Error("Invalid plan");
      queue.push({
        s,
        h,
        skill,
        t: targets[action.target],
        speed:
          h.speed +
          h.bonusSpeed +
          skills[skill][1] +
          (skills[skill][0] === "ally" ? 4 * (h.cards.pilgrim || 0) : 0),
      });
    }
  queue.sort(
    (a, b) =>
      b.speed - a.speed || ((a.s + g.round) % 2) - ((b.s + g.round) % 2),
  );
  for (const { s, h, skill, t } of queue) {
    if (!h.hp) {
      log.push(
        "P" + (s + 1) + " " + h.name + " · " + skill + " skipped (defeated).",
      );
      continue;
    }
    if (!t.hp) {
      log.push(
        "P" +
          (s + 1) +
          " " +
          h.name +
          " · " +
          skill +
          " misses its defeated target.",
      );
      continue;
    }
    if (skills[skill][0] === "enemy") {
      hit(g, s, h, t, skill, log);
      continue;
    }
    let effect = "";
    if (skill === "Guard" || skill === "Riposte") {
      t.guard = { source: h, counter: skill === "Riposte" };
      effect = "guards";
    }
    if (skill === "Aegis") {
      ward(t, h, t.max * 0.25);
      effect = "shields";
    }
    if (skill === "Mend") {
      const n = Math.round(h.mag * 0.9) + 5 * (h.cards.mercy || 0);
      const excess = Math.max(0, t.hp + n - t.max);
      heal(t, n);
      if (h.cards.overflow) ward(t, h, excess);
      effect = "heals";
    }
    if (skill === "Bless") {
      t.bless = 8 + (h.cards.fervor ? 6 : 0);
      effect = "blesses";
    }
    if (skill === "Haste") {
      t.nextSpeed = Math.max(t.nextSpeed, 8);
      effect = "hastens";
    }
    log.push(
      "P" +
        (s + 1) +
        " " +
        h.name +
        " · " +
        skill +
        " " +
        effect +
        " " +
        t.name +
        ".",
    );
  }
  for (const h of g.teams.flat()) {
    h.guard = null;
    h.ward = null;
    h.bonusSpeed = 0;
  }
  const alive = g.teams.map((t) => living(t).length > 0);
  if (!alive[0] || !alive[1]) g.winner = alive[0] ? 0 : alive[1] ? 1 : "draw";
  g.history.push({ round: g.round, log });
  return log;
}

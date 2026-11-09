import { classes, cards, skills, slotsFor } from "./catalog.mjs";

import { supports } from "./synergy.mjs";
import { eventText } from "./events.mjs";

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
          ? slotsFor(h, c).length > 0
          : (h.cards[c.id] || 0) < c.limit) &&
        supports(team, h, c) &&
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
export function applyCard(team, c, i, slot = c.slot) {
  if (!eligible(team, c).includes(i)) throw Error("Ineligible card or target");
  const h = team[i];
  if (c.skill) {
    if (!slotsFor(h, c).includes(slot)) throw Error("Invalid skill slot");
    h.skills[slot] = c.skill;
  }
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
      {
        Ambush: "assassin",
        Riposte: "duelist",
        Taunt: "guardian",
        Guard: "guardian",
      }[h.skills[1]]
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
      h.bonusSpeed = h.nextSpeed + (h.rallySpeed || 0);
      h.rallySpeed = 0;
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
  Flare: 0.65,
  "Barrier Pulse": 0,
  Discharge: 1,
  Smite: 1,
  Judgment: 1.7,
};
const lowest = (team) =>
  living(team).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
function hit(g, side, h, t, skill, emit, opts = {}) {
  const team = g.teams[side],
    enemy = g.teams[1 - side],
    active = skill !== "Counter" && skill !== "Barrier Pulse",
    single = active && skill !== "Flare",
    original = t;
  if (single && enemy[0].hp && enemy[0].round.taunt) t = enemy[0];
  const redirected = t !== original,
    marked = t.mark && active;
  const favored = opts.favored !== false;
  const p = physical.has(skill);
  let raw =
    (p ? h.atk : h.mag) *
    (skill === "Ambush" ? (marked ? 1.8 : 1.3) : (opts.power ?? power[skill]));
  raw += opts.bonus || 0;
  if (skill === "Barrier Pulse") raw = 6;
  if (skill === "Smite" || skill === "Judgment")
    raw += 3 * (h.cards.votive || 0);
  if (skill === "Discharge" && team.some((a) => a.ward && a.hp)) raw += 8;
  if (marked) {
    raw +=
      (h.cards.pursuit ? 9 : 0) +
      (skill === "Judgment" ? 6 + (h.cards.verdict ? 10 : 0) : 0);
    const exploit = team.find((a) => a.hp && a.cards.exploit);
    if (exploit && !exploit.round.exploit) {
      raw += 8;
      exploit.round.exploit = true;
    }
    t.mark = false;
  }
  if (active && favored && h.cards.comet && !h.used.comet) {
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
    Math.max(1, Math.round(raw - 0.55 * (p ? t.def : t.res))) +
    (marked ? 4 : 0);
  if (active && favored) {
    amount += h.bless + (h.coverReady ? 6 : 0);
    h.bless = 0;
    h.coverReady = false;
  }
  if (redirected) amount = Math.max(1, Math.round(amount * 0.65));
  if (t.round.evade) {
    amount = Math.max(1, Math.round(amount * 0.65));
    t.round.evade = false;
    if (t.cards.shadowstep) h.mark = true;
  }
  if (redirected && original.cards.cover) original.coverReady = true;
  if (t.cards.iron && t.hp < t.max / 2) amount = Math.max(1, amount - 5);
  const guard = t.guard?.source.hp ? t.guard : null;
  if (guard)
    amount = Math.max(1, Math.round(amount * (guard.counter ? 0.7 : 0.35)));

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
      if (mage.hp && mage.cards.mirror && !mage.round.mirror) {
        reflect = Math.round(barrier.absorbed * 0.5);
        mage.round.mirror = true;
      }
      for (const ally of living(enemy))
        if (ally.cards.rally && !ally.round.rally) {
          ally.round.rally = true;
          for (const member of living(enemy)) member.rallySpeed = 3;
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
  if (redirected && t.hp && t.cards.stalwart && !t.round.stalwart) {
    t.round.stalwart = true;
    ward(t, t, 8);
  }
  if (
    (h.cards.quarry && skill === "Slash") ||
    (h.cards.prism && skill === "Smite") ||
    (h.cards.sight && active && favored && !h.round.sight) ||
    (h.cards.aim && single && !h.round.aim)
  )
    t.mark = true;
  if (active && favored) h.round.sight = true;
  if (single) h.round.aim = true;
  const from = [side, team.indexOf(h)],
    to = [1 - side, enemy.indexOf(t)];
  emit({
    from,
    to,
    skill,
    kind: "damage",
    delta: -loss,
    absorbed,
    saved,
    defeated: !t.hp,
    redirectedFrom: redirected
      ? [1 - side, enemy.indexOf(original)]
      : undefined,
    volley: opts.volley,
  });
  if (absorbed && barrier.source.cards.feedback && t.hp) {
    const before = t.hp;
    heal(t, 3);
    if (t.hp > before)
      emit({
        from: [1 - side, enemy.indexOf(barrier.source)],
        to,
        skill: "Arcane Feedback",
        kind: "heal",
        delta: t.hp - before,
      });
  }
  if (reflect) {
    const before = h.hp;
    h.hp = Math.max(0, h.hp - reflect);
    emit({
      from: [1 - side, 1],
      to: from,
      skill: "Mirror Ward",
      kind: "damage",
      delta: h.hp - before,
      defeated: !h.hp,
    });
  }
  if (
    skill === "Judgment" &&
    marked &&
    h.cards.holyverdict &&
    !h.round.holyverdict
  ) {
    h.round.holyverdict = true;
    const ally = lowest(team);
    if (ally) {
      const before = ally.hp;
      heal(ally, 12);
      emit({
        from,
        to: [side, team.indexOf(ally)],
        skill: "Holy Verdict",
        kind: "heal",
        delta: ally.hp - before,
      });
    }
  }
  if (guard) {
    if (guard.source.cards.feint) h.mark = true;
    if (guard.source.cards.tempo)
      guard.source.nextSpeed = Math.max(guard.source.nextSpeed, 6);
    if (guard.counter && skill !== "Counter" && guard.source.hp && h.hp)
      hit(g, 1 - side, guard.source, h, "Counter", emit);
  }
}
export function resolve(g, plans, onEvent) {
  const events = [],
    queue = [];
  const emit = (event) => {
    events.push(event);
    onEvent?.(event);
  };
  for (const [s, team] of g.teams.entries())
    for (const [i, h] of team.entries()) {
      if (!h.hp) continue;
      const action = plans[s][i],
        skill = h.skills[action?.slot];
      const targets = g.teams[skills[skill]?.[0] === "ally" ? s : 1 - s];
      if (!skill) throw Error("Invalid plan");
      const mode = skills[skill][0];
      const target =
        mode === "all" || mode === "self" ? h : targets[action.target];
      if (!target?.hp) throw Error("Invalid plan");
      queue.push({
        s,
        h,
        skill,
        t: target,
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
    const mode = skills[skill][0];
    const targetSide = mode === "enemy" ? 1 - s : s;
    const event = {
      from: [s, g.teams[s].indexOf(h)],
      to: [targetSide, g.teams[targetSide].indexOf(t)],
      skill,
    };
    if (
      !h.hp ||
      (!t.hp &&
        !(
          mode === "enemy" &&
          g.teams[1 - s][0].hp &&
          g.teams[1 - s][0].round.taunt
        ))
    ) {
      emit({ ...event, kind: !h.hp ? "skipped" : "miss" });
      continue;
    }
    if (mode === "all") {
      const enemy = g.teams[1 - s],
        targets = living(enemy).sort((a, b) => a.hp / a.max - b.hp / b.max);
      const volley = targets.map((t) => [1 - s, enemy.indexOf(t)]);
      targets.forEach((target, i) =>
        hit(g, s, h, target, skill, emit, {
          favored: i === 0,
          volley: i === 0 ? volley : undefined,
          bonus: i === 0 && targets.length >= 2 && h.cards.afterburn ? 3 : 0,
          power: targets.length === 1 && h.cards.concentrate ? 1.15 : 0.65,
        }),
      );
      if (h.cards.cinder) {
        const survivor = lowest(enemy);
        if (survivor) {
          survivor.mark = true;
          emit({
            from: event.from,
            to: [1 - s, enemy.indexOf(survivor)],
            skill: "Cinder Seal",
            kind: "mark",
          });
        }
      }
      continue;
    }
    if (mode === "enemy") {
      if (skill === "Ambush") h.round.evade = true;
      hit(g, s, h, t, skill, emit);
      continue;
    }
    const before = t.hp;
    let effect = "";
    if (skill === "Guard" || skill === "Riposte") {
      t.guard = { source: h, counter: skill === "Riposte" };
      if (t.cards.cover) t.coverReady = true;
      effect = "guards";
    }
    if (skill === "Taunt") {
      h.round.taunt = true;
      effect = "taunts";
    }
    if (skill === "Aegis") {
      ward(t, h, t.max * 0.25);
      effect = "shields";
    }
    if (skill === "Mend") {
      const n = Math.round(h.mag * 0.9) + 5 * (h.cards.mercy || 0);
      const excess = Math.max(0, t.hp + n - t.max);
      heal(t, n);
      if (h.cards.overflow || h.cards.prayer)
        ward(t, h, (h.cards.prayer ? 5 : 0) + (h.cards.overflow ? excess : 0));
      effect = "heals";
    }
    if (skill === "Bless") {
      t.bless = 12 + (h.cards.fervor ? 4 : 0);
      ward(t, h, 6);
      const other = lowest(g.teams[s].filter((a) => a !== t));
      if (h.cards.doublebless && other) other.bless = Math.max(other.bless, 6);
      effect = "blesses";
    }
    if (skill === "Haste") {
      t.nextSpeed = Math.max(t.nextSpeed, 10);
      heal(t, 8);
      effect = "heals";
    }
    emit({
      ...event,
      kind:
        effect === "heals" ? "heal" : effect === "shields" ? "ward" : "support",
      delta: t.hp - before,
      shield: t.ward?.left || 0,
    });
    if (skill === "Aegis" && h.cards.pulse) {
      const enemies = living(g.teams[1 - s]);
      const target = enemies.find((a) => a.mark) || lowest(enemies);
      if (target) hit(g, s, h, target, "Barrier Pulse", emit);
    }
  }
  for (const h of g.teams.flat()) {
    h.guard = null;
    h.ward = null;
    h.bonusSpeed = 0;
  }
  const alive = g.teams.map((t) => living(t).length > 0);
  if (!alive[0] || !alive[1]) g.winner = alive[0] ? 0 : alive[1] ? 1 : "draw";
  const log = events.map((event) => eventText(event));
  g.history.push({ round: g.round, log, events });
  return log;
}

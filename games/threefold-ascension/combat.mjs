import { ENEMIES, MOVES, FORMATIONS } from "./world.mjs";
import {
  SKILL,
  mod,
  stat,
  living,
  lowest,
  heal,
  hasRelic,
  sample,
  healCapacity,
  skillsFor,
} from "./party.mjs";

export const unit = (g, id) =>
  g.heroes.find((h) => h.id === id) ||
  g.battle?.enemies.find((e) => e.id === id);
const own = (g, p) => living(g.heroes).filter((h) => h.owner === p);
const emit = (g, k, src, to, skill, n = 0, extra = {}) => {
  const e = { k, src: src?.id, to: to?.id, skill, n, ...extra };
  if (to) e.hp = to.hp;
  g.battle.events.push(e);
};
function setWard(h, n) {
  if (h?.hp > 0) h.r.ward = Math.max(h.r.ward || 0, Math.round(n));
}
function nextSpeed(h, n) {
  h.b.nextSpeed = Math.max(h.b.nextSpeed || 0, n);
}
function bless(h, n) {
  if (h) h.b.bless = Math.max(h.b.bless || 0, n);
}
function addEnemy(g, type) {
  const d = ENEMIES[type],
    b = g.battle;
  const h = {
    id: "e" + ++b.serial,
    type,
    hp: d.hp,
    max: d.hp,
    atk: d.atk,
    def: d.def,
    res: d.res,
    speed: d.speed,
    b: { start: b.round || 1, summons: 0 },
    r: { damage: 0, ward: 0 },
  };
  b.enemies.push(h);
  return h;
}
export function beginBattle(g, kind, formation, waves = []) {
  const data = FORMATIONS[g.act];
  const ids =
    formation ||
    (kind === "boss"
      ? data.boss
      : sample(g, data[kind === "elite" ? "elite" : "normal"]));
  g.phase = "combat";
  g.battle = {
    kind,
    round: 0,
    serial: 0,
    enemies: [],
    waves: waves.map((w) => [...w]),
    wave: 1,
    intents: [],
    plans: {},
    ready: [false, false],
    flags: {},
    events: [],
    records: [],
  };
  for (const h of g.heroes) {
    h.b = { charges: healCapacity(h), healUsed: 0, nextSpeed: 0, bless: 0 };
    if (hasRelic(g, "flask")) heal(h, 4);
  }
  for (const id of ids) addEnemy(g, id);
  beginRound(g);
}
function pickVictim(g, rule) {
  const allies = living(g.heroes);
  if (rule === "front")
    return (
      sample(
        g,
        allies.filter((h) => h.name === "Fighter"),
      ) || sample(g, allies)
    );
  return rule === "lowest" ? lowest(allies) : sample(g, allies);
}
function lockIntents(g) {
  const b = g.battle,
    result = [];
  for (const enemy of living(b.enemies)) {
    const d = ENEMIES[enemy.type],
      hasPhase = d.phase && enemy.hp / enemy.max <= d.phase.at;
    if (hasPhase && !enemy.b.phaseRound) enemy.b.phaseRound = b.round;
    const table = hasPhase ? d.phase.pattern : d.pattern;
    const tick = b.round - (hasPhase ? enemy.b.phaseRound : enemy.b.start);
    for (let id of table[
      ((tick % table.length) + table.length) % table.length
    ]) {
      let m = MOVES[id];
      if (
        m.kind === "summon" &&
        (living(b.enemies).length >= 4 || enemy.b.summons >= 2)
      ) {
        const alternative =
          d.pattern.flat().find((x) => MOVES[x].kind === "hit") ||
          Object.keys(MOVES).find((x) => MOVES[x].kind === "hit");
        id = alternative;
        m = MOVES[id];
      }
      let targets = [];
      if (m.kind === "heal" || m.kind === "ward")
        targets = [lowest(b.enemies).id];
      else if (m.kind === "sweep") targets = living(g.heroes).map((h) => h.id);
      else if (m.kind === "party") {
        const hero = pickVictim(g, m.target);
        targets = hero ? own(g, hero.owner).map((h) => h.id) : [];
      } else if (m.kind !== "summon") {
        const h = pickVictim(g, m.target);
        if (h) targets = [h.id];
      }
      result.push({
        id,
        from: enemy.id,
        targets,
        speed: enemy.speed + m.speed,
      });
    }
  }
  return result;
}
function beginRound(g) {
  const b = g.battle;
  b.round++;
  b.ready = [false, false];
  b.flags.sharedBreak = false;
  b.events = [];
  b.outcome = null;
  for (const u of [...g.heroes, ...b.enemies]) {
    u.r = { damage: 0, ward: 0, guard: null, speed: u.b.nextSpeed || 0 };
    u.b.nextSpeed = 0;
  }
  if (b.round === 1) {
    for (const h of living(g.heroes)) {
      setWard(h, mod(h, "openingWard"));
      bless(h, mod(h, "openingBless"));
      h.r.speed += mod(h, "openingSpeed") + (hasRelic(g, "compass") ? 3 : 0);
      if (mod(h, "partnerOpening"))
        setWard(lowest(own(g, 1 - h.owner)), mod(h, "partnerOpening"));
    }
  }
  b.intents = lockIntents(g);
  b.plans = {};
  for (const h of living(g.heroes)) {
    const choices = skillsFor(h),
      skill =
        choices.find((s) => ["enemy", "all"].includes(SKILL[s][0])) ||
        choices[0];
    const targets = targetsFor(g, h, skill);
    b.plans[h.id] = { skill, target: targets[0]?.id || h.id };
  }
  b.ready = [!own(g, 0).length, !own(g, 1).length];
  g.phase = "combat";
}
export function targetsFor(g, h, skill) {
  const mode = SKILL[skill]?.[0];
  if (mode === "ally") return living(g.heroes);
  if (mode === "self") return [h];
  if (mode === "all" || mode === "enemy") return living(g.battle.enemies);
  return [];
}
export function setPlan(g, p, id, skill, target) {
  if (g.phase !== "combat" || g.battle.ready[p]) return false;
  const h = unit(g, id);
  if (!h?.hp || h.owner !== p || !skillsFor(h).includes(skill)) return false;
  const targets = targetsFor(g, h, skill),
    mode = SKILL[skill][0];
  const t =
    mode === "all" || mode === "self"
      ? targets[0]
      : targets.find((u) => u.id === target);
  if (!t) return false;
  g.battle.plans[id] = { skill, target: t.id };
  return true;
}
export function order(g) {
  const b = g.battle;
  const queue = living(g.heroes).map((h) => ({
    from: h.id,
    ...b.plans[h.id],
    speed: stat(g, h, "speed") + h.r.speed + SKILL[b.plans[h.id].skill][1],
  }));
  return queue
    .concat(b.intents)
    .sort(
      (a, c) =>
        c.speed - a.speed ||
        (((unit(g, a.from).owner ?? 2) + b.round) % 3) -
          (((unit(g, c.from).owner ?? 2) + b.round) % 3),
    );
}
function wardBreak(g, t) {
  const b = g.battle;
  if (t.owner === undefined) return;
  const strength = Math.max(
    0,
    ...living(g.heroes).map((h) => mod(h, "sharedBreak")),
  );
  if (strength && !b.flags.sharedBreak) {
    b.flags.sharedBreak = true;
    for (const h of living(g.heroes).filter((x) => x.name === "Fighter"))
      setWard(h, strength);
  }
  if (hasRelic(g, "ember") && !b.flags.ember) {
    b.flags.ember = true;
    for (const e of living(b.enemies))
      hurt(g, t, e, "ember", 6, { secondary: true });
  }
}
function hurt(g, src, t, skill, n, { secondary = false } = {}) {
  if (!t?.hp) return 0;
  const before = t.hp,
    oldWard = t.r.ward || 0,
    absorbed = Math.min(oldWard, n);
  t.r.ward = oldWard - absorbed;
  t.hp = Math.max(0, before - n + absorbed);
  let saved = false;
  if (
    !t.hp &&
    t.owner !== undefined &&
    hasRelic(g, "bell") &&
    g.bellAct !== g.act
  ) {
    t.hp = 1;
    g.bellAct = g.act;
    saved = true;
  }
  const lost = before - t.hp;
  t.r.damage += lost;
  emit(g, "hit", src, t, skill, lost, { absorbed, saved, secondary });
  if (absorbed && !t.r.ward) wardBreak(g, t);
  if (!t.hp && src?.owner !== undefined && t.owner === undefined) {
    setWard(src, mod(src, "killWard"));
    if (mod(src, "killGold") && !src.b.killGold) {
      src.b.killGold = true;
      g.players[src.owner].gold += mod(src, "killGold");
    }
    for (const h of own(g, 1 - src.owner))
      if (mod(h, "jointFinish") && !h.b.jointFinish) {
        setWard(h, mod(h, "jointFinish"));
        h.b.jointFinish = true;
      }
  }
  return lost;
}
function twinActive(g, h) {
  return g.heroes.some(
    (a) =>
      a.owner !== h.owner &&
      a.name === "Mage" &&
      g.battle.plans[a.id]?.skill === "Twin",
  );
}
function attackAmount(g, h, t, skill, favored, count) {
  const magic = !["Slash", "Ambush"].includes(skill),
    marked = t.b.mark !== undefined && t.b.mark !== null;
  const scale = {
    Slash: 1,
    Ambush: marked ? 1.8 : 1.3,
    Spark: 1.05,
    Flare: 0.65,
    Discharge: 1,
    Twin: 1,
    Smite: 1,
    Judgment: 1.7,
  };
  let raw =
    stat(g, h, magic ? "mag" : "atk") * scale[skill] +
    mod(h, "strike") +
    mod(h, skill === "Flare" ? "areaPower" : "singlePower") -
    t[magic ? "res" : "def"] * 0.55;
  if (skill === "Discharge" && living(g.heroes).some((a) => a.r.ward > 0))
    raw += 8;
  if (skill === "Twin" && twinActive(g, h)) raw += 8 + mod(h, "twinPower");
  if (skill === "Flare" && count === 1) raw += mod(h, "flareSolo");
  if (skill === "Flare" && favored && count >= 2) raw += mod(h, "lastEmber");
  if (skill === "Spark") raw += mod(h, "sparkPower");
  if (skill === "Smite") raw += mod(h, "smitePower");
  if (skill === "Judgment") raw += mod(h, "judgmentPower") + (marked ? 6 : 0);
  if (marked) {
    raw += 4 + mod(h, "markedPower");
    const marker = unit(g, t.b.mark);
    if (marker && marker.owner !== h.owner && !marker.r.partnerMark)
      raw += mod(marker, "partnerMark");
  }
  if (favored)
    raw += (h.b.bless || 0) + (!h.b.struck ? mod(h, "firstStrike") : 0);
  if (t.hp / t.max < 0.35) raw += mod(h, "finisher");
  if (h.r.ward) raw += mod(h, "wardStrike");
  if (!h.r.pincer && t.r["hit" + (1 - h.owner)]) raw += mod(h, "pincer");
  return Math.max(1, Math.round(raw * (hasRelic(g, "crown") ? 1.15 : 1)));
}
function activeAttack(g, h, t, skill, favored, count) {
  const marked = t.b.mark != null,
    paired = t.r["hit" + (1 - h.owner)];
  const n = attackAmount(g, h, t, skill, favored, count);
  if (favored) {
    h.b.bless = 0;
    h.b.struck = true;
  }
  if (marked) {
    const marker = unit(g, t.b.mark);
    if (marker && marker.owner !== h.owner && mod(marker, "partnerMark"))
      marker.r.partnerMark = true;
    delete t.b.mark;
    if (!h.r.markWard && mod(h, "markWard")) {
      h.r.markWard = true;
      setWard(h, mod(h, "markWard"));
    }
  }
  if (paired) {
    h.r.pincer = true;
    if (!h.r.jointFocus && mod(h, "jointFocus")) {
      h.r.jointFocus = true;
      setWard(h, mod(h, "jointFocus"));
    }
  }
  t.r["hit" + h.owner] = true;
  hurt(g, h, t, skill, n);
  if (
    t.hp &&
    ((skill === "Slash" && mod(h, "markOnSlash")) ||
      (skill !== "Flare" && mod(h, "markOnSingle") && !h.r.markedSingle))
  ) {
    t.b.mark = h.id;
    if (skill !== "Flare") h.r.markedSingle = true;
  }
  if (ENEMIES[t.type].retaliate && h.hp)
    hurt(g, t, h, "retaliate", ENEMIES[t.type].retaliate, { secondary: true });
}
function defense(g, h, skill, t) {
  const partner = h.owner !== t.owner;
  let ward = 0,
    recovery = 0,
    speed = 0,
    blessing = 0,
    guard = 0;
  if (skill === "Guard" || skill === "Riposte") {
    guard = skill === "Guard" ? 65 : 30;
    ward += mod(h, "guardWard");
  }
  if (skill === "Aegis") ward += Math.round(t.max * 0.25);
  if (skill === "Bless") {
    ward += 6 + mod(h, "blessWard");
    blessing = 12 + mod(h, "blessPower");
  }
  if (skill === "Mend") {
    recovery = Math.round(stat(g, h, "mag") * 0.9);
    ward += mod(h, "mendWard");
  }
  if (skill === "Haste") {
    recovery = 8;
    speed = 10 + mod(h, "hastePower");
  }
  if (recovery)
    recovery +=
      mod(h, "healPower") +
      (!h.b.healUsed ? mod(h, "mendFirst") : 0) +
      (partner && t.hp / t.max < 0.35 ? mod(h, "rescueAid") : 0);
  if (skill === "Hold") ward += 4;
  if (ward > 0) ward += mod(h, "shieldPower");
  if (
    partner &&
    hasRelic(g, "standards") &&
    !g.battle.flags["standard" + h.owner]
  )
    ward += 6;
  if (ward && partner) blessing += mod(h, "partnerShield");
  return { ward, recovery, speed, blessing, guard, partner };
}
function support(g, h, t, skill) {
  if (skill === "Taunt") {
    h.r.taunt = true;
    emit(g, "taunt", h, h, skill, 35);
    return;
  }
  const f = defense(g, h, skill, t);
  if (f.guard) {
    if (!t.r.guard || t.r.guard.pct < f.guard)
      t.r.guard = { src: h.id, pct: f.guard, skill };
    if (f.partner) setWard(h, mod(h, "partnerGuard"));
  }
  if (f.recovery) {
    if (h.b.charges <= 0) return;
    h.b.charges--;
    h.b.healUsed++;
    const extra = f.partner ? lowest(own(g, h.owner)) : null;
    const amount = heal(t, f.recovery);
    emit(g, "heal", h, t, skill, amount);
    if (extra && mod(h, "partnerHeal"))
      emit(g, "heal", h, extra, skill, heal(extra, mod(h, "partnerHeal")));
  }
  if (skill === "Bless") {
    if (f.partner) setWard(h, mod(h, "crossBless"));
    const second = lowest(g.heroes.filter((a) => a !== t));
    if (second && mod(h, "doubleBless")) bless(second, mod(h, "doubleBless"));
  }
  if (f.partner) g.battle.flags["standard" + h.owner] = true;
  if (f.ward) {
    setWard(t, f.ward);
    emit(g, "ward", h, t, skill, t.r.ward);
  }
  if (f.blessing) {
    bless(t, f.blessing);
    emit(g, "bless", h, t, skill, t.b.bless);
  }
  if (f.speed) {
    nextSpeed(t, f.speed);
    emit(g, "speed", h, t, skill, f.speed);
  }
  if (f.guard) emit(g, "guard", h, t, skill, f.guard);
  if (
    f.partner &&
    (f.guard || f.ward) &&
    mod(t, "allyCover") &&
    !t.r.allyCover
  ) {
    t.r.allyCover = true;
    nextSpeed(t, mod(t, "allyCover"));
  }
}
function incoming(g, e, t, m, redirect = false) {
  let n = Math.max(
    1,
    Math.round(
      (e.atk * m.power) / 100 - stat(g, t, m.magic ? "res" : "def") * 0.55,
    ),
  );
  if (t.hp < t.max / 2) n = Math.max(1, n - mod(t, "lowGuard"));
  if (t.r.guard) n *= 1 - t.r.guard.pct / 100;
  if (redirect) n *= 0.65;
  if (t.r.evade) n *= 0.65;
  return Math.max(1, Math.round(n));
}
function enemyAction(g, a) {
  const b = g.battle,
    e = unit(g, a.from),
    m = MOVES[a.id];
  if (m.kind === "summon") {
    if (
      e.b.summons < 2 &&
      living(b.enemies).length < 4 &&
      ENEMIES[e.type].summon
    ) {
      e.b.summons++;
      const summon = addEnemy(g, ENEMIES[e.type].summon);
      summon.b.start = b.round + 1;
      emit(g, "summon", e, summon, a.id);
    }
    return;
  }
  if (m.kind === "channel" && e.r.damage >= m.breakAt) {
    emit(g, "interrupt", e, e, a.id, m.breakAt);
    return;
  }
  for (const id of a.targets) {
    if (!e.hp) break;
    const original = unit(g, id);
    if (!original?.hp) {
      emit(g, "miss", e, original, a.id);
      continue;
    }
    if (m.kind === "heal") {
      emit(g, "heal", e, original, a.id, heal(original, m.power));
      continue;
    }
    if (m.kind === "ward") {
      setWard(original, m.power);
      emit(g, "ward", e, original, a.id, original.r.ward);
      continue;
    }
    let t = original;
    if (m.kind === "hit" || m.kind === "channel") {
      const guards = living(g.heroes).filter((h) => h.r.taunt);
      if (!t.r.taunt)
        t = guards.find((h) => h.owner === original.owner) || guards[0] || t;
    }
    if (t !== original) emit(g, "intercept", t, original, "Taunt");
    const guard = t.r.guard,
      amount = incoming(g, e, t, m, t !== original);
    t.r.evade = false;
    hurt(g, e, t, a.id, amount);
    if (t !== original) {
      if (!t.r.intercept) {
        t.r.intercept = true;
        setWard(t, mod(t, "tauntWard"));
      }
      if (t.owner !== original.owner)
        nextSpeed(original, mod(t, "rescueSpeed"));
    }
    const protector = guard && unit(g, guard.src);
    if (protector?.hp) {
      if (mod(protector, "markOnGuard") && e.hp) e.b.mark = protector.id;
      if (!protector.r.guarded) {
        nextSpeed(protector, mod(protector, "speedOnGuard"));
        protector.r.guarded = true;
      }
      const counter =
        mod(protector, "counter") +
        (guard.skill === "Riposte"
          ? Math.max(
              1,
              Math.round(stat(g, protector, "atk") * 0.5 - e.def * 0.55),
            )
          : 0);
      if (counter && e.hp)
        hurt(g, protector, e, "counter", counter, { secondary: true });
    }
  }
}
function heroAction(g, a) {
  const h = unit(g, a.from),
    skill = a.skill,
    mode = SKILL[skill][0],
    t = unit(g, a.target);
  if (mode === "all") {
    const targets = living(g.battle.enemies),
      fav = lowest(targets);
    if (fav) {
      for (const e of [fav, ...targets.filter((x) => x !== fav)]) {
        if (h.hp && e.hp)
          activeAttack(g, h, e, skill, e === fav, targets.length);
      }
      const survivor = lowest(g.battle.enemies);
      if (survivor && h.hp && mod(h, "markOnFlare")) survivor.b.mark = h.id;
    }
  } else if (!t?.hp) emit(g, "miss", h, t, skill);
  else if (mode === "enemy") {
    if (skill === "Ambush") {
      h.r.evade = true;
      setWard(h, mod(h, "ambushWard"));
    }
    activeAttack(g, h, t, skill, true, 1);
  } else support(g, h, t, skill);
}
export function preview(g, h, skill, t) {
  const mode = SKILL[skill][0];
  if (mode === "enemy" || mode === "all") {
    const foes = living(g.battle.enemies),
      n = attackAmount(
        g,
        h,
        t,
        skill,
        mode !== "all" || t === lowest(foes),
        foes.length,
      );
    return {
      damage: Math.max(0, n - (t.r.ward || 0)),
      wardAbsorb: Math.min(n, t.r.ward || 0),
      evade: skill === "Ambush" ? 35 : 0,
      selfWard: skill === "Ambush" ? mod(h, "ambushWard") : 0,
    };
  }
  if (skill === "Taunt") return { taunt: 35 };
  const f = defense(g, h, skill, t);
  const guardedHits = [];
  if (f.guard) {
    for (const a of g.battle.intents.filter((a) => a.targets.includes(t.id))) {
      const m = MOVES[a.id];
      if (!["hit", "party", "sweep", "channel"].includes(m.kind)) continue;
      const enemy = unit(g, a.from),
        old = incoming(g, enemy, t, m),
        guarded = {
          ...t,
          r: { ...t.r, guard: { pct: Math.max(f.guard, t.r.guard?.pct || 0) } },
        };
      const after = incoming(g, enemy, guarded, m),
        ward = Math.max(t.r.ward || 0, f.ward);
      guardedHits.push([
        Math.max(0, old - (t.r.ward || 0)),
        Math.max(0, after - ward),
      ]);
    }
  }
  return { ...f, guardedHits, recovery: Math.min(t.max - t.hp, f.recovery) };
}
export function intentValue(g, a, h) {
  const m = MOVES[a.id],
    e = unit(g, a.from);
  if (m.kind === "heal") return Math.min(h.max - h.hp, m.power);
  if (m.kind === "ward") return m.power;
  if (m.kind === "summon") return 0;
  return Math.max(0, incoming(g, e, h, m) - (h.r.ward || 0));
}
export function ready(g, p) {
  if (g.phase !== "combat" || ![0, 1].includes(p) || !own(g, p).length)
    return false;
  const b = g.battle;
  b.ready[p] = !b.ready[p];
  if (!b.ready.every(Boolean)) return true;
  b.events = [];
  b.before = Object.fromEntries(
    [...g.heroes, ...b.enemies].map((u) => [u.id, u.hp]),
  );
  for (const a of order(g)) {
    if (!living(g.heroes).length || !living(b.enemies).length) break;
    if (!unit(g, a.from)?.hp) continue;
    if (a.skill) heroAction(g, a);
    else enemyAction(g, a);
  }
  b.outcome = !living(g.heroes).length
    ? "defeat"
    : living(b.enemies).length
      ? "continue"
      : b.waves.length
        ? "wave"
        : "victory";
  b.records.push({ round: b.round, events: [...b.events] });
  if (b.records.length > 12) b.records.shift();
  g.stats.rounds++;
  g.phase = "round";
  return true;
}
export function nextCombatRound(g) {
  const b = g.battle;
  if (g.phase !== "round" || !["wave", "continue"].includes(b.outcome))
    return false;
  if (b.outcome === "wave") {
    for (const id of b.waves.shift()) {
      const e = addEnemy(g, id);
      e.b.start = b.round + 1;
    }
    b.wave++;
  }
  beginRound(g);
  return true;
}

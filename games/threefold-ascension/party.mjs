import { newMatch, odds } from "../threefold-duel/engine.mjs";
import { skills as duelSkills } from "../threefold-duel/catalog.mjs";
import { CARDS } from "./cards.mjs";

export const BY_CARD = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const ROLES = ["Fighter", "Mage", "Priest"];
export const SKILL = {
  ...duelSkills,
  Twin: ["enemy", 0, "A paired spell"],
  Hold: ["self", 0, "Brace"],
};
export const LABEL = {
  Fighter: ["Fighter", "战士"],
  Mage: ["Mage", "法师"],
  Priest: ["Priest", "牧师"],
  General: ["General", "通用"],
  Cooperative: ["Cooperative", "协作"],
  Slash: ["Slash", "斩击"],
  Guard: ["Guard", "护卫"],
  Ambush: ["Ambush", "伏击"],
  Riposte: ["Riposte", "格挡反击"],
  Taunt: ["Taunt", "嘲讽"],
  Spark: ["Spark", "电火花"],
  Flare: ["Flame Storm", "烈焰风暴"],
  Aegis: ["Aegis", "奥术屏障"],
  Discharge: ["Discharge", "蓄能放电"],
  Twin: ["Twin Invocation", "双星共鸣"],
  Smite: ["Smite", "圣击"],
  Mend: ["Mend", "治疗术"],
  Judgment: ["Judgment", "神圣审判"],
  Bless: ["Consecrate", "武器祝圣"],
  Haste: ["Haste", "疾行术"],
  Hold: ["Brace", "稳住阵脚"],
};
export const living = (list) => list.filter((unit) => unit.hp > 0);
export const lowest = (list) =>
  living(list).reduce(
    (best, u) => (!best || u.hp / u.max < best.hp / best.max ? u : best),
    null,
  );
export const roleArt = (h) =>
  "./art/company/" +
  (h.owner === 0 ? "amber" : "jade") +
  "-" +
  h.name.toLowerCase() +
  ".webp";
export const mod = (h, key) => h?.mods?.[key] || 0;
export const hasRelic = (g, key) => g.relics.filter((id) => id === key).length;
export const heal = (h, amount) => {
  if (!h || h.hp <= 0) return 0;
  const old = h.hp;
  h.hp = Math.min(h.max, h.hp + Math.max(0, Math.round(amount)));
  return h.hp - old;
};
export function random(g) {
  g.rng = (Math.imul(g.rng, 1664525) + 1013904223) >>> 0;
  return g.rng / 4294967296;
}
export function sample(g, items) {
  return items[Math.floor(random(g) * items.length)];
}
export function shuffled(g, items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random(g) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeHeroes() {
  return newMatch().teams.flatMap((team, owner) =>
    team.map((base, i) => ({
      id: "h" + (owner * 3 + i),
      owner,
      name: base.name,
      hp: base.max,
      max: base.max,
      atk: base.atk,
      mag: base.mag,
      def: base.def,
      res: base.res,
      speed: base.speed,
      luck: base.luck,
      skills: base.skills.slice(),
      mods: {},
      cards: {},
      history: [],
    })),
  );
}
export function stat(g, h, key) {
  const keys = {
    atk: "physical",
    mag: "magic",
    def: "armor",
    res: "resist",
    speed: "speed",
    luck: "luck",
  };
  return (
    h[key] +
    mod(h, keys[key]) +
    (key === "atk" || key === "mag" ? hasRelic(g, "whetstone") : 0)
  );
}
const ATTACKS = new Set([
  "Slash",
  "Ambush",
  "Spark",
  "Flare",
  "Discharge",
  "Twin",
  "Smite",
  "Judgment",
]);
const SKILL_ROLE = {
  Slash: "Fighter",
  Guard: "Fighter",
  Ambush: "Fighter",
  Riposte: "Fighter",
  Taunt: "Fighter",
  Spark: "Mage",
  Flare: "Mage",
  Aegis: "Mage",
  Discharge: "Mage",
  Twin: "Mage",
  Smite: "Priest",
  Mend: "Priest",
  Judgment: "Priest",
  Bless: "Priest",
  Haste: "Priest",
};
const fixedFighter = new Set(["Guard", "Ambush", "Riposte", "Taunt"]);
export function slots(h, c) {
  if (!c.skill || SKILL_ROLE[c.skill] !== h.name || h.skills.includes(c.skill))
    return [];
  if (fixedFighter.has(c.skill)) return [1];
  if (c.skill === "Slash") return [0];
  return [0, 1];
}
function source(h, key) {
  const sk = h.skills;
  switch (key) {
    case "attack":
      return sk.some((s) => ATTACKS.has(s));
    case "single":
      return sk.some((s) => ATTACKS.has(s) && s !== "Flare");
    case "heal":
      return sk.includes("Mend") || sk.includes("Haste");
    case "guard":
      return sk.includes("Guard") || sk.includes("Riposte");
    case "ward":
      return (
        sk.includes("Aegis") ||
        sk.includes("Bless") ||
        (source(h, "guard") && mod(h, "guardWard") > 0) ||
        (sk.includes("Mend") && mod(h, "mendWard") > 0)
      );
    case "anyWard":
      return (
        source(h, "ward") ||
        mod(h, "openingWard") ||
        mod(h, "partnerOpening") ||
        (mod(h, "killWard") && source(h, "attack")) ||
        (mod(h, "ambushWard") && sk.includes("Ambush")) ||
        (mod(h, "tauntWard") && sk.includes("Taunt")) ||
        mod(h, "markWard") ||
        mod(h, "jointFocus") ||
        (mod(h, "partnerGuard") && source(h, "guard")) ||
        (mod(h, "crossBless") && sk.includes("Bless")) ||
        mod(h, "jointFinish")
      );
    case "markSource":
      return (
        (mod(h, "markOnSlash") && sk.includes("Slash")) ||
        (mod(h, "markOnSingle") && source(h, "single")) ||
        (mod(h, "markOnFlare") && sk.includes("Flare")) ||
        (mod(h, "markOnGuard") && source(h, "guard"))
      );
    default:
      return sk.includes(key);
  }
}
export function meets(g, h, need = []) {
  const team = living(g.heroes),
    partner = team.filter((x) => x.owner !== h.owner);
  return need.every((key) => {
    if (key === "teamMark") return team.some((x) => source(x, "markSource"));
    if (key === "teamWard")
      return team.some((x) => source(x, "anyWard")) || hasRelic(g, "standards");
    if (key === "partnerAttack")
      return partner.some((x) => source(x, "attack"));
    if (key === "partnerWard")
      return (
        partner.some((x) => source(x, "ward")) ||
        (hasRelic(g, "standards") && partner.length > 0)
      );
    if (key === "partnerHeal") return partner.some((x) => source(x, "heal"));
    return !!source(h, key);
  });
}
export function recipients(g, owner, c) {
  if (!c) return [];
  return living(g.heroes).filter(
    (h) =>
      h.owner === owner &&
      (["General", "Cooperative"].includes(c.group) || c.group === h.name) &&
      (c.skill ? slots(h, c).length > 0 : (h.cards[c.id] || 0) < c.cap) &&
      meets(g, h, c.need),
  );
}
export function draw(g, owner, count = 3) {
  const luck = g.heroes
    .filter((h) => h.owner === owner && h.hp > 0)
    .reduce((a, h) => a + stat(g, h, "luck"), 0);
  const weights = odds(luck),
    result = [];
  const pools = weights.map((_, tier) =>
    CARDS.filter((c) => c.rarity === tier && recipients(g, owner, c).length),
  );
  while (result.length < count && pools.some((p) => p.length)) {
    let cursor =
      random(g) * pools.reduce((n, p, i) => n + (p.length ? weights[i] : 0), 0);
    const tier = pools.findIndex(
      (p, i) => p.length && (cursor -= weights[i]) < 0,
    );
    const pool = pools[tier],
      index = Math.floor(random(g) * pool.length);
    result.push(pool.splice(index, 1)[0].id);
  }
  return result;
}
export function grant(g, h, c, slot) {
  if (!h || !recipients(g, h.owner, c).includes(h)) return false;
  if (c.skill) {
    if (!slots(h, c).includes(slot)) return false;
    h.skills[slot] = c.skill;
  }
  if (!c.skill || !h.cards[c.id]) {
    h.cards[c.id] = (h.cards[c.id] || 0) + 1;
    for (const [key, n] of Object.entries(c.mods || {}))
      h.mods[key] = (h.mods[key] || 0) + n;
    if (c.mods?.maxHp) {
      h.max += c.mods.maxHp;
      heal(h, c.mods.maxHp);
    }
  }
  h.history.push({
    id: c.id,
    act: g.act + 1,
    floor: g.node?.row + 1 || 0,
    slot: c.skill ? slot : null,
  });
  return true;
}
export function cardActive(g, h, c) {
  return (!c.skill || h.skills.includes(c.skill)) && meets(g, h, c.need);
}
export function strengthen(g, h, id) {
  const c = BY_CARD[id];
  if (
    !c ||
    !h.cards[id] ||
    c.skill ||
    h.cards[id] >= c.cap ||
    !cardActive(g, h, c)
  )
    return false;
  return grant(g, h, c);
}
export function healCapacity(h) {
  return 3 + mod(h, "healCharges");
}
export function skillsFor(h) {
  const usable = h.skills.filter(
    (s) => !["Mend", "Haste"].includes(s) || (h.b?.charges || 0) > 0,
  );
  return usable.length ? usable : ["Hold"];
}

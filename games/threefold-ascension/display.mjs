import { ACTS, ENEMIES, EVENTS, MOVES, RELICS } from "./world.mjs";
import { LABEL, hasRelic } from "./party.mjs";
import { ROOM } from "./campaign.mjs";
import { preview, unit, intentValue } from "./combat.mjs";

export let lang = "en";
export function setLanguage(value) {
  lang = value === "zh" ? "zh" : "en";
  document.documentElement.lang = lang === "zh" ? "zh-Hans" : "en";
}
export const T = (en, zh) => (lang === "zh" ? zh : en);
export const N = (o) => (o ? T(o.en, o.zh) : "");
export const D = (o) => (o ? T(o.desc, o.cn) : "");
export const label = (id) =>
  LABEL[id] ? T(...LABEL[id]) : N(MOVES[id] || RELICS[id]);
export const roman = ["I", "II", "III", "IV", "V", "VI"];
export const grade = (n) =>
  T(
    ["Common", "Rare", "Epic", "Legendary"][n],
    ["普通", "稀有", "史诗", "传说"][n],
  );
export const teamName = (p) =>
  p === 0 ? T("Amber", "琥珀队") : T("Jade", "青玉队");
export const roomName = (k) => T(ROOM[k][1], ROOM[k][2]);
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
export const E = escape;
export function btn(action, html, data = {}, cls = "", opts = {}) {
  const values = Object.entries(data)
    .map(([k, v]) => " data-" + k + '="' + E(v) + '"')
    .join("");
  return (
    '<button type="button" class="' +
    E(cls) +
    '" data-act="' +
    E(action) +
    '"' +
    values +
    (opts.disabled ? " disabled" : "") +
    (opts.label ? ' aria-label="' + E(opts.label) + '"' : "") +
    (opts.pressed != null ? ' aria-pressed="' + !!opts.pressed + '"' : "") +
    ">" +
    html +
    "</button>"
  );
}
export function who(g, u, short = false) {
  if (!u) return "—";
  if (u.owner != null)
    return (
      (short ? (u.owner === 0 ? "I" : "II") : teamName(u.owner)) +
      " · " +
      label(u.name)
    );
  const peers = g.battle.enemies.filter((e) => e.type === u.type);
  return (
    N(ENEMIES[u.type]) +
    (peers.length > 1
      ? " " + (roman[peers.indexOf(u)] || peers.indexOf(u) + 1)
      : "")
  );
}
export function nodeName(g, n) {
  if (n.kind === "boss") return N(ENEMIES[ACTS[g.act].boss]);
  if (n.kind === "event" && hasRelic(g, "lens")) return N(EVENTS[n.event]);
  return roomName(n.kind);
}
export function nodeDetail(g, n) {
  if (n.formation)
    return (
      n.formation.map((id) => N(ENEMIES[id])).join(" · ") +
      (n.waves?.length ? T(" · Two waves", " · 两波敌人") : "")
    );
  if (n.kind === "boss")
    return T(
      "Defeat the act guardian for a shared relic.",
      "击败本幕守卫，共选遗物。",
    );
  if (n.kind === "shop")
    return T("Spend from your own purse.", "用各自的金币补给。");
  if (n.kind === "rest")
    return T(
      "Recover the party or train one hero.",
      "全队休整或训练一名英雄。",
    );
  if (n.kind === "treasure")
    return T("Choose one shared relic.", "共同挑选一件遗物。");
  return hasRelic(g, "lens")
    ? D(EVENTS[n.event])
    : T("Make a choice together.", "共同决定奇遇的结果。");
}
export function amounts(g, h, skill, target) {
  const f = preview(g, h, skill, target),
    a = [];
  if (f.damage != null) a.push(f.damage + T(" damage", " 伤害"));
  if (f.wardAbsorb) a.push(f.wardAbsorb + T(" blocked", " 由屏障吸收"));
  if (f.evade) a.push(T("next hit −", "下次受击 −") + f.evade + "%");
  if (f.selfWard) a.push(T("self barrier ", "自身屏障 ") + f.selfWard);
  if (["Mend", "Haste"].includes(skill)) a.push("+" + f.recovery + " HP");
  if (f.ward) a.push(T("barrier ", "屏障 ") + f.ward);
  if (f.guard) a.push(T("incoming −", "承伤 −") + f.guard + "%");
  if (f.guardedHits?.length)
    a.push(
      f.guardedHits.map(([old, n]) => old + "→" + n).join(", ") +
        T(" damage", " 伤害"),
    );
  if (f.taunt)
    a.push(T("intercept • damage −", "转移单体攻击 · 承伤 −") + f.taunt + "%");
  if (f.speed) a.push("+" + f.speed + T(" next Speed", " 下轮速度"));
  if (f.blessing) a.push("+" + f.blessing + T(" next hit", " 下次伤害"));
  return a.join(" · ");
}
const skillLines = {
  Slash: ["Strike one enemy with your blade.", "挥剑攻击一名敌人。"],
  Guard: [
    "Reduce one ally’s incoming attack damage this round. You may guard either party.",
    "本回合为任意一名友方减伤，可跨队护卫。",
  ],
  Ambush: [
    "Hit a marked target harder. Reduce the next incoming hit this round by 35%.",
    "攻击标记目标时伤害更高。本回合下次受击减伤 35%。",
  ],
  Riposte: [
    "Guard one ally and counter attacks with 50% of your physical attack.",
    "为一名友方抵挡攻击，并以自身 50% 物攻反击。",
  ],
  Taunt: [
    "Intercept single-target attacks aimed at other heroes this round. Your own party has priority.",
    "本回合承接针对队友的主动单体攻击，优先保护自己队伍。",
  ],
  Spark: ["Concentrate magic on one enemy.", "集中魔力攻击一名敌人。"],
  Flare: [
    "Hit all living enemies. Each target’s magic defense is applied separately.",
    "攻击所有存活敌人，分别计算魔防。",
  ],
  Aegis: [
    "Give one ally a barrier until round end. The stronger barrier applies.",
    "为一名友方提供持续至本回合结束的屏障，保留较强的屏障。",
  ],
  Discharge: [
    "Hit one enemy. Gain 8 damage if an ally currently has a barrier.",
    "攻击一名敌人。任意存活友方有屏障时额外造成 8 点伤害。",
  ],
  Twin: [
    "Hit one enemy. When both Mages plan this spell, each cast gains 8 damage.",
    "攻击一名敌人。双方法师同时选择本技能时，每次施法伤害 +8。",
  ],
  Smite: ["Deal holy damage to one enemy.", "对一名敌人造成神圣伤害。"],
  Judgment: [
    "Strike one enemy. A marked target takes 6 extra damage in addition to the mark.",
    "审判一名敌人。除标记加成外，对标记目标额外造成 6 点伤害。",
  ],
  Mend: [
    "Recover one living ally’s HP. Uses one recovery charge.",
    "为一名存活友方恢复生命，消耗一次治疗次数。",
  ],
  Bless: [
    "Give one ally a barrier now and strengthen their next active hit. Recasting refreshes the blessing.",
    "立即为友方施加屏障，提升下次主动攻击伤害。重复施加刷新祝圣。",
  ],
  Haste: [
    "Heal an ally now and grant Speed next round. Uses one recovery charge.",
    "立即治疗友方并提高其下回合速度，消耗一次治疗次数。",
  ],
  Hold: [
    "Brace for a 4-point barrier when both equipped skills are out of charges.",
    "两个技能都耗尽治疗次数时，可以获得 4 点屏障。",
  ],
};
export const skillLine = (k) => T(...skillLines[k]);
export function intentText(g, a) {
  const m = MOVES[a.id],
    target = a.targets.map((id) => unit(g, id)).filter(Boolean);
  if (m.kind === "summon")
    return (
      T("Summon ", "召唤 ") + N(ENEMIES[ENEMIES[unit(g, a.from).type].summon])
    );
  const nums = target.map((u) => intentValue(g, a, u));
  let targetText =
    target.length > 1
      ? m.kind === "party"
        ? teamName(target[0].owner)
        : T("all heroes", "所有英雄")
      : who(g, target[0], true);
  const span =
    Math.min(...nums) === Math.max(...nums)
      ? nums[0]
      : Math.min(...nums) + "–" + Math.max(...nums);
  const amount =
    m.kind === "heal"
      ? "+" + span + " HP"
      : m.kind === "ward"
        ? T("barrier ", "屏障 ") + span
        : span + T(" dmg", " 伤害");
  return (
    targetText +
    " · " +
    amount +
    (m.kind === "channel"
      ? T(" · interrupt at ", " · 打断需 ") + m.breakAt
      : "")
  );
}
export function eventText(g, e) {
  const from = who(g, unit(g, e.src), true),
    to = who(g, unit(g, e.to), true);
  const extra = {
    retaliate: T("Retaliate", "反伤"),
    counter: T("Counter", "反击"),
  };
  const sk = label(e.skill) || extra[e.skill] || e.skill;
  const amount = {
    hit:
      "−" +
      e.n +
      " HP" +
      (e.absorbed ? T(" · blocked ", " · 屏障吸收 ") + e.absorbed : "") +
      (e.saved ? T(" · Bell saved them", " · 守誓之铃触发") : ""),
    heal: "+" + e.n + " HP",
    ward: T("barrier ", "屏障 ") + e.n,
    bless: T("next hit +", "下次伤害 +") + e.n,
    speed: T("next Speed +", "下轮速度 +") + e.n,
    guard: T("guard −", "护卫 −") + e.n + "%",
    intercept: T("intercepted", "接下攻击"),
    taunt: T("intercepts single attacks", "承接单体攻击"),
    miss: T("target down", "目标已倒下"),
    summon: T("summoned", "已召唤"),
    interrupt: T("interrupted", "已打断"),
  }[e.k];
  return from + " · " + sk + " → " + to + " · " + amount;
}

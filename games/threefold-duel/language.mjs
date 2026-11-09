import { localizedCards, localizedSkills, zhLabels } from "./zh.mjs";
import { byId, skills } from "./catalog.mjs";
const labels = {
  ...zhLabels,
  "Marks add 4 damage to the next active hit. Specialized cards enter the draft when a living hero can use their effect. Taunt redirects single-target attacks, while Flame Storm hits every living enemy.":
    "标记使下一次命中的主动攻击多造成 4 点伤害。存活队员能触发效果时，对应的联动牌才会进入候选池。嘲讽可转移单体攻击，烈焰风暴则会命中所有存活敌人。",
  "Cinder Seal": "烬火印记",
  Action: "行动",
  "All living enemies": "所有存活敌人",
  Self: "自身",
  "Choose a skill to replace": "选择要替换的技能",
  "Barrier Pulse": "屏障脉冲",
  "Holy Verdict": "圣光裁决",
  Evasion: "闪避架势",

  "Arcane Feedback": "奥术回流",
  "Replay round": "重播本回合",
};
const skillNames = Object.fromEntries(
  Object.entries(localizedSkills).map(([id, [name]]) => [id, name]),
);
export let zh = false;
export function setLanguage(value) {
  zh = value === "zh";
  document.documentElement.lang = zh ? "zh-Hans" : "en";
}
export function preferredLanguage() {
  const query = new URLSearchParams(location.search).get("lang");
  if (query === "zh" || query === "en") return query;
  try {
    const saved = localStorage.getItem("duel-lang");
    if (saved === "zh" || saved === "en") return saved;
  } catch {}
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}
export const t = (word) =>
  zh
    ? (skillNames[word] ?? labels[word] ?? word)
    : { Flare: "Flame Storm", Bless: "Consecrated Arms" }[word] || word;
export const cardName = (c) => (zh ? localizedCards[c.id][0] : c.name);
export const cardText = (c) => (zh ? localizedCards[c.id][1] : c.description);
export const skillText = (id) => (zh ? localizedSkills[id][1] : skills[id][2]);
export function draftText(pick) {
  const { side, hero, id } = pick;
  return zh
    ? "玩家" +
        (side + 1) +
        "的" +
        t(hero) +
        "获得「" +
        cardName(byId[id]) +
        "」。"
    : "P" + (side + 1) + " · " + hero + " gains " + cardName(byId[id]) + ".";
}

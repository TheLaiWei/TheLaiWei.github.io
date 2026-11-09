import { localizedCards, localizedSkills, zhLabels } from "./zh.mjs";
import { byId, skills } from "./catalog.mjs";
const labels = {
  ...zhLabels,
  Action: "行动",
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
  zh ? (skillNames[word] ?? labels[word] ?? word) : word;
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

// Positions address a hero by seat and party slot, independent of language.
import { classes } from "./catalog.mjs";
export function eventText(e, t = (word) => word, zh = false) {
  const hero = (pos) =>
    zh
      ? "玩家" + (pos[0] + 1) + "的" + t(classes[pos[1]])
      : "P" + (pos[0] + 1) + " " + t(classes[pos[1]]);
  const actor = hero(e.from),
    target = hero(e.to),
    skill = t(e.skill);
  const start = actor + " · " + skill;
  if (e.kind === "skipped")
    return start + (zh ? "：已倒下，无法行动。" : " skipped (defeated).");
  if (e.kind === "miss")
    return start + (zh ? "：目标已倒下。" : " misses its defeated target.");
  const hp = e.delta > 0 ? "+" + e.delta : String(e.delta).replace("-", "−");
  const prefix = start + " → " + target;
  if (e.kind === "damage")
    return (
      prefix +
      " " +
      hp +
      (zh ? " 生命" : " HP") +
      (e.absorbed
        ? zh
          ? "（护盾吸收 " + e.absorbed + "）"
          : " (" + e.absorbed + " shielded)"
        : "") +
      (e.saved ? (zh ? " · 圣域守护" : " · Sanctuary") : "") +
      (e.defeated ? (zh ? " · 已倒下" : " · defeated") : "")
    );
  if (e.kind === "heal")
    return prefix + " +" + e.delta + (zh ? " 生命" : " HP");
  if (e.kind === "ward")
    return prefix + (zh ? " · 护盾 " : " · shield ") + e.shield;
  return prefix;
}

import { previewAction } from "./engine.mjs";
import { skills } from "./catalog.mjs";
import { t, zh } from "./language.mjs";

export function skillPreview(g, side, actor, slot) {
  const h = g.teams[side][actor],
    skill = h.skills[slot],
    mode = skills[skill][0];
  if (!h.hp) return "";
  const ally = mode === "ally" || mode === "self",
    targets = g.teams[ally ? side : 1 - side];
  const rows = [];
  const value = (en, cn) => (zh ? cn : en);
  for (const [i, target] of targets.entries()) {
    if (!target.hp || (mode === "self" && i !== actor)) continue;
    const trial = previewAction(g, side, actor, slot, i);
    for (const e of trial.events) {
      const unit = g.teams[e.to[0]][e.to[1]],
        after = trial.teams[e.to[0]][e.to[1]];
      const name = t(unit.name);
      let result = "";
      if (e.kind === "damage")
        result =
          "−" +
          Math.abs(e.delta) +
          " " +
          t("HP") +
          (e.absorbed ? " · ◇ −" + e.absorbed : "");
      if (e.kind === "heal") result = "+" + e.delta + " " + t("HP");
      if (skill === "Mend" && e.kind === "heal") {
        const power = Math.round(h.mag * 0.9) + 5 * (h.cards.mercy || 0);
        result += " / " + power + value(" possible", " 治疗量");
      }
      if (skill === "Haste")
        result += " · +" + after.nextSpeed + " " + t("Speed");
      if (
        e.kind === "ward" ||
        ((skill === "Mend" || skill === "Bless") && e.shield)
      )
        result += " · ◇ " + e.shield;
      if (skill === "Bless")
        result += " · +" + after.bless + value(" holy damage", " 神圣伤害");
      if (skill === "Guard" || skill === "Riposte" || skill === "Taunt") {
        // Illustrate mitigation with an equipped enemy skill, independent of either private plan.
        const enemies = g.teams[1 - side];
        const attacker = enemies.findIndex(
          (enemy) =>
            enemy.hp && enemy.skills.some((id) => skills[id][0] === "enemy"),
        );
        const intended =
          skill === "Taunt"
            ? targets.findIndex((a, k) => a.hp && k !== actor)
            : i;
        if (attacker >= 0 && intended >= 0) {
          const enemy = enemies[attacker],
            attackSlot = enemy.skills.findIndex(
              (id) => skills[id][0] === "enemy",
            );
          const simulate = (board) =>
            previewAction(board, 1 - side, attacker, attackSlot, intended);
          const base = simulate(g).events[0],
            protectedHits = simulate(trial).events;
          const hit = protectedHits[0];
          result =
            value("vs ", "受到") +
            t(enemy.skills[attackSlot]) +
            " " +
            Math.abs(base.delta) +
            " → " +
            Math.abs(hit.delta) +
            " " +
            t("HP");
          const counter = protectedHits.find((ev) => ev.skill === "Counter");
          if (counter)
            result += " · " + t("Counter") + " " + Math.abs(counter.delta);
        } else {
          result =
            value("20 incoming → ", "受到 20 点伤害 → ") +
            (skill === "Guard" ? 7 : skill === "Riposte" ? 14 : 13);
        }
      }
      if (e.kind === "mark") result = t("Marked");
      if (result) rows.push(name + " " + result.replace(/^ · /, ""));
    }
    if (skill === "Bless" && h.cards.doublebless) {
      const other = g.teams[side]
        .map((a, k) => ({ a, k }))
        .filter(({ a, k }) => a.hp && k !== i)
        .sort((x, y) => x.a.hp / x.a.max - y.a.hp / y.a.max)[0];
      if (other)
        rows.push(
          "↳ " +
            t(other.a.name) +
            " +" +
            trial.teams[side][other.k].bless +
            value(" holy damage", " 神圣伤害"),
        );
    }
    if (mode === "all") break;
  }
  return (
    '<div class="forecast"><small>' +
    value("Current board estimate", "按当前战况估算") +
    "</small><div>" +
    rows.join(" · ") +
    "</div></div>"
  );
}

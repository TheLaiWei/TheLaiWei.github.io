import { dependencies, skills } from "./catalog.mjs";
const has = (hero, ...names) =>
  names.some((name) => hero.skills.includes(name));
const attacks = (h) =>
  h.skills.some((name) => ["enemy", "all"].includes(skills[name][0]));
const singles = (h) => h.skills.some((name) => skills[name][0] === "enemy");
const protects = (h) => has(h, "Guard", "Riposte", "Taunt");
function makesMark(h) {
  const c = h.cards;
  return (
    (c.quarry && has(h, "Slash")) ||
    (c.prism && has(h, "Smite")) ||
    (c.cinder && has(h, "Flare")) ||
    (c.feint && has(h, "Guard", "Riposte")) ||
    (c.shadowstep && has(h, "Ambush")) ||
    (c.sight && attacks(h)) ||
    (c.aim && singles(h))
  );
}
function makesWard(h) {
  const c = h.cards;
  return (
    has(h, "Aegis", "Bless") ||
    c.lattice ||
    c.relay ||
    ((c.prayer || c.overflow) && has(h, "Mend")) ||
    (c.stalwart && has(h, "Taunt"))
  );
}
export function supports(team, h, c, foes) {
  const allies = team.filter((a) => a.hp > 0);
  if (dependencies[c.id] && !has(h, ...dependencies[c.id])) return false;
  if (["taunt", "stalwart", "doublebless"].includes(c.id) && allies.length < 2)
    return false;
  if (
    c.id === "afterburn" &&
    foes &&
    foes.filter((enemy) => enemy.hp > 0).length < 2
  )
    return false;
  switch (c.id) {
    case "thread":
    case "feedback":
    case "sanctuary":
      return Boolean(makesWard(h));
    case "mirror":
    case "rally":
      return allies.some(makesWard);
    case "surge":
      return allies.some((a) =>
        a === h
          ? makesWard(a)
          : has(a, "Aegis", "Bless") ||
            a.cards.relay ||
            ((a.cards.prayer || a.cards.overflow) && has(a, "Mend")),
      );
    case "pursuit":
    case "exploit":
    case "verdict":
    case "holyverdict":
      return allies.some(makesMark);
    case "cover":
    case "guarded":
      return (
        attacks(h) &&
        allies.some((a) =>
          c.id === "cover" && a !== h
            ? protects(a)
            : has(a, "Guard", "Riposte"),
        )
      );
    case "aim":
      return singles(h);
    case "sight":
    case "comet":
      return attacks(h);
    default:
      return true;
  }
}

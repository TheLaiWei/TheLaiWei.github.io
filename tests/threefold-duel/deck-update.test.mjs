import test from "node:test";
import assert from "node:assert/strict";
import { byId, slotsFor } from "../../games/threefold-duel/catalog.mjs";
import {
  newMatch,
  resolve,
  eligible,
  applyCard,
  startRound,
} from "../../games/threefold-duel/engine.mjs";

const use = (slot, target) => ({ slot, target });
function play(g, plans) {
  startRound(g);
  resolve(g, plans);
  return g.history.at(-1).events;
}
test("starting Guard; optional slot-2 Taunt redirects singles and never redirects a storm", () => {
  const g = newMatch(),
    [a, b] = g.teams;
  assert.deepEqual(a[0].skills, ["Slash", "Guard"]);
  applyCard(a, byId.taunt, 0);
  assert.deepEqual(a[0].skills, ["Slash", "Taunt"]);
  applyCard(a, byId.stalwart, 0);
  const events = play(g, [
    [use(1), use(0, 1), use(1, 2)],
    [use(0, 2), use(1), use(0, 1)],
  ]);
  const redirects = events.filter((e) => e.redirectedFrom);
  assert.equal(redirects.length, 2);
  assert(redirects.every((e) => e.to[1] === 0));
  assert.equal(a[0].round.stalwart, true);
  assert.deepEqual(
    events
      .filter((e) => e.skill === "Flare")
      .map((e) => e.to[1])
      .sort(),
    [0, 1, 2],
  );
});
test("when taunting fighter falls subsequent hits reach their intended living target", () => {
  const g = newMatch(),
    [a, b] = g.teams;
  applyCard(a, byId.taunt, 0);
  a[0].hp = 1;
  const events = play(g, [
    [use(1), use(0, 1), use(1, 2)],
    [use(0, 2), use(0, 2), use(0, 2)],
  ]);
  assert.equal(events.filter((e) => e.redirectedFrom).length, 1);
  assert(
    events.some((e) => e.from[0] === 1 && e.to[1] === 2 && e.kind === "damage"),
  );
});
test("Guard reduces a starting slash to 5 HP; Ambush evades one hit and marks its attacker", () => {
  const combat = (ta) => {
    const g = newMatch(),
      [a, b] = g.teams;
    if (ta) {
      applyCard(a, byId.twin, 0);
      applyCard(a, byId.shadowstep, 0);
    }
    b[1].hp = b[2].hp = 0;
    const events = play(g, [[use(1, 0), use(0, 0), use(1, 0)], [use(0, 0)]]);
    return { events, b };
  };
  assert.equal(combat(false).events.find((e) => e.from[0] === 1).delta, -5);
  const { events, b } = combat(true);
  assert.equal(events.find((e) => e.from[0] === 1).delta, -8);
  assert(b[0].mark);
});
test("Flame Storm spends Bless once on lowest HP ratio, consumes marks, marks only one survivor", () => {
  const g = newMatch(),
    [a, b] = g.teams;
  applyCard(a, byId.arms, 2, 0);
  applyCard(a, byId.cinder, 1);
  b[2].hp = 40;
  b[2].mark = true;
  const events = play(g, [
    [use(1, 0), use(1), use(0, 1)],
    [use(0, 0), use(0, 0), use(0, 0)],
  ]);
  const storm = events.filter((e) => e.skill === "Flare");
  assert.equal(storm.length, 3);
  assert.equal(storm[0].volley.length, 3);
  assert.equal(storm[0].to[1], 2);
  assert.equal(storm[0].delta, -25);
  assert(storm.slice(1).every((e) => Math.abs(e.delta) <= 10));
  assert.equal(a[1].bless, 0);
  assert.equal(b.filter((h) => h.mark).length, 1);
});
test("providers unlock payoffs only while living and usable, priest can choose either slot", () => {
  const t = newMatch().teams[0],
    ok = (id) => eligible(t, byId[id]).length > 0;
  for (const id of [
    "thread",
    "mirror",
    "pursuit",
    "exploit",
    "verdict",
    "holyverdict",
    "stalwart",
    "shadowstep",
  ])
    assert(!ok(id), id);
  for (const id of [
    "taunt",
    "twin",
    "quarry",
    "aegis",
    "arms",
    "aim",
    "prayer",
  ])
    assert(ok(id), id);
  applyCard(t, byId.arms, 2, 0);
  assert(ok("mirror"));
  assert(!ok("thread"));
  applyCard(t, byId.aegis, 1);
  assert(ok("thread"));
  applyCard(t, byId.quarry, 0);
  assert(ok("pursuit"));
  assert.deepEqual(slotsFor(t[2], byId.judgment), [0, 1]);
  applyCard(t, byId.judgment, 2, 0);
  assert.deepEqual(t[2].skills, ["Judgment", "Mend"]);
  assert(ok("verdict"));
  t[0].hp = 0;
  assert(!ok("verdict"));
  assert(!ok("holyverdict"));
});
test("Haste immediately heals 8 and gives 10 Speed next round", () => {
  const g = newMatch(),
    team = g.teams[0];
  applyCard(team, byId.hymn, 2, 0);
  team[0].hp = 45;
  const events = play(g, [
    [use(1, 0), use(0, 1), use(0, 0)],
    [use(1, 0), use(0, 1), use(1, 0)],
  ]);
  assert.equal(events.find((e) => e.skill === "Haste").delta, 8);
  startRound(g);
  assert.equal(team[0].bonusSpeed, 10);
});
test("Consecration on a Mage buffs one storm target and grants a second ally a separate blessing", () => {
  const g = newMatch(),
    a = g.teams[0];
  applyCard(a, byId.arms, 2, 0);
  applyCard(a, byId.doublebless, 2);
  a[0].hp = 52;
  const frames = [];
  startRound(g);
  resolve(
    g,
    [
      [use(1, 0), use(1), use(0, 1)],
      [use(1, 2), use(0, 1), use(1, 0)],
    ],
    (e) => {
      if (e.skill === "Bless")
        frames.push([a[1].ward?.left, a[1].bless, a[0].bless]);
    },
  );
  assert.deepEqual(frames, [[6, 12, 6]]);
});
test("Scorching Wake adds three to one hit and Focused Ignition only applies to the last enemy", () => {
  function hits(last) {
    const g = newMatch(),
      [a, b] = g.teams;
    applyCard(a, byId.afterburn, 1);
    applyCard(a, byId.concentrate, 1);
    if (last) b[1].hp = b[2].hp = 0;
    return play(g, [
      [use(1, 0), use(1), use(1, 1)],
      [use(0, 0), use(0, 0), use(0, 0)],
    ])
      .filter((e) => e.skill === "Flare")
      .map((e) => -e.delta);
  }
  assert.deepEqual(hits(false), [13, 8, 9]);
  assert.deepEqual(hits(true), [20]);
});

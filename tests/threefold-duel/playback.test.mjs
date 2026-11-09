import test from "node:test";
import assert from "node:assert/strict";
import {
  newMatch,
  startRound,
  resolve,
} from "../../games/threefold-duel/engine.mjs";
import { cards, skills } from "../../games/threefold-duel/catalog.mjs";
import {
  localizedCards,
  localizedSkills,
  zhLabels,
} from "../../games/threefold-duel/zh.mjs";
import { snapshot } from "../../games/threefold-duel/battle.mjs";
import { eventText } from "../../games/threefold-duel/events.mjs";

test("combat frames preserve targets, HP at impact, and actual capped healing", () => {
  const g = newMatch();
  g.teams[0][0].hp = 70;
  startRound(g);
  const initial = snapshot(g.teams),
    frames = [];
  const plans = [
    [
      { slot: 0, target: 1 },
      { slot: 1, target: 0 },
      { slot: 1, target: 0 },
    ],
    [
      { slot: 0, target: 1 },
      { slot: 1, target: 0 },
      { slot: 1, target: 0 },
    ],
  ];
  resolve(g, plans, (event) =>
    frames.push({ event, teams: snapshot(g.teams) }),
  );
  assert.equal(frames.length, 10);
  const mend = frames.find(
    (f) => f.event.skill === "Mend" && f.event.from[0] === 0,
  );
  assert.deepEqual(mend.event.to, [0, 0]);
  assert.equal(mend.event.delta, 2);
  assert.equal(mend.teams[0][0].hp, 72);
  assert.equal(initial[0][0].hp, 70);
  for (const { event, teams } of frames.filter(
    (f) => f.event.kind === "damage",
  )) {
    const idx = frames.findIndex((f) => f.event === event),
      prev = idx === 0 ? initial : frames[idx - 1].teams;
    const [s, i] = event.to;
    assert.equal(teams[s][i].hp - prev[s][i].hp, event.delta);
  }
  assert.deepEqual(snapshot(g.teams), frames.at(-1).teams);
});
test("Chinese localization covers the full catalog and engine events", () => {
  assert.deepEqual(
    Object.keys(localizedCards).sort(),
    cards.map((c) => c.id).sort(),
  );
  assert.deepEqual(
    Object.keys(localizedSkills).sort(),
    Object.keys(skills).sort(),
  );
  const t = (x) => localizedSkills[x]?.[0] ?? zhLabels[x] ?? x;
  const msg = eventText(
    {
      kind: "damage",
      from: [1, 0],
      to: [0, 2],
      skill: "Slash",
      delta: -5,
      absorbed: 2,
      defeated: true,
    },
    t,
    true,
  );
  assert.match(msg, /玩家2的战士.*斩击.*玩家1的牧师.*−5.*2.*已倒下/);
});

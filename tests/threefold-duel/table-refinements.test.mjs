import test from "node:test";
import assert from "node:assert/strict";
import {
  newMatch,
  applyCard,
  previewAction,
  offer,
  eligible,
} from "../../games/threefold-duel/engine.mjs";
import { byId } from "../../games/threefold-duel/catalog.mjs";
test("previews resolve against public stats and preserve one-use marks and buffs", () => {
  const g = newMatch();
  g.teams[0][1].bless = 12;
  g.teams[1][2].hp = 32;
  g.teams[1][2].mark = true;
  const before = structuredClone(g);
  const p = previewAction(g, 0, 1, 1, 0);
  assert.deepEqual(
    p.events.map((e) => e.delta),
    [-25, -10, -8],
  );
  assert.deepEqual(g, before);
  applyCard(g.teams[0], byId.mercy, 2);
  g.teams[0][0].hp = 70;
  assert.equal(previewAction(g, 0, 2, 1, 0).events[0].delta, 2);
});
test("offers and cached offers only have eligible living recipients in every surviving-party combination", () => {
  for (let mask = 1; mask < 8; mask++) {
    const [team, foes] = newMatch().teams;
    team.forEach((h, i) => {
      if (!(mask & (1 << i))) h.hp = 0;
    });
    foes[0].hp = foes[1].hp = 0;
    for (let draw = 0; draw < 50; draw++) {
      const choices = offer(team, Math.random, foes, [
        byId.afterburn,
        byId.mercy,
        byId.taunt,
      ]);
      assert.equal(choices.length, 3);
      for (const c of choices) {
        assert.notEqual(c.id, "afterburn");
        const recipients = eligible(team, c, foes);
        assert(recipients.length);
        assert(
          recipients.every(
            (i) =>
              team[i].hp && (c.group === "Any" || c.group === team[i].name),
          ),
        );
      }
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  createRun,
  available,
  vote,
  pickCard,
  continueRound,
  camp,
  buy,
  leaveShop,
  potion,
  allowedEvent,
  campHeal,
  price,
  restoreRun,
  SUPPLIES,
  supplyTargets,
  useSupply,
} from "../../games/threefold-ascension/campaign.mjs";
import {
  unit,
  setPlan,
  ready,
  targetsFor,
  preview,
  beginBattle,
} from "../../games/threefold-ascension/combat.mjs";
import { CARDS } from "../../games/threefold-ascension/cards.mjs";
import {
  BY_CARD,
  living,
  lowest,
  grant,
  recipients,
  skillsFor,
  slots,
  SKILL,
  draw,
} from "../../games/threefold-ascension/party.mjs";
import {
  ACTS,
  ENEMIES,
  EVENTS,
  FORMATIONS,
  MOVES,
  RELICS,
} from "../../games/threefold-ascension/world.mjs";

function start(seed = 42) {
  const g = createRun(seed);
  for (const p of g.players.keys()) assert.ok(pickCard(g, p, "skip"));
  return g;
}
function enter(g, n) {
  if (g.players.length === 2) assert.ok(vote(g, 1, n.id));
  assert.ok(vote(g, 0, n.id));
}
function lock(g) {
  for (const p of g.players.keys())
    if (g.phase === "combat" && !g.battle.ready[p]) assert.ok(ready(g, p));
}
function draft(g, p) {
  const cards = g.reward.offers[p].map((id) => BY_CARD[id]);
  const score = (c) =>
    (c.mods?.physical || 0) +
    (c.mods?.magic || 0) * 1.7 +
    (c.mods?.areaPower || 0) * 1.7 +
    (c.mods?.recovery || 0) +
    (c.mods?.singlePower || 0) +
    (c.mods?.maxHp || 0) * 0.45 +
    (c.mods?.healPower || 0) +
    (!c.skill ? 1 : 0) +
    (c.skill === "Judgment" ? 6 : 0);
  const c = [...cards]
    .sort((a, b) => score(b) - score(a))
    .find((c) => recipients(g, p, c).length);
  if (!c) return pickCard(g, p, "skip");
  const h = recipients(g, p, c)[0];
  const options = slots(h, c);
  const i =
    c.skill === "Judgment" && h.skills.includes("Smite")
      ? h.skills.indexOf("Smite")
      : options[options.length - 1];
  return pickCard(g, p, c.id, h.id, i);
}
function plan(g) {
  for (const [p, player] of g.players.entries()) {
    const patient = g.heroes.find((h) => !h.hp) || lowest(g.heroes);
    if (player.potions > 0 && patient.hp / patient.max < 0.28)
      potion(g, p, patient.id);
  }
  const foes = living(g.battle.enemies);
  const left = new Map(foes.map((e) => [e, e.hp + (e.r.ward || 0)]));
  const triage = new Map(living(g.heroes).map((h) => [h, h.hp]));
  for (const h of living(g.heroes).sort((a, b) => b.speed - a.speed)) {
    const options = skillsFor(h);
    const patient = [...triage.keys()].sort(
      (a, b) => triage.get(a) / a.max - triage.get(b) / b.max,
    )[0];
    const heals = options.find((s) => ["Mend", "Haste"].includes(s));
    if (heals && triage.get(patient) / patient.max < 0.73) {
      assert.ok(setPlan(g, h.owner, h.id, heals, patient.id));
      triage.set(
        patient,
        triage.get(patient) + preview(g, h, heals, patient).recovery,
      );
      continue;
    }
    let target =
      [...foes]
        .sort((a, b) => left.get(a) - left.get(b))
        .find((e) => left.get(e) > 0) || foes[0];
    const active = options.filter((s) =>
      ["enemy", "all"].includes(SKILL[s][0]),
    );
    if (active.length) {
      const expected = (s) =>
        SKILL[s][0] === "all"
          ? foes.reduce(
              (sum, e) =>
                sum +
                Math.min(Math.max(0, left.get(e)), preview(g, h, s, e).damage),
              0,
            )
          : Math.min(
              Math.max(0, left.get(target)),
              preview(g, h, s, target).damage,
            );
      const skill = active.sort((a, b) => expected(b) - expected(a))[0];
      assert.ok(setPlan(g, h.owner, h.id, skill, target.id));
      for (const e of SKILL[skill][0] === "all" ? foes : [target])
        left.set(e, left.get(e) - preview(g, h, skill, e).damage);
    } else {
      const skill = options[0];
      target =
        targetsFor(g, h, skill).find((x) => x === patient) ||
        targetsFor(g, h, skill)[0];
      assert.ok(setPlan(g, h.owner, h.id, skill, target.id));
    }
  }
  lock(g);
}
function traverse(seed, restore = false, mode = "coop") {
  let g = createRun(seed, mode),
    steps = 0;
  const kinds = new Set(),
    fights = [];
  while (!["victory", "defeat"].includes(g.phase) && steps++ < 1100) {
    if (restore) g = restoreRun(JSON.parse(JSON.stringify(g)));
    if (g.phase === "draft") {
      for (const p of g.players.keys())
        if (g.phase === "draft" && !g.done[p]) assert.ok(draft(g, p));
    } else if (g.phase === "map") {
      const options = available(g),
        worst = lowest(g.heroes).hp / lowest(g.heroes).max;
      const order =
        seed % 3 === 0
          ? ["treasure", "elite", "rest", "shop", "battle", "event", "boss"]
          : worst < 0.6
            ? ["rest", "treasure", "shop", "event", "battle", "elite", "boss"]
            : ["treasure", "event", "shop", "elite", "rest", "battle", "boss"];
      const n = [...options].sort(
        (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind),
      )[0];
      kinds.add(n.kind);
      enter(g, n);
    } else if (g.phase === "combat") {
      assert.ok(g.battle.round < 50, "fight never ends");
      plan(g);
    } else if (g.phase === "round") {
      if (g.battle.outcome === "victory") fights.push(g.battle.round);
      assert.ok(continueRound(g));
    } else if (g.phase === "relic") {
      const pref = [
        "ember",
        "standards",
        "flask",
        "crown",
        "bell",
        "hearth",
        "compass",
      ];
      const id =
        pref.find((k) => g.reward.offers.includes(k)) || g.reward.offers[0];
      assert.ok(vote(g, 0, id));
      if (g.players.length === 2) assert.ok(vote(g, 1, id));
    } else if (g.phase === "rest") {
      for (const p of g.players.keys()) {
        const party = g.heroes.filter((h) => h.owner === p),
          mage = party[1];
        if (party.some((h) => h.hp < h.max * 0.8) || (mage.training || 0) >= 3)
          assert.ok(camp(g, p, "heal"));
        else assert.ok(camp(g, p, "train", mage.id, "training"));
      }
    } else if (g.phase === "shop") {
      for (const p of g.players.keys()) {
        if (g.players[p].gold >= price(g, p, "relic") && !g.shop.sold)
          assert.ok(buy(g, p, "relic"));
        if (g.players[p].gold >= price(g, p, "potion"))
          assert.ok(buy(g, p, "potion"));
        if (g.players[p].gold >= price(g, p, "provisions"))
          assert.ok(buy(g, p, "provisions"));
        assert.ok(leaveShop(g, p));
      }
    } else if (g.phase === "event") {
      const opt = EVENTS[g.node.event].options,
        idx = opt.findIndex((_, i) => allowedEvent(g, i));
      assert.ok(vote(g, 0, idx));
      if (g.players.length === 2) assert.ok(vote(g, 1, idx));
    } else assert.fail(g.phase);
  }
  assert.ok(steps < 1100);
  return { g, kinds, fights };
}

test("three acts generate connected ten-floor maps, consensus is required, and starter picks do not count as rooms", () => {
  for (let seed = 0; seed < 45; seed++) {
    const g = start(seed);
    assert.equal(g.phase, "map");
    assert.equal(g.stats.rooms, 0);
    for (const [i, row] of g.map.entries()) {
      for (const n of row) {
        if (i) assert.ok(g.map[i - 1].some((prev) => prev.next.includes(n.id)));
        if (i < 9) assert.ok(n.next.length);
      }
    }
    assert.equal(g.map[8][0].kind, "rest");
    assert.equal(g.map[9][0].kind, "boss");
    assert.ok(vote(g, 0, g.map[0][0].id));
    assert.ok(vote(g, 1, g.map[0][1].id));
    assert.equal(g.phase, "map");
    assert.equal(vote(g, 0, g.map[9][0].id), false);
    assert.ok(vote(g, 1, g.map[0][0].id));
    assert.equal(g.phase, "combat");
  }
});
test("a ready seat can unlock, partner actions and enemy intent remain independent, and Guard protects across seats", () => {
  const g = start();
  enter(g, g.map[0][0]);
  const b = g.battle,
    first = b.enemies[0];
  b.intents = [{ from: first.id, id: "nick", targets: ["h1"], speed: 25 }];
  const announced = JSON.stringify(b.intents);
  assert.ok(setPlan(g, 1, "h3", "Guard", "h1"));
  assert.ok(ready(g, 1));
  assert.equal(g.phase, "combat");
  assert.equal(setPlan(g, 1, "h3", "Slash", first.id), false);
  assert.ok(ready(g, 1));
  assert.ok(setPlan(g, 0, "h1", "Flare", first.id));
  assert.equal(JSON.stringify(b.intents), announced);
  const previewHit = preview(g, g.heroes[3], "Guard", g.heroes[1])
    .guardedHits[0][1];
  lock(g);
  const hit = b.events.find((e) => e.skill === "nick");
  assert.equal(hit.to, "h1");
  assert.equal(hit.n, previewHit);
  assert.equal(pickCard(g, 0, "skip"), false);
});
test("Taunt redirects one hit and leaves area targeting intact", () => {
  const g = start();
  enter(g, g.map[0][0]);
  const b = g.battle,
    en = b.enemies[0];
  en.hp = en.max = 500;
  const f = g.heroes[3];
  f.skills[1] = "Taunt";
  b.intents = [
    { from: en.id, id: "nick", targets: ["h1"], speed: 30 },
    {
      from: en.id,
      id: "broadside",
      targets: g.heroes.map((h) => h.id),
      speed: 29,
    },
  ];
  assert.ok(setPlan(g, 1, f.id, "Taunt", f.id));
  lock(g);
  assert.equal(
    b.events.find((e) => e.skill === "nick" && e.k === "hit").to,
    f.id,
  );
  assert.equal(
    b.events.filter((e) => e.skill === "broadside" && e.k === "hit").length,
    6,
  );
});
test("heal allowances last across waves, party-wide defeat ends a run, and a won room revives before drafting", () => {
  const g = start();
  g.node = g.map[0][0];
  beginBattle(g, "elite", ["hound"], [["bowman"]]);
  g.heroes[0].hp = 0;
  g.heroes[4].hp = 7;
  g.heroes[2].b.charges = 1;
  assert.ok(setPlan(g, 0, "h2", "Mend", "h4"));
  g.battle.enemies[0].hp = 1;
  for (const h of living(g.heroes).filter((x) => x.id !== "h2")) h.speed = 1;
  lock(g);
  assert.equal(g.battle.outcome, "wave");
  assert.ok(continueRound(g));
  assert.equal(g.phase, "combat");
  assert.equal(g.battle.wave, 2);
  assert.equal(g.heroes[2].b.charges, 0);
  assert.equal(setPlan(g, 0, "h2", "Mend", "h4"), false);
  assert.equal(g.heroes[0].hp, 0);
  g.battle.enemies.at(-1).hp = 1;
  lock(g);
  assert.equal(g.battle.outcome, "victory");
  assert.ok(continueRound(g));
  assert.equal(g.heroes[0].hp, Math.ceil(g.heroes[0].max * 0.2));
  assert.equal(g.phase, "draft");
  assert.ok(pickCard(g, 0, "skip"));
  assert.ok(pickCard(g, 1, "skip"));
  assert.equal(g.phase, "relic");
  const relic = g.reward.offers[0];
  assert.ok(vote(g, 0, relic));
  assert.ok(vote(g, 1, relic));
  assert.equal(g.relics.length, 1);
  beginBattle(g, "boss", ["sovereign"]);
  for (const h of g.heroes) h.hp = 1;
  g.battle.intents = [
    {
      from: g.battle.enemies[0].id,
      id: "edict",
      targets: g.heroes.map((h) => h.id),
      speed: 100,
    },
  ];
  g.relics = [];
  lock(g);
  assert.ok(continueRound(g));
  assert.equal(g.phase, "defeat");
});
test("both priests can help a partner, shared blessings refresh, and a draught revives and reopens the recipient’s plan", () => {
  const g = start();
  enter(g, g.map[0][0]);
  const b = g.battle;
  b.enemies[0].hp = b.enemies[0].max = 400;
  b.intents = [];
  const priest = g.heroes[2],
    t = g.heroes[4];
  priest.skills[0] = "Bless";
  priest.mods.partnerShield = 4;
  t.skills[0] = "Aegis";
  assert.ok(setPlan(g, 0, priest.id, "Bless", t.id));
  assert.equal(preview(g, priest, "Bless", t).blessing, 16);
  assert.ok(setPlan(g, 1, t.id, "Aegis", t.id));
  lock(g);
  assert.equal(t.b.bless, 16);
  assert.ok(continueRound(g));
  for (const h of g.heroes.filter((h) => h.owner === 1)) h.hp = 0;
  delete b.plans[t.id];
  b.ready[1] = true;
  assert.ok(potion(g, 0, t.id));
  assert.equal(b.ready[1], false);
  assert.ok(t.hp > 0);
  assert.ok(b.plans[t.id]);
});
test("each encounter can award one shared supply in addition to both drafts, and saved rewards never reroll", () => {
  for (const kind of ["battle", "elite", "boss"]) {
    const results = new Set();
    for (let seed = 0; seed < 60; seed++) {
      const g = start(seed);
      g.node = g.map[0][0];
      g.node.kind = kind;
      beginBattle(g, kind, ["hound"]);
      g.battle.enemies[0].hp = 1;
      lock(g);
      assert.equal(g.battle.outcome, "victory");
      assert.ok(continueRound(g));
      assert.deepEqual(
        g.reward.offers.map((cards) => cards.length),
        [3, 3],
      );
      const supply = g.reward.supply;
      results.add(Boolean(supply));
      if (supply) assert.ok(Object.hasOwn(SUPPLIES, supply));
      assert.deepEqual(g.supplies, supply ? { [supply]: 1 } : {});
      const saved = JSON.stringify(g);
      const resumed = restoreRun(JSON.parse(saved));
      assert.equal(continueRound(resumed), false);
      assert.equal(JSON.stringify(resumed), saved);
    }
    assert.deepEqual(results, new Set([false, true]));
  }
});

test("earlier saves keep their dealt cards and either player can use the last shared consumable exactly once", () => {
  const legacy = createRun(37);
  const offers = structuredClone(legacy.reward.offers);
  delete legacy.supplies;
  const g = restoreRun(JSON.parse(JSON.stringify(legacy)));
  assert.deepEqual(g.supplies, {});
  assert.deepEqual(g.reward.offers, offers);
  g.supplies = { honey: 1, bread: 1, berries: 1 };
  const [fighter, mage, priest] = g.heroes;
  assert.deepEqual(supplyTargets(g, 0, "honey"), []);
  assert.equal(useSupply(g, 1, "honey", fighter.id), false);
  assert.equal(g.supplies.honey, 1);
  fighter.hp -= 11;
  assert.deepEqual(supplyTargets(g, 1, "honey"), [
    { id: fighter.id, amount: 11 },
  ]);
  assert.ok(useSupply(g, 1, "honey", fighter.id));
  assert.equal(useSupply(g, 0, "honey", fighter.id), false);
  assert.equal(fighter.hp, fighter.max);
  fighter.hp -= 3;
  mage.hp -= 12;
  priest.hp = 0;
  assert.deepEqual(supplyTargets(g, 1, "bread"), [
    { id: "party0", amount: 11 },
  ]);
  assert.ok(useSupply(g, 1, "bread", "party0"));
  assert.deepEqual(
    [fighter.hp, mage.hp, priest.hp],
    [fighter.max, mage.max - 4, 0],
  );
  assert.ok(useSupply(g, 0, "berries", mage.id));
  assert.equal(mage.hp, mage.max);
  assert.deepEqual(g.supplies, {});
});

test("combat supplies respect ready seats, repair a restored hero's plan, and preserve stronger barriers", () => {
  const g = start();
  g.supplies = { bandage: 1, tea: 1, tonic: 2 };
  const fighter = g.heroes[0],
    priest = g.heroes[5];
  fighter.hp = 0;
  priest.skills = ["Mend", "Haste"];
  beginBattle(g, "battle", ["hound"]);
  const b = g.battle;
  b.enemies[0].hp = b.enemies[0].max = 500;
  assert.ok(useSupply(g, 1, "bandage", fighter.id));
  assert.equal(fighter.hp, Math.ceil(fighter.max * 0.3));
  assert.ok(b.plans[fighter.id]);
  fighter.r.ward = 18;
  assert.equal(useSupply(g, 1, "tonic", fighter.id), false);
  fighter.r.ward = 3;
  assert.ok(useSupply(g, 1, "tonic", fighter.id));
  assert.equal(fighter.r.ward, 14);
  assert.equal(useSupply(g, 0, "tonic", fighter.id), false);
  priest.b.charges = 0;
  assert.ok(setPlan(g, 1, priest.id, "Hold", priest.id));
  assert.ok(ready(g, 1));
  assert.equal(useSupply(g, 1, "tea", priest.id), false);
  assert.ok(useSupply(g, 0, "tea", priest.id));
  assert.equal(priest.b.charges, 1);
  assert.ok(skillsFor(priest).includes(b.plans[priest.id].skill));
  assert.equal(b.ready[1], false);
  lock(g);
  assert.deepEqual(supplyTargets(g, 0, "tonic"), []);
  assert.ok(continueRound(g));
  assert.equal(fighter.r.ward, 0);
});

test("the catalog has five distinct bilingual pools, enforces capabilities, and samples distinct usable offers", () => {
  assert.equal(CARDS.length, 120);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 120);
  for (const group of ["Fighter", "Mage", "Priest", "General", "Cooperative"])
    assert.equal(CARDS.filter((c) => c.group === group).length, 24);
  for (const c of CARDS) assert.ok(c.en && c.zh && c.desc && c.cn);
  const g = start(),
    f = g.heroes[0];
  assert.ok(!recipients(g, 0, BY_CARD["stalwart"]).length);
  assert.ok(grant(g, f, BY_CARD["challenging-roar"], 1));
  assert.ok(recipients(g, 0, BY_CARD["stalwart"]).includes(f));
  assert.equal(grant(g, f, BY_CARD["guardian-stance"], 0), false);
  assert.ok(grant(g, f, BY_CARD["guardian-stance"], 1));
  assert.ok(!recipients(g, 0, BY_CARD["stalwart"]).length);
  f.hp = 0;
  for (let i = 0; i < 100; i++) {
    const list = draw(g, 0);
    assert.equal(new Set(list).size, 3);
    for (const id of list)
      assert.ok(
        recipients(g, 0, BY_CARD[id]).every((h) => h.hp > 0 && h.owner === 0),
      );
  }
  assert.equal(Object.keys(RELICS).length, 13);
  assert.equal(ACTS.length, 3);
  for (const [i, d] of FORMATIONS.entries()) {
    assert.ok(d.boss.includes(ACTS[i].boss));
    for (const id of [
      ...d.boss,
      ...d.normal.flat(),
      ...d.elite.flat(),
      ...d.wave,
    ])
      assert.ok(ENEMIES[id]);
  }
  for (const en of Object.values(ENEMIES))
    for (const id of [
      ...en.pattern.flat(),
      ...(en.phase?.pattern.flat() || []),
    ])
      assert.ok(MOVES[id]);
});
test("shop spending, rest training and relic votes apply once", () => {
  const g = start();
  g.map[0][0].kind = "shop";
  enter(g, g.map[0][0]);
  g.players[0].gold = 100;
  g.players[1].gold = 100;
  assert.ok(buy(g, 0, "relic"));
  assert.equal(buy(g, 1, "relic"), false);
  const before = g.players[0].gold;
  assert.ok(buy(g, 0, "potion"));
  assert.equal(buy(g, 0, "potion"), false);
  assert.equal(g.players[0].gold, before - price(g, 0, "potion"));
  assert.ok(leaveShop(g, 0));
  assert.ok(leaveShop(g, 1));
  const n = available(g)[0];
  n.kind = "rest";
  enter(g, n);
  g.heroes[0].hp = 7;
  const expected = campHeal(g, g.heroes[0]);
  assert.ok(camp(g, 0, "heal"));
  assert.equal(g.heroes[0].hp, 7 + expected);
  assert.equal(camp(g, 0, "heal"), false);
  assert.ok(camp(g, 1, "train", "h4", "training"));
  assert.equal(g.heroes[4].training, 1);
  assert.equal(g.stats.rooms, 2);
});
test("seeded expeditions play through all three acts, and save/resume preserves outcomes", () => {
  const outcomes = [],
    visited = new Set();
  for (let i = 1; i <= 24; i++) {
    const { g, kinds } = traverse(i);
    for (const k of kinds) visited.add(k);
    assert.ok(
      g.heroes.every(
        (h) => Number.isFinite(h.hp) && h.hp >= 0 && h.hp <= h.max,
      ),
    );
    if (g.phase === "victory") {
      assert.equal(g.stats.bosses, 3);
      assert.equal(g.stats.rooms, 30);
    }
    outcomes.push(g.phase);
    if (i === 3) assert.deepEqual(traverse(i, true).g, g);
  }
  assert.ok(outcomes.includes("victory"));
  assert.equal(
    visited.size,
    Object.keys({
      battle: 1,
      shop: 1,
      elite: 1,
      treasure: 1,
      rest: 1,
      event: 1,
      boss: 1,
    }).length,
  );
});

test("solo uses one party, filters partner rewards, and can clear all three guardians", () => {
  const g = createRun(12, "solo");
  assert.deepEqual(g.heroes.map(h => h.name), ["Fighter", "Mage", "Priest"]);
  assert.equal(g.reward.offers.length, 1);
  for (const c of CARDS.filter(c => c.group === "Cooperative" || ["mirror-courier", "mercy-writ"].includes(c.id)))
    assert.deepEqual(recipients(g, 0, c), []);
  const runs = Array.from({length: 24}, (_, i) => traverse(i + 1, false, "solo").g);
  const wins = runs.filter(g => g.phase === "victory");
  assert.ok(wins.length > 0);
  assert.ok(wins.every(g => g.stats.bosses === 3 && g.stats.rooms === 30));
  assert.deepEqual(traverse(3, true, "solo").g, runs[2]);
});

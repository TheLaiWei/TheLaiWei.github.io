import { EVENTS, FORMATIONS, RELICS } from "./world.mjs";
import {
  BY_CARD,
  makeHeroes,
  mod,
  living,
  heal,
  hasRelic,
  random,
  shuffled,
  sample,
  draw,
  grant,
  strengthen,
  recipients,
  cardActive,
} from "./party.mjs";
import { beginBattle, nextCombatRound } from "./combat.mjs";

export const VERSION = 1;
export const ROOM = {
  battle: ["⚔", "Battle", "战斗"],
  elite: ["✷", "Elite", "精英"],
  event: ["?", "Encounter", "奇遇"],
  shop: ["⚖", "Merchant", "商人"],
  rest: ["♨", "Camp", "营地"],
  treasure: ["◇", "Vault", "宝库"],
  boss: ["♛", "Boss", "首领"],
};
const REPEATS = ["stoneheart", "whetstone", "coin"];
const rows = [
  ["battle", "battle"],
  ["event", "battle", "battle"],
  ["battle", "elite", "shop"],
  ["rest", "battle", "event"],
  ["elite", "battle", "treasure"],
  ["battle", "event", "battle"],
  ["shop", "elite", "rest"],
  ["battle", "elite"],
  ["rest"],
  ["boss"],
];
export function makeMap(g) {
  const data = FORMATIONS[g.act];
  const map = rows.map((row, r) =>
    shuffled(g, row).map((kind, lane, types) => {
      const id = "a" + g.act + "r" + r + "n" + lane;
      const x =
        types.length === 1
          ? 0.5
          : types.length === 2
            ? [0.28, 0.72][lane]
            : [0.13, 0.5, 0.87][lane];
      const node = { id, row: r, lane, x, kind, next: [] };
      if (kind === "event")
        node.event = sample(
          g,
          EVENTS.map((e, i) => (e.act === g.act ? i : -1)).filter(
            (i) => i >= 0,
          ),
        );
      if (kind === "battle" || kind === "elite") {
        const pool =
          kind === "elite"
            ? data.elite
            : g.act === 0 && r === 0
              ? data.normal.slice(0, 2)
              : data.normal;
        node.formation = [...sample(g, pool)];
        node.waves =
          kind === "battle" && r === 5 && random(g) < 0.38
            ? [[...data.wave]]
            : [];
      }
      return node;
    }),
  );
  if (map[0][0].formation.join() === map[0][1].formation.join()) {
    const pool = (g.act === 0 ? data.normal.slice(0, 2) : data.normal).filter(
      (x) => x.join() !== map[0][0].formation.join(),
    );
    map[0][1].formation = [...sample(g, pool)];
  }
  for (let i = 0; i < map.length - 1; i++) {
    const next = map[i + 1];
    for (const n of map[i])
      n.next = next
        .filter((v) => Math.abs(n.x - v.x) <= 0.44 || next.length === 1)
        .map((v) => v.id);
  }
  return map;
}
function resetVotes(g) {
  g.votes = [null, null];
  g.done = [false, false];
}
export function createRun(seed = Math.floor(Math.random() * 4294967296)) {
  const g = {
    v: VERSION,
    seed: seed >>> 0,
    rng: seed >>> 0,
    act: 0,
    node: null,
    map: null,
    path: [],
    heroes: makeHeroes(),
    players: [
      { gold: 18, potions: 1 },
      { gold: 18, potions: 1 },
    ],
    relics: [],
    bellAct: -1,
    phase: "draft",
    stats: { rounds: 0, wins: 0, elites: 0, bosses: 0, rooms: 0 },
    reward: null,
    battle: null,
  };
  g.map = makeMap(g);
  beginDraft(g, "starter");
  return g;
}
function beginDraft(g, kind) {
  resetVotes(g);
  g.phase = "draft";
  g.reward = { kind, offers: [draw(g, 0), draw(g, 1)], picks: [null, null] };
}
export const available = (g) =>
  !g.node ? g.map[0] : g.map.flat().filter((n) => g.node.next.includes(n.id));
function mapReady(g) {
  g.phase = "map";
  resetVotes(g);
  g.reward = null;
  g.shop = null;
}
function finishRoom(g) {
  g.stats.rooms++;
  if (g.node.kind === "boss") {
    if (g.act === 2) {
      g.phase = "victory";
      g.reward = null;
      return;
    }
    for (const h of g.heroes) heal(h, Math.round(h.max * 0.35));
    g.act++;
    g.node = null;
    g.map = makeMap(g);
  }
  mapReady(g);
}
function finishDraft(g, kind) {
  if (kind === "starter") return mapReady(g);
  if (kind === "elite" || kind === "boss") return beginRelic(g);
  finishRoom(g);
}
function refreshOffers(g, owner, offers, count, purchased = []) {
  const valid = offers.filter(
    (id) => purchased.includes(id) || recipients(g, owner, BY_CARD[id]).length,
  );
  if (valid.length === offers.length) return offers;
  const extra = draw(g, owner, count + valid.length).filter(
    (id) => !valid.includes(id),
  );
  return valid.concat(extra).slice(0, count);
}
export function pickCard(g, p, id, hero, slot) {
  if (g.phase !== "draft" || ![0, 1].includes(p) || g.done[p]) return false;
  const rw = g.reward;
  if (id === "skip") {
    if (rw.kind !== "starter") g.players[p].gold += 5;
  } else {
    const h = g.heroes.find((a) => a.id === hero && a.owner === p),
      c = BY_CARD[id];
    if (!rw.offers[p].includes(id) || !grant(g, h, c, slot)) return false;
  }
  g.done[p] = true;
  rw.picks[p] = { id, hero, slot };
  if (g.done.every(Boolean)) finishDraft(g, rw.kind);
  else {
    const other = 1 - p;
    rw.offers[other] = refreshOffers(g, other, rw.offers[other], 3);
  }
  return true;
}
function relicPool(g) {
  const fresh = shuffled(
    g,
    Object.keys(RELICS).filter(
      (id) => !REPEATS.includes(id) && !hasRelic(g, id),
    ),
  );
  return fresh.slice(0, 3).concat(shuffled(g, REPEATS)).slice(0, 3);
}
function beginRelic(g) {
  g.phase = "relic";
  resetVotes(g);
  g.reward = { offers: relicPool(g) };
}
function takeRelic(g, id) {
  g.relics.push(id);
  if (id === "stoneheart")
    for (const h of g.heroes) {
      h.max += 3;
      heal(h, 3);
    }
}
function enter(g, n) {
  g.node = n;
  g.path.push(n.id);
  resetVotes(g);
  if (["battle", "elite", "boss"].includes(n.kind)) {
    beginBattle(g, n.kind, n.formation, n.waves);
    return;
  }
  if (n.kind === "treasure") {
    beginRelic(g);
    return;
  }
  if (n.kind === "shop") {
    g.shop = {
      stock: [draw(g, 0, 2), draw(g, 1, 2)],
      relic: relicPool(g)[0],
      sold: false,
      bought: [[], []],
    };
    g.phase = "shop";
    return;
  }
  g.phase = n.kind;
}
export function allowedEvent(g, i) {
  const e = EVENTS[g.node.event]?.options[i];
  if (!e) return false;
  if (["payHeal", "tradeGoldRelic", "potion"].includes(e.op))
    return g.players.every((p) => p.gold >= (e.cost || 0));
  return true;
}
function applyEvent(g, i) {
  const o = EVENTS[g.node.event].options[i],
    people = g.players;
  if (o.op === "fight") {
    beginBattle(g, "battle", null, []);
    return;
  }
  if (["payHeal", "tradeGoldRelic", "potion"].includes(o.op))
    for (const p of people) p.gold -= o.cost || 0;
  if (o.op === "tradeGoldRelic") {
    beginRelic(g);
    return;
  }
  if (o.op === "payHeal") for (const h of g.heroes) heal(h, o.amount);
  if (o.op === "potion") for (const p of people) p.potions += 1;
  if (o.op === "gold" || o.op === "tradeHpGold")
    for (const p of people) p.gold += o.amount;
  if (o.op === "tradeHpGold")
    for (const h of living(g.heroes).filter((x) => x.name === "Fighter"))
      h.hp = Math.max(1, h.hp - o.cost);
  finishRoom(g);
}
export function vote(g, p, value) {
  if (![0, 1].includes(p)) return false;
  const phase = g.phase;
  if (phase === "map" && !available(g).some((n) => n.id === value))
    return false;
  if (phase === "relic" && !g.reward.offers.includes(value)) return false;
  if (
    phase === "event" &&
    (!Number.isInteger(value) || !allowedEvent(g, value))
  )
    return false;
  if (!["map", "relic", "event"].includes(phase)) return false;
  g.votes[p] = value;
  if (g.votes[0] !== g.votes[1]) return true;
  if (phase === "map")
    enter(
      g,
      available(g).find((n) => n.id === value),
    );
  else if (phase === "event") applyEvent(g, value);
  else {
    takeRelic(g, value);
    finishRoom(g);
  }
  return true;
}
export function continueRound(g) {
  if (g.phase !== "round") return false;
  const b = g.battle;
  if (nextCombatRound(g)) return true;
  if (b.outcome === "defeat") {
    g.phase = "defeat";
    return true;
  }
  if (b.outcome !== "victory") return false;
  const kind = b.kind;
  g.stats.wins++;
  if (kind === "elite") g.stats.elites++;
  if (kind === "boss") g.stats.bosses++;
  for (const h of g.heroes) {
    if (!h.hp) h.hp = Math.ceil(h.max * 0.2);
    heal(h, mod(h, "recovery"));
    delete h.r;
    delete h.b;
  }
  for (const [p, player] of g.players.entries()) {
    const base =
      (kind === "boss" ? 22 : kind === "elite" ? 16 : 10) + g.act * 2;
    player.gold +=
      base +
      (kind === "elite" && hasRelic(g, "treasury") ? 8 : 0) +
      (hasRelic(g, "mint") ? 3 : 0) +
      hasRelic(g, "coin") +
      g.heroes
        .filter((h) => h.owner === p)
        .reduce((n, h) => n + mod(h, "victoryGold"), 0);
  }
  g.battle = null;
  beginDraft(g, kind);
  return true;
}
export function campHeal(g, h) {
  const rate =
    0.32 + (hasRelic(g, "hearth") ? 0.1 : 0) - (hasRelic(g, "crown") ? 0.1 : 0);
  return Math.min(h.max - h.hp, Math.round(h.max * rate) + mod(h, "restBonus"));
}
export function trainingChoices(g, p) {
  const out = [];
  for (const h of g.heroes.filter((a) => a.owner === p)) {
    for (const [id, count] of Object.entries(h.cards)) {
      const c = BY_CARD[id];
      if (c && !c.skill && count < c.cap && cardActive(g, h, c))
        out.push({ hero: h.id, id });
    }
    if ((h.training || 0) < 3) out.push({ hero: h.id, id: "training" });
  }
  return out;
}
export function camp(g, p, action, hero, id) {
  if (g.phase !== "rest" || ![0, 1].includes(p) || g.done[p]) return false;
  if (action === "heal")
    for (const h of g.heroes.filter((a) => a.owner === p))
      heal(h, campHeal(g, h));
  else if (action === "train") {
    const h = g.heroes.find((a) => a.owner === p && a.id === hero);
    if (
      !h ||
      !trainingChoices(g, p).some((x) => x.hero === hero && x.id === id)
    )
      return false;
    if (id === "training") {
      h.training = (h.training || 0) + 1;
      h.mods.physical = (h.mods.physical || 0) + 2;
      h.mods.magic = (h.mods.magic || 0) + 2;
    } else if (!strengthen(g, h, id)) return false;
  } else return false;
  g.done[p] = true;
  if (g.done.every(Boolean)) finishRoom(g);
  return true;
}
export function price(g, p, item) {
  const base =
    item === "potion"
      ? 12
      : item === "relic"
        ? 32
        : item === "provisions"
          ? 14
          : 15 + (BY_CARD[item]?.rarity || 0) * 5;
  return Math.max(
    1,
    base -
      Math.max(
        0,
        ...g.heroes
          .filter((h) => h.owner === p)
          .map((h) => mod(h, "shopDiscount")),
      ),
  );
}
export function buy(g, p, item, hero, slot) {
  if (
    g.phase !== "shop" ||
    ![0, 1].includes(p) ||
    g.done[p] ||
    g.shop.bought[p].includes(item)
  )
    return false;
  const cost = price(g, p, item),
    player = g.players[p];
  if (player.gold < cost) return false;
  if (item === "potion") player.potions++;
  else if (item === "provisions")
    for (const h of g.heroes.filter((a) => a.owner === p)) heal(h, 14);
  else if (item === "relic") {
    if (g.shop.sold) return false;
    takeRelic(g, g.shop.relic);
    g.shop.sold = true;
  } else {
    const h = g.heroes.find((a) => a.id === hero && a.owner === p);
    if (!g.shop.stock[p].includes(item) || !grant(g, h, BY_CARD[item], slot))
      return false;
  }
  player.gold -= cost;
  g.shop.bought[p].push(item);
  if (BY_CARD[item] || item === "relic") {
    for (const owner of [0, 1])
      g.shop.stock[owner] = refreshOffers(
        g,
        owner,
        g.shop.stock[owner],
        2,
        g.shop.bought[owner],
      );
  }
  return true;
}
export function leaveShop(g, p) {
  if (g.phase !== "shop" || ![0, 1].includes(p) || g.done[p]) return false;
  g.done[p] = true;
  if (g.done.every(Boolean)) finishRoom(g);
  return true;
}
export function potion(g, p, id) {
  if (
    !["combat", "map", "shop", "rest"].includes(g.phase) ||
    ![0, 1].includes(p) ||
    g.players[p].potions < 1 ||
    (g.phase === "combat" &&
      g.battle.ready[p] &&
      g.heroes.some((h) => h.hp > 0 && h.owner === p))
  )
    return false;
  const h = g.heroes.find((x) => x.id === id);
  if (!h || h.hp === h.max) return false;
  if (!h.hp) h.hp = Math.min(h.max, Math.ceil(h.max * 0.2));
  else heal(h, 25);
  g.players[p].potions--;
  if (g.phase === "combat" && !g.battle.plans[h.id]) {
    const skill =
      h.skills.find((s) => !["Mend", "Haste"].includes(s)) ||
      (h.b.charges > 0 ? h.skills[0] : "Hold");
    const support = [
      "Guard",
      "Riposte",
      "Aegis",
      "Mend",
      "Bless",
      "Haste",
      "Taunt",
      "Hold",
    ].includes(skill);
    g.battle.plans[h.id] = {
      skill,
      target: support ? h.id : living(g.battle.enemies)[0].id,
    };
    g.battle.ready[h.owner] = false;
  }
  return true;
}

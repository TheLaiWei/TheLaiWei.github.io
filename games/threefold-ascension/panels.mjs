import { ACTS, ENEMIES, EVENTS, MOVES, RELICS } from "./world.mjs";
import {
  BY_CARD,
  SKILL,
  mod,
  living,
  stat,
  roleArt,
  recipients,
  slots,
  cardActive,
  skillsFor,
  healCapacity,
} from "./party.mjs";
import {
  ROOM,
  available,
  allowedEvent,
  trainingChoices,
  campHeal,
  price,
} from "./campaign.mjs";
import { unit, order, targetsFor, preview } from "./combat.mjs";
import {
  T,
  N,
  D,
  E,
  btn,
  label,
  grade,
  teamName,
  who,
  nodeName,
  nodeDetail,
  amounts,
  skillLine,
  intentText,
} from "./display.mjs";

const own = (g, p) => g.heroes.filter((h) => h.owner === p);
const choice = (en, zh) => '<p class="instruction">' + T(en, zh) + "</p>";
const heading = (text) => "<h3>" + E(text) + "</h3>";
const small = (text) => "<small>" + E(text) + "</small>";
const strong = (text) => "<strong>" + E(text) + "</strong>";
const back = (p, act = "back") =>
  btn(act, T("‹ Back", "‹ 返回"), { p }, "minor");
const klass = (c) => "q" + c.rarity;
function rowButton(a, title, detail, data, cls = "", opts = {}) {
  return btn(
    a,
    "<span>" +
      strong(title) +
      (detail ? small(detail) : "") +
      "</span><i aria-hidden='true'>›</i>",
    data,
    "row-button " + cls,
    opts,
  );
}
export function heroTile(g, h, p, tab = "hero", hp = h.hp) {
  const plan = g.battle?.plans[h.id],
    combat = g.phase === "combat";
  const caption =
    combat && h.hp && plan
      ? label(plan.skill) +
        (SKILL[plan.skill][0] === "all"
          ? T(" → all", " → 全体")
          : SKILL[plan.skill][0] === "self"
            ? ""
            : " → " + who(g, unit(g, plan.target), true))
      : h.hp
        ? T("View build", "查看构筑")
        : T("Down", "已倒下");
  return btn(
    tab,
    '<span class="hero-main"><img alt="" src="' +
      roleArt(h) +
      '"><span>' +
      strong(label(h.name)) +
      small(hp + " / " + h.max + " HP") +
      '</span></span><span class="hp-track"><i style="width:' +
      Math.max(0, Math.min(100, (hp / h.max) * 100)) +
      '%"></i></span>' +
      small(caption),
    { p, id: h.id },
    "hero-tile" + (hp <= 0 ? " down" : ""),
  );
}
function teamGrid(g, p, tab = "hero", displayHp = {}) {
  return (
    '<div class="heroes">' +
    own(g, p)
      .map((h) => heroTile(g, h, p, tab, displayHp[h.id] ?? h.hp))
      .join("") +
    "</div>"
  );
}
function skillEditor(g, p, h) {
  if (!h?.hp || g.phase !== "combat" || g.battle.ready[p])
    return heroBook(g, p, h);
  const plan = g.battle.plans[h.id],
    skill = plan.skill,
    valid = skillsFor(h);
  const choices = h.skills.concat(valid.includes("Hold") ? ["Hold"] : []);
  const sks = choices
    .map((k) =>
      btn(
        "skill",
        E(label(k)),
        { p, id: h.id, k },
        "skill-tab" + (k === skill ? " chosen" : ""),
        { disabled: !valid.includes(k), pressed: k === skill },
      ),
    )
    .join("");
  const options = targetsFor(g, h, skill),
    mode = SKILL[skill][0];
  const people = options
    .map((t) => {
      const text =
        "<b>" +
        E(who(g, t, true)) +
        "</b><small>" +
        E(amounts(g, h, skill, t)) +
        "</small>";
      return mode === "self" || mode === "all"
        ? '<div class="target picked">' + text + "</div>"
        : btn(
            "target",
            text,
            { p, id: h.id, to: t.id },
            "target" + (t.id === plan.target ? " picked" : ""),
            { pressed: t.id === plan.target },
          );
    })
    .join("");
  return (
    '<div class="pane-top">' +
    back(p) +
    strong(label(h.name)) +
    btn("book", T("Build ↗", "构筑 ↗"), { p, id: h.id }, "minor") +
    "</div>" +
    '<div class="skill-tabs">' +
    sks +
    '</div><p class="skill-explain">' +
    E(skillLine(skill)) +
    "</p>" +
    '<div class="targets">' +
    people +
    "</div>" +
    (h.skills.includes("Mend") || h.skills.includes("Haste")
      ? small(
          T("Recovery charges ", "剩余治疗次数 ") +
            h.b.charges +
            "/" +
            healCapacity(h),
        )
      : "")
  );
}
function history(g, h) {
  const rows = Object.entries(h.cards);
  return rows.length
    ? rows
        .map(([id, n]) => {
          const c = BY_CARD[id],
            times = h.history
              .filter((x) => x.id === id)
              .map((x) =>
                x.floor
                  ? T("A", "幕") + x.act + "·" + x.floor
                  : T("Loadout", "初始"),
              )
              .join(", ");
          return (
            '<article class="history-entry ' +
            klass(c) +
            '">' +
            strong(N(c) + (n > 1 ? " ×" + n : "")) +
            small(D(c)) +
            small(
              times +
                (cardActive(g, h, c)
                  ? ""
                  : " · " + T("Prerequisite unavailable", "前提条件暂不满足")),
            ) +
            "</article>"
          );
        })
        .join("")
    : choice("No upgrades yet.", "尚未获得升级。");
}
function heroBook(g, p, h) {
  if (!h) return "";
  const data = [
    ["HP", h.hp + "/" + h.max],
    [T("ATK", "物攻"), stat(g, h, "atk")],
    [T("MAG", "魔攻"), stat(g, h, "mag")],
    [T("DEF", "物防"), stat(g, h, "def")],
    [T("RES", "魔防"), stat(g, h, "res")],
    [T("SPD", "速度"), stat(g, h, "speed")],
    [T("Luck", "幸运"), stat(g, h, "luck")],
  ];
  return (
    '<div class="pane-top">' +
    back(p) +
    strong(who(g, h)) +
    '</div><div class="stat-strip">' +
    data
      .map(([k, v]) => "<span>" + E(k) + " <b>" + v + "</b></span>")
      .join("") +
    "</div>" +
    '<p class="skill-explain">' +
    h.skills.map(label).join(" · ") +
    (h.training ? T(" · Training +", " · 训练 +") + 2 * h.training : "") +
    "</p>" +
    history(g, h)
  );
}
function bag(g, p) {
  const allowed =
    ["combat", "map", "rest", "shop"].includes(g.phase) &&
    !(
      g.phase === "combat" &&
      g.battle.ready[p] &&
      own(g, p).some((h) => h.hp > 0)
    );
  const relics = [...new Set(g.relics)]
    .map(
      (id) =>
        '<article class="history-entry"><b>' +
        E(RELICS[id].icon + " " + N(RELICS[id])) +
        (g.relics.filter((k) => k === id).length > 1
          ? " ×" + g.relics.filter((k) => k === id).length
          : "") +
        "</b>" +
        small(D(RELICS[id])) +
        "</article>",
    )
    .join("");
  const potions =
    allowed && g.players[p].potions
      ? '<div class="targets">' +
        g.heroes
          .map((h) =>
            btn(
              "potion",
              strong(who(g, h, true)) +
                small(
                  h.hp +
                    "/" +
                    h.max +
                    " → " +
                    (h.hp
                      ? Math.min(h.max, h.hp + 25)
                      : Math.ceil(h.max * 0.2)) +
                    " HP",
                ),
              { p, id: h.id },
              "target",
              { disabled: h.hp === h.max },
            ),
          )
          .join("") +
        "</div>"
      : "";
  return (
    '<div class="pane-top">' +
    back(p) +
    strong(T("Expedition pack", "探险行囊")) +
    "</div>" +
    teamGrid(g, p, "book") +
    heading(T("Healing draughts", "治疗药剂") + " ×" + g.players[p].potions) +
    choice(
      "Restore 25 HP to either party, or revive one hero at 20% HP.",
      "为任意队伍的一名英雄恢复 25 生命，或以 20% 生命复苏。",
    ) +
    potions +
    heading(T("Shared relics", "共享遗物") + " · " + g.relics.length) +
    (relics ||
      small(
        T(
          "Win an elite fight or find a vault.",
          "击败精英或找到宝库即可获得。",
        ),
      ))
  );
}
function actionOrder(g, p) {
  const b = g.battle;
  return (
    '<div class="pane-top">' +
    back(p) +
    strong(T("Action order", "行动顺序")) +
    "</div>" +
    order(g)
      .map(
        (a) =>
          '<div class="queue-row"><b>' +
          a.speed +
          "</b><span>" +
          E(who(g, unit(g, a.from), true)) +
          " · " +
          E(a.skill ? label(a.skill) : N(MOVES[a.id])) +
          small(
            a.skill
              ? SKILL[a.skill][0] === "all"
                ? T("All enemies", "所有敌人")
                : who(g, unit(g, a.target), true)
              : intentText(g, a),
          ) +
          "</span></div>",
      )
      .join("")
  );
}
function combatPlan(g, p) {
  const plan = g.battle.plans,
    estimates = {};
  for (const h of living(g.heroes)) {
    const a = plan[h.id];
    if (SKILL[a.skill][0] === "enemy") {
      const t = unit(g, a.target);
      estimates[t.id] =
        (estimates[t.id] || 0) + preview(g, h, a.skill, t).damage;
    }
  }
  const crowded = living(g.battle.enemies).find(
    (e) => (estimates[e.id] || 0) > e.hp + 8,
  );
  const threatened = g.battle.intents.filter((a) =>
    a.targets.some((id) => unit(g, id)?.owner === p),
  );
  const line = threatened
    .map((a) => N(MOVES[a.id]) + " → " + intentText(g, a))
    .join(" / ");
  return (
    teamGrid(g, p) +
    '<p class="threat"><b>' +
    T("Incoming", "敌方意图") +
    "</b> " +
    E(
      line ||
        T("No announced attacks on your party.", "本轮未有攻击瞄准你的队伍。"),
    ) +
    "</p>" +
    (crowded
      ? '<p class="warning">' +
        E(
          T("Overlapping attacks on ", "集火伤害可能溢出 · ") +
            who(g, crowded) +
            " (" +
            estimates[crowded.id] +
            " / " +
            crowded.hp +
            " HP)",
        ) +
        "</p>"
      : "")
  );
}
function mapPanel(g, p) {
  const vs = g.votes;
  const route = available(g);
  const prompt =
    vs[p] != null && vs[1 - p] != null && vs[p] !== vs[1 - p]
      ? T(
          "Different routes. Change either vote to agree.",
          "路线不同，更改任意一方选择即可同行。",
        )
      : T(
          "Choose a room. Both votes must match.",
          "选择房间。双方选择相同时进入。",
        );
  return (
    choice(prompt, prompt) +
    route
      .map((n) =>
        rowButton(
          "vote",
          ROOM[n.kind][0] + "  " + nodeName(g, n),
          nodeDetail(g, n),
          { p, v: n.id },
          (vs[p] === n.id ? "chosen " : "") +
            (vs[1 - p] === n.id ? "partner-vote" : ""),
          { pressed: vs[p] === n.id },
        ),
      )
      .join("")
  );
}
function listCards(g, p, shop = false) {
  const list = shop ? g.shop.stock[p] : g.reward.offers[p];
  return (
    '<div class="reward-list">' +
    list
      .map((id) => {
        const c = BY_CARD[id],
          sold = shop && g.shop.bought[p].includes(id);
        const detail =
          (shop ? price(g, p, id) + T(" gold · ", " 金 · ") : "") +
          label(c.group) +
          " · " +
          grade(c.rarity);
        const keys =
          Object.keys(c.mods || {}).join(" ") + (" " + (c.skill || ""));
        const category = /[Mm]ark|[Qq]uarry/.test(keys)
          ? "mark"
          : /[Bb]less|[Hh]eal|Mend/.test(keys)
            ? "blessing"
            : /[Ww]ard|Aegis|[Ss]hield/.test(keys)
              ? "barrier"
              : /armor|Guard|Taunt|[Cc]ounter/.test(keys)
                ? "guard"
                : /[Ss]peed|Haste/.test(keys)
                  ? "speed"
                  : /luck|[Gg]old|[Ss]hop/.test(keys)
                    ? "luck"
                    : c.group === "Priest"
                      ? "holy"
                      : "strike";
        const art =
          '<img class="upgrade-art" alt="" src="../threefold-duel/art/card-' +
          category +
          '.svg">';
        return btn(
          "pick",
          art +
            strong(N(c)) +
            small(detail) +
            '<span class="effect-excerpt">' +
            E(D(c)) +
            "</span>",
          { p, id },
          "card-option " + klass(c),
          {
            disabled:
              sold ||
              !recipients(g, p, c).length ||
              (shop && g.players[p].gold < price(g, p, id)),
          },
        );
      })
      .join("") +
    "</div>"
  );
}
function cardDetail(g, p, id, recId) {
  const c = BY_CARD[id];
  if (!c) return "";
  const list = recipients(g, p, c),
    shop = g.phase === "shop",
    sel = list.find((h) => h.id === recId) || list[0];
  const buttonId = shop ? "buycard" : "take";
  const options = list
    .map((h) =>
      btn(
        c.skill ? "recip" : buttonId,
        E(label(h.name)),
        { p, id, hero: h.id },
        "select-button" + (c.skill && sel === h ? " chosen" : ""),
        { disabled: shop && price(g, p, id) > g.players[p].gold },
      ),
    )
    .join("");
  const replace =
    c.skill && sel
      ? '<div class="slot-options">' +
        slots(sel, c)
          .map((i) =>
            btn(
              buttonId,
              E(label(sel.skills[i])) + " → <b>" + E(label(c.skill)) + "</b>",
              { p, id, hero: sel.id, slot: i },
              "select-button",
            ),
          )
          .join("") +
        "</div>"
      : "";
  return (
    '<div class="pane-top">' +
    back(p) +
    small(label(c.group) + " · " + grade(c.rarity)) +
    '</div><div class="card-detail ' +
    klass(c) +
    '">' +
    heading(N(c)) +
    "<p>" +
    E(D(c)) +
    "</p></div>" +
    small(
      shop
        ? T("Purchase for ", "购买需 ") + price(g, p, id) + T(" gold", " 金")
        : T("Give to a hero", "选择英雄"),
    ) +
    '<div class="skill-tabs">' +
    options +
    "</div>" +
    replace
  );
}
function shopPane(g, p) {
  const stock = g.shop;
  const row = (id, name, desc, off = false) =>
    rowButton(
      "buy",
      name,
      price(g, p, id) + T(" gold · ", " 金 · ") + desc,
      { p, id },
      "",
      {
        disabled:
          off ||
          stock.bought[p].includes(id) ||
          g.players[p].gold < price(g, p, id),
      },
    );
  return (
    listCards(g, p, true) +
    row(
      "potion",
      T("Healing draught", "治疗药剂"),
      T("+25 HP or revive one hero.", "恢复 25 生命或复苏一名英雄。"),
    ) +
    row(
      "provisions",
      T("Hot provisions", "热食补给"),
      T("+14 HP to your three heroes.", "本方三名英雄各恢复 14 生命。"),
    ) +
    row("relic", N(RELICS[stock.relic]), D(RELICS[stock.relic]), stock.sold)
  );
}
function campPane(g, p, train) {
  if (train)
    return (
      '<div class="pane-top">' +
      back(p) +
      strong(T("Train one hero", "训练一名英雄")) +
      "</div>" +
      trainingChoices(g, p)
        .map((x) =>
          rowButton(
            "train",
            label(unit(g, x.hero).name) +
              " · " +
              (x.id === "training"
                ? T("Arms practice", "武艺训练")
                : N(BY_CARD[x.id])),
            x.id === "training"
              ? T(
                  "+2 physical and magical attack · 3 sessions per hero.",
                  "物攻、魔攻 +2，每名英雄最多 3 次。",
                )
              : D(BY_CARD[x.id]),
            { p, hero: x.hero, id: x.id },
          ),
        )
        .join("")
    );
  return (
    rowButton(
      "campheal",
      T("Rest your party", "全队休整"),
      own(g, p)
        .map((h) => label(h.name) + " +" + campHeal(g, h))
        .join(" · ") + " HP",
      { p },
    ) +
    rowButton(
      "opentrain",
      T("Train one hero", "训练一名英雄"),
      T(
        "Improve an owned card or gain +2 attack and magic.",
        "强化已有卡牌，或提升 2 点物攻与魔攻。",
      ),
      { p },
      "",
      { disabled: !trainingChoices(g, p).length },
    )
  );
}
function waiting(g, p) {
  const pick = g.reward?.picks?.[p];
  return (
    '<div class="waiting"><b>✓</b><span>' +
    strong(T("Ready", "已就绪")) +
    small(
      (pick && BY_CARD[pick.id] ? N(BY_CARD[pick.id]) + " · " : "") +
        T("Waiting for ", "等待 ") +
        teamName(1 - p),
    ) +
    "</span></div>"
  );
}
export function seat(g, p, s, hps = {}) {
  const head =
    '<header class="seat-head"><span><i class="team-dot"></i>' +
    E(teamName(p)) +
    " <small>" +
    T("Player ", "玩家 ") +
    (p + 1) +
    "</small></span>" +
    btn(
      "bag",
      "<b>" + g.players[p].gold + "</b> " + T("gold", "金") + " <i>▤</i>",
      { p },
      "pack",
      { label: T("Open pack and hero builds", "打开行囊与英雄构筑") },
    ) +
    "</header>";
  let body = "",
    footer = "";
  if (s.tab === "bag") body = bag(g, p);
  else if (s.tab === "book") body = heroBook(g, p, unit(g, s.id));
  else if (s.tab === "hero" && g.phase === "combat")
    body = skillEditor(g, p, unit(g, s.id));
  else if (s.tab === "order" && g.phase === "combat") body = actionOrder(g, p);
  else if (
    s.tab === "pick" &&
    ["draft", "shop"].includes(g.phase) &&
    !g.done[p] &&
    (g.phase === "shop" ? g.shop.stock[p] : g.reward.offers[p]).includes(s.id)
  )
    body = cardDetail(g, p, s.id, s.recip);
  else if (g.phase === "combat") {
    body = combatPlan(g, p);
  } else if (g.phase === "round") {
    body = teamGrid(g, p, "book", hps);
    footer = btn(
      "continue",
      g.battle.outcome === "victory"
        ? T("Claim rewards →", "领取奖励 →")
        : g.battle.outcome === "defeat"
          ? T("Expedition result →", "查看结果 →")
          : g.battle.outcome === "wave"
            ? T("Next wave →", "下一波 →")
            : T("Next round →", "下一回合 →"),
      {},
      "ready",
    );
  } else if (g.phase === "map") body = mapPanel(g, p);
  else if (g.phase === "draft") {
    body = g.done[p] ? waiting(g, p) : listCards(g, p);
    if (!g.done[p])
      footer = btn(
        "skip",
        g.reward.kind === "starter"
          ? T("Skip starter card", "跳过初始牌")
          : T("Pass for 5 gold", "跳过并获得 5 金"),
        { p },
        "minor",
      );
  } else if (g.phase === "relic") {
    body = g.reward.offers
      .map((id) =>
        rowButton(
          "vote",
          RELICS[id].icon + "  " + N(RELICS[id]),
          D(RELICS[id]),
          { p, v: id },
          (g.votes[p] === id ? "chosen " : "") +
            (g.votes[1 - p] === id ? "partner-vote" : ""),
          { pressed: g.votes[p] === id },
        ),
      )
      .join("");
  } else if (g.phase === "event") {
    body = EVENTS[g.node.event].options
      .map((o, i) =>
        rowButton(
          "vote",
          N(o),
          D(o),
          { p, v: i },
          (g.votes[p] === i ? "chosen " : "") +
            (g.votes[1 - p] === i ? "partner-vote" : ""),
          { disabled: !allowedEvent(g, i), pressed: g.votes[p] === i },
        ),
      )
      .join("");
  } else if (g.phase === "shop") {
    body = g.done[p] ? waiting(g, p) : shopPane(g, p);
    if (!g.done[p])
      footer = btn(
        "leave",
        T("Leave merchant →", "结束购物 →"),
        { p },
        "ready",
      );
  } else if (g.phase === "rest")
    body = g.done[p] ? waiting(g, p) : campPane(g, p, s.tab === "train");
  if (g.phase === "combat" && (!s.tab || ["base", "order"].includes(s.tab))) {
    const alive = own(g, p).some((h) => h.hp > 0);
    footer =
      (s.tab !== "order"
        ? btn("order", T("Speed order", "行动顺序"), { p }, "minor")
        : "") +
      btn(
        "ready",
        g.battle.ready[p]
          ? alive
            ? T("Ready ✓ · edit", "已就绪 ✓ · 修改")
            : T("Party down", "队伍倒下")
          : T("Ready plan →", "准备就绪 →"),
        { p },
        "ready" + (g.battle.ready[p] ? " is-ready" : ""),
        { disabled: !alive },
      );
  }
  return (
    '<section class="seat p' +
    p +
    '" aria-label="' +
    E(teamName(p)) +
    '">' +
    head +
    '<div class="seat-scroll" data-panel="' +
    p +
    '">' +
    body +
    "</div>" +
    (footer ? '<footer class="seat-foot">' + footer + "</footer>" : "") +
    "</section>"
  );
}

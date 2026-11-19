import { EVENTS, MOVES, RELICS } from "./world.mjs";
import {
  BY_CARD,
  SKILL,
  stat,
  roleArt,
  recipients,
  slots,
  cardActive,
  skillsFor,
  healCapacity,
} from "./party.mjs";
import {
  SUPPLIES,
  supplyTargets,
  allowedEvent,
  trainingChoices,
  campHeal,
  price,
} from "./campaign.mjs";
import { unit, order, targetsFor } from "./combat.mjs";
import {
  T,
  N,
  D,
  E,
  artImage,
  btn,
  label,
  grade,
  teamName,
  who,
  amounts,
  skillLine,
  intentText,
} from "./display.mjs";

const own = (g, p) => g.heroes.filter((h) => h.owner === p);
const choice = (en, zh) => '<p class="instruction">' + T(en, zh) + "</p>";
const heading = (text) => "<h3>" + E(text) + "</h3>";
const small = (text) => "<small>" + E(text) + "</small>";
const strong = (text) => "<strong>" + E(text) + "</strong>";
const back = (p, act = "panel-back") =>
  btn(act, T("‹ Back", "‹ 返回"), { p }, "minor");
const klass = (c) => "q" + c.rarity;
function rowButton(
  a,
  title,
  detail,
  data,
  cls = "",
  opts = {},
  illustration = "",
) {
  return btn(
    a,
    illustration +
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
      : "") +
    '<div class="skill-actions">' +
    btn("book", T("Hero & upgrades", "英雄与升级"), { p, id: h.id }, "minor") +
    btn("back", T("Done", "完成"), { p }, "ready") +
    "</div>"
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
function supplyPane(g, p, id) {
  const item = SUPPLIES[id],
    options = supplyTargets(g, p, id);
  if (!item) return bag(g, p);
  const details = options
    .map((o) => {
      const name =
        id === "bread"
          ? teamName(Number(o.id.slice(-1)))
          : who(g, unit(g, o.id));
      const gain =
        id === "tea"
          ? T("+1 recovery charge", "治疗次数 +1")
          : id === "tonic"
            ? T("Barrier → 14", "屏障 → 14")
            : "+" + o.amount + " HP";
      return rowButton("use-supply", name, gain, { p, id, to: o.id });
    })
    .join("");
  return (
    '<div class="pane-top">' +
    back(p) +
    '</div><div class="item-detail">' +
    artImage("goods", id) +
    "<div>" +
    heading(N(item)) +
    small(D(item)) +
    "</div></div>" +
    (details ||
      choice("No eligible target right now.", "目前没有可使用的目标。"))
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
  const supplies = Object.entries(g.supplies || {})
    .filter(([id, n]) => SUPPLIES[id] && n > 0)
    .map(([id, count]) =>
      rowButton(
        "supply",
        N(SUPPLIES[id]) + " ×" + count,
        D(SUPPLIES[id]),
        { p, id },
        "",
        {},
        artImage("goods", id, "item-icon"),
      ),
    )
    .join("");
  const relics = [...new Set(g.relics)]
    .map((id) => {
      const n = g.relics.filter((k) => k === id).length;
      return (
        '<article class="item-detail">' +
        artImage("goods", id) +
        "<span>" +
        strong(N(RELICS[id]) + (n > 1 ? " ×" + n : "")) +
        small(D(RELICS[id])) +
        "</span></article>"
      );
    })
    .join("");
  const potions =
    allowed && g.players[p].potions
      ? '<div class="targets">' +
        g.heroes
          .filter((h) => h.hp < h.max)
          .map((h) =>
            btn(
              "potion",
              strong(who(g, h, true)) +
                small(
                  h.hp +
                    " → " +
                    (h.hp
                      ? Math.min(h.max, h.hp + 25)
                      : Math.ceil(h.max * 0.2)) +
                    " HP",
                ),
              { p, id: h.id },
              "target",
            ),
          )
          .join("") +
        "</div>"
      : "";
  return (
    '<div class="pack-gold">' +
    artImage("goods", "coins") +
    strong(T("Party gold", "本队金币") + " · " + g.players[p].gold) +
    "</div>" +
    heading(T("Shared supplies", "共用补给")) +
    (supplies ||
      choice(
        "Supplies found after a fight appear here.",
        "战斗后找到的补给会存放在这里。",
      )) +
    '<div class="item-detail">' +
    artImage("goods", "potion") +
    "<div>" +
    strong(T("Healing draught", "治疗药剂") + " ×" + g.players[p].potions) +
    small(
      T(
        "Personal stock · Recover 25 HP or revive at 20%.",
        "个人物品 · 恢复 25 生命，或以 20% 生命复苏。",
      ),
    ) +
    "</div></div>" +
    potions +
    heading(T("Shared relics", "共享遗物") + " · " + g.relics.length) +
    relics +
    heading(T("Your heroes", "本队英雄")) +
    teamGrid(g, p, "book")
  );
}
function actionOrder(g, p) {
  return order(g)
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
    .join("");
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
          '<img class="upgrade-art" alt="" src="./art/skills/' +
          category +
          '.webp">';
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
      artImage(
        "goods",
        id === "relic" ? stock.relic : id === "provisions" ? "bread" : id,
        "item-icon",
      ),
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
export function panelContent(g, p, s) {
  if (s.tab === "bag") return bag(g, p);
  if (s.tab === "supply") return supplyPane(g, p, s.id);
  if (s.tab === "book") return heroBook(g, p, unit(g, s.id));
  if (s.tab === "hero") return skillEditor(g, p, unit(g, s.id));
  if (s.tab === "order") return actionOrder(g, p);
  if (s.tab === "train") return campPane(g, p, true);
  if (s.tab === "pick") {
    const offers = g.phase === "shop" ? g.shop.stock[p] : g.reward?.offers?.[p];
    if (!g.done[p] && offers?.includes(s.id))
      return cardDetail(g, p, s.id, s.recip);
  }
  if (g.done[p]) return waiting(g, p);
  if (g.phase === "draft")
    return (
      listCards(g, p) +
      btn(
        "skip",
        g.reward.kind === "starter"
          ? T("Skip starter card", "跳过初始牌")
          : T("Pass for 5 gold", "跳过并获得 5 金"),
        { p },
        "minor pass",
      )
    );
  if (g.phase === "rest") return campPane(g, p, false);
  if (g.phase === "shop")
    return (
      shopPane(g, p) +
      btn("leave", T("Finish shopping", "结束购物"), { p }, "ready pass")
    );
  if (g.phase === "event")
    return EVENTS[g.node.event].options
      .map((o, i) =>
        rowButton(
          "vote",
          N(o),
          D(o),
          { p, v: i },
          g.votes[p] === i ? "chosen" : "",
          { disabled: !allowedEvent(g, i), pressed: g.votes[p] === i },
        ),
      )
      .join("");
  if (g.phase === "relic")
    return g.reward.offers
      .map((id) =>
        rowButton(
          "vote",
          N(RELICS[id]),
          D(RELICS[id]),
          { p, v: id },
          g.votes[p] === id ? "chosen" : "",
          { pressed: g.votes[p] === id },
          artImage("goods", id, "item-icon"),
        ),
      )
      .join("");
  return "";
}

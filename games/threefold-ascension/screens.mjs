import { ACTS, ENEMIES, MOVES, RELICS } from "./world.mjs";
import { CARDS } from "./cards.mjs";

import { unit } from "./combat.mjs";
import {
  T,
  N,
  D,
  E,
  btn,
  roman,
  grade,
  artImage,
  intentText,
  eventText,
  who,
  lang,
  label,
} from "./display.mjs";

const seal = '<span class="brand-mark" aria-hidden="true"><i></i></span>';
function seatingChoice(face) {
  return '<div class="seating" role="group" aria-label="' + T("Player layout", "玩家布局") + '">' +
    btn("seating", T("Same side", "同向并排"), {v:"same"}, "minor", {pressed: !face}) +
    btn("seating", T("Face to face", "面对面"), {v:"face"}, "minor", {pressed: face}) + '</div>';
}
export function landing(g, face = false) {
  const resume = !!g && !["victory", "defeat"].includes(g.phase);
  const name =
    lang === "en" ? "Threefold<br><em>Ascension</em>" : "三英<br><em>登塔</em>";
  return (
    '<div class="landing"><nav class="mast"><a href="/projects/#fun">' +
    seal +
    "<span>Lai Wei <i>/</i> " +
    T("Game Room", "游戏室") +
    "</span></a><div>" +
    btn("guide", T("Field guide", "探险指南"), {}, "nav-link") +
    btn("lang", T("简体中文", "English"), {}, "language") +
    "</div></nav>" +
    '<section class="cover"><div class="cover-art"><img src="./art/atlas/title.webp" alt="' +
    T(
      "A sunlit expedition tower rises above forest paths and a crystalline mountainside.",
      "林间山道与琉璃山坡之上，层层塔楼沐浴着阳光。",
    ) +
    '"></div>' +
    '<div class="cover-copy"><p class="eyebrow"><i></i>' +
    T("A shared-phone adventure", "同屏双人合作冒险") +
    "</p><h1>" +
    name +
    "</h1>" +
    '<p class="premise">' +
    T(
      "Two players command six heroes. Read the enemy’s next move, choose a path together, and climb to the Sunless Crown.",
      "两名玩家，各领三位英雄。读懂敌方意图，共选前路，向无日王庭进发。",
    ) +
    '</p>' + seatingChoice(face) + '<div class="start-buttons">' +
    btn(
      resume ? "resume" : "new",
      resume
        ? T("Resume expedition", "继续登塔")
        : T("Begin expedition", "开始登塔"),
      {},
      "gold-button arrow",
    ) +
    btn("rules", T("How to play", "玩法说明"), {}, "outline-button") +
    "</div>" +
    (resume
      ? '<small class="resume-info">' +
        E(
          T("Saved on this device", "已在此设备存档") +
            " · " +
            T("Act ", "幕 ") +
            roman[g.act] +
            " · " +
            N(ACTS[g.act]),
        ) +
        "</small>"
      : "") +
    '</div></section><section class="chapters"><header><h2>' +
    T("The three acts", "三幕征途") +
    "</h2>" +
    btn(
      "atlasguide",
      T("Meet the guardians ↗", "查看守卫 ↗"),
      {},
      "text-button",
    ) +
    "</header>" +
    '<div class="chapter-grid">' +
    ACTS.map((a, i) =>
      btn(
        "chapter",
        '<span class="chapter-portrait"><img alt="" src="./art/bestiary/' +
          a.boss +
          '.webp"></span><span class="chapter-text"><small>' +
          T("Act ", "第 ") +
          roman[i] +
          (lang === "zh" ? " 幕" : "") +
          "</small><strong>" +
          E(N(a)) +
          "</strong><span>" +
          E(N(ENEMIES[a.boss])) +
          "</span></span><i>↗</i>",
        { i },
        "chapter-card",
      ),
    ).join("") +
    '</div></section><footer class="home-foot"><a href="../threefold-duel/">' +
    T("‹ Threefold Duel", "‹ 三英对决") +
    '</a><a href="/projects/#fun">' +
    T("All games ↗", "所有游戏 ↗") +
    "</a></footer></div>"
  );
}
export function endScreen(g) {
  const won = g.phase === "victory",
    s = g.stats;
  return (
    '<section class="end-screen"><div class="end-card"><img src="./art/bestiary/' +
    ACTS[g.act].boss +
    '.webp" alt=""><p class="eyebrow">' +
    T("Expedition record", "探险记录") +
    "</p>" +
    "<h1>" +
    (won
      ? T("The crown is yours.", "登顶加冕")
      : T("The tower holds.", "征途落幕")) +
    "</h1><p>" +
    E(
      won
        ? T("Both companies reached the summit.", "两支队伍共同抵达塔顶。")
        : N(ACTS[g.act]) + " · " + T("Floor ", "楼层 ") + (g.node?.row + 1),
    ) +
    "</p>" +
    '<div class="end-stats">' +
    [
      [s.rooms, T("Rooms", "房间")],
      [s.bosses, T("Bosses", "首领")],
      [g.relics.length, T("Relics", "遗物")],
      [s.rounds, T("Rounds", "回合")],
    ]
      .map(([v, k]) => "<span><b>" + v + "</b>" + k + "</span>")
      .join("") +
    "</div>" +
    btn(
      "new",
      T("Begin another expedition", "重新登塔"),
      {},
      "gold-button arrow",
    ) +
    btn("home", T("Return to Game Room", "返回游戏大厅"), {}, "text-button") +
    "</div></section>"
  );
}
function rulesBody() {
  const rules = [
    [
      T("Choose together", "共同选路"),
      T(
        "Share one screen. Each player controls a Fighter, Mage, and Priest. Pick a starting card, then vote for the same connected room to enter it. The last camp always leads to the boss.",
        "两人共用一个屏幕，每位玩家控制战士、法师与牧师。领取初始牌，再各自为同一个可达房间投票。每幕最后的营地通向首领。",
      ),
    ],
    [
      T("Read the enemy", "观察敌人"),
      T(
        "Enemies announce targets, damage, and Speed before planning. Tap a hero at the bottom to open their moves, then pick a skill and target. Allies in either party can receive support. Both players can edit at once. Tap Ready again to unlock until both are ready.",
        "敌人会提前展示目标、伤害与速度。点击下方英雄打开行动菜单，再选技能和目标，可以支援任意队伍。双方可同时操作。在两人均就绪前，再点就绪即可解锁。",
      ),
    ],
    [
      T("Resolve in Speed order", "按速度结算"),
      T(
        "Faster moves resolve first. A single-target attack misses if its target falls first. Barriers last one round and the stronger overlapping guard or barrier applies. A mark gives the next active hit +4. Healing draws from three charges per caster per battle. The pack lets you drink a draught without using an action.",
        "速度快的行动先结算。目标提前倒下，后续单体攻击落空。屏障持续一回合，重叠护卫与屏障各取较强值。下一次主动命中消耗标记并增加 4 伤害。每位施法者每场有 3 次基础治疗次数，行囊中使用药剂不消耗行动。",
      ),
    ],
    [
      T("Build for the climb", "积累构筑"),
      T(
        "Clear every enemy and wave before drafting one card per player. A fight can also yield a supply for the shared pack. Drop chances are 45% in normal fights, 65% for elites, and 85% for bosses. Elites and bosses also grant a shared relic. HP carries between rooms. After a win, downed heroes return at 20% HP. Camps offer recovery or training. If all six heroes fall, the expedition ends.",
        "消灭全部敌人与增援后，每人选一张升级牌。普通战、精英战与首领战分别有 45%、65% 和 85% 概率掉落共用补给。精英与首领还会掉落共享遗物。生命值跨房间保留，胜利后倒下的英雄以 20% 生命归队。可在营地休整或训练。六名英雄全部倒下则登塔结束。",
      ),
    ],
    [
      T("Pause anywhere", "随时暂停"),
      T(
        "The game saves on this browser after each choice. Open the menu at the top left to pause and return to the title.",
        "每次选择后自动在此浏览器存档。点击左上方菜单暂停并返回标题页。",
      ),
    ],
  ];
  return rules
    .map(
      ([k, v]) =>
        '<article class="guide-row"><h3>' +
        k +
        "</h3><p>" +
        v +
        "</p></article>",
    )
    .join("");
}
export function modal(g, ui, kind, arg) {
  const close = btn("close", "×", {}, "close", { label: T("Close", "关闭") });
  let h = "",
    body = "";
  if (
    ["guide", "rules", "cards", "relics", "atlasguide", "chapter"].includes(
      kind,
    )
  ) {
    h = T("Field guide", "探险指南");
    const tabs = [
      ["rules", T("Rules", "规则")],
      ["cards", T("Cards", "卡牌")],
      ["relics", T("Relics", "遗物")],
      ["atlasguide", T("Guardians", "守卫")],
    ];
    body =
      '<div class="guide-tabs">' +
      tabs
        .map(([a, k]) =>
          btn(
            a,
            E(k),
            {},
            "minor" +
              (kind === a ||
              (a === "rules" && kind === "guide") ||
              (a === "atlasguide" && kind === "chapter")
                ? " chosen"
                : ""),
          ),
        )
        .join("") +
      "</div>";
    if (kind === "rules" || kind === "guide") body += rulesBody();
    if (kind === "cards") {
      const group = ui.group || "Fighter";
      body +=
        '<div class="filter-tabs">' +
        ["Fighter", "Mage", "Priest", "General", "Cooperative"]
          .map((k) =>
            btn(
              "group",
              E(label(k)),
              { k },
              "minor" + (group === k ? " chosen" : ""),
            ),
          )
          .join("") +
        "</div>" +
        CARDS.filter((c) => c.group === group)
          .map(
            (c) =>
              '<article class="guide-row q' +
              c.rarity +
              '"><small>' +
              grade(c.rarity) +
              " · " +
              T("Max rank ", "上限 ") +
              c.cap +
              "</small><h3>" +
              E(N(c)) +
              "</h3><p>" +
              E(D(c)) +
              "</p></article>",
          )
          .join("");
    }
    if (kind === "relics")
      body += Object.entries(RELICS)
        .map(
          ([id, r]) =>
            '<article class="guide-row illustrated">' +
            artImage("goods", id) +
            "<h3>" +
            E(N(r)) +
            "</h3><p>" +
            E(D(r)) +
            "</p></article>",
        )
        .join("");
    if (kind === "chapter" || kind === "atlasguide")
      body += ACTS.flatMap((a, i) => {
        if (kind === "chapter" && i !== Number(arg)) return [];
        const boss = ENEMIES[a.boss];
        return [
          '<article class="guardian"><img alt="" src="./art/bestiary/' +
            a.boss +
            '.webp"><div><small>' +
            T("Act ", "第 ") +
            roman[i] +
            (lang === "zh" ? " 幕" : "") +
            "</small><h3>" +
            E(N(a)) +
            "</h3><p>" +
            E(D(a)) +
            "</p><b>" +
            E(N(boss)) +
            "</b><small>" +
            E(
              boss.hp +
                " HP · " +
                T("Changes phase at ", "阶段切换 ") +
                Math.round(boss.phase.at * 100) +
                "% HP",
            ) +
            "</small></div></article>",
        ];
      }).join("");
  } else if (kind === "menu") {
    h = T("Expedition", "本次探险");
    body =
      "<p>" +
      E(
        N(ACTS[g.act]) +
          " · " +
          T("Rooms cleared ", "已通关房间 ") +
          g.stats.rooms +
          "/30",
      ) +
      '</p>' + seatingChoice(ui.face) + '<div class="menu-list">' +
      btn("close", T("Return to expedition", "返回探险"), {}, "gold-button") +
      btn("guide", T("Open field guide", "打开探险指南"), {}, "select-button") +
      btn(
        "home",
        T("Save and return to title", "存档并返回标题页"),
        {},
        "select-button",
      ) +
      btn(
        "confirm-new",
        T("Start a new expedition", "开始新探险"),
        {},
        "text-button",
      ) +
      "</div>";
  } else if (kind === "confirm-new") {
    h = T("Replace this expedition?", "替换当前存档？");
    body =
      "<p>" +
      T(
        "Starting a new climb replaces the expedition saved on this browser.",
        "开始新的登塔会替换此浏览器中的当前进度。",
      ) +
      "</p>" +
      btn("close", T("Keep playing", "继续原存档"), {}, "select-button") +
      btn("new", T("Start a new climb", "开始新登塔"), {}, "gold-button");
  } else if (kind === "foe") {
    const en = unit(g, arg);
    if (en) {
      h = who(g, en);
      body =
        '<div class="foe-book">' +
        artImage("bestiary", en.type) +
        "<div><b>" +
        en.hp +
        "/" +
        en.max +
        " HP</b>" +
        g.battle.intents
          .filter((a) => a.from === en.id)
          .map(
            (a) =>
              '<article class="guide-row"><h3>' +
              E(N(MOVES[a.id])) +
              "</h3><p>" +
              E(intentText(g, a)) +
              "</p><small>" +
              T("Speed ", "速度 ") +
              a.speed +
              "</small></article>",
          )
          .join("") +
        "</div></div>";
    }
  } else if (kind === "log") {
    h = T("Battle record", "战斗记录");
    body = g.battle.records
      .slice()
      .reverse()
      .map(
        (r) =>
          '<article class="guide-row"><h3>' +
          T("Round ", "回合 ") +
          r.round +
          "</h3>" +
          r.events.map((e) => "<p>" + E(eventText(g, e)) + "</p>").join("") +
          "</article>",
      )
      .join("");
  }
  return (
    '<div class="dialog-heading"><h2 id="dialog-title">' +
    h +
    "</h2>" +
    close +
    "</div>" +
    body
  );
}

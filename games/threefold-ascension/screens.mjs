import { ACTS, ENEMIES, EVENTS, MOVES, RELICS } from "./world.mjs";
import { CARDS } from "./cards.mjs";
import { living } from "./party.mjs";
import { ROOM, available } from "./campaign.mjs";
import { unit } from "./combat.mjs";
import {
  T,
  N,
  D,
  E,
  btn,
  roman,
  grade,
  teamName,
  roomName,
  nodeName,
  nodeDetail,
  intentText,
  eventText,
  who,
  lang,
  label,
} from "./display.mjs";
import { seat } from "./panels.mjs";

const title = () => T("Threefold Ascension", "三英登塔");
const seal = '<span class="brand-mark" aria-hidden="true"><i></i></span>';
export function landing(g, saved = false) {
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
    '<section class="cover"><div class="cover-art"><img src="./art/tower.webp" alt="' +
    T(
      "A winding golden stairway climbs a three-tiered tower above the mountains.",
      "金色阶梯绕山而上，通向三层高塔。",
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
    '</p><div class="start-buttons">' +
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
        '<span class="chapter-portrait"><img alt="" src="./art/' +
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
function routeMap(g, focus) {
  const next = available(g),
    ids = next.map((n) => n.id);
  const chosen = g.map.flat().find((n) => n.id === focus) || next[0] || g.node;
  const html = g.map
    .map((row, i) =>
      row
        .map((n) => {
          const y = 22 + (9 - i) * 38,
            visited = g.path.includes(n.id),
            can = ids.includes(n.id);
          return (
            '<button type="button" data-act="inspect-node" data-id="' +
            n.id +
            '" style="left:' +
            n.x * 100 +
            "%;top:" +
            y +
            'px" class="map-node ' +
            n.kind +
            (visited ? " visited" : "") +
            (can ? " open" : "") +
            (chosen?.id === n.id ? " selected" : "") +
            '" aria-label="' +
            E(
              T("Floor ", "第 ") +
                (i + 1) +
                (lang === "zh" ? " 层" : "") +
                " · " +
                nodeName(g, n),
            ) +
            '" title="' +
            E(nodeName(g, n)) +
            '">' +
            ROOM[n.kind][0] +
            "</button>"
          );
        })
        .join(""),
    )
    .join("");
  return (
    '<div class="route-layout"><div class="atlas-scroll" id="atlas-scroll"><div class="atlas"><canvas id="roads" aria-hidden="true"></canvas>' +
    g.map
      .map(
        (_, i) =>
          '<span class="floor-no" style="top:' +
          (22 + (9 - i) * 38) +
          'px">' +
          String(i + 1).padStart(2, "0") +
          "</span>",
      )
      .join("") +
    html +
    '</div></div><div class="map-legend"><b>' +
    T("Route map", "路线地图") +
    "</b>" +
    (chosen
      ? "<span>" +
        E(ROOM[chosen.kind][0] + " " + nodeName(g, chosen)) +
        "</span><small>" +
        E(nodeDetail(g, chosen)) +
        "</small>"
      : "") +
    '<small class="map-key"><i></i>' +
    T("Available route", "可选路线") +
    "</small></div></div>"
  );
}
function enemyField(g, hps, event) {
  const b = g.battle;
  const enemies = b.enemies
    .filter(
      (e) =>
        (hps[e.id] ?? e.hp) > 0 ||
        event?.to === e.id ||
        (g.phase === "round" && b.outcome === "victory" && e.hp === 0),
    )
    .slice(-6);
  const field = enemies
    .map((en) => {
      const hp = hps[en.id] ?? en.hp;
      const artDirectory = ACTS.some((a) => a.boss === en.type)
        ? "./art/"
        : "./art/foes/";
      const portrait = '<img alt="" src="' + artDirectory + en.type + '.webp">';
      const intents = b.intents.filter((a) => a.from === en.id);
      return (
        '<div data-unit="' +
        en.id +
        '" class="enemy ' +
        (hp <= 0 ? "down " : "") +
        (event?.to === en.id ? "impact" : "") +
        '"><span class="enemy-sigil">' +
        portrait +
        "</span><div><b>" +
        E(who(g, en)) +
        "</b><small>" +
        hp +
        "/" +
        en.max +
        " HP" +
        (en.b.mark != null ? " · " + T("Marked", "标记") : "") +
        "</small></div>" +
        '<span class="hp-track"><i style="width:' +
        (hp / en.max) * 100 +
        '%"></i></span>' +
        (g.phase === "combat"
          ? intents
              .map(
                (a) =>
                  '<small class="intent">' +
                  E(N(MOVES[a.id])) +
                  " · " +
                  E(intentText(g, a)) +
                  "</small>",
              )
              .join("")
          : "") +
        "</div>"
      );
    })
    .join("");
  return (
    '<div class="enemy-grid" style="--enemies:' +
    Math.min(enemies.length, 4) +
    '">' +
    field +
    "</div>"
  );
}
export function hpFrame(g, cursor) {
  if (g.phase !== "round" || cursor < 0) return {};
  const b = g.battle,
    hp = { ...b.before };
  for (const e of b.events.slice(0, cursor + 1))
    if (e.to && e.hp != null) hp[e.to] = e.hp;
  return hp;
}
function central(g, ui, hp) {
  const b = g.battle,
    e = g.phase === "round" ? b.events[ui.cursor] : null;
  const status =
    T("Act ", "第 ") +
    roman[g.act] +
    (lang === "zh" ? " 幕" : "") +
    " · " +
    T("Floor ", "第 ") +
    (g.node?.row + 1 || 1) +
    (lang === "zh" ? " 层" : "") +
    "/10";
  let name = "",
    content = "";
  if (g.phase === "map") {
    name = N(ACTS[g.act]);
    content = routeMap(g, ui.focusNode);
  }
  if (["combat", "round"].includes(g.phase)) {
    name =
      (b.kind === "boss" ? N(ENEMIES[ACTS[g.act].boss]) : roomName(b.kind)) +
      " · " +
      T("Round ", "回合 ") +
      b.round;
    content = enemyField(g, hp, e);
    if (g.phase === "combat")
      content +=
        '<p class="field-hint">' +
        T(
          "Tap a hero to change their skill or target.",
          "点选英雄以更改技能或目标。",
        ) +
        (b.wave > 1 || b.waves.length
          ? " · " + T("Wave ", "波次 ") + b.wave
          : "") +
        "</p>";
    else {
      const lines = {
        continue: T("Round complete", "本回合结束"),
        victory: T("Room cleared", "房间已通关"),
        defeat: T("The expedition fell", "探险队倒下"),
        wave: T("Reinforcements approach", "增援来袭"),
      };
      content +=
        '<div class="round-strip"><span class="event-line ' +
        (e?.k || "") +
        '">' +
        E(e ? eventText(g, e) : lines[b.outcome]) +
        "</span><span>" +
        btn(
          "playback",
          ui.playing ? T("Skip ▸", "跳过 ▸") : T("Replay ↺", "回放 ↺"),
          {},
          "field-button",
        ) +
        btn("log", T("Log", "记录"), {}, "field-button") +
        "</span></div>";
    }
  }
  if (g.phase === "draft") {
    const starter = g.reward.kind === "starter";
    name = starter
      ? T("Choose your starting cards", "选择初始牌")
      : T("Victory spoils", "胜利奖励");
    content =
      '<div class="room-intro"><span class="room-glyph">✦</span><p>' +
      T(
        starter
          ? "Each player equips one starting upgrade. Tap a card to read its effect."
          : "Each player takes one upgrade for a surviving party. Tap a card to inspect and assign it.",
        starter
          ? "每位玩家可装备一张初始升级牌，点击卡牌查看效果。"
          : "每位玩家获得一次升级。点击卡牌查看效果并分配给英雄。",
      ) +
      "</p></div>";
  }
  if (g.phase === "relic") {
    name = T("Choose a shared relic", "共选遗物");
    content = story(
      "◇",
      T(
        "Both players vote for one treasure. Its effect lasts for this expedition.",
        "双方为同一件宝物投票。效果持续至本次登塔结束。",
      ),
      agreement(g),
    );
  }
  if (g.phase === "event") {
    const ev = EVENTS[g.node.event];
    name = N(ev);
    content = story("?", D(ev), agreement(g));
  }
  if (g.phase === "rest") {
    name = T("Campfire", "营火");
    content = story(
      "♨",
      T(
        "Each player may rest their party or train one hero. The boss is waiting above the final camp.",
        "每位玩家可为自己的队伍休整，或训练一名英雄。穿过最后的营地即将迎战首领。",
      ),
    );
  }
  if (g.phase === "shop") {
    name = T("Traveling merchant", "旅行商人");
    content = story(
      "⚖",
      T(
        "Spend from separate purses. A purchased relic belongs to both parties.",
        "使用各自的钱袋购物。购买的遗物由两队共享。",
      ),
    );
  }
  return (
    '<section class="field ' +
    g.phase +
    '" style="--guardian:url(./art/' +
    ACTS[g.act].boss +
    '.webp)"><header class="field-head">' +
    btn("menu", "☰", {}, "field-button", {
      label: T("Expedition menu", "探险菜单"),
    }) +
    "<div><small>" +
    E(status) +
    "</small><h2>" +
    E(name) +
    "</h2></div>" +
    '<span class="field-tools">' +
    (g.phase === "combat"
      ? btn("lines", "↝", {}, "field-button", {
          label: T("Show planned target lines", "显示行动目标连线"),
          pressed: ui.lines,
        })
      : "") +
    btn("lang", T("中文", "EN"), {}, "field-button") +
    "</span></header>" +
    '<div class="field-body">' +
    content +
    "</div></section>"
  );
}
const story = (icon, str, more = "") =>
  '<div class="room-intro"><span class="room-glyph">' +
  icon +
  "</span><p>" +
  E(str) +
  (more ? "<small>" + E(more) + "</small>" : "") +
  "</p></div>";
const agreement = (g) =>
  g.votes[0] != null && g.votes[1] != null && g.votes[0] !== g.votes[1]
    ? T(
        "Your votes differ. Either player can change their choice.",
        "双方选择不同。任意一方都可以修改选择。",
      )
    : "";
export function gameTable(g, ui) {
  const hp = hpFrame(g, ui.cursor);
  return (
    '<div class="desk"><div class="table ' +
    (ui.upright ? "upright" : "face-to-face") +
    '">' +
    seat(g, 1, ui.seats[1], hp) +
    central(g, ui, hp) +
    seat(g, 0, ui.seats[0], hp) +
    (g.phase === "combat"
      ? '<canvas aria-hidden="true" class="target-lines"></canvas>'
      : "") +
    (g.phase === "round"
      ? '<div class="effects" aria-hidden="true"></div>'
      : "") +
    "</div></div>"
  );
}
export function endScreen(g) {
  const won = g.phase === "victory",
    s = g.stats;
  return (
    '<section class="end-screen"><div class="end-card"><img src="./art/' +
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
        "Place one phone between you. Each player controls a Fighter, Mage, and Priest. Pick a starting card, then vote for the same connected room to enter it. The last camp always leads to the boss.",
        "手机放在两人中间，每位玩家控制战士、法师与牧师。领取初始牌，再各自为同一个可达房间投票。每幕最后的营地通向首领。",
      ),
    ],
    [
      T("Read the enemy", "观察敌人"),
      T(
        "Enemies announce targets, damage, and Speed before planning. Tap any of your heroes to change a skill or target. Allies in either party can receive support. Both players can edit at once. Tap Ready again to unlock until both are ready.",
        "敌人会提前展示目标、伤害与速度。点击自己的英雄改变技能或目标，可以支援任意队伍。双方可同时操作。在两人均就绪前，再点就绪即可解锁。",
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
        "Clear every enemy and wave before drafting one card per player. Elites and bosses also grant a shared relic. HP carries between rooms. After a win, downed heroes return at 20% HP. Camps offer recovery or training. If all six heroes fall, the expedition ends.",
        "消灭全部敌人与增援后，每人选一张升级牌。精英与首领还会掉落共享遗物。生命值跨房间保留，胜利后倒下的英雄以 20% 生命归队。可在营地休整或训练。六名英雄全部倒下则登塔结束。",
      ),
    ],
    [
      T("Pause anywhere", "随时暂停"),
      T(
        "The game saves on this browser after each choice. Use the center menu to suspend an expedition or turn both player areas upright.",
        "每次选择后自动在此浏览器存档。中央菜单可暂停本次探险，也可将双方区域设为同向显示。",
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
      body += Object.values(RELICS)
        .map(
          (r) =>
            '<article class="guide-row"><h3>' +
            E(r.icon + " " + N(r)) +
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
          '<article class="guardian"><img alt="" src="./art/' +
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
      '</p><div class="menu-list">' +
      btn("close", T("Return to table", "返回桌面"), {}, "gold-button") +
      btn(
        "rotate",
        ui.upright
          ? T("Switch to face-to-face", "改为面对面")
          : T("Face both seats upright", "两方同向显示"),
        {},
        "select-button",
      ) +
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

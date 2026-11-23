import { ACTS, ENEMIES, EVENTS, MOVES, RELICS } from "./world.mjs";
import { available, SUPPLIES } from "./campaign.mjs";
import { SKILL, roleArt } from "./party.mjs";
import { unit } from "./combat.mjs";
import {
  T,
  N,
  D,
  E,
  btn,
  roman,
  teamName,
  roomName,
  nodeName,
  nodeDetail,
  intentText,
  eventText,
  who,
  label,
  artImage,
} from "./display.mjs";
import { panelContent } from "./panels.mjs";

const regions = ["gate", "glass", "crown"];
const seats = (g) => Array.from(g.players.keys());
const base = (collection, id) => "./art/" + collection + "/" + id + ".webp";
const floorText = (n) => T("Floor " + n, "第 " + n + " 层");
const actText = (g) => T("Act " + roman[g.act], "第 " + roman[g.act] + " 幕");

function sceneHeader(title, sub) {
  return (
    '<header class="scene-head">' +
    btn("menu", '<span aria-hidden="true">☰</span>', {}, "hud-button", {
      label: T("Expedition menu", "探险菜单"),
    }) +
    '<div class="nameplate"><small>' +
    E(sub) +
    "</small><h1>" +
    E(title) +
    "</h1></div>" +
    btn("lang", T("中文", "EN"), {}, "hud-button lang-toggle") +
    "</header>"
  );
}
function packButton(g, p, detailed = false) {
  const label = teamName(p) + " · " + T("Open pack", "打开行囊");
  return btn(
    "bag",
    artImage("goods", "satchel") +
      (detailed ? "<b>" + g.players[p].gold + "</b>" : ""),
    { p },
    "pack-button",
    { label },
  );
}
function packBar(g) {
  return (
    '<div class="map-packs">' +
    seats(g)
      .map((p) =>
        btn(
          "bag",
          artImage("goods", "satchel") + E(teamName(p)),
          { p },
          "pack-chip p" + p,
          { label: teamName(p) + " · " + T("Open pack", "打开行囊") },
        ),
      )
      .join("") +
    "</div>"
  );
}
function popovers(g, ui) {
  const open = seats(g).filter((p) => ui.seats[p].tab !== "base");
  return (
    '<div class="popover-layer' +
    (open.length === 2 ? " paired" : "") +
    '">' +
    seats(g)
      .map((p) => {
        const s = ui.seats[p];
        if (s.tab === "base") return '<div class="popover-slot"></div>';
        const name =
          {
            bag: T("Expedition pack", "探险行囊"),
            supply: T("Use supply", "使用补给"),
            order: T("Speed order", "行动顺序"),
            pick: T("Upgrade", "升级"),
            train: T("Training", "训练"),
          }[s.tab] ||
          (["hero", "book"].includes(s.tab)
            ? label(unit(g, s.id)?.name)
            : roomAction(g));
        return (
          '<div class="popover-slot"><section role="dialog" aria-label="' +
          E(teamName(p) + " · " + name) +
          '" class="popover p' +
          p +
          '"><header><span class="party-name">' +
          E(teamName(p)) +
          "</span><strong>" +
          E(name) +
          "</strong>" +
          btn("back", "×", { p }, "window-close", {
            label: T(
              "Close " + teamName(p) + " menu",
              "关闭" + teamName(p) + "菜单",
            ),
          }) +
          '</header><div class="panel-body" data-panel="' +
          p +
          '">' +
          panelContent(g, p, s) +
          "</div></section></div>"
        );
      })
      .join("") +
    "</div>"
  );
}
export const mapY = (row) => 95 - row * 10;
function routeMap(g, ui) {
  const next = available(g),
    all = g.map.flat(),
    wanted = ui.focusNode || g.votes.find(Boolean);
  const selected = all.find((n) => n.id === wanted) || next[0],
    canEnter = next.some((n) => n.id === selected.id);
  const nodes = all
    .map((n) => {
      const open = next.some((x) => x.id === n.id),
        visited = g.path.includes(n.id),
        focus = n === selected;
      const voters = seats(g).filter((p) => g.votes[p] === n.id);
      const name = [
        floorText(n.row + 1),
        nodeName(g, n),
        ...voters.map(teamName),
      ].join(" · ");
      const pins = voters
        .map(
          (p) =>
            '<span aria-hidden="true" class="vote-pin p' +
            p +
            '">' +
            (p === 0 ? T("A", "琥") : T("J", "玉")) +
            "</span>",
        )
        .join("");
      return (
        '<div class="landmark-position" style="left:' +
        n.x * 100 +
        "%;top:" +
        mapY(n.row) +
        '%">' +
        btn(
          "inspect-node",
          artImage("landmarks", n.kind) +
            pins +
            (visited ? '<b class="route-check">✓</b>' : "") +
            (open
              ? '<span class="landmark-label">' +
                E(roomName(n.kind)) +
                "</span>"
              : ""),
          { id: n.id },
          "landmark" +
            (open ? " reachable" : "") +
            (visited ? " visited" : "") +
            (focus ? " selected" : ""),
          {
            pressed: focus,
            label: name + (open ? T(" · available", " · 可进入") : ""),
          },
        ) +
        "</div>"
      );
    })
    .join("");
  const floorList = g.map
    .map(
      (_, i) =>
        '<span class="floor-tick" style="top:' +
        mapY(i) +
        '%">' +
        (i + 1) +
        "</span>",
    )
    .join("");
  const votes =
    g.votes[0] != null && g.votes[1] != null && g.votes[0] !== g.votes[1];
  const controls = seats(g)
    .map((p) =>
      btn(
        "vote",
        g.mode === "solo" ? T("Enter room", "进入房间") : "<i></i>" +
          E(teamName(p)) +
          " " +
          (g.votes[p] === selected.id ? "✓" : T("vote", "选择")),
        { p, v: selected.id },
        "vote-button p" + p,
        { disabled: !canEnter, pressed: g.votes[p] === selected.id },
      ),
    )
    .join("");
  const detail = canEnter
    ? votes
      ? T(
          "Different votes. Choose the same room to enter.",
          "双方选路不同，选择同一房间即可进入。",
        )
      : g.mode === "solo" ? T("Choose a connected room.", "选择相连的房间。") : T("Both parties vote to enter.", "两队选择同一房间即可进入。")
    : g.path.includes(selected.id)
      ? T("Already visited", "已经到访")
      : T("Outside this floor’s available paths", "当前楼层无法进入");
  return (
    '<section class="journey map-scene" style="--scene:url(' +
    base("atlas", regions[g.act]) +
    ')">' +
    sceneHeader(
      N(ACTS[g.act]),
      actText(g) + " · " + T("Route map", "路线地图"),
    ) +
    '<div class="map-world"><div class="map-chart"><canvas id="roads" aria-hidden="true"></canvas>' +
    floorList +
    nodes +
    "</div></div>" +
    '<footer class="map-foot vellum"><div class="node-readout">' +
    artImage("landmarks", selected.kind) +
    "<div><small>" +
    floorText(selected.row + 1) +
    "</small><h2>" +
    E(nodeName(g, selected)) +
    "</h2><p>" +
    E(nodeDetail(g, selected)) +
    "</p></div></div>" +
    '<div class="route-actions"><small>' +
    detail +
    "</small><div>" +
    controls +
    "</div></div></footer>" +
    packBar(g) +
    popovers(g, ui) +
    "</section>"
  );
}
function roomAction(g) {
  return (
    {
      draft: T("Choose upgrade", "选择升级"),
      shop: T("Browse wares", "选购商品"),
      rest: T("Rest or train", "休整或训练"),
      event: T("Choose a response", "选择回应"),
      relic: T("Inspect relics", "挑选遗物"),
    }[g.phase] || ""
  );
}
function roomScene(g, ui) {
  const starter = g.phase === "draft" && g.reward.kind === "starter";
  let scene, title, desc;
  switch (g.phase) {
    case "draft":
      scene = starter ? "camp" : "treasure";
      title = starter
        ? T("Outfitting camp", "出发营地")
        : T("Victory spoils", "胜利奖励");
      desc = g.mode === "solo" ? T("Choose an upgrade for one hero.", "为一名英雄选择升级。") : starter
        ? T(
            "Choose one starting upgrade for each party.",
            "两队各选一张升级牌，整装出发。",
          )
        : T(
            "Each party may give one upgrade to a hero.",
            "两队可各选一张升级牌交给一名英雄。",
          );
      break;
    case "rest":
      scene = "camp";
      title = T("Hearthfire camp", "炉火营地");
      desc = T(
        "Share a meal to recover, or send one hero to train.",
        "围炉休整恢复生命，或派一名英雄参加训练。",
      );
      break;
    case "shop":
      scene = "shop";
      title = T("The trail merchant", "山道商铺");
      desc = g.mode === "solo" ? T("Buy supplies, upgrades, or a relic.", "购买补给、升级牌或遗物。") : T(
        "Spend each party’s gold on provisions, upgrades, or a shared relic.",
        "两队用各自的金币购置补给、升级牌或共享遗物。",
      );
      break;
    case "event":
      scene = "event";
      title = N(EVENTS[g.node.event]);
      desc = D(EVENTS[g.node.event]);
      break;
    case "relic":
      scene = "treasure";
      title = T("The relic vault", "遗物宝库");
      desc = g.mode === "solo" ? T("Choose a relic for this climb.", "为本次登塔选择遗物。") : T(
        "Both parties must choose the same relic. It stays with you for this climb.",
        "两队选中同一件遗物后即可获得，效果持续至本次登塔结束。",
      );
      break;
  }
  const item = g.phase === "draft" && g.reward.supply;
  const find = item
    ? '<div class="supply-find">' +
      artImage("goods", item) +
      "<div><small>" +
      T("Found · Added to the shared pack", "找到补给 · 已放入共用行囊") +
      "</small><strong>" +
      E(N(SUPPLIES[item])) +
      "</strong><span>" +
      E(D(SUPPLIES[item])) +
      "</span></div></div>"
    : "";
  const actions = seats(g)
    .map((p) => {
      const v = g.votes[p],
        voted = v != null && ["event", "relic"].includes(g.phase);
      const selection = voted
        ? g.phase === "event"
          ? N(EVENTS[g.node.event].options[v])
          : N(RELICS[v])
        : "";
      const action = g.done[p]
        ? T("Ready ✓", "已就绪 ✓")
        : selection || roomAction(g);
      return (
        '<div class="room-party p' +
        p +
        '">' +
        btn(
          "room",
          '<span class="party-name">' +
            E(teamName(p)) +
            "</span><strong>" +
            E(action) +
            "</strong>",
          { p },
          "party-action",
          { disabled: g.done[p] },
        ) +
        packButton(g, p, true) +
        "</div>"
      );
    })
    .join("");
  const mismatch = g.players.length > 1 && g.votes.every((v) => v != null) && g.votes[0] !== g.votes[1];
  return (
    '<section class="journey room-scene" style="--scene:url(' +
    base("places", scene) +
    ')">' +
    sceneHeader(
      N(ACTS[g.act]),
      starter ? actText(g) : actText(g) + " · " + floorText(g.node.row + 1),
    ) +
    '<div class="room-panorama" role="img" aria-label="' +
    E(title) +
    '"></div>' +
    '<footer class="room-ledger vellum"><div class="room-caption"><h2>' +
    E(title) +
    "</h2><p>" +
    E(desc) +
    "</p></div>" +
    find +
    (mismatch
      ? '<small class="vote-conflict">' +
        T(
          "Your votes differ. Either party can change its choice.",
          "两队选择不同，任意一方均可更改。",
        ) +
        "</small>"
      : "") +
    '<div class="room-actions">' +
    actions +
    "</div></footer>" +
    popovers(g, ui) +
    "</section>"
  );
}
function hpBar(hp, max) {
  return (
    '<span class="vital"><i style="width:' +
    Math.max(0, Math.min(100, (hp / max) * 100)) +
    '%"></i></span>'
  );
}
export function hpFrame(g, cursor) {
  if (g.phase !== "round" || cursor < 0) return {};
  const hp = { ...g.battle.before };
  for (const e of g.battle.events.slice(0, cursor + 1))
    if (e.to && e.hp != null) hp[e.to] = e.hp;
  return hp;
}
function enemyField(g, hp, event) {
  const b = g.battle,
    living = b.enemies.filter(
      (e) => (hp[e.id] ?? e.hp) > 0 || event?.to === e.id,
    );
  const foes = living.length
    ? living
    : b.enemies.filter((e) => e.b.start === b.round || e === b.enemies.at(-1));
  const columns = foes.length > 4 ? 3 : foes.length;
  const guardian = b.kind === "boss" && foes.find(en => en.type === ACTS[g.act].boss);
  function renderFoe(en) {
    const n = hp[en.id] ?? en.hp;
    const intents =
      g.phase === "combat" ? b.intents.filter((a) => a.from === en.id) : [];
    const intent = intents[0];
    return btn(
      "foe",
      artImage("bestiary", en.type, "foe-sprite") +
        '<span class="foe-tag"><b>' +
        E(who(g, en)) +
        (en === guardian && en.b.phaseRound ? T(" · II", " · 二阶段") : "") +
        "</b>" +
        hpBar(n, en.max) +
        "<small>" +
        n +
        "/" +
        en.max +
        " HP</small></span>" +
        (intent
          ? '<span class="intent-tag">' +
            E(N(MOVES[intent.id])) +
            (intents.length > 1 ? " (+" + (intents.length - 1) + ")" : "") +
            "<small>" +
            E(intentText(g, intent)) +
            "</small></span>"
          : ""),
      { id: en.id, unit: en.id },
      "foe" + (en === guardian ? " guardian guardian-" + en.type + (en.b.phaseRound ? " awakened" : "") : "") + (n <= 0 ? " down" : ""),
      {
        label: [
          who(g, en),
          n + " HP",
          ...intents.map((a) => N(MOVES[a.id]) + " · " + intentText(g, a)),
        ].join(" · "),
      },
    );
  }
  if (guardian) {
    const guards = foes.filter(en => en !== guardian);
    const flank = parity => '<div class="guardian-flank">' +
      guards.filter((_, i) => i % 2 === parity).map(renderFoe).join("") + '</div>';
    return '<div class="foe-line guardian-field">' + flank(0) + renderFoe(guardian) + flank(1) + '</div>';
  }
  return '<div class="foe-line" style="--count:' + columns + ';--total:' + foes.length + '">' +
    foes.map(renderFoe).join("") + '</div>';
}
function heroFigure(g, h, hp, active) {
  const plan = g.battle.plans[h.id],
    sk = plan && SKILL[plan.skill];
  const target =
    sk?.[0] === "all"
      ? T("All", "全体")
      : sk?.[0] === "self"
        ? ""
        : plan
          ? who(g, unit(g, plan.target), true)
          : "";
  const action =
    g.phase === "combat" && h.hp && plan
      ? label(plan.skill) + (target ? " → " + target : "")
      : "";
  return btn(
    "hero",
    '<span class="sprite-ground">' +
      '<img alt="" class="hero-sprite" draggable="false" src="' +
      roleArt(h) +
      '">' +
      "</span>" +
      '<span class="hero-tag"><span><b>' +
      E(label(h.name)) +
      "</b><small>" +
      hp +
      "/" +
      h.max +
      "</small></span>" +
      hpBar(hp, h.max) +
      (action ? '<small class="plan-label">' + E(action) + "</small>" : "") +
      "</span>",
    { p: h.owner, id: h.id, unit: h.id },
    "hero-figure" + (hp <= 0 ? " down" : "") + (active ? " active" : ""),
    {
      label:
        who(g, h) +
        " · " +
        hp +
        "/" +
        h.max +
        " HP" +
        (action ? " · " + action : ""),
      pressed: active,
    },
  );
}
function battleParty(g, ui, p, hp) {
  const b = g.battle,
    up = g.heroes.some((h) => h.owner === p && h.hp > 0);
  const readyLabel = !up
    ? T("Party down", "队伍倒下")
    : b.ready[p]
      ? T("Ready ✓ · Edit", "已就绪 ✓ · 修改")
      : g.mode === "solo" ? T("Fight", "开始战斗") : T("Ready", "就绪");
  return (
    '<section class="battle-party p' +
    p +
    '"><header><span class="party-name">' +
    teamName(p) +
    "</span>" +
    packButton(g, p) +
    (g.phase === "combat"
      ? btn("ready", readyLabel, { p }, "ready", {
          disabled: !up,
          pressed: b.ready[p],
          label: teamName(p) + " · " + readyLabel,
        })
      : "") +
    '</header><div class="company-line">' +
    g.heroes
      .filter((h) => h.owner === p)
      .map((h) => heroFigure(g, h, hp[h.id] ?? h.hp, ui.seats[p].id === h.id))
      .join("") +
    "</div></section>"
  );
}
function battleScene(g, ui) {
  const b = g.battle,
    round = g.phase === "round",
    hp = ui.inFlight && ui.cursor === 0 ? g.battle.before : hpFrame(g, ui.cursor - (ui.inFlight ? 1 : 0)),
    event = round ? b.events[ui.cursor] : null;
  const locale = [
    T("The gate road", "断门山道"),
    T("The furnace floor", "琉璃炉场"),
    T("Crown ramparts", "王庭城垣"),
  ][g.act];
  const arena = b.kind === "boss" ? "boss" : regions[g.act];
  const title = b.kind === "boss" ? N(ENEMIES[ACTS[g.act].boss]) : locale;
  const subtitle =
    actText(g) +
    " · " +
    floorText(g.node?.row + 1 || 1) +
    " · " +
    roomName(b.kind);
  const outcome = {
    continue: T("Round complete", "本回合结束"),
    victory: T("Room cleared", "已击败敌人"),
    wave: T("Reinforcements approach", "增援来袭"),
    defeat: T("The expedition fell", "探险队战败"),
  };
  const advance = {
    victory: T("Claim rewards", "领取奖励"),
    wave: T("Next wave", "下一波"),
    defeat: T("View result", "查看结果"),
    continue: T("Next round", "下一回合"),
  };
  const report = round
    ? '<div class="round-actions vellum"><div><strong>' +
      outcome[b.outcome] +
      '</strong><small aria-live="off">' +
      E(
        event
          ? eventText(g, event)
          : T("Round " + b.round, "第 " + b.round + " 回合"),
      ) +
      "</small></div>" +
      btn(
        "playback",
        ui.playing ? T("Skip", "跳过") : T("Replay", "回放"),
        {},
        "minor",
      ) +
      btn("log", T("Log", "记录"), {}, "minor") +
      btn("continue", advance[b.outcome] + " ›", {}, "ready") +
      "</div>"
    : "";
  return (
    '<section class="journey battle-scene table" style="--scene:url(' +
    base("arena", arena) +
    ')">' +
    sceneHeader(title, subtitle) +
    '<div class="battle-air"><div class="turn-tools"><strong>' +
    T("Round ", "回合 ") +
    b.round +
    (b.wave > 1 || b.waves.length ? " · " + T("Wave ", "波次 ") + b.wave : "") +
    "</strong><span>" +
    (round
      ? ""
      : btn("order", T("Speed order", "行动顺序"), { p: 0 }, "minor") +
        btn("lines", "↝", {}, "minor", {
          label: T("Show planned target lines", "显示行动目标连线"),
          pressed: ui.lines,
        })) +
    "</span></div>" +
    enemyField(g, hp, event) +
    '</div><div class="battle-bottom">' +
    report +
    (!round
      ? '<p class="battle-hint">' +
        T("Tap a hero to choose a move.", "点击英雄选择行动。") +
        "</p>"
      : "") +
    '<div class="companies">' +
    seats(g).map((p) => battleParty(g, ui, p, hp)).join("") +
    "</div></div>" +
    (round
      ? '<div class="effects" aria-hidden="true"></div>'
      : '<canvas class="target-lines" aria-hidden="true"></canvas>') +
    popovers(g, ui) +
    "</section>"
  );
}
export function gameTable(g, ui) {
  if (g.phase === "map") return routeMap(g, ui);
  if (["combat", "round"].includes(g.phase)) return battleScene(g, ui);
  return roomScene(g, ui);
}

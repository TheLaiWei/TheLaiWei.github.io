// The match stores its events in English. Translate the HUD and event text on
// display so switching languages also updates previously saved battle reports.
const pieces = {
  'Construction yard': '建造场',
  'Power plant': '发电厂',
  'Ore refinery': '矿石精炼厂',
  'Barracks': '兵营',
  'Motor Works': '战车工厂',
  'Signal Lab': '信号实验室',
  'Rifle squad': '步枪小队',
  'Rocket team': '火箭筒小队',
  'Sentry Post': '哨戒炮',
  'Vector Gate': '矢量传送门',
  'Scout Car': '侦察车',
  'Lancer Tank': '长枪坦克',
  'Arc Tower': '电弧塔',
  'Surge Array': '脉冲阵列',
  'Field Gun': '野战炮',
  'Anvil Tank': '铁砧坦克'
};

const labels = {
  'Iron Current': '钢铁洪流',
  'Switchyard Crossing': '铁路渡口',
  'Iron Current · Switchyard Crossing | Lai Wei': '钢铁洪流 · 铁路渡口 | Lai Wei',
  'Command the Allies or Soviets in a two-player, shared-screen hex tactics game on Switchyard Crossing.': '在铁路渡口展开六角格战棋对决，两位玩家在同一屏幕上分别指挥盟军与苏军。',
  'Opening Switchyard Crossing…': '正在载入铁路渡口…',
  'Enable JavaScript to play Iron Current.': '请启用 JavaScript 以游玩《钢铁洪流》。',
  'Allied': '盟军', 'Allies': '盟军', 'US': '盟军',
  'Soviet': '苏军', 'Soviets': '苏军', 'SU': '苏军',
  'North bridge': '北桥', 'South bridge': '南桥', 'neutral': '未占领',
  'Open sand': '沙地', 'sand': '沙地', 'Road': '道路', 'Grove': '树林',
  'Deep water': '深水', 'water': '深水', 'Ore seam': '矿脉', 'ore': '矿脉',
  'Bridge relay': '桥头据点', 'bridge': '桥头据点', 'Ford': '浅滩', 'Shallow ford': '浅滩',
  'Options': '设置', 'Language': '语言', 'Command': '指挥', 'Command console': '指挥台',
  'Credits': '资金', 'Power': '电力', 'Power usage': '电力使用情况',
  'Structures': '建筑', 'Units': '部队', 'Production': '生产', 'Construction': '建造',
  'Build sites': '在建工地', 'Production status': '施工与生产', 'Production progress': '完成进度',
  'Under construction': '施工中',
  'Requisition': '生产指令', 'Available': '可用', 'Used': '已用', 'Unavailable': '暂不可用',
  'Field command': '战地指挥', 'Actions left': '剩余行动', 'Action spent': '行动已用', 'Your turn': '回合行动', 'Current order': '当前指令',
  'Confirm order': '确认指令', 'Cancel': '取消', 'Close': '关闭', 'Close dialog': '关闭弹窗',
  'Build': '建造', 'Train unit': '生产单位', 'Deploy': '部署', 'Deploy unit': '部署单位',
  'Queue open': '生产队列空闲', 'Production ready': '生产完成', 'Ready': '就绪',
  'Offline': '断电', 'LOW': '电力不足', 'Resolving': '执行中', 'Reserve': '后备部队',
  'Fire': '开火', 'Move + fire': '移动并开火', 'Relocate': '传送', 'Mark target': '标记目标',
  'Unit selected': '已选单位', 'Route preview': '路线预览', 'Target forecast': '伤害预览',
  'Terrain': '地形', 'Signature order': '特殊指令', 'Match complete': '对局结束',
  'Battlefield and orders': '战场与指令', 'Relay control': '桥头据点归属', 'Map zoom': '地图缩放',
  'Zoom in': '放大', 'Zoom out': '缩小', 'Fit': '全图', 'Fit the full map': '显示整张地图',
  'Hex battlefield. Use arrow keys to explore and Enter to select.': '六角格战场。使用方向键移动光标，按回车选择。',
  'Latest field report': '最新战报', 'Field radio': '战地电台', 'Log': '战报', 'Order history': '指令记录',
  'Command sidebar': '指挥面板', 'Close production': '关闭生产面板',
  'Radar. Tap to center the zoomed battlefield.': '雷达。轻点可将地图视野移至该处。',
  'Pass turn': '跳过回合',
  'Match result': '对局结果', 'Match drawn': '平局', 'Operation complete': '行动结束',
  'Review battlefield': '查看战场', 'Return to field': '返回战场', 'Resume': '继续游戏',
  'Music volume': '音乐音量', 'Effects volume': '音效音量', 'Show hex grid': '显示六角网格',
  'Show hex coordinates': '显示格子坐标', 'Rotate view for the opposite seat': '对面玩家行动时旋转画面',
  'Animate movement and effects': '播放移动与战斗动画', 'Full-strength weapon flashes': '显示强烈开火闪光',
  'Projects / Fun': '项目 / 游戏', 'New match': '新对局', 'Start a new match?': '开始新对局？',
  'Coin toss': '随机先手', 'Allies first': '盟军先手', 'Soviets first': '苏军先手',
  'Field manual': '战地手册', 'Win the crossing': '胜利条件', 'Move and fire': '移动与射击',
  'Build a base': '建设基地', 'Train and deploy': '生产与部署', 'Ore and power': '矿石与电力',
  'Hex terrain': '六角格地形', 'Signature devices': '阵营专属装置', 'Share the screen': '同屏对战',
  'Two-player local match': '本地双人对局'
};

const descriptions = {
  'Issues building orders and supplies 20 credits per income turn.': '下达建造指令，每次结算收入时提供 20 资金。',
  'Adds 6 power to the grid.': '增加 6 点供电量。',
  'Earns 30 credits each income turn while online.': '有电时，每次结算收入可获得 30 资金。',
  'Trains rifle squads and rocket teams.': '训练步枪小队和火箭筒小队。',
  'Builds your faction’s vehicles.': '生产本阵营的战车。',
  'An online lab supports the signature device.': '实验室有电时，本阵营的专属装置才能正常运作。',
  'Infantry can capture a bridge relay.': '步兵可占领桥头据点。',
  'Deals +2 against vehicles. Can capture a relay.': '对车辆额外造成 2 点伤害，可占领桥头据点。',
  'Deals +1 against infantry.': '对步兵额外造成 1 点伤害。',
  'At 3 charge, relocate a ready unit within 3 hexes up to 4 hexes.': '蓄能达到 3 点时，可将附近 3 格内一个尚未行动的己方单位传送最多 4 格。',
  'Fast vehicle. Deals +1 against infantry.': '移动迅速，对步兵额外造成 1 点伤害。',
  'Mobile armor. Move and fire in the same activation.': '机动装甲，可在一次行动中移动并开火。',
  'Discharges an electrical arc against one target.': '以电弧攻击单个目标。',
  'At 3 charge, mark a hex within 6. A seven-hex pulse hits all mobile pieces next Soviet upkeep.': '蓄能达到 3 点时，可标记 6 格内的目标。苏军下回合开始时，脉冲将击中目标格及相邻 6 格内的所有机动单位。',
  'Range 2–4. Must stay still to fire.': '射程 2–4 格，须原地开火。',
  'Heavy armor with a powerful direct hit.': '装甲厚重，直射火力强。',
  'Costs 1 move. An empty sand hex next to a friendly base can host a building.': '消耗 1 点移动力。我方建筑旁的空沙地可以建造设施。',
  'Costs 1 move. Roads lead to the bridge crossings.': '消耗 1 点移动力，道路通往河上的桥梁。',
  'Costs 2 movement. Infantry take 1 less direct-fire damage here.': '消耗 2 点移动力。林中的步兵受到直射攻击时，伤害减少 1 点。',
  'Impassable to ground units.': '地面部队无法通行。',
  'Costs 1 move. Friendly infantry on an adjacent hex can secure a refinery site.': '消耗 1 点移动力。将己方步兵移到矿脉旁，即可在矿脉上建造精炼厂。',
  'Costs 1 move. Infantry here count toward relay control at the end of the round.': '消耗 1 点移动力。每轮结束时，占据此格的步兵控制这座桥。'
};

const messages = {
  'Secure both bridges with infantry or destroy the enemy construction yard.': '用步兵占领两座桥，或摧毁敌方建造场。',
  'Secure both bridge relays with infantry.': '用步兵占领两座桥的据点。',
  'Select a rifle squad to move, or choose Barracks to expand your base.': '选择步枪小队下达移动指令，或选择兵营扩建基地。',
  'Choose a unit or a production order.': '选择一个单位，或下达生产指令。',
  'Tap a highlighted hex or an enemy.': '轻点高亮格子或敌方目标。',
  'Tap an enemy in range.': '轻点射程内的敌方目标。',
  'Tap an outlined enemy to add a shot.': '轻点带轮廓的敌方目标，可在移动后开火。',
  'Confirm to move.': '确认后移动。',
  'Select a highlighted producer.': '请选择高亮的生产设施。',
  'Tap a highlighted producer.': '轻点高亮的生产设施。',
  'Select a highlighted construction hex.': '请选择高亮的施工格。',
  'Choose a highlighted construction site.': '请选择高亮的建造位置。',
  'Select an open hex beside the producer.': '请选择生产设施旁的空格。',
  'Choose an open exit next to the producer.': '请选择生产设施旁空闲的出口。',
  'Select an ore seam beside friendly infantry.': '请选择己方步兵旁的矿脉。',
  'Select a highlighted sand hex beside a friendly building.': '请选择己方建筑旁高亮的沙地。',
  'Choose a highlighted landing hex.': '请选择高亮的传送落点。',
  'Select a ready friendly unit near the Gate.': '请选择传送门附近尚未行动的己方单位。',
  'Mark land or a bridge within 6 hexes of the Array.': '请在阵列 6 格范围内标记陆地或桥梁。',
  'Choose one of your own pieces.': '请选择己方单位或设施。',
  'Construction is still in progress.': '建筑仍在施工。',
  'Choose a unit, defense or charged device.': '请选择部队、防御设施或蓄能完毕的装置。',
  'This facility needs more power.': '这座设施供电不足。',
  'This piece has already activated this turn.': '本单位本回合已行动。',
  'Choose one action. Build, train a unit, or give a field order.': '本回合可行动一次。选择建造、生产部队，或下达作战指令。',
  'Action already spent.': '本回合的行动已用完。',
  'Bring a Signal Lab online.': '需要一座供电正常的信号实验室。',
  'Production is unavailable.': '当前无法生产。',
  'You used this turn’s requisition.': '本回合的生产指令已用完。',
  'Your producers are busy or offline.': '对应的生产设施都在忙碌或已断电。',
  'Complete the current building site first.': '请先完成当前施工项目。',
  'Your signature facility is already built.': '已建成本阵营的专属设施。',
  'Move infantry next to an empty ore seam.': '请将步兵移到一处空矿脉旁。',
  'No legal site beside your base.': '基地旁没有可建造的空地。',
  'Use the device command.': '请使用装置的专属指令。',
  'Choose a reachable, empty hex.': '请选择移动范围内的空格。',
  'That target is outside the firing solution.': '无法从这个位置攻击目标。',
  'Choose a destination or an enemy target.': '请选择目的地或敌方目标。',
  'Choose an available producer.': '请选择可用的生产设施。',
  'Choose a signature facility.': '请选择阵营专属设施。',
  'Select a ready unit and a legal landing hex.': '请选择尚未行动的单位和可用的传送落点。',
  'Mark land or a bridge within 6 hexes.': '请在 6 格内标记一处陆地或桥梁。',
  'Clear an adjacent exit for deployment.': '请腾出设施旁的一格，让部队出场。',
  'Power the producer to deploy.': '请恢复生产设施的供电，以部署部队。',
  'Offline. Restore grid capacity.': '设施已断电，请增加供电量。',
  'Select a ready friendly unit within 3 hexes.': '请选择 3 格内尚未行动的己方单位。',
  'Bring a ready friendly unit within 3 hexes of the Gate.': '请将尚未行动的己方单位移到传送门 3 格内。',
  'Tap an empty destination up to 4 hexes away.': '轻点 4 格内的空地作为传送落点。',
  'Choose a land or bridge hex within range 6. The opponent gets a turn to leave the area.': '选择 6 格内的陆地或桥梁。对手有一个回合可以撤离。',
  'Next Soviet upkeep deals 3 to every mobile piece in the marked area, including your own.': '苏军下回合开始时，标记范围内所有机动单位受到 3 点伤害，己方部队也会被击中。',
  'This turn has already begun.': '本回合已经开始。',
  'Orders are unavailable.': '当前无法下达指令。',
  'Unknown order.': '无法识别此指令。', 'Order could not be issued.': '未能下达指令。',
  'No field orders were issued.': '本回合未下达行动指令。',
  'Orders and income will appear here as the match progresses.': '后续的行动与收入会记录在这里。',
  'The enemy construction yard was destroyed.': '敌方建造场已被摧毁。',
  'Infantry held both bridge relays for two consecutive round ends.': '步兵连续两轮在结算时控制了两座桥。',
  'More bridge relays held at the round limit.': '达到回合上限，控制桥头据点较多的一方获胜。',
  'Relay count tied. Remaining HQ health decided the match.': '双方控制的据点数相同，建造场剩余耐久较高的一方获胜。',
  'The marked surge fizzled. Its array or lab was offline.': '脉冲未能释放，阵列或信号实验室已断电。',
  'Each order or pass saves the match on this device.': '每次确认指令或跳过回合后，对局都会自动保存在此设备上。',
  'This browser cannot save the match. Keep this tab open to finish it.': '此浏览器无法保存对局，请保持此标签页开启。',
  'A new battle replaces the saved match on this device. Choose which commander opens.': '新对局将覆盖此设备上的存档。请选择先手阵营。',
  'The match was updated in another tab. Review the current board.': '另一标签页已更新对局，请查看最新战况。',
  'The battlefield could not load. Reload this page to reconnect.': '战场载入失败，请刷新页面重试。',
  'Ready to act.': '本回合即可行动。', 'Destroyed.': '已摧毁。',
  'Exits blocked; holding in reserve.': '出口被堵，已编入后备部队。',
  'Waiting for power.': '等待恢复供电。', 'The unit can act immediately.': '本回合即可行动。'
};

const manual = {
  'From round two, collect 20 plus 30 per online refinery. Build a refinery on ore next to friendly infantry. Power plants add 6 capacity. Low power pauses lower-priority facilities.': '从第 2 轮起，每轮获得 20 基础资金，每座有电的精炼厂再提供 30。让步兵靠近矿脉，即可在矿脉上建厂。每座发电厂提供 6 点电力，电力不足时优先级较低的设施会停运。',
  'A normal step costs 1. Groves cost 2 and protect infantry from 1 direct-fire damage. Units and water block movement. Fire range counts hex edges and ignores intervening pieces.': '通常每格消耗 1 点移动力，树林消耗 2 点。林中的步兵受到直射攻击时减免 1 点伤害。深水和其他单位会阻挡移动。射程按六角格距离计算，中间的单位不会阻挡射击。',
  'An online Signal Lab supports the Vector Gate or Surge Array. At 3 charge, the Gate relocates a ready unit. The Surge marks a seven-hex blast for the next Soviet upkeep, including friendly units.': '信号实验室供电正常时，专属装置可以蓄能。蓄满 3 点后，盟军可用矢量传送门传送一个尚未行动的单位；苏军可标记脉冲区域，下回合开始时打击七格内的敌我机动单位。',
  'The map centers on the next commander’s base after each turn. Turn on seat rotation in Options for face-to-face play. The field radio log keeps a record of orders.': '每个回合结束后，地图会自动移到下一位玩家的基地。面对面游玩时，可在设置中开启对坐视角。想回顾之前的指令，可查看战地电台日志。'
};

function normalize(text) {
  return text.trim().replace(/\.$/, '').toLowerCase();
}
const catalog = new Map(Object.entries({...pieces, ...labels, ...descriptions, ...messages, ...manual})
  .map(([english, chinese]) => [normalize(english), chinese]));

// These templates match complete generated messages. Coordinates and names
// come from the match, while Chinese controls the order of each sentence.
const sideNames = {Allied: '盟军', Soviet: '苏军', US: '盟军', SU: '苏军', neutral: '未占领'};
const verbs = {Train: '生产', Build: '建造', Deploy: '部署'};
const roleNames = {'construction site': '工地', unit: '单位', facility: '设施', infantry: '步兵'};
const formats = [
  // Saved field radio and victory reports.
  [/^R(\d+) (US|SU)(?: · (.+))?$/, (n, side, report) => `第 ${n} 轮 ${sideNames[side]}${report ? ' · ' + zh(report) : ''}`],
  [/^(.+) moved from ([A-Z]+\d+) to ([A-Z]+\d+)$/, (name, from, to) => `${zh(name)}从 ${from} 移至 ${to}`],
  [/^(.+) at ([A-Z]+\d+) took (\d+) damage$/, (name, cell, n) => `${cell} 的${zh(name)}受到 ${n} 点伤害`],
  [/^(\d+) HP left$/, n => `剩余生命值 ${n}`],
  [/^(.+) ordered at ([A-Z]+\d+)\. Ready in (\d+) owner turns?$/, (name, cell, n) => `${cell} 已开始生产${zh(name)}，${n} 个己方回合后完成`],
  [/^(.+) started at ([A-Z]+\d+)$/, (name, cell) => `${cell} 的${zh(name)}开始施工`],
  [/^(.+) completed at ([A-Z]+\d+)$/, (name, cell) => `${cell} 的${zh(name)}已建成`],
  [/^(.+) ready to deploy at ([A-Z]+\d+)$/, (name, cell) => `${cell} 的${zh(name)}已就绪，可部署`],
  [/^(.+) deployed at ([A-Z]+\d+)\. Ready to act$/, (name, cell) => `${zh(name)}已部署至 ${cell}，本回合即可行动`],
  [/^(.+) deployed at ([A-Z]+\d+)\. Can act next turn$/, (name, cell) => `${zh(name)}已部署至 ${cell}，己方下回合可行动`],
  [/^Round limit extended to (\d+)\. The next round is (\d+)$/, (limit, next) => `回合上限已延长至 ${limit} 轮，即将开始第 ${next} 轮`],
  [/^(.+) ready at ([A-Z]+\d+)\. Exits blocked; holding in reserve$/, (name, cell) => `${cell} 的${zh(name)}已就绪，出口被堵，正在后备部队中待命`],
  [/^(.+) ready at ([A-Z]+\d+)\. Waiting for power$/, (name, cell) => `${cell} 的${zh(name)}已就绪，正在等待恢复供电`],
  [/^(.+) ready in reserve at ([A-Z]+\d+)$/, (name, cell) => `${cell} 的${zh(name)}已就绪，正在后备部队中待命`],
  [/^Vector Gate relocated (.+) to ([A-Z]+\d+)$/, (name, cell) => `矢量传送门已将${zh(name)}传送至 ${cell}`],
  [/^Surge Array marked ([A-Z]+\d+)\. Impact at the next Soviet upkeep$/, cell => `脉冲阵列已标记 ${cell}，将在苏军下回合开始时释放脉冲`],
  [/^Surge discharged at ([A-Z]+\d+)$/, cell => `脉冲已在 ${cell} 释放`],
  [/^Collected (\d+) credits$/, n => `获得 ${n} 资金`],
  [/^Relay count and HQ health were tied after round (\d+)$/, n => `第 ${n} 轮结束后，双方的据点数与建造场耐久均相同`],
  [/^Round (\d+) · North bridge (Allied|Soviet|neutral) · South bridge (Allied|Soviet|neutral)$/, (round, north, south) => `第 ${round} 轮 · 北桥 ${sideNames[north]} · 南桥 ${sideNames[south]}`],
  [/^Destroy the enemy construction yard, or hold both ([A-Z]+\d+) and ([A-Z]+\d+) with infantry at two consecutive round ends\. At round (\d+), compare relay count, then HQ health$/, (north, south, rounds) => `摧毁敌方建造场，或连续两轮在结算时用步兵同时控制 ${north} 和 ${south}。第 ${rounds} 轮结束时，先比较据点数，再比较建造场剩余耐久`],
  // Turn handoff, radar and board labels.
  [/^Round (\d+) \/ (\d+)$/, (n, total) => `第 ${n} / ${total} 轮`],
  [/^(Allied|Soviet) (turn|field command|command|victory|construction site|unit|facility|infantry)$/i, (side, role) => {
    const group = side.toLowerCase() === 'allied' ? '盟军' : '苏军';
    const label = role.toLowerCase();
    return group + ({turn:'回合', 'field command':'战地指挥', command:'指挥部', victory:'胜利'}[label] || roleNames[label]);
  }],
  [/^Pass to (Allied|Soviet) command$/, side => `请交给${sideNames[side]}玩家`],
  [/^Begin (Allied|Soviet) turn$/, side => `开始${sideNames[side]}回合`],
  [/^(Allied|Soviet) command has ended its turn$/, side => `${sideNames[side]}已结束回合`],
  [/^(Allied|Soviet) command begins round (\d+)$/, (side, n) => `轮到${sideNames[side]}进行第 ${n} 轮`],
  [/^(Allied|Soviet) command has the first turn$/, side => `${sideNames[side]}先手`],
  [/^Relay hold streak · Allies (\d+) \/ (\d+) · Soviets (\d+) \/ (\d+)$/, (a, aMax, s, sMax) => `连续控制双桥 · 盟军 ${a}/${aMax} 轮 · 苏军 ${s}/${sMax} 轮`],
  [/^Rematch · (Allied|Soviet) first$/, side => `再战一局 · ${sideNames[side]}先手`],
  [/^([A-Z]+\d+) (US|SU)$/, (cell, side) => `${cell} ${sideNames[side]}`],
  [/^Power demand (\d+), supply (\d+), online draw (\d+)$/, (demand, supply, draw) => `电力需求 ${demand}，供电 ${supply}，实际用电 ${draw}`],
  [/^([A-Z]+\d+), (sand|road|grove|water|ore|bridge|ford)(?:, (Allied|Soviet) (.+), (\d+) HP)?$/, (cell, terrain, side, piece, hp) => `${cell}，${zh(terrain)}${side ? '，'+sideNames[side]+zh(piece)+'，生命值 '+hp : ''}`],
  // Orders, construction, tooltips and unit inspection.
  [/^Build (.+) first$/, name => `请先建造${zh(name)}`],
  [/^Need (\d+) more credits$/, n => `还需 ${n} 资金`],
  [/^(Train|Build) ([^,]+), (\d+) credits$/, (verb, name, n) => `${verbs[verb]}${zh(name)}，${n} 资金`],
  [/^(Train|Build|Deploy) (.+)$/, (verb, name) => pieces[name] ? verbs[verb] + pieces[name] : null],
  [/^(\d+) credits$/, n => `${n} 资金`],
  [/^(?:Device charge is|Charge) (\d+) \/ (\d+)$/, (n, max) => `蓄能 ${n}/${max}`],
  [/^(\d+) \/ (\d+) (site )?HP$/, (hp, max, site) => `${site ? '工地耐久' : '生命值'} ${hp}/${max}`],
  [/^(\d+) build ticks? left$/, n => `距完工 ${n} 个己方回合`],
  [/^(\d+) ticks? left$/, n => `还需 ${n} 个己方回合`],
  [/^(\d+) turns?$/, n => `${n} 个己方回合`],
  [/^(\d+)\s*T$/, n => `${n} 回合`],
  [/^(\d+) power draw$/, n => `耗电 ${n}`],
  [/^\+(\d+) power$/, n => `供电 +${n}`],
  [/^Move (\d+)$/, n => `移动 ${n}`],
  [/^Range (\d+(?:[–-]\d+)?)$/, n => `射程 ${n}`],
  [/^Hit (\d+)$/, n => `伤害 ${n}`],
  [/^([−-]\d+) HP$/, n => `${n} 生命`],
  [/^Move to ([A-Z]+\d+) and fire$/, cell => `移至 ${cell} 后开火`],
  [/^Move to ([A-Z]+\d+)$/, cell => `移至 ${cell}`],
  [/^(\d+) \/ (\d+) movement$/, (cost, max) => `移动力 ${cost}/${max}`],
  [/^(\d+) damage$/, n => `${n} 点伤害`],
  [/^(\d+) → (\d+) HP$/, (before, after) => `生命值 ${before} → ${after}`],
  [/^Producer ([A-Z]+\d+)$/, cell => `生产设施位于 ${cell}`],
  [/^Place at ([A-Z]+\d+)$/, cell => `建造位置 ${cell}`],
  [/^Build at ([A-Z]+\d+)$/, cell => `在 ${cell} 建造`],
  [/^(.+) at ([A-Z]+\d+)$/, (name, cell) => pieces[name] ? `${cell} 的${pieces[name]}` : null],
  [/^(.+) ready$/, name => pieces[name] ? `${pieces[name]}已就绪` : null],
  [/^Deploy at ([A-Z]+\d+) for free$/, cell => `免费部署至 ${cell}`],
  [/^Tap an empty hex beside (.+) at ([A-Z]+\d+)$/, (name, cell) => `轻点 ${cell} 的${zh(name)}旁边的空格`],
  [/^Mark ([A-Z]+\d+)$/, cell => `标记 ${cell}`],
  [/^Relocate to ([A-Z]+\d+) and mark it spent$/, cell => `传送至 ${cell}，本回合该单位将无法再次行动`]
];

function whole(text) {
  const fixed = catalog.get(normalize(text));
  if (fixed !== undefined) return fixed;
  const stem = text.replace(/\.$/, '');
  for (const [pattern, format] of formats) {
    const match = pattern.exec(stem);
    if (match) {
      const translated = format(...match.slice(1));
      if (translated != null) return translated;
    }
  }
  return undefined;
}

export function zh(value) {
  if (typeof value !== 'string' || !/[a-z]/i.test(value)) return value;
  const text = value.trim();
  let translated = whole(text);
  if (translated === undefined) {
    // Old inspection panels compose the same short messages with sentence
    // boundaries and middle dots. Keep unmatched labels and hex IDs intact.
    const sentences = text.replace(/\.$/, '').split(/\.\s+/);
    if (sentences.length > 1) {
      translated = sentences.map(part => zh(part).replace(/。$/, '')).join('。');
    } else if (text.includes(' · ')) {
      translated = text.replace(/\.$/, '').split(' · ').map(zh).join(' · ');
    } else {
      return value;
    }
  }
  if (text.endsWith('.') && !/[。！？…]$/.test(translated)) return translated + '。';
  return translated;
}

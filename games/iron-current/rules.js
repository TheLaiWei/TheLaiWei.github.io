// Switchyard Crossing uses point-up hexes. Even-numbered rows are half a hex shorter.
export const WIDTH = 1680;
export const HEIGHT = 964;
export const ROUND_LIMIT = 100;
export const ACTIONS_PER_TURN = 1;
export const ACTION_SPENT = 'Action already spent.';
const DX = 86.7, DY = 71.656;
export const RX = DX / 2, RY = 2 * DY / 3;
export const sides = { US: 'Allied', SU: 'Soviet' };
export const opposite = side => side === 'US' ? 'SU' : 'US';
export const relays = ['J5', 'J9'];
export const fords = ['J1', 'J13'];
export const home = {US:'B7', SU:'R7'};
export const cells = [];
export const map = Object.create(null);
const address = (col, row) => String.fromCharCode(64 + col) + row;
for (let row = 1; row <= 13; row++) {
  const columns = row % 2 ? 19 : 18;
  for (let col = 1; col <= columns; col++) {
    const key = address(col, row);
    const c = { key, col, row, q: col - 1 - Math.floor((row - 1) / 2), r: row - 1,
      x: WIDTH / 2 + (col - (columns + 1) / 2) * DX, y: HEIGHT / 2 + (row - 7) * DY,
      mirror: address(columns + 1 - col, 14 - row), terrain: 'sand', near: [] };
    cells.push(c);
    map[key] = c;
  }
}
export function distance(a, b) {
  const x = map[a], y = map[b];
  return Math.max(Math.abs(x.q-y.q), Math.abs(x.r-y.r), Math.abs(x.q-y.q+x.r-y.r));
}
const mirroredSet = start => new Set(start.flatMap(key => [key, map[key].mirror]));
const groves = mirroredSet(['D3','E3','F4','G6','G10','D10','H8','A1','B2','D2','B5','A8','C11','E12','F1','A12']);
const seams = mirroredSet(['F8','H5','C3','F11','B9','G2']);
for (const c of cells) {
  c.near = cells.filter(n => distance(c.key,n.key) === 1).map(n => n.key);
  if (relays.includes(c.key)) c.terrain = 'bridge';
  else if (fords.includes(c.key)) c.terrain = 'ford';
  else if (c.row % 2 ? c.col === 10 : c.col === 9 || c.col === 10) c.terrain = 'water';
  else if (seams.has(c.key)) c.terrain = 'ore';
  else if (groves.has(c.key)) c.terrain = 'grove';
  else if (([5,9].includes(c.row) && c.col >= 3 && c.col <= 17) ||
           ([1,13].includes(c.row) && c.col >= 8 && c.col <= 12)) c.terrain = 'road';
}
export const terrainNames = {sand:'Open sand',road:'Road',water:'Deep water',ore:'Ore seam',grove:'Grove',bridge:'Bridge relay',ford:'Shallow ford'};
export const structures = ['barracks','generator','refinery','works','turret','lab','device'];
export const units = ['rifle','rocket','light','tank'];
const common = {
  hq: {name:'Construction yard', hp:16, supply:4, note:'Issues building orders and supplies 20 credits per income turn.'},
  generator: {name:'Power plant', cost:60, ticks:1, hp:5, supply:6, needs:'hq', note:'Adds 6 power to the grid.'},
  refinery: {name:'Ore refinery', cost:80, ticks:2, hp:6, power:2, needs:'hq', note:'Earns 30 credits each income turn while online.'},
  barracks: {name:'Barracks', cost:60, ticks:1, hp:6, power:1, needs:'hq', note:'Trains rifle squads and rocket teams.'},
  works: {name:'Motor Works', cost:120, ticks:2, hp:8, power:3, needs:'barracks', note:'Builds your faction’s vehicles.'},
  lab: {name:'Signal Lab', cost:100, ticks:2, hp:6, power:2, needs:'works', note:'An online lab supports the signature device.'},
  rifle: {name:'Rifle squad', cost:35, ticks:1, hp:4, move:3, range:1, hit:2, producer:'barracks', infantry:true, note:'Infantry can capture a bridge relay.'},
  rocket: {name:'Rocket team', cost:55, ticks:1, hp:3, move:2, range:2, hit:2, producer:'barracks', infantry:true, note:'Deals +2 against vehicles. Can capture a relay.'}
};
const faction = {
  US: {
    turret:{name:'Sentry Post',cost:75,ticks:1,hp:5,power:2,needs:'barracks',range:3,hit:3,note:'Deals +1 against infantry.'},
    device:{name:'Vector Gate',cost:160,ticks:3,hp:7,power:4,needs:'lab',note:'At 3 charge, relocate a ready unit within 3 hexes up to 4 hexes.'},
    light:{name:'Scout Car',cost:55,ticks:1,hp:4,move:5,range:2,hit:2,producer:'works',note:'Fast vehicle. Deals +1 against infantry.'},
    tank:{name:'Lancer Tank',cost:90,ticks:2,hp:7,move:3,range:2,hit:3,producer:'works',note:'Mobile armor. Move and fire in the same activation.'}
  },
  SU:{
    turret:{name:'Arc Tower',cost:105,ticks:2,hp:7,power:3,needs:'barracks',range:2,hit:4,note:'Discharges an electrical arc against one target.'},
    device:{name:'Surge Array',cost:160,ticks:3,hp:7,power:4,needs:'lab',note:'At 3 charge, mark a hex within 6. A seven-hex pulse hits all mobile pieces next Soviet upkeep.'},
    light:{name:'Field Gun',cost:85,ticks:2,hp:4,move:2,min:2,range:4,hit:3,producer:'works',note:'Range 2–4. Must stay still to fire.'},
    tank:{name:'Anvil Tank',cost:115,ticks:2,hp:9,move:2,range:2,hit:4,producer:'works',note:'Heavy armor with a powerful direct hit.'}
  }
};
export const spec = (side,kind) => faction[side]?.[kind] || common[kind];
export const at = (g,cell) => g.pieces.find(p => p.cell === cell);
export const byId = (g,id) => g.pieces.find(p => p.id === id);
export const headquartersCell = (g,side=g.side) => g.pieces.find(p=>p.side===side && p.kind==='hq')?.cell || home[side];
export const pieceName = p => spec(p.side,p.kind).name;
export const mobile = p => !!spec(p.side,p.kind).move;
export const footprint = cell => [cell,...map[cell].near];
const completed = (g,side,kind) => g.pieces.filter(p => p.side === side && p.kind === kind && !p.ticks);
const priority = ['refinery','barracks','works','turret','lab','device'];
export function grid(g,side) {
  const own = g.pieces.filter(p => p.side === side && !p.ticks);
  const supply = own.reduce((n,p) => n + (spec(side,p.kind).supply || 0),0);
  const loads = own.filter(p => spec(side,p.kind).power).sort((a,b) =>
    priority.indexOf(a.kind)-priority.indexOf(b.kind) || a.id-b.id);
  const online = new Set(own.filter(p => !spec(side,p.kind).power).map(p => p.id));
  let draw=0, demand=0;
  for (const p of loads) {
    const power=spec(side,p.kind).power;
    demand+=power;
    if (draw+power <= supply) {draw+=power;online.add(p.id);}
  }
  return {supply,draw,demand,online};
}
function place(g, side, kind, cell, ticks=0, id=g.nextId++) {
  const p={id,side,kind,cell,hp:ticks ? 3 : spec(side,kind).hp,ticks,spent:false,queue:null,charge:0};
  g.pieces.push(p);
  return p;
}
export function fresh(first='US') {
  const g={version:3,id:'',revision:0,first,side:first,round:1,phase:'play',orders:ACTIONS_PER_TURN,
    cash:{US:220,SU:220},streak:{US:0,SU:0},pieces:[],nextId:1,pending:[],reserve:[],arrivals:{US:[],SU:[]},turnLog:[],history:[],winner:null,ending:''};
  for (const [cell,kind] of Object.entries({[home.US]:'hq',B8:'generator',B9:'refinery',B6:'rifle',C7:'rifle'})) {
    place(g,'US',kind,cell);place(g,'SU',kind,map[cell].mirror);
  }
  return g;
}
function validMatch(g,version,roundLimit,actionLimit) {
  return !!(g && g.version===version && sides[g.first] && sides[g.side] && ['play','handoff','over'].includes(g.phase) &&
    Number.isInteger(g.round) && g.round>=1 && g.round<=roundLimit &&
    Number.isInteger(g.orders) && g.orders>=0 && g.orders<=actionLimit &&
    Number.isInteger(g.nextId) && Number.isInteger(g.revision) && typeof g.id==='string' && g.cash && g.streak &&
    Number.isFinite(g.cash.US) && Number.isFinite(g.cash.SU) && Array.isArray(g.turnLog) && Array.isArray(g.history) &&
    g.history.every(e=>e && Number.isInteger(e.round) && sides[e.side] && typeof e.msg==='string') &&
    Array.isArray(g.pieces) && g.pieces.every(p=>p && sides[p.side] && spec(p.side,p.kind) && map[p.cell] && p.hp>0) &&
    new Set(g.pieces.map(p=>p.cell)).size===g.pieces.length && Array.isArray(g.reserve) &&
    g.reserve.every(r=>r && sides[r.side] && spec(r.side,r.kind)?.producer && map[r.origin]) &&
    Array.isArray(g.pending) && g.pending.every(mark=>mark && map[mark.cell]) &&
    Array.isArray(g.arrivals?.US) && Array.isArray(g.arrivals?.SU));
}
export const usableSave = g=>validMatch(g,3,ROUND_LIMIT,ACTIONS_PER_TURN);
// The former 13-column map occupies the middle of the expanded battlefield.
function expandLegacyMap(save) {
  if(save?.version!==1 || !Array.isArray(save.pieces))return null;
  const move=key=>address(key.charCodeAt(0)-64+3,Number(key.slice(1))+2);
  const oldCell=key=>typeof key==='string' && /^[A-M][1-9]$/.test(key) &&
    !(key[0]==='M' && Number(key[1])%2===0);
  if(!save.pieces.every(p=>p && oldCell(p.cell)) || (save.pending && !oldCell(save.pending.cell)))return null;
  const g=JSON.parse(JSON.stringify(save));
  const relocateText=s=>String(s||'').replace(/\b[A-M][1-9]\b/g,k=>oldCell(k)?move(k):k);
  g.version=2;g.reserve=[];g.arrivals={US:[],SU:[]};
  g.pieces.forEach(p=>p.cell=move(p.cell));
  g.pending=g.pending?[{...g.pending,cell:move(g.pending.cell)}]:[];
  if(!validMatch(g,2,16,2))return null;
  g.turnLog=g.turnLog.map(relocateText);
  g.history.forEach(e=>{e.msg=relocateText(e.msg);});
  g.ending=relocateText(g.ending);
  for(const p of g.pieces)if(p.queue && p.queue.ticks===0)stockFinishedUnit(g,p);
  return g;
}
export function importLegacy(save) {
  const old=save?.version===1?expandLegacyMap(save):save;
  if(!validMatch(old,2,16,2))return null;
  const g=JSON.parse(JSON.stringify(old));
  // In older matches purchases and field orders were accounted for separately.
  const purchased=g.req===false || g.turnLog.some(line=>/ (?:started at [A-S]\d+\.|ordered at [A-S]\d+\.)/.test(line));
  g.orders=g.orders===2 && !purchased?ACTIONS_PER_TURN:0;
  g.version=3;delete g.req;
  if(g.revision===0 && g.round===1 && g.phase==='play' && g.orders && !g.history.length && g.pieces.length===10){
    const starts={E7:home.US,E8:'B8',F8:'B9',E6:'B6',F7:'C7'};
    const west=p=>p.side==='US'?p.cell:map[p.cell].mirror;
    if(g.pieces.every(p=>starts[west(p)]))for(const p of g.pieces){
      const cell=starts[west(p)];p.cell=p.side==='US'?cell:map[cell].mirror;
    }
  }
  if(g.phase==='over' && g.round===16 && [
    'More bridge relays held at the round limit.',
    'Relay count tied. Remaining HQ health decided the match.',
    'Relay count and HQ health were tied after round 16.'
  ].includes(g.ending)){
    // The second commander already ended round 16. The normal handoff opens 17.
    g.phase='handoff';g.orders=0;g.winner=null;g.ending='';
    log(g,'Round limit extended to '+ROUND_LIMIT+'. The next round is 17.');
  }
  if(g.phase==='play' && g.reserve.length)releaseReserves(g,[]);
  return g;
}
export function paths(g,p) {
  const found=new Map([[p.cell,{cost:0,route:[p.cell]}]]);
  const speed=spec(p.side,p.kind).move || 0, occupied=new Set(g.pieces.filter(o=>o.id!==p.id).map(o=>o.cell));
  const queue=[p.cell];
  while(queue.length) {
    queue.sort((a,b)=>found.get(a).cost-found.get(b).cost);
    const cell=queue.shift(), step=found.get(cell);
    for (const next of map[cell].near) {
      const t=map[next].terrain, cost=step.cost+(t==='grove'?2:1);
      if (t==='water' || occupied.has(next) || cost>speed || (found.get(next)?.cost??Infinity)<=cost) continue;
      found.set(next,{cost,route:[...step.route,next]});queue.push(next);
    }
  }
  return found;
}
export function damage(p,target) {
  const a=spec(p.side,p.kind), b=spec(target.side,target.kind);
  const bonus=(p.kind==='rocket' && b.move && !b.infantry) ? 2 :
    (p.side==='US' && ['light','turret'].includes(p.kind) && b.infantry) ? 1 : 0;
  return Math.max(1,a.hit+bonus-(b.infantry && map[target.cell].terrain==='grove' ? 1 : 0));
}
export function canHit(p,from,target) {
  if (!target || target.side===p.side || (p.side==='SU' && p.kind==='light' && from!==p.cell)) return false;
  const t=spec(p.side,p.kind), n=distance(from,target.cell);
  return !!t.hit && n>=(t.min||1) && n<=t.range;
}
export function activationReason(g,p) {
  if (g.phase!=='play' || !p || p.side!==g.side) return 'Choose one of your own pieces.';
  if (!g.orders) return ACTION_SPENT;
  if (p.ticks) return 'Construction is still in progress.';
  if (!mobile(p) && !['turret','device'].includes(p.kind)) return 'Choose a unit, defense or charged device.';
  if (!grid(g,p.side).online.has(p.id)) return 'This facility needs more power.';
  if (p.spent) return 'This piece has already activated this turn.';
  if (p.kind==='device') {
    if (!labOnline(g,p.side)) return 'Bring a Signal Lab online.';
    if (p.charge<3) return 'Device charge is '+p.charge+' / 3.';
  }
  return '';
}
function labOnline(g,side) {
  const powered=grid(g,side).online;
  return completed(g,side,'lab').some(p=>powered.has(p.id));
}
export function placements(g,kind) {
  const own=g.pieces.filter(p=>p.side===g.side && !p.ticks);
  const anchors=own.filter(p=>kind==='refinery' ? spec(p.side,p.kind).infantry : !mobile(p));
  const terrain=kind==='refinery' ? 'ore' : 'sand';
  return new Set(anchors.flatMap(p=>map[p.cell].near).filter(k=>map[k].terrain===terrain && !at(g,k)));
}
export function producers(g,kind) {
  const t=spec(g.side,kind), online=grid(g,g.side).online;
  return completed(g,g.side,t.producer).filter(p=>!p.queue && online.has(p.id));
}
export function purchaseReason(g,kind) {
  const t=spec(g.side,kind);
  if (!t?.cost || g.phase!=='play') return 'Production is unavailable.';
  if (!g.orders) return ACTION_SPENT;
  if (t.producer) {
    if (!completed(g,g.side,t.producer).length) return 'Build '+spec(g.side,t.producer).name+' first.';
    if (!producers(g,kind).length) return 'Your producers are busy or offline.';
  } else {
    if (!completed(g,g.side,t.needs).length) return 'Build '+spec(g.side,t.needs).name+' first.';
    if (kind==='device' && !labOnline(g,g.side)) return 'Bring a Signal Lab online.';
    if (!placements(g,kind).size) return kind==='refinery' ? 'Move infantry next to an empty ore seam.' : 'No legal site beside your base.';
  }
  if (g.cash[g.side]<t.cost) return 'Need '+(t.cost-g.cash[g.side])+' more credits.';
  return '';
}
// A factory can marshal a unit through friendly occupied ground, up to three
// hexes. Enemy pieces and the river, including its crossings, stop deployment.
export function rallyExits(g,base) {
  const occupied=new Map(g.pieces.map(p=>[p.cell,p]));
  const seen=new Set([base.cell]);
  let frontier=[base.cell];
  for(let ring=1;ring<=3 && frontier.length;ring++){
    const friendly=[],open=[];
    for(const k of frontier)for(const next of map[k].near){
      if(seen.has(next))continue;
      seen.add(next);
      if(['water','bridge','ford'].includes(map[next].terrain))continue;
      const p=occupied.get(next);
      if(!p)open.push(next);
      else if(p.side===base.side)friendly.push(next);
    }
    if(open.length){
      // Use the same forward-facing preference on the mirrored starting sides.
      const oriented=k=>map[base.side==='US'?k:map[k].mirror];
      return open.sort((a,b)=>oriented(b).x-oriented(a).x||oriented(a).y-oriented(b).y);
    }
    frontier=friendly;
  }
  return [];
}
function stockFinishedUnit(g,producer){
  const unit={id:g.nextId++,kind:producer.queue.kind,side:producer.side,origin:producer.cell,producerId:producer.id};
  producer.queue=null;g.reserve.push(unit);return unit;
}
function rememberArrival(g,p){
  g.arrivals[p.side].push({id:p.id,kind:p.kind,cell:p.cell});
}
function releaseReserves(g,events){
  const held=[];
  for(const unit of g.reserve){
    if(unit.side!==g.side){held.push(unit);continue;}
    const bases=completed(g,unit.side,spec(unit.side,unit.kind).producer);
    const origin=byId(g,unit.producerId);
    if(origin)bases.sort((a,b)=>Number(b.id===origin.id)-Number(a.id===origin.id));
    else if(!bases.length)bases.push(...completed(g,unit.side,'hq'));
    let exit;
    for(const base of bases){exit=rallyExits(g,base)[0];if(exit)break;}
    if(!exit){
      if(!unit.announced){log(g,spec(unit.side,unit.kind).name+' ready at '+unit.origin+'. Exits blocked; holding in reserve.');unit.announced=true;}
      held.push(unit);continue;
    }
    const p=place(g,unit.side,unit.kind,exit,0,unit.id);
    rememberArrival(g,p);
    log(g,pieceName(p)+' deployed at '+exit+'. '+(g.orders?'Ready to act.':'Can act next turn.'));
    events.push({type:'ready',cell:exit,unit:p.id});
  }
  g.reserve=held;
}
export function gateUnits(g,gate) {
  return g.pieces.filter(p=>p.side===gate.side && mobile(p) && !p.spent && distance(gate.cell,p.cell)<=3);
}
export function landings(g,p) {
  return cells.filter(c=>c.terrain!=='water' && distance(p.cell,c.key)<=4 && !at(g,c.key)).map(c=>c.key);
}
export function relaySide(g,key) {
  const p=at(g,key);
  return p && spec(p.side,p.kind).infantry ? p.side : null;
}
function log(g,msg) {
  g.turnLog.push(msg);
  g.history.push({side:g.side,round:g.round,msg});
  if (g.history.length>90) g.history.shift();
}
function requireOrder(test,msg) { if (!test) throw new Error(msg); }
function finish(g,winner,reason) {g.phase='over';g.winner=winner;g.ending=reason;}
function hit(g,target,n,events,sourceId,style) {
  const before=target.hp;
  target.hp=Math.max(0,target.hp-n);
  events.push({type:'hit',style,sourceId,target:{...target},before,after:target.hp});
  log(g,pieceName(target)+' at '+target.cell+' took '+Math.min(before,n)+' damage. '+(target.hp?target.hp+' HP left.':'Destroyed.'));
  if (!target.hp) {
    g.pieces=g.pieces.filter(p=>p.id!==target.id);
    if (target.kind==='hq') finish(g,opposite(target.side),'The enemy construction yard was destroyed.');
  }
}
function field(g,cmd,events) {
  const p=byId(g,cmd.id);
  const why=activationReason(g,p);requireOrder(!why,why);
  requireOrder(p.kind!=='device','Use the device command.');
  const to=cmd.to || p.cell, path=paths(g,p).get(to);
  requireOrder(path,'Choose a reachable, empty hex.');
  const enemy=cmd.target==null ? null : byId(g,cmd.target);
  if (cmd.target!=null) requireOrder(canHit(p,to,enemy),'That target is outside the firing solution.');
  requireOrder(to!==p.cell || enemy,'Choose a destination or an enemy target.');
  p.spent=true;
  const aim=enemy?.cell || to, origin=enemy ? to : (path.route.at(-2) || p.cell);
  const dx=map[aim].x-map[origin].x;
  if(dx && mobile(p)) p.flip=p.side==='US'?dx<0:dx>0;
  if (to!==p.cell) {
    events.push({type:'move',id:p.id,route:path.route});log(g,pieceName(p)+' moved from '+p.cell+' to '+to+'.');p.cell=to;
  }
  if (enemy) {
    const style=p.kind==='turret'&&p.side==='SU'?'arc':p.kind==='rifle'||p.kind==='light'&&p.side==='US'?'burst':p.kind==='rocket'?'rocket':'cannon';
    hit(g,enemy,damage(p,enemy),events,p.id,style);
  }
}
function purchase(g,cmd,events) {
  const why=purchaseReason(g,cmd.kind);requireOrder(!why,why);
  const t=spec(g.side,cmd.kind);
  if (t.producer) {
    const p=producers(g,cmd.kind).find(p=>p.id===cmd.id);
    requireOrder(p,'Choose an available producer.');p.queue={kind:cmd.kind,ticks:t.ticks};
    log(g,t.name+' ordered at '+p.cell+'. Ready in '+t.ticks+' owner turn'+(t.ticks===1?'':'s')+'.');
    events.push({type:'order',cell:p.cell});
  } else {
    requireOrder(placements(g,cmd.kind).has(cmd.cell),'Choose a highlighted construction site.');
    place(g,g.side,cmd.kind,cmd.cell,t.ticks);
    log(g,t.name+' started at '+cmd.cell+'.');events.push({type:'build',cell:cmd.cell});
  }
  g.cash[g.side]-=t.cost;
}
function special(g,cmd,events) {
  const p=byId(g,cmd.id), why=activationReason(g,p);requireOrder(!why,why);
  requireOrder(p.kind==='device','Choose a signature facility.');
  if (p.side==='US') {
    const u=gateUnits(g,p).find(v=>v.id===cmd.unit);
    requireOrder(u && landings(g,u).includes(cmd.cell),'Select a ready unit and a legal landing hex.');
    events.push({type:'jump',id:u.id,from:u.cell,to:cmd.cell});u.cell=cmd.cell;u.spent=true;
    log(g,'Vector Gate relocated '+pieceName(u)+' to '+u.cell+'.');
  } else {
    requireOrder(map[cmd.cell] && map[cmd.cell].terrain!=='water' && distance(p.cell,cmd.cell)<=6,'Mark land or a bridge within 6 hexes.');
    g.pending.push({source:p.id,cell:cmd.cell});events.push({type:'mark',cell:cmd.cell});
    log(g,'Surge Array marked '+cmd.cell+'. Impact at the next Soviet upkeep.');
  }
  p.spent=true;p.charge=0;
}
function end(g) {
  if (g.side!==g.first) {
    const owners=relays.map(k=>relaySide(g,k));
    for (const s of ['US','SU']) {
      g.streak[s]=owners.every(o=>o===s)?g.streak[s]+1:0;
      if (g.streak[s]>=2) return finish(g,s,'Infantry held both bridge relays for two consecutive round ends.');
    }
    if (g.round===ROUND_LIMIT) {
      const diff=owners.filter(s=>s==='US').length-owners.filter(s=>s==='SU').length;
      const hp=s=>completed(g,s,'hq')[0]?.hp||0;
      const score=diff||hp('US')-hp('SU');
      return finish(g,score>0?'US':score<0?'SU':null,diff?'More bridge relays held at the round limit.':score?'Relay count tied. Remaining HQ health decided the match.':'Relay count and HQ health were tied after round '+ROUND_LIMIT+'.');
    }
  }
  g.phase='handoff';
}
function upkeep(g,events) {
  requireOrder(g.phase==='handoff','This turn has already begun.');
  g.side=opposite(g.side);
  if (g.side===g.first) g.round++;
  g.phase='play';g.orders=ACTIONS_PER_TURN;g.turnLog=[];g.arrivals[g.side]=[];
  const own=()=>g.pieces.filter(p=>p.side===g.side);
  own().forEach(p=>p.spent=false);
  if (g.side==='SU') for(const {source,cell} of g.pending.splice(0)){
    if (grid(g,'SU').online.has(source) && labOnline(g,'SU')) {
      const area=footprint(cell);events.push({type:'pulse',cell});log(g,'Surge discharged at '+cell+'.');
      for (const p of [...g.pieces]) if (mobile(p) && area.includes(p.cell)) hit(g,p,3,events,source,'pulse');
    } else log(g,'The marked surge fizzled. Its array or lab was offline.');
  }
  const finished=new Set();
  for (const p of own()) {
    if (p.ticks && --p.ticks===0) {
      p.hp=spec(p.side,p.kind).hp;finished.add(p.id);rememberArrival(g,p);log(g,pieceName(p)+' completed at '+p.cell+'.');
      events.push({type:'ready',cell:p.cell});
    }
  }
  const power=grid(g,g.side), lab=labOnline(g,g.side);
  let income=20;
  for (const p of own()) {
    if (!power.online.has(p.id)) continue;
    if (p.kind==='refinery') income+=30;
    if (p.queue?.ticks && --p.queue.ticks===0)stockFinishedUnit(g,p);
    if (p.kind==='device' && lab && !finished.has(p.id)) p.charge=Math.min(3,p.charge+1);
  }
  if (g.round>1) {g.cash[g.side]+=income;log(g,'Collected '+income+' credits.');}
  if (g.reserve.length) releaseReserves(g,events);
}
// Older saves can be parked either before round scoring or after it.
export function resumeTurn(g) {
  if (g.phase==='play' && g.orders===0) return apply(g,{type:'end'}).state;
  if (g.phase!=='handoff') return g;
  const next=structuredClone(g);
  upkeep(next,[]);
  next.revision++;
  return next;
}

// A confirmed order, round scoring and the next player's upkeep share one save.
export function apply(g,cmd) {
  requireOrder(g.phase==='play','Orders are unavailable.');
  const next=structuredClone(g), events=[], upkeepEvents=[];
  if (cmd.type==='end') next.orders=0;
  else {
    requireOrder(next.orders>0,ACTION_SPENT);
    switch(cmd.type) {
      case 'field': field(next,cmd,events);break;
      case 'buy': purchase(next,cmd,events);break;
      case 'special': special(next,cmd,events);break;
      default: throw new Error('Unknown order.');
    }
    next.orders--;
    if(next.phase==='play' && next.reserve.length)releaseReserves(next,events);
  }
  const outgoing=events.length?structuredClone(next):null;
  if(next.phase==='play')end(next);
  if(next.phase==='handoff')upkeep(next,upkeepEvents);
  next.revision++;
  return {state:next,outgoing,events,upkeepEvents};
}

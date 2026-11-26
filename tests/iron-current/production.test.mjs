import test from 'node:test';
import assert from 'node:assert/strict';
import {apply,at,byId,cells,distance,fords,fresh,grid,home,importLegacy,map,paths,placements,rallyExits,relays,spec,usableSave} from '../../games/iron-current/rules.js';
import {zh} from '../../games/iron-current/zh.js';

const run=(g,command)=>apply(g,command).state;
const pass=g=>run(run(g,{type:'end'}),{type:'begin'});
const nextTurn=g=>pass(pass(g));
const build=(g,kind)=>run(g,{type:'buy',kind,cell:[...placements(g,kind)][0]});
function add(g,side,kind,cell){
  assert.equal(at(g,cell),undefined);
  const p={id:g.nextId++,side,kind,cell,hp:spec(side,kind).hp,ticks:0,spent:false,queue:null,charge:0};
  g.pieces.push(p);return p;
}
function siegeFixture(radius,side='US'){
  const g=fresh(side),origin=side==='US'?'D7':map.D7.mirror;
  const factory=add(g,side,'works',origin);
  factory.queue={kind:'tank',ticks:1};
  for(const c of cells){
    if(distance(c.key,origin)<=radius && !['water','ford','bridge'].includes(c.terrain) && !at(g,c.key))add(g,side,'rifle',c.key);
  }
  return {g,factory};
}

test('241 mirrored hexes, two scoring bridges and two passable outer fords',()=>{
  assert.equal(cells.length,241);
  for(const c of cells){
    assert.equal(map[c.mirror].terrain,c.terrain);
    assert.deepEqual(new Set(c.near.map(k=>map[k].mirror)),new Set(map[c.mirror].near));
  }
  function crosses(available){
    const seen=new Set([home.US]),queue=[home.US];
    for(let i=0;i<queue.length;i++)for(const k of map[queue[i]].near){
      if(seen.has(k)||map[k].terrain==='water'||([...relays,...fords].includes(k)&&k!==available))continue;
      seen.add(k);queue.push(k);
    }
    return seen.has(home.SU);
  }
  assert.equal(crosses(null),false);
  for(const k of [...relays,...fords])assert.ok(crosses(k));
});

test('either side can fund independent duplicate builds and train at each producer in the same turn',()=>{
  for(const side of ['US','SU']){
    let g=fresh(side);
    for(let i=0;i<2;i++)g=build(g,'barracks');
    assert.equal(g.cash[side],100);assert.equal(g.pieces.filter(p=>p.ticks).length,2);
    const before=JSON.stringify(g);
    assert.throws(()=>run(g,{type:'buy',kind:'barracks',cell:home[side]}));
    assert.equal(JSON.stringify(g),before);
    g=nextTurn(g);
    const makers=g.pieces.filter(p=>p.side===side&&p.kind==='barracks');
    assert.ok(makers.every(p=>!p.ticks));
    for(const p of makers)g=run(g,{type:'buy',kind:'rocket',id:p.id});
    assert.equal(g.cash[side],40);assert.equal(g.orders,2);
    assert.equal(g.pieces.filter(p=>p.queue).length,2);
    g=nextTurn(g);
    const units=g.pieces.filter(p=>p.side===side&&p.kind==='rocket');
    assert.equal(units.length,2);assert.equal(new Set(units.map(p=>p.cell)).size,2);
    assert.ok(units.every(p=>!p.spent));assert.equal(g.arrivals[side].length,2);
    assert.ok(g.pieces.every(p=>!p.queue));assert.ok(usableSave(g));
  }
});

test('a tank deploys on the closest open ring even when all six adjacent hexes are occupied',()=>{
  for(const side of ['US','SU']){
    const {g,factory}=siegeFixture(1,side);
    const expect=rallyExits(g,factory);assert.ok(expect.length);
    assert.ok(expect.every(k=>distance(factory.cell,k)===2));
    const done=nextTurn(g),tank=done.pieces.find(p=>p.kind==='tank'&&p.side===side);
    assert.equal(tank.cell,expect[0]);assert.equal(tank.spent,false);
    assert.equal(done.reserve.length,0);assert.equal(byId(done,factory.id).queue,null);
    assert.equal(done.orders,2);assert.ok(done.arrivals[side].some(a=>a.id===tank.id));
  }
});

test('a fully surrounded factory frees its queue and keeps its tank across reloads until an exit opens',()=>{
  const f=siegeFixture(3);let g=nextTurn(f.g);
  assert.equal(g.reserve.length,1);const ticket=g.reserve[0].id;
  assert.equal(byId(g,f.factory.id).queue,null);assert.equal(g.reserve[0].origin,f.factory.cell);
  assert.ok(g.turnLog.some(s=>s.includes('reserve')));
  g=JSON.parse(JSON.stringify(g));assert.ok(usableSave(g));
  const extra=run(g,{type:'buy',kind:'tank',id:f.factory.id});
  assert.equal(extra.reserve.length,1);assert.equal(byId(extra,f.factory.id).queue.kind,'tank');
  const rifle=g.pieces.find(p=>p.side==='US'&&p.kind==='rifle'&&distance(p.cell,f.factory.cell)===3&&[...paths(g,p)].some(([k])=>distance(k,f.factory.cell)>3));
  const vacant=rifle.cell;
  const to=[...paths(g,rifle).keys()].find(k=>distance(k,f.factory.cell)>3);
  g=run(g,{type:'field',id:rifle.id,to});
  assert.equal(g.reserve.length,0);assert.equal(at(g,vacant).id,ticket);
  assert.equal(at(g,vacant).kind,'tank');assert.equal(g.orders,1);
  assert.equal(g.history.filter(e=>e.msg.includes('holding in reserve')).length,1);
  g=nextTurn(g);assert.equal(g.pieces.filter(p=>p.id===ticket).length,1);
});

test('reinforcements cannot emerge through an enemy screen or across water',()=>{
  const g=fresh();const factory=add(g,'US','works','I5');
  for(const k of map[factory.cell].near)if(!at(g,k)&&!['water','bridge','ford'].includes(map[k].terrain))add(g,'SU','rifle',k);
  assert.deepEqual(rallyExits(g,factory),[]);
});

test('reserve tanks can use another factory or survive the destruction of their last factory',()=>{
  const {g:setup,factory}=siegeFixture(3);
  const waiting=nextTurn(setup),ticket=waiting.reserve[0].id;
  const withFactory=structuredClone(waiting);
  const other=add(withFactory,'US','works','H3');
  const expected=rallyExits(withFactory,other)[0];
  const fromOther=build(withFactory,'generator');
  assert.equal(byId(fromOther,ticket).cell,expected);
  assert.equal(fromOther.reserve.length,0);

  let g=pass(waiting);
  g.pieces=g.pieces.filter(p=>p.cell!=='D5');
  const attacker=add(g,'SU','tank','D5');
  byId(g,factory.id).hp=1;
  g=run(g,{type:'field',id:attacker.id,target:factory.id});
  assert.equal(byId(g,factory.id),undefined);
  assert.equal(g.reserve[0].id,ticket);
  const nearHQ=rallyExits(g,at(g,home.US))[0];
  g=pass(g);
  assert.equal(byId(g,ticket).cell,nearHQ);
  assert.equal(g.reserve.length,0);
});

test('low power pauses production and completed vehicles deploy when power returns',()=>{
  let g=fresh();const factory=add(g,'US','works','D7');factory.queue={kind:'tank',ticks:1};
  g.pieces=g.pieces.filter(p=>p.side!=='US'||p.kind!=='generator');
  assert.ok(!grid(g,'US').online.has(factory.id));
  g=nextTurn(g);assert.equal(byId(g,factory.id).queue.ticks,1);assert.equal(g.reserve.length,0);
  g=build(g,'generator');g=nextTurn(g);
  assert.equal(byId(g,factory.id).queue,null);assert.ok(g.pieces.some(p=>p.side==='US'&&p.kind==='tank'));
});

test('multiple Soviet arrays keep separate targets and resolve each mark',()=>{
  let g=fresh('SU');g.cash.SU=2000;
  for(const k of ['D7','B7'])add(g,'SU','generator',k);
  add(g,'SU','lab','N5');add(g,'SU','works','M7');
  g=build(g,'device');g=build(g,'device');
  assert.equal(g.pieces.filter(p=>p.side==='SU'&&p.kind==='device').length,2);
  for(let i=0;i<6;i++)g=nextTurn(g);
  const devices=g.pieces.filter(p=>p.side==='SU'&&p.kind==='device');assert.ok(devices.every(p=>p.charge===3));
  for(const d of devices)g=run(g,{type:'special',id:d.id,cell:d.cell});
  assert.equal(g.pending.length,2);g=nextTurn(g);
  assert.equal(g.pending.length,0);assert.equal(g.history.filter(e=>e.msg.includes('Surge discharged')).length,2);
});

test('old saves retain units, queues, income, bridge streaks, marks and reports at shifted coordinates',()=>{
  const old=fresh('US');old.version=1;old.req=false;old.id='saved-match';old.round=5;old.orders=1;old.cash.US=130;old.streak.US=1;
  for(const p of old.pieces){const c=map[p.cell];p.cell=String.fromCharCode(64+c.col-3)+(c.row-2);}
  old.pieces.push({id:old.nextId++,side:'US',kind:'works',cell:'A5',hp:8,ticks:0,queue:{kind:'tank',ticks:0},spent:false,charge:0});
  old.pieces.push({id:old.nextId++,side:'SU',kind:'works',cell:'M5',hp:8,ticks:0,queue:{kind:'tank',ticks:1},spent:false,charge:0});
  old.pending={source:44,cell:'G3'};old.turnLog=['Rifle squad moved from B4 to D3.'];
  old.history=[{side:'US',round:4,msg:old.turnLog[0]}];delete old.reserve;delete old.arrivals;
  const g=importLegacy(old);assert.ok(usableSave(g));assert.equal(g.id,old.id);assert.equal(g.cash.US,130);
  assert.equal(g.orders,1);assert.equal(g.streak.US,1);assert.equal(g.pending[0].cell,'J5');
  assert.equal(g.history[0].msg,'Rifle squad moved from E6 to G5.');
  assert.ok(g.pieces.some(p=>p.kind==='tank'&&p.side==='US'));assert.equal(at(g,'P7').queue.ticks,1);
  assert.equal(old.version,1);assert.equal(old.pieces.at(-2).queue.ticks,0);
  assert.equal(importLegacy({...old,pieces:[{cell:'M2'}]}),null);
});

test('Chinese preserves event meaning and coordinates across language switches',()=>{
  assert.match(zh('Lancer Tank ready at D7. Exits blocked; holding in reserve.'),/D7.*长枪坦克.*后备/);
  assert.match(zh('R3 SU · Anvil Tank deployed at O8. Ready to act.'),/^第 3 轮 苏军 · 铁砧坦克.*O8/);
  assert.equal(zh('R1 US · Barracks started at D6.'),'第 1 轮 盟军 · D6 的兵营开始施工。');
  assert.match(zh('Train Rifle squad, 35 credits'),/步枪小队.*35/);
});

test('both opening factions can win by moving infantry to the two bridges on the expanded map',()=>{
  for(const side of ['US','SU']){
    let g=fresh(side);
    const infantry=g.pieces.filter(p=>p.side===side && p.kind==='rifle');
    const targets=side==='US'?relays:[...relays].reverse();
    while(g.phase!=='over'){
      if(g.side===side){
        for(const [i,squad] of infantry.entries()){
          const p=byId(g,squad.id),target=targets[i];
          if(p.cell===target)continue;
          const choices=[...paths(g,p)].filter(([k])=>k!==p.cell);
          choices.sort(([a,pa],[b,pb])=>distance(a,target)-distance(b,target)||pa.cost-pb.cost);
          g=run(g,{type:'field',id:p.id,to:choices[0][0]});
        }
      }
      g=run(g,{type:'end'});
      if(g.phase==='handoff')g=run(g,{type:'begin'});
    }
    assert.equal(g.winner,side);assert.equal(g.streak[side],2);
    assert.ok(g.round<16);
  }
});

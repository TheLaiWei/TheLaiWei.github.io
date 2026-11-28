import test from 'node:test';
import assert from 'node:assert/strict';
import {ROUND_LIMIT,apply,at,byId,cells,distance,fords,fresh,grid,headquartersCell,home,importLegacy,map,opposite,paths,placements,purchaseReason,rallyExits,relays,resumeTurn,spec,usableSave} from '../../games/iron-current/rules.js';
import {zh} from '../../games/iron-current/zh.js';

const run=(g,command)=>apply(g,command).state;
const pass=g=>run(g,{type:'end'});
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

function previousOpening(first='US'){
  const g=fresh(first);
  const old={B7:'E7',B8:'E8',B9:'F8',B6:'E6',C7:'F7'};
  for(const p of g.pieces){
    const west=old[p.side==='US'?p.cell:map[p.cell].mirror];
    p.cell=p.side==='US'?west:map[west].mirror;
  }
  g.version=2;g.orders=2;g.id='previous-match';return g;
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

test('new headquarters and their powered starting buildings are mirrored near opposite edges',()=>{
  const g=fresh();
  assert.equal(headquartersCell(g,'US'),'B7');assert.equal(headquartersCell(g,'SU'),'R7');
  assert.equal(distance(home.US,home.SU),16);
  for(const p of g.pieces.filter(p=>p.side==='US')){
    assert.ok(map[p.cell].col<=3);
    const other=at(g,map[p.cell].mirror);
    assert.equal(other.side,'SU');assert.equal(other.kind,p.kind);
    assert.ok(grid(g,p.side).online.has(p.id));
    assert.equal(map[p.cell].terrain,p.kind==='refinery'?'ore':'sand');
  }
  for(const side of ['US','SU'])assert.ok(placements(fresh(side),'barracks').size>=3);
});

test('a move, build or training order immediately starts the opposing turn for either side',()=>{
  for(const side of ['US','SU']){
    let g=fresh(side);
    const rifle=g.pieces.find(p=>p.side===side && p.kind==='rifle');
    const to=[...paths(g,rifle).keys()].find(k=>k!==rifle.cell);
    const move={type:'field',id:rifle.id,to};
    const opening=structuredClone(g);
    assert.throws(()=>run(g,{type:'buy',kind:'barracks',cell:home[side]}));
    assert.throws(()=>run(g,{...move,to:home[side]}));
    assert.deepEqual(g,opening);
    const moved=run(g,move);
    assert.equal(moved.side,opposite(side));assert.equal(moved.phase,'play');assert.equal(moved.orders,1);
    assert.equal(moved.cash[side],220);assert.equal(byId(moved,rifle.id).cell,to);assert.equal(moved.revision,1);
    assert.throws(()=>run(moved,move),/own pieces/);
    g=build(g,'barracks');
    assert.equal(g.side,opposite(side));assert.equal(g.orders,1);assert.equal(g.cash[side],160);
    assert.throws(()=>run(g,move),/own pieces/);
    g=build(g,'generator');const producer=g.pieces.find(p=>p.side===side&&p.kind==='barracks');
    assert.equal(g.side,side);assert.equal(g.round,2);
    assert.equal(producer.ticks,0);assert.equal(g.orders,1);
    g=run(g,{type:'buy',kind:'rifle',id:producer.id});
    assert.equal(g.side,opposite(side));assert.equal(g.orders,1);assert.throws(()=>run(g,move),/own pieces/);
    const loaded=JSON.parse(JSON.stringify(g));
    assert.strictEqual(resumeTurn(loaded),loaded);
    g=pass(loaded);assert.equal(g.orders,1);assert.equal(g.arrivals[side].length,1);
    assert.ok(usableSave(g));assert.equal(g.cash[side],225);
  }
});

test('duplicate factories can be built on successive turns and run overlapping paid orders',()=>{
  for(const side of ['US','SU']){
    let g=fresh(side);g.cash[side]=1000;
    add(g,side,'barracks',side==='US'?'B5':map.B5.mirror);
    g=build(g,'works');g=pass(g);
    assert.equal(g.pieces.find(p=>p.kind==='works').ticks,1);
    g=build(g,'works');assert.equal(g.pieces.filter(p=>p.kind==='works' && p.ticks).length,2);
    g=pass(g);
    const [a,b]=g.pieces.filter(p=>p.kind==='works');
    g=run(g,{type:'buy',kind:'tank',id:a.id});
    assert.equal(g.side,opposite(side));assert.throws(()=>run(g,{type:'buy',kind:'tank',id:b.id}));
    g=pass(g);g=run(g,{type:'buy',kind:'tank',id:b.id});
    assert.equal(g.pieces.filter(p=>p.queue).length,2);
    g=pass(g);assert.equal(g.arrivals[side].length,1);
    g=nextTurn(g);assert.equal(g.arrivals[side].length,1);
    const tanks=g.pieces.filter(p=>p.side===side && p.kind==='tank');
    assert.equal(tanks.length,2);assert.notEqual(tanks[0].cell,tanks[1].cell);
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
    assert.equal(done.orders,1);assert.ok(done.arrivals[side].some(a=>a.id===tank.id));
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
  assert.equal(at(g,vacant).kind,'tank');assert.equal(g.side,'SU');assert.equal(g.orders,1);
  assert.match(g.history.findLast(e=>e.side==='US').msg,/Can act next turn/);
  assert.equal(g.history.filter(e=>e.msg.includes('holding in reserve')).length,1);
  g=pass(g);assert.equal(g.pieces.filter(p=>p.id===ticket).length,1);
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
  const strike=apply(g,{type:'field',id:attacker.id,target:factory.id});
  assert.equal(byId(strike.outgoing,factory.id),undefined);
  assert.equal(strike.outgoing.reserve[0].id,ticket);
  const nearHQ=rallyExits(strike.outgoing,at(strike.outgoing,home.US))[0];
  g=strike.state;assert.equal(g.side,'US');
  assert.ok(strike.events.some(e=>e.type==='hit'));
  assert.ok(strike.upkeepEvents.some(e=>e.type==='ready' && e.unit===ticket));
  assert.equal(byId(g,ticket).cell,nearHQ);
  assert.equal(g.reserve.length,0);
});

test('low power pauses production and completed vehicles deploy when power returns',()=>{
  let g=fresh();const factory=add(g,'US','works','D7');factory.queue={kind:'tank',ticks:1};
  g.pieces=g.pieces.filter(p=>p.side!=='US'||p.kind!=='generator');
  assert.ok(!grid(g,'US').online.has(factory.id));
  g=nextTurn(g);assert.equal(byId(g,factory.id).queue.ticks,1);assert.equal(g.reserve.length,0);
  g=build(g,'generator');g=pass(g);
  assert.equal(byId(g,factory.id).queue,null);assert.ok(g.pieces.some(p=>p.side==='US'&&p.kind==='tank'));
});

test('multiple Soviet arrays can launch on separate turns and each launch consumes the one action',()=>{
  let g=fresh('SU');g.cash.SU=2000;
  for(const k of ['P8','P6'])add(g,'SU','generator',k);
  add(g,'SU','lab','N5');add(g,'SU','works','M7');
  g=build(g,'device');g=pass(g);g=build(g,'device');
  assert.equal(g.pieces.filter(p=>p.side==='SU'&&p.kind==='device').length,2);
  g=pass(g);for(let i=0;i<6;i++)g=nextTurn(g);
  const devices=g.pieces.filter(p=>p.side==='SU'&&p.kind==='device');assert.ok(devices.every(p=>p.charge===3));
  for(const d of devices){
    g=run(g,{type:'special',id:d.id,cell:d.cell});
    assert.equal(g.side,'US');assert.equal(g.orders,1);assert.equal(g.pending.length,1);
    assert.throws(()=>run(g,{type:'special',id:devices[1].id,cell:d.cell}),/own pieces/);
    g=pass(g);
  }
  assert.equal(g.pending.length,0);assert.equal(g.history.filter(e=>e.msg.includes('Surge discharged')).length,2);
});

test('old saves retain units, queues, income, bridge streaks, marks and reports at shifted coordinates',()=>{
  const old=previousOpening();old.version=1;old.req=false;old.id='saved-match';old.round=5;old.orders=1;old.cash.US=130;old.streak.US=1;
  for(const p of old.pieces){const c=map[p.cell];p.cell=String.fromCharCode(64+c.col-3)+(c.row-2);}
  old.pieces.push({id:old.nextId++,side:'US',kind:'works',cell:'A5',hp:8,ticks:0,queue:{kind:'tank',ticks:0},spent:false,charge:0});
  old.pieces.push({id:old.nextId++,side:'SU',kind:'works',cell:'M5',hp:8,ticks:0,queue:{kind:'tank',ticks:1},spent:false,charge:0});
  old.pending={source:44,cell:'G3'};old.turnLog=['Rifle squad moved from B4 to D3.'];
  old.history=[{side:'US',round:4,msg:old.turnLog[0]}];delete old.reserve;delete old.arrivals;
  const g=importLegacy(old);assert.ok(usableSave(g));assert.equal(g.id,old.id);assert.equal(g.cash.US,130);
  assert.equal(g.orders,0);assert.equal(g.streak.US,1);assert.equal(g.pending[0].cell,'J5');
  assert.equal(g.history[0].msg,'Rifle squad moved from E6 to G5.');
  assert.ok(g.pieces.some(p=>p.kind==='tank'&&p.side==='US'));assert.equal(at(g,'P7').queue.ticks,1);
  assert.equal(old.version,1);assert.equal(old.pieces.at(-2).queue.ticks,0);
  assert.equal(importLegacy({...old,pieces:[{cell:'M2'}]}),null);
});

test('upgrading gives an untouched opening the edge bases and counts any prior purchase or move',()=>{
  const old=previousOpening('SU'),opening=importLegacy(old);
  assert.equal(opening.id,old.id);assert.equal(opening.first,'SU');assert.equal(opening.orders,1);
  assert.equal(headquartersCell(opening,'US'),'B7');assert.equal(headquartersCell(opening,'SU'),'R7');
  assert.equal(headquartersCell(old,'US'),'E7');
  const active={...old,revision:14,round:7,turnLog:['Collected 50 credits.','Barracks completed at P7.']};
  const keep=importLegacy(active);
  assert.equal(keep.orders,1);assert.equal(keep.round,7);assert.deepEqual(keep.pieces,active.pieces);
  assert.equal(headquartersCell(keep,'SU'),'O7');assert.ok(usableSave(keep));
  for(const msg of ['Barracks started at P7.','Anvil Tank ordered at P7. Ready in 2 owner turns.']){
    const converted=importLegacy({...active,turnLog:[...active.turnLog,msg]});
    assert.equal(converted.orders,0);assert.throws(()=>build(converted,'generator'),/already spent/);
    assert.equal(resumeTurn(converted).side,'US');
  }
  assert.equal(importLegacy({...active,orders:1}).orders,0);
  assert.equal(importLegacy({...active,orders:0}).orders,0);
  assert.equal(importLegacy({...active,turnLog:['Rifle squad deployed at N7. Ready to act.']}).orders,1);
  assert.equal(purchaseReason(keep,'generator'),'');
  assert.equal(usableSave({...keep,orders:2}),false);
});

test('a save stopped by the old cap continues at round 17 while decisive victories stay final',()=>{
  for(const first of ['US','SU']){
    const old=previousOpening(first);old.round=16;old.revision=70;old.side=first==='US'?'SU':'US';old.phase='over';
    for(const reason of ['Relay count and HQ health were tied after round 16.','More bridge relays held at the round limit.','Relay count tied. Remaining HQ health decided the match.']){
      const resumed=importLegacy({...old,winner:'US',ending:reason});
      assert.equal(resumed.phase,'handoff');assert.equal(resumed.winner,null);assert.equal(resumed.ending,'');
      const next=resumeTurn(resumed);
      assert.equal(next.round,17);assert.equal(next.side,first);assert.equal(next.orders,1);
      assert.ok(usableSave(next));
    }
    for(const decisive of ['The enemy construction yard was destroyed.','Infantry held both bridge relays for two consecutive round ends.']){
      const result=importLegacy({...old,winner:'US',ending:decisive});
      assert.equal(result.phase,'over');assert.equal(result.winner,'US');assert.equal(result.ending,decisive);
    }
  }
});

test('old spent turns and old handoff screens advance once across reload, income and bridge scoring',()=>{
  for(const phase of ['play','handoff']){
    const saved=fresh('US');saved.round=6;saved.side='SU';saved.revision=12;
    saved.phase=phase;saved.orders=phase==='play'?0:1;
    saved.streak.US=phase==='handoff'?1:0;
    for(const cell of relays)add(saved,'US','rifle',cell);
    const factory=add(saved,'US','works','D7');factory.queue={kind:'tank',ticks:1};
    const before=structuredClone(saved),ready=resumeTurn(saved);
    assert.deepEqual(saved,before);
    assert.equal(ready.phase,'play');assert.equal(ready.side,'US');assert.equal(ready.round,7);
    assert.equal(ready.revision,13);assert.equal(ready.orders,1);assert.equal(ready.streak.US,1);
    assert.equal(ready.cash.US,saved.cash.US+50);assert.equal(ready.cash.SU,saved.cash.SU);
    assert.equal(ready.pieces.filter(p=>p.kind==='tank').length,1);
    const reloaded=JSON.parse(JSON.stringify(ready));
    assert.strictEqual(resumeTurn(reloaded),reloaded);
  }
  const last=fresh();last.side='SU';last.round=100;last.orders=0;
  const final=resumeTurn(last);
  assert.equal(final.phase,'over');assert.equal(final.round,100);assert.strictEqual(resumeTurn(final),final);
});

test('a gate order relocates its unit before control changes, and an invalid landing preserves the turn',()=>{
  const g=fresh('US'),unit=at(g,'C7');
  add(g,'US','generator','D6');add(g,'US','lab','D8');
  const gate=add(g,'US','device','D7');gate.charge=3;
  const order={type:'special',id:gate.id,unit:unit.id};
  assert.throws(()=>apply(g,{...order,cell:'B7'}));
  assert.equal(gate.charge,3);assert.equal(g.side,'US');assert.equal(g.orders,1);
  const {state,outgoing,events}=apply(g,{...order,cell:'E7'});
  assert.equal(events[0].type,'jump');assert.equal(byId(outgoing,unit.id).cell,'E7');
  assert.equal(state.phase,'play');assert.equal(state.side,'SU');assert.equal(state.orders,1);
  assert.equal(byId(state,gate.id).charge,0);assert.equal(state.revision,1);
  assert.equal(gate.charge,3);assert.equal(unit.cell,'C7');
});

test('both commanders get their turn in every round through 100 and the match cannot enter 101',()=>{
  for(const first of ['US','SU']){
    let g=fresh(first);
    for(let round=1;round<=100;round++){
      for(const side of [first,first==='US'?'SU':'US']){
        assert.equal(g.phase,'play');assert.equal(g.side,side);
        assert.equal(g.round,round);assert.equal(g.orders,1);
        if([16,17,99,100].includes(round)){
          g=JSON.parse(JSON.stringify(g));assert.ok(usableSave(g));
        }
        if(round>=99){
          const p=g.pieces.find(p=>p.side===side && p.kind==='rifle');
          g=run(g,{type:'field',id:p.id,to:[...paths(g,p).keys()].find(k=>k!==p.cell)});
        }else g=pass(g);
        if(round===100 && side!==first)assert.equal(g.phase,'over');
        else assert.equal(g.phase,'play');
      }
    }
    assert.equal(g.round,100);assert.equal(g.winner,null);assert.match(g.ending,/round 100/);
    assert.ok(usableSave(g));assert.throws(()=>pass(g));
    assert.equal(usableSave({...g,round:101}),false);
  }
});

test('round 100 compares bridges before HQ health and damage can still win early',()=>{
  let g=fresh();g.round=100;g.side='SU';
  at(g,home.US).hp=1;
  assert.equal(run(g,{type:'end'}).winner,'SU');
  add(g,'US','rifle',relays[0]);
  assert.equal(run(g,{type:'end'}).winner,'US');
  g=fresh();const tank=add(g,'US','tank','O7'),hq=at(g,home.SU);hq.hp=3;
  g=run(g,{type:'field',id:tank.id,to:'P7',target:hq.id});
  assert.equal(g.phase,'over');assert.equal(g.winner,'US');
  assert.equal(g.orders,0);assert.equal(byId(g,tank.id).cell,'P7');
});

test('Chinese preserves event meaning and coordinates across language switches',()=>{
  assert.match(zh('Lancer Tank ready at D7. Exits blocked; holding in reserve.'),/D7.*长枪坦克.*后备/);
  assert.match(zh('R3 SU · Anvil Tank deployed at O8. Ready to act.'),/^第 3 轮 苏军 · 铁砧坦克.*O8/);
  assert.equal(zh('R1 US · Barracks started at D6.'),'第 1 轮 盟军 · D6 的兵营开始施工。');
  assert.match(zh('Train Rifle squad, 35 credits'),/步枪小队.*35/);
  assert.equal(zh('Round 100 / 100'),'第 100 / 100 轮');
  assert.equal(zh('Pass turn'),'跳过回合');
  assert.doesNotMatch(zh('4 / 4 HP · Move 3. Action already spent.'),/[A-Za-z]/);
  assert.match(zh('Lancer Tank deployed at B4. Can act next turn.'),/下回合可行动/);
  assert.match(zh('Round limit extended to 100. The next round is 17.'),/100.*17/);
});

test('both opening factions can win by moving infantry to the two bridges on the expanded map',()=>{
  for(const side of ['US','SU']){
    let g=fresh(side);
    const infantry=g.pieces.filter(p=>p.side===side && p.kind==='rifle');
    const targets=side==='US'?relays:[...relays].reverse();
    while(g.phase!=='over'){
      const i=infantry.findIndex((squad,i)=>byId(g,squad.id).cell!==targets[i]);
      if(g.side===side && i>=0){
        const p=byId(g,infantry[i].id),target=targets[i];
        const choices=[...paths(g,p)].filter(([k])=>k!==p.cell);
        choices.sort(([a,pa],[b,pb])=>distance(a,target)-distance(b,target)||pa.cost-pb.cost);
        g=run(g,{type:'field',id:p.id,to:choices[0][0]});
      }else g=pass(g);
    }
    assert.equal(g.winner,side);assert.equal(g.streak[side],2);
    assert.ok(g.round<ROUND_LIMIT);
  }
});

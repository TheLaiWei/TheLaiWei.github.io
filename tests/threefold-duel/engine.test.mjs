import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,byId,replacement,skills} from '../../games/threefold-duel/catalog.mjs';
import {applyCard,art,eligible,luck,newMatch,odds,offer,resolve,startRound} from '../../games/threefold-duel/engine.mjs';

function random(seed){
 return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};
}
test('48 unique cards; 12 designs in each group',()=>{
 assert.equal(new Set(cards.map(c=>c.id)).size,48);
 for(const group of ['Fighter','Mage','Priest','Any'])assert.equal(cards.filter(c=>c.group===group).length,12);
});
test('Luck includes defeated heroes, caps at ten per hero, and interpolates',()=>{
 const t=newMatch().teams[0];t[0].hp=0;
 assert.equal(luck(t),15);
 applyCard(t,byId.luck,1);assert.equal(luck(t),18);
 applyCard(t,byId.luck,1);assert.equal(t[1].luck,10);
 assert(!eligible(t,byId.luck).includes(1));
 assert.deepEqual(odds(0),[65,27,7,1]);assert.deepEqual(odds(15),[48,35,14,3]);assert.deepEqual(odds(60),[32,40,21,7]);
 assert.deepEqual(odds(7.5),[56.5,31,10.5,2]);
});
test('taking different ordinary drafts creates both playtest parties and preserves passives on pivot',()=>{
 const [a,b]=newMatch().teams;
 for(const [i,id] of [[0,'plate'],[0,'feint'],[0,'twin'],[1,'aegis'],[2,'arms']])applyCard(a,byId[id],i);
 for(const [i,id] of [[0,'riposte'],[0,'bulwark'],[2,'judgment']])applyCard(b,byId[id],i);
 assert.deepEqual(a.map(art),['fighter-assassin','mage-warden','priest-blessing']);
 assert.deepEqual(b.map(art),['fighter-guardian','mage-elementalist','priest-inquisitor']);
 assert.equal(a[0].cards.plate,1);
 assert.match(replacement(b[0],byId.twin),/Guard → Ambush/);
 applyCard(a,byId.bulwark,0);
 assert.match(replacement(a[0],byId.twin),/Inactive after swap: Shield Feint/);
 for(const h of a.concat(b))assert.equal(h.skills.length,2);
});
test('three distinct eligible cards even when only one hero and the common pool remain',()=>{
 const t=newMatch().teams[0];t[1].hp=t[2].hp=0;
 for(const c of cards){
  if(c.skill)continue;
  if(Number.isFinite(c.limit))t[0].cards[c.id]=c.limit;
 }
 for(let i=0;i<250;i++){
  const choices=offer(t,random(i));assert.equal(new Set(choices).size,3);
  choices.forEach(c=>assert(eligible(t,c).includes(0)));
 }
});
test('priority Aegis, Sanctuary and Mirror Ward interact on a lethal hit',()=>{
 const g=newMatch(),[a,b]=g.teams;
 for(const id of ['aegis','sanctuary','mirror'])applyCard(a,byId[id],1);
 a[0].hp=2;b[0].atk=99;b[1].hp=b[2].hp=0;a[2].hp=0;
 startRound(g);
 resolve(g,[[{slot:0,target:0},{slot:1,target:0}],[{slot:0,target:0}]]);
 assert.equal(a[0].hp,1);assert(a[1].used.sanctuary);assert(a[1].round.mirror);
 assert(b[0].hp<b[0].max);assert.equal(a[0].ward,null);
});
test('500 seeded complete matches preserve HP, draft and target invariants',()=>{
 const rng=random(31);
 for(let m=0;m<500;m++){
  const g=newMatch();
  while(g.winner===null&&g.round<100){
   startRound(g);
   const plan=g.teams.map((team,s)=>team.map(h=>{
    if(!h.hp)return null;
    const slot=Math.floor(rng()*2), targets=g.teams[skills[h.skills[slot]][0]==='ally'?s:1-s]
     .map((t,i)=>t.hp?i:null).filter(i=>i!==null);
    return {slot,target:targets[Math.floor(rng()*targets.length)]};
   }));
   resolve(g,plan);
   for(const h of g.teams.flat())assert(Number.isInteger(h.hp)&&h.hp>=0&&h.hp<=h.max);
   if(g.winner!==null)break;
   for(const t of g.teams){
    const draw=offer(t,rng);assert.equal(new Set(draw).size,3);
    const c=draw[Math.floor(rng()*3)],targets=eligible(t,c);
    applyCard(t,c,targets[Math.floor(rng()*targets.length)]);
   }
   g.round++;
  }
  assert.notEqual(g.winner,null);
 }
});

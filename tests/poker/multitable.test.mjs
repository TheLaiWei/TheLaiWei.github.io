import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch,nextHand,act,legal,validateState} from '../../games/poker-practice/table.mjs';
import {startingBag} from '../../poker/chips.mjs';
import {equity,perspective,callPrice} from '../../games/poker-practice/strategy.mjs';

function table(n) {
  return newMatch({names:Array.from({length:n},(_,i)=>'Seat '+i),stack:100,smallBlind:1,bigBlind:2,button:0});
}
function rig(stacks,draws=[]) {
  let s=table(stacks.length);
  while(s.phase==='playing') s=act(s,s.turn,'fold');
  stacks.forEach((n,i)=>{s.players[i].stack=n;s.players[i].wallet=startingBag(n);});
  const deck=[...Array.from({length:52},(_,n)=>n).filter(c=>!draws.includes(c)),...draws.toReversed()];
  return nextHand(s,deck);
}
test('each supported seat count deals unique private cards and starts with correct blinds',()=>{
  for(let n=2;n<=8;n++) {
    const s=table(n);
    assert.equal(s.players.length,n);
    assert.equal(s.turn,n===2?0:3%n);
    assert.equal(s.players[n===2?0:1].street,1);
    assert.equal(s.players[n===2?1:2].street,2);
    assert.ok(validateState(s));
  }
});
test('three unequal all-ins produce separate main/side winners and return excess',()=>{
  // Dealer 1; deal order 2,0,1. Seat 0 AA, seat 1 KK, seat 2 QQ.
  let s=rig([50,100,150],[10,12,11,23,25,24,0,1,4,7,13,16,26,19]);
  while(s.phase==='playing') {
    const l=legal(s,s.turn);
    s=l.canRaise?act(s,s.turn,'raise',l.maxTo):act(s,s.turn,'call');
  }
  assert.ok(validateState(s));
  assert.deepEqual(s.result.pots,[{chips:150,winners:[0]},{chips:100,winners:[1]}]);
  assert.deepEqual(s.result.returned,[0,0,50]);
  assert.deepEqual(s.players.map(p=>p.stack),[150,100,50]);
});
test('folded chips fund the pot, odd split chip goes clockwise from dealer',()=>{
  let s=rig([100,100,100],[0,1,2,3,4,5,13,8,9,10,26,11,39,12]);
  s=act(s,s.turn,'raise',5);
  s=act(s,s.turn,'call');s=act(s,s.turn,'call');
  s=act(s,s.turn,'fold');
  while(s.phase==='playing')s=act(s,s.turn,'check');
  assert.ok(validateState(s));
  assert.deepEqual(s.result.payouts,[8,7,0]);
});
test('a single short raise does not reopen; cumulative short raises can',()=>{
  for(const fourthStack of [100,18]){
    let s=rig([15,fourthStack,100,400-115-fourthStack]);
    // Dealer 1, first to act seat 0. Complete betting on flop using small stacks.
    while(s.street==='preflop') s=act(s,s.turn,legal(s,s.turn).call?'call':'check');
    s=act(s,s.turn,'raise',8); // seat 2
    s=act(s,s.turn,'call');   // seat 3
    s=act(s,s.turn,'raise',13); // seat 0 all-in (+5)
    s=fourthStack===18?act(s,s.turn,'raise',16):act(s,s.turn,'call');
    assert.equal(s.turn,2);
    assert.equal(legal(s,2).canRaise,fourthStack===18);
    assert.ok(validateState(s));
  }
});
test('eliminated seats are skipped when play reaches two survivors',()=>{
  let s=rig([150,0,150]);
  assert.equal(s.sb,s.button);assert.equal(s.turn,s.button);
  assert.equal(s.players[1].hole.length,0);
  s=act(s,s.turn,'call');s=act(s,s.turn,'check');assert.equal(s.turn,s.bb);
});
test('a royal board splits three ways and all-in call price excludes an inaccessible side pot',()=>{
  assert.equal(equity({hole:[20,25],board:[8,9,10,11,12],opponents:2},Math.random,5),1/3);
  let s=rig([50,100,150]);s=act(s,1,'raise',100);s=act(s,2,'call');
  const v=perspective(s,0);
  assert.equal(v.opponents,2);
  assert.equal(v.tiers.reduce((n,t)=>n+t.chips,0),150);
  assert.equal(callPrice(v),48/150);
});
test('mixed legal actions across tournaments preserve chips and resumable state',()=>{
  let seed=2357;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let n=3;n<=8;n++) for(let trial=0;trial<10;trial++){
    let s=table(n),actions=0;
    while(s.hand<=30){
      assert.ok(validateState(s));assert.ok(++actions<2000);
      if(s.phase==='complete'){
        if(s.players.filter(p=>p.stack>0).length<2)break;
        s=nextHand(s);continue;
      }
      const l=legal(s,s.turn),r=random();
      if(r<0.15)s=act(s,s.turn,'fold');
      else if(r<0.38&&l.canRaise)s=act(s,s.turn,'raise',r<0.20?l.maxTo:Math.min(l.minTo,l.maxTo));
      else s=act(s,s.turn,l.owed?'call':'check');
    }
  }
});

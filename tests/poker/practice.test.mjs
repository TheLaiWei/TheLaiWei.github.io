import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch,act,nextHand,validateState} from '../../poker/engine.mjs';
import {perspective,chooseAction,equity,callPrice,reviewDecision} from '../../games/poker-practice/strategy.mjs';

test('practice decision input excludes opponent hole cards, deck, and burns',()=>{
  const s=newMatch({stack:200,smallBlind:1,bigBlind:2,button:1});
  const before=perspective(s,1);
  [s.players[0].hole,s.deck]=[s.deck.slice(0,2),[...s.players[0].hole,...s.deck.slice(2)]];
  s.deck.reverse();
  assert.deepEqual(perspective(s,1),before);
  assert.deepEqual(before.hole,s.players[1].hole);
  assert.equal('deck' in before,false);
});
test('pot odds account for unmatched chips and a board-only tie gives half equity',()=>{
  assert.equal(callPrice({owed:20,call:20,pot:60}),0.25);
  assert.equal(callPrice({owed:100,call:20,pot:140}),0.25);
  assert.equal(equity({hole:[20,25],board:[8,9,10,11,12]},Math.random,10),0.5);
});
test('reopening the same review reproduces the same decision-time estimate',()=>{
  const view=perspective(newMatch({button:0}),0),entry={view,type:'call'};
  assert.equal(reviewDecision(entry),reviewDecision(entry));
  assert.match(reviewDecision(entry),/chips|Calling/);
});
test('opponent and human can play through complete legal practice hands',()=>{
  let s=newMatch({stack:200,smallBlind:1,bigBlind:2,button:1});
  for(let hand=0;hand<12;hand++) {
    let actions=0;
    while(s.phase==='playing') {
      assert.ok(actions++<100);
      const seat=s.turn,v=perspective(s,seat);
      const a=seat===1?chooseAction(v):{type:v.owed?'call':'check'};
      s=act(s,seat,a.type,a.to);
      assert.ok(validateState(s));
    }
    if(s.players.some(p=>p.stack===0)) break;
    s=nextHand(s);
  }
});

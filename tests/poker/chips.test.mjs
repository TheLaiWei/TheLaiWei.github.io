import test from 'node:test';
import assert from 'node:assert/strict';
import {act,newMatch,validateState} from '../../poker/engine.mjs';
import {combine,empty,resizePlan,stageChip,startingBag,take,valueOf} from '../../poker/chips.mjs';
import {loadGame,saveGame,SAVE_KEY} from '../../poker/session.mjs';

function flop(){
  let state=newMatch({button:1});
  state=act(state,1,'raise',60);
  return act(state,0,'call');
}
test('manual green-chip wagers stay green, undo restores the prior rack, and the pot waits for commit',()=>{
  const state=flop(),rack=state.players[0].wallet;
  const history=[take(rack,0)];
  for(let i=0;i<2;i++)history.push(stageChip(history.at(-1),25));
  assert.deepEqual(history.at(-1).paid,[0,0,2,0]);
  history.pop();
  assert.equal(history.at(-1).remaining[2],rack[2]-1);
  const plan=stageChip(history.at(-1),25);
  assert.equal(valueOf(state.players[0].wager),60);
  const next=act(state,0,'raise',50,state.revision,plan);
  assert.deepEqual(next.players[0].wager,combine(state.players[0].wager,[0,0,2,0]));
  assert.deepEqual(next.players[0].wallet,plan.remaining);
  assert.ok(validateState(next));
});
test('use exact small chips, then break the smallest oversized chip for change',()=>{
  assert.deepEqual(take([0,2,0,1],10),{remaining:[0,0,0,1],paid:[0,2,0,0]});
  assert.deepEqual(take([0,0,1,1],6),{remaining:[4,3,0,1],paid:[1,1,0,0]});
  assert.throws(()=>stageChip(take([0,0,0,1],0),25));
});
test('uncalled chips return and remaining denominations pass to the winner',()=>{
  const s=flop(),p=s.turn, before=s.players[p].wallet;
  const raised=act(s,p,'raise',50,s.revision,stageChip(stageChip(take(before,0),25),25));
  const end=act(raised,1-p,'fold');
  assert.deepEqual(end.players[p].wallet,combine(before,combine(s.players[0].wager,s.players[1].wager)));
  assert.equal(end.result.returned[p],50);
  assert.deepEqual(end.players.map(x=>x.wager),[empty(),empty()]);
});
test('boarding a royal flush splits the actual chip pot across both racks',()=>{
  let s=flop();
  // Preserve the permutation while placing a spade royal on the board.
  const ordered=[...s.board,...s.burn,...s.deck,...s.players.flatMap(p=>p.hole)];
  const desired=[8,9,10,11,12];
  const map=new Map(ordered.map(c=>[c,c]));
  const future=[...s.board,s.deck.at(-2),s.deck.at(-4)];
  for(let j=0;j<5;j++){
    const key=[...map].find(([,v])=>v===desired[j])[0];
    const old=map.get(future[j]);map.set(future[j],desired[j]);map.set(key,old);
  }
  for(const list of [s.board,s.burn,s.deck,...s.players.map(p=>p.hole)])list.forEach((c,i)=>list[i]=map.get(c));
  s=act(s,s.turn,'raise',s.players[s.turn].stack);
  s=act(s,s.turn,'call');
  assert.equal(s.result.winners.length,2);
  assert.deepEqual(s.players.map(p=>valueOf(p.wallet)),[2000,2000]);
  assert.ok(validateState(s));
});
test('schema 1 resumes a mid-hand flop, then saves exact inventories in schema 2',()=>{
  const state=flop();for(const p of state.players){delete p.wallet;delete p.wager;}
  let raw=JSON.stringify({schema:1,state});
  const storage={getItem:()=>raw,setItem:(key,v)=>{assert.equal(key,SAVE_KEY);raw=v;}};
  const restored=loadGame(storage).state;
  assert.deepEqual(restored.board,state.board);assert.equal(restored.turn,state.turn);
  assert.deepEqual(restored.players[0].wallet,startingBag(state.players[0].stack));
  assert.ok(validateState(restored));saveGame(storage,restored);
  assert.equal(JSON.parse(raw).schema,2);assert.deepEqual(loadGame(storage).state,restored);
  const corrupt=JSON.parse(raw);corrupt.state.players[0].wallet[0]++;
  raw=JSON.stringify(corrupt);assert.equal(loadGame(storage).state,null);
});

test('an exact call retains selected greens and makes up only the difference',()=>{
  const plan=stageChip(take([0,2,2,1],0),25);
  const topped=resizePlan(plan,30);
  assert.deepEqual(topped.paid,[0,1,1,0]);
  assert.deepEqual(topped.remaining,[0,1,1,1]);
  assert.deepEqual(resizePlan(topped,25),plan);
});

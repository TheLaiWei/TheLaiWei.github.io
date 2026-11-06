import {startingBag,empty,take,combine,validBag,valueOf} from './chips.mjs';
// Pure heads-up Hold'em rules. No DOM, networking, or storage dependencies.
export const VERSION = 1;
export const STREETS = ['preflop', 'flop', 'turn', 'river'];
export const HAND_NAMES = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
export const rank = c => c % 13 + 2;
export const suit = c => Math.floor(c / 13);
export const cardLabel = c => `${['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]}${['♠','♥','♣','♦'][suit(c)]}`;
const integer = n => Number.isSafeInteger(n) && n >= 0;
const clone = s => structuredClone(s);
const sum = a => a.reduce((x,y) => x+y,0);
function demand(ok, message) { if (!ok) throw new Error(message); }
export function randomBelow(n) {
  demand(Number.isInteger(n) && n > 0 && n <= 52, 'Invalid random range');
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}
export function shuffledDeck() {
  const d = Array.from({length:52}, (_,i) => i);
  for(let i=51;i>0;i--) { const j=randomBelow(i+1); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}
export function compare(a,b) {
  for(let i=0;i<Math.max(a.length,b.length);i++) {
    const delta=(a[i]??0)-(b[i]??0); if(delta) return Math.sign(delta);
  }
  return 0;
}
function five(cards) {
  const ranks=cards.map(rank).sort((a,b)=>b-a);
  const counts=new Map(); ranks.forEach(r=>counts.set(r,(counts.get(r)||0)+1));
  const groups=[...counts].sort((a,b)=>b[1]-a[1] || b[0]-a[0]);
  const unique=[...new Set(ranks)];
  const flush=cards.every(c=>suit(c)===suit(cards[0]));
  let straight=0;
  if(unique.length===5) {
    if(unique[0]-unique[4]===4) straight=unique[0];
    else if(unique.join(',')==='14,5,4,3,2') straight=5;
  }
  if(flush && straight) return [8,straight];
  if(groups[0][1]===4) return [7,groups[0][0],groups[1][0]];
  if(groups[0][1]===3 && groups[1][1]===2) return [6,groups[0][0],groups[1][0]];
  if(flush) return [5,...ranks];
  if(straight) return [4,straight];
  if(groups[0][1]===3) return [3,groups[0][0],...groups.slice(1).map(g=>g[0])];
  if(groups[0][1]===2 && groups[1][1]===2) return [2,...groups.slice(0,2).map(g=>g[0]).sort((a,b)=>b-a),groups[2][0]];
  if(groups[0][1]===2) return [1,groups[0][0],...groups.slice(1).map(g=>g[0])];
  return [0,...ranks];
}
export function evaluate(cards) {
  demand(cards.length>=5 && cards.length<=7 && new Set(cards).size===cards.length, 'Invalid evaluation cards');
  let best=null, bestCards=[];
  for(let a=0;a<cards.length-4;a++) for(let b=a+1;b<cards.length-3;b++)
  for(let c=b+1;c<cards.length-2;c++) for(let d=c+1;d<cards.length-1;d++)
  for(let e=d+1;e<cards.length;e++) {
    const chosen=[cards[a],cards[b],cards[c],cards[d],cards[e]], score=five(chosen);
    if(!best || compare(score,best)>0) { best=score; bestCards=chosen; }
  }
  return {score:best, name:HAND_NAMES[best[0]], cards:bestCards};
}
export function splitPot(pot, winners, button) {
  const payouts=[0,0], each=Math.floor(pot/winners.length);
  winners.forEach(i=>payouts[i]=each);
  let extra=pot-each*winners.length;
  for(const i of [1-button,button]) if(extra && winners.includes(i)) {payouts[i]++;extra--;}
  return payouts;
}
export function newMatch({names=['Player 1','Player 2'],stack=2000,smallBlind=10,bigBlind=20,button=randomBelow(2)}={}) {
  demand(integer(stack) && stack>=2 && stack<=1000000, 'Starting stack must be 2–1,000,000');
  demand(integer(smallBlind) && smallBlind>0 && integer(bigBlind) && bigBlind>smallBlind && bigBlind<=stack, 'Choose positive blinds: small < big ≤ stack');
  demand(button===0 || button===1, 'Invalid button');
  demand(Array.isArray(names) && names.length===2 && names.every(n=>typeof n==='string' && n.trim().length>0 && n.trim().length<=20), 'Use two names of 1–20 characters');
  const s={version:VERSION,revision:0,hand:0,button:1-button,settings:{stack,smallBlind,bigBlind},total:stack*2,
    players:names.map(name=>({name:name.trim(),stack,wallet:startingBag(stack),wager:empty(),street:0,committed:0,hole:[],folded:false,acted:false})),
    phase:'complete',street:'preflop',turn:null,currentBet:0,minRaise:bigBlind,board:[],burn:[],deck:[],result:null,log:[]};
  return nextHand(s);
}
function log(s,message) {s.log.push(message);s.log=s.log.slice(-40);}
function pay(s,i,amount,selection) {
  const p=s.players[i]; demand(integer(amount) && amount<=p.stack,'Insufficient chips');
  const plan=selection ?? take(p.wallet,amount);
  demand(validBag(plan.paid,amount) && validBag(plan.remaining,p.stack-amount),'Invalid staged chips');
  p.wallet=[...plan.remaining];p.wager=combine(p.wager,plan.paid);
  p.stack-=amount;p.street+=amount;p.committed+=amount;
}
function draw(s) {demand(s.deck.length>0,'Deck exhausted');return s.deck.pop();}
function refund(s) {
  const a=s.players[0], b=s.players[1];
  if(a.committed===b.committed) return [0,0];
  const i=a.committed>b.committed?0:1, p=s.players[i], extra=Math.abs(a.committed-b.committed);
  const change=take(p.wager,extra);
  p.wallet=combine(p.wallet,change.paid);p.wager=change.remaining;
  p.stack+=extra;p.committed-=extra;p.street-=extra;
  log(s,`${p.name}: ${extra} uncalled returned`);
  const r=[0,0];r[i]=extra;return r;
}
function finish(s,foldWinner=null) {
  const returned=refund(s), pot=sum(s.players.map(p=>p.committed));
  let winners, hands=null;
  if(foldWinner!==null) winners=[foldWinner];
  else {
    hands=s.players.map(p=>evaluate([...p.hole,...s.board]));
    const cmp=compare(hands[0].score,hands[1].score); winners=cmp===0?[0,1]:[cmp>0?0:1];
  }
  const payouts=splitPot(pot,winners,s.button);
  let pool=combine(s.players[0].wager,s.players[1].wager);
  for(const i of winners) {
    const award=take(pool,payouts[i]);
    s.players[i].wallet=combine(s.players[i].wallet,award.paid);
    pool=award.remaining;
  }
  demand(valueOf(pool)===0,'Unpaid pot');
  s.players.forEach((p,i)=>{p.stack+=payouts[i];p.committed=0;p.street=0;p.wager=empty();});
  s.phase='complete';s.turn=null;s.currentBet=0;
  s.result={reason:foldWinner!==null?'fold':'showdown',pot,winners,payouts,returned,hands};
  log(s,winners.length===2?`Split pot: ${pot}`:`${s.players[winners[0]].name} wins ${pot}`);
}
function advanceStreet(s) {
  const index=STREETS.indexOf(s.street);
  demand(index<3,'Cannot deal past river');
  s.street=STREETS[index+1];s.burn.push(draw(s));
  for(let n=0;n<(s.street==='flop'?3:1);n++) s.board.push(draw(s));
  s.players.forEach(p=>{p.street=0;p.acted=false;});
  s.currentBet=0;s.minRaise=s.settings.bigBlind;s.turn=1-s.button;
  log(s,`${s.street[0].toUpperCase()+s.street.slice(1)} dealt`);
}
function settle(s) {
  const allIn=s.players.findIndex(p=>p.stack===0);
  if(allIn!==-1) {
    const other=1-allIn;
    // With only two players, no further betting is possible once the all-in is matched.
    if(s.players[other].stack===0 || s.players[other].street>=s.players[allIn].street) {
      const returned=refund(s);
      while(s.board.length<5) advanceStreet(s);
      finish(s);s.result.returned=returned;return;
    }
    s.currentBet=Math.max(...s.players.map(p=>p.street));s.turn=other;return;
  }
  if(s.players.every(p=>p.acted) && s.players[0].street===s.players[1].street) {
    if(s.street==='river') finish(s);else advanceStreet(s);
  }
}
export function nextHand(state, deck=shuffledDeck()) {
  demand(state.phase==='complete','Finish the current hand first');
  demand(state.players.every(p=>p.stack>0),'Match finished. Start a new match.');
  demand(deck.length===52 && new Set(deck).size===52 && deck.every(c=>integer(c)&&c<52),'Invalid deck');
  const s=clone(state);s.hand++;s.revision++;s.button=1-s.button;
  s.phase='playing';s.street='preflop';s.turn=s.button;s.board=[];s.burn=[];s.deck=[...deck];s.result=null;
  s.minRaise=s.settings.bigBlind;s.log=[];
  s.players.forEach(p=>{p.street=0;p.committed=0;p.hole=[];p.folded=false;p.acted=false;});
  s.handStart=s.players.map(p=>p.stack);
  for(let n=0;n<2;n++) for(const i of [1-s.button,s.button]) s.players[i].hole.push(draw(s));
  pay(s,s.button,Math.min(s.settings.smallBlind,s.players[s.button].stack));
  pay(s,1-s.button,Math.min(s.settings.bigBlind,s.players[1-s.button].stack));
  s.currentBet=Math.max(...s.players.map(p=>p.street));
  log(s,`Hand ${s.hand} · ${s.players[s.button].name} is dealer / small blind`);
  settle(s);return s;
}
export function legal(s,i) {
  const p=s.players[i], opponent=s.players[1-i];
  const active=s.phase==='playing' && s.turn===i && p.stack>0;
  const owed=Math.max(0,s.currentBet-p.street), call=Math.min(owed,p.stack);
  const maxTo=p.street+p.stack, minTo=s.currentBet===0?s.settings.bigBlind:s.currentBet+s.minRaise;
  const canRaise=active && opponent.stack>0 && maxTo>s.currentBet;
  return {active,owed,call,canCheck:active&&owed===0,canRaise,minTo,maxTo,canFullRaise:canRaise&&maxTo>=minTo};
}
export function act(state,i,type,to,expectedRevision=state.revision,selection=null) {
  demand(expectedRevision===state.revision,'This action is stale');
  const l=legal(state,i);demand(l.active,'Wait for your turn');
  const s=clone(state),p=s.players[i];
  if(type==='fold') {p.folded=true;log(s,`${p.name} folds`);finish(s,1-i);}
  else {
    if(type==='check') {demand(l.canCheck,'You must call or fold');log(s,`${p.name} checks`);}
    else if(type==='call') {demand(l.owed>0,'Nothing to call');pay(s,i,l.call,selection);log(s,`${p.name} calls ${l.call}${p.stack===0?' · all-in':''}`);}
    else if(type==='raise') {
      demand(l.canRaise && integer(to) && to>s.currentBet && to<=l.maxTo,'Invalid bet');
      demand(to>=l.minTo || to===l.maxTo,'Below the minimum raise');
      const increase=to-s.currentBet;
      if(increase>=s.minRaise) s.minRaise=increase;
      pay(s,i,to-p.street,selection);s.currentBet=to;s.players[1-i].acted=false;
      log(s,`${p.name} ${state.currentBet===0?'bets':'raises to'} ${to}${p.stack===0?' · all-in':''}`);
    } else throw new Error('Unknown action');
    p.acted=true;s.turn=1-i;settle(s);
  }
  s.revision++;return s;
}
export function validateState(s) {
  try {
    demand(s?.version===VERSION && integer(s.revision) && integer(s.hand) && s.hand>=1,'Invalid version');
    demand(s.button===0||s.button===1,'Invalid dealer');
    demand(['playing','complete'].includes(s.phase) && STREETS.includes(s.street),'Invalid phase');
    demand(integer(s.total)&&s.total>=4&&s.total<=2000000,'Invalid total');
    demand(integer(s.settings.stack)&&s.settings.stack*2===s.total && integer(s.settings.smallBlind)&&s.settings.smallBlind>0 && integer(s.settings.bigBlind)&&s.settings.bigBlind>s.settings.smallBlind&&s.settings.bigBlind<=s.settings.stack,'Invalid settings');
    demand(Array.isArray(s.players)&&s.players.length===2,'Invalid players');
    for(const p of s.players) demand(typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=20 && ['stack','street','committed'].every(k=>integer(p[k])) && p.street<=p.committed && Array.isArray(p.hole)&&p.hole.length===2 && typeof p.folded==='boolean' && typeof p.acted==='boolean','Invalid player');
    demand(s.players.every(p=>validBag(p.wallet,p.stack)&&validBag(p.wager,p.committed)),'Invalid chip inventory');
    demand(sum(s.players.map(p=>p.stack+p.committed))===s.total,'Chip conservation failed');
    demand(Array.isArray(s.board)&&s.board.length===[0,3,4,5][STREETS.indexOf(s.street)],'Invalid board');
    demand(Array.isArray(s.burn)&&s.burn.length===STREETS.indexOf(s.street)&&Array.isArray(s.deck),'Invalid deck');
    const cards=[...s.deck,...s.burn,...s.board,...s.players.flatMap(p=>p.hole)];
    demand(cards.length===52 && new Set(cards).size===52 && cards.every(c=>integer(c)&&c<52),'Duplicate/missing card');
    demand(Array.isArray(s.handStart)&&s.handStart.length===2&&s.handStart.every(integer)&&sum(s.handStart)===s.total,'Invalid hand start');
    demand(integer(s.currentBet)&&integer(s.minRaise)&&s.minRaise>=s.settings.bigBlind,'Invalid wager');
    demand(Array.isArray(s.log)&&s.log.length<=40&&s.log.every(x=>typeof x==='string'&&x.length<=150),'Invalid history');
    if(s.phase==='playing') {
      demand((s.turn===0||s.turn===1)&&s.players[s.turn].stack>0&&!s.players.some(p=>p.folded)&&s.result===null,'Invalid turn');
      demand(s.currentBet===Math.max(...s.players.map(p=>p.street)),'Invalid commitment');
      demand(s.players.every((p,i)=>p.stack+p.committed===s.handStart[i]),'Invalid starting balance');
    } else {
      demand(s.turn===null&&s.players.every(p=>p.committed===0&&p.street===0)&&s.currentBet===0,'Invalid settlement');
      const r=s.result;
      demand(r && ['fold','showdown'].includes(r.reason)&&integer(r.pot)&&r.pot<=s.total&&Array.isArray(r.winners)&&r.winners.length>=1&&r.winners.length<=2&&new Set(r.winners).size===r.winners.length&&r.winners.every(i=>i===0||i===1),'Invalid result');
      demand(Array.isArray(r.payouts)&&r.payouts.length===2&&r.payouts.every(integer)&&sum(r.payouts)===r.pot,'Invalid payout');
      demand(Array.isArray(r.returned)&&r.returned.length===2&&r.returned.every(integer),'Invalid refund');
      demand(JSON.stringify(r.payouts)===JSON.stringify(splitPot(r.pot,r.winners,s.button)),'Invalid split');
      demand(r.pot%2===0 && s.players.every((p,i)=>p.stack===s.handStart[i]-r.pot/2+r.payouts[i]),'Invalid settled balances');
      if(r.reason==='showdown') {
        demand(s.board.length===5&&!s.players.some(p=>p.folded),'Invalid showdown');
        const h=s.players.map(p=>evaluate([...p.hole,...s.board])),c=compare(h[0].score,h[1].score);
        demand(JSON.stringify(r.winners)===JSON.stringify(c===0?[0,1]:[c>0?0:1]),'Invalid winner');
        demand(JSON.stringify(r.hands)===JSON.stringify(h),'Invalid evaluation');
      } else demand(s.players.filter(p=>p.folded).length===1&&!s.players[r.winners[0]].folded&&r.winners.length===1&&r.hands===null,'Invalid fold result');
    }
    return true;
  } catch {return false;}
}

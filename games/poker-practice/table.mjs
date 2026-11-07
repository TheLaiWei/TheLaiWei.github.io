// Practice-only tournament tables. Two-seat games and existing saves use the shared heads-up engine.
import * as headsUp from '../../poker/engine.mjs';
import {combine,empty,startingBag,take,validBag} from '../../poker/chips.mjs';

const amount = n => Number.isSafeInteger(n) && n >= 0;
const requireRule = (ok,msg) => { if (!ok) throw Error(msg); };
const funds = p => p.stack > 0;
const live = p => !p.folded;
const canAct = p => live(p) && funds(p);

function after(s,seat,accept) {
  for(let n=1;n<=s.players.length;n++) {
    const i=(seat+n)%s.players.length;
    if(accept(s.players[i],i)) return i;
  }
  return null;
}

export function newMatch(options) {
  const {names,stack,smallBlind,bigBlind}=options;
  if(names.length===2) return headsUp.newMatch(options);
  requireRule(names.length>=3 && names.length<=8,'Choose 2 to 8 players');
  requireRule(amount(stack) && stack>=2 && stack<=1000000,'Choose 2 to 1,000,000 starting chips');
  requireRule(amount(smallBlind) && smallBlind>0 && amount(bigBlind) && bigBlind>smallBlind && bigBlind<=stack,'Choose blinds: small < big ≤ stack');
  const button=options.button??headsUp.randomBelow(names.length);
  const s={multi:true,revision:0,phase:'complete',hand:0,button:(button+names.length-1)%names.length,
    settings:{stack,smallBlind,bigBlind},players:names.map(name=>({name,stack,wallet:startingBag(stack)}))};
  return nextHand(s);
}

function pay(p,n,plan=take(p.wallet,n)) {
  requireRule(validBag(plan.remaining,p.stack-n) && validBag(plan.paid,n),'Invalid chip transfer');
  p.wallet=plan.remaining;p.wager=combine(p.wager,plan.paid);
  p.stack-=n;p.committed+=n;p.street+=n;
}

export function nextHand(state,deck=headsUp.shuffledDeck()) {
  if(!state.multi) return headsUp.nextHand(state,deck);
  requireRule(state.phase==='complete' && state.players.filter(funds).length>=2,'Match finished');
  const s=structuredClone(state);
  s.button=after(s,s.button,funds);
  if(s.players.filter(funds).length===2 && s.hand) {
    // Assign the next surviving seat the big blind; the other survivor is the button.
    s.bb=after(s,s.bb,funds);s.button=after(s,s.bb,funds);s.sb=s.button;
  } else {
    s.sb=after(s,s.button,funds);s.bb=after(s,s.sb,funds);
  }
  s.hand++;s.revision++;s.phase='playing';s.street='preflop';s.result=null;
  s.board=[];s.deck=[...deck];s.burn=[];s.handStart=s.players.map(p=>p.stack);
  for(const p of s.players) Object.assign(p,{hole:[],folded:!funds(p),street:0,committed:0,wager:empty(),lastBet:null});
  for(let round=0;round<2;round++) {
    for(let n=1;n<=s.players.length;n++) {
      const p=s.players[(s.button+n)%s.players.length];
      if(live(p)) p.hole.push(s.deck.pop());
    }
  }
  pay(s.players[s.sb],Math.min(s.settings.smallBlind,s.players[s.sb].stack));
  pay(s.players[s.bb],Math.min(s.settings.bigBlind,s.players[s.bb].stack));
  s.currentBet=s.minRaise=s.settings.bigBlind;
  advance(s,s.bb);
  return s;
}

export function legal(s,i) {
  if(!s.multi) return headsUp.legal(s,i);
  const p=s.players[i],active=s.phase==='playing' && s.turn===i && canAct(p);
  const owed=Math.max(0,s.currentBet-p.street),maxTo=p.stack+p.street;
  const minTo=s.currentBet+s.minRaise;
  const reopened=p.lastBet===null || s.currentBet-p.lastBet>=s.minRaise;
  const canRaise=active && reopened && maxTo>s.currentBet && s.players.some((q,j)=>i!==j && canAct(q));
  return {active,owed,call:Math.min(owed,p.stack),canCheck:active&&!owed,minTo,maxTo,canRaise,canFullRaise:canRaise && maxTo>=minTo};
}

export function act(state,i,type,to,revision=state.revision,selection=null) {
  if(!state.multi) return headsUp.act(state,i,type,to,revision,selection);
  const l=legal(state,i);
  requireRule(l.active && state.revision===revision,'Wait for your turn');
  const s=structuredClone(state),p=s.players[i];
  switch(type) {
    case 'fold':p.folded=true;break;
    case 'check':requireRule(l.canCheck,'A call is required');break;
    case 'call':requireRule(l.call>0,'Nothing to call');pay(p,l.call,selection??undefined);break;
    case 'raise':
      requireRule(l.canRaise && amount(to) && to>s.currentBet && to<=l.maxTo && (to>=l.minTo || to===l.maxTo),'Invalid raise');
      pay(p,to-p.street,selection??undefined);
      s.minRaise=Math.max(s.minRaise,to-s.currentBet);s.currentBet=to;break;
    default:throw Error('Unknown action');
  }
  p.lastBet=s.currentBet;s.revision++;
  advance(s,i);
  return s;
}

function advance(s,previous) {
  while(s.players.filter(live).length>1) {
    const active=s.players.filter(canAct);
    if(active.length===1) {
      const otherBet=Math.max(0,...s.players.filter(p=>p!==active[0] && live(p)).map(p=>p.street));
      s.currentBet=Math.max(active[0].street,otherBet);
    }
    const turn=after(s,previous,p=>canAct(p) && (p.street<s.currentBet || (active.length>1 && p.lastBet===null)));
    if(turn!==null) {s.turn=turn;return;}
    if(s.street==='river') break;
    s.street=headsUp.STREETS[headsUp.STREETS.indexOf(s.street)+1];
    s.burn.push(s.deck.pop());
    const count=s.street==='flop'?3:1;
    for(let n=0;n<count;n++) s.board.push(s.deck.pop());
    s.currentBet=0;s.minRaise=s.settings.bigBlind;
    for(const p of s.players) {p.street=0;p.lastBet=null;}
    previous=s.button;
  }
  settle(s);
}

function settle(s) {
  const survivors=s.players.filter(live);
  const hands=s.players.map(p=>survivors.length>1 && live(p)?headsUp.evaluate([...p.hole,...s.board]):null);
  const payouts=s.players.map(()=>0),returned=[...payouts],pots=[];
  const levels=[...new Set(s.players.map(p=>p.committed).filter(Boolean))].sort((a,b)=>a-b);
  let previous=0;
  for(const level of levels) {
    const contributors=s.players.map((p,i)=>p.committed>=level?i:-1).filter(i=>i>=0);
    const chips=(level-previous)*contributors.length;
    previous=level;
    if(contributors.length===1) {returned[contributors[0]]+=chips;continue;}
    const eligible=contributors.filter(i=>live(s.players[i]));
    // A sole survivor takes all contested dead money after folds.
    let winners=survivors.length===1?[s.players.indexOf(survivors[0])]:eligible;
    if(winners.length>1) {
      const best=winners.reduce((a,b)=>headsUp.compare(hands[a].score,hands[b].score)>=0?a:b);
      winners=winners.filter(i=>headsUp.compare(hands[i].score,hands[best].score)===0);
    }
    requireRule(winners.length>0,'Missing pot winner');
    winners.sort((a,b)=>(a-s.button-1+s.players.length)%s.players.length-(b-s.button-1+s.players.length)%s.players.length);
    winners.forEach((i,n)=>payouts[i]+=Math.floor(chips/winners.length)+(n<chips%winners.length?1:0));
    pots.push({chips,winners});
  }
  let pool=s.players.reduce((bag,p)=>combine(bag,p.wager),empty());
  for(const [i,p] of s.players.entries()) {
    const award=take(pool,payouts[i]+returned[i]);
    pool=award.remaining;p.wallet=combine(p.wallet,award.paid);p.stack+=payouts[i]+returned[i];
    p.street=p.committed=0;p.wager=empty();
  }
  s.phase='complete';s.turn=null;s.currentBet=0;
  s.result={reason:survivors.length===1?'fold':'showdown',pots,payouts,returned,hands,
    pot:payouts.reduce((a,b)=>a+b,0),winners:payouts.flatMap((v,i)=>v?[i]:[])};
}

export function validateState(s) {
  if(!s?.multi) return headsUp.validateState(s);
  try {
    const ps=s.players;
    if(!Array.isArray(ps)||ps.length<3||ps.length>8||!amount(s.hand)||!amount(s.revision)) return false;
    if(![s.button,s.sb,s.bb].every(i=>Number.isInteger(i)&&i>=0&&i<ps.length) || s.sb===s.bb)return false;
    const {stack,smallBlind,bigBlind}=s.settings;
    if(![stack,smallBlind,bigBlind].every(amount)||!smallBlind||smallBlind>=bigBlind||bigBlind>stack)return false;
    if(s.handStart.length!==ps.length||!s.handStart.every(amount)||!amount(s.currentBet)||!amount(s.minRaise))return false;
    const street=headsUp.STREETS.indexOf(s.street);
    if(street<0||s.board.length!==[0,3,4,5][street]||s.burn.length!==street)return false;
    if(!ps.every((p,i)=>validBag(p.wallet,p.stack)&&validBag(p.wager,p.committed)&&amount(p.stack)&&amount(p.committed)&&
        amount(p.street)&&p.street<=p.committed&&typeof p.folded==='boolean'&&
        (p.lastBet===null||amount(p.lastBet))&&p.hole.length===(s.handStart[i]>0?2:0))) return false;
    const cards=[...s.board,...s.deck,...s.burn,...ps.flatMap(p=>p.hole)];
    if(cards.length!==52||new Set(cards).size!==52||!cards.every(c=>amount(c)&&c<52))return false;
    if(ps.reduce((a,p)=>a+p.stack+p.committed,0)!==s.settings.stack*ps.length)return false;
    if(s.phase==='playing')return !!ps[s.turn]&&canAct(ps[s.turn])&&s.result===null && ps.every((p,i)=>p.stack+p.committed===s.handStart[i]);
    return s.phase==='complete' && s.turn===null && Array.isArray(s.result.pots) &&
      s.result.winners.every(i=>amount(i)&&i<ps.length) && s.result.payouts.length===ps.length &&
      s.result.payouts.every(amount) && s.result.payouts.reduce((a,b)=>a+b,0)===s.result.pot &&
      ps.every(p=>!p.committed&&!p.street);
  } catch {return false;}
}

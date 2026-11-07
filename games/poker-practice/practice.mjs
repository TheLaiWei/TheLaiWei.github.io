import {newMatch,nextHand,act,legal,validateState,cardLabel} from '../../poker/engine.mjs';
import {card,pile,piles,fmt} from '../../poker/table-view.mjs';
import {VALUES,take,valueOf,combine,stageChip,resizePlan} from '../../poker/chips.mjs';
import {perspective,chooseAction,describeAction,reviewDecision} from './strategy.mjs';

const $=id=>document.getElementById(id);
const key='lai-poker-practice:v1';
let match=null, staged=null, timer, persistent=false, ready=false, lastMove=-Infinity;
const state=()=>match.state;
function save() {
  if(!persistent) return;
  try {localStorage.setItem(key,JSON.stringify(match));}
  catch { $('status').textContent='Saving is unavailable. Keep this tab open to continue.'; }
}
function openTable() {
  $('setup').hidden=true;
  $('tabletop').hidden=false;
  $('settings').hidden=false;
  render();
}
function setup() {
  clearTimeout(timer);
  $('setup').hidden=false;
  $('cancel').hidden=!match;
  $('settings').hidden=true;
  $('tabletop').hidden=true;
}
function render() {
  clearTimeout(timer);
  const s=state(), p=s.players[0], bot=s.players[1], l=legal(s,0);
  const done=s.phase==='complete', turn=l.active, pot=p.committed+bot.committed;
  const plan=staged??take(p.wallet,0), amount=valueOf(plan.paid), target=p.street+amount;
  const canRaise=l.canRaise && target>s.currentBet && (target>=l.minTo || target===l.maxTo);
  $('street').textContent='Hand '+s.hand+' · '+(done?'Complete':s.street);
  $('blinds').textContent='Blinds '+s.settings.smallBlind+' / '+s.settings.bigBlind;
  $('cpu-stack').textContent=fmt(bot.stack)+' chips'+(s.button===1?' · Dealer':'');
  $('your-stack').textContent=fmt(valueOf(plan.remaining))+' available'+(s.button===0?' · Dealer':'');
  $('cpu').innerHTML=bot.hole.map(c=>card(c,s.result?.reason!=='showdown')).join('');
  $('you').innerHTML=p.hole.map(c=>card(c)).join('');
  $('board').innerHTML=Array.from({length:5},(_,i)=>card(s.board[i])).join('');
  $('pot').textContent=fmt(done?s.result.pot:pot);
  $('pot-chips').innerHTML=piles(combine(p.wager,bot.wager));
  const last=match.decisions.at(-1);
  let message=turn?'Your turn':'Computer is thinking…';
  if(last) message=(last.seat===1?'Computer':'You')+' · '+last.label+'. '+message;
  if(amount) message='Pending '+fmt(amount)+' · '+(canRaise?'Ready to commit':'Minimum total '+l.minTo);
  if(done) {
    const r=s.result;
    message=r.winners.length===2?'Split pot':r.winners[0]===0?'You win':'Computer wins';
    message+=' · '+fmt(r.pot)+' chips · '+(r.hands?r.hands[r.winners[0]].name:'Fold');
  }
  $('message').textContent=message;
  $('controls').hidden=done;
  $('finished').hidden=!done;
  $('next').textContent=s.players.some(x=>x.stack===0)?'New match':'Next hand';
  $('rack').innerHTML=VALUES.map((v,i)=>`<button data-chip="${v}" ${!turn||!plan.remaining[i]?'disabled':''} aria-label="Stage ${v} chips">${pile(v,plan.remaining[i])}<small>×${plan.remaining[i]}</small></button>`).join('');
  $('call').textContent=l.call?'Call '+fmt(l.call):'Check';
  $('raise').textContent=(s.currentBet?'Raise':'Bet')+(amount?' '+(s.currentBet?'to ':'')+fmt(target):'');
  $('call').disabled=$('fold').disabled=!turn;
  $('min').disabled=!l.canFullRaise;
  $('all').disabled=!turn;
  $('clear').disabled=!turn||!amount;
  $('raise').disabled=!turn||!canRaise;
  if(!done && s.turn===1 && !document.hidden && $('setup').hidden) {
    const revision=s.revision;
    timer=setTimeout(()=>{
      if(state()!==s || state().revision!==revision || document.hidden) return;
      const action=chooseAction(perspective(s,1,match.decisions));
      commit(1,action.type,action.to);
    },450);
  }
}
function commit(seat,type,to) {
  const s=state(), view=perspective(s,seat);
  const amount=type==='raise'?to-view.committed:view.call;
  const selection=seat===0 && staged && ['call','raise'].includes(type)?resizePlan(staged,amount):null;
  const next=act(s,seat,type,to,s.revision,selection);
  // Preserve only the human's decision-time information for the review.
  match.decisions.push({seat,street:view.street,label:describeAction(type,to,view),type,to,
    ...(seat===0?{view}:{})});
  match.state=next;
  staged=null;
  if(seat===0) lastMove=performance.now();
  save();
  render();
}

$('setup').onsubmit=e=>{
  e.preventDefault();
  if(!ready) return;
  const data=new FormData(e.target);
  try {
    const fresh=newMatch({names:['You','Computer'],stack:Number(data.get('stack')),
      smallBlind:Number(data.get('small')),bigBlind:Number(data.get('big'))});
    if(match && !confirm('Replace this practice match with a new one?')) return;
    match={state:fresh,decisions:[]};staged=null;save();openTable();
  } catch(error) { $('status').textContent=error.message; }
};
$('settings').onclick=setup;
$('cancel').onclick=openTable;
$('next').onclick=()=>{
  if(state().phase!=='complete') return;
  if(state().players.some(x=>x.stack===0)) return setup();
  match={state:nextHand(state()),decisions:[]};save();render();
};
$('controls').onclick=e=>{
  const b=e.target.closest('button');
  if(!b || b.disabled || !match || !legal(state(),0).active || performance.now()-lastMove<180) return;
  const p=state().players[0], l=legal(state(),0), plan=staged??take(p.wallet,0);
  if(b.dataset.chip) staged=stageChip(plan,Number(b.dataset.chip));
  else switch(b.id) {
    case 'min': staged=resizePlan(plan,l.minTo-p.street);break;
    case 'all':
      if(l.maxTo<=state().currentBet) {
        if(confirm('Call all-in for '+l.call+'?')) commit(0,'call');
        return;
      }
      staged=resizePlan(plan,p.stack);break;
    case 'clear': staged=null;break;
    case 'fold': if(confirm('Fold this hand?')) commit(0,'fold');return;
    case 'call': commit(0,l.owed?'call':'check');return;
    case 'raise': commit(0,'raise',p.street+valueOf(plan.paid));return;
  }
  render();
};

function line(parent,tag,text) {
  const el=document.createElement(tag);
  el.textContent=text;
  parent.append(el);
  return el;
}
function showGrade(parent,{entry,verdict,reason}) {
  const row=line(parent,'article','');
  row.className='decision';
  const label=line(row,'div','');
  const badge=line(label,'b',verdict);
  badge.className='verdict '+verdict.toLowerCase();
  line(label,'strong',entry.street+' · '+entry.label);
  line(row,'p',reason);
}
$('review').onclick=()=>{
  const s=state();
  if(s.phase!=='complete') return;
  const report=$('report');report.replaceChildren();
  const net=s.players[0].stack-s.handStart[0];
  line(report,'small','Hand '+s.hand+' · '+(net>0?'+':'')+net+' chips · '+s.players[0].hole.map(cardLabel).join(' '));
  const grades=match.decisions.filter(d=>d.seat===0).map(entry=>({entry,...reviewDecision(entry)}));
  if (!grades.length) line(report,'p','The hand ended before you had a decision to make.');
  else {
    const priority={Bad:0,Close:1,Good:2};
    const highlights=[...grades].sort((a,b)=>priority[a.verdict]-priority[b.verdict] || b.entry.view.pot-a.entry.view.pot).slice(0,2);
    highlights.forEach(g=>showGrade(report,g));
    const rest=grades.filter(g=>!highlights.includes(g));
    if(rest.length){
      const details=line(report,'details','');
      line(details,'summary','Other decisions ('+rest.length+')');
      rest.forEach(g=>showGrade(details,g));
    }
    line(report,'small','Practice grades use the cards visible then and estimated equity against a random hand.');
  }
  $('analysis').showModal();
};
$('close').onclick=()=>$('analysis').close();
document.addEventListener('visibilitychange',()=>{
  clearTimeout(timer);
  if(match && !document.hidden && $('setup').hidden) render();
});

function initialize(canSave) {
  ready=true;persistent=canSave;
  if(canSave) {
    try {
      const saved=JSON.parse(localStorage.getItem(key));
      if(saved && validateState(saved.state) && Array.isArray(saved.decisions)) match=saved;
    } catch { $('status').textContent='The previous session could not be loaded.'; }
  } else $('status').textContent='This session is available while the tab stays open.';
  if(match) openTable(); else setup();
  $('setup').querySelector('button.primary').disabled=false;
}
$('setup').querySelector('button.primary').disabled=true;
$('settings').hidden=true;
if(navigator.locks) {
  navigator.locks.request(key,{ifAvailable:true},async lock=>{
    if(!lock) { $('status').textContent='Practice is open in another tab. Close it there and refresh here.';return; }
    initialize(true);
    await new Promise(resolve=>window.addEventListener('pagehide',resolve,{once:true}));
  }).catch(()=>initialize(false));
} else initialize(false);
window.addEventListener('pageshow',e=>{if(e.persisted) location.reload();});
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

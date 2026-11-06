import {newMatch,nextHand,act,legal,cardLabel,suit,validateState} from './engine.mjs';
import {SAVE_KEY,loadGame,saveGame,InteractionGate} from './session.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const gate=new InteractionGate(), amounts=[[],[]];
let state=null,saved=null,ownsLock=false,releaseLock=null,ephemeral=false,storage=null,storageOK=true,paused=false,sound=false,audio=null,toastTimer,confirmation=null,workerRegistration=null;
try {storage=window.localStorage;}catch{storageOK=false;}
const fmt=n=>n.toLocaleString('en-US');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const total=i=>amounts[i].reduce((a,b)=>a+b,0);
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3200);}
function status(text){$('#welcome-status').textContent=text;$('#save-status').textContent=text;}
function persist(){
  if(!ownsLock||!state||ephemeral)return;
  storageOK=storage && saveGame(storage,state);
  if(!storageOK)status('Saving is unavailable. This match lives only in this tab; refreshing may lose it.');
  else status('Saved on this device. Private cards stay hidden when you resume.');
}
function load(){
  const result=loadGame(storage);saved=result.state;
  $('#resume-box').hidden=!saved;
  if(saved){$('#saved-summary').textContent=`${saved.players.map(p=>p.name).join(' & ')} · Hand ${saved.hand}`;$('#start').firstChild.textContent='Start a new match ';}
  if(result.error)status(result.error);
}
async function acquireLock(){
  if(!navigator.locks){
    // Fail closed for shared persistence on older browsers; isolated in-memory games are safe.
    ephemeral=true;ownsLock=true;status('This browser cannot safely share saved games between tabs. Play here without saving, or use a current browser.');return;
  }
  try {
    await navigator.locks.request('lai-classic-poker:active-game',{ifAvailable:true},async lock=>{
      if(!lock){ownsLock=false;gate.pause();$('#pause').hidden=false;$('#pause-message').textContent='This game is already open in another tab or Home Screen window. Close it there, then reload here.';$('#resume-play').textContent='Check again';return;}
      ownsLock=true;load();
      await new Promise(resolve=>releaseLock=resolve);
      ownsLock=false;releaseLock=null;
    });
  }catch {ownsLock=false;status('Could not safely open the game. Reload this page to try again.');}
}
void acquireLock();
function card(c,hidden=false,slot=false){
  if(slot)return '<span class="card slot" aria-label="Undealt community card">·</span>';
  if(hidden)return '<span class="card back" aria-label="Face-down private card"></span>';
  const label=cardLabel(c),r=label.slice(0,-1),s=label.slice(-1);
  return `<span class="card ${[1,3].includes(suit(c))?'red':''}" role="img" aria-label="${label}"><span class="corner" aria-hidden="true">${r}<small>${s}</small></span><span class="suit" aria-hidden="true">${s}</span><span class="corner bottom" aria-hidden="true">${r}<small>${s}</small></span></span>`;
}
function coins(value){
  // Make change automatically, keeping useful low denominations on the table.
  const counts={1:0,5:0,25:0,100:0};let rest=value;
  for(const [v,n] of [[1,10],[5,8],[25,10]]){counts[v]=Math.min(n,Math.floor(rest/v));rest-=counts[v]*v;}
  for(const v of [100,25,5,1]){const n=Math.floor(rest/v);counts[v]+=n;rest-=n*v;}
  return counts;
}
function chipTray(i,disabled){
  const available=Math.max(0,state.players[i].stack-total(i)),counts=coins(available);
  return `<div class="chip-tray" aria-label="${esc(state.players[i].name)} chip denominations">${[1,5,25,100].map((v,k)=>`<button class="chip-button chip-${['white','red','green','blue'][k]}" data-action="chip" data-value="${v}" data-player="${i}" ${disabled||counts[v]===0?'disabled':''} aria-label="Add ${v} chips for ${esc(state.players[i].name)}"><span class="chip-art" aria-hidden="true">${v}</span><span class="chip-count">× ${counts[v]}</span></button>`).join('')}</div>`;
}
function handCards(i){
  const visible=!gate.blocked&&(gate.peek?.player===i || (state.result?.reason==='showdown'));
  return state.players[i].hole.map(c=>card(c,!visible)).join('');
}
function resultText(i){
  const r=state.result;if(!r)return '';
  const won=r.winners.includes(i);
  let text=r.winners.length===2?`Split pot · ${fmt(r.payouts[i])} each`:won?`You win ${fmt(r.pot)}`:`${state.players[1-i].name} wins ${fmt(r.pot)}`;
  if(r.hands)text+=` · ${r.hands[i].name}`;
  else text+=' · Fold';
  if(r.returned[i])text+=` · ${fmt(r.returned[i])} returned`;
  return text;
}
function renderPlayer(i){
  const p=state.players[i],l=legal(state,i),staged=total(i),to=p.street+staged;
  const complete=state.phase==='complete',disabled=!l.active||gate.blocked||!!gate.peek||!ownsLock;
  const valid=l.canRaise&&to>state.currentBet&&to<=l.maxTo&&(to>=l.minTo||to===l.maxTo);
  const raiseLabel=staged?`${state.currentBet?'Raise to':'Bet'} ${fmt(to)}`:'Build a bet';
  const wonMatch=complete&&state.players.some(p=>p.stack===0);
  const publicCards=state.result?.reason==='showdown';
  const panel=$(`#player-${i}`);panel.classList.toggle('complete',complete);panel.dataset.active=String(l.active);panel.setAttribute('aria-label',`${p.name} area`);
  panel.innerHTML=`<div class="hand-row"><div class="hole-cards" id="holes-${i}">${handCards(i)}</div><div class="peek-group"><button class="peek" data-peek="${i}" ${complete||gate.blocked?'disabled':''}>${publicCards?'Showdown':'Hold to peek'}</button><span class="peek-note">${complete?(publicCards?'BOTH HANDS ARE PUBLIC':'CARDS STAY PRIVATE'):'SHIELD YOUR CARDS'}</span></div></div>
    ${complete?`<p class="result-copy">${esc(resultText(i))}</p><div class="result-actions"><button class="primary" data-action="${wonMatch?'new':'next'}" data-player="${i}">${wonMatch?'New match ↗':'Next hand →'}</button></div>`:
    `<div class="wager-readout"><span>In this round <strong>${fmt(p.street)}</strong></span><span>${staged?'Add <strong>'+fmt(staged)+'</strong>'+(!valid?' · min '+fmt(l.minTo):''):l.active?(l.owed?'To call <strong>'+fmt(l.call)+'</strong>':'Your move'):'Waiting for opponent'}</span></div>
    <div class="quick-actions"><button data-action="undo" data-player="${i}" ${disabled||!staged?'disabled':''}>Undo</button><button data-action="clear" data-player="${i}" ${disabled||!staged?'disabled':''}>Clear</button><button data-action="min" data-player="${i}" ${disabled||!l.canFullRaise?'disabled':''}>${state.currentBet?'Min raise':'Min bet'}</button><button data-action="allin" data-player="${i}" ${disabled?'disabled':''}>All-in</button></div>
    <div class="main-actions"><button class="fold" data-action="fold" data-player="${i}" ${disabled?'disabled':''}>Fold</button><button data-action="call" data-player="${i}" ${disabled?'disabled':''}>${l.owed?`Call ${fmt(l.call)}`:'Check'}</button><button class="commit" data-action="commit" data-player="${i}" ${disabled||!valid?'disabled':''}>${raiseLabel}</button></div>`}
    ${chipTray(i,disabled||complete)}
    <div class="player-footer"><span class="player-name">${state.button===i?'<span class="dealer" title="Dealer and small blind">D</span>':''}${esc(p.name)}</span><span class="turn-badge">${complete?(wonMatch?(p.stack?'MATCH WON':'GOOD GAME'):'HAND COMPLETE'):l.active?'YOUR TURN':p.stack===0?'ALL-IN':'WAITING'}</span><span class="player-balance" aria-label="Balance ${p.stack}">${fmt(p.stack)}</span></div>`;
}
function render(){
  if(!state)return;
  $('#welcome').hidden=true;$('#table').hidden=false;
  renderPlayer(0);renderPlayer(1);
  $('#board').innerHTML=Array.from({length:5},(_,n)=>n<state.board.length?card(state.board[n]):card(null,false,true)).join('');
  const pot=state.phase==='complete'?state.result.pot:state.players.reduce((a,p)=>a+p.committed,0);
  for(const side of ['near','far']){$(`#pot-${side}`).textContent=fmt(pot);$(`#street-${side}`).textContent=`HAND ${state.hand} · ${state.phase==='complete'?'SETTLED':state.street.toUpperCase()}`;}
  $('#match-info').textContent=`Hand ${state.hand} · Blinds ${state.settings.smallBlind} / ${state.settings.bigBlind}`;
  $('#history').replaceChildren(...state.log.map(line=>{const li=document.createElement('li');li.textContent=line;return li;}));
  $('#update-button').hidden=!workerRegistration?.waiting;
  $('#update-button').disabled=state.phase!=='complete';
}
function renderPeek(){
  if(!state)return;
  for(let i=0;i<2;i++){
    $(`#holes-${i}`).innerHTML=handCards(i);
    const button=$(`[data-peek="${i}"]`);button.classList.toggle('active',gate.peek?.player===i);
    button.textContent=state.result?.reason==='showdown'?'Showdown':gate.peek?.player===i?'Release to hide':'Hold to peek';
  }
  // Do not replace the captured pointer's element while peeking.
  $$('[data-action]').forEach(b=>{if(gate.peek)b.disabled=true;});
}
function stopPeek(source){if(gate.endPeek(source)){render();}}
function pause(message='Ready when you both are.'){
  gate.pause();amounts[0]=[];amounts[1]=[];paused=!!state;
  if(state){render();$('#pause-message').textContent=message;$('#pause').hidden=false;}
}
function openDialog(id){gate.pause();if(state)render();$(id).showModal();}
$$('dialog').forEach(d=>d.addEventListener('close',()=>{if(!$$('dialog[open]').length&&!paused&&ownsLock){gate.resume();render();}}));
$$('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
function confirmAction(title,copy,yes,fn){$('#confirm-title').textContent=title;$('#confirm-copy').textContent=copy;$('#confirm-yes').textContent=yes;confirmation=fn;openDialog('#confirm');}
$('#confirm-no').addEventListener('click',()=>$('#confirm').close());
$('#confirm-yes').addEventListener('click',()=>{const fn=confirmation;confirmation=null;$('#confirm').close();fn?.();});
function freshSetup(){
  stopPeek();$$('dialog[open]').forEach(d=>d.close());state=null;paused=false;gate.resume();$('#table').hidden=true;$('#welcome').hidden=false;$('#pause').hidden=true;load();
}
function requestFresh(){confirmAction('Start a fresh match?','This match stays saved until you deal the new one. Both players should agree.','Choose settings',freshSetup);}
function start(options){
  if(!ownsLock)return toast('Close the game in the other tab first.');
  try{state=newMatch(options);saved=null;amounts[0]=[];amounts[1]=[];gate.resume();persist();render();beep();}
  catch(e){$('#setup-error').textContent=e.message;}
}
$('#setup').addEventListener('submit',e=>{
  e.preventDefault();$('#setup-error').textContent='';
  const f=new FormData(e.target),options={names:[String(f.get('near')).trim(),String(f.get('far')).trim()],stack:Number(f.get('stack')),smallBlind:Number(f.get('small')),bigBlind:Number(f.get('big'))};
  if(saved)confirmAction('Replace the saved match?','Your previous match will be replaced when the new cards are dealt.','Deal new match',()=>start(options));else start(options);
});
$('#resume-saved').addEventListener('click',()=>{
  if(!ownsLock)return;
  const latest=loadGame(storage);if(!latest.state){saved=null;load();return;}
  state=latest.state;gate.resume();amounts[0]=[];amounts[1]=[];render();
});
$('#resume-play').addEventListener('click',()=>{
  if(!ownsLock){location.reload();return;}
  paused=false;$('#pause').hidden=true;gate.resume();render();
});
$('#new-match').addEventListener('click',requestFresh);
$('#welcome-help').addEventListener('click',()=>openDialog('#help'));
$('#help-button').addEventListener('click',()=>openDialog('#help'));
$$('[data-menu]').forEach(b=>b.addEventListener('click',()=>openDialog('#menu')));
function beep(){
  if(!sound)return;
  try{audio??=new (window.AudioContext||window.webkitAudioContext)();void audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=540;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.09);o.start();o.stop(audio.currentTime+.1);}catch{}
}
$('#sound-toggle').addEventListener('click',()=>{sound=!sound;$('#sound-toggle').textContent=`Sound: ${sound?'on':'off'}`;beep();});
function commit(i,type,to){
  const revision=state.revision;
  state=act(state,i,type,to,revision);gate.committed();amounts[0]=[];amounts[1]=[];persist();render();beep();
}
$('#table').addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled||!ownsLock||!gate.canAct()||e.detail>1)return;
  const i=Number(b.dataset.player),action=b.dataset.action,l=legal(state,i);
  try{
    if(action==='new'){requestFresh();return;}
    if(action==='next'){state=nextHand(state);gate.committed();amounts[0]=[];amounts[1]=[];persist();render();beep();return;}
    if(!l.active)return;
    if(action==='chip'){const v=Number(b.dataset.value);if(total(i)+v<=state.players[i].stack)amounts[i].push(v);}
    else if(action==='undo')amounts[i].pop();
    else if(action==='clear')amounts[i]=[];
    else if(action==='min')amounts[i]=[l.minTo-state.players[i].street];
    else if(action==='allin'){
      if(l.maxTo<=state.currentBet){confirmAction('Call all-in?',`Commit your remaining ${fmt(state.players[i].stack)} chips?`,'Call all-in',()=>{gate.resume();commit(i,'call');});return;}
      if(l.canRaise)amounts[i]=[state.players[i].stack];
    }
    else if(action==='call'){commit(i,l.owed?'call':'check');return;}
    else if(action==='commit'){commit(i,'raise',state.players[i].street+total(i));return;}
    else if(action==='fold'){
      confirmAction(`${state.players[i].name}: fold?`,'Your cards will stay private. The other player wins this hand.','Fold hand',()=>{gate.resume();commit(i,'fold');});return;
    }
    render();
  }catch(err){toast(err.message);}
});
$('#table').addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-peek]');if(!b||b.disabled||e.button!==0||!ownsLock)return;
  e.preventDefault();const i=Number(b.dataset.peek);
  if(gate.beginPeek(i,e.pointerId)){b.setPointerCapture(e.pointerId);renderPeek();}
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(name,e=>stopPeek(e.pointerId));
$('#table').addEventListener('contextmenu',e=>{if(e.target.closest('[data-peek]'))e.preventDefault();});
$('#table').addEventListener('keydown',e=>{
  const b=e.target.closest('[data-peek]');if(!b||b.disabled||![' ','Enter'].includes(e.key))return;
  e.preventDefault();if(!e.repeat&&gate.beginPeek(Number(b.dataset.peek),'keyboard'))renderPeek();
});
document.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key))stopPeek('keyboard');});
window.addEventListener('blur',()=>{if(state)pause();else stopPeek();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',()=>{pause();releaseLock?.();});
window.addEventListener('pageshow',e=>{if(e.persisted){void acquireLock();pause();}});
window.addEventListener('storage',e=>{
  if(e.key===SAVE_KEY && state && ownsLock){pause('The saved game changed in another window. Reload to safely resume.');ownsLock=false;}
});
// A waiting worker is activated only by explicit request between hands.
if('serviceWorker' in navigator && location.protocol!=='file:'){
  navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{
    workerRegistration=reg;
    const ready=()=>{if(reg.waiting){$('#update-button').hidden=false;if(!state)status('An update is ready. Open a match menu between hands to apply it.');}};
    ready();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',()=>{ready();if(reg.active&&!reg.waiting)status('Ready for offline play. Saves stay on this device.');}));
    navigator.serviceWorker.ready.then(()=>{if(!reg.waiting&&storageOK)status('Ready for offline play. Saves stay on this device.');});
  }).catch(()=>status('Offline caching is unavailable. Keep this page open to continue playing.'));
}
$('#update-button').addEventListener('click',()=>{
  if(state?.phase!=='complete'||!workerRegistration?.waiting)return;
  persist();workerRegistration.waiting.postMessage({type:'ACTIVATE'});
});
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(workerRegistration?.active && state?.phase==='complete'){location.reload();}});

import {map,cells,sides,opposite,relays,terrainNames,structures,units,spec,pieceName,mobile,at,byId,grid,fresh,usableSave,paths,damage,canHit,activationReason,placements,producers,purchaseReason,exits,gateUnits,landings,distance,relaySide,apply} from './rules.js';
import {loadArt,Battlefield} from './battlefield.js';
import {CommandAudio} from './audio.js';

const $=id=>document.getElementById(id);
const SAVE='laiwei.iron-current.match.v1', PREF='laiwei.iron-current.options.v1';
let canSave=true;
function read(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null;}catch{return null;}}
function write(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true;}catch{canSave=false;return false;}}
function match(first){const n=fresh(first);n.id=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);return n;}
const toss=()=>Math.random()<.5?'US':'SU';
let g=read(SAVE);
if(!usableSave(g)){g=match(toss());write(SAVE,g);}
const defaults={music:28,effects:65,grid:true,coords:false,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,flashes:!matchMedia('(prefers-reduced-motion: reduce)').matches,faceToFace:false};
const settings={...defaults,...(read(PREF)||{})};
for(const k of ['music','effects'])if(!Number.isFinite(settings[k])||settings[k]<0||settings[k]>100)settings[k]=defaults[k];
const audio=new CommandAudio(settings);
document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});
document.addEventListener('keydown',()=>audio.unlock(),{once:true});
let art,field,action={mode:'idle'},busy=false,working=false,modal=null,previousFocus=null,lastSide=null,toastTimer=0;
function el(tag,cls,txt){
  const node=document.createElement(tag);if(cls)node.className=cls;if(txt!=null)node.textContent=txt;return node;
}
function msg(s){const t=$('toast');t.textContent=s;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,3400);}
function asset(side,kind){const i=el('img','sprite');i.src=art.icon(side+'-'+kind);i.alt='';i.draggable=false;return i;}
function own(kind){return g.pieces.filter(p=>p.side===g.side&&p.kind===kind);}
function cellNames(keys){return keys.join(', ');}
function inspect(p,enter=true){
  if(!p){action={mode:'idle'};return;}
  action={mode:'inspect',id:p.id};
  if(!enter || p.side!==g.side || g.phase!=='play')return;
  if(p.queue && !p.queue.ticks && exits(g,p).length){action.mode='deploy';return;}
  if(activationReason(g,p))return;
  if(p.kind==='device')action.mode=p.side==='US'?'gate':'surge';
  else action.mode='field';
}
function cancel(){
  if(busy||working||g.phase!=='play')return;
  const p=byId(g,action.id);
  if(p && ['field','gate','surge','deploy'].includes(action.mode) && (action.to||action.target||action.unit)){inspect(p);}
  else action={mode:'idle'};
  paint();
}
function pick(cell){
  if(working||modal||g.phase==='handoff'||(busy&&g.phase==='over'))return;
  const occupant=at(g,cell),piece=byId(g,action.id);audio.sound('select');
  if(g.phase==='over'){if(occupant)inspect(occupant,false);else action={mode:'terrain',cell};paint();return;}
  switch(action.mode){
    case 'buy':{
      const t=spec(g.side,action.kind),why=purchaseReason(g,action.kind);
      if(!why){
        if(t.producer && occupant && producers(g,action.kind).some(p=>p.id===occupant.id)){action.id=occupant.id;break;}
        if(!t.producer && placements(g,action.kind).has(cell)){action.to=cell;break;}
      }
      if(occupant){inspect(occupant);break;}
      msg(why || (t.producer?'Select a highlighted producer.':'Select a highlighted construction hex.'));return;
    }
    case 'deploy':
      if(exits(g,piece).includes(cell)){action.to=cell;break;}
      if(occupant){inspect(occupant);break;}msg('Select an open hex beside the producer.');return;
    case 'gate': {
      if(occupant && gateUnits(g,piece).some(p=>p.id===occupant.id)){action.unit=occupant.id;action.to=null;break;}
      const unit=byId(g,action.unit);
      if(unit && landings(g,unit).includes(cell)){action.to=cell;break;}
      if(occupant){inspect(occupant);break;}msg(unit?'Choose a highlighted landing hex.':'Select a ready friendly unit near the Gate.');return;
    }
    case 'surge':
      if(map[cell].terrain!=='water'&&distance(piece.cell,cell)<=6){action.to=cell;break;}
      if(occupant){inspect(occupant);break;}msg('Mark land or a bridge within 6 hexes of the Array.');return;
    case 'field':{
      const route=paths(g,piece);
      if(occupant?.side===g.side){inspect(occupant);break;}
      if(occupant){
        let from=action.to||piece.cell;
        if(!canHit(piece,from,occupant)){
          const firingHex=[...route].filter(([k])=>canHit(piece,k,occupant)).sort((a,b)=>a[1].cost-b[1].cost)[0];
          if(!firingHex){inspect(occupant,false);break;}from=firingHex[0];
        }
        action.to=from;action.target=occupant.id;break;
      }
      if(route.has(cell)){action.to=cell;action.target=null;break;}
      action={mode:'terrain',cell};break;
    }
    default:if(occupant)inspect(occupant);else action={mode:'terrain',cell};
  }
  paint();
}
function chooseBuy(kind){
  if(working||modal||g.phase!=='play')return;
  const previous=byId(g,action.id),t=spec(g.side,kind);
  action={mode:'buy',kind};
  if(t.producer){const available=producers(g,kind);if(available.length===1)action.id=available[0].id;
    else if(previous && available.some(v=>v.id===previous.id))action.id=previous.id;}
  $('console').querySelector('.rail').classList.remove('open');
  audio.sound('select');paint();
}
function nextCmd(){
  const a=action,p=byId(g,a.id);
  if(g.phase!=='play')return null;
  if(a.mode==='buy'&&!purchaseReason(g,a.kind)){
    const t=spec(g.side,a.kind);
    if(t.producer?p:!!a.to)return {type:'buy',kind:a.kind,cell:a.to,id:a.id};
  }
  if(a.mode==='field'&&p&&(a.target || (a.to&&a.to!==p.cell)))return {type:'field',id:p.id,to:a.to||p.cell,target:a.target};
  if(a.mode==='deploy'&&p&&a.to)return {type:'deploy',id:p.id,cell:a.to};
  if(a.mode==='gate'&&a.unit&&a.to)return {type:'special',id:p.id,unit:a.unit,cell:a.to};
  if(a.mode==='surge'&&a.to)return {type:'special',id:p.id,cell:a.to};
  return null;
}
function stats(p){
  const s=spec(p.side,p.kind);
  return p.hp+' / '+(p.ticks?3:s.hp)+' HP'+(s.move?' · Move '+s.move:'')+(s.range?' · Range '+(s.min?s.min+'–':'')+s.range+' · Hit '+s.hit:'');
}
function forecast(){
  const a=action,p=byId(g,a.id),s=p&&spec(p.side,p.kind),enemy=byId(g,a.target);
  const view={selected:p?.id,target:enemy?.id,moves:[],sites:[],targets:[],to:a.to};
  let title='Switchyard Crossing',kicker=sides[g.side]+' field command',body='Select a rifle squad to move, or choose Barracks to expand your base.',label='Confirm order',portrait=[g.side,'hq'];
  switch(a.mode){
    case 'field':{
      const routes=paths(g,p),from=a.to||p.cell;view.moves=[...routes.keys()].filter(k=>k!==p.cell);
      view.targets=g.pieces.filter(t=>canHit(p,from,t)).map(o=>o.cell);
      view.route=routes.get(from)?.route;view.targetCell=enemy?.cell;
      title=pieceName(p)+' · '+p.cell;portrait=[p.side,p.kind];kicker=from!==p.cell?'Route preview':'Unit selected';
      if(enemy){const n=damage(p,enemy);kicker='Target forecast';body=(from!==p.cell?'Move to '+from+' and fire. ':'')+pieceName(enemy)+' at '+enemy.cell+' · '+n+' damage · '+enemy.hp+' → '+Math.max(0,enemy.hp-n)+' HP.';label=from!==p.cell?'Move + fire':'Fire';}
      else if(from!==p.cell){body='Move to '+from+' · '+routes.get(from).cost+' / '+s.move+' movement. '+(view.targets.length?'Tap an outlined enemy to add a shot.':'Confirm to move.');label='Move to '+from;}
      else body=stats(p)+'. '+(s.move?'Tap a highlighted hex or an enemy.':'Tap an enemy in range.');
      break;
    }
    case 'inspect':{
      if(!p)break;
      portrait=[p.side,p.kind];title=pieceName(p)+' · '+p.cell;kicker=sides[p.side]+' '+(p.ticks?'construction site':mobile(p)?'unit':'facility');
      const powered=!p.ticks && grid(g,p.side).online.has(p.id);
      if(p.ticks)body=p.hp+' / 3 site HP · '+p.ticks+' build tick'+(p.ticks===1?'':'s')+' left.';
      else if(p.queue)body=stats(p)+'. '+spec(p.side,p.queue.kind).name+(p.queue.ticks?' · '+p.queue.ticks+' tick'+(p.queue.ticks===1?'':'s')+' left.':' ready. '+(powered?'Clear an adjacent exit for deployment.':'Power the producer to deploy.'));
      else if(p.kind==='device')body=stats(p)+' · Charge '+p.charge+' / 3. '+(p.side===g.side?activationReason(g,p):s.note);
      else if(s.move||p.kind==='turret')body=stats(p)+'. '+(p.side===g.side?activationReason(g,p)||s.note:s.note);
      else body=stats(p)+'. '+(!powered?'Offline. Restore grid capacity.':s.note);
      break;
    }
    case 'terrain':{
      const c=map[a.cell];title=terrainNames[c.terrain]+' · '+a.cell;kicker='Terrain';
      body={sand:'Costs 1 move. An empty sand hex next to a friendly base can host a building.',road:'Costs 1 move. Roads lead to the bridge crossings.',grove:'Costs 2 movement. Infantry take 1 less direct-fire damage here.',water:'Impassable to ground units.',ore:'Costs 1 move. Friendly infantry on an adjacent hex can secure a refinery site.',bridge:'Costs 1 move. Infantry here count toward relay control at the end of the round.'}[c.terrain];view.to=c.key;break;
    }
    case 'buy':{
      const t=spec(g.side,a.kind),why=purchaseReason(g,a.kind);title=t.name+' · '+t.cost+' credits';kicker=t.producer?'Train unit':'Construction';portrait=[g.side,a.kind];
      const timing=t.ticks+' turn'+(t.ticks===1?'':'s')+' · '+(t.power?t.power+' power draw. ':t.supply?'+'+t.supply+' power. ':'');
      if(why){body=why+' '+t.note;label='Unavailable';}
      else if(t.producer){
        const all=producers(g,a.kind);view.sites=all.map(v=>v.cell);
        body=timing+(p?'Producer '+p.cell+'. '+t.note:'Tap a highlighted producer.');label='Train unit';
      }else{
        view.sites=[...placements(g,a.kind)];view.ghost=a.to?{side:g.side,kind:a.kind,cell:a.to}:null;
        body=timing+(a.to?'Place at '+a.to+'. '+t.note:(a.kind==='refinery'?'Select an ore seam beside friendly infantry.':'Select a highlighted sand hex beside a friendly building.'));label='Build'+(a.to?' at '+a.to:'');
      }break;
    }
    case 'deploy':{
      const k=p.queue.kind;portrait=[p.side,k];title='Deploy '+spec(p.side,k).name;kicker='Production ready';view.sites=exits(g,p);
      body=a.to?'Deploy at '+a.to+' for free. The unit can act immediately.':'Tap an empty hex beside '+pieceName(p)+' at '+p.cell+'.';label='Deploy unit';break;
    }
    case 'surge':{
      portrait=[p.side,p.kind];title='Surge Array · '+p.cell;kicker='Signature order';
      view.sites=cells.filter(c=>c.terrain!=='water'&&distance(c.key,p.cell)<=6).map(c=>c.key);
      if(a.to){view.warn=[a.to,...map[a.to].near];body='Mark '+a.to+'. Next Soviet upkeep deals 3 to every mobile piece in the marked area, including your own.';}
      else body='Choose a land or bridge hex within range 6. The opponent gets a turn to leave the area.';
      label='Mark target';break;
    }
    case 'gate':{
      const u=byId(g,a.unit);portrait=[p.side,p.kind];title='Vector Gate · '+p.cell;kicker='Signature order';
      view.sites=u?landings(g,u):gateUnits(g,p).map(v=>v.cell);
      if(u){view.route=a.to?[u.cell,a.to]:null;body=pieceName(u)+' at '+u.cell+'. '+(a.to?'Relocate to '+a.to+' and mark it spent.':'Tap an empty destination up to 4 hexes away.');}
      else body=view.sites.length?'Select a ready friendly unit within 3 hexes.':'Bring a ready friendly unit within 3 hexes of the Gate.';
      label='Relocate';break;
    }
  }
  if(g.phase==='over'){kicker='Match complete';if(a.mode==='idle')body=g.ending;}
  return {view,title,kicker,body,label,portrait};
}
function paint(){
  if(!art)return;
  const root=$('console');root.dataset.side=g.side;root.classList.toggle('reversed',settings.faceToFace && g.side!==g.first);
  $('round').textContent='Round '+String(g.round).padStart(2,'0')+' / 16';$('active-side').textContent=sides[g.side]+' turn';$('side-name').textContent=sides[g.side]+' command';$('credits').textContent=String(g.cash[g.side]).padStart(6,'0');
  $('pips').textContent=g.orders+' / 2';$('req').textContent=g.req?'Available':'Used';
  const power=grid(g,g.side);$('power-text').textContent=power.demand+' / '+power.supply+(power.demand>power.supply?' · LOW':'');
  document.querySelector('.power').classList.toggle('danger',power.demand>power.supply);
  const meter=$('power-meter');meter.replaceChildren();meter.setAttribute('aria-label','Power demand '+power.demand+', supply '+power.supply+', online draw '+power.draw);
  const steps=16,max=Math.max(1,power.supply,power.demand);for(let i=0;i<steps;i++)meter.append(el('i',i*max/steps<power.demand?(i/steps<.75?'on':'high'):''));
  $('bridges').replaceChildren(...relays.map((k,i)=>{const side=relaySide(g,k);const n=el('span','relay-tag '+(side?.toLowerCase()||''),k+(side?' '+side:''));n.title=(i===0?'North':'South')+' bridge · '+(side?sides[side]+' infantry':'neutral');return n;}));
  if(lastSide!==g.side){for(const [id,list] of [['build-list',structures],['unit-list',units]]){
    const host=$(id);host.replaceChildren();for(const kind of list){const st=spec(g.side,kind),b=el('button','cameo');b.type='button';b.dataset.kind=kind;
      b.append(asset(g.side,kind),el('strong','',st.name),el('b','',String(st.cost)));b.onclick=()=>chooseBuy(kind);host.append(b);}
  }lastSide=g.side;}
  for(const b of document.querySelectorAll('.cameo')){const k=b.dataset.kind,s=spec(g.side,k),reason=purchaseReason(g,k);b.setAttribute('aria-disabled',String(!!reason));b.title=s.name+' · '+s.cost+' credits. '+(reason||s.note);
    b.setAttribute('aria-label',(s.producer?'Train ':'Build ')+s.name+', '+s.cost+' credits'+(reason?'. '+reason:''));b.classList.toggle('chosen',action.mode==='buy' && action.kind===k);}
  const queue=$('queue');queue.replaceChildren(el('h3','','Production'));
  const entries=g.pieces.filter(p=>p.side===g.side && (p.ticks||p.queue));
  if(!entries.length)queue.append(el('p','','Queue open'));
  for(const p of entries){let txt;
    if(p.ticks)txt=pieceName(p)+' · '+p.cell+' · '+p.ticks+'T';
    else{const nm=spec(p.side,p.queue.kind).name;txt=p.queue.ticks?nm+' · '+p.cell+' · '+p.queue.ticks+'T':nm+' · '+p.cell+' · Deploy';if(!power.online.has(p.id))txt+=' · Offline';}
    const b=el('button',p.queue?.ticks===0?'ready':'',txt);b.onclick=()=>{if(busy||working||modal||g.phase!=='play')return;inspect(p);$('console').querySelector('.rail').classList.remove('open');paint();};queue.append(b);}
  const f=forecast();$('readout-title').textContent=f.title;$('readout-text').textContent=f.body;$('readout-kicker').textContent=f.kicker;
  const portraitKey=f.portrait.join('-');if($('portrait').dataset.key!==portraitKey){$('portrait').replaceChildren(asset(...f.portrait));$('portrait').dataset.key=portraitKey;}
  $('confirm').textContent=busy||working?'Resolving':f.label;$('confirm').disabled=!nextCmd()||busy||working;
  $('cancel').hidden=action.mode==='idle'||g.phase!=='play';$('cancel').disabled=busy||working;
  const last=g.history.at(-1);$('latest').textContent=last?('R'+last.round+' '+last.side+' · '+last.msg):'Secure both bridges with infantry or destroy the enemy construction yard.';
  const endLabel=g.phase==='over'?'Match result':g.phase==='handoff'?'Begin turn':'End turn';
  for(const id of ['end','mobile-end']){$(id).textContent=endLabel;$(id).disabled=busy||working;}
  field?.update(f.view);
}
function closeDialog(force=false){
  if(!modal||(!force&&modal.locked))return;
  $('shade').hidden=true;modal=null;
  for(const e of document.querySelectorAll('.top,.map-column,.rail'))e.inert=false;
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
}
function dialog(title,kicker,body,actions,locked=false){
  if(!modal)previousFocus=document.activeElement;
  modal={locked,title};clearTimeout(toastTimer);$('toast').hidden=true;
  for(const e of document.querySelectorAll('.top,.map-column,.rail'))e.inert=true;
  $('dialog-title').textContent=title;$('dialog-kicker').textContent=kicker;$('dialog-body').replaceChildren(...body);
  const buttons=$('dialog-actions');buttons.replaceChildren();
  for(const [name,fn,primary] of actions){const b=el('button','switch'+(primary?' primary':''),name);b.onclick=fn;buttons.append(b);}
  $('dialog-x').hidden=locked;$('shade').hidden=false;$('dialog').scrollTop=0;
  requestAnimationFrame(()=>{if(modal)$('dialog').focus({preventScroll:true});});
}
const para=s=>el('p','',s);
function logLines(items){
  if(!items.length)return [para('No field orders were issued.')];
  const list=el('ul');for(const s of items){list.append(el('li','',s));}return [list];
}
function handoff(){
  const next=opposite(g.side),round=g.round+(next===g.first?1:0);
  dialog('Pass to '+sides[next]+' command','Turn handoff',[
    para(sides[g.side]+' command has ended its turn. '+sides[next]+' command begins round '+round+'.'),
    ...logLines(g.turnLog),para('Relay hold streak · Allies '+g.streak.US+' / 2 · Soviets '+g.streak.SU+' / 2.')
  ],[['Begin '+sides[next]+' turn',()=>execute({type:'begin'}),true]],true);
}
function showResult(){
  dialog(g.winner?sides[g.winner]+' victory':'Match drawn','Operation complete',[para(g.ending),para('Round '+g.round+' · North bridge '+(sides[relaySide(g,'G3')]||'neutral')+' · South bridge '+(sides[relaySide(g,'G7')]||'neutral')+'.')],[
    ['Rematch · '+sides[opposite(g.first)]+' first',()=>resetMatch(opposite(g.first)),true],['Review battlefield',()=>closeDialog(true)]],true);
}
function report(){
  const list=el('div');if(!g.history.length)list.append(para('Orders and income will appear here as the match progresses.'));
  for(const event of [...g.history].reverse()){const row=el('p','report-row');row.append(el('small','', 'R'+event.round+' '+event.side+'  '),document.createTextNode(event.msg));list.append(row);}
  dialog('Field radio','Order history',[list],[['Return to field',()=>closeDialog(),true]]);
}
function briefing(){
  const h=el('div','manual-grid');
  for(const [title,body] of [
    ['Win the crossing','Destroy the enemy construction yard, or hold both G3 and G7 with infantry at two consecutive round ends. At round 16, compare relay count, then HQ health.'],
    ['Move and fire','Each player activates up to two different pieces per turn. Tap a unit, a highlighted hex and an optional enemy, then confirm. You can also tap a target to preview a firing position.'],
    ['Build a base','You start with 220 credits. Tap Barracks, choose sand beside your base, then confirm. One paid order per turn. Buildings take ticks at the start of your own turns.'],
    ['Train and deploy','Order troops from a completed, powered barracks or Motor Works. Select a ready queue, tap a clear adjacent hex, then deploy for free. A new unit can act immediately.'],
    ['Ore and power','From round two, collect 20 plus 30 per online refinery. Build a refinery on ore next to friendly infantry. Power plants add 6 capacity. Low power pauses lower-priority facilities.'],
    ['Hex terrain','A normal step costs 1. Groves cost 2 and protect infantry from 1 direct-fire damage. Units and water block movement. Fire range counts hex edges and ignores intervening pieces.'],
    ['Signature devices','An online Signal Lab supports the Vector Gate or Surge Array. At 3 charge, the Gate relocates a ready unit. The Surge marks a seven-hex blast for the next Soviet upkeep, including friendly units.'],
    ['Share the screen','End Turn hands the board to the other commander. Options can rotate their view, change audio, or show coordinates. Zoom in and drag the field or use the radar to pan.']
  ]){const box=el('div');box.append(el('h3','',title),para(body));h.append(box);}
  dialog('Field manual','Switchyard Crossing',[h],[['Return to field',()=>closeDialog(),true]]);
}
function settingsPanel(){
  const lines=[para('Two-player local match · Switchyard Crossing')];
  for(const [key,name] of [['music','Music volume'],['effects','Effects volume'],['grid','Show hex grid'],['coords','Show hex coordinates'],['faceToFace','Rotate view for the opposite seat'],['motion','Animate movement and effects'],['flashes','Full-strength weapon flashes']]){
    const l=el('label','option-row'),cap=el('span','',name),input=el('input');input.type=['music','effects'].includes(key)?'range':'checkbox';
    if(input.type==='range'){input.min='0';input.max='100';input.step='1';input.value=settings[key];}else input.checked=settings[key];
    input.oninput=()=>{settings[key]=input.type==='range'?Number(input.value):input.checked;write(PREF,settings);audio.update(settings);paint();};
    l.append(cap,input);lines.push(l);
  }
  lines.push(para(canSave?'The match saves on this device after every confirmed order and handoff.':'This browser cannot save the match. Keep this tab open to finish it.'));
  const back=el('a','switch','Projects / Fun');back.href='/projects/#fun';
  dialog('Options','Command console',lines,[['Resume',()=>closeDialog(),true],['Field manual',briefing],['New match',newMatchDialog]]);$('dialog-actions').append(back);
}
function newMatchDialog(){
  dialog('Start a new match?','Switchyard Crossing',[para('A new battle replaces the saved match on this device. Choose which commander opens.')],[['Coin toss',()=>resetMatch(toss()),true],['Allies first',()=>resetMatch('US')],['Soviets first',()=>resetMatch('SU')],['Cancel',settingsPanel]]);
}
function resetMatch(first){
  closeDialog(true);g=match(first);write(SAVE,g);action={mode:'idle'};busy=false;field.timeline=null;field.setZoom(1);field.focusCell(first==='US'?'B4':'K6',false);paint();msg(sides[first]+' command has the first turn.');
}
function sync(next){
  if(!usableSave(next))return;g=next;working=false;busy=false;if(field)field.timeline=null;action={mode:'idle'};closeDialog(true);paint();
  if(g.phase==='handoff')handoff();if(g.phase==='over')showResult();
}
async function execute(cmd){
  if(!cmd||working||busy)return;
  audio.unlock();const baseId=g.id,baseRevision=g.revision;working=true;paint();
  const commit=()=>{
    const current=read(SAVE);
    if(usableSave(current)&&(current.id!==baseId||current.revision!==baseRevision)){sync(current);msg('The match was updated in another tab. Review the current board.');return;}
    const {state,events}=apply(g,cmd);closeDialog(true);g=state;write(SAVE,g);working=false;busy=events.length>0;action={mode:'idle'};
    if(cmd.type==='field'){const p=byId(g,cmd.id);if(p)inspect(p,false);}
    if(cmd.type==='buy' && cmd.cell)inspect(at(g,cmd.cell),false);
    if(cmd.type==='deploy')inspect(at(g,cmd.cell));
    paint();
    const after=()=>{busy=false;
      if(cmd.type==='begin' && action.mode==='idle')field.focusCell(g.side==='US'?'B4':'K6',false);
      paint();if(g.phase==='handoff')handoff();if(g.phase==='over')showResult();
    };
    if(cmd.type==='end')audio.sound('end');
    if(events.length)field.play(events,k=>audio.sound(k),after);else after();
  };
  try{if(navigator.locks?.request)await navigator.locks.request(SAVE,commit);else commit();}
  catch(e){working=false;busy=false;paint();msg(e.message||'Order could not be issued.');}
}
function endTurn(){if(busy||working)return;if(g.phase==='over')showResult();else if(g.phase==='handoff')handoff();else execute({type:'end'});}
$('confirm').onclick=()=>execute(nextCmd());$('cancel').onclick=cancel;$('end').onclick=endTurn;$('mobile-end').onclick=endTurn;
$('options').onclick=()=>{if(!busy&&!working)settingsPanel();};$('open-log').onclick=()=>{if(!busy&&!working)report();};
$('dialog-x').onclick=()=>closeDialog();$('shade').onclick=e=>{if(e.target===$('shade'))closeDialog();};
$('show-production').onclick=()=>document.querySelector('.rail').classList.toggle('open');
$('hide-production').onclick=()=>document.querySelector('.rail').classList.remove('open');
window.addEventListener('storage',e=>{if(e.key===SAVE && e.newValue){try{const n=JSON.parse(e.newValue);if(n.id!==g.id||n.revision!==g.revision)sync(n);}catch{}}});
document.addEventListener('keydown',e=>{
  if(modal){
    if(e.key==='Escape'){e.preventDefault();closeDialog();}
    if(e.key==='Tab'){
      const f=[...$('dialog').querySelectorAll('button:not([hidden]), input, a[href]')].filter(v=>!v.disabled),first=f[0],last=f.at(-1);
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog'))){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }return;
  }
  if(e.key==='Escape'){document.querySelector('.rail').classList.remove('open');cancel();}
});
async function openBattlefield(){
  try{
    art=await loadArt();
    field=new Battlefield(art,pick,()=>({g,settings}));
    $('loadmsg').hidden=true;
    field.focusCell(g.side==='US'?'B4':'K6',false);
    paint();
    if(g.phase==='handoff')handoff();
    else if(g.phase==='over')showResult();
  }catch(error){
    $('loadmsg').textContent='The battlefield could not load. Reload this page to reconnect.';
    console.error(error);
  }
}
openBattlefield();

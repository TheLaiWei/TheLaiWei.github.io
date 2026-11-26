import {map,cells,sides,opposite,home,relays,terrainNames,structures,units,spec,pieceName,mobile,at,byId,grid,fresh,usableSave,importLegacy,paths,damage,canHit,activationReason,placements,producers,purchaseReason,gateUnits,landings,distance,relaySide,apply} from './rules.js?v=3';
import {loadArt,Battlefield} from './battlefield.js?v=3';
import {zh} from './zh.js?v=3';
import {CommandAudio} from './audio.js';

const $=id=>document.getElementById(id);
const OLD='laiwei.iron-current.match.v1', SAVE='laiwei.iron-current.match.v2', PREF='laiwei.iron-current.options.v1';
let canSave=true;
function read(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null;}catch{return null;}}
function write(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true;}catch{canSave=false;return false;}}
function match(first){const n=fresh(first);n.id=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);return n;}
const toss=()=>Math.random()<.5?'US':'SU';
let g=read(SAVE);
if(!usableSave(g)){g=importLegacy(read(OLD))||match(toss());write(SAVE,g);}
const defaults={music:28,effects:65,grid:true,coords:false,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,flashes:!matchMedia('(prefers-reduced-motion: reduce)').matches,faceToFace:false};
const settings={...defaults,...(read(PREF)||{})};
const requestedLanguage=new URL(location.href).searchParams.get('lang');
function supportedLanguage(code){return /^zh(?:-|$)/i.test(code||'')?'zh':/^en(?:-|$)/i.test(code||'')?'en':null;}
settings.lang=supportedLanguage(requestedLanguage)||supportedLanguage(settings.lang)||supportedLanguage(navigator.language)||'en';
if(supportedLanguage(requestedLanguage))write(PREF,settings);
const T=value=>settings.lang==='zh'?zh(value):value;
const L=(english,chinese)=>settings.lang==='zh'?chinese:english;
const staticText=[...document.querySelectorAll('[data-i18n]')].map(node=>[node,node.textContent]);
const staticAttributes=[];
for(const attr of ['aria-label','title']){
  for(const node of document.querySelectorAll('['+attr+']'))staticAttributes.push([node,attr,node.getAttribute(attr)]);
}
const originalTitle=document.title,description=document.querySelector('meta[name=description]'),originalDescription=description.content;
function localizePage(){
  document.documentElement.lang=L('en','zh-CN');document.title=T(originalTitle);description.content=T(originalDescription);
  for(const [node,source] of staticText)node.textContent=T(source);
  for(const [node,attr,source] of staticAttributes)node.setAttribute(attr,T(source));
  for(const id of ['language','dialog-language']){
    const b=$(id);b.textContent=L('中文','English');b.lang=L('zh-CN','en');
    b.setAttribute('aria-label',L('切换到简体中文','Switch to English'));
  }
}
for(const k of ['music','effects'])if(!Number.isFinite(settings[k])||settings[k]<0||settings[k]>100)settings[k]=defaults[k];
const audio=new CommandAudio(settings);
document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});
document.addEventListener('keydown',()=>audio.unlock(),{once:true});
let art,field,action={mode:'idle'},working=false,modal=null,previousFocus=null,lastSide=null,toastTimer=0;
function el(tag,cls,txt){
  const node=document.createElement(tag);if(cls)node.className=cls;if(txt!=null)node.textContent=T(txt);return node;
}
function msg(s){const t=$('toast');t.textContent=T(s);t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,2800);}
function asset(side,kind){const i=el('img','sprite');i.src=art.icon(side+'-'+kind);i.alt='';i.draggable=false;return i;}
function inspect(p,enter=true){
  if(!p){action={mode:'idle'};return;}
  action={mode:'inspect',id:p.id};
  if(!enter || p.side!==g.side || g.phase!=='play')return;
  if(activationReason(g,p))return;
  if(p.kind==='device')action.mode=p.side==='US'?'gate':'surge';
  else action.mode='field';
}
function cancel(){
  if(working||g.phase!=='play')return;
  const p=byId(g,action.id);
  if(p && ['field','gate','surge'].includes(action.mode) && (action.to||action.target||action.unit)){inspect(p);}
  else action={mode:'idle'};
  paint();
}
function pick(cell){
  if(working||modal||g.phase==='handoff')return;
  const occupant=at(g,cell),piece=byId(g,action.id);audio.sound('select');
  if(g.phase==='over'){if(occupant)inspect(occupant,false);else action={mode:'terrain',cell};paint();return;}
  const repeatsDestination=action.to===cell && !action.target;
  const repeatsTarget=occupant && occupant.id===action.target;
  if((repeatsDestination||repeatsTarget) && nextCmd()){execute(nextCmd());return;}
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
  if(t.producer){const available=producers(g,kind);action.id=(available.find(v=>v.id===previous?.id)||available[0])?.id;}
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
  if(a.mode==='gate'&&a.unit&&a.to)return {type:'special',id:p.id,unit:a.unit,cell:a.to};
  if(a.mode==='surge'&&a.to)return {type:'special',id:p.id,cell:a.to};
  return null;
}
function stats(p){
  const s=spec(p.side,p.kind);
  return p.hp+' / '+(p.ticks?3:s.hp)+' HP'+(s.move?' · Move '+s.move:'')+(s.range?' · Range '+(s.min?s.min+'–':'')+s.range+' · Hit '+s.hit:'');
}
function remaining(n){return L(n+' own turn'+(n===1?'':'s')+' left','还需 '+n+' 个己方回合');}
function jobStatus(p,power){
  if(p.ticks)return L('Under construction','施工中')+' · '+remaining(p.ticks);
  if(!power.online.has(p.id))return L('Paused · needs power','暂停 · 供电不足');
  return L('In production','生产中')+' · '+remaining(p.queue.ticks);
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
      if(p.ticks)body=jobStatus(p,grid(g,p.side))+' · '+T(p.hp+' / 3 site HP');
      else if(p.queue)body=T(spec(p.side,p.queue.kind).name)+' · '+jobStatus(p,grid(g,p.side));
      else if(p.kind==='device')body=stats(p)+' · Charge '+p.charge+' / 3. '+(p.side===g.side?activationReason(g,p):s.note);
      else if(s.move||p.kind==='turret')body=stats(p)+'. '+(p.side===g.side?activationReason(g,p)||s.note:s.note);
      else body=stats(p)+'. '+(!powered?'Offline. Restore grid capacity.':s.note);
      break;
    }
    case 'terrain':{
      const c=map[a.cell];title=terrainNames[c.terrain]+' · '+a.cell;kicker='Terrain';
      body={sand:'Costs 1 move. An empty sand hex next to a friendly base can host a building.',road:'Costs 1 move. Roads lead to the bridge crossings.',grove:'Costs 2 movement. Infantry take 1 less direct-fire damage here.',water:'Impassable to ground units.',ore:'Costs 1 move. Friendly infantry on an adjacent hex can secure a refinery site.',bridge:'Costs 1 move. Infantry here count toward relay control at the end of the round.',ford:L('Costs 1 move. Cross the river here to flank either base. Only the two bridges score relay control.','消耗 1 点移动力，可从浅滩渡河包抄。只有两座桥计入据点控制。')}[c.terrain];view.to=c.key;break;
    }
    case 'buy':{
      const t=spec(g.side,a.kind),why=purchaseReason(g,a.kind);title=t.name+' · '+t.cost+' credits';kicker=t.producer?'Train unit':'Construction';portrait=[g.side,a.kind];
      const timing=T(t.ticks+' turn'+(t.ticks===1?'':'s'))+' · '+(t.power?T(t.power+' power draw')+' · ':t.supply?T('+'+t.supply+' power')+' · ':'');
      if(why){body=T(why)+' '+T(t.note);label='Unavailable';}
      else if(t.producer){
        const all=producers(g,a.kind);view.sites=all.map(v=>v.cell);
        body=timing+(p?L('Producer '+p.cell,'生产设施 '+p.cell):T('Tap a highlighted producer.'));
        if(all.length>1)body+=L(' · Tap another highlighted facility to change.',' · 轻点另一处高亮设施即可更换。');
        label='Train unit';
      }else{
        view.sites=[...placements(g,a.kind)];view.ghost=a.to?{side:g.side,kind:a.kind,cell:a.to}:null;
        body=timing+(a.to?L('Tap '+a.to+' again or confirm to build.','再次轻点 '+a.to+' 或确认建造。'):T(a.kind==='refinery'?'Select an ore seam beside friendly infantry.':'Select a highlighted sand hex beside a friendly building.'));label='Build'+(a.to?' at '+a.to:'');
      }break;
    }
    case 'reserve':{
      const unit=g.reserve.find(r=>r.id===a.ticket);
      if(!unit)break;
      portrait=[unit.side,unit.kind];title=T(spec(unit.side,unit.kind).name)+' · '+unit.origin;kicker='Reserve';view.to=unit.origin;
      body=L('Unit complete. On your turn, clear an exit within 3 hexes of a producer. The unit deploys automatically.','部队已就绪。在己方回合为生产设施腾出出口，部队就会自动部署到三格内的空地。');break;
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
let panelState=null,panelLanguage=null;
function paintProduction(power){
  const queue=$('queue'),jobs=g.pieces.filter(p=>p.side===g.side && (p.ticks||p.queue));
  const reserves=g.reserve.filter(r=>r.side===g.side);
  const arrivals=g.arrivals[g.side].map(r=>byId(g,r.id)).filter(Boolean).reverse();
  const count=jobs.length+reserves.length;
  $('req').textContent=String(jobs.filter(p=>p.ticks).length);
  $('show-production').textContent=T('Production')+(count?' ('+count+')':'');
  queue.replaceChildren(el('h3','','Production status'));
  function row(kind,location,status,style,select,progress){
    const b=el('button','job '+style),copy=el('span','job-copy');
    const name=T(spec(g.side,kind).name);
    copy.append(el('strong','',name+' · '+location),el('small','',status));
    if(progress){
      const bar=el('progress');bar.max=progress[1];bar.value=progress[0];
      bar.setAttribute('aria-label',T('Production progress'));copy.append(bar);
    }
    b.type='button';b.append(asset(g.side,kind),copy);
    b.onclick=()=>{
      if(working||modal||g.phase!=='play')return;
      document.querySelector('.rail').classList.remove('open');
      field.centerCell(location);select();paint();
    };
    queue.append(b);
  }
  for(const r of reserves)row(r.kind,r.origin,L('Complete · exits blocked','已完成 · 出口被堵'),'reserve',()=>{action={mode:'reserve',ticket:r.id};});
  for(const p of jobs){
    const k=p.ticks?p.kind:p.queue.kind,total=spec(p.side,k).ticks,left=p.ticks||p.queue.ticks;
    row(k,p.cell,jobStatus(p,power),p.ticks?'building':power.online.has(p.id)?'training':'paused',()=>inspect(p,false),[total-left,total]);
  }
  for(const p of arrivals){
    row(p.kind,p.cell,mobile(p)?L('Deployed · locate unit','已部署 · 定位部队'):L('Completed · locate site','已建成 · 定位建筑'),'ready',()=>inspect(p));
  }
  if(!count&&!arrivals.length)queue.append(el('p','','Queue open'));
}
function paint(){
  if(!art)return;
  const root=$('console');root.dataset.side=g.side;root.classList.toggle('reversed',settings.faceToFace && g.side!==g.first);
  $('round').textContent=T('Round '+String(g.round).padStart(2,'0')+' / 16');$('active-side').textContent=T(sides[g.side]+' turn');$('side-name').textContent=T(sides[g.side]+' command');$('credits').textContent=String(g.cash[g.side]).padStart(6,'0');
  $('pips').textContent=g.orders+' / 2';
  const power=grid(g,g.side);$('power-text').textContent=power.demand+' / '+power.supply+(power.demand>power.supply?' · '+T('LOW'):'');
  document.querySelector('.power').classList.toggle('danger',power.demand>power.supply);
  const meter=$('power-meter');meter.replaceChildren();meter.setAttribute('aria-label',T('Power demand '+power.demand+', supply '+power.supply+', online draw '+power.draw));
  const steps=16,max=Math.max(1,power.supply,power.demand);for(let i=0;i<steps;i++)meter.append(el('i',i*max/steps<power.demand?(i/steps<.75?'on':'high'):''));
  $('bridges').replaceChildren(...relays.map((k,i)=>{const side=relaySide(g,k);const n=el('span','relay-tag '+(side?.toLowerCase()||''),k+(side?' '+T(side):''));n.title=T((i===0?'North':'South')+' bridge · '+(side?sides[side]+' infantry':'neutral'));return n;}));
  if(lastSide!==g.side){for(const [id,list] of [['build-list',structures],['unit-list',units]]){
    const host=$(id);host.replaceChildren();for(const kind of list){const st=spec(g.side,kind),b=el('button','cameo');b.type='button';b.dataset.kind=kind;
      b.append(asset(g.side,kind),el('strong','',st.name),el('b','',String(st.cost)),el('span','owned-count'));b.onclick=()=>chooseBuy(kind);host.append(b);}
  }lastSide=g.side;}
  const refresh=panelState!==g||panelLanguage!==settings.lang;
  for(const b of document.querySelectorAll('.cameo')){
    const k=b.dataset.kind;
    if(refresh){const s=spec(g.side,k),reason=purchaseReason(g,k);
      b.setAttribute('aria-disabled',String(!!reason));
      b.title=T(s.name)+' · '+T(s.cost+' credits')+L('. ','。')+T(reason||s.note);
      b.setAttribute('aria-label',T((s.producer?'Train ':'Build ')+s.name+', '+s.cost+' credits')+(reason?' · '+T(reason):''));
      const count=s.producer?0:g.pieces.filter(p=>p.side===g.side && p.kind===k).length;
      b.querySelector('.owned-count').textContent=count?'×'+count:'';
    }
    b.classList.toggle('chosen',action.mode==='buy' && action.kind===k);
  }
  if(refresh){paintProduction(power);panelState=g;panelLanguage=settings.lang;}
  const f=forecast();$('readout-title').textContent=T(f.title);$('readout-text').textContent=T(f.body);$('readout-kicker').textContent=T(f.kicker);
  const portraitKey=f.portrait.join('-');if($('portrait').dataset.key!==portraitKey){$('portrait').replaceChildren(asset(...f.portrait));$('portrait').dataset.key=portraitKey;}
  $('confirm').textContent=T(working?'Resolving':f.label);$('confirm').disabled=!nextCmd()||working;
  $('cancel').hidden=action.mode==='idle'||g.phase!=='play';$('cancel').disabled=working;
  const last=g.history.at(-1);$('latest').textContent=T(last?('R'+last.round+' '+last.side+' · '+last.msg):'Secure both bridges with infantry or destroy the enemy construction yard.');
  const endLabel=g.phase==='over'?'Match result':g.phase==='handoff'?'Begin turn':'End turn';
  for(const id of ['end','mobile-end']){$(id).textContent=T(endLabel);$(id).disabled=working;}
  field?.update(f.view);
}
function closeDialog(force=false){
  if(!modal||(!force&&modal.locked))return;
  $('shade').hidden=true;modal=null;
  for(const e of document.querySelectorAll('.top,.map-column,.rail'))e.inert=false;
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
}
function dialog(title,kicker,body,actions,locked=false,redraw=null){
  if(!modal)previousFocus=document.activeElement;
  modal={locked,redraw};clearTimeout(toastTimer);$('toast').hidden=true;
  for(const e of document.querySelectorAll('.top,.map-column,.rail'))e.inert=true;
  $('dialog-title').textContent=T(title);$('dialog-kicker').textContent=T(kicker);$('dialog-body').replaceChildren(...body);
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
  ],[['Begin '+sides[next]+' turn',()=>execute({type:'begin'}),true]],true,handoff);
}
function showResult(){
  dialog(g.winner?sides[g.winner]+' victory':'Match drawn','Operation complete',[para(g.ending),para('Round '+g.round+' · North bridge '+(sides[relaySide(g,relays[0])]||'neutral')+' · South bridge '+(sides[relaySide(g,relays[1])]||'neutral')+'.')],[
    ['Rematch · '+sides[opposite(g.first)]+' first',()=>resetMatch(opposite(g.first)),true],['Review battlefield',()=>closeDialog(true)]],true,showResult);
}
function report(){
  const list=el('div');if(!g.history.length)list.append(para('Orders and income will appear here as the match progresses.'));
  for(const event of [...g.history].reverse()){const row=el('p','report-row');row.append(el('small','', 'R'+event.round+' '+event.side),document.createTextNode('  '+T(event.msg)));list.append(row);}
  dialog('Field radio','Order history',[list],[['Return to field',()=>closeDialog(),true]],false,report);
}
function briefing(){
  const h=el('div','manual-grid');
  for(const [title,body] of [
    ['Win the crossing',L('Destroy the enemy construction yard, or hold J5 and J9 with infantry at two consecutive round ends. The J1 and J13 fords give you flanking routes. At round 16, relay count and then HQ health decide the match.','摧毁敌方建造场，或用步兵连续两轮在结算时控制 J5 与 J9。可经 J1 和 J13 的浅滩绕行。第 16 轮结束时先比较据点数，再比较建造场耐久。')],
    ['Move and fire',L('Activate two different pieces each turn. Select a unit, then a destination or enemy. Tap the same hex again or use Confirm. Select your next unit while the previous order animates.','每回合可指挥两个不同单位。先选单位，再选目的地或敌人。再次轻点同一格或点击确认即可执行。动画播放时也可指挥下一支部队。')],
    ['Build a base',L('Start with 220 credits. Place as many copies of a structure as you can afford on highlighted sites. All sites advance together at the start of your turns. Tap a production row to find it on the map.','开局有 220 资金。只要资金和空地足够，就能同时建造多座同类建筑。每次己方回合开始时，所有工地一同推进。轻点生产列表可定位工地。')],
    ['Train and deploy',L('Each powered barracks or factory trains one unit at a time. Finished units deploy to the nearest open ground within three hexes and can pass through friendly positions. A blocked unit waits in reserve while the factory can train again. On your turn, clear an exit at any matching facility to deploy the unit automatically.','每座有电的兵营或战车工厂都能独立生产一个单位。部队完工后可穿过己方阵地，自动部署到三格内最近的空地。出口全部被堵时，部队进入后备队，工厂可继续生产。在己方回合为任一同类设施腾出出口，后备部队便会自动出场。')],
    ['Ore and power','From round two, collect 20 plus 30 per online refinery. Build a refinery on ore next to friendly infantry. Power plants add 6 capacity. Low power pauses lower-priority facilities.'],
    ['Hex terrain','A normal step costs 1. Groves cost 2 and protect infantry from 1 direct-fire damage. Units and water block movement. Fire range counts hex edges and ignores intervening pieces.'],
    ['Signature devices','An online Signal Lab supports the Vector Gate or Surge Array. At 3 charge, the Gate relocates a ready unit. The Surge marks a seven-hex blast for the next Soviet upkeep, including friendly units.'],
    ['Share the screen','End Turn hands the board to the other commander. Options can rotate their view, change audio, or show coordinates. Zoom in and drag the field or use the radar to pan.']
  ]){const box=el('div');box.append(el('h3','',title),para(body));h.append(box);}
  dialog('Field manual','Switchyard Crossing',[h],[['Return to field',()=>closeDialog(),true]],false,briefing);
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
  dialog('Options','Command console',lines,[['Resume',()=>closeDialog(),true],['Field manual',briefing],['New match',newMatchDialog]],false,settingsPanel);$('dialog-actions').append(back);
}
function newMatchDialog(){
  dialog('Start a new match?','Switchyard Crossing',[para('A new battle replaces the saved match on this device. Choose which commander opens.')],[['Coin toss',()=>resetMatch(toss()),true],['Allies first',()=>resetMatch('US')],['Soviets first',()=>resetMatch('SU')],['Cancel',settingsPanel]],false,newMatchDialog);
}
function resetMatch(first){
  closeDialog(true);g=match(first);write(SAVE,g);action={mode:'idle'};
  if(field){field.timeline=null;field.openSector(home[first]);}
  paint();msg(sides[first]+' command has the first turn.');
}
function sync(next){
  if(!usableSave(next))return;g=next;working=false;if(field){field.timeline=null;field.centerCell(home[g.side]);}action={mode:'idle'};closeDialog(true);paint();
  if(g.phase==='handoff')handoff();if(g.phase==='over')showResult();
}
async function execute(cmd){
  if(!field||!cmd||working)return;
  audio.unlock();const baseId=g.id,baseRevision=g.revision;working=true;paint();
  const commit=()=>{
    const current=read(SAVE);
    if(usableSave(current)&&(current.id!==baseId||current.revision!==baseRevision)){sync(current);msg('The match was updated in another tab. Review the current board.');return;}
    const {state,events}=apply(g,cmd);closeDialog(true);field.timeline=null;g=state;write(SAVE,g);working=false;action={mode:'idle'};
    if(cmd.type==='field'){const p=byId(g,cmd.id);if(p)inspect(p,false);}
    if(cmd.type==='buy'){
      if(cmd.cell && !purchaseReason(g,cmd.kind))action={mode:'buy',kind:cmd.kind};
      else if(cmd.cell)inspect(at(g,cmd.cell),false);
      else inspect(byId(g,cmd.id),false);
    }
    if(cmd.type==='begin')field.centerCell(home[g.side]);
    paint();
    if(cmd.type==='end')audio.sound('end');
    if(events.length)field.play(events,k=>audio.sound(k));
    if(g.phase==='handoff')handoff();else if(g.phase==='over')showResult();
  };
  try{if(navigator.locks?.request)await navigator.locks.request(SAVE,commit);else commit();}
  catch(e){working=false;paint();msg(e.message||'Order could not be issued.');}
}
function endTurn(){if(working)return;if(g.phase==='over')showResult();else if(g.phase==='handoff')handoff();else execute({type:'end'});}
$('confirm').onclick=()=>execute(nextCmd());$('cancel').onclick=cancel;$('end').onclick=endTurn;$('mobile-end').onclick=endTurn;
$('options').onclick=()=>{if(!working)settingsPanel();};$('open-log').onclick=()=>{if(!working)report();};
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
function switchLanguage(){
  settings.lang=settings.lang==='zh'?'en':'zh';write(PREF,settings);
  const url=new URL(location.href);url.searchParams.set('lang',settings.lang);history.replaceState(null,'',url);
  $('toast').hidden=true;lastSide=null;localizePage();paint();modal?.redraw?.();
}
$('language').onclick=switchLanguage;$('dialog-language').onclick=switchLanguage;
localizePage();
async function openBattlefield(){
  try{
    art=await loadArt();
    field=new Battlefield(art,pick,()=>({g,settings,translate:T}));
    $('loadmsg').hidden=true;
    field.openSector(home[g.side]);
    paint();
    if(g.phase==='handoff')handoff();
    else if(g.phase==='over')showResult();
  }catch(error){
    $('loadmsg').textContent=T('The battlefield could not load. Reload this page to reconnect.');
    console.error(error);
  }
}
openBattlefield();

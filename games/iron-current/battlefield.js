import {cells,map,WIDTH,HEIGHT,RX,RY,spec,at,byId,grid,footprint,relays,relaySide} from './rules.js';

const $=id=>document.getElementById(id);
const widths={hq:91,generator:73,refinery:84,barracks:75,works:94,lab:77,turret:63,device:79,tank:77,light:64,rifle:46,rocket:43,hauler:32};
const ink={US:'#89cdf3',SU:'#f49276',aim:'#fbd175',move:'#a6d5ca',violet:'#d8b1ff'};
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
function hex(ctx,c,inset=0) {
  const a=RX-inset,b=RY-inset;
  ctx.beginPath();ctx.moveTo(c.x,c.y-b);ctx.lineTo(c.x+a,c.y-b/2);ctx.lineTo(c.x+a,c.y+b/2);
  ctx.lineTo(c.x,c.y+b);ctx.lineTo(c.x-a,c.y+b/2);ctx.lineTo(c.x-a,c.y-b/2);ctx.closePath();
}
function outline(ctx,key,fill,edge,width=2,inset=3) {
  const c=map[key];if (!c) return;hex(ctx,c,inset);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(edge){ctx.strokeStyle=edge;ctx.lineWidth=width;ctx.stroke();}
}
function bracket(ctx,x,y,w,h,color) {
  for(const sx of [-1,1])for(const sy of [-1,1]){
    const a=x+sx*w,b=y+sy*h;ctx.beginPath();ctx.moveTo(a-sx*9,b);ctx.lineTo(a,b);ctx.lineTo(a,b-sy*8);
    ctx.strokeStyle='#172016';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  }
}
function health(ctx,x,y,value,max,w=44) {
  x=Math.round(x-w/2);y=Math.round(y);ctx.fillStyle='#11160f';ctx.fillRect(x-2,y-1,w+4,7);
  ctx.fillStyle='#4c4234';ctx.fillRect(x,y,w,4);
  ctx.fillStyle=value/max>.55?'#a4e77a':value/max>.3?'#e9c265':'#fc7857';ctx.fillRect(x,y,w*value/max,4);
  for(let i=1;i<Math.min(max,8);i++){ctx.fillStyle='#3c4437';ctx.fillRect(x+w*i/Math.min(max,8),y,1,4);}
}
function tag(ctx,key,label,color) {
  const {x,y}=map[key];ctx.save();ctx.font='bold 12px monospace';ctx.textAlign='center';
  const w=ctx.measureText(label).width+10;ctx.fillStyle='#20261ee8';ctx.fillRect(x-w/2,y+22,w,17);
  ctx.strokeStyle=color;ctx.strokeRect(x-w/2,y+22,w,17);ctx.fillStyle=color;ctx.fillText(label,x,y+35);ctx.restore();
}
function routeLine(ctx,route,time) {
  if(!route || route.length<2)return;
  ctx.save();ctx.setLineDash([4,6]);ctx.lineDashOffset=-(time*16)%10;ctx.strokeStyle='#fbdf90';ctx.lineWidth=3;ctx.beginPath();
  route.forEach((k,i)=>{const p=map[k];if(i===0)ctx.moveTo(p.x,p.y+8);else ctx.lineTo(p.x,p.y+8);});ctx.stroke();ctx.restore();
}
function lightning(ctx,a,b,t) {
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;ctx.beginPath();ctx.moveTo(a.x,a.y);
  for(let i=1;i<11;i++){const u=i/11,j=Math.sin(i*49+Math.floor(t*14)*27)*Math.sin(u*Math.PI)*7;ctx.lineTo(a.x+dx*u-dy/d*j,a.y+dy*u+dx/d*j);}
  ctx.lineTo(b.x,b.y);ctx.lineWidth=4;ctx.strokeStyle='#9377d8';ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle='#e6e1ff';ctx.stroke();
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not load '+src));img.src=src;});}
export async function loadArt(){
  const [terrain,atlas,res]=await Promise.all([loadImage('assets/terrain.webp'),loadImage('assets/atlas.webp'),fetch('assets/atlas.json')]);
  if(!res.ok)throw new Error('Unit artwork unavailable.');
  const frames=await res.json(),icons=new Map();
  function draw(ctx,key,x,y,w,h,foot=.71,flip=false) {
    const r=frames[key];if(!r)return;
    h=h??w*r.h/r.w;ctx.save();ctx.translate(x,y);
    if(flip)ctx.scale(-1,1);
    ctx.drawImage(atlas,r.x,r.y,r.w,r.h,-w/2,-h*foot,w,h);ctx.restore();
    return h;
  }
  function icon(key) {
    if(!icons.has(key)){
      const r=frames[key],cv=document.createElement('canvas');const scale=Math.min(1,150/r.w,112/r.h);
      cv.width=Math.max(1,Math.round(r.w*scale));cv.height=Math.max(1,Math.round(r.h*scale));
      cv.getContext('2d').drawImage(atlas,r.x,r.y,r.w,r.h,0,0,cv.width,cv.height);
      icons.set(key,cv.toDataURL('image/png'));
    }
    return icons.get(key);
  }
  return {terrain,atlas,frames,draw,icon};
}

export class Battlefield {
  constructor(art,pick,getState) {
    this.art=art;this.pick=pick;this.getState=getState;this.cv=$('field');this.ctx=this.cv.getContext('2d');
    this.radar=$('radar');this.rc=this.radar.getContext('2d');this.win=$('viewport');this.world=$('world');this.keys=new Map();
    this.zoom=1;this.cx=WIDTH/2;this.cy=HEIGHT/2;this.focusKey='B4';this.hover=null;this.lastDraw=0;this.show={};this.drag=null;this.skipClick=false;
    const container=$('hexes');
    for(const c of cells) {
      const b=document.createElement('button');b.className='hex';b.dataset.cell=c.key;b.tabIndex=-1;b.type='button';
      b.style.left=(c.x-RX)/WIDTH*100+'%';b.style.top=(c.y-RY)/HEIGHT*100+'%';b.style.width=RX*2/WIDTH*100+'%';b.style.height=RY*2/HEIGHT*100+'%';
      container.append(b);this.keys.set(c.key,b);
    }
    container.addEventListener('click',e=>{const key=e.target.closest('.hex')?.dataset.cell;if(key && !this.skipClick){this.focusCell(key,false);pick(key);}this.skipClick=false;});
    container.addEventListener('focusin',e=>{if(e.target.dataset.cell)this.focusCell(e.target.dataset.cell,false);});
    container.addEventListener('pointerover',e=>{this.hover=e.pointerType==='mouse'?e.target.dataset.cell:null;});
    container.addEventListener('pointerleave',()=>{this.hover=null;});
    container.addEventListener('keydown',e=>{
      const v={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!v)return;
      e.preventDefault();const c=map[this.focusKey], flip=$('console').classList.contains('reversed')?-1:1;
      const choices=c.near.map(k=>map[k]).map(n=>({n,rank:((n.x-c.x)*v[0]+(n.y-c.y)*v[1])*flip}));
      choices.sort((a,b)=>b.rank-a.rank);if(choices[0]?.rank>2)this.focusCell(choices[0].n.key,true);
    });
    this.win.addEventListener('pointerdown',e=>{if(this.zoom>1){this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,cx:this.cx,cy:this.cy,moved:false};}});
    this.win.addEventListener('pointermove',e=>{
      const d=this.drag;if(!d || e.pointerId!==d.id)return;
      const dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(!d.moved && Math.hypot(dx,dy)<7)return;
      if(!d.moved)this.win.setPointerCapture(e.pointerId);
      d.moved=true;const sign=$('console').classList.contains('reversed')?-1:1;
      this.cx=d.cx-sign*dx/this.scale;this.cy=d.cy-sign*dy/this.scale;this.layout();
    });
    const finish=()=>{if(this.drag?.moved){this.skipClick=true;setTimeout(()=>{this.skipClick=false;},0);}this.drag=null;};
    this.win.addEventListener('pointerup',finish);this.win.addEventListener('pointercancel',finish);
    $('zoom-in').onclick=()=>this.setZoom(Math.min(2.5,this.zoom+.5));$('zoom-out').onclick=()=>this.setZoom(Math.max(1,this.zoom-.5));$('fit').onclick=()=>this.setZoom(1);
    this.radar.addEventListener('click',e=>{const r=this.radar.getBoundingClientRect();let x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;if($('console').classList.contains('reversed')){x=1-x;y=1-y;}
      if(this.zoom===1)this.zoom=1.5;this.cx=x*WIDTH;this.cy=y*HEIGHT;this.layout();});
    this.background=document.createElement('canvas');this.background.width=WIDTH;this.background.height=HEIGHT;
    const bg=this.background.getContext('2d');bg.drawImage(art.terrain,0,0,WIDTH,HEIGHT);
    for(const c of cells)outline(bg,c.key,null,'rgba(39,34,23,.37)',1,0);
    const radarBase=document.createElement('canvas');radarBase.width=230;radarBase.height=118;
    const rc=radarBase.getContext('2d');rc.drawImage(art.terrain,0,0,230,118);
    const pixels=rc.getImageData(0,0,230,118);for(let i=0;i<pixels.data.length;i+=4){
      const [r,g,b]=pixels.data.subarray(i,i+3),v=.24*r+.43*g+.16*b,water=b>r*1.1;
      pixels.data[i]=water?15:v*.35+6;pixels.data[i+1]=water?36:v*.64+10;pixels.data[i+2]=water?41:v*.34+9;
    }rc.putImageData(pixels,0,0);this.radarBase=radarBase;
    this.observer=new ResizeObserver(()=>this.layout());this.observer.observe(this.win);this.layout();this.focusCell(this.focusKey,false);
    const loop=now=>{if(!document.hidden && now-this.lastDraw>=1000/(this.timeline?48:18)){this.draw(now);this.lastDraw=now;}requestAnimationFrame(loop);};requestAnimationFrame(loop);
  }
  focusCell(key,focus){this.keys.get(this.focusKey).tabIndex=-1;this.focusKey=key;const b=this.keys.get(key);b.tabIndex=0;if(focus)b.focus({preventScroll:true});}
  setZoom(n){if(this.zoom===1 && n>1 && this.show.selected){const p=byId(this.getState().g,this.show.selected);if(p){this.cx=map[p.cell].x;this.cy=map[p.cell].y;}}this.zoom=n;this.layout();}
  layout(){
    const w=this.win.clientWidth,h=this.win.clientHeight;
    if(!w||!h)return;
    this.scale=Math.min(w/WIDTH,h/HEIGHT)*this.zoom;
    const dw=WIDTH*this.scale,dh=HEIGHT*this.scale;
    const vx=Math.min(WIDTH,w/this.scale),vy=Math.min(HEIGHT,h/this.scale);
    this.cx=limit(this.cx,vx/2,WIDTH-vx/2);this.cy=limit(this.cy,vy/2,HEIGHT-vy/2);
    this.view=[this.cx-vx/2,this.cy-vy/2,vx,vy];
    this.world.style.width=dw+'px';this.world.style.height=dh+'px';
    this.world.style.left=(w/2-this.cx*this.scale)+'px';this.world.style.top=(h/2-this.cy*this.scale)+'px';
    const ratio=Math.min(2,Math.max(1,this.scale*(window.devicePixelRatio||1)));
    const px=Math.round(WIDTH*ratio);if(this.cv.width!==px){this.cv.width=px;this.cv.height=Math.round(HEIGHT*ratio);}
    $('zoom-out').disabled=this.zoom<=1;$('zoom-in').disabled=this.zoom>=2.5;
  }
  update(show){
    this.show=show;const {g}=this.getState();this.powers={US:grid(g,'US'),SU:grid(g,'SU')};
    const enabled=new Set([...(show.moves||[]),...(show.targets||[]),...(show.sites||[])]);
    for(const c of cells){
      const p=at(g,c.key),b=this.keys.get(c.key);
      b.className='hex'+(enabled.has(c.key)?' valid':'')+(p?(p.side===g.side?' owned':' enemy'):'');
      b.setAttribute('aria-label',c.key+', '+c.terrain+(p?', '+(p.side==='US'?'Allied ':'Soviet ')+spec(p.side,p.kind).name+', '+p.hp+' HP':''));
      b.setAttribute('aria-pressed',String(!!p && p.id===show.selected));
    }
    this.draw(performance.now());
  }
  play(events,sound,done){
    const {settings}=this.getState();let time=0;const list=[];
    for(const e of events){
      if(e.style==='pulse'&&e.type==='hit'){const pulse=list.findLast?.(s=>s.type==='pulse')||list.filter(s=>s.type==='pulse').pop();if(pulse)(pulse.hits??=[]).push(e);continue;}
      let dur={move:Math.max(.32,((e.route?.length||1)-1)*.32),hit:1.15,pulse:1.35,jump:.85,mark:.55,order:.2,build:.42,ready:.38}[e.type]||.25;
      if(settings.motion===false)dur=Math.min(dur,.33);
      list.push({...e,start:time,dur,sounded:false});time+=dur;
    }
    if(!list.length){done();return;}
    this.timeline={start:performance.now(),list,time,sound,done};
  }
  draw(now){
    const state=this.getState();if(!state?.g)return;
    const {g,settings}=state,t=now/1000,ctx=this.ctx,s=this.show;
    const ag=settings.motion===false?0:t;
    ctx.setTransform(this.cv.width/WIDTH,0,0,this.cv.height/HEIGHT,0,0);
    ctx.drawImage(settings.grid===false?this.art.terrain:this.background,0,0,WIDTH,HEIGHT);
    const tl=this.timeline,elapsed=tl?(now-tl.start)/1000:0;let active=null;
    if(tl){
      for(const e of tl.list)if(elapsed>=e.start && elapsed<e.start+e.dur){active=e;break;}
      if(active && !active.sounded){active.sounded=true;tl.sound(active.type==='hit'?active.style:active.type);}
    }
    const frac=active?limit((elapsed-active.start)/active.dur,0,1):0;
    const pending=g.pending?.cell||(active?.type==='pulse'?active.cell:null);
    if(pending){
      const alpha=settings.flashes===false?.63:.74+.19*Math.sin(t*3);
      for(const k of footprint(pending))outline(ctx,k,'rgba(101,60,135,.20)','rgba(217,163,247,'+alpha+')',2);
      outline(ctx,pending,null,ink.violet,3,5);
    }
    if(!tl || s.moves?.length || s.sites?.length || s.targets?.length){
      for(const k of s.moves||[])outline(ctx,k,'rgba(48,127,149,.15)','rgba(151,204,200,.82)',2);
      for(const k of s.sites||[])outline(ctx,k,'rgba(191,157,56,.22)','#e5c574',2);
      for(const k of s.targets||[])outline(ctx,k,'rgba(152,57,35,.18)','#f5986d',2);
      if(s.to)outline(ctx,s.to,'rgba(216,175,70,.23)',ink.aim,3);
      if(s.targetCell)outline(ctx,s.targetCell,null,ink.aim,3);
      if(s.warn)for(const k of s.warn)outline(ctx,k,'rgba(104,64,139,.23)',ink.violet,3);
      if(s.ghost){const c=map[s.ghost.cell];ctx.save();ctx.globalAlpha=.57;this.art.draw(ctx,s.ghost.side+'-'+s.ghost.kind,c.x,c.y,widths[s.ghost.kind]);ctx.restore();}
      routeLine(ctx,s.route,ag);
      if(this.hover && !this.drag)outline(ctx,this.hover,null,'rgba(255,244,184,.93)',2,5);
    }
    if(settings.coords) {
      ctx.save();ctx.textAlign='center';ctx.font='bold 10px monospace';
      for(const c of cells){ctx.fillStyle='#29291bbd';ctx.fillRect(c.x-12,c.y+26,24,12);ctx.fillStyle='#f4e9c3';ctx.fillText(c.key,c.x,c.y+35);}ctx.restore();
    }
    if(settings.motion!==false){
      ctx.strokeStyle='#57858b9c';ctx.lineWidth=1;
      for(let i=0;i<13;i++){const x=WIDTH/2-13+25*Math.sin(i*13+t*.28),y=(i*97+t*(6+i%4))%HEIGHT;
        if(relays.every(k=>Math.abs(map[k].y-y)>25)){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4+i%4,y);ctx.stroke();}}
    }
    const drawables=[];
    for(const p of g.pieces){
      let pos={...map[p.cell]},flip=!!p.flip;
      if(tl){const move=tl.list.find(e=>e.type==='move' && e.id===p.id);if(move && elapsed<move.start+move.dur){
        const k=limit((elapsed-move.start)/move.dur,0,.99999)*(move.route.length-1),i=Math.floor(k),a=map[move.route[i]],b=map[move.route[i+1]],u=ease(k-i);
        pos={x:mix(a.x,b.x,u),y:mix(a.y,b.y,u)+Math.sin(ag*28)*Math.sin(u*Math.PI)*.8};
        flip=(p.side==='US'?b.x<a.x:b.x>a.x);
      }}
      if(active?.type==='jump' && active.id===p.id && frac<.48)pos=map[active.from];
      if(active?.type==='hit' && active.sourceId===p.id && settings.motion!==false){
        const target=map[active.target.cell],dir=Math.sign(target.x-pos.x);if(frac<.25)pos.x-=dir*5*Math.sin(frac/.25*Math.PI);if(dir)flip=p.side==='US'?dir<0:dir>0;
      }
      drawables.push({p,pos,flip});
    }
    if(tl)for(const e of tl.list)if(e.type==='hit' && !e.after && elapsed<e.start+e.dur*.55)drawables.push({p:e.target,pos:map[e.target.cell],flip:false});
    drawables.sort((a,b)=>a.pos.y-b.pos.y||a.pos.x-b.pos.x);
    for(const {p,pos,flip} of drawables){
      const {x,y}=pos;const sp=spec(p.side,p.kind),color=ink[p.side];
      const w=widths[p.kind]*(p.side==='SU'&&p.kind==='tank'?1.09:1);
      const fr=this.art.frames[p.side+'-'+p.kind];if(!fr)continue;
      const h=w*fr.h/fr.w;
      const online=this.powers?.[p.side]?.online.has(p.id);
      ctx.save();if(p.ticks)ctx.globalAlpha=.58;else if(!online && !sp.move)ctx.filter='brightness(.57) saturate(.56)';
      this.art.draw(ctx,p.side+'-'+p.kind,x,y,w,null,.71,flip);ctx.restore();
      if(p.kind==='refinery'&&!p.ticks && online){
        const f=ag*.43+(p.side==='US'?0:2),sign=p.side==='US'?1:-1;
        this.art.draw(ctx,p.side+'-hauler',x+sign*(22+13*Math.cos(f)),y+11+6*Math.sin(f),31,null,.7);
      }
      if(p.ticks){
        ctx.strokeStyle='#e2b75b';ctx.lineWidth=2;
        for(const dx of [-25,-9,7,23]){ctx.beginPath();ctx.moveTo(x+dx,y+10);ctx.lineTo(x+dx,y-30);ctx.stroke();}
        for(const dy of [-25,-9,5]){ctx.beginPath();ctx.moveTo(x-27,y+dy);ctx.lineTo(x+26,y+dy);ctx.stroke();}
        tag(ctx,p.cell,p.ticks+' T',ink.aim);
      }else if(!online && sp.power){tag(ctx,p.cell,'OFFLINE','#edab72');}
      else if(p.kind==='device'){tag(ctx,p.cell,p.charge===3?'READY':p.charge+'/3',p.charge===3?'#e1db9b':color);}
      const chosen=s.selected===p.id,enemy=s.target===p.id;
      if(chosen||enemy)bracket(ctx,x,y-h*.22,Math.max(20,w*.51),Math.max(14,h*.47),enemy?ink.aim:color);
      const hp=active?.type==='hit' && active.target.id===p.id && frac<.37?active.before:p.hp;
      if(chosen||enemy||p.hp<sp.hp&&!p.ticks)health(ctx,x,y-h*.74-7,hp,p.ticks?3:sp.hp,Math.max(29,Math.min(w*.69,54)));
      if(p.spent&&p.side===g.side&&!p.ticks){ctx.fillStyle='#332d20';ctx.fillRect(x+w*.27,y+7,10,5);ctx.fillStyle='#cab57f';ctx.fillRect(x+w*.27+2,y+9,6,1);}
    }
    if(!tl && s.to && (!s.route || s.route.length>1))tag(ctx,s.to,s.to,ink.aim);
    if(!tl && s.targetCell)tag(ctx,s.targetCell,s.targetCell,ink.aim);
    if(active)this.effect(ctx,active,frac,t,settings,g);
    this.drawRadar(g,ag);
    if(tl && elapsed>=tl.time){this.timeline=null;tl.done();}
  }
  effect(ctx,e,u,t,settings,g) {
    const art=this.art,soft=settings.flashes===false,still=settings.motion===false;
    if(e.type==='hit'){
      const p=byId(g,e.sourceId),a=p?map[p.cell]:null,b=map[e.target.cell];
      if(a && u<.41 && !still){
        const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
        const start={x:a.x+dx/len*27,y:a.y+dy/len*12-8};
        if(e.style==='arc'){lightning(ctx,start,b,t);}
        else {
          if(u<.18&&!soft)art.draw(ctx,'fx-0',start.x,start.y,35,32,.62);
          const v=limit((u-.12)/.26,0,1),x=mix(start.x,b.x,v),y=mix(start.y,b.y-3,v);
          ctx.strokeStyle=e.style==='rocket'?'#ffe542':'#ffeb93';ctx.lineWidth=e.style==='burst'?2:3;
          ctx.beginPath();ctx.moveTo(x-dx/len*16,y-dy/len*16);ctx.lineTo(x,y);ctx.stroke();
        }
      }
      if(u>=.32&&!still){
        const v=(u-.32)/.68,frames=e.style==='arc'?[8,9,10,11]:[1,2,3,4,6,7];
        const frame=frames[Math.min(frames.length-1,Math.floor(v*frames.length))];
        const w=(e.style==='burst'?46:87)*(.72+.34*Math.sin(v*Math.PI));
        ctx.save();ctx.globalAlpha=(soft?.6:.97)*Math.min(1,(1-v)*5);art.draw(ctx,'fx-'+frame,b.x+v*6,b.y+4,w,w*1.02,.85);ctx.restore();
      }
      if(u>.39||still)tag(ctx,b.key,'−'+Math.min(e.before,e.before-e.after)+' HP',ink.aim);
    }else if(e.type==='pulse'||e.type==='jump'){
      const k=e.cell||(u<.48?e.from:e.to),b=map[k];ctx.save();ctx.globalAlpha=soft?.58:.93;
      if(!still){
        if(e.type==='pulse' && u>.2 && u<.75)for(const n of map[k].near)lightning(ctx,b,map[n],t);
        const frame=[8,9,10,11][Math.min(3,Math.floor(u*4))];art.draw(ctx,'fx-'+frame,b.x,b.y+7,e.type==='pulse'?171:81,e.type==='pulse'?112:78,.83);
      }
      ctx.restore();outline(ctx,k,null,ink.violet,3);
      if(e.hits && u>.36)for(const h of e.hits)tag(ctx,h.target.cell,'−'+(h.before-h.after)+' HP',ink.violet);
    }else if(e.type==='move' && !still) {
      const p=byId(g,e.id),a=map[e.route[0]],b=map[e.route[e.route.length-1]];
      if(p&&e.route.length===2){ctx.save();ctx.globalAlpha=.29*Math.sin(u*Math.PI);art.draw(ctx,'fx-7',mix(a.x,b.x,u)-Math.sign(b.x-a.x)*24,mix(a.y,b.y,u)+6,27,21,.7);ctx.restore();}
    }else if(e.cell){
      outline(ctx,e.cell,null,e.type==='mark'?ink.violet:ink.aim,3);
      if(e.type==='ready')tag(ctx,e.cell,'READY',ink.aim);
    }
  }
  drawRadar(g,t) {
    const cv=this.radar,ctx=this.rc,w=cv.width,h=cv.height;ctx.drawImage(this.radarBase,0,0,w,h);
    ctx.strokeStyle='#bed1ab20';ctx.lineWidth=1;
    for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(i*w/6,0);ctx.lineTo(i*w/6,h);ctx.stroke();}
    for(const p of g.pieces){
      const c=map[p.cell],x=c.x/WIDTH*w,y=c.y/HEIGHT*h;ctx.fillStyle=ink[p.side];const r=spec(p.side,p.kind).move?2:3;ctx.fillRect(x-r,y-r,2*r,2*r);
    }
    for(const k of relays){const c=map[k],x=c.x/WIDTH*w,y=c.y/HEIGHT*h;ctx.strokeStyle=ink[relaySide(g,k)]||ink.aim;ctx.strokeRect(x-3,y-3,6,6);}
    ctx.fillStyle='#9de68120';ctx.fillRect((t*22)%w,0,6,h);
    const [x,y,vw,vh]=this.view||[0,0,WIDTH,HEIGHT];ctx.strokeStyle='#d4e6b0';ctx.strokeRect(Math.max(1,x/WIDTH*w),Math.max(1,y/HEIGHT*h),Math.min(w-3,vw/WIDTH*w-1),Math.min(h-3,vh/HEIGHT*h-1));
  }
}

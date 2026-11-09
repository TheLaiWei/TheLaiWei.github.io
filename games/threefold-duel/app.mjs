import {classes,cards,skills,qualities,byId,replacement} from './catalog.mjs';
import {newMatch,art,luck,eligibleOdds,startRound,eligible,applyCard,offer,resolve} from './engine.mjs';
const $=s=>document.querySelector(s),table=$('#table'),info=$('#info');
const paths=[['Guardian','Assassin','Duelist'],['Elementalist','Warden','Battlemage'],['Healer','Inquisitor','Blessing']];
const baseArt=['fighter-guardian','mage-elementalist','priest-healer'];
const image=(name,alt='')=>'<img src="./art/'+name+'.svg" alt="'+alt+'">';
$('#paths').innerHTML=classes.map((name,i)=>'<article>'+image(baseArt[i])+'<div><h3>'+name+'</h3><p>'+paths[i].join(' · ')+'</p></div></article>').join('');
const btn=(action,label,cls='',disabled=false)=>'<button type="button" data-action="'+action+'" class="'+cls+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
function dialog(title,html,side=0){
 info.classList.toggle('reverse',side===1);$('#info-body').innerHTML='<h2>'+title+'</h2>'+html;
 if(!info.open)info.showModal();
}
info.querySelector('.exit').onclick=()=>info.close();
const help='<ol><li>Place your phone between you. Shield your edge with one hand and open your private tray. Choose a skill and target for every living hero.</li><li>Lock both plans. Faster actions resolve first. Guard and barriers have priority. Speed ties alternate favored seats each round. An action aimed at a fallen target misses.</li><li>Read the results, then privately draft one of three cards. Both picks are revealed together. Drafted passives last the match. A replacement can change your hero’s role.</li><li>Defeat all three enemies to win.</li></ol>';
$('#rules').onclick=()=>dialog('How to play',help);
const summary=c=>c.description+' '+(c.skill?'Skill swap. Stat bonus, if any, once per match.':(c.limit===Infinity?'Unlimited stacks.':'Max '+c.limit+' per '+(c.id==='exploit'?'party':'hero')+'.'));
const illustrations={Ambush:'fighter-assassin',Riposte:'fighter-duelist',Guard:'fighter-guardian',Aegis:'mage-warden',Discharge:'mage-battlemage',Flare:'mage-elementalist',Judgment:'priest-inquisitor',Bless:'priest-blessing',Haste:'priest-blessing',Mend:'priest-healer'};
const motifs={
 guard:['plate','feint','iron','mail','guarded'], speed:['foot','tempo','pilgrim','stride'],
 strike:['edge','execution','drill','comet','focus'], mark:['quarry','pursuit','cinder','sight','exploit','cleanse'],
 barrier:['thread','cloak','lattice','mirror','feedback','surge','sanctuary','relay','overflow'],
 holy:['votive','prism','verdict'],blessing:['mercy','fervor','dawn','ration','vigor'],luck:['luck']
};
function cardFace(c){
 const icon=illustrations[c.skill]||'card-'+Object.keys(motifs).find(k=>motifs[k].includes(c.id));
 return '<div class="card-face q'+c.tier+'">'+image(icon)+'<div><small>'+qualities[c.tier]+' · '+c.group+'</small><strong>'+c.name+'</strong><p>'+summary(c)+'</p></div></div>';
}
$('#library').onclick=()=>dialog('Card collection',classes.concat('Any').map(n=>'<details><summary>'+ (n==='Any'?'Shared party':n)+' · 12 cards</summary>'+cards.filter(c=>c.group===n).map(cardFace).join('')+'</details>').join(''));
let g,phase,plans,locked,opened,seat,offers,picks,cursor,results=[];
function resetTrays(){locked=[false,false];opened=[false,false];seat=null;cursor=[0,0]}
function beginPlan(){
 startRound(g);phase='plan';plans=[[],[]];resetTrays();
 cursor=g.teams.map(team=>team.findIndex(h=>h.hp));
}
$('#start').onclick=()=>{
 g=newMatch();results=[];beginPlan();$('#welcome').hidden=true;table.hidden=false;document.body.classList.add('playing');window.scrollTo(0,0);render();
};
function publicHero(h,i){
 const status=[h.ward?'◇'+h.ward.left:'',h.mark?'Marked':'',h.guard?.source.hp?'Guard':'',h.bless?'Blessed':'',h.bonusSpeed||h.nextSpeed?'Haste':''].filter(Boolean).join(' · ');
 return btn('hero-'+i,image(art(h))+'<span>'+h.name+' <b>'+h.hp+'/'+h.max+'</b></span><meter min="0" max="'+h.max+'" value="'+h.hp+'"></meter><small>'+status+'</small>','unit'+(!h.hp?' out':'')); 
}
function partyBar(s){return '<div data-side="'+s+'" class="roster '+(s?'reverse':'')+'">'+g.teams[s].map(publicHero).join('')+'</div>'}
function privatePlan(s){
 const i=cursor[s],h=g.teams[s][i],plan=plans[s][i];
 const choices=h.skills.map((name,slot)=>btn('skill-'+slot,name,'choice '+(plan?.slot===slot?'selected':''))).join('');
 const skill=plan&&skills[h.skills[plan.slot]];
 const targets=skill?g.teams[skill[0]==='ally'?s:1-s].map((t,j)=>btn('target-'+j,t.name+' '+t.hp,'choice '+(plan.target===j?'selected':''),!t.hp)).join(''):'';
 const ready=g.teams[s].every((a,j)=>!a.hp||Number.isInteger(plans[s][j]?.target));
 return '<div class="tabs">'+g.teams[s].map((a,j)=>btn('actor-'+j,a.name+(Number.isInteger(plans[s][j]?.target)?' ✓':''),i===j?'selected':'',!a.hp)).join('')+'</div><div class="options">'+choices+'</div>'+ (skill?'<p class="note">'+skill[2]+' Choose '+(skill[0]==='ally'?'an ally':'an enemy')+'.</p><div class="options">'+targets+'</div>':'<p class="note">Choose a skill.</p>')+btn('lock','Lock plan','seal',!ready);
}
function privateDraft(s){
 const pick=picks[s],c=pick?.card;
 return '<div class="draft-list">'+offers[s].map((c,i)=>'<button class="draft-option '+(pick?.card===c?'selected':'')+'" data-action="card-'+i+'">'+cardFace(c)+'</button>').join('')+'</div>'+ (c?'<div class="options">'+eligible(g.teams[s],c).map(j=>btn('recipient-'+j,g.teams[s][j].name,'choice '+(pick.target===j?'selected':''))).join('')+'</div>'+ (Number.isInteger(pick.target)?'<p class="note">'+replacement(g.teams[s][pick.target],c)+'</p>':''):'')+btn('lock','Lock card','seal',!Number.isInteger(pick?.target));
}
function tray(s){
 let body='';
 if(phase==='over')body='<h3>'+ (g.winner==='draw'?'Draw':g.winner===s?'Victory':'Defeat')+'</h3>'+btn('restart','Return to game room','seal');
 else if(['combat','reveal'].includes(phase))body='<h3>'+ (phase==='combat'?'Combat resolved':'Cards revealed')+'</h3>'+btn('log','Read results','choice')+' '+btn('continue',phase==='combat'?'Draft cards →':'Plan next round →','seal');
 else if(locked[s])body='<h3>Locked in</h3><p class="note">Waiting for the other player.</p>';
 else if(!opened[s])body='<h3>'+ (phase==='plan'?'Plan your moves':'Choose a buff')+'</h3>'+btn('open',phase==='plan'?'Open private plan':'Open private draft','seal',seat!==null);
 else body=(phase==='plan'?privatePlan(s):privateDraft(s));
 return '<section data-side="'+s+'" class="tray '+(s?'reverse':'')+'"><header><strong>Player '+(s+1)+'</strong>'+btn('luck','Luck '+luck(g.teams[s]),'link')+(opened[s]?btn('hide','Hide','link'):'')+'</header><div class="tray-content">'+body+'</div></section>';
}
function render(){
 table.innerHTML=tray(1)+'<section class="field">'+partyBar(1)+'<div class="roundline"><b>Round '+g.round+'</b><span>'+({plan:'Secret planning',combat:'Combat results',draft:'Private draft',reveal:'Draft results',over:'Duel complete'}[phase])+'</span>'+btn('log','Log','link')+'</div><div class="ticker">'+(phase==='reveal'?results.join('<br>'):(results.slice(-2).join('<br>')||'Choose one skill per hero, then lock in.'))+'</div>'+partyBar(0)+'</section>'+tray(0);
}
function lock(s){
 locked[s]=true;opened[s]=false;seat=null;
 if(!locked.every(Boolean))return;
 if(phase==='plan'){results=resolve(g,plans);phase=g.winner===null?'combat':'over'}
 else{
  results=picks.map(({card,target},p)=>{applyCard(g.teams[p],card,target);return 'P'+(p+1)+' · '+g.teams[p][target].name+' gains '+card.name+'.'});
  g.history.at(-1).picks=results.slice();phase='reveal';
 }
}
function action(code,s){
 const [type,raw]=code.split('-'),n=Number(raw),team=g.teams[s];
 if(type==='open'){if(seat===null){seat=s;opened[s]=true}}
 if(type==='hide'){seat=null;opened[s]=false}
 if(type==='actor')cursor[s]=n;
 if(type==='skill')plans[s][cursor[s]]={slot:n};
 if(type==='target'){
  plans[s][cursor[s]].target=n;
  const next=team.findIndex((h,i)=>h.hp&&!Number.isInteger(plans[s][i]?.target));
  if(next>=0)cursor[s]=next;
 }
 if(type==='card'){
  const card=offers[s][n],targets=eligible(team,card);picks[s]={card,target:targets.length===1?targets[0]:undefined};
 }
 if(type==='recipient')picks[s].target=n;
 if(type==='lock')lock(s);
 if(type==='continue'){
  if(phase==='combat'){phase='draft';offers=g.teams.map(t=>offer(t));picks=[null,null];resetTrays()}
  else if(phase==='reveal'){g.round++;beginPlan()}
 }
 if(type==='log')dialog('Combat log',g.history.length?g.history.slice().reverse().map(x=>'<h3>Round '+x.round+'</h3><ul>'+x.log.concat(x.picks||[]).map(y=>'<li>'+y+'</li>').join('')+'</ul>').join(''):'<p>No combat resolved yet.</p>',s);
 if(type==='luck'){
  dialog('Party Luck · '+luck(team),'<p>'+team.map(h=>h.name+' '+h.luck).join(' + ')+'</p><p>Current chance for the first offer. Later rolls exclude cards already drawn.</p>'+eligibleOdds(team).map((v,i)=>'<p>'+qualities[i]+' <b>'+Number(v.toFixed(1))+'%</b></p>').join(''),s);
 }
 if(type==='hero'){
  const h=team[n];dialog('P'+(s+1)+' · '+h.name,image(art(h))+'<p>HP '+h.hp+'/'+h.max+' · ATK '+h.atk+' · DEF '+h.def+' · Magic '+h.mag+' · Resist '+h.res+' · Speed '+(h.speed+h.bonusSpeed)+' · Luck '+h.luck+'</p>'+h.skills.map(name=>'<p><b>'+name+'</b> — '+skills[name][2]+'</p>').join('')+'<p>'+Object.entries(h.cards).map(([id,k])=>byId[id].name+(k>1?' ×'+k:'')).join(' · ')+'</p>',s);
 }
 if(type==='restart'){table.hidden=true;$('#welcome').hidden=false;document.body.classList.remove('playing');return}
 render();
}
table.addEventListener('click',e=>{
 const button=e.target.closest('[data-action]');if(!button)return;
 action(button.dataset.action,Number(button.closest('[data-side]')?.dataset.side||0));
});
function conceal(){if(g&&seat!==null){opened=[false,false];seat=null;render()}}
window.addEventListener('blur',conceal);document.addEventListener('visibilitychange',()=>{if(document.hidden)conceal()});

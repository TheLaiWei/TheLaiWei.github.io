// Music and effects are original. Browsers unlock this mixer on the first player gesture.
export class CommandAudio {
  constructor(settings){
    this.settings=settings;this.track=new Audio('assets/music.m4a');this.track.loop=true;this.track.preload='none';
    this.ctx=null;this.started=false;this.update(settings);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.track.pause();else if(this.started)this.update(this.settings);});
  }
  unlock(){
    if(!this.started){this.started=true;try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(AudioCtx)this.ctx=new AudioCtx();}catch{}this.update(this.settings);}
    if(this.ctx?.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  update(settings){
    this.settings=settings;this.track.volume=settings.music/100*.75;
    if(!this.started||settings.music===0||document.hidden){this.track.pause();return;}
    if(this.track.paused)this.track.play().catch(()=>{});
  }
  sound(kind){
    const ctx=this.ctx;if(!ctx||!this.started||!this.settings.effects||ctx.state!=='running')return;
    const vol=this.settings.effects/100,at=ctx.currentTime;
    function tone(hz,end,dur,level,wave='sine',delay=0){
      const o=ctx.createOscillator(),g=ctx.createGain(),t=at+delay;o.type=wave;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(Math.max(15,end),t+dur);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(level*vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+dur+.01);
    }
    function noise(dur,freq,level,delay=0){
      const t=at+delay,n=Math.round(ctx.sampleRate*dur),b=ctx.createBuffer(1,n,ctx.sampleRate),v=b.getChannelData(0);
      for(let i=0;i<n;i++)v[i]=(Math.random()*2-1);
      const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=b;f.type='lowpass';f.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(level*vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(f).connect(g).connect(ctx.destination);src.start(t);
    }
    switch(kind){
      case 'cannon':case 'rocket':tone(96,35,.45,.32);noise(.24,5900,.61);noise(.58,2400,.45,.24);break;
      case 'burst':for(const delay of [0,.08,.15])noise(.12,5300,.39,delay);break;
      case 'arc':case 'pulse':for(let i=0;i<4;i++){tone(380+i*45,65,.35,.14,'sawtooth',i*.12);noise(.17,6500,.27,i*.12);}break;
      case 'jump':case 'mark':tone(88,570,.45,.19,'triangle');tone(180,670,.48,.10,'sine',.13);break;
      case 'move':for(let i=0;i<5;i++)noise(.10,1300,.2,i*.08);tone(85,54,.46,.13,'triangle');break;
      case 'build':case 'ready':case 'order':tone(390,410,.10,.15,'triangle');tone(670,750,.13,.14,'triangle',.12);break;
      case 'end':tone(520,320,.21,.15,'triangle');break;
      default:tone(750,635,.07,.10,'triangle');
    }
  }
}

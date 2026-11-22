/* Original chip music and sound design. No network, recorded voices or audio files. */
(() => {
  'use strict';
  const STORE='apu-audio-v2', DEFAULTS={enabled:true,music:.28,effects:.65,voice:.65};
  let settings={...DEFAULTS};
  try{const raw=JSON.parse(localStorage.getItem(STORE));if(raw){for(const k of ['enabled'])if(typeof raw[k]==='boolean')settings[k]=raw[k];for(const k of ['music','effects','voice'])if(typeof raw[k]==='number'&&Number.isFinite(raw[k]))settings[k]=Math.max(0,Math.min(1,raw[k]));}}catch(_){}
  let ctx,master,compressor,musicGain,effectGain,voiceGain,musicBuffer,musicSource=null,musicOffset=0,musicStart=0,paused=false,hidden=document.hidden,unlockedOnce=false,resuming=null,theme=0,lastError="",recoveryAttempts=0,needsGesture=true;
  const active=new Set(),last={},stats={events:{},musicStarts:0,voiceMode:'拟声'};
  const midi=n=>440*2**((n-69)/12);
  const tri=p=>2/Math.PI*Math.asin(Math.sin(p));
  // Deterministic timbres can be inspected and tested without an audio device.
  function render(name,rate=32000,variant=0){
    const lengths={shoot:.085,big:.36,hit:.13,berry:.16,boss:.2,pop:.21,explode:.32,rainbow:.5,ready:.4,win:.8,lose:.65,voiceStart:.45,voicePower:.5,voiceWin:.65,voiceLose:.55};
    const length=lengths[name]||.1,data=new Float32Array(Math.ceil(length*rate));let phase=0,seed=3271+variant;
    for(let i=0;i<data.length;i++){
      const t=i/rate,u=t/length;let value=0;
      seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>0)/2147483648-1;
      if(name==='shoot') {const f=1100*(1-u)**2+300+variant%5*36;phase+=2*Math.PI*f/rate;value=Math.sin(phase)*Math.sin(Math.PI*Math.min(1,u*4))*Math.exp(-u*5)*.55;}
      else if(name==='big'){phase+=2*Math.PI*(190-115*u)/rate;value=(Math.sin(phase)*.65+tri(phase*2)*.15+noise*.07)*Math.sin(Math.PI*Math.min(1,u*8))*Math.exp(-u*4);}
      else if(['hit','berry','boss'].includes(name)){const base=name==='boss'?100:name==='berry'?190:310;phase+=2*Math.PI*(base+220*Math.sin(u*Math.PI))/rate;value=(tri(phase)*.52+noise*.08)*Math.sin(Math.PI*u)*Math.exp(-u*3);}
      else if(name==='explode'){phase+=2*Math.PI*(95-65*u)/rate;value=(noise*.42+Math.sin(phase)*.45)*Math.min(1,u*40)*Math.exp(-u*5);}
      else if(name.startsWith('voice')){
        const pattern=name==='voiceWin'?[690,890,1080]:name==='voiceLose'?[480,380]:name==='voicePower'?[380,720]:[640,860];
        const syllable=Math.min(pattern.length-1,Math.floor(u*pattern.length)),local=u*pattern.length-syllable;
        phase+=2*Math.PI*(pattern[syllable]+100*Math.sin(local*Math.PI))/rate;
        value=(Math.sin(phase)*.42+Math.sin(phase*2.05)*.13)*Math.sin(Math.PI*local)**2;
      }else{
        const notes=name==='win'?[72,76,79,84]:name==='lose'?[64,60,55]:name==='ready'?[72,79,84]:name==='rainbow'?[72,76,79,84]:[79,84];
        const step=Math.min(notes.length-1,Math.floor(u*notes.length)),local=u*notes.length-step;
        phase+=2*Math.PI*midi(notes[step])/rate;value=tri(phase)*.5*Math.sin(Math.PI*local)*Math.exp(-local*2);
      }
      data[i]=Math.max(-1,Math.min(1,value));
    }
    return data;
  }
  function renderMusic(rate=32000,world=0){
    const melody=[72,76,79,76,74,77,81,77,71,74,79,74,72,76,79,84,76,79,84,79,77,81,84,81,74,79,83,79,72,76,79,72,76,79,81,79,74,77,79,77,72,76,79,76,71,74,77,79,72,79,84,83,81,79,76,74,72,76,79,76,74,71,72,72];
    const transpose=[0,2,-2,5,-5,-3,7,-2,4,0][world%10];
    const step=.23*[1,.95,1.1,1,.85,1.05,1.1,.85,1,.95][world%10],length=melody.length*step,output=new Float32Array(Math.ceil(length*rate));
    for(let i=0;i<output.length;i++){
      const t=i/rate,k=Math.floor(t/step),local=t%step,env=Math.min(1,local/.01)*Math.exp(-local*11);
      const bass=midi([48,53,55,48][Math.floor(k/8)%4]+transpose),lead=midi(melody[k%melody.length]+transpose);
      const leadSignal=tri(2*Math.PI*lead*t)*env*.24;
      const bassEnv=Math.exp(-(t%(step*2))*6);
      const bassSignal=Math.sin(2*Math.PI*bass*t)*bassEnv*.18;
      const bell=Math.sin(2*Math.PI*lead*2*t)*Math.exp(-local*24)*.035;
      output[i]=(leadSignal+bassSignal+bell)*.8;
    }
    // Fade at the loop seam; melody resolves to the tonic.
    for(let i=0;i<320;i++){output[i]*=i/320;output[output.length-1-i]*=i/320;}
    return output;
  }
  function notify(){window.dispatchEvent(new Event('candy-audio-change'));}
  function save(){try{localStorage.setItem(STORE,JSON.stringify(settings));}catch(_){}notify();}
  function setup(){
    if(ctx&&ctx.state!=='closed')return true;
    musicSource=null;musicBuffer=null;musicOffset=0;
    try{
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return false;
      try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(_){}
      ctx=new Context({latencyHint:'interactive'});
      ctx.addEventListener('statechange',()=>{needsGesture=ctx.state!=='running';if(ctx.state==='running'){apply();startMusic();}else{stopMusic();}notify();});
      master=ctx.createGain();compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-10;compressor.ratio.value=5;master.connect(compressor);compressor.connect(ctx.destination);
      musicGain=ctx.createGain();effectGain=ctx.createGain();voiceGain=ctx.createGain();musicGain.connect(master);effectGain.connect(master);voiceGain.connect(master);
      apply();return true;
    }catch(_){return false;}
  }
  function apply(){if(!ctx)return;master.gain.setValueAtTime(settings.enabled?1:0,ctx.currentTime);musicGain.gain.setValueAtTime(settings.music,ctx.currentTime);effectGain.gain.setValueAtTime(settings.effects*.65,ctx.currentTime);voiceGain.gain.setValueAtTime(settings.voice*.65,ctx.currentTime);}
  function stopMusic(){if(musicSource){musicOffset=(musicOffset+ctx.currentTime-musicStart)%musicBuffer.duration;musicSource.stop();musicSource.disconnect();musicSource=null;}}
  function startMusic(){
    if(!ctx||ctx.state!=='running'||musicSource||paused||hidden||!settings.enabled||settings.music<=0)return;
    if(!musicBuffer){const data=renderMusic(ctx.sampleRate,theme);musicBuffer=ctx.createBuffer(1,data.length,ctx.sampleRate);musicBuffer.copyToChannel(data,0);}
    musicSource=ctx.createBufferSource();musicSource.buffer=musicBuffer;musicSource.loop=true;musicSource.connect(musicGain);musicStart=ctx.currentTime;musicSource.start(0,musicOffset);stats.musicStarts++;
  }
  function stopEffects(){for(const source of active){try{source.stop();source.disconnect();}catch(_){}}active.clear();}
  async function unlock(){
    if(!settings.enabled)return false;
    if(!setup()){notify();return false;}
    unlockedOnce=true;recoveryAttempts++;
    // A source is scheduled inside the gesture, not after an asynchronous callback.
    try{const source=ctx.createBufferSource();source.buffer=ctx.createBuffer(1,1,ctx.sampleRate);source.connect(master);source.onended=()=>source.disconnect();source.start();}catch(_){}
    if(resuming)return resuming;
    resuming=(async()=>{try{await ctx.resume();needsGesture=ctx.state!=='running';apply();startMusic();lastError='';return !needsGesture;}catch(error){needsGesture=true;lastError=String(error.name||'audio resume failed');return false;}finally{resuming=null;notify();}})();
    return resuming;
  }
  function recover(){if(unlockedOnce&&settings.enabled&&!hidden){if(ctx?.state==='running'){startMusic();}else unlock();}}
  function play(name,variant=0,preview=false,bus='effects'){
    if(!ctx||ctx.state!=='running'||!settings.enabled||hidden||(!preview&&paused)||settings[bus]<=0)return false;
    const now=ctx.currentTime;
    if(['hit','berry','boss','pop','explode'].includes(name)&&now-(last[name]??-1)<.045)return false;
    if(active.size>=24)return false;
    const data=render(name,ctx.sampleRate,variant),buffer=ctx.createBuffer(1,data.length,ctx.sampleRate);buffer.copyToChannel(data,0);
    const source=ctx.createBufferSource();source.buffer=buffer;source.connect(bus==='voice'?voiceGain:effectGain);active.add(source);
    source.onended=()=>{active.delete(source);source.disconnect();};source.start();last[name]=now;stats.events[name]=(stats.events[name]||0)+1;return true;
  }
  const lines={start:'出发啦！',power:'大泡泡，准备！',win:'小星星，回家啦！',lose:'再试一次，我陪你！'};
  function voice(event){
    const line=lines[event]||lines.start;
    if(!ctx||!settings.enabled||settings.voice<=0||paused||hidden)return line;
    play('voice'+event[0].toUpperCase()+event.slice(1),0,false,'voice');stats.voiceMode='拟声';
    return line;
  }
  function set(name,value){if(!(name in DEFAULTS))return;if(typeof DEFAULTS[name]==='boolean')settings[name]=Boolean(value);else settings[name]=Math.max(0,Math.min(1,Number(value)||0));apply();if(!settings.enabled){stopMusic();stopEffects();}else if(settings.music>0)startMusic();else stopMusic();save();}
  function pause(value){paused=Boolean(value);if(paused){stopMusic();stopEffects();}else recover();}
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden,unlockedOnce=false,resuming=null,theme=0,lastError="",recoveryAttempts=0,needsGesture=true;if(hidden){stopMusic();stopEffects();}else recover();});
  for(const name of ['pointerdown','touchend','keydown'])document.addEventListener(name,event=>{if(event.isTrusted&&settings.enabled&&(!ctx||ctx.state!=='running'))unlock();},{capture:true,passive:true});
  window.addEventListener('pageshow',recover);window.addEventListener('focus',recover);
  window.CandyAudio={unlock,play,voice,set,pause,setTheme(id){if(theme===id)return;stopMusic();theme=id;musicBuffer=null;musicOffset=0;startMusic();},preview:name=>play(name,0,true),get settings(){return {...settings};},get status(){return {available:Boolean(window.AudioContext||window.webkitAudioContext),running:ctx?.state==='running',paused,active:active.size,contextState:ctx?.state||'not-started',needsGesture,recoveryAttempts,lastError,audioSession:navigator.audioSession?.type||'unsupported',...stats,events:{...stats.events}};},render,renderMusic};
})();

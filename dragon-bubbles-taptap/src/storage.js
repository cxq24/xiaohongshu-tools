/* TapTap H5 local saves. Independent names, no XHS bridge, no implied cloud sync. */
((root)=>{
 'use strict';
 const gameKey='apu-taptap-h5-v1',audioKey='apu-taptap-audio-v1',keys=[gameKey,audioKey],states=new Map(),listeners=new Set();
 let mode='loading',loaded=false,loading=false,issue=null,resolveReady;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 function parse(raw){if(raw===null||raw==='')return null;const data=JSON.parse(raw);if(data===null)return null;if(typeof data!=='object'||Array.isArray(data))throw Error('Invalid saved object');return data;}
 function status(){return {mode,loaded,loading,issue:issue?{...issue}:null,pending:[...states.values()].filter(s=>s.pending!==null).length,busy:false};}
 function notify(){for(const fn of listeners){try{fn(status());}catch(_){}}}
 function fail(phase,key,error,fresh=false){issue={phase,key,slow:false,canStartFresh:fresh,code:error?.name||'',reason:String(error?.message||'').slice(0,180)};notify();}
 function initialize(ignoreCorrupt=false){
  if(loading||loaded)return Promise.resolve(false);loading=true;issue=null;notify();const staged=[];
  for(const key of keys){
   let raw=null;
   try{raw=root.localStorage.getItem(key);}
   catch(error){if(key===gameKey){loading=false;fail('read',key,error);return Promise.resolve(false);}staged.push({key,value:JSON.stringify({enabled:false}),pending:null});continue;}
   try{const data=parse(raw);staged.push({key,value:data===null?null:JSON.stringify(data),pending:null});}
   catch(error){
    if(key!==gameKey){staged.push({key,value:JSON.stringify({enabled:false}),pending:null});continue;}
    if(!ignoreCorrupt){loading=false;fail('read',key,error,true);return Promise.resolve(false);}
    try{root.localStorage.setItem(key+':recovery',raw);}catch(_){}
    staged.push({key,value:null,pending:null});
   }
  }
  for(const state of staged)states.set(state.key,state);mode='browser';loaded=true;loading=false;issue=null;resolveReady();notify();return Promise.resolve(true);
 }
 function commit(state){
  if(state.pending===null)return true;
  try{root.localStorage.setItem(state.key,state.pending);state.pending=null;return true;}
  catch(error){fail('write',state.key,error);return false;}
 }
 function clearWriteIssue(){if(issue?.phase==='write'&&![...states.values()].some(s=>s.pending!==null))issue=null;}
 function write(key,value){
  const state=states.get(key);if(!loaded||!state)return Promise.resolve(false);
  let data;try{data=JSON.stringify(value);if(parse(data)===null)throw Error('Invalid saved object');}catch(error){fail('write',key,error);return Promise.resolve(false);}
  state.value=data;if(mode==='preview'){notify();return Promise.resolve(false);}
  state.pending=data;const ok=commit(state);clearWriteIssue();notify();return Promise.resolve(ok);
 }
 function flush(){if(!loaded||mode==='preview')return Promise.resolve(false);const results=[...states.values()].map(commit);clearWriteIssue();notify();return Promise.resolve(results.every(Boolean));}
 root.CandyStore={ready,read(key){const raw=states.get(key)?.value;return raw===undefined||raw===null?null:parse(raw);},write,flush,status,onChange(fn){listeners.add(fn);fn(status());return()=>listeners.delete(fn);},retry(){return loaded?flush():initialize();},startFresh(){return !loaded&&issue?.canStartFresh?initialize(true):Promise.resolve(false);},startPreview(){
  if(loaded||!issue)return false;
  for(const key of keys){let value=null;try{const data=parse(root.localStorage.getItem(key));if(data!==null)value=JSON.stringify(data);}catch(_){}states.set(key,{key,value,pending:null});}
  mode='preview';loaded=true;issue={phase:'preview',reason:'No persistent writes in preview'};resolveReady();notify();return true;
 },diagnostics(){return {version:root.CandyRelease?.version,platform:'taptap-h5',mode,...(issue||{})};}};
 root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden&&loaded)flush();});root.addEventListener('pagehide',()=>{if(loaded)flush();});initialize();
})(window);

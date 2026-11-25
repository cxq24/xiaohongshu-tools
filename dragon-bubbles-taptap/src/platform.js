/* Optional TapTap lifecycle events; standard H5 works without host-only APIs. */
(()=>{
 'use strict';
 let hostHidden=false,suspended=false,previousPause=false,boundHost=null;
 const scene=()=>window.candyGame?.scene.getScene('Adventure');
 function suspend(){
  if(suspended)return;suspended=true;const s=scene();previousPause=Boolean(s?.uiPaused);s?.releaseFast();s?.setPausedByUI(true);
  // The supplied Canvas promotion already pauses on blur; host events also use it.
  window.dispatchEvent(new Event('blur'));window.CandyAudio?.pause(true);window.CandyStore?.flush();
 }
 function resume(){
  if(!suspended||hostHidden||document.hidden)return;suspended=false;
  window.dispatchEvent(new Event('focus')); // Match blur so Phaser's hasFocus/inFocus recover too.
  const s=scene();s?.setPausedByUI(previousPause);if(!s)window.CandyAudio?.pause(false);window.CandyStore?.flush();
 }
 function bind(){
  const tap=window.tap;if(!tap||tap===boundHost)return;boundHost=tap;
  try{if(typeof tap.onHide==='function')tap.onHide(()=>{hostHidden=true;suspend();});}catch(_){}
  try{if(typeof tap.onShow==='function')tap.onShow(()=>{hostHidden=false;resume();});}catch(_){}
 }
 document.addEventListener('visibilitychange',()=>document.hidden?suspend():resume());window.addEventListener('pagehide',suspend);
 window.addEventListener('pageshow',resume);window.addEventListener('load',bind);document.addEventListener('DOMContentLoaded',bind);bind();
 window.CandyPlatform=Object.freeze({id:'taptap-h5',version:'1.0.0',save:'local-device',gameKey:'apu-taptap-h5-v1',audioKey:'apu-taptap-audio-v1'});
})();

/* Self-owned promotional video, not a monetized ad SDK. Unlock requires real playback. */
(()=>{
 const config=window.CANDY_PROMO||{};let url;
 try{url=new URL(config.src);if((url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))||url.username||url.password)return;}catch(_){return;}
 const dialog=document.getElementById('promo-dialog'),video=document.getElementById('promo-video'),status=document.getElementById('promo-status');
 window.CandyAds.register({showRewardedVideo:()=>new Promise(resolve=>{
  let settled=false,watched=0,furthest=0,lastMedia=0,lastWall=performance.now();
  const scene=window.candyGame.scene.getScene('Adventure');scene.setPausedByUI(true);
  const finish=(completed,reason)=>{if(settled)return;settled=true;video.pause();video.removeAttribute('src');video.load();video.ontimeupdate=video.onended=video.onerror=video.onseeking=video.onratechange=null;dialog.removeEventListener('close',cancel);document.removeEventListener('visibilitychange',visibility);if(dialog.open)dialog.close();scene.setPausedByUI(false);resolve({completed,reason});};
  const cancel=()=>finish(false,'已跳过视频，可继续主线');
  const visibility=()=>{if(document.hidden)video.pause();};
  dialog.addEventListener('close',cancel);document.addEventListener('visibilitychange',visibility);
  video.onratechange=()=>{if(video.playbackRate!==1)video.playbackRate=1;};
  video.onseeking=()=>{if(video.currentTime>furthest+1)video.currentTime=furthest;lastMedia=video.currentTime;lastWall=performance.now();};
  video.ontimeupdate=()=>{
   const now=performance.now(),dt=video.currentTime-lastMedia,wall=(now-lastWall)/1000;
   if(!document.hidden&&dt>=0&&dt<=wall+0.5){watched+=Math.min(dt,wall+0.05);furthest=Math.max(furthest,video.currentTime);}
   lastMedia=video.currentTime;lastWall=now;
   status.textContent=`已观看 ${Math.floor(watched)} 秒 · 完整播放后开启隐藏关`;
  };
  video.onended=()=>{const minimum=Math.max(30,Number(config.minimumSeconds)||30);const complete=Number.isFinite(video.duration)&&video.duration>=minimum&&watched>=video.duration-1.5;if(complete)finish(true);else{status.textContent='未完成观看，可重新播放或跳过。';}};
  video.onerror=()=>{status.textContent='视频加载失败，可跳过继续主线。';};
  video.src=url.href;video.currentTime=0;video.playbackRate=1;dialog.showModal();status.textContent='完整观看后开启秘境，也可跳过继续主线。';
  video.play().catch(()=>{status.textContent='请点视频播放按钮继续观看。';});
 })});
 document.getElementById('skip-promo').onclick=()=>dialog.close();
})();

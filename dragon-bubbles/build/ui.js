(()=>{
 const box=document.getElementById('save-status'),retry=document.getElementById('save-retry'),fresh=document.getElementById('save-fresh');
 window.CandyStore.onChange(state=>{
  box.hidden=!state.issue;fresh.hidden=!state.issue?.canStartFresh;
  retry.disabled=state.loading||!!state.issue?.slow;fresh.disabled=state.loading;
  document.getElementById('save-message').textContent=!state.issue?'':state.issue.phase==='read'?'暂时无法读取进度，请重试。原存档未被覆盖。':state.issue.slow?'保存耗时较长，请保持页面打开。':'进度保存未完成，请重试后再退出。';
  retry.textContent=state.issue?.phase==='read'?'重新读取':state.issue?.slow?'正在保存…':'重试保存';
 });
 retry.onclick=()=>window.CandyStore.retry();
 fresh.onclick=()=>{if(window.confirm('旧进度暂时无法读取。确认开始新进度？'))window.CandyStore.startFresh();};
})();
window.CandyStore.ready.then(() => {
  const scene=()=>window.candyGame?.scene.getScene('Adventure');
  const help=document.getElementById('help-dialog'),audio=document.getElementById('audio-dialog');
  document.getElementById('help').onclick=()=>{scene()?.setPausedByUI(true);help.showModal();};
  document.getElementById('close-help').onclick=()=>help.close();
  help.addEventListener('close',()=>scene()?.setPausedByUI(false));
  function update(){
    const settings=CandyAudio.settings,status=CandyAudio.status;
    document.getElementById('audio-enabled').checked=settings.enabled;
    for(const name of ['music','effects','voice']){document.getElementById('volume-'+name).value=Math.round(settings[name]*100);document.getElementById('percent-'+name).textContent=Math.round(settings[name]*100)+'%';}
    document.getElementById('sound').textContent=settings.enabled?'声音设置':'声音已关 · 设置';
    document.getElementById('audio-status').textContent=!status.available?'当前浏览器无法播放声音。':'';

  }
  document.getElementById('sound').onclick=()=>{CandyAudio.unlock();if(scene())scene().audioSettingsOpen=true;scene()?.setPausedByUI(true);update();audio.showModal();};
  document.getElementById('close-audio').onclick=()=>audio.close();
  audio.addEventListener('close',()=>{if(scene())scene().audioSettingsOpen=false;scene()?.setPausedByUI(false);});
  for(const name of ['enabled'])document.getElementById('audio-'+name).onchange=e=>{CandyAudio.set(name,e.target.checked);if(e.target.checked)CandyAudio.unlock();};
  for(const name of ['music','effects','voice'])document.getElementById('volume-'+name).oninput=e=>CandyAudio.set(name,Number(e.target.value)/100);
  document.querySelectorAll('[data-sound]').forEach(button=>button.onclick=async()=>{await CandyAudio.unlock();CandyAudio.preview(button.dataset.sound);});
  window.addEventListener('candy-audio-change',update);update();
});

(() => {
  const dialog = document.getElementById('help-dialog');
  document.getElementById('help').onclick = () => { window.candyGame?.scene.getScene('Adventure')?.setPausedByUI(true); dialog.showModal(); };
  document.getElementById('close-help').onclick = () => dialog.close();
  dialog.addEventListener('close', () => window.candyGame?.scene.getScene('Adventure')?.setPausedByUI(false));
  document.getElementById('sound').onclick = () => {
    const enabled = window.CandyAudio.toggle();
    document.getElementById('sound').textContent = `声音：${enabled ? '开' : '关'}`;
    document.getElementById('sound').setAttribute('aria-pressed', String(enabled));
  };
})();

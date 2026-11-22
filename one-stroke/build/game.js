(() => {
  'use strict';
  const levels = window.ONE_STROKE_LEVELS;
  const $ = id => document.getElementById(id);
  const key = 'one-stroke-progress-v1';
  let saved = { unlocked: 0, current: 0, stars: {} };
  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (data && Number.isInteger(data.unlocked)) {
      saved.unlocked = Math.max(0, Math.min(levels.length - 1, data.unlocked));
      saved.current = Math.max(0, Math.min(saved.unlocked, Number.isInteger(data.current) ? data.current : 0));
      if (data.stars && typeof data.stars === 'object') for (let i = 0; i < levels.length; i++) {
        if ([1, 2, 3].includes(data.stars[i])) saved.stars[i] = data.stars[i];
      }
    }
  } catch (_) { /* Storage is optional; the game also works in memory. */ }
  let index = saved.current, level, route, allowed, path = [], hints = 0, won = false, dragging = false;
  const board = $('board');
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(saved)); }
    catch (_) { $('save-note').textContent = '当前浏览器无法保存进度，本次仍可正常游玩。'; }
  }
  function adjacent(a, b) { return Math.abs(a % level.size - b % level.size) + Math.abs(Math.floor(a / level.size) - Math.floor(b / level.size)) === 1; }
  function say(text, warning = false) { $('message').textContent = text; $('message').classList.toggle('warning', warning); }
  function load(i) {
    index = i; saved.current = i; persist(); level = levels[i]; route = level.route; allowed = new Set(route);
    path = [route[0]]; hints = 0; won = false; dragging = false;
    $('win-panel').hidden = true;
    $('chapter').textContent = i < 4 ? '01 / 找到感觉' : i < 10 ? '02 / 多想一步' : i < 18 ? '03 / 绕个弯吧' : '04 / 最后一笔';
    $('level-title').textContent = `第 ${String(i + 1).padStart(2, '0')} 关`;
    const size = level.size;
    board.innerHTML = '<svg class="route-svg" viewBox="0 0 100 100" aria-hidden="true"><polyline id="route-line"/></svg>';
    for (const id of [...route].sort((a,b) => a-b)) {
      const button = document.createElement('button');
      button.className = 'cell'; button.dataset.id = id;
      const gap = size > 4 ? 1.8 : 2.2, width = 100 / size - gap;
      Object.assign(button.style, { left: `${(id % size) * 100 / size + gap / 2}%`, top: `${Math.floor(id / size) * 100 / size + gap / 2}%`, width: `${width}%`, height: `${width}%` });
      button.innerHTML = '<span></span>';
      button.setAttribute('aria-label', `第${Math.floor(id / size) + 1}行第${id % size + 1}列${id === route[0] ? '，起点' : ''}`);
      button.addEventListener('click', e => { if (e.detail === 0) move(id); });
      board.append(button);
    }
    draw(); journey(); say('从橙色起点出发，沿亮起的相邻格子前进。');
  }
  function draw() {
    const last = path[path.length - 1];
    board.querySelectorAll('.cell').forEach(cell => {
      const id = Number(cell.dataset.id), pos = path.indexOf(id);
      cell.classList.toggle('visited', pos >= 0); cell.classList.toggle('start', id === route[0]);
      cell.classList.toggle('endpoint', id === last);
      cell.classList.toggle('available', !won && pos < 0 && adjacent(id, last));
      cell.setAttribute('aria-pressed', String(pos >= 0));
      cell.querySelector('span').textContent = id === route[0] ? '起点' : id === last ? '●' : pos >= 0 ? String(pos + 1) : '';
    });
    $('route-line').setAttribute('points', path.map(id => `${(id % level.size + .5) * 100 / level.size},${(Math.floor(id / level.size) + .5) * 100 / level.size}`).join(' '));
    $('route-line').style.strokeWidth = String(13 / level.size);
    $('progress-label').textContent = `已走 ${path.length} / ${route.length} 格`;
    $('progress-fill').style.width = `${path.length / route.length * 100}%`;
    $('best').textContent = saved.stars[index] ? '最佳 ' + '★'.repeat(saved.stars[index]) : '等你点亮';
    $('undo').disabled = path.length <= 1 || won;
    $('hint').disabled = won;
  }
  function journey() {
    const completed = Object.keys(saved.stars).length;
    $('journey-progress').textContent = `${completed} / ${levels.length} 关已完成`;
    $('journey-track').innerHTML = levels.map((_, i) => `<i class="${saved.stars[i] ? 'done' : ''}"></i>`).join('');
  }
  function check() {
    if (path.length === route.length) {
      won = true;
      const stars = Math.max(1, 3 - hints);
      saved.stars[index] = Math.max(stars, saved.stars[index] || 0);
      saved.unlocked = Math.max(saved.unlocked, Math.min(index + 1, levels.length - 1));
      persist(); draw(); journey();
      say('所有格子都走过了，路线成立！');
      $('win-panel').hidden = false;
      $('win-title').textContent = index === levels.length - 1 ? '最后一关，也走满了！' : '一笔走满！';
      $('win-detail').textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · ${hints === 0 ? '独立找到路线，三星到手。' : `本关使用 ${hints} 次提示，可重玩挑战三星。`}`;
      $('next-level').textContent = index === levels.length - 1 ? '回到选关 ↗' : '下一关 →';
      return;
    }
    const last = path[path.length - 1];
    const available = route.some(id => !path.includes(id) && adjacent(last, id));
    say(available ? '继续连线，把每一格都走到。' : '走进死胡同了。撤回几步，换个方向试试。', !available);
  }
  function move(id) {
    if (won || !allowed.has(id)) return;
    const last = path[path.length - 1];
    if (id === last) return;
    if (path.length > 1 && id === path[path.length - 2]) {
      path.pop(); draw(); say('已撤回一步，换条路线试试。'); return;
    }
    if (path.includes(id) || !adjacent(last, id)) {
      const cell = board.querySelector(`[data-id="${id}"]`);
      cell.classList.remove('invalid'); void cell.offsetWidth; cell.classList.add('invalid');
      say(path.includes(id) ? '每格只能走一次。滑回上一格可以撤回。' : '只能走上下左右相邻的格子。', true); return;
    }
    path.push(id); draw(); check();
  }
  function idAt(event) {
    const r = board.getBoundingClientRect();
    const x = Math.floor((event.clientX - r.left) / r.width * level.size);
    const y = Math.floor((event.clientY - r.top) / r.height * level.size);
    return x >= 0 && y >= 0 && x < level.size && y < level.size ? y * level.size + x : -1;
  }
  let pointerId = null;
  board.addEventListener('pointerdown', e => {
    if (e.button !== 0 || pointerId !== null) return;
    const id = idAt(e); if (!allowed.has(id)) return;
    e.preventDefault(); pointerId = e.pointerId; dragging = true;
    board.setPointerCapture(e.pointerId); move(id);
  });
  board.addEventListener('pointermove', e => { if (dragging && e.pointerId === pointerId) move(idAt(e)); });
  function endPointer(e) { if (e.pointerId === pointerId) { dragging = false; pointerId = null; } }
  board.addEventListener('pointerup', endPointer); board.addEventListener('pointercancel', endPointer); board.addEventListener('lostpointercapture', endPointer);
  $('undo').onclick = () => { if (path.length > 1 && !won) { path.pop(); draw(); say('已撤回一步。'); } };
  $('restart').onclick = () => load(index);
  $('hint').onclick = () => {
    if (won) return;
    let common = 0;
    while (common < path.length && path[common] === route[common]) common++;
    const rewind = common < path.length;
    path = route.slice(0, Math.min(route.length, (rewind ? common : path.length) + 1));
    hints++; draw(); check();
    if (!won) say(rewind ? '已回退到参考路线，并走出下一步；其他有效路线也能过关。' : '已沿参考路线走出一步，接下来交给你。');
  };
  function choose() {
    $('level-grid').innerHTML = '';
    levels.forEach((_, i) => {
      const button = document.createElement('button');
      button.disabled = i > saved.unlocked; button.classList.toggle('current', i === index);
      button.setAttribute('aria-label', `第${i+1}关${button.disabled ? '，未解锁' : ''}`);
      button.innerHTML = `${String(i + 1).padStart(2, '0')}<small>${saved.stars[i] ? '★'.repeat(saved.stars[i]) : button.disabled ? '未解锁' : '待挑战'}</small>`;
      button.onclick = () => { $('level-dialog').close(); load(i); };
      $('level-grid').append(button);
    });
    $('level-dialog').showModal();
  }
  $('choose-level').onclick = choose;
  $('close-dialog').onclick = () => $('level-dialog').close();
  $('next-level').onclick = () => index < levels.length - 1 ? load(index + 1) : choose();
  document.addEventListener('keydown', e => {
    if ($('level-dialog').open || !board.contains(document.activeElement)) return;
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!directions[e.key]) return;
    e.preventDefault(); const [dx, dy] = directions[e.key], last = path[path.length - 1];
    const x = last % level.size + dx, y = Math.floor(last / level.size) + dy;
    if (x >= 0 && y >= 0 && x < level.size && y < level.size) move(y * level.size + x);
  });
  load(index);
})();

/* Local promotional clip: 300 frames in 75 WebP atlases plus 14 sound-data scripts. */
window.CANDY_PROMO = {
    width: 360,
    height: 640,
    fps: 10,
    frames: 300,
    framesPerAtlas: 4,
    atlasColumns: 2,
    atlasCount: 75,
    atlasPrefix: './assets/promo/frames/atlas-',
    audioPrefix: './assets/promo/audio/part-',
    audioParts: 14,
    minimumSeconds: 30
};

(function () {
    'use strict';

    window.CandyPromoAudioParts = [];
    var installed = false;
    var active = false;
    var ownerScript = document.currentScript;
    if (!ownerScript || !/video-config\.js(?:[?#]|$)/.test(ownerScript.src || '')) {
        var scripts = document.getElementsByTagName('script');
        for (var scriptIndex = 0; scriptIndex < scripts.length; scriptIndex++) {
            if (/video-config\.js(?:[?#]|$)/.test(scripts[scriptIndex].src)) ownerScript = scripts[scriptIndex];
        }
    }
    var packageBase = ownerScript && ownerScript.src;
    function packagePath(path) {
        try { return new URL(path, packageBase || document.baseURI || window.location.href).href; }
        catch (ignore) { return path; }
    }

    function pad(value, length) {
        return ('000' + value).slice(-length);
    }

    window.CandyPromoPlayer = {
        install: function () {
            if (installed) return;
            installed = true;
            var config = window.CANDY_PROMO;
            var oldDialog = document.getElementById('promo-dialog');
            if (!oldDialog || !window.CandyAds) return;
            var style = document.createElement('style');
            style.textContent = "#promo-dialog{width:100%;height:100%;max-width:none;max-height:none;margin:0;border:0;border-radius:0;overflow:hidden;position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px 16px;padding-top:calc(24px + var(--safe-area-inset-top,0px));padding-top:calc(24px + var(--safe-area-inset-top,env(safe-area-inset-top,0px)));padding-bottom:calc(24px + var(--safe-area-inset-bottom,0px));padding-bottom:calc(24px + var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)));padding-left:calc(16px + var(--safe-area-inset-left,0px));padding-left:calc(16px + var(--safe-area-inset-left,env(safe-area-inset-left,0px)));padding-right:calc(16px + var(--safe-area-inset-right,0px));padding-right:calc(16px + var(--safe-area-inset-right,env(safe-area-inset-right,0px)));box-sizing:border-box;background:rgba(48,40,61,.5333);color:#2b2635;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",\"PingFang SC\",sans-serif}\n#promo-dialog[hidden],#promo-dialog [hidden]{display:none!important}\n#promo-dialog .promo-card{width:100%;max-width:380px;max-height:90vh;min-width:0;box-sizing:border-box;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:16px;border:2px solid #2b2635;border-radius:22px;background:#fffefa;box-shadow:4px 5px 0 rgba(43,38,53,.18)}\n#promo-dialog .promo-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}\n#promo-dialog .promo-heading{min-width:0;padding-right:8px}\n#promo-dialog .promo-brand{margin:0 0 2px;font-size:10px;line-height:1.5;color:#776b7d}\n#promo-title{margin:0;font:600 18px/1.5 -apple-system,BlinkMacSystemFont,\"Segoe UI\",\"PingFang SC\",sans-serif;color:#2b2635;text-align:left}\n#promo-dialog button{font:inherit;box-sizing:border-box;cursor:pointer;text-shadow:none;box-shadow:none;transform:none;letter-spacing:0;min-width:0}\n#promo-dialog button:focus{outline:2px solid #2b2635;outline-offset:3px}\n#promo-dialog button:focus:not(:focus-visible){outline:none}\n#promo-dialog button:disabled{opacity:.45;cursor:default}\n#skip-promo{display:flex;align-items:center;justify-content:center;flex:none;width:38px;height:38px;margin:0;padding:0 0 3px;border:0;border-radius:50%;background:#f2ebdf;color:#2b2635;font:25px/1 sans-serif}\n#promo-dialog .promo-stage{position:relative;width:30.375vh;max-width:100%;margin:0 auto;overflow:hidden;border-radius:16px;background:#211c2c}\n#promo-canvas{display:block;width:100%;height:auto;touch-action:manipulation;cursor:pointer}\n#promo-sound{position:absolute;top:10px;right:10px;display:flex;align-items:center;justify-content:center;width:40px;height:40px;margin:0;padding:9px;border:1px solid rgba(255,255,255,.45);border-radius:50%;background:rgba(33,28,44,.67);color:#fff;line-height:1;z-index:1}\n#promo-dialog .promo-stage svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n#promo-dialog .promo-center{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;pointer-events:none}\n#promo-hint{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:96px;margin:0;padding:18px;border:1px solid rgba(255,255,255,.3);border-radius:20px;background:rgba(33,28,44,.67);color:#fff;font-size:12px;line-height:1.5;pointer-events:auto}\n#promo-dialog #promo-hint svg{width:26px;height:26px;margin-bottom:7px;fill:currentColor;stroke:none}\n#promo-status{display:flex;align-items:center;justify-content:center;min-height:26px;margin:12px 0 8px;font:12px/1.6 -apple-system,BlinkMacSystemFont,\"Segoe UI\",\"PingFang SC\",sans-serif;color:#776b7d;text-align:center}\n#promo-dialog .promo-track{height:7px;overflow:hidden;background:#eee6dc;border-radius:7px}\n#promo-dialog .promo-fill{height:100%;background:#aac54e;transform-origin:left center;transform:scaleX(0);border-radius:7px}\n#promo-dialog .promo-note{margin:8px 0 0;font-size:10px;line-height:1.5;text-align:center;color:#776b7d}\n#promo-exit-confirm{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:24px 16px;background:rgba(48,40,61,.5333);z-index:2}\n#promo-dialog .promo-confirm-card{width:100%;max-width:330px;max-height:100%;overflow:auto;box-sizing:border-box;padding:24px 22px 18px;border:2px solid #2b2635;border-radius:25px;background:#fffefa;box-shadow:4px 5px 0 rgba(43,38,53,.18)}\n#promo-dialog .promo-confirm-card h2{margin:0 0 10px;color:#2b2635;font-size:18px;line-height:1.5;font-weight:600}\n#promo-dialog .promo-confirm-card p{margin:0 0 22px;color:#776b7d;font-size:13px;line-height:1.8;text-align:left}\n#promo-dialog .promo-confirm-card button{display:block;width:100%;height:44px;margin:0;padding:0 10px;border-radius:14px;font-size:14px;line-height:40px;font-weight:600}\n#promo-stay{border:2px solid #2b2635;background:#dceca7;color:#2b2635}\n#promo-leave{margin-top:10px!important;border:0;background:transparent;color:#776b7d;font-weight:400!important}\n@media(max-width:345px){#promo-dialog .promo-card{padding:13px}#promo-dialog .promo-stage{width:27.5625vh}}\n";
            document.head.appendChild(style);
            var dialog = document.createElement('section');
            dialog.id = 'promo-dialog';
            dialog.hidden = true;
            dialog.setAttribute('role', 'region');
            dialog.setAttribute('aria-label', '推广内容播放页');
            dialog.setAttribute('tabindex', '-1');
            dialog.innerHTML = "<div class=\"promo-card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"promo-title\">\n  <div class=\"promo-header\"><div class=\"promo-heading\"><p class=\"promo-brand\">QuantDash \u00b7 \u63a8\u5e7f\u77ed\u7247</p><h2 id=\"promo-title\">\u89c2\u770b\u77ed\u7247\uff0c\u5f00\u542f\u79d8\u5883</h2></div><button id=\"skip-promo\" type=\"button\" aria-label=\"\u9000\u51fa\u64ad\u653e\">\u00d7</button></div>\n  <div class=\"promo-stage\"><canvas id=\"promo-canvas\" aria-label=\"30\u79d2\u63a8\u5e7f\u5185\u5bb9\" tabindex=\"0\"></canvas><button id=\"promo-sound\" type=\"button\" aria-label=\"\u9759\u97f3\"></button><div class=\"promo-center\"><button id=\"promo-hint\" type=\"button\" aria-label=\"\u7ee7\u7eed\u64ad\u653e\" hidden><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M8 4 20 12 8 20z\"/></svg><span id=\"promo-action-text\">\u8f7b\u89e6\u7ee7\u7eed</span></button></div></div>\n  <p id=\"promo-status\"></p><div class=\"promo-track\" role=\"progressbar\" aria-label=\"\u6709\u6548\u89c2\u770b\u8fdb\u5ea6\" aria-valuemin=\"0\" aria-valuemax=\"30\" aria-valuenow=\"0\"><div class=\"promo-fill\"></div></div><p class=\"promo-note\">\u5b8c\u6574\u89c2\u770b\u540e\u89e3\u9501\u672c\u6b21\u5956\u52b1\u3002</p>\n</div>\n<div id=\"promo-exit-confirm\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"promo-exit-title\" aria-describedby=\"promo-exit-description\" hidden><div class=\"promo-confirm-card\"><h2 id=\"promo-exit-title\">\u8981\u518d\u4f11\u606f\u4e00\u5c0f\u4f1a\u5417\uff1f</h2><p id=\"promo-exit-description\">\u89c6\u9891\u8fd8\u6ca1\u770b\u5b8c\uff0c\u73b0\u5728\u79bb\u5f00\u4e0d\u4f1a\u89e3\u9501\u672c\u6b21\u5956\u52b1\u3002</p><button id=\"promo-stay\" type=\"button\">\u7ee7\u7eed\u89c2\u770b</button><button id=\"promo-leave\" type=\"button\">\u5148\u79bb\u5f00\uff0c\u56de\u5230\u6e38\u620f</button></div></div>\n";
            oldDialog.parentNode.replaceChild(dialog, oldDialog);
            var canvas = document.getElementById('promo-canvas');
            canvas.width = config.width;
            canvas.height = config.height;
            var status = document.getElementById('promo-status');
            var sound = document.getElementById('promo-sound');
            var skip = document.getElementById('skip-promo');
            var hint = document.getElementById('promo-hint');
            var actionText = document.getElementById('promo-action-text');
            var card = dialog.querySelector('.promo-card');
            var track = dialog.querySelector('.promo-track');
            var fill = dialog.querySelector('.promo-fill');
            var confirmExit = document.getElementById('promo-exit-confirm');
            var stay = document.getElementById('promo-stay');
            var leave = document.getElementById('promo-leave');
            var soundIconState = '';
            var context2d = canvas.getContext('2d');
            if (!context2d) return;

            window.CandyAds.register({
                showRewardedVideo: function () {
                    if (active) return Promise.resolve({ completed: false, reason: '推广内容正在播放' });
                    active = true;
                    return new Promise(function (resolve) {
                        var scene = window.candyGame.scene.getScene('Adventure');
                        var duration = config.frames / config.fps * 1000;
                        var position = 0;
                        var mode = 'loading';
                        var wanted = true;
                        var closed = false;
                        var initialized = false;
                        var initializationFailed = false;
                        var lastTime = 0;
                        var request = 0;
                        var shownFrame = -1;
                        var blockedAtlas = null;
                        var images = new Map();
                        var scriptLoads = [];
                        var audioContext = null;
                        var audioBuffer = null;
                        var audioSource = null;
                        var audioGain = null;
                        var audioGeneration = 0;
                        var muted = !!(window.CandyAudio && !window.CandyAudio.settings.enabled);
                        var audioUnavailable = false;
                        var confirming = false;
                        var previousFocus = document.activeElement;
                        var previousOverflow = document.body.style.overflow;

                        scene.setPausedByUI(true);
                        canvas.setAttribute('data-state', mode);
                        canvas.setAttribute('data-watched-ms', '0');
                        canvas.setAttribute('data-frame', '-1');
                        canvas.setAttribute('data-resource-base', packageBase || '');
                        context2d.fillStyle = '#211c2c';
                        context2d.fillRect(0, 0, config.width, config.height);

                        function showState(nextMode, message) {
                            mode = nextMode;
                            canvas.setAttribute('data-state', mode);
                            canvas.setAttribute('data-watched-ms', String(Math.floor(position)));
                            var remaining = Math.ceil((duration - position) / 1000);
                            var progress = mode === 'loading' ? '正在准备短片，稍等一下…' :
                                mode === 'buffering' ? '正在读取画面，等待期间不计时…' :
                                mode === 'error' ? '画面加载失败，请轻触重试。' :
                                mode === 'paused' ? '已暂停 · 还需 ' + remaining + ' 秒' :
                                (audioUnavailable ? '播放中（声音暂不可用）' : '正在播放') + ' · 还需 ' + remaining + ' 秒';
                            if (status.textContent !== progress) status.textContent = progress;
                            fill.style.transform = 'scaleX(' + position / duration + ')';
                            track.setAttribute('aria-valuenow', String(Math.floor(position / 1000)));
                            hint.hidden = confirming || (mode !== 'paused' && mode !== 'error');
                            actionText.textContent = mode === 'error' ? '轻触重试' : '轻触继续';
                            hint.setAttribute('aria-label', mode === 'error' ? '重试加载' : '继续播放');
                            canvas.setAttribute('aria-label', mode === 'playing' ? '推广画面，轻触暂停' : '推广画面，轻触继续');
                            sound.disabled = confirming || audioUnavailable;
                            var soundLabel = audioUnavailable ? '声音不可用' : muted ? '打开声音' : '静音';
                            sound.setAttribute('aria-label', soundLabel);
                            sound.setAttribute('title', soundLabel);
                            sound.setAttribute('aria-pressed', String(muted));
                            var iconState = muted || audioUnavailable ? 'muted' : 'on';
                            if (iconState !== soundIconState) {
                                soundIconState = iconState;
                                sound.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/>' +
                                    (iconState === 'muted' ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>') + '</svg>';
                            }
                        }

                        function stopSound() {
                            audioGeneration++;
                            if (audioSource) {
                                try { audioSource.stop(); } catch (ignore) {}
                                try { audioSource.disconnect(); } catch (ignore) {}
                                audioSource = null;
                            }
                        }

                        function startSound() {
                            stopSound();
                            if (!audioContext || !audioBuffer || audioContext.state !== 'running' || closed) return;
                            try {
                                audioSource = audioContext.createBufferSource();
                                audioSource.buffer = audioBuffer;
                                audioSource.connect(audioGain);
                                audioSource.start(0, Math.min(position / 1000, Math.max(0, audioBuffer.duration - 0.01)));
                            } catch (error) {
                                stopSound();
                                audioUnavailable = true;
                            }
                        }

                        function resumeSound() {
                            if (!audioContext || audioContext.state === 'running') return;
                            var generation = audioGeneration;
                            try {
                                var result = audioContext.resume();
                                if (result && typeof result.then === 'function') {
                                    result.then(function () {
                                        if (!closed && mode === 'playing' && generation === audioGeneration) startSound();
                                    }, function () {});
                                }
                            } catch (ignore) {}
                        }

                        function pause(message) {
                            wanted = false;
                            stopSound();
                            lastTime = 0;
                            if (request) cancelAnimationFrame(request);
                            request = 0;
                            if (!closed) showState(initialized ? 'paused' : initializationFailed ? 'error' : 'loading');
                        }

                        function loadImage(index, retry) {
                            if (images.has(index)) {
                                var existing = images.get(index);
                                if (!retry || existing.state !== 'error') return existing.promise;
                                existing.dispose();
                                images.delete(index);
                            }
                            var entry = { state: 'loading', image: new Image(), dispose: function () {} };
                            var timer;
                            entry.promise = new Promise(function (accept, reject) {
                                var settled = false;
                                function finish(error) {
                                    if (settled) return;
                                    settled = true;
                                    clearTimeout(timer);
                                    entry.image.onload = entry.image.onerror = null;
                                    if (error) {
                                        entry.state = 'error';
                                        reject(error);
                                    } else {
                                        entry.state = 'ready';
                                        accept(entry.image);
                                    }
                                }
                                entry.dispose = function () {
                                    finish(new Error('播放已结束'));
                                    entry.image.removeAttribute('src');
                                };
                                entry.image.onload = function () {
                                    if (entry.image.naturalWidth !== config.width * config.atlasColumns ||
                                        entry.image.naturalHeight !== config.height * 2) {
                                        finish(new Error('推广画面尺寸不正确'));
                                    } else finish(null);
                                };
                                entry.image.onerror = function () { finish(new Error('推广画面加载失败')); };
                                timer = setTimeout(function () { finish(new Error('推广画面加载超时')); }, 12000);
                                entry.image.src = packagePath(config.atlasPrefix + pad(index, 3) + '.webp');
                            });
                            images.set(index, entry);
                            entry.promise.catch(function () {});
                            return entry.promise;
                        }

                        function prefetch(index) {
                            var remove = [];
                            images.forEach(function (entry, key) {
                                if (key < index - 1 || key > index + 1) remove.push(key);
                            });
                            remove.forEach(function (key) { images.get(key).dispose(); images.delete(key); });
                            if (index + 1 < config.atlasCount) loadImage(index + 1, false).catch(function () {});
                        }

                        function draw(frame) {
                            var atlas = Math.floor(frame / config.framesPerAtlas);
                            var entry = images.get(atlas);
                            if (!entry || entry.state !== 'ready') return false;
                            if (frame !== shownFrame) {
                                var local = frame % config.framesPerAtlas;
                                context2d.drawImage(entry.image,
                                    local % config.atlasColumns * config.width,
                                    Math.floor(local / config.atlasColumns) * config.height,
                                    config.width, config.height, 0, 0, config.width, config.height);
                                shownFrame = frame;
                                canvas.setAttribute('data-frame', String(frame));
                            }
                            prefetch(atlas);
                            return true;
                        }

                        function loadSoundPart(index) {
                            if (window.CandyPromoAudioParts[index]) return Promise.resolve();
                            return new Promise(function (accept, reject) {
                                var script = document.createElement('script');
                                var timer;
                                var settled = false;
                                function finish(error) {
                                    if (settled) return;
                                    settled = true;
                                    clearTimeout(timer);
                                    script.onload = script.onerror = null;
                                    if (script.parentNode) script.parentNode.removeChild(script);
                                    if (error) reject(error); else accept();
                                }
                                scriptLoads.push(function () { finish(new Error('播放已结束')); });
                                script.src = packagePath(config.audioPrefix + pad(index, 2) + '.js');
                                script.onload = function () {
                                    finish(window.CandyPromoAudioParts[index] ? null : new Error('声音数据缺失'));
                                };
                                script.onerror = function () { finish(new Error('声音加载失败')); };
                                timer = setTimeout(function () { finish(new Error('声音加载超时')); }, 12000);
                                document.head.appendChild(script);
                            });
                        }

                        function loadSound() {
                            if (!audioContext) return Promise.resolve();
                            var nextPart = 0;
                            function worker() {
                                if (closed || nextPart >= config.audioParts) return Promise.resolve();
                                var part = nextPart++;
                                return loadSoundPart(part).then(worker);
                            }
                            return Promise.all([worker(), worker(), worker()]).then(function () {
                                if (closed) return;
                                var chunks = [];
                                var length = 0;
                                for (var i = 0; i < config.audioParts; i++) {
                                    var chunk = atob(window.CandyPromoAudioParts[i]);
                                    chunks.push(chunk);
                                    length += chunk.length;
                                }
                                var bytes = new Uint8Array(length);
                                var offset = 0;
                                chunks.forEach(function (chunk) {
                                    for (var j = 0; j < chunk.length; j++) bytes[offset++] = chunk.charCodeAt(j);
                                });
                                return new Promise(function (accept, reject) {
                                    var result = audioContext.decodeAudioData(bytes.buffer, accept, reject);
                                    if (result && typeof result.then === 'function') result.then(accept, reject);
                                });
                            }).then(function (buffer) {
                                if (!closed && buffer) audioBuffer = buffer;
                            });
                        }

                        function cleanup(completed, reason) {
                            if (closed) return;
                            closed = true;
                            active = false;
                            wanted = false;
                            if (request) cancelAnimationFrame(request);
                            stopSound();
                            scriptLoads.forEach(function (cancel) { cancel(); });
                            images.forEach(function (entry) { entry.dispose(); });
                            images.clear();
                            audioBuffer = null;
                            if (audioContext) {
                                audioContext.onstatechange = null;
                                try {
                                    var closing = audioContext.close();
                                    if (closing && typeof closing.catch === 'function') closing.catch(function () {});
                                } catch (ignore) {}
                            }
                            document.removeEventListener('visibilitychange', visibility);
                            window.removeEventListener('blur', blur);
                            window.removeEventListener('pagehide', pagehide);
                            window.removeEventListener('resize', resize);
                            document.removeEventListener('keydown', keyboard, true);
                            canvas.onclick = hint.onclick = sound.onclick = skip.onclick = stay.onclick = leave.onclick = null;
                            canvas.setAttribute('data-state', completed ? 'completed' : 'closed');
                            dialog.hidden = true;
                            confirmExit.hidden = true;
                            card.removeAttribute('aria-hidden');
                            skip.disabled = false;
                            document.body.style.overflow = previousOverflow;
                            scene.setPausedByUI(false);
                            resolve({ completed: completed, reason: reason });
                            if (previousFocus && document.documentElement.contains(previousFocus)) previousFocus.focus();
                        }

                        function cancelled() { cleanup(false, '已跳过推广内容，可继续主线'); }
                        function visibility() { if (document.hidden) pause(); }
                        function blur() { pause(); }
                        function resize() {
                            var padding = window.getComputedStyle(dialog);
                            var available = dialog.clientHeight - parseFloat(padding.paddingTop || '0') - parseFloat(padding.paddingBottom || '0');
                            card.style.maxHeight = Math.max(0, Math.min(window.innerHeight * 0.9, available)) + 'px';
                            confirmExit.style.paddingTop = padding.paddingTop;
                            confirmExit.style.paddingBottom = padding.paddingBottom;
                            confirmExit.style.paddingLeft = padding.paddingLeft;
                            confirmExit.style.paddingRight = padding.paddingRight;
                        }
                        function pagehide() { cleanup(false, '播放已中断，可重新观看'); }
                        function requestExit() {
                            if (closed || confirming) return;
                            confirming = true;
                            pause();
                            confirmExit.hidden = false;
                            card.setAttribute('aria-hidden', 'true');
                            skip.disabled = true;
                            stay.focus();
                        }
                        function keepWatching() {
                            if (closed || !confirming) return;
                            confirming = false;
                            confirmExit.hidden = true;
                            card.removeAttribute('aria-hidden');
                            skip.disabled = false;
                            skip.focus();
                            resumePlayback();
                        }
                        function keyboard(event) {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                event.stopPropagation();
                                if (confirming) keepWatching(); else requestExit();
                            } else if (event.key === 'Tab') {
                                var buttons = confirming ? [stay, leave] : sound.disabled ? [skip, canvas] : [skip, canvas, sound];
                                if (!confirming && !hint.hidden) buttons.push(hint);
                                var current = buttons.indexOf(document.activeElement);
                                if (current < 0 || (event.shiftKey && current === 0) || (!event.shiftKey && current === buttons.length - 1)) {
                                    event.preventDefault();
                                    buttons[event.shiftKey ? buttons.length - 1 : 0].focus();
                                }
                            } else if ((event.key === ' ' || event.key === 'Enter') && document.activeElement === canvas) {
                                event.preventDefault();
                                if (mode === 'playing' || mode === 'buffering') pause(); else resumePlayback();
                            }
                        }

                        function waitForAtlas(index, retry) {
                            blockedAtlas = index;
                            stopSound();
                            lastTime = 0;
                            showState('buffering', '正在加载画面，等待期间不计时');
                            loadImage(index, retry).then(function () {
                                if (closed) return;
                                blockedAtlas = null;
                                if (wanted && !document.hidden) play();
                                else showState('paused', '已暂停，点击继续播放');
                            }, function () {
                                if (!closed) showState('error', '画面加载失败，点击重试；尚未解锁');
                            });
                        }

                        function tick(now) {
                            request = 0;
                            if (closed || mode !== 'playing') return;
                            if (document.hidden) { visibility(); return; }
                            var delta = lastTime ? now - lastTime : 0;
                            lastTime = now;
                            if (delta < 0 || delta > 250) {
                                startSound();
                                request = requestAnimationFrame(tick);
                                return;
                            }
                            var next = Math.min(duration, position + delta);
                            var frame = Math.min(config.frames - 1, Math.floor(next * config.fps / 1000));
                            try {
                                if (!draw(frame)) {
                                    waitForAtlas(Math.floor(frame / config.framesPerAtlas), false);
                                    return;
                                }
                            } catch (error) {
                                stopSound();
                                showState('error', '画面无法播放，点击重试；尚未解锁');
                                return;
                            }
                            position = next;
                            showState('playing', audioUnavailable ? '声音暂不可用，画面正常播放' : '完整播放后开启隐藏关');
                            if (position >= duration && position >= config.minimumSeconds * 1000) {
                                cleanup(true, '已完整观看30秒');
                                return;
                            }
                            request = requestAnimationFrame(tick);
                        }

                        function play() {
                            if (closed || confirming || !initialized || document.hidden) return;
                            wanted = true;
                            var frame = Math.min(config.frames - 1, Math.floor(position * config.fps / 1000));
                            if (!draw(frame)) { waitForAtlas(Math.floor(frame / config.framesPerAtlas), true); return; }
                            showState('playing');
                            lastTime = 0;
                            startSound();
                            resumeSound();
                            if (!request) request = requestAnimationFrame(tick);
                        }

                        function resumePlayback() {
                            if (closed || confirming) return;
                            wanted = true;
                            if (!initialized && initializationFailed) initialize();
                            else if (mode === 'error' && blockedAtlas !== null) { wanted = true; waitForAtlas(blockedAtlas, true); }
                            else if (initialized) play();
                            else showState('loading');
                        }
                        canvas.onclick = function () {
                            if (closed || confirming) return;
                            if (mode === 'playing' || mode === 'buffering') pause();
                            else if (mode === 'paused' || mode === 'error') resumePlayback();
                        };
                        hint.onclick = resumePlayback;
                        sound.onclick = function () {
                            if (closed || confirming || audioUnavailable) return;
                            muted = !muted;
                            if (audioGain) audioGain.gain.value = muted ? 0 : 0.85;
                            if (!muted) resumeSound();
                            showState(mode);
                        };
                        skip.onclick = requestExit;
                        stay.onclick = keepWatching;
                        leave.onclick = cancelled;
                        document.addEventListener('visibilitychange', visibility);
                        window.addEventListener('blur', blur);
                        window.addEventListener('pagehide', pagehide);
                        window.addEventListener('resize', resize);
                        document.addEventListener('keydown', keyboard, true);

                        try {
                            var Audio = window.AudioContext || window.webkitAudioContext;
                            if (Audio) {
                                audioContext = new Audio();
                                audioGain = audioContext.createGain();
                                audioGain.gain.value = muted ? 0 : 0.85;
                                audioGain.connect(audioContext.destination);
                                resumeSound();
                                audioContext.onstatechange = function () {
                                    if (!closed && initialized && mode === 'playing' && audioContext.state !== 'running' && !muted) {
                                        pause('声音播放已暂停，点击继续播放');
                                    }
                                };
                            } else audioUnavailable = true;
                        } catch (error) { audioUnavailable = true; audioContext = null; }

                        function initialize() {
                            wanted = true;
                            initializationFailed = false;
                            showState('loading', '正在准备推广内容，加载期间不计时');
                            var audioReady = loadSound().catch(function () { audioUnavailable = true; });
                            Promise.all([loadImage(0, true), audioReady]).then(function () {
                                if (closed) return;
                                initialized = true;
                                draw(0);
                                if (wanted && !document.hidden) play();
                                else showState('paused', '已暂停，点击继续播放');
                            }, function () {
                                if (!closed) {
                                    initializationFailed = true;
                                    showState('error', '画面加载失败，点击重试；尚未解锁');
                                }
                            });
                        }

                        confirmExit.hidden = true;
                        dialog.hidden = false;
                        document.body.style.overflow = 'hidden';
                        resize();
                        dialog.focus();
                        initialize();
                    });
                }
            });
        }
    };
}());

# 开发与构建

## 本地运行

在 `dragon-bubbles` 目录执行：

```sh
python3 -m http.server 8000 --directory build
```

打开 `http://localhost:8000`。网页从 HTTP 来源加载图片和本地存档，不建议直接双击 HTML。

## 生产构建

需要 Node.js、npm 与 Python 3。构建工具固定使用 Terser 5.44.1，依赖版本和完整性保存在 lockfile，依赖目录不进入 Git 或 ZIP。

```sh
npm --cache /tmp/dragon-bubbles-npm-cache ci --prefix tools/bundler --ignore-scripts --no-audit --no-fund
python3 tools/package.py
```

默认生成 `dragon-bubbles-1.0.1.zip`。编译固定生产开关，剔除全解锁、测试火力、补库存与测试存档逻辑，再压缩项目脚本。Phaser 引擎保持原字节，第三方完整许可保留于唯一入口。样式内联，图片与字体原样保留。`video-config.js` 作为独立配置先加载。

脚本会检查文件类型、唯一根入口、资源哈希、许可和 200 文件上限；在校验和编译成功之前不写入 ZIP。ZIP 使用固定时间戳，可复现。

`python3 tools/package.py --test` 只用于内部验收，生成的测试包被 Git 忽略；该构建的测试存档独立于生产存档。生产版本不提供测试开关或补充道具按钮。

## 验收

```sh
python3 tools/test_package.py
node tools/test_storage.cjs
python3 tools/native_storage_browser_checks.py
python3 tools/production_profile_checks.py
python3 tools/production_browser_checks.py
python3 tools/v6_browser_checks.py
python3 tools/v6_release_checks.py
python3 tools/v6_cosmetic_checks.py
node tools/test_progress.cjs
node tools/test_v5.cjs
node tools/test_v6.cjs
node tools/test_v7.cjs
node tools/test_v9.cjs
node tools/balance_v10.cjs
```

浏览器验收需要 Python Playwright、Chromium；视频流程验收还需要 ffmpeg，临时生成真实 31 秒测试素材，不会打进发布包。脚本从实际 ZIP 加载网页，覆盖生产／测试隔离、原生缓存与旧存档、秘境条件、真实视频完整观看、输入、声音、退出、道具、升级、外观和数值。

定稿或编译器变更时，对最终 ZIP 执行全量物理通关：

```sh
python3 tools/simulate_campaign.py --archive dragon-bubbles-1.0.1.zip --end 300
python3 tools/simulate_campaign.py --archive dragon-bubbles-1.0.1.zip --hidden --end 30
```

算法会重试角度，证明存在可完成路线，不代表真人首次成功率。历史脚本与版本验收证据保留在 `tools/`，当前汇总见 `VALIDATION.md`。

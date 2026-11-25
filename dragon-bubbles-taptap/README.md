# 阿噗的糖果弹弹冒险 · TapTap H5 独立版

**目标入口：TapTap 小游戏／H5，上传 ZIP。**

**[下载 TapTap H5 ZIP](https://raw.githubusercontent.com/cxq24/xiaohongshu-tools/main/dragon-bubbles-taptap/dragon-bubbles-taptap-h5-1.0.0.zip)**

本目录与现有小红书工程独立。原小红书代码、原 ZIP、运行快照及文档不因本次适配改变。基于用户最新 `1.0.2-xhs-secret-prompt` 包生成，保留 300 主线、30 秘境、全部玩法／数值／外观，以及已处理的 QuantDash 本地推广片。

## 上传

1. 下载本目录的 `dragon-bubbles-taptap-h5-1.0.0.zip`，用于 TapTap **小游戏／H5** 入口。
2. 游戏方向选**竖屏**，版本填本平台独立版本 `1.0.0`。压缩包根目录直接是 `index.html`，不要再给 ZIP 套外层文件夹，也不要压缩整个开发目录。
3. 在你的开发者账号中选择对应游戏条目，再按后台流程上传、预览和提交审核。本次没有代操作账号、上传或宣称审核上线。

包内197个文件，约4.19MiB，无网络CDN或占位SDK。官方公开H5流程以包含index.html的构建目录为输入，开发者身份、应用与横竖屏在上传流程配置；本包不伪造这些账号信息。资料出处与范围见 [TapTap接入依据](research/taptap-references.json)。

## 独立适配内容

- 保留原游戏逻辑和推广播放器；194个原包文件字节不变。`app.js` 只替换存档适配层、平台版本声明及存档键；`index.html` 增加独立平台启动脚本。
- 存档使用 H5 标准 `localStorage`，键名为 `apu-taptap-h5-v1`、`apu-taptap-audio-v1`；不读取或迁移小红书存档，不依赖小红书JSAPI。原来的读档保护、只读试玩、保存失败提示与重试继续提供。
- 可用时接收宿主 `tap.onHide/onShow`，并使用浏览器页面可见性／离开事件暂停和保存；普通浏览器没有 `tap` 也能正常启动。前台恢复不会擅自关闭用户暂停菜单，推广片仍需玩家继续观看。
- 自有推广片仍需完整前台观看30秒才解锁对应秘境；不是 TapTap 商业激励广告接入，不产生平台广告分成。
- 本版没有接账号登录、云存档、排行榜或平台广告服务。存档为本机网页存储，不提供跨设备同步；清除该来源数据后不能保证恢复。

## 开发与独立构建

```sh
cd dragon-bubbles-taptap
npm ci --ignore-scripts --no-audit --no-fund
python3 tools/build.py
python3 -m http.server 8766 --directory dist
```

只编辑 `src/` 与本目录构建工具，`dist/` 是生成产物。构建器读取并验证小红书原始输入包的固定SHA，只在本目录输出；不要改原小红书工程来适配本平台。

验证：

```sh
python3 tools/check.py
```

需要 Node.js、Python、Playwright与Chromium；不需要下载TapTap客户端SDK。压缩包不含这些制作工具。`release.json` 记录包体与每文件SHA，`validation/` 记录实际包验证和原工程文件保护结果。浏览器及模拟宿主检查不等同TapTap真机验收或审核通过。

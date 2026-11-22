# 开源项目调研与技术选择

调研日期：2026-11-22。实际读取以下 GitHub 项目说明、官方弹球示例和引擎源码后，选择 Phaser 3.90.0；没有把现成游戏或其素材换皮后交付。

## 阅读的项目与用途

| 项目 | 实际查阅的内容 | 结论 |
| --- | --- | --- |
| [Phaser](https://github.com/phaserjs/phaser/tree/v3.90.0) | 固定版本 README、Config.js、Arcade World.js、StaticBody.js、发布包 LICENSE.md | 自带场景、触摸、静态碰撞体与动态球体，适合先交付网页弹球原型。MIT。采用。 |
| [Phaser Examples](https://github.com/phaserjs/examples) | `public/src/games/breakout/breakout.js` 与 README | 学习关闭底部世界边界、球体反弹、静态目标组和碰撞回调。当前仓库 README 面向 Phaser 4，运行实现按 Phaser 3.90.0 源码核对，没有导入 Phaser 4 工程。示例代码 MIT，但 README 明确指出素材不全部可用于商业游戏，因此没有使用其任何图像或声音素材。 |
| [PixiJS](https://github.com/pixijs/pixijs) | README、渲染与输入示例、MIT 声明 | 很适合 2D 渲染，但本项目还需要碰撞、回合和场景管理，首版不采用。 |
| [Godot](https://github.com/godotengine/godot) | README、导出平台及 MIT 声明 | 完整 2D/3D 编辑器，适合后续更大的原生客户端工程；本次静态网页试玩不采用。 |
| [LibreSprite](https://github.com/LibreSprite/LibreSprite) | README 中的像素编辑、洋葱皮、帧动画、调色板及 GPLv2 声明 | 可用于后续手工修改 PNG 和帧动画。本次未安装或分发该工具；当前原画由可复现的 Pillow 脚本制作。 |

## 具体参考链接

- [Phaser 3.90.0 README](https://github.com/phaserjs/phaser/blob/v3.90.0/README.md)
- [官方 Breakout 源码](https://github.com/phaserjs/examples/blob/master/public/src/games/breakout/breakout.js)
- [Config.js：pixelArt / antialias / roundPixels](https://github.com/phaserjs/phaser/blob/v3.90.0/src/core/Config.js)
- [World.js：固定物理步长和 timeScale](https://github.com/phaserjs/phaser/blob/v3.90.0/src/physics/arcade/World.js)
- [StaticBody.js：刷新静态碰撞体尺寸与偏移](https://github.com/phaserjs/phaser/blob/v3.90.0/src/physics/arcade/StaticBody.js)

## 落地方案

- 固定 Phaser 3.90.0；包内自带引擎，无 CDN 运行依赖。
- npm 发布包经 TLS 下载，并核对注册表声明的完整 SHA-512 integrity，再提取压缩引擎文件和许可证。
- 来源、完整性值和引擎文件 SHA-256 记录在 `tools/vendor-provenance.json`。
- 引擎 MIT 许可证保留在仓库 `PHASER-LICENSE.txt` 和上传包 `index.html` 的完整许可证注释中，引擎文件原有许可证头保留。
- 360×640 逻辑画布、nearest-neighbor 像素放大、关闭抗锯齿、整数像素绘制。
- Arcade Physics 使用 120Hz 固定物理步长，减少快速泡泡跨过目标的风险；按需两倍速时增加步数，不粗暴放大单步位移。
- 使用 Canvas renderer，优先保证网页环境兼容性；正式宿主表现仍须真机测试。
- 角色、果冻、糖果、背景和音效均为本项目制作；没有搬用第三方游戏美术。0.2.0 的背景乐、音效与卡通拟声使用 Web Audio 本地合成，首次点击后启用，用户可静音。

## 技术边界

这是网页引擎方案，并不自动满足小红书或 TapTap 的平台准入、SDK 或宿主要求。当前网络无法获取此前截图中的小红书官方 skill，不能声称已完成全部平台规范审核。后续平台接入应以实际审核结果和宿主测试为准。

## 0.3.0 地图结构参考

实际读取了 [Tiled Worlds 文档](https://github.com/mapeditor/tiled/blob/master/docs/manual/worlds.rst)、其中的像素世界分区示例，以及 [Wesnoth 大地图 POI 状态配置](https://github.com/wesnoth/wesnoth/blob/master/data/campaigns/Heir_To_The_Throne/utils/bigmap.cfg)。参考的是区域/地点/完成状态的组织方式，没有复制这些项目的素材或代码。

当前世界岛屿与章内路线采用原生 DOM/SVG，支持手机滚动与可访问按钮；战斗继续由 Phaser 驱动。全部新增主题图、敌人轮廓和机关为 `create_world_art.py` 生成的原创像素素材。没有引入新的运行库或第三方图片。

# QuantDash · 30 秒推广片 V1

**V1 已获用户确认。2026-11-25 的最新用户游戏包已用本地图集＋音轨方式接入。** 本目录保留原始 MP4 和可编辑制作工程；游戏内当前实现见 [游戏基准说明](../dragon-bubbles/CURRENT_PACKAGE.md)，不是直接播放本目录的外网 MP4。

- [观看／下载 MP4（音乐＋音效）](https://raw.githubusercontent.com/cxq24/xiaohongshu-tools/main/quantdash-promo/out/quantdash-30s-v1.mp4)
- [下载无配乐版（保留音效）](https://raw.githubusercontent.com/cxq24/xiaohongshu-tools/main/quantdash-promo/out/quantdash-30s-v1-nobgm.mp4)
- [查看分镜预览](out/quantdash-30s-storyboard.jpg)
- [查看片尾海报](out/quantdash-30s-poster.jpg)

30 秒，1080 × 1920 竖屏，30 fps，H.264／AAC。中文大字、原创轻电子配乐和数据流音效，无人声旁白。片尾展示 `quantdash.net`、文档地址与官网二维码。

## 内容与来源

依次展示：多市场金融数据服务、A 股／ETF／港股／美股统一接口、真实 Python SDK 调用、K 线／A 股全市场快照／DataFrame 输出、官网入口。

功能与代码对照 [QuantDash 官方公开示例仓库](https://github.com/quantdash-net/QuantDash/tree/053ab30d0f7f43b5e33f033d3ee96a1df5f6048f)。本次环境尚不能访问官网和文档站，因此没有伪造产品控制台或声称使用真实官网录屏；深蓝／青色是本片暂定视觉，待核对品牌规范。示意图不展示实时行情、投资回报或真实 API Key。

镜头参考 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft/tree/59f3e9b9e936ff2bce0e18446226d770a3f2f61f) 的曲线汇流与品牌收束设计，按竖屏重排。源码引用和许可见 `research/`，详细分镜见 [DESIGN.md](DESIGN.md)。音乐和音效由本工程确定性合成，没有使用来源不明的第三方歌曲或配音。

## 编辑与导出

需要 Node.js 与 npm。字体和音轨已随工程提供，不依赖运行时联网。

```sh
npm ci
npm run studio
```

在 Remotion Studio 中预览；画面与文案在 `src/Promo.tsx`，唯一镜头时间表为 `SHOTS`。

Linux 使用本机 Chromium 重渲两版：

```sh
node tools/render.mjs --stills --render
python tools/qa.py
python tools/playback_check.py
```

其他系统可使用 Remotion 自带浏览器：

```sh
npx remotion render src/index.ts QuantDashPromo out/quantdash-30s-v1.mp4
npx remotion render src/index.ts QuantDashPromo out/quantdash-30s-v1-nobgm.mp4 --props=props-nobgm.json
```

`tools/prepare_assets.py` 用于重建原创音轨和字体子集，使用 NumPy、fontTools 及 Linux 的 Noto CJK／DejaVu 字体；`tools/qa.py` 需要 FFmpeg、Pillow、NumPy、SciPy。成片不依赖这些制作工具。字体与公开示例代码许可保留在 `research/`；Remotion 使用其独立许可。

验收记录在 `out/validation.json` 与 `out/REVIEW.md`。声音包含数值与编码检查，未将波形测量声称为人工试听；请通过实际播放审核听感。

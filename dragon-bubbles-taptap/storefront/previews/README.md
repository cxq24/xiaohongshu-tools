# 完整画面宣传片重制预览

用户反馈上一版裁切、纵向平移的横版宣传片不能完整展示游戏，本预览恢复整个原始竖屏画面：固定镜头、无裁切、无额外图文或装饰框，保留实时录制的原游戏声音。

文件：`complete-uncropped-gameplay-30s-1920x1080.mp4`。30 秒、1920×1080、H.264＋AAC。原游戏画面按比例缩放至输出高度，横屏容器两侧留黑。来源为当前发布包实际运行的 `../gameplay-recording-60s-720x1280.mp4`，选取其前 30 秒。

**这只是待用户确认的展示方式预览，不是已经通过首页推荐审核的版本。** 用户仍需选择：保留现有竖屏界面并接受两侧留黑，或先制作独立的完整横屏界面适配再录制。平台先前要求横屏宣传片，并否定外加画中画排版；是否接受当前留边预览尚未向平台确认。

已有 `gameplay-fullscreen-30s-1920x1080.mp4` 是被用户否定的裁切方案，不应继续作为新上传建议。当前预览未替换完整素材包，线上游戏包与原始实机录屏没有改动。

制作命令：

```sh
ffmpeg -i ../gameplay-recording-60s-720x1280.mp4 -t 30 \
  -vf 'scale=-2:1080:flags=neighbor,pad=1920:1080:(ow-iw)/2:0:color=black,setsar=1,format=yuv420p' \
  -c:v libx264 -profile:v high -level:v 4.0 -preset fast -crf 19 \
  -c:a aac -b:a 128k -movflags +faststart \
  complete-uncropped-gameplay-30s-1920x1080.mp4
```

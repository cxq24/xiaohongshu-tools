# 早一点 Android 测试版 · 0.2.1

支持 Android 8.0 及以上，可覆盖安装 0.2.0 并保留原有设置。

- **[下载 0.2.1 APK](https://github.com/cxq24/xiaohongshu-tools/raw/refs/heads/main/morning-alarm/releases/little-morning-0.2.1.apk)**
- [备用 ZIP](https://github.com/cxq24/xiaohongshu-tools/raw/refs/heads/main/morning-alarm/releases/little-morning-android-0.2.1.zip)
- **[查看极简首页截图](0.2.1-previews/README.md)**
- [设计规范](../DESIGN.md) · [源代码与说明](../android/README.md) · [验证记录](../android/VALIDATION.md)

## 本版调整

首页只保留大时间、重复星期、闹钟开关和一行“起床后”播报摘要，右上角只有设置入口。

- 点时间直接修改。
- 点摘要进入播报编辑页，试听移至该页底部。
- 响铃测试与取消体验/贪睡移到“设置 → 体验响铃”。
- 移除首页的试听大按钮、体验入口、额外标题和说明文字。

已通过模拟器检查：覆盖安装偏好保留、时间修改、真实闹钟开关、迁移后的试听/测试/取消入口，以及昼夜和 130% 字体布局。未重复运行所有 0.2.0 播放场景；真实手机后台与中文听感仍需复测。天气仍为示例。

[安装步骤](安装与测试-0.2.1.txt) · [SHA-256](little-morning-0.2.1.apk.sha256)

旧版：[0.2.0 APK](little-morning-0.2.0.apk) · [0.2.0 界面](0.2.0-previews/README.md) · [0.1.0 APK](little-morning-0.1.0.apk)

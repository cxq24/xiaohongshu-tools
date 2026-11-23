# 早一点 Android 测试版 0.1.0

支持 Android 8.0 及以上。这里是可安装的原生 APK，无需电脑或开发者账号。

- [下载 APK](https://github.com/cxq24/xiaohongshu-tools/raw/refs/heads/main/morning-alarm/releases/little-morning-0.1.0.apk)
- [备用 ZIP：解压后安装 APK](https://github.com/cxq24/xiaohongshu-tools/raw/refs/heads/main/morning-alarm/releases/little-morning-android.zip)
- [SHA-256](little-morning-0.1.0.apk.sha256)

## 安装与测试

1. 在安卓手机上下载 APK，用文件管理器打开，按提示允许当前来源安装应用。
2. 打开“早一点”，允许首页的通知、准时响铃和锁屏显示权限；允许后返回 App。
3. 开启系统闹钟音量，先点“试听我的早晨”。缺少中文语音时，点“中文语音设置”，启用或下载中文语音包。
4. 点“10 秒后响铃”，响铃后点“我起床了”，检查是否停止铃声并开始播报。
5. 再试一次并立即锁屏。若没有全屏界面，可点通知进入。还可以测试“再睡 5 分钟”和停止播放。
6. 编辑时间、城市、日程和提醒，保存后退出重开检查是否保留。

天气为固定示例；日程与提醒为手动输入，会持续重复直到修改。未接入真实天气或系统日历。

本包已完成编译、开发签名、APK 签名校验、7 项排程逻辑检查和模拟器安装。尚未完成完整运行及真机锁屏、中文语音和各品牌后台兼容性验证。请先测试，再决定是否用于日常起床。

APK SHA-256：`f786eac0877f6a6e0f43935e50f31464f4558a99967dd9444d5a485c891cdd91`

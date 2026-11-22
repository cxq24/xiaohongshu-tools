# 一间小屋 · 房间装饰小游戏原型

一个温馨小卧室的装饰玩法原型。使用原生 HTML、CSS、JavaScript 和内置 SVG，无需安装依赖，无外部网络请求。

## 下载与上传

本次修正版为 **0.1.1**，上传文件：

- [cozy-room-xiaohongshu-0.1.1.zip](cozy-room-xiaohongshu-0.1.1.zip)
- [GitHub 直接下载](https://raw.githubusercontent.com/cxq24/xiaohongshu-tools/main/cozy-room/cozy-room-xiaohongshu-0.1.1.zip)

在小红书部署页选择「重新上传」，使用这个新版 ZIP。版本号可填写 `0.1.1`。原下载文件 `cozy-room-demo.zip` 也已替换为相同的修正版内容。

旧包的部署错误是包含不支持的 `cozy-room-demo/README.md`。新版只从 `build/` 收集运行文件，并把 `index.html` 放在 ZIP 根目录；说明文档、打包脚本和预览图不进入上传包。

按用户提供的部署截图，允许的扩展名为：`jpg`、`css`、`gif`、`svg`、`png`、`js`、`jpeg`、`json`、`html`、`woff2`、`webp`、`woff`。打包脚本在生成 ZIP 前会检查这一列表。

截图给出的官方规范文件地址为：
`https://fe-static.xhscdn.com/minitool/20261117152455/minitool-zip-builder-1.11.1.skill`

本次获取该地址被环境联网策略拒绝，未读取到完整规范。因此本版已修复已知打包错误，但未完成该 skill 的全面审核，也尚未在小红书部署页或真机中验证。

## 目录

```text
cozy-room/
├── cozy-room-xiaohongshu-0.1.1.zip  # 当前版本上传包，根目录包含 index.html
├── cozy-room-demo.zip               # 原下载文件名，与当前版本内容一致
├── build/index.html                 # 可运行网页，也是当前可编辑实现
├── previews/                        # 桌面、房间、手机效果图，仅供查看
├── package.py                       # 打包与文件类型检查脚本，不进入 ZIP
├── README.md                        # 使用与包结构说明，不进入 ZIP
├── DESIGN.md                        # 玩法、视觉与功能范围，不进入 ZIP
└── VALIDATION.md                    # 验证记录，不进入 ZIP
```

## 试玩

解压新版 ZIP，用现代浏览器打开根目录 `index.html`。开发时可以直接打开 `build/index.html`，也可在本目录执行：

```sh
python3 -m http.server 8000 --directory build
```

然后在本机浏览器访问 `http://localhost:8000`。

## 维护与重新打包

修改 `build/` 内的文件后，重新验证功能、按需更新效果图。在本目录运行：

```sh
python3 package.py
python3 -m zipfile -t cozy-room-xiaohongshu-0.1.1.zip
```

打包脚本不依赖当前工作目录。增加版本时同步修改脚本的 `VERSION`、本文的下载地址和验证记录。

本项目无需编译。当前包是静态网页原型，尚未接入小红书或 TapTap 平台 SDK。图片导出使用浏览器下载方式，小红书宿主内保存相册的能力仍需接入和真机验证；本次没有修改玩法或导出实现。

![默认房间界面](previews/preview.png)

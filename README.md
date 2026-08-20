# Lunar Shift · 节律睡眠

> 跨时区节律睡眠顾问 —— 把「生物钟 / 光照 / 跨时区」做成一台随身小仪器。
> A cross-timezone circadian & light-control sleep advisor, shipped as a single-file PWA.

[English README ↓](#english-readme)

---

## 这是什么

Lunar Shift 是一款面向「跨时区生活者」（留学生、远程协作、频繁出差、倒班人群）的节律睡眠助手。
它不是又一个睡眠记录 App，而是把**生物钟相位、光照暴露、跨时区时钟、倒时差计划**整合进一个可交互的随身面板，并用 AI 做「节律问诊」。

整个前端是**一个 HTML 文件**（无需构建、无框架、无依赖），双击即可在浏览器运行；加上三个轻量云函数，就构成了完整的「记录 → 分析 → AI 问诊 → 行动 → 云同步 → 账号」闭环。

## 核心功能

| 模块 | 说明 |
|---|---|
| 🌙 综合节律评分 | 基于睡眠/光照/相位数据的 0–100 分仪表盘 |
| 🕐 跨时区时钟台 | 12 城横滑选择、双时钟、UTC 刻度尺、风景预览 |
| 💡 光照调节 | 屏幕「月光」滤镜（毛玻璃质感），按时区联动 |
| 🩺 AI 问诊 | 双引擎：演示模式（离线可用）+ DeepSeek 在线（真实大模型） |
| 🌏 倒时差计划 | 目标城市 + 起床/入睡时间，生成逐步适应计划 |
| 📊 图表中心 | 风玫瑰、评分趋势、光照达标等 6 类 SVG 图表 |
| ☁️ 云同步 | 以「同步 ID」为钥匙，COS 对象存储多设备备份/恢复 |
| 📧 邮箱登录 | scrypt 加盐哈希，绑定同步 ID 的跨设备账号 |
| 🌐 三语界面 | 简体中文 / English / 日本語（主流程已覆盖） |

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（单文件 PWA），SVG 图表，`backdrop-filter` 毛玻璃，CSS 动画，Service Worker 离线缓存，**零构建、零依赖**
- **后端（云函数，Node.js 18+）**：
  - `deepseek-proxy` —— DeepSeek 问诊代理（Key 只存云端环境变量）
  - `sync` —— 云同步（COS 对象存储直连，强一致覆盖）
  - `auth` —— 邮箱注册/登录（scrypt 哈希，账号存 COS）
- **部署**：腾讯云开发 CloudBase（静态托管 + 云函数）
- **存储**：COS 对象存储（`cos-nodejs-sdk-v5`）

## 目录结构

```
LunarShift/
├── LunarShift-prototype.html   # 主程序（单文件 PWA，双击即跑）
├── manifest.json               # PWA 配置
├── sw.js                       # Service Worker（离线缓存）
├── icons/                      # PWA 图标
├── cloud-functions/            # 三个云函数（见各自 README）
│   ├── deepseek-proxy/         #   AI 问诊代理
│   ├── sync/                   #   云同步
│   └── auth/                   #   邮箱登录
├── sleep-template.csv          # 睡眠数据导入样例
├── README.md
├── LICENSE
└── .gitignore
```

> `dist/`、`fix_i18n_*.py`、`_check.js`、`keyframes/` 等为构建/调试中间产物，已在 `.gitignore` 中排除，不会进入仓库。

## 快速开始（本地运行）

不需要任何安装或构建：

1. 直接双击 `LunarShift-prototype.html`，或在浏览器打开它
2. 即是一个可交互的 App（演示模式 AI 默认可用，离线也能跑）
3. 想让它「可安装到手机桌面 / 离线可用」：把它和同目录的 `manifest.json`、`sw.js`、`icons/` 一起部署到任意静态托管（见下）

## 部署到云端（CloudBase）

### 1. 静态托管（前端）

把 `LunarShift-prototype.html`、`manifest.json`、`sw.js`、`icons/` 上传到 CloudBase 静态托管（或 GitHub Pages / Vercel / Netlify 任意静态服务）即可。
线上示例：`https://deepseek-proxy-d4g6o2cxmf70e554f-1471086786.tcloudbaseapp.com`

### 2. 云函数（后端，按需）

三个云函数各自目录都有 `README.md`。通用流程：

```bash
# 在对应目录内执行（自动安装依赖）
cd cloud-functions/deepseek-proxy && cloudbase fn deploy deepseek-proxy --runtime Nodejs18.15 --force -e <环境ID>
cd cloud-functions/sync          && cloudbase fn deploy sync          --runtime Nodejs18.15 --force -e <环境ID>
cd cloud-functions/auth          && cloudbase fn deploy auth          --runtime Nodejs18.15 --force -e <环境ID>

# 然后为每个函数创建 HTTP 访问路径 /deepseek、/sync、/auth
```

> ⚠️ 代码中目前**硬编码了示例环境 ID / Bucket / AppID**（`deepseek-proxy-d4g6o2cxmf70e554f` 等）。
> 你自己部署时，请替换为你自己的 CloudBase 环境与 COS 配置（相关值集中在原型文件的常量区与三个云函数内）。
> 体验版环境的文档数据库（NoSQL）不可用，故后端统一改用 COS 对象存储。

## 已知问题 / 待完善

- 🌐 **i18n 未完全覆盖**：云同步页与登录页的部分文案在英文 / 日文下可能显示 `undefined`（中文本体正常）。主流程三语已就绪，这两页需在发布前补全字典 key。
- 🔐 **账号体系为简化版**：登录后本地持有 `syncId`，无会话 Token / 过期 / 限流，正式发布前建议加固。
- 🔔 **后台推送降级**：体验版环境无 Web Push 订阅能力，当前为「页面内通知」降级方案。
- 🌡️ **单位联动待核验**：12 小时制 / 华氏度（°F）的真换算在部分视图下尚未完全打通。
- ☁️ 示例后端为**体验版环境**，仅适合演示；公开上线请自建环境并替换配置。

## 贡献

欢迎 Issue / PR。本项目当前为个人原型阶段，结构会随迭代调整。

## License

MIT —— 详见 [LICENSE](./LICENSE)。

---

## English README

**Lunar Shift** is a cross-timezone circadian & light-control sleep advisor, delivered as a **single-file PWA** (no build, no framework, no dependencies). Open `LunarShift-prototype.html` in any browser and it just works.

### Features
- Circadian score dashboard, cross-timezone clock desk (12 cities), light-filter control
- AI consultation with **dual engine**: offline demo mode + live DeepSeek (via proxy)
- Jet-lag plan, 6 SVG chart types, cloud sync (COS-backed), email login (scrypt), trilingual UI (zh/en/ja)

### Stack
- Frontend: vanilla HTML/CSS/JS, SVG, Service Worker — zero build
- Backend: 3 Node.js 18+ CloudBase cloud functions (`deepseek-proxy`, `sync`, `auth`) on Tencent CloudBase + COS storage

### Run
Just open `LunarShift-prototype.html`. For installable/offline PWA, host it together with `manifest.json`, `sw.js`, `icons/` on any static host.

### Deploy
See each folder under `cloud-functions/` for its README. Replace the hardcoded sample env IDs / Bucket / AppID with your own before going public.

### Known gaps
Partial i18n on the sync/login pages (EN/JA may show `undefined`); simplified auth (no session token); push downgraded to in-app notices; hardcoded sample environment config.

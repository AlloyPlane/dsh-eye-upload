# 📷 dsh-eye-upload

**给 DSH 的纯文本模型装上一双能"发图"的手** —— 聊天输入框一键上传图片，自动把图片路径填进消息，让代理用 `image_understand`（眼睛）看图。纯配置、零改动核心、随时可禁用。

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DeepSeek%20Harness-plugin-blueviolet)](https://github.com/DeepSeek-Harness/dsh)
![Platform](https://img.shields.io/badge/platform-Web%20GUI-57606a)
![Size](https://img.shields.io/badge/size-%3C10KB-lightgrey)

---

## ✨ 为什么需要它

DeepSeek Harness 的默认主力模型（如 deepseek-v4-flash）是**纯文本模型**，Web GUI 直接发图片会被拒（"当前模型不支持图片"）。但 DSH 有"眼睛"（`image_understand` 工具）——只是缺一个 GUI 入口。

**dsh-eye-upload 补上这个缺口**：点一下 📷 → 选图 → 路径自动进输入框 → 回车发送 → 代理调眼睛看图。

```
你: [点击 📷] → [选择 截图.png]
    请用 image_understand 查看这张图片：D:/xd/.dsh-vision/1739...
代理: (调用 image_understand) 🖼️ 这是你的页面截图，布局是……
```

---

## 🚀 特性

- ✅ **一键发图**：输入框工具行一个 📷 按钮，选图即上传，路径自动填入
- ✅ **零核心改动**：全部代码在插件里，不碰 DSH 源码，随时卸载
- ✅ **纯文本模型也能看图**：配合眼睛插件，文本模型拥有视觉能力
- ✅ **自动存盘**：图片存到工作区 `.dsh-vision/`，可自定义目录
- ✅ **安全**：严格校验格式（PNG/JPG/WebP/GIF）与大小（默认 ≤10MB）
- ✅ **可插拔**：一行配置禁用，或直接从 profile 移除

---

## 📦 安装

### 前提

1. 已安装 **dsh-eye-vision**（或上游 dsh-free-vision）—— 提供 `image_understand` 眼睛工具
2. 视觉模型可用（free-vision 配置里的 provider/model/API key）

### 步骤

```powershell
# 1. 克隆或下载本插件到本地
git clone https://github.com/AlloyPlane/dsh-eye-upload.git D:/xd/dsh-eye-upload

# 2. 注册进 web profile
cd D:/dhstart1
dsh plugin --profile web add D:/xd/dsh-eye-upload
# 或手工：把 "dsh-eye-upload": "link:D:/xd/dsh-eye-upload" 加入
# ~/.dsh/profiles/web/package.json 的 dependencies 和 dsh.profile.bundles

# 3. 重启 dsh web
dsh web --port 6295
```

重启后刷新页面，输入框左侧出现 **📷** 按钮，就绪！

---

## 🖱️ 使用

1. 点击输入框工具行的 **📷** 按钮
2. 选择一张图片（PNG/JPG/WebP/GIF，≤10MB）
3. 输入框自动填入 `请用 image_understand 查看这张图片：<路径>`
4. 直接回车发送，代理就会用眼睛查看并描述图片

> 💡 也可以先输入文字再发图，图片说明会自动追加到草稿末尾。

---

## ⚙️ 配置

插件设置（`~/.dsh/profiles/web/cordis.patch.yml`）：

```yaml
- id: eye-upload
  name: 'dsh-eye-upload'
  config:
    targetDir: 'D:/xd'        # 自定义保存根目录（默认：工作区 .dsh-vision）
    maxBytes: 10485760        # 单图大小上限，默认 10MB
```

> ⚠️ 注意：保存目录需在眼睛插件（free-vision）的 `allowedDirs` 内，否则 `image_understand` 读不到。工作区根路径（如 D:/xd）默认已在 allowedDirs 中。

---

## 🔌 禁用 / 移除

**临时禁用**（按钮消失）：

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- id: eye-upload
  disabled: true
```

**彻底移除**：从 `~/.dsh/profiles/web/package.json` 的 `dependencies` 和 `dsh.profile.bundles` 删掉 `dsh-eye-upload`，删掉 `node_modules/dsh-eye-upload` 链接，重启。

---

## 🧠 工作原理

```
[浏览器] 📷 按钮 ──选图──▶ base64
          │
          ▼ POST /dsh-eye-upload  {mediaType, data}
[服务端]  校验格式/大小 → 存入工作区 .dsh-vision/xxx.png
          │
          ▼ 返回 { ok, path: "D:/xd/.dsh-vision/xxx.png" }
[浏览器]  setDraft → 输入框填入 "请用 image_understand 查看这张图片：<path>"
          │
          ▼ 用户回车发送
[代理]   调用 image_understand(image_source=<path>) → 看图描述
```

---

## 📁 仓库结构

```
dsh-eye-upload/
├── dsh/index.js      # 服务端：上传路由 + 存盘 + 配置
├── client/client.js  # 客户端：📷 按钮（conversation.input.left 槽位）
├── cordis.patch.yml  # DSH 组合行
└── package.json      # 插件清单（零外部依赖）
```

---

## ❓ FAQ

**Q: 提示"当前模型不支持图片"怎么办？**
A: 这个是主模型限制，正是本插件的用武之地——它把图片转成路径+文本，绕过限制。

**Q: 图片会泄露吗？**
A: 图片只存在你本地工作区，通过你配置的视觉模型 API 读取，不经第三方。

**Q: 支持哪些模型？**
A: 任何通过 `image_understand`（free-vision 的 youtu-vita / qwen3-vl 等）能看图的视觉模型都行。

---

## 📄 License

[MIT](LICENSE) © 2026 [AlloyPlane](https://github.com/AlloyPlane)

---

**觉得有用？点个 ⭐ 支持一下，让更多 DSH 用户看到「纯文本模型也能看图」！**

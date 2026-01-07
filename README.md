# Memos Notes Chrome Extension

Chrome 浏览器插件，用于快速查看和创建 [Memos](https://github.com/usememos/memos) 笔记。

## 功能特性

- 📋 查看最近的笔记列表
- ✏️ 快速创建新笔记
- ⚙️ 可配置的 API 地址和认证密钥
- 🎨 简洁美观的弹窗界面

## 技术栈

- Chrome Extension Manifest V3
- Vanilla JavaScript (无框架依赖)
- HTML5 + CSS3

## 目录结构

```
memos-chrome-extension/
├── manifest.json           # 插件配置清单
├── README.md              # 项目说明
├── .gitignore            # Git 忽略文件
├── src/
│   ├── popup/            # 弹窗相关
│   │   ├── popup.html    # 弹窗界面
│   │   ├── popup.js      # 弹窗逻辑
│   │   └── popup.css     # 弹窗样式
│   ├── options/          # 设置页面
│   │   ├── options.html  # 设置界面
│   │   ├── options.js    # 设置逻辑
│   │   └── options.css   # 设置样式
│   └── background.js     # 后台服务
└── icons/               # 插件图标
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 本地开发

### 前置要求

1. 已部署的 Memos 服务（Docker 容器）
2. Memos API 可访问地址
3. Chrome 浏览器

### 安装步骤

1. 克隆或下载此项目

2. 打开 Chrome 浏览器，访问 `chrome://extensions/`

3. 开启右上角的「开发者模式」

4. 点击「加载已解压的扩展程序」

5. 选择此项目的根目录 `memos-chrome-extension`

6. 插件加载完成后，点击插件图标进入设置页面

7. 配置以下信息：
   - **API 地址**: 你的 Memos 服务地址（如：`https://your-server.com`）
   - **API 密钥**: 你的 Memos API Token（如需要）

### 使用方式

1. 点击 Chrome 工具栏上的 Memos 图标
2. 查看最近的笔记列表
3. 在输入框中输入内容，点击「添加笔记」创建新笔记

## API 说明

此插件需要与 Memos API 交互，请确保你的 Memos 服务支持以下接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/memos` | 获取 memo 列表 |
| POST | `/api/v1/memos` | 创建新 memo |

**请求头**:
```
Authorization: Bearer {your_api_key}
Content-Type: application/json
```

## 开发说明

### 修改图标

替换 `icons/` 目录下的 PNG 文件：
- `icon16.png` - 16x16 像素
- `icon48.png` - 48x48 像素
- `icon128.png` - 128x128 像素

### 重新加载插件

修改代码后，在 `chrome://extensions/` 页面点击插件的「重新加载」按钮即可。

## 常见问题

**Q: 插件无法连接到 Memos 服务？**
- 检查 API 地址配置是否正确
- 确认服务器 CORS 设置允许 Chrome 扩展访问
- 检查 API 密钥是否有效

**Q: 笔记列表为空？**
- 确认 Memos 服务中已有笔记数据
- 打开浏览器开发者工具查看网络请求

## 许可证

MIT License

## 相关链接

- [Memos GitHub](https://github.com/usememos/memos)
- [Chrome Extension 开发文档](https://developer.chrome.com/docs/extensions/)

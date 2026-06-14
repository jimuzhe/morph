# HTMLPPT Editor

Chrome 扩展 — 在任意 HTML 页面上直接编辑，像操作 PPT 一样简单。

## 产品形态

**不是独立网页**，而是注入到当前页面里的浮动工具栏：

- 打开本地 `.html` 文件 → 点击扩展图标 → 直接编辑 → 保存
- 打开在线网页 → 点击扩展图标 → 自动下载/本地化为 blob 页面 → 进入编辑 → 保存为 HTML 文件

## 工具栏样式

iOS 风格无边框浮动工具栏：

- 底部居中悬浮
- 高斯模糊 + 半透明毛玻璃
- 圆角胶囊造型
- 深色/浅色模式自适应

## 工具

| 工具 | 功能 |
|------|------|
| ↖ 选择移动 | 点击选中元素，拖拽移动位置 |
| T 编辑文字 | 双击或选中后编辑文字内容 |
| 🖼 替换图片 | 选中图片后本地上传替换 |
| ↩ ↪ | 撤销 / 重做 |
| ↓ 保存 | 保存到本地文件 |
| ✕ 退出 | 关闭编辑模式 |

## 安装使用

```bash
npm install
npm run build
```

1. 打开 Chrome → `chrome://extensions`
2. 开启「开发者模式」
3. 「加载已解压的扩展程序」→ 选择 `dist` 目录
4. **重要**：在扩展详情中开启「允许访问文件网址」（编辑本地 HTML 必须）
5. 用 Chrome 打开一个 HTML 文件或网页
6. 点击扩展图标 → 工具栏出现在页面底部

## 开发

```bash
npm run dev
# 在 chrome://extensions 加载 dist 目录，修改代码后刷新扩展
```

## 快捷键

- `Ctrl/Cmd + Z` — 撤销
- `Ctrl/Cmd + Y` — 重做
- `Ctrl/Cmd + S` — 保存
- `Esc` — 退出编辑 / 取消文字编辑
- `Delete` — 删除选中元素

## 项目结构

```
src/
├── background/serviceWorker.ts   # 点击图标 → 切换编辑模式
├── content/
│   ├── index.ts                  # Content Script 入口
│   ├── PageEditor.ts             # 页面内编辑逻辑
│   ├── FloatingToolbar.ts        # iOS 浮动工具栏
│   └── styles.css                # 工具栏 & 选中样式
└── shared/
    ├── htmlDocument.ts           # HTML 序列化 / 本地化
    └── fileSave.ts               # 保存到本地文件
```

## License

MIT

# 欲蓝财务 · 官方文档

线上站点： https://yulancloud.github.io/doc/

本仓库 `main` 分支根目录即 GitHub Pages 部署产物（`dist/`），**请勿手动编辑根目录下的 html/js/css**。

## 修改文档

Markdown 源文件在 [`source/pages/`](source/pages/)：

| 文件 | 页面 |
| --- | --- |
| `index.md` | 首页 |
| `deploy.md` | 部署教程 |
| `yulan.md` | 欲蓝财务魔方 |
| `windows-app.md` | Windows APP |
| `faq.md` | 常见问题 |

站点「编辑本页」按钮会直接跳转到这些文件的 GitHub 编辑页，改完提交后需重新构建发布。

## 本地构建

```bash
cd valaxy-site
npm install
npm run build
python3 upload_dist_fast.py   # 增量推送，只上传变化文件
```

配置见 [`source/valaxy.config.ts`](source/valaxy.config.ts)。

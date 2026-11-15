# 欲蓝财务 · 官方文档

线上站点： https://yulancloud.github.io/doc/

本仓库 `main` 分支根目录即 GitHub Pages 部署产物（`dist/`），**请勿手动编辑根目录下的 html/js/css**。

## 修改文档

Markdown 源文件在 [`source/pages/`](source/pages/)，按主题分目录：

| 路径 | 内容 |
| --- | --- |
| `index.md` | 首页 |
| `deploy/index.md` | 部署总览与选型 |
| `deploy/prepare.md` | 部署前准备 |
| `deploy/nginx.md` | Nginx 部署（需伪静态） |
| `deploy/apache.md` | Apache 部署（免伪静态） |
| `deploy/builtin.md` | PHP 内置服务器 |
| `deploy/install.md` | 安装与升级迁移 |
| `admin/index.md` | 后台总览 |
| `admin/products.md` | 商品管理 |
| `admin/orders.md` | 订单与发货 |
| `admin/payment.md` | 支付配置 |
| `admin/settings.md` | 站点设置与其他 |
| `yulan.md` / `windows-app.md` | 功能与配套 |
| `faq.md` | 常见问题 |

站点「编辑本页」按钮会直接跳转到对应文件的 GitHub 编辑页；改完提交后需重新构建发布。

## 本地构建

```bash
cd valaxy-site
npm install
npm run build
python3 upload_dist_fast.py   # 增量推送，只上传变化文件
```

配置见 [`source/valaxy.config.ts`](source/valaxy.config.ts)。

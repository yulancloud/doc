# 欲蓝财务 · 官方文档

> 当前文档对应系统 **v1.1.0**（健康检查 `build=20261115a`）。版本变化见 [`changelog.md`](source/pages/changelog.md)。

线上站点： https://doc.yulancloud.us.ci/

根目录的 `CNAME` 文件由本脚本每次部署自动写入，请勿手动删除。

本仓库 `main` 分支根目录即 GitHub Pages 部署产物（`dist/`），**请勿手动编辑根目录下的 html/js/css**。

## 修改文档

Markdown 源文件在 [`source/pages/`](source/pages/)，按主题分目录：

| 路径 | 内容 |
| --- | --- |
| `index.md` | 首页 |
| `changelog.md` | 版本更新（各版本变化与升级要点） |
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
| `developer/index.md` | 开发者总览 |
| `developer/theme.md` | 主题定制设置（CSS 变量 / 亮暗两套 / 版本号） |
| `developer/config.md` | PHP 配置与文案默认值 |
| `developer/custom/index.md` | 功能自定义 · 学习路线（教程总览） |
| `developer/custom/start.md` | 01 入门与本地环境 |
| `developer/custom/architecture.md` | 02 框架结构与请求生命周期 |
| `developer/custom/api.md` | 03 基础 API：路由、响应与鉴权 |
| `developer/custom/database.md` | 04 数据库与迁移 |
| `developer/custom/first-feature.md` | 05 实战：从零做一个完整功能 |
| `developer/custom/admin.md` | 06 后台管理扩展 |
| `developer/custom/frontend.md` | 07 前台数据流与交互 |
| `developer/custom/payment.md` | 08 支付 / 发货 / 商品类型扩展 |
| `developer/custom/security.md` | 09 安全规范与发布检查 |
| `deploy/checklist.md` | 上线自检清单 |
| `troubleshoot/index.md` | 故障排查总览（症状速查） |
| `troubleshoot/deploy.md` | 部署与迁移故障 |
| `troubleshoot/backend.md` | 后台与业务故障 |
| `troubleshoot/app.md` | Windows APP 故障 |

站点「编辑本页」按钮会直接跳转到对应文件的 GitHub 编辑页；改完提交后需重新构建发布。

## 本地构建

```bash
cd valaxy-site
npm install
npm run build
python3 upload_dist_fast.py   # 增量推送，只上传变化文件
```

配置见 [`source/valaxy.config.ts`](source/valaxy.config.ts)。

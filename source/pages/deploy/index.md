---
title: 部署总览
---

# 部署总览

本系统只有一个硬性要求：网站运行目录必须指向项目里的 `public/`。除此之外，按你用的 Web 服务器选择对应教程即可。

## 选哪篇教程

| 你的环境 | 看这篇 | 要不要手填伪静态 |
| --- | --- | --- |
| Nginx（宝塔面板 / 手写配置） | [Nginx 部署](/deploy/nginx) | 要，在站点「伪静态」框填规则 |
| Apache / 宝塔 Apache 环境 | [Apache 部署](/deploy/apache) | 不要，项目自带 `public/.htaccess` 自动生效 |
| PHP 内置服务器（本地试用 / 调试） | [PHP 内置服务器](/deploy/builtin) | 不要，靠 `router.php` 分发 |
| 装好之后第一次初始化、或升级版本 | [安装与升级](/deploy/install) | — |
| 开装之前核对环境 / 权限 | [部署前准备](/deploy/prepare) | — |
| 交付 / 升级后逐项打勾验收 | [上线自检清单](/deploy/checklist) | — |

> Nginx 要在面板里粘一段伪静态，Apache 什么都不用粘，只要允许 `.htaccess` 生效。两者差别仅此而已，运行目录、安装向导、数据库迁移完全一样。

## 三条共同前提

1. 运行目录 = `public/`。写成项目根目录会让 `src/`、`config/`、`data/` 直接暴露在公网上。
2. PHP 8.1+（8.3 已验证），开启 `pdo_sqlite` 扩展。
3. `data/` 目录可写，SQLite 数据库和配置都在这里生成。

## 部署流程

```text
① 部署前准备（环境 / 权限 / 目录）
      ↓
② 按 Web 服务器配置（Nginx 填伪静态 / Apache 开 rewrite / 内置服务器直接跑）
      ↓
③ 浏览器访问 /install 完成初始化（建店主账号、写配置）
      ↓
④ 执行一次 php bin/migrate.php（首次与升级后必跑）
      ↓
⑤ Ctrl+F5 清缓存 → 访问 /api/health 看到 build 版本号
      ↓
⑥ 按上线自检清单逐项打勾（安全核查 + 功能冒烟测试）
```

> 最常漏的是第 4 步和第 6 步：漏跑迁移会让后台整片「加载失败」，漏做安全核查可能把 `data/shop.sqlite` 暴露在公网上。

## 为什么 `/api/`、`/admin`、`/console` 需要重写规则

这几个是虚拟路径，磁盘上并没有同名文件：

| 路径 | 实际由谁处理 |
| --- | --- |
| `/api/*` | `public/api/index.php`（统一 API 入口） |
| `/install` | `public/install.html`（安装向导） |
| `/admin/` | `public/admin/index.html`（管理后台） |
| `/console/` | `public/console/index.html`（用户中心） |

Nginx 不会自己猜这些映射，所以要在伪静态里写清楚；Apache 则通过项目自带的 `public/.htaccess` 完成，无需手工填写。

::: warning
`/admin` 不带结尾斜杠时，页面里的相对资源会被浏览器算成 `/assets/...`，导致后台 JS 全部加载失败、页面不跳登录页。各教程的规则里都带了 301 补斜杠，请勿删掉。
:::

## 下一步

按环境选教程：用 Nginx 看 [Nginx 部署（需伪静态）](/deploy/nginx)，用 Apache 看 [Apache 部署（免伪静态）](/deploy/apache)，只是本地试一下看 [PHP 内置服务器](/deploy/builtin)。已经跑起来了去 [安装与升级](/deploy/install)，准备交付看 [上线自检清单](/deploy/checklist)。遇到报错看 [故障排查总览](/troubleshoot)（按症状速查）。

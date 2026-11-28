---
title: 功能自定义 · 学习路线
---

# 功能自定义 · 学习路线

> 这套教程面向想在欲蓝财务上加功能的开发者：从把项目在本地跑起来，到读懂框架、加接口、建表、做出第一个完整功能，再到后台、前台、支付发货与安全发布。按顺序读，每页底部都有「上一步 / 下一步」。

只想换配色 / 改文案默认值，不用读这套 —— 去 [主题定制设置](/developer/theme) 和 [PHP 配置与文案默认值](/developer/config) 就行。这里讲的是加新功能：新建表、写服务、注册接口、做后台页面、接前台交互。

## 学习路线

| 步 | 页面 | 读完你能做到 | 依赖 |
| --- | --- | --- | --- |
| 00 | 本页：学习路线 | 知道改一个功能会碰哪些文件、通用流程是什么 | — |
| 01 | [入门与本地环境](/developer/custom/start) | 本地跑起来、跑通健康检查、做第一个可验证的改动 | PHP ≥ 8.1 |
| 02 | [框架结构与请求生命周期](/developer/custom/architecture) | 说清一次请求从浏览器到数据库经过哪些层 | 01 |
| 03 | [基础 API](/developer/custom/api) | 读懂路由表、加一个只读接口和一个需登录的写接口 | 02 |
| 04 | [数据库与迁移](/developer/custom/database) | 加列、加表、改 CHECK 约束，并让旧库平滑升级 | 02 |
| 05 | [实战：从零做一个功能](/developer/custom/first-feature) | 端到端做出「访客留言」：建表→服务→路由→后台→前台→测试 | 03 + 04 |
| 06 | [后台管理扩展](/developer/custom/admin) | 加一个后台菜单页、复用设置表单、处理权限与审计 | 05 |
| 07 | [前台数据流与交互](/developer/custom/frontend) | 用 `ShopAPI` 取数、渲染页面、避开缓存与打字动画的坑 | 05 |
| 08 | [支付 / 发货 / 商品类型扩展](/developer/custom/payment) | 看懂支付回调链路，安全地扩展发货方式 | 05 |
| 09 | [安全规范与发布检查](/developer/custom/security) | 按清单自检、走发布流程、定位常见错误码 | 全部 |

::: tip 建议的读法
01–04 是基础，一次读完；05 是实战，一定动手敲一遍；06–09 是进阶专题，用到哪篇查哪篇。每篇的示例代码都基于真实文件路径，可以直接对照着改。
:::

## 开始之前：三条约定

1. 教程里所有路径都相对项目根目录（`public/` 的上一级）。教程基于 v1.1.0（`/api/health` 的 `build` 为 `20261116e`）。
2. 示例是教学用最小实现，用于讲清机制。上线前请按 [09 安全规范](/developer/custom/security) 补齐校验与权限，别直接把示例粘到生产站。
3. 动任何文件之前先备份 `data/shop.sqlite` 与整个 `config/`。升级时 `config/` 整个目录都不能删，删了安装向导会重新出现，见 [安装与升级](/deploy/install) 第四节。

## 一次典型的改动会碰哪些文件

| 想加的东西 | 要动的文件 | 要跑迁移 | 要 bump 版本号 |
| --- | --- | --- | --- |
| 一个只读接口 | `public/api/index.php` | 否 | 否 |
| 一张新表 / 一个新字段 | `database/schema.sql` + `bin/migrate.php` | 是 | 否 |
| 一段后台业务逻辑 | `src/你的Service.php` + `public/api/index.php` | 视情况 | 否 |
| 一个后台菜单页 | `public/admin/index.html` + `admin/assets/views.js` | 否 | 是 |
| 一个前台页面 / 交互 | `public/*.html` + `public/assets/*.js` | 否 | 是 |
| 一项可后台配置的参数 | `src/SettingsService.php` + 前后台表单 | 否 | 是 |
| 一条限流规则 | `config/config.php` 的 `rate_limit` | 否 | 否 |

> 「bump 版本号」指把全站 HTML 里 `?v=20261116e` 统一换成新值。JS / CSS 改了不 bump，浏览器和 CDN 会继续用旧文件，表现就是「我改了但没变化」。

## 通用流程：每个功能都走这 8 步

```text
① 备份 data/shop.sqlite 与 config/
      ↓
② 建表 / 加列：schema.sql（新装）+ migrate.php（旧库）
      ↓
③ 写服务类 src/XxxService.php（参数化查询、事务）
      ↓
④ 注册路由 public/api/index.php（含 $known 兜底数组）
      ↓
⑤ 后台：菜单按钮 + AdminViews 视图；前台：HTML + ShopAPI 调用
      ↓
⑥ 权限与限流：AdminAuth::require() / RateLimiter::guard()
      ↓
⑦ bump 全站 ?v= 版本号
      ↓
⑧ 测试：migrate --dry-run → curl 接口 → 页面强刷 → tests/e2e.sh
```

第 05 篇会把这 8 步完整走一遍，其余篇章分别展开其中一环。

## 配套阅读

参见 [主题定制设置](/developer/theme)（换配色、圆角、亮暗主题）、[PHP 配置与文案默认值](/developer/config)（改文案默认值、业务参数、新增可配字段）、[安装与升级](/deploy/install) 与 [部署与迁移故障](/troubleshoot/deploy)（部署、升级、迁移漏跑），以及 [故障排查总览](/troubleshoot) 与 [常见问题](/faq)（报错定位）。

---

**下一步 →** [01 入门与本地环境](/developer/custom/start)

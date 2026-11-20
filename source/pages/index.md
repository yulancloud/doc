---
title: 欲蓝财务
home: true
hero:
  name: 欲蓝财务
  text: 官方文档教程
  tagline: 基于 PHP + SQLite 的商城系统，内置魔方云、魔方财务（对接上游）与工单系统
  actions:
    - text: 部署指南
      link: /deploy
      theme: brand
    - text: 后台使用教程
      link: /admin
      theme: alt
features:
  - title: 按 Web 服务器分开讲
    details: Nginx 需手填伪静态，Apache 用自带 .htaccess 免配置，另有 PHP 内置服务器本地测试
  - title: 后台逐项教程
    details: 商品类型、发货配置、订单状态、易支付配置、站点与运费设置，一篇一篇讲清楚
  - title: 魔方云（KVM 云服务器）
    details: 新增 cloud 商品类型，支付后自动在上游创建云主机，用户可自助开关机、重启、重置密码
  - title: 魔方财务 · 对接上游
    details: 添加上游、同步产品、加价销售，订单支付后自动在上游开通，无需本地建号端
  - title: 工单系统
    details: 用户提单 / 回复 / 关闭，后台受理 / 回复 / 切换状态，归属严格隔离
  - title: 按症状查故障
    details: 部署、迁移、支付、开通的真实踩坑记录，附上线自检清单
  - title: 开发者 · 插件与主题制作
    details: v2 后台上传 zip 即装（更简单），v1 手动改 CSS 变量；另有 PHP 侧文案默认值与业务参数
  - title: 开发者 · 功能自定义教程
    details: 从入门、框架结构、基础 API 到实战做功能、后台前台扩展与发布检查，10 篇循序渐进
---

## 从这里开始

| 我想… | 看这篇 |
| --- | --- |
| 第一次部署，不知道选哪种 | [部署总览](/deploy) |
| 用 **Nginx / 宝塔**，要填伪静态 | [Nginx 部署](/deploy/nginx) |
| 用 **Apache**，不想填伪静态 | [Apache 部署](/deploy/apache) |
| 本地先跑起来看看 | [PHP 内置服务器](/deploy/builtin) |
| 装完初始化、或升级版本 | [安装与升级](/deploy/install) |
| 登录后台后不知道点哪 | [后台总览](/admin) |
| 添加商品、选商品类型 | [商品管理](/admin/products) |
| 配置在线支付 | [支付配置](/admin/payment) |
| 对接上游财务系统 | [魔方财务（对接上游）](/yulan) |
| 从零跑通魔方财务（添加上游→同步产品→下单交付） | [魔方财务使用教程](/yulan-guide) |
| 卖 KVM 云主机、用户自助管理 | [魔方云](/cloud) |
| 用户提单、客服受理 | [工单系统](/tickets) |
| 上线前逐项打勾 | [上线自检清单](/deploy/checklist) |
| 看每个版本改了什么 | [版本更新](/changelog) |
| 做二次开发、加新功能 | [功能自定义 · 学习路线](/developer/custom)（10 篇教程） |
| 给商城装个插件、不知道怎么放文件 | [如何安装插件（小白图文版）](/plugins/install) |
| 浏览 / 下载插件 | [插件市场](https://yulancloud.us.ci/market/) |
| 装邮箱登录 / 深色模式 / 多管理员插件 | [官方功能插件（v2 教程）](/developer/theme-v2#官方功能插件-v1-2-1-起) |
| 做主题 / 插件，**后台上传 zip 即装**（手把手） | [v2 插件主题教程](/developer/theme-v2) |
| 老方式：手动改 CSS 变量换配色 | [v1 插件主题教程](/developer/theme) |
| 改 PHP 默认文案 / 业务参数、新增可配字段 | [PHP 配置与文案默认值](/developer/config) |
| 报错了不知道为什么 | [故障排查总览](/troubleshoot)（按症状速查） |

> 部署完成建议按 [上线自检清单](/deploy/checklist) 走一遍；遇到「服务暂时不可用」这类提示，先看 [排查总览](/troubleshoot) 的三步定位法，真实错误在浏览器 Network 响应体里。

## 相关仓库

- 主仓库（系统源码 / Release 系统包）：[yulancloud/yulancloud](https://github.com/yulancloud/yulancloud)
- 插件市场（下载插件）：[yulancloud.us.ci/market](https://yulancloud.us.ci/market/)
- 插件索引仓库（`plugins.json`）：[yulancloud/plugins](https://github.com/yulancloud/plugins)
- 插件开发模板仓库（`Use this template`）：[yulancloud/plugin-template](https://github.com/yulancloud/plugin-template)

> 遇到报错先看 [常见问题](/faq)。

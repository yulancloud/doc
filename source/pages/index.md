---
title: 欲蓝财务
home: true
hero:
  name: 欲蓝财务
  text: 官方文档
  tagline: 基于 PHP + SQLite 的轻量商城系统，内置魔方云、魔方财务（对接上游）与工单系统
  actions:
    - text: 部署指南
      link: /deploy
      theme: brand
    - text: 后台使用教程
      link: /admin
      theme: alt
featuresTitle: 从这里开始
features:
  - title: 按 Web 服务器分开讲
    details: Nginx 要手填伪静态，Apache 用自带 .htaccess 免配置，另有 PHP 内置服务器本地测试
  - title: 后台逐项教程
    details: 商品类型、发货配置、订单状态、易支付配置、站点与运费设置，一篇篇讲清楚
  - title: 魔方云（KVM 云服务器）
    details: cloud 商品类型，支付后自动在上游创建云主机，用户可自助开关机、重启、重置密码
  - title: 魔方财务 · 对接上游
    details: 添加上游、同步产品、加价销售，订单支付后自动在上游开通，不用本地建号端
  - title: 工单系统
    details: 用户提单、回复、关闭，后台受理、回复、切换状态，归属严格隔离
  - title: 按症状查故障
    details: 部署、迁移、支付、开通的真实踩坑记录，附上线自检清单
  - title: 开发者 · 插件与主题制作
    details: v2 后台上传 zip 即装，v1 手动改 CSS 变量；另有 PHP 侧文案默认值与业务参数
  - title: 开发者 · 功能自定义教程
    details: 从入门、框架结构、基础 API 到实战做功能、后台前台扩展与发布检查，10 篇教程
---

## 文档目录

按场景分类，也可从左侧边栏进入。

### 部署

- [部署总览](/deploy) —— 先读这篇，了解整体流程
- [部署前准备](/deploy/prepare)
- [Nginx 部署](/deploy/nginx) —— 需要手动填伪静态
- [Apache 部署](/deploy/apache) —— 用自带的 .htaccess，免配置
- [PHP 内置服务器](/deploy/builtin) —— 本地测试用
- [安装与升级](/deploy/install)
- [上线自检清单](/deploy/checklist)
- [版本更新](/changelog)

### 后台使用

- [后台总览](/admin)
- [商品管理](/admin/products)
- [订单与发货](/admin/orders)
- [支付配置](/admin/payment)
- [站点设置与其他](/admin/settings)
- [双主题与支付方式](/theme-switch)
- [主题与插件（上传安装）](/developer/theme-v2)
- [如何安装插件](/plugins/install)

### 功能与配套

- [魔方财务（对接上游）](/yulan)
- [魔方财务使用教程](/yulan-guide) —— 从添加上游、同步产品到下单交付，完整走一遍
- [魔方云](/cloud)
- [工单系统](/tickets)
- [常见问题](/faq)

### 开发者

- [开发者总览](/developer)
- [PHP 配置与文案默认值](/developer/config)
- [v2 插件主题教程](/developer/theme-v2)
- [v1 插件主题教程](/developer/theme)
- [功能自定义 · 学习路线](/developer/custom)
- [插件市场](https://yulancloud.us.ci/market/)

### 故障排查

- [排查总览](/troubleshoot)
- [部署与迁移故障](/troubleshoot/deploy)
- [后台与业务故障](/troubleshoot/backend)

遇到报错先看[常见问题](/faq)。提示「服务暂时不可用」时，按[排查总览](/troubleshoot)的三步定位，真实错误在浏览器 Network 的响应体里。

## 仓库

- [主仓库 yulancloud/yulancloud](https://github.com/yulancloud/yulancloud) —— 源码和系统包
- [插件市场](https://yulancloud.us.ci/market/)
- [插件索引 yulancloud/plugins](https://github.com/yulancloud/plugins)
- [插件模板 yulancloud/plugin-template](https://github.com/yulancloud/plugin-template)

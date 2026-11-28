---
title: 欲蓝财务 官方文档
---

# 欲蓝财务

一套 PHP + SQLite 的轻量商城系统。单文件数据库，不需要 MySQL。已内置魔方云（KVM 云主机）、魔方财务（对接上游）、工单系统等商品和功能，支付完成后自动在上游开通并把连接信息交付给用户。

这个站收录部署、后台使用、功能配置、二次开发和故障排查的文档。侧边栏按场景分好了类，也可从下面的目录进入。

## 部署

第一次用，从部署总览开始，按你的 Web 服务器选一篇：

- [部署总览](/deploy) —— 先读这篇，了解整体流程
- [部署前准备](/deploy/prepare)
- [Nginx 部署](/deploy/nginx) —— 需要手动填伪静态
- [Apache 部署](/deploy/apache) —— 用自带的 .htaccess，免配置
- [PHP 内置服务器](/deploy/builtin) —— 本地测试用
- [安装与升级](/deploy/install) —— 装完初始化、或升级版本
- [上线自检清单](/deploy/checklist) —— 上线前逐项核对
- [版本更新](/changelog)

## 后台使用

登录 `/admin/` 之后不知道点哪，看这几篇：

- [后台总览](/admin)
- [商品管理](/admin/products) —— 添加商品、选商品类型
- [订单与发货](/admin/orders)
- [支付配置](/admin/payment)
- [站点设置与其他](/admin/settings)
- [双主题与支付方式](/theme-switch) —— 切换经典 / 创新界面，配置 5 种支付方式
- [主题与插件（上传安装）](/developer/theme-v2)
- [如何安装插件](/plugins/install)

## 功能与配套

- [魔方财务（对接上游）](/yulan) —— 概念和字段说明
- [魔方财务使用教程](/yulan-guide) —— 从添加上游、同步产品到下单交付，完整走一遍
- [魔方云](/cloud) —— 卖 KVM 云主机，用户自助管理
- [工单系统](/tickets) —— 用户提单、客服受理
- [常见问题](/faq)

## 开发者

想改代码、加功能或做插件：

- [开发者总览](/developer)
- [PHP 配置与文案默认值](/developer/config)
- [v2 插件主题教程](/developer/theme-v2) —— 后台上传 zip 即装
- [v1 插件主题教程](/developer/theme) —— 手动改 CSS 变量
- [功能自定义 · 学习路线](/developer/custom) —— 10 篇循序渐进的教程
- [插件市场](https://yulancloud.us.ci/market/)

## 故障排查

- [排查总览](/troubleshoot) —— 按症状速查
- [部署与迁移故障](/troubleshoot/deploy)
- [后台与业务故障](/troubleshoot/backend)

遇到报错先看[常见问题](/faq)。如果提示「服务暂时不可用」，先按[排查总览](/troubleshoot)的三步定位，真实错误在浏览器 Network 的响应体里。

## 仓库

- [主仓库 yulancloud/yulancloud](https://github.com/yulancloud/yulancloud) —— 源码和系统包
- [插件市场](https://yulancloud.us.ci/market/)
- [插件索引 yulancloud/plugins](https://github.com/yulancloud/plugins)
- [插件模板 yulancloud/plugin-template](https://github.com/yulancloud/plugin-template)

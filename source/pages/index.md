---
title: 欲蓝财务
home: true
hero:
  name: 欲蓝财务
  text: 官方文档教程
  tagline: 基于 PHP + SQLite 的商城系统，内置「欲蓝财务魔方」产品类型与商品级服务器配置
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
  - title: 欲蓝财务魔方
    details: 商品类型选择、每个商品独立配置服务器、下单自动建号交付
  - title: Windows APP
    details: 单文件 exe，免环境、仅管理员可运行、日志隔离、自动 UAC 提权
  - title: 按症状查故障
    details: 部署、迁移、支付、建号、域名与证书的真实踩坑记录，附上线自检清单
  - title: 开发者 · 主题定制
    details: CSS 变量换主色与亮暗配色、PHP 侧文案默认值与业务参数，附新增可配字段步骤
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
| 配欲蓝服务器 | [欲蓝财务魔方](/yulan) 与 [Windows APP](/windows-app) |
| 上线前逐项打勾 | [上线自检清单](/deploy/checklist) |
| 看每个版本改了什么 | [版本更新](/changelog) |
| 做二次开发、加新功能 | [功能自定义 · 学习路线](/developer/custom)（10 篇教程） |
| 换主题配色、改 CSS 变量 | [主题定制设置](/developer/theme) |
| 改 PHP 默认文案 / 业务参数、新增可配字段 | [PHP 配置与文案默认值](/developer/config) |
| 报错了不知道为什么 | [故障排查总览](/troubleshoot)（按症状速查） |

> 部署完成建议按 [上线自检清单](/deploy/checklist) 走一遍；遇到「服务暂时不可用」这类提示，先看 [排查总览](/troubleshoot) 的三步定位法，真实错误在浏览器 Network 响应体里。

## 相关仓库

- 主仓库（系统源码 / Release 系统包）：[yulancloud/yulancloud](https://github.com/yulancloud/yulancloud)
- Windows APP 仓库（exe 下载）：[yulancloud/yulancloudRubik-Windows](https://github.com/yulancloud/yulancloudRubik-Windows)

> 遇到报错先看 [常见问题](/faq)。

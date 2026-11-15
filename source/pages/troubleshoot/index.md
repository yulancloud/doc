---
title: 故障排查总览
---

# 故障排查总览

这一章按**「看到什么 → 为什么 → 怎么处理」**整理，全部来自真实部署与联调中踩过的坑。先在这里按症状定位，再进对应分册。

## 三步通用定位法

不管什么报错，先做这三步，能解决大部分问题：

1. **确认服务器跑的是新代码**：`curl https://你的域名/api/health`，看返回里的 `build` 是否为 `20261115a`。不是就说明文件没覆盖全，或 PHP/OPcache 还在跑旧代码。
2. **看浏览器 Network 面板**：按 `F12` → Network，复现一次操作，点开失败的请求看 **HTTP 状态码**和**响应体**。返回一段 `<?php` 源码、返回 HTML 登录页、返回 500，对应完全不同的原因。
3. **确认刚跑过迁移**：升级覆盖文件后必须执行一次 `php bin/migrate.php`。它是幂等的，重复执行安全，且内置旧库自动修复。

> 后台接口报错时，前端为了不暴露细节统一显示「服务暂时不可用，请稍候再试」，**真实原因在 Network 面板的响应体里**，别只看弹窗文字。

## 症状速查表

### 部署与升级

| 你看到的 | 最可能的原因 | 去哪看 |
| --- | --- | --- |
| 后台所有操作提示「加载失败，服务暂时不可用」 | 覆盖文件后**没跑迁移**，新列不存在 | [部署与迁移故障](/troubleshoot/deploy) |
| 保存商品 / 设置提示「服务暂时不可用，请稍候再试」 | 旧库外键子表损坏（`__products_old`） | [部署与迁移故障](/troubleshoot/deploy) |
| 日志里 `no such table: main.__products_old` | 同上，SQLite RENAME 改写了子表外键 | [部署与迁移故障](/troubleshoot/deploy) |
| 接口返回一段 `<?php` 源码 | Nginx 把 `/api/index.php` 当静态文件返回，**源码泄露高危** | [部署与迁移故障](/troubleshoot/deploy) |
| 后台打开空白、JS 全部 404 | 访问 `/admin` 少了结尾斜杠 | [部署与迁移故障](/troubleshoot/deploy) |
| 点下单 / 调接口 404 | 伪静态没保存，或子目录部署丢了前缀 | [部署与迁移故障](/troubleshoot/deploy) |
| Apache 下接口全 404、首页正常 | `.htaccess` 未生效（`mod_rewrite` / `AllowOverride`） | [部署与迁移故障](/troubleshoot/deploy) |
| 升级后页面没变化 | 浏览器强缓存，或 `?v=` 版本号没更新 | [部署与迁移故障](/troubleshoot/deploy) |
| 安装页打不开 / 提示已安装 | `config/installed.lock` 存在 | [安装与升级](/deploy/install) |

### 后台与业务

| 你看到的 | 最可能的原因 | 去哪看 |
| --- | --- | --- |
| 「请求来源不合法」403 | CSRF 校验：写请求缺 `Origin` 头或域名不匹配 | [后台与业务故障](/troubleshoot/backend) |
| 「请先登录后台」401 / 「该操作仅限店主账号」403 | 会话失效，或当前账号不是 `owner` | [后台与业务故障](/troubleshoot/backend) |
| 商品编号 / SKU / 分类 / 图片地址等校验报错 | 字段格式有白名单约束 | [后台与业务故障](/troubleshoot/backend) |
| 「该商品已有订单记录，不能删除」 | 有历史订单，只能下架 | [后台与业务故障](/troubleshoot/backend) |
| 「订单不能从「X」变为「Y」」 | 状态流转不允许跳步 | [后台与业务故障](/troubleshoot/backend) |
| 「订单状态已被其他人修改，请刷新后重试」 | 并发修改冲突 | [后台与业务故障](/troubleshoot/backend) |
| 「网关地址无效」「订单金额异常」 | 支付配置或网关返回异常 | [后台与业务故障](/troubleshoot/backend) |
| 支付成功但订单没变已付款 | 异步回调没到 / 验签失败 | [后台与业务故障](/troubleshoot/backend) |
| 「欲蓝服务器地址未配置」「无法连接欲蓝 APP」 | 商品级/全局服务器配置或 APP 未启动 | [Windows APP 故障](/troubleshoot/app) |
| 「欲蓝账号创建失败：…」 | APP 返回失败，整单回滚 | [Windows APP 故障](/troubleshoot/app) |

### Windows APP

| 你看到的 | 最可能的原因 | 去哪看 |
| --- | --- | --- |
| APP 启动即退出，提示需要管理员 | 未提权，必须右键「以管理员身份运行」 | [Windows APP 故障](/troubleshoot/app) |
| 提示 token 为空或仍是占位值 | 配置没改 | [Windows APP 故障](/troubleshoot/app) |
| 网站侧连不上 APP | 端口 / 防火墙 / `listen_host` / 口令不一致 | [Windows APP 故障](/troubleshoot/app) |
| 建号成功但角色不对 | `admin_products` 商品 ID 没配对 | [Windows APP 故障](/troubleshoot/app) |
| 日志里出现明文密码 | 旧版本掩码缺陷，升级到 Go 版 exe | [Windows APP 故障](/troubleshoot/app) |

## 分册导航

- [部署与迁移故障](/troubleshoot/deploy) —— 500、源码泄露、迁移、缓存、权限
- [后台与业务故障](/troubleshoot/backend) —— 真实报错文案逐条对照
- [Windows APP 故障](/troubleshoot/app) —— 建号端连不通 / 建号失败
- [上线自检清单](/deploy/checklist) —— 交付前逐项打勾

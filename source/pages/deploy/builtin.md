---
title: PHP 内置服务器（本地测试）
---

# PHP 内置服务器（本地测试）

不想装 Nginx / Apache，只想本地试用或调试代码时，用 PHP 自带的内置服务器就行。不用配伪静态，也不用改配置。

## 启动命令

在项目根目录执行：

```bash
php -S 127.0.0.1:8090 -t public public/router.php
```

然后浏览器打开 `http://127.0.0.1:8090/`。

::: warning 必须带上 `public/router.php`
内置服务器默认只按「静态文件」找路径，少写这个参数时 `/api/orders`、`/admin` 这类虚拟路径会直接 404。带上 `router.php` 后所有请求先经过它分发。
:::

## 为什么 `router.php` 能替代伪静态

`public/router.php` 就是一套 PHP 实现的路由，等价于 Nginx 伪静态 + Apache `.htaccess`：

| 能力 | 说明 |
| --- | --- |
| `/api/*` | 转给 `public/api/index.php` |
| `/install`、`/admin/`、`/console/` | 输出对应 HTML |
| `/admin` → `/admin/` | 301 补斜杠，避免相对资源 404 |
| 敏感文件 / 目录 | 独立拦截返回 404（数据库、备份、`.env`、`src/` 等） |
| 静态资源 | 带正确 MIME、`nosniff`、协商缓存输出 |
| 子目录部署 | 自动剥离子目录前缀 |

也就是说，就算 Web 服务器规则漏配，只要请求进了 `router.php`，敏感数据也拿不到。

## 常用变体

```bash
# 允许局域网访问（调试手机端页面时用）
php -S 0.0.0.0:8090 -t public public/router.php

# 指定 PHP 配置 / 显示错误
php -S 127.0.0.1:8090 -t public -d display_errors=1 public/router.php
```

## 适用场景

| 场景 | 是否推荐 |
| --- | --- |
| 本地试用、看界面、跑测试 | 推荐 |
| 排查前后端接口问题 | 推荐 |
| 局域网临时演示 | 可以，但别放敏感数据 |
| 生产环境对外服务 | 禁止，内置服务器是单线程、无加固 |

::: danger 不要用于生产
PHP 内置服务器官方文档明确标注「仅供开发使用」。对外请用 [Nginx](/deploy/nginx) 或 [Apache](/deploy/apache)，并配好 HTTPS。
:::

## 首次启动后

同样要走安装向导与迁移：

1. 访问 `http://127.0.0.1:8090/install` 完成初始化
2. 执行 `php bin/migrate.php`
3. 访问 `http://127.0.0.1:8090/api/health` 确认返回 JSON

详见 [安装与升级](/deploy/install)。

## 相关排查

用命令行调试接口时记得带 `Origin` 头（CSRF 校验），用 curl 自测报 403 的原因见 [后台与业务故障](/troubleshoot/backend)。

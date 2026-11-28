---
title: 01 入门与本地环境
---

# 01 入门与本地环境

这一篇把项目在本地跑起来，并做一次改完能看到结果的最小改动。

← [00 学习路线](/developer/custom) ｜ [02 框架结构](/developer/custom/architecture) →

::: tip
下文所有命令都在项目根目录执行。
:::

## 一、需要什么环境

| 项 | 要求 | 说明 |
| --- | --- | --- |
| PHP | ≥ 8.1（硬门槛），推荐 8.3 / 8.5 | `public/preflight.php` 会在编译期拦住低版本，输出可读的说明页而不是裸 Parse error |
| 扩展 | `pdo_sqlite`、`json`、`mbstring` | 缺一个都会在 `preflight.php` 里被拦下并提示 |
| 数据库 | SQLite，不需要 MySQL | 数据文件默认在 `data/shop.sqlite` |
| 其它 | 不需要 Composer、不需要 Node、不需要构建 | 纯 PHP + 原生 JS，改完刷新即可 |

先用一条命令确认：

```bash
php -v
php -m | grep -E 'pdo_sqlite|mbstring|json'
```

## 二、把项目跑起来

项目没有 `index.php` 在根目录，网站运行目录是 `public/`。本地用 PHP 内置服务器时必须带 `router.php`，否则 `/api/orders`、`/admin` 这类虚拟路径会直接 404：

```bash
cd /path/to/shop
php -S 127.0.0.1:8090 -t public public/router.php
```

- `-t public`：文档根指向 `public/`，和线上运行目录一致
- `public/router.php`：统一入口，负责敏感文件 404、虚拟路由（`/install` `/admin` `/console`）、静态资源、把 `/api/*` 转给 `public/api/index.php`

初始化（二选一）：

```bash
# A. 命令行初始化：建库 + 建管理员 + 写 config/installed.lock
php bin/init_db.php

# B. 浏览器访问 http://127.0.0.1:8090/install ，走安装向导
```

> 安装锁 `config/installed.lock` 一旦生成，安装入口就锁定。这个目录升级时不能删，见 [安装与升级](/deploy/install)。

验证：

```bash
curl -s http://127.0.0.1:8090/api/health | python3 -m json.tool
```

期望看到 `{"ok":true,"data":{"status":"up","build":"20261116e",...}}`。浏览器打开 `http://127.0.0.1:8090/`，查看源代码里 `<html>` 上的 `data-api-source` 应为 `api`（若为 `static`，说明没连上接口，走的是 `data.js` 静态兜底数据）。

## 三、常用命令速查

| 命令 | 作用 |
| --- | --- |
| `php bin/migrate.php` | 幂等迁移：补列、补表、修旧库，会先自动备份数据库 |
| `php bin/migrate.php --dry-run` | 只检查要做什么，不改库 |
| `php bin/create_admin.php` | 追加一个后台管理员 |
| `php bin/reset_admin.php` | 重置管理员密码 |
| `php bin/close_expired.php` | 关闭超时未支付订单（可挂 crontab） |
| `bash bin/backup.sh` | 备份数据库 |
| `bash tests/e2e.sh` | 端到端回归测试 |

改动任何表结构后，先跑 `--dry-run` 看清单，再跑正式迁移。

## 四、第一个改动：给健康检查加一个字段

最小可验证的改动，用来确认「改 PHP 立即生效、不重启、不构建」。打开 `public/api/index.php`，找到 `/api/health` 那个 case，在返回数组里加一行：

```php
case $path === '/api/health' && $method === 'GET':
    Response::ok([
        'status'   => 'up',
        'time'     => date('c'),
        'installed'=> $installed,
        'version'  => '5.5',
        'build'    => '20261116e',
        'php'      => PHP_VERSION,
        'my_field' => 'hello-dev',   // ← 你加的这一行
    ]);
```

保存后直接再 curl 一次，不用重启、不用清缓存：

```bash
curl -s http://127.0.0.1:8090/api/health | grep -o '"my_field":"[^"]*"'
```

看到 `hello-dev` 就说明链路通了。PHP 每个请求都重新解析文件，所以后端改动即时生效（开了 OPcache 时需 reload PHP-FPM）。

::: warning PHP 改了立即生效 ≠ 前端改了立即生效
`app.js` / `api.js` / `style.css` / HTML 带 `?v=20261116e` 版本号，改它们必须同步 bump 全站版本号并 `Ctrl+F5`，否则浏览器 / CDN 继续用旧文件。这是二次开发最高频的「改了没反应」，详见 [07 前台数据流](/developer/custom/frontend)。
:::

## 五、调试四件套

1. 写请求要带 `Origin`：后台接口的 `AdminAuth::require()` 内含 CSRF 同源校验，用 curl 自测时必须带同源头，否则一律 403 `csrf_failed`：
   ```bash
   curl -i -X POST http://127.0.0.1:8090/api/admin/xxx \
     -H 'Content-Type: application/json' \
     -H 'Origin: http://127.0.0.1:8090' \
     -H "Cookie: shiwu_admin_sid=你的会话Cookie" \
     -d '{"a":1}'
   ```
2. Body 必须是 JSON 对象：`readJsonBody()` 强制 `Content-Type: application/json`、≤ 64 KB，否则 415 / 413 / 400。
3. 看真实错误：前端统一提示「服务暂时不可用」时，真实原因在浏览器 Network 的响应体里；PHP 侧的 warning / 异常写在 PHP `error_log`。API 入口有「非 JSON 输出兜底」，任何脏输出都会被转成结构化 `server_error` JSON，不会污染响应。
4. 判数据源：`<html data-api-source="static">` 表示前端没连上 API，后台改动自然不生效，先查接口基址与重写规则。

## 六、入门阶段三个高频坑

| 现象 | 原因 |
| --- | --- |
| `/api/*` 全 404 | 启动没带 `public/router.php`，或运行目录没设成 `public/` |
| 保存商品报「服务暂时不可用」 | 旧库没跑 `php bin/migrate.php`，新列不存在 |
| 页面看着正常、一点下单 404 | 子目录部署时接口基址不对，见 [02 框架结构](/developer/custom/architecture) 的路径归一化 |

---

← [00 学习路线](/developer/custom) ｜ **下一步 →** [02 框架结构与请求生命周期](/developer/custom/architecture)

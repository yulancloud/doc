---
title: 部署与迁移故障
---

# 部署与迁移故障

## 后台整片「加载失败，服务暂时不可用」

**原因**：覆盖新版文件后没有执行数据库迁移，表里缺新列，接口一查就报错。前端把所有接口异常统一显示成这句话，所以看起来像"服务挂了"，其实是数据库结构没跟上。

**处理**：

```bash
cd /www/wwwroot/你的站点
php bin/migrate.php
```

然后 `Ctrl+F5` 强刷后台。迁移脚本是**幂等**的，重复执行安全，可以放心跑。

升级标准动作永远是三步：**覆盖文件 → 跑迁移 → 清缓存**，顺序别反。见 [安装与升级](/deploy/install)。

## 保存商品 / 设置提示「服务暂时不可用，请稍候再试」

这是本次开发中最隐蔽的一个坑，单独说明。

### 症状

- 新增或编辑商品、保存设置时接口 500
- PHP 错误日志里出现 `no such table: main.__products_old`
- 只有**从旧版本升级上来的库**会中招，全新安装的库正常

### 根因

SQLite 的 `ALTER TABLE products RENAME TO __products_old` 在默认 `legacy_alter_table=OFF` 下，会**把所有子表里指向 `products` 的外键一起改写成指向 `__products_old`**。迁移随后把旧表 `DROP` 掉，这些子表的外键就悬空了。此后任何写 `products` 的操作都会触发外键检查失败，直接 500。

受影响的子表包括颜色、尺码、规格、养护信息、发货字段等。

> 还有一个容易忽略的点：事务内执行 `PRAGMA foreign_keys=OFF` 是**无效的**（no-op），所以外键开关与表重建必须放在事务外。

### 修复

当前版本的 `bin/migrate.php` 已内置两层修复：

1. **预防**：重建前先 `PRAGMA legacy_alter_table=ON`，RENAME 不再改写子表外键。
2. **自愈**：新增 `repairChildTablesAfterRename()`，扫描 `sqlite_master` 中仍引用 `__products_old` / `__deliveries_old` 等旧表名的子表，按原 DDL 替换回正确表名重建、搬回数据、重建索引；**在"无需迁移"的提前退出路径也会执行一次**，所以已经损坏的库只要跑一次迁移就能修好。

另外迁移还处理了：

- `products.type` 与 `order_deliveries.kind` 的 `CHECK` 约束放开为允许 `yulan`（旧库只允许 `virtual/physical`，写欲蓝发货内容会 500）
- 补上商品级服务器配置所需的 5 个新列
- 历史数据 `created_at` / `updated_at` 为 `NULL` 时用 `COALESCE` 兜底
- `categories` 表缺失时先补建

**处理**：直接跑 `php bin/migrate.php`。实测损坏库修复后数据完整（颜色 13 / 尺码 12 / 规格 36 / 养护 18 / 发货字段 1 条全部保留）。如果仍失败，检查 `data/` 目录及其下 `.sqlite` 文件的属主与写权限。

## 接口返回一段 `<?php` 源码

**这是高危故障，等于源码与配置泄露，必须立刻修。**

**原因**：Nginx 把 `/api/index.php` 当成静态文件直接返回了。最常见的写法是把 `/api/` 配成 `location ^~ /api/` 并带 `try_files`——`^~` 前缀优先级高于 `\.php` 正则，请求根本没进 PHP-FPM。

| 部署方式 | 正确做法 |
| --- | --- |
| 宝塔「伪静态」框 | 用普通前缀 `location /api/`，**不要加 `^~`**；PHP 解析交给宝塔自带的 `\.php` 规则 |
| 手写完整 server 配置 | 让 `/api/` 直接 `fastcgi_pass`，不要用 `try_files` 兜底 |

见 [Nginx 部署](/deploy/nginx) 与仓库 `deploy/nginx-root.conf` 里的注释。修完后用 `curl -i https://域名/api/health` 确认返回的是 JSON 而不是 PHP 文本。

## 后台打开空白、JS/CSS 全部 404

访问的是 `/admin` 而不是 `/admin/`。缺结尾斜杠时，浏览器把页面里的相对资源算成 `/assets/...`，实际应为 `/admin/assets/...`，于是全部 404。

伪静态与 `.htaccess` 里都带了 301 补斜杠规则（`rewrite ^/(.*)$ /$1/ permanent`），别删。同理适用于 `/console`、`/install`。见 [后台总览](/admin)。

## 点下单 / 调接口 404

按顺序查：

1. 伪静态是否**点了保存**（宝塔改完要保存，配置没落盘等于没改）
2. `/api/` 规则是否存在且指向 `/api/index.php`
3. 子目录部署时接口基址是否丢了前缀（见仓库 `deploy/nginx-subdir.conf`）
4. `curl -i https://域名/api/health` 看是否 200 + JSON

## Apache 下接口全 404，静态首页却正常

`.htaccess` 没生效，依次检查：

1. `public/.htaccess` 这个**隐藏文件**是否真的上传到服务器了（很多 FTP 工具默认不传点开头文件）
2. 虚拟主机的 `AllowOverride All`（默认是 `None`，规则会被忽略）
3. `mod_rewrite` 是否启用：`apache2ctl -M | grep rewrite` 或宝塔「配置修改」里确认
4. 确认运行目录仍指向 `public/`

见 [Apache 部署](/deploy/apache)。

## 升级后页面没变化

- 浏览器强缓存：`Ctrl+F5`，或开无痕窗口验证
- 前端资源用 `?v=20261116e` 做缓存破坏，覆盖文件时确认 `public/admin/index.html` 等引用也一起更新了
- 服务端 PHP 若开了 OPcache，重启 PHP-FPM 或等缓存过期
- 最终判据：`curl https://域名/api/health` 返回的 `build` 是否为 `20261116e`

`public/router.php` 对首页 HTML 与接口统一发 `no-store`，正常情况下改完就能拿到新版；静态资源才走长缓存。

## 运行目录写错

把运行目录设成项目根目录，`src/`、`config/`、`data/` 会变成可通过 URL 直接下载的文件——数据库、密钥、源码全泄露。**必须是 `public/`**。见 [部署前准备](/deploy/prepare)。

自查方法：访问 `https://域名/config/config.php` 与 `https://域名/data/shop.sqlite`，应当 404，不能下载。

## 权限与安装锁

| 现象 | 检查 |
| --- | --- |
| 迁移脚本报只读 / 无法写库 | `data/` 目录属主是否为 PHP-FPM 运行用户，是否可写 |
| 安装向导打不开、提示已安装 | `config/installed.lock` 是否存在；全新安装需删除它（同时确认数据库为空） |
| 升级后 `/install` 又冒出安装向导 / 全站 503「站点尚未安装」 | 升级时误删了整个 `config/`，`config/installed.lock` 安装锁丢失。从备份恢复 `config/` 目录，**别在向导里重装**（会覆盖店主账号），见 [安装与升级](/deploy/install) |
| 重装后接口全被拒 | 未安装状态下，路由只放行 `/api/install`、`/api/health`、`/api/site`、`/api/install/status` |
| 配置改了不生效 | `config/.env` 是否被覆盖 / 环境变量未生效；配置集中在 `config/config.php`，默认从环境变量读取 |

> 安全提醒：`config/.env`、`config/installed.lock`、`data/shop.sqlite`、`data/*.bak-*`、APP 日志都**不能进 Git 仓库、也不能发给客户**。仓库的 `.gitignore` 已把这些挡在外面，交付前再核一遍。

## 本地 / 命令行调试的两个坑

- **CSRF**：所有 `POST/PUT/DELETE` 要求带同源 `Origin`（或 `Referer`）。用 `curl` 自测接口时记得 `-H "Origin: https://你的域名"`，否则一律 403「请求来源不合法」。见 [后台与业务故障](/troubleshoot/backend)。
- **PHP 内置服务器测试模式**：`SHOP_DB_PATH=/tmp/test.sqlite php -d disable_functions=putenv -S 127.0.0.1:8100 -t public public/router.php`。用 `-t public` 才能复现真实的运行目录，见 [PHP 内置服务器](/deploy/builtin)。

## 还是 500：去哪看真实错误

前端只显示「服务暂时不可用」，真实原因在：

1. 浏览器 `F12` → Network → 点失败请求 → Response，通常有 JSON 错误码
2. 宝塔「网站日志」/ PHP 错误日志（`display_errors` 生产环境应关闭）
3. `/api/health` 能否正常返回——能返回说明 PHP 与数据库基本正常，问题在具体接口逻辑

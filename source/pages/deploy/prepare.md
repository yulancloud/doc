---
title: 部署前准备
---

# 部署前准备

配置 Web 服务器之前，先把环境、权限、目录这三件事核对完，能避开绝大多数「装完打不开」的问题。

## 一、环境要求

| 项目 | 要求 | 怎么查 |
| --- | --- | --- |
| PHP | 8.1 及以上（8.3 已验证） | `php -v` 或宝塔「软件商店 → PHP」 |
| 扩展 | `pdo_sqlite` 必须开启 | `php -m \| grep sqlite` |
| Web 服务器 | Nginx / Apache 均可 | 见[部署总览](/deploy)选型 |
| 数据库 | 无需单独安装，SQLite 随 PHP 走 | — |
| 磁盘 | `data/`、`config/` 可写 | `ls -ld data config` |

::: warning
PHP 版本过低时，系统不会抛一段裸的 Parse error，而是由 `public/preflight.php` 输出可读的「版本过低」页面。看到这个页面就直接升级 PHP，不用去猜 500 是什么。
:::

## 二、目录与权限

解压后的目录结构（只列出与部署相关的）：

```text
shop/
├── public/          ← ★ 网站运行目录，必须指向这里
│   ├── .htaccess    ← Apache 专用重写规则（自带，无需手填）
│   ├── router.php   ← PHP 内置服务器入口
│   ├── api/         ← API 统一入口
│   ├── admin/       ← 后台页面
│   ├── console/     ← 用户中心
│   └── index.html   ← 商城首页
├── src/             ← 后端代码（禁止 Web 直接访问）
├── config/          ← 运行配置（安装向导生成）
├── data/            ← SQLite 数据库（运行生成）
├── database/        ← Schema
├── bin/migrate.php  ← 迁移 / 修复工具
└── deploy/          ← Nginx 完整配置样例
```

权限建议：

```bash
cd /www/wwwroot/你的域名
chown -R www:www data config   # 按宝塔实际运行用户调整
chmod -R 755 public
chmod -R 700 data config       # 确认可写即可
```

::: danger 运行目录不能写错
把运行目录设成项目根目录，`src/`、`config/`、`data/` 就会变成可通过 URL 直接下载的静态文件——数据库、密钥、源码全泄露。必须是 `public/`。
:::

## 三、域名与 HTTPS

- 先绑定域名并解析生效，再跑安装向导；向导会把站点地址写进配置。
- 建议装好证书后启用 HTTPS，并在 `config/.env` 里设置：

```ini
SHOP_BASE_URL=https://你的域名
SHOP_COOKIE_SECURE=true
```

- 若暂时用 HTTP 调试，保持 `SHOP_COOKIE_SECURE=false`（默认）。

## 四、部署前检查清单

| 检查项 | 期望结果 |
| --- | --- |
| 运行目录指向 `public/` | 面板里显示 `/www/wwwroot/域名/public` |
| `php -m` 含 `pdo_sqlite` | 有输出 |
| `data/` 可写 | 安装向导环境检测全绿 |
| 访问 `/api/health` | 返回 JSON（未安装时可能报错，属正常） |
| 访问 `/install` | 能看到安装向导页面 |
| 站点没有暴露 `/data/shop.sqlite` | 返回 404 |

## 五、备份提醒

升级前先备份这两个路径，出问题可秒回滚：

```bash
cp data/shop.sqlite data/shop.sqlite.bak-$(date +%Y%m%d)
cp config/.env config/.env.bak-$(date +%Y%m%d) 2>/dev/null || true
```

## 下一步

按你的 Web 服务器继续：

- [Nginx 部署（需伪静态）](/deploy/nginx)
- [Apache 部署（免伪静态）](/deploy/apache)
- [PHP 内置服务器（本地测试）](/deploy/builtin)
- [安装与升级](/deploy/install)

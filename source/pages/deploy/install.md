---
title: 安装与升级
---

# 安装与升级

Web 服务器配置完成后，剩下的步骤与 Nginx / Apache 无关，两边完全一样。

## 一、首次安装

1. 上传代码解压，运行目录指向 `public/`，配好重写规则（见[部署总览](/deploy)）。
2. 浏览器访问 **`/install`**（或 `/install/`），打开安装向导。
3. 向导会先做环境检测：PHP 版本、`pdo_sqlite`、目录可写。全绿才能继续。
4. 填写安装信息：

| 字段 | 说明 |
| --- | --- |
| 站点地址 | 形如 `https://你的域名`，会写入配置 |
| 商户 ID（PID） | 易支付后台的商户 PID，**可留空**，装完到后台「易支付配置」再填 |
| 商户密钥（KEY） | 同上，可留空 |
| 支付网关 | 必须填到 `/submit.php`，可留空后补 |
| 店主账号 | 后台登录用户名 |
| 店主密码 | **至少 10 位**，安装后建议立刻改一次 |

5. 提交后系统建库、写 `config/.env`、生成 `config/installed.lock`。**安装锁一旦存在，`POST /install` 直接 403**，别人无法重新初始化。

::: warning
安装向导只在全新环境出现。如果 `config/installed.lock` 已存在但页面仍提示未安装，说明数据库连接不上或 `config/.env` 丢失，不要删锁重来，先检查 `data/` 目录。
:::

## 二、首次安装 / 每次升级必跑迁移

```bash
cd /www/wwwroot/你的域名
php bin/migrate.php
```

这个脚本是**幂等**的，可重复执行，负责：

- 补齐新增列（含商品级服务器配置 5 列）
- 修正 `order_deliveries.kind` 的 CHECK 约束，加入 `yulan`
- 修复旧库在 `ALTER TABLE RENAME` 时被子表外键指向 `__products_old` 的损坏（自动重建子表并搬回数据）
- 兜底 `created_at` / `updated_at` 的 NULL 值

> 不跑这一步，后台「设置账号限购」「保存商品」等会报 **「加载失败，服务暂时不可用」** 或 **「服务暂时不可用，请稍候再试」**——因为新列不存在，接口返回 500。

## 三、验证

```bash
curl -i https://你的域名/api/health
```

期望返回 JSON，其中 `build` 为当前版本号（如 `20261114i`）。

然后浏览器 **Ctrl+F5** 强刷后台，确认菜单、商品类型下拉框等新界面生效。系统对 JS / CSS / HTML 用协商缓存（`no-cache` + `Last-Modified`），正常改动会自动拿新版本，但升级后强刷一次最稳。

## 四、升级步骤（老版本 → 新版本）

```text
① 备份 data/shop.sqlite 与 config/.env
      ↓
② 上传新包覆盖（不要删 data/ 与 config/）
      ↓
③ php bin/migrate.php      ← 关键，自动修复旧库
      ↓
④ Ctrl+F5 清缓存
      ↓
⑤ curl /api/health 确认 build 版本号
```

::: warning
升级包刻意排除了 `data/shop.sqlite*`、`config/.env`、`config/installed.lock`、日志与备份文件。直接整目录覆盖上传即可，但**千万别先把 `data/` 清空**，否则订单和用户数据全没了。
:::

## 五、目录结构速查

| 路径 | 说明 | 是否进版本库 |
| --- | --- | --- |
| `public/` | 网站运行目录 | ✅ |
| `src/` | 后端业务逻辑 | ✅ |
| `database/` | Schema 与迁移定义 | ✅ |
| `bin/migrate.php` | 迁移 / 修复工具 | ✅ |
| `deploy/` | Nginx 配置样例 | ✅ |
| `config/` | 运行配置（向导生成 `.env`、安装锁） | ❌ |
| `data/` | SQLite 数据库、备份 | ❌ |

## 六、装完做什么

- 登录后台 `/admin/`，见 [后台总览](/admin)
- 配置支付，见 [支付配置](/admin/payment)
- 添加商品，见 [商品管理](/admin/products)
- 用欲蓝财务魔方，见 [欲蓝财务魔方](/yulan) 与 [Windows APP](/windows-app)

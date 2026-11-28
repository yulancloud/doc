---
title: 安装与升级
---

# 安装与升级

Web 服务器配置完成后，剩下的步骤与 Nginx / Apache 无关，两边完全一样。

## 一、首次安装

1. 上传代码解压，运行目录指向 `public/`，配好重写规则（见[部署总览](/deploy)）。
2. 浏览器访问 `/install`（或 `/install/`），打开安装向导。
3. 向导会先做环境检测：PHP 版本、`pdo_sqlite`、目录可写。全绿才能继续。
4. 填写安装信息：

| 字段 | 说明 |
| --- | --- |
| 站点地址 | 形如 `https://你的域名`，会写入配置 |
| 商户 ID（PID） | 易支付后台的商户 PID，可留空，装完到后台「易支付配置」再填 |
| 商户密钥（KEY） | 同上，可留空 |
| 支付网关 | 必须填到 `/submit.php`，可留空后补 |
| 店主账号 | 后台登录用户名 |
| 店主密码 | 至少 10 位，安装后建议立刻改一次 |

5. 提交后系统建库、写 `config/.env`、生成 `config/installed.lock`。安装锁一旦存在，`POST /install` 直接 403，别人无法重新初始化。

::: warning
安装向导只在全新环境出现。如果 `config/installed.lock` 已存在但页面仍提示未安装，说明数据库连接不上或 `config/.env` 丢失，不要删锁重来，先检查 `data/` 目录。
:::

## 二、首次安装 / 每次升级必跑迁移

```bash
cd /www/wwwroot/你的域名
php bin/migrate.php
```

这个脚本是幂等的，可重复执行，负责：

- 补齐新增列（含商品级服务器配置 5 列、v1.1 的商品缺点 `products.flaws`）
- 修正 `order_deliveries.kind` 的 CHECK 约束，加入 `yulan`
- 修复旧库在 `ALTER TABLE RENAME` 时被子表外键指向 `__products_old` 的损坏（自动重建子表并搬回数据）
- 兜底 `created_at` / `updated_at` 的 NULL 值

> 不跑这一步，后台「设置账号限购」「保存商品」等会报「加载失败，服务暂时不可用」或「服务暂时不可用，请稍候再试」——因为新列不存在，接口返回 500。

## 三、验证

```bash
curl -i https://你的域名/api/health
```

期望返回 JSON，其中 `build` 为当前版本号（v1.1.0 为 `20261116e`）。

然后浏览器 Ctrl+F5 强刷后台与前台，确认菜单、商品类型下拉框、商品缺点输入框、分类标签与首页文案等新界面生效。系统对 JS / CSS / HTML 用协商缓存（`no-cache` + `Last-Modified`），正常改动会自动拿新版本，但升级后强刷一次最稳。

## 四、升级步骤（老版本 → 新版本）

```text
① 备份整个 data/ 与 config/ 目录（含 .env 与 installed.lock）
      ↓
② 上传新包覆盖程序文件（data/ 与整个 config/ 原样保留，不要删目录）
      ↓
③ php bin/migrate.php      ← 关键，自动修复旧库
      ↓
④ Ctrl+F5 清缓存
      ↓
⑤ curl /api/health 确认 build 版本号
```

::: warning
升级时 `config/` 文件夹整个都不要删，否则安装程序会重新出现。

`config/` 里不只有 `config/.env`，还有 `config/installed.lock`（安装锁）与 `config/.install_token`。安装锁是「站点是否已安装」的唯一判据：只要它不在，`Installer::isInstalled()` 就判定为未安装，于是

- `/install` 安装向导重新出现 —— 这就是「装好的站升级完又冒出安装程序」的原因；
- 全站 API 除 `/api/install`、`/api/health`、`/api/site` 外一律返回 503「站点尚未安装，请先访问 /install 完成初始化」，前台与后台都打不开；
- `config/.env` 一起丢失，站点地址、易支付 PID / KEY 等配置全部回退到默认值。

这时千万别在向导里重新填一遍：数据库还在、管理员账号还在，重新提交安装会往已有库里写，容易把店主账号覆盖掉。正确做法是从备份把整个 `config/` 目录恢复回来（至少恢复 `.env` 与 `installed.lock`），再 `Ctrl+F5` 验证。

升级包本身已排除这些文件，所以只要别手动删目录、别用「先清空整个目录再上传」的方式覆盖，就不会踩到。各版本的升级要点见 [版本更新](/changelog)。
:::

::: warning
同理千万别先把 `data/` 清空，否则订单、用户、余额数据全没了。升级包刻意排除了 `data/shop.sqlite*`、`config/.env`、`config/installed.lock`、日志与备份文件，直接整目录覆盖上传即可。
:::

## 五、目录结构速查

| 路径 | 说明 | 是否进版本库 |
| --- | --- | --- |
| `public/` | 网站运行目录 | 是 |
| `src/` | 后端业务逻辑 | 是 |
| `database/` | Schema 与迁移定义 | 是 |
| `bin/migrate.php` | 迁移 / 修复工具 | 是 |
| `deploy/` | Nginx 配置样例 | 是 |
| `config/` | 运行配置（向导生成 `.env`、安装锁 `installed.lock`） | 否，升级时必须整个保留 |
| `data/` | SQLite 数据库、备份 | 否 |

## 六、装完做什么

- 登录后台 `/admin/`，见 [后台总览](/admin)
- 配置支付，见 [支付配置](/admin/payment)
- 添加商品，见 [商品管理](/admin/products)
- 对接上游财务系统，见 [魔方财务（对接上游）](/yulan) 与 [魔方财务使用教程](/yulan-guide)
- 卖 KVM 云主机，见 [魔方云](/cloud)；客服工单见 [工单系统](/tickets)

## 相关排查

各版本的变化与升级要点见 [版本更新](/changelog)。

迁移漏跑导致「加载失败」、旧库外键损坏导致保存 500 的处理，见 [部署与迁移故障](/troubleshoot/deploy)；完整验收项见 [上线自检清单](/deploy/checklist)。

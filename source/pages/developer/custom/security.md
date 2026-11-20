---
title: 09 安全规范与发布检查
---

# 09 安全规范与发布检查

最后一篇：把前面写的功能**安全地交出去**。这是一份可以逐项打勾的清单。

← [08 支付 / 发货扩展](/developer/custom/payment) ｜ [回到学习路线](/developer/custom) →

## 一、系统已有的安全基线（别破坏）

| 机制 | 实现 | 你加功能时 |
| --- | --- | --- |
| SQL 注入 | `Db::conn()` 真预处理（`EMULATE_PREPARES=false`） | 一律 `?` / `:name` 占位符，绝不拼 SQL |
| CSRF | `AdminAuth::require()` → `guardCsrf()` 校验 `Origin`/`Referer` host+port | 后台写接口必须调 `require()`；公开写接口用限流 + 严格校验 |
| 存储型 XSS | 前台 `textContent` / `U.esc()`，后台 `U.esc()` | 拼 `innerHTML` 的所有外部文本都要转义 |
| 密钥 | 商户密钥、服务器口令**只写不读**，不进 `publicPayload()`、不进日志 | 新密钥类字段照此办理 |
| 限流 | `RateLimiter::guard()` 按 IP 哈希分桶，规则在 `config.php` | 每个公开写接口都要挂一条规则 |
| 安装锁 | `config/installed.lock`，已装后 `/api/install` 403 | **升级时整个 `config/` 不能删** |
| 敏感文件 | `router.php` 对 `data/` `config/` `src/` `.env` `*.sqlite` 等一律 404 | 新增敏感文件放到 Web 根之外 |
| 响应纯净 | 四道闸保证 `/api/*` 只吐 JSON；`Response` 统一发安全头 | 别 `echo`，一律走 `Response::*` |
| Host 伪造 | `SHOP_BASE_URL` 显式配置；`SHOP_TRUSTED_ORIGINS` 处理反代 | 生产环境配好这两项 |
| 审计 | `Audit::log()` 写 `admin_audit`，不含密码 / 完整手机号 | 后台写操作都要记一条 |

## 二、新增功能自检表

逐条打勾，别凭「看起来正常」就上线：

| # | 检查项 | 判据 |
| --- | --- | --- |
| 1 | 所有 SQL 用占位符 | `grep -rn 'SELECT.*\\$\\|INSERT.*\\$' src/` 无字符串拼接 |
| 2 | 所有输入过校验 | `Validator::text/int/...` 或显式白名单；长度有上限 |
| 3 | 权限在后端 | 后台接口有 `AdminAuth::require()`；越权直接调接口返回 401/403 |
| 4 | 公开写有限流 | `RateLimiter::guard('你的动作')`，`config.php` 有对应规则 |
| 5 | 输出转义 | 接口文本用 `textContent`；拼 HTML 用 `U.esc()` |
| 6 | 响应格式 | 只走 `Response::ok/fail/json/plain`，无裸 `echo` |
| 7 | 路由兜底 | 新路径已加进 `api/index.php` 末尾 `$known`，方法错返回 405 而不是 404 |
| 8 | 新装 + 升级 | `schema.sql` 与 `migrate.php` 都有；`--dry-run` 清单正确；旧库跑完迁移无报错 |
| 9 | 幂等 | 支付 / 回调 / 重复提交不会产生两条数据 |
| 10 | 版本号 | 改了 JS/CSS/HTML 已 bump 全站 `?v=` |
| 11 | 密钥不落地 | `grep -rn 'KEY\\|password' public/` 找不到真实凭据；日志无明文口令 |
| 12 | 回归测试 | `tests/e2e.sh` 等通过 |

## 三、发布流程

```text
① 备份 data/shop.sqlite 与整个 config/（含 .env、installed.lock）
      ↓
② 上传新版文件覆盖 —— 只覆盖程序文件，data/ 与整个 config/ 原样保留
      ↓
③ php bin/migrate.php --dry-run  →  php bin/migrate.php
      ↓
④ reload PHP-FPM（清 OPcache，若改了 PHP）
      ↓
⑤ Ctrl+F5 强刷前台与后台（或开无痕窗口），清 CDN 缓存
      ↓
⑥ curl /api/health 确认 build 版本号
      ↓
⑦ 走一遍验收清单 + tests/e2e.sh
      ↓
⑧ 记录本次定制补丁，供下次升级后重新套用
```

::: danger 升级时 `config/` 整个目录都不能删
里面有 `config/installed.lock` 安装锁。删了会被判定「未安装」：`/install` 安装向导重新出现、全站 API 返回 503「站点尚未安装」，`config/.env` 的支付参数也一起丢失。恢复办法是从备份还原整个 `config/`，**别在向导里重装**（会覆盖店主账号）。详见 [安装与升级](/deploy/install) 第四节。
:::

从 Release 整目录覆盖时，`style.css`、`SettingsService.php`、`config.php`、各 HTML **都会被还原成官方版本**。把自己的定制整理成一份补丁或单独记录，每次升级后重新套用，见 [版本更新](/changelog) 与 [主题定制设置](/developer/theme)。

## 四、测试脚本

| 脚本 | 覆盖 |
| --- | --- |
| `tests/e2e.sh` | 基础下单 / 查询 / 后台流程 |
| `tests/e2e_payment.sh` | 支付、回调、幂等、金额校验 |
| `tests/e2e_yulan.sh` | 上游对接 / 云主机开通 / 工单归属隔离 / 旧库迁移 / CSRF（历史脚本名沿用） |
| `tests/e2e_order.py`、`browser_check.py`、`site_check.sh` | 订单与页面级检查 |

自测接口时记住三条：`Content-Type: application/json`、写操作带 `Origin`、后台接口带会话 Cookie。见 [01 入门](/developer/custom/start)。

## 五、按错误码定位

| 现象 / code | 先看哪一篇 |
| --- | --- |
| `not_installed` 503 | 安装锁丢了 → [安装与升级](/deploy/install) |
| `csrf_failed` 403 | [03 基础 API](/developer/custom/api) 的权限模型 |
| `rate_limited` 429 | 限流规则 → [03 基础 API](/developer/custom/api) |
| `method_not_allowed` 405 / `not_found` 404 | 路由与 `$known` → [03 基础 API](/developer/custom/api) |
| `server_error` 500 / 「服务暂时不可用」 | 看 Network 响应体与 PHP `error_log`；多半是漏跑迁移 → [04 数据库与迁移](/developer/custom/database) |
| 后台改了前台没变 | 缓存 / 版本号 / `data-api-source` → [07 前台数据流](/developer/custom/frontend) |
| 支付回调不结束、网关重试 | `Response::plain()` 与幂等 → [08 支付扩展](/developer/custom/payment) |

更多按症状排查见 [故障排查总览](/troubleshoot) 与 [常见问题](/faq)。

## 六、学完之后

| 还想做什么 | 去哪 |
| --- | --- |
| 回顾整套教程顺序 | [00 学习路线](/developer/custom) |
| 换配色 / 亮暗主题 | [主题定制设置](/developer/theme) |
| 改文案默认值 / 业务参数 | [PHP 配置与文案默认值](/developer/config) |
| 部署、伪静态、升级 | [部署指南](/deploy) |
| 交付前逐项打勾 | [上线自检清单](/deploy/checklist) |

---

← [08 支付 / 发货扩展](/developer/custom/payment) ｜ **学完 →** [回到学习路线](/developer/custom) ／ [开发者总览](/developer)

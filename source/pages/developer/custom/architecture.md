---
title: 02 框架结构与请求生命周期
---

# 02 框架结构与请求生命周期

读懂这一页，后面加接口、建表、做页面都不会找错文件。

← [01 入门与本地环境](/developer/custom/start) ｜ [03 基础 API](/developer/custom/api) →

## 一、两个入口，别搞混

| 文件 | 职责 | 由谁调用 |
| --- | --- | --- |
| `public/router.php` | 静态资源、敏感文件 404、虚拟路由（`/install` `/admin` `/console`）、把 `/api/*` 转给 API 入口 | PHP 内置服务器；Nginx / Apache 下由伪静态规则承担对应职责 |
| `public/api/index.php` | **所有 `/api/*` 的业务路由**（单文件约 1090 行） | `router.php` 或 Nginx 伪静态 |

`public/preflight.php` 在两个入口最前面执行，负责 PHP ≥ 8.1 与扩展检查；它刻意保持 PHP 5.6 也能解析的语法，这样低版本服务器能先看到一张可读的说明页，而不是裸 Parse error。

## 二、一次请求的生命周期

以「后台保存商品」`PUT /api/admin/products/p001` 为例：

```text
浏览器
  ↓ ① 伪静态 / router.php  →  public/api/index.php
  ↓ ② preflight.php       版本与扩展守卫
  ↓ ③ 引导层              关 display_errors、ob_start()、注册 shutdown 守卫、
                          set_error_handler / set_exception_handler、
                          require 全部 src/*.php、载入 config/config.php
  ↓ ④ Path::normalizeApi() 把 /shop/api/... 归一成 /api/...
  ↓ ⑤ 安装门禁            Installer::isInstalled()：未装 → 503；已装 → /api/install 403
  ↓ ⑥ switch (true)       逐条匹配 case（顺序即优先级）
  ↓ ⑦ 权限层              AdminAuth::require()（登录 + CSRF）、必要时 requireOwner()
  ↓ ⑧ 参数层              readJsonBody() + Validator::*
  ↓ ⑨ 服务层              AdminService::saveProduct() → Db::tx() → PDO 预处理写库
  ↓ ⑩ 审计                Audit::log() → admin_audit
  ↓ ⑪ Response::ok()      清缓冲 → 安全头 → {ok:true,data:...} → exit
```

四个必须记住的细节：

- ③ 有**四道闸**（关显示 / 输出缓冲 / 错误转 JSON / 输出前清缓冲），保证 `/api/*` 永远只吐纯 JSON。PHP warning 只进日志；致命错误会被转成结构化的 `server_error`，前端不会 `JSON.parse` 失败。
- ⑤ 未安装时只有 `/api/install`、`/api/health`、`/api/site`、`/api/install/status` 四个白名单放行，其余一律 503「站点尚未安装」。
- ⑦ `AdminAuth::require()` = 取登录态 + `guardCsrf()`；后者只对非 `GET/HEAD/OPTIONS` 生效，比较 `Origin` / `Referer` 的 host + port，并兼容 `X-Forwarded-Host` 与 `SHOP_TRUSTED_ORIGINS`。
- ⑪ `Response::ok()` / `fail()` 内部会 `exit`，所以 case 里**不需要 return 或 break**。

## 三、分层与目录地图

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 入口 | `public/router.php`、`public/api/index.php`、`public/preflight.php` | 分发与版本守卫 |
| 基础设施 | `src/Db.php`、`Response.php`、`Validator.php`、`RateLimiter.php`、`Path.php`、`Env.php`、`Audit.php` | 被所有业务复用，**优先复用，别自己造** |
| 服务层 | `src/*Service.php`、`EPay.php`、`YulanConnector.php`、`YulanProvision.php`、`AdminAuth.php`、`UserAuth.php`、`Installer.php` | 业务规则 |
| 仓储 | `src/ProductRepo.php` | 前台商品读取与数据整形 |
| 数据 | `database/schema.sql`、`schema_v5.sql`、`bin/migrate.php`、`bin/init_db.php` | 表结构与升级 |
| 配置 | `config/config.php`、`config/.env`、`src/SettingsService.php` | 默认值 / 环境变量 / 数据库设置 |
| 前台 | `public/*.html`、`public/assets/{api,app,data}.js`、`assets/style.css` | 商城页面 |
| 后台 | `public/admin/index.html`、`admin/assets/{api,views,views-v5,app}.js` | 管理后台 |
| 用户中心 | `public/console/` | 前台注册 / 登录 / 订单 / 余额 |
| 部署 | `deploy/nginx-root.conf`、`deploy/nginx-subdir.conf`、`public/.htaccess` | 伪静态样例 |
| 测试 | `tests/e2e.sh`、`e2e_yulan.sh`、`e2e_payment.sh`、`browser_check.py` | 回归 |

## 四、核心基础件速查

| 类 | 常用方法 | 说明 |
| --- | --- | --- |
| `Db` | `conn()`、`tx(callable)` | PDO + SQLite；`ERRMODE_EXCEPTION`、`EMULATE_PREPARES=false`、`foreign_keys=ON`、WAL；`tx()` 自动回滚，**已在外层事务中时直接复用**（SQLite 不支持嵌套） |
| `Response` | `ok()`、`fail()`、`json()`、`plain()`、`headers()` | 统一 JSON + 安全响应头；`plain()` 专供支付回调吐纯文本 |
| `Validator` | `text()`、`int()`、`productId()`、`categoryId()`、`keyword()`、`sort()`、`personName()`、`phone()`、`address()`、`orderNo()`、`idempotencyKey()` | 校验失败直接 `Response::fail()` 终止 |
| `RateLimiter` | `guard($action)`、`hit()`、`clientIp()`、`ipHash()` | 按 IP 的 SHA-256 分桶，规则在 `config.php` 的 `rate_limit`；只信任 `REMOTE_ADDR` |
| `AdminAuth` | `require()`、`requireOwner()`、`user()`、`guardCsrf()`、`login()` | 后台登录态 + CSRF |
| `UserAuth` | `require()`、`register()`、`login()`、`publicUser()` | 前台用户，独立表 / 独立 Cookie |
| `Audit` | `log()`、`page()` | 写 `admin_audit`，不含密码与完整手机号 |
| `Path` | `normalizeApi()`、`current()`、`basePrefix()` | 子目录部署路径归一化 |
| `SettingsService` | `publicPayload()`、`adminPayload()`、`save()`、`reset()`、`shippingRule()` | key-value 设置，白名单 + 长度上限 |
| `Installer` | `isInstalled()`、`dbExists()`、`requirements()` | 安装锁在 `config/installed.lock` |
| `Env` | `load()`、`get()` | 读取 `config/.env` |

## 五、18 张表按用途分组

| 组 | 表 |
| --- | --- |
| 商品与内容 | `products`、`categories`、`product_colors`、`product_sizes`、`product_specs`、`product_care`、`reviews`、`site_blocks`、`site_settings` |
| 订单 | `orders`、`order_items`、`order_deliveries` |
| 支付与余额 | `payments`、`recharge_orders`、`balance_ledger` |
| 用户 | `users`、`user_sessions` |
| 后台 | `admin_users`、`admin_sessions`、`admin_audit`、`rate_limits` |
| 其它 | `schema_meta`、`yulan_accounts` |

`bin/init_db.php` 会依次执行 `database/schema.sql` 与 `schema_v5.sql` 建全新库；`bin/migrate.php` 负责把**旧库**补到当前结构。加表 / 加列时两边都要写，见 [04 数据库与迁移](/developer/custom/database)。

::: warning 金额一律用「分」的整数
`price_cents`、`paid_cents`、运费、余额都是整数分，只有后台「运费设置」为了店主直观用「元」填写、服务端换算。新增金额字段时别用浮点，避免精度误差。
:::

## 六、前后端数据流

```text
后台「站点设置」→ site_settings 表 → /api/site 的 publicPayload()
                                  → 前台 api.js 的 applySite()
                                  → 写入 [data-site] / [data-site-stream] 元素

后台「分类管理」→ categories 表 → /api/catalog 的 categories
                                → applyNavCategories() → [data-cat-slot] / [data-cat-label]

商品 / 订单     → /api/catalog、/api/products/{id}、/api/orders
                → window.SHOP（覆盖 data.js 的静态兜底）
```

两个 API 封装：

- 前台 `public/assets/api.js` → `window.ShopAPI`（`get` / `post` 封装、`catalog`、`product`、`createOrder`、`quote` …）
- 后台 `public/admin/assets/api.js` → `window.AdminAPI` 与 `window.AdminU`（工具与转义）

**加载顺序不能乱**：前台 `data.js → api.js → 页面脚本`；后台 `api.js → views.js → views-v5.js → app.js`。页面脚本通过 `window.shopBoot(fn)` 注册，等数据就绪才执行。

## 七、配置优先级（从高到低）

```text
后台「站点设置」写进数据库（只覆盖文案，留空才回退）
   ↓ 真实环境变量
   ↓ config/.env
   ↓ config/config.php 默认值 / SettingsService::DEFAULTS
```

详见 [PHP 配置与文案默认值](/developer/config)。

## 八、扩展点速查

| 想加什么 | 改哪里 |
| --- | --- |
| 一个接口 | `public/api/index.php` 的 `switch(true)` + 末尾 `$known` 数组 |
| 一张表 / 一列 | `database/schema.sql` + `bin/migrate.php` |
| 一段业务逻辑 | 新建 `src/XxxService.php`，在 `api/index.php` 顶部 `require_once` |
| 一条限流规则 | `config/config.php` 的 `rate_limit` |
| 一个后台菜单页 | `public/admin/index.html` + `admin/assets/views.js` 的 `AdminViews` |
| 一个后台可配参数 | `SettingsService::DEFAULTS` + `publicPayload()` + 前后台表单 |
| 一个前台页面 | `public/*.html` + `public/assets/*.js`，并 bump `?v=` |
| 一种发货方式 | `products.type` / `order_deliveries.kind` 的 CHECK + `DeliveryService` |
| 一个支付渠道 | `EPay::isChannel()` 白名单 + `config.php` 的 `payment.channels` |

## 九、路径归一化：为什么「页面正常、一点下单 404」

站点可能部署在根目录（`/api/orders`）也可能在子目录（`/shop/api/orders`）。两侧配合解决：

- 前端 `api.js` 的 `detectApiBase()` 从 `location.pathname` 推断基址（也可由 `window.SHOP_API_BASE` 或 `<meta name="shop-api-base">` 显式指定）
- 后端 `Path::normalizeApi()` 把 `/shop/api/orders` 归一成 `/api/orders`

写死 `/api` 或漏配伪静态，页面会**静默回退到 `data.js` 静态数据**看起来正常，只有点下单才 404。排查先看 `<html>` 的 `data-api-source` 属性和 Network 里请求的实际 URL。

---

← [01 入门与本地环境](/developer/custom/start) ｜ **下一步 →** [03 基础 API：路由、响应与鉴权](/developer/custom/api)

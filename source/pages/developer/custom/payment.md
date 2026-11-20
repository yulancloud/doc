---
title: 08 支付 / 发货 / 商品类型扩展
---

# 08 支付 / 发货 / 商品类型扩展

这一篇讲**最不能改错**的部分：钱和发货。先看懂链路，再谈扩展。

← [07 前台数据流](/developer/custom/frontend) ｜ [09 安全规范与发布检查](/developer/custom/security) →

## 一、完整链路

```text
POST /api/orders                       创建订单（pending，扣库存）
   ↓
POST /api/orders/{no}/pay              PaymentService::start() → 返回网关地址 + 已签名表单
   或 /console/orders/{no}/pay         已登录用户
   或 /console/orders/{no}/pay-balance 余额支付（PayWithBalance：扣余额+流水+自动发货）
   或 /orders/{no}/free-pay            ¥0 免费单直接完成
   ↓
前端把表单 POST 到支付网关（**前端绝不自己拼签名**）
   ↓
网关异步 POST /api/pay/notify          PaymentService::handleNotify()
   ├─ EPay::verifyNotify() 验签
   ├─ 金额、订单状态、渠道校验
   ├─ 幂等记录 payments（网关重试不会重复处理）
   └─ markPaidAndDeliver() → DeliveryService::deliverVirtualItems() 自动发货
   ↓
网关同步跳 /api/pay/return → pay-result.html
```

`bin/close_expired.php`（或后台「关闭超时订单」）负责把超时未付订单回 `cancelled` 并归还库存，可挂 crontab。

## 二、EPay（易支付通用协议）

`src/EPay.php` 的方法：

| 方法 | 说明 |
| --- | --- |
| `sign($params, $key, $signType)` | 生成签名（默认 MD5） |
| `verify(...)` / `verifyNotify(...)` | 验签，`verifyNotify()` 内部用 `hash_equals` 防时序攻击 |
| `isChannel($ch)` / `channelIds()` / `channelLabel()` | 渠道白名单，**本站只放行 `wxpay` / `alipay`** |
| `sanitizeGateway()` / `normalizeGateway()` | 网关地址校验与补全（必须 https，补到 `/submit.php`） |
| `money($cents)` / `toCents($money)` | 元 ↔ 分，避免浮点 |
| `buildSubmitForm(...)` | 生成提交到网关的表单字段 |
| `detectDevice($ua)` / `queryOrder(...)` | 设备判断 / 主动查单 |

配置在 `config/config.php` 的 `payment` 段（或 `config/.env` 的 `EPAY_*`），后台「易支付配置」填了值则**以数据库为准**。

## 三、回调的六条铁律

1. **必须验签**：走 `EPay::verifyNotify()`，不要用 `==` 自己比签名字符串。
2. **金额必须严格相等**：`EPAY_AMOUNT_TOLERANCE_CENTS` 默认 `0`，回调金额与订单应付金额不一致就拒绝。不要为了「少付一分也能过」把它调大。
3. **幂等**：网关会重试通知。所有「改订单状态 / 加余额 / 发货」都要先查 `payments` 是否已处理过同一笔交易号，否则会重复发货、重复加钱。
4. **必须吐纯文本**：成功回 `Response::plain('success')`，不能 `echo`。`api/index.php` 的 shutdown 守卫会把未走 `Response::*` 的输出转成 JSON 500，网关看不懂就会无限重试，见 [03 基础 API](/developer/custom/api)。
5. **限流**：`RateLimiter::guard('notify')`（默认 1 分钟 120 次）。
6. **不能套 CSRF / 登录**：回调来自支付网关，没有 `Origin` 和会话，靠签名识别身份。

::: warning 显式设置站点基址
`config/.env` 里设 `SHOP_BASE_URL=https://你的域名`，避免回调地址按请求 `Host` 推断被伪造。生产环境这也是防 Host 头攻击的一项。
:::

## 四、发货与商品类型

`products.type` 四个值（有 CHECK 约束）：

| type | 含义 | 发货路径 |
| --- | --- | --- |
| `virtual` | 虚拟商品 | 支付成功后 `DeliveryService::deliverVirtualItems()` 按模板自动写 `order_deliveries.content` |
| `physical` | 实体商品 | 后台填物流单号走 `shipOrder()` |
| `yulan` | 魔方财务（对接上游） | 绑定上游后走 `UpstreamService::provision()`；未绑定上游时 `YulanProvision` 兼容回退 |
| `cloud` | 魔方云（KVM 云服务器） | `DeliveryService::deliverCloud()` 调上游创建云主机，写 `cloud_vms` 与发货记录 |

`DeliveryService` 的关键方法：`deliverVirtualItems()`、`deliverCloud()`、`kindOf()`（type → `order_deliveries.kind`，含 `cloud`）、`renderContent()`、`expand()`、`forOrder()`、`setContent()`、`orderIsAllVirtual()`（cloud 算虚拟，免运费）。

**扩展发货方式需要动三处：**

1. `products.type` 的 CHECK 加新值 → **必须重建表**（见 [04 数据库与迁移](/developer/custom/database) 第五节，SQLite 不能直接改 CHECK）
2. `order_deliveries.kind` 的 CHECK 同步加值（同样重建表，`migrate.php` 里已有 `rebuildProductsForYulan()` / 交付表重建可参考）
3. `DeliveryService::kindOf()` 与对应 `deliver*()` 里加分支；后台「商品类型」下拉框、前台展示逻辑同步

> 这正是加入 `yulan` / `cloud` 类型时踩过的坑：`order_deliveries.kind` 的 CHECK 漏加新值，订单写发货记录直接 500。**能不加枚举值就不加** —— 把新类型映射成已有 `virtual` / `physical` 之一，改动会小很多。

## 五、上游对接（v1.4）

v1.4 用统一的 `upstreams` 表承载两类上游，`kind` 区分 `finance`（魔方财务）/ `cloud`（魔方云）：

```text
upstreams:            id / name / kind / base_url / api_user / api_key / financial_id / account_type / use_https / enabled
upstream_products:    id / upstream_id / external_id / name / spec / price_cents / status
cloud_vms:            id / order_id / product_id / user_id / upstream_id / external_id / ip / os / cpu / mem / status ...
tickets / ticket_replies: 工单与回复
```

商品通过 `products.upstream_id` + `products.upstream_product_id` 绑定上游产品。

- 核心服务：`UpstreamService`（上游 CRUD / 测试连接 / 同步产品 / 开通 / 实例操作）、`CloudVmService`（实例持久化与操作）、`TicketService`（工单）。
- `api_key` / 密钥「只写不读」：`UpstreamService::publicRow()` 只回传 `api_key_set`，不回传明文；留空 = 不修改，`__CLEAR__` = 清除。
- 云主机密码仅开通时一次性写入发货内容，`cloud_vms` 不长期存明文。
- `upstream_mock=1` 时 `UpstreamService` 不联网，写 `data/upstream_mock_queue.jsonl` 并返回模拟数据。
- 所有用户侧查询强制 `user_id` 过滤，跨用户访问返回 404。

详见 [魔方财务（对接上游）](/yulan)、[魔方云](/cloud) 与 [工单系统](/tickets)。

## 六、余额 / 充值 / 免费订单

| 能力 | 入口 | 服务 |
| --- | --- | --- |
| 余额支付 | `/console/orders/{no}/pay-balance` | `PaymentService::payWithBalance()` → `BalanceService` 扣款 + 写 `balance_ledger` |
| 充值 | `/console/balance/recharge` | `startRecharge()` → 网关 → `handleRechargeNotify()` 加余额（同样要幂等） |
| 免费订单 | `/orders/{no}/free-pay` | `payFreeOrder()`：¥0 直接完成，不跳网关 |
| 后台调余额 | `/api/admin/users/{id}/balance` | `AdminService::adjustBalance()`，需登录 + 审计 |

充值回调与订单回调共用「验签 → 幂等 → 加钱」的套路，改一处时别忘了另一处也要同步。

## 七、严禁清单

- ❌ 把商户密钥 / 服务器口令放进前端 JS、HTML、`data-site` 或日志
- ❌ 前端自己拼支付签名（密钥只在服务端）
- ❌ 跳过验签、放宽金额容差、去掉幂等判断
- ❌ 在回调里 `echo` 而不是 `Response::plain()`
- ❌ 直接改 `products.type` / `order_deliveries.kind` 的 CHECK 而不重建表
- ❌ 把回调参数原样写进日志（`PaymentService` 已做截断脱敏）

## 八、扩展后的验证

```bash
bash tests/e2e_payment.sh     # 支付链路回归
bash tests/e2e_yulan.sh       # 上游对接 / 云主机开通 / 工单 / 旧库迁移（历史脚本名沿用）
curl -s https://你的域名/api/payment/info   # 支付能力是否符合预期
```

---

← [07 前台数据流](/developer/custom/frontend) ｜ **下一步 →** [09 安全规范与发布检查](/developer/custom/security)

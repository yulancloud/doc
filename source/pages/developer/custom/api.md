---
title: 03 基础 API
---

# 03 基础 API：路由、响应与鉴权

这一篇把「加一个接口」讲透，是后面实战的地基。

← [02 框架结构](/developer/custom/architecture) ｜ [04 数据库与迁移](/developer/custom/database) →

## 一、路由表长什么样

`public/api/index.php` 用 `switch (true)`，每个 `case` 是一个布尔表达式。三种写法：

```php
// ① 精确路径 + 方法
case $path === '/api/health' && $method === 'GET':
    Response::ok(['status' => 'up', 'build' => '20261115a']);

// ② 正则取路径参数（$m[1] 是捕获组）
case preg_match('#^/api/products/([^/]+)$#', $path, $m) === 1 && $method === 'GET':
    $id = Validator::productId($m[1]);
    $p  = ProductRepo::find($id);
    if ($p === null) { Response::fail('not_found', '商品不存在或已下架', 404); }
    Response::ok($p);

// ③ 文件末尾兜底：已知路径方法不对 → 405；未知 → 404
case str_starts_with($path, '/api/'):
    // $known 数组 + 一组正则判断
    ...
```

::: warning 顺序就是优先级
`/api/orders/quote` 的 case **必须写在** `/api/orders/{no}` 的正则 case 之前，否则 `quote` 会被当成订单号吃掉。新增带固定后缀的路由时，一律放在通配正则之前。
:::

路径由 `Path::normalizeApi()` 归一化后再匹配，所以子目录部署（`/shop/api/orders`）也能命中，见 [02 框架结构](/developer/custom/architecture)。

## 二、统一响应格式

成功：

```json
{ "ok": true, "data": { "id": "p001", "name": "……" } }
```

失败：

```json
{ "ok": false, "error": { "code": "not_found", "message": "商品不存在或已下架" } }
```

| 方法 | 用途 |
| --- | --- |
| `Response::ok($data, $extra)` | 200，`{ok:true,data:...}` |
| `Response::json($payload, $status)` | 自定义状态码，如 `Response::json(['ok'=>true,'data'=>$r], 201)` |
| `Response::fail($code, $message, $status)` | 错误，`{ok:false,error:{code,message}}` |
| `Response::plain($body, $status)` | **纯文本**，只给易支付回调吐 `success` / `fail` |

::: warning 支付回调不能 echo
`api/index.php` 的 shutdown 守卫会把「没走 `Response::*` 的输出」当成脏输出转成 JSON 500，而网关只认纯文本 `success`，被转 JSON 会导致网关无限重试。必须调 `Response::plain('success')`。见 [08 支付扩展](/developer/custom/payment)。
:::

常用状态码：

| 码 | 含义 | 典型 code |
| --- | --- | --- |
| 200 / 201 | 成功 / 已创建 | — |
| 400 | 参数错误 | `invalid_json`、`text_too_long`、`invalid_settings` |
| 401 | 未登录 | `unauthorized`、`login_failed` |
| 403 | 无权限 / CSRF | `forbidden`、`csrf_failed`、`already_installed` |
| 404 | 不存在 | `not_found` |
| 405 | 方法不对 | `method_not_allowed` |
| 413 / 415 | body 过大 / 类型不对 | `payload_too_large`、`unsupported_media_type` |
| 429 | 限流 | `rate_limited` |
| 500 | 服务端异常 | `server_error` |
| 503 | 未安装 | `not_installed` |

## 三、请求体与参数校验

`readJsonBody()` 是文件末尾定义的全局函数，四条硬约束：

- `Content-Type` 必须以 `application/json` 开头（否则 415）
- body ≤ 64 KB（否则 413）
- 必须是合法 JSON 且**顶层是对象**（否则 400）
- 空 body 直接 400

GET 参数一律过 `Validator`：

```php
$kw   = Validator::keyword($_GET['q'] ?? '');
$page = Validator::int($_GET['page'] ?? null, 1, 1000, 1);
```

自定义文本用 `Validator::text($v, $min, $max, $label)`，它会去掉控制字符、`trim`、按 `mb_strlen` 校验长度，失败直接返回 400。**数据库操作一律 PDO 预处理占位符**，不要拼接 SQL。

## 四、三类接口的权限模型

| 类型 | 例子 | 必须做的 |
| --- | --- | --- |
| 公开只读 | `/api/catalog`、`/api/site`、`/api/products` | `RateLimiter::guard('read')` + `Validator` |
| 公开写 | `/api/products/{id}/reviews` | 限流（如 `review`）+ 严格校验；**不要**套后台 CSRF |
| 后台 | `/api/admin/*` | `AdminAuth::require()`（登录 + CSRF）、敏感操作 `requireOwner()`、`Audit::log()` |
| 前台用户 | `/api/console/*` | `UserAuth::require()` |
| 支付回调 | `/api/pay/notify` | 验签 + 幂等，**不能**要求登录 / CSRF |

```php
// 后台写接口的标准开头
$u = AdminAuth::require();            // 未登录 401；非 GET 自动做 CSRF
$body = readJsonBody();
$name = Validator::text($body['name'] ?? '', 1, 60, '名称');
// ... 业务 ...
Audit::log($u['id'], $u['username'], 'xxx_create', $id, $name);
Response::json(['ok' => true, 'data' => ['id' => $id]], 201);
```

`guardCsrf()` 比较 `Origin` / `Referer` 的 host + port，并兼容 `X-Forwarded-Host` 和 `SHOP_TRUSTED_ORIGINS`；**没有 `Origin` / `Referer` 的写请求一律 403**。所以 curl 自测后台接口必须带同源头。

限流规则写在 `config/config.php` 的 `rate_limit` 数组，新增动作时加一条：

```php
'guestbook' => ['window' => 600, 'max' => 5],  // 10 分钟 5 次
```

`RateLimiter::hit()` 按 IP 的 SHA-256 分桶写 `rate_limits` 表，不会明文留存 IP。

## 五、实战 A：加一个只读接口 `/api/ping`

在 `switch (true)` 的公开接口区加一个 case：

```php
case $path === '/api/ping' && $method === 'GET':
    RateLimiter::guard('read');
    Response::ok(['pong' => true, 'time' => date('c')]);
```

然后**把路径加进文件末尾兜底的 `$known` 数组**（见第七节）：

```php
$known = [
    '/api/health', '/api/catalog', /* ... */ '/api/ping',
];
```

验证：

```bash
curl -s http://127.0.0.1:8090/api/ping
# {"ok":true,"data":{"pong":true,"time":"..."}}
```

## 六、实战 B：加一个需登录的写接口

以「后台清空某某缓存」为例，走完整的鉴权 + 审计链路：

```php
case $path === '/api/admin/cache/clear' && $method === 'POST':
    $u = AdminAuth::require();
    $body = readJsonBody();
    $scope = Validator::text($body['scope'] ?? '', 1, 30, '范围');
    // 这里换成你的服务层调用，例如 CacheService::clear($scope)
    Audit::log($u['id'], $u['username'], 'cache_clear', $scope, '');
    Response::ok(['cleared' => $scope]);
```

同样把 `/api/admin/cache/clear` 加进 `$known`。自测：

```bash
curl -i -X POST http://127.0.0.1:8090/api/admin/cache/clear \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://127.0.0.1:8090' \
  -H 'Cookie: shiwu_admin_sid=你的会话Cookie' \
  -d '{"scope":"all"}'
```

不带 `Origin` 会得到 403 `csrf_failed`；不带 Cookie 会得到 401 `unauthorized` —— 这两个响应正好可以用来确认权限层在生效。

## 七、别忘了末尾的 `$known` 数组

文件末尾的兜底 case 会区分「路径存在但方法不对」与「路径不存在」：命中 `$known`（或其正则）返回 **405**，否则 **404**。新增路由时不加进去，方法写错时你会看到 404 而不是 405，排查时容易误判成「路由没注册」。

如果新路由带路径参数，还要往兜底里的正则组补一条，例如：

```php
|| preg_match('#^/api/admin/guestbook/\\d+$#', $path) === 1
```

## 八、常见坑

| 现象 | 原因 |
| --- | --- |
| 新接口 404 | case 没匹配（顺序被前面的正则抢了）/ 伪静态没把 `/api/*` 转到入口 |
| 新接口返回 404 而不是 405 | 没加进 `$known` |
| 写接口 403 `csrf_failed` | curl 没带 `Origin`，或反代改写了 Host 且没配 `SHOP_TRUSTED_ORIGINS` |
| 415 / 400 | 没设 `Content-Type: application/json`，或 body 不是对象 |
| 前端报「服务暂时不可用」 | 看 Network 响应体与 PHP `error_log`；入口保证一定是 JSON，别只看统一提示 |
| 子目录部署全部 404 | 前端基址与后端归一化没配对 |

---

← [02 框架结构](/developer/custom/architecture) ｜ **下一步 →** [04 数据库与迁移](/developer/custom/database)

---
title: 07 前台数据流与交互
---

# 07 前台数据流与交互

前台也是原生 JS，但有一层**数据适配 + 静态兜底**机制。不搞懂它，很容易出现「后台改了前台不变」或「我加的页面读不到数据」。

← [06 后台管理扩展](/developer/custom/admin) ｜ [08 支付 / 发货扩展](/developer/custom/payment) →

## 一、加载顺序（不能乱）

```text
public/assets/data.js     静态兜底数据（8 件演示商品、分类、文案）
       ↓
public/assets/api.js      数据适配层 → window.ShopAPI / window.SHOP
       ↓
页面内联脚本 / app.js     通过 window.shopBoot(fn) 注册启动逻辑
```

`api.js` 会**优先请求 PHP 接口**，成功就把真实数据覆盖到 `window.SHOP`；接口不可用（纯静态托管）时回退到 `data.js`，页面照常能看，但后台改动自然不生效。

判断当前数据源：看 `<html>` 上的 `data-api-source` 属性 —— `api` 表示连上了后端，`static` 表示走兜底。

## 二、接口基址自动探测

`api.js` 的 `detectApiBase()` 解决子目录部署：

```text
① window.SHOP_API_BASE（显式指定，最优先）
② <meta name="shop-api-base" content="...">
③ 从 location.pathname 推断：/shop/cart.html → /shop/api
   并剥掉 /(install|admin|console) 段，避免拼出 /admin/api
```

后端 `Path::normalizeApi()` 再把 `/shop/api/orders` 归一成 `/api/orders`。两侧配合，写死 `/api` 会导致「页面看着正常、一点下单 404」，见 [02 框架结构](/developer/custom/architecture)。

## 三、`ShopAPI` 与 `window.SHOP`

`window.ShopAPI` 暴露的方法（都在 `public/assets/api.js`）：

| 方法 | 对应接口 |
| --- | --- |
| `site()`、`installStatus()` | `GET /api/site`、`/api/install/status` |
| `catalog(params)`、`product(id)` | `GET /api/catalog`、`/api/products/{id}` |
| `postReview(id, payload)` | `POST /api/products/{id}/reviews` |
| `quote(items)`、`createOrder(payload, idemKey)` | `POST /api/orders/quote`、`/api/orders` |
| `getOrder(no, token)`、`paymentInfo()` | `GET /api/orders/{no}`、`/api/payment/info` |
| `payOrder(...)`、`payOrderForUser(...)`、`payBalance(...)`、`freePay(...)` | 各类支付 |
| `me()`、`recharge(...)` | 前台用户与充值 |
| `state`、`apiBase`、`newIdempotencyKey()` | 状态 / 基址 / 幂等键生成 |

内部 `get()` / `post()` 统一处理错误码与友好提示（如 `not_installed`、`payment_not_configured`）。**新增前台接口时建议在这里加一个方法**，而不是在页面里裸 `fetch`，这样错误提示、超时、JSON 解析都一致。见 [05 实战](/developer/custom/first-feature) 的 `postGuestbook`。

`window.SHOP` 是聚合后的数据对象：`categories`、`products`、当前商品等，由 `mergeCatalog()` / `mergeProduct()` 写入。

## 四、启动时序：`shopBoot` 与「打字动画覆盖」的坑

```text
api.js 启动 → 并发请求 /api/site + /api/catalog
   ↓ 全部就绪
runBoot():
   ① applyNavCategories()        重绘分类标签
   ② window.__SHOP_READY__ = true   ← 标记站点文案已就绪
   ③ 执行 __shopBootQueue 里的页面脚本
   ④ dispatch 'shop:ready' 事件
   ↓
app.js 的 queueStream() 看到 READY（或等 shop:ready / 2.6s 兜底）才启动打字动画
```

::: warning v1.1 修过的真实 bug
旧版打字动画在 API 返回**之前**就用 HTML 里写死的文案开始播放，动画结束时又把旧文案写回元素，把后台设置的新文案覆盖掉，表现就是「后台改了前台没变」。现在动画结束时读取的是**最新的 `data-stream` 属性**，且必须等站点文案就绪才启动。自定义带打字效果的文案时，务必沿用 `data-site-stream` + `STREAM_SLOTS` 映射，别自己起定时器。
:::

页面脚本一律这样注册：

```js
window.shopBoot(function () {
  // 这里 window.SHOP / window.SHOP_SITE 已就绪
});
```

## 五、后台文案 → 前台元素的映射

`applySite(s)` 把 `/api/site` 的值写到对应的 DOM：

| 标记 | 作用 |
| --- | --- |
| `data-site="键名"` | 普通文本，用 `textContent` 写入（不拼 `innerHTML`，防存储型 XSS） |
| `data-site-stream="插槽名"` | 打字动画文案，同步更新 `data-stream` 属性 |
| `STREAM_SLOTS` 映射 | 在 `api.js` 里把插槽名映射到设置键，如 `home-products-title → home_products_title` |

新增一处可后台配置的打字文案：`SettingsService::DEFAULTS` 加键 → `publicPayload()` 加键 → `STREAM_SLOTS` 加一行 → HTML 元素打 `data-site-stream` → bump 版本号。

分类标签同理：`applyNavCategories()` 用 `S.categories` 重绘，

- `data-cat-slot="nav"` / `data-cat-slot="list"`：完整列表容器（支持后台新增分类）
- `data-cat-label="desk"`：单个静态占位（改名 / 隐藏生效）

顶栏、页脚、商品详情页面包屑都已改成这套标记，所以后台「分类管理」改名后前台会同步变化。

## 六、加一个前台页面 / 交互的标准步骤

1. 复制 `cart.html` 的顶栏与页脚结构（保留 `data-cat-slot` / `data-cat-label`、主题切换按钮、脚本引用与 `?v=`）
2. 需要接口数据 → 在 `api.js` 的 `ShopAPI` 加方法
3. 页面逻辑用 `window.shopBoot(fn)` 包起来
4. 所有来自接口 / 用户输入的文本用 `U.esc()` 或 `textContent`（`product.html` 里已有 `U.esc`）
5. **bump 全站 `?v=` 版本号**并 `Ctrl+F5`
6. 验证 `<html data-api-source="api">`，看 Network 里 `/api/site`、`/api/catalog` 的返回

## 七、缓存与版本号

`public/router.php` 对 `css/js/html` 发 `Cache-Control: no-cache` + `Last-Modified` 协商缓存，图片字体才长缓存；HTML 用 `no-store`。但**浏览器、CDN、Cloudflare 仍可能缓存带 `?v=` 的 URL**，所以改 JS / CSS 后统一换版本号最稳：

```bash
find public -name '*.html' -print0 | xargs -0 sed -i 's/v=20261115a/v=你的新版本号/g'
```

只改 PHP（接口返回）不需要 bump，PHP 每个请求重新解析。

## 八、常见坑

| 现象 | 原因 |
| --- | --- |
| 后台改了文案，前台还是旧的 | 没强刷 / 没 bump 版本号 / `data-api-source=static` |
| 打字动画播完又变回旧句子 | 自定义动画没走 `data-site-stream` + READY 时序 |
| 分类改名只有部分地方变 | 那一处还写死在 HTML 里，没换成 `data-cat-*` 标记 |
| 子目录部署一点下单 404 | 接口基址不对，检查 `window.ShopAPI.apiBase` 与 Network URL |
| 新页面读不到 `window.SHOP` | 脚本没用 `shopBoot()` 注册，在数据就绪前就执行了 |
| 页面出现 HTML 标签 | 用了 `innerHTML` 拼接口文本，改用 `textContent` / `U.esc()` |

---

← [06 后台管理扩展](/developer/custom/admin) ｜ **下一步 →** [08 支付 / 发货 / 商品类型扩展](/developer/custom/payment)

---
title: 06 后台管理扩展
---

# 06 后台管理扩展

后台是原生 JS 的 hash 路由单页，没有框架、没有构建。理解「菜单按钮 → 视图对象 → 主控路由」这条链，加页面就是三步。

← [05 实战](/developer/custom/first-feature) ｜ [07 前台数据流](/developer/custom/frontend) →

## 一、四个文件与加载顺序

```text
public/admin/index.html
  <script src="assets/api.js?v=…"></script>      → window.AdminAPI / window.AdminU
  <script src="assets/views.js?v=…"></script>    → window.AdminViews
  <script src="assets/views-v5.js?v=…"></script> → window.AdminViewsV5（v5 扩展视图）
  <script src="assets/app.js?v=…"></script>      → 主控 App.go()
```

| 文件 | 职责 |
| --- | --- |
| `index.html` | 页面骨架、侧栏 `data-view` 按钮、抽屉容器 |
| `assets/api.js` | 请求封装（`AdminAPI`）+ 工具（`AdminU`：`esc` / `money` / `time` / `toast` / `confirm` / `initTheme` …） |
| `assets/views.js` | 各菜单页的 `render(host)`，末尾导出 `window.AdminViews` |
| `assets/views-v5.js` | 后加的视图（用户管理），导出 `window.AdminViewsV5` |
| `assets/app.js` | 登录校验、hash 路由 `go(name)`、抽屉、退出登录 |

::: warning 加载顺序不能改
`views.js` 在顶部取 `window.AdminAPI` / `window.AdminU`，`app.js` 取 `window.AdminViews`。顺序错了会直接 `undefined`。四个文件都要带同一个 `?v=` 版本号。
:::

## 二、加一个菜单页（三步）

1) `public/admin/index.html`：侧栏加按钮，`data-view` 的值就是视图名：

```html
<button class="side__link" data-view="guestbook" type="button">
  <!-- 图标 --> 访客留言
</button>
```

2) `public/admin/assets/views.js`：定义视图并注册：

```js
var guestbook = {
  title: '访客留言',
  render: function (host) {
    host.innerHTML = '<div id="gb-list">' + loadingBox() + '</div>';
    API.get('/guestbook?limit=20').then(function (r) {
      // 渲染列表（所有文本过 U.esc）
    }).catch(function (e) {
      host.innerHTML = stateBox('加载失败', e.message);
    });
  }
};

window.AdminViews = {
  /* ...原有... */
  guestbook: guestbook
};
```

3) 无需改 `app.js`：`go(name)` 的白名单以实际注册的视图对象为准，不再依赖硬编码数组：

```js
function go(name) {
  if (!V || !V[name] || typeof V[name].render !== 'function') name = 'dashboard';
  // ...设置标题、侧栏高亮、history.replaceState('#'+name)、v.render(fresh)
}
```

> 旧版本这里有一张硬编码视图名数组，漏改就会出现「点了菜单却被弹回数据概览」。现在只要在 `AdminViews` 里注册即可。菜单点击由 `document.querySelectorAll('.side__link[data-view]')` 统一绑定，URL hash 形如 `/admin/#guestbook`，可刷新、可分享。

## 三、可用的现成积木

| 积木 | 来源 | 用途 |
| --- | --- | --- |
| `API.get/post/put/del(path, body)` | `AdminAPI` | 通用请求，自动拼 `/api/admin` 前缀；带 `credentials:'same-origin'`、超时 15s、401 自动跳登录、把响应拆包成 `data` |
| `U.esc(s)` | `AdminU` | HTML 转义，所有拼进 `innerHTML` 的文本必须过它 |
| `U.toast(msg, kind)` / `U.confirm(msg)` | `AdminU` | 轻提示 / 确认 |
| `U.money(cents)` / `U.yuan(cents)` / `U.toCents(v)` | `AdminU` | 分 ↔ 元换算 |
| `U.time(s)` / `U.ago(s)` | `AdminU` | 时间格式化 |
| `loadingBox()` / `stateBox(title, sub)` / `pager(...)` | `views.js` | 加载态 / 空态 / 分页 |
| `openDrawer(title, bodyHtml, footHtml)` | `app.js` | 右侧抽屉（编辑商品、订单详情都用它） |

`API.get('/products')` 实际请求 `/api/admin/products` —— 所以 [05 实战](/developer/custom/first-feature) 里的新接口不用改 `api.js`，直接 `API.get('/guestbook')` 即可。

## 四、设置类表单：复用三件套

站点文案、易支付、运费、站点设置这些菜单页都是「字段表 → 渲染 → 填充 → 保存」同一套代码：

```js
var SITE_FIELDS = [
  { key: 'site_name', label: '站点名称', hint: '…', max: 40, type: 'text' },
  { key: 'hero_subtitle', label: '首页副标题', hint: '…', max: 300, type: 'textarea' },
  // type 还支持 select / password；group 用于分组
];

settingsFieldHtml(f)      // 生成单个字段 HTML
fillSettingsFields(fields, s)   // 用 GET 回来的值填充
saveSettingsFields(btn, fields, okMsg, onSaved)  // 收集并 PUT 保存
```

新增一个后台可配参数时：

1. `src/SettingsService.php` 的 `DEFAULTS` 加键（白名单 + 默认值 + `max`）
2. 若要下发前台，加进 `publicPayload()`；密钥类键绝不能加
3. 后台 `views.js` 对应字段表加一项
4. bump 版本号 + 强刷

`SettingsService::save()` 是部分更新：只写传入的键；密钥类字段「只写不读」，GET 不回显，输入框留空表示不修改。详见 [PHP 配置与文案默认值](/developer/config)。

## 五、权限与审计

| 需求 | 做法 |
| --- | --- |
| 仅登录可用 | 后端 `AdminAuth::require()`；前端 401 会自动跳登录页 |
| 仅店主可用 | 后端 `AdminAuth::requireOwner()`；前端 `go()` 对 `audit` 视图判断 `App.me.role !== 'owner'` |
| 记录操作 | 后端 `Audit::log($u['id'], $u['username'], '动作', '目标', '备注')`，写入 `admin_audit` |
| 敏感视图隐藏 | 侧栏按钮加 `hidden`，登录后按角色决定是否显示（参考 `#nav-audit-link`） |

权限判断必须放后端。前端隐藏按钮只是体验，接口本身要自己拦。审计日志不要写密码、密钥、完整手机号（`Audit.php` 已做长度截断）。

## 六、`views-v5.js` 为什么要惰性委托

`views.js` 里 `users` 视图没有直接引用 `AdminViewsV5.users`，而是包了一层函数：

```js
users: {
  title: '用户管理',
  render: function (host) {
    var v5 = window.AdminViewsV5 && window.AdminViewsV5.users;
    if (v5 && typeof v5.render === 'function') { v5.render(host); return; }
    host.innerHTML = stateBox('用户管理模块未加载', '请刷新页面重试');
  }
}
```

因为 `views-v5.js` 在 views.js 之后加载，注册时取值会是 `undefined`。后加的扩展视图都照这个模式写，避免踩「视图找不着」的坑。

## 七、常见坑

| 现象 | 原因 |
| --- | --- |
| 点菜单跳回数据概览 | `AdminViews` 里没注册该视图，或 `render` 不是函数 |
| `API.get is not a function` / `U.esc is not a function` | 脚本加载顺序错了，或某个文件 `?v=` 没一起 bump |
| 后台改了没反应 | JS 缓存；四个脚本与 HTML 的版本号要统一替换并 `Ctrl+F5` |
| 列表里出现 HTML 标签 / XSS | 拼 `innerHTML` 时没过 `U.esc()` |
| 写接口 403 | 后端 `AdminAuth::require()` 的 CSRF；页面请求会自带同源 `Origin`，curl 自测要手动带 |
| 抽屉事件重复触发 | 用 `app.js` 的 `openDrawer()`，它每次重建容器；别自己往旧节点上追加监听 |

---

← [05 实战](/developer/custom/first-feature) ｜ **下一步 →** [07 前台数据流与交互](/developer/custom/frontend)

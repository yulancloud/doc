---
title: 05 实战：从零做一个功能
---

# 05 实战：从零做一个完整功能

把前四篇串起来，端到端做一个访客留言板：前台填表提交 → 存库 → 后台列表查看 / 删除。它不碰支付和订单，但会走完「建表 → 服务 → 路由 → 权限 → 后台 → 前台 → 测试」全部环节，是后续所有功能的模板。

← [04 数据库与迁移](/developer/custom/database) ｜ [06 后台管理扩展](/developer/custom/admin) →

## 目标与最终效果

| 端 | 能力 |
| --- | --- |
| 前台 | 一个表单（称呼 + 内容），提交后提示成功 |
| 后台 | 新增「访客留言」菜单，分页列出、可删除 |
| 约束 | 公开提交按 IP 限流、内容长度校验、后台删除需登录 + CSRF + 审计 |

::: tip
示例是教学用最小实现，用来讲清机制。上线前请按 [09 安全规范](/developer/custom/security) 补齐（如验证码、敏感词、分页上限、内容审核）。
:::

## 1 备份

```bash
cp data/shop.sqlite data/shop.sqlite.bak-dev-$(date +%Y%m%d-%H%M)
cp -r config config.bak-dev
```

## 2 建表：新装 + 升级两条路

`database/schema.sql`（全新安装的库）：

```sql
CREATE TABLE IF NOT EXISTS guestbook (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  ip_hash    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_guestbook_created ON guestbook (created_at DESC);
```

`bin/migrate.php`（旧库升级）。检测阶段加：

```php
if (!tableExists($pdo, 'guestbook')) {
    $steps[] = '创建 guestbook 表（访客留言）';
}
```

事务内执行区加（紧跟其它 `ALTER` 步骤）：

```php
if (!tableExists($pdo, 'guestbook')) {
    $pdo->exec('CREATE TABLE IF NOT EXISTS guestbook (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, body TEXT NOT NULL,
        ip_hash TEXT NOT NULL DEFAULT \'\',
        created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))
    )');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_guestbook_created ON guestbook (created_at DESC)');
}
```

## 3 限流规则

`config/config.php` 的 `rate_limit` 数组加一条：

```php
'guestbook' => ['window' => 600, 'max' => 5],   // 同一 IP 10 分钟最多 5 条
```

## 4 服务类 `src/GuestbookService.php`

```php
<?php
declare(strict_types=1);

final class GuestbookService
{
    public static function add(array $in): array
    {
        $name = Validator::text($in['name'] ?? '', 1, 30, '称呼');
        $body = Validator::text($in['body'] ?? '', 1, 500, '留言内容');
        $pdo  = Db::conn();
        $pdo->prepare('INSERT INTO guestbook (name, body, ip_hash) VALUES (?, ?, ?)')
            ->execute([$name, $body, RateLimiter::ipHash()]);
        return [
            'id'   => (int)$pdo->lastInsertId(),
            'name' => $name,
            'body' => $body,
        ];
    }

    public static function page(int $limit, int $offset): array
    {
        $pdo  = Db::conn();
        $stmt = $pdo->prepare(
            'SELECT id, name, body, created_at FROM guestbook
             ORDER BY id DESC LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return [
            'items' => $stmt->fetchAll(),
            'total' => (int)$pdo->query('SELECT COUNT(*) FROM guestbook')->fetchColumn(),
        ];
    }

    public static function delete(int $id): void
    {
        Db::conn()->prepare('DELETE FROM guestbook WHERE id = ?')->execute([$id]);
    }
}
```

要点：全是占位符、`Validator::text` 统一校验、IP 只存哈希、分页 `LIMIT/OFFSET` 用 `bindValue`。

## 5 注册路由

`public/api/index.php` 顶部 `require_once` 区加一行：

```php
require_once $SRC . '/GuestbookService.php';
```

公开接口区（`switch (true)` 里）加：

```php
// 公开提交：限流 + 校验，不套后台会话
case $path === '/api/guestbook' && $method === 'POST':
    RateLimiter::guard('guestbook');
    $r = GuestbookService::add(readJsonBody());
    Response::json(['ok' => true, 'data' => $r], 201);
```

后台接口区加：

```php
case $path === '/api/admin/guestbook' && $method === 'GET':
    AdminAuth::require();
    $limit  = Validator::int($_GET['limit'] ?? null, 1, 50, 20);
    $offset = Validator::int($_GET['offset'] ?? null, 0, 100000, 0);
    Response::ok(GuestbookService::page($limit, $offset));

case preg_match('#^/api/admin/guestbook/(\d+)$#', $path, $m) === 1 && $method === 'DELETE':
    $u  = AdminAuth::require();          // DELETE 会自动做 CSRF 校验
    $id = (int)$m[1];
    GuestbookService::delete($id);
    Audit::log($u['id'], $u['username'], 'guestbook_delete', (string)$id, '');
    Response::ok(['id' => $id]);
```

末尾 `$known` 数组加：

```php
$known = [
    /* ...原有... */ '/api/guestbook', '/api/admin/guestbook',
];
// 并在兜底正则判断里补一条：
// || preg_match('#^/api/admin/guestbook/\d+$#', $path) === 1
```

## 6 后台：菜单 + 视图

`public/admin/index.html` 侧栏加一个按钮（照抄其它 `.side__link`）：

```html
<button class="side__link" data-view="guestbook" type="button">
  <!-- 图标 --> 访客留言
</button>
```

`public/admin/assets/views.js` 里加视图，并注册到末尾的 `window.AdminViews`：

```js
var guestbook = {
  title: '访客留言',
  render: function (host) {
    host.innerHTML = '<div id="gb-list">' + loadingBox() + '</div>';
    API.get('/guestbook?limit=20').then(function (r) {
      var rows = r.items || [];
      document.getElementById('gb-list').innerHTML = rows.length
        ? rows.map(function (x) {
            return '<div class="card"><b>' + U.esc(x.name) + '</b>：' + U.esc(x.body)
                 + ' <button data-gb-del="' + x.id + '">删除</button></div>';
          }).join('')
        : stateBox('暂无留言', '前台提交后会显示在这里');
      document.querySelectorAll('[data-gb-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          API.del('/guestbook/' + b.getAttribute('data-gb-del'))
            .then(function () { guestbook.render(host); });
        });
      });
    }).catch(function (e) {
      host.innerHTML = stateBox('加载失败', e.message);
    });
  }
};

window.AdminViews = {
  /* ...原有视图... */
  guestbook: guestbook
};
```

> `AdminAPI.get/post/put/del` 是已导出的通用方法，内部自动拼 `/api/admin` 前缀、带 `credentials: 'same-origin'`、把响应拆包成 `data`，所以新接口不用改 `admin/assets/api.js`。所有拼进 `innerHTML` 的文本必须过 `U.esc()`。详见 [06 后台管理扩展](/developer/custom/admin)。

## 7 前台：表单 + 提交

在 `public/assets/api.js` 的 `window.ShopAPI` 里加一个方法（推荐，统一错误处理）：

```js
postGuestbook: function (payload) { return post('/guestbook', payload); },
```

新建 `public/guestbook.html`（复制 `cart.html` 的顶栏 / 页脚结构），表单部分：

```html
<form id="gb-form">
  <input id="gb-name" maxlength="30" placeholder="怎么称呼" required>
  <textarea id="gb-body" maxlength="500" placeholder="想说的话" required></textarea>
  <button type="submit">提交留言</button>
</form>
<p id="gb-msg" role="status"></p>
<script>
shopBoot(function () {
  document.getElementById('gb-form').addEventListener('submit', function (e) {
    e.preventDefault();
    ShopAPI.postGuestbook({
      name: document.getElementById('gb-name').value,
      body: document.getElementById('gb-body').value
    }).then(function () {
      document.getElementById('gb-msg').textContent = '已收到，谢谢留言';
      e.target.reset();
    }).catch(function (err) {
      document.getElementById('gb-msg').textContent = err.message || '提交失败';
    });
  });
});
</script>
```

`shopBoot()` 会等 `api.js` 数据就绪再执行，见 [07 前台数据流](/developer/custom/frontend)。

## 8 bump 版本号 + 强刷

改了 `api.js` / 新增 HTML，必须把全站 HTML 的 `?v=` 一起换掉：

```bash
cd /path/to/shop
find public -name '*.html' -print0 | xargs -0 sed -i 's/v=20261116e/v=20261115b/g'
```

然后浏览器 `Ctrl+F5`（或开无痕窗口）。

## 9 测试清单

```bash
# 1) 迁移：先看清单再执行
php bin/migrate.php --dry-run
php bin/migrate.php

# 2) 公开提交（注意 Content-Type）
curl -i -X POST http://127.0.0.1:8090/api/guestbook \
  -H 'Content-Type: application/json' \
  -d '{"name":"测试","body":"第一条留言"}'
# 期望 201 + {"ok":true,"data":{"id":1,...}}

# 3) 限流生效：连发 6 次，第 6 次应 429 rate_limited

# 4) 后台列表（需带会话 Cookie）
curl -s http://127.0.0.1:8090/api/admin/guestbook \
  -H 'Cookie: shiwu_admin_sid=你的会话Cookie'

# 5) 后台删除（DELETE 必须带 Origin，否则 403 csrf_failed）
curl -i -X DELETE http://127.0.0.1:8090/api/admin/guestbook/1 \
  -H 'Origin: http://127.0.0.1:8090' \
  -H 'Cookie: shiwu_admin_sid=你的会话Cookie'

# 6) 页面：/guestbook.html 提交、/admin/#guestbook 查看与删除

# 7) 回归
bash tests/e2e.sh
```

## 10 回看：这 8 步对应哪一篇

| 步骤 | 对应篇章 |
| --- | --- |
| 2、4 建表 / 迁移 | [04 数据库与迁移](/developer/custom/database) |
| 3 限流、4、5 校验与响应 | [03 基础 API](/developer/custom/api) |
| 4、5 服务层 / 路由 / 鉴权 | [02 框架结构](/developer/custom/architecture) |
| 6 后台菜单与视图 | [06 后台管理扩展](/developer/custom/admin) |
| 7 前台表单与 `shopBoot` | [07 前台数据流](/developer/custom/frontend) |
| 8、9 版本号 / 测试 / 安全自检 | [09 安全规范与发布检查](/developer/custom/security) |

## 常见翻车点

| 现象 | 原因 |
| --- | --- |
| 提交 500 `no such table` | 只改了 `schema.sql`，没在 `migrate.php` 里建表 / 没跑迁移 |
| 后台菜单点了跳回数据概览 | `window.AdminViews` 没注册该视图（`go()` 以实际注册对象为准） |
| 前台 `ShopAPI.postGuestbook is not a function` | 没 bump 版本号，浏览器还在用旧 `api.js` |
| 删除 403 | curl 没带 `Origin`；`AdminAuth::require()` 对非 GET 自动做 CSRF |
| 列表 401 | 没带后台会话 Cookie |
| 新装站点没有 `guestbook` 表 | 只在 `migrate.php` 加了，`schema.sql` 漏了 |

---

← [04 数据库与迁移](/developer/custom/database) ｜ **下一步 →** [06 后台管理扩展](/developer/custom/admin)

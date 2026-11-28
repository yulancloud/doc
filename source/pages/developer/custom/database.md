---
title: 04 数据库与迁移
---

# 04 数据库与迁移

这一篇讲怎么加一张表、加一列。核心原则：新装和升级两条路都要能到达同一个结构。

← [03 基础 API](/developer/custom/api) ｜ [05 实战](/developer/custom/first-feature) →

## 一、三份文件各管什么

| 文件 | 什么时候执行 | 作用 |
| --- | --- | --- |
| `database/schema.sql` | `php bin/init_db.php` 或安装向导建全新库 | 主表结构 |
| `database/schema_v5.sql` | 同上，紧随 `schema.sql` | v5 追加的表（用户、订单发货、充值等） |
| `bin/migrate.php` | 每次升级旧库手动跑 | 幂等补齐：加列、加表、改 CHECK、修旧数据 |

> `bin/init_db.php` 是直接 `$pdo->exec(file_get_contents(schema.sql))` 再 exec `schema_v5.sql`。所以只在 `migrate.php` 里加列，新装的站会缺这一列；只在 `schema.sql` 里加列，老站跑不升级也会缺。两边都要写。

## 二、Db 层的既定约定

`src/Db.php` 已经帮你做好了几件事，别绕开它：

| 约定 | 值 | 为什么 |
| --- | --- | --- |
| 错误模式 | `ERRMODE_EXCEPTION` | 错误不静默 |
| 预处理 | `EMULATE_PREPARES=false` | 真预处理，杜绝拼接注入 |
| 外键 | `PRAGMA foreign_keys=ON` | 每连接都要开 |
| 日志 | `journal_mode=WAL`、`busy_timeout=5000` | 并发读写更稳 |
| 事务 | `Db::tx(callable)` | 自动 commit / 异常回滚；已在外层事务中时直接复用（SQLite 不支持嵌套 `beginTransaction`） |

写法示例：

```php
// 读
$stmt = Db::conn()->prepare('SELECT * FROM products WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

// 写（多步用事务）
Db::tx(function (PDO $pdo) use ($name) {
    $pdo->prepare('INSERT INTO categories (id, label) VALUES (?, ?)')
        ->execute(['newcat', $name]);
});
```

::: warning LIMIT / OFFSET 要 bindValue
SQLite + PDO 下把 `LIMIT ?` 用 `execute([$limit])` 传参，某些版本会把参数当字符串导致语法错误。分页一律：

```php
$stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
$stmt->bindValue(':off', $offset, PDO::PARAM_INT);
```
:::

## 三、加一列的标准写法（以 v1.1 的 `products.flaws` 为例）

1) `database/schema.sql`：在 `products` 定义里加：

```sql
flaws  TEXT NOT NULL DEFAULT '',
```

2) `bin/migrate.php` 检测阶段：收集 `$steps`（`--dry-run` 靠它输出清单）：

```php
if (!columnExists($pdo, 'products', 'flaws')) {
    $steps[] = 'products 增加列 flaws（商品缺点 / 已知不足）';
} else {
    echo "✓ products.flaws 已存在\n";
}
```

3) `bin/migrate.php` 事务内执行区：幂等 `ALTER`：

```php
if (!columnExists($pdo, 'products', 'flaws')) {
    $pdo->exec("ALTER TABLE products ADD COLUMN flaws TEXT NOT NULL DEFAULT ''");
}
```

4) 业务代码要能容忍「列还不存在」：旧库没跑迁移时，`AdminService::saveProduct()` 会先 `PRAGMA table_info(products)` 探测再决定要不要写这一列，保证「只覆盖源码、暂未迁移」的站点保存商品也不报 500。自定义字段建议照抄这个做法。

## 四、加一张表的标准写法

`schema.sql`（或 `schema_v5.sql`，按归属）里：

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

`migrate.php` 里：检测阶段加 `$steps[]`，事务内执行区加：

```php
if (!tableExists($pdo, 'guestbook')) {
    $pdo->exec('CREATE TABLE IF NOT EXISTS guestbook (...)');
}
```

`tableExists()` / `columnExists()` 是 `migrate.php` 里已有的辅助函数，基于 `sqlite_master` 与 `PRAGMA table_info`，直接复用。

## 五、改 CHECK 约束 / 重建表：SQLite 最深的坑

SQLite 不支持 `ALTER COLUMN` 或直接改 CHECK，只能「建新表 → 搬数据 → 删旧表 → 改名」。两个真实的坑：

坑 1：`PRAGMA foreign_keys=OFF` 在事务内是 no-op。重建类步骤必须放在事务外执行，否则外键约束根本没关掉。

坑 2：`ALTER TABLE products RENAME TO __products_old` 会改写子表的外键指向。旧版迁移后 `product_colors` 等子表的 `REFERENCES products(id)` 被 SQLite 自动改成 `REFERENCES "__products_old"(id)`，DROP 旧表后外键就悬空了，表现为后台保存商品报「服务暂时不可用」。v1.1 的修法是：

```php
$pdo->exec('PRAGMA foreign_keys=OFF');
$pdo->exec('PRAGMA legacy_alter_table=ON');   // 关键：禁止 RENAME 改写子表引用
$pdo->exec('ALTER TABLE products RENAME TO __products_old');
// 建新表 → INSERT ... SELECT 搬数据（COALESCE 兜底 NULL）→ DROP 旧表
$pdo->exec('PRAGMA legacy_alter_table=OFF');
$pdo->exec('PRAGMA foreign_keys=ON');
repairChildTablesAfterRename($pdo);           // 再兜底修一遍残留
```

`migrate.php` 里已经有 `rebuildProductsForYulan()`、`rebuildDeliveriesForYulan()`、`repairChildTablesAfterRename()` 三个可直接参考的完整实现。能不动 CHECK 就不动：新增状态值尽量用应用层校验，而不是改表约束。

## 六、migrate.php 的执行结构

```text
① 检查数据库文件存在
② 自动备份 data/shop.sqlite.bak-YmdHis（备份失败直接中止）
③ 检测阶段：收集 $steps，--dry-run 时打印并退出
④ 事务内：ALTER 加列、CREATE 表、补数据（失败自动 rollback）
⑤ 事务外：需要重建表的步骤（临时关外键 + legacy_alter_table）
⑥ 补索引、输出完成清单
```

每次升级：

```bash
php bin/migrate.php --dry-run   # 先看要做什么
php bin/migrate.php             # 再执行（可重复跑，幂等）
```

## 七、命名与类型约定

| 项 | 约定 |
| --- | --- |
| 金额 | 一律 `INTEGER`，单位分，字段名带 `_cents` |
| 时间 | `TEXT NOT NULL DEFAULT (datetime('now'))` |
| 状态 | `TEXT ... CHECK (status IN ('a','b'))`，改 CHECK 要重建表 |
| 主键 | 商品 / 分类用 `TEXT PRIMARY KEY`（业务 slug）；流水表用 `INTEGER PRIMARY KEY AUTOINCREMENT` |
| 敏感信息 | IP 只存 SHA-256（`RateLimiter::ipHash()`），口令只写不读，不进日志 |
| 外键 | 显式 `REFERENCES`，并配 `ON UPDATE CASCADE` / `ON DELETE SET NULL` |

## 八、常见报错对照

| 现象 | 根因 | 处理 |
| --- | --- | --- |
| 后台保存 / 设置账号限购报「加载失败，服务暂时不可用」 | 旧库没跑迁移，新列不存在，接口 500 | `php bin/migrate.php` + 强刷 |
| `no such column: xxx` | 只改了代码没改表，或只改了 `schema.sql` 没改 `migrate.php` | 两边补齐后跑迁移 |
| `foreign key mismatch` / 保存 500 | 重建表时子表外键被改写成 `__products_old` | 用 `legacy_alter_table=ON` + `repairChildTablesAfterRename()` |
| `table already exists` | 迁移没做幂等判断 | 一律 `IF NOT EXISTS` + `tableExists()` |
| 迁移后数据没了 | 重建表时 `INSERT ... SELECT` 漏列 | 先备份，逐列核对；`created_at` / `updated_at` 用 `COALESCE` 兜底 |

## 九、动手清单

1. 备份 `data/shop.sqlite`
2. `schema.sql` / `schema_v5.sql` 加定义（新装路径）
3. `migrate.php` 加检测 + 幂等执行（升级路径）
4. 业务代码对「列不存在」做兼容探测
5. `--dry-run` → 正式迁移 → `curl /api/health`
6. 跑 `tests/e2e.sh` 回归
7. 升级时整个 `config/` 与 `data/` 都不要删，见 [安装与升级](/deploy/install)

---

← [03 基础 API](/developer/custom/api) ｜ **下一步 →** [05 实战：从零做一个功能](/developer/custom/first-feature)

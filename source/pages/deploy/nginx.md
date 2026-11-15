---
title: Nginx 部署（需伪静态）
---

# Nginx 部署（需要伪静态）

Nginx **不会自动识别虚拟路径**，所以必须手工配置重写规则。分两种场景，任选其一：

- **A. 宝塔面板**：在站点「伪静态」框里粘一段规则，PHP 解析由宝塔自带的 `\.php` 正则规则负责 —— 最省事
- **B. 手写完整 server 配置**：直接用仓库里 `deploy/` 的配置样例 —— 适合不用面板的机器

::: warning
两种方式**不要混用**。手写完整配置时若沿用面板那份 `try_files`，会踩到 PHP 源码泄露的坑，详见 B 段说明。
:::

## 共同第一步：运行目录与 PHP

1. 站点根目录 / 运行目录设为项目里的 `public/`：

```text
/www/wwwroot/你的域名/public
```

2. 选择 PHP 版本（8.1+），确认 `pdo_sqlite` 已开启。
3. 宝塔用户：确认站点配置里存在 PHP-FPM 解析规则（`enable-php-83.conf` 之类），否则 `.php` 文件会被当静态文件下载。

---

## A. 宝塔面板：填伪静态

进入 **网站 → 设置 → 伪静态**，把下面这段完整粘进去并保存：

```nginx
location /api/ {
    try_files $uri /api/index.php$is_args$args;
}
location ~ ^/(admin|console|install)$ {
    rewrite ^/(.*)$ /$1/ permanent;
}
location = /install/ {
    try_files /install.html =404;
}
location ^~ /admin/ {
    try_files $uri $uri/ /admin/index.html =404;
}
location ^~ /console/ {
    try_files $uri $uri/ /console/index.html =404;
}
```

### 每条规则在做什么

| 规则 | 作用 |
| --- | --- |
| `location /api/` | 所有接口转给 `api/index.php`。注意是**普通前缀**（不带 `^~`），这样 `/api/index.php` 仍会被宝塔的 `\.php` 正则接走、交给 PHP-FPM 解析 |
| `location ~ ^/(admin\|console\|install)$` | 不带斜杠时 301 补斜杠，避免后台相对资源加载失败 |
| `location = /install/` | 安装向导指向 `install.html` |
| `location ^~ /admin/` | 后台页面指向 `admin/index.html` |
| `location ^~ /console/` | 用户中心指向 `console/index.html` |

::: tip 为什么 `/api/` 不能写成 `location ^~ /api/`
`^~` 是「前缀命中后不再尝试正则」，优先级高于 `\.php` 正则。一旦这么写，`/api/index.php` 会被当成静态文件直接返回 **PHP 源码**，配置与密钥全泄露。面板场景务必保留上面那份普通前缀写法。
:::

### 保存后验证

```bash
curl -i https://你的域名/api/health
# 期望：200 + {"ok":true,...} + Content-Type: application/json

curl -i https://你的域名/api/index.php
# 绝不能出现 "<?php" 源码，应返回 JSON 结果

curl -i https://你的域名/admin/
# 期望：200，返回后台 HTML
```

---

## B. 手写完整 server 配置（非面板）

仓库自带两份可直接改的配置文件：

| 文件 | 适用场景 |
| --- | --- |
| `deploy/nginx-root.conf` | 站点直接挂在域名根下 |
| `deploy/nginx-subdir.conf` | 挂在子目录，如 `https://example.com/shop/` |

复制到 `/etc/nginx/sites-available/shop.conf` 并软链启用，按注释改 4 处：路径、域名、`fastcgi_pass` 的 PHP 版本 sock、证书。然后：

```bash
nginx -t && systemctl reload nginx
```

### 与面板规则的关键差别

完整配置里，`/api/` 必须**直接交给 PHP-FPM**，不能用 `try_files` 静态兜底：

```nginx
location ^~ /api/ {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/api/index.php;
    fastcgi_param SCRIPT_NAME     /api/index.php;
    fastcgi_param REQUEST_URI     $request_uri;
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;   # 改成你的 PHP 版本
    fastcgi_read_timeout 60s;
}
```

原因：`/api/index.php` 是磁盘上真实存在的文件，`try_files $uri /api/index.php` 的第一个参数会直接命中它，Nginx 便以静态文件返回源码。这是 2026-11-14 线上实际发生过的故障（`/api/install/status` 返回 `application/octet-stream` 的 PHP 源码，导致安装页 JSON 解析失败）。

另外，配置文件里还包含这些**必须保留**的闸门：

- `\.php` 正则段：只放行 `router.php` 与 `api/index.php`，其余 PHP（含 `src/`、`bin/`）一律 404
- 敏感后缀（`.sqlite`、`.env`、`.bak`、`.zip`…）一律 404
- `^/(data|config|database|src|bin|deploy|vendor|node_modules)/` 一律 404
- 安全响应头 `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy`

### 子目录部署

用 `deploy/nginx-subdir.conf`。前端 `api.js` 会自动从 `/shop/cart.html` 推出接口基址 `/shop/api`，一般不用改代码。若结构特殊，可在页面里显式指定：

```html
<meta name="shop-api-base" content="/shop/api">
```

---

## 常见故障

| 现象 | 原因 / 处理 |
| --- | --- |
| 接口返回 `<?php` 源码 | `/api/` 用了 `try_files` 或 `^~` 抢走了 PHP 解析；按 A 段改回普通前缀，或按 B 段直接 `fastcgi_pass` |
| 点下单弹 404 | 伪静态没保存，或子目录部署时接口基址丢前缀 |
| 后台打开空白 / 不跳登录页 | 访问的是 `/admin` 而非 `/admin/`；补斜杠规则失效，请检查上面伪静态里的 301 补斜杠规则 |
| `/install` 404 | 缺 `location = /install/` 规则 |
| 500 / 数据库只读 | `data/` 目录权限不对，见[部署前准备](/deploy/prepare) |

## 下一步

配置好重写后，去 [安装与升级](/deploy/install) 完成初始化。若你用的是 Apache，改看 [Apache 部署（免伪静态）](/deploy/apache)。

## 相关排查

接口返回 PHP 源码、后台空白、下单 404 等由 Web 服务器配置引发的问题，见 [部署与迁移故障](/troubleshoot/deploy)；上线前请按 [上线自检清单](/deploy/checklist) 核对。

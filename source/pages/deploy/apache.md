---
title: Apache 部署（免伪静态）
---

# Apache 部署（不需要伪静态）

项目已经在 `public/.htaccess` 里写好了全部重写规则。Apache 会自动读取它，所以 **「伪静态」框里什么都不用填**——那个框是 Nginx 专用的，Apache 环境填了反而可能冲突。

## 一、只需要三个前提

| 前提 | 说明 |
| --- | --- |
| 运行目录 = `public/` | 与 Nginx 完全一致，见[部署前准备](/deploy/prepare) |
| `mod_rewrite` 已启用 | `a2enmod rewrite` 或宝塔里确认模块已开 |
| `AllowOverride All` | 站点 `<Directory>` 段允许 `.htaccess` 覆盖配置 |

宝塔面板（Apache 环境）通常在 **网站 → 设置 → 配置文件** 里确认这段：

```apache
<Directory /www/wwwroot/你的域名/public>
    AllowOverride All
    Require all granted
</Directory>
```

改完重启 Apache：

```bash
# Debian/Ubuntu
a2enmod rewrite && systemctl restart apache2
# 或宝塔面板里点「重启」
```

::: warning
如果 `AllowOverride` 是 `None`，`.htaccess` 会被完全忽略——表现为接口 404、后台 404，但静态首页能打开。这是 Apache 部署最常见的问题。
:::

## 二、`.htaccess` 替你做了什么

无需手工填写，但了解内容便于排错：

| 规则 | 作用 |
| --- | --- |
| `RewriteRule ^api(/.*)?$ api/index.php [QSA,L]` | 所有接口转给 `api/index.php` |
| `RewriteRule ^install/?$ install.html` | 安装向导 |
| `RewriteRule ^admin$ admin/ [R=301,L]` + `^admin/.*$ admin/index.html` | 后台 301 补斜杠 + 指向后台页 |
| `RewriteRule ^console$ console/ [R=301,L]` + `^console/.*$ console/index.html` | 用户中心 |
| `RewriteRule \.(sqlite\|db\|sql\|env\|bak\|zip\|log\|lock)$ - [R=404,L,NC]` | 数据库 / 备份 / 配置等敏感文件一律 404 |
| `RewriteRule ^(data\|config\|database\|src\|bin\|deploy)/ - [R=404,L]` | 敏感目录一律 404 |
| `RewriteRule ^api/.*\.php$ - [R=404,L,NC]` | 除入口外，`/api/` 下的 `.php` 一律拒绝（防源码泄露） |
| `Header always set ...` | 安全响应头 |
| `Options -Indexes` | 禁止目录列表 |

> 应用层 `router.php` 里还有一套独立的敏感文件拦截，即使 `.htaccess` 完全没生效，数据库内容也不会被直接读出。

## 三、验证是否生效

```bash
curl -i https://你的域名/api/health
# 期望：200 + JSON

curl -i https://你的域名/admin/
# 期望：200 + 后台 HTML

curl -i https://你的域名/data/shop.sqlite
# 期望：404
```

如果 `/api/health` 返回 404，按下面顺序排查：

1. `.htaccess` 文件是否真的上传了（它是隐藏文件，某些 FTP 工具默认不传隐藏文件）
2. `AllowOverride All` 是否生效
3. `mod_rewrite` 是否启用
4. Apache 错误日志：`tail -f /var/log/apache2/error.log`

## 四、子目录部署

挂在 `https://example.com/shop/` 时，编辑 `public/.htaccess`，把：

```apache
RewriteBase /
```

改成：

```apache
RewriteBase /shop/
```

前端 `api.js` 会自动探测接口基址；若结构特殊，可显式指定：

```html
<meta name="shop-api-base" content="/shop/api">
```

## 五、与 Nginx 的对照

| | Nginx | Apache |
| --- | --- | --- |
| 伪静态框 | **必须手填** | **留空** |
| 重写规则来源 | 面板里粘的那段 | 项目自带 `public/.htaccess` |
| 额外开关 | PHP-FPM 解析规则 | `mod_rewrite` + `AllowOverride All` |
| 运行目录 | `public/` | `public/` |
| 安装 / 迁移 | 相同 | 相同 |

## 下一步

去 [安装与升级](/deploy/install) 完成初始化。若你其实用的是 Nginx，改看 [Nginx 部署（需伪静态）](/deploy/nginx)。

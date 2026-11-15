---
title: 部署教程
---

# 部署教程

以 Nginx（宝塔面板）为例，完成运行目录、伪静态、PHP 解析与安装。

## 一、环境要求

- PHP **8.1+**（8.3 已验证），开启 `pdo_sqlite` 扩展
- Nginx / Apache 均可
- 运行目录必须指向项目下的 `public/`

## 二、设置运行目录

将网站「运行目录 / 网站根目录 / 执行目录」指向项目下的 `public` 目录：

```text
/www/wwwroot/你的域名/public
```

::: warning
不要把项目根目录当作网站根目录，否则 `src/`、`config/`、`data/` 等敏感目录会被直接暴露。
:::

## 三、Nginx 伪静态

在站点伪静态规则中填入以下内容（已验证）：

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

## 四、PHP 解析（fastcgi）

```nginx
location ~ \.php$ {
    fastcgi_pass unix:/tmp/php-cgi-83.sock;   # 宝塔默认路径，按实际 PHP 版本修改
    fastcgi_index index.php;
    include fastcgi.conf;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

## 五、安装与升级

1. 上传代码，运行目录指向 `public/`，配置好伪静态与 PHP。
2. 浏览器访问 `/install` 完成初始化。
3. **首次部署或升级后务必执行一次数据库迁移：**
   ```bash
   php bin/migrate.php
   ```
   该脚本会加新列、修复 SQLite 外键、确保各项修复生效（幂等，可重复执行）。
4. `Ctrl+F5` 强刷清缓存，访问 `/api/health` 确认返回 `build` 版本号正常。

## 六、目录结构

| 路径 | 说明 |
| --- | --- |
| `public/` | 网站根目录（运行目录），含 router.php、前端页面、API 入口 |
| `src/` | 后端业务逻辑（支付、订单、欲蓝连接器等） |
| `database/` | Schema 与迁移脚本 |
| `bin/migrate.php` | 数据库迁移 / 修复工具 |
| `config/` | 运行配置（安装向导生成，不参与版本库） |
| `data/` | SQLite 数据库（运行生成，不参与版本库） |

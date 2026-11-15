---
title: 常见问题
---

# 常见问题

## 部署类

### Q1：Nginx 和 Apache 部署到底差在哪？

只差**要不要手填伪静态**：

| | Nginx | Apache |
| --- | --- | --- |
| 伪静态框 | 必须粘一段规则 | **留空**，项目自带 `public/.htaccess` |
| 额外开关 | PHP-FPM 解析规则 | `mod_rewrite` + `AllowOverride All` |

其余（运行目录 `public/`、安装向导、`php bin/migrate.php`）完全一样。分别看 [Nginx 部署](/deploy/nginx) 与 [Apache 部署](/deploy/apache)。

### Q2：为什么接口返回一段 `<?php` 源码？

Nginx 把 `/api/index.php` 当静态文件返回了。常见成因是把 `/api/` 写成 `location ^~ /api/` 并配 `try_files`——`^~` 优先级高于 `\.php` 正则，PHP-FPM 根本没被调用。

- 宝塔面板：用普通前缀 `location /api/`，不要加 `^~`，见 [Nginx 部署](/deploy/nginx)
- 手写完整配置：`/api/` 直接 `fastcgi_pass`，见仓库 `deploy/nginx-root.conf`

这也是配置与密钥泄露的高危点，务必修复。

### Q3：后台打开空白、不跳登录页？

访问的是 `/admin` 而不是 `/admin/`。不带结尾斜杠时浏览器会把相对资源算成 `/assets/...`，后台 JS 全部 404。伪静态 / `.htaccess` 里都带了 301 补斜杠规则，别删掉。见 [后台总览](/admin)。

### Q4：Apache 下接口和后台全 404，但静态首页能开？

`.htaccess` 没生效，按顺序查：① 隐藏文件是否真的上传了；② `AllowOverride All`；③ `mod_rewrite` 是否启用。见 [Apache 部署](/deploy/apache)。

### Q5：访问后台提示「加载失败，服务暂时不可用」？

**部署后没有执行数据库迁移**，新列不存在导致接口报错。运行 `php bin/migrate.php`，再 `Ctrl+F5` 清缓存后重试。迁移脚本幂等，可重复执行。见 [安装与升级](/deploy/install)。

### Q6：保存商品 / 设置提示「服务暂时不可用，请稍候再试」？

多为旧数据库在迁移时外键子表未正确重建所致（SQLite `ALTER TABLE RENAME` 会把子表外键改写成 `__products_old`）。最新迁移脚本已内置自动修复（`repairChildTablesAfterRename`），执行 `php bin/migrate.php` 即可自愈；若仍失败，检查 `data/` 目录可写权限。

### Q7：点下单弹 404？

伪静态没保存，或子目录部署时接口基址丢了前缀。见 [Nginx 部署](/deploy/nginx) 的「常见故障」与 [部署总览](/deploy)。

### Q8：升级后前端没变化？

浏览器强缓存所致。请 `Ctrl+F5` 强刷；系统对 JS / CSS / HTML 采用协商缓存，正常情况下改动后会自动拿到新版本。升级后务必跑一次迁移，见 [安装与升级](/deploy/install)。

## 后台与业务

### Q9：商品类型下拉框在哪？三种类型有什么区别？

添加 / 编辑商品表单里的「商品类型」下拉框：**实体商品**（人工发货）、**虚拟商品**（模板自动发货）、**欲蓝财务魔方**（自动建号交付）。编辑时不重新选择会保持原类型。见 [商品管理](/admin/products)。

### Q10：每个商品能配自己的欲蓝服务器吗？

能。商品「发货配置」里有商品级 IP / 端口 / 账号 / 口令 / 连接地址，**留空才回退全局默认**。见 [商品管理](/admin/products) 与 [欲蓝财务魔方](/yulan)。

### Q11：支付网关地址怎么填？为什么跳到易支付首页？

必须填到 `/submit.php`，如 `https://pay.xxx.com/submit.php`，且必须 https。只填域名会跳官网首页。见 [支付配置](/admin/payment)。

### Q12：¥0 免费商品能测试整条链路吗？

能。售价为 0 的订单不走支付网关，直接置为已付款并触发发货逻辑（含欲蓝建号），适合测试。见 [订单与发货](/admin/orders)。

### Q13：服务器口令会回显吗？

不会。商品级服务器口令与商户密钥都「只写不读」，API 响应中根本不包含该字段；管理后台仅显示「已配置」状态徽标，留空表示不修改，填 `__CLEAR__` 清除。

## 安全类

### Q14：支付回调会被伪造吗？

不会。异步回调严格验签（`hash_equals` 常量时间比较、签名算法取自服务端配置不可降级），并校验状态 / 通道 / 金额完全相等与幂等，无法伪造支付成功。

### Q15：是否存在 SQL 注入 / 命令注入 / 存储型 XSS？

- 后端全参数化查询（排序 / 状态走白名单），无 SQL 注入
- Windows APP 建号使用参数化命令执行（不经过 shell），账号还有白名单校验，无命令注入
- 评价文本、商品名等用户输入渲染前统一转义，无存储型 XSS

### Q16：Windows APP 的通信安全吗？

APP 与商城服务端之间为明文 HTTP，**请勿将 APP 暴露到公网**，应部署在内网或将 `listen_host` 设为 `127.0.0.1`。令牌与建号口令仅在内部网络传输。见 [Windows APP](/windows-app)。

### Q17：运行目录写错有什么后果？

把运行目录设成项目根目录，`src/`、`config/`、`data/` 会变成可通过 URL 直接下载的文件——数据库、密钥、源码全泄露。**必须是 `public/`**。见 [部署前准备](/deploy/prepare)。

## 文档站

### Q18：文档站的正式访问地址是什么？

正式地址是 **https://doc.yulancloud.us.ci/**，站点仍由 GitHub Pages 托管，只是绑定了自定义域名。原来的 `yulancloud.github.io/doc/` 会自动跳转到这个域名，建议收藏新地址。

自定义域名在仓库 `Settings → Pages → Custom domain` 中设置，DNS 侧用一条 CNAME 把 `doc` 指向 `yulancloud.github.io`。

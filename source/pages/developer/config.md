---
title: PHP 配置与文案默认值
---

# PHP 配置与文案默认值

这一篇讲 PHP 侧能自定义什么。视觉配色在 CSS 变量里，见 [主题定制设置](/developer/theme)。

::: tip 一句话区分
改颜色去 `style.css`，改默认文案去 `SettingsService.php`，改业务参数去 `config/.env`。三者互不相干，后台「站点设置」改的文字则存数据库、优先级最高。
:::

## 一、配置优先级（从高到低）

```text
后台「站点设置」写入数据库（仅文案类，留空才回退下一层）
      ↓
真实环境变量（系统环境 / PHP-FPM env）
      ↓
config/.env
      ↓
config/config.php 的默认值 / SettingsService::DEFAULTS
```

三个最容易踩的点：

- 后台改过的文案以数据库为准。改 `SettingsService.php` 的默认值，对一个已经装好、后台里存了值的站点不起作用（除非把那一项的数据库值清空）。
- `config/config.php` 只是「默认值集合」。可变项建议写进 `config/.env`，别直接改 `config.php`——升级时会被 Release 覆盖。
- 支付参数：后台「易支付配置」留空 = 沿用 `.env`，填了 = 用数据库值。所以 `.env` 改了不生效，先去后台看是不是填过值。

## 二、文案默认值：`src/SettingsService.php`

`DEFAULTS` 是一张白名单：每项 = 默认值 + 长度上限。默认值就是「后台还没配置过」时前台显示的内容。

| 键 | 作用 | 上限 |
| --- | --- | --- |
| `site_name` / `site_name_en` | 顶栏品牌、`<title>` 前缀 / 英文副标 | 40 |
| `hero_eyebrow` | 首页眉标（`EST. 2019 · 上海静安` 那行） | 60 |
| `hero_title` | 首页流式大字主标题 | 80 |
| `hero_subtitle` | 首页导语 | 300 |
| `home_notice` | 首页公告条（留空则不显示） | 300 |
| `home_products_title` | 首页「在售」区大标题（v1.1 起真正驱动前台） | 120 |
| `footer_note` / `footer_copyright` / `footer_icp` / `footer_contact` | 页脚说明 / 版权 / 备案 / 联系方式 | 300 / 160 / 80 / 300 |
| `support_email` / `support_wechat` / `support_qq` | 客服邮箱 / 微信 / QQ | 120 / 60 / 60 |
| `meta_title` / `meta_description` | 浏览器标签页标题 / SEO 描述 | 120 / 200 |
| `site_intro` / `console_welcome` | 站点介绍 / 用户中心欢迎语 | 2000 / 60 |
| `epay_*` | 易支付参数（绝不进入前台接口） | 见文件 |
| `ship_fee` / `free_ship_threshold` | 运费 / 包邮门槛（单位元，留空沿用 `config.php`） | 12 |

### 几条安全设计，改动时别破坏

- 白名单：只有 `DEFAULTS` 里声明的 key 能被后台写入，防止被塞进任意键
- 长度上限：每项都有 `max`，避免把整页 HTML 塞进数据库
- 前台只读：`/api/site` 只返回 `publicPayload()` 里的公开文案，`epay_key` 等凭据一律不下发
- 输出转义：前端一律用 `textContent` 赋值，不拼 `innerHTML`，从根上避免存储型 XSS

### 新增一个后台可配字段（4 步）

以加一个 `my_key` 为例：

1. `src/SettingsService.php` 的 `DEFAULTS` 加一行：
   ```php
   'my_key' => ['default' => '默认文字', 'max' => 120],
   ```
2. 若这个值要下发到前台，把它加进 `publicPayload()` 的返回数组（否则 `/api/site` 不会返回）。
3. 后台表单在 `public/admin/assets/views.js` 的站点设置字段表加一项；前台在 `public/assets/api.js` 的 `applySite()` 里把值写到带 `data-site="my_key"` 的元素。若这处文字要打字动画，再往 `STREAM_SLOTS` 映射里加一行，并给元素打 `data-site-stream`。
4. bump 全站 `?v=` 版本号 + `Ctrl+F5`，否则浏览器继续跑旧 JS。

::: tip
设置是 key-value 表，新增字段不需要跑 `php bin/migrate.php`，也不用改表结构。这和加商品列（`products.flaws`）不一样，别混。
:::

## 三、业务参数：`config/config.php` + `.env`

`config.php` 用 `$str` / `$int` / `$bool` 三个闭包从环境变量取值，代码里不出现任何密钥。可调项分组如下：

| 分组 | 可调项 | `.env` 变量（示例） | 默认 |
| --- | --- | --- | --- |
| 数据库 | SQLite 路径 | `SHOP_DB_PATH` | `data/shop.sqlite` |
| 运行环境 | 错误详情开关 | `SHOP_ENV=production` | `production` |
| 站点 | 对外基址（生成支付回调，防 Host 伪造） | `SHOP_BASE_URL=https://shop.example.com` | 按请求 Host 推断 |
| 跨域 | 允许的来源 | `SHOP_ALLOWED_ORIGINS`（同源留空） | 空 |
| 订单 | 查询凭证有效期（天） | `SHOP_ORDER_TOKEN_TTL_DAYS` | 30 |
| 支付 | 开关 / PID / KEY / 网关 / 渠道 / 关单时间 | `EPAY_ENABLED`、`EPAY_PID`、`EPAY_KEY`、`EPAY_GATEWAY`、`EPAY_CHANNELS`、`EPAY_EXPIRE_MINUTES` | `false` / 空 / `wxpay,alipay` / 120 分钟 |
| 后台 | 初始账号、会话空闲/绝对超时、IP 白名单 | `SHOP_ADMIN_USER`、`SHOP_ADMIN_IDLE_TIMEOUT`、`SHOP_ADMIN_ABSOLUTE_TIMEOUT`、`SHOP_ADMIN_IP_ALLOWLIST` | `admin` / 7200 / 43200 / 空 |
| 用户中心 | 会话超时、充值金额上下限 | `SHOP_USER_IDLE_TIMEOUT`、`SHOP_RECHARGE_MIN_CENTS`、`SHOP_RECHARGE_MAX_CENTS` | 7 天 / 100 分 / 5000000 分 |
| 限流 | 下单 / 读 / 查单 / 支付 / 回调 / 后台 / 注册 / 评价 的窗口与次数 | 无 `.env` 变量，写在 `rate_limit` 数组里 | 如「下单 10 分钟 10 次」 |
| 业务规则 | 包邮门槛、运费、满减、每行限购、余额支付上限 | 无 `.env` 变量，写在 `rules` 数组里 | 满 ¥299 包邮 / ¥12 / 满 ¥600 打 95 折 / 每行 5 件 |

> 注意最后两行：`rate_limit` 和 `rules` 是 `config.php` 里的字面量，想改只能动 PHP 文件。其中运费与包邮门槛有例外——后台「运费设置」填了值就以数据库为准，留空才回退到 `rules`，见 [站点设置与其他](/admin/settings)。

### `.env` 用法

```bash
cp config/.env.example config/.env
# 按需修改后，确认配置真的读进来了：
php -r '$c=require "config/config.php"; echo "base_url=",$c["base_url"]," | pay=",($c["payment"]["enabled"]?"on":"off"),"\n";'
```

`config/.env.example` 里逐项都有注释，照着填即可。改 `.env` 一般下次请求就生效；若开了 OPcache 或改的是系统级环境变量，需 `systemctl reload php8.3-fpm`（按实际版本）才会刷新。

### 安全红线

- `config/.env`、`config/installed.lock`、`config/.install_token`、`data/shop.sqlite` 绝不进 Git 仓库、也不能发给客户，`.gitignore` 已挡住，交付前再核一遍。
- 商户密钥只用于本地签名 / 验签，绝不下发前端；后台「易支付配置」里密钥只写不读。
- `config/` 位于 Web 根之外，运行目录必须是 `public/`，否则配置文件可被 URL 直接下载，见 [部署前准备](/deploy/prepare)。

## 四、改完怎么生效、怎么别弄丢

| 改了什么 | 生效方式 |
| --- | --- |
| 后台站点设置 | 保存即生效，无需重启 |
| `config/.env` | 下次请求（必要时 reload PHP-FPM） |
| PHP 源码（`SettingsService.php` / `config.php` / `api.js` 以外的后端） | reload PHP-FPM 清 OPcache |
| `style.css` / `app.js` / `api.js` / HTML | bump 全站 `?v=` + `Ctrl+F5`，见 [主题定制设置](/developer/theme) |

::: warning 升级时 `config/` 整个目录都不要删
`config/` 里还有 `config/installed.lock` 安装锁。删了它站点会被判定为「未安装」，`/install` 安装向导重新出现、全站 API 返回 503「站点尚未安装」，`.env` 的支付参数也一起丢失。只覆盖程序文件即可，详见 [安装与升级](/deploy/install) 第四节。
:::

从 Release 整目录覆盖升级时，`style.css`、`SettingsService.php`、`config.php`、各 HTML 都会被还原成官方版本。把自己的定制整理成一份补丁或单独记录，每次升级后重新套用，见 [版本更新](/changelog)。

## 排障

| 现象 | 原因 |
| --- | --- |
| 改了 `DEFAULTS` 默认值，前台没变 | 数据库里已有值（后台改过），默认值只对空值生效 |
| `.env` 改了不生效 | 变量名拼错 / OPcache 未清 / FPM 未 reload / 后台「易支付配置」里填了值优先 |
| 新增字段后台不显示 | 漏改 `views.js` 字段表，或没 bump `?v=` |
| 新增字段前台读不到 | 没加进 `publicPayload()`，或 `applySite()` 没绑定 |
| 支付参数怎么改都不对 | 数据库值优先于 `.env`，先把后台对应项清空 |

更多按症状排查见 [部署与迁移故障](/troubleshoot/deploy) 与 [常见问题](/faq)。

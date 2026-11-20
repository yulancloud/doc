---
title: 开发者
---

# 开发者

这一板块讲**怎么改这套系统本身**：换配色、改文案默认值、调业务参数、加一个后台可配字段。适合准备二次开发或做品牌定制的人，普通部署与日常运营看[部署指南](/deploy)和[后台使用](/admin)就够。

开发者板块分两块：**定制与配置**（换主题、改文案默认值与业务参数，改现有设置）和 **[功能自定义教程](/developer/custom)**（从入门到实战，教你怎么加一个原本没有的新功能）。想加表、加接口、做后台菜单和前台页面，直接走后者那套 10 篇循序渐进教程。

## 先搞清楚：能改的东西分三层

| 想改什么 | 真实位置 | 语言 | 改完怎么生效 |
| --- | --- | --- | --- |
| 配色、圆角、字重、字体、阴影、暗色模式 | `public/assets/style.css` 的 CSS 变量 | CSS | bump 静态资源版本号 + `Ctrl+F5` |
| 站点名、首页文案、页脚、公告等**初始默认值** | `src/SettingsService.php` 的 `DEFAULTS` | PHP | 存数据库，后台改了以数据库为准 |
| 运费、折扣、限购、限流、支付、会话超时 | `config/config.php` 与 `config/.env` | PHP | 保存即生效（必要时 reload PHP-FPM） |

::: warning 常见误解：主题不在 PHP 里
前台的**视觉主题**（主色、背景、圆角、亮/暗两套配色）是 `style.css` 里的 CSS 变量，PHP 不输出任何颜色。PHP 侧能自定义的是**文案默认值**和**业务配置**——后台「站点设置」改的文字存进数据库，会覆盖 `SettingsService.php` 里的默认值。

所以「改主题」和「改文案」是两条完全不同的路径，别在 PHP 里找 `--accent`。
:::

## 按需求找页面

| 我想… | 看这篇 |
| --- | --- |
| 换主题 / 做插件，**后台上传 zip 即装**（推荐） | [v2 插件主题教程](/developer/theme-v2) |
| 把蓝色主色换成自己的品牌色（手动改 CSS，v1 方式） | [v1 插件主题教程](/developer/theme) |
| 改亮色 / 暗色两套配色、字体、圆角 | [v1 插件主题教程](/developer/theme) |
| 改站点默认文案、新增一个后台可配字段 | [PHP 配置与文案默认值](/developer/config) |
| 调运费 / 包邮门槛 / 折扣 / 限购数量 / 限流 | [PHP 配置与文案默认值](/developer/config) |
| 只改文字，不改代码 | [站点设置与其他](/admin/settings)（后台直接改，推荐） |
| **加一个新功能**（建表 / 写接口 / 做后台与前台页面） | [功能自定义 · 学习路线](/developer/custom)（10 篇教程，从入门到发布） |

## 开发前必读

1. **备份**：至少备份 `data/shop.sqlite` 与 `config/.env`。改代码前先复制一份原文件。
2. **别改运行目录以外的路径结构**：网站根目录是 `public/`，`src/`、`config/`、`data/` 绝不能被 URL 直接访问，见[部署前准备](/deploy/prepare)。
3. **静态资源有版本号**：所有 HTML 引用 `style.css?v=20261116e`、`app.js?v=20261116e`。改了 CSS/JS 必须**同步 bump 所有 HTML 里的 `?v=`**，否则浏览器和 CDN 继续用旧缓存，表现为「我改了但没变化」。
4. **升级会覆盖你的改动**：从 Release 整目录覆盖升级时，`style.css`、`SettingsService.php`、`config.php` 都会被还原成官方版本。把自己的定制整理成一份补丁或单独记录，每次升级后重新套用。
5. **改密钥要小心**：商户密钥、上游 API 密钥只写不读，不会下发到前台，详见[魔方财务（对接上游）](/yulan)。

## 文件地图

```text
shop/
├── public/                        ← 网站运行目录（唯一对外可访问）
│   ├── assets/
│   │   ├── style.css              ← 全部设计令牌（主题变量）★
│   │   ├── app.js                 ← 主题切换、打字动画、购物袋
│   │   ├── api.js                 ← 站点文案注入、分类标签渲染
│   │   └── data.js                ← 静态兜底数据
│   ├── admin/assets/
│   │   ├── admin.css              ← 后台布局（复用 style.css 变量）
│   │   ├── views.js               ← 后台表单字段定义
│   │   └── app.js                 ← 后台交互
│   ├── console/assets/console.css ← 用户中心布局（复用同一套变量）
│   ├── api/index.php              ← 全部 API 路由入口
│   └── *.html                     ← 前台页面，含 ?v= 版本号
├── src/
│   ├── SettingsService.php        ← 文案默认值 / 白名单 ★
│   └── ...                        ← 订单、支付、商品、发货等业务逻辑
├── config/
│   ├── config.php                 ← 全局默认配置 ★
│   ├── .env.example               ← 环境变量样例
│   └── .env                       ← 真实配置（不进版本库）
├── database/schema.sql            ← 表结构
├── bin/migrate.php                ← 幂等迁移
└── data/shop.sqlite               ← 真实数据库（不进版本库）
```

## 相关排查

改了样式或文案却看不到变化，按 [常见问题](/faq) 的 Q18 逐条查；升级后界面异常参见 [部署与迁移故障](/troubleshoot/deploy)。

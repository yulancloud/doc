---
title: 如何上传插件到市场
---

# 如何上传插件到市场

> 这篇给**做了功能、想分享给别人**的人看。不需要服务器、不需要数据库：插件本体放你自己的 GitHub 仓库，市场只读取一份索引清单。

::: tip 先说清楚「插件」是什么
系统里没有单独的插件框架。所谓插件，就是你按 [功能自定义教程](/developer/custom)（10 篇：加接口、建表、做后台页、接前台）做出来的**新功能**，按约定打包成一个 zip。
安装插件 = 把包里的文件放进项目对应目录，必要时跑一次迁移。所以包里那份 `INSTALL.md` 比代码更重要。
:::

## 整体流程

| 步 | 做什么 | 用到 GitHub 的什么 |
| --- | --- | --- |
| 1 | 用模板仓库建自己的插件仓库 | **Template repository**（`Use this template` 一键创建） |
| 2 | 写 `plugin.json` + `INSTALL.md`，跑 `pack.sh` 打包 | 插件 zip 放你仓库的 Release 或仓库内文件 |
| 3 | 在市场点「上传插件」填表单 | **Issue Forms**（结构化收集提交） |
| 4 | 维护者审核，合并进 `plugins.json` | 市场页下次加载自动出现 |

> 你记得的「GitHub 有专门这样的仓库可以创建」，对应的就是这两项：**模板仓库**让开发者一键建仓，**Issue 表单**让用户提交插件。两者都是 GitHub 原生能力，不用自己搭后端。

## ① 用模板仓库一键建仓

打开 [yulancloud/plugin-template](https://github.com/yulancloud/plugin-template)，点右上角绿色 **`Use this template` → `Create a new repository`**，填上仓库名即可得到一个结构一模一样的仓库：

```
my-plugin/
├── plugin.json        ← 插件元数据（市场卡片读它）
├── INSTALL.md         ← ⭐ 给小白看的安装步骤
├── README.md
├── pack.sh            ← 一键打包
├── assets/icon.svg
├── files/             ← 要「新增」到项目的文件，路径相对项目根目录
│   └── public/plugins/hello/index.html
└── patches/           ← 需要「合并进核心文件」的片段与说明（可选）
```

### `files/` 与 `patches/` 怎么选

| 目录 | 用途 | 安装方式 | 风险 |
| --- | --- | --- | --- |
| `files/` | 全新文件，不覆盖任何现有文件 | 整目录复制 | 低，**优先用** |
| `patches/` | 必须改 `public/api/index.php`、`bin/migrate.php`、`config/config.php` 等 | `INSTALL.md` 里写清楚逐条手工合并 | 高，容易冲突 |

**能只用 `files/` 就别碰 `patches/`。** 官方示例插件 `hello-world` 就是零侵入：只新增 `public/plugins/hello/index.html`，不建表、不改核心文件、不用跑迁移，装上访问 `/plugins/hello/` 就能看到效果。

::: warning 绝对不要做
- 把整个 `public/api/index.php`、`config/config.php` 放进 `files/` 直接覆盖 —— 用户升级系统或装了别的插件就会被你的旧版本覆盖。
- 包里附带 `data/shop.sqlite`、`config/config.php` 的真实内容、密钥、`.git/`。
- 在片段里写 `exit` / `die`、远程上报、外链脚本。
:::

## ② 写清楚 `plugin.json` 与 `INSTALL.md`

`plugin.json` 字段（[索引仓库](https://github.com/yulancloud/plugins) 有完整说明）：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✅ | 小写英文 + 连字符，全市场唯一 |
| `name` / `version` / `author` | ✅ | 显示名、语义化版本、作者 |
| `description` | ✅ | 一句话说清加了什么功能，40–80 字 |
| `category` | ✅ | 必须是市场支持的分类（示例 / 工具 / 前台展示 / 后台增强 / 支付发货 / 主题） |
| `download` | ✅ | **zip 公开直链**，无需登录即可下载 |
| `requires` | ✅ | 兼容的系统版本，如 `>=1.1.0` |
| `icon` / `homepage` / `tags` / `docs` / `build` / `updated` / `size` | | 展示用信息 |

`INSTALL.md` 请按「**第一次装插件的人**」的标准写，至少包含：

1. 适用版本与环境
2. **备份命令**（`config/` 与 `data/shop.sqlite`）
3. 解压后的目录结构
4. 复制 `files/` 的准确路径（说明不要多套一层目录）
5. 是否要跑 `php bin/migrate.php`、是否要合并 `patches/`、是否要 bump `?v=`
6. 怎么验证（`/api/health` + 新页面 + 原功能回归）
7. 卸载与回滚步骤
8. 常见问题表

## ③ 打包并把 zip 放到 GitHub

在插件仓库根目录执行：

```bash
./pack.sh        # 生成 <id>-v<version>.zip，包内根目录为插件 id
```

然后把 zip 上传到**你自己的 GitHub 仓库**，两种都行：

- **Release 资产**（推荐）：`https://github.com/你的ID/仓库/releases/download/v1.0.0/xxx-v1.0.0.zip`
- **仓库内文件**：用 `https://raw.githubusercontent.com/你的ID/仓库/main/packages/xxx-v1.0.0.zip`

::: warning
链接必须是**公开可直链**的。私有仓库、需要登录才能下载的链接、网盘跳转都不行。
:::

本地自检：

```bash
python3 -m json.tool plugin.json >/dev/null && echo "plugin.json OK"
unzip -l xxx-v1.0.0.zip        # 确认含 plugin.json / INSTALL.md / files/
```

最重要的是：**拿一套干净的 v1.1.0 解压，按你写的 `INSTALL.md` 从头装一遍、再卸一遍**。自己没走通的步骤，别人一定也走不通。

## ④ 提交到市场

在 [插件市场](https://yulancloud.us.ci/market/) 点 **「上传插件」**（或直接打开 [提交表单](https://github.com/yulancloud/plugins/issues/new?template=plugin-submit.yml)），填写：

插件名称、ID、版本号、作者、分类、简介、**zip 公开直链**、插件仓库、图标直链（可选）、兼容版本、安装要点，并勾选四项自查。

提交后会生成一个带 `plugin-submission` 标签的 Issue。维护者按下面的清单审核，通过后把条目合并进 [plugins.json](https://github.com/yulancloud/plugins/blob/main/plugins.json)，市场页下次加载自动出现。

### 审核清单

- [ ] zip 能公开下载，解压后含 `plugin.json` + `INSTALL.md` + `files/`
- [ ] `plugin.json` 合法、`id` 不重复、版本号与文件名一致
- [ ] `INSTALL.md` 写清备份、复制、迁移、bump、验证、卸载
- [ ] 包内无数据库文件、配置文件、密钥、`.git/`
- [ ] 代码无远程上报 / 外链脚本 / 混淆，与描述的功能一致
- [ ] 已在干净的 v1.1.0 上实测安装与卸载

## 常见问题

| 问题 | 回答 |
| --- | --- |
| 我的插件要建表，可以吗？ | 可以。照 [04 数据库与迁移](/developer/custom/database) 改 `database/schema.sql` 和 `bin/migrate.php`，片段放 `patches/`，并在 `INSTALL.md` 里写清「跑一次 `php bin/migrate.php`」。 |
| 插件能改后台菜单吗？ | 可以，见 [06 后台管理扩展](/developer/custom/admin)。注意 `public/admin/index.html` 和 `admin/assets/views.js` 属于核心文件，只放片段不要整体覆盖。 |
| 更新版本怎么发？ | 打新 zip、改 `version`，再提一次表单（或提 PR 改 `plugins.json` 对应条目），把 `download` 换成新链接。 |
| 不想公开源码行吗？ | 不行。市场要求插件本体在公开 GitHub 仓库，用户装之前要能看到代码。 |
| 提交后多久上架？ | 人工审核，通过后合并索引即生效，市场页没有缓存延迟问题。 |

## 相关链接

- [插件市场](https://yulancloud.us.ci/market/)
- [如何安装插件（小白图文版）](/plugins/install)
- [插件开发模板仓库](https://github.com/yulancloud/plugin-template)（`Use this template`）
- [插件索引仓库](https://github.com/yulancloud/plugins)（`plugins.json` 与审核规范）
- [提交表单](https://github.com/yulancloud/plugins/issues/new?template=plugin-submit.yml)
- [功能自定义 · 学习路线](/developer/custom)（怎么做新功能）

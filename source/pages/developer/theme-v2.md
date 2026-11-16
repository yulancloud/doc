---
title: v2 插件主题教程（后台上传）
---

# v2 插件主题教程（后台上传）

> 适用于 **v1.2.0 及以上**。这是制作主题 / 插件的**更简单方式**：写好一个 zip，在后台上传即装，不用手改 CSS、不用 bump 版本号、升级也不会丢。
> 老站或需要深度定制的，仍可用 [v1 插件主题教程（手动改 CSS）](/developer/theme)，两者并存。

## 和 v1 相比，简单在哪

| 环节 | v1（手动改 CSS） | v2（后台上传） |
| --- | --- | --- |
| 改哪里 | 直接改 `public/assets/style.css`（压缩过的单行文件） | 新建自己的 `theme.css`，只写要覆盖的变量 |
| 配色 | 亮 / 暗两套手动配，还要注意选择器优先级 | 写 `:root{}` 与 `:root[data-theme=dark]{}`，服务端自动提升选择器特异性 |
| 版本号 | 全站 HTML 的 `?v=` 都要手动 bump | 不用碰，主题 CSS 由 `/api/theme.css` 动态输出 |
| 升级 | Release 整目录覆盖会冲掉你的修改 | 主题原件存在 `data/extensions/`，升级覆盖不丢 |
| 回滚 | 手动备份、手动还原 | 后台一键停用 / 卸载 / 切换 |

## 一、主题包结构

一个主题 zip 长这样（`ocean-green` 换成你自己的 id，只能用小写字母、数字和连字符）：

```text
ocean-green.zip
└── ocean-green/
    ├── plugin.json     ← 主题信息（必须有）
    ├── theme.css       ← 变量覆盖（必须有）
    └── README.md       ← 可选，说明文档
```

### `plugin.json`

```json
{
  "id": "ocean-green",
  "name": "墨绿主题",
  "version": "1.0.0",
  "author": "你的名字",
  "description": "把默认蓝换成墨绿，亮/暗两套一起换",
  "type": "theme",
  "requires": ">=1.2.0"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✅ | 小写字母 / 数字 / 连字符，全局唯一；也是启用、卸载时的标识 |
| `name` | ✅ | 后台列表里显示的名字 |
| `version` | ✅ | 你的主题版本，同 id 再上传视为更新 |
| `type` | ✅ | 主题固定写 `theme`；插件写 `plugin` |
| `requires` | 否 | 兼容的系统版本，写 `>=1.2.0` |
| `author` / `description` | 否 | 展示用 |

### `theme.css`（核心）

**只写要覆盖的 CSS 变量**，不用复制整份 `style.css`。改品牌主色就是这三个变量一组，亮 / 暗各一套：

```css
/* 墨绿主题：只写变量覆盖 */
:root {
  --accent: #1f6f4f;
  --accent-soft: #e6f2ec;
  --accent-ink: #17563c;
}
:root[data-theme=dark] {
  --accent: #7ec6a2;
  --accent-soft: #152b22;
  --accent-ink: #a9dcc0;
}
```

::: tip 暗色选择器不用纠结
系统自带的暗色变量写在 `:root[data-theme=dark]`（特异性 0,2,0）。你在 `theme.css` 里写 `[data-theme=dark]`（0,1,0）会被压过去，表现是「亮色换了、切暗色又变回默认蓝」。**服务端会自动把你的暗色选择器提升成 `:root[data-theme=dark]`**，所以两种写法都行；推荐直接写 `:root[data-theme=dark]`。
:::

三个变量要配套：`--accent` 是按钮/链接主色，`--accent-soft` 是浅底（徽章、选中背景），`--accent-ink` 是压在浅底上的文字色。亮暗两套都改才算换干净。可用变量清单见 [v1 插件主题教程](/developer/theme) 的「变量清单」一节。

## 二、打包

在项目之外的任意目录，把上面三个文件放进 `ocean-green/` 再压成 zip：

```bash
cd 你的打包目录
zip -r ocean-green-v1.0.0.zip ocean-green/
```

> zip 顶层必须是一个文件夹（里面直接是 `plugin.json` / `theme.css`），不要多套一层，也不要把整个打包目录压进去。

## 三、后台上传并启用

1. 用管理员登录后台 → 左侧「系统」组 → **「主题与插件」**
2. 点「上传」，选择刚做好的 zip
3. 上传成功后主题出现在「主题」列表，点 **「设为当前」** 立即生效
4. 打开商城前台 / 后台，确认主色已变；切到暗色再看一遍
5. `Ctrl+F5` 强刷一次（清浏览器缓存）

后台同一页还能：停用、卸载、重新上传同 id 覆盖更新。原件存 `data/extensions/`，`public/` 下只是运行时副本，卸载即干净移除。

## 四、cool 插件包怎么打包

插件与主题结构类似，只是把静态资源放进 `files/`：

```text
notice-board.zip
└── notice-board/
    ├── plugin.json       ← "type":"plugin"，可加 "entry":"index.html"
    ├── files/
    │   └── index.html    ← 要装到 /plugins/notice-board/ 的页面
    └── INSTALL.md
```

上传后 `files/` 里的资源装到 `public/plugins/<id>/`，访问 `/plugins/<id>/` 即可。零侵入、不建表、不改核心文件。做完后可到 [插件市场](https://yulancloud.us.ci/market/) 点「上传插件」分享，步骤见 [如何上传插件到市场](/plugins/submit)。

## 五、安全限制（会被拒绝的包）

后台会严格校验，以下情况装不上，做包时留意：

- zip 含 **`.php` / `.jsp` / `.exe` / `.sh`** 等脚本或可执行后缀
- **路径穿越**（`../`）、**隐藏文件**（`.env` / `.htaccess`）、**符号链接**
- ZIP64、分卷、加密、带数据描述符的压缩包
- 超过 **2 MB** 单包 / **200 个文件** / **512 KB 单文件** / **4 MB** 解压总量
- `theme.css` 里的 `@import`、`javascript:`、`expression`、HTML 标签会被过滤

## 排障

| 现象 | 原因 |
| --- | --- |
| 上传报「包内含有不允许的文件类型」 | 包里混进了脚本 / 可执行文件，删掉再压 |
| 亮色变了、暗色没变 | 暗色选择器被默认样式压过；写 `:root[data-theme=dark]` 或依赖服务端自动提升 |
| 设为主色但页面没变化 | 浏览器缓存；`Ctrl+F5` 强刷 |
| 访问 `/plugins/<id>/` 404 | 运行目录要指向 `public/`；确认 `files/` 结构没多套一层 |
| 想恢复默认 | 后台「卸载」主题，或停用后系统回退默认配色 |

## 官方功能插件（v1.2.1 起）

v1.2.1 起，[插件市场](https://yulancloud.us.ci/market/) 提供三款**装上就生效**的官方功能插件。它们的实现已内置在系统底座里，插件包负责"激活入口"，所以不装就不会出现菜单，装了立刻可用：

| 插件 | 装上后 | 要点 |
| --- | --- | --- |
| **SMTP 邮箱验证码登录** | 后台多「邮件服务器配置」，登录页多「邮箱验证码」标签 | 先配 SMTP（支持 STARTTLS/SSL/免认证 relay）与允许登录的邮箱，再到「多账号管理」给管理员绑定同一邮箱 |
| **登录页深色模式** | 登录页右上角多明暗切换按钮 | 纯前端，选择记在本地 |
| **多管理员账号** | 后台多「多账号管理」 | 仅店主可增删管理员，一次性密码只显示一次 |

安装方式与普通插件相同：到插件市场下载 zip → 后台「主题与插件」上传 → 自动启用。三款都需系统 **≥ v1.2.1**（`/api/health` 的 `build` 为 `20261116e`）；不装不出现，可随时停用 / 卸载。详见 [版本更新](/changelog)。

## 相关链接

- [v1 插件主题教程（手动改 CSS）](/developer/theme)
- [如何安装插件（小白）](/plugins/install)
- [如何上传插件到市场](/plugins/submit)
- [插件市场](https://yulancloud.us.ci/market/) / [插件开发模板仓库](https://github.com/yulancloud/plugin-template)
- [版本更新](/changelog)

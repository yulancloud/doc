---
title: 版本更新
---

# 版本更新

这里记录每个版本相对上一版的变化与升级要点。升级前请先备份 `data/shop.sqlite` 与 `config/.env`。

## v1.1.0

前台文案与商品信息同步修复版。系统包精简为约 0.6 MB（不再随包附带 Windows APP 的 exe 与源码，exe 仍到 [Windows APP 仓库](https://github.com/yulancloud/yulancloudRubik-Windows/releases) 下载）。

### 1）商品「缺点 / 已知不足」可后台逐件填写

- 后台「编辑商品」新增多行输入框，每行一条
- 前台商品详情页「已知不足」栏改为读取后台数据逐条展示；留空则整栏自动隐藏
- 旧库升级后由 `php bin/migrate.php` 自动补 `products.flaws` 列；未跑迁移时保存商品也不会报错
- 详见 [商品管理](/admin/products)

### 2）分类标签不再写死，后台改名前台即时同步

顶栏、页脚、商品详情页面包屑统一由 `/api/catalog` 的分类数据渲染。后台「分类管理」改名、隐藏、新增分类，前台全部跟着变。旧版顶栏写死了「家居 / 桌面 / 随行」三个链接。

### 3）首页文案后台改了真正生效

- 「商品区标题」此前完全没有绑定后台设置，现已接入
- 修复打字动画时序：旧版动画结束时会用 HTML 里写死的旧文案覆盖后台新值，现在主标题、副标题、商品区标题都会停在后台设置的文字上
- 涉及「站点名称 / 英文名 / 首页眉标 / 首页主标题 / 首页副标题 / 商品区标题」等设置项
- 详见 [站点设置与其他](/admin/settings)

::: warning 升级后必须强刷一次
静态资源版本号已升到 `v=20261115a`。升级后请 **Ctrl+F5** 强刷（或开无痕窗口），否则浏览器可能仍加载旧的 JS，表现为「后台改了前台没变」。
:::

### 健康检查

```bash
curl https://你的域名/api/health
```

`build` 应为 `20261115a`。若仍是旧值，说明服务器跑的还是旧代码或 CDN / 浏览器缓存未刷新。

## v1.0.0

首个正式版本：包含「欲蓝财务魔方」产品类型（`yulan`）、商品级服务器配置、商品类型选择框，以及 64 项端到端测试。Windows 端建号 APP 独立维护在 yulancloudRubik-Windows 仓库。

## 升级步骤（通用）

```text
① 备份整个 data/ 与 config/ 目录（含 .env 与 installed.lock）
      ↓
② 上传新包覆盖程序文件（data/ 与整个 config/ 都不要删）
      ↓
③ php bin/migrate.php      ← 幂等，自动补列并修复旧库
      ↓
④ Ctrl+F5 清缓存
      ↓
⑤ curl /api/health 确认 build 版本号
```

::: warning
**`config/` 文件夹整个都不能删。** 里面有 `config/installed.lock` 安装锁，删掉后站点会被判定为「未安装」：`/install` 安装向导重新出现、全站 API 返回 503「站点尚未安装」，`config/.env` 里的站点地址与支付参数也一起丢失。只覆盖程序文件即可，升级包已排除这些文件。详见 [安装与升级](/deploy/install)。
:::

详见 [安装与升级](/deploy/install) 与 [部署与迁移故障](/troubleshoot/deploy)。

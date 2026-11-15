---
title: 自定义域名、HTTPS 与文档站发布故障
---

# 自定义域名、HTTPS 与文档站发布故障

这一页既讲 GitHub Pages 绑自定义域名的坑，也讲文档站（Valaxy 单页应用）自身发布时踩过的坑。

## `Site not found · GitHub Pages` / There isn't a GitHub Pages site here

**症状**：域名 DNS 已经解析成功、能连上服务器，但打开就是 GitHub 官方的 404 页。

**原因**：GitHub Pages 按请求的 `Host` 头决定把流量交给哪个仓库的站点。DNS 只是把请求送到了 GitHub，**仓库里还没登记这个域名**，GitHub 不认识这个 Host 就回 404。

**处理**：仓库 `Settings → Pages → Custom domain` 填入完整域名并保存（也可用 API：`PUT /repos/{owner}/{repo}/pages` 带 `cname`）。保存后状态会先变成 `building`，等 `built` 即可。

> 判断依据：`curl -sS https://域名/` 若返回 "There isn't a GitHub Pages site here"，就是没绑定；若返回白屏或资源 404，见下一条。

## 绑定后白屏 / JS 全部 404

**原因**：站点原本按项目页 `yulancloud.github.io/doc/` 的子路径构建，构建基路径是 `/doc/`，HTML 里资源写成 `/doc/assets/...`。换成自定义域名后站点位于**域名根**，这些路径自然 404。

**处理**：把构建基路径改为根再重新发布：

```ts
// valaxy.config.ts
siteConfig: { url: 'https://doc.yulancloud.us.ci', lang: 'zh-CN' },
vite: { base: '/' },
```

自查：构建产物 `index.html` 里应是 `src="/assets/..."`，且 `grep -c '/doc/assets/' index.html` 为 0。

**顺序很重要**：不要提前把改成根路径的构建推上去——DNS 还没绑定 / 未生效时，旧地址 `yulancloud.github.io/doc` 也会因资源路径变化而白屏。正确顺序是**先确认 DNS 生效 → 绑定 Custom domain → 立刻推送新构建**。

## CNAME 文件被覆盖

GitHub 绑定自定义域名时会在仓库根写一个 `CNAME` 文件（内容就是域名）。但静态站点生成器每次部署会清空输出目录，把它删掉，导致域名绑定丢失。

**处理**：把 `CNAME` 纳入源码或让部署脚本每次自动写入（本项目的 `upload_dist_fast.py` 已自动写）。部署后确认：

```bash
gh api repos/yulancloud/doc/contents/CNAME
```

## `The certificate does not exist yet` / Enforce HTTPS 一直是灰的

开启 `Enforce HTTPS` 时 API 返回这个错误，说明 **GitHub 还没为该域名签发证书**。此时 Pages 显示的 url 仍是 `http://`。

最常见的元凶是 **Cloudflare 橙云代理（Proxied / 小云朵）**：

- CNAME 被 Cloudflare 代理后，外部解析到的是 Cloudflare 的 IP（如 `104.21.x` / `172.67.x`），而不是 GitHub Pages 的 `185.199.108-111.153`
- GitHub 做 DNS 校验和 Let's Encrypt 域名验证时**看不到指向 `用户名.github.io` 的 CNAME**，证书就签不下来

**处理（推荐）**：在 Cloudflare 把该 CNAME 记录的代理状态点成 **DNS only（灰云）**，其他都不用动。等几分钟到 1 小时，证书自动签好后即可开启 `Enforce HTTPS`。文档站流量不大，灰云完全够用。

**想保留橙云**：把 Cloudflare 的 **SSL/TLS 加密模式设为 Full**（不要用 Flexible）。Flexible 下 CF 用 HTTP 回源，而 GitHub 强制 HTTPS 时会 301，容易形成**无限重定向循环**。但橙云下 GitHub 侧证书可能长期签不下来，`Enforce HTTPS` 会一直是灰的——浏览器到 CF 这段的 HTTPS 由 Cloudflare 边缘证书承担，不影响阅读，但拿不到 GitHub 原生证书。

> 顺带一提：橙云代理时，`https://` 能正常返回 200 是 Cloudflare 边缘证书在起作用，不代表 GitHub 证书已签发。用 Pages API 的 `https_enforced` 字段判断才是准的。

## 域名所有权验证（TXT）

GitHub 现在要求在**账号级**验证域名所有权，防域名被别人抢绑。注意是头像 → Settings → Pages（**Profile 设置，不是仓库设置**）：

1. `Add a domain` 填入**父域**（如 `yulancloud.us.ci`），验证后其直接子域（`doc.`）自动受保护
2. GitHub 给出一条 TXT 记录，名字形如 `_github-pages-challenge-用户名.域名`，值是一串随机码——**以页面显示为准，不要自己拼**
3. 在 DNS 服务商处添加该 TXT，回 GitHub 点 `Verify`
4. **保留这条 TXT**，删掉会失去验证状态

免费子域名（如 DNSHE 的 `us.ci`）同样支持 TXT 记录。把 NS 委派到 Cloudflare 后，CNAME 与 TXT 都在同一个面板里加。

## 绑定成功后的正常现象

- 原地址 `yulancloud.github.io/doc/` 会 **301 跳转**到自定义域名，收藏夹请换新的
- Pages 状态短暂显示 `building`，属正常
- 本站是 **Vue 单页应用**，用抓取工具 / 预览器读不到正文静态文本是正常现象，真实浏览器打开能看到完整内容

## 子页面分享链接 404

Valaxy 只做首页 SSG，其余页面走客户端路由。GitHub Pages 对 `/deploy/nginx/` 这类深链会返回 404，虽然 `404.html` 兜底能让浏览器渲染 SPA，但**分享链接、SEO 都不友好**（返回的是 404 状态）。

**处理**：为每个路由生成一份静态 `index.html`（本项目部署脚本已自动完成），再加 `.nojekyll` 避免 Jekyll 处理。验证方式是逐个深链 `curl -o /dev/null -w "%{http_code}"`，应全部 200。

## 「编辑此页」跳 404

主题默认的编辑链接指向 **Valaxy 框架官方仓库**，点进去当然是 404。

**处理**：在 `valaxy.config.ts` 里把 `editLink.pattern` 指向自己的仓库，并把 Markdown 源码**递归**留档到仓库，保证子目录页面也能跳到对应文件：

```ts
editLink: {
  pattern: 'https://github.com/yulancloud/doc/edit/main/source/:path',
  text: '编辑本页',
},
```

注意 `:path` 的实际取值是 `pages/deploy/nginx.md` 这类路径，所以留档目录要写成 `source/pages/...`，否则链接仍会 404。

## 站内链接在子目录页跳错

Markdown 里写相对链接（`./deploy/nginx`、`../faq`），构建后原样输出，浏览器按**当前页面 URL**解析，在子目录页里就会指到错误地址。

**处理**：站内链接统一写成**不带基路径的绝对路径**（`/deploy/nginx`）。Valaxy 渲染时会自动补上 base，且构建时会做**死链检查**——链接写错会直接构建失败，等于免费校验了一遍。不要自己拼 `/doc/` 前缀。

## 没有手机版 / 界面是英文

生成的 `index.html` 缺 `<meta name="viewport">` 时，手机浏览器按 980px 桌面宽度缩放，看起来像"没有手机版"；主题 CSS 本身是响应式的（640 / 768 / 960 / 1280 断点），只是被这个缺失的 meta 废掉了。

**处理**：在项目根放自定义 `index.html` 模板注入 viewport，同时把语言设为 `zh-CN`（界面文案、「编辑本页」等按钮随之变中文）。全量上传时记得保留 `404.html` 与 `.nojekyll`。

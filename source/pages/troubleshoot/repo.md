---
title: GitHub 仓库与发布故障
---

# GitHub 仓库与发布故障

这一页面向**维护者**：往 GitHub 传代码、发 Release、绑 Pages 时踩过的坑。三个仓库的分工见 [首页](/)。

## `git push` 403 / `Resource not accessible by personal access token`

**先分清是权限问题还是认证通道问题**，这两者表现一样但解法完全不同。

### 细粒度 Token（fine-grained PAT）没开代码写权限

现象：

- `gh api repos/... -q '.permissions.push'` 显示 `true`，看起来"有写权限"
- 但 `git push` 与 `git/blobs` 写接口都 403，报 `Resource not accessible by personal access token`
- 建 issue 却成功

原因：`perm_push=true` 只说明**可读/API 层面**允许，细粒度 token 实际没勾 `Contents: Read and Write`。GitHub 上传代码必须这一项，否则 `git push` 和 API 写文件都会失败。

处理（二选一）：

1. 编辑该细粒度 token → `Repository permissions → Contents` 设为 **Read and Write**，Repository access 包含目标仓库
2. 改用 **classic PAT（`ghp_` 开头）只勾 `repo`**——最省事

> 微调细粒度 token 权限通常不改变 token 值；若 GitHub 要求重新生成，记得更新本地凭据。

### 认证用户名写错

把 token 直接内嵌 URL 时，若用组织/账号名当用户名会 403。GitHub 的 git over HTTPS 要用 **`x-access-token`** 作为用户名：

```bash
git push "https://x-access-token:TOKEN@github.com/OWNER/REPO.git" main
```

> 判断账号是个人还是组织：`gh api users/OWNER -q '.type'`。

## git 报 TLS 连接中断，但 `gh` / `gh api` 正常

**现象**：`git push`、`git fetch`、`git ls-remote` 甚至 `git clone` 都在握手阶段报 "连接非正常终止"，而 `gh api` 读写一切正常。

**原因**：某些受限网络 / 沙箱环境里，出网需要经过带鉴权的代理，而 `git`（GnuTLS）无法提供代理凭据，HTTPS 直连被掐断；`gh` 走的是另一条已配置好的通道。

**处理**：绕开 git，改用 **GitHub Git Database API**（`gh api` 或 `urllib` + Bearer token）：

1. 每个文件 `POST /git/blobs` 拿 sha
2. 一次 `POST /git/trees` 建树
3. `POST /git/commits` 建提交
4. `PATCH /git/refs/heads/main` 更新分支指向

本项目 `/workspace/upload_repo.py`、`/workspace/upload_dist_fast.py` 就是这条通道的实现，二进制文件用 base64 编码传 blob。

### 两个建树细节

- **删除项**：在 `base_tree` 上做增量更新时，删除条目必须带完整的 `mode` / `type` / `sha: null`，否则返回 422。更稳的做法是**一次全量建树**（不带 `base_tree`），未变文件直接复用远程 blob SHA，天然完成删除，也不用重复上传。
- **增量**：先 `GET /git/trees/main?recursive=1` 拿远程 SHA 表，与本地 `git blob sha` 对比，只上传变化文件。全量 107 个文件逐个建 blob 要上百次请求；改成增量后无变化时 2.8 秒直接跳过。

### 大二进制走 Release

`git/blobs` 对几 MB 的二进制不稳。`yulan_cube_app.exe`（约 6.4 MB）走 `gh release create` 作为 Release 附件上传，不进源码树。

## `gh api repos -X POST` 返回 404

创建仓库的端点是 **`POST /user/repos`**（个人账号）或 `POST /orgs/{org}/repos`（组织），不是 `POST /repos`——后者是无效端点，直接 404。

```bash
gh api user/repos -X POST -f name=doc -f description="欲蓝财务 官方文档" \
  -f homepage="https://yulancloud.github.io/doc" -F public=true -F auto_init=true
```

## 上传到公开仓库前：先审计敏感文件

代码一 push 就收不回来。曾差点把**含真实订单、账号、密码哈希的 `data/shop.sqlite`** 传上去。上传前务必确认 `.gitignore` 覆盖：

| 类别 | 例子 |
| --- | --- |
| 数据库与备份 | `data/shop.sqlite*`、`data/*.bak-*` |
| 密钥与凭据 | `config/.env`、各类 token |
| 安装状态 | `config/installed.lock` |
| 运行产生的文件 | `data/yulan_mock_queue.jsonl`、`windows_app/logs/*` |
| 临时文件 | `*.pyc`、`__pycache__/`、编辑器备份 |

**校验方法**：`git add -A` 后执行

```bash
git diff --cached --name-only | grep -E "shop\.sqlite|installed\.lock|\.bak-|yulan_cube\.log"
```

应为空。推送后再用 `gh api repos/OWNER/REPO/git/trees/main?recursive=1 -q '.tree[].path'` 复查一遍远程树。

> `config/config.php` 从环境变量读取、默认空值，不含真实密钥，可以安全入库。给客户演示或截图前，同样要抹掉 `.env`、数据库、后台账号和 token。

## 用 API 改仓库内容

- **删除整个目录**（例如主仓库不再放 `windows_app/`）：取当前 tree → 过滤掉该前缀的路径 → 全量建树 → 提交 → 更新 ref。
- **非空的远程仓库**：推送前先 `ls-remote` / `git ls-tree` 看有没有初始提交（常见是一个 `LICENSE`）。有就先 fetch 再 rebase 接到它上面，别直接 force。
- **`ls-remote` 里出现 `main` 不代表你推成功了**：公开仓库读取不需要鉴权，`main` 可能是它原本就有的。要对比本地与远程的 **commit sha 是否一致**才算数。

## Release 与仓库分工

| 仓库 | 内容 |
| --- | --- |
| `yulancloud/yulancloud` | 商城系统源码 + `v1.0.0` Release（附 `yulan-shop.zip` 系统包 + Nginx 运行目录 / 伪静态说明） |
| `yulancloud/yulancloudRubik-Windows` | Windows APP 源码与 `v1.0` Release（附 `yulan_cube_app.exe`） |
| `yulancloud/doc` | 文档站构建产物 + Markdown 源码留档（`source/pages/`） |

Release 说明里要写清**运行目录设 `public/`** 和 **Nginx 伪静态规则**，否则客户下载包后照旧配置会踩前面那些坑。见 [部署总览](/deploy) 与 [上线自检清单](/deploy/checklist)。

## 测试写权限时的副作用

用「建一个 issue / 建一个临时文件」来探测 token 权限，会留下真实对象。细粒度 token 若只有建 issue 权限、没有删改权限，误建的 issue 只能等拿到写权限后清理。探测完记得检查并清理。

## 常用校验命令

```bash
# 线上代码版本
curl https://你的域名/api/health

# 仓库文件数 / 敏感文件复查
gh api repos/OWNER/REPO/git/trees/main?recursive=1 -q '.tree[].path' | wc -l
gh api repos/OWNER/REPO/git/trees/main?recursive=1 -q '.tree[].path' | grep -iE 'sqlite|\.env|installed|secret|token|password'

# Release 资产
gh api repos/OWNER/REPO/releases -q '.[] | .tag_name + " -> " + (.assets[].name)'
```

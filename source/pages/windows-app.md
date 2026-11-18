---
title: Windows APP
---

# Windows APP（建号端）

欲蓝商品下单后，由这台 Windows APP 在目标服务器上自动建号。自 **v1.3.0** 起改为**官方 Python 脚本连同完整运行环境打包的单文件 exe**——双击即用，无需安装 Python 或任何运行时，也不会再出现「已是管理员却闪退」的问题。

## 一、下载

前往 [yulancloudRubik-Windows 仓库 Release](https://github.com/yulancloud/yulancloudRubik-Windows/releases/tag/v1.3.0) 下载 `yulan_cube_app.exe`（约 7.4 MB）。同目录建议放一份 `yulan_cube_config.json` 与 `run_as_admin.bat`。

## 二、运行（双击即提权）

- 双击 `yulan_cube_app.exe`：exe 内嵌 **UAC 提权清单**，Windows 会弹出「是否允许此应用对设备进行更改」，点「是」即以管理员权限运行。
- 备用：`run_as_admin.bat` 右键「以管理员身份运行」。
- 也可命令行：`yulan_cube_app.exe --config yulan_cube_config.json`。

APP 仅允许**管理员账号**运行，其他用户完全看不到运行日志（日志 ACL 隔离为 SYSTEM / Administrators）。v1.3 采用多重管理员判定（`IsUserAnAdmin` + `CheckTokenMembership` 管理员组），域账户 / runas / 计划任务 / 关闭 UAC / 内置 Administrator 均可正确识别。

::: tip 配置文件与日志位置
配置文件固定读取 exe 同目录的 `yulan_cube_config.json`（首次运行若不存在会自动生成），日志写在 exe 同目录的 `logs\yulan_cube.log`。**升级只需覆盖 exe，配置不会丢。**
:::

## 三、配置示例

`yulan_cube_config.json`：

```json
{
  "listen_host": "127.0.0.1",
  "listen_port": 8088,
  "token": "你的服务端通信令牌",
  "default_role": "admin",
  "admin_products": ["yulan"],
  "admin_group_name": "yulan-admins",
  "rdp_group_name": "yulan-rdp",
  "server_ip": "10.0.0.5",
  "use_powershell": false
}
```

::: warning
务必将 `listen_host` 设为 `127.0.0.1` 或仅内网可达地址，**不要**暴露到公网——通信为明文 HTTP，公网暴露会泄露令牌与建号口令。
:::

## 四、接口（供商城服务端调用）

| 接口 | 说明 |
| --- | --- |
| `GET /api/v1/health` | 健康检查，返回版本与监听状态（`version` 应为 `1.3.0`） |
| `POST /api/v1/create-user` | 建号（Header `Authorization: Bearer <token>`） |
| `POST /api/v1/update-user` | 强制改用户名 / 密码（配合商城控制台改号） |

## 五、特性

- 单文件 exe（约 7.4 MB），**自带 Python 3.11 运行时，免安装任何环境**
- UAC 提权清单 + 多重管理员判定，从根源避免「误判非管理员闪退」
- 英文 Windows 下中文日志零崩溃（UTF-8 输出加固）
- 配置 / 日志固定在 exe 同目录，升级只覆盖 exe
- 日志隔离：仅 SYSTEM / Administrators 可读；口令与 Token 绝不落日志
- 令牌常量时间比较，防时序攻击；建号命令参数化执行，无命令注入

## 六、相关文档

- 产品类型与交付流程 → [欲蓝财务魔方](/yulan)
- 商品级服务器 / 全局默认怎么填 → [商品管理](/admin/products) 与 [站点设置与其他](/admin/settings)
- 建号失败导致整单回滚 → [订单与发货](/admin/orders)
- 首次部署与迁移 → [安装与升级](/deploy/install)
- 明文通信的安全边界 → [常见问题](/faq)

## 相关排查

APP 连不通、提示需要管理员、建号失败、日志明文口令等问题的处理，见 [Windows APP 故障](/troubleshoot/app)。

---
title: Windows APP
---

# Windows APP（建号端）

欲蓝商品下单后，由这台 Windows APP 在目标服务器上自动建号。它是用 Go 编译的**单文件 exe**，无需安装 Python 或任何运行时。

## 一、下载

前往 [yulancloudRubik-Windows 仓库 Release](https://github.com/yulancloud/yulancloudRubik-Windows/releases) 下载 `yulan_cube_app.exe`。

## 二、以管理员运行

APP 仅允许**管理员账号**运行，其他用户完全看不到运行日志（日志 ACL 隔离为 SYSTEM / Administrators）。双击 `run_as_admin.bat` 会自动触发 UAC 提权；也可右键 exe →「以管理员身份运行」。

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
| `GET /api/v1/health` | 健康检查，返回版本与监听状态 |
| `POST /api/v1/create-user` | 建号（Header `Authorization: Bearer <token>`） |

## 五、特性

- 单文件 exe，免环境（Go 编译，6.7MB）
- 管理员门禁：非管理员无法运行
- 日志隔离：运行日志仅 SYSTEM / Administrators 可读
- 自动 UAC 提权（`run_as_admin.bat`）
- 令牌常量时间比较，防时序攻击
- 建号命令参数化执行（`net user`），无命令注入

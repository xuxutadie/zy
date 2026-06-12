# 贵阳新中考志愿填报模拟器

这是一个本地可运行的贵阳中考志愿填报模拟工具，包含：

- 家长端登录、注册、测算表单
- 统招路径和配额路径模拟
- 数据依据、学校库和公开来源展示
- 独立后台管理页，用于查看、跟进、导出和删除用户测算表单

## 运行方式

```powershell
python server.py
```

默认访问地址：

- 主页面：http://localhost:8787/
- 后台：http://localhost:8787/admin

## Zeabur 部署

项目已经包含 `Dockerfile`，Zeabur 会按 Python 后端容器运行 `server.py`。

本地等价启动命令为：

```bash
python server.py
```

部署时需要在 Zeabur 服务的环境变量中配置：

```text
DATABASE_URL=你的 PostgreSQL 连接字符串
GYZK_ADMIN_PHONES=18685442407
```

说明：

- Zeabur 会自动注入 `PORT`，服务端会按平台端口启动。
- 服务监听地址默认为 `0.0.0.0`，适合云平台访问。
- 线上推荐使用 PostgreSQL。服务检测到 `DATABASE_URL` 后会自动使用 PostgreSQL，并在首次启动时初始化用户、验证码、会话、测算表单和后台日志表。
- 本地未配置 `DATABASE_URL` 时会自动回退到 SQLite，文件位于 `server/app.db`，方便本地测试。
- `server/sms_config.json` 不会提交到仓库，短信服务需要在部署环境中单独配置，避免泄露密钥或推送地址。

## 管理员配置

管理员手机号不要写入代码仓库。启动服务前用环境变量配置，多个手机号用英文逗号分隔：

```powershell
$env:GYZK_ADMIN_PHONES="你的管理员手机号"
python server.py
```

管理员用户注册后，服务启动时会根据该环境变量自动标记管理员角色。

## 短信配置

短信配置文件不提交到仓库。需要启用短信时，复制示例文件：

```powershell
Copy-Item server/sms_config.example.json server/sms_config.json
```

然后在 `server/sms_config.json` 中填写短信服务模板编号，并将 `enabled` 改为 `true`。

## 数据说明

前端模拟数据位于：

```text
web/data/2025-simulation.json
```

该数据包包含 2025 官方录取线、招生计划、分数段、往年录取线、控制线、非计分规则、学校地址和公开来源索引等结构化数据。

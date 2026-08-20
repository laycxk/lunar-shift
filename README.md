# Lunar Shift 邮箱登录服务

邮箱 + 密码注册/登录，绑定「同步 ID」实现跨设备账号体系。密码使用 **scrypt 加盐哈希**（Node 内置 crypto，安全存储），账号数据存 COS（`lunar-auth/<email>.json`）。

## API（POST `/auth`）

| action | body | 返回 |
|---|---|---|
| `register` | `{ action, email, pwd }` | `{ ok, syncId, email }` |
| `login` | `{ action, email, pwd }` | `{ ok, syncId, email }` |

- 邮箱格式校验、密码 6-64 位；重复注册返回 409；密码错误 401；未注册 404
- 每次注册生成新的同步 ID，前端用该 ID 走 `/sync` 数据同步

## 部署（已用 CLI 完成，记录备用）

```bash
# 云函数（在 auth 目录内执行）
cd cloud-functions/auth
cloudbase fn deploy auth --runtime Nodejs18.15 --force -e <环境ID>

# HTTP 访问路径
cloudbase routes add -e <环境ID> --data '{"domain":"<默认域名>","routes":[{"path":"/auth","upstreamResourceType":"SCF","upstreamResourceName":"auth"}]}'
```

## 前端

原型「我的 → 登录 / 注册」：

1. 填邮箱 + 密码 → 点「📝 注册」或「🔓 登录」
2. 成功后自动绑定同步 ID，并自动从云端恢复该账号数据
3. 已登录状态显示邮箱与同步 ID，可「退出登录」

## 安全说明

- 密码不以明文存储，仅存 scrypt 加盐哈希（`salt + hash`）
- 传输层走 HTTPS；生产环境建议增加登录限流与审计
- 当前为无 Token 简化版（登录后本地持有 syncId）；正式发布建议接入会话 Token + 过期机制

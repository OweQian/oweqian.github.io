# QLCK（feature_#51）生产部署配置交付版（不含大模型）

适用范围：主前端（React/Vite）+ 管理后台（Vue/Vite）+ Node API（Fastify + Socket.IO）+ PostgreSQL + 上传文件（`/uploads`）。  
约束：不包含任何大模型相关配置与依赖（不配置 `OPENAI_*`）。

---

## 1) 总体架构与端口

- 入口：Nginx（80/443，TLS 终止）
- API：Node（Fastify）监听 `0.0.0.0:5001`（默认）
- Socket.IO：与 API 同端口，路径 `/socket.io/`
- 健康检查：`GET /api/health`
- 上传访问：`/uploads/*` 映射到 `backend-node/uploads/`
- 数据库：PostgreSQL（建议独立实例/托管）

---

## 2) 域名与路由规划（避免冲突）

后端 **Admin API 前缀固定为 `/admin/*`**，因此管理后台静态站点不要使用 `/admin` 作为访问前缀，否则会与 API 冲突。

推荐二选一：

- 方案 A（推荐）：管理后台用子域名  
  - 主站：`https://your-domain.com/`  
  - 管理后台：`https://admin.your-domain.com/`  
  - API：`https://your-domain.com/api/` + `https://your-domain.com/socket.io/`
- 方案 B：管理后台用非 `/admin` 前缀  
  - 主站：`https://your-domain.com/`  
  - 管理后台：`https://your-domain.com/console/`  
  - Admin API：`https://your-domain.com/admin/`（仅 API）

---

## 3) 目录与权限（按现有 CI 目标目录对齐）

建议统一部署根目录：

- `/var/www/qlck/dist/`：主前端静态产物（Vite build 输出）
- `/var/www/qlck/admin-dist/`：管理后台静态产物（建议新增该目录）
- `/var/www/qlck/backend-node/`：后端运行目录
- `/var/www/qlck/backend-node/uploads/`：上传目录（必须持久化）
- `/var/log/qlck/`：应用日志目录（CI 已创建）

权限建议：

- `backend-node/uploads`：运行用户可读写（如 `www-data` 或 `node`）
- 静态目录：Nginx 运行用户可读

---

## 4) 环境变量清单（生产最小集）

### 4.1 主前端（`.env`，构建时注入）

- `VITE_BUILTIN_API_URL`：内置 Node API 基址（Socket.IO 同此地址）
- `VITE_EXTERNAL_API_URL`：外部文件服务/SEAE（如不用可留空或指向实际服务）

示例：

```env
VITE_BUILTIN_API_URL=https://your-domain.com
VITE_EXTERNAL_API_URL=https://file-service.your-domain.com/
```

### 4.2 管理后台（如有独立 .env，按其项目约定注入）

- 若管理后台需要指向 API：建议同样使用 `https://your-domain.com` 作为基址（具体变量名以管理后台代码为准）

### 4.3 后端（`backend-node/.env`）

必填：

```env
DATABASE_URL="postgresql://USER:PASSWORD@PG_HOST:5432/DB_NAME?schema=public"
JWT_SECRET="long-random-secret"
```

建议：

```env
NODE_ENV=production
CORS_ORIGIN="https://your-domain.com"
PORT=5001
```

可选（仅在业务需要时）：

- 阿里云短信：`ALIBABA_CLOUD_ACCESS_KEY_ID`、`ALIBABA_CLOUD_ACCESS_KEY_SECRET`、`ALIYUN_SMS_SIGN_NAME`
- 外部对接（如启用相关能力）：`EXTERNAL_QLKC_URL`、`EXTERNAL_AUTH_URL_PATH`、`EXTERNAL_QLKC_AUTH`

明确不配置（大模型）：

- 不设置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`

---

## 5) Nginx 配置模板

### 5.1 单域名 + 管理后台走 `/console/`（推荐简单落地）

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/qlck/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /console/ {
    alias /var/www/qlck/admin-dist/;
    try_files $uri $uri/ /console/index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:5001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Authorization $http_authorization;
  }

  location /admin/ {
    proxy_pass http://127.0.0.1:5001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Authorization $http_authorization;
  }

  location /socket.io/ {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 60s;
  }

  location /uploads/ {
    alias /var/www/qlck/backend-node/uploads/;
  }
}
```

要点：

- 必须支持 WebSocket（`/socket.io/` 的 Upgrade）
- 必须透传 `Authorization`（后端也支持用 `X-Forwarded-Authorization` / `X-Access-Token` 兜底）

### 5.2 子域名（主站 + admin 子域）时的关键差异

- `admin.your-domain.com` 单独 server 块托管 `/var/www/qlck/admin-dist/`
- API 仍建议通过主域名统一出口（减少跨域与 CORS 复杂度）

---

## 6) 后端启动方式（PM2 / systemd 二选一）

现状注意点（对运维非常关键）：

- 后端当前 `start` 仍是 `tsx src/index.ts`（`tsx` 属于 devDependency）。
- 若严格按 CI 的 `npm ci --production` 安装，将不包含 `tsx`，会导致无法用当前脚本启动。
- 建议：要么安装全量依赖，要么调整为“编译后用 node 运行”。

### 6.1 PM2（与现有 CI 思路一致）

- 需要补齐 `ecosystem.config.cjs`（当前 CI 引用但仓库未包含），或运维侧自行维护该文件。

示例（运维侧维护即可）：

```js
module.exports = {
  apps: [
    {
      name: "qlck-backend",
      cwd: "/var/www/qlck/backend-node",
      script: "node",
      args: "node_modules/tsx/dist/cli.mjs src/index.ts",
      env: {
        NODE_ENV: "production",
        PORT: "5001"
      }
    }
  ]
}
```

如果选择“安装全量依赖”，也可直接用 `npm start`，但需确保 pm2 使用正确 cwd。

### 6.2 systemd（更标准的主机部署）

适用于不想引入 PM2 的场景。核心是指定工作目录与环境文件：

- `WorkingDirectory=/var/www/qlck/backend-node`
- `EnvironmentFile=/var/www/qlck/backend-node/.env`
- ExecStart 按实际启动方式配置（同样要解决 `tsx` 可用性问题）

---

## 7) 数据库与初始化

- 首次部署需要完成：
  - Prisma Client 生成：`npx prisma generate`
  - Schema 同步：`npm run prisma:push`（或使用迁移策略，按你们 DB 规范）
  - 可选 Seed：`npm run prisma:seed`（会创建默认管理员账号，需按安全规范修改默认密码）

生产建议：

- PostgreSQL 开启自动备份（RPO/RTO 由你们标准决定）
- 连接数、慢查询、磁盘告警纳入监控

---

## 8) 发布流程（可直接执行的检查单）

### 8.1 发布前检查

- 服务器已安装：Node.js（建议 20.x）、Nginx、PostgreSQL 客户端工具（可选）、PM2 或 systemd（二选一）
- 已准备好：
  - `/var/www/qlck/backend-node/.env`（含 `DATABASE_URL`、`JWT_SECRET`）
  - `/var/www/qlck/backend-node/uploads/` 已创建并可写
  - Nginx 配置已就绪且 `nginx -t` 通过
- 防火墙/安全组：
  - 对外只开放 80/443
  - 5001 仅本机或内网可访问（由 Nginx 反代）

### 8.2 构建与投放

- 构建主前端：根目录 `npm ci && npm run build`，投放到 `/var/www/qlck/dist/`
- 构建管理后台：`backend-admin-ui/` 下 `npm ci && npm run build`，投放到 `/var/www/qlck/admin-dist/`
- 后端依赖安装：
  - 若继续使用 `tsx`：安装全量依赖（不要 `--production`），或确保 `tsx` 可用
  - 生成 Prisma Client：`npx prisma generate`
- 重启服务：
  - 后端（pm2 或 systemd）
  - Nginx reload

### 8.3 发布后验证

- `GET https://your-domain.com/api/health` 返回 `status=ok`
- 主站可访问、接口可用、Socket.IO 连接正常
- 上传接口/上传目录验证：能上传并通过 `/uploads/...` 访问到文件
- 登录/鉴权验证：生产 `JWT_SECRET` 生效，写接口未授权返回 401（符合后端策略）

---

## 9) 回滚策略

- 静态资源回滚：保留上一版 `dist/`、`admin-dist/` 目录（或使用版本化目录 + Nginx 指向切换）
- 后端回滚：
  - 保留上一版 `backend-node/`（或通过发布包版本化目录）
  - 数据库变更若不可逆，需要提前制定回滚/兼容策略（建议在发布前明确 DB 变更方式）

---

## 10) 已知缺口（需要运维/研发协同确认）

- CI 文件引用 `ecosystem.config.cjs` / `deploy/ecosystem.config.cjs`，但仓库未提供；若继续使用现有 CI，需要补齐或改造 CI。
- 后端启动依赖 `tsx`，而 CI 使用 `npm ci --production` 可能导致线上无法启动；需在“生产启动方式”上做一次统一决策（安装全量依赖 vs 编译后 node 运行）。

如果你告诉我你们最终选择的是「PM2 还是 systemd」以及「管理后台用子域名还是 `/console/`」，我可以把本文再收敛成你们最终形态的“定稿版”（去掉分支选项，只保留一套唯一配置与流程）。
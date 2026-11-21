# 港湾 Git 托管实验

运行 node start-local.ts 启动本地演示，访问 http://127.0.0.1:8080/healthz 检查服务。测试请求使用 Authorization: Bearer local-demo。数据存于内存，重启会清空。

## 技术说明

app.ts 处理 REST、GraphQL 和 MCP 路由，git.ts 处理 Git Smart HTTP。端点、JSON 字段和 Git 协议响应沿用原有格式。

[English technical notes](README.details.md)

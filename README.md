# Harbor Forge

[中文](#中文) · [English](#english)

## 中文

内存中的 Git 托管实验，包含 Git Smart HTTP、REST、GraphQL 和 MCP 接口。

### 本地运行

使用 Node.js 22.18 或更新版本。运行 `node start-local.ts`，然后访问 `http://127.0.0.1:8080/healthz`。测试接口用请求头 `Authorization: Bearer local-demo`。数据存在内存中，重启清空。赛事入口另见 `main.ts`。

命令行提示默认显示中文。设置 `MAKEFUN_UI_LANG=en` 可显示英文。

## English

An in-memory Git hosting experiment with Git smart HTTP, REST, GraphQL and MCP interfaces.

### Run locally

Use Node.js 22.18 or newer. Run `node start-local.ts` and visit `http://127.0.0.1:8080/healthz`. For API requests send `Authorization: Bearer local-demo`. Data is in memory and resets on restart. `main.ts` is the contest entrypoint.

Set `MAKEFUN_UI_LANG=en` for English terminal messages.

[中文技术说明](README.details.zh.md) · [English technical notes](README.details.md)

[make.fun 赛事 / Original bounty](https://make.fun/bounty/github-core-clone-01)

## 许可证 / License

MIT. See [LICENSE](LICENSE).


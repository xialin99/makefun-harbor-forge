# 港湾 Git 托管实验 / Harbor Forge

[中文](#中文) · [English](#english)

## 中文

### 第一次使用

安装 [Node.js 的 LTS 长期支持版](https://nodejs.org/en/download)（22.18 或更新）。

1. 在仓库页面点 **Code → Download ZIP**，下载并解压。打开解压后含有 `start-local.ts` 的文件夹。
2. 在 Windows 文件资源管理器地址栏输入 `powershell` 后按回车。把下面的命令复制到打开的窗口并回车。

```sh
node start-local.ts
```

看到服务启动提示后，用浏览器打开 [本地健康检查](http://127.0.0.1:8080/healthz)。显示 `{"ok":true}` 就说明服务启动成功。终端按 **Ctrl+C** 停止。本项目适合想体验 Git 托管接口的人。

内存中的 Git 托管实验，包含 Git Smart HTTP、REST、GraphQL 和 MCP 接口。

### 本地运行

使用 Node.js 22.18 或更新版本。运行 `node start-local.ts`，然后访问 `http://127.0.0.1:8080/healthz`。测试接口用请求头 `Authorization: Bearer local-demo`。数据存在内存中，重启清空。赛事入口另见 `main.ts`。

命令行提示默认显示中文。设置 `MAKEFUN_UI_LANG=en` 可显示英文。

## English

### First use

Install the [Node.js LTS release](https://nodejs.org/en/download), version 22.18 or newer.

1. Choose **Code → Download ZIP**, extract it, then open the extracted project folder.
2. On Windows, type `powershell` in the File Explorer address bar and press Enter. Run the commands below.

```sh
node start-local.ts
```

看到服务启动提示后，用浏览器打开 [本地健康检查](http://127.0.0.1:8080/healthz)。显示 `{"ok":true}` 就说明服务启动成功。终端按 **Ctrl+C** 停止。本项目适合想体验 Git 托管接口的人。

An in-memory Git hosting experiment with Git smart HTTP, REST, GraphQL and MCP interfaces.

### Run locally

Use Node.js 22.18 or newer. Run `node start-local.ts` and visit `http://127.0.0.1:8080/healthz`. For API requests send `Authorization: Bearer local-demo`. Data is in memory and resets on restart. `main.ts` is the contest entrypoint.

Set `MAKEFUN_UI_LANG=en` for English terminal messages.

[中文技术说明](README.details.zh.md) · [English technical notes](README.details.md)

[make.fun 赛事 / Original bounty](https://make.fun/bounty/github-core-clone-01)

## 许可证 / License

MIT. See [LICENSE](LICENSE).


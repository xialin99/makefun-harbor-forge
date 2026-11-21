import { createApp } from './app.ts';

process.env.MAKEFUN_SHOP_TOKEN ??= 'local-demo';
const port = Number(process.env.PORT ?? 8080);
createApp().listen(port, '127.0.0.1', () => {
  console.log((process.env.MAKEFUN_UI_LANG === 'en' ? 'Harbor Forge is listening at ' : '港湾 Git 服务正在运行：') + 'http://127.0.0.1:' + port);
});

import { createApp } from './app.ts';

process.env.MAKEFUN_SHOP_TOKEN ??= 'local-demo';
const port = Number(process.env.PORT ?? 8080);
createApp().listen(port, '127.0.0.1', () => {
  console.log('Harbor Forge is listening at http://127.0.0.1:' + port);
});

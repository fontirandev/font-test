import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allowedHosts, isAllowedHost } from './hosts';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT ?? 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be between 1 and 65535');
// HOST stays loopback by default; Docker sets 0.0.0.0 and publishes the port on loopback only.
const host = process.env.HOST ?? '127.0.0.1';
// Comma-separated Host headers to accept besides localhost, e.g. "203.0.113.5:8030".
const hosts = allowedHosts(port, process.env.FONT_DESK_ALLOWED_HOSTS);
const development = process.argv.includes('--dev');
const server = createServer();
const vite = development
  ? await (
      await import('vite')
    ).createServer({
      root,
      server: {
        middlewareMode: true,
        hmr: { server },
        // Polling avoids inotify limits on Docker bind mounts (FONT_DESK_WATCH_POLLING=1).
        watch:
          process.env.FONT_DESK_WATCH_POLLING === '1' ? { usePolling: true, interval: 300 } : {},
      },
      appType: 'spa',
    })
  : null;
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const pagePolicy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' blob:; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
// A worker runs under the CSP of its own script response. The WOFF2 decoder's
// Emscripten glue needs eval, so only that byte-in/byte-out worker may use it.
const WOFF2_WORKER = /^\/assets\/woff2\.worker-[\w-]+\.js$/;
const workerPolicy = "default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'";

server.on('request', (request, response) => {
  void (async () => {
    if (!isAllowedHost(request, hosts)) {
      response.writeHead(403).end('Host not allowed. Add it to FONT_DESK_ALLOWED_HOSTS.');
      return;
    }
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    if (vite) {
      vite.middlewares(request, response);
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end();
      return;
    }
    const dist = resolve(root, 'dist');
    const path = resolve(
      dist,
      `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`,
    );
    if (!path.startsWith(`${dist}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const content = await readFile(path);
      response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
      response.setHeader(
        'Content-Security-Policy',
        WOFF2_WORKER.test(url.pathname) ? workerPolicy : pagePolicy,
      );
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch {
      response.writeHead(404).end('Not found. Run npm run build before npm start.');
    }
  })().catch((error) => {
    console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
    if (!response.headersSent) response.writeHead(500);
    response.end('Local server error');
  });
});
server.listen(port, host, () => console.log(`Font Test: http://127.0.0.1:${port}`));
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await vite?.close();
  server.close(() => process.exit(0));
  server.closeIdleConnections();
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});

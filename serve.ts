// A tiny static server for app/ (Node 22, standard library only), so the
// guide can be tried locally without a build step:
//
//   node serve.ts               serves app/ on http://localhost:8080
//   node serve.ts --port 9000   serves it on port 9000 instead
//   node serve.ts --host 0.0.0.0 --port 9000   listens on every interface
//   node serve.ts --quiet       serves it without logging each request
//
// It sends the MIME types a browser needs, refuses any path outside app/,
// logs each request on one line, and otherwise does nothing clever: a
// development convenience, not a web server.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const args = process.argv.slice(2);

function flagValue(flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return fallback;
  return args[index + 1];
}

const requestedPort = Number(flagValue('--port', '8080'));
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536
  ? requestedPort
  : 8080;
const host = flagValue('--host', '127.0.0.1');
const quiet = args.includes('--quiet');

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// One line of log per request, unless --quiet: errors still print, so a
// missing file never fails silently while the guide is being tried.
function logLine(line) {
  if (!quiet) console.log(line);
}

createServer((request, response) => {
  const started = Date.now();
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    console.log(`${response.statusCode} ${url.pathname}`);
    return;
  }
  response.writeHead(200, {
    'content-length': size,
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
  response.on('finish', () => {
    logLine(`200 ${url.pathname} ${size} bytes ${Date.now() - started}ms`);
  });
}).listen(port, host, () => {
  console.log(`app/ is on http://${host}:${port}`);
});

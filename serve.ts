// Tiny static server for the guide, for local checks only (Node 22, stdlib).
// Serves the repository root so app/index.html loads at / and its modules,
// data and screenshots resolve beside it. Query strings (like ?shot=) are
// client-side and pass through untouched.
//
//   node serve.ts [--port 8080] [--host 127.0.0.1]
//   open http://localhost:8080/app/

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url)).replace(/[/\\]$/, "");

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
const port = Number(flagValue("--port", "8080"));
const host = flagValue("--host", "127.0.0.1");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const file = resolve(join(here, normalize(rel)));
  // Never serve anything outside this directory.
  if (!file.startsWith(here + sep) && file !== here) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden");
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Leonida Trophy Guide at http://${host}:${port}/app/`);
});

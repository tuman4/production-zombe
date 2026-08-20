import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const serverDir = path.join(dist, "server");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".mp3", "audio/mpeg"],
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolute));
    } else {
      files.push(absolute);
    }
  }
  return files;
}

const sourceFiles = [
  path.join(root, "index.html"),
  path.join(root, "rest-in-bass.mp3"),
  ...await walk(path.join(root, "src")),
];

const assets = {};
for (const file of sourceFiles) {
  const route = `/${path.relative(root, file).replaceAll(path.sep, "/")}`;
  assets[route] = {
    contentType: contentTypes.get(path.extname(file).toLowerCase()) ?? "application/octet-stream",
    body: (await readFile(file)).toString("base64"),
  };
}

assets["/"] = assets["/index.html"];

await rm(dist, { recursive: true, force: true });
await mkdir(serverDir, { recursive: true });

const worker = `const assets = ${JSON.stringify(assets)};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const asset = assets[pathname] || assets["/index.html"];
    return new Response(decodeBase64(asset.body), {
      headers: {
        "content-type": asset.contentType,
        "cache-control": pathname === "/" || pathname.endsWith(".html")
          ? "no-cache"
          : "public, max-age=31536000, immutable"
      }
    });
  }
};
`;

await writeFile(path.join(serverDir, "index.js"), worker);

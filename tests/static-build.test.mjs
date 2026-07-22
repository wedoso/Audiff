import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);

test("produces a portable static site", async () => {
  const html = await readFile(new URL("index.html", dist), "utf8");
  const assets = await readdir(new URL("assets/", dist));

  assert.match(html, /<title>Audiff — Seamless A\/B Audio Comparison<\/title>/);
  assert.match(html, /type="module"/);
  assert.match(html, /\.\/assets\//);
  assert.doesNotMatch(html, /_next|_vinext|server\/index|codex-preview/i);
  assert.ok(assets.some((file) => file.endsWith(".js")));
  assert.ok(assets.some((file) => file.endsWith(".css")));
  await access(new URL("og.png", dist));
});

test("contains no server runtime or backend dependency", async () => {
  const [packageJson, config, app] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("vite.config.ts", root), "utf8"),
    readFile(new URL("src/App.tsx", root), "utf8"),
  ]);

  assert.match(packageJson, /"build": "tsc -b && vite build"/);
  assert.doesNotMatch(packageJson, /next|vinext|wrangler|cloudflare|drizzle/i);
  assert.match(config, /base: "\.\/"/u);
  assert.match(app, /URL\.createObjectURL/);
  assert.match(app, /DRIFT_TOLERANCE = 0\.04/);
  await assert.rejects(access(new URL("worker", root)));
  await assert.rejects(access(new URL(".openai/hosting.json", root)));
});

import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);

test("produces a portable static site", async () => {
  const html = await readFile(new URL("index.html", dist), "utf8");
  const assets = await readdir(new URL("assets/", dist));

  assert.match(html, /<title>Audiff — Live2D Music Player & A\/B Comparison<\/title>/);
  assert.match(html, /type="module"/);
  assert.match(html, /\.\/assets\//);
  assert.doesNotMatch(html, /_next|_vinext|server\/index|codex-preview/i);
  assert.ok(assets.some((file) => file.endsWith(".js")));
  assert.ok(assets.some((file) => file.endsWith(".css")));
  await access(new URL("og.png", dist));
  await access(new URL("live2d/live2dcubismcore.min.js", dist));
  await access(new URL("live2d/hiyori/hiyori_free_t08.model3.json", dist));
  await access(new URL("live2d/hiyori/hiyori_free_t08.moc3", dist));
});

test("drives Hiyori from meaningful per-track audio features", async () => {
  const [app, visual, stage, styles] = await Promise.all([
    readFile(new URL("src/App.tsx", root), "utf8"),
    readFile(new URL("src/audioVisual.ts", root), "utf8"),
    readFile(new URL("src/Live2DStage.tsx", root), "utf8"),
    readFile(new URL("src/index.css", root), "utf8"),
  ]);

  assert.match(app, /context\.createAnalyser\(\)/u);
  assert.match(app, /source\.connect\(analyser\)/u);
  assert.match(visual, /band\(35, 190\)/u);
  assert.match(visual, /band\(190, 2400\)/u);
  assert.match(visual, /band\(2400, 10000\)/u);
  assert.match(stage, /ParamBodyAngleX/u);
  assert.match(stage, /ParamAngleY/u);
  assert.match(stage, /ParamBodyAngleY/u);
  assert.match(stage, /rhythmPhase \+=/u);
  assert.match(stage, /addParameterValueByIndex/u);
  assert.match(stage, /features\.isComparing/u);
  assert.match(stage, /focusController\.focus\(gazeX, gazeY\)/u);
  assert.match(stage, /startMotion\("Idle", 0, 1/u);
  assert.match(stage, /ignoreParamIds: \["ParamEyeLOpen", "ParamEyeROpen"\]/u);
  assert.match(stage, /internalModel\.eyeBlink = undefined/u);
  assert.match(stage, /setParameterValueByIndex\(eyeLeftIndex, blinkOpen\)/u);
  assert.match(stage, /const closing = 0\.18/u);
  assert.match(stage, /afterMotionUpdate/u);
  assert.match(stage, /UPDATE_PRIORITY\.HIGH/u);
  assert.match(stage, /nodVelocity \+= \(-nodAngle/u);
  assert.doesNotMatch(stage, /model\.rotation =/u);
  assert.doesNotMatch(stage, /model\.position\.set\(/u);
  assert.doesNotMatch(stage, /addMusicParameter\("ParamHair/u);
  assert.match(styles, /--beat-pulse/u);
  assert.match(styles, /\.stage-ambient-light/u);
  assert.doesNotMatch(styles, /\.live2d-stage-player::after/u);
  assert.equal([...app.matchAll(/<Live2DStage/gu)].length, 1);
  assert.match(stage, /import\("pixi\.js"\)/u);
  assert.match(stage, /const naturalWidth = model\.width/u);
  assert.match(stage, /targetHeight \/ naturalHeight/u);
  assert.match(stage, /targetWidth \/ naturalWidth/u);
  assert.doesNotMatch(stage, /\[featuresRef, variant\]/u);
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
  assert.match(app, /new FileReader\(\)/u);
  assert.match(app, /context\.decodeAudioData\(arrayBuffer\)/u);
  await assert.rejects(access(new URL("worker", root)));
  await assert.rejects(access(new URL(".openai/hosting.json", root)));
});

test("uses one audio clock for sample-accurate source switching", async () => {
  const app = await readFile(new URL("src/App.tsx", root), "utf8");

  assert.match(app, /context\.createBufferSource\(\)/u);
  assert.match(app, /source\.start\(when, Math\.max\(0, offset\)\)/u);
  assert.match(app, /playbackStartedAtRef\.current = when/u);
  assert.doesNotMatch(app, /follower\.currentTime/u);
  assert.doesNotMatch(app, /playbackRate/u);
});

test("shows real file-reading progress and an explicit decoding state", async () => {
  const app = await readFile(new URL("src/App.tsx", root), "utf8");

  assert.match(app, /reader\.onprogress/u);
  assert.match(app, /event\.loaded \/ event\.total/u);
  assert.match(app, /Decoding for seamless playback/u);
  assert.match(app, /role="progressbar"/u);
});

test("can clear both tracks and reset playback", async () => {
  const app = await readFile(new URL("src/App.tsx", root), "utf8");

  assert.match(app, /function clearBothFiles\(\)/u);
  assert.match(app, /buffersRef\.current\[index\] = null/u);
  assert.match(app, /updateSlots\(\[\{ \.\.\.EMPTY_SLOT \}, \{ \.\.\.EMPTY_SLOT \}\]\)/u);
  assert.match(app, /Clear both tracks/u);
});

test("aligns the scrubber, playhead, and duration markers with the waveform", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("src/App.tsx", root), "utf8"),
    readFile(new URL("src/index.css", root), "utf8"),
  ]);

  assert.match(app, /className="wave-track"/u);
  assert.match(app, /className="timeline-track"/u);
  assert.match(styles, /--timeline-label-width: 28px/u);
  assert.match(styles, /\.timeline-track[\s\S]*inset: 0 0 0 var\(--timeline-label-width\)/u);
});

test("centers the transport icon inside the play button", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("src/App.tsx", root), "utf8"),
    readFile(new URL("src/index.css", root), "utf8"),
  ]);

  assert.match(app, /className="play-icon"/u);
  assert.match(styles, /\.play-button \{[\s\S]*padding: 0;/u);
  assert.match(styles, /\.play-icon \{ transform: translateX\(1px\); \}/u);
});

import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);

test("produces a portable static site", async () => {
  const html = await readFile(new URL("index.html", dist), "utf8");
  const assets = await readdir(new URL("assets/", dist));

  assert.match(html, /<title>Audiff — Live2D Listening Room & A\/B Player<\/title>/);
  assert.match(html, /href="\.\/favicon\.svg"/u);
  assert.match(html, /type="module"/);
  assert.match(html, /\.\/assets\//);
  assert.doesNotMatch(html, /_next|_vinext|server\/index|codex-preview/i);
  assert.ok(assets.some((file) => file.endsWith(".js")));
  assert.ok(assets.some((file) => file.endsWith(".css")));
  await access(new URL("og.png", dist));
  await access(new URL("favicon.svg", dist));
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
  assert.match(stage, /setParameterValueByIndex\(eyeLeftIndex, attentiveEyeOpen\)/u);
  assert.match(stage, /setParameterValueByIndex\(eyeRightIndex, attentiveEyeOpen\)/u);
  assert.match(stage, /const closing = 0\.18/u);
  assert.match(stage, /afterMotionUpdate/u);
  assert.match(stage, /UPDATE_PRIORITY\.HIGH/u);
  assert.match(stage, /nodVelocity \+= \(-nodAngle/u);
  assert.match(stage, /ParamEyeLSmile/u);
  assert.match(stage, /const attentiveEyeOpen = blinkOpen \* \(1 - activity/u);
  assert.match(stage, /const phaseNod = Math\.max\(0, Math\.sin\(rhythmPhase \* 2\)\)/u);
  assert.match(stage, /poseGroove = activity \* Math\.min\(1, 0\.28/u);
  assert.match(stage, /if \(features\.isPlaying && !wasListening\)/u);
  assert.match(stage, /rhythmPhase \+= dt \* Math\.PI \/ beatInterval \* listening/u);
  assert.match(visual, /const bassRise = Math\.max\(0, bass - previous\.bass\)/u);
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

test("uses stable and unambiguous track state actions", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("src/App.tsx", root), "utf8"),
    readFile(new URL("src/index.css", root), "utf8"),
  ]);

  assert.doesNotMatch(app, /<Check className="file-check"/u);
  assert.match(app, /isPlaying \? "PLAYING" : "CUED"/u);
  assert.match(app, /: "READY"/u);
  assert.match(app, /<span>Replace<\/span>/u);
  assert.match(app, /<span>Remove<\/span>/u);
  assert.match(styles, /\.track-score-strip \.file-actions \{[^}]*position: static;/u);
  assert.doesNotMatch(styles, /\.track-score-strip \.file-actions \{[^}]*display: none;/u);
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

test("pauses audio and visual state in the same input frame", async () => {
  const app = await readFile(new URL("src/App.tsx", root), "utf8");

  assert.match(app, /const silenceOutputNow = useCallback/u);
  assert.match(app, /master\.gain\.setValueAtTime\(0, now\)/u);
  assert.match(
    app,
    /if \(playingRef\.current\) \{[\s\S]*?playingRef\.current = false;[\s\S]*?setIsPlaying\(false\);[\s\S]*?silenceOutputNow\(\);[\s\S]*?stopAllSources\(\);/u,
  );
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

test("keeps the browser title synchronized with the listening state", async () => {
  const app = await readFile(new URL("src/App.tsx", root), "utf8");

  assert.match(app, /document\.title = bothReady/u);
  assert.match(app, /Comparing A\/B/u);
  assert.match(app, /Listening with Hiyori/u);
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
  assert.match(app, /aria-pressed=\{isPlaying\}/u);
  assert.match(styles, /\.play-button \{[\s\S]*padding: 0;/u);
  assert.match(styles, /\.play-icon \{ transform: translateX\(1px\); \}/u);
  assert.match(styles, /\.player \.play-button \{[\s\S]*touch-action: manipulation;/u);
});

test("keeps phrase camera motion separate from Live2D music pose", async () => {
  const [stage, app] = await Promise.all([
    readFile(new URL("src/Live2DStage.tsx", root), "utf8"),
    readFile(new URL("src/App.tsx", root), "utf8"),
  ]);

  assert.match(stage, /const cameraRig = new Container\(\)/u);
  assert.match(stage, /cameraRig\.addChild\(model\)/u);
  assert.match(stage, /const phraseArc = \(1 - Math\.cos\(cameraPhase\)\) \* 0\.5/u);
  assert.match(stage, /Math\.max\(1\.42, Math\.min\(2\.1, autoZoom\)\)/u);
  assert.match(stage, /Math\.min\(2\.35, currentCameraZoomRef/u);
  assert.match(stage, /manualZoomRef\.current = 2\.12/u);
  assert.match(stage, /previousVariantRef\.current === "welcome" && variant === "player"/u);
  assert.match(stage, /autoSuspendUntilRef\.current = performance\.now\(\) \+ 2800/u);
  assert.match(stage, /autoSuspendUntilRef\.current = Number\.POSITIVE_INFINITY/u);
  assert.match(stage, /setCameraMode\("locked"\)/u);
  assert.match(stage, /host\.addEventListener\("wheel", handleWheel/u);
  assert.doesNotMatch(stage, /autoZoom[^;]*lightPulse/u);
  assert.match(stage, /ParamEyeBallX/u);
  assert.match(stage, /ParamEyeBallY/u);
  assert.match(stage, /features\.source === 0 \? -0\.82 : 0\.82/u);
  assert.match(app, /focusMode=\{focusMode\}/u);
});

test("separates the static contact shadow from ambient music lighting", async () => {
  const styles = await readFile(new URL("src/index.css", root), "utf8");

  assert.match(styles, /\.live2d-stage::before[\s\S]*background: radial-gradient\(ellipse, rgba\(32, 43, 70, \.2\)/u);
  assert.match(styles, /\.stage-ambient-light[\s\S]*--music-energy-long/u);
  assert.match(styles, /\.stage-floor-light[\s\S]*--beat-pulse/u);
  assert.match(styles, /\.stage-particles span/u);
});

test("keeps the record-book layout collision-free across responsive breakpoints", async () => {
  const styles = await readFile(new URL("src/index.css", root), "utf8");

  assert.match(
    styles,
    /\.app-shell:not\(\.is-focus-mode\) \.track-score-strip \.file-icon,[\s\S]*?width: 28px;[\s\S]*?height: 28px;/u,
  );
  assert.match(styles, /\.track-score-strip \.empty-slot-content \{[\s\S]*?margin: 1px 0 0;/u);
  assert.match(
    styles,
    /@media \(max-width: 900px\) \{[\s\S]*?grid-template-rows: auto 540px;[\s\S]*?\.live2d-stage-player \{ min-height: 540px; \}/u,
  );
  assert.match(
    styles,
    /@media \(max-width: 600px\) \{[\s\S]*?grid-template-rows: auto 500px;[\s\S]*?\.live2d-stage-player \{ min-height: 500px; \}/u,
  );
  assert.match(styles, /@media \(max-width: 1100px\) \{[\s\S]*?\.header-actions \.local-note \{ display: none; \}/u);
  assert.match(styles, /\.live2d-stage-player \.camera-capsule \{[\s\S]*?top: 16px;[\s\S]*?bottom: auto;/u);
  assert.match(styles, /grid-template-columns: 210px minmax\(0, 1fr\);/u);
  assert.match(styles, /\.time-readout,[\s\S]*?\.total-time \{[\s\S]*?font-variant-numeric: tabular-nums;[\s\S]*?white-space: nowrap;/u);
  assert.doesNotMatch(styles, /\.site-header \.brand-mark::after/u);
});

test("interactive surfaces use one persistent boundary", async () => {
  const styles = await readFile(new URL("src/index.css", root), "utf8");

  assert.doesNotMatch(styles, /\.brand-mark::after/u);
  assert.doesNotMatch(styles, /\.welcome-choices button::after/u);
  assert.doesNotMatch(styles, /\.file-slot::after/u);
  assert.doesNotMatch(styles, /\.player::after/u);
  assert.doesNotMatch(styles, /\.camera-capsule::after/u);
  assert.match(styles, /\.site-header \.brand-mark \{[^}]*box-shadow: none;/u);
  assert.match(styles, /\.camera-capsule button\.is-active \{[^}]*box-shadow: none;/u);
});

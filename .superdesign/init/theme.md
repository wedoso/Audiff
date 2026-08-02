# Theme

## Compact token summary

- Product character: warm editorial listening room matching Hiyori's cream uniform; restrained, intimate, locally processed.
- Background: warm ivory `#f8f4ed` family with a subtle dotted paper grid.
- Ink: deep navy `#202b46`; muted copy is blue-gray.
- Track A: muted teal; Track B: coral rose. Green is reserved for ready/live state.
- Typography: system sans for interface and labels; Georgia-style serif for large editorial headlines.
- Shape: mostly 14–26px radii, thin low-contrast borders, minimal shadows.
- Motion: internal Live2D pose only; adaptive onset nods, long-period amplitude variation, one eased blink writer, and Physics-driven secondary motion.
- Lighting: narrow centered contact shadow plus separate A/B-colored ambient and floor pulses on strong onsets.
- Breakpoints: 900px and 600px.

## Raw global CSS

```css
:root {
  --font-geist-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  --ink: #273148;
  --muted: #777783;
  --line: #ded7d2;
  --paper: #f8f3eb;
  --surface: #fffaf5;
  --green: #547f79;
  --green-soft: #e0ece8;
  --orange: #c85f6d;
  --orange-soft: #f6e1e3;
  --yellow: #d5a24d;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
}

button, input { font: inherit; }
button { color: inherit; }

button:focus-visible, input:focus-visible, [role="button"]:focus-visible, a:focus-visible {
  outline: 3px solid rgba(216, 109, 56, .32);
  outline-offset: 3px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.app-shell {
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 12%, rgba(200, 95, 109, .09), transparent 25rem),
    radial-gradient(circle at 86% 28%, rgba(84, 127, 121, .08), transparent 24rem),
    radial-gradient(circle, rgba(39, 49, 72, .055) 1px, transparent 1.2px),
    var(--paper);
  background-size: auto, auto, 22px 22px, auto;
}

.site-header {
  width: min(1160px, calc(100% - 40px));
  height: 84px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(23, 33, 29, .14);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  text-decoration: none;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -.04em;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: white;
  border-radius: 50%;
}

.local-note {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #4f5a54;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .03em;
}

.hero {
  width: min(960px, calc(100% - 40px));
  margin: 78px auto 52px;
  text-align: center;
}

.eyebrow, .section-label {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--orange);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.hero h1 {
  max-width: 820px;
  margin: 21px auto 18px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(48px, 7.4vw, 88px);
  line-height: .94;
  letter-spacing: -.055em;
  font-weight: 500;
}

.hero h1 em {
  color: var(--green);
  font-weight: 500;
}

.hero-copy {
  max-width: 585px;
  margin: 0 auto;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.7;
}

.workspace {
  width: min(1080px, calc(100% - 40px));
  margin: 0 auto;
}

.file-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.file-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.clear-files-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.clear-files-button:hover {
  background: #efeee9;
  color: var(--ink);
}

.file-slot {
  min-height: 176px;
  padding: 18px;
  position: relative;
  background: rgba(255, 254, 250, .65);
  border: 1px dashed #bfc3bc;
  transition: border-color .18s ease, background .18s ease, transform .18s ease;
  cursor: pointer;
}

.file-slot:hover, .file-slot.is-dragging {
  border-color: var(--orange);
  background: var(--surface);
}

.file-slot.is-dragging { transform: translateY(-2px); }

.file-slot.has-file {
  min-height: 148px;
  cursor: default;
  border-style: solid;
  background: var(--surface);
}

.file-slot.is-active { border-color: rgba(29, 90, 69, .58); }

.slot-topline {
  height: 25px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.source-badge {
  width: 26px;
  height: 26px;
  display: inline-grid;
  place-items: center;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 900;
}

.source-a { background: var(--green); }
.source-b { background: var(--orange); }

.playing-source {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--green);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .14em;
}

.playing-source span, .sync-state span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3c9c72;
  box-shadow: 0 0 0 4px rgba(60, 156, 114, .13);
}

.empty-slot-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 7px;
  color: #9a9f99;
  font-size: 12px;
  line-height: 1.5;
}

.empty-slot-content strong {
  margin-top: 8px;
  color: var(--ink);
  font-size: 14px;
}

.upload-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: var(--green);
  background: var(--green-soft);
  border-radius: 50%;
}

.file-details {
  margin-top: 25px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  color: var(--green);
  background: var(--green-soft);
  border-radius: 50%;
}

.file-copy { min-width: 0; }
.file-copy strong, .file-copy span { display: block; }
.file-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}
.file-copy span { margin-top: 6px; color: var(--muted); font-size: 11px; line-height: 1.35; }
.file-check { color: var(--green); }

.decode-progress {
  height: 4px;
  margin-top: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7e8e3;
}

.decode-progress > span {
  height: 100%;
  min-width: 3px;
  display: block;
  margin: 0;
  border-radius: inherit;
  background: var(--green);
  transition: width .12s linear;
}

.decode-progress.is-decoding > span {
  width: 42% !important;
  background: linear-gradient(90deg, var(--green-soft), var(--green), var(--green-soft));
  animation: decoding-progress 1.05s ease-in-out infinite;
}

@keyframes decoding-progress {
  from { transform: translateX(-105%); }
  to { transform: translateX(240%); }
}

.file-actions {
  position: absolute;
  right: 12px;
  bottom: 11px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity .15s ease;
}

.file-slot:hover .file-actions, .file-actions:focus-within { opacity: 1; }

.icon-button, .control-button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.icon-button {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  color: var(--muted);
  border-radius: 50%;
}

.icon-button:hover { color: var(--ink); background: #efeee9; }

.duration-alert {
  margin: 12px 0 -1px;
  padding: 10px 14px;
  background: #faf2d9;
  border: 1px solid #ead89b;
  color: #746025;
  font-size: 11px;
  text-align: center;
}
.duration-alert span { margin-right: 7px; color: #493d19; font-weight: 800; }

.player {
  margin-top: 14px;
  padding: 29px 32px 20px;
  background: var(--surface);
  border: 1px solid #d9dbd5;
  box-shadow: 0 22px 55px rgba(23, 33, 29, .08);
}

.player-heading {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 9px;
}

.player .section-label { justify-content: flex-start; color: var(--muted); font-size: 9px; }

.time-readout {
  margin: 8px 0 0;
  font-family: var(--font-geist-mono), monospace;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -.04em;
}

.total-time {
  padding-bottom: 3px;
  color: #989d97;
  font-family: var(--font-geist-mono), monospace;
  font-size: 12px;
}

.timeline {
  --timeline-label-width: 28px;
  height: 128px;
  margin-top: 24px;
  position: relative;
  border-top: 1px solid #e2e4de;
  border-bottom: 1px solid #e2e4de;
}

.wave-row {
  height: 50%;
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.wave-row + .wave-row { border-top: 1px solid #ecece7; }
.wave-label {
  flex: 0 0 var(--timeline-label-width);
  padding-left: 4px;
  z-index: 2;
  color: #99a099;
  font-size: 9px;
  font-weight: 900;
}

.wave-track {
  height: 100%;
  min-width: 0;
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  overflow: hidden;
}

.waveform {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: .82;
}
.waveform span { flex: 1; min-width: 1px; border-radius: 1px; }
.wave-a .waveform span { background: #5b9079; }
.wave-b .waveform span { background: #da8b65; }

.timeline-track {
  position: absolute;
  z-index: 3;
  inset: 0 0 0 var(--timeline-label-width);
  pointer-events: none;
}

.timeline-track::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--progress);
  pointer-events: none;
  background: rgba(29, 90, 69, .055);
}

.playhead {
  position: absolute;
  z-index: 1;
  top: -5px;
  bottom: -5px;
  left: var(--progress);
  width: 1px;
  background: var(--ink);
  pointer-events: none;
}
.playhead span {
  position: absolute;
  top: -1px;
  left: -4px;
  width: 9px;
  height: 9px;
  background: var(--ink);
  transform: rotate(45deg);
}

.scrubber {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: ew-resize;
  opacity: 0;
  pointer-events: auto;
}
.scrubber:disabled { cursor: default; }

.audio-end {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  padding: 4px 0 0 4px;
  background: rgba(23, 33, 29, .28);
  color: #8c918b;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.controls {
  min-height: 94px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid #e1e2dd;
}

.transport-controls { display: flex; align-items: center; gap: 5px; }

.control-button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #5d6660;
  border-radius: 50%;
}
.control-button:hover:not(:disabled), .control-button.selected { color: var(--green); background: var(--green-soft); }
.control-button:disabled, .play-button:disabled { opacity: .28; cursor: not-allowed; }

.play-button {
  width: 52px;
  height: 52px;
  margin: 0 4px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--ink);
  color: white;
  cursor: pointer;
  transition: transform .15s ease, background .15s ease;
}
.play-icon { transform: translateX(1px); }
.play-button:hover:not(:disabled) { transform: scale(1.04); background: var(--green); }

.ab-switch {
  min-width: 304px;
  min-height: 58px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  position: relative;
  padding: 5px;
  background: #ecece7;
}

.switch-caption {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  color: #91968f;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .16em;
}

.ab-switch button {
  border: 0;
  background: transparent;
  color: #858b85;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.ab-switch button.active { background: var(--surface); color: var(--ink); box-shadow: 0 2px 10px rgba(23, 33, 29, .07); }
.ab-switch button:disabled { opacity: .42; cursor: not-allowed; }
.ab-switch kbd { margin-right: 5px; color: inherit; }

.volume-control {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #657069;
}
.volume-control input { width: 88px; accent-color: var(--green); }

.player-status {
  min-height: 35px;
  padding-top: 15px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  color: #8a908a;
  font-size: 10px;
}

.sync-state { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
.sync-state span { width: 5px; height: 5px; }

.shortcut-section {
  width: min(1080px, calc(100% - 40px));
  margin: 38px auto 74px;
  padding: 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
  border-top: 1px solid rgba(23, 33, 29, .14);
  border-bottom: 1px solid rgba(23, 33, 29, .14);
}

.shortcut-heading { display: flex; align-items: center; gap: 11px; color: var(--green); }
.shortcut-heading span { color: var(--muted); font-size: 11px; }
.shortcut-heading strong { color: var(--ink); }

.shortcut-list { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 18px; color: #777e78; font-size: 10px; }
kbd {
  min-width: 21px;
  margin-right: 3px;
  padding: 3px 6px;
  display: inline-block;
  background: #e9e8e2;
  border: 1px solid #d5d6d0;
  color: #4f5751;
  font-family: var(--font-geist-mono), monospace;
  font-size: 9px;
  text-align: center;
  box-shadow: 0 1px 0 #c7c9c2;
}

footer {
  width: min(1080px, calc(100% - 40px));
  margin: 0 auto;
  padding: 0 0 38px;
  display: flex;
  justify-content: space-between;
  color: #979c96;
  font-size: 10px;
}
footer > span { color: var(--ink); font-weight: 900; }
footer p { margin: 0; }

@media (max-width: 820px) {
  .hero { margin-top: 56px; }
  .file-grid { grid-template-columns: 1fr; }
  .controls { grid-template-columns: 1fr 1fr; padding: 22px 0; }
  .ab-switch { grid-column: 1 / -1; grid-row: 1; width: 100%; }
  .volume-control { justify-self: end; }
  .shortcut-section { align-items: flex-start; }
}

@media (max-width: 600px) {
  .site-header, .hero, .workspace, .shortcut-section, footer { width: min(100% - 24px, 1080px); }
  .site-header { height: 68px; }
  .local-note { font-size: 0; }
  .local-note svg { width: 18px; height: 18px; }
  .hero { margin: 45px auto 38px; text-align: left; }
  .eyebrow { justify-content: flex-start; }
  .hero h1 { margin-left: 0; font-size: clamp(45px, 14vw, 62px); }
  .hero-copy { margin-left: 0; font-size: 14px; }
  .player { padding: 23px 16px 15px; }
  .timeline { height: 110px; }
  .waveform { gap: 1px; }
  .controls { gap: 12px; }
  .transport-controls { gap: 1px; }
  .control-button { width: 34px; height: 34px; }
  .play-button { width: 48px; height: 48px; }
  .volume-control input { width: 64px; }
  .player-status { display: block; line-height: 1.5; }
  .sync-state { margin-top: 5px; }
  .shortcut-section { flex-direction: column; }
  .shortcut-list { justify-content: flex-start; gap: 14px; }
  footer { display: block; }
  footer p { margin-top: 8px; line-height: 1.5; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; }
}

/* Live2D visual player */
.welcome-screen,
.player-hero {
  width: min(1160px, calc(100% - 40px));
  margin: 42px auto 28px;
}

.welcome-screen {
  min-height: 670px;
  display: grid;
  grid-template-columns: minmax(300px, .72fr) minmax(520px, 1.28fr);
  grid-template-rows: 1fr auto auto;
  gap: 18px 28px;
  transition: transform .2s ease;
}

.welcome-screen.is-dragging { transform: scale(.995); }

.welcome-copy {
  align-self: center;
  padding: 36px 0 10px;
}

.welcome-copy .eyebrow,
.player-hero-copy .eyebrow { justify-content: flex-start; }

.welcome-copy h1 {
  margin: 24px 0 20px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(52px, 5.7vw, 78px);
  font-weight: 500;
  letter-spacing: -.06em;
  line-height: .94;
}

.welcome-copy h1 em { color: var(--green); font-weight: 500; }

.welcome-copy > p:last-child,
.player-hero-copy > p:last-child {
  max-width: 430px;
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.75;
}

.welcome-choices {
  display: grid;
  gap: 8px;
}

.welcome-choices button {
  width: 100%;
  min-height: 76px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  border: 1px solid #d8dad4;
  background: rgba(255, 254, 250, .82);
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease;
}

.welcome-choices button:hover {
  border-color: rgba(29, 90, 69, .62);
  transform: translateX(4px);
  box-shadow: 0 12px 26px rgba(23, 33, 29, .07);
}

.welcome-choices button > svg { color: #8b928c; }
.welcome-choices button span:nth-child(2) { min-width: 0; }
.welcome-choices b { display: block; font-size: 13px; }
.welcome-choices small { display: block; margin-top: 5px; color: var(--muted); font-size: 10px; line-height: 1.35; }

.choice-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--green-soft);
  color: var(--green);
}

.choice-icon.is-compare { background: var(--orange-soft); color: var(--orange); }

.welcome-drop-note {
  margin: 3px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #8b918b;
  font-size: 10px;
}

.live2d-stage {
  min-height: 420px;
  position: relative;
  overflow: hidden;
  color: var(--ink);
  background:
    radial-gradient(circle at 52% 38%, rgba(255, 255, 255, .98), transparent 25%),
    radial-gradient(circle at 77% 72%, rgba(200, 95, 109, .13), transparent 29%),
    radial-gradient(circle at 20% 24%, rgba(84, 127, 121, .12), transparent 27%),
    linear-gradient(150deg, #f9efe9 0%, #f3e8e5 52%, #e8eeeb 100%);
  border: 1px solid rgba(39, 49, 72, .13);
  border-radius: 18px 18px 52px 18px;
  box-shadow: 0 28px 68px rgba(74, 58, 62, .16), inset 0 0 0 7px rgba(255, 255, 255, .3);
  isolation: isolate;
}

.live2d-stage-welcome {
  min-height: 650px;
  grid-column: 2;
  grid-row: 1 / 4;
}

.live2d-host,
.live2d-canvas,
.stage-glow,
.stage-orbit { position: absolute; inset: 0; width: 100%; height: 100%; }

.live2d-host { z-index: 3; }
.live2d-canvas { display: block; cursor: crosshair; }

.stage-glow {
  z-index: 1;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .34), transparent);
  transform: translateX(-100%);
  animation: stage-scan 7s ease-in-out infinite;
}

.stage-orbit {
  z-index: 1;
  inset: auto;
  border: 1px dashed rgba(200, 95, 109, .22);
  border-radius: 50%;
  pointer-events: none;
}

.stage-orbit-one {
  width: 440px;
  height: 440px;
  top: 16%;
  left: 21%;
  animation: orbit-drift 9s ease-in-out infinite alternate;
}

.stage-orbit-two {
  width: 580px;
  height: 580px;
  top: 2%;
  left: 10%;
  border-color: rgba(84, 127, 121, .19);
  animation: orbit-drift 13s ease-in-out infinite alternate-reverse;
}

.stage-topline {
  position: absolute;
  z-index: 5;
  top: 20px;
  right: 22px;
  left: 22px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 10px;
  color: rgba(39, 49, 72, .58);
  border-bottom: 1px solid rgba(39, 49, 72, .09);
  font-family: var(--font-geist-mono), monospace;
  font-size: 8px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.stage-topline span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-topline i,
.live-dot {
  width: 6px;
  height: 6px;
  display: inline-block;
  margin-right: 5px;
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 0 0 0 4px rgba(232, 184, 74, .11);
}

.stage-topline i.is-ready,
.live-dot { background: #69c494; box-shadow: 0 0 0 4px rgba(105, 196, 148, .12); }

.motion-legend {
  position: absolute;
  z-index: 5;
  right: 20px;
  bottom: 20px;
  display: grid;
  gap: 7px;
  padding: 10px 12px;
  color: rgba(39, 49, 72, .58);
  background: rgba(255, 250, 245, .68);
  border: 1px solid rgba(39, 49, 72, .08);
  border-radius: 10px;
  backdrop-filter: blur(8px);
  font-size: 8px;
  letter-spacing: .08em;
  pointer-events: none;
}

.motion-legend span { display: grid; grid-template-columns: 36px auto; align-items: center; gap: 8px; }
.motion-legend b { color: var(--orange); font-family: var(--font-geist-mono), monospace; font-size: 7px; }

.stage-invitation {
  position: absolute;
  z-index: 6;
  bottom: 23px;
  left: 24px;
  max-width: 250px;
  padding: 14px 15px;
  background: rgba(255, 250, 245, .76);
  border: 1px solid rgba(39, 49, 72, .09);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(75, 56, 61, .09);
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.stage-invitation > span {
  display: block;
  color: var(--orange);
  font-family: var(--font-geist-mono), monospace;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .16em;
}

.stage-invitation strong {
  display: block;
  margin-top: 6px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 20px;
  font-weight: 500;
}

.stage-invitation button {
  margin-top: 13px;
  padding: 9px 12px;
  border: 1px solid var(--ink);
  border-radius: 999px;
  background: var(--ink);
  color: white;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto;
}

.stage-invitation button:hover { background: var(--orange); border-color: var(--orange); color: white; }

.model-error {
  position: absolute;
  z-index: 8;
  inset: 50% auto auto 50%;
  width: min(280px, 80%);
  padding: 14px;
  transform: translate(-50%, -50%);
  background: rgba(255, 250, 245, .92);
  color: #9b4652;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.player-hero {
  display: grid;
  grid-template-columns: minmax(260px, .55fr) minmax(520px, 1.45fr);
  gap: 18px;
  align-items: stretch;
}

.player-hero-copy {
  padding: 36px 34px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background:
    linear-gradient(135deg, rgba(255, 250, 245, .95), rgba(246, 225, 227, .52));
  border: 1px solid rgba(23, 33, 29, .12);
  border-radius: 18px 48px 18px 18px;
}

.player-hero-copy h1 {
  margin: 21px 0 15px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(38px, 4vw, 58px);
  font-weight: 500;
  line-height: .98;
  letter-spacing: -.055em;
}

.live2d-stage-player { min-height: 480px; }
.live2d-stage-player .motion-legend { left: 20px; right: auto; }
.workspace { margin-top: 18px; }

@keyframes stage-scan {
  0%, 30% { transform: translateX(-100%); opacity: 0; }
  55% { opacity: 1; }
  80%, 100% { transform: translateX(100%); opacity: 0; }
}

@keyframes orbit-drift {
  from { transform: translate3d(-10px, 7px, 0) scale(.96); }
  to { transform: translate3d(10px, -7px, 0) scale(1.04); }
}

@media (max-width: 900px) {
  .welcome-screen {
    grid-template-columns: 1fr;
    grid-template-rows: auto 560px auto auto;
  }
  .welcome-copy { padding-top: 10px; }
  .live2d-stage-welcome { grid-column: 1; grid-row: 2; min-height: 560px; }
  .welcome-choices { grid-row: 3; grid-template-columns: 1fr 1fr; }
  .welcome-drop-note { grid-row: 4; }
  .player-hero { grid-template-columns: 1fr; }
  .player-hero-copy { padding: 28px; }
  .live2d-stage-player { min-height: 520px; }
}

@media (max-width: 600px) {
  .welcome-screen,
  .player-hero { width: calc(100% - 24px); margin-top: 22px; }
  .welcome-screen { grid-template-rows: auto 480px auto auto; gap: 12px; }
  .welcome-copy h1 { font-size: clamp(47px, 14vw, 64px); }
  .welcome-copy > p:last-child { font-size: 13px; }
  .live2d-stage-welcome { min-height: 480px; }
  .welcome-choices { grid-template-columns: 1fr; }
  .live2d-stage-player { min-height: 470px; }
  .motion-legend { display: none; }
  .stage-invitation strong { font-size: 17px; }
  .player-hero-copy { padding: 24px 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .stage-glow,
  .stage-orbit { animation: none !important; }
}

/* Listening room: Hiyori is the interface, not content inside a frame. */
.welcome-screen,
.player-hero {
  position: relative;
}

.welcome-screen::before,
.player-hero::before {
  content: "";
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(2px);
}

.welcome-screen::before {
  width: 690px;
  height: 690px;
  top: 18px;
  right: -24px;
  background:
    radial-gradient(circle at 48% 42%, rgba(255, 255, 255, .92), rgba(246, 225, 227, .48) 42%, rgba(224, 236, 232, .3) 68%, transparent 69%);
}

.live2d-stage {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}

.live2d-stage::before {
  content: "";
  position: absolute;
  z-index: 0;
  width: 18%;
  height: 3.2%;
  left: 50%;
  bottom: 4.6%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(39, 49, 72, .23), rgba(39, 49, 72, .07) 42%, transparent 72%);
  filter: blur(7px);
  transform: translateX(-50%);
  pointer-events: none;
}

.stage-ambient-light,
.stage-floor-light {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  --stage-light-rgb: 84 127 121;
}

.live2d-stage.light-b .stage-ambient-light,
.live2d-stage.light-b .stage-floor-light { --stage-light-rgb: 200 95 109; }

.stage-ambient-light {
  width: 50%;
  height: 72%;
  left: 50%;
  top: 10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(var(--stage-light-rgb) / .32), rgb(var(--stage-light-rgb) / .11) 38%, transparent 70%);
  filter: blur(calc(18px + var(--music-bass, 0) * 10px));
  opacity: calc(.18 + var(--music-energy, 0) * .28 + var(--beat-pulse, 0) * .5);
  transform: translateX(-50%) scale(calc(1 + var(--beat-pulse, 0) * .07));
  transform-origin: 50% 72%;
}

.stage-floor-light {
  width: 34%;
  height: 7%;
  left: 50%;
  bottom: 4.4%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(var(--stage-light-rgb) / .5), rgb(var(--stage-light-rgb) / .11) 48%, transparent 72%);
  filter: blur(9px);
  opacity: calc(.16 + var(--music-bass, 0) * .25 + var(--beat-pulse, 0) * .5);
  transform: translateX(-50%) scaleX(calc(1 + var(--beat-pulse, 0) * .12));
}

.live2d-stage-welcome {
  z-index: 2;
}

.live2d-stage-welcome .stage-topline {
  right: 34px;
  left: 34px;
  border-color: rgba(39, 49, 72, .07);
}

.stage-invitation {
  bottom: 42px;
  left: 8px;
  border-radius: 18px 18px 18px 5px;
  box-shadow: 0 18px 40px rgba(75, 56, 61, .12);
}

.welcome-choices,
.welcome-copy,
.welcome-drop-note {
  position: relative;
  z-index: 4;
}

.welcome-choices button {
  border-radius: 16px 16px 16px 5px;
  background: rgba(255, 250, 245, .88);
  backdrop-filter: blur(10px);
}

.player-hero {
  min-height: 660px;
  display: block;
  margin-top: 18px;
  isolation: isolate;
}

.player-hero::before {
  width: 780px;
  height: 620px;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background:
    radial-gradient(circle at 50% 44%, rgba(255, 255, 255, .94), rgba(246, 225, 227, .45) 44%, rgba(224, 236, 232, .25) 69%, transparent 70%);
}

.player-hero-copy {
  position: absolute;
  z-index: 7;
  top: 50px;
  left: 14px;
  width: 285px;
  padding: 0;
  display: block;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.player-hero-copy h1 {
  font-size: clamp(42px, 4.2vw, 60px);
}

.live2d-stage-player {
  min-height: 660px;
  z-index: 2;
}

.live2d-stage-player .stage-topline {
  top: 26px;
  left: 50%;
  right: auto;
  width: min(470px, 44%);
  padding: 10px 16px;
  transform: translateX(-50%);
  border: 1px solid rgba(39, 49, 72, .08);
  border-radius: 999px;
  background: rgba(255, 250, 245, .72);
  backdrop-filter: blur(8px);
}

.live2d-stage-player .stage-glow { display: none; }

.player-hero + .workspace {
  margin-top: -230px;
  position: relative;
  z-index: 8;
}

.player-hero + .workspace .file-grid {
  padding: 0 18px;
  grid-template-columns: minmax(0, 330px) minmax(0, 330px);
  justify-content: space-between;
  gap: 30px;
}

.player-hero + .workspace .file-slot {
  min-height: 174px;
  border-radius: 22px 22px 22px 7px;
  background: rgba(255, 250, 245, .86);
  border-color: rgba(39, 49, 72, .15);
  box-shadow: 0 12px 30px rgba(73, 61, 66, .07);
  backdrop-filter: blur(12px);
}

.player-hero + .workspace .file-slot:nth-child(2) {
  border-radius: 22px 22px 7px 22px;
}

.player-hero + .workspace .file-slot.is-active {
  transform: translateY(-5px);
  box-shadow: 0 18px 42px rgba(73, 61, 66, .12);
}

.player-hero + .workspace .file-slot.is-active:first-child {
  border-color: rgba(84, 127, 121, .7);
}

.player-hero + .workspace .file-slot.is-active:nth-child(2) {
  border-color: rgba(200, 95, 109, .72);
}

.player-hero + .workspace .file-toolbar {
  margin-top: 14px;
}

.player-hero + .workspace .player {
  margin-top: 38px;
  border-radius: 26px 26px 10px 10px;
  border-color: rgba(39, 49, 72, .11);
  box-shadow: 0 26px 60px rgba(61, 51, 56, .1);
}

.player-hero + .workspace .duration-alert {
  margin-top: 48px;
  border-radius: 12px;
}

.ab-switch {
  border-radius: 999px;
  overflow: hidden;
  background: #efebe6;
}

.ab-switch button.active {
  border-radius: 999px;
}

@media (max-width: 900px) {
  .welcome-screen::before {
    width: 620px;
    height: 620px;
    right: 50%;
    top: 250px;
    transform: translateX(50%);
  }

  .player-hero {
    min-height: auto;
    display: grid;
    grid-template-columns: 1fr;
  }

  .player-hero::before {
    width: 100%;
    height: 560px;
    top: 210px;
  }

  .player-hero-copy {
    position: relative;
    top: auto;
    left: auto;
    width: 100%;
    padding: 28px;
    background: linear-gradient(135deg, rgba(255, 250, 245, .92), rgba(246, 225, 227, .46));
    border: 1px solid rgba(39, 49, 72, .1);
    border-radius: 24px 56px 24px 24px;
  }

  .live2d-stage-player {
    min-height: 540px;
  }

  .live2d-stage-player .stage-topline {
    left: 20px;
    right: 20px;
    width: auto;
    transform: none;
  }

  .player-hero + .workspace {
    margin-top: -54px;
  }

  .player-hero + .workspace .file-grid {
    padding: 0;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

@media (max-width: 600px) {
  .welcome-screen::before {
    width: 460px;
    height: 460px;
    top: 280px;
  }

  .stage-invitation {
    left: 12px;
    bottom: 20px;
  }

  .player-hero-copy {
    padding: 24px 20px;
  }

  .player-hero-copy h1 {
    font-size: clamp(39px, 12vw, 54px);
  }

  .live2d-stage-player {
    min-height: 500px;
  }

  .player-hero + .workspace {
    margin-top: -36px;
  }

  .player-hero + .workspace .file-grid {
    grid-template-columns: 1fr;
  }

  .player-hero + .workspace .file-slot,
  .player-hero + .workspace .file-slot:nth-child(2) {
    border-radius: 18px 18px 18px 6px;
  }

  .player-hero + .workspace .player {
    margin-top: 34px;
    border-radius: 20px 20px 8px 8px;
  }
}
```


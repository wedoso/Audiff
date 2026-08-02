# Audiff architecture

Audiff is a static React/Vite application. Audio decoding, analysis, playback, Live2D rendering, and A/B switching all run inside the browser tab. The production build has no server runtime and remains deployable directly to GitHub Pages.

## Runtime flow

```text
Local File(s)
    │
    ├─ FileReader progress → Web Audio decode → AudioBuffer A/B
    │
    ├─ one shared AudioContext clock → synchronized BufferSource nodes
    │                                  └─ 18 ms A/B gain crossfade
    │
    └─ analyser for audible source
           └─ energy + bass/mid/treble + transient/bass flux
                    ├─ per-track tempo evidence and body-beat scheduler
                    ├─ Hiyori pose/expression state machine
                    ├─ solid music-disc pulse and particles
                    └─ phrase-scale automatic camera
```

`src/App.tsx` owns files, decoded buffers, the shared playback clock, seeking, A/B gain switching, and the current interaction state. `src/audioVisual.ts` samples the analyser. `src/Live2DStage.tsx` consumes the latest features through a ref so the render loop does not require React state updates at 60 fps.

## Audio clock and A/B behavior

- A and B use one `AudioContext.currentTime` reference.
- Both sources start at the same scheduled time and timeline offset.
- Switching tracks changes gain only. It never seeks, changes playback rate, or restarts the clock.
- An 18 ms crossfade prevents clicks while preserving comparison timing.
- The longer decoded file defines the shared timeline. A shorter selected source intentionally becomes silent after its own end.
- Pausing updates the interaction ref, silences the master output, and stops sources in the same input frame.

## Music feature pipeline

The audible track produces these normalized features:

- `energy`: time-domain RMS used for overall activity.
- `bass`: 35–190 Hz, used for body weight and kick evidence.
- `mid`: 190–2400 Hz, retained in the shared feature contract while Hiyori's facial performance remains authored by the official motion.
- `treble`: 2400–10000 Hz, used for restrained particle activity.
- `transient`: combined broadband energy rise and bass spectral rise.

Raw onsets are not mapped directly to body movement. Fast subdivisions would make Hiyori twitch at hi-hat speed. Instead, Audiff folds detected intervals into a 0.5–1.0 second body-groove range, accumulates a per-source tempo histogram, and schedules one body beat at a time.

Each scheduled beat starts a 360 ms asymmetric nod envelope: a quick eased downward accent followed by a longer recovery. It is added at low weight to the official listening motion before Physics, so it reads as musical emphasis without replacing Hiyori's authored timing. Gesture strength follows current energy, bass, and onset evidence. The scheduler cannot continue after playback is paused.

## Live2D motion orchestration

Hiyori's official `hiyori_m01` clip contains coordinated head, torso, face, arm, and hair movement. Audiff treats those authored curves as the main listening performance rather than reconstructing them from isolated parameters.

The motion manager has two explicit states:

- **Playing:** the official `Idle[0]` / `hiyori_m01` motion owns its complete authored parameter set. Audiff adds only a small beat accent to `ParamAngleY`, `ParamBodyAngleY`, and two low-weight sway channels after the motion update and before Physics.
- **Paused or ready:** the Idle group is disabled and all authored motions stop. The SDK's automatic blink, Natural Breath, pointer focus, and Physics remain active, producing a quiet living pose rather than a frozen image.

The official `hiyori_m01` asset declares a 4.7-second loop, but six curves have different start and end values: head X/Y/Z, eye X/Y, and torso Z. A direct modulo loop therefore produces a visible one-frame pose jump. Audiff leaves the authored motion unchanged until its final 720 ms, then applies a smooth endpoint correction that brings those six curves back to their exact starting values. The correction reads Cubism's active motion-queue clock directly rather than integrating the renderer's capped `dt`; a dropped frame therefore cannot put the correction and official loop on different phases. At the wrap boundary the correction returns to zero as the official first frame begins, so position and velocity remain visually continuous.

The SDK's automatic Idle group remains disabled during both rest and playback. Audiff starts only `Idle[0]` explicitly. This prevents the motion manager from briefly selecting the more dramatic `m02` or `m05` while the listening motion request is loading.

The first `startMotion` request can occasionally be rejected while Cubism still owns a stale loading or priority reservation. Playback therefore clears stale reservations before requesting `Idle[0]`, then runs a 550 ms watchdog. The watchdog requests the same official motion only when playback is active, no request is in flight, and Cubism's motion queue is genuinely empty. It never stacks multiple motions or falls back to a random Idle clip.

When pause lands partway through a large authored gesture, Audiff captures every parameter authored by `hiyori_m01` and eases that complete pose to model defaults for 680 ms with zero velocity at both ends. The handoff runs before Physics, so hair and ribbon inertia follows the body's deceleration instead of snapping separately. Eye openness uses a shorter 280 ms blend into the SDK's live blink value. After the handoff, every channel is released; there is no permanent parameter override and no custom blink implementation.

## Playback states

### Ready or paused

- No new onset or scheduled beat can start.
- The listening motion stops and all queued musical beats are cleared immediately.
- The complete authored pose—including arms, brows, gaze, breath, and ahoge—eases upright over 680 ms before Physics.
- A/B listening gaze returns to center; pointer gaze remains available.
- SDK blink, restrained Natural Breath, pointer focus, and Physics remain alive.
- The automatic camera holds the framing captured at pause instead of continuing to push or pull.

### Playing

- The official `hiyori_m01` performance starts from its authored beginning.
- Facial timing, arms, torso motion, and secondary movement come from the official motion and Physics.
- Scheduled body beats add a restrained, visible nod accent without replacing the authored pose.
- In comparison mode, gaze follows the currently audible A or B track.

The paused state is intentionally quiet, not a frozen bitmap. Natural secondary motion must not be confused with a rhythmic head or torso gesture.

## Stage visuals and camera

- One edge-clean solid circle sits behind Hiyori. Phrase energy controls its slow breathing range. Gated low-frequency accents climb through three accumulated size tiers: roughly 8%, 16%, and 24%, plus a small 4% exact-hit accent. After 580 ms without a qualifying hit, the accumulated tier releases slowly. Opacity stays nearly constant, so the response is legible without flashing.
- The circle has no gradient, blur halo, duplicate floor light, or shadow relationship.
- The single neutral contact shadow is a Pixi graphic inside Hiyori's camera rig. It shares the model's position and scale, so wide/close transitions cannot separate the two.
- Automatic camera motion follows phrase-scale energy, never individual onsets.
- Entering the player begins on an upper-body close-up. Mouse-wheel input locks manual framing; the Director control resumes automatic framing.
- Pausing holds the current automatic shot.

## Focus-mode transition

Focus mode changes the composition rather than simply hiding elements:

- the header context and track score leave first;
- the transport reforms as a floating desk;
- the Focus and camera controls enter from their new edges;
- Hiyori's Pixi camera receives an additional 0.2× close-up bias;
- the stage height, camera rig, model scale, and contact shadow interpolate continuously;
- leaving Focus reverses the camera before the score, header, and desk return in staggered layers.

The standard waveform and A/B selector remain the only track controls in both layouts. `prefers-reduced-motion: reduce` disables decorative choreography while preserving the state change.

## Landing-to-player transition

`withSceneTransition` uses a two-phase compositor-friendly curtain. The landing and player remain two arrangements of the same listening room:

- a solid A/B-tinted circle expands to cover the viewport;
- React commits the layout change only after the curtain is opaque;
- the persistent Pixi/Live2D canvas is never captured or duplicated;
- the curtain recedes while track score and console enter in restrained stagger;
- clearing the session uses the same sequence with the alternate accent color.

The interstitial reads “The room is listening.” rather than repeating the product name. The animation uses transform and opacity only, avoiding expensive canvas filters and clip-path snapshots. `prefers-reduced-motion: reduce` skips the curtain and commits the scene immediately.

## Static deployment

`npm run build` emits `dist/` containing static HTML, JavaScript, CSS, images, Cubism Core, and the Hiyori assets. Vite uses relative asset paths, so the same output works at a domain root or a GitHub Pages repository path.

The deployment workflow runs the checks and publishes `dist/`. No API keys, server functions, database, cookies, analytics, or upload endpoint are required.

## Validation

Run the complete suite with:

```bash
npm run check
```

The checks cover the portable build, synchronized audio clock, immediate pause signaling, Live2D parameter ownership, beat scheduling, camera separation, stage-light/shadow invariants, responsive collision rules, and the landing/player transition fallback.

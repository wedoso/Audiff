# Shared UI components

## Live2DStage
- Path: `src/Live2DStage.tsx`
- Interactive Hiyori canvas with official Idle base, audio-reactive internal pose, continuous blink ownership, and beat-reactive ambient lighting.

```tsx
import type { Application as PixiApplication } from "pixi.js";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { AudioVisualFeatures } from "./audioVisual";

type StageVariant = "welcome" | "player";

type Live2DStageProps = {
  featuresRef: MutableRefObject<AudioVisualFeatures>;
  variant: StageVariant;
  trackLabel: string;
  activeSource: 0 | 1;
  isComparing: boolean;
  isPlaying: boolean;
  onPickAudio?: () => void;
};

type CoreModel = {
  getParameterIndex: (id: string) => number;
  addParameterValueByIndex: (index: number, value: number, weight?: number) => void;
  setParameterValueByIndex: (index: number, value: number, weight?: number) => void;
};

type FocusController = {
  focus: (x: number, y: number, instant?: boolean) => void;
};

type MotionManagerController = {
  startMotion: (
    group: string,
    index: number,
    priority: number,
    options?: { ignoreParamIds?: string[] },
  ) => Promise<boolean>;
  on: (event: "afterMotionUpdate", listener: () => void) => void;
  off: (event: "afterMotionUpdate", listener: () => void) => void;
};

type InternalModelControls = {
  coreModel: CoreModel;
  focusController: FocusController;
  eyeBlink?: unknown;
  motionManager: MotionManagerController;
};

export default function Live2DStage({
  featuresRef,
  variant,
  trackLabel,
  activeSource,
  isComparing,
  isPlaying,
  onPickAudio,
}: Live2DStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const variantRef = useRef(variant);
  const layoutRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    variantRef.current = variant;
    layoutRef.current?.();
  }, [variant]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let app: PixiApplication | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let cleanupPointer: (() => void) | null = null;
    let cleanupMotionPose: (() => void) | null = null;

    async function mountModel() {
      try {
        const [{ Application, UPDATE_PRIORITY }, { Live2DModel, configureCubism4 }] = await Promise.all([
          import("pixi.js"),
          import("pixi-live2d-display-advanced/cubism4"),
        ]);
        if (disposed) return;
        configureCubism4({ memorySizeMB: 64 });
        app = new Application({
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          width: host?.clientWidth || 720,
          height: host?.clientHeight || 720,
        });
        if (!host || disposed) return;
        const canvas = app.view as HTMLCanvasElement;
        canvas.className = "live2d-canvas";
        canvas.setAttribute("aria-label", "Hiyori, an interactive Live2D music companion");
        host.appendChild(canvas);

        const base = import.meta.env.BASE_URL;
        const model = await Live2DModel.from(`${base}live2d/hiyori/hiyori_free_t08.model3.json`, {
          autoHitTest: false,
          autoFocus: false,
          autoUpdate: false,
          ticker: app.ticker,
        });
        if (disposed || !app) {
          model.destroy();
          return;
        }
        model.anchor.set(0.5, 0.5);
        app.stage.addChild(model);
        app.ticker.maxFPS = 60;
        app.ticker.minFPS = 30;
        const internalModel = model.internalModel as unknown as InternalModelControls;
        // Hiyori ships with three looping Idle motions. m01 has the gentlest
        // authored body range, so it is a stable musical base; m02/m05 contain
        // large ±30° head turns that feel arbitrary when repeated to a track.
        // Its authored eye curves are excluded so one SDK eye-blink controller is
        // the sole writer, avoiding a motion/auto-blink handoff on adjacent frames.
        await internalModel.motionManager.startMotion("Idle", 0, 1, {
          ignoreParamIds: ["ParamEyeLOpen", "ParamEyeROpen"],
        });
        // Disable the internal fallback because this looping motion is always
        // active. One explicit continuous curve below owns both EyeOpen values.
        internalModel.eyeBlink = undefined;
        const naturalWidth = model.width;
        const naturalHeight = model.height;

        const layout = () => {
          if (!app || !host) return;
          app.renderer.resize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
          const isWelcome = variantRef.current === "welcome";
          const isCompact = host.clientWidth < 600;
          const targetHeight = host.clientHeight * 0.88;
          const targetWidth = host.clientWidth * (isCompact ? 0.84 : isWelcome ? 0.68 : 0.64);
          const scale = Math.min(targetHeight / naturalHeight, targetWidth / naturalWidth);
          model.scale.set(scale);
          model.x = host.clientWidth * (isWelcome && !isCompact ? 0.58 : 0.5);
          model.y = host.clientHeight * 0.54;
        };
        layoutRef.current = layout;
        layout();
        resizeObserver = new ResizeObserver(layout);
        resizeObserver.observe(host);

        let pointerX = 0;
        let pointerY = 0;
        const handlePointer = (event: PointerEvent) => {
          const bounds = host.getBoundingClientRect();
          pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
          pointerY = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
        };
        const resetPointer = () => { pointerX = 0; pointerY = 0; };
        host.addEventListener("pointermove", handlePointer);
        host.addEventListener("pointerleave", resetPointer);
        cleanupPointer = () => {
          host.removeEventListener("pointermove", handlePointer);
          host.removeEventListener("pointerleave", resetPointer);
        };

        let lastSource: 0 | 1 = featuresRef.current.source;
        let rhythmPhase = 0;
        let beatInterval = 0.58;
        let targetBeatInterval = 0.58;
        let timeSinceOnset = 1;
        let variationPhase = 0;
        let energy = 0;
        let bass = 0;
        let mid = 0;
        let gazeX = 0;
        let gazeY = 0;
        let switchAccent = 0;
        let activity = 0;
        let nodAngle = 0;
        let nodVelocity = 0;
        let beatCooldown = 0;
        let lastTransient = 0;
        let transientFloor = 0;
        let lightPulse = 0;
        let poseSway = 0;
        let poseCounterSway = 0;
        let poseGroove = 0;
        let poseNod = 0;
        let blinkOpen = 1;
        let blinkElapsed = -1;
        let blinkWait = 3.8;
        let blinkCount = 0;
        const core = internalModel.coreModel;
        const focusController = internalModel.focusController;
        const parameterIndexes = new Map(
          [
            "ParamBodyAngleX", "ParamBodyAngleZ", "ParamAngleZ", "ParamBreath",
            "ParamAngleY", "ParamBodyAngleY", "ParamMouthForm", "ParamBustY", "ParamCheek",
          ].map((id) => [id, core.getParameterIndex(id)]),
        );
        const addMusicParameter = (id: string, value: number, weight: number) => {
          const index = parameterIndexes.get(id);
          if (index !== undefined && index >= 0) core.addParameterValueByIndex(index, value, weight);
        };
        const eyeLeftIndex = core.getParameterIndex("ParamEyeLOpen");
        const eyeRightIndex = core.getParameterIndex("ParamEyeROpen");

        const applyMusicPose = () => {
          // Both eyes are written once inside the authored motion transaction.
          if (eyeLeftIndex >= 0) core.setParameterValueByIndex(eyeLeftIndex, blinkOpen);
          if (eyeRightIndex >= 0) core.setParameterValueByIndex(eyeRightIndex, blinkOpen);
          addMusicParameter("ParamAngleY", -poseNod * (0.72 + bass * 0.22), 0.46);
          addMusicParameter("ParamBodyAngleY", -poseNod * 0.22, 0.32);
          addMusicParameter("ParamBodyAngleX", poseSway * poseGroove * (1.6 + bass * 3.8) + gazeX * 1.2 + switchAccent, 0.46);
          addMusicParameter("ParamBodyAngleZ", poseCounterSway * poseGroove * (0.8 + energy * 1.8), 0.38);
          addMusicParameter("ParamAngleZ", -poseSway * poseGroove * (0.9 + bass * 2.1) + switchAccent * 0.7, 0.34);
          addMusicParameter("ParamBreath", energy * 0.34 + bass * 0.16, 0.4);
          addMusicParameter("ParamBustY", Math.min(0.22, Math.abs(poseNod) * 0.025), 0.25);
          addMusicParameter("ParamMouthForm", mid * 0.1 + energy * 0.08, 0.18);
          addMusicParameter("ParamCheek", energy * 0.12, 0.18);
        };
        internalModel.motionManager.on("afterMotionUpdate", applyMusicPose);
        cleanupMotionPose = () => internalModel.motionManager.off("afterMotionUpdate", applyMusicPose);

        app.ticker.add(() => {
          const features = featuresRef.current;
          const dt = Math.min(1 / 30, Math.max(0.001, app?.ticker.deltaMS ? app.ticker.deltaMS / 1000 : 1 / 60));
          const follow = (value: number, target: number, speed: number) => (
            value + (target - value) * (1 - Math.exp(-speed * dt))
          );
          const listening = features.isPlaying ? 1 : 0;

          activity = follow(activity, listening, features.isPlaying ? 4.8 : 1.9);
          energy = follow(energy, features.energy * listening, features.isPlaying ? 7 : 2.8);
          bass = follow(bass, features.bass * listening, features.isPlaying ? 6 : 2.5);
          mid = follow(mid, features.mid * listening, features.isPlaying ? 5.5 : 2.4);

          // Estimate a stable beat interval from onsets. The authored Idle motion stays
          // in control; this only supplies small, phase-coherent pose offsets.
          beatCooldown = Math.max(0, beatCooldown - dt);
          timeSinceOnset += dt;
          const transientRise = features.transient - lastTransient;
          transientFloor = follow(
            transientFloor,
            features.transient,
            features.transient < transientFloor ? 5.2 : 0.55,
          );
          const onsetStrength = Math.max(0, features.transient - transientFloor);
          if (features.isPlaying && beatCooldown === 0 && transientRise > 0.028 && onsetStrength > 0.04) {
            if (timeSinceOnset >= 0.28 && timeSinceOnset <= 1.2) {
              let candidate = timeSinceOnset;
              if (candidate > 0.82) candidate *= 0.5;
              targetBeatInterval += (candidate - targetBeatInterval) * 0.2;
            }
            const nearestBeat = Math.round(rhythmPhase / Math.PI) * Math.PI;
            rhythmPhase += (nearestBeat - rhythmPhase) * 0.16;
            const gestureVariation = 0.78 + Math.sin(variationPhase * 1.7) * 0.13 + Math.sin(variationPhase * 0.63 + 1.4) * 0.09;
            nodVelocity += (30 + Math.min(1, onsetStrength * 5) * 22) * gestureVariation;
            lightPulse = Math.max(lightPulse, Math.min(1, onsetStrength * 5.5 + bass * 0.35));
            timeSinceOnset = 0;
            beatCooldown = 0.2;
          }
          lastTransient = features.transient;
          beatInterval = follow(beatInterval, targetBeatInterval, 1.25);
          rhythmPhase += dt * Math.PI / beatInterval;
          variationPhase += dt * (0.17 + energy * 0.06);
          nodVelocity += (-nodAngle * 92 - nodVelocity * 15) * dt;
          nodAngle += nodVelocity * dt;
          lightPulse *= Math.exp(-4.6 * dt);

          if (blinkElapsed < 0) {
            blinkWait -= dt;
            if (blinkWait <= 0) blinkElapsed = 0;
          } else {
            blinkElapsed += dt;
            const closing = 0.18;
            const closed = 0.045;
            const opening = 0.24;
            const smoothstep = (value: number) => value * value * (3 - 2 * value);
            if (blinkElapsed < closing) {
              blinkOpen = 1 - smoothstep(blinkElapsed / closing);
            } else if (blinkElapsed < closing + closed) {
              blinkOpen = 0;
            } else if (blinkElapsed < closing + closed + opening) {
              blinkOpen = smoothstep((blinkElapsed - closing - closed) / opening);
            } else {
              blinkOpen = 1;
              blinkElapsed = -1;
              blinkCount += 1;
              blinkWait = 4.5 + Math.sin(blinkCount * 2.399 + variationPhase * 0.37) * 1.15;
            }
          }

          if (lastSource !== features.source) {
            lastSource = features.source;
            switchAccent = features.source === 0 ? -1 : 1;
          }
          switchAccent *= Math.exp(-2.2 * dt);

          const sourceGaze = features.isComparing ? (features.source === 0 ? -0.62 : 0.62) : pointerX * 0.32;
          const sourceGazeY = features.isComparing ? 0.04 : pointerY * 0.22;
          gazeX = follow(gazeX, sourceGaze, features.isComparing ? 2.6 : 4.2);
          gazeY = follow(gazeY, sourceGazeY, 3.4);
          // This controller accepts normalized coordinates directly. `model.focus()`
          // expects world-space pixels, which would make an A/B target near zero
          // collapse toward the upper-left corner rather than the intended side.
          focusController.focus(gazeX, gazeY);

          const phaseDrift = Math.sin(variationPhase * 0.71) * 0.12;
          const amplitudeDrift = 0.86 + Math.sin(variationPhase) * 0.1 + Math.sin(variationPhase * 0.43 + 0.8) * 0.04;
          poseSway = Math.sin(rhythmPhase + phaseDrift);
          poseCounterSway = Math.sin(rhythmPhase * 0.5 + 0.7 + phaseDrift * 0.5);
          poseGroove = activity * Math.min(1, 0.16 + energy * 0.75 + bass * 1.2) * amplitudeDrift;
          poseNod = nodAngle * activity;

          const stage = stageRef.current;
          if (stage) {
            stage.style.setProperty("--music-energy", energy.toFixed(3));
            stage.style.setProperty("--music-bass", bass.toFixed(3));
            stage.style.setProperty("--beat-pulse", lightPulse.toFixed(3));
          }
        }, undefined, UPDATE_PRIORITY.HIGH);

        model.automator.autoUpdate = true;
        if (!disposed) setStatus("ready");
      } catch (error) {
        console.error("Live2D model failed to load", error);
        if (!disposed) setStatus("error");
      }
    }

    void mountModel();
    return () => {
      disposed = true;
      layoutRef.current = null;
      resizeObserver?.disconnect();
      cleanupPointer?.();
      cleanupMotionPose?.();
      try {
        app?.destroy(true, { children: true, texture: true, baseTexture: true });
      } catch (error) {
        console.warn("Live2D cleanup completed with a renderer warning", error);
      }
    };
  }, [featuresRef]);

  const listeningLabel = isComparing ? `Listening to ${activeSource === 0 ? "A" : "B"}` : isPlaying ? "Listening with you" : "Waiting for play";

  return (
    <section ref={stageRef} className={`live2d-stage live2d-stage-${variant} light-${activeSource === 0 ? "a" : "b"}`} aria-label="Interactive music companion">
      <div className="stage-glow" />
      <div className="stage-ambient-light" />
      <div className="stage-floor-light" />
      <div className="live2d-host" ref={hostRef} />
      <div className="stage-topline">
        <span><i className={status === "ready" ? "is-ready" : ""} /> {status === "ready" ? listeningLabel : `Hiyori / ${status}`}</span>
        <span>{trackLabel}</span>
      </div>
      {status === "error" && (
        <div className="model-error">Live2D could not start. Audio playback remains available.</div>
      )}
      {variant === "welcome" && (
        <div className="stage-invitation">
          <span>YOUR MUSIC, HER MOVEMENT</span>
          <strong>Hiyori is ready to listen.</strong>
          <button type="button" onClick={onPickAudio}>Choose an audio file</button>
        </div>
      )}
    </section>
  );
}
```


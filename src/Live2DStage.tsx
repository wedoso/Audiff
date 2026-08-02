import type { Application as PixiApplication } from "pixi.js";
import { Lock, Mouse, ScanFace, ScanLine, Sparkles } from "lucide-react";
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
  focusMode: boolean;
  onPickAudio?: () => void;
};

const PARTICLES = [
  [18, 74, 0.8, 7.2], [27, 61, 2.7, 8.4], [36, 78, 4.1, 6.8],
  [44, 67, 1.9, 9.2], [55, 76, 5.4, 7.8], [63, 64, 3.3, 8.8],
  [72, 79, 0.2, 7.5], [81, 59, 4.8, 9.6], [31, 49, 6.2, 8.1],
  [68, 46, 2.1, 7.1], [47, 55, 7.4, 9.1], [58, 42, 5.8, 8.6],
] as const;

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
  focusMode,
  onPickAudio,
}: Live2DStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const variantRef = useRef(variant);
  const previousVariantRef = useRef(variant);
  const focusModeRef = useRef(focusMode);
  const layoutRef = useRef<(() => void) | null>(null);
  const cameraModeRef = useRef<"auto" | "locked">("auto");
  const manualZoomRef = useRef(1);
  const currentCameraZoomRef = useRef(1);
  const autoSuspendUntilRef = useRef(0);
  const zoomTimerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [cameraMode, setCameraMode] = useState<"auto" | "locked">("auto");
  const [zoomReadout, setZoomReadout] = useState(100);
  const [showZoom, setShowZoom] = useState(false);

  useEffect(() => {
    const enteringPlayer = previousVariantRef.current === "welcome" && variant === "player";
    const leavingPlayer = previousVariantRef.current === "player" && variant === "welcome";
    variantRef.current = variant;
    focusModeRef.current = focusMode;
    if (enteringPlayer) {
      // Establish an intimate first shot before the phrase director takes over.
      // The camera rig moves; Hiyori's authored model coordinates stay untouched.
      manualZoomRef.current = 2.12;
      autoSuspendUntilRef.current = performance.now() + 2800;
      cameraModeRef.current = "auto";
      setCameraMode("auto");
    } else if (leavingPlayer) {
      manualZoomRef.current = 1;
      currentCameraZoomRef.current = 1;
      autoSuspendUntilRef.current = 0;
      cameraModeRef.current = "auto";
      setCameraMode("auto");
    }
    previousVariantRef.current = variant;
    layoutRef.current?.();
  }, [focusMode, variant]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

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
        const [{ Application, Container, UPDATE_PRIORITY }, { Live2DModel, configureCubism4 }] = await Promise.all([
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
        const cameraRig = new Container();
        cameraRig.addChild(model);
        app.stage.addChild(cameraRig);
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
        let targetModelScale = 1;
        let currentModelScale = 1;
        let targetRigX = host.clientWidth * 0.5;
        let targetRigY = host.clientHeight * 0.54;
        let currentRigX = targetRigX;
        let currentRigY = targetRigY;
        let layoutInitialized = false;
        let isCompactLayout = host.clientWidth < 600;

        const layout = () => {
          if (!app || !host) return;
          app.renderer.resize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
          const isWelcome = variantRef.current === "welcome";
          const isCompact = host.clientWidth < 600;
          isCompactLayout = isCompact;
          const focused = focusModeRef.current && !isWelcome;
          const targetHeight = host.clientHeight * (focused ? 0.68 : 0.88);
          const targetWidth = host.clientWidth * (isCompact ? 0.84 : isWelcome ? 0.68 : focused ? 0.64 : 0.64);
          targetModelScale = Math.min(targetHeight / naturalHeight, targetWidth / naturalWidth);
          targetRigX = host.clientWidth * (isWelcome && !isCompact ? 0.58 : 0.5);
          targetRigY = host.clientHeight * (focused ? 0.51 : 0.54);
          if (!layoutInitialized) {
            currentModelScale = targetModelScale;
            currentRigX = targetRigX;
            currentRigY = targetRigY;
            model.scale.set(currentModelScale);
            cameraRig.position.set(currentRigX, currentRigY);
            layoutInitialized = true;
          }
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
        const revealZoom = () => {
          setZoomReadout(Math.round(manualZoomRef.current * 100));
          setShowZoom(true);
          if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current);
          zoomTimerRef.current = window.setTimeout(() => setShowZoom(false), 1100);
        };
        const handleWheel = (event: WheelEvent) => {
          if (variantRef.current !== "player") return;
          event.preventDefault();
          const delta = Math.max(-80, Math.min(80, event.deltaY));
          manualZoomRef.current = Math.max(0.78, Math.min(2.35, currentCameraZoomRef.current * Math.exp(-delta * 0.0018)));
          autoSuspendUntilRef.current = Number.POSITIVE_INFINITY;
          cameraModeRef.current = "locked";
          setCameraMode("locked");
          revealZoom();
        };
        host.addEventListener("pointermove", handlePointer);
        host.addEventListener("pointerleave", resetPointer);
        host.addEventListener("wheel", handleWheel, { passive: false });
        cleanupPointer = () => {
          host.removeEventListener("pointermove", handlePointer);
          host.removeEventListener("pointerleave", resetPointer);
          host.removeEventListener("wheel", handleWheel);
        };

        let lastSource: 0 | 1 = featuresRef.current.source;
        let rhythmPhase = 0;
        let beatInterval = 0.58;
        let targetBeatInterval = 0.58;
        let timeSinceOnset = 1;
        let variationPhase = 0;
        let energy = 0;
        let energyLong = 0;
        let bass = 0;
        let mid = 0;
        let treble = 0;
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
        let particlePulse = 0;
        let wasListening = false;
        let cameraPhase = Math.PI;
        let cameraZoom = 1;
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
            "ParamAngleX", "ParamAngleY", "ParamBodyAngleY", "ParamEyeBallX", "ParamEyeBallY",
            "ParamEyeLSmile", "ParamEyeRSmile", "ParamMouthForm", "ParamBustY", "ParamCheek",
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
          const attentiveEyeOpen = blinkOpen * (1 - activity * (0.045 + energy * 0.025));
          if (eyeLeftIndex >= 0) core.setParameterValueByIndex(eyeLeftIndex, attentiveEyeOpen);
          if (eyeRightIndex >= 0) core.setParameterValueByIndex(eyeRightIndex, attentiveEyeOpen);
          // Playing eases into an attentive expression and slight forward lean;
          // pausing releases the same parameters continuously back to authored idle.
          addMusicParameter("ParamEyeLSmile", activity * (0.1 + energy * 0.12), 0.34);
          addMusicParameter("ParamEyeRSmile", activity * (0.1 + energy * 0.12), 0.34);
          addMusicParameter("ParamAngleY", -activity * 1.15 - poseNod * (1.38 + bass * 0.52), 0.56);
          addMusicParameter("ParamAngleX", gazeX * 5.8, 0.44);
          addMusicParameter("ParamEyeBallX", gazeX * 0.24, 0.62);
          addMusicParameter("ParamEyeBallY", gazeY * 0.18, 0.56);
          addMusicParameter("ParamBodyAngleY", -activity * 0.42 - poseNod * 0.34, 0.4);
          addMusicParameter("ParamBodyAngleX", poseSway * poseGroove * (2.2 + bass * 5.2) + gazeX * 1.2 + switchAccent, 0.52);
          addMusicParameter("ParamBodyAngleZ", poseCounterSway * poseGroove * (1.15 + energy * 2.35), 0.44);
          addMusicParameter("ParamAngleZ", -poseSway * poseGroove * (1.25 + bass * 2.9) + switchAccent * 0.7, 0.42);
          addMusicParameter("ParamBreath", activity * 0.12 + energy * 0.38 + bass * 0.18, 0.42);
          addMusicParameter("ParamBustY", Math.min(0.22, Math.abs(poseNod) * 0.025), 0.25);
          addMusicParameter("ParamMouthForm", activity * 0.25 + mid * 0.12 + energy * 0.1, 0.28);
          addMusicParameter("ParamCheek", activity * 0.08 + energy * 0.14, 0.24);
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

          if (features.isPlaying && !wasListening) {
            // Start every listening session from a neutral groove phase. The first
            // detected onset then performs a small correction instead of inheriting
            // an arbitrary phase accumulated while paused.
            rhythmPhase = 0;
            timeSinceOnset = beatInterval;
            nodAngle = 0;
            nodVelocity = 0;
          }
          wasListening = features.isPlaying;

          activity = follow(activity, listening, features.isPlaying ? 4.8 : 1.9);
          energy = follow(energy, features.energy * listening, features.isPlaying ? 7 : 2.8);
          energyLong = follow(energyLong, features.energy * listening, features.isPlaying ? 0.7 : 1.3);
          bass = follow(bass, features.bass * listening, features.isPlaying ? 6 : 2.5);
          mid = follow(mid, features.mid * listening, features.isPlaying ? 5.5 : 2.4);
          treble = follow(treble, features.treble * listening, features.isPlaying ? 4.5 : 2.2);

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
            nodVelocity += (38 + Math.min(1, onsetStrength * 5) * 28) * gestureVariation;
            lightPulse = Math.max(lightPulse, Math.min(1, onsetStrength * 5.5 + bass * 0.35));
            if (treble > 0.12) particlePulse = Math.max(particlePulse, Math.min(1, onsetStrength * 4.2 + treble * 0.24));
            timeSinceOnset = 0;
            beatCooldown = 0.2;
          }
          lastTransient = features.transient;
          beatInterval = follow(beatInterval, targetBeatInterval, 1.25);
          rhythmPhase += dt * Math.PI / beatInterval * listening;
          variationPhase += dt * (0.17 + energy * 0.06);
          nodVelocity += (-nodAngle * 92 - nodVelocity * 15) * dt;
          nodAngle += nodVelocity * dt;
          lightPulse *= Math.exp(-3.1 * dt);
          particlePulse *= Math.exp(-1.35 * dt);

          // Camera movement lives on a separate rig. It follows phrase-scale
          // energy and never uses individual onsets, keeping musical pose and
          // framing independent. Wheel input temporarily takes priority.
          cameraPhase += dt * (0.36 + energyLong * 0.08) * listening;
          const phraseArc = (1 - Math.cos(cameraPhase)) * 0.5;
          const autoZoom = features.isPlaying
            ? 1.46 + phraseArc * 0.54 + energyLong * 0.07
            : variantRef.current === "player" ? 2.02 : 1;
          const autoSuspended = performance.now() < autoSuspendUntilRef.current;
          const targetCameraZoom = cameraModeRef.current === "locked" || autoSuspended
            ? manualZoomRef.current
            : Math.max(1.42, Math.min(2.1, autoZoom));
          cameraZoom = follow(cameraZoom, targetCameraZoom, autoSuspended ? 5.2 : 0.95);
          currentCameraZoomRef.current = cameraZoom;
          currentModelScale = follow(currentModelScale, targetModelScale, 3.6);
          currentRigX = follow(currentRigX, targetRigX, 3.2);
          currentRigY = follow(currentRigY, targetRigY, 3.2);
          model.scale.set(currentModelScale);
          const portraitOffsetFactor = focusModeRef.current || isCompactLayout ? 0.14 : 0.29;
          const portraitOffset = Math.max(0, cameraZoom - 1) * host.clientHeight * portraitOffsetFactor;
          cameraRig.position.set(currentRigX, currentRigY + portraitOffset);
          cameraRig.scale.set(cameraZoom);

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

          const sourceGaze = features.isComparing ? (features.source === 0 ? -0.82 : 0.82) : pointerX * 0.32;
          const sourceGazeY = features.isComparing ? (isCompactLayout ? 0.24 : 0.18) : pointerY * 0.22;
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
          poseGroove = activity * Math.min(1, 0.28 + energy * 0.9 + bass * 1.35) * amplitudeDrift;
          const phaseNod = Math.max(0, Math.sin(rhythmPhase * 2)) * poseGroove * 0.72;
          poseNod = (nodAngle + phaseNod) * activity;

          const stage = stageRef.current;
          if (stage) {
            stage.style.setProperty("--music-energy", energy.toFixed(3));
            stage.style.setProperty("--music-energy-long", energyLong.toFixed(3));
            stage.style.setProperty("--music-bass", bass.toFixed(3));
            stage.style.setProperty("--beat-pulse", lightPulse.toFixed(3));
            stage.style.setProperty("--particle-strength", particlePulse.toFixed(3));
            stage.style.setProperty("--camera-zoom", cameraZoom.toFixed(3));
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
      if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current);
      try {
        app?.destroy(true, { children: true, texture: true, baseTexture: true });
      } catch (error) {
        console.warn("Live2D cleanup completed with a renderer warning", error);
      }
    };
  }, [featuresRef]);

  const listeningLabel = variant === "welcome"
    ? "Waiting for a track"
    : !isPlaying
      ? "Paused · resting"
      : isComparing
        ? `Listening to ${activeSource === 0 ? "A" : "B"}`
        : "Listening with you";

  return (
    <section ref={stageRef} className={`live2d-stage live2d-stage-${variant} light-${activeSource === 0 ? "a" : "b"} ${focusMode ? "is-focused" : ""}`} aria-label="Interactive music companion">
      <div className="stage-glow" />
      <div className="stage-ambient-light" />
      <div className="stage-floor-light" />
      <div className="stage-particles" aria-hidden="true">
        {PARTICLES.map(([left, top, delay, duration], index) => (
          <span
            key={index}
            style={{ "--particle-left": `${left}%`, "--particle-top": `${top}%`, "--particle-delay": `${delay}s`, "--particle-duration": `${duration}s` } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="live2d-host" ref={hostRef} />
      <div className="stage-topline">
        <span><i className={status === "ready" ? "is-ready" : ""} /> {status === "ready" ? listeningLabel : `Hiyori / ${status}`}</span>
        <span>{trackLabel}</span>
      </div>
      {status === "error" && (
        <div className="model-error">Live2D could not start. Audio playback remains available.</div>
      )}
      {variant === "player" && (
        <div className="camera-capsule" aria-label="Camera controls">
          <button
            type="button"
            className={cameraMode === "auto" ? "is-active" : ""}
            aria-pressed={cameraMode === "auto"}
            title="Toggle automatic phrase-level framing"
            onClick={() => {
              if (cameraMode === "auto") {
                manualZoomRef.current = currentCameraZoomRef.current;
                setCameraMode("locked");
              } else {
                autoSuspendUntilRef.current = 0;
                setCameraMode("auto");
              }
            }}
          >
            {cameraMode === "auto" ? <Sparkles size={15} strokeWidth={1.7} /> : <Lock size={14} strokeWidth={1.7} />}
            <span>{cameraMode === "auto" ? "Director" : "Manual"}</span>
          </button>
          <i aria-hidden="true" />
          <button
            type="button"
            title="Portrait framing — Hiyori from the waist up"
            aria-label="Portrait upper-body framing"
            onClick={() => {
              manualZoomRef.current = 2.12;
              cameraModeRef.current = "locked";
              autoSuspendUntilRef.current = Number.POSITIVE_INFINITY;
              setCameraMode("locked");
              setZoomReadout(212);
              setShowZoom(true);
              if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current);
              zoomTimerRef.current = window.setTimeout(() => setShowZoom(false), 1100);
            }}
          >
            <ScanFace size={15} strokeWidth={1.7} />
            <span>Portrait</span>
          </button>
          <i aria-hidden="true" />
          <button
            type="button"
            title="Wide framing"
            aria-label="Wide full-body framing"
            onClick={() => {
              manualZoomRef.current = 1;
              autoSuspendUntilRef.current = Number.POSITIVE_INFINITY;
              cameraModeRef.current = "locked";
              setCameraMode("locked");
              setZoomReadout(100);
              setShowZoom(true);
              if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current);
              zoomTimerRef.current = window.setTimeout(() => setShowZoom(false), 1100);
            }}
          >
            <ScanLine size={15} strokeWidth={1.7} />
            <span>Wide</span>
          </button>
          <span className={`camera-zoom ${showZoom ? "is-visible" : ""}`}>{zoomReadout}%</span>
          <span className="camera-hint"><Mouse size={11} strokeWidth={1.7} /> scroll to frame</span>
        </div>
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

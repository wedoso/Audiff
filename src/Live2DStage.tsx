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

// hiyori_m01 authors all of these channels. Pause must hand off the complete
// pose: omitting even the arms, brows, gaze, breath, or ahoge makes that part
// snap to its default on the frame stopAllMotions() runs.
const REST_SETTLE_PARAM_IDS = [
  "ParamAngleX", "ParamAngleY", "ParamAngleZ",
  "ParamArmLA", "ParamArmRA",
  "ParamBodyAngleX", "ParamBodyAngleY", "ParamBodyAngleZ",
  "ParamBreath", "ParamBrowLForm", "ParamBrowRForm",
  "ParamEyeBallX", "ParamEyeBallY",
  "ParamEyeLOpen", "ParamEyeROpen", "ParamEyeLSmile", "ParamEyeRSmile",
  "ParamHairAhoge", "ParamMouthForm", "ParamMouthOpenY", "ParamCheek",
] as const;

const REST_EYE_OPEN_PARAM_IDS = new Set(["ParamEyeLOpen", "ParamEyeROpen"]);
const REST_SETTLE_SECONDS = 0.68;
const REST_EYE_HANDOFF_SECONDS = 0.28;

const PLAYING_IDLE_GROUP = "Idle";
const RESTING_IDLE_GROUP = "__audiff_resting__";
const OFFICIAL_LISTENING_DURATION = 4.7;
const MOTION_LOOP_SEAM_SECONDS = 0.72;

// hiyori_m01 is marked as looping, but six of its authored curves do not end
// where they begin. These deltas close only that final seam; the preceding
// official motion remains untouched.
const MOTION_LOOP_CORRECTIONS = [
  ["ParamAngleX", -9],
  ["ParamAngleY", 4],
  ["ParamAngleZ", 11.207],
  ["ParamEyeBallX", -0.803],
  ["ParamEyeBallY", -0.794],
  ["ParamBodyAngleZ", 3.976],
] as const;

type CoreModel = {
  getParameterIndex: (id: string) => number;
  getParameterDefaultValue: (index: number) => number;
  getParameterValueByIndex: (index: number) => number;
  addParameterValueByIndex: (index: number, value: number, weight?: number) => void;
  setParameterValueByIndex: (index: number, value: number, weight?: number) => void;
};

type FocusController = {
  focus: (x: number, y: number, instant?: boolean) => void;
};

type MotionQueueEntryController = {
  getStartTime: () => number;
  getStateTime: () => number;
  isFinished: () => boolean;
  isStarted: () => boolean;
};

type MotionManagerController = {
  groups: { idle: string };
  queueManager?: { _motions?: MotionQueueEntryController[] };
  startMotion: (
    group: string,
    index: number,
    priority: number,
    options?: { ignoreParamIds?: string[] },
  ) => Promise<boolean>;
  stopAllMotions: () => void;
  on: (event: "afterMotionUpdate", listener: () => void) => void;
  off: (event: "afterMotionUpdate", listener: () => void) => void;
};

type InternalModelControls = {
  coreModel: CoreModel;
  focusController: FocusController;
  eyeBlink?: unknown;
  motionManager: MotionManagerController;
  on: (event: "beforeModelUpdate", listener: () => void) => void;
  off: (event: "beforeModelUpdate", listener: () => void) => void;
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
  const previousFocusModeRef = useRef(focusMode);
  const focusModeRef = useRef(focusMode);
  const focusCameraTransitionUntilRef = useRef(0);
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
    const changingFocus = previousFocusModeRef.current !== focusMode;
    variantRef.current = variant;
    focusModeRef.current = focusMode;
    if (changingFocus) focusCameraTransitionUntilRef.current = performance.now() + 1100;
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
    previousFocusModeRef.current = focusMode;
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
        const [{ Application, BlurFilter, Container, Graphics, UPDATE_PRIORITY }, { Live2DModel, configureCubism4 }] = await Promise.all([
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
        app.stage.addChild(cameraRig);
        app.ticker.maxFPS = 60;
        app.ticker.minFPS = 30;
        const internalModel = model.internalModel as unknown as InternalModelControls;
        // Rest is intentionally not an authored looping motion. The official m01
        // clip becomes the listening performance only while audio is playing;
        // paused Hiyori keeps the SDK's quiet blink, breath, focus, and Physics.
        internalModel.motionManager.groups.idle = RESTING_IDLE_GROUP;
        internalModel.motionManager.stopAllMotions();
        const naturalWidth = model.width;
        const naturalHeight = model.height;
        const contactShadow = new Graphics();
        contactShadow.beginFill(0x202b46, 0.17);
        contactShadow.drawEllipse(0, naturalHeight * 0.49, naturalWidth * 0.28, naturalHeight * 0.011);
        contactShadow.endFill();
        contactShadow.filters = [new BlurFilter(5, 2)];
        cameraRig.addChild(contactShadow, model);
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
            contactShadow.scale.set(currentModelScale);
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
        let beatInterval = 0.68;
        let targetBeatInterval = 0.68;
        const tempoBinsBySource = [new Float32Array(26), new Float32Array(26)] as const;
        const tempoEvidenceBySource = [0, 0];
        const learnedBeatIntervalBySource = [0.68, 0.68];
        let timeSinceOnset = 1;
        let variationPhase = 0;
        let energy = 0;
        let energyLong = 0;
        let bass = 0;
        let treble = 0;
        let gazeX = 0;
        let gazeY = 0;
        let switchAccent = 0;
        let activity = 0;
        let nodGestureTime = Number.POSITIVE_INFINITY;
        let nodGestureStrength = 0;
        let onsetCooldown = 0;
        let beatClock = 0;
        let pendingBeatAccent = 0;
        let hasNoddedSincePlay = false;
        let lastTransient = 0;
        let lastBassInput = 0;
        let transientFloor = 0;
        let lightPulse = 0;
        let lightImpulse = 0;
        let lightAccentCooldown = 0;
        let lightTier = 0;
        let lightTierTarget = 0;
        let lightTierStep = 0;
        let timeSinceLightAccent = Number.POSITIVE_INFINITY;
        let particlePulse = 0;
        let wasListening = false;
        let motionRequestVersion = 0;
        let motionStartInFlightVersion: number | null = null;
        let motionWatchdog = 0;
        let hasPlayed = false;
        let pausedCameraZoom = 2.02;
        let cameraPhase = Math.PI;
        let cameraZoom = 1;
        let poseSway = 0;
        let poseGroove = 0;
        let poseNod = 0;
        let restSettleElapsed = Number.POSITIVE_INFINITY;
        const restStartValues = new Map<number, number>();
        const core = internalModel.coreModel;
        const focusController = internalModel.focusController;
        const parameterIndexes = new Map(
          [
            "ParamBodyAngleX", "ParamBodyAngleZ", "ParamAngleZ", "ParamBreath",
            "ParamAngleX", "ParamAngleY", "ParamBodyAngleY", "ParamEyeBallX", "ParamEyeBallY",
            "ParamEyeLSmile", "ParamEyeRSmile", "ParamMouthForm", "ParamMouthOpenY", "ParamBustY", "ParamCheek",
          ].map((id) => [id, core.getParameterIndex(id)]),
        );
        const addMusicParameter = (id: string, value: number, weight: number) => {
          const index = parameterIndexes.get(id);
          if (index !== undefined && index >= 0) core.addParameterValueByIndex(index, value, weight);
        };
        const restSettleParameters = REST_SETTLE_PARAM_IDS
          .map((id) => ({ id, index: core.getParameterIndex(id) }))
          .filter(({ index }) => index >= 0);
        const restEyeOpenIndexes = restSettleParameters
          .filter(({ id }) => REST_EYE_OPEN_PARAM_IDS.has(id))
          .map(({ index }) => index);
        const smootherstep = (value: number) => value ** 3 * (value * (value * 6 - 15) + 10);
        const restEase = (duration: number) => smootherstep(Math.min(1, restSettleElapsed / duration));
        const getOfficialMotionTime = () => {
          const entries = internalModel.motionManager.queueManager?._motions;
          if (!entries?.length) return null;
          for (let index = entries.length - 1; index >= 0; index -= 1) {
            const entry = entries[index];
            if (!entry.isStarted() || entry.isFinished()) continue;
            const elapsed = entry.getStateTime() - entry.getStartTime();
            if (!Number.isFinite(elapsed) || elapsed < 0) return null;
            return elapsed % OFFICIAL_LISTENING_DURATION;
          }
          return null;
        };
        const startOfficialListeningMotion = async (requestVersion: number) => {
          if (motionStartInFlightVersion !== null || requestVersion !== motionRequestVersion) return;
          motionStartInFlightVersion = requestVersion;
          let started = false;
          try {
            started = await internalModel.motionManager.startMotion(PLAYING_IDLE_GROUP, 0, 3);
          } catch (error) {
            console.warn("Hiyori listening motion will retry", error);
          }
          if (motionStartInFlightVersion === requestVersion) motionStartInFlightVersion = null;
          if (requestVersion !== motionRequestVersion || !featuresRef.current.isPlaying) {
            // If playback has already restarted, this is still the same official
            // m01 loop and may safely satisfy the newer session. Only a genuine
            // paused state is allowed to stop it.
            if (!featuresRef.current.isPlaying) {
              internalModel.motionManager.groups.idle = RESTING_IDLE_GROUP;
              internalModel.motionManager.stopAllMotions();
            }
            return;
          }
          // A false result can occur when the SDK still owns a stale reservation.
          // The watchdog below retries only if no official queue entry exists.
          if (!started) motionWatchdog = 0;
        };

        const applyMusicPose = () => {
          // The official m01 curves remain the performance. Music adds only a
          // small downbeat accent before Physics, preserving authored easing,
          // facial timing, arm movement, and secondary follow-through.
          if (!featuresRef.current.isPlaying) return;
          const seamStart = OFFICIAL_LISTENING_DURATION - MOTION_LOOP_SEAM_SECONDS;
          // Read the queue entry's real clock. A capped render dt can lag behind
          // Cubism after a dropped frame and expose the raw loop boundary once.
          const motionTime = getOfficialMotionTime();
          if (motionTime !== null && motionTime > seamStart) {
            const seamProgress = Math.min(1, (motionTime - seamStart) / MOTION_LOOP_SEAM_SECONDS);
            const seamEase = seamProgress * seamProgress * (3 - 2 * seamProgress);
            for (const [id, correction] of MOTION_LOOP_CORRECTIONS) {
              addMusicParameter(id, correction * seamEase, 1);
            }
          }
          addMusicParameter("ParamAngleY", -poseNod * (4.2 + bass * 1.4), 0.72);
          addMusicParameter("ParamBodyAngleY", -poseNod * 0.9, 0.48);
          addMusicParameter("ParamBodyAngleX", poseSway * poseGroove * (0.72 + bass * 1.05) + switchAccent * 0.42, 0.2);
          addMusicParameter("ParamAngleZ", -poseSway * poseGroove * (0.55 + bass * 0.72) + switchAccent * 0.28, 0.18);
          addMusicParameter("ParamCheek", energy * 0.08, 0.12);
        };
        const applyRestPose = () => {
          if (restSettleElapsed >= REST_SETTLE_SECONDS || featuresRef.current.isPlaying) return;
          const poseEase = restEase(REST_SETTLE_SECONDS);
          const eyeEase = restEase(REST_EYE_HANDOFF_SECONDS);
          // This runs immediately after the authored motion and before the SDK
          // saves its baseline, applies focus/breath, and evaluates Physics.
          // Secondary hair and ribbon movement therefore follows the deceleration.
          for (const { id, index } of restSettleParameters) {
            const start = restStartValues.get(index) ?? core.getParameterDefaultValue(index);
            const target = core.getParameterDefaultValue(index);
            const eased = REST_EYE_OPEN_PARAM_IDS.has(id) ? eyeEase : poseEase;
            core.setParameterValueByIndex(index, start + (target - start) * eased);
          }
        };
        const applyRestEyeHandoff = () => {
          if (restSettleElapsed >= REST_EYE_HANDOFF_SECONDS || featuresRef.current.isPlaying) return;
          const eased = restEase(REST_EYE_HANDOFF_SECONDS);
          // Auto blink runs after afterMotionUpdate. Blend toward its live value
          // here so it can take ownership without one open/closed-frame flash.
          for (const index of restEyeOpenIndexes) {
            const start = restStartValues.get(index) ?? core.getParameterDefaultValue(index);
            const blinkValue = core.getParameterValueByIndex(index);
            core.setParameterValueByIndex(index, start + (blinkValue - start) * eased);
          }
        };
        internalModel.motionManager.on("afterMotionUpdate", applyMusicPose);
        internalModel.motionManager.on("afterMotionUpdate", applyRestPose);
        internalModel.on("beforeModelUpdate", applyRestEyeHandoff);
        cleanupMotionPose = () => {
          internalModel.motionManager.off("afterMotionUpdate", applyMusicPose);
          internalModel.motionManager.off("afterMotionUpdate", applyRestPose);
          internalModel.off("beforeModelUpdate", applyRestEyeHandoff);
        };

        app.ticker.add(() => {
          const features = featuresRef.current;
          const dt = Math.min(1 / 30, Math.max(0.001, app?.ticker.deltaMS ? app.ticker.deltaMS / 1000 : 1 / 60));
          const follow = (value: number, target: number, speed: number) => (
            value + (target - value) * (1 - Math.exp(-speed * dt))
          );
          const listening = features.isPlaying ? 1 : 0;

          if (features.isPlaying && !wasListening) {
            // Playback hands the whole performance back to Hiyori's official m01
            // motion. Keep random Idle fallback disabled while the explicit
            // request loads, otherwise the SDK can briefly choose m02 or m05.
            internalModel.motionManager.groups.idle = RESTING_IDLE_GROUP;
            const requestVersion = ++motionRequestVersion;
            // Clear any stale SDK reservation before requesting the authored
            // listening loop. This does not affect a pause pose because this
            // branch runs only on the rising edge of playback.
            internalModel.motionManager.stopAllMotions();
            motionWatchdog = 0.55;
            void startOfficialListeningMotion(requestVersion);
            rhythmPhase = 0;
            beatClock = 0;
            pendingBeatAccent = 0;
            lightImpulse = 0;
            lightAccentCooldown = 0;
            lightTier = 0;
            lightTierTarget = 0;
            lightTierStep = 0;
            timeSinceLightAccent = Number.POSITIVE_INFINITY;
            hasNoddedSincePlay = false;
            timeSinceOnset = beatInterval;
            nodGestureTime = Number.POSITIVE_INFINITY;
            nodGestureStrength = 0;
            restSettleElapsed = Number.POSITIVE_INFINITY;
            restStartValues.clear();
            hasPlayed = true;
            lastTransient = features.transient;
            lastBassInput = features.bass;
          } else if (!features.isPlaying && wasListening) {
            // Capture every channel authored by m01, stop the performance, then
            // ease the whole pose to neutral before Physics. Blink gets a shorter
            // late-stage handoff to avoid flashing between controller owners.
            restStartValues.clear();
            for (const { index } of restSettleParameters) {
              restStartValues.set(index, core.getParameterValueByIndex(index));
            }
            restSettleElapsed = 0;
            motionRequestVersion += 1;
            motionWatchdog = 0;
            internalModel.motionManager.groups.idle = RESTING_IDLE_GROUP;
            internalModel.motionManager.stopAllMotions();
            beatClock = 0;
            pendingBeatAccent = 0;
            lightImpulse = 0;
            lightAccentCooldown = 0;
            lightTierTarget = 0;
            lightTierStep = 0;
            timeSinceLightAccent = Number.POSITIVE_INFINITY;
            hasNoddedSincePlay = false;
            nodGestureTime = Number.POSITIVE_INFINITY;
            nodGestureStrength = 0;
            pausedCameraZoom = currentCameraZoomRef.current;
          }
          wasListening = features.isPlaying;

          // Loading or a stale priority reservation can occasionally reject the
          // first startMotion request. Poll slowly and restart only when the
          // official queue is genuinely empty, never on every render frame.
          motionWatchdog = Math.max(0, motionWatchdog - dt);
          if (
            features.isPlaying
            && motionStartInFlightVersion === null
            && motionWatchdog === 0
            && getOfficialMotionTime() === null
          ) {
            motionWatchdog = 0.55;
            void startOfficialListeningMotion(motionRequestVersion);
          }

          activity = follow(activity, listening, features.isPlaying ? 3.2 : 7.5);
          energy = follow(energy, features.energy * listening, features.isPlaying ? 7 : 5.5);
          energyLong = follow(energyLong, features.energy * listening, features.isPlaying ? 0.7 : 2.8);
          bass = follow(bass, features.bass * listening, features.isPlaying ? 6 : 5.2);
          treble = follow(treble, features.treble * listening, features.isPlaying ? 4.5 : 4.4);

          // Raw onsets can arrive at hi-hat or subdivision speed. They estimate the
          // tempo and drive light, but a separate body-beat clock schedules Hiyori's
          // nod so repeated transients cannot collapse the spring into a static lean.
          onsetCooldown = Math.max(0, onsetCooldown - dt);
          lightAccentCooldown = Math.max(0, lightAccentCooldown - dt);
          timeSinceLightAccent += dt;
          timeSinceOnset += dt;
          const transientRise = features.transient - lastTransient;
          const bassInputRise = Math.max(0, features.bass - lastBassInput);
          transientFloor = follow(
            transientFloor,
            features.transient,
            features.transient < transientFloor ? 5.2 : 0.55,
          );
          const onsetStrength = Math.max(
            0,
            features.transient - transientFloor,
            transientRise * 1.4,
            bassInputRise * 1.9,
          );
          const detectedOnset = transientRise > 0.014 || bassInputRise > 0.012 || onsetStrength > 0.055;
          if (features.isPlaying && onsetCooldown === 0 && detectedOnset && onsetStrength > 0.025) {
            if (timeSinceOnset >= 0.16 && timeSinceOnset <= 1.6) {
              let candidate = timeSinceOnset;
              // Fold fast subdivisions upward and long gaps downward into a
              // natural 60–120 BPM body groove rather than nodding at every hit.
              while (candidate < 0.5) candidate *= 2;
              while (candidate > 1) candidate *= 0.5;
              const source = features.source;
              const bins = tempoBinsBySource[source];
              const binIndex = Math.max(0, Math.min(bins.length - 1, Math.round((candidate - 0.51) / 0.02)));
              const tempoWeight = 0.28 + Math.min(1, onsetStrength * 4.5) * 0.72;
              for (let index = 0; index < bins.length; index += 1) bins[index] *= 0.997;
              bins[binIndex] += tempoWeight;
              if (binIndex > 0) bins[binIndex - 1] += tempoWeight * 0.28;
              if (binIndex < bins.length - 1) bins[binIndex + 1] += tempoWeight * 0.28;
              tempoEvidenceBySource[source] += 1;
              if (tempoEvidenceBySource[source] >= 6) {
                let strongestBin = 0;
                for (let index = 1; index < bins.length; index += 1) {
                  if (bins[index] > bins[strongestBin]) strongestBin = index;
                }
                learnedBeatIntervalBySource[source] = 0.51 + strongestBin * 0.02;
                targetBeatInterval = learnedBeatIntervalBySource[source];
              }
            }
            pendingBeatAccent = Math.max(pendingBeatAccent, Math.min(1, onsetStrength * 5 + bass * 0.24));
            // The solid disc answers low-frequency accents, not every broadband
            // transient. The gate rejects hi-hat subdivisions; the cooldown and
            // envelope keep repeated kick evidence from becoming visual chatter.
            const lowFrequencyAccent = Math.min(
              1,
              Math.max(0, bassInputRise - 0.012) * 13
                + Math.max(0, bass - 0.14) * Math.max(0, onsetStrength - 0.05) * 2.8,
            );
            if (lightAccentCooldown === 0 && lowFrequencyAccent > 0.12) {
              // Consecutive downbeats climb through three stable size tiers.
              // A gap starts a new phrase at tier one; the tier then releases
              // slowly, while a smaller impulse preserves the exact hit.
              lightTierStep = timeSinceLightAccent > 1.05 ? 1 : Math.min(3, lightTierStep + 1);
              lightTierTarget = lightTierStep / 3;
              timeSinceLightAccent = 0;
              lightImpulse = Math.max(lightImpulse, 0.3 + lowFrequencyAccent * 0.42);
              lightAccentCooldown = 0.34;
            }
            if (treble > 0.12) particlePulse = Math.max(particlePulse, Math.min(1, onsetStrength * 4.2 + treble * 0.24));
            timeSinceOnset = 0;
            onsetCooldown = 0.16;
          }
          lastTransient = features.transient;
          lastBassInput = features.bass;
          beatInterval = follow(beatInterval, targetBeatInterval, 1.25);
          beatClock += dt * listening;
          pendingBeatAccent *= Math.exp(-0.65 * dt);
          const firstAudibleBeat = !hasNoddedSincePlay && pendingBeatAccent > 0.25 && beatClock >= 0.14;
          const strongEarlyBeat = hasNoddedSincePlay && pendingBeatAccent > 0.42 && beatClock >= beatInterval * 0.82;
          const scheduledBeat = hasNoddedSincePlay && beatClock >= beatInterval;
          if (features.isPlaying && energy > 0.015 && (firstAudibleBeat || scheduledBeat || strongEarlyBeat)) {
            beatClock = scheduledBeat ? Math.max(0, beatClock - beatInterval) : 0;
            const nearestBeat = Math.round(rhythmPhase / Math.PI) * Math.PI;
            rhythmPhase += (nearestBeat - rhythmPhase) * 0.42;
            const gestureVariation = 0.84 + Math.sin(variationPhase * 1.7) * 0.1 + Math.sin(variationPhase * 0.63 + 1.4) * 0.06;
            const gestureStrength = Math.min(1, 0.48 + energy * 0.72 + pendingBeatAccent * 0.5);
            nodGestureTime = 0;
            nodGestureStrength = gestureStrength * gestureVariation;
            pendingBeatAccent = 0;
            hasNoddedSincePlay = true;
          }
          rhythmPhase += dt * Math.PI / beatInterval * listening;
          variationPhase += dt * (0.17 + energy * 0.06);
          nodGestureTime += dt;
          restSettleElapsed += dt;
          const nodProgress = Math.min(1, nodGestureTime / 0.36);
          const smoothstep = (value: number) => value * value * (3 - 2 * value);
          const nodEnvelope = nodProgress < 0.3
            ? smoothstep(nodProgress / 0.3)
            : 1 - smoothstep((nodProgress - 0.3) / 0.7);
          lightImpulse *= Math.exp(-2.15 * dt);
          if (timeSinceLightAccent > 0.58) lightTierTarget *= Math.exp(-0.72 * dt);
          if (!features.isPlaying) lightTierTarget = 0;
          lightTier = follow(
            lightTier,
            lightTierTarget * listening,
            lightTierTarget > lightTier ? 5.4 : features.isPlaying ? 0.9 : 2.8,
          );
          lightPulse = follow(lightPulse, lightImpulse * listening, lightImpulse > lightPulse ? 7.2 : 2.8);
          particlePulse *= Math.exp(-1.35 * dt);

          // Camera movement lives on a separate rig. It follows phrase-scale
          // energy and never uses individual onsets, keeping musical pose and
          // framing independent. Wheel input temporarily takes priority.
          cameraPhase += dt * (0.36 + energyLong * 0.08) * listening;
          const phraseArc = (1 - Math.cos(cameraPhase)) * 0.5;
          const autoZoom = features.isPlaying
            ? 1.46 + phraseArc * 0.54 + energyLong * 0.07
            : variantRef.current === "player" ? (hasPlayed ? pausedCameraZoom : 2.02) : 1;
          const autoSuspended = performance.now() < autoSuspendUntilRef.current;
          const baseCameraZoom = cameraModeRef.current === "locked" || autoSuspended
            ? manualZoomRef.current
            : Math.max(1.42, Math.min(2.1, autoZoom));
          const focusCameraBias = focusModeRef.current ? 0.2 : 0;
          const targetCameraZoom = Math.min(2.35, baseCameraZoom + focusCameraBias);
          const focusCameraTransitioning = performance.now() < focusCameraTransitionUntilRef.current;
          cameraZoom = follow(cameraZoom, targetCameraZoom, focusCameraTransitioning ? 2.8 : autoSuspended ? 5.2 : 0.95);
          currentCameraZoomRef.current = cameraZoom;
          currentModelScale = follow(currentModelScale, targetModelScale, 3.6);
          currentRigX = follow(currentRigX, targetRigX, 3.2);
          currentRigY = follow(currentRigY, targetRigY, 3.2);
          model.scale.set(currentModelScale);
          contactShadow.scale.set(currentModelScale);
          const portraitOffsetFactor = focusModeRef.current || isCompactLayout ? 0.14 : 0.29;
          const portraitOffset = Math.max(0, cameraZoom - 1) * host.clientHeight * portraitOffsetFactor;
          cameraRig.position.set(currentRigX, currentRigY + portraitOffset);
          cameraRig.scale.set(cameraZoom);

          if (lastSource !== features.source) {
            lastSource = features.source;
            switchAccent = features.source === 0 ? -1 : 1;
            targetBeatInterval = learnedBeatIntervalBySource[features.source];
            beatInterval = targetBeatInterval;
            beatClock = 0;
            pendingBeatAccent = 0;
            timeSinceOnset = beatInterval;
            lastTransient = features.transient;
            lastBassInput = features.bass;
            transientFloor = features.transient;
          }
          switchAccent *= Math.exp(-2.2 * dt);

          const followsComparedTrack = features.isComparing && features.isPlaying;
          const sourceGaze = followsComparedTrack ? (features.source === 0 ? -0.82 : 0.82) : pointerX * 0.32;
          const sourceGazeY = followsComparedTrack ? (isCompactLayout ? 0.24 : 0.18) : pointerY * 0.22;
          gazeX = follow(gazeX, sourceGaze, features.isComparing ? 2.6 : 4.2);
          gazeY = follow(gazeY, sourceGazeY, 3.4);
          // This controller accepts normalized coordinates directly. `model.focus()`
          // expects world-space pixels, which would make an A/B target near zero
          // collapse toward the upper-left corner rather than the intended side.
          focusController.focus(gazeX, gazeY);

          const phaseDrift = Math.sin(variationPhase * 0.71) * 0.12;
          const amplitudeDrift = 0.86 + Math.sin(variationPhase) * 0.1 + Math.sin(variationPhase * 0.43 + 0.8) * 0.04;
          poseSway = Math.sin(rhythmPhase + phaseDrift);
          poseGroove = activity * Math.min(1, 0.28 + energy * 0.9 + bass * 1.35) * amplitudeDrift;
          poseNod = nodEnvelope * nodGestureStrength * activity;

          const stage = stageRef.current;
          if (stage) {
            stage.style.setProperty("--music-energy", energy.toFixed(3));
            stage.style.setProperty("--music-energy-long", energyLong.toFixed(3));
            stage.style.setProperty("--music-bass", bass.toFixed(3));
            stage.style.setProperty("--beat-pulse", lightPulse.toFixed(3));
            stage.style.setProperty("--beat-tier", lightTier.toFixed(3));
            stage.style.setProperty("--particle-strength", particlePulse.toFixed(3));
            stage.style.setProperty("--music-active", activity.toFixed(3));
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
    <section ref={stageRef} className={`live2d-stage live2d-stage-${variant} light-${activeSource === 0 ? "a" : "b"} ${isPlaying ? "is-playing" : "is-paused"} ${focusMode ? "is-focused" : ""}`} aria-label="Interactive music companion">
      <div className="stage-music-disc" />
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

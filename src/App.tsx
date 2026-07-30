import {
  ArrowLeftRight,
  Check,
  FastForward,
  FileAudio,
  Headphones,
  Keyboard,
  Pause,
  Play,
  RefreshCw,
  Repeat2,
  Rewind,
  ShieldCheck,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type SlotStatus = "empty" | "loading" | "ready" | "error";

type AudioSlot = {
  file: File | null;
  url: string;
  name: string;
  size: number;
  duration: number;
  peaks: number[];
  status: SlotStatus;
  error: string;
};

const EMPTY_SLOT: AudioSlot = {
  file: null,
  url: "",
  name: "",
  size: 0,
  duration: 0,
  peaks: [],
  status: "empty",
  error: "",
};

const SUPPORTED_AUDIO = /\.(mp3|wav|wave|m4a|aac|ogg|oga|flac|opus|webm|aiff|aif)$/i;
const FADE_SECONDS = 0.018;
const DRIFT_TOLERANCE = 0.04;

function formatTime(seconds: number, precise = false) {
  if (!Number.isFinite(seconds) || seconds < 0) return precise ? "00:00.000" : "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  const base = `${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`;
  return precise ? `${base}.${String(milliseconds).padStart(3, "0")}` : base;
}

function formatSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unit).toFixed(unit > 1 ? 1 : 0)} ${units[unit]}`;
}

async function makePeaks(file: File, count = 112): Promise<number[]> {
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor || file.size > 300 * 1024 * 1024) return [];

  const context = new AudioContextCtor();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const peaks = new Array(count).fill(0);
    const channels = Math.min(buffer.numberOfChannels, 2);
    const block = Math.max(1, Math.floor(buffer.length / count));

    for (let index = 0; index < count; index += 1) {
      const start = index * block;
      const end = Math.min(buffer.length, start + block);
      let max = 0;
      const stride = Math.max(1, Math.floor((end - start) / 180));
      for (let channel = 0; channel < channels; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let sample = start; sample < end; sample += stride) {
          max = Math.max(max, Math.abs(data[sample]));
        }
      }
      peaks[index] = Math.max(0.07, Math.min(1, Math.sqrt(max)));
    }
    return peaks;
  } finally {
    await context.close();
  }
}

function Waveform({ peaks, label }: { peaks: number[]; label: string }) {
  const bars = peaks.length ? peaks : new Array(112).fill(0.16);
  return (
    <div className="waveform" aria-label={`${label} waveform`} role="img">
      {bars.map((peak, index) => (
        <span key={`${label}-${index}`} style={{ height: `${Math.max(8, peak * 100)}%` }} />
      ))}
    </div>
  );
}

export default function Home() {
  const [slots, setSlots] = useState<[AudioSlot, AudioSlot]>([
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
  ]);
  const slotsRef = useRef(slots);
  const [active, setActive] = useState<0 | 1>(0);
  const activeRef = useRef<0 | 1>(0);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const [loop, setLoop] = useState(false);
  const loopRef = useRef(false);
  const [volume, setVolume] = useState(0.9);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState<0 | 1 | null>(null);

  const audioARef = useRef<HTMLAudioElement>(null);
  const audioBRef = useRef<HTMLAudioElement>(null);
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const gainARef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const graphReadyRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const maxDuration = Math.max(slots[0].duration, slots[1].duration, 0);
  const bothReady = slots[0].status === "ready" && slots[1].status === "ready";
  const durationDelta = bothReady ? Math.abs(slots[0].duration - slots[1].duration) : 0;
  const progress = maxDuration ? Math.min(100, (currentTime / maxDuration) * 100) : 0;

  const audioAt = useCallback((index: 0 | 1) => {
    return index === 0 ? audioARef.current : audioBRef.current;
  }, []);

  function inputAt(index: 0 | 1) {
    return index === 0 ? inputARef.current : inputBRef.current;
  }

  function updateSlots(next: [AudioSlot, AudioSlot]) {
    slotsRef.current = next;
    setSlots(next);
  }

  function patchSlot(index: 0 | 1, patch: Partial<AudioSlot>) {
    const next = [...slotsRef.current] as [AudioSlot, AudioSlot];
    next[index] = { ...next[index], ...patch };
    updateSlots(next);
  }

  async function ensureAudioGraph() {
    if (graphReadyRef.current && contextRef.current) {
      if (contextRef.current.state === "suspended") await contextRef.current.resume();
      return true;
    }

    const audioA = audioARef.current;
    const audioB = audioBRef.current;
    if (!audioA || !audioB || !window.AudioContext) return false;

    try {
      const context = new AudioContext();
      const gainA = context.createGain();
      const gainB = context.createGain();
      const master = context.createGain();
      context.createMediaElementSource(audioA).connect(gainA).connect(master);
      context.createMediaElementSource(audioB).connect(gainB).connect(master);
      master.connect(context.destination);
      gainA.gain.value = activeRef.current === 0 ? 1 : 0;
      gainB.gain.value = activeRef.current === 1 ? 1 : 0;
      master.gain.value = volume;
      contextRef.current = context;
      gainARef.current = gainA;
      gainBRef.current = gainB;
      masterGainRef.current = master;
      graphReadyRef.current = true;
      await context.resume();
      return true;
    } catch {
      audioA.volume = activeRef.current === 0 ? volume : 0;
      audioB.volume = activeRef.current === 1 ? volume : 0;
      return false;
    }
  }

  function applySourceGain(nextActive: 0 | 1) {
    const context = contextRef.current;
    const gains = [gainARef.current, gainBRef.current];
    if (context && gains[0] && gains[1]) {
      const now = context.currentTime;
      gains.forEach((gain, index) => {
        if (!gain) return;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(index === nextActive ? 1 : 0, now + FADE_SECONDS);
      });
    } else {
      const audioA = audioARef.current;
      const audioB = audioBRef.current;
      if (audioA) audioA.volume = nextActive === 0 ? volume : 0;
      if (audioB) audioB.volume = nextActive === 1 ? volume : 0;
    }
  }

  const getReferenceTime = useCallback(() => {
    const preferred = audioAt(activeRef.current);
    const alternate = audioAt(activeRef.current === 0 ? 1 : 0);
    if (preferred && !preferred.paused && !preferred.ended) return preferred.currentTime;
    if (alternate && !alternate.paused && !alternate.ended) return alternate.currentTime;
    return currentTimeRef.current;
  }, [audioAt]);

  async function switchSource(nextActive: 0 | 1) {
    if (slotsRef.current[nextActive].status !== "ready") return;
    const previousActive = activeRef.current;
    const referenceTime = getReferenceTime();
    const target = audioAt(nextActive);
    if (target && referenceTime < slotsRef.current[nextActive].duration) {
      if (Math.abs(target.currentTime - referenceTime) > 0.018) target.currentTime = referenceTime;
    }
    await ensureAudioGraph();

    if (
      playingRef.current &&
      target &&
      target.paused &&
      referenceTime < slotsRef.current[nextActive].duration - 0.005
    ) {
      try {
        await target.play();
      } catch {
        applySourceGain(previousActive);
        setMessage(`Audio ${nextActive === 0 ? "A" : "B"} could not start. Try pressing play again.`);
        return;
      }
    }

    activeRef.current = nextActive;
    setActive(nextActive);
    applySourceGain(nextActive);
    setMessage(`Listening to ${nextActive === 0 ? "A" : "B"}`);
    window.setTimeout(() => setMessage(""), 900);
  }

  async function playFrom(time: number) {
    await ensureAudioGraph();
    const attempts: { index: 0 | 1; promise: Promise<void> }[] = [];
    ([0, 1] as const).forEach((index) => {
      const slot = slotsRef.current[index];
      const audio = audioAt(index);
      if (!audio || slot.status !== "ready") return;
      if (time < slot.duration - 0.005) {
        if (Math.abs(audio.currentTime - time) > 0.015) audio.currentTime = time;
        attempts.push({ index, promise: audio.play() });
      } else {
        audio.pause();
      }
    });
    const results = await Promise.allSettled(attempts.map(({ promise }) => promise));
    if (results.length && results.every((result) => result.status === "rejected")) {
      setMessage("Playback was blocked. Try pressing play again.");
      return;
    }

    const activeAttempt = attempts.findIndex(({ index }) => index === activeRef.current);
    if (activeAttempt >= 0 && results[activeAttempt]?.status === "rejected") {
      const fallbackAttempt = results.findIndex((result) => result.status === "fulfilled");
      if (fallbackAttempt >= 0) {
        const fallback = attempts[fallbackAttempt].index;
        activeRef.current = fallback;
        setActive(fallback);
        applySourceGain(fallback);
        setMessage(
          `Audio ${attempts[activeAttempt].index === 0 ? "A" : "B"} could not start. Playing Audio ${fallback === 0 ? "A" : "B"} instead.`,
        );
      }
    }

    playingRef.current = true;
    setIsPlaying(true);
  }

  async function togglePlay() {
    if (!slotsRef.current.some((slot) => slot.status === "ready")) return;
    if (playingRef.current) {
      ([0, 1] as const).forEach((index) => audioAt(index)?.pause());
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }
    const duration = Math.max(...slotsRef.current.map((slot) => slot.duration));
    const startAt = currentTimeRef.current >= duration - 0.01 ? 0 : currentTimeRef.current;
    currentTimeRef.current = startAt;
    setCurrentTime(startAt);
    await playFrom(startAt);
  }

  const seekTo = useCallback(async (rawTime: number) => {
    const duration = Math.max(...slotsRef.current.map((slot) => slot.duration), 0);
    const nextTime = Math.max(0, Math.min(rawTime, duration));
    currentTimeRef.current = nextTime;
    setCurrentTime(nextTime);

    const playPromises: Promise<void>[] = [];
    ([0, 1] as const).forEach((index) => {
      const slot = slotsRef.current[index];
      const audio = audioAt(index);
      if (!audio || slot.status !== "ready") return;
      if (nextTime < slot.duration - 0.005) {
        audio.currentTime = nextTime;
        if (playingRef.current) playPromises.push(audio.play());
      } else {
        audio.pause();
        audio.currentTime = Math.max(0, slot.duration);
      }
    });
    await Promise.allSettled(playPromises);
  }, [audioAt]);

  function removeFile(index: 0 | 1) {
    const slot = slotsRef.current[index];
    const audio = audioAt(index);
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (slot.url) URL.revokeObjectURL(slot.url);
    const next = [...slotsRef.current] as [AudioSlot, AudioSlot];
    next[index] = { ...EMPTY_SLOT };
    updateSlots(next);

    const otherIndex = index === 0 ? 1 : 0;
    if (activeRef.current === index && next[otherIndex].status === "ready") {
      void switchSource(otherIndex);
    }
    if (!next.some((item) => item.status === "ready")) {
      playingRef.current = false;
      setIsPlaying(false);
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }
  }

  function clearBothFiles() {
    ([0, 1] as const).forEach((index) => {
      const slot = slotsRef.current[index];
      const audio = audioAt(index);
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      if (slot.url) URL.revokeObjectURL(slot.url);
    });

    updateSlots([{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }]);
    activeRef.current = 0;
    setActive(0);
    playingRef.current = false;
    setIsPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    applySourceGain(0);
    setMessage("");
  }

  async function loadFile(file: File, index: 0 | 1) {
    if (!file.type.startsWith("audio/") && !SUPPORTED_AUDIO.test(file.name)) {
      patchSlot(index, {
        ...EMPTY_SLOT,
        status: "error",
        name: file.name,
        error: "That file does not look like supported audio.",
      });
      return;
    }

    const oldUrl = slotsRef.current[index].url;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const audio = audioAt(index);
    audio?.pause();
    const url = URL.createObjectURL(file);
    patchSlot(index, {
      file,
      url,
      name: file.name,
      size: file.size,
      duration: 0,
      peaks: [],
      status: "loading",
      error: "",
    });
    if (audio) {
      audio.src = url;
      audio.load();
    }

    try {
      const peaks = await makePeaks(file);
      if (slotsRef.current[index].url === url) patchSlot(index, { peaks });
    } catch {
      // Playback can still work when a browser cannot decode a waveform preview.
    }
  }

  function handleMetadata(index: 0 | 1) {
    const audio = audioAt(index);
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      patchSlot(index, { status: "error", error: "The duration could not be read." });
      return;
    }
    patchSlot(index, { duration: audio.duration, status: "ready", error: "" });
    if (slotsRef.current[activeRef.current].status !== "ready") {
      activeRef.current = index;
      setActive(index);
      applySourceGain(index);
    }
  }

  function handleAudioError(index: 0 | 1) {
    if (slotsRef.current[index].status === "loading") {
      patchSlot(index, {
        status: "error",
        error: "This browser could not decode the file. Try WAV, MP3, M4A, FLAC, or OGG.",
      });
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>, index: 0 | 1) {
    const files = Array.from(event.target.files ?? []);
    if (files[0]) void loadFile(files[0], index);
    if (files[1]) void loadFile(files[1], index === 0 ? 1 : 0);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, index: 0 | 1) {
    event.preventDefault();
    setDragging(null);
    const files = Array.from(event.dataTransfer.files);
    if (files[0]) void loadFile(files[0], index);
    if (files[1]) void loadFile(files[1], index === 0 ? 1 : 0);
  }

  function handleDropKey(event: ReactKeyboardEvent<HTMLDivElement>, index: 0 | 1) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputAt(index)?.click();
    }
  }

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    if (masterGainRef.current && contextRef.current) {
      masterGainRef.current.gain.setTargetAtTime(volume, contextRef.current.currentTime, 0.015);
    } else {
      const audioA = audioARef.current;
      const audioB = audioBRef.current;
      if (audioA) audioA.volume = activeRef.current === 0 ? volume : 0;
      if (audioB) audioB.volume = activeRef.current === 1 ? volume : 0;
    }
  }, [volume]);

  useEffect(() => {
    function tick() {
      if (!playingRef.current) return;
      const reference = getReferenceTime();
      const duration = Math.max(...slotsRef.current.map((slot) => slot.duration), 0);
      currentTimeRef.current = Math.min(reference, duration);
      setCurrentTime(Math.min(reference, duration));

      const audioA = audioARef.current;
      const audioB = audioBRef.current;
      if (
        audioA &&
        audioB &&
        !audioA.paused &&
        !audioB.paused &&
        Math.abs(audioA.currentTime - audioB.currentTime) > DRIFT_TOLERANCE
      ) {
        const master = activeRef.current === 0 ? audioA : audioB;
        const follower = activeRef.current === 0 ? audioB : audioA;
        follower.currentTime = master.currentTime;
      }

      if (duration > 0 && reference >= duration - 0.025) {
        if (loopRef.current) {
          void seekTo(0);
        } else {
          ([0, 1] as const).forEach((index) => audioAt(index)?.pause());
          playingRef.current = false;
          setIsPlaying(false);
          currentTimeRef.current = duration;
          setCurrentTime(duration);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    if (isPlaying) rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [audioAt, getReferenceTime, isPlaying, seekTo]);

  useEffect(() => {
    function handleKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        void togglePlay();
      } else if (event.key === "1" || event.key.toLowerCase() === "a") {
        void switchSource(0);
      } else if (event.key === "2" || event.key.toLowerCase() === "b") {
        void switchSource(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        void seekTo(currentTimeRef.current - 5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void seekTo(currentTimeRef.current + 5);
      } else if (event.key.toLowerCase() === "l") {
        setLoop((value) => !value);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    return () => {
      slotsRef.current.forEach((slot) => {
        if (slot.url) URL.revokeObjectURL(slot.url);
      });
      void contextRef.current?.close();
    };
  }, []);

  return (
    <main className="app-shell">
      <audio ref={audioARef} preload="auto" onLoadedMetadata={() => handleMetadata(0)} onError={() => handleAudioError(0)} />
      <audio ref={audioBRef} preload="auto" onLoadedMetadata={() => handleMetadata(1)} onError={() => handleAudioError(1)} />

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Audiff home">
          <span className="brand-mark"><ArrowLeftRight size={18} strokeWidth={2.4} /></span>
          <span>Audiff</span>
        </a>
        <div className="local-note"><ShieldCheck size={15} /> Files stay on this device</div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow"><Headphones size={15} /> Critical listening, simplified</p>
        <h1>Hear the difference.<br /><em>Not the interruption.</em></h1>
        <p className="hero-copy">Drop two audio files. Press play once. Switch between them at the exact same moment—without losing your place.</p>
      </section>

      <section className="workspace" aria-label="Audio comparison workspace">
        <div className="file-grid">
          {([0, 1] as const).map((index) => {
            const slot = slots[index];
            const label = index === 0 ? "A" : "B";
            const isActive = active === index && slot.status === "ready";
            return (
              <div
                className={`file-slot ${slot.status !== "empty" ? "has-file" : ""} ${dragging === index ? "is-dragging" : ""} ${isActive ? "is-active" : ""}`}
                key={label}
                role="button"
                tabIndex={0}
                aria-label={`${label} audio file. ${slot.status === "empty" ? "Choose or drop a file" : slot.name}`}
                onClick={() => slot.status === "empty" && inputAt(index)?.click()}
                onKeyDown={(event) => handleDropKey(event, index)}
                onDragEnter={(event) => { event.preventDefault(); setDragging(index); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(null); }}
                onDrop={(event) => handleDrop(event, index)}
              >
                <input
                  ref={index === 0 ? inputARef : inputBRef}
                  type="file"
                  accept="audio/*,.flac,.aiff,.aif"
                  multiple
                  hidden
                  onChange={(event) => handleInput(event, index)}
                />
                <div className="slot-topline">
                  <span className={`source-badge source-${label.toLowerCase()}`}>{label}</span>
                  {isActive && <span className="playing-source"><span /> LIVE</span>}
                </div>

                {slot.status === "empty" ? (
                  <div className="empty-slot-content">
                    <span className="upload-icon"><Upload size={22} /></span>
                    <strong>Drop audio {label}</strong>
                    <span>or choose a file</span>
                  </div>
                ) : (
                  <div className="file-details">
                    <div className="file-icon"><FileAudio size={23} /></div>
                    <div className="file-copy">
                      <strong title={slot.name}>{slot.name || `Audio ${label}`}</strong>
                      <span>
                        {slot.status === "loading" ? "Reading audio…" : slot.status === "error" ? slot.error : `${formatTime(slot.duration)} · ${formatSize(slot.size)}`}
                      </span>
                    </div>
                    {slot.status === "ready" && <Check className="file-check" size={18} />}
                    <div className="file-actions">
                      <button type="button" className="icon-button" title={`Replace audio ${label}`} aria-label={`Replace audio ${label}`} onClick={(event) => { event.stopPropagation(); inputAt(index)?.click(); }}><RefreshCw size={15} /></button>
                      <button type="button" className="icon-button" title={`Remove audio ${label}`} aria-label={`Remove audio ${label}`} onClick={(event) => { event.stopPropagation(); removeFile(index); }}><X size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {slots.some((slot) => slot.status !== "empty") && (
          <div className="file-toolbar">
            <button type="button" className="clear-files-button" onClick={clearBothFiles}>
              <Trash2 size={14} />
              Clear both tracks
            </button>
          </div>
        )}

        {durationDelta > 0.05 && (
          <div className="duration-alert" role="status">
            <span>Different lengths</span>
            The timeline follows the longer file. {slots[0].duration > slots[1].duration ? "A" : "B"} is {formatTime(durationDelta, true)} longer.
          </div>
        )}

        <div className={`player ${maxDuration ? "is-ready" : ""}`}>
          <div className="player-heading">
            <div>
              <p className="section-label">Synchronized timeline</p>
              <p className="time-readout" aria-live="off">{formatTime(currentTime, true)}</p>
            </div>
            <span className="total-time">/ {formatTime(maxDuration, true)}</span>
          </div>

          <div className="timeline" style={{ "--progress": `${progress}%` } as React.CSSProperties}>
            <div className="wave-row wave-a">
              <span className="wave-label">A</span>
              <Waveform peaks={slots[0].peaks} label="Audio A" />
              {slots[0].duration > 0 && slots[0].duration < maxDuration && <span className="audio-end" style={{ left: `${(slots[0].duration / maxDuration) * 100}%` }}>ends</span>}
            </div>
            <div className="wave-row wave-b">
              <span className="wave-label">B</span>
              <Waveform peaks={slots[1].peaks} label="Audio B" />
              {slots[1].duration > 0 && slots[1].duration < maxDuration && <span className="audio-end" style={{ left: `${(slots[1].duration / maxDuration) * 100}%` }}>ends</span>}
            </div>
            <div className="playhead" aria-hidden="true"><span /></div>
            <input
              className="scrubber"
              aria-label="Playback position"
              type="range"
              min="0"
              max={maxDuration || 1}
              step="0.001"
              value={currentTime}
              disabled={!maxDuration}
              onChange={(event) => void seekTo(Number(event.target.value))}
            />
          </div>

          <div className="controls">
            <div className="transport-controls">
              <button className="control-button" type="button" title="Back 5 seconds" aria-label="Back 5 seconds" disabled={!maxDuration} onClick={() => void seekTo(currentTime - 5)}><Rewind size={18} fill="currentColor" /></button>
              <button className="play-button" type="button" aria-label={isPlaying ? "Pause" : "Play"} disabled={!maxDuration} onClick={() => void togglePlay()}>{isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button>
              <button className="control-button" type="button" title="Forward 5 seconds" aria-label="Forward 5 seconds" disabled={!maxDuration} onClick={() => void seekTo(currentTime + 5)}><FastForward size={18} fill="currentColor" /></button>
              <button className={`control-button ${loop ? "selected" : ""}`} type="button" title="Loop timeline" aria-label="Loop timeline" aria-pressed={loop} disabled={!maxDuration} onClick={() => setLoop(!loop)}><Repeat2 size={18} /></button>
            </div>

            <div className="ab-switch" aria-label="Choose audible source">
              <span className="switch-caption">HEARING</span>
              <button type="button" className={active === 0 ? "active" : ""} disabled={slots[0].status !== "ready"} onClick={() => void switchSource(0)}><kbd>1</kbd> Audio A</button>
              <button type="button" className={active === 1 ? "active" : ""} disabled={slots[1].status !== "ready"} onClick={() => void switchSource(1)}><kbd>2</kbd> Audio B</button>
            </div>

            <label className="volume-control" title="Output volume">
              <Volume2 size={18} />
              <span className="sr-only">Output volume</span>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
            </label>
          </div>

          <div className="player-status">
            <span>{maxDuration ? (currentTime > slots[active].duration && slots[active].duration > 0 ? `${active === 0 ? "A" : "B"} has ended here — switch to hear the longer file` : message || `Audio ${active === 0 ? "A" : "B"} is audible`) : "Add one or two files to begin"}</span>
            <span className="sync-state"><span /> {bothReady ? "Synced continuously" : "Waiting for both files"}</span>
          </div>
        </div>
      </section>

      <section className="shortcut-section" aria-label="Keyboard shortcuts">
        <div className="shortcut-heading"><Keyboard size={18} /><span><strong>Keep your ears focused.</strong> Use the keyboard while listening.</span></div>
        <div className="shortcut-list">
          <span><kbd>Space</kbd> Play / pause</span>
          <span><kbd>1</kbd><kbd>2</kbd> Switch A / B</span>
          <span><kbd>←</kbd><kbd>→</kbd> Seek 5 sec</span>
          <span><kbd>L</kbd> Loop</span>
        </div>
      </section>

      <footer>
        <span>Audiff</span>
        <p>Private by design. Audio is decoded locally and never uploaded.</p>
      </footer>
    </main>
  );
}

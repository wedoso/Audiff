export type LyricLine = {
  time: number;
  text: string;
};

export type ParsedLrc = {
  lines: LyricLine[];
  title: string;
  artist: string;
};

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/gu;
const METADATA = /^\[(ar|artist|ti|title|offset):([^\]]*)\]$/iu;

function fractionToSeconds(value = "") {
  if (!value) return 0;
  return Number(value.padEnd(3, "0").slice(0, 3)) / 1000;
}

export function parseLrc(source: string): ParsedLrc {
  let offsetMilliseconds = 0;
  let title = "";
  let artist = "";
  const pending: LyricLine[] = [];

  for (const rawLine of source.replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;

    const metadata = line.match(METADATA);
    if (metadata) {
      const key = metadata[1].toLowerCase();
      const value = metadata[2].trim();
      if (key === "offset") offsetMilliseconds = Number(value) || 0;
      else if (key === "ti" || key === "title") title = value;
      else if (key === "ar" || key === "artist") artist = value;
      continue;
    }

    const timestamps = [...line.matchAll(TIMESTAMP)];
    if (!timestamps.length) continue;
    const text = line.replace(TIMESTAMP, "").trim();
    if (!text) continue;

    for (const timestamp of timestamps) {
      const minutes = Number(timestamp[1]);
      const seconds = Number(timestamp[2]);
      const fraction = fractionToSeconds(timestamp[3]);
      pending.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }

  const grouped = new Map<number, string[]>();
  for (const line of pending) {
    const adjustedTime = Math.max(0, line.time + offsetMilliseconds / 1000);
    const key = Math.round(adjustedTime * 1000) / 1000;
    const texts = grouped.get(key) ?? [];
    if (!texts.includes(line.text)) texts.push(line.text);
    grouped.set(key, texts);
  }

  const lines = [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, texts]) => ({ time, text: texts.join("\n") }));

  return { lines, title, artist };
}

export function decodeLrc(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer);
  }
  return new TextDecoder("utf-8").decode(buffer);
}

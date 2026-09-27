// Transcrição palavra a palavra (pt-BR) com sherpa-onnx.
// Uso: node tools/transcribe.mjs <audio> <saida-dir> [--whisper]
// - Parakeet TDT v3 (multilíngue) fornece tokens com timestamps → palavras com t/s/e.
// - Whisper small (opcional) fornece um texto de comparação por segmento.
// Segmentação: cortes no meio de silêncios (silencedetect -35 dB / 0,35 s), segmentos ≤ 24 s.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ASR_DIR = process.env.ASR_DIR;
const require = createRequire(path.join(ASR_DIR, "package.json"));
const sherpa = require("sherpa-onnx-node");

const [, , audio, outDir, ...flags] = process.argv;
const useWhisper = flags.includes("--whisper");
fs.mkdirSync(outDir, { recursive: true });

const SR = 16000;
const pcm = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", audio, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const dur = samples.length / SR;

let sdLog = "";
try {
  sdLog = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${audio}" -af silencedetect=noise=-35dB:d=0.35 -f null - 2>&1`], { encoding: "utf8" });
} catch (e) { sdLog = String(e.stdout || ""); }
const silences = [];
let cur = null;
for (const line of sdLog.split("\n")) {
  const s = line.match(/silence_start: ([\d.]+)/);
  const e = line.match(/silence_end: ([\d.]+)/);
  if (s) cur = { s: +s[1] };
  if (e && cur) { cur.e = +e[1]; silences.push(cur); cur = null; }
}
fs.writeFileSync(path.join(outDir, "silences.json"), JSON.stringify(silences, null, 1));

// cortes: meio dos silêncios; agrupa até 24 s
const cuts = silences.map((x) => (x.s + x.e) / 2).filter((c) => c > 0.5 && c < dur - 0.5);
const segs = [];
let start = 0;
for (let i = 0; i < cuts.length; i++) {
  const next = cuts[i + 1] ?? dur;
  if (next - start > 24) { segs.push([start, cuts[i]]); start = cuts[i]; }
}
segs.push([start, dur]);

const parakeet = new sherpa.OfflineRecognizer({
  featConfig: { sampleRate: SR, featureDim: 80 },
  modelConfig: {
    transducer: {
      encoder: path.join(ASR_DIR, "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/encoder.int8.onnx"),
      decoder: path.join(ASR_DIR, "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/decoder.int8.onnx"),
      joiner: path.join(ASR_DIR, "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/joiner.int8.onnx"),
    },
    tokens: path.join(ASR_DIR, "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/tokens.txt"),
    numThreads: 4, provider: "cpu", modelType: "nemo_transducer",
  },
});
let whisper = null;
if (useWhisper) {
  whisper = new sherpa.OfflineRecognizer({
    featConfig: { sampleRate: SR, featureDim: 80 },
    modelConfig: {
      whisper: {
        encoder: path.join(ASR_DIR, "sherpa-onnx-whisper-small/small-encoder.onnx"),
        decoder: path.join(ASR_DIR, "sherpa-onnx-whisper-small/small-decoder.onnx"),
        language: "pt", task: "transcribe", tailPaddings: 2000,
      },
      tokens: path.join(ASR_DIR, "sherpa-onnx-whisper-small/small-tokens.txt"),
      numThreads: 4, provider: "cpu",
    },
  });
}

const words = [];
const segOut = [];
for (const [a, b] of segs) {
  const chunk = samples.subarray(Math.floor(a * SR), Math.floor(b * SR));
  // pequeno respiro de silêncio no fim ajuda o transducer a fechar a última palavra
  const padded = new Float32Array(chunk.length + SR * 0.4);
  padded.set(chunk);
  const st = parakeet.createStream();
  st.acceptWaveform({ samples: padded, sampleRate: SR });
  parakeet.decode(st);
  const r = parakeet.getResult(st);
  const toks = r.tokens || [];
  const ts = r.timestamps || [];
  const durs = r.durations || [];
  let w = null;
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    const t0 = a + ts[i];
    const t1 = a + ts[i] + (durs[i] || 0.08);
    const isNew = tok.startsWith(" ") || tok.startsWith("▁") || !w;
    const clean = tok.replace(/^[ ▁]/, "");
    if (isNew) {
      if (w) words.push(w);
      w = { t: clean, s: t0, e: t1 };
    } else {
      w.t += clean;
      w.e = t1;
    }
  }
  if (w) words.push(w);
  let wtext = null;
  if (whisper) {
    const sw = whisper.createStream();
    sw.acceptWaveform({ samples: chunk, sampleRate: SR });
    whisper.decode(sw);
    wtext = whisper.getResult(sw).text.trim();
  }
  segOut.push({ s: +a.toFixed(3), e: +b.toFixed(3), parakeet: r.text.trim(), whisper: wtext });
  process.stderr.write(`[${a.toFixed(1)}-${b.toFixed(1)}] ${r.text.trim()}\n`);
}
// fecha palavras: e ≤ s da próxima
for (let i = 0; i < words.length; i++) {
  words[i].s = +words[i].s.toFixed(3);
  words[i].e = +Math.min(words[i].e, words[i + 1]?.s ?? words[i].e).toFixed(3);
}
fs.writeFileSync(path.join(outDir, "asr.words.json"), JSON.stringify(words, null, 0));
fs.writeFileSync(path.join(outDir, "asr.segments.json"), JSON.stringify(segOut, null, 1));
console.log(JSON.stringify({ duration: dur, segments: segs.length, words: words.length }));

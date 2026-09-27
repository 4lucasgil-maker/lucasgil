// Envelope de amplitude a 20 Hz (RMS / p98, expoente 0,8) + resumo de 38 barras.
// Uso: node tools/envelope.mjs <audio> <projeto>
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , audio, project] = process.argv;
const SR = 16000;
const HOP = SR / 20;
const pcm = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", audio, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const n = Math.ceil(x.length / HOP);
const rms = new Float64Array(n);
for (let i = 0; i < n; i++) {
  let acc = 0, c = 0;
  for (let j = i * HOP; j < Math.min(x.length, (i + 1) * HOP); j++) { acc += x[j] * x[j]; c++; }
  rms[i] = Math.sqrt(acc / Math.max(1, c));
}
const sorted = Array.from(rms).sort((a, b) => a - b);
const p98 = sorted[Math.floor(sorted.length * 0.98)] || 1;
const env = Array.from(rms, (v) => +Math.min(1, Math.pow(v / p98, 0.8)).toFixed(3));
const bars = [];
for (let b = 0; b < 38; b++) {
  const a0 = Math.floor((b * n) / 38), a1 = Math.floor(((b + 1) * n) / 38);
  let m = 0;
  for (let i = a0; i < a1; i++) m += env[i];
  bars.push(m / Math.max(1, a1 - a0));
}
const bmax = Math.max(...bars);
const summary = bars.map((v) => +(0.25 + 0.75 * (v / bmax)).toFixed(3));
const out = path.join(project, "assets/audio");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "envelope-20hz.json"), JSON.stringify({ rate: 20, duration: x.length / SR, env }));
fs.writeFileSync(path.join(out, "voice-summary-38.json"), JSON.stringify(summary));
console.log(JSON.stringify({ frames: n, duration: x.length / SR, p98 }));

// Monta um episódio (vertical 1080×1920) a partir de episode.json + captions.words.json + cenas.
// Uso: node tools/build.mjs <projeto>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.join(HERE, "../_template");
const P = path.resolve(process.argv[2]);
const rd = (f) => fs.readFileSync(f, "utf8");
const ep = JSON.parse(rd(path.join(P, "episode.json")));
const groupsRaw = JSON.parse(rd(path.join(P, "captions.words.json")));
const envJ = JSON.parse(rd(path.join(P, "assets/audio/envelope-20hz.json")));
const summary = JSON.parse(rd(path.join(P, "assets/audio/voice-summary-38.json")));

const r3 = (x) => Math.round(x * 1000) / 1000;
const audioEnd = r3(envJ.duration);
const total = r3(audioEnd + (ep.tail ?? 1.2));
const clockStart = ep.clockStart || "08:20";
const clock = (sec) => {
  const [h, m] = clockStart.split(":").map(Number);
  const t = h * 60 + m + Math.floor(sec / 60);
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const hasPhoto = fs.existsSync(path.join(P, "assets/images/cris-junqueira-avatar.jpg"));
const AVATAR = hasPhoto ? '<img src="assets/images/cris-junqueira-avatar.jpg" alt="" />' : '<span class="ini">CJ</span>';

// ---- grupos
const hidden = new Set(ep.hidden ?? [0, 1]);
const groups = groupsRaw.map((g, n) => {
  const start = g.words[0].s;
  const lastW = g.words[g.words.length - 1];
  const nextStart = groupsRaw[n + 1]?.words[0].s ?? audioEnd;
  const end = Math.min(lastW.e, lastW.s + 0.9, nextStart);
  return {
    i: g.i, in: g.in, tag: g.tag, hidden: hidden.has(g.i),
    start: r3(start), end: r3(end), clock: clock(start),
    words: g.words.map((w) => [w.t, r3(w.s), r3(w.e), w.k ? 1 : 0]),
  };
});
const allWords = groups.flatMap((g) => g.words);
const firstWord = allWords[0][1];

// ---- status do header: online → gravando (voz) / digitando (silêncio ≥ 1 s) → online
const sil = JSON.parse(rd(path.join(P, ".asr/silences.json")));
const merged = [];
for (const z of sil) { const l = merged[merged.length - 1]; if (l && z.s - l.e < 0.12) l.e = z.e; else merged.push({ ...z }); }
const status = [[0, "online"], [r3(Math.max(0, firstWord - 0.1)), "rec"]];
for (const z of merged) {
  if (z.s < firstWord + 0.5 || z.e > audioEnd - 0.2 || z.e - z.s < 1.0) continue;
  status.push([r3(z.s + 0.2), "typing"]);
  status.push([r3(z.e - 0.1), "rec"]);
}
status.push([r3(audioEnd + 0.2), "online"]);

// ---- cenas
const scenes = ep.scenes.map(([id, start], n) => {
  const end = n + 1 < ep.scenes.length ? ep.scenes[n + 1][1] : total;
  return { id, start: r3(start), end: r3(end), dur: r3(end - start) };
});
const dark = ep.dark ? scenes.find((s) => s.id === ep.dark) : null;

// ---- transições
const PAL = [
  ["#005c4b", "#d9fdd3"], ["#d9fdd3", "#fbfaf7"], ["#3f5b67", "#005c4b"], ["#fbfaf7", "#d9fdd3"], ["#00a884", "#005c4b"],
];
const POINTS = [[540, 700], [880, 420], [200, 980], [760, 1060], [300, 480], [540, 900]];
const cuts = [];
scenes.forEach((s, n) => {
  if (n === 0) return;
  let type = ep.cuts?.[s.id] ?? "none";
  if (dark && scenes[n - 1].id === dark.id) type = ep.cuts?.[s.id] ?? "iris";
  if (type === "none") return;
  const pal = PAL[cuts.length % PAL.length];
  const c = { t: s.start, type, color: pal[0], color2: pal[1], p0: POINTS[cuts.length % POINTS.length], p1: POINTS[(cuts.length + 3) % POINTS.length] };
  if (dark && scenes[n - 1].id === dark.id) { c.color = "#efeae2"; c.color2 = "#fbfaf7"; }
  if (dark && s.id === dark.id) { c.color = "#1b2a30"; c.color2 = "#3f5b67"; }
  cuts.push(c);
});

// ---- saída
const out = (f, s) => { fs.mkdirSync(path.dirname(path.join(P, f)), { recursive: true }); fs.writeFileSync(path.join(P, f), s); };
const fill = (src, map) => { let s = src; for (const [k, v] of Object.entries(map)) s = s.split(k).join(v); return s; };
const J = (x) => JSON.stringify(x);

for (const f of ["gsap.min.js", "vtma.js", "doodles.svg"]) {
  fs.mkdirSync(path.join(P, "assets/vendor"), { recursive: true });
  fs.copyFileSync(path.join(TPL, "vendor", f), path.join(P, "assets/vendor", f));
}
const common = { "/*@EP@*/": String(ep.number), "/*@NAME@*/": ep.name, "/*@AVATAR@*/": AVATAR };
out("compositions/bg.html", fill(rd(path.join(TPL, "src/bg.src.html")), { "/*@DUR@*/ 10": String(total) }));
out("compositions/chrome.html", fill(rd(path.join(TPL, "src/chrome.src.html")), {
  ...common,
  "/*@DATA@*/ {}": J({ audioEnd, rate: envJ.rate, env: envJ.env, status, firstWord, dark: dark ? [dark.start, dark.end] : null }),
}));
out("compositions/captions.html", fill(rd(path.join(TPL, "src/captions.src.html")), {
  "/*@DATA@*/ {}": J({ groups, voice: { t: r3(audioEnd + 0.15), dur: mmss(audioEnd), clock: clock(audioEnd), bars: summary, avatar: AVATAR } }),
}));
out("compositions/transitions.html", fill(rd(path.join(TPL, "src/transitions.src.html")), { "/*@DATA@*/ {}": J({ cuts }) }));
const titleOut = r3(Math.max(0.12, Math.min(0.3, firstWord - 0.2)));
out("compositions/titlecard.html", fill(rd(path.join(TPL, "src/titlecard.src.html")), { ...common, "/*@OUT@*/ 0.2": String(titleOut) }));

const errors = [];
for (const s of scenes) {
  const srcFile = [path.join(P, "scenes", `${s.id}.html`)].find((f) => fs.existsSync(f));
  if (!srcFile) { errors.push(`cena sem arquivo: ${s.id}`); continue; }
  const W = allWords.filter((w) => w[1] >= s.start - 0.05 && w[1] < s.end).map((w) => [w[0], r3(w[1] - s.start), r3(w[2] - s.start)]);
  const src = rd(srcFile);
  // valida T("...") contra as palavras da cena
  const norm = (x) => String(x).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%]/g, "");
  for (const m of src.matchAll(/\bT(?:\.end)?\("([^"]+)"(?:\s*,\s*(\d+))?\)/g)) {
    const n = +(m[2] || 1);
    if (W.filter((w) => norm(w[0]) === norm(m[1])).length < n) errors.push(`${s.id}: T("${m[1]}", ${n}) não existe na janela ${s.start}–${s.end}`);
  }
  out(`compositions/${s.id}.html`, fill(src, {
    ...common,
    "/*@WORDS@*/ []": J(W), "/*@DUR@*/ 0": String(s.dur), "/*@AUDIOEND@*/ 0": String(r3(audioEnd - s.start)),
    "/*@VOICEDUR@*/": mmss(audioEnd), "/*@CLOCKEND@*/": clock(audioEnd), "/*@NAMEUP@*/": ep.name.toUpperCase(),
  }));
}

const host = (id, src, start, dur, track, extra = "") =>
  `      <div id="el-${id}" class="${extra.includes("scene") ? "scene" : "layer"}" data-composition-id="${id}" data-composition-src="compositions/${src}.html" data-start="${start}" data-duration="${dur}" data-track-index="${track}" data-track-kind="${extra.includes("captions") ? "captions" : "graphics"}" data-width="1080" data-height="1920"></div>`;
const index = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>EP ${ep.number} — ${ep.name} · Vou te mandar um áudio</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <script src="assets/vendor/vtma.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #efeae2; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
      #root > div[data-composition-src] { position: absolute; inset: 0; }
      #el-bg { z-index: 0; }
      #root > .scene { z-index: 2; }
      #el-transitions { z-index: 3; }
      #el-chrome { z-index: 4; }
      #el-captions { z-index: 5; }
      #el-titlecard { z-index: 6; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${total}">
${host("bg", "bg", 0, total, 0)}
${scenes.map((s) => host(s.id, s.id, s.start, s.dur, 1, "scene")).join("\n")}
${host("transitions", "transitions", 0, total, 2)}
${host("chrome", "chrome", 0, total, 3)}
${host("captions", "captions", 0, total, 4, "captions")}
${host("titlecard", "titlecard", 0, r3(titleOut + 0.25), 5)}
      <audio id="vo" src="${ep.audio}" data-start="0" data-duration="${audioEnd}" data-track-index="10"></audio>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
out("index.html", index);
// tabela de tempos locais por cena (para coreografia)
out(".build/scene-times.txt", scenes.map((s) => {
  const W = allWords.filter((w) => w[1] >= s.start - 0.05 && w[1] < s.end);
  return `## ${s.id}  ${s.start}–${s.end} (${s.dur}s)\n` + W.map((w) => `${(w[1] - s.start).toFixed(2)} ${w[0]}`).join("  ");
}).join("\n\n"));
console.log(JSON.stringify({ total, audioEnd, scenes: scenes.length, cuts: cuts.length, photo: hasPhoto, statusChanges: status.length }));
if (errors.length) { console.error("ERROS:\n" + errors.join("\n")); process.exitCode = 1; }

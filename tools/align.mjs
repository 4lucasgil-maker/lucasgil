// Alinha o texto corrigido (captions.txt) aos tempos do ASR (asr.words.json) por programação dinâmica.
// Uso: node tools/align.mjs <projeto>
// captions.txt: um grupo (balão) por linha. "# ..." = comentário.
//   Prefixo "[in:rótulo] " = balão branco recebido (citação) com etiqueta.
//   *palavra* = palavra-chave (peso 900, verde-escuro). Pode abranger várias palavras: *logo depois*.
// Saída: captions.words.json = [{ i, in, tag, words: [{ t, s, e, k }] }] + relatório de suspeitos.
import fs from "node:fs";
import path from "node:path";

const project = process.argv[2];
const asr = JSON.parse(fs.readFileSync(path.join(project, ".asr/asr.words.json"), "utf8"));
const lines = fs.readFileSync(path.join(project, "captions.txt"), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

const groups = lines.map((line, i) => {
  let tag = null;
  const m = line.match(/^\[in:([^\]]+)\]\s*/);
  if (m) { tag = m[1]; line = line.slice(m[0].length); }
  const words = [];
  let inKey = false;
  for (const raw of line.split(/\s+/)) {
    let t = raw;
    let k = inKey;
    if (t.startsWith("*")) { k = true; inKey = true; t = t.slice(1); }
    if (/\*[^\wÀ-ſ]*$/.test(t)) { inKey = false; t = t.replace(/\*/, ""); }
    words.push({ t, k });
  }
  return { i, in: !!tag, tag, words };
});

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%]/g, "");
function lev(a, b) {
  if (a === b) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const sim = (a, b) => { const A = norm(a), B = norm(b); if (!A && !B) return 1; return 1 - lev(A, B) / Math.max(A.length, B.length, 1); };

const flat = [];
groups.forEach((g) => g.words.forEach((w) => flat.push(w)));
const N = flat.length, M = asr.length;
const INF = 1e9;
const cost = Array.from({ length: N + 1 }, () => new Float64Array(M + 1).fill(INF));
const back = Array.from({ length: N + 1 }, () => new Array(M + 1).fill(null));
cost[0][0] = 0;
const SKIP_ASR = 0.35, INS_WORD = 0.9;
for (let i = 0; i <= N; i++) {
  for (let j = 0; j <= M; j++) {
    const c = cost[i][j];
    if (c >= INF) continue;
    const relax = (ni, nj, add, op) => { if (ni <= N && nj <= M && c + add < cost[ni][nj]) { cost[ni][nj] = c + add; back[ni][nj] = { i, j, op }; } };
    if (i < N && j < M) relax(i + 1, j + 1, 1 - sim(flat[i].t, asr[j].t), "m11");
    for (let k = 2; k <= 3; k++) if (i < N && j + k <= M) {
      const joined = asr.slice(j, j + k).map((x) => x.t).join("");
      relax(i + 1, j + k, (1 - sim(flat[i].t, joined)) + 0.25 * (k - 1), "m1" + k);
    }
    if (i + 2 <= N && j < M) relax(i + 2, j + 1, (1 - sim(flat[i].t + flat[i + 1].t, asr[j].t)) + 0.15, "m21");
    if (j < M) relax(i, j + 1, SKIP_ASR, "skipA");
    if (i < N) relax(i + 1, j, INS_WORD, "ins");
  }
}
const ops = [];
for (let i = N, j = M; i > 0 || j > 0;) { const b = back[i][j]; ops.push({ ...b, ni: i, nj: j }); i = b.i; j = b.j; }
ops.reverse();
const suspects = [];
for (const o of ops) {
  if (o.op === "skipA") { suspects.push(`ASR descartado: "${asr[o.j].t}" @${asr[o.j].s}`); continue; }
  const ws = flat.slice(o.i, o.ni);
  const as = asr.slice(o.j, o.nj);
  if (o.op === "ins") { ws[0].s = null; ws[0].e = null; suspects.push(`inserida: "${ws[0].t}"`); continue; }
  if (o.op === "m21") {
    const mid = (as[0].s + as[0].e) / 2;
    ws[0].s = as[0].s; ws[0].e = mid; ws[1].s = mid; ws[1].e = as[0].e;
  } else { ws[0].s = as[0].s; ws[0].e = as[as.length - 1].e; }
  const sc = sim(ws.map((w) => w.t).join(""), as.map((a) => a.t).join(""));
  if (sc < 0.6) suspects.push(`${o.op} "${ws.map((w) => w.t).join(" ")}" ← "${as.map((a) => a.t).join(" ")}" @${as[0].s} (sim ${sc.toFixed(2)})`);
}
// interpola palavras inseridas
for (let i = 0; i < N; i++) {
  if (flat[i].s != null) continue;
  let a = i - 1; while (a >= 0 && flat[a].s == null) a--;
  let b = i + 1; while (b < N && flat[b].s == null) b++;
  const t0 = a >= 0 ? flat[a].e : (b < N ? flat[b].s - 0.3 : 0);
  const t1 = b < N ? flat[b].s : t0 + 0.3;
  const span = b - a - 1;
  const k = i - a;
  flat[i].s = t0 + ((t1 - t0) * (k - 1)) / span;
  flat[i].e = t0 + ((t1 - t0) * k) / span;
}
// fim da palavra não atravessa um silêncio detectado
const sil = fs.existsSync(path.join(project, ".asr/silences.json")) ? JSON.parse(fs.readFileSync(path.join(project, ".asr/silences.json"), "utf8")) : [];
for (const w of flat) { for (const z of sil) if (z.s > w.s + 0.06 && z.s < w.e) w.e = z.s; }
for (const w of flat) { w.s = +w.s.toFixed(3); w.e = +Math.max(w.e, w.s + 0.06).toFixed(3); }
fs.writeFileSync(path.join(project, "captions.words.json"), JSON.stringify(groups.map((g) => ({ i: g.i, in: g.in, tag: g.tag, words: g.words.map(({ t, s, e, k }) => ({ t, s, e, k })) }))));
console.log(`grupos: ${groups.length}, palavras: ${N}, asr: ${M}`);
console.log("suspeitos:\n" + suspects.join("\n"));

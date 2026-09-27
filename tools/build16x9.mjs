// Versão 16:9 (layout v2): camadas layers/chat e layers/scenes (1080×1920) + raiz 1920×1080
// com o celular (chat) à esquerda e o card de efeitos (cenas) à direita.
// Uso: node tools/build16x9.mjs <projeto-vertical> (rode tools/build.mjs antes)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TPL = path.join(HERE, "../_template");
const P = path.resolve(process.argv[2]);
const ep = JSON.parse(fs.readFileSync(path.join(P, "episode.json"), "utf8"));
const Q = path.join(path.dirname(P), `${ep.slug}-16x9`);
const rd = (f) => fs.readFileSync(f, "utf8");
const out = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const cp = (a, b) => { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); };
const AVATAR_SRC = path.join(P, "assets/images/cris-junqueira-avatar.jpg");
const vendor = (dir) => {
  for (const f of ["gsap.min.js", "vtma.js", "doodles.svg"]) cp(path.join(TPL, "vendor", f), path.join(dir, "assets/vendor", f));
  if (fs.existsSync(AVATAR_SRC)) cp(AVATAR_SRC, path.join(dir, "assets/images/cris-junqueira-avatar.jpg"));
};
const fill = (src, map) => { let s = src; for (const [k, v] of Object.entries(map)) s = s.split(k).join(v); return s; };

const index = rd(path.join(P, "index.html"));
const total = +index.match(/data-composition-id="main"[^>]*data-duration="([\d.]+)"/)[1];
const audioEnd = +index.match(/<audio id="vo"[^>]*data-duration="([\d.]+)"/)[1];
const hosts = [...index.matchAll(/<div id="el-(s\d+)"[^>]*data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map((m) => ({ id: m[1], start: +m[2], dur: +m[3] }));
const dark = ep.dark ? hosts.find((h) => h.id === ep.dark) : null;
const J = JSON.stringify;
const n = ep.number;

const layerIndex = (title, layers) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>${title}</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <script src="assets/vendor/vtma.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #efeae2; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
      #root > div[data-composition-src] { position: absolute; inset: 0; }
      #root > .scene { z-index: 2; }
${layers.filter((l) => !l.raw).map((l) => `      #el-${l.id} { z-index: ${l.z}; }`).join("\n")}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${total}">
${layers.map((l) => l.raw || `      <div id="el-${l.id}" data-composition-id="${l.id}" data-composition-src="compositions/${l.id}.html" data-start="0" data-duration="${total}" data-track-index="${l.track}" data-track-kind="${l.kind || "graphics"}" data-width="1080" data-height="1920"></div>`).join("\n")}
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

const ROOT_ONLY = process.argv.includes("--root-only");
// ---------- layers/chat: bg + conversa em thread + chrome (sem recolher na cena escura)
if (!ROOT_ONLY) {
  const L = path.join(Q, "layers/chat");
  vendor(L);
  cp(path.join(P, "compositions/bg.html"), path.join(L, "compositions/bg.html"));
  out(path.join(L, "compositions/chrome.html"), rd(path.join(P, "compositions/chrome.html")).replace(/"dark":\[[^\]]*\]/, '"dark":null'));
  const capData = JSON.parse(rd(path.join(P, "compositions/captions.html")).match(/var D = (\{.*?\});\n/s)[1]);
  capData.groups.forEach((g) => { g.hidden = false; });
  out(path.join(L, "compositions/thread.html"), fill(rd(path.join(TPL, "src/thread.src.html")), { "/*@DATA@*/ {}": J(capData) }));
  out(path.join(L, "index.html"), layerIndex(`EP ${n} chat 9x16`, [
    { id: "bg", z: 0, track: 0 },
    { id: "thread", z: 3, track: 1, kind: "captions" },
    { id: "chrome", z: 4, track: 2 },
  ]));
}

// ---------- layers/scenes: bg + cenas + transições (sem chrome, sem legendas)
if (!ROOT_ONLY) {
  const L = path.join(Q, "layers/scenes");
  vendor(L);
  cp(path.join(P, "compositions/bg.html"), path.join(L, "compositions/bg.html"));
  cp(path.join(P, "compositions/transitions.html"), path.join(L, "compositions/transitions.html"));
  const ov = ep.layerOverrides || {};
  for (const h of hosts) {
    let s = rd(path.join(P, `compositions/${h.id}.html`));
    if (ov[h.id]) s = s.replace("</template>", `  <style>${ov[h.id]}</style>\n    </template>`);
    out(path.join(L, `compositions/${h.id}.html`), s);
  }
  const sceneTags = hosts.map((h) => `      <div id="el-${h.id}" class="scene" data-composition-id="${h.id}" data-composition-src="compositions/${h.id}.html" data-start="${h.start}" data-duration="${h.dur}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>`).join("\n");
  out(path.join(L, "index.html"), layerIndex(`EP ${n} cenas 9x16`, [
    { id: "bg", z: 0, track: 0 },
    { id: "scenes", raw: sceneTags },
    { id: "transitions", z: 3, track: 2 },
  ]));
}

// ---------- raiz 1920×1080
vendor(Q);
cp(path.join(P, ep.audio), path.join(Q, "assets/audio", path.basename(ep.audio)));
const hasPhoto = fs.existsSync(path.join(P, "assets/images/cris-junqueira-avatar.jpg"));
if (hasPhoto) cp(path.join(P, "assets/images/cris-junqueira-avatar.jpg"), path.join(Q, "assets/images/cris-junqueira-avatar.jpg"));
const AV = hasPhoto ? '<img src="assets/images/cris-junqueira-avatar.jpg" alt="" />' : '<span class="ini">CJ</span>';
const firstWord = JSON.parse(rd(path.join(P, "captions.words.json")))[0].words[0].s;
const tOut = Math.max(0.12, Math.min(0.3, firstWord - 0.2));

const t16 = `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #t16 { position: absolute; inset: 0; font-family: Inter, sans-serif; }
        #t16 .in { position: absolute; inset: 0; background: #efeae2; overflow: hidden; }
        #t16 .doodles { position: absolute; left: -60px; top: -40px; width: 2160px; height: 1260px; background-image: url(assets/vendor/doodles.svg); background-size: 360px 360px; opacity: 0.85; }
        #t16 .glow { position: absolute; left: 260px; top: -260px; width: 1400px; height: 1400px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 64%); }
        #t16 .stack { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        #t16 .who { display: flex; align-items: center; gap: 20px; margin-bottom: 44px; }
        #t16 .tav { width: 96px; height: 96px; border-radius: 50%; overflow: hidden; background: #005c4b; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 6px #fbfaf7; }
        #t16 .tav img { width: 100%; height: 100%; object-fit: cover; display: block; }
        #t16 .tav .ini { font-weight: 900; font-size: 38px; color: #fbfaf7; }
        #t16 .whoname { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 34px; letter-spacing: 3px; color: #111b21; }
        #t16 .epn { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 50px; letter-spacing: 4px; color: #005c4b; }
        #t16 .name { margin-top: 40px; font-family: "League Gothic", sans-serif; font-weight: 400; color: #111b21; text-align: center; line-height: 0.9; width: 1600px; text-transform: uppercase; }
        #t16 .brand { position: relative; margin-top: 44px; background: #d9fdd3; border-radius: 30px; border-top-right-radius: 8px; padding: 22px 30px 18px 34px; box-shadow: 0 8px 22px rgba(17, 27, 33, 0.14); display: flex; align-items: flex-end; gap: 22px; }
        #t16 .brand::before { content: ""; position: absolute; top: 0; right: -18px; border-left: 22px solid #d9fdd3; border-bottom: 22px solid transparent; }
        #t16 .bt { font-weight: 700; font-size: 48px; line-height: 60px; color: #111b21; white-space: nowrap; }
        #t16 .bm { display: flex; align-items: center; gap: 8px; font-size: 26px; color: #54656f; padding-bottom: 4px; }
      </style>
      <div id="t16" data-composition-id="titlecard16" data-width="1920" data-height="1080">
        <div class="in">
          <div class="doodles" data-layout-ignore></div><div class="glow" data-layout-ignore></div>
          <div class="stack">
            <div class="who"><div class="tav">${AV}</div><div class="whoname">CRIS JUNQUEIRA</div></div>
            <div class="epn">EPISÓDIO #${n}</div>
            <div class="name">${ep.name}</div>
            <div class="brand"><span class="bt">Vou te mandar um áudio</span><span class="bm">08:20 <span class="tks"></span></span></div>
          </div>
        </div>
      </div>
      <script>
        (function () {
          var R = document.getElementById("t16");
          R.querySelector(".tks").innerHTML = VT.ticks({ color: "#53bdeb", width: 36 });
          var build = function () {
            var nm = R.querySelector(".name");
            var fit = window.__hyperframes && window.__hyperframes.fitTextFontSize
              ? window.__hyperframes.fitTextFontSize(nm.textContent.trim().toUpperCase(), { fontFamily: "League Gothic", fontWeight: 400, maxWidth: 1500, baseFontSize: 400, minFontSize: 160, step: 4 })
              : { fontSize: 340 };
            nm.style.fontSize = Math.min(fit.fontSize, 400) + "px";
            var tl = gsap.timeline({ paused: true });
            tl.fromTo(R.querySelector(".in"), { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.04, duration: 0.2, ease: "power2.in", immediateRender: false }, ${tOut.toFixed(3)});
            window.__timelines["titlecard16"] = tl;
          };
          document.fonts.ready.then(build);
        })();
      </script>
    </template>
  </body>
</html>
`;
out(path.join(Q, "compositions/titlecard16.html"), t16);

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>EP ${n} — ${ep.name} · Vou te mandar um áudio (16:9)</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <script src="assets/vendor/vtma.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #efeae2; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #efeae2; font-family: Inter, sans-serif; }
      #wall { position: absolute; inset: 0; overflow: hidden; }
      #wall .doodles { position: absolute; left: 0; top: 0; width: 3360px; height: 1800px; background-image: url(assets/vendor/doodles.svg); background-size: 360px 360px; opacity: 0.85; }
      #wall .g1 { position: absolute; left: -300px; top: -200px; width: 1300px; height: 1300px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 65%); }
      #wall .g2 { position: absolute; left: 1000px; top: 200px; width: 1200px; height: 1200px; border-radius: 50%; background: radial-gradient(circle, rgba(217, 253, 211, 0.55) 0%, rgba(217, 253, 211, 0) 65%); }
      #darkov { position: absolute; inset: 0; background: #1b2a30; opacity: 0; }
      #phoneF, #cardF { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
      #phone { position: absolute; left: 80px; top: 30px; width: 668px; height: 1020px; }
      #phone .body { position: absolute; inset: 0; border-radius: 74px; background: #111b21; box-shadow: 0 30px 60px rgba(17, 27, 33, 0.35); }
      #phone .screen { position: absolute; left: 22px; top: 22px; width: 624px; height: 976px; border-radius: 54px; overflow: hidden; background: #efeae2; }
      #phone video { position: absolute; left: 0; top: 0; width: 624px; height: 1110px; }
      #phone .notch { position: absolute; left: 234px; top: 34px; width: 200px; height: 38px; border-radius: 19px; background: #111b21; }
      #phone .sb { position: absolute; width: 8px; border-radius: 4px; background: #111b21; }
      #phone .sb1 { left: -6px; top: 200px; height: 70px; }
      #phone .sb2 { left: -6px; top: 300px; height: 120px; }
      #phone .sb3 { right: -6px; top: 260px; height: 150px; }
      #card { position: absolute; left: 820px; top: 58px; width: 1040px; height: 963px; border-radius: 48px; overflow: hidden; background: #efeae2; box-shadow: 0 30px 60px rgba(17, 27, 33, 0.25); }
      #card video { position: absolute; left: 0; top: -173px; width: 1040px; height: 1848px; }
      #card .rim { position: absolute; inset: 0; border-radius: 48px; box-shadow: inset 0 0 0 8px #fbfaf7; }
      #el-titlecard16 { position: absolute; inset: 0; z-index: 6; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${total}">
      <div id="wall"><div class="doodles" data-layout-ignore></div><div class="g1" data-layout-ignore></div><div class="g2" data-layout-ignore></div></div>
      <div id="darkov" data-layout-ignore></div>
      <div id="phoneF">
      <div id="phone">
        <div class="sb sb1"></div><div class="sb sb2"></div><div class="sb sb3"></div>
        <div class="body"></div>
        <div class="screen"><video id="chatv" data-layout-allow-overflow src="assets/video/ep${n}-chat-9x16.mp4" muted playsinline data-start="0" data-duration="${total}" data-track-index="1"></video></div>
        <div class="notch"></div>
      </div>
      </div>
      <div id="cardF">
      <div id="card">
        <video id="scenev" data-layout-allow-overflow src="assets/video/ep${n}-scenes-9x16.mp4" muted playsinline data-start="0" data-duration="${total}" data-track-index="2"></video>
        <div class="rim"></div>
      </div>
      </div>
      <div id="el-titlecard16" data-composition-id="titlecard16" data-composition-src="compositions/titlecard16.html" data-start="0" data-duration="${(tOut + 0.25).toFixed(3)}" data-track-index="5" data-track-kind="graphics" data-width="1920" data-height="1080"></div>
      <audio id="vo" src="assets/audio/${path.basename(ep.audio)}" data-start="0" data-duration="${audioEnd}" data-track-index="10"></audio>
    </div>
    <script>
      (function () {
        var T = ${total}, TOUT = ${tOut.toFixed(3)};
        var D0 = ${dark ? dark.start : -1}, D1 = ${dark ? (dark.start + dark.dur).toFixed(3) : -1};
        var tl = gsap.timeline({ paused: true });
        tl.fromTo("#wall .doodles", { x: 0, y: 0 }, { x: -1440, y: -720, duration: T, ease: "none" }, 0);
        tl.fromTo("#wall .g1", { x: 0, y: 0 }, { x: 420, y: 160, duration: T, ease: "sine.inOut" }, 0);
        tl.fromTo("#wall .g2", { x: 0, y: 0 }, { x: -520, y: -240, duration: T, ease: "sine.inOut" }, 0);
        tl.fromTo("#phone", { y: 260, rotation: -3 }, { y: 0, rotation: 0, duration: 0.9, ease: "back.out(1.5)" }, TOUT - 0.1);
        tl.fromTo("#card", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: "power3.out" }, TOUT + 0.05);
        var F = 3.4, reps = Math.max(0, Math.floor((T - 1.2) / F) - 1);
        tl.fromTo("#phoneF", { y: 0 }, { y: -8, duration: F, ease: "sine.inOut", yoyo: true, repeat: reps }, 1.2);
        tl.fromTo("#cardF", { y: 0 }, { y: 8, duration: F, ease: "sine.inOut", yoyo: true, repeat: reps }, 1.2);
        if (D0 >= 0) {
          tl.to("#darkov", { opacity: 0.94, duration: 0.4, ease: "power2.out" }, D0 - 0.1);
          tl.to("#darkov", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, D1 - 0.3);
        }
        window.__timelines["main"] = tl;
      })();
    </script>
  </body>
</html>
`;
out(path.join(Q, "index.html"), html);
console.log(JSON.stringify({ out: Q, total, audioEnd, dark: dark ? [dark.start, dark.start + dark.dur] : null, scenes: hosts.length }));

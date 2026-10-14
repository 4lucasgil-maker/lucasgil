/* "Vou te mandar um áudio" — utilitários compartilhados das composições.
   Carregado no index.html antes das sub-composições. Nada aqui depende de relógio ou rede. */
(function () {
  var C = {
    paper: "#efeae2", doodle: "#cbc1b2", ink: "#111b21", ink2: "#3b4a54", muted: "#54656f",
    bubble: "#d9fdd3", white: "#fbfaf7", green: "#00a884", greenDeep: "#005c4b",
    slate: "#3f5b67", slateDeep: "#1b2a30", tick: "#53bdeb", red: "#e5484d", gold: "#c9a55c",
  };
  var norm = function (s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%]/g, "");
  };
  /* W = [[texto, inicioLocal, fimLocal], ...] → T("palavra", n) = início local da n-ésima ocorrência. */
  function finder(W, sceneId) {
    function find(word, n) {
      n = n || 1;
      var key = norm(word), hit = 0;
      for (var i = 0; i < W.length; i++) {
        if (norm(W[i][0]) === key && ++hit === n) return i;
      }
      throw new Error("[" + sceneId + "] palavra não encontrada: " + word + " #" + n);
    }
    var T = function (word, n) { return W[find(word, n)][1]; };
    T.end = function (word, n) { return W[find(word, n)][2]; };
    T.idx = find;
    return T;
  }
  var ICON = {
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
    send: '<path d="M4 12 20 4l-5 16-3.2-6.6z"/><path d="M11.8 13.4 20 4"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z"/>',
    bulb: '<path d="M9 17h6M10 20.5h4"/><path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.6.5 1 1.3 1 2.1v.4h4.4v-.4c0-.8.4-1.6 1-2.1A5.5 5.5 0 0 0 12 3.5z"/>',
    check: '<path d="M5 12.5 10 17.5 19 7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7.9-5.6-4-3.9 5.6-.8z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
    rewind: '<path d="M4 5v5h5"/><path d="M5.3 14.5A7.5 7.5 0 1 0 6 8.2L4 10"/>',
    flag: '<path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    car: '<path d="M3.5 15.5v-3.2l2-4.2A2 2 0 0 1 7.3 7h9.4a2 2 0 0 1 1.7 1l2.1 4.2v3.3a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z"/><path d="M5.5 12h13"/><circle cx="7.5" cy="16.8" r="1.9"/><circle cx="16.5" cy="16.8" r="1.9"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    doc: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>',
    pen: '<path d="M4 20l1.2-4.6L16 4.6a2 2 0 0 1 2.8 2.8L8 18.2z"/><path d="M14.5 6.1l2.9 2.9"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    chat: '<path d="M4 5.5h16v10.5H9.5L5 19.5V16H4z"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.8h-15z"/><path d="M10 20.5h4"/>',
    alert: '<path d="M12 4 21.5 20h-19z"/><path d="M12 10v4.5M12 17.4v.1"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    store: '<path d="M4 9.5 5.5 4.5h13L20 9.5M4 9.5h16v2a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 11.5z"/><path d="M5.5 13.5v6.5h13v-6.5M10 20v-4.5h4V20"/>',
    shield: '<path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z"/><path d="M8.8 12 11 14.2l4.3-4.4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12.2 19.5 3.8M16.5 6.8l2.5 2.5M14.2 9.1l1.8 1.8"/>',
    phone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.2"/><path d="M11 18h2"/>',
    hourglass: '<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4.5 4 5.5 4 8.5s-4 4-4 8.5M16 3.5c0 4.5-4 5.5-4 8.5s4 4 4 8.5"/>',
    thumb: '<path d="M7.5 10.5v9.5H4.5v-9.5zM7.5 10.5l3.6-6.3a1.8 1.8 0 0 1 3.3 1.3L13.6 9h5a1.8 1.8 0 0 1 1.8 2.1l-1.3 7.2a2 2 0 0 1-2 1.7H7.5"/>',
    reply: '<path d="M10 6 4 12l6 6"/><path d="M4.5 12H14a6 6 0 0 1 6 6v1"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10"/>',
  };
  function icon(name, o) {
    o = o || {};
    var s = o.size || 48, sw = o.stroke || 2, col = o.color || "currentColor";
    var fill = o.fill ? col : "none";
    return '<svg class="' + (o.cls || "") + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + fill +
      '" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + "</svg>";
  }
  /* ✓✓ do WhatsApp. */
  function ticks(o) {
    o = o || {};
    var col = o.color || C.muted, w = o.width || 34;
    return '<svg class="' + (o.cls || "ticks") + '" width="' + w + '" height="' + Math.round(w * 0.62) + '" viewBox="0 0 34 21" fill="none" stroke="' +
      col + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 11.5l5.5 5.5L19 5"/><path d="M13.5 16.8l.3.2L25.3 5"/></svg>';
  }
  /* Cursor de seta (desenho próprio), ponta em (0,0) do SVG. */
  function cursor(o) {
    o = o || {};
    var s = o.size || 56;
    return '<svg class="' + (o.cls || "cur") + '" width="' + s + '" height="' + Math.round(s * 1.25) + '" viewBox="0 0 32 40" aria-hidden="true">' +
      '<path d="M2.5 2.5v29l7.4-6.6 4.8 11 5-2.1-4.8-10.8h10.2z" fill="' + (o.fill || "#fbfaf7") + '" stroke="' + (o.color || "#111b21") +
      '" stroke-width="2.6" stroke-linejoin="round"/></svg>';
  }
  /* Carro de perfil (desenho próprio), viewBox 260×110, rodas em y=86. */
  function car(o) {
    o = o || {};
    var w = o.width || 260, col = o.color || C.green, ink = o.ink || C.ink;
    return '<svg class="' + (o.cls || "car") + '" width="' + w + '" height="' + Math.round(w * 110 / 260) + '" viewBox="0 0 260 110" aria-hidden="true">' +
      '<path d="M18 74c0-12 8-16 22-18l38-4 26-22c6-5 12-7 20-7h52c10 0 18 4 24 11l20 20c18 2 28 8 28 18v8c0 4-3 6-7 6H22c-3 0-4-2-4-6z" fill="' + col + '" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M114 34 101 52h45V34zM156 34v18h50l-16-16c-2-1.3-4-2-7-2z" fill="' + (o.glass || "#d9fdd3") + '" stroke="' + ink + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M236 62h8M24 66h10" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/>' +
      '<g class="wh wh1"><circle cx="70" cy="86" r="19" fill="' + ink + '"/><circle cx="70" cy="86" r="8" fill="#fbfaf7"/></g>' +
      '<g class="wh wh2"><circle cx="196" cy="86" r="19" fill="' + ink + '"/><circle cx="196" cy="86" r="8" fill="#fbfaf7"/></g></svg>';
  }
  /* Rosto ilustrado (sem emoji): humor "happy" | "angry" | "neutral" | "sad". viewBox 100×100. */
  function face(mood, o) {
    o = o || {};
    var s = o.size || 120, col = o.color || (mood === "angry" ? C.red : mood === "happy" ? C.green : C.slate), ink = o.ink || C.ink;
    var m = { happy: "M30 58q20 22 40 0", angry: "M32 72q18-14 36 0", sad: "M34 72q16-12 32 0", neutral: "M34 66h32" }[mood || "neutral"];
    var brows = mood === "angry" ? '<path d="M24 30l18 8M76 30l-18 8" stroke="' + ink + '" stroke-width="6" stroke-linecap="round"/>' : "";
    return '<svg class="' + (o.cls || "face") + '" width="' + s + '" height="' + s + '" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="46" fill="' + col + '" stroke="' + ink + '" stroke-width="4"/>' + brows +
      '<circle cx="35" cy="44" r="6" fill="' + ink + '"/><circle cx="65" cy="44" r="6" fill="' + ink + '"/>' +
      '<path d="' + m + '" fill="none" stroke="' + ink + '" stroke-width="6" stroke-linecap="round"/></svg>';
  }
  /* Pessoa (busto) em círculo. viewBox 100×100. */
  function person(o) {
    o = o || {};
    var s = o.size || 100, bg = o.bg || C.slate, fg = o.fg || C.white;
    return '<svg class="' + (o.cls || "person") + '" width="' + s + '" height="' + s + '" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="48" fill="' + bg + '"/><circle cx="50" cy="40" r="16" fill="' + fg + '"/>' +
      '<path d="M20 84c4-16 16-24 30-24s26 8 30 24" fill="' + fg + '"/></svg>';
  }
  /* Interpolação por quadros-chave, função pura do tempo: keys = [[t, v], [t, v, "ease"], ...].
     eases: lin, io (seno), out, in, back, el (mola amortecida). */
  var EASE = {
    lin: function (p) { return p; },
    io: function (p) { return 0.5 - 0.5 * Math.cos(Math.PI * p); },
    out: function (p) { return 1 - Math.pow(1 - p, 3); },
    in: function (p) { return p * p * p; },
    back: function (p) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    el: function (p) { return p >= 1 ? 1 : 1 - Math.cos(p * 4.5 * Math.PI) * Math.exp(-5 * p); },
  };
  function kf(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (t < b[0]) {
        var p = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * (EASE[b[2] || "io"] || EASE.io)(p);
      }
    }
    return keys[keys.length - 1][1];
  }
  /* Driver: um único tween linear de 0→dur que chama paint(t) — estado = função pura do tempo. */
  function driver(tl, dur, paint) {
    var d = { t: 0 };
    paint(0);
    tl.fromTo(d, { t: 0 }, { t: dur, duration: dur, ease: "none", immediateRender: false, onUpdate: function () { paint(d.t); } }, 0);
  }
  /* Parte um texto em spans de palavra (sem <br>). */
  function splitWords(el, cls) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = cls || "w";
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return el.querySelectorAll("." + (cls || "w"));
  }
  /* PRNG determinístico (mulberry32). */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clock(startHHMM, seconds) {
    var p = startHHMM.split(":");
    var m = +p[0] * 60 + +p[1] + Math.floor(seconds / 60);
    var hh = Math.floor(m / 60) % 24, mm = m % 60;
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  }
  function mmss(t) {
    t = Math.max(0, Math.floor(t));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  window.VT = { C: C, norm: norm, finder: finder, icon: icon, ticks: ticks, cursor: cursor, car: car, face: face, person: person, kf: kf, driver: driver, splitWords: splitWords, rng: rng, clock: clock, mmss: mmss };
})();

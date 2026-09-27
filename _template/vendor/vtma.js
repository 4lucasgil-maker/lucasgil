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
  window.VT = { C: C, norm: norm, finder: finder, icon: icon, ticks: ticks, splitWords: splitWords, rng: rng, clock: clock, mmss: mmss };
})();

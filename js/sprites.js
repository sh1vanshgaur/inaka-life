/* =========================================================================
   sprites.js — pixel sprite engine + terrain / flora / structures
   Everything is drawn procedurally into offscreen canvases at boot.
   ========================================================================= */
"use strict";

const SPR = {}; // global sprite registry: name -> canvas | {frames:[...]} | {season:{...}}

const Sprites = (() => {

  // ---------- tiny helpers ----------
  function mk(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    return [c, x];
  }
  function px(x, cx, cy, w, h, col) { x.fillStyle = col; x.fillRect(Math.round(cx), Math.round(cy), Math.round(w), Math.round(h)); }
  function pxl(x, cx, cy, col) { x.fillStyle = col; x.fillRect(Math.round(cx), Math.round(cy), 1, 1); }

  // seeded rng for deterministic noise
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // build from string rows + palette map  -> canvas
  function build(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const [c, x] = mk(w, h);
    for (let y = 0; y < h; y++) {
      const r = rows[y];
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === "." || ch === " ") continue;
        const col = pal[ch];
        if (col) pxl(x, i, y, col);
      }
    }
    return c;
  }
  function buildFrames(frames, pal) { return frames.map(f => build(f, pal)); }
  function flip(cv) {
    const [c, x] = mk(cv.width, cv.height);
    x.translate(cv.width, 0); x.scale(-1, 1);
    x.drawImage(cv, 0, 0);
    return c;
  }

  // chunky pixel ellipse (pixel-art friendly)
  function ell(x, cx, cy, rx, ry, col) {
    for (let dy = -ry; dy <= ry; dy++) {
      const t = dy / ry;
      let w2 = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      if (w2 < 0) w2 = 0;
      px(x, cx - w2, cy + dy, w2 * 2 + 1, 1, col);
    }
  }

  // =========================================================================
  //  GROUND TILES (per season)
  // =========================================================================
  const GROUNDPAL = {
    spring: { base: "#8fd464", dark: "#7cbf55", dark2: "#6fae4c", light: "#a4e07a", flowers: ["#ff9ecb", "#fff1a8", "#c9a8ff"] },
    summer: { base: "#66c455", dark: "#54b04a", dark2: "#4aa542", light: "#7fd46e", flowers: ["#ffd94a", "#ff8a5a", "#fff1a8"] },
    autumn: { base: "#b9b35e", dark: "#a5a04f", dark2: "#978f45", light: "#c9c474", flowers: ["#e07a4a", "#d94a6a", "#f0aa5c"] },
    winter: { base: "#e6eef2", dark: "#d5e2e8", dark2: "#c8d8e0", light: "#f4fafb", flowers: ["#ffffff"] },
  };

  function grassTile(p, seed, flowers) {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, p.base);
    const r = rng(seed);
    for (let i = 0; i < 22; i++) {
      const gx = (r() * 16) | 0, gy = (r() * 16) | 0;
      pxl(x, gx, gy, r() < 0.5 ? p.dark : p.light);
    }
    for (let i = 0; i < 5; i++) pxl(x, (r() * 16) | 0, (r() * 16) | 0, p.dark2);
    if (flowers) { // little flower clusters
      for (let f = 0; f < 2; f++) {
        const fx = 2 + ((r() * 12) | 0), fy = 2 + ((r() * 12) | 0);
        const col = p.flowers[(r() * p.flowers.length) | 0];
        pxl(x, fx, fy, col); pxl(x, fx + 1, fy + 1, col); pxl(x, fx, fy + 1, p.dark2);
      }
    }
    return c;
  }

  function waterFrame(frame) {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, "#4a94d0");
    const r = rng(99 + frame);
    for (let i = 0; i < 5; i++) {
      const wy = ((i * 3 + frame * 2 + 1) % 16);
      const wx = ((r() * 10) | 0);
      px(x, wx, wy, 4 + ((r() * 4) | 0), 1, "#58a8e0");
      px(x, (wx + 6) % 13, (wy + 8) % 16, 3, 1, "#6cbce8");
    }
    pxl(x, (3 + frame * 4) % 16, 4, "#a8dcf4");
    pxl(x, (9 + frame * 3) % 16, 12, "#a8dcf4");
    return c;
  }

  function paddyFrame(frame) {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, "#6cb8d8");
    const r = rng(31 + frame);
    for (let i = 0; i < 4; i++) {
      const wy = ((i * 4 + frame * 2) % 16);
      px(x, (r() * 8) | 0, wy, 4, 1, "#7cc8e4");
    }
    pxl(x, (2 + frame * 5) % 16, 6, "#b0e4f4");
    return c;
  }

  function pathTile(seed) {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, "#d8b078");
    const r = rng(seed);
    for (let i = 0; i < 16; i++) pxl(x, (r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? "#c69a60" : "#e4c490");
    for (let i = 0; i < 3; i++) pxl(x, (r() * 14 + 1) | 0, (r() * 14 + 1) | 0, "#b98a52");
    return c;
  }
  function stoneTile(seed) {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, "#c8c8d0");
    const r = rng(seed);
    for (let i = 0; i < 10; i++) pxl(x, (r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? "#b4b4c0" : "#d8d8e2");
    // slab lines
    px(x, 0, 7, 16, 1, "#a8a8b6"); px(x, 7, 0, 1, 7, "#a8a8b6"); px(x, 11, 8, 1, 8, "#a8a8b6");
    return c;
  }
  function sandTile(seed) {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, "#e8d8a8");
    const r = rng(seed);
    for (let i = 0; i < 12; i++) pxl(x, (r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? "#dcc890" : "#f0e4bc");
    return c;
  }
  function soilTile(wet) {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, wet ? "#6a4428" : "#8a5a3a");
    const r = rng(wet ? 7 : 3);
    const dk = wet ? "#5a3820" : "#7a4c30", lt = wet ? "#7a5030" : "#9a6a44";
    for (let i = 0; i < 14; i++) pxl(x, (r() * 16) | 0, (r() * 16) | 0, r() < 0.5 ? dk : lt);
    // tilling rows
    for (let yy = 2; yy < 16; yy += 5) px(x, 1, yy, 14, 1, dk);
    return c;
  }
  function plankTile() {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, "#b08a5a");
    px(x, 0, 0, 16, 1, "#c9a06c"); px(x, 0, 15, 16, 1, "#9a7248");
    const r = rng(55);
    for (let i = 0; i < 8; i++) pxl(x, (r() * 16) | 0, (r() * 16) | 0, "#9a7248");
    px(x, 5, 0, 1, 16, "#9a7248"); px(x, 11, 0, 1, 16, "#9a7248");
    return c;
  }
  function railTile() {
    const [c, x] = mk(16, 16);
    px(x, 0, 0, 16, 16, "#9aa06a"); // gravel bed
    const r = rng(77);
    for (let i = 0; i < 10; i++) pxl(x, (r() * 16) | 0, (r() * 16) | 0, "#8a9060");
    px(x, 0, 5, 16, 6, "#8a6242"); // tie
    px(x, 0, 5, 16, 1, "#9a7248"); px(x, 0, 10, 16, 1, "#7a5638");
    px(x, 0, 4, 16, 1, "#b8bcc4"); // rails
    px(x, 0, 10, 16, 1, "#a8acb4");
    return c;
  }

  // =========================================================================
  //  TREES & FLORA
  // =========================================================================
  const LEAFPAL = {
    spring: { D: "#e07aa8", M: "#ff9cc0", L: "#ffcce0", dot: "#fff0f6" },   // sakura
    summer: { D: "#3f8f44", M: "#4da04e", L: "#6cc068", dot: "#8fd88a" },
    autumn: { D: "#b85838", M: "#e08a4a", L: "#f4b86a", dot: "#ffe0a0" },
  };

  // round fluffy tree, 26 x 32
  function genTree(leafPal, seed, bare) {
    const W = 26, H = 32;
    const [c, x] = mk(W, H);
    const r = rng(seed);
    // trunk
    px(x, 11, 20, 4, 11, "#8a6242");
    px(x, 10, 28, 6, 3, "#7a5438"); // root flare
    px(x, 11, 20, 1, 11, "#9a7250");
    if (bare) {
      // bare branches
      px(x, 9, 12, 2, 10, "#8a6242"); px(x, 16, 12, 2, 10, "#8a6242");
      px(x, 11, 8, 4, 4, "#8a6242");
      px(x, 6, 10, 4, 2, "#7a5438"); px(x, 17, 9, 4, 2, "#7a5438");
      px(x, 12, 5, 2, 4, "#7a5438");
      // snow caps
      px(x, 10, 7, 6, 2, "#eef6fa"); px(x, 5, 9, 4, 1, "#eef6fa"); px(x, 17, 8, 4, 1, "#eef6fa");
      px(x, 12, 4, 2, 1, "#eef6fa");
      return c;
    }
    // canopy: overlapping pixel ellipses
    ell(x, 13, 14, 11, 9, leafPal.D);
    ell(x, 8, 16, 6, 6, leafPal.M);
    ell(x, 18, 15, 6, 7, leafPal.M);
    ell(x, 13, 8, 8, 6, leafPal.M);
    ell(x, 12, 12, 7, 5, leafPal.L);
    ell(x, 17, 12, 4, 3, leafPal.L);
    // dither noise
    for (let i = 0; i < 26; i++) {
      const gx = 2 + ((r() * 22) | 0), gy = 3 + ((r() * 18) | 0);
      pxl(x, gx, gy, r() < 0.4 ? leafPal.L : leafPal.D);
    }
    // sparkle dots
    for (let i = 0; i < 4; i++) pxl(x, 3 + ((r() * 20) | 0), 4 + ((r() * 14) | 0), leafPal.dot);
    return c;
  }

  // pine tree 22 x 38
  function genPine(snowy) {
    const W = 22, H = 38;
    const [c, x] = mk(W, H);
    px(x, 10, 30, 3, 8, "#7a5438");
    const tiers = [[11, 5, 4], [11, 13, 6], [11, 21, 8]];
    for (const [cx, top, hw] of tiers) {
      for (let dy = 0; dy < 9; dy++) {
        const w2 = Math.min(hw, Math.round((dy / 8) * hw));
        px(x, cx - w2, top + dy, w2 * 2 + 1, 1, dy % 3 === 2 ? "#2f7a4a" : "#3c8f58");
      }
    }
    px(x, 10, 2, 3, 4, "#3c8f58"); px(x, 9, 3, 5, 2, "#3c8f58");
    if (snowy) {
      px(x, 9, 4, 5, 2, "#e8f2f8"); px(x, 6, 12, 11, 1, "#e8f2f8");
      px(x, 4, 20, 15, 1, "#e8f2f8"); px(x, 8, 3, 7, 1, "#fff");
    }
    return c;
  }

  // bamboo 18 x 42
  function genBamboo() {
    const [c, x] = mk(18, 42);
    const stalks = [[3, 0], [9, 3], [15, 1]];
    for (const [sx, off] of stalks) {
      px(x, sx, 4 + off, 2, 38 - off, "#6aa84f");
      px(x, sx, 4 + off, 1, 38 - off, "#7cbf62");
      for (let ny = 10 + off; ny < 40; ny += 7) px(x, sx, ny, 2, 1, "#558a3e");
      // leaves
      px(x, sx - 3, 6 + off, 3, 1, "#7cbf62"); px(x, sx + 2, 9 + off, 3, 1, "#7cbf62");
      px(x, sx - 2, 12 + off, 2, 1, "#6aa84f"); px(x, sx + 2, 15 + off, 2, 1, "#6aa84f");
    }
    px(x, 0, 41, 18, 1, "#558a3e");
    return c;
  }

  function genBush(pal) {
    const [c, x] = mk(16, 13);
    ell(x, 8, 8, 7, 5, pal.D);
    ell(x, 6, 6, 4, 3, pal.M);
    ell(x, 11, 7, 3, 2, pal.L);
    const r = rng(8);
    for (let i = 0; i < 6; i++) pxl(x, 2 + ((r() * 12) | 0), 3 + ((r() * 8) | 0), pal.L);
    return c;
  }

  function genTallGrass(season) {
    const [c, x] = mk(14, 12);
    const cols = season === "autumn" ? ["#c9a94a", "#b8943e"] : season === "winter" ? ["#c8d8e0", "#b0c4d0"] : ["#5aa04a", "#6cb858"];
    const r = rng(4);
    for (let i = 0; i < 7; i++) {
      const gx = 1 + ((r() * 12) | 0);
      const h2 = 4 + ((r() * 6) | 0);
      px(x, gx, 12 - h2, 1, h2, cols[i % 2]);
      pxl(x, gx + (r() < 0.5 ? -1 : 1), 12 - h2, cols[i % 2]);
    }
    return c;
  }

  // decorative flowers (pickable) 12x14 — color by season
  function genFlower(col1, col2) {
    const [c, x] = mk(12, 14);
    px(x, 5, 7, 1, 7, "#4a9040");
    px(x, 3, 10, 2, 1, "#4a9040"); px(x, 7, 9, 2, 1, "#4a9040");
    px(x, 4, 3, 3, 3, col1);
    px(x, 3, 4, 1, 1, col1); px(x, 7, 4, 1, 1, col1);
    px(x, 4, 2, 1, 1, col2); px(x, 6, 2, 1, 1, col2);
    pxl(x, 5, 4, "#fff6d0");
    return c;
  }

  function genRock(seed, w, h) {
    const [c, x] = mk(w, h);
    const r = rng(seed);
    ell(x, w / 2, h - h / 2 - 1, w / 2 - 1, h / 2 - 1, "#9a9aa4");
    ell(x, w / 2 - 1, h - h / 2 - 1, w / 2 - 3, h / 2 - 2, "#aeaec0");
    px(x, 2, h - 3, w - 4, 1, "#8a8a94");
    for (let i = 0; i < 4; i++) pxl(x, 2 + ((r() * (w - 4)) | 0), 1 + ((r() * (h - 3)) | 0), "#8a8a94");
    return c;
  }

  function genMushroom() {
    const [c, x] = mk(10, 10);
    px(x, 4, 5, 2, 5, "#f0e0c8");
    ell(x, 4, 4, 4, 2, "#e05a5a");
    pxl(x, 3, 3, "#fff"); pxl(x, 5, 4, "#fff");
    return c;
  }
  function genBambooShoot() {
    const [c, x] = mk(12, 14);
    ell(x, 5, 9, 5, 4, "#a58a4a");
    px(x, 5, 2, 2, 8, "#c9a86a");
    px(x, 3, 4, 2, 3, "#c9a86a"); px(x, 7, 4, 2, 3, "#c9a86a");
    px(x, 5, 0, 1, 3, "#8aa050"); px(x, 3, 1, 1, 3, "#8aa050"); px(x, 7, 1, 1, 3, "#8aa050");
    return c;
  }
  function genHerb() {
    const [c, x] = mk(12, 12);
    px(x, 5, 5, 1, 7, "#4a9040");
    px(x, 2, 3, 3, 1, "#6cc068"); px(x, 7, 3, 3, 1, "#6cc068");
    px(x, 3, 6, 3, 1, "#6cc068"); px(x, 6, 8, 3, 1, "#6cc068");
    pxl(x, 5, 2, "#fff1a8"); pxl(x, 3, 2, "#fff1a8"); pxl(x, 8, 2, "#fff1a8");
    return c;
  }

  // =========================================================================
  //  STRUCTURES (procedural builders)
  // =========================================================================

  // Japanese house. wT = width in tiles. Returns {day, lit, w, h}
  function genHouse(wT, opts = {}) {
    const W = wT * 16;
    const wallH = 34;
    const roofH = 30;
    const H = wallH + roofH + 6; // + stone base
    const roof = opts.roof || "#556090";
    const roofDk = shade(roof, -18);
    const roofLt = shade(roof, 12);
    const wall = opts.wall || "#f2e4c8";
    const beam = "#8a6242";

    function body(x, lit) {
      // stone base
      px(x, 2, H - 6, W - 4, 6, "#b0a898");
      px(x, 2, H - 6, W - 4, 1, "#c8c0b0");
      // walls
      px(x, 3, roofH, W - 6, wallH - 4, wall);
      px(x, 3, roofH, W - 6, 2, beam); // top beam
      px(x, 3, roofH, 2, wallH - 4, beam); px(x, W - 5, roofH, 2, wallH - 4, beam);
      px(x, 3, roofH + wallH - 8, W - 6, 2, beam); // mid beam
      // roof: stepped trapezoid
      const topW = Math.max(10, W * 0.34);
      for (let ry = 0; ry < roofH; ry++) {
        const t2 = ry / roofH;
        const w2 = Math.round(topW + (W + 10 - topW) * t2) / 2;
        const col = (ry % 6 === 5) ? roofDk : roof;
        px(x, W / 2 - w2, ry + 4, w2 * 2, 1, col);
      }
      // eaves flare
      px(x, 0, roofH + 2, 7, 3, roofDk); px(x, W - 7, roofH + 2, 7, 3, roofDk);
      px(x, 0, roofH + 1, 5, 1, roofLt); px(x, W - 5, roofH + 1, 5, 1, roofLt);
      // ridge
      px(x, W / 2 - topW / 2 - 2, 2, topW + 4, 3, roofDk);
      px(x, W / 2 - topW / 2 - 2, 2, topW + 4, 1, "#3a3f52");
      // roof tile grooves
      for (let gx = W / 2 - topW / 2; gx < W / 2 + topW / 2; gx += 6) pxl(x, gx, 3, "#3a3f52");
      // door (center)
      const dx = Math.floor(W / 2) - 7;
      px(x, dx, roofH + 10, 14, wallH - 14, "#6a4a32");
      px(x, dx, roofH + 10, 14, 2, beam);
      px(x, dx + 1, roofH + 12, 12, wallH - 16, "#7c583c");
      px(x, dx + 6, roofH + 12, 1, wallH - 16, "#6a4a32");
      pxl(x, dx + 10, roofH + 18, "#ffd98a"); // door handle
      // shoji windows flanking
      const winY = roofH + 8;
      const winW = 12, winH = 12;
      const wins = [];
      wins.push(8); wins.push(W - 8 - winW);
      if (wT >= 5) wins.splice(1, 0, Math.floor(W / 2) - winW - 12, Math.floor(W / 2) + 12);
      for (const wx of wins) {
        if (wx === dx - winW + 4) continue;
        px(x, wx - 1, winY - 1, winW + 2, winH + 2, beam);
        const glow = lit ? "#ffe8a8" : "#fff8e0";
        px(x, wx, winY, winW, winH, glow);
        px(x, wx + winW / 2 - 1, winY, 1, winH, beam); px(x, wx, winY + winH / 2 - 1, winW, 1, beam);
        if (lit) { px(x, wx, winY, winW, 1, "#fff6c8"); px(x, wx, winY, 1, winH, "#fff6c8"); }
      }
      // chimney (little kitchen pipe)
      if (!opts.noChimney) {
        px(x, W - 16, 0, 5, 10, "#8a8a94");
        px(x, W - 17, 0, 7, 2, "#6a6a74");
      }
      // shop sign board
      if (opts.sign) {
        px(x, 10, roofH + 6, 16, 10, "#5a3a28");
        px(x, 11, roofH + 7, 14, 8, "#f2e4c8");
        // little eggplant mark
        px(x, 16, roofH + 9, 3, 4, "#7a4a9a"); px(x, 17, roofH + 13, 1, 1, "#5aa04a");
      }
    }
    const [day, dx2] = mk(W, H); body(dx2, false);
    const [lit, lx] = mk(W, H); body(lx, true);
    return { day, lit, w: W, h: H };
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // torii gate 36 x 46
  function genTorii() {
    const [c, x] = mk(36, 46);
    const V = "#e0503c", VD = "#b83a2c", BK = "#2b2233";
    // pillars
    px(x, 4, 12, 5, 34, V); px(x, 27, 12, 5, 34, V);
    px(x, 4, 12, 1, 34, "#f06a54"); px(x, 27, 12, 1, 34, "#f06a54");
    px(x, 3, 44, 7, 2, VD); px(x, 26, 44, 7, 2, VD);
    // kasagi (top lintel) with curve
    px(x, 0, 4, 36, 4, BK);
    px(x, 0, 8, 36, 2, V);
    px(x, 0, 3, 36, 1, "#4a3f52");
    px(x, 1, 2, 34, 1, BK);
    // nuki (second beam)
    px(x, 2, 18, 32, 4, V); px(x, 2, 18, 32, 1, "#f06a54");
    // shimaki center + plaque
    px(x, 16, 10, 4, 8, BK);
    px(x, 17, 12, 2, 4, "#ffd98a");
    // struts
    px(x, 7, 8, 2, 10, VD); px(x, 27, 8, 2, 10, VD);
    return c;
  }

  // shrine building 72 x 52
  function genShrine() {
    const [c, x] = mk(72, 52);
    const R = "#7a4a3a", RD = "#5e382c", RL = "#96604c";
    // raised base
    px(x, 4, 40, 64, 8, "#8a6242"); px(x, 4, 40, 64, 2, "#9a7250");
    px(x, 8, 48, 6, 4, "#7a5438"); px(x, 58, 48, 6, 4, "#7a5438");
    // steps
    px(x, 30, 44, 12, 4, "#9a7250"); px(x, 32, 48, 8, 4, "#8a6242");
    // walls
    px(x, 8, 22, 56, 18, "#f2e4c8");
    px(x, 8, 22, 2, 18, "#8a6242"); px(x, 62, 22, 2, 18, "#8a6242");
    // shoji panels
    for (let i = 0; i < 4; i++) {
      const wx = 14 + i * 13;
      px(x, wx - 1, 25, 11, 13, "#8a6242");
      px(x, wx, 26, 9, 11, "#fff8e0");
      px(x, wx + 4, 26, 1, 11, "#8a6242");
    }
    // roof (steep, curved-ish)
    for (let ry = 0; ry < 20; ry++) {
      const t2 = ry / 20;
      const w2 = Math.round(14 + (44 - 14) * Math.sqrt(t2)) + 2;
      const col = (ry % 5 === 4) ? RD : R;
      px(x, 36 - w2, 2 + ry, w2 * 2, 1, col);
    }
    px(x, 6, 22, 60, 3, RD);
    px(x, 4, 21, 10, 2, RL); px(x, 58, 21, 10, 2, RL); // eave tips up
    px(x, 22, 0, 28, 3, RD); px(x, 22, 0, 28, 1, "#3a2a22");
    // shimenawa rope + shide
    px(x, 16, 24, 40, 2, "#c9a86a");
    px(x, 20, 26, 3, 5, "#fff8e0"); px(x, 25, 26, 3, 5, "#fff8e0");
    px(x, 44, 26, 3, 5, "#fff8e0"); px(x, 49, 26, 3, 5, "#fff8e0");
    // gold plaque
    px(x, 33, 24, 6, 6, "#ffd98a"); px(x, 35, 26, 2, 2, "#a06a2a");
    return c;
  }

  // stone lantern 14 x 28
  function genLantern() {
    const S = "#b0b0ba", SD = "#8a8a96", SL = "#c8c8d4";
    function body(x, lit) {
      px(x, 5, 0, 4, 2, SD);           // finial
      px(x, 3, 2, 8, 2, S);            // cap
      pxl(x, 4, 3, SL); pxl(x, 9, 3, SL);
      px(x, 2, 4, 10, 2, SD);          // roof
      px(x, 3, 6, 8, 6, S);            // light box
      const glow = lit ? "#ffe8a8" : "#4a4a56";
      px(x, 4, 7, 6, 4, glow);
      if (lit) { px(x, 4, 7, 6, 1, "#fff6c8"); }
      px(x, 5, 12, 4, 8, S);           // pillar
      px(x, 5, 12, 1, 8, SL);
      px(x, 2, 20, 10, 3, SD);         // base
      px(x, 1, 23, 12, 2, S);
    }
    const [day, dx2] = mk(14, 25); body(dx2, false);
    const [lit, lx] = mk(14, 25); body(lx, true);
    return { day, lit, w: 14, h: 25 };
  }

  // well 26 x 28
  function genWell() {
    const [c, x] = mk(26, 28);
    // stone ring
    ell(x, 12, 20, 10, 6, "#b0b0ba");
    ell(x, 12, 19, 7, 4, "#3a5a7a"); // water
    ell(x, 12, 19, 5, 3, "#58a8e0");
    px(x, 2, 22, 20, 2, "#8a8a96");
    // posts + roof
    px(x, 3, 4, 2, 16, "#8a6242"); px(x, 21, 4, 2, 16, "#8a6242");
    for (let ry = 0; ry < 7; ry++) {
      const w2 = 3 + ry * 1.8;
      px(x, 13 - w2, ry, w2 * 2, 1, ry % 3 === 2 ? "#4a5a8c" : "#556090");
    }
    px(x, 8, 0, 10, 2, "#3a3f52");
    // rope + bucket
    px(x, 12, 7, 1, 7, "#c9a86a");
    px(x, 10, 14, 5, 4, "#a06a2a");
    px(x, 10, 14, 5, 1, "#8a5a2a");
    return c;
  }

  // vending machine 18 x 30 — glows at night
  function genVending() {
    function body(x, lit) {
      px(x, 1, 2, 16, 26, "#d04848");
      px(x, 1, 2, 16, 1, "#e86a6a"); px(x, 1, 27, 16, 1, "#a03838");
      // display window
      const glow = lit ? "#fff6c0" : "#e8e0d0";
      px(x, 3, 5, 10, 10, glow);
      // little bottles
      const cols = ["#48c0e8", "#ffd94a", "#8ae06a", "#ff8ab0"];
      for (let i = 0; i < 4; i++) px(x, 4 + (i % 2) * 5, 6 + ((i / 2) | 0) * 5, 3, 4, cols[i]);
      // coin slot + flap
      px(x, 3, 18, 10, 6, "#b03838");
      px(x, 4, 20, 8, 3, "#7a2828");
      px(x, 14, 18, 2, 6, "#ffd98a");
      pxl(x, 15, 20, "#fff");
      // base
      px(x, 0, 28, 18, 2, "#5a5a66");
    }
    const [day, dx2] = mk(18, 30); body(dx2, false);
    const [lit, lx] = mk(18, 30); body(lx, true);
    return { day, lit, w: 18, h: 30 };
  }

  function genMailbox() {
    const [c, x] = mk(14, 18);
    px(x, 6, 8, 2, 10, "#8a6242");
    px(x, 2, 2, 10, 7, "#4a7ac0");
    px(x, 2, 2, 10, 2, "#5a8ad0");
    px(x, 3, 5, 6, 2, "#2b2233");
    pxl(x, 11, 6, "#ffd98a");
    px(x, 1, 1, 12, 1, "#3a5a9a");
    return c;
  }

  function genBench() {
    const [c, x] = mk(26, 14);
    px(x, 1, 4, 24, 5, "#c9a06c");
    px(x, 1, 4, 24, 1, "#d9b078");
    for (let i = 0; i < 4; i++) px(x, 2 + i * 7, 4, 1, 5, "#a07848");
    px(x, 2, 9, 3, 5, "#8a6242"); px(x, 21, 9, 3, 5, "#8a6242");
    px(x, 1, 0, 24, 2, "#a07848");
    return c;
  }

  function genSign() {
    const [c, x] = mk(16, 20);
    px(x, 7, 8, 2, 12, "#8a6242");
    px(x, 1, 1, 14, 8, "#a07848");
    px(x, 2, 2, 12, 6, "#e8d5a8");
    px(x, 3, 4, 4, 1, "#6a4a32"); px(x, 3, 5, 6, 1, "#6a4a32"); // scribbles
    px(x, 10, 4, 1, 2, "#6a4a32");
    return c;
  }

  function genLamp() {
    function body(x, lit) {
      px(x, 3, 8, 2, 22, "#4a4a56");
      px(x, 1, 28, 6, 2, "#3a3a46");
      px(x, 1, 3, 6, 6, lit ? "#ffe8a8" : "#d8d8c8");
      px(x, 0, 2, 8, 2, "#3a3a46");
      px(x, 2, 0, 4, 2, "#3a3a46");
      if (lit) { px(x, 2, 5, 4, 2, "#fff6c8"); }
    }
    const [day, dx2] = mk(8, 30); body(dx2, false);
    const [lit, lx] = mk(8, 30); body(lx, true);
    return { day, lit, w: 8, h: 30 };
  }

  function genScarecrow() {
    const [c, x] = mk(20, 30);
    // pole + arms
    px(x, 9, 10, 2, 20, "#8a6242");
    px(x, 2, 12, 16, 2, "#8a6242");
    // body (patched shirt)
    px(x, 6, 12, 8, 9, "#d94a6a");
    px(x, 6, 12, 8, 2, "#b83a54");
    px(x, 8, 16, 2, 2, "#ffd98a"); // patch
    px(x, 12, 19, 2, 2, "#4a9040");
    // head (sack)
    ell(x, 9, 8, 4, 4, "#e8c88a");
    pxl(x, 8, 8, "#2b2233"); pxl(x, 11, 8, "#2b2233");
    px(x, 8, 10, 4, 1, "#a07848");
    // straw hat
    px(x, 3, 5, 13, 2, "#d9b06a");
    px(x, 6, 2, 8, 3, "#e8c070");
    // straw hands
    px(x, 1, 11, 2, 3, "#d9b06a"); px(x, 17, 11, 2, 3, "#d9b06a");
    return c;
  }

  function genFenceH() {
    const [c, x] = mk(16, 14);
    px(x, 1, 2, 14, 2, "#c9a06c");
    px(x, 1, 7, 14, 2, "#c9a06c");
    px(x, 2, 0, 3, 14, "#a07848");
    px(x, 11, 0, 3, 14, "#a07848");
    px(x, 2, 0, 3, 1, "#8a6242"); px(x, 11, 0, 3, 1, "#8a6242");
    return c;
  }
  function genFenceV() {
    const [c, x] = mk(16, 16);
    px(x, 6, 0, 4, 16, "#a07848");
    px(x, 6, 2, 4, 2, "#c9a06c"); px(x, 6, 10, 4, 2, "#c9a06c");
    px(x, 6, 0, 4, 1, "#8a6242");
    return c;
  }

  // bell stand (shourou) 18 x 30
  function genBellStand() {
    const [c, x] = mk(18, 30);
    px(x, 2, 4, 2, 26, "#8a6242"); px(x, 14, 4, 2, 26, "#8a6242");
    px(x, 2, 28, 14, 2, "#7a5438");
    for (let ry = 0; ry < 6; ry++) {
      const w2 = 3 + ry;
      px(x, 9 - w2, ry, w2 * 2, 1, ry % 3 === 2 ? "#4a5a8c" : "#556090");
    }
    px(x, 2, 6, 14, 2, "#556090");
    // bell
    ell(x, 8, 14, 4, 4, "#c9a830");
    px(x, 5, 16, 8, 1, "#a08020");
    px(x, 8, 10, 1, 4, "#8a6a20");
    // rope
    px(x, 8, 18, 1, 6, "#d94a4a");
    px(x, 7, 24, 3, 2, "#e86a6a");
    return c;
  }

  // offering box 18 x 12
  function genOfferBox() {
    const [c, x] = mk(18, 12);
    px(x, 0, 2, 18, 8, "#8a6242");
    px(x, 0, 2, 18, 2, "#9a7250");
    px(x, 4, 5, 10, 3, "#2b2233");
    px(x, 2, 10, 14, 2, "#6a4a32");
    return c;
  }

  // train cars
  function genTrainCar(kind) {
    const W = 60, H = 30;
    const [c, x] = mk(W, H);
    const body = "#e8e4d8", stripe = "#4a9a5a";
    px(x, 0, 6, W, 16, body);
    px(x, 0, 16, W, 4, stripe);
    px(x, 0, 6, W, 1, "#c8c4b8"); px(x, 0, 20, W, 2, "#b0aa9a");
    // roof
    px(x, 0, 4, W, 2, "#c8c4b8");
    if (kind === "engine") {
      // slanted nose
      px(x, W - 8, 8, 8, 14, body);
      px(x, W - 6, 20, 6, 4, stripe);
      px(x, W - 8, 8, 8, 1, "#c8c4b8");
      // headlights + cute face
      px(x, W - 4, 12, 3, 3, "#fff6c0");
      pxl(x, W - 6, 15, "#2b2233"); pxl(x, W - 3, 15, "#2b2233");
      px(x, W - 6, 17, 4, 1, "#2b2233");
      // pantograph
      px(x, 10, 0, 1, 4, "#3a3a46"); px(x, 6, 1, 10, 1, "#3a3a46");
    }
    // windows
    for (let i = 0; i < 4; i++) {
      const wx = 5 + i * 13;
      if (kind === "engine" && i > 2) break;
      px(x, wx, 9, 9, 6, "#a8d8e8");
      px(x, wx, 9, 9, 1, "#fff");
    }
    // doors
    px(x, 0, 8, 4, 12, "#d8d4c8");
    // wheels
    for (const wx of [8, 22, 36, 50]) {
      px(x, wx, 22, 6, 5, "#3a3a46");
      px(x, wx + 2, 23, 2, 2, "#8a8a96");
    }
    return c;
  }

  // onsen rock pool 84 x 52 (water interior animated by game)
  function genOnsen() {
    const [c, x] = mk(84, 52);
    // rock ring
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const rx = 40, ry = 22;
      const cxp = 42 + Math.cos(ang) * rx, cyp = 24 + Math.sin(ang) * ry;
      ell(x, cxp, cyp, 4 + ((a * 7) % 3), 3 + ((a * 5) % 3), a % 3 === 0 ? "#8a8a94" : "#9a9aa4");
    }
    // water
    ell(x, 42, 24, 36, 19, "#7cc0d8");
    ell(x, 42, 23, 30, 14, "#8fd0e4");
    // yuzu (winter handled by game overlay)
    return c;
  }

  // noren curtain hut for onsen changing room (reuses genHouse small)
  function genNoren() {
    const [c, x] = mk(20, 18);
    px(x, 0, 0, 20, 3, "#4a5a8c");
    px(x, 1, 3, 9, 12, "#4a7ac0");
    px(x, 10, 3, 9, 12, "#4a7ac0");
    pxl(x, 4, 7, "#fff"); pxl(x, 14, 7, "#fff");
    return c;
  }

  // bus stop sign
  function genBusStop() {
    const [c, x] = mk(14, 30);
    px(x, 6, 6, 2, 24, "#8a8a96");
    px(x, 1, 0, 12, 10, "#4a7ac0");
    px(x, 2, 1, 10, 8, "#e8f0f8");
    px(x, 4, 3, 6, 4, "#4a7ac0"); // little bus icon
    px(x, 5, 4, 4, 2, "#fff");
    pxl(x, 5, 7, "#2b2233"); pxl(x, 8, 7, "#2b2233");
    return c;
  }

  // rice stages (16 x 20) drawn over paddy water
  function genRice(stage) {
    const [c, x] = mk(16, 20);
    const g = ["#7ec850", "#66b04a", "#4a9a42", "#d9b94a"][stage];
    const g2 = ["#9ad868", "#7ec850", "#66b04a", "#e8cc6a"][stage];
    if (stage === 0) { // sprouts
      for (const sx of [3, 7, 11]) { px(x, sx, 16, 1, 3, g); }
      return c;
    }
    const h2 = [0, 6, 9, 11][stage];
    for (const sx of [2, 6, 10, 14]) {
      px(x, sx, 19 - h2, 1, h2, g);
      pxl(x, sx - 1, 19 - h2 + 1, g);
      pxl(x, sx + 1, 19 - h2 + 2, g);
      if (stage >= 2) { pxl(x, sx - 1, 18 - h2, g2); }
      if (stage === 3) { // golden heads
        px(x, sx - 1, 17 - h2, 3, 3, "#e8cc6a");
        pxl(x, sx, 16 - h2, "#f4dd8a");
      }
    }
    return c;
  }

  // generic crop: stage 0-3, colors given
  function genCrop(kind, stage) {
    const [c, x] = mk(16, 16);
    const leaf = "#5aa84a", leafD = "#468a3a";
    if (stage === 0) { px(x, 7, 12, 2, 2, leaf); pxl(x, 6, 13, leafD); return c; }
    if (stage === 1) {
      px(x, 7, 8, 2, 7, leaf);
      px(x, 4, 10, 3, 1, leaf); px(x, 9, 11, 3, 1, leaf);
      pxl(x, 6, 8, leafD);
      return c;
    }
    if (kind === "daikon") {
      px(x, 7, 6, 2, 9, leaf);
      px(x, 3, 7, 4, 2, leaf); px(x, 9, 6, 4, 2, leaf); px(x, 4, 11, 3, 2, leaf);
      if (stage === 3) { // white root peeking
        px(x, 6, 13, 4, 3, "#f4f0e0"); px(x, 7, 15, 2, 1, "#e0dccc");
        px(x, 6, 13, 4, 1, "#c9e88a");
      }
    } else if (kind === "eggplant") {
      px(x, 6, 4, 4, 11, leafD);
      px(x, 2, 6, 4, 2, leaf); px(x, 10, 5, 4, 2, leaf); px(x, 3, 10, 3, 2, leaf);
      px(x, 9, 10, 3, 2, leaf);
      if (stage === 3) {
        ell(x, 5, 13, 2, 3, "#7a4a9a"); px(x, 5, 10, 1, 2, "#5aa04a");
        ell(x, 11, 12, 2, 2, "#8a5aac"); px(x, 11, 10, 1, 1, "#5aa04a");
      }
    } else if (kind === "cucumber") {
      px(x, 7, 3, 2, 12, leafD);
      px(x, 3, 5, 4, 1, leaf); px(x, 9, 7, 4, 1, leaf); px(x, 3, 10, 4, 1, leaf); px(x, 9, 12, 3, 1, leaf);
      if (stage === 3) {
        ell(x, 4, 8, 1, 3, "#5aa858"); ell(x, 12, 10, 1, 3, "#6cb868");
        pxl(x, 4, 6, "#e8f0a8"); pxl(x, 12, 8, "#e8f0a8");
      }
    } else if (kind === "strawberry") {
      px(x, 7, 5, 2, 10, leafD);
      px(x, 3, 7, 4, 2, leaf); px(x, 9, 8, 4, 2, leaf);
      px(x, 4, 12, 3, 2, leaf); px(x, 9, 12, 3, 2, leaf);
      if (stage === 3) {
        // little flowers -> berries
        ell(x, 5, 12, 2, 2, "#e04a5a"); pxl(x, 5, 11, "#5aa04a");
        ell(x, 11, 13, 2, 2, "#e04a5a"); pxl(x, 11, 12, "#5aa04a");
        pxl(x, 5, 13, "#ffd9e0"); pxl(x, 11, 14, "#ffd9e0");
      }
    } else { // rice-ish default
      return genRice(Math.min(3, stage));
    }
    return c;
  }

  // =========================================================================
  //  INIT — build everything into SPR
  // =========================================================================
  function init() {
    const seasons = ["spring", "summer", "autumn", "winter"];

    // grass sets
    SPR.grass = {};
    for (const s of seasons) {
      const p = GROUNDPAL[s];
      SPR.grass[s] = [
        grassTile(p, 11, false), grassTile(p, 22, false), grassTile(p, 33, false),
        grassTile(p, 44, true),
      ];
    }
    SPR.water = { frames: [waterFrame(0), waterFrame(1), waterFrame(2)] };
    SPR.paddy = { frames: [paddyFrame(0), paddyFrame(1)] };
    SPR.path = [pathTile(1), pathTile(2)];
    SPR.stone = [stoneTile(1), stoneTile(2)];
    SPR.sand = [sandTile(1), sandTile(2)];
    SPR.soilDry = soilTile(false);
    SPR.soilWet = soilTile(true);
    SPR.plank = plankTile();
    SPR.rail = railTile();

    // trees per season
    SPR.tree = {};
    for (const s of seasons) {
      SPR.tree[s] = (s === "winter") ? genTree(null, 5, true) : genTree(LEAFPAL[s], 5, false);
    }
    SPR.pine = { normal: genPine(false), snowy: genPine(true) };
    SPR.bambooTree = genBamboo();
    SPR.sacredTree = genTree({ D: "#e07aa8", M: "#ff9cc0", L: "#ffd7e6", dot: "#fff0f6" }, 9, false);
    SPR.bush = {};
    for (const s of seasons) {
      SPR.bush[s] = genBush(LEAFPAL[s] || { D: "#8a8a96", M: "#9a9aa4", L: "#c8c8d4" });
    }
    SPR.bush.winter = genBush({ D: "#8a8a96", M: "#9a9aa4", L: "#c8c8d4" });
    SPR.tallgrass = {};
    for (const s of seasons) SPR.tallgrass[s] = genTallGrass(s);

    SPR.flowers = {
      spring: [genFlower("#ff9ecb", "#ffd7e6"), genFlower("#c9a8ff", "#e8dcff"), genFlower("#fff1a8", "#fff8d0")],
      summer: [genFlower("#ffd94a", "#fff1a8"), genFlower("#ff8a5a", "#ffc9a8")],
      autumn: [genFlower("#e07a4a", "#f4b86a"), genFlower("#d94a6a", "#ff9ecb")],
      winter: [genFlower("#ffffff", "#e8f2f8")],
    };
    SPR.rock = [genRock(1, 14, 10), genRock(2, 10, 8), genRock(3, 18, 12)];
    SPR.mushroom = genMushroom();
    SPR.bambooShoot = genBambooShoot();
    SPR.herb = genHerb();

    // structures
    SPR.housePlayer = genHouse(5, { roof: "#556090" });
    SPR.houseSmall = genHouse(4, { roof: "#7a8a5a" });
    SPR.houseYuki = genHouse(4, { roof: "#c07888" });
    SPR.shop = genHouse(6, { roof: "#b05050", sign: true });
    SPR.station = genHouse(4, { roof: "#4a7a9a", noChimney: true });
    SPR.shrine = genShrine();
    SPR.torii = genTorii();
    SPR.lanternStone = genLantern();
    SPR.well = genWell();
    SPR.vending = genVending();
    SPR.mailbox = genMailbox();
    SPR.bench = genBench();
    SPR.sign = genSign();
    SPR.lamp = genLamp();
    SPR.scarecrow = genScarecrow();
    SPR.fenceH = genFenceH();
    SPR.fenceV = genFenceV();
    SPR.bellStand = genBellStand();
    SPR.offerBox = genOfferBox();
    SPR.trainEngine = genTrainCar("engine");
    SPR.trainCar = genTrainCar("car");
    SPR.onsen = genOnsen();
    SPR.noren = genNoren();
    SPR.busStop = genBusStop();

    SPR.rice = [genRice(0), genRice(1), genRice(2), genRice(3)];
    SPR.crops = {};
    for (const k of ["daikon", "eggplant", "cucumber", "strawberry"]) {
      SPR.crops[k] = [genCrop(k, 0), genCrop(k, 1), genCrop(k, 2), genCrop(k, 3)];
    }
  }

  return { init, build, buildFrames, flip, mk, px, pxl, ell, shade, rng };
})();

/* =========================================================================
   world.js — tile map + procedural generation of the village
   ========================================================================= */
"use strict";

const World = (() => {
  const TILE = 16, W = 120, H = 90;

  // ground ids
  const G = { GRASS: 0, PATH: 1, STONE: 2, SAND: 3, WATER: 4, PADDY: 5, PLANK: 6, RAIL: 7 };

  const ground = new Uint8Array(W * H);
  const variant = new Uint8Array(W * H);
  const solid = new Uint8Array(W * H);

  const statics = [];      // {kind, tx, ty, dx, dy, lightR, lightCol, v}
  const interactables = []; // {x,y,w,h,type,data}
  const waterTiles = [];
  const paddyTiles = [];

  const named = {};        // named tile anchors
  const forageZones = [];  // {x,y,w,h,items:[{id,season?,weight}]}

  let R = null; // seeded rng
  function srand(seed) {
    let a = seed >>> 0;
    R = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const idx = (x, y) => y * W + x;
  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  function setG(x, y, g) { if (inB(x, y)) ground[idx(x, y)] = g; }
  function getG(x, y) { return inB(x, y) ? ground[idx(x, y)] : G.WATER; }
  function rectG(x, y, w, h, g) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (g !== G.PLANK && getG(xx, yy) === G.WATER) continue; // never pave over the river
      setG(xx, yy, g);
    }
  }
  function setSolid(x, y, s = 1) { if (inB(x, y)) solid[idx(x, y)] = s; }
  function isSolid(tx, ty) { return inB(tx, ty) ? solid[idx(tx, ty)] : 1; }

  function addStatic(kind, tx, ty, opts = {}) {
    const s = { kind, tx, ty, dx: opts.dx || 0, dy: opts.dy || 0, v: opts.v || 0,
      lightR: opts.lightR || 0, lightCol: opts.lightCol || "255,220,140", sway: opts.sway || false };
    statics.push(s);
    if (opts.solid) {
      for (const [sx, sy, sw, sh] of opts.solid) {
        for (let yy = sy; yy < sy + sh; yy++) for (let xx = sx; xx < sx + sw; xx++) setSolid(tx + xx, ty + yy);
      }
    }
    return s;
  }
  function addInteract(type, x, y, data = {}, w = 1, h = 1) {
    interactables.push({ type, x, y, w, h, data });
  }

  // -------------------------------------------------------------------
  function riverY(x) { return 56 + Math.sin(x * 0.06) * 3 + Math.sin(x * 0.021) * 5; }

  function gen() {
    srand(20260822);
    ground.fill(G.GRASS); solid.fill(0); variant.fill(0);
    statics.length = 0; interactables.length = 0; waterTiles.length = 0; paddyTiles.length = 0;

    // grass variant noise
    for (let i = 0; i < W * H; i++) variant[i] = (R() * 4) | 0;

    // ---- river ----
    for (let x = 0; x < W; x++) {
      const yc = riverY(x);
      const y0 = Math.round(yc - 2.4), y1 = Math.round(yc + 2.4);
      for (let y = y0; y <= y1; y++) setG(x, y, G.WATER);
      const ys0 = Math.round(yc - 3.4), ys1 = Math.round(yc + 3.4);
      if (getG(x, ys0) === G.GRASS) setG(x, ys0, G.SAND);
      if (getG(x, ys1) === G.GRASS) setG(x, ys1, G.SAND);
      if (getG(x, ys0 + 1) === G.GRASS) setG(x, ys0 + 1, G.SAND);
      if (getG(x, ys1 - 1) === G.GRASS) setG(x, ys1 - 1, G.SAND);
    }

    // ---- pond in bamboo grove ----
    for (let y = 69; y <= 75; y++) for (let x = 13; x <= 21; x++) {
      const dx = (x - 17) / 4.4, dy = (y - 72) / 3.2;
      if (dx * dx + dy * dy <= 1) setG(x, y, G.WATER);
    }

    // ---- water/paddy tile lists + solidity ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const g = ground[idx(x, y)];
      if (g === G.WATER) { waterTiles.push(idx(x, y)); setSolid(x, y); }
    }

    // ---- bridges ----
    function bridge(bx) {
      const yc = riverY(bx + 1);
      const y0 = Math.round(yc - 3.4), y1 = Math.round(yc + 3.4);
      for (let x = bx; x < bx + 3; x++) for (let y = y0; y <= y1; y++) {
        setG(x, y, G.PLANK); setSolid(x, y, 0);
      }
      // rail posts
      for (let x = bx; x < bx + 3; x += 2) {
        addStatic("post", x, y0, { dx: 8, dy: 0 });
        addStatic("post", x, y1, { dx: 8, dy: 2 });
      }
    }
    bridge(40); bridge(84);

    // ---- rails + fence (north strip) ----
    rectG(2, 5, 116, 1, G.RAIL);
    for (let x = 2; x <= 117; x++) {
      const gate = (x >= 60 && x <= 61) || (x >= 94 && x <= 96);
      if (!gate && x % 3 === 0) addStatic("fenceV", x, 6, { solid: [[0, 0, 1, 1]] });
    }
    // crossing posts
    addStatic("lamp", 59, 7, { lightR: 40, lightCol: "255,90,90" });
    addStatic("lamp", 93, 7, { lightR: 40, lightCol: "255,90,90" });

    // ---- village street ----
    rectG(8, 20, 105, 2, G.PATH);
    // roads out
    rectG(40, 22, 2, 36, G.PATH);           // to south bridge/farm
    rectG(40, 58, 2, 8, G.PATH); rectG(40, 66, 2, 13, G.PATH);
    rectG(84, 22, 2, 32, G.PATH);           // to onsen bridge
    rectG(84, 54, 2, 9, G.PATH); rectG(84, 63, 2, 8, G.PATH);
    rectG(60, 8, 2, 12, G.PATH);            // to station
    rectG(94, 8, 2, 12, G.PATH);            // to shrine
    rectG(12, 17, 2, 3, G.PATH);            // bus stop
    rectG(42, 78, 10, 2, G.PATH);           // farm road link
    rectG(8, 78, 34, 2, G.PATH);            // grove road
    rectG(86, 69, 15, 2, G.PATH);           // onsen road
    // plaza
    rectG(44, 22, 13, 6, G.STONE);

    // ---- station platform ----
    rectG(56, 7, 12, 3, G.STONE);
    addStatic("house", 57, 8, { v: "station", solid: [[-2, -3, 5, 4]], lightR: 70, dy: 6 });
    addStatic("bench", 64, 10, {});
    addStatic("sign", 66, 10, {});
    addInteract("sign", 66, 11, { text: "—if the train passes at dawn,\nsomeone far away is loved.\n(Inaka Line timetable: it comes when it feels like it)" }, 1, 2);

    // ---- houses ----
    addStatic("house", 30, 18, { v: "player", solid: [[-2, -4, 5, 5]], lightR: 80, dy: 4 });
    addInteract("door", 30, 19, { home: "player", name: "Your House" });
    addStatic("mailbox", 33, 19, {});
    addInteract("mailbox", 33, 20, {});

    addStatic("house", 46, 17, { v: "yuki", solid: [[-2, -3, 4, 4]], lightR: 70, dy: 4 });
    addInteract("door", 46, 18, { home: "yuki", name: "Yuki's House" });

    addStatic("house", 57, 17, { v: "shop", solid: [[-3, -4, 6, 5]], lightR: 90, dy: 4 });
    addInteract("shop", 55, 18, { name: "Granny's Shop" }, 5, 1);
    addStatic("sign", 53, 18, {});
    addInteract("sign", 53, 19, { text: "GRANNY'S GREEN GROCERY\nfresh veggies · seeds · snacks\n(open 9:00 – 18:00)" }, 1, 2);

    addStatic("house", 76, 17, { v: "small", solid: [[-2, -3, 4, 4]], lightR: 70, dy: 4 });
    addInteract("door", 76, 18, { home: "grandpa", name: "Grandpa's House" });

    // chicken pen (east of shop)
    for (let x = 61; x <= 66; x++) addStatic("fenceH", x, 14, { solid: [[0, 0, 1, 1]] });
    for (let y = 15; y <= 18; y++) {
      addStatic("fenceV", 61, y, { solid: [[0, 0, 1, 1]] });
      addStatic("fenceV", 66, y, { solid: [[0, 0, 1, 1]] });
    }
    for (let x = 62; x <= 65; x++) if (x !== 63) addStatic("fenceH", x, 18, { solid: [[0, 0, 1, 1]] });
    named.pen = [63.5, 16];

    // street trees + lamps
    for (const [tx, ty] of [[36, 18], [64, 18], [80, 18], [88, 18], [24, 18], [104, 18]]) {
      addStatic("tree", tx, ty, { solid: [[0, 0, 1, 1]], sway: true });
    }
    for (const tx of [20, 50, 68, 90, 110]) addStatic("lamp", tx, 19, { lightR: 60, dy: 2 });

    // vending machine + bus stop
    addStatic("vending", 70, 19, { lightR: 55, lightCol: "255,230,170", solid: [[0, -1, 1, 2]] });
    addInteract("vending", 70, 20, {});
    addStatic("busStop", 12, 18, {});
    addStatic("bench", 15, 18, {});
    addInteract("sign", 12, 19, { text: "BUS STOP\nRoute: over the mountain, past the sea,\nto the city. (No bus has come in years.\nMaybe today?)" }, 1, 2);

    // plaza props
    addStatic("well", 50, 25, { solid: [[-1, -1, 3, 2]] });
    addInteract("well", 49, 26, {}, 3, 2);
    addStatic("bench", 46, 26, {});
    addStatic("bench", 54, 26, {});
    addStatic("lanternStone", 44, 23, { lightR: 50 });
    addStatic("lanternStone", 56, 23, { lightR: 50 });
    addStatic("sign", 48, 19, {});
    addInteract("sign", 48, 19, { text: "VILLAGE PLAZA\nnorth: station · northeast: shrine\nsouth: fields, river, hot spring" }, 1, 2);

    // ---- shrine ----
    rectG(93, 8, 4, 12, G.STONE);
    addStatic("shrine", 95, 6, { solid: [[-3, -3, 7, 4]] });
    addStatic("torii", 95, 15, { solid: [[-1, -2, 1, 3], [1, -2, 1, 3]] });
    addStatic("lanternStone", 92, 8, { lightR: 50 });
    addStatic("lanternStone", 99, 8, { lightR: 50 });
    addStatic("bellStand", 92, 10, { solid: [[0, -1, 1, 2]] });
    addInteract("bell", 92, 11, {});
    addStatic("offerBox", 96, 10, { solid: [[0, 0, 1, 1]] });
    addInteract("offer", 96, 11, {});
    addStatic("treeBig", 90, 8, { solid: [[0, 0, 1, 1]], lightR: 30, lightCol: "255,200,220" });
    addStatic("treeBig", 101, 9, { solid: [[0, 0, 1, 1]], lightR: 30, lightCol: "255,200,220" });
    addStatic("sign", 93, 18, {});
    addInteract("sign", 93, 19, { text: "MOUNTAIN SHRINE\nring the bell, make a wish.\n(blessing hours 4:30–7:00:\n+25% sell prices all day!)" }, 1, 2);

    // ---- farm plot ----
    for (let x = 44; x <= 58; x++) {
      if (x < 50 || x > 51) addStatic("fenceH", x, 66, { solid: [[0, 0, 1, 1]] });
    }
    for (let x = 44; x <= 58; x++) addStatic("fenceH", x, 77, { solid: [[0, 0, 1, 1]] });
    for (let y = 67; y <= 76; y++) {
      addStatic("fenceV", 44, y, { solid: [[0, 0, 1, 1]] });
      addStatic("fenceV", 58, y, { solid: [[0, 0, 1, 1]] });
    }
    addStatic("scarecrow", 46, 69, { solid: [[0, -1, 1, 2]] });
    addStatic("sign", 50, 78, {});
    addInteract("sign", 50, 79, { text: "YOUR FIELD\nhoe the grass (tool 2), plant seeds (4),\nwater them every day (3). Rain helps!\nReady crops sparkle ✨" }, 2, 2);
    named.farm = { x: 44, y: 66, w: 15, h: 12 };

    // ---- granny's rice paddies ----
    const paddies = [[18, 68, 9, 5], [29, 68, 9, 5], [18, 75, 20, 5]];
    for (const [px, py, pw, ph] of paddies) {
      for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) {
        setG(x, y, G.PADDY); setSolid(x, y);
        paddyTiles.push(idx(x, y));
      }
      // little earth banks
      for (let x = px - 1; x <= px + pw; x++) { if (getG(x, py - 1) === G.GRASS) setG(x, py - 1, G.PATH); }
    }
    addStatic("sign", 24, 66, {});
    addInteract("sign", 24, 67, { text: "GRANNY'S PADDOES\nplease don't trample the rice!\n(it fills with fireflies on summer nights)" }, 1, 2);

    // ---- bamboo grove ----
    for (let y = 64; y <= 88; y += 2) for (let x = 6; x <= 26; x += 2) {
      const dx = (x - 17) / 4.4, dy = (y - 72) / 3.2;
      if (dx * dx + dy * dy <= 1.4) continue; // keep pond clear
      if (getG(x, y) !== G.GRASS) continue;
      if (R() < 0.55) addStatic("bamboo", x + ((R() * 0.6) | 0), y, { solid: [[0, 0, 1, 1]], dx: (R() * 6) | 0 });
    }

    // ---- onsen ----
    addStatic("onsen", 101, 74, { dx: 0, dy: 4 });
    // solid water interior (ellipse)
    for (let y = 70; y <= 77; y++) for (let x = 96; x <= 107; x++) {
      const dx = (x - 101.5) / 4.4, dy = (y - 73.5) / 2.4;
      if (dx * dx + dy * dy <= 1) setSolid(x, y);
    }
    addStatic("noren", 97, 70, { solid: [[0, -1, 1, 2]] });
    addStatic("bench", 95, 72, {});
    addStatic("rockBig", 107, 71, { solid: [[0, 0, 1, 1]] });
    addStatic("rockBig", 95, 76, { solid: [[0, 0, 1, 1]] });
    addStatic("sign", 92, 70, {});
    addInteract("sign", 92, 71, { text: "HOT SPRING — free!\nsink in, forget the city,\nlet your bones go soft." }, 1, 2);
    addInteract("onsen", 98, 75, {}, 8, 2);

    // ---- sakura grove (south bank picnic spot) ----
    for (const [tx, ty] of [[66, 66], [72, 67], [79, 65], [69, 70], [76, 71]]) {
      addStatic("tree", tx, ty, { solid: [[0, 0, 1, 1]], sway: true });
    }
    addStatic("bench", 73, 68, {});

    // ---- meadow trees & pines ----
    const treeSpots = [
      [10, 26], [16, 32], [28, 30], [12, 42], [30, 40], [8, 52], [22, 50], [34, 46],
      [50, 40], [64, 34], [72, 42], [60, 48], [80, 38], [88, 28], [96, 32], [104, 40],
      [110, 30], [100, 50], [90, 44], [112, 46], [46, 50], [56, 56], [30, 60], [50, 62],
      [62, 58], [74, 54], [92, 54], [108, 60], [116, 40], [70, 60], [86, 62], [40, 54],
    ];
    for (const [tx, ty] of treeSpots) {
      if (getG(tx, ty) !== G.GRASS) continue;
      addStatic(R() < 0.3 ? "pine" : "tree", tx, ty, { solid: [[0, 0, 1, 1]], sway: true });
    }
    // south meadow pines
    for (let i = 0; i < 14; i++) {
      const tx = 30 + ((R() * 84) | 0), ty = 80 + ((R() * 6) | 0);
      if (getG(tx, ty) !== G.GRASS) continue;
      addStatic("pine", tx, ty, { solid: [[0, 0, 1, 1]] });
    }

    // ---- border forest ----
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < 4; y++) {
        if (x >= 2 && x <= 117 && y === 3 && R() < 0.5) continue;
        if (y <= 1 && R() < 0.35) continue;
        if (getG(x, y) !== G.GRASS && getG(x, y) !== G.RAIL) { setSolid(x, y); continue; }
        addStatic(R() < 0.5 ? "pine" : "tree", x, y, { solid: [[0, 0, 1, 1]], dense: true });
      }
    }
    for (let y = 4; y < H; y++) {
      for (const x of [0, 1, 2]) {
        if (getG(x, y) === G.WATER) { continue; }
        if (getG(x, y) !== G.GRASS) { setSolid(x, y); continue; }
        addStatic(R() < 0.5 ? "pine" : "tree", x, y, { solid: [[0, 0, 1, 1]], dense: true });
      }
      for (const x of [117, 118, 119]) {
        if (getG(x, y) === G.WATER) { continue; }
        if (getG(x, y) !== G.GRASS) { setSolid(x, y); continue; }
        addStatic(R() < 0.5 ? "pine" : "tree", x, y, { solid: [[0, 0, 1, 1]], dense: true });
      }
    }
    for (let x = 0; x < W; x++) {
      for (let y = 87; y < H; y++) {
        if (getG(x, y) !== G.GRASS) { setSolid(x, y); continue; }
        addStatic(R() < 0.6 ? "pine" : "tree", x, y, { solid: [[0, 0, 1, 1]], dense: true });
      }
    }
    // also 4th row south
    for (let x = 0; x < W; x++) {
      const y = 86;
      if (getG(x, y) === G.GRASS && R() < 0.55) addStatic("tree", x, y, { solid: [[0, 0, 1, 1]], dense: true });
    }

    // ---- scattered decor ----
    for (let i = 0; i < 90; i++) {
      const tx = 6 + ((R() * 108) | 0), ty = 22 + ((R() * 60) | 0);
      if (getG(tx, ty) !== G.GRASS || isSolid(tx, ty)) continue;
      const r = R();
      if (r < 0.35) addStatic("bush", tx, ty, {});
      else if (r < 0.55) addStatic("tallgrass", tx, ty, {});
      else if (r < 0.75) addStatic("flower", tx, ty, {});
      else addStatic("rock", tx, ty, { v: (R() * 3) | 0 });
    }
    // keep door tiles + fronts clear
    clearStaticsNear(30, 19, 2); clearStaticsNear(46, 18, 2); clearStaticsNear(57, 18, 3);
    clearStaticsNear(76, 18, 2); clearStaticsNear(70, 20, 2); clearStaticsNear(12, 19, 2);

    // ---- forage zones ----
    forageZones.push({ x: 6, y: 64, w: 20, h: 24, items: [{ id: "mushroom", weight: 5 }, { id: "bamboo", weight: 2, season: "spring" }] });
    forageZones.push({ x: 6, y: 22, w: 30, h: 30, items: [{ id: "herb", weight: 3 }, { id: "mushroom", weight: 1 }] });
    forageZones.push({ x: 88, y: 22, w: 28, h: 36, items: [{ id: "herb", weight: 3 }, { id: "flower", weight: 2 }] });
    forageZones.push({ x: 60, y: 40, w: 30, h: 20, items: [{ id: "herb", weight: 2 }, { id: "flower", weight: 2 }] });

    named.playerSpawn = [30.5, 19.5];
    named.grannyShop = [57, 16.2];
    named.grannyHome = [57, 18.5];
    named.grandpaShrine = [95, 12];
    named.grandpaFish = [30, 57.5];
    named.grandpaHome = [76, 18.5];
    named.yukiPlaza = [50, 24];
    named.yukiGrove = [73, 67];
    named.yukiHome = [46, 18.5];
    named.shibaHome = [58, 24];

    // rebuild water/paddy lists (bridges may have replaced)
    waterTiles.length = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (ground[idx(x, y)] === G.WATER) waterTiles.push(idx(x, y));
    }
  }

  function clearStaticsNear(tx, ty, r) {
    for (let i = statics.length - 1; i >= 0; i--) {
      const s = statics[i];
      if (["bush", "tallgrass", "flower", "rock"].includes(s.kind) &&
        Math.abs(s.tx - tx) <= r && Math.abs(s.ty - ty) <= r) statics.splice(i, 1);
    }
  }

  // px-based solidity (player AABB)
  function solidAtPx(px2, py2) {
    const tx = Math.floor(px2 / TILE), ty = Math.floor(py2 / TILE);
    return isSolid(tx, ty);
  }

  const SEASONS = ["spring", "summer", "autumn", "winter"];
  const seasonOf = (day) => SEASONS[Math.floor(((day - 1) % 28) / 7)];

  return {
    TILE, W, H, G,
    get ground() { return ground; }, get variant() { return variant; },
    get solid() { return solid; },
    get statics() { return statics; }, get interactables() { return interactables; },
    get waterTiles() { return waterTiles; }, get paddyTiles() { return paddyTiles; },
    get forageZones() { return forageZones; },
    named, riverY, gen, isSolid, solidAtPx, getG, setG, idx, inB,
    seasonOf, SEASONS,
  };
})();

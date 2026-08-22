/* =========================================================================
   entities.js — player, NPCs, animals, critters, particles + game data
   ========================================================================= */
"use strict";

// ---------------------------------------------------------------- items
const Items = {
  rice_seed: { name: "Rice Seeds", type: "seed", price: 60, crop: "rice" },
  daikon_seed: { name: "Daikon Seeds", type: "seed", price: 70, crop: "daikon" },
  eggplant_seed: { name: "Eggplant Seeds", type: "seed", price: 80, crop: "eggplant" },
  cucumber_seed: { name: "Cucumber Seeds", type: "seed", price: 65, crop: "cucumber" },
  strawberry_seed: { name: "Strawberry Seeds", type: "seed", price: 120, crop: "strawberry" },

  rice: { name: "Rice", sell: 90, food: 8 },
  daikon: { name: "Daikon", sell: 70, food: 6 },
  eggplant: { name: "Eggplant", sell: 80, food: 8 },
  cucumber: { name: "Cucumber", sell: 65, food: 6 },
  strawberry: { name: "Strawberry", sell: 110, food: 10 },
  mushroom: { name: "Mushroom", sell: 45, food: 4 },
  bamboo: { name: "Bamboo Shoot", sell: 55, food: 5 },
  herb: { name: "Mountain Herb", sell: 30 },
  flower: { name: "Wildflower", sell: 25 },
  egg: { name: "Egg", sell: 60, food: 6 },

  onigiri: { name: "Onigiri", price: 100, sell: 40, food: 30 },
  ramune: { name: "Ramune", price: 120, sell: 45, food: 15 },
  coffee: { name: "Canned Coffee", price: 150, sell: 60, food: 20 },
  taiyaki: { name: "Taiyaki", price: 200, sell: 90, food: 35 },

  yamame: { name: "Yamame Trout", sell: 120 },
  carp: { name: "Crucian Carp", sell: 90 },
  koi: { name: "Koi", sell: 200 },
  catfish: { name: "Catfish", sell: 180 },
  eel: { name: "Eel", sell: 250 },
  can: { name: "Empty Can", sell: 2 },

  butterfly: { name: "Butterfly", sell: 60 },
  cicada: { name: "Cicada", sell: 70 },
  firefly: { name: "Firefly", sell: 90 },
  cricket: { name: "Bell Cricket", sell: 50 },
  beetle: { name: "Rhinoceros Beetle", sell: 250 },

  marble: { name: "Glass Marble", sell: 20 },
  sticker: { name: "Star Sticker", sell: 35 },
  keychain: { name: "Dango Keychain", sell: 80 },
  charm: { name: "Golden Cat Charm", sell: 1000 },
  pebble: { name: "Shiny Pebble", sell: 500 },
};

const CROPS = {
  rice: { days: 6, regrow: 3, seasons: ["spring", "summer", "autumn"] },
  daikon: { days: 4, seasons: ["spring", "autumn"] },
  eggplant: { days: 5, regrow: 3, seasons: ["spring", "summer"] },
  cucumber: { days: 4, regrow: 2, seasons: ["spring", "summer"] },
  strawberry: { days: 5, regrow: 3, seasons: ["autumn"] },
};

const TOOLS = ["hand", "hoe", "can", "seed", "net", "rod"];
const TOOL_NAMES = { hand: "Hands", hoe: "Hoe", can: "Watering Can", seed: "Seeds", net: "Bug Net", rod: "Fishing Rod" };

// ---------------------------------------------------------------- quests
const QUESTS = [
  { id: "wildflowers", from: "mail", giver: "granny", type: "deliver", item: "flower", n: 3, title: "Wildflowers for Granny", desc: "Pick 3 Wildflowers — they sparkle in the meadows around the village. Bring them to Granny at the shop.", reward: { coins: 250, hearts: { granny: 2 } }, minDay: 1 },
  { id: "herb_tea", from: "mail", giver: "grandpa", type: "deliver", item: "herb", n: 3, title: "Mountain Herb Tea", desc: "Bring Grandpa 3 Mountain Herbs for his tea.", reward: { coins: 300, hearts: { grandpa: 2 } }, minDay: 1 },
  { id: "fresh_catch", from: "mail", giver: "grandpa", type: "deliver", item: "yamame", n: 2, title: "Fresh Catch", desc: "Bring Grandpa 2 Yamame Trout.", reward: { coins: 400, hearts: { grandpa: 2 } }, minDay: 1 },
  { id: "rice_delivery", from: "mail", giver: "granny", type: "deliver", item: "rice", n: 5, title: "Rice for Granny", desc: "Deliver 5 Rice to Granny.", reward: { coins: 450, hearts: { granny: 2 } }, minDay: 4 },
  { id: "yuki_bugs", from: "mail", giver: "yuki", type: "deliver", item: "butterfly", n: 3, title: "Yuki's Bug Book", desc: "Bring Yuki 3 Butterflies for her bug book.", reward: { coins: 350, hearts: { yuki: 2 }, items: { ramune: 2 } }, minDay: 1 },
  { id: "veggie_run", from: "mail", giver: "granny", type: "deliver", item: "daikon", n: 4, title: "Daikon Soup Night", desc: "Granny needs 4 Daikon for soup night.", reward: { coins: 380, hearts: { granny: 2 }, items: { onigiri: 2 } }, minDay: 2 },
  { id: "firefly_night", from: "mail", giver: "yuki", type: "deliver", item: "firefly", n: 5, title: "Summer Night Lanterns", desc: "Catch 5 Fireflies on a summer night by the river or the bamboo pond.", reward: { coins: 500, hearts: { yuki: 2 } }, season: "summer", minDay: 1 },
  { id: "mushroom_hunt", from: "mail", giver: "granny", type: "deliver", item: "mushroom", n: 4, title: "Autumn Mushroom Rice", desc: "Find 4 Mushrooms in the bamboo grove (south-west) for Granny.", reward: { coins: 360, hearts: { granny: 2 } }, season: "autumn", minDay: 1 },
  { id: "eel_quest", from: "mail", giver: "grandpa", type: "deliver", item: "eel", n: 1, title: "The One That Got Away", desc: "Grandpa has chased one Eel his whole life. Fish the river on a summer night...", reward: { coins: 900, hearts: { grandpa: 3 } }, minDay: 6 },
];

// ---------------------------------------------------------------- NPC dialogue data
const NPC_DATA = {
  granny: {
    name: "Granny", color: "#a04a5a",
    likes: { rice: 2, eggplant: 2, strawberry: 2, daikon: 1, egg: 1, mushroom: 1, onigiri: 1 },
    lines: [
      "Ohoyo~* You look thin. Have you been eating?\nHere, take this. (She always says that.)",
      "The rice paddies drink the sky, you know.\nThat's why they shine.",
      "In my day I carried two baskets up the shrine steps.\nBoth full. Uphill. In snow.",
      "Pet the cats for me, dear. They listen to you\nyoung folks better.",
    ],
    lines_hi: [
      "You work that field like my late husband.\nHe'd have liked you.",
      "Come for dinner any time. I always cook\ntoo much anyway.",
    ],
    shopClosed: "Shop's closed, dear. Come back after 9:00.",
  },
  grandpa: {
    name: "Grandpa", color: "#5a6a4a",
    likes: { yamame: 2, eel: 2, carp: 1, catfish: 1, coffee: 2, herb: 1, koi: 1 },
    lines: [
      "Mm. The river's quiet today.\nQuiet's good for thinking.",
      "I've fished this river for sixty years.\nIt still surprises me.",
      "Sweep the shrine steps in the morning and\nyour head gets swept too. Try it.",
      "The night eel... one day. ONE day.",
    ],
    lines_hi: [
      "You've got river-patience, kid.\nNot many do.",
      "Sit. Breathe. The mountains aren't going anywhere.\nNeither are we.",
    ],
  },
  yuki: {
    name: "Yuki", color: "#c04a6a",
    likes: { butterfly: 2, beetle: 2, cicada: 1, firefly: 2, cricket: 1, ramune: 2, taiyaki: 2, flower: 1, strawberry: 1 },
    lines: [
      "Did you see the shiba?! His tail goes\nround and round when he's happy!!",
      "I'm making a bug encyclopedia.\nI'm on page 2. It's a drawing of me.",
      "When the fireworks come, everyone wears\nyukata. I have one with goldfish on it!",
      "Grandpa says if you ring the shrine bell\nreally hard, your wish echoes. I tested it.",
    ],
    lines_hi: [
      "You're my most best friend in the whole\nvillage. And the shiba. Sorry. Tied.",
      "Let's catch fireflies forever and ever\nand eat ramune until our teeth freeze.",
    ],
  },
};

// ---------------------------------------------------------------- entities
const Entities = (() => {
  const T = () => World.TILE;
  const px2 = (t) => t * World.TILE;

  const player = {
    x: 0, y: 0, dir: "down", moving: false, animT: 0,
    speed: 72, energy: 100, maxEnergy: 100,
    tool: "hand", seedType: "rice_seed",
    canCharges: 8, canMax: 8,
    coins: 500,
    inventory: {},
    fishing: null, // {phase, t, spot:{x,y}, fish}
    soaking: 0, exhausted: false,
    hasGoldRod: false, hasBigCan: false,
    stats: defaultStats(),
  };

  function defaultStats() {
    return { fish: {}, bugs: {}, crops: {}, gifts: 0, earned: 0, naps: 0 };
  }

  const npcs = [];
  const animals = [];
  const critters = [];
  const particles = [];
  const forage = []; // {id, x, y}
  const eggs = [];

  const hearts = { granny: 0, grandpa: 0, yuki: 0 };
  const dailyFlags = { talked: {}, petted: {}, prayed: false, collectedPaddy: false };

  function makeNPC(id) {
    const home = World.named[id + "Home"];
    return {
      id, x: px2(home[0]), y: px2(home[1]), dir: "down", animT: 0,
      moving: false, path: [], pathIx: 0, act: "idle", actT: 0, visible: true,
    };
  }

  function reset() {
    npcs.length = 0; animals.length = 0; critters.length = 0; particles.length = 0;
    forage.length = 0; eggs.length = 0;
    npcs.push(makeNPC("granny"), makeNPC("grandpa"), makeNPC("yuki"));
    hearts.granny = 0; hearts.grandpa = 0; hearts.yuki = 0;
    dailyFlags.talked = {}; dailyFlags.petted = {}; dailyFlags.prayed = false; dailyFlags.collectedPaddy = false;

    // shiba
    const sh = World.named.shibaHome;
    animals.push({ kind: "shiba", name: "Mame", x: px2(sh[0]), y: px2(sh[1]), dir: "left", animT: 0,
      state: "wander", t: 0, tx: 0, ty: 0, homeX: px2(sh[0]), homeY: px2(sh[1]), radius: 6, speed: 30 });
    // cats
    const catSpots = [[33, 21, "cream"], [47, 25, "brown"], [44, 63, "gray"]];
    for (const [cx, cy, col] of catSpots) {
      animals.push({ kind: "cat", name: "Cat", col, x: px2(cx), y: px2(cy), dir: "down", animT: 0,
        state: "sleep", t: 3 + Math.random() * 4, tx: 0, ty: 0, homeX: px2(cx), homeY: px2(cy), radius: 3, speed: 18 });
    }
    // chickens
    for (let i = 0; i < 3; i++) {
      animals.push({ kind: "chicken", x: px2(62 + i), y: px2(15.5 + (i % 2)), dir: "down", animT: Math.random() * 9,
        state: "wander", t: Math.random() * 3, tx: 0, ty: 0, pen: { x: px2(62), y: px2(15), w: px2(4.4), h: px2(2.6) }, speed: 12 });
    }
    // capybara (onsen)
    animals.push({ kind: "capybara", name: "Capy-san", x: px2(101.5), y: px2(73.2), dir: "left", animT: 0, state: "soak", t: 0 });
  }

  // ---------- schedules (minutes) ----------
  function schedFor(id, min) {
    const n = World.named;
    const pick = (arr) => { let cur = arr[0]; for (const e of arr) if (min >= e[0]) cur = e; return cur; };
    if (id === "granny") return pick([
      { t: 0, pts: [], hidden: true, home: true },
      { t: 360, pts: [[57, 19]], act: "stand" },
      { t: 540, pts: [[57, 16.4]], act: "shop" },
      { t: 1080, pts: [[50, 23]], act: "chat" },
      { t: 1260, pts: [], hidden: true, home: true },
    ]);
    if (id === "grandpa") return pick([
      { t: 0, pts: [], hidden: true, home: true },
      { t: 360, pts: [[76, 18], [88, 20], [95, 19], [95, 12]], act: "sweep" },
      { t: 600, pts: [[95, 18], [42, 20], [41, 50], [34, 56], [30, 58]], act: "fish" },
      { t: 960, pts: [[30, 58], [34, 56], [41, 50], [41, 20], [76, 19]], act: "stand" },
      { t: 1200, pts: [], hidden: true, home: true },
    ]);
    if (id === "yuki") return pick([
      { t: 0, pts: [], hidden: true, home: true },
      { t: 480, pts: [[46, 19], [50, 24]], act: "play" },
      { t: 720, pts: [[48, 20], [41, 22], [41, 64], [70, 64], [73, 67]], act: "play" },
      { t: 960, pts: [[73, 67], [70, 64], [41, 64], [41, 22], [50, 24]], act: "play" },
      { t: 1140, pts: [[50, 24], [46, 19]], act: "stand" },
      { t: 1200, pts: [], hidden: true, home: true },
    ]);
    return null;
  }

  function moveAlongPath(e, dt, speed) {
    if (e.pathIx >= e.path.length) { e.moving = false; return true; }
    const [ttx, tty] = e.path[e.pathIx];
    const gx = px2(ttx) + 8, gy = px2(tty) + 8;
    const dx = gx - e.x, dy = gy - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) { e.pathIx++; return e.pathIx >= e.path.length; }
    const vx = (dx / d) * speed * dt, vy = (dy / d) * speed * dt;
    e.x += vx; e.y += vy;
    e.moving = true;
    if (Math.abs(dx) > Math.abs(dy)) e.dir = dx > 0 ? "right" : "left";
    else e.dir = dy > 0 ? "down" : "up";
    return false;
  }

  function updateNPCs(dt, min, freeze) {
    for (const n of npcs) {
      if (freeze && freeze.includes(n.id)) { n.moving = false; continue; }
      const s = schedFor(n.id, min);
      const before = n.curSchedT !== s.t;
      n.curSchedT = s.t;
      if (s.hidden) { n.visible = false; n.moving = false; continue; }
      const wasHidden = !n.visible;
      n.visible = true;
      if (before) {
        n.path = s.pts.map(p => [p[0], p[1]]);
        n.pathIx = 0;
        // snap to first point ONLY when emerging from home (avoids teleports mid-village)
        if (wasHidden && n.path.length) { n.x = px2(n.path[0][0]) + 8; n.y = px2(n.path[0][1]) + 8; n.pathIx = 1; if (n.pathIx >= n.path.length) n.pathIx = n.path.length - 1; }
      }
      const done = moveAlongPath(n, dt, 34);
      n.act = done ? s.act : "walk";
      if (n.moving) n.animT += dt;
      // face player when near & idle
      if (done) {
        const dx = player.x - n.x, dy = player.y - n.y;
        if (Math.hypot(dx, dy) < 60) {
          n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        }
      }
    }
  }

  function updateAnimals(dt, st) {
    const min = st.minutes;
    for (const a of animals) {
      a.animT += dt; a.t -= dt;
      if (a.kind === "capybara") continue;
      if (a.kind === "shiba") {
        if (a.t <= 0) {
          a.t = 2 + Math.random() * 4;
          a.state = Math.random() < 0.6 ? "wander" : "sit";
          if (a.state === "wander") {
            a.tx = a.homeX + (Math.random() - 0.5) * a.radius * 32;
            a.ty = a.homeY + (Math.random() - 0.5) * a.radius * 32;
          }
        }
        if (a.state === "wander") {
          const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
          if (d > 3) {
            a.x += (dx / d) * a.speed * dt; a.y += (dy / d) * a.speed * dt;
            a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
            a.moving = true;
          } else a.moving = false;
        } else a.moving = false;
      } else if (a.kind === "cat") {
        if (a.t <= 0) {
          const night = st.hour >= 20 || st.hour < 5;
          a.state = Math.random() < (night ? 0.4 : 0.5) ? "sleep" : "wander";
          a.t = a.state === "sleep" ? 6 + Math.random() * 8 : 2 + Math.random() * 3;
          if (a.state === "wander") {
            a.tx = a.homeX + (Math.random() - 0.5) * a.radius * 32;
            a.ty = a.homeY + (Math.random() - 0.5) * a.radius * 32;
          }
        }
        if (a.state === "wander") {
          const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
          if (d > 3) {
            a.x += (dx / d) * a.speed * dt; a.y += (dy / d) * a.speed * dt;
            a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
            a.moving = true;
          } else a.moving = false;
        } else a.moving = false;
      } else if (a.kind === "chicken") {
        if (a.t <= 0) {
          a.t = 1.5 + Math.random() * 3;
          if (Math.random() < 0.5) { a.state = "wander"; a.tx = a.pen.x + Math.random() * a.pen.w; a.ty = a.pen.y + Math.random() * a.pen.h; }
          else a.state = "idle";
          if (Math.random() < 0.2 && Math.hypot(a.x - player.x, a.y - player.y) < 140) AudioSys.sfx.cluck();
        }
        if (a.state === "wander") {
          const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
          if (d > 2) {
            a.x += (dx / d) * a.speed * dt; a.y += (dy / d) * a.speed * dt;
            a.dir = dx > 0 ? "right" : "left"; a.moving = true;
          } else a.moving = false;
        } else a.moving = false;
      }
    }
    // tanuki: night visitors
    const night = min >= 1260 || min < 240;
    const wantTanuki = night ? 1 : 0;
    const tk = animals.filter(a => a.kind === "tanuki");
    if (tk.length < wantTanuki && Math.random() < dt * 0.05) {
      const spots = [[70, 21], [57, 22], [30, 21]];
      const sp = spots[(Math.random() * spots.length) | 0];
      animals.push({ kind: "tanuki", x: px2(sp[0]), y: px2(sp[1]), dir: "left", animT: 0,
        state: "wander", t: 2, tx: px2(sp[0]), ty: px2(sp[1]), speed: 60, frozen: 0 });
    }
    if (!night) for (let i = animals.length - 1; i >= 0; i--) if (animals[i].kind === "tanuki") animals.splice(i, 1);
    for (let i = animals.length - 1; i >= 0; i--) {
      const a = animals[i];
      if (a.kind !== "tanuki") continue;
      if (a.coolT > 0) a.coolT -= dt;
      const d = Math.hypot(a.x - player.x, a.y - player.y);
      if (d < 56 && !(a.frozenT > 0) && !(a.coolT > 0)) { a.frozenT = 3; } // freeze!
      if (a.frozenT > 0) {
        a.frozenT -= dt;
        a.moving = false;
        a.dir = player.x > a.x ? "right" : "left";
        if (a.frozenT <= 0) { a.coolT = 4; } // thaw — needs a moment before it can freeze again
        else if (d < 30) { // too close! scamper
          a.frozenT = 0;
          a.coolT = 4;
          a.state = "flee";
          const ang = Math.atan2(a.y - player.y, a.x - player.x);
          a.tx = a.x + Math.cos(ang) * 200; a.ty = a.y + Math.sin(ang) * 200;
        }
      } else if (a.state === "flee") {
        const dx = a.tx - a.x, dy = a.ty - a.y, d2 = Math.hypot(dx, dy);
        if (d2 < 4) { animals.splice(i, 1); continue; }
        a.x += (dx / d2) * a.speed * dt; a.y += (dy / d2) * a.speed * dt;
        a.dir = dx > 0 ? "right" : "left"; a.moving = true;
      } else {
        if (a.t <= 0) {
          a.t = 2 + Math.random() * 3;
          a.tx = a.x + (Math.random() - 0.5) * 80; a.ty = a.y + (Math.random() - 0.5) * 60;
        }
        const dx = a.tx - a.x, dy = a.ty - a.y, d2 = Math.hypot(dx, dy);
        if (d2 > 3) { a.x += (dx / d2) * 24 * dt; a.y += (dy / d2) * 24 * dt; a.dir = dx > 0 ? "right" : "left"; a.moving = true; }
        else a.moving = false;
      }
    }
  }

  // ---------- critters ----------
  function spawnCritters(st) {
    // st: {minutes, hour, season, weather, night}
    critters.length = 0;
    const night = st.hour >= 19 || st.hour < 5;
    if (st.weather === "rain" || st.weather === "snow") return;

    // butterflies (day, not winter)
    if (!night && st.season !== "winter") {
      const n = st.season === "spring" ? 10 : 7;
      for (let i = 0; i < n; i++) {
        const zones = [[44, 20, 14, 8], [8, 24, 28, 24], [60, 58, 22, 8], [88, 24, 26, 30]];
        const z = zones[(Math.random() * zones.length) | 0];
        critters.push({ type: "butterfly", x: px2(z[0] + Math.random() * z[2]), y: px2(z[1] + Math.random() * z[3]),
          phase: Math.random() * 10, home: 0, vx: 0, vy: 0 });
      }
    }
    // cicadas (summer day, on trees)
    if (!night && st.season === "summer") {
      const trees = World.statics.filter(s => (s.kind === "tree" || s.kind === "pine") && !s.dense);
      for (let i = 0; i < 8 && trees.length; i++) {
        const t = trees[(Math.random() * trees.length) | 0];
        critters.push({ type: "cicada", x: px2(t.tx) + 4 + Math.random() * 8, y: px2(t.ty) - 14 - Math.random() * 10, phase: 0 });
      }
    }
    // fireflies (summer night)
    if (night && st.season === "summer") {
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * World.W, ry = World.riverY(x);
        const spots = Math.random();
        let fx, fy;
        if (spots < 0.5) { fx = px2(x); fy = px2(ry - 4 - Math.random() * 3); }
        else if (spots < 0.75) { fx = px2(15 + Math.random() * 8); fy = px2(68 + Math.random() * 8); }
        else { fx = px2(18 + Math.random() * 20); fy = px2(68 + Math.random() * 12); }
        critters.push({ type: "firefly", x: fx, y: fy, phase: Math.random() * 10, drift: Math.random() * 10 });
      }
    }
    // crickets (autumn night)
    if (night && st.season === "autumn") {
      for (let i = 0; i < 10; i++) {
        critters.push({ type: "cricket", x: px2(8 + Math.random() * 100), y: px2(24 + Math.random() * 56), phase: Math.random() * 10 });
      }
    }
    // beetle (summer day, bamboo grove)
    if (!night && st.season === "summer") {
      for (let i = 0; i < 2; i++) {
        critters.push({ type: "beetle", x: px2(8 + Math.random() * 16), y: px2(66 + Math.random() * 18), phase: 0 });
      }
    }
  }

  function updateCritters(dt, st) {
    for (const c of critters) {
      c.phase += dt;
      if (c.type === "butterfly") {
        c.x += Math.cos(c.phase * 1.7) * 22 * dt;
        c.y += Math.sin(c.phase * 2.3) * 14 * dt - 4 * dt;
        if (c.y < px2(16)) c.y += 30 * dt;
      } else if (c.type === "firefly") {
        c.x += Math.cos(c.phase * 0.7 + c.drift) * 10 * dt;
        c.y += Math.sin(c.phase * 0.5 + c.drift * 2) * 7 * dt;
      } else if (c.type === "cricket") {
        if (Math.sin(c.phase * 0.4) > 0.97) c.y -= 8 * dt; else c.y = Math.round(c.y);
      }
    }
  }

  // ---------- particles ----------
  function addParticle(type, x, y, opts = {}) {
    if (particles.length > 420) particles.shift();
    particles.push({ type, x, y, vx: opts.vx || 0, vy: opts.vy || 0, life: 0, maxLife: opts.maxLife || 2, size: opts.size || 2, col: opts.col });
  }
  function burst(type, x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (opts.speed || 20) * (0.5 + Math.random());
      addParticle(type, x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.up || 10), maxLife: opts.maxLife || 0.8, col: opts.col, size: opts.size || 2 });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
      if (p.type === "petal" || p.type === "leaf") {
        p.x += (p.vx + Math.sin(p.life * 2.2) * 12) * dt;
        p.y += (14 + Math.cos(p.life * 1.8) * 6) * dt;
      } else if (p.type === "snow") {
        p.x += (p.vx + Math.sin(p.life * 1.4) * 6) * dt;
        p.y += (12 + p.vy) * dt;
      } else if (p.type === "rain") {
        p.x += p.vx * dt; p.y += 220 * dt;
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.type === "heart" || p.type === "sparkle" || p.type === "steam" || p.type === "smoke" || p.type === "zzz") ? -14 * dt : 0;
      }
    }
  }

  // ---------- forage & eggs ----------
  function spawnMorning(season) {
    forage.length = 0; eggs.length = 0;
    for (const z of World.forageZones) {
      let placed = 0, tries = 0;
      while (placed < 4 && tries < 60) {
        tries++;
        const tx = z.x + ((Math.random() * z.w) | 0), ty = z.y + ((Math.random() * z.h) | 0);
        if (World.getG(tx, ty) !== World.G.GRASS || World.isSolid(tx, ty)) continue;
        const pool = z.items.filter(it => !it.season || it.season === season);
        if (!pool.length) break;
        let tw = 0; for (const it of pool) tw += it.weight;
        let r = Math.random() * tw;
        let chosen = pool[0];
        for (const it of pool) { r -= it.weight; if (r <= 0) { chosen = it; break; } }
        forage.push({ id: chosen.id, x: px2(tx) + 4, y: px2(ty) + 4 });
        placed++;
      }
    }
    // eggs in pen
    const n = 2 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n; i++) eggs.push({ x: px2(62 + Math.random() * 3.6), y: px2(15.3 + Math.random() * 2.2) });
  }

  // ---------- inventory ----------
  function addItem(id, n = 1) { player.inventory[id] = (player.inventory[id] || 0) + n; }
  function removeItem(id, n = 1) {
    if (!player.inventory[id]) return false;
    player.inventory[id] -= n;
    if (player.inventory[id] <= 0) delete player.inventory[id];
    return true;
  }
  function countItem(id) { return player.inventory[id] || 0; }

  // ---------- serialization ----------
  function serialize() {
    return {
      p: { x: player.x, y: player.y, dir: player.dir, energy: player.energy, tool: player.tool, seedType: player.seedType,
        canCharges: player.canCharges, coins: player.coins, inv: player.inventory,
        hasGoldRod: player.hasGoldRod, hasBigCan: player.hasBigCan,
        maxEnergy: player.maxEnergy, stats: player.stats },
      hearts: { ...hearts },
    };
  }
  function load(d) {
    const p = d.p;
    player.x = p.x; player.y = p.y; player.dir = p.dir || "down";
    player.energy = p.energy; player.tool = p.tool || "hand";
    player.seedType = p.seedType || "rice_seed";
    player.canCharges = p.canCharges ?? 8;
    player.canMax = p.hasBigCan ? 16 : 8;
    player.coins = p.coins;
    player.inventory = p.inv || {};
    player.hasGoldRod = !!p.hasGoldRod; player.hasBigCan = !!p.hasBigCan;
    player.maxEnergy = p.maxEnergy || 100;
    const st = Object.assign(defaultStats(), p.stats || {});
    st.fish = st.fish || {}; st.bugs = st.bugs || {}; st.crops = st.crops || {};
    player.stats = st;
    Object.assign(hearts, d.hearts || {});
  }

  return {
    player, npcs, animals, critters, particles, forage, eggs, hearts, dailyFlags,
    reset, updateNPCs, updateAnimals, updateCritters, updateParticles,
    spawnCritters, spawnMorning, addParticle, burst,
    addItem, removeItem, countItem, serialize, load,
  };
})();

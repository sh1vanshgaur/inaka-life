/* =========================================================================
   game.js — main loop, rendering, systems, UI
   ========================================================================= */
"use strict";

const Game = (() => {
  const TILE = World.TILE;
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const lightCv = document.createElement("canvas");
  const lctx = lightCv.getContext("2d");

  // ---------------- state ----------------
  const S = {
    mode: "title", // title | play | dialog | panel | soak
    day: 1, minutes: 360, weather: "clear", luck: false,
    quest: null, questDone: [], mailReady: false, mailSeenDay: 0,
    festivalToday: null, fwTimer: 0, rainbow: false,
    cam: { x: 0, y: 0 }, scale: 3,
    animT: 0, saveTimer: 0, envTimer: 0,
    titleCamT: 0, hint: "", firedFwNpcs: false,
    train: { active: false, x: 0, times: [], nextIx: 0, horned: false },
    // cozy patch additions
    year: 1, tutStep: 0, tutDone: false,
    met: {}, napUsed: false, sleeping: false, festMsgDone: "",
    warnLate: false, warnMidnight: false, warnedLow: false,
    hintTarget: null, minimapOn: true, mmBase: null,
    mailboxSt: null, locCur: "", spaceRep: 0, hoeTipShown: false,
    vg: null, rg: null,
  };
  // drifting cloud shadows (clear days)
  const CLOUDS = Array.from({ length: 4 }, (_, i) => ({
    x: Math.random() * 120 * TILE, y: (10 + i * 19) * TILE,
    r: 80 + i * 26, sp: 5 + Math.random() * 4,
  }));
  const farm = new Map(); // "x,y" -> {t:1, w:0, c:{k,s,d}}

  const $ = (id) => document.getElementById(id);
  const fmt2 = (n) => (n < 10 ? "0" + n : "" + n);
  const cap1 = (s) => s[0].toUpperCase() + s.slice(1);
  const SEASON_JP = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" };
  const SEASON_EMOJI = { spring: "🌸", summer: "🌻", autumn: "🍁", winter: "❄️" };

  // ---------------- tutorial ----------------
  const TUTS = [
    { id: "move",    txt: "Walk with WASD or the arrow keys" },
    { id: "interact",txt: "Press <b>E</b> to talk · pet · pick things up" },
    { id: "mail",    txt: "Check your mailbox — the red box by your door" },
    { id: "till",    txt: "Hoe soil in your field south of the river (<b>2</b>)" },
    { id: "plant",   txt: "Plant seeds on tilled soil (<b>4</b>, switch with <b>Q</b>)" },
    { id: "water",   txt: "Water them daily (<b>3</b>) · refill at the well or river" },
    { id: "sleep",   txt: "Sleep! Enter your house after 18:00" },
  ];
  function tutSync() {
    const el = $("hud-tut");
    if (S.mode === "title") { el.classList.add("hidden"); return; }
    if (S.tutDone) return; // completion message hides itself
    el.classList.remove("hidden", "done");
    const t = TUTS[S.tutStep];
    if (!t) { el.classList.add("hidden"); return; }
    el.innerHTML = `<div class="qtitle">✿ FIRST STEPS ${S.tutStep + 1}/${TUTS.length}</div>${t.txt}`;
  }
  function tutAdvance(id) {
    if (S.tutDone) return;
    if (TUTS[S.tutStep] && TUTS[S.tutStep].id !== id) return;
    S.tutStep++;
    AudioSys.sfx.pop();
    if (S.tutStep >= TUTS.length) {
      S.tutDone = true;
      Entities.player.coins += 300;
      AudioSys.sfx.fanfare();
      const el = $("hud-tut");
      el.classList.add("done");
      el.innerHTML = `<div class="qtitle">✿ ALL SET!</div>You're a real villager now. Granny sent ¥300 for your hard work ♥`;
      setTimeout(() => { el.classList.add("hidden"); }, 5200);
      toast("Tutorial complete! +¥300", { cls: "good", icon: "coin" });
      saveGame();
      return;
    }
    toast(`✿ ${TUTS[S.tutStep].txt.replace(/<[^>]+>/g, "")}`, { cls: "gold" });
    tutSync();
  }

  // ---------------- location banner ----------------
  const LOCS = [
    { r: [26, 12, 38, 22], en: "Home", jp: "家" },
    { r: [53, 5, 70, 13], en: "Inaka Station", jp: "駅" },
    { r: [88, 4, 106, 18], en: "Mountain Shrine", jp: "神社" },
    { r: [91, 67, 111, 81], en: "Hot Spring", jp: "温泉" },
    { r: [42, 64, 60, 79], en: "Your Field", jp: "畑" },
    { r: [16, 65, 39, 82], en: "Granny's Paddies", jp: "田んぼ" },
    { r: [43, 21, 58, 29], en: "Village Plaza", jp: "広場" },
    { r: [62, 61, 83, 75], en: "Sakura Grove", jp: "桜並木" },
    { r: [5, 62, 28, 89], en: "Bamboo Grove", jp: "竹林" },
  ];
  function updateLocation() {
    const p = Entities.player;
    const tx = p.x / TILE, ty = p.y / TILE;
    let cur = "";
    for (const L of LOCS) {
      if (tx >= L.r[0] && tx <= L.r[2] && ty >= L.r[1] && ty <= L.r[3]) { cur = L.en; break; }
    }
    if (cur && cur !== S.locCur && S.mode === "play") showBanner(cur, LOCS.find(l => l.en === cur).jp);
    S.locCur = cur;
  }
  function showBanner(en, jp) {
    const b = $("loc-banner");
    $("lb-en").textContent = en;
    $("lb-jp").textContent = jp || "";
    b.classList.remove("show");
    void b.offsetWidth; // restart animation
    b.classList.add("show");
  }

  // ---------------- save flash ----------------
  let lastFlash = 0;
  function saveFlash() {
    const now = performance.now();
    if (now - lastFlash < 4000) return;
    lastFlash = now;
    const c = $("save-chip");
    c.classList.remove("hidden");
    c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
    setTimeout(() => c.classList.add("hidden"), 1700);
  }

  // ---------------- sizing ----------------
  function resize() {
    S.scale = Math.max(2, Math.min(5, Math.round(window.innerHeight / 300)));
    cv.width = Math.ceil(window.innerWidth / S.scale);
    cv.height = Math.ceil(window.innerHeight / S.scale);
    lightCv.width = Math.ceil(cv.width / 2);
    lightCv.height = Math.ceil(cv.height / 2);
    ctx.imageSmoothingEnabled = false;
    buildOverlays();
  }
  window.addEventListener("resize", resize);

  // cached full-screen gradients (vignette + low-energy pulse)
  function buildOverlays() {
    const w = cv.width, h = cv.height;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.hypot(w, h) / 1.9);
    g.addColorStop(0, "rgba(16,10,30,0)");
    g.addColorStop(1, "rgba(16,10,30,0.26)");
    S.vg = g;
    const rg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.hypot(w, h) / 1.9);
    rg.addColorStop(0, "rgba(255,40,70,0)");
    rg.addColorStop(1, "rgba(255,40,70,1)");
    S.rg = rg;
  }

  // ---------------- helpers ----------------
  const season = () => World.seasonOf(S.day);
  const hour = () => Math.floor(S.minutes / 60) % 24;
  const isNight = () => S.minutes >= 1170 || S.minutes < 330; // 19:30 - 5:30
  const lightsOn = () => S.minutes >= 1095 || S.minutes < 390; // 18:15 - 6:30
  const tkey = (x, y) => x + "," + y;

  function toast(msg, opts = {}) {
    const el = document.createElement("div");
    el.className = "toast " + (opts.cls || "");
    el.innerHTML = (opts.icon ? `<img src="${Sprites.itemIcon(opts.icon)}">` : "") + `<span>${msg}</span>`;
    $("toasts").appendChild(el);
    setTimeout(() => el.remove(), 3900);
  }
  function popup(name, icon) {
    const p = $("popup");
    p.innerHTML = (icon ? `<img src="${Sprites.itemIcon(icon)}">` : "") + `<span>${name}</span>`;
    p.classList.remove("hidden");
    // restart animation
    p.style.animation = "none"; void p.offsetWidth; p.style.animation = "";
    clearTimeout(p._t);
    p._t = setTimeout(() => p.classList.add("hidden"), 1800);
  }

  function addItem(id, n = 1, silent = false) {
    Entities.player.inventory[id] = (Entities.player.inventory[id] || 0) + n;
    if (!silent) { popup(`+${n} ${Items[id].name}`, id); AudioSys.sfx.pop(); }
    // keep the quest card live when collecting quest items
    if (S.quest && id === S.quest.def.item) questSync();
  }

  // ---------------- input ----------------
  const keys = {};
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Tab"].includes(e.key)) e.preventDefault();
    if (e.repeat) return;
    keys[e.key.toLowerCase()] = true;
    AudioSys.init();
    onKey(e.key.toLowerCase());
  });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

  function onKey(k) {
    if (k === "m") { const m = AudioSys.toggleMute(); $("hud-mute").classList.toggle("off", m); return; }
    if (S.mode === "title") { if (k === "enter") { S.hasSave ? startContinue() : startNew(); } return; }
    if (S.mode === "dialog") {
      if (k >= "1" && k <= "3") Dialog.pick(+k - 1);
      else if (k === "e" || k === " " || k === "enter" || k === "escape") Dialog.advance();
      return;
    }
    if (S.mode === "panel") {
      if (k === "escape" || k === "i") Panel.close();
      else if (k === "j" && $("panel-title").textContent.startsWith("📖")) Panel.close();
      else if (k === "h") { Panel.close(); openHelp(); }
      else if (k === "tab") toggleMinimap();
      return;
    }
    if (S.mode !== "play") return;
    const p = Entities.player;
    if (k === "e" || k === "enter") interact();
    else if (k === " ") { useTool(); S.spaceRep = 0.35; } // arm repeat-guard so a tap doesn't double-fire
    else if (k >= "1" && k <= "6") { p.tool = TOOLS[+k - 1]; AudioSys.sfx.blip(); hotbarSync(); }
    else if (k === "q") cycleSeed();
    else if (k === "i") openInventory();
    else if (k === "j") openJournal();
    else if (k === "h") openHelp();
    else if (k === "tab") toggleMinimap();
    else if (k === "escape") { if (p.fishing) p.fishing = null; }
  }

  function toggleMinimap() {
    S.minimapOn = !S.minimapOn;
    $("minimap-wrap").classList.toggle("hidden", !S.minimapOn);
    AudioSys.sfx.blip();
  }

  function cycleSeed() {
    const p = Entities.player;
    const order = ["rice_seed", "daikon_seed", "eggplant_seed", "cucumber_seed", "strawberry_seed"];
    const ix = order.indexOf(p.seedType);
    p.seedType = order[(ix + 1) % order.length];
    AudioSys.sfx.blip();
    hotbarSync();
    toast(`${Items[p.seedType].name}`, { icon: p.seedType });
  }

  // ---------------- facing / targets ----------------
  const DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
  function frontPoint(dist = 14) {
    const p = Entities.player;
    const [dx, dy] = DIRV[p.dir] || [0, 1];
    return { x: p.x + dx * dist, y: p.y + dy * dist + 4 };
  }
  function frontTile(dist = 14) {
    const f = frontPoint(dist);
    return { x: Math.floor(f.x / TILE), y: Math.floor(f.y / TILE) };
  }

  function nearestNPC() {
    let best = null, bd = 30;
    for (const n of Entities.npcs) {
      if (!n.visible) continue;
      const d = Math.hypot(n.x - Entities.player.x, n.y - Entities.player.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  function nearestAnimal() {
    let best = null, bd = 26;
    for (const a of Entities.animals) {
      if (a.kind === "capybara") continue;
      const d = Math.hypot(a.x - Entities.player.x, a.y - Entities.player.y);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }
  function interactableAt() {
    const p = Entities.player;
    const ft = frontTile();
    const my = { x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) };
    for (const it of World.interactables) {
      for (const t of [ft, my]) {
        if (t.x >= it.x && t.x < it.x + (it.w || 1) && t.y >= it.y && t.y < it.y + (it.h || 1)) return it;
      }
    }
    return null;
  }
  function cropAt(t) { return farm.get(tkey(t.x, t.y)); }
  function forageNear() {
    const f = frontPoint(12);
    let best = null, bd = 12;
    for (const fo of Entities.forage) {
      const d = Math.hypot(fo.x - f.x, fo.y - f.y);
      if (d < bd) { bd = d; best = fo; }
    }
    if (!best) {
      for (const e of Entities.eggs) {
        const d = Math.hypot(e.x - f.x, e.y - f.y);
        if (d < bd) { bd = d; best = e; }
      }
    }
    return best;
  }

  // ---------------- interactions ----------------
  function interact() {
    const p = Entities.player;
    tutAdvance("interact");

    // fishing bite
    if (p.fishing) {
      if (p.fishing.phase === "bite") { reelFish(); }
      else if (p.fishing.phase === "wait") { toast("Not yet... wait for the !"); }
      return;
    }

    // NPCs
    const npc = nearestNPC();
    if (npc) { talkTo(npc.id); return; }

    // capybara
    const cap = Entities.animals.find(a => a.kind === "capybara");
    if (cap && Math.hypot(cap.x - p.x, cap.y - p.y) < 40) { talkCapy(); return; }

    // animals (pet)
    const an = nearestAnimal();
    if (an) { petAnimal(an); return; }

    // forage / eggs
    const fo = forageNear();
    if (fo) {
      const isEgg = Entities.eggs.includes(fo);
      if (isEgg) Entities.eggs.splice(Entities.eggs.indexOf(fo), 1);
      else Entities.forage.splice(Entities.forage.indexOf(fo), 1);
      addItem(fo.id, 1);
      Entities.burst("sparkle", fo.x, fo.y, 5, { up: 20, col: "#fff6a8" });
      return;
    }

    // crops
    const ft = frontTile();
    const c = cropAt(ft);
    if (c && c.c && c.c.s >= 3) { harvest(ft, c); return; }

    // granny's autumn paddies
    if (World.getG(ft.x, ft.y) === World.G.PADDY && season() === "autumn" && !Entities.dailyFlags.collectedPaddy) {
      Entities.dailyFlags.collectedPaddy = true;
      addItem("rice", 3);
      toast("Granny: \"Take as much as you can carry, dear!\"", { cls: "good" });
      addHearts("granny", 1, true);
      return;
    }

    // interactables
    const it = interactableAt();
    if (!it) return;
    switch (it.type) {
      case "sign": Dialog.open({ name: "Signpost", text: it.data.text }); AudioSys.sfx.blip(); break;
      case "door": tryDoor(it.data); break;
      case "shop": tryShop(); break;
      case "vending": openVending(); break;
      case "mailbox": openMailbox(); break;
      case "bell": ringBell(); break;
      case "offer": makeOffer(); break;
      case "well": fillCan(); break;
      case "onsen": soak(); break;
    }
  }

  function petAnimal(a) {
    const key = a.kind + (a.name || "") + a.homeX;
    const p = Entities.player;
    if (a.kind === "shiba") { AudioSys.sfx.woof(); toast("Mame: \"Wan!\" *(tail helicopter)*"); }
    else if (a.kind === "cat") { AudioSys.sfx.purr(); toast("Nyaa~ ♥ *(happy rumbles)*"); }
    else if (a.kind === "tanuki") { AudioSys.sfx.pop(); toast("*The tanuki is pretending to be a statue.*", { cls: "good" }); }
    for (let i = 0; i < 3; i++) Entities.addParticle("heart", a.x + (Math.random() - 0.5) * 10, a.y - 12, { vx: (Math.random() - 0.5) * 8, maxLife: 1 });
    if (a.kind === "cat") { a.state = "sleep"; a.t = 4; }
    if (!Entities.dailyFlags.petted[key]) {
      Entities.dailyFlags.petted[key] = true;
      p.energy = Math.min(p.maxEnergy, p.energy + 2);
    }
  }

  function talkCapy() {
    Entities.hearts.capy = (Entities.hearts.capy || 0) + 1;
    AudioSys.sfx.kyu();
    const lines = [
      "Capy-san sits in the steam, eyes closed.\n\"Kyu.\"",
      "A yuzu bobbes by. Capy-san ignores it\nwith great discipline.",
      "Capy-san's ears twitch. This is\napparently news.",
    ];
    if (Entities.hearts.capy === 3) {
      Dialog.open({ name: "Capy-san", portrait: null, text: "Capy-san blinks slowly at you... then gently pushes a\nSHINY PEBBLE across the water with his nose.\n\n\"Kyu.\"" });
      addItem("pebble", 1);
    } else {
      Dialog.open({ name: "Capy-san", text: lines[(Math.random() * lines.length) | 0] });
    }
  }

  function tryDoor(data) {
    if (data.home === "player") {
      const canSleep = S.minutes >= 1080 || S.minutes < 360;
      if (canSleep) {
        Dialog.open({
          name: data.name, text: "Your futon looks very fluffy.\nSleep until morning?",
          choices: [
            { label: "Sleep ♥", fn: () => { Dialog.close(); doSleep(false); } },
            { label: "Not yet", fn: () => Dialog.close() },
          ],
        });
      } else if (!S.napUsed && S.minutes < 1080) {
        Dialog.open({
          name: data.name, text: "It's too early to sleep...\nBut a little nap wouldn't hurt?",
          choices: [
            { label: "Nap (+35 energy · 3h)", fn: () => { Dialog.close(); doNap(); } },
            { label: "Not yet", fn: () => Dialog.close() },
          ],
        });
      } else {
        Dialog.open({ name: data.name, text: "It's too early to sleep.\n(The cicadas agree.)" });
      }
    } else {
      AudioSys.sfx.doorKnock();
      const who = data.home === "granny" ? "granny" : data.home === "yuki" ? "yuki" : "grandpa";
      const inside = !Entities.npcs.find(n => n.id === who).visible;
      if (inside) Dialog.open({ name: data.name, text: "(You hear faint snoring inside.)" });
      else Dialog.open({ name: data.name, text: "(Nobody seems to be home.)" });
    }
  }

  function tryShop() {
    const granny = Entities.npcs.find(n => n.id === "granny");
    const open = granny && granny.act === "shop" && granny.visible;
    if (!open) { Dialog.open({ name: "Granny's Shop", text: NPC_DATA.granny.shopClosed }); return; }
    // quest deliver first
    if (S.quest && S.quest.def.giver === "granny" && Entities.countItem(S.quest.def.item) >= S.quest.def.n) {
      completeQuest(); return;
    }
    openShop();
  }

  // ---------------- dialogue ----------------
  function npcLine(id) {
    const d = NPC_DATA[id];
    const h = Entities.hearts[id];
    const pool = h >= 7 ? d.lines_hi : d.lines;
    let line = pool[(Math.random() * pool.length) | 0];
    const seas = { spring: "The sakura are early this year.", summer: "Cicadas already?! Summer goes too fast.", autumn: "Smell that? Rice harvest is close.", winter: "Brr. The kotatsu is sacred." };
    if (Math.random() < 0.3) line += "\n\n\"" + seas[season()] + "\"";
    return line;
  }

  function talkTo(id) {
    const d = NPC_DATA[id];
    S.met[id] = true;
    // quest deliver check
    if (S.quest && S.quest.def.giver === id) {
      const have = Entities.countItem(S.quest.def.item);
      if (have >= S.quest.def.n) { completeQuest(); return; }
    }
    // daily first talk
    if (!Entities.dailyFlags.talked[id]) {
      Entities.dailyFlags.talked[id] = true;
      addHearts(id, 1, true);
    }
    const choices = [{ label: "Bye~", fn: () => Dialog.close() }, { label: "Give a gift", fn: () => { Dialog.close(); openGift(id); } }];
    if (id === "granny" && Entities.npcs.find(n => n.id === "granny").act === "shop") {
      choices.unshift({ label: "Shop", fn: () => { Dialog.close(); openShop(); } });
    }
    Dialog.open({ name: d.name, npc: id, text: npcLine(id), choices });
  }

  function addHearts(id, n, silent = false) {
    if (Entities.hearts[id] === undefined) return;
    const before = Entities.hearts[id];
    Entities.hearts[id] = Math.min(10, before + n);
    if (!silent && Entities.hearts[id] > before) {
      AudioSys.sfx.heart();
      toast(`${NPC_DATA[id].name} ♡${Entities.hearts[id]}`, { cls: "good" });
    }
    // max event
    if (before < 10 && Entities.hearts[id] >= 10) maxHeartEvent(id);
  }
  let capyHeartsGiven = false;
  function maxHeartEvent(id) {
    AudioSys.sfx.fanfare();
    if (id === "granny") { Entities.player.coins += 1000; toast("Granny pressed ¥1000 into your hand. \"For socks!\"", { cls: "good", icon: "coin" }); }
    if (id === "grandpa") {
      if (!Entities.player.hasGoldRod) { Entities.player.hasGoldRod = true; toast("Grandpa gave you his GOLDEN ROD!!", { cls: "good" }); }
      else { Entities.player.coins += 800; toast("Grandpa gave you ¥800 and a firm nod.", { cls: "good", icon: "coin" }); }
    }
    if (id === "yuki") { addItem("charm", 1); addItem("taiyaki", 2, true); toast("Yuki gave you her lucky GOLDEN CAT CHARM!!", { cls: "good" }); }
  }

  // ---------------- quests ----------------
  function questPool() {
    return QUESTS.filter(q => !S.questDone.includes(q.id)
      && (!q.season || q.season === season())
      && S.day >= (q.minDay || 0));
  }
  function maybeMorningMail() {
    if (S.quest) return;
    if (S.mailSeenDay === S.day) return;
    const pool = questPool();
    if (pool.length && Math.random() < 0.8) {
      S.mailReady = true;
    }
  }
  function openMailbox() {
    tutAdvance("mail");
    if (S.mailReady) {
      S.mailReady = false; S.mailSeenDay = S.day;
      let q;
      if (!S.questDone.length && S.day <= 2) {
        q = QUESTS.find(x => x.id === "wildflowers"); // gentle starter
      } else {
        const pool = questPool();
        q = pool.length ? pool[(Math.random() * pool.length) | 0] : QUESTS[0];
      }
      const cards = [
        "Kenji (in the city): \"The trains here are so crowded\nyou can't even fall over. How's the rice?\"",
        "Kenji: \"I ate 'fresh vegetables' today. They were\nthree days old and cost ¥800. Send help (and daikon).\"",
        "Kenji: \"Saw a cat outside my office window and\nalmost cried. Tell the plaza cats I said hi.\"",
      ];
      Panel.open("Mailbox", `
        <div class="letter">
          <h3>✉ ${q.title}</h3>
          <div>${q.desc}<br><br>Reward: ¥${q.reward.coins} ♡<br><br>— — —<br>${cards[(Math.random() * cards.length) | 0]}</div>
          <div class="from">— the village post</div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
          <button class="btn pink" id="q-accept">Accept quest</button>
          <button class="btn" id="q-later">Maybe later</button>
        </div>`);
      $("q-accept").onclick = () => { S.quest = { def: q, prog: 0 }; Panel.close(); AudioSys.sfx.confirm(); toast(`Quest accepted: ${q.title}`, { cls: "good", icon: q.item }); questSync(); saveGame(); };
      $("q-later").onclick = () => Panel.close();
    } else {
      Dialog.open({ name: "Mailbox", text: "(Just dew and a tiny spider.\nThe spider waves.)" });
    }
  }
  function completeQuest() {
    const q = S.quest;
    Entities.removeItem(q.def.item, q.def.n);
    S.questDone.push(q.def.id);
    S.quest = null;
    Entities.player.coins += q.def.coins || q.def.reward.coins;
    for (const [id, h] of Object.entries(q.def.reward.hearts || {})) addHearts(id, h);
    for (const [id, n] of Object.entries(q.def.reward.items || {})) addItem(id, n, true);
    AudioSys.sfx.fanfare();
    Dialog.open({ name: NPC_DATA[q.def.giver].name, npc: q.def.giver,
      text: "\"Oh! You actually did it!\"\n\n✦ Quest complete! +¥" + (q.def.reward.coins) + " ♥" });
    questSync(); saveGame();
  }
  function questSync() {
    tutSync();
    const el = $("hud-quest");
    if (!S.quest) { el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    const have = Math.min(Entities.countItem(S.quest.def.item), S.quest.def.n);
    const pct = Math.round((have / S.quest.def.n) * 100);
    el.innerHTML = `<div class="qtitle">✉ QUEST · ${NPC_DATA[S.quest.def.giver].name}</div>${S.quest.def.title}<br>
      <span style="color:#ffd98a">${have}/${S.quest.def.n} × ${Items[S.quest.def.item].name}</span>
      <div style="margin-top:4px;height:6px;background:rgba(0,0,0,0.45);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:repeating-linear-gradient(-45deg,#8fd464 0 5px,#a5e078 5px 10px);transition:width .3s steps(6)"></div>
      </div>`;
  }

  // ---------------- shrine ----------------
  function ringBell() {
    AudioSys.sfx.bell();
    Entities.burst("sparkle", 92 * TILE + 8, 11 * TILE, 8, { up: 24, col: "#ffe8a8" });
    if (S.minutes >= 265 && S.minutes <= 420 && !Entities.dailyFlags.prayed) {
      Entities.dailyFlags.prayed = true;
      S.luck = true;
      AudioSys.sfx.fanfare();
      toast("Dawn blessing! The shrine glows... (+25% sell prices today)", { cls: "good", icon: "charm" });
    } else {
      toast("You feel calm. (gong...)"); 
    }
  }
  function makeOffer() {
    if (Entities.player.coins >= 100) {
      Entities.player.coins -= 100;
      Entities.player.energy = Math.min(Entities.player.maxEnergy, Entities.player.energy + 20);
      AudioSys.sfx.coin();
      Entities.burst("sparkle", 96 * TILE + 8, 11 * TILE, 6, { up: 20, col: "#fff" });
      toast("You offered ¥100. Warmth spreads through you. (+20 energy)");
    } else {
      Dialog.open({ name: "Offering Box", text: "(You need ¥100 to make an offering.)" });
    }
  }

  // ---------------- onsen ----------------
  function soak() {
    const p = Entities.player;
    S.mode = "soak";
    $("fade").classList.add("on");
    AudioSys.sfx.splash();
    setTimeout(() => {
      p.energy = p.maxEnergy;
      S.minutes += 30;
      Entities.burst("steam", 101.5 * TILE, 72 * TILE, 14, { up: 8, maxLife: 2.4 });
      for (let i = 0; i < 3; i++) Entities.addParticle("heart", p.x + (Math.random() - 0.5) * 20, p.y - 14, { maxLife: 1.4 });
      AudioSys.sfx.kyu();
      popup("Aaahh~... energy restored!", null);
      $("fade").classList.remove("on");
      S.mode = "play";
    }, 700);
  }

  // ---------------- vending ----------------
  function openVending() {
    const p = Entities.player;
    const stock = [
      { id: "onigiri", price: 100 }, { id: "ramune", price: 120 },
      { id: "coffee", price: 150 }, { id: "taiyaki", price: 200 },
    ];
    Panel.open("Vending Machine", `
      <div style="display:flex;flex-direction:column;gap:4px" id="v-rows"></div>
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
        <button class="btn pink" id="v-capsule">🎲 Capsule toy · ¥200</button>
        <span style="color:#9a8a6a;font-size:15px">what will you get?</span>
      </div>`);
    const rows = $("v-rows");
    for (const s of stock) {
      const row = document.createElement("div");
      row.className = "shop-row";
      row.innerHTML = `<img src="${Sprites.itemIcon(s.id)}"><span class="nm">${Items[s.id].name} <span style="color:#9a8a6a;font-size:14px">(energy +${Items[s.id].food})</span></span><span class="pr">¥${s.price}</span><button class="btn small">Buy</button>`;
      row.querySelector("button").onclick = () => {
        if (p.coins < s.price) { toast("Not enough coins!", { cls: "bad" }); AudioSys.sfx.cancel(); return; }
        p.coins -= s.price;
        AudioSys.sfx.coin(); AudioSys.sfx.clunk();
        addItem(s.id, 1);
        hudSync();
      };
      rows.appendChild(row);
    }
    $("v-capsule").onclick = () => {
      if (p.coins < 200) { toast("Not enough coins!", { cls: "bad" }); AudioSys.sfx.cancel(); return; }
      p.coins -= 200;
      AudioSys.sfx.clunk();
      const r = Math.random();
      const got = r < 0.4 ? "marble" : r < 0.7 ? "sticker" : r < 0.96 ? "keychain" : "charm";
      setTimeout(() => { addItem(got, 1); if (got === "charm") toast("★ GOLDEN CAT CHARM?! No way!!", { cls: "good" }); hudSync(); }, 350);
    };
  }

  // ---------------- shop ----------------
  let shopRenderBuy = null, shopRenderSell = null;
  function openShop() {
    const p = Entities.player;
    Panel.open("Granny's Shop", `<div class="shop-tabs"><button class="shop-tab active" id="tab-buy">🛒 Buy</button><button class="shop-tab" id="tab-sell">💰 Sell</button></div><div id="shop-body"></div>`);
    const body = $("shop-body");
    const renderBuy = () => {
      const seeds = ["rice_seed", "daikon_seed", "eggplant_seed", "cucumber_seed", "strawberry_seed"].filter(s => {
        const crop = Items[s].crop;
        return CROPS[crop].seasons.includes(season());
      });
      const foods = ["onigiri", "ramune", "coffee", "taiyaki"];
      const tools = [];
      if (!p.hasBigCan) tools.push({ id: "can_up", name: "Deluxe Watering Can", note: "16 charges · waters 3 tiles at once", price: 800 });
      if (!p.hasGoldRod) tools.push({ id: "rod_up", name: "Golden Fishing Rod", note: "bites fast & lucky — or befriend Grandpa ♥", price: 1500 });
      let html = "";
      if (season() === "winter") html += `<div class="luck-note">"Nothing grows in winter, dear. Rest, eat well, fish a little."</div>`;
      html += `<div class="shop-sect">🌱 SEEDS</div>`;
      for (const s of seeds) html += shopRow(s, Items[s].price, `plants ${Items[s].crop} · ${CROPS[Items[s].crop].days} days`);
      html += `<div class="shop-sect">🍡 SNACKS</div>`;
      for (const f of foods) html += shopRow(f, Items[f].price, `energy +${Items[f].food}`);
      if (tools.length) {
        html += `<div class="shop-sect">🔧 TOOLS</div>`;
        for (const t of tools) {
          html += `<div class="shop-row"><img src="${Sprites.itemIcon(t.id === 'can_up' ? 'marble' : 'keychain')}"><span class="nm">${t.name}<br><span class="muted">${t.note}</span></span><span class="pr">¥${t.price}</span><button class="btn small pink" onclick="buyTool('${t.id}',${t.price})">Buy</button></div>`;
        }
      }
      body.innerHTML = html;
    };
    const shopRow = (id, price, note) => `<div class="shop-row"><img src="${Sprites.itemIcon(id)}"><span class="nm">${Items[id].name} <span class="muted">${note}</span></span><span class="pr">¥${price}</span><button class="btn small" onclick="buy('${id}',${price})">×1</button><button class="btn small" onclick="buy('${id}',${price * 5},5)">×5</button></div>`;

    const renderSell = () => {
      if (!$("shop-body")) return;
      const entries = Object.entries(p.inventory).filter(([id]) => Items[id] && Items[id].sell);
      if (!entries.length) { body.innerHTML = `<div class="inv-empty">Nothing to sell yet!<br><span class="muted">Grow things, catch things, forage things — Granny buys it all.</span></div>`; return; }
      let html = S.luck ? `<div class="luck-note">✦ Dawn blessing active: everything sells for <b>+25%</b> today!</div>` : "";
      for (const [id, n] of entries) {
        const price = Math.round(Items[id].sell * (S.luck ? 1.25 : 1));
        html += `<div class="shop-row"><img src="${Sprites.itemIcon(id)}"><span class="nm">${Items[id].name} ×${n} <span class="muted">(¥${price} each)</span></span><span class="pr">+¥${price * n}</span><button class="btn small green" onclick="sell('${id}',1)">Sell 1</button><button class="btn small pink" onclick="sell('${id}',${n})">All</button></div>`;
      }
      body.innerHTML = html;
    };
    $("tab-buy").onclick = (e) => { $("tab-buy").classList.add("active"); $("tab-sell").classList.remove("active"); renderBuy(); };
    $("tab-sell").onclick = () => { $("tab-sell").classList.add("active"); $("tab-buy").classList.remove("active"); renderSell(); };
    shopRenderBuy = renderBuy; shopRenderSell = renderSell;
    renderBuy();
  }
  // exposed for inline onclick — shop render hooks are set by openShop()
  var Game_buy, Game_sell, Game_buyTool;
  Game_buy = (id, price, n = 1) => {
    const p = Entities.player;
    if (p.coins < price) { toast("Not enough coins!", { cls: "bad" }); AudioSys.sfx.cancel(); return; }
    p.coins -= price;
    AudioSys.sfx.coin();
    addItem(id, n || 1);
    hudSync();
  };
  Game_sell = (id, n) => {
    const p = Entities.player;
    n = Math.min(n, p.inventory[id] || 0);
    if (!n) return;
    const price = Math.round(Items[id].sell * (S.luck ? 1.25 : 1));
    Entities.removeItem(id, n);
    p.coins += price * n;
    p.stats.earned += price * n;
    AudioSys.sfx.sell(); toast(`Sold ${n} ${Items[id].name} · +¥${price * n}`, { cls: "good", icon: "coin" });
    questSync();
    if (shopRenderSell) shopRenderSell();
    hudSync();
  };
  Game_buyTool = (id, price) => {
    const p = Entities.player;
    if ((id === "can_up" && p.hasBigCan) || (id === "rod_up" && p.hasGoldRod)) return; // already owned
    if (p.coins < price) { toast("Not enough coins!", { cls: "bad" }); return; }
    p.coins -= price;
    if (id === "can_up") { p.hasBigCan = true; p.canMax = 16; p.canCharges = 16; }
    if (id === "rod_up") p.hasGoldRod = true;
    AudioSys.sfx.fanfare();
    toast("Upgrade acquired!", { cls: "good" });
    if (shopRenderBuy) shopRenderBuy();
    hudSync();
  };
  window.buy = (id, p, n) => Game_buy(id, p, n);
  window.sell = (id, n) => Game_sell(id, n);
  window.buyTool = (id, p) => Game_buyTool(id, p);

  // ---------------- inventory & gifts ----------------
  function openInventory() {
    const p = Entities.player;
    Panel.open("Pocket (I)", `<div class="inv-grid" id="inv-grid"></div>
      <div style="margin-top:10px;color:#9a8a6a;font-size:15px">Tip: give gifts by talking to villagers → "Give a gift". Food can be eaten here.</div>`);
    const grid = $("inv-grid");
    const entries = Object.entries(p.inventory);
    if (!entries.length) { grid.innerHTML = `<div class="inv-empty">Your pockets are full of hopes and dreams.</div>`; return; }
    for (const [id, n] of entries) {
      const cell = document.createElement("div");
      cell.className = "inv-cell";
      const eatBtn = Items[id].food ? ` <button class="btn small" data-eat="${id}">Eat</button>` : "";
      cell.innerHTML = `<img src="${Sprites.itemIcon(id)}"><span>${Items[id].name}</span><span class="qty">×${n}</span>${eatBtn}`;
      if (Items[id].food) cell.querySelector("[data-eat]").onclick = () => {
        Entities.removeItem(id, 1);
        p.energy = Math.min(p.maxEnergy, p.energy + Items[id].food);
        AudioSys.sfx.eat();
        toast(`Yum! +${Items[id].food} energy`, { icon: id });
        hudSync(); questSync(); openInventory();
      };
      grid.appendChild(cell);
    }
  }

  function openGift(npcId) {
    const p = Entities.player;
    const d = NPC_DATA[npcId];
    const giftable = Object.entries(p.inventory);
    Panel.open(`Gift for ${d.name}`, `<div class="inv-grid" id="gift-grid"></div>
      <div style="margin-top:10px;color:#9a8a6a;font-size:15px">Watch their reaction — <span style="color:#c95a74;font-weight:700">♥ loved</span> gifts earn <b>2 hearts</b>!</div>`);
    const grid = $("gift-grid");
    if (!giftable.length) { grid.innerHTML = `<div class="inv-empty">Nothing to give. Forage something nice!</div>`; return; }
    for (const [id, n] of giftable) {
      const cell = document.createElement("div");
      cell.className = "inv-cell";
      const like = d.likes[id] || 0;
      const tag = like >= 2 ? `<span class="tag love">♥ loved</span>` : like === 1 ? `<span class="tag like">♡ liked</span>` : "";
      cell.innerHTML = `<img src="${Sprites.itemIcon(id)}"><span>${Items[id].name}</span><span class="qty">×${n}</span>${tag}`;
      cell.onclick = () => { Panel.close(); giveGift(npcId, id); };
      grid.appendChild(cell);
    }
  }
  function giveGift(npcId, id) {
    const d = NPC_DATA[npcId];
    Entities.removeItem(id, 1);
    Entities.player.stats.gifts++;
    const like = d.likes[id] || 0;
    let text, hearts = 0;
    if (like >= 2) { text = `"For ME?! ${d.name === "Yuki" ? "AAAAA" : "Oh my, oh my"}..." ♡♡`; hearts = 2; }
    else if (like === 1) { text = `"How thoughtful of you, dear." ♡`; hearts = 1; }
    else { text = `"Oh... thank you. (They smile politely.)"`; hearts = 0; }
    addHearts(npcId, hearts, true);
    if (hearts) AudioSys.sfx.heart(); else AudioSys.sfx.pop();
    Dialog.open({ name: d.name, npc: npcId, text });
    for (let i = 0; i < hearts * 2 + 1; i++) {
      const n = Entities.npcs.find(x => x.id === npcId);
      if (n) Entities.addParticle("heart", n.x + (Math.random() - 0.5) * 14, n.y - 16, { maxLife: 1.2 });
    }
  }

  // ---------------- tools ----------------
  function useTool() {
    const p = Entities.player;
    if (p.fishing) { interact(); return; }
    if (p.energy <= 0) { toast("Too tired... eat something or sleep.", { cls: "bad" }); return; }
    switch (p.tool) {
      case "hoe": useHoe(); break;
      case "can": useCan(); break;
      case "seed": useSeed(); break;
      case "net": useNet(); break;
      case "rod": useRod(); break;
      default: interact(); break;
    }
  }

  function useHoe() {
    const p = Entities.player;
    const t = frontTile();
    const k = tkey(t.x, t.y);
    if (farm.has(k)) { if (!farm.get(k).c) { farm.delete(k); AudioSys.sfx.chop(); toast("The soil rests again."); } return; }
    if (World.getG(t.x, t.y) !== World.G.GRASS || World.isSolid(t.x, t.y)) return;
    if (!World.inB(t.x, t.y)) return;
    const F = World.named.farm;
    if (!(t.x >= F.x && t.x < F.x + F.w && t.y >= F.y && t.y < F.y + F.h)) {
      if (!S.hoeTipShown) {
        S.hoeTipShown = true;
        toast("This land isn't yours to till — your field is south of the river, over the bridge ♥", { cls: "gold" });
      }
      return;
    }
    farm.set(k, { t: 1, w: 0, c: null });
    p.energy = Math.max(0, p.energy - 3);
    AudioSys.sfx.chop();
    Entities.burst("dirt", t.x * TILE + 8, t.y * TILE + 10, 5, { up: 24, col: "#8a5a3a" });
    tutAdvance("till");
    hudSync();
  }

  function useCan() {
    const p = Entities.player;
    if (p.canCharges <= 0) {
      // refill from any adjacent water (front tile, or around the player)
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const wx = Math.floor(p.x / TILE) + ox, wy = Math.floor(p.y / TILE) + oy;
        if (World.getG(wx, wy) === World.G.WATER) { fillCan(); return; }
      }
      toast("Empty! Refill at the well, river, or pond.", { cls: "bad" }); AudioSys.sfx.cancel();
      return;
    }
    const base = frontTile();
    const tiles = [base];
    if (p.hasBigCan) {
      const [dx, dy] = DIRV[p.dir] || [0, 1];
      const perp = dx !== 0 ? [0, 1] : [1, 0];
      tiles.push({ x: base.x + perp[0], y: base.y + perp[1] }, { x: base.x - perp[0], y: base.y - perp[1] });
    }
    let watered = 0;
    for (const t of tiles) {
      const f = farm.get(tkey(t.x, t.y));
      if (f && !f.w) { f.w = 1; watered++; }
    }
    // aiming at water with nothing to water? top up the can instead of wasting it
    const bt = World.getG(base.x, base.y);
    if (!watered && (bt === World.G.WATER || bt === World.G.PADDY)) { fillCan(); return; }
    p.canCharges -= 1;
    p.energy = Math.max(0, p.energy - 1);
    AudioSys.sfx.water();
    for (const t of tiles) Entities.burst("drop", t.x * TILE + 8, t.y * TILE + 4, 3, { up: 6, col: "#7cc0ee", speed: 10 });
    if (watered) { tutAdvance("water"); hudSync(); }
  }
  function fillCan() {
    const p = Entities.player;
    if (p.canCharges >= p.canMax) return;
    p.canCharges = p.canMax;
    AudioSys.sfx.water();
    toast(`Watering can filled! (💧${p.canMax})`, { cls: "good" });
    hudSync();
  }

  function useSeed() {
    const p = Entities.player;
    const t = frontTile();
    const f = farm.get(tkey(t.x, t.y));
    if (!f || f.c) { toast("Hoe a patch of grass first, then plant."); return; }
    if (!p.inventory[p.seedType]) { toast(`No ${Items[p.seedType].name}! Buy some at Granny's.`, { cls: "bad" }); return; }
    const crop = Items[p.seedType].crop;
    if (!CROPS[crop].seasons.includes(season())) { toast(`${crop} doesn't grow in ${season()}.`, { cls: "bad" }); return; }
    Entities.removeItem(p.seedType, 1);
    f.c = { k: crop, s: 0, d: 0 };
    p.energy = Math.max(0, p.energy - 1);
    AudioSys.sfx.pop();
    Entities.burst("sparkle", t.x * TILE + 8, t.y * TILE + 8, 4, { up: 12, col: "#c9e88a" });
    tutAdvance("plant");
    hotbarSync();
  }

  function useNet() {
    const p = Entities.player;
    p.energy = Math.max(0, p.energy - 2);
    AudioSys.sfx.whoosh ? AudioSys.sfx.whoosh() : AudioSys.sfx.pop();
    const f = frontPoint(18);
    let caught = null, bd = 22;
    for (const c of Entities.critters) {
      const d = Math.hypot(c.x - f.x, c.y - f.y);
      if (d < bd) { bd = d; caught = c; }
    }
    Entities.burst("sparkle", f.x, f.y, 6, { up: 18, col: "#fff" });
    if (caught) {
      Entities.critters.splice(Entities.critters.indexOf(caught), 1);
      p.stats.bugs[caught.type] = (p.stats.bugs[caught.type] || 0) + 1;
      addItem(caught.type, 1);
      AudioSys.sfx.catchJingle();
    } else {
      toast("*swoosh* (nothing there)");
    }
  }

  function useRod() {
    const p = Entities.player;
    // find water within 3 tiles in facing dir
    const [dx, dy] = DIRV[p.dir] || [0, 1];
    for (let i = 1; i <= 3; i++) {
      const tx = Math.floor((p.x + dx * i * TILE) / TILE), ty = Math.floor((p.y + dy * i * TILE + 4) / TILE);
      if (World.getG(tx, ty) === World.G.WATER) {
        p.fishing = { phase: "wait", t: 0, need: (p.hasGoldRod ? 1.2 : 2.5) + Math.random() * (p.hasGoldRod ? 3 : 5), spot: { x: tx * TILE + 8, y: ty * TILE + 8 }, fish: null };
        AudioSys.sfx.splash();
        p.energy = Math.max(0, p.energy - 2);
        return;
      }
    }
    toast("Face the water to cast!");
  }

  function updateFishing(dt) {
    const p = Entities.player;
    const F = p.fishing;
    if (!F) return;
    F.t += dt;
    if (F.phase === "wait" && F.t >= F.need) {
      F.phase = "bite"; F.t = 0;
      F.window = p.hasGoldRod ? 1.3 : 0.85;
      AudioSys.sfx.pop();
    } else if (F.phase === "bite") {
      if (F.t >= F.window) {
        p.fishing = null;
        AudioSys.sfx.splash();
        toast("It got away...", { cls: "bad" });
      }
    }
  }
  function reelFish() {
    const p = Entities.player;
    const F = p.fishing;
    p.fishing = null;
    // pick fish: pond (x<26,y 66..78) vs river
    const inPond = F.spot.x < 26 * TILE && F.spot.y > 64 * TILE;
    const night = isNight();
    let table;
    if (inPond) table = [["koi", 3], ["carp", 5], ["catfish", night ? 4 : 1], ["can", 1]];
    else table = [["yamame", 4], ["carp", 3], ["catfish", night ? 2 : 0.5], ["koi", 1], ["can", 1]];
    if (season() === "summer" && night) table.push(["eel", 3]);
    let tw = 0; for (const [, w] of table) tw += w;
    let r = Math.random() * tw, fish = table[0][0];
    for (const [id, w] of table) { r -= w; if (r <= 0) { fish = id; break; } }
    AudioSys.sfx.splash(); AudioSys.sfx.catchJingle();
    Entities.burst("drop", F.spot.x, F.spot.y, 10, { up: 30, col: "#7cc0ee" });
    p.stats.fish[fish] = (p.stats.fish[fish] || 0) + 1;
    addItem(fish, 1);
  }

  function harvest(t, f) {
    const p = Entities.player;
    const def = CROPS[f.c.k];
    addItem(f.c.k, def.regrow ? 2 : 1);
    p.stats.crops[f.c.k] = (p.stats.crops[f.c.k] || 0) + 1;
    Entities.burst("sparkle", t.x * TILE + 8, t.y * TILE + 4, 8, { up: 22, col: "#fff6a8" });
    AudioSys.sfx.pop();
    p.energy = Math.max(0, p.energy - 1);
    if (def.regrow) { f.c.s = 2; f.c.d = Math.floor(def.days * 0.55); }
    else { f.c = null; }
  }

  // ---------------- day cycle ----------------
  const FESTIVALS = {
    5: { season: "spring", name: "Hanami Festival!", type: "hanami" },
    12: { season: "summer", name: "Fireworks Festival!", type: "fireworks" },
    19: { season: "autumn", name: "Harvest Moon Night", type: "moon" },
    26: { season: "winter", name: "Snow Lantern Festival", type: "snowfest" },
  };
  function festivalToday() {
    const doy = ((S.day - 1) % 28) + 1; // day within the 28-day year
    for (const [d, f] of Object.entries(FESTIVALS)) {
      if (+d === doy) return f;
    }
    return null;
  }

  function doNap() {
    if (S.mode !== "play" || S.napUsed) return;
    S.napUsed = true;
    const p = Entities.player;
    S.mode = "soak";
    $("fade").classList.add("on");
    AudioSys.sfx.sleep();
    setTimeout(() => {
      p.energy = Math.min(p.maxEnergy, p.energy + 35);
      p.stats.naps++;
      S.minutes = Math.min(S.minutes + 180, 1434);
      Entities.addParticle("zzz", p.x + 6, p.y - 14, { maxLife: 1.8, vx: 4 });
      popup("Zzz... +35 energy", null);
      $("fade").classList.remove("on");
      S.mode = "play";
      saveGame();
    }, 800);
  }

  function doSleep(collapsed) {
    if (S.sleeping) return;
    S.sleeping = true;
    tutAdvance("sleep");
    Entities.player.fishing = null;
    Dialog.close(); Panel.close();
    S.mode = "soak"; // reuse fade-lock
    $("fade").classList.add("on");
    AudioSys.sfx.sleep();
    setTimeout(() => {
      newDay(collapsed);
      const p = Entities.player;
      p.x = 30.5 * TILE; p.y = 19.5 * TILE;
      p.energy = collapsed ? 60 : p.maxEnergy;
      $("fade").classList.remove("on");
      S.mode = "play";
      S.sleeping = false;
      toast(`Day ${S.day} · ${season()[0].toUpperCase() + season().slice(1)} · ${S.weather === "clear" ? "Sunny ♪" : S.weather === "rain" ? "Rainy" : "Snowy"}`, { cls: "good" });
      saveGame();
    }, 900);
  }

  function newDay(collapsed = false) {
    const oldSeason = season();
    const oldDoy = ((S.day - 1) % 28) + 1;
    S.day += 1;
    S.minutes = 360;
    S.luck = false;
    if (collapsed) toast("You passed out! Granny carried you home...", { cls: "bad" });
    // new year?
    const newDoy = ((S.day - 1) % 28) + 1;
    let yearTurned = false;
    if (newDoy < oldDoy) { S.year++; yearTurned = true; }
    // weather
    const se = season();
    const r = Math.random();
    if (se === "winter") S.weather = r < 0.4 ? "snow" : "clear";
    else S.weather = r < (se === "spring" ? 0.3 : 0.22) ? "rain" : "clear";
    // rainbow chance
    S.rainbow = S.weather === "clear" && (oldSeason === "spring" || oldSeason === "autumn") && Math.random() < 0.35;
    // crops
    for (const f of farm.values()) {
      if (S.weather === "rain" || se === "winter") f.w = 1; // rain & snow water for you
      if (f.c) {
        const def = CROPS[f.c.k];
        if (f.w && def.seasons.includes(oldSeason)) {
          f.c.d += 1;
          f.c.s = Math.max(f.c.s, Math.min(3, Math.floor((f.c.d / def.days) * 4)));
        }
      }
      if (S.weather !== "rain" && se !== "winter") f.w = 0;
    }
    // daily flags & spawns
    Entities.dailyFlags.talked = {}; Entities.dailyFlags.petted = {};
    Entities.dailyFlags.prayed = false; Entities.dailyFlags.collectedPaddy = false;
    S.napUsed = false; S.warnLate = false; S.warnMidnight = false; S.warnedLow = false;
    Entities.spawnMorning(se);
    Entities.spawnCritters(currentState());
    maybeMorningMail();
    S.festivalToday = festivalToday();
    S.firedFwNpcs = false;
    // train schedule
    S.train.times = [540 + Math.random() * 40, 750 + Math.random() * 40, 1020 + Math.random() * 40];
    S.train.nextIx = 0; S.train.active = false;
    // morning announcements
    setTimeout(() => {
      if (yearTurned) showBanner(`Year ${S.year}`, "新年明けまして");
      else showBanner(`${SEASON_EMOJI[se]} ${cap1(se)} ${newDoy}`, SEASON_JP[se]);
    }, 900);
    if (yearTurned) toast("A brand new year in the village ♪", { cls: "gold" });
    else if (season() !== oldSeason) toast(`${cap1(se)} has arrived. ${se === "winter" ? "Nothing grows now — cozy season!" : ""}`, { cls: "gold" });
    if (S.festivalToday) {
      setTimeout(() => { showBanner(S.festivalToday.name, "お祭り"); toast(`✦ Today is the ${S.festivalToday.name}!`, { cls: "good" }); }, yearTurned ? 3600 : 3100);
      if (S.festivalToday.type === "snowfest") S.weather = "snow";
    }
    questSync();
  }

  function currentState() {
    return { minutes: S.minutes, hour: hour(), season: season(), weather: S.weather, night: isNight() };
  }

  // ---------------- train ----------------
  function updateTrain(dt) {
    const T = S.train;
    if (!T.times.length) return;
    if (!T.active && T.nextIx < T.times.length && S.minutes >= T.times[T.nextIx]) {
      T.active = true; T.x = -420; T.horned = false;
      T.nextIx++;
      AudioSys.sfx.horn();
    }
    if (T.active) {
      T.x += 250 * dt;
      const p = Entities.player;
      const d = Math.abs(p.x - T.x);
      const rate = d < 500 ? 7 : d < 1200 ? 3 : 0; // rumble only when nearby
      if (Math.random() < dt * rate) AudioSys.sfx.trainRumble(Math.max(0.02, 0.3 - d / 4000));
      // little smoke puffs from the engine
      if (Math.random() < dt * 5) {
        Entities.addParticle("smoke", T.x - 50, 4.9 * TILE, { maxLife: 1.6, vx: -30 });
      }
      if (T.x > World.W * TILE + 420) { T.active = false; }
    }
  }

  // ---------------- festivals ----------------
  // returns which festival is currently controlling NPC positions (or null)
  function festivalControl() {
    if (!S.festivalToday) return null;
    const f = S.festivalToday;
    if (f.type === "hanami" && S.minutes >= 600 && S.minutes <= 1080) return "hanami";
    if (f.type === "fireworks" && S.minutes >= 1140 && S.minutes <= 1260) return "fireworks";
    return null;
  }
  const FEST_SPOTS = {
    hanami: { granny: [70, 67], grandpa: [76, 67], yuki: [73, 66] },
    fireworks: { granny: [56, 66], grandpa: [60, 66], yuki: [64, 66] },
  };
  function updateFestival(dt) {
    if (!S.festivalToday) return;
    const f = S.festivalToday;
    const fc = festivalControl();
    if (!fc) { S.festMsgDone = ""; return; }
    // villagers glide to their festival spots (single position controller —
    // schedules are frozen via Entities.updateNPCs freeze list while fc is set)
    const spots = FEST_SPOTS[fc];
    let arrived = true;
    for (const n of Entities.npcs) {
      const sp = spots[n.id];
      if (!sp) continue;
      const gx = sp[0] * TILE, gy = sp[1] * TILE;
      const dx = gx - n.x, dy = gy - n.y;
      if (Math.hypot(dx, dy) > 2) {
        const k = Math.min(1, dt * 1.4);
        n.x += dx * k; n.y += dy * k;
        n.moving = Math.hypot(dx, dy) > 20;
        if (Math.abs(dx) > Math.abs(dy)) n.dir = dx > 0 ? "right" : "left";
        else n.dir = dy > 0 ? "down" : "up";
        n.animT += dt;
        arrived = false;
      } else {
        n.x = gx; n.y = gy;
        n.moving = false;
        n.act = "chat"; n.dir = "up";
      }
    }
    if (!arrived && !S.festMsgDone && fc === "hanami") {
      S.festMsgDone = fc;
      toast("Everyone gathered for hanami under the sakura! 🌸", { cls: "good" });
    }
    if (f.type === "fireworks" && fc === "fireworks") {
      S.fwTimer -= dt;
      if (S.fwTimer <= 0) {
        S.fwTimer = 1.4 + Math.random() * 1.6;
        const fx = (40 + Math.random() * 50) * TILE;
        const fy = (World.riverY(fx / TILE) - 5) * TILE - Math.random() * 60;
        const cols = ["#ff5a6e", "#ffd94a", "#7cc0ee", "#c9a8ff", "#8fd464"];
        const col = cols[(Math.random() * cols.length) | 0];
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 55;
          Entities.addParticle("fw", fx, fy, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, maxLife: 1.4, col });
        }
        const d = Math.hypot(Entities.player.x - fx, Entities.player.y - fy);
        AudioSys.sfx.boom(Math.min(1, d / 2400));
        Entities.burst("sparkle", fx, fy, 4, { up: 0, col });
      }
      if (!S.firedFwNpcs) { S.firedFwNpcs = true; toast("The fireworks begin!!", { cls: "good" }); }
    }
  }

  // ---------------- particles / ambient ----------------
  function updateAmbient(dt) {
    const se = season(), night = isNight();
    const cam = S.cam;
    const vw = cv.width, vh = cv.height;

    // drift the cloud shadows
    if (S.weather === "clear") {
      for (const c of CLOUDS) {
        c.x += c.sp * dt;
        if (c.x - c.r > World.W * TILE) { c.x = -c.r; c.y = (8 + Math.random() * 74) * TILE; }
      }
    }

    // petals / leaves / snow
    let rate = 0;
    let type = "petal";
    if (se === "spring") rate = 3 + (S.festivalToday && S.festivalToday.type === "hanami" ? 14 : 0);
    else if (se === "autumn") { rate = 2; type = "leaf"; }
    else if (se === "winter") { rate = S.weather === "snow" ? 0 : 0.4; type = "snow"; }
    if (S.weather === "snow" && se === "winter") rate = 26;
    if (Math.random() < rate * dt) {
      const cols = type === "petal" ? ["#ffb7d0", "#ffd7e6"] : type === "leaf" ? ["#e08a4a", "#c86a3e", "#f0aa5c"] : ["#fff", "#e8f4fa"];
      Entities.addParticle(type, cam.x + Math.random() * vw, cam.y - 10, { col: cols[(Math.random() * cols.length) | 0], maxLife: 14 });
    }
    // rain
    if (S.weather === "rain") {
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.8) Entities.addParticle("rain", cam.x + Math.random() * vw, cam.y - 10, { vx: -30, vy: 60, maxLife: 1 });
      }
      // little ripples where raindrops hit water
      for (let i = 0; i < 3; i++) {
        const rpx = cam.x + Math.random() * vw, rpy = cam.y + Math.random() * vh;
        if (World.getG((rpx / TILE) | 0, (rpy / TILE) | 0) === World.G.WATER) {
          Entities.addParticle("ripple", rpx, rpy, { maxLife: 0.7 });
        }
      }
    }
    // chimney smoke
    if ((S.minutes > 360 && S.minutes < 540) || (S.minutes > 1020 && S.minutes < 1260)) {
      for (const st of World.statics) {
        if (st.kind !== "house" || st.v === "station") continue;
        if (Math.abs(st.tx * TILE - cam.x - vw / 2) > vw || Math.abs(st.ty * TILE - cam.y - vh / 2) > vh) continue;
        if (Math.random() < dt * 0.7) {
          Entities.addParticle("smoke", st.tx * TILE + 8 + (st.v === "shop" ? 24 : 26), (st.ty - 4) * TILE - 4, { maxLife: 2.6, vx: 4 });
        }
      }
    }
    // onsen steam
    if (Math.random() < dt * 2.2) {
      Entities.addParticle("steam", 99.5 * TILE + Math.random() * 64, 71.5 * TILE + Math.random() * 24, { maxLife: 2.2, vx: (Math.random() - 0.5) * 4 });
    }
    // zzz for sleeping cats
    for (const a of Entities.animals) {
      if (a.kind === "cat" && a.state === "sleep" && Math.random() < dt * 0.5) {
        Entities.addParticle("zzz", a.x + 6, a.y - 10, { maxLife: 1.6, vx: 3 });
      }
    }
  }

  // ---------------- lighting ----------------
  const SKY_STOPS = [
    [0, 10, 16, 48, 0.62], [4.3, 24, 28, 66, 0.55], [5.3, 120, 80, 100, 0.3],
    [6.5, 255, 200, 140, 0.1], [8, 255, 255, 255, 0.0], [16, 255, 255, 255, 0.0],
    [17.3, 255, 200, 150, 0.12], [18.5, 224, 130, 100, 0.26], [19.5, 90, 70, 110, 0.42],
    [21, 24, 28, 66, 0.55], [24, 10, 16, 48, 0.62],
  ];
  function ambientNow() {
    const h = S.minutes / 60;
    for (let i = 0; i < SKY_STOPS.length - 1; i++) {
      const a = SKY_STOPS[i], b = SKY_STOPS[i + 1];
      if (h >= a[0] && h <= b[0]) {
        const t = (h - a[0]) / (b[0] - a[0] || 1);
        return [
          a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t,
          a[3] + (b[3] - a[3]) * t, a[4] + (b[4] - a[4]) * t,
        ];
      }
    }
    return [10, 16, 48, 0.62];
  }

  function renderLighting() {
    const [r, g, b, a] = ambientNow();
    if (a <= 0.01 && !lightsOn()) return;
    const lw = lightCv.width, lh = lightCv.height;
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, lw, lh);
    lctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.max(a, lightsOn() ? 0.34 : 0)})`;
    lctx.fillRect(0, 0, lw, lh);
    lctx.globalCompositeOperation = "destination-out";

    const night = lightsOn();
    const scale2 = 0.5; // light canvas is half res of view
    const camX = S.cam.x, camY = S.cam.y;
    const punch = (wx, wy, rad, strength = 1) => {
      const x = (wx - camX) * scale2, y = (wy - camY) * scale2, rr = rad * scale2;
      if (x < -rr || y < -rr || x > lw + rr || y > lh + rr) return;
      const grad = lctx.createRadialGradient(x, y, 0, x, y, rr);
      grad.addColorStop(0, `rgba(255,255,255,${0.95 * strength})`);
      grad.addColorStop(0.6, `rgba(255,255,255,${0.5 * strength})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = grad;
      lctx.beginPath(); lctx.arc(x, y, rr, 0, Math.PI * 2); lctx.fill();
    };
    if (night) {
      for (const st of World.statics) {
        if (!st.lightR) continue;
        punch(st.tx * TILE + 8, (st.ty - 1) * TILE, st.lightR);
      }
      // window glow of houses
      for (const st of World.statics) {
        if (st.kind === "house") punch(st.tx * TILE + 8, (st.ty - 1.5) * TILE, 46, 0.7);
      }
      for (const c of Entities.critters) {
        if (c.type === "firefly") punch(c.x, c.y, 12, 0.55 + 0.3 * Math.sin(c.phase * 3));
      }
      punch(Entities.player.x, Entities.player.y - 8, 26, 0.5); // soft personal glow
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lightCv, 0, 0, cv.width, cv.height);
    ctx.restore();
    // warm additive glow at dusk
    const h = S.minutes / 60;
    if (h > 16.8 && h < 19.6) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = `rgba(255,140,60,${0.12 * Math.sin((h - 16.8) / 2.8 * Math.PI)})`;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.restore();
    }
  }

  // ---------------- sprites for statics ----------------
  // crop status: sparkle when ready, droplet when thirsty
  function drawCropOverlay(c, wet, px, py) {
    if (c.s >= 3) {
      const a = 0.45 + 0.45 * Math.sin(S.animT * 4 + px * 0.7);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#fff6b0";
      const alt = ((S.animT * 2 + px) | 0) % 2 === 0;
      const sx = alt ? px + 1 : px + 13, sy = alt ? py - 5 : py - 7;
      ctx.fillRect(sx, sy, 1, 3);
      ctx.fillRect(sx - 1, sy + 1, 3, 1);
      ctx.globalAlpha = 1;
    } else if (!wet && season() !== "winter" && CROPS[c.k] && CROPS[c.k].seasons.includes(season())) {
      const a = 0.5 + 0.4 * Math.sin(S.animT * 3 + px * 0.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#4a9ad0";
      ctx.fillRect(px + 12, py - 6, 2, 3);
      ctx.fillStyle = "#a8dcf4";
      ctx.fillRect(px + 12, py - 5, 1, 1);
      ctx.globalAlpha = 1;
    }
  }

  // rounded rect helper
  function rr(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  // floating "E / SPACE — action" bubble over the current target
  function drawPromptBubble() {
    const t = S.hintTarget;
    if (!t || S.mode !== "play" || Entities.player.fishing) return;
    const label = t.label || "";
    const bob = Math.sin(S.animT * 3.5) * 1.5;
    ctx.font = '700 7px "Pixelify Sans", monospace';
    const tw = ctx.measureText(label).width;
    const kw = t.key === "SPACE" ? 17 : 9;
    const gap = 3, pad = 4;
    const w = Math.ceil(kw + gap + tw + pad * 2), h = 13;
    let x = Math.round(t.x - w / 2), y = Math.round(t.y - h - 2 + bob);
    // keep on screen
    if (x < S.cam.x + 2) x = S.cam.x + 2;
    if (x + w > S.cam.x + cv.width - 2) x = S.cam.x + cv.width - 2 - w;
    if (y < S.cam.y + 2) y = S.cam.y + 2;
    ctx.globalAlpha = 0.95;
    // little tail
    ctx.fillStyle = "#2b2233";
    ctx.fillRect(Math.round(t.x) - 1, y + h, 3, 2);
    rr(x, y, w, h, 3.5, "#fff8ec", "#2b2233");
    rr(x + pad, y + 2.5, kw, 8, 2, "#2b2233");
    ctx.fillStyle = "#ffd98a";
    ctx.font = '700 6px "Pixelify Sans", monospace';
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t.key || "E", x + pad + kw / 2, y + 7);
    ctx.fillStyle = "#33283f";
    ctx.font = '700 7px "Pixelify Sans", monospace';
    ctx.textAlign = "left";
    ctx.fillText(label, x + pad + kw + gap, y + 7);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 1;
  }

  // bouncing envelope over the mailbox when mail has arrived
  function drawMailFlag() {
    if (!S.mailReady || !S.mailboxSt) return;
    const st = S.mailboxSt;
    const bob = Math.round(Math.abs(Math.sin(S.animT * 3)) * -3);
    const img = SPR.icons.mail;
    ctx.drawImage(img, st.tx * TILE + 8 - 7, st.ty * TILE - 14 + bob, 14, 14);
    if (((S.animT * 1.5) | 0) % 2 === 0) {
      ctx.fillStyle = "#ffd94a";
      ctx.fillRect(st.tx * TILE + 13, st.ty * TILE - 16 + bob, 2, 2);
    }
  }

  // ---------------- minimap ----------------
  function minimapInit() {
    const [base, bx] = Sprites.mk(World.W, World.H);
    const COLS = {
      0: "#79b85e", // grass
      1: "#d8b078", // path
      2: "#c2c2cc", // stone
      3: "#e8d8a8", // sand
      4: "#4a94d0", // water
      5: "#7cc8e4", // paddy
      6: "#b08a5a", // plank
      7: "#8a8a70", // rail
    };
    for (let y = 0; y < World.H; y++) for (let x = 0; x < World.W; x++) {
      bx.fillStyle = COLS[World.ground[World.idx(x, y)]] || "#79b85e";
      bx.fillRect(x, y, 1, 1);
    }
    // statics baked in
    for (const st of World.statics) {
      let col = null;
      switch (st.kind) {
        case "tree": case "pine": case "bamboo": case "treeBig": case "bush": col = "#3f8f44"; break;
        case "house": col = st.v === "shop" ? "#d98a7a" : st.v === "station" ? "#7aa8c8" : "#f2e4c8"; break;
        case "shrine": case "torii": col = "#e05a50"; break;
        case "onsen": col = "#7cc0d8"; break;
        case "vending": col = "#d04848"; break;
        case "well": col = "#8ab8d8"; break;
        case "lamp": case "lanternStone": col = "#ffe08a"; break;
        default: continue;
      }
      bx.fillStyle = col;
      bx.fillRect(st.tx, st.ty, 1, 1);
    }
    // points of interest (home / shop / shrine / onsen / station)
    const pois = [
      [30, 19, "#ffd94a"], // home
      [57, 18, "#ff9fb0"], // shop
      [95, 10, "#ff5a5a"], // shrine
      [101, 73, "#7ce0f4"], // onsen
      [61, 9, "#8ad0e8"], // station
    ];
    for (const [px2, py2, col] of pois) {
      bx.fillStyle = "rgba(30,20,40,0.55)";
      bx.fillRect(px2 - 1, py2 - 1, 3, 3);
      bx.fillStyle = col;
      bx.fillRect(px2 - 1, py2 - 1, 3, 3);
      bx.fillStyle = "rgba(255,255,255,0.85)";
      bx.fillRect(px2, py2 - 1, 1, 1);
    }
    S.mmBase = base;
    drawMinimap();
  }
  function drawMinimap() {
    if (!S.minimapOn || !S.mmBase) return;
    const mm = $("minimap");
    if (!mm || S.mode === "title") return;
    const mx = mm.getContext("2d");
    mx.imageSmoothingEnabled = false;
    // scale the 120×90 world to fill the whole minimap canvas (2×)
    mx.drawImage(S.mmBase, 0, 0, mm.width, mm.height);
    // npcs
    const MSC = mm.width / World.W; // minimap scale (2)
    for (const n of Entities.npcs) {
      if (!n.visible) continue;
      const nx = (n.x / TILE) * MSC, ny = (n.y / TILE) * MSC;
      mx.fillStyle = "#33283f";
      mx.fillRect(nx - 3, ny - 3, 7, 7);
      mx.fillStyle = "#ffd94a";
      mx.fillRect(nx - 1.5, ny - 1.5, 4, 4);
    }
    // train!
    if (S.train.active) {
      mx.fillStyle = "#ff5a6e";
      const txm = Math.max(0, (S.train.x / TILE) * MSC);
      mx.fillRect(txm - 6, 5 * MSC, 10, 3);
    }
    // player (blinking)
    const p = Entities.player;
    const blink = ((S.animT * 3) | 0) % 2 === 0;
    const ppx = (p.x / TILE) * MSC, ppy = (p.y / TILE) * MSC;
    mx.fillStyle = blink ? "#ffffff" : "#ffe8f0";
    mx.fillRect(ppx - 3, ppy - 3, 6, 6);
    mx.strokeStyle = "#33283f";
    mx.lineWidth = 1.5;
    mx.strokeRect(ppx - 3.75, ppy - 3.75, 7.5, 7.5);
  }
  function spriteForStatic(st, se, night) {
    switch (st.kind) {
      case "tree": return SPR.tree[se];
      case "pine": return SPR.pine[se === "winter" ? "snowy" : "normal"];
      case "bamboo": return SPR.bambooTree;
      case "treeBig": return SPR.sacredTree;
      case "bush": return SPR.bush[se];
      case "tallgrass": return SPR.tallgrass[se];
      case "flower": { const arr = SPR.flowers[se]; return arr[st.v % arr.length]; }
      case "rock": return SPR.rock[st.v % 3];
      case "house": {
        const map = { player: SPR.housePlayer, small: SPR.houseSmall, yuki: SPR.houseYuki, shop: SPR.shop, station: SPR.station };
        const h = map[st.v] || SPR.houseSmall;
        return night ? h.lit : h.day;
      }
      case "shrine": return SPR.shrine;
      case "torii": return SPR.torii;
      case "lanternStone": return night ? SPR.lanternStone.lit : SPR.lanternStone.day;
      case "lamp": return night ? SPR.lamp.lit : SPR.lamp.day;
      case "vending": return night ? SPR.vending.lit : SPR.vending.day;
      case "well": return SPR.well;
      case "mailbox": return SPR.mailbox;
      case "bench": return SPR.bench;
      case "sign": return SPR.sign;
      case "scarecrow": return SPR.scarecrow;
      case "fenceH": return SPR.fenceH;
      case "fenceV": return SPR.fenceV;
      case "post": return SPR.fenceV;
      case "bellStand": return SPR.bellStand;
      case "offerBox": return SPR.offerBox;
      case "busStop": return SPR.busStop;
      case "onsen": return SPR.onsen;
      case "noren": return SPR.noren;
      case "rockBig": return SPR.rock[2];
      default: return SPR.rock[0];
    }
  }

  // ---------------- render ----------------
  function drawShadow(x, y, w) {
    ctx.fillStyle = "rgba(20,16,28,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function charFrame(frames, dir, moving, animT) {
    const f = moving ? (((animT * 6) | 0) % 2) : 0;
    if (dir === "down") return f ? frames.downB : frames.downA;
    if (dir === "up") return f ? frames.upB : frames.upA;
    if (dir === "right") return f ? frames.sideB : frames.sideA;
    if (dir === "left") return f ? frames.sideLB : frames.sideLA;
    return frames.downA;
  }

  function render() {
    const se = season(), night = lightsOn();
    const p = Entities.player;
    const vw = cv.width, vh = cv.height;

    // camera
    if (S.mode === "title") {
      S.titleCamT += 1 / 60;
      const spots = [[30, 19], [50, 24], [95, 12], [60, 8], [30, 72], [101, 73]];
      const t = S.titleCamT * 0.06;
      const a = spots[Math.floor(t) % spots.length], b = spots[(Math.floor(t) + 1) % spots.length];
      const tt = (t % 1);
      const ease = tt * tt * (3 - 2 * tt);
      S.cam.x = (a[0] + (b[0] - a[0]) * ease) * TILE - vw / 2;
      S.cam.y = (a[1] + (b[1] - a[1]) * ease) * TILE - vh / 2;
    } else {
      S.cam.x = p.x - vw / 2;
      S.cam.y = p.y - vh / 2 - 10;
    }
    S.cam.x = Math.max(0, Math.min(World.W * TILE - vw, S.cam.x));
    S.cam.y = Math.max(0, Math.min(World.H * TILE - vh, S.cam.y));
    const camX = Math.round(S.cam.x), camY = Math.round(S.cam.y);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = se === "winter" ? "#dfe8ec" : "#6aa84f";
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-camX, -camY);

    const x0 = Math.floor(camX / TILE) - 1, y0 = Math.floor(camY / TILE) - 1;
    const x1 = Math.ceil((camX + vw) / TILE) + 1, y1 = Math.ceil((camY + vh) / TILE) + 1;
    const se4 = se;

    // ---- ground pass ----
    const wf = ((S.animT * 2.2) | 0) % 3;
    const pf = ((S.animT * 1.5) | 0) % 2;
    const riceStage = se === "spring" ? 1 : se === "summer" ? 2 : se === "autumn" ? 3 : 0;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!World.inB(tx, ty)) continue;
        const i = World.idx(tx, ty);
        const g = World.ground[i];
        const px = tx * TILE, py = ty * TILE;
        switch (g) {
          case World.G.GRASS: ctx.drawImage(SPR.grass[se4][World.variant[i] % 4], px, py); break;
          case World.G.PATH: ctx.drawImage(SPR.path[(tx * 7 + ty * 13) % 2], px, py); break;
          case World.G.STONE: ctx.drawImage(SPR.stone[(tx * 5 + ty * 11) % 2], px, py); break;
          case World.G.SAND: ctx.drawImage(SPR.sand[(tx * 3 + ty * 7) % 2], px, py); break;
          case World.G.WATER: {
            ctx.drawImage(SPR.water.frames[wf], px, py);
            // animated shoreline foam where water meets land
            const ph = S.animT * 1.8 + tx * 0.9 + ty * 1.4;
            const fa = (0.10 + 0.08 * Math.sin(ph)).toFixed(3);
            ctx.fillStyle = `rgba(235,248,255,${fa})`;
            const glint = "rgba(255,255,255,0.35)";
            if (World.getG(tx, ty - 1) !== World.G.WATER) {
              ctx.fillRect(px, py, TILE, 1);
              ctx.fillStyle = glint;
              ctx.fillRect(px + (((S.animT * 7 + tx * 5) | 0) % 12), py, 4, 1);
              ctx.fillStyle = `rgba(235,248,255,${fa})`;
            }
            if (World.getG(tx, ty + 1) !== World.G.WATER) ctx.fillRect(px, py + 15, TILE, 1);
            if (World.getG(tx - 1, ty) !== World.G.WATER) ctx.fillRect(px, py, 1, TILE);
            if (World.getG(tx + 1, ty) !== World.G.WATER) ctx.fillRect(px + 15, py, 1, TILE);
            break;
          }
          case World.G.PADDY:
            ctx.drawImage(SPR.paddy.frames[pf], px, py);
            if (riceStage > 0) ctx.drawImage(SPR.rice[riceStage], px, py - 4);
            break;
          case World.G.PLANK: ctx.drawImage(SPR.plank, px, py); break;
          case World.G.RAIL: ctx.drawImage(SPR.rail, px, py); break;
        }
        // farm soil
        const f = farm.get(tkey(tx, ty));
        if (f) {
          ctx.drawImage(f.w ? SPR.soilWet : SPR.soilDry, px, py);
          if (f.c) drawCropOverlay(f.c, f.w, px, py);
        }
      }
    }

    // ---- drifting cloud shadows (clear daytime) ----
    if (S.weather === "clear" && !isNight()) {
      for (const c of CLOUDS) {
        if (c.x + c.r < camX - c.r * 2 || c.y < camY - c.r * 2 || c.y > camY + vh + c.r) continue;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(1.6, 0.8);
        const g2 = ctx.createRadialGradient(0, 0, c.r * 0.15, 0, 0, c.r);
        g2.addColorStop(0, "rgba(24,36,58,0.09)");
        g2.addColorStop(1, "rgba(24,36,58,0)");
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // forage + eggs (ground layer)
    for (const fo of [...Entities.forage, ...Entities.eggs]) {
      if (fo.x < camX - 16 || fo.x > camX + vw + 16 || fo.y < camY - 16 || fo.y > camY + vh + 16) continue;
      drawShadow(fo.x + 4, fo.y + 8, 4);
      ctx.drawImage(SPR.items[fo.id] || SPR.items.herb, fo.x - 4, fo.y - 8);
    }

    // ---- y-sort pass ----
    const drawables = [];
    for (const st of World.statics) {
      const wx = st.tx * TILE + 8, wy = st.ty * TILE + 16;
      if (wx < camX - 60 || wx > camX + vw + 60 || wy < camY - 120 || wy > camY + vh + 60) continue;
      drawables.push({ y: wy, kind: "static", st, wx, wy });
    }
    // crops
    for (const [k, f] of farm) {
      if (!f.c) continue;
      const [cx, cy] = k.split(",").map(Number);
      const wx = cx * TILE + 8, wy = cy * TILE + 16;
      if (wx < camX - 20 || wx > camX + vw + 20 || wy < camY - 20 || wy > camY + vh + 20) continue;
      drawables.push({ y: wy, kind: "crop", f, wx, wy });
    }
    // train
    if (S.train.active) drawables.push({ y: 5 * TILE + 26, kind: "train", wx: S.train.x, wy: 5 * TILE + 26 });
    // entities
    for (const n of Entities.npcs) if (n.visible) drawables.push({ y: n.y, kind: "npc", n, wx: n.x, wy: n.y });
    drawables.push({ y: p.y + 0.1, kind: "player", p, wx: p.x, wy: p.y });
    for (const a of Entities.animals) drawables.push({ y: a.y, kind: "animal", a, wx: a.x, wy: a.y });
    for (const c of Entities.critters) drawables.push({ y: c.y, kind: "critter", c, wx: c.x, wy: c.y });

    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) {
      const { wx, wy } = d;
      if (d.kind === "static") {
        const spr = spriteForStatic(d.st, se, night);
        let ox = 0;
        if (d.st.sway) ox = Math.round(Math.sin(S.animT * 0.9 + d.st.tx * 1.7) * 1.2);
        ctx.drawImage(spr, wx - spr.width / 2 + (d.st.dx || 0) + ox, wy - spr.height + (d.st.dy || 0));
      } else if (d.kind === "crop") {
        const spr = d.f.c.k === "rice" ? SPR.rice[d.f.c.s] : SPR.crops[d.f.c.k][d.f.c.s];
        ctx.drawImage(spr, wx - spr.width / 2, wy - spr.height);
      } else if (d.kind === "train") {
        const cars = 5;
        const tx0 = Math.round(d.wx);
        for (let i = 0; i < cars; i++) {
          const spr = i === 0 ? SPR.trainEngine : SPR.trainCar;
          ctx.drawImage(spr, tx0 - i * 64 - spr.width, wy - spr.height + 4);
        }
      } else if (d.kind === "npc") {
        const n = d.n;
        drawShadow(wx, wy, 7);
        const spr = charFrame(SPR.chars[n.id], n.dir, n.moving, n.animT);
        let bob = 0;
        if (n.act === "sweep" || n.act === "play") bob = Math.sin(S.animT * 4 + n.x) > 0 ? 0 : 1;
        ctx.drawImage(spr, Math.round(wx) - 8, Math.round(wy) - 21 - bob);
      } else if (d.kind === "player") {
        if (S.mode === "soak") continue;
        drawShadow(wx, wy, 7);
        const spr = charFrame(SPR.chars.player, p.dir, p.moving, p.animT);
        ctx.drawImage(spr, Math.round(wx) - 8, Math.round(wy) - 21);
        if (p.fishing) {
          // rod line + bobber
          const F = p.fishing;
          ctx.strokeStyle = "#e8e8ee"; ctx.lineWidth = 1;
          ctx.beginPath();
          const hx = p.dir === "left" ? p.x - 14 : p.x + 14;
          ctx.moveTo(hx, p.y - 14);
          ctx.lineTo(F.spot.x, F.spot.y);
          ctx.stroke();
          const dip = F.phase === "bite" ? 2 : 0;
          ctx.fillStyle = "#e04a4a";
          ctx.fillRect(F.spot.x - 1, F.spot.y - 3 + dip, 3, 3);
          ctx.fillStyle = "#fff";
          ctx.fillRect(F.spot.x - 1, F.spot.y - 4 + dip, 3, 1);
          if (F.phase === "bite") {
            // proper "! bubble" above the bobber
            const bob = Math.sin(S.animT * 10) * 1.5;
            const bx = Math.round(F.spot.x), by = Math.round(F.spot.y - 22 + bob);
            ctx.fillStyle = "#2b2233";
            ctx.fillRect(bx - 1, by + 11, 3, 2); // tail
            rr(bx - 7, by, 14, 12, 4, "#fff8ec", "#2b2233");
            ctx.fillStyle = "#d94a5a";
            ctx.fillRect(bx - 1, by + 2, 2, 6);
            ctx.fillRect(bx - 1, by + 9, 2, 2);
          }
        }
      } else if (d.kind === "animal") {
        const a = d.a;
        if (a.kind === "capybara") {
          ctx.drawImage(SPR.capybara, wx - 10, wy - 13 + Math.round(Math.sin(S.animT * 1.2) * 1));
          continue;
        }
        if (a.kind === "tanuki") {
          drawShadow(wx, wy, 7);
          ctx.drawImage(a.dir === "left" ? SPR.tanuki.standL : SPR.tanuki.stand, wx - 8, wy - 13);
          if (a.frozenT > 0) { ctx.fillStyle = "#fff"; ctx.fillRect(wx + 4, wy - 18, 8, 8); ctx.fillStyle = "#2b2233"; ctx.fillRect(wx + 7, wy - 16, 2, 4); ctx.fillRect(wx + 7, wy - 11, 2, 1); }
          continue;
        }
        if (a.kind === "shiba") {
          drawShadow(wx, wy, 7);
          const spr = a.moving ? (a.dir === "left" ? (charF(a) ? SPR.shiba.walkLB : SPR.shiba.walkLA) : (charF(a) ? SPR.shiba.walkB : SPR.shiba.walkA)) : SPR.shiba.sit;
          ctx.drawImage(spr, wx - 8, wy - 12);
        } else if (a.kind === "cat") {
          const set = SPR.cat[a.col];
          if (a.state === "sleep") { ctx.drawImage(set.sleep, wx - 6, wy - 6); }
          else if (a.moving) {
            const f2 = charF(a);
            const spr = a.dir === "left" ? (f2 ? set.walkLB : set.walkLA) : (f2 ? set.walkB : set.walkA);
            ctx.drawImage(spr, wx - 8, wy - 11);
          } else {
            ctx.drawImage(set.sit, wx - 6, wy - 13);
          }
        } else if (a.kind === "chicken") {
          const f2 = ((a.animT * 4) | 0) % 2;
          ctx.drawImage(SPR.chicken.frames[f2], wx - 6, wy - 10);
        }
      } else if (d.kind === "critter") {
        const c = d.c;
        if (c.type === "butterfly") {
          const f2 = ((c.phase * 6) | 0) % 2;
          const spr = SPR.bugs.butterfly[f2];
          ctx.drawImage(spr, wx - 5, wy - 8 + Math.sin(c.phase * 5) * 1.5);
        } else if (c.type === "cicada") {
          ctx.drawImage(SPR.bugs.cicada, wx - 6, wy - 4);
        } else if (c.type === "firefly") {
          ctx.drawImage(SPR.bugs.firefly, wx - 3, wy - 3);
        } else if (c.type === "cricket") {
          ctx.drawImage(SPR.bugs.cricket, wx - 3, wy - 3);
        } else if (c.type === "beetle") {
          ctx.drawImage(SPR.bugs.beetle, wx - 6, wy - 5 + Math.sin(c.phase * 2) * 0.5);
        }
      }
    }
    function charF(a) { return ((a.animT * 6) | 0) % 2; }

    // winter yuzu in onsen
    if (se === "winter") {
      ctx.fillStyle = "#ffc94a";
      for (const [yx, yy] of [[100.2, 72.4], [102.6, 73.6], [101.2, 74.6]]) {
        ctx.fillRect(yx * TILE, yy * TILE + Math.sin(S.animT + yx) * 1, 3, 3);
      }
    }
    // rainbow
    if (S.rainbow && S.minutes >= 420 && S.minutes <= 540) {
      const cx0 = 60 * TILE, cy0 = 63 * TILE;
      ctx.save();
      ctx.globalAlpha = 0.28;
      const cols = ["#e04a4a", "#ffa04a", "#ffd94a", "#6cc068", "#5ab0d8", "#8a6ac0"];
      for (let i = 0; i < cols.length; i++) {
        ctx.strokeStyle = cols[i]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx0, cy0, 150 - i * 3, Math.PI, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    // ---- particles ----
    for (const pt of Entities.particles) {
      const t2 = pt.life / pt.maxLife;
      const alpha = Math.max(0, 1 - t2);
      switch (pt.type) {
        case "petal": ctx.fillStyle = pt.col; ctx.globalAlpha = alpha; ctx.fillRect(pt.x, pt.y, 2, 2); ctx.fillRect(pt.x + 1, pt.y - 1, 1, 1); break;
        case "leaf": ctx.fillStyle = pt.col; ctx.globalAlpha = alpha; ctx.fillRect(pt.x, pt.y, 2, 1); ctx.fillRect(pt.x - 1, pt.y + 1, 2, 1); break;
        case "snow": ctx.fillStyle = pt.col || "#fff"; ctx.globalAlpha = Math.min(1, alpha * 2); ctx.fillRect(pt.x, pt.y, pt.size || 1, pt.size || 1); break;
        case "rain": ctx.fillStyle = "#9ac8e8"; ctx.globalAlpha = 0.55; ctx.fillRect(pt.x, pt.y, 1, 5); break;
        case "ripple": {
          const rp = t2 * 4 + 1;
          ctx.strokeStyle = `rgba(225,242,255,${(alpha * 0.5).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y, rp * 2, rp, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case "splash": case "drop": ctx.fillStyle = pt.col || "#7cc0ee"; ctx.globalAlpha = alpha; ctx.fillRect(pt.x, pt.y, 2, 2); break;
        case "dirt": ctx.fillStyle = pt.col || "#8a5a3a"; ctx.globalAlpha = alpha; ctx.fillRect(pt.x, pt.y, 2, 2); break;
        case "heart": {
          ctx.globalAlpha = alpha; const spr = SPR.items.heart;
          ctx.drawImage(spr, pt.x - 6, pt.y - 6, 8, 8); break;
        }
        case "sparkle": ctx.fillStyle = pt.col || "#fff6a8"; ctx.globalAlpha = alpha; ctx.fillRect(pt.x, pt.y, 2, 2); ctx.fillRect(pt.x - 1, pt.y, 1, 1); ctx.fillRect(pt.x + 2, pt.y + 1, 1, 1); break;
        case "steam": ctx.fillStyle = "#ffffff"; ctx.globalAlpha = alpha * 0.4; ctx.fillRect(pt.x - 2, pt.y - 2, 5, 5); ctx.fillRect(pt.x - 3, pt.y - 4, 3, 3); break;
        case "smoke": ctx.fillStyle = "#d8d8d8"; ctx.globalAlpha = alpha * 0.5; ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4); break;
        case "fw": ctx.fillStyle = pt.col; ctx.globalAlpha = alpha; ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2); break;
        case "zzz": ctx.fillStyle = "#fff"; ctx.globalAlpha = alpha; ctx.font = "8px monospace"; ctx.fillText("z", pt.x, pt.y); break;
      }
      ctx.globalAlpha = 1;
    }

    // ---- world-space UI overlays ----
    if (S.mode !== "title") {
      drawMailFlag();
      drawPromptBubble();
    }

    ctx.restore();

    // ---- lighting ----
    renderLighting();

    // ---- cozy screen framing: soft vignette (+ red pulse when exhausted) ----
    if (S.vg) { ctx.fillStyle = S.vg; ctx.fillRect(0, 0, cv.width, cv.height); }
    if (S.mode === "play" && Entities.player.energy <= 15 && S.rg) {
      ctx.save();
      ctx.globalAlpha = 0.10 + 0.06 * Math.sin(S.animT * 4);
      ctx.fillStyle = S.rg;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.restore();
    }
  }

  // ---------------- HUD ----------------
  const hudCache = {};
  function setTxt(id, txt) { if (hudCache[id] !== txt) { hudCache[id] = txt; $(id).textContent = txt; } }
  function hudSync() {
    const p = Entities.player;
    setTxt("hud-date", `${SEASON_EMOJI[season()]} ${cap1(season())} ${((S.day - 1) % 7) + 1} · Yr ${S.year}`);
    $("hud-date").title = `Day ${S.day} of Year ${S.year}` + (S.festivalToday ? ` · ${S.festivalToday.name}!` : "");
    setTxt("clock-tx", `${fmt2(hour())}:${fmt2(Math.floor(S.minutes % 60))}`);
    const ckey = isNight() ? "moon" : "sun";
    if (hudCache.cicon !== ckey) {
      hudCache.cicon = ckey;
      $("clock-ic").src = Sprites.iconURL(ckey);
    }
    // weather: pixel icons (moon at clear night)
    const wkey = S.weather === "clear" && isNight() ? "moon" : S.weather === "rain" ? "rain" : S.weather === "snow" ? "snow" : S.weather === "clear" ? "sun" : "cloud";
    if (hudCache.wicon !== wkey) {
      hudCache.wicon = wkey;
      $("hud-weather").innerHTML = `<img src="${Sprites.iconURL(wkey)}"><span>${wkey === "sun" ? "Sunny" : wkey === "moon" ? "Clear night" : cap1(wkey)}</span>`;
    }
    if (hudCache.coins !== p.coins) { hudCache.coins = p.coins; $("coin-amt").textContent = "" + p.coins; }
    const e = Math.round(p.energy);
    if (hudCache.energy !== e) {
      hudCache.energy = e;
      $("hud-energy-fill").style.width = Math.max(0, Math.min(100, e)) + "%";
      $("hud-energy").classList.toggle("low", e <= 25);
    }
    if (hudCache.can !== p.canCharges) {
      hudCache.can = p.canCharges;
      $("can-amt").textContent = `${p.canCharges}/${p.canMax}`;
    }
    $("hud-mail").classList.toggle("hidden", !S.mailReady);
  }

  const toolURLCache = {};
  function toolURL(key) {
    if (!toolURLCache[key]) toolURLCache[key] = SPR.tools[key].toDataURL();
    return toolURLCache[key];
  }

  function hotbarSync() {
    const p = Entities.player;
    const bar = $("hotbar");
    if (!bar.children.length) {
      const keys = ["1", "2", "3", "4", "5", "6"];
      TOOLS.forEach((t, i) => {
        const el = document.createElement("div");
        el.className = "slot"; el.dataset.tool = t;
        el.innerHTML = `<span class="key">${keys[i]}</span><img><span class="qty"></span><span class="label"></span>`;
        el.onclick = () => { p.tool = t; AudioSys.sfx.blip(); hotbarSync(); };
        bar.appendChild(el);
      });
    }
    for (const el of bar.children) {
      const t = el.dataset.tool;
      el.classList.toggle("active", p.tool === t);
      const img = el.querySelector("img");
      const qty = el.querySelector(".qty");
      let qtyTxt = "";
      if (t === "seed") {
        img.src = Sprites.itemIcon(p.seedType);
        el.querySelector(".label").textContent = Items[p.seedType].name;
        qtyTxt = "" + (p.inventory[p.seedType] || 0);
        el.classList.toggle("empty", !p.inventory[p.seedType]);
      } else if (t === "can") {
        img.src = toolURL("can");
        el.querySelector(".label").textContent = TOOL_NAMES[t];
        qtyTxt = "" + p.canCharges;
        el.classList.toggle("empty", p.canCharges <= 0);
      } else {
        img.src = toolURL(t);
        el.querySelector(".label").textContent = TOOL_NAMES[t];
        el.classList.remove("empty");
      }
      if (hudCache["qty_" + t] !== qtyTxt) { hudCache["qty_" + t] = qtyTxt; qty.textContent = qtyTxt; }
    }
  }

  function computeHint() {
    let target = null;
    const say = (html, tgt) => { setHint(html); S.hintTarget = tgt || null; };
    if (S.mode !== "play") { setHint(""); S.hintTarget = null; return; }
    const p = Entities.player;
    if (p.fishing) { say(p.fishing.phase === "bite" ? "<b>SPACE!</b> reel it in!!" : "fishing... <i>(Esc to stop)</i>"); return; }
    const npc = nearestNPC();
    if (npc) { say(`Talk to <b>${NPC_DATA[npc.id].name}</b>`, { x: npc.x, y: npc.y - 30, label: "Talk", key: "E" }); return; }
    const cap = Entities.animals.find(a => a.kind === "capybara");
    if (cap && Math.hypot(cap.x - p.x, cap.y - p.y) < 40) { say("Greet <b>Capy-san</b>", { x: cap.x, y: cap.y - 24, label: "Hello", key: "E" }); return; }
    const an = nearestAnimal();
    if (an) { say(`Pet ${an.kind === "shiba" ? "<b>Mame</b>" : an.kind === "tanuki" ? "...<b>?!</b>" : "the <b>cat</b>"}`, { x: an.x, y: an.y - 24, label: "Pet", key: "E" }); return; }
    if (forageNear()) { say("<b>Pick</b> it up!", { x: forageNear().x, y: forageNear().y - 16, label: "Pick", key: "E" }); return; }
    const ft = frontTile();
    const c = cropAt(ft);
    if (c && c.c && c.c.s >= 3) { say("Ready! <b>Harvest</b> ✨", { x: ft.x * TILE + 8, y: ft.y * TILE + 2, label: "Harvest", key: "E" }); return; }
    if (World.getG(ft.x, ft.y) === World.G.PADDY && season() === "autumn" && !Entities.dailyFlags.collectedPaddy) { say("<b>Gather</b> golden rice", { x: ft.x * TILE + 8, y: ft.y * TILE + 2, label: "Gather", key: "E" }); return; }
    const it = interactableAt();
    if (it) {
      const labels = {
        sign: ["Read", "E"], door: ["Enter", "E"], shop: ["Shop", "E"], vending: ["Buy snack", "E"],
        mailbox: ["Check mail", "E"], bell: ["Ring the bell", "E"], offer: ["Offer ¥100", "E"],
        well: ["Fill watering can", "E"], onsen: ["Soak ♥", "E"],
      };
      // shop closed → friendlier hint
      if (it.type === "shop") {
        const granny = Entities.npcs.find(n => n.id === "granny");
        const open = granny && granny.act === "shop" && granny.visible;
        if (!open) {
          const t = Math.ceil((540 - S.minutes) / 60);
          say(t > 0 ? `<i>Granny's opens at 9:00</i> (${t}h)` : `<i>The shop closed at 18:00...</i>`);
          return;
        }
      }
      const L = labels[it.type] || ["Use", "E"];
      say(`${L[0]}`, { x: it.x * TILE + ((it.w || 1) * TILE) / 2, y: it.y * TILE + 6, label: L[0], key: "E" });
      return;
    }
    // tool hints
    if (p.tool === "rod") {
      const [dx, dy] = DIRV[p.dir] || [0, 1];
      for (let i = 1; i <= 3; i++) {
        const tx = Math.floor((p.x + dx * i * TILE) / TILE), ty = Math.floor((p.y + dy * i * TILE + 4) / TILE);
        if (World.getG(tx, ty) === World.G.WATER) { say("<b>Cast</b> your line", { x: tx * TILE + 8, y: ty * TILE + 10, label: "Cast", key: "SPACE" }); return; }
      }
      say(`<i>Face the water to fish</i>`);
      return;
    }
    if (p.tool === "hoe") { say("<b>Till</b> the soil", null); return; }
    if (p.tool === "can") {
      if (p.canCharges <= 0) { say(`Can is empty — stand by water & <b>SPACE</b>, or use the well`, null); return; }
      say(`<b>Water</b> your crops (${p.canCharges})`, null); return;
    }
    if (p.tool === "seed") {
      const n = p.inventory[p.seedType] || 0;
      say(n ? `<b>Plant</b> ${Items[p.seedType].name} ×${n} · <b>Q</b> switch` : `No seeds! Buy some at <b>Granny's</b>`, null);
      return;
    }
    if (p.tool === "net") { say("<b>Swing</b> at bugs with <b>SPACE</b>", null); return; }
    say("", null);
  }
  function setHint(h) {
    if (hudCache.hint === h) return;
    hudCache.hint = h;
    const el = $("hint");
    if (!h) { el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    el.innerHTML = h;
  }

  // ---------------- Dialog (DOM) ----------------
  const Dialog = {
    cur: null,
    fullText: "",
    typer: null,
    open(o) {
      this.cur = o;
      S.mode = "dialog";
      const el = $("dialog");
      el.classList.remove("hidden");
      $("dlg-name").textContent = o.name || "";
      // typewriter reveal
      this.fullText = o.text || "";
      const txtEl = $("dlg-text");
      txtEl.textContent = "";
      clearInterval(this.typer); this.typer = null;
      let ix = 0;
      const more = $("dlg-more");
      more.style.display = "none";
      this.typer = setInterval(() => {
        ix = Math.min(this.fullText.length, ix + 2);
        txtEl.textContent = this.fullText.slice(0, ix);
        if (ix >= this.fullText.length) { clearInterval(this.typer); this.typer = null; more.style.display = o.choices ? "none" : "block"; }
      }, 16);
      const port = $("dlg-portrait"), pctx = port.getContext("2d");
      pctx.imageSmoothingEnabled = false;
      pctx.clearRect(0, 0, 24, 24);
      let pspr = null;
      if (o.npc && SPR.portraits[o.npc]) pspr = SPR.portraits[o.npc];
      if (pspr) pctx.drawImage(pspr, 0, 0, 24, 24);
      else { pctx.fillStyle = "#ffd9e0"; pctx.fillRect(0, 0, 24, 24); pctx.font = "10px monospace"; pctx.fillStyle = "#a04a5a"; pctx.textAlign = "center"; pctx.fillText("?" , 12, 15); }
      // hearts row
      const heartsEl = $("dlg-hearts");
      heartsEl.innerHTML = "";
      if (o.npc && Entities.hearts[o.npc] !== undefined) {
        const h = Entities.hearts[o.npc];
        let html = "";
        for (let i = 0; i < 5; i++) {
          const v = h - i * 2;
          if (v >= 2) html += `<span class="hf">♥</span>`;
          else if (v === 1) html += `<span class="hf">♡</span>`;
          else html += `<span class="he">♡</span>`;
        }
        if (h >= 10) html += ` <span class="hf" style="font-size:12px;letter-spacing:1px">MAX!</span>`;
        heartsEl.innerHTML = html;
      }
      const ch = $("dlg-choices");
      ch.innerHTML = "";
      if (o.choices) {
        o.choices.forEach((c, i) => {
          const b = document.createElement("button");
          b.className = "choice"; b.textContent = `${i + 1}. ${c.label}`;
          b.onclick = (e) => { e.stopPropagation(); this.pick(i); };
          ch.appendChild(b);
        });
      }
      AudioSys.sfx.blip();
    },
    pick(i) {
      const o = this.cur;
      if (!o || !o.choices || !o.choices[i]) return;
      this.close();
      o.choices[i].fn();
    },
    advance() {
      const o = this.cur;
      if (!o) return;
      // still typing? first press completes the line
      if (this.typer) {
        clearInterval(this.typer); this.typer = null;
        $("dlg-text").textContent = this.fullText;
        $("dlg-more").style.display = o.choices ? "none" : "block";
        return;
      }
      if (o.choices) return;
      this.close();
      if (o.onDone) o.onDone();
    },
    close() {
      clearInterval(this.typer); this.typer = null;
      this.cur = null;
      $("dialog").classList.add("hidden");
      if (S.mode === "dialog") S.mode = "play";
    },
  };
  $("dialog").addEventListener("click", () => Dialog.advance());

  // ---------------- Panel (DOM) ----------------
  const Panel = {
    _prev: "play",
    open(title, html) {
      if (S.mode !== "panel") this._prev = S.mode;
      S.mode = "panel";
      $("panel-title").textContent = title;
      $("panel-content").innerHTML = html;
      $("panel").classList.remove("hidden");
      $("dialog").classList.add("hidden");
      AudioSys.sfx.blip();
    },
    close() {
      $("panel").classList.add("hidden");
      if (S.mode === "panel") S.mode = this._prev === "title" ? "title" : "play";
      shopRenderBuy = null; shopRenderSell = null;
    },
  };
  $("panel-close").onclick = () => Panel.close();

  function openHelp() {
    Panel.open("How to Play 🌾", `
      <div class="help-cols">
        <div>
          <div class="help-sect">CONTROLS</div>
          <table class="help-table">
            <tr><td><kbd>WASD</kbd> / <kbd>←↑↓→</kbd></td><td>walk (hold <kbd>Shift</kbd> to hurry)</td></tr>
            <tr><td><kbd>E</kbd> / <kbd>Enter</kbd></td><td>talk · pet · pick up · harvest · use things</td></tr>
            <tr><td><kbd>SPACE</kbd></td><td>use current tool (hold to keep working)</td></tr>
            <tr><td><kbd>1</kbd>–<kbd>6</kbd></td><td>hands · hoe · can · seeds · net · rod</td></tr>
            <tr><td><kbd>Q</kbd></td><td>switch seed type</td></tr>
            <tr><td><kbd>I</kbd></td><td>pocket — eat snacks, admire loot</td></tr>
            <tr><td><kbd>J</kbd></td><td>journal — goals, friends, your story so far</td></tr>
            <tr><td><kbd>TAB</kbd></td><td>show / hide the map</td></tr>
            <tr><td><kbd>M</kbd></td><td>music on/off &nbsp;·&nbsp; <kbd>Esc</kbd> close / cancel</td></tr>
          </table>
        </div>
        <div>
          <div class="help-sect">A DAY IN INAKA-MURA</div>
          <table class="help-table">
            <tr><td>🌱</td><td>Till grass in <b>your field</b> (south, over the bridge) → plant → water daily → harvest. Rain waters for you!</td></tr>
            <tr><td>🎣</td><td>Face the river with the rod, cast, hit <kbd>SPACE</kbd> when the <b style="color:#ff5a6e">!</b> appears.</td></tr>
            <tr><td>🦋</td><td>Swing the net at butterflies, beetles, summer fireflies...</td></tr>
            <tr><td>♡</td><td>Chat with villagers daily and gift their favorites — hearts unlock presents!</td></tr>
            <tr><td>✉</td><td>The red mailbox by your door brings quest letters most mornings.</td></tr>
            <tr><td>🔔</td><td>Ring the shrine bell between <b>4:30–7:00</b> for +25% prices all day.</td></tr>
            <tr><td>♨</td><td>The hot spring (far south-east) is a free full-energy soak.</td></tr>
            <tr><td>🛌</td><td>Sleep after 18:00 to save & start a fresh day. Naps help too.</td></tr>
          </table>
          <div class="help-tip">💡 Lost? Follow the dirt roads, check the <b>map</b> (<kbd>TAB</kbd>), or read the wooden signposts. The green <b>✿ First Steps</b> card guides your first day.</div>
        </div>
      </div>`);
  }

  // ---------------- journal ----------------
  function openJournal() {
    const p = Entities.player;
    Panel.open("📖 Village Journal", `<div class="j-tabs">
        <button class="j-tab active" id="j-tab-today">☀ Today</button>
        <button class="j-tab" id="j-tab-friends">♡ Friends</button>
        <button class="j-tab" id="j-tab-log">📚 Log</button>
      </div><div id="j-body"></div>`);
    const body = $("j-body");
    const heartRow = (id) => {
      const h = Entities.hearts[id] || 0;
      let html = "";
      for (let i = 0; i < 5; i++) html += h >= (i + 1) * 2 ? `<span class="hf">♥</span>` : h === i * 2 + 1 ? `<span class="hf">♡</span>` : `<span class="he">♡</span>`;
      return html;
    };
    const likedNames = (id) => Object.entries(NPC_DATA[id].likes).filter(([, v]) => v >= 2).map(([k]) => Items[k].name).join(" · ");
    const renderToday = () => {
      const doy = ((S.day - 1) % 28) + 1;
      let fest = "—";
      let best = null;
      for (const [d, f] of Object.entries(FESTIVALS)) {
        const dd = +d;
        if (!best || dd < best[0]) best = [dd, f];
      }
      if (S.festivalToday) fest = `🎉 ${S.festivalToday.name} — TODAY!`;
      else {
        const upcoming = Object.entries(FESTIVALS).map(([d, f]) => [+d, f]).filter(([d]) => d > doy).sort((a, b) => a[0] - b[0])[0];
        fest = upcoming ? `${upcoming[1].name} in ${upcoming[0] - doy} day${upcoming[0] - doy > 1 ? "s" : ""}` : `${best[1].name} next year`;
      }
      let qhtml = `<span class="muted">No quest right now — check the mailbox tomorrow morning ✉</span>`;
      if (S.quest) {
        const have = Math.min(Entities.countItem(S.quest.def.item), S.quest.def.n);
        qhtml = `<div class="j-row"><img src="${Sprites.itemIcon(S.quest.def.item)}"><span class="grow">${S.quest.def.title}<br><span class="sub">Bring ${S.quest.def.n} × ${Items[S.quest.def.item].name} to ${NPC_DATA[S.quest.def.giver].name}</span></span><b>${have}/${S.quest.def.n}</b></div>`;
      }
      body.innerHTML = `
        <div class="j-card"><h4>☀ TODAY · ${SEASON_JP[season()]} ${cap1(season())} ${((S.day - 1) % 7) + 1}</h4>
          Year ${S.year}, day ${doy}/28 · ${S.weather === "clear" ? (isNight() ? "Clear night" : "Sunny") : cap1(S.weather)}<br>
          ${fest}${S.luck ? " · <b style='color:#e0a030'>✦ Dawn blessing (+25% sells)</b>" : ""}<br>
          <span class="muted">Energy: eat snacks 🍡, nap at home, or soak in the onsen ♨</span></div>
        <div class="j-card"><h4>✉ CURRENT QUEST</h4>${qhtml}</div>`;
    };
    const renderFriends = () => {
      const cards = ["granny", "grandpa", "yuki"].map(id => `
        <div class="friend-card">
          <img src="${SPR.portraits[id].toDataURL()}">
          <div class="fname">${NPC_DATA[id].name}</div>
          <div class="hearts">${heartRow(id)}</div>
          <div class="likes">loves: ${likedNames(id)}</div>
        </div>`).join("") + `
        <div class="friend-card">
          <div style="font-size:40px">♨️</div>
          <div class="fname">Capy-san</div>
          <div class="hearts">${"♥".repeat(Math.min(3, Entities.hearts.capy || 0)) || "…"}</div>
          <div class="likes">loves: quiet steam</div>
        </div>`;
      body.innerHTML = `<div class="friend-grid">${cards}</div>
        <div class="muted" style="margin-top:10px;font-size:14px">Talk daily (+1 ♡) and gift favorites (+2 ♡♥). Max hearts unlocks a special present!</div>`;
    };
    const renderLog = () => {
      const st = p.stats;
      const count = o => Object.values(o).reduce((a, b) => a + b, 0);
      const listFor = (obj, names) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, n]) =>
        `<div class="j-row"><img src="${Sprites.itemIcon(k)}"><span class="grow">${(Items[k] && Items[k].name) || k}</span><b>×${n}</b></div>`).join("") || `<div class="muted">None yet...</div>`;
      body.innerHTML = `
        <div class="stat-strip">
          <span class="stat-pill">💰 earned <b>¥${st.earned}</b></span>
          <span class="stat-pill">🎁 gifts given <b>${st.gifts}</b></span>
          <span class="stat-pill">🛏 naps <b>${st.naps}</b></span>
          <span class="stat-pill">📅 days lived <b>${S.day}</b></span>
        </div>
        <div class="j-card" style="margin-top:12px"><h4>🌾 CROPS HARVESTED (${count(st.crops)})</h4>${listFor(st.crops)}</div>
        <div class="j-card"><h4>🐟 FISH CAUGHT (${count(st.fish)})</h4>${listFor(st.fish)}</div>
        <div class="j-card"><h4>🦋 BUGS CAUGHT (${count(st.bugs)})</h4>${listFor(st.bugs)}</div>`;
    };
    $("j-tab-today").onclick = () => { setJTab("j-tab-today"); renderToday(); };
    $("j-tab-friends").onclick = () => { setJTab("j-tab-friends"); renderFriends(); };
    $("j-tab-log").onclick = () => { setJTab("j-tab-log"); renderLog(); };
    const setJTab = (id) => { for (const el of document.querySelectorAll(".j-tab")) el.classList.toggle("active", el.id === id); };
    renderToday();
  }

  // ---------------- save / load ----------------
  function saveGame() {
    try {
      const data = {
        v: 2, day: S.day, year: S.year, minutes: S.minutes, weather: S.weather, luck: S.luck,
        napUsed: S.napUsed,
        farm: [...farm.entries()], quest: S.quest, questDone: S.questDone,
        mailReady: S.mailReady, mailSeenDay: S.mailSeenDay,
        tutStep: S.tutStep, tutDone: S.tutDone, met: S.met,
        ent: Entities.serialize(),
      };
      localStorage.setItem("inaka_save_v1", JSON.stringify(data));
    } catch (e) { }
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem("inaka_save_v1");
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d.v !== 1 && d.v !== 2) return false;
      S.day = d.day; S.year = d.year || 1; S.minutes = d.minutes; S.weather = d.weather; S.luck = d.luck;
      farm.clear();
      for (const [k, v] of d.farm) farm.set(k, v);
      S.quest = d.quest; S.questDone = d.questDone || [];
      S.mailReady = d.mailReady; S.mailSeenDay = d.mailSeenDay || 0;
      S.tutStep = d.tutStep ?? TUTS.length; S.tutDone = d.tutDone ?? true;
      S.met = d.met || {};
      S.napUsed = !!d.napUsed;
      Entities.load(d.ent);
      S.festivalToday = festivalToday();
      S.train.times = [540 + Math.random() * 40, 750 + Math.random() * 40, 1020 + Math.random() * 40];
      return true;
    } catch (e) { return false; }
  }
  window.addEventListener("beforeunload", () => { if (S.mode !== "title") saveGame(); });

  // ---------------- update ----------------
  function updatePlayer(dt) {
    const p = Entities.player;
    if (S.mode !== "play" || p.fishing) { p.moving = false; return; }
    let dx = 0, dy = 0;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    p.moving = !!(dx || dy);
    if (!p.moving) return;
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? "right" : "left";
    else p.dir = dy > 0 ? "down" : "up";
    let speed = p.speed * (keys["shift"] ? 1.45 : 1) * (p.energy <= 0 ? 0.55 : 1);
    tutAdvance("move");
    // little dust puffs while hurrying
    if (keys["shift"] && Math.random() < dt * 8) {
      Entities.addParticle("dirt", p.x - dx * 6, p.y + 4, { vx: -dx * 10, vy: -4, maxLife: 0.5, col: "#d8ccb0" });
    }
    // move axis by axis with collision (feet box 10x8)
    const tryMove = (nx, ny) => {
      const hw = 5, hh = 4;
      const pts = [[nx - hw, ny - hh], [nx + hw, ny - hh], [nx - hw, ny + hh], [nx + hw, ny + hh]];
      for (const [qx, qy] of pts) if (World.solidAtPx(qx, qy)) return false;
      return true;
    };
    const nx = p.x + dx * speed * dt;
    if (tryMove(nx, p.y)) p.x = nx;
    const ny = p.y + dy * speed * dt;
    if (tryMove(p.x, ny)) p.y = ny;
    p.x = Math.max(8, Math.min(World.W * TILE - 8, p.x));
    p.y = Math.max(8, Math.min(World.H * TILE - 8, p.y));
    p.animT += dt;
  }

  let lastCritterState = "";
  function update(dt) {
    S.animT += dt;
    const playing = S.mode === "play" || S.mode === "dialog" || S.mode === "panel" || S.mode === "soak";

    if (playing) {
      // time (only advances in play mode, not paused by dialog? keep flowing — cozy)
      S.minutes += dt * 2.4;
      if (S.minutes >= 1440) { doSleep(true); }
      // hold SPACE to keep hoeing / watering / planting
      const p0 = Entities.player;
      if (S.mode === "play" && keys[" "] && !p0.fishing && ["hoe", "can", "seed"].includes(p0.tool)) {
        S.spaceRep -= dt;
        if (S.spaceRep <= 0) { S.spaceRep = 0.34; useTool(); }
      } else S.spaceRep = 0;
      updatePlayer(dt);
      updateFishing(dt);
      const fc = festivalControl();
      Entities.updateNPCs(dt, S.minutes, fc ? ["granny", "grandpa", "yuki"] : null);
      Entities.updateAnimals(dt, currentState());
      Entities.updateCritters(dt, currentState());
      Entities.updateParticles(dt);
      updateAmbient(dt);
      updateTrain(dt);
      if (fc) updateFestival(dt);
      updateLocation();

      // cozy warnings
      if (S.mode === "play") {
        if (S.minutes >= 1320 && !S.warnLate) { S.warnLate = true; toast("It's getting late... bed is calling ♥", { cls: "gold" }); }
        if (S.minutes >= 1416 && !S.warnMidnight && !S.warnedLow) { S.warnMidnight = true; toast("You can barely keep your eyes open!", { cls: "bad" }); }
        if (p0.energy <= 15 && !S.warnedLow) { S.warnedLow = true; toast("Low energy! Eat a snack, nap, or visit the onsen ♨", { cls: "bad" }); }
      }

      // critter respawn when time/season/weather changes
      const stKey = `${hour()>19||hour()<5?"n":"d"}|${season()}|${S.weather}`;
      if (stKey !== lastCritterState) { lastCritterState = stKey; Entities.spawnCritters(currentState()); }

      // audio env
      S.envTimer -= dt;
      if (S.envTimer <= 0) {
        S.envTimer = 0.6;
        const p = Entities.player;
        const ptx = p.x / TILE, pty = p.y / TILE;
        const riverProx = Math.max(0, 1 - Math.abs(pty - World.riverY(ptx)) / 8);
        const pondProx = Math.max(0, 1 - Math.hypot(ptx - 17, pty - 72) / 6);
        const onsenProx = Math.max(0, 1 - Math.hypot(ptx - 101.5, pty - 73.5) / 5);
        AudioSys.updateEnv({ rain: S.weather === "rain", snow: S.weather === "snow", night: isNight(), season: season(), waterProx: Math.max(riverProx, pondProx, onsenProx) });
        AudioSys.setMood({ season: season(), night: isNight(), festival: !!(S.festivalToday && S.festivalToday.type === "fireworks" && S.minutes >= 1140 && S.minutes <= 1260), rain: S.weather === "rain" });
      }
      // autosave
      S.saveTimer += dt;
      if (S.saveTimer > 180) { S.saveTimer = 0; saveGame(); saveFlash(); }
      drawMinimap();
      hudSync();
      computeHint();
    } else if (S.mode === "title") {
      Entities.updateParticles(dt);
      updateAmbient(dt);
      S.minutes = 16 * 60; // golden hour attract mode
    }
  }

  // ---------------- boot ----------------
  window.addEventListener("error", (e) => {
    const box = $("errbox");
    if (!box) return;
    box.classList.remove("hidden");
    box.textContent += (e.message || "error") + " @ " + (e.filename || "").split("/").pop() + ":" + e.lineno + "\n";
  });

  function buildEnergyIcon() {
    const c = $("energy-icon").getContext("2d");
    c.imageSmoothingEnabled = false;
    c.drawImage(SPR.icons.onigiri, 0, 0, 12, 12);
  }

  function startNew() {
    localStorage.removeItem("inaka_save_v1");
    S.day = 1; S.year = 1; S.minutes = 360; S.weather = "clear"; S.luck = false;
    S.quest = null; S.questDone = []; S.mailReady = true; S.mailSeenDay = 0;
    S.tutStep = 0; S.tutDone = false; S.met = {}; S.napUsed = false;
    S.warnLate = S.warnMidnight = S.warnedLow = false;
    farm.clear();
    Entities.reset();
    const p = Entities.player;
    p.x = 30.5 * TILE; p.y = 19.5 * TILE; p.dir = "down";
    p.energy = p.maxEnergy; p.coins = 500; p.tool = "hand";
    p.inventory = { rice_seed: 4, onigiri: 2 };
    p.hasGoldRod = false; p.hasBigCan = false; p.canMax = 8; p.canCharges = 8;
    p.stats = { fish: {}, bugs: {}, crops: {}, gifts: 0, earned: 0, naps: 0 };
    Entities.spawnMorning(season());
    Entities.spawnCritters(currentState());
    S.festivalToday = festivalToday();
    S.train.times = [540 + Math.random() * 40, 750 + Math.random() * 40, 1020 + Math.random() * 40];
    beginPlay(true);
  }
  function startContinue() {
    Entities.reset();
    if (!loadGame()) { startNew(); return; }
    Entities.spawnMorning(season());
    Entities.spawnCritters(currentState());
    beginPlay(false);
  }
  function beginPlay(isNew) {
    $("title").classList.add("hidden");
    $("hud").classList.remove("hidden");
    $("hotbar").classList.remove("hidden");
    $("minimap-wrap").classList.toggle("hidden", !S.minimapOn);
    S.mode = "play";
    S.locCur = "";
    hotbarSync(); hudSync(); questSync(); tutSync();
    AudioSys.init();
    AudioSys.sfx.confirm();
    toast(isNew ? "Welcome to Inaka-mura! ♥ Follow the green ✿ card" : "Welcome back! ☕", { cls: "good" });
    if (isNew) {
      setTimeout(() => Dialog.open({
        name: "A note in your pocket",
        text: "Granny says the field south of the river is yours now.\n\nTill it, plant it, water it — and come see her\nat the shop when you're lonely.\n\n✿ The green card shows your next step.\n(Open this again anytime with H)",
      }), 600);
    }
  }

  function boot() {
    Sprites.init();
    resize();
    World.gen();
    Entities.reset();
    Entities.spawnCritters({ minutes: 960, hour: 16, season: "spring", weather: "clear", night: false });
    buildEnergyIcon();
    // cozy patch UI wiring
    S.mailboxSt = World.statics.find(s => s.kind === "mailbox");
    minimapInit();
    if (!S.minimapOn) $("minimap-wrap").classList.add("hidden");
    $("coin-ic").src = Sprites.itemIcon("coin");
    $("hud-mute").classList.toggle("off", AudioSys.isMuted());
    $("hud-mute").onclick = () => { AudioSys.init(); const m = AudioSys.toggleMute(); $("hud-mute").classList.toggle("off", m); };
    $("hud-mail").onclick = () => { AudioSys.init(); toast("✉ A fresh letter waits in the red mailbox by your door!", { cls: "gold" }); };
    $("hud-helpbtn").onclick = () => { AudioSys.init(); openHelp(); };
    $("hud-bookbtn").onclick = () => { AudioSys.init(); openJournal(); };
    // title screen dressing
    $("mascot-l").src = SPR.chars.player.downA.toDataURL();
    $("mascot-r").src = SPR.shiba.sit.toDataURL();
    const petalsEl = $("petals");
    for (let i = 0; i < 16; i++) {
      const p2 = document.createElement("div");
      p2.className = "petal";
      p2.style.left = (Math.random() * 100) + "%";
      p2.style.animationDuration = (7 + Math.random() * 9) + "s";
      p2.style.animationDelay = (-Math.random() * 14) + "s";
      p2.style.opacity = (0.4 + Math.random() * 0.5).toFixed(2);
      petalsEl.appendChild(p2);
    }
    const hasSave = !!localStorage.getItem("inaka_save_v1");
    S.hasSave = hasSave;
    if (hasSave) $("btn-continue").classList.remove("hidden");
    $("btn-new").onclick = () => { AudioSys.init(); startNew(); };
    $("btn-continue").onclick = () => { AudioSys.init(); startContinue(); };
    $("btn-help").onclick = () => { AudioSys.init(); openHelp(); };
    S.mailReady = true; // first day mail (tutorial quest)
    // debug hooks
    window.G = {
      teleport: (tx, ty) => { const p = Entities.player; p.x = tx * TILE; p.y = ty * TILE; },
      coins: (n) => { Entities.player.coins += n; },
      time: (h, m) => { S.minutes = h * 60 + m; },
      day: (n) => { S.day = n; S.festivalToday = festivalToday(); },
      weather: (w) => { S.weather = w; },
      give: (id, n = 1) => { addItem(id, n, true); hotbarSync(); },
    };
    const url = new URL(window.location);
    if (url.searchParams.has("debug")) { startNew(); }

    let last = performance.now();
    function loop(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      update(dt);
      render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return { S, saveGame };
})();

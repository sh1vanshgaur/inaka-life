/* =========================================================================
   sprites2.js — characters, animals, critters, items, UI icons
   ========================================================================= */
"use strict";

(() => {

  const { build, buildFrames, flip, mk, px, pxl, ell } = Sprites;

  // ---------------------------------------------------------------------
  //  CHIBI CHARACTER TEMPLATE (16 x 22) — palette-swappable
  // ---------------------------------------------------------------------
  const HEAD_DOWN = [
    "....HHHHHHHH....",
    "...HHHHHHHHHH...",
    "..HHHHHHHHHHHH..",
    "..HHSSSSSSSSHH..",
    "..HSSSSSSSSSSH..",
    "..HSEESSSSEESH..",
    "..HSEESSSSEESH..",
    "..HBSSSSSSSSBH..",
    "...HSSSssSSSH...",
  ];
  const BODY_DOWN = [
    "....KKKKKKKK....",
    "...KKKKKKKKKK...",
    "..KKKKKKKKKKKK..",
    ".SKKKKOOOOKKKKS.",
    ".SKKKKOOOOKKKKS.",
    "..KKKKOOOOKKKK..",
    "..KKKKKKKKKKKK..",
    "...KKKKKKKKKK...",
  ];
  const LEGS_A = [
    "...PPPP..PPPP...",
    "...PPPP..PPPP...",
    "...PPPP..PPPP...",
    "...FFFF..FFFF...",
    "...FFFF..FFFF...",
  ];
  const LEGS_B = [
    "....PPPPPPPP....",
    "....PPPPPPPP....",
    "....PPP..PPP....",
    "....FFF..FFF....",
    "....FFF..FFF....",
  ];

  const HEAD_UP = [
    "....HHHHHHHH....",
    "...HHHHHHHHHH...",
    "..HHHHWWHHHHHH..",
    "..HHHHHHHHHHHH..",
    "..HHHHHHHHHHHH..",
    "..HHHHHHHHHHHH..",
    "..HHHHHHHHHHHH..",
    "..HHHHHHHHHHHH..",
    "...HHHHHHHHHH...",
  ];
  const BODY_UP = [
    "....KKKKKKKK....",
    "...KKKKKKKKKK...",
    "..KKKKKKKKKKKK..",
    ".SKKKKRRRRKKKKS.",
    ".SKKKRWWWWRKKKS.",
    "..KKKKRRRRKKKK..",
    "..KKKKKKKKKKKK..",
    "...KKKKKKKKKK...",
  ];

  const HEAD_SIDE = [
    "....HHHHHHHH....",
    "...HHHHHHHHHH...",
    "...HHHHHHHHHH...",
    "...HHHSSSSSS....",
    "..HHHHSSSSSSS...",
    "..HHHHSSEESSS...",
    "..HHHHSSEESSS...",
    "..HHHHSSSSSS....",
    "...HHHSSSSS.....",
  ];
  const BODY_SIDE = [
    "....KKKKKKKK....",
    "...KKKKKKKKKK...",
    "...KKKKKKKKKK...",
    "...KKKOOOOKKK...",
    "...KKKOOOOKKK...",
    "...KKKKKKKKKK...",
    "...KKKKKKKKKK...",
    "....KKKKKKKK....",
  ];
  const LEGS_SIDE_A = [
    "....PPP.PPP.....",
    "....PPP.PPP.....",
    "...PPP...PPP....",
    "...FFF...FFF....",
    "...FFF...FFF....",
  ];
  const LEGS_SIDE_B = [
    ".....PPPPP......",
    ".....PPPPP......",
    ".....FFFF.......",
    ".....FFFF.......",
    "................",
  ];

  function charSet(pal, opts = {}) {
    const H = opts.h || pal.H;
    const frames = {};
    frames.downA = build([...HEAD_DOWN, ...BODY_DOWN, ...LEGS_A], pal);
    frames.downB = build([...HEAD_DOWN, ...BODY_DOWN, ...LEGS_B], pal);
    frames.upA = build([...HEAD_UP, ...BODY_UP, ...LEGS_A], pal);
    frames.upB = build([...HEAD_UP, ...BODY_UP, ...LEGS_B], pal);
    frames.sideA = build([...HEAD_SIDE, ...BODY_SIDE, ...LEGS_SIDE_A], pal);
    frames.sideB = build([...HEAD_SIDE, ...BODY_SIDE, ...LEGS_SIDE_B], pal);
    frames.sideLA = flip(frames.sideA);
    frames.sideLB = flip(frames.sideB);

    // accessory overlays (applied to all frames)
    const list = Object.values(frames);
    for (const cv of list) {
      const x = cv.getContext("2d");
      if (opts.bun) { // granny hair bun
        ell(x, 8, 1, 3, 2, pal.H);
        px(x, 7, 0, 3, 1, pal.H); pxl(x, 8, 2, "#ffffff88");
      }
      if (opts.hat) { // grandpa straw hat
        px(x, 2, 2, 12, 2, "#d9b06a");
        px(x, 4, 0, 8, 2, "#e8c070");
        px(x, 4, 2, 8, 1, "#c9a055");
      }
      if (opts.beard) { // white beard under face
        px(x, 5, 8, 6, 2, "#e8e8ee");
        px(x, 6, 10, 4, 1, "#e8e8ee");
      }
      if (opts.apron) { // granny apron
        px(x, 5, 10, 6, 7, "#f5f0e0");
        px(x, 5, 10, 6, 1, "#d9d0b8");
        pxl(x, 6, 12, "#c9a86a");
      }
      if (opts.pigtails) { // yuki
        px(x, 1, 4, 2, 4, pal.H);
        px(x, 13, 4, 2, 4, pal.H);
        pxl(x, 1, 8, "#ff5a8a"); pxl(x, 14, 8, "#ff5a8a");
      }
      if (opts.ahoge) { // player hair antenna
        pxl(x, 8, -0 + 0, pal.H); px(x, 8, 0, 1, 1, pal.H); pxl(x, 9, 0, pal.H);
      }
      if (opts.glasses) {
        px(x, 4, 5, 3, 1, "#3a3a46"); px(x, 9, 5, 3, 1, "#3a3a46");
        px(x, 6, 5, 1, 1, "#3a3a46"); px(x, 9, 5, 1, 1, "#3a3a46");
        pxl(x, 8, 5, "#3a3a46");
      }
    }
    return frames;
  }

  const PLAYER_PAL = { H: "#6a4a32", S: "#ffdfc0", s: "#eec9a4", E: "#2b2233", B: "#ffb3ba", K: "#f5ead0", O: "#d94a5a", R: "#d94a5a", P: "#4a5a7a", F: "#3a2f3a", W: "#ffffff" };
  const GRANNY_PAL = { H: "#cfd4dc", S: "#ffdfc0", s: "#eec9a4", E: "#3a2f3a", B: "#ffb3ba", K: "#9a8ac0", O: "#5a4a7a", R: "#5a4a7a", P: "#6a5a7a", F: "#3a2f3a", W: "#f5f0e0" };
  const GRANDPA_PAL = { H: "#b8c0c8", S: "#eec9a4", s: "#dcb088", E: "#3a2f3a", B: "#ffb3ba", K: "#6a7a5a", O: "#4a5a3a", R: "#4a5a3a", P: "#5a5a4a", F: "#3a2f3a", W: "#e8e8ee" };
  const YUKI_PAL = { H: "#3a3040", S: "#ffdfc0", s: "#eec9a4", E: "#2b2233", B: "#ffb3ba", K: "#ffd9e0", O: "#ff9ec0", R: "#ff9ec0", P: "#ffdfc0", F: "#d94a5a", W: "#ffffff" };

  SPR.chars = {
    player: charSet(PLAYER_PAL, { ahoge: true }),
    granny: charSet(GRANNY_PAL, { bun: true, apron: true, glasses: true }),
    grandpa: charSet(GRANDPA_PAL, { hat: true, beard: true }),
    yuki: charSet(YUKI_PAL, { pigtails: true }),
  };

  // portrait = zoomed head crop
  function portrait(charCv) {
    const [c, x] = mk(24, 24);
    px(x, 0, 0, 24, 24, "#ffd9e0");
    px(x, 0, 21, 24, 3, "#f0b8c8");
    x.imageSmoothingEnabled = false;
    x.drawImage(charCv, 2, 0, 12, 10, 0, 2, 24, 20);
    return c;
  }
  SPR.portraits = {
    player: portrait(SPR.chars.player.downA),
    granny: portrait(SPR.chars.granny.downA),
    grandpa: portrait(SPR.chars.grandpa.downA),
    yuki: portrait(SPR.chars.yuki.downA),
  };

  // ---------------------------------------------------------------------
  //  CATS (cream / brown / gray, calico)
  // ---------------------------------------------------------------------
  const CAT_SIT = [
    ".FF......FF.",
    ".FnF....FnF.",
    ".FFFFFFFFFF.",
    ".FFFFFFFFFF.",
    ".FYYFFFFYYF.",
    ".FFFFFnFFFF.",
    "..FFFFnnFFF.",
    "..FFFFFFFF.T",
    ".FFFFFFFFFFT",
    ".FWFFFFFFFFT",
    ".FWFFFFFFFFT",
    ".FWFFFFFFFFT",
    "..FF....FF..",
  ];
  const CAT_WALK_A = [
    "........FF......",
    ".T......FF......",
    "TT.....FFFF.....",
    "T.....FFFFFF....",
    "......FFYYFF....",
    "......FFFFFFn...",
    ".FFFFFFFFFFF....",
    ".FFFFFFFFFFF....",
    ".FFFFFFFFFFF....",
    ".FF..FF..FF.....",
    ".FF..FF..FF.....",
  ];
  const CAT_WALK_B = [
    "........FF......",
    ".T......FF......",
    "TT.....FFFF.....",
    "T.....FFFFFF....",
    "......FFYYFF....",
    "......FFFFFFn...",
    ".FFFFFFFFFFF....",
    ".FFFFFFFFFFF....",
    ".FFFFFFFFFFF....",
    "....FFF.FF......",
    "....FFF.FF......",
  ];
  const CAT_SLEEP = [
    ".FF......FF.",
    ".FFFFFFFFFF.",
    ".FFFFFFFFFF.",
    ".FFFFFFFFFF.",
    "..FFFFFFFF..",
    "..FFFFFFFF..",
  ];
  const CAT_PALS = {
    cream: { F: "#f5e8d0", W: "#ffffff", T: "#e8d5b8", Y: "#3a2f3a", n: "#ff9ec0" },
    brown: { F: "#c98a4a", W: "#f5e8d0", T: "#b87a3e", Y: "#2b2233", n: "#ff9ec0" },
    gray: { F: "#9aa0a8", W: "#e8e8ee", T: "#8a9098", Y: "#2b2233", n: "#ff9ec0" },
  };
  SPR.cat = {};
  for (const [name, pal] of Object.entries(CAT_PALS)) {
    SPR.cat[name] = {
      sit: build(CAT_SIT, pal),
      walkA: build(CAT_WALK_A, pal), walkB: build(CAT_WALK_B, pal),
      walkLA: flip(build(CAT_WALK_A, pal)), walkLB: flip(build(CAT_WALK_B, pal)),
      sleep: build(CAT_SLEEP, pal),
    };
  }

  // ---------------------------------------------------------------------
  //  SHIBA / CHICKEN / TANUKI / CAPYBARA
  // ---------------------------------------------------------------------
  const SHIBA_PAL = { F: "#e8964a", W: "#fff4e0", T: "#e8964a", E: "#2b2233", n: "#2b2233" };
  const SHIBA_A = [
    ".FF.........TTT.",
    ".FF.........TT..",
    ".FFFF......TTT..",
    ".FFFFFF....TTT..",
    "EFFEFFF....TT...",
    "nFFFFFF....TT...",
    "FFFFFFFFFFFFFF..",
    "FWFFFFFFFFFFFF..",
    "FWFFFFFFFFFFFF..",
    "FWFFFFFFFFFFFF..",
    "FFF..FFF..FFF...",
    "FFF..FFF..FFF...",
  ];
  const SHIBA_B = [
    ".FF.........TTT.",
    ".FF.........TT..",
    ".FFFF......TTT..",
    ".FFFFFF....TTT..",
    "EFFEFFF....TT...",
    "nFFFFFF....TT...",
    "FFFFFFFFFFFFFF..",
    "FWFFFFFFFFFFFF..",
    "FWFFFFFFFFFFFF..",
    "FWFFFFFFFFFFFF..",
    "FFFF.FFF..FF....",
    "FFFF.FFF..FF....",
  ];
  SPR.shiba = {
    walkA: build(SHIBA_A, SHIBA_PAL), walkB: build(SHIBA_B, SHIBA_PAL),
    walkLA: flip(build(SHIBA_A, SHIBA_PAL)), walkLB: flip(build(SHIBA_B, SHIBA_PAL)),
    sit: (() => {
      const [c, x] = mk(16, 14);
      x.drawImage(build(SHIBA_A, SHIBA_PAL), 0, 0);
      px(x, 4, 10, 3, 4, SHIBA_PAL.F); px(x, 10, 10, 3, 4, SHIBA_PAL.F);
      px(x, 5, 12, 1, 2, SHIBA_PAL.W); px(x, 11, 12, 1, 2, SHIBA_PAL.W);
      return c;
    })(),
  };

  const CHICK_PAL = { W: "#fff8f0", C: "#e04a4a", n: "#ffa04a", E: "#2b2233", o: "#ffa04a", Y: "#e04a4a" };
  SPR.chicken = { frames: buildFrames([
    ["..CC........", ".WWWW.......", "nEWWW.......", ".WWWWW......", ".WWWWWWWWY..", ".WWWWWWWWY..", "..WWWWWWWW..", "..WWWWWWWW..", "..WW..WW....", "..oo..oo...."],
    ["............", "..CC........", ".WWWW.......", "nEWWW.......", ".WWWWWY.....", ".WWWWWWWWY..", "nWWWWWWWWY..", "..WWWWWWWW..", "..WW..WW....", "..oo..oo...."],
  ], CHICK_PAL) };

  const TANUKI_PAL = { F: "#9a8a72", W: "#f0e8d8", T: "#7a6a52", E: "#2b2233", n: "#2b2233" };
  const TANUKI_ROWS = [
    "..FF......FF....",
    ".FFFF....FFFF...",
    ".FFFFFFFFFFFF...",
    ".FFFFFFFFFFFF...",
    ".FEEFFFFFFEEF...",
    ".FFFFFFFFFFFF...",
    "..FFFFnnFFFF....",
    "..FFFFWWFFFF....",
    ".FFFFFFFFFFFFT..",
    ".FFFFFFFFFFFFT..",
    "..FF..FF..FF....",
    "..FF..FF..FF....",
  ];
  SPR.tanuki = {
    stand: build(TANUKI_ROWS, TANUKI_PAL),
    standL: flip(build(TANUKI_ROWS, TANUKI_PAL)),
  };
  // leaf hat on tanuki
  {
    const [c, x] = mk(16, 13);
    x.drawImage(SPR.tanuki.stand, 0, 1);
    px(x, 5, 0, 6, 2, "#6aa84f"); px(x, 6, 0, 4, 1, "#7cbf62"); pxl(x, 4, 1, "#6aa84f");
    SPR.tanuki.stand = c;
    const [c2, x2] = mk(16, 13);
    x2.drawImage(SPR.tanuki.standL, 0, 1);
    px(x2, 5, 0, 6, 2, "#6aa84f"); px(x2, 6, 0, 4, 1, "#7cbf62"); pxl(x2, 4, 1, "#6aa84f");
    SPR.tanuki.standL = c2;
  }

  const CAPY_PAL = { F: "#a5825e", E: "#2b2233", n: "#8a6a48" };
  SPR.capybara = build([
    ".FF......FF.........",
    ".FFFF...FFFF........",
    ".FFFFFFFFFFFF.......",
    ".FYYFFFFFFFFFFFF....",
    "nFFFFFFFFFFFFFF.....",
    ".FFFFFFFFFFFFFFFF...",
    ".FFFFFFFFFFFFFFFFF..",
    ".FFFFFFFFFFFFFFFFF..",
    ".FFFFFFFFFFFFFFFFF..",
    ".FFFFFFFFFFFFFFFFF..",
    "..FF...FF...FF...F..",
    "..FF...FF...FF...F..",
  ], { F: CAPY_PAL.F, Y: "#2b2233", n: CAPY_PAL.n });

  // ---------------------------------------------------------------------
  //  FISH + BUGS
  // ---------------------------------------------------------------------
  const FISH_ROWS = [
    "......FF........",
    "..T..FFFFF......",
    "..TT.FFFFFFFE...",
    "TTTTFFFFFFFFFE..",
    "TTTTFFFFFFFFFE..",
    "..TT.FFFFFFF....",
    "..T..FFFFF......",
    "......FF........",
  ];
  SPR.fish = {
    yamame: build(FISH_ROWS, { F: "#a8c0d0", T: "#8aa8bc", E: "#2b2233" }),
    carp: build(FISH_ROWS, { F: "#e8b04a", T: "#c99038", E: "#2b2233" }),
    koi: build(FISH_ROWS, { F: "#f0f0f0", T: "#e04a4a", E: "#2b2233" }),
    catfish: build(FISH_ROWS, { F: "#6a6a7a", T: "#555a68", E: "#ffd98a" }),
    eel: build([
      "....................",
      ".FFFFFFFFFFFFFFFFFF.",
      "nFFFFFFFFFFFFFFFFFFE",
      ".FFFFFFFFFFFFFFFFFF.",
      "....................",
    ], { F: "#4a5a4a", E: "#2b2233", n: "#3a4a3a" }),
  };

  SPR.bugs = {
    butterfly: buildFrames([
      [".W......W.", "WWW....WWW", "WWWb..bWWW", ".WWbbbbWW.", ".WWbWWbWW.", "..W.bb.W.."],
      ["....b.....", "...WbW....", "....b.....", "...WbW....", "....b.....", "....W....."],
    ], { W: "#ff9ec0", b: "#5a3a5a" }),
    butterfly_b: buildFrames([
      [".W......W.", "WWW....WWW", "WWWb..bWWW", ".WWbbbbWW.", ".WWbWWbWW.", "..W.bb.W.."],
      ["....b.....", "...WbW....", "....b.....", "...WbW....", "....b.....", "....W....."],
    ], { W: "#8ad0e8", b: "#3a5a6a" }),
    cicada: build([
      "..WW....WW..",
      "..WW....WW..",
      ".FFFFFFFFFF.",
      ".FFEFFEFFEF.",
      ".FFFFFFFFFF.",
      ".FFnFFFFnFF.",
      "..FFFFFFFF..",
      "..FF....FF..",
    ], { W: "#d8e8d0aa", F: "#6a5a3a", E: "#2b2233", n: "#c9a86a" }),
    firefly: build([
      "..GG..",
      ".GBBG.",
      "..BB..",
      "..BB..",
      "...B..",
    ], { G: "#fff6a8", B: "#4a3a2a" }),
    cricket: build([
      "..A....",
      ".AAAA..",
      "AEBBEA.",
      ".ABBA..",
      "..AA.A.",
      "..A..A.",
    ], { A: "#3a3a2a", B: "#2b2233", E: "#8a8a7a" }),
    beetle: build([
      ".....n......",
      "..FFFFFFF...",
      ".FFFFFFFFF..",
      ".FFEFFEFFE..",
      ".FFFRRFFFF..",
      ".FFFRRFFFF..",
      ".FFFFOFFFF..",
      "..FF...FF...",
    ], { F: "#2b2233", R: "#c9382c", E: "#ffd98a", n: "#3a3a46", O: "#8a6a3a" }),
  };

  // ---------------------------------------------------------------------
  //  ITEMS (12x12)
  // ---------------------------------------------------------------------
  const I = (rows, pal) => build(rows, pal);
  SPR.items = {};

  SPR.items.rice = I([
    "..YY..YY..Y.",
    "..YYY.YY.Y..",
    "...YYYYYY...",
    "....GGGG....",
    "...G.GG.G...",
    "..G..GG..G..",
    "..G..GG..G..",
    ".....GG.....",
    ".....GG.....",
    ".....GG.....",
    "....GGG.....",
    "....GG......",
  ], { Y: "#e8cc6a", G: "#8aa050" });

  SPR.items.daikon = I([
    "....LL......",
    "...LLL.L....",
    "....L.LL....",
    "....WWW.....",
    "....WWW.....",
    "....WWW.....",
    "...WWWWW....",
    "...WWWWW....",
    "...WWWWW....",
    "....WWW.....",
    "....WWW.....",
    ".....WW.....",
  ], { L: "#6cb858", W: "#f4f0e0" });

  SPR.items.eggplant = I([
    "......G.....",
    ".....GG.....",
    "....GPG.....",
    "...PPPP.....",
    "..PPPPPP....",
    "..PPPPPP....",
    "..PPPPPPP...",
    "..PPPPPPP...",
    "...PPPPPP...",
    "...PPPPP....",
    "....PPP.....",
    "............",
  ], { G: "#5aa04a", P: "#7a4a9a" });

  SPR.items.cucumber = I([
    ".........CC.",
    ".......CCCC.",
    ".....CCCC...",
    "...CCCC.....",
    ".CCCC.......",
    ".CCC........",
    ".CC.........",
    "CC..........",
    "C...........",
    "............",
    "............",
    "............",
  ], { C: "#5aa858" });

  SPR.items.strawberry = I([
    ".....G......",
    "....GGG.....",
    "..G.G.G.....",
    "...GGG......",
    "...RRRR.....",
    "..RRRRRR....",
    "..RwRRRRR...",
    "..RRRRRRR...",
    "...RRRRR....",
    "...RRRRR....",
    "....RRR.....",
    ".....R......",
  ], { G: "#5aa04a", R: "#e04a5a", w: "#ffd9e0" });

  SPR.items.mushroom = I([
    "............",
    "...RRRR.....",
    "..RRRRRR....",
    ".RRwRRwRR...",
    ".RRRRRRRR...",
    "..RRRRRR....",
    "...WWWW.....",
    "...WWWW.....",
    "...WWWW.....",
    "...WWWW.....",
    "............",
    "............",
  ], { R: "#e05a5a", W: "#f0e0c8", w: "#fff" });

  SPR.items.bamboo = I([
    "....L.L.....",
    "...L.L......",
    "...LLL......",
    "....BB......",
    "....BBB.....",
    "...BBBB.....",
    "...BBBBB....",
    "...BBBB.....",
    "....BBBB....",
    "....BBB.....",
    ".....BB.....",
    ".....B......",
  ], { L: "#8aa050", B: "#c9a86a" });

  SPR.items.herb = I([
    "....w..w....",
    "..w.GG.w....",
    "....GG......",
    "..GGGGG.....",
    "...GG.GG....",
    "....GG......",
    "....GG......",
    "....GG......",
    "....GG......",
    "............",
    "............",
    "............",
  ], { G: "#6cc068", w: "#fff1a8" });

  SPR.items.flower = I([
    "....PP......",
    "...PPPP.....",
    "..PPYYPP....",
    "..PPYYPP....",
    "...PPPP.....",
    "....PP......",
    "...G........",
    "...GG.......",
    "..GGGG......",
    "...GG.......",
    "....GG......",
    "............",
  ], { P: "#ff9ecb", Y: "#fff1a8", G: "#5aa84a" });

  SPR.items.egg = I([
    "............",
    "....WW......",
    "...WWWW.....",
    "..WWWWWW....",
    "..WWWWWW....",
    "..WWWWWW....",
    "..WWWWWW....",
    "...WWWW.....",
    "....WW......",
    "............",
    "............",
    "............",
  ], { W: "#fff4e0" });

  SPR.items.onigiri = I([
    "............",
    "....WWW.....",
    "...WWWWW....",
    "..WWWWWWW...",
    "..WWWWWWW...",
    ".WWWWWWWWW..",
    ".WNNNNNNNW..",
    ".WNNrNNNNW..",
    ".WNNNNNNNW..",
    ".WWWWWWWWW..",
    "..WWWWWWW...",
    "............",
  ], { W: "#f5f0e0", N: "#3a4a3a", r: "#e04a5a" });

  SPR.items.ramune = I([
    "............",
    "....ww......",
    "....BB......",
    "...BBBB.....",
    "..BBmBBB....",
    "..BBBBBB....",
    "..BBBBBB....",
    "..BwwwwB....",
    "..BwwwwB....",
    "..BBBBBB....",
    "............",
    "............",
  ], { B: "#8ad0e8", w: "#fff", m: "#5a9ac0" });

  SPR.items.coffee = I([
    "............",
    "..CCCCCCCC..",
    "..CRRRRRRc..",
    "..CCCCCCCC..",
    "..CwwwwwwC..",
    "..CwwwwwwC..",
    "..CCCCCCCC..",
    "..CCCCCCCC..",
    "..CCCCCCCC..",
    "............",
    "............",
    "............",
  ], { C: "#b03a2a", R: "#e8e0d0", w: "#c9a86a", c: "#8a2a20" });

  SPR.items.taiyaki = I([
    "............",
    "....BB......",
    "...BBBB.....",
    "..BBEBBB....",
    ".BBBBBBBBT..",
    ".BBBBBBBBTT.",
    ".BwBBBBBBTT.",
    "..BBBBBBT...",
    "...BBBB.....",
    "....BB......",
    "............",
    "............",
  ], { B: "#e8c078", T: "#d9a860", E: "#2b2233", w: "#fff" });

  SPR.items.can = I([
    "............",
    "............",
    "..GGGGGG....",
    ".GGGGGGGG...",
    ".GGgGGgGG...",
    "..GGGGGG....",
    "...GGGG.....",
    "..GGGG......",
    "............",
    "............",
    "............",
    "............",
  ], { G: "#9aa0a8", g: "#7a8088" });

  SPR.items.marble = I([
    "............",
    "............",
    "....BB......",
    "...BBBB.....",
    "..BBwBBB....",
    "..BBBBBB....",
    "...BBBB.....",
    "....BB......",
    "............",
    "............",
    "............",
    "............",
  ], { B: "#5ab0d8", w: "#fff" });

  SPR.items.sticker = I([
    "............",
    ".....Y......",
    "....YYY.....",
    "YYYYYYYYY...",
    ".YYYYYYY....",
    "..YYYYY.....",
    "..YYY.......",
    ".YY.YY......",
    "Y.......Y...",
    "............",
    "............",
    "............",
  ], { Y: "#ffd94a" });

  SPR.items.keychain = I([
    "............",
    "....PP......",
    "...PPPP.....",
    "...PPPP.....",
    "....PP......",
    "....WW......",
    "...WWWW.....",
    "...WWWW.....",
    "....WW......",
    "....GG......",
    "...G..G.....",
    "............",
  ], { P: "#e07aa8", W: "#fff4e0", G: "#8a6a42" });

  SPR.items.charm = I([
    "............",
    "..GG....GG..",
    "..GGGGGGGG..",
    ".GGYGGGGYGG.",
    ".GGGGGGGGGG.",
    ".GGYYYYYYGG.",
    "..GGGGGGGG..",
    "...GGGGGG...",
    "....GGGG....",
    ".....GG.....",
    "............",
    "............",
  ], { G: "#ffd94a", Y: "#c9a02a" });

  SPR.items.pebble = I([
    "............",
    "............",
    "....ss......",
    "...SSSS.....",
    "..SSwSSS....",
    "..SSSSSS....",
    "...SSSS.....",
    "....ss......",
    "............",
    "............",
    "............",
    "............",
  ], { S: "#b0b8c8", s: "#8a92a2", w: "#fff" });

  // seeds — colored dot on paper packet
  const seedBag = (dot) => I([
    "............",
    "..PPPPPPPP..",
    "..PwwwwwwP..",
    "..Pw....wP..",
    "..Pw.DD.wP..",
    "..Pw.DD.wP..",
    "..Pw....wP..",
    "..PwwwwwwP..",
    "..PPPPPPPP..",
    "..PPPPPPPP..",
    "............",
    "............",
  ], { P: "#e8d5a8", w: "#f8f0d8", D: dot });
  SPR.items.rice_seed = seedBag("#e8cc6a");
  SPR.items.daikon_seed = seedBag("#6cb858");
  SPR.items.eggplant_seed = seedBag("#7a4a9a");
  SPR.items.cucumber_seed = seedBag("#5aa858");
  SPR.items.strawberry_seed = seedBag("#e04a5a");

  // fish items reuse SPR.fish

  SPR.items.heart = I([
    "............",
    ".RR....RR...",
    "RRRR..RRRR..",
    "RRRRRRRRRR..",
    "RRRRRRRRRR..",
    ".RRRRRRRR...",
    "..RRRRRR....",
    "...RRRR.....",
    "....RR......",
    "............",
    "............",
    "............",
  ], { R: "#ff5a6e" });

  SPR.items.coin = I([
    "............",
    "....GGGG....",
    "..GGGGGGGG..",
    "..GGhhhhGG..",
    ".GGGh..hGGG.",
    ".GGGh..hGGG.",
    ".GGGh..hGGG.",
    "..GGhhhhGG..",
    "..GGGGGGGG..",
    "....GGGG....",
    "............",
    "............",
  ], { G: "#ffd94a", h: "#c9a02a" });

  // tools (16x16)
  const T2 = (rows, pal) => build(rows, pal);
  SPR.tools = {
    hoe: T2([
      "..........WW...",
      ".........WW....",
      "........WW.....",
      ".......WW......",
      "......WW.......",
      ".....WW........",
      "....WW.........",
    "..WW...........", "...WW..........", "....WW.........", ".....BBBB......", ".....BBBB......", "......BB.......", "...............", "...............", "...............",
    ], { W: "#a07848", B: "#9aa0a8" }),
    can: T2([
      "...............",
      "....CCCC.......",
      "...C....C......",
      "...C....C......",
      "..CC....C......",
      ".wCC....C..w...",
      "w.CC...CCCCCw..",
      ".CCCCCCssssC...",
      ".CCCCCCssssC...",
      ".CC.CCCC..C....",
      ".CC..C.........",
      "...............",
      "...............",
      "...............",
      "...............",
      "...............",
    ], { C: "#5ab0c8", s: "#8ad0e8", w: "#5ab0c8" }),
    net: T2([
      "................",
      "..........W.....",
      ".........W......",
      "........W.......",
      ".......W........",
      "......W.........",
      ".....W..........",
      "....W...........",
      "..nW............",
      ".nnnn...........",
      "nWnnnn..........",
      "n.nnnn..........",
      "...nn...........",
      "................",
      "................",
      "................",
    ], { W: "#a07848", n: "#d8e8f0" }),
    rod: T2([
      ".............W..",
      "............W...",
      "...........W....",
      "..........W.....",
      ".........W......",
      "........W.......",
      ".......W........",
      "......W.........",
      ".....W..........",
      "....W...........",
      "...W............",
      "..W.............",
      ".W..............",
      ".l..............",
      ".l..............",
      ".h..............",
    ], { W: "#a07848", l: "#e8e8ee", h: "#ffd94a" }),
    hand: T2([
      "................",
      "................",
      "................",
      "....SS..........",
      "...SSSS.........",
      "..SSSSSS........",
      "..SSSSSSS.......",
      "..SSSSSSS.......",
      "...SSSSS........",
      "....SSS.........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ], { S: "#ffdfc0" }),
  };

  // small UI icons (10x10)
  const IC = (rows, pal) => build(rows, pal);
  SPR.icons = {
    sun: IC([
      "....y....",
      "y...Y...y",
      ".y.YYY.y.",
      "..YYYYY..",
      "yYYYYYYYy",
      "yYYYYYYYy",
      "..YYYYY..",
      ".y.YYY.y.",
      "y...Y...y",
      "....y....",
    ], { Y: "#ffd94a", y: "#ffa04a" }),
    cloud: IC([
      "..........",
      "...WWWW...",
      "..WWWWWW..",
      ".WWWWWWWW.",
      "WWWWWWWWWW",
      "WWWWWWWWWW",
      ".WWWWWWWW.",
      "..........",
      "..........",
      "..........",
    ], { W: "#e8e8f0" }),
    rain: IC([
      "...WWWW...",
      "..WWWWWW..",
      ".WWWWWWWW.",
      "WWWWWWWWWW",
      ".WWWWWWWW.",
      "..b..b..b.",
      ".b..b..b..",
      "..b..b..b.",
      ".b..b..b..",
      "..........",
    ], { W: "#b8c4d8", b: "#5ab0d8" }),
    snow: IC([
      "....w....",
      "w...w...w",
      ".w..w..w.",
      "..w.w.w..",
      "wwwwwwwww",
      "..w.w.w..",
      ".w..w..w.",
      "w...w...w",
      "....w....",
      "..........",
    ], { w: "#e8f4fa" }),
    night: IC([
      "....YYY..",
      "...YYYY..",
      "..YYYY...",
      ".YYYY....",
      "YYY......",
      "YYY......",
      ".YYYY....",
      "..YYYYY..",
      "...YYYY..",
      "..........",
    ], { Y: "#fff4c0" }),
    moon: IC([
      "...wwww..",
      "..wwwww..",
      ".wwww....",
      ".www.....",
      "wwww.....",
      "wwww.....",
      ".www.....",
      ".wwww....",
      "..wwwww..",
      "...wwww..",
    ], { w: "#fff4c0" }),
    mail: IC([
      "..........",
      "WWWWWWWWWW",
      "W2wwwwww2W",
      "WwwwwwwwwW",
      "W.wWWWWwwW",
      "W..wWWW.wW",
      "W...www..W",
      "WWWWWWWWWW",
      "..........",
      "..........",
    ], { W: "#f2e4c8", w: "#c9a86a", 2: "#d94a5a" }),
    onigiri: IC([
      "....WW....",
      "...WWWW...",
      "..WWWWWW..",
      ".WWWWWWWW.",
      ".WWWWWWWW.",
      ".NNNNNNNN.",
      ".NNrNNNNN.",
      ".NNNNNNNN.",
      ".WWWWWWWW.",
      "..........",
    ], { W: "#f5f0e0", N: "#3a4a3a", r: "#e04a5a" }),
  };

  // dataURL cache for DOM use
  const iconCache = {};
  Sprites.itemIcon = function (id) {
    if (iconCache[id]) return iconCache[id];
    let cv = SPR.items[id];
    if (!cv && SPR.fish[id]) cv = SPR.fish[id];
    if (!cv && SPR.bugs[id]) cv = Array.isArray(SPR.bugs[id]) ? SPR.bugs[id][0] : SPR.bugs[id];
    if (!cv) cv = SPR.items.heart;
    iconCache[id] = cv.toDataURL();
    return iconCache[id];
  };
  Sprites.iconURL = function (name) {
    const key = "ui:" + name;
    if (iconCache[key]) return iconCache[key];
    const cv = SPR.icons[name] || SPR.icons.sun;
    iconCache[key] = cv.toDataURL();
    return iconCache[key];
  };
  Sprites.charURL = function (cv) { return cv.toDataURL(); };

})();

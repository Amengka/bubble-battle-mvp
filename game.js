(function () {
  "use strict";

  var COLS = 13;
  var ROWS = 11;
  var TILE = 64;
  var BOMB_TIME = 2200;
  var BLAST_TIME = 520;
  var BLAST_DAMAGE_TIME = 90;
  var HIT_EFFECT_TIME = 560;
  var SCREEN_HIT_TIME = 360;
  var RESUME_COUNTDOWN_TIME = 3000;
  var ROUND_TIME = 90000;
  var OVERLOAD_WARNING_TIME = 50000;
  var OVERLOAD_PHASE_1_TIME = 45000;
  var OVERLOAD_PHASE_2_TIME = 20000;
  var ROUND_DELAY = 1500;
  var MIN_MOVE_DELAY = 86;
  var INPUT_BUFFER_TIME = 150;
  var MAX_HUMAN_STEPS_PER_FRAME = 1;
  var JOYSTICK_DEADZONE = 0.12;
  var JOYSTICK_MAX_RANGE = 0.3;
  var JOYSTICK_FLOAT_RANGE = 0.34;
  var JOYSTICK_SWITCH_RATIO = 1.24;
  var AI_DANGER_WINDOW = 1350;
  var AI_ESCAPE_DEPTH = 9;

  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas.getContext("2d");
  var appShell = document.querySelector(".app-shell");
  var boardWrap = document.querySelector(".board-wrap");
  var gameFlowOverlay = document.getElementById("gameFlowOverlay");
  var gameFlowKicker = document.getElementById("gameFlowKicker");
  var gameFlowTitle = document.getElementById("gameFlowTitle");
  var gameFlowBody = document.getElementById("gameFlowBody");
  var gameFlowPrimary = document.getElementById("gameFlowPrimary");
  var deathChoiceOverlay = document.getElementById("deathChoiceOverlay");
  var deathRestartBtn = document.getElementById("deathRestartBtn");
  var deathWatchBtn = document.getElementById("deathWatchBtn");
  var roundStatus = document.getElementById("roundStatus");
  var roundTimer = document.getElementById("roundTimer");
  var hudTimer = document.getElementById("hudTimer");
  var hudBombs = document.getElementById("hudBombs");
  var hudFire = document.getElementById("hudFire");
  var hudSpeed = document.getElementById("hudSpeed");
  var hudWins = document.getElementById("hudWins");
  var statusChips = document.getElementById("statusChips");
  var toast = document.getElementById("toast");
  var statBombs = document.getElementById("statBombs");
  var statFire = document.getElementById("statFire");
  var statSpeed = document.getElementById("statSpeed");
  var statWins = document.getElementById("statWins");
  var scoreList = document.getElementById("scoreList");
  var pauseBtn = document.getElementById("pauseBtn");
  var resetBtn = document.getElementById("resetBtn");
  var newMapBtn = document.getElementById("newMapBtn");
  var difficultyButtons = document.querySelectorAll("[data-difficulty]");
  var mapButtons = document.querySelectorAll("[data-map]");
  var joystick = document.getElementById("joystick");
  var joystickKnob = document.getElementById("joystickKnob");
  var bombButton = document.querySelector("[data-bomb]");
  var pauseButtons = document.querySelectorAll("[data-pause]");
  var fullscreenButtons = document.querySelectorAll("[data-fullscreen]");
  var settingsModal = document.getElementById("settingsModal");
  var settingsButtons = document.querySelectorAll("[data-settings]");
  var settingsCloseButtons = document.querySelectorAll("[data-settings-close]");
  var resetRoundButtons = document.querySelectorAll("[data-reset-round]");
  var nextMapButtons = document.querySelectorAll("[data-next-map]");
  var soundButtons = document.querySelectorAll("[data-sound]");
  var vibrationButtons = document.querySelectorAll("[data-vibration]");
  var vibrationSettingRows = document.querySelectorAll("[data-vibration-setting]");
  var blastGuideButtons = document.querySelectorAll("[data-blast-guide]");
  var gameScript = document.currentScript || document.querySelector("script[src$='game.js']");

  var platformEmbedMode = detectPlatformEmbedMode();
  var platformReadySent = false;
  var keys = {};
  var keyboardDirStack = [];
  var touchDir = null;
  var touchSecondaryDir = null;
  var joystickPointer = null;
  var joystickBaseX = 0;
  var joystickBaseY = 0;
  var audioContext = null;
  var settingsResumeAfterClose = false;
  var fullscreenTransitionUntil = 0;
  var gamePhase = "start";
  var toastTimer = 0;
  var lastFrame = performance.now();
  var difficulty = "easy";
  var mapIndex = 0;
  var soundEnabled = true;
  var vibrationAvailable = canUseVibration();
  var vibrationEnabled = vibrationAvailable;
  var blastGuideEnabled = false;
  var playerWinStreak = 0;
  var playerBestWinStreak = 0;
  document.documentElement.classList.toggle("is-platform-embed", platformEmbedMode);
  if (appShell) appShell.classList.toggle("is-platform-embed", platformEmbedMode);

  var keyboardDirectionNames = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right"
  };

  var keyboardDirections = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  var overloadStages = [
    { id: 1, timeLeft: OVERLOAD_PHASE_1_TIME, label: "Overload", buffs: { bombs: 2, fire: 2, speed: 1 } },
    { id: 2, timeLeft: OVERLOAD_PHASE_2_TIME, label: "Max Overload", buffs: { bombs: 1, fire: 1, speed: 1 } }
  ];

  var difficultySettings = {
    easy: {
      label: "Easy",
      softRate: 0.48,
      startSafeRadius: 2,
      aiThinkMin: 450,
      aiThinkMax: 650,
      aiBombChance: 0.35,
      aiAggression: 0.65,
      aiItemWeight: 32,
      playerStart: { bombs: 1, fire: 2, speed: 2 },
      aiStart: { bombs: 1, fire: 2, speed: 1 },
      dropWeights: { fire: 16, bomb: 16, speed: 0 }
    },
    normal: {
      label: "Normal",
      softRate: 0.58,
      startSafeRadius: 2,
      aiThinkMin: 210,
      aiThinkMax: 380,
      aiBombChance: 0.7,
      aiAggression: 1,
      aiItemWeight: 24,
      playerStart: { bombs: 1, fire: 2, speed: 1 },
      aiStart: { bombs: 1, fire: 2, speed: 1 },
      dropWeights: { fire: 13, bomb: 13, speed: 0 }
    },
    hard: {
      label: "Hard",
      softRate: 0.64,
      startSafeRadius: 1,
      aiThinkMin: 120,
      aiThinkMax: 240,
      aiBombChance: 0.9,
      aiAggression: 1.45,
      aiItemWeight: 18,
      playerStart: { bombs: 1, fire: 2, speed: 1 },
      aiStart: { bombs: 1, fire: 2, speed: 2 },
      dropWeights: { fire: 10, bomb: 12, speed: 0 }
    }
  };
  var mapTemplates = [
    {
      id: "classic",
      name: "Classic",
      softDelta: 0,
      layout: [
        "#############",
        "#...........#",
        "#.#T#.#T#.#.#",
        "#...........#",
        "#.#.#.#.#.#.#",
        "#.....H.....#",
        "#.#.#.#.#.#.#",
        "#...........#",
        "#.#T#.#T#.#.#",
        "#...........#",
        "#############"
      ]
    },
    {
      id: "crossfire",
      name: "Crossfire",
      softDelta: -0.04,
      layout: [
        "#############",
        "#...........#",
        "#.#.#.#.#.#.#",
        "#...#T..#...#",
        "#.#.###.#.#.#",
        "#..H..#..H..#",
        "#.#.###.#.#.#",
        "#...#..T#...#",
        "#.#.#.#.#.#.#",
        "#...........#",
        "#############"
      ]
    },
    {
      id: "garden",
      name: "Garden",
      softDelta: -0.08,
      layout: [
        "#############",
        "#...........#",
        "#.#.T.#.T.#.#",
        "#...T...T...#",
        "#...#.#.#...#",
        "#.#.......#.#",
        "#...#.#.#...#",
        "#...T...T...#",
        "#.#.T.#.T.#.#",
        "#...........#",
        "#############"
      ]
    },
    {
      id: "ruins",
      name: "Ruins",
      softDelta: 0.04,
      layout: [
        "#############",
        "#...........#",
        "#.###.#.###.#",
        "#..H#...#H..#",
        "#.#.#.#.#.#.#",
        "#..T..#..T..#",
        "#.#.#.#.#.#.#",
        "#..H#...#H..#",
        "#.###.#.###.#",
        "#...........#",
        "#############"
      ]
    }
  ];

  var starts = [
    { x: 1, y: 1 },
    { x: COLS - 2, y: 1 },
    { x: 1, y: ROWS - 2 },
    { x: COLS - 2, y: ROWS - 2 }
  ];
  var directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 }
  ];
  var characterStyles = [
    {
      body: "#4fb0d8",
      side: "#2a789a",
      top: "#8bd6e8",
      dark: "#143846",
      light: "#d7fbff",
      accent: "#f2cf4b",
      trim: "#f7f8f0",
      mark: "Y",
      pattern: "pilot"
    },
    {
      body: "#db6558",
      side: "#9f3b35",
      top: "#f39a7e",
      dark: "#3a1714",
      light: "#ffdfcf",
      accent: "#f6d352",
      trim: "#fff0df",
      mark: "B",
      pattern: "bolt"
    },
    {
      body: "#78bf69",
      side: "#4f8a45",
      top: "#a8df8b",
      dark: "#183d24",
      light: "#e7fff0",
      accent: "#e7efba",
      trim: "#f5fff7",
      mark: "M",
      pattern: "mint"
    },
    {
      body: "#e4b84a",
      side: "#9f7426",
      top: "#f8d76b",
      dark: "#3d2b10",
      light: "#fff6bc",
      accent: "#7fd0d7",
      trim: "#fff2a8",
      mark: "G",
      pattern: "gold"
    }
  ];

  var state = makeGame(false, false, true);

  function makeGame(keepScores, advanceRound, resetRound) {
    var oldPlayers = state && state.players ? state.players : [];
    var settings = currentDifficulty();
    var round = 1;
    if (state && !resetRound) {
      round = advanceRound ? state.round + 1 : state.round;
    }
    return {
      round: round,
      grid: makeGrid(),
      bombs: [],
      blasts: [],
      hitEffects: [],
      screenHitTimer: 0,
      ended: false,
      paused: false,
      spectating: false,
      deathChoiceOpen: false,
      deathChoicePending: false,
      deathChoiceShown: false,
      lastDeathCause: "",
      overloadWarningShown: false,
      overloadStage: 0,
      resumeCountdown: 0,
      timeLeft: ROUND_TIME,
      nextRoundAt: 0,
      resultText: "",
      stats: makeRoundStats(),
      players: [
        makePlayer(0, "You", starts[0], characterStyles[0], false, keepScores ? oldPlayers[0] : null, settings.playerStart),
        makePlayer(1, "Bolt", starts[1], characterStyles[1], true, keepScores ? oldPlayers[1] : null, settings.aiStart),
        makePlayer(2, "Mint", starts[2], characterStyles[2], true, keepScores ? oldPlayers[2] : null, settings.aiStart),
        makePlayer(3, "Gold", starts[3], characterStyles[3], true, keepScores ? oldPlayers[3] : null, settings.aiStart)
      ]
    };
  }

  function makePlayer(id, name, start, style, ai, old, startStats) {
    return {
      id: id,
      name: name,
      x: start.x,
      y: start.y,
      color: style.body,
      style: style,
      ai: ai,
      alive: true,
      maxBombs: startStats.bombs,
      fire: startStats.fire,
      speed: startStats.speed,
      baseMaxBombs: startStats.bombs,
      baseFire: startStats.fire,
      baseSpeed: startStats.speed,
      overloadBombs: 0,
      overloadFire: 0,
      overloadSpeed: 0,
      wins: old ? old.wins : 0,
      bombsActive: 0,
      moveCooldown: 0,
      moveBuffer: null,
      moveBufferTimer: 0,
      moveRemainder: 0,
      aiCooldown: randomAiCooldown(),
      aiPlan: null,
      face: { x: 0, y: 1 },
      visualX: start.x,
      visualY: start.y,
      moveFromX: start.x,
      moveFromY: start.y,
      moveToX: start.x,
      moveToY: start.y,
      moveAnim: 0,
      moveAnimTotal: 1,
      walkCycle: 0
    };
  }

  function makeRoundStats() {
    return {
      bombsPlaced: 0,
      itemsCollected: 0,
      kills: 0,
      deathCause: "",
      survivedSeconds: 0
    };
  }

  function currentDifficulty() {
    return difficultySettings[difficulty];
  }

  function currentMap() {
    return mapTemplates[mapIndex] || mapTemplates[0];
  }

  function getAudioContext() {
    if (!soundEnabled) return null;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContext) audioContext = new AudioCtx();
    return audioContext;
  }

  function unlockAudio() {
    var ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  }

  function playableAudioContext() {
    var ctx = getAudioContext();
    if (!ctx || ctx.state !== "running") return null;
    return ctx;
  }

  function connectTimedGain(ctx, start, peak, sustain, duration) {
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), start + duration * 0.34);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(ctx.destination);
    return gain;
  }

  function makeNoiseBuffer(ctx, duration) {
    var length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    return buffer;
  }

  function playExplosionSound() {
    var ctx = playableAudioContext();
    if (!ctx) return;
    var now = ctx.currentTime;
    var rumble = ctx.createOscillator();
    var rumbleGain = connectTimedGain(ctx, now, 0.24, 0.06, 0.42);
    rumble.type = "triangle";
    rumble.frequency.setValueAtTime(128, now);
    rumble.frequency.exponentialRampToValueAtTime(42, now + 0.34);
    rumble.connect(rumbleGain);
    rumble.start(now);
    rumble.stop(now + 0.44);

    var noise = ctx.createBufferSource();
    var noiseGain = connectTimedGain(ctx, now, 0.18, 0.025, 0.24);
    noise.buffer = makeNoiseBuffer(ctx, 0.24);
    noise.connect(noiseGain);
    noise.start(now);
    noise.stop(now + 0.25);
  }

  function playKillSound(isLocalPlayer) {
    var ctx = playableAudioContext();
    if (!ctx) return;
    var now = ctx.currentTime;
    var duration = isLocalPlayer ? 0.36 : 0.2;
    var tone = ctx.createOscillator();
    var gain = connectTimedGain(ctx, now, isLocalPlayer ? 0.22 : 0.16, 0.012, duration);
    tone.type = isLocalPlayer ? "sawtooth" : "square";
    tone.frequency.setValueAtTime(isLocalPlayer ? 310 : 560, now);
    tone.frequency.exponentialRampToValueAtTime(isLocalPlayer ? 88 : 180, now + duration);
    tone.connect(gain);
    tone.start(now);
    tone.stop(now + duration + 0.02);
  }

  function playBombSetSound() {
    var ctx = playableAudioContext();
    if (!ctx) return;
    var now = ctx.currentTime;
    var tone = ctx.createOscillator();
    var gain = connectTimedGain(ctx, now, 0.08, 0.012, 0.1);
    tone.type = "square";
    tone.frequency.setValueAtTime(180, now);
    tone.frequency.exponentialRampToValueAtTime(105, now + 0.08);
    tone.connect(gain);
    tone.start(now);
    tone.stop(now + 0.11);
  }

  function playPickupSound(kind) {
    var ctx = playableAudioContext();
    if (!ctx) return;
    var now = ctx.currentTime;
    var first = ctx.createOscillator();
    var second = ctx.createOscillator();
    var gain = connectTimedGain(ctx, now, 0.07, 0.018, 0.18);
    var base = kind === "bomb" ? 360 : kind === "speed" ? 520 : 430;
    first.type = "triangle";
    second.type = "sine";
    first.frequency.setValueAtTime(base, now);
    first.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.16);
    second.frequency.setValueAtTime(base * 1.5, now + 0.04);
    second.frequency.exponentialRampToValueAtTime(base * 2, now + 0.18);
    first.connect(gain);
    second.connect(gain);
    first.start(now);
    second.start(now + 0.035);
    first.stop(now + 0.19);
    second.stop(now + 0.2);
  }

  function playRoundStartSound() {
    var ctx = playableAudioContext();
    if (!ctx) return;
    playToneSequence(ctx, [360, 480, 720], 0.08, 0.07, "triangle");
  }

  function playRoundResultSound(kind) {
    var ctx = playableAudioContext();
    if (!ctx) return;
    if (kind === "win") {
      playToneSequence(ctx, [420, 560, 760, 960], 0.09, 0.08, "triangle");
    } else if (kind === "draw") {
      playToneSequence(ctx, [330, 300], 0.12, 0.07, "sine");
    } else {
      playToneSequence(ctx, [360, 240, 150], 0.12, 0.08, "sawtooth");
    }
  }

  function playCountdownSound(finalBeep) {
    var ctx = playableAudioContext();
    if (!ctx) return;
    playToneSequence(ctx, [finalBeep ? 760 : 520], 0.08, finalBeep ? 0.09 : 0.06, "square");
  }

  function playHurrySound() {
    var ctx = playableAudioContext();
    if (!ctx) return;
    playToneSequence(ctx, [520, 360, 520], 0.08, 0.08, "square");
  }

  function playOverloadSound(stage) {
    var ctx = playableAudioContext();
    if (!ctx) return;
    playToneSequence(ctx, stage > 1 ? [440, 660, 880, 1100] : [380, 560, 760], 0.075, 0.1, "sawtooth");
  }

  function playButtonSound() {
    var ctx = playableAudioContext();
    if (!ctx) return;
    playToneSequence(ctx, [500], 0.045, 0.035, "triangle");
  }

  function playToneSequence(ctx, freqs, noteLength, volume, type) {
    var now = ctx.currentTime;
    freqs.forEach(function (freq, index) {
      var start = now + index * noteLength * 0.82;
      var tone = ctx.createOscillator();
      var gain = connectTimedGain(ctx, start, volume, volume * 0.22, noteLength);
      tone.type = type || "sine";
      tone.frequency.setValueAtTime(freq, start);
      tone.connect(gain);
      tone.start(start);
      tone.stop(start + noteLength + 0.02);
    });
  }

  function vibrate(pattern) {
    if (!vibrationAvailable || !vibrationEnabled || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      return;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function queryValue(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (error) {
      return "";
    }
  }

  function queryFlag(name) {
    var value = queryValue(name).toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  }

  function isEmbeddedFrame() {
    try {
      return window.self !== window.top;
    } catch (error) {
      return true;
    }
  }

  function detectPlatformEmbedMode() {
    return isEmbeddedFrame() ||
      queryFlag("embed") ||
      queryFlag("aigameshare") ||
      queryValue("platform").toLowerCase() === "aigameshare";
  }

  function canUseVibration() {
    var coarsePointer = false;
    try {
      coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    } catch (error) {
      coarsePointer = false;
    }
    return Boolean(coarsePointer && navigator.vibrate);
  }

  function randomAiCooldown() {
    var settings = currentDifficulty();
    return settings.aiThinkMin + Math.random() * (settings.aiThinkMax - settings.aiThinkMin);
  }

  function getPlatformApi() {
    return window.AIGameShare && typeof window.AIGameShare === "object" ? window.AIGameShare : null;
  }

  function cleanPlatformKey(value) {
    var key = String(value || "").trim();
    return /^[a-z0-9_:-]{1,40}$/.test(key) ? key : null;
  }

  function cleanPlatformMeta(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    var clean = {};
    var count = 0;
    Object.keys(value).some(function (key) {
      var item = value[key];
      if (count >= 16) return true;
      if (["string", "number", "boolean"].indexOf(typeof item) !== -1) {
        clean[key] = item;
        count += 1;
      }
      return false;
    });
    return clean;
  }

  function postPlatformMessage(type, payload) {
    if (!platformEmbedMode || !window.parent || window.parent === window) return false;
    var message = { type: "aigameshare:" + type };
    Object.keys(payload || {}).forEach(function (key) {
      message[key] = payload[key];
    });
    window.parent.postMessage(message, "*");
    return true;
  }

  function configuredPlatformSdkSrc() {
    var src = queryValue("platformSdkSrc") ||
      queryValue("sdkSrc") ||
      (gameScript ? gameScript.getAttribute("data-platform-sdk-src") : "");
    if (!src) return "";
    try {
      var url = new URL(src, window.location.href);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      return url.href;
    } catch (error) {
      return "";
    }
  }

  function loadPlatformSdk() {
    if (!platformEmbedMode || getPlatformApi() || document.querySelector("[data-aigameshare-sdk]")) return;
    var sdkSrc = configuredPlatformSdkSrc();
    if (!sdkSrc) return;
    var script = document.createElement("script");
    script.src = sdkSrc;
    script.defer = true;
    script.setAttribute("data-aigameshare-sdk", "true");
    document.head.appendChild(script);
  }

  function withPlatformApi(callback, attempts, fallback) {
    var api = getPlatformApi();
    if (api) {
      callback(api);
      return;
    }
    if (attempts <= 0) {
      if (typeof fallback === "function") fallback();
      return;
    }
    window.setTimeout(function () {
      withPlatformApi(callback, attempts - 1, fallback);
    }, 120);
  }

  function platformState(reason) {
    var player = state && state.players ? state.players[0] : null;
    return {
      phase: gamePhase,
      reason: reason || "",
      round: state ? state.round : 1,
      difficulty: difficulty,
      map: currentMap().id,
      timeLeft: state ? Math.ceil(state.timeLeft / 1000) : Math.ceil(ROUND_TIME / 1000),
      alive: state ? aliveCount() : 0,
      paused: Boolean(state && state.paused),
      spectating: Boolean(state && state.spectating),
      deathChoiceOpen: Boolean(state && state.deathChoiceOpen),
      soundEnabled: soundEnabled,
      blastGuideEnabled: blastGuideEnabled,
      playerWins: player ? player.wins : 0,
      playerWinStreak: playerWinStreak,
      playerBestWinStreak: playerBestWinStreak,
      result: state && state.resultText ? state.resultText : ""
    };
  }

  function announcePlatformReady() {
    if (!platformEmbedMode && !getPlatformApi()) return;
    withPlatformApi(function (api) {
      if (platformReadySent) return;
      platformReadySent = true;
      if (typeof api.ready === "function") api.ready();
      if (typeof api.track === "function") api.track("game_loaded", platformState("loaded"));
      if (typeof api.setState === "function") api.setState(platformState("loaded"));
    }, 20, function () {
      if (platformReadySent) return;
      platformReadySent = true;
      postPlatformMessage("ready", { version: "bubble-battle-fallback" });
      trackPlatform("game_loaded", platformState("loaded"));
      setPlatformState("loaded");
    });
  }

  function trackPlatform(eventName, props) {
    if (!platformEmbedMode && !getPlatformApi()) return;
    withPlatformApi(function (api) {
      if (typeof api.track === "function") api.track(eventName, props || platformState(eventName));
    }, 4, function () {
      var event = cleanPlatformKey(eventName);
      if (!event) return;
      postPlatformMessage("analytics.track", {
        event: event,
        props: cleanPlatformMeta(props || platformState(eventName))
      });
    });
  }

  function setPlatformState(reason) {
    if (!platformEmbedMode && !getPlatformApi()) return;
    withPlatformApi(function (api) {
      if (typeof api.setState === "function") api.setState(platformState(reason));
    }, 4, function () {
      postPlatformMessage("state.update", {
        state: cleanPlatformMeta(platformState(reason))
      });
    });
  }

  function submitPlatformScore(leaderboard, value, meta) {
    if (!platformEmbedMode && !getPlatformApi()) return;
    withPlatformApi(function (api) {
      if (typeof api.submitScore === "function") {
        api.submitScore(leaderboard, value, { meta: meta || platformState("score") });
      }
    }, 4, function () {
      var key = cleanPlatformKey(leaderboard);
      var score = Number(value);
      if (!key || !Number.isFinite(score)) return;
      postPlatformMessage("score.submit", {
        leaderboard: key,
        value: score,
        meta: cleanPlatformMeta(meta || platformState("score"))
      });
    });
  }

  function makeGrid() {
    var grid = [];
    var template = currentMap();
    var softRate = clamp(currentDifficulty().softRate + template.softDelta, 0.25, 0.78);
    for (var y = 0; y < ROWS; y += 1) {
      var row = [];
      for (var x = 0; x < COLS; x += 1) {
        var tileCode = template.layout[y] ? template.layout[y][x] : ".";
        if (tileCode === "#") {
          row.push("hard");
        } else if (isStartSafe(x, y)) {
          row.push("floor");
        } else if (tileCode === "T") {
          row.push("tree");
        } else if (tileCode === "H") {
          row.push("house");
        } else if (tileCode === "-") {
          row.push("floor");
        } else if (tileCode === "s") {
          row.push("soft");
        } else {
          row.push(Math.random() < softRate ? "soft" : "floor");
        }
      }
      grid.push(row);
    }
    return grid;
  }

  function isStartSafe(x, y) {
    return starts.some(function (start) {
      return Math.abs(start.x - x) + Math.abs(start.y - y) <= currentDifficulty().startSafeRadius;
    });
  }

  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return "hard";
    return state.grid[y][x];
  }

  function setTile(x, y, tile) {
    state.grid[y][x] = tile;
  }

  function isBlockingTile(tile) {
    return tile === "hard" || tile === "soft" || tile === "tree" || tile === "house";
  }

  function isBlastStopTile(tile) {
    return tile === "hard" || tile === "house";
  }

  function isBreakableTile(tile) {
    return tile === "soft" || tile === "tree";
  }

  function hasBombAt(x, y) {
    return state.bombs.some(function (bomb) {
      return !bomb.exploded && bomb.x === x && bomb.y === y;
    });
  }

  function playerAt(x, y) {
    return state.players.find(function (player) {
      return player.alive && player.x === x && player.y === y;
    });
  }

  function isWalkable(x, y, player) {
    var tile = tileAt(x, y);
    if (isBlockingTile(tile)) return false;
    if (hasBombAt(x, y) && !(player && player.x === x && player.y === y)) return false;
    return !playerAt(x, y);
  }

  function moveDelay(player) {
    return Math.max(MIN_MOVE_DELAY, 165 - (player.speed - 1) * 20);
  }

  function tryMove(player, dx, dy) {
    if (!player.alive || state.ended || state.paused) return false;
    setPlayerFace(player, dx, dy);
    var nx = player.x + dx;
    var ny = player.y + dy;
    if (!isWalkable(nx, ny, player)) return false;
    beginStepAnimation(player, nx, ny);
    player.x = nx;
    player.y = ny;
    collectItem(player);
    if (isBlasted(nx, ny)) killPlayer(player);
    return true;
  }

  function setPlayerFace(player, dx, dy) {
    if (dx || dy) player.face = { x: dx, y: dy };
  }

  function sameDir(a, b) {
    return Boolean(a && b && a.x === b.x && a.y === b.y);
  }

  function copyDir(dir) {
    return dir ? { x: dir.x, y: dir.y } : null;
  }

  function rememberMoveInput(player, dir) {
    if (!dir) return;
    if (!sameDir(player.moveBuffer, dir)) {
      player.moveBuffer = copyDir(dir);
    }
    player.moveBufferTimer = INPUT_BUFFER_TIME;
  }

  function bufferedMoveInput(player) {
    return player.moveBufferTimer > 0 ? player.moveBuffer : null;
  }

  function tryMoveWithFallback(player, primary, secondary) {
    if (!primary) return false;
    if (tryMove(player, primary.x, primary.y)) return true;
    if (secondary && !sameDir(primary, secondary)) {
      return tryMove(player, secondary.x, secondary.y);
    }
    return false;
  }

  function beginStepAnimation(player, tx, ty) {
    player.moveFromX = player.visualX;
    player.moveFromY = player.visualY;
    player.moveToX = tx;
    player.moveToY = ty;
    player.moveAnimTotal = Math.max(68, Math.min(165, moveDelay(player) + 8));
    player.moveAnim = player.moveAnimTotal;
    player.walkCycle += 1;
  }

  function collectItem(player) {
    var tile = tileAt(player.x, player.y);
    if (tile === "item-fire") {
      player.fire = Math.min(6, player.fire + 1);
      player.baseFire = Math.min(6, player.baseFire + 1);
      setTile(player.x, player.y, "floor");
      playPickupSound("fire");
      if (player.id === 0) state.stats.itemsCollected += 1;
      flash(player.name + " got Fire Up");
    } else if (tile === "item-bomb") {
      player.maxBombs = Math.min(5, player.maxBombs + 1);
      player.baseMaxBombs = Math.min(5, player.baseMaxBombs + 1);
      setTile(player.x, player.y, "floor");
      playPickupSound("bomb");
      if (player.id === 0) state.stats.itemsCollected += 1;
      flash(player.name + " got Bomb Up");
    } else if (tile === "item-speed") {
      player.speed = Math.min(5, player.speed + 1);
      player.baseSpeed = Math.min(5, player.baseSpeed + 1);
      setTile(player.x, player.y, "floor");
      playPickupSound("speed");
      if (player.id === 0) state.stats.itemsCollected += 1;
      flash(player.name + " got Speed Up");
    }
  }

  function placeBomb(player) {
    if (gamePhase !== "playing" || !player.alive || state.ended || state.paused) return;
    if (player.bombsActive >= player.maxBombs || hasBombAt(player.x, player.y)) return;
    state.bombs.push({
      x: player.x,
      y: player.y,
      owner: player.id,
      fire: player.fire,
      timer: BOMB_TIME,
      exploded: false
    });
    player.bombsActive += 1;
    playBombSetSound();
    if (player.id === 0) {
      state.stats.bombsPlaced += 1;
      vibrate(18);
    }
  }

  function explodeBomb(bomb) {
    if (bomb.exploded) return;
    bomb.exploded = true;
    playExplosionSound();
    var owner = state.players[bomb.owner];
    if (owner) owner.bombsActive = Math.max(0, owner.bombsActive - 1);
    var cells = [{ x: bomb.x, y: bomb.y }];
    var dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    dirs.forEach(function (dir) {
      for (var i = 1; i <= bomb.fire; i += 1) {
        var x = bomb.x + dir.x * i;
        var y = bomb.y + dir.y * i;
        var tile = tileAt(x, y);
        if (isBlastStopTile(tile)) break;
        cells.push({ x: x, y: y });
        if (isBreakableTile(tile)) {
          break;
        }
      }
    });

    var hits = [];
    cells.forEach(function (cell) {
      var tile = tileAt(cell.x, cell.y);
      if (isBreakableTile(tile)) {
        setTile(cell.x, cell.y, randomDrop());
      } else if (tile.indexOf("item-") === 0) {
        setTile(cell.x, cell.y, "floor");
      }
      state.bombs.forEach(function (other) {
        if (!other.exploded && other.x === cell.x && other.y === cell.y) {
          other.timer = Math.min(other.timer, 60);
        }
      });
      var hit = playerAt(cell.x, cell.y);
      if (hit && hits.indexOf(hit) === -1) hits.push(hit);
    });

    state.blasts.push({ cells: cells, timer: BLAST_TIME, damageTimer: BLAST_DAMAGE_TIME });
    hits.forEach(function (hit) {
      killPlayer(hit, true, bomb.owner);
    });
    if (hits.length) checkRoundEnd();
    maybeShowDeathChoice();
  }

  function randomDrop() {
    var settings = currentDifficulty();
    var weights = settings.dropWeights || {};
    var total = Math.max(0, weights.fire || 0) + Math.max(0, weights.bomb || 0) + Math.max(0, weights.speed || 0);
    if (total <= 0) return "floor";
    var roll = Math.random() * 100;
    if (roll >= total) return "floor";
    if (roll < weights.fire) return "item-fire";
    if (roll < weights.fire + weights.bomb) return "item-bomb";
    return "item-speed";
  }

  function isBlasted(x, y) {
    return state.blasts.some(function (blast) {
      if (blast.damageTimer <= 0) return false;
      return blast.cells.some(function (cell) {
        return cell.x === x && cell.y === y;
      });
    });
  }

  function killPlayer(player, deferRoundCheck, killerId) {
    if (!player.alive) return;
    addHitFeedback(player);
    playKillSound(player.id === 0);
    vibrate(player.id === 0 ? [80, 40, 120] : 28);
    player.alive = false;
    flash(player.name + " is out");
    if (killerId === 0 && player.id !== 0) state.stats.kills += 1;
    if (player.id === 0) {
      state.deathChoicePending = true;
      state.stats.deathCause = deathCauseText(killerId);
      state.lastDeathCause = state.stats.deathCause;
      resetWinStreak();
    }
    if (!deferRoundCheck) {
      checkRoundEnd();
      maybeShowDeathChoice();
    }
  }

  function deathCauseText(killerId) {
    if (killerId === undefined || killerId === null) return "Blast";
    var killer = state.players[killerId];
    if (!killer) return "Blast";
    if (killer.id === 0) return "Your own bomb";
    return killer.name + "'s bomb";
  }

  function addHitFeedback(player) {
    var effect = {
      x: player.visualX,
      y: player.visualY,
      color: player.style.top,
      accent: player.style.accent,
      timer: HIT_EFFECT_TIME,
      duration: HIT_EFFECT_TIME,
      particles: []
    };
    for (var i = 0; i < 10; i += 1) {
      var angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.36;
      effect.particles.push({
        x: 0,
        y: -10,
        vx: Math.cos(angle) * (22 + Math.random() * 20),
        vy: Math.sin(angle) * (16 + Math.random() * 18) - 16,
        size: 3 + Math.random() * 3,
        color: i % 2 === 0 ? player.style.top : player.style.accent
      });
    }
    state.hitEffects.push(effect);
    if (player.id === 0) {
      state.screenHitTimer = SCREEN_HIT_TIME;
      pulseBoardHit();
    }
  }

  function pulseBoardHit() {
    if (!boardWrap) return;
    boardWrap.classList.remove("player-hit");
    void boardWrap.offsetWidth;
    boardWrap.classList.add("player-hit");
    window.setTimeout(function () {
      if (boardWrap) boardWrap.classList.remove("player-hit");
    }, SCREEN_HIT_TIME);
  }

  function pulseBoardOverload(maxed) {
    if (!boardWrap) return;
    var className = maxed ? "overload-max" : "overload-pulse";
    boardWrap.classList.remove("overload-pulse", "overload-max");
    void boardWrap.offsetWidth;
    boardWrap.classList.add(className);
    window.setTimeout(function () {
      if (boardWrap) boardWrap.classList.remove(className);
    }, maxed ? 760 : 560);
  }

  function reportRoundResult(reason, winner) {
    var survivedSeconds = Math.max(0, Math.floor((ROUND_TIME - state.timeLeft) / 1000));
    state.stats.survivedSeconds = survivedSeconds;
    var player = state.players[0];
    var playerWon = Boolean(winner && winner.id === 0);
    updateWinStreak(playerWon);
    var result = state.resultText || (winner ? winner.name + " wins" : "Draw");
    var meta = {
      round: state.round,
      difficulty: difficulty,
      map: currentMap().id,
      result: result,
      winner: winner ? winner.name : "Draw",
      playerWon: playerWon,
      playerWins: player.wins,
      playerWinStreak: playerWinStreak,
      playerBestWinStreak: playerBestWinStreak,
      survivedSeconds: survivedSeconds,
      bombsPlaced: state.stats.bombsPlaced,
      itemsCollected: state.stats.itemsCollected,
      kills: state.stats.kills,
      deathCause: state.stats.deathCause
    };
    trackPlatform("round_end", meta);
    submitPlatformScore("survival_seconds", survivedSeconds, meta);
    if (playerWon) submitPlatformScore("wins", player.wins, meta);
    if (playerWon) submitPlatformScore("win_streak", playerWinStreak, meta);
    setPlatformState(reason || "round_end");
  }

  function updateWinStreak(playerWon) {
    if (playerWon) {
      playerWinStreak += 1;
      playerBestWinStreak = Math.max(playerBestWinStreak, playerWinStreak);
    } else {
      playerWinStreak = 0;
    }
  }

  function resetWinStreak() {
    playerWinStreak = 0;
  }

  function checkRoundEnd() {
    var alive = state.players.filter(function (player) {
      return player.alive;
    });
    if (alive.length > 1 || state.ended) return;
    state.ended = true;
    state.nextRoundAt = 0;
    if (alive.length === 1) {
      alive[0].wins += 1;
      state.resultText = alive[0].name + " wins";
      flash(alive[0].name + " wins the round");
      playRoundResultSound(alive[0].id === 0 ? "win" : "loss");
    } else {
      state.resultText = "Draw";
      flash("Draw round");
      playRoundResultSound("draw");
    }
    reportRoundResult("elimination", alive[0] || null);
    showResultOverlay();
  }

  function endRoundByTime(now) {
    if (state.ended) return;
    state.timeLeft = 0;
    state.ended = true;
    state.nextRoundAt = 0;
    state.resultText = "Time Up - Draw";
    flash("Time up - draw");
    playRoundResultSound("draw");
    reportRoundResult("time_up", null);
    showResultOverlay();
  }

  function update(dt, now) {
    updateHitFeedback(dt);
    if (gamePhase !== "playing") {
      updateUi();
      return;
    }
    if (state.paused && !state.ended) {
      updateResumeCountdown(dt);
      updateUi();
      return;
    }
    if (!state.ended) {
      updateRoundTimer(dt, now);
      if (state.ended) {
        updateUi();
        return;
      }
    }
    updateHuman(dt);
    updateAI(dt);
    updateBombs(dt);
    updateBlasts(dt);
    checkBlastDamage();
    updatePlayerVisuals(dt);
    updateUi();
  }

  function updateRoundTimer(dt, now) {
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    updateOverloadState();
    if (state.timeLeft <= 0 && aliveCount() > 1) {
      endRoundByTime(now);
    } else if (state.timeLeft <= 0) {
      checkRoundEnd();
    }
  }

  function updateOverloadState() {
    if (!state.overloadWarningShown && state.timeLeft <= OVERLOAD_WARNING_TIME && state.timeLeft > OVERLOAD_PHASE_1_TIME) {
      state.overloadWarningShown = true;
      flash("Hurry Up");
      playHurrySound();
      pulseBoardOverload(false);
      vibrate([40, 30, 40]);
      trackPlatform("overload_warning", platformState("overload_warning"));
    }
    overloadStages.forEach(function (stage) {
      if (state.overloadStage >= stage.id || state.timeLeft > stage.timeLeft) return;
      applyOverloadStage(stage);
    });
  }

  function applyOverloadStage(stage) {
    state.overloadStage = stage.id;
    state.players.forEach(function (player) {
      if (!player.alive) return;
      player.overloadBombs += stage.buffs.bombs;
      player.overloadFire += stage.buffs.fire;
      player.overloadSpeed += stage.buffs.speed;
      applyPlayerOverloadStats(player);
    });
    flash(stage.label + " +" + stage.buffs.bombs + " Bomb +" + stage.buffs.fire + " Fire +" + stage.buffs.speed + " Speed");
    playOverloadSound(stage.id);
    pulseBoardOverload(stage.id > 1);
    vibrate(stage.id > 1 ? [60, 30, 90, 30, 120] : [50, 30, 70]);
    trackPlatform("overload_stage_" + stage.id, platformState("overload_stage_" + stage.id));
    setPlatformState("overload");
  }

  function applyPlayerOverloadStats(player) {
    player.maxBombs = Math.min(5, player.baseMaxBombs + player.overloadBombs);
    player.fire = Math.min(6, player.baseFire + player.overloadFire);
    player.speed = Math.min(5, player.baseSpeed + player.overloadSpeed);
  }

  function updateResumeCountdown(dt) {
    if (state.resumeCountdown <= 0) return;
    var before = Math.ceil(state.resumeCountdown / 1000);
    state.resumeCountdown = Math.max(0, state.resumeCountdown - dt);
    var after = Math.ceil(state.resumeCountdown / 1000);
    if (after > 0 && after < before) {
      playCountdownSound(false);
    }
    if (state.resumeCountdown === 0) {
      state.paused = false;
      playCountdownSound(true);
      syncPauseButtons();
      trackPlatform("resume", platformState("resume"));
      setPlatformState("resume");
    }
  }

  function updatePlayerVisuals(dt) {
    state.players.forEach(function (player) {
      if (player.moveAnim > 0) {
        player.moveAnim = Math.max(0, player.moveAnim - dt);
        var progress = 1 - player.moveAnim / player.moveAnimTotal;
        var eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        player.visualX = player.moveFromX + (player.moveToX - player.moveFromX) * eased;
        player.visualY = player.moveFromY + (player.moveToY - player.moveFromY) * eased;
      } else {
        player.visualX = player.x;
        player.visualY = player.y;
      }
    });
  }

  function updateHuman(dt) {
    var player = state.players[0];
    if (!player || !player.alive) return;
    if (player.moveBufferTimer > 0) {
      player.moveBufferTimer = Math.max(0, player.moveBufferTimer - dt);
    }
    var dir = currentInputDir();
    if (dir) {
      rememberMoveInput(player, dir);
      setPlayerFace(player, dir.x, dir.y);
    }
    if (!dir) {
      player.moveBuffer = null;
      player.moveBufferTimer = 0;
      player.moveCooldown = 0;
      return;
    }
    player.moveCooldown -= dt;
    var steps = 0;
    while (player.moveCooldown <= 0 && steps < MAX_HUMAN_STEPS_PER_FRAME) {
      var nextDir = currentInputDir() || bufferedMoveInput(player);
      if (!nextDir) {
        player.moveCooldown = 0;
        break;
      }
      var moved = tryMoveWithFallback(player, nextDir, currentSecondaryInputDir());
      if (!moved) {
        player.moveCooldown = Math.min(Math.max(player.moveCooldown, 0), 26);
        break;
      }
      player.moveCooldown += moveDelay(player);
      player.moveBufferTimer = 0;
      steps += 1;
    }
  }

  function currentInputDir() {
    if (touchDir) return touchDir;
    return currentKeyboardDir();
  }

  function currentSecondaryInputDir() {
    if (touchDir) return touchSecondaryDir;
    return currentSecondaryKeyboardDir();
  }

  function currentKeyboardDir() {
    compactKeyboardDirStack();
    if (!keyboardDirStack.length) return null;
    return copyDir(keyboardDirections[keyboardDirStack[keyboardDirStack.length - 1]]);
  }

  function currentSecondaryKeyboardDir() {
    compactKeyboardDirStack();
    if (keyboardDirStack.length < 2) return null;
    return copyDir(keyboardDirections[keyboardDirStack[keyboardDirStack.length - 2]]);
  }

  function compactKeyboardDirStack() {
    for (var i = keyboardDirStack.length - 1; i >= 0; i -= 1) {
      if (!isKeyboardDirectionHeld(keyboardDirStack[i])) keyboardDirStack.splice(i, 1);
    }
  }

  function isKeyboardDirectionHeld(name) {
    return Object.keys(keyboardDirectionNames).some(function (key) {
      return keyboardDirectionNames[key] === name && keys[key];
    });
  }

  function pushKeyboardDirection(name) {
    var existing = keyboardDirStack.indexOf(name);
    if (existing !== -1) keyboardDirStack.splice(existing, 1);
    keyboardDirStack.push(name);
  }

  function pressKeyboardKey(key, repeated) {
    var name = keyboardDirectionNames[key];
    if (!name) {
      keys[key] = true;
      return false;
    }
    var wasHeld = isKeyboardDirectionHeld(name);
    keys[key] = true;
    if (!repeated || !wasHeld || keyboardDirStack.indexOf(name) === -1) {
      pushKeyboardDirection(name);
    }
    return true;
  }

  function releaseKeyboardKey(key) {
    var name = keyboardDirectionNames[key];
    keys[key] = false;
    if (name && !isKeyboardDirectionHeld(name)) {
      var existing = keyboardDirStack.indexOf(name);
      if (existing !== -1) keyboardDirStack.splice(existing, 1);
    }
    return Boolean(name);
  }

  function clearKeyboardInput() {
    keys = {};
    keyboardDirStack = [];
  }

  function clearPlayerInput() {
    clearKeyboardInput();
    resetJoystick();
  }

  function updateAI(dt) {
    state.players.forEach(function (player) {
      if (!player.ai || !player.alive || state.ended) return;
      player.moveCooldown -= dt;
      player.aiCooldown -= dt;
      if (player.aiCooldown <= 0) {
        player.aiPlan = chooseAiMove(player);
        player.aiCooldown = randomAiCooldown();
      }
      if (player.aiPlan && player.moveCooldown <= 0) {
        if (player.aiPlan.bomb) placeBomb(player);
        tryMove(player, player.aiPlan.x, player.aiPlan.y);
        player.moveCooldown = moveDelay(player) + 30;
      }
    });
  }

  function chooseAiMove(player) {
    if (isDangerousSoon(player.x, player.y)) {
      return findEscapeMove(player, state.bombs, AI_ESCAPE_DEPTH) || cautiousWait();
    }

    var options = directions.concat([{ x: 0, y: 0 }]);
    var target = nearestEnemy(player);
    var settings = currentDifficulty();
    var wantsBomb = adjacentBreakable(player.x, player.y) || lineThreatAt(player.x, player.y, player.fire, target);
    var bombEscape = wantsBomb ? findBombEscapeMove(player) : null;
    if (bombEscape && Math.random() < settings.aiBombChance) {
      return { x: bombEscape.x, y: bombEscape.y, score: 100, bomb: true };
    }

    var best = { x: 0, y: 0, score: -Infinity, bomb: false };
    options.forEach(function (dir) {
      var nx = player.x + dir.x;
      var ny = player.y + dir.y;
      if (dir.x || dir.y) {
        if (!isWalkable(nx, ny, player)) return;
      }
      var score = Math.random() * 8;
      if (isDangerousSoon(nx, ny)) score -= 130;
      if (isDangerous(nx, ny)) score -= 180;
      if (!findEscapeMoveFrom(player, nx, ny, state.bombs, 5)) score -= 35;
      if (tileAt(nx, ny).indexOf("item-") === 0) score += settings.aiItemWeight;
      if (target) score -= distance(nx, ny, target.x, target.y) * 3 * settings.aiAggression;
      if (adjacentBreakable(nx, ny)) score += 16;
      if (lineThreatAt(nx, ny, player.fire, target)) score += 18 * settings.aiAggression;
      if (dir.x === 0 && dir.y === 0) score -= 8;
      if (score > best.score) best = { x: dir.x, y: dir.y, score: score, bomb: false };
    });
    return best;
  }

  function cautiousWait() {
    return { x: 0, y: 0, score: 0, bomb: false };
  }

  function nearestEnemy(player) {
    var enemies = state.players.filter(function (other) {
      return other.alive && other.id !== player.id;
    });
    enemies.sort(function (a, b) {
      return distance(player.x, player.y, a.x, a.y) - distance(player.x, player.y, b.x, b.y);
    });
    return enemies[0] || null;
  }

  function distance(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function adjacentBreakable(x, y) {
    return directions.some(function (dir) {
      return isBreakableTile(tileAt(x + dir.x, y + dir.y));
    });
  }

  function lineThreatAt(x, y, fire, target) {
    if (!target) return false;
    if (x !== target.x && y !== target.y) return false;
    if (distance(x, y, target.x, target.y) > fire) return false;
    return clearLine(x, y, target.x, target.y);
  }

  function clearLine(ax, ay, bx, by) {
    var dx = Math.sign(bx - ax);
    var dy = Math.sign(by - ay);
    var x = ax + dx;
    var y = ay + dy;
    while (x !== bx || y !== by) {
      var tile = tileAt(x, y);
      if (isBlockingTile(tile)) return false;
      x += dx;
      y += dy;
    }
    return true;
  }

  function findBombEscapeMove(player) {
    if (player.bombsActive >= player.maxBombs || hasBombAt(player.x, player.y)) return null;
    var virtualBombs = state.bombs.concat([{
      x: player.x,
      y: player.y,
      owner: player.id,
      fire: player.fire,
      timer: BOMB_TIME,
      exploded: false,
      virtual: true
    }]);
    return findEscapeMove(player, virtualBombs, AI_ESCAPE_DEPTH);
  }

  function findEscapeMove(player, bombs, maxDepth) {
    return findEscapeMoveFrom(player, player.x, player.y, bombs, maxDepth);
  }

  function findEscapeMoveFrom(player, startX, startY, bombs, maxDepth) {
    var startKey = startX + "," + startY;
    var queue = [{ x: startX, y: startY, depth: 0, first: null }];
    var seen = {};
    seen[startKey] = true;

    while (queue.length) {
      var node = queue.shift();
      if (node.depth > 0 && !isThreatenedByBombs(node.x, node.y, bombs, true)) {
        return node.first || { x: 0, y: 0 };
      }
      if (node.depth >= maxDepth) continue;

      directions.forEach(function (dir) {
        var nx = node.x + dir.x;
        var ny = node.y + dir.y;
        var key = nx + "," + ny;
        if (seen[key]) return;
        if (!isAiPathable(nx, ny, player, startX, startY, bombs)) return;
        seen[key] = true;
        queue.push({
          x: nx,
          y: ny,
          depth: node.depth + 1,
          first: node.first || dir
        });
      });
    }
    return null;
  }

  function isAiPathable(x, y, player, startX, startY, bombs) {
    var tile = tileAt(x, y);
    if (isBlockingTile(tile)) return false;
    if (hasAnyBombAt(bombs, x, y) && !(x === startX && y === startY)) return false;
    var other = playerAt(x, y);
    return !other || other.id === player.id;
  }

  function hasAnyBombAt(bombs, x, y) {
    return bombs.some(function (bomb) {
      return !bomb.exploded && bomb.x === x && bomb.y === y;
    });
  }

  function bombBlastCells(bomb) {
    var cells = [{ x: bomb.x, y: bomb.y }];
    directions.forEach(function (dir) {
      for (var i = 1; i <= bomb.fire; i += 1) {
        var x = bomb.x + dir.x * i;
        var y = bomb.y + dir.y * i;
        var tile = tileAt(x, y);
        if (isBlastStopTile(tile)) break;
        cells.push({ x: x, y: y });
        if (isBreakableTile(tile)) break;
      }
    });
    return cells;
  }

  function isThreatenedByBombs(x, y, bombs, includeFuture) {
    return bombs.some(function (bomb) {
      if (bomb.exploded) return false;
      if (!includeFuture && bomb.timer > AI_DANGER_WINDOW) return false;
      return bombBlastCells(bomb).some(function (cell) {
        return cell.x === x && cell.y === y;
      });
    });
  }

  function isDangerous(x, y) {
    if (isBlasted(x, y)) return true;
    return isThreatenedByBombs(x, y, state.bombs, false);
  }

  function isDangerousSoon(x, y) {
    if (isBlasted(x, y)) return true;
    return isThreatenedByBombs(x, y, state.bombs, true);
  }

  function updateBombs(dt) {
    state.bombs.forEach(function (bomb) {
      if (bomb.exploded) return;
      bomb.timer -= dt;
      if (bomb.timer <= 0) explodeBomb(bomb);
    });
    state.bombs = state.bombs.filter(function (bomb) {
      return !bomb.exploded;
    });
  }

  function updateBlasts(dt) {
    state.blasts.forEach(function (blast) {
      blast.timer -= dt;
      blast.damageTimer = Math.max(0, blast.damageTimer - dt);
    });
    state.blasts = state.blasts.filter(function (blast) {
      return blast.timer > 0;
    });
  }

  function checkBlastDamage() {
    var hits = state.players.filter(function (player) {
      return player.alive && isBlasted(player.x, player.y);
    });
    hits.forEach(function (player) {
      killPlayer(player, true, null);
    });
    if (hits.length) checkRoundEnd();
    maybeShowDeathChoice();
  }

  function flash(message) {
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = 1200;
  }

  function updateToast(dt) {
    if (toastTimer <= 0) return;
    toastTimer -= dt;
    if (toastTimer <= 0) toast.classList.remove("show");
  }

  function updateUi() {
    var player = state.players[0];
    var pauseLabel = "";
    if (state.resumeCountdown > 0) {
      pauseLabel = " - Resume in " + Math.ceil(state.resumeCountdown / 1000);
    } else if (state.paused) {
      pauseLabel = " - Paused";
    }
    var overloadLabel = state.overloadStage > 0 ? " - Overload " + state.overloadStage : "";
    roundStatus.textContent = currentDifficulty().label + " - " + currentMap().name + " - Round " + state.round + " - " + aliveCount() + " left - Time " + formatTime(state.timeLeft) + overloadLabel + pauseLabel;
    if (roundTimer) roundTimer.textContent = formatTime(state.timeLeft);
    if (hudTimer) hudTimer.textContent = formatTime(state.timeLeft);
    statBombs.textContent = player.maxBombs;
    statFire.textContent = player.fire;
    statSpeed.textContent = player.speed;
    statWins.textContent = player.wins;
    if (hudBombs) hudBombs.textContent = player.maxBombs;
    if (hudFire) hudFire.textContent = player.fire;
    if (hudSpeed) hudSpeed.textContent = player.speed;
    if (hudWins) hudWins.textContent = player.wins;
    updateStatusChips();
    syncPauseButtons();
    scoreList.innerHTML = state.players.map(function (p) {
      return '<div class="score-row ' + (p.alive ? "" : "dead") + '">' +
        '<i class="score-dot" style="background:' + p.color + '"></i>' +
        '<span>' + p.name + '</span>' +
        '<b>' + p.wins + '</b>' +
        "</div>";
    }).join("");
  }

  function aliveCount() {
    return state.players.filter(function (player) {
      return player.alive;
    }).length;
  }

  function updateStatusChips() {
    if (!statusChips) return;
    var chips = [
      { label: currentDifficulty().label, tone: difficulty },
      { label: currentMap().name, tone: "map" },
      { label: soundEnabled ? "Sound On" : "Sound Off", tone: soundEnabled ? "sound-on" : "off" },
      { label: blastGuideEnabled ? "Guide On" : "Guide Off", tone: blastGuideEnabled ? "guide-on" : "off" }
    ];
    if (vibrationAvailable) {
      chips.push({ label: vibrationEnabled ? "Vibe On" : "Vibe Off", tone: vibrationEnabled ? "vibe-on" : "off" });
    }
    if (playerWinStreak > 0) {
      chips.push({ label: "Streak " + playerWinStreak, tone: "streak" });
    }
    if (state.overloadStage > 0) {
      chips.push({ label: state.overloadStage > 1 ? "Max Overload" : "Overload", tone: "overload" });
    }
    statusChips.innerHTML = chips.map(function (chip) {
      return '<span class="status-chip status-' + chip.tone + '">' + chip.label + "</span>";
    }).join("");
  }

  function formatTime(ms) {
    var totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  function updateHitFeedback(dt) {
    if (state.screenHitTimer > 0) {
      state.screenHitTimer = Math.max(0, state.screenHitTimer - dt);
    }
    state.hitEffects.forEach(function (effect) {
      effect.timer -= dt;
      var elapsed = effect.duration - effect.timer;
      effect.particles.forEach(function (particle) {
        particle.x += particle.vx * dt / 1000;
        particle.y += particle.vy * dt / 1000;
        particle.vy += 120 * dt / 1000;
      });
      effect.ring = Math.min(1, elapsed / effect.duration);
    });
    state.hitEffects = state.hitEffects.filter(function (effect) {
      return effect.timer > 0;
    });
  }

  function setGameFlowContent(kicker, title, body, action) {
    if (gameFlowKicker) gameFlowKicker.textContent = kicker;
    if (gameFlowTitle) gameFlowTitle.textContent = title;
    if (gameFlowBody) gameFlowBody.textContent = body;
    if (gameFlowPrimary) gameFlowPrimary.textContent = action;
  }

  function showStartOverlay(kicker, body) {
    hideDeathChoice();
    gamePhase = "start";
    state.paused = false;
    state.resumeCountdown = 0;
    clearPlayerInput();
    setGameFlowContent(
      kicker || "Ready",
      currentDifficulty().label + " - " + currentMap().name,
      body || "Round " + state.round + ". 90 seconds. Last one standing.",
      "Start Battle"
    );
    if (gameFlowOverlay) gameFlowOverlay.hidden = false;
    syncPauseButtons();
    setPlatformState("ready");
  }

  function showResultOverlay() {
    hideDeathChoice();
    gamePhase = "result";
    clearPlayerInput();
    setGameFlowContent(
      "Round " + state.round + " Complete",
      state.resultText || "Round Over",
      resultSummaryText(),
      "Next Round"
    );
    if (gameFlowOverlay) gameFlowOverlay.hidden = false;
    syncPauseButtons();
    setPlatformState("result");
  }

  function resultSummaryText() {
    var stats = state.stats || makeRoundStats();
    var death = stats.deathCause ? " / Cause: " + stats.deathCause : "";
    var streak = playerWinStreak > 0 ? " / Streak " + playerWinStreak : "";
    var best = playerBestWinStreak > 0 ? " / Best " + playerBestWinStreak : "";
    return "Survived " + stats.survivedSeconds + "s / KOs " + stats.kills + streak + best + " / Items " + stats.itemsCollected + " / Bombs " + stats.bombsPlaced + death + ". Wins: You " + state.players[0].wins + " / Bolt " + state.players[1].wins + " / Mint " + state.players[2].wins + " / Gold " + state.players[3].wins;
  }

  function maybeShowDeathChoice() {
    var player = state.players[0];
    if (!player || player.alive || state.ended || state.spectating || state.deathChoiceOpen) return;
    if (!state.deathChoicePending || state.deathChoiceShown) return;
    state.deathChoicePending = false;
    state.deathChoiceShown = true;
    state.deathChoiceOpen = true;
    state.paused = true;
    state.resumeCountdown = 0;
    clearPlayerInput();
    if (deathChoiceOverlay) deathChoiceOverlay.hidden = false;
    syncPauseButtons();
    trackPlatform("player_death_choice", platformState("player_death_choice"));
    setPlatformState("player_death_choice");
  }

  function hideDeathChoice() {
    if (!state) return;
    state.deathChoiceOpen = false;
    state.deathChoicePending = false;
    if (deathChoiceOverlay) deathChoiceOverlay.hidden = true;
  }

  function restartAfterDeath(event) {
    captureInput(event);
    playButtonSound();
    resetWinStreak();
    state = makeGame(true, false, false);
    hideDeathChoice();
    showStartOverlay("Try Again", "Round " + state.round + ". Get back in.");
    trackPlatform("death_restart", platformState("death_restart"));
  }

  function watchAfterDeath(event) {
    captureInput(event);
    playButtonSound();
    state.spectating = true;
    state.deathChoiceOpen = false;
    state.deathChoicePending = false;
    state.paused = false;
    state.resumeCountdown = 0;
    if (deathChoiceOverlay) deathChoiceOverlay.hidden = true;
    syncPauseButtons();
    updateUi();
    flash("Watching the round");
    trackPlatform("death_watch", platformState("death_watch"));
    setPlatformState("spectating");
  }

  function startGameFlow() {
    if (gamePhase === "result") {
      state = makeGame(true, true, false);
    }
    gamePhase = "playing";
    state.paused = false;
    state.resumeCountdown = 0;
    clearPlayerInput();
    if (gameFlowOverlay) gameFlowOverlay.hidden = true;
    syncPauseButtons();
    updateUi();
    playRoundStartSound();
    trackPlatform("round_start", platformState("round_start"));
    setPlatformState("playing");
  }

  function isGameFlowOpen() {
    return gameFlowOverlay && !gameFlowOverlay.hidden;
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawBlastGuides();
    drawBombs();
    drawBlasts();
    drawPlayers();
    drawOverloadHud();
    if (state.ended || state.paused) drawOverlay();
    drawHitFeedback();
    drawScreenHitFeedback();
  }

  function drawGrid() {
    for (var y = 0; y < ROWS; y += 1) {
      for (var x = 0; x < COLS; x += 1) {
        drawTileBase(x, y);
      }
    }
    for (var oy = 0; oy < ROWS; oy += 1) {
      for (var ox = 0; ox < COLS; ox += 1) {
        drawTileObject(ox, oy, tileAt(ox, oy));
      }
    }
  }

  function drawTileBase(x, y) {
    var px = x * TILE;
    var py = y * TILE;
    var top = (x + y) % 2 === 0 ? "#2d3a37" : "#293532";
    var edge = (x + y) % 2 === 0 ? "#1d2828" : "#1a2424";
    ctx.fillStyle = "#111719";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = edge;
    fillPoly([
      [px + 4, py + 53],
      [px + 32, py + 61],
      [px + 60, py + 53],
      [px + 60, py + 60],
      [px + 32, py + 67],
      [px + 4, py + 60]
    ]);
    ctx.fillStyle = top;
    fillPoly([
      [px + 4, py + 12],
      [px + 32, py + 4],
      [px + 60, py + 12],
      [px + 60, py + 53],
      [px + 32, py + 61],
      [px + 4, py + 53]
    ]);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.fillRect(px + 10, py + 17, 18, 2);
    ctx.fillRect(px + 36, py + 43, 14, 2);
    ctx.strokeStyle = "rgba(0,0,0,0.24)";
    ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
  }

  function drawTileObject(x, y, tile) {
    var px = x * TILE;
    var py = y * TILE;
    if (tile === "hard") {
      drawHardBlock(px, py);
    } else if (tile === "soft") {
      drawCrate(px, py);
    } else if (tile === "tree") {
      drawTree(px, py);
    } else if (tile === "house") {
      drawHouse(px, py);
    } else if (tile.indexOf("item-") === 0) {
      drawItem(px, py, tile);
    }
  }

  function fillPoly(points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawHardBlock(px, py) {
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(px + 13, py + 47, 42, 10);
    ctx.fillStyle = "#667178";
    fillPoly([[px + 10, py + 17], [px + 32, py + 7], [px + 54, py + 17], [px + 32, py + 27]]);
    ctx.fillStyle = "#48545b";
    fillPoly([[px + 10, py + 17], [px + 32, py + 27], [px + 32, py + 55], [px + 10, py + 44]]);
    ctx.fillStyle = "#39434a";
    fillPoly([[px + 54, py + 17], [px + 32, py + 27], [px + 32, py + 55], [px + 54, py + 44]]);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    fillPoly([[px + 17, py + 18], [px + 32, py + 12], [px + 47, py + 18], [px + 32, py + 24]]);
  }

  function drawCrate(px, py) {
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(px + 11, py + 49, 44, 8);
    ctx.fillStyle = "#ba8350";
    fillPoly([[px + 11, py + 21], [px + 32, py + 11], [px + 53, py + 21], [px + 32, py + 31]]);
    ctx.fillStyle = "#8e5d35";
    fillPoly([[px + 11, py + 21], [px + 32, py + 31], [px + 32, py + 55], [px + 11, py + 44]]);
    ctx.fillStyle = "#764b2d";
    fillPoly([[px + 53, py + 21], [px + 32, py + 31], [px + 32, py + 55], [px + 53, py + 44]]);
    ctx.strokeStyle = "rgba(54, 31, 19, 0.62)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 18, py + 27);
    ctx.lineTo(px + 30, py + 34);
    ctx.moveTo(px + 14, py + 39);
    ctx.lineTo(px + 30, py + 47);
    ctx.moveTo(px + 49, py + 27);
    ctx.lineTo(px + 34, py + 35);
    ctx.moveTo(px + 50, py + 40);
    ctx.lineTo(px + 35, py + 48);
    ctx.stroke();
  }

  function drawTree(px, py) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(px + 33, py + 52, 21, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#714b2c";
    fillPoly([[px + 27, py + 31], [px + 38, py + 31], [px + 39, py + 53], [px + 25, py + 53]]);
    ctx.fillStyle = "#8c6338";
    ctx.fillRect(px + 28, py + 31, 5, 22);
    ctx.fillStyle = "#376a3b";
    ctx.beginPath();
    ctx.arc(px + 32, py + 23, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4f8c4a";
    ctx.beginPath();
    ctx.arc(px + 22, py + 30, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 43, py + 31, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#75b668";
    ctx.beginPath();
    ctx.arc(px + 28, py + 18, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHouse(px, py) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(px + 11, py + 50, 47, 8);
    ctx.fillStyle = "#b78b5e";
    fillPoly([[px + 15, py + 27], [px + 33, py + 35], [px + 33, py + 55], [px + 15, py + 46]]);
    ctx.fillStyle = "#8f6a49";
    fillPoly([[px + 51, py + 27], [px + 33, py + 35], [px + 33, py + 55], [px + 51, py + 46]]);
    ctx.fillStyle = "#d5b17a";
    fillPoly([[px + 15, py + 27], [px + 33, py + 18], [px + 51, py + 27], [px + 33, py + 35]]);
    ctx.fillStyle = "#8f3e36";
    fillPoly([[px + 10, py + 26], [px + 33, py + 10], [px + 56, py + 26], [px + 33, py + 38]]);
    ctx.fillStyle = "#b95a46";
    fillPoly([[px + 15, py + 26], [px + 33, py + 15], [px + 51, py + 26], [px + 33, py + 34]]);
    ctx.fillStyle = "#3c2a20";
    ctx.fillRect(px + 26, py + 41, 9, 14);
    ctx.fillStyle = "#79b7c6";
    ctx.fillRect(px + 40, py + 36, 7, 6);
  }

  function drawItem(px, py, tile) {
    var color = tile === "item-fire" ? "#f07550" : tile === "item-bomb" ? "#66bdd5" : "#7fce72";
    var label = tile === "item-fire" ? "F" : tile === "item-bomb" ? "B" : "S";
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath();
    ctx.ellipse(px + TILE / 2, py + 47, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(px + 18, py + 18, 28, 28, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    roundRect(px + 21, py + 20, 22, 7, 4);
    ctx.fill();
    ctx.fillStyle = "#121619";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, px + TILE / 2, py + TILE / 2 + 1);
  }

  function drawBombs() {
    state.bombs.forEach(function (bomb) {
      var px = bomb.x * TILE + TILE / 2;
      var py = bomb.y * TILE + TILE / 2;
      var pulse = 1 + Math.sin(performance.now() / 90) * 0.08;
      ctx.fillStyle = "#15191d";
      ctx.beginPath();
      ctx.arc(px, py + 3, 18 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = bomb.timer < 700 ? "#f4d45d" : "#7b8790";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#f4d45d";
      ctx.fillRect(px + 10, py - 22, 8, 8);
    });
  }

  function drawBlastGuides() {
    if (!blastGuideEnabled || gamePhase !== "playing" || state.ended) return;
    state.bombs.forEach(function (bomb) {
      if (bomb.exploded || bomb.timer > 700) return;
      var alpha = 0.1 + (700 - bomb.timer) / 700 * 0.22;
      var cells = bombBlastCells(bomb);
      cells.forEach(function (cell) {
        var px = cell.x * TILE;
        var py = cell.y * TILE;
        ctx.fillStyle = "rgba(88, 190, 224, " + (alpha * 0.78) + ")";
        ctx.fillRect(px + 7, py + 7, TILE - 14, TILE - 14);
        ctx.strokeStyle = "rgba(151, 230, 255, " + (alpha + 0.1) + ")";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 10, py + 10, TILE - 20, TILE - 20);
      });
    });
  }

  function drawBlasts() {
    state.blasts.forEach(function (blast) {
      var alpha = Math.max(0.22, blast.timer / BLAST_TIME);
      var lethal = blast.damageTimer > 0;
      blast.cells.forEach(function (cell) {
        var px = cell.x * TILE;
        var py = cell.y * TILE;
        if (lethal) {
          ctx.fillStyle = "rgba(245, 205, 75, " + alpha + ")";
          ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
          ctx.fillStyle = "rgba(230, 86, 64, " + (alpha * 0.72) + ")";
          ctx.fillRect(px + 17, py + 17, TILE - 34, TILE - 34);
        } else {
          ctx.fillStyle = "rgba(246, 238, 198, " + (alpha * 0.24) + ")";
          ctx.fillRect(px + 8, py + 8, TILE - 16, TILE - 16);
          ctx.fillStyle = "rgba(145, 171, 178, " + (alpha * 0.22) + ")";
          ctx.fillRect(px + 20, py + 20, TILE - 40, TILE - 40);
        }
      });
    });
  }

  function drawPlayers() {
    state.players.forEach(function (player) {
      if (!player.alive) return;
      var px = player.visualX * TILE + TILE / 2;
      var py = player.visualY * TILE + TILE / 2;
      drawCharacter(player, px, py);
    });
  }

  function drawCharacter(player, px, py) {
    var style = player.style;
    var facing = facingName(player.face);
    var walk = walkPose(player);
    var leanX = (player.face ? player.face.x : 0) * 2;
    var leanY = facing === "back" ? -2 : facing === "front" ? 1 : 0;

    ctx.save();
    ctx.translate(px + leanX, py + leanY);

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 23, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -walk.bob);
    drawCharacterFeet(style, facing, walk);
    if (facing === "back") {
      drawCharacterBack(player, style, walk);
    } else if (facing === "left" || facing === "right") {
      if (facing === "left") ctx.scale(-1, 1);
      drawCharacterSide(player, style, walk);
    } else {
      drawCharacterFront(player, style, walk);
    }

    ctx.restore();
  }

  function walkPose(player) {
    if (player.moveAnim <= 0 || player.moveAnimTotal <= 0) {
      return { bob: 0, swing: 0, frame: 0, active: false };
    }
    var progress = 1 - player.moveAnim / player.moveAnimTotal;
    var cycle = progress * Math.PI * 2;
    var swing = Math.sin(cycle);
    return {
      bob: Math.abs(swing) * 3,
      swing: swing,
      frame: progress < 0.5 ? -1 : 1,
      active: true
    };
  }

  function facingName(face) {
    if (!face) return "front";
    if (face.y < 0) return "back";
    if (face.x < 0) return "left";
    if (face.x > 0) return "right";
    return "front";
  }

  function drawCharacterFeet(style, facing, walk) {
    ctx.fillStyle = style.dark;
    if (facing === "left" || facing === "right") {
      var sign = facing === "left" ? -1 : 1;
      var sideStep = walk.frame * 3;
      ctx.beginPath();
      ctx.ellipse(sign * (-8 - sideStep), 20 + sideStep * 0.35, 7, 5, -0.1 * sign, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sign * (12 + sideStep), 20 - sideStep * 0.35, 9, 5, 0.16 * sign, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    var frontStep = walk.frame * 2;
    ctx.beginPath();
    ctx.ellipse(-11, 19 + frontStep, 8, 5, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(11, 19 - frontStep, 8, 5, 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCharacterFront(player, style, walk) {
    var armSwing = walk.frame * 3;
    ctx.fillStyle = style.side;
    roundRect(-29, -2 + armSwing, 16, 27, 8);
    ctx.fill();
    roundRect(13, -2 - armSwing, 16, 27, 8);
    ctx.fill();

    ctx.fillStyle = style.side;
    roundRect(-22, -7, 44, 36, 14);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    roundRect(-19, 13, 38, 14, 9);
    ctx.fill();

    ctx.fillStyle = style.body;
    roundRect(-20, -19, 40, 36, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    roundRect(-20, -19, 40, 36, 14);
    ctx.stroke();

    ctx.fillStyle = style.top;
    ctx.beginPath();
    ctx.ellipse(0, -20, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.26)";
    ctx.beginPath();
    ctx.ellipse(-7, -27, 8, 4, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = style.dark;
    roundRect(-14, -18, 28, 14, 7);
    ctx.fill();
    ctx.fillStyle = style.light;
    roundRect(-10, -15, 20, 6, 4);
    ctx.fill();

    ctx.fillStyle = style.accent;
    roundRect(-13, 8, 26, 5, 3);
    ctx.fill();
    drawCharacterDetails(player, style, "front");

    ctx.fillStyle = style.dark;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(style.mark, 0, 1);
  }

  function drawCharacterBack(player, style, walk) {
    var armSwing = walk.frame * 3;
    ctx.fillStyle = style.side;
    roundRect(-27, -1 - armSwing, 14, 26, 8);
    ctx.fill();
    roundRect(13, -1 + armSwing, 14, 26, 8);
    ctx.fill();

    ctx.fillStyle = style.side;
    roundRect(-22, -6, 44, 35, 14);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    roundRect(-15, -1, 30, 25, 10);
    ctx.fill();

    ctx.fillStyle = style.body;
    roundRect(-20, -18, 40, 35, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    roundRect(-20, -18, 40, 35, 14);
    ctx.stroke();

    ctx.fillStyle = style.top;
    ctx.beginPath();
    ctx.ellipse(0, -21, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath();
    ctx.ellipse(0, -13, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = style.side;
    roundRect(-11, -11, 22, 22, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    roundRect(-7, -8, 14, 15, 6);
    ctx.fill();

    ctx.fillStyle = style.accent;
    roundRect(-13, 8, 26, 5, 3);
    ctx.fill();
    drawCharacterDetails(player, style, "back");
  }

  function drawCharacterSide(player, style, walk) {
    var armSwing = walk.frame * 3;
    ctx.fillStyle = style.side;
    roundRect(-21, -1 + armSwing, 17, 26, 8);
    ctx.fill();
    ctx.fillStyle = style.dark;
    roundRect(13, -armSwing, 13, 23, 7);
    ctx.fill();

    ctx.fillStyle = style.side;
    roundRect(-17, -5, 39, 34, 14);
    ctx.fill();
    ctx.fillStyle = style.body;
    roundRect(-12, -19, 34, 36, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    roundRect(-12, -19, 34, 36, 14);
    ctx.stroke();

    ctx.fillStyle = style.top;
    ctx.beginPath();
    ctx.ellipse(2, -21, 21, 15, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(-5, -28, 7, 3, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = style.dark;
    roundRect(1, -17, 20, 13, 7);
    ctx.fill();
    ctx.fillStyle = style.light;
    roundRect(5, -14, 12, 5, 4);
    ctx.fill();

    ctx.fillStyle = style.accent;
    roundRect(-5, 8, 24, 5, 3);
    ctx.fill();
    drawCharacterDetails(player, style, "side");

    ctx.fillStyle = style.dark;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(style.mark, 8, 1);
  }

  function drawCharacterDetails(player, style, facing) {
    if (style.pattern === "pilot") {
      ctx.fillStyle = style.accent;
      roundRect(facing === "side" ? 3 : -4, -36, 8, 11, 4);
      ctx.fill();
      ctx.fillStyle = style.trim;
      ctx.fillRect(facing === "side" ? 5 : -2, -33, 4, 12);
      ctx.fillStyle = style.accent;
      ctx.beginPath();
      ctx.arc(facing === "side" ? 7 : 0, -37, 4, 0, Math.PI * 2);
      ctx.fill();
      if (facing === "back") {
        ctx.fillStyle = style.trim;
        roundRect(-4, -5, 8, 16, 4);
        ctx.fill();
      }
    } else if (style.pattern === "bolt") {
      ctx.fillStyle = style.accent;
      ctx.beginPath();
      if (facing === "side") {
        ctx.moveTo(4, -31);
        ctx.lineTo(16, -29);
        ctx.lineTo(9, -18);
        ctx.lineTo(18, -17);
        ctx.lineTo(3, 3);
        ctx.lineTo(7, -11);
        ctx.lineTo(-1, -12);
      } else {
        ctx.moveTo(-5, -31);
        ctx.lineTo(8, -31);
        ctx.lineTo(1, -19);
        ctx.lineTo(11, -19);
        ctx.lineTo(-4, facing === "back" ? 6 : 2);
        ctx.lineTo(0, -12);
        ctx.lineTo(-9, -12);
      }
      ctx.closePath();
      ctx.fill();
      if (facing !== "back") {
        ctx.fillStyle = style.side;
        ctx.beginPath();
        ctx.moveTo(-22, -18);
        ctx.lineTo(-31, -9);
        ctx.lineTo(-20, -7);
        ctx.closePath();
        ctx.fill();
        if (facing !== "side") {
          ctx.beginPath();
          ctx.moveTo(22, -18);
          ctx.lineTo(31, -9);
          ctx.lineTo(20, -7);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (style.pattern === "mint") {
      ctx.fillStyle = style.accent;
      ctx.beginPath();
      ctx.ellipse(facing === "side" ? 3 : -8, -33, 8, 4, -0.55, 0, Math.PI * 2);
      ctx.fill();
      if (facing !== "side") {
        ctx.beginPath();
        ctx.ellipse(8, -33, 8, 4, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = style.light;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(facing === "side" ? 7 : 0, -33);
      ctx.lineTo(facing === "side" ? 5 : 0, -21);
      ctx.stroke();
      ctx.fillStyle = style.trim;
      roundRect(facing === "side" ? -8 : -16, -2, 7, 15, 4);
      ctx.fill();
      if (facing !== "side") {
        roundRect(9, -2, 7, 15, 4);
        ctx.fill();
      }
    } else if (style.pattern === "gold") {
      ctx.fillStyle = style.accent;
      ctx.beginPath();
      ctx.moveTo(facing === "side" ? -4 : -12, -29);
      ctx.lineTo(facing === "side" ? 1 : -6, -39);
      ctx.lineTo(facing === "side" ? 6 : 0, -29);
      ctx.lineTo(facing === "side" ? 10 : 6, -39);
      ctx.lineTo(facing === "side" ? 16 : 12, -29);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = style.light;
      ctx.beginPath();
      ctx.arc(facing === "side" ? 7 : 0, -32, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = style.accent;
      ctx.beginPath();
      ctx.moveTo(facing === "side" ? 8 : 0, 6);
      ctx.lineTo(facing === "side" ? 15 : 7, -1);
      ctx.lineTo(facing === "side" ? 8 : 0, -8);
      ctx.lineTo(facing === "side" ? 1 : -7, -1);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawHitFeedback() {
    if (!state.hitEffects.length) return;
    state.hitEffects.forEach(function (effect) {
      var progress = 1 - effect.timer / effect.duration;
      var alpha = Math.max(0, effect.timer / effect.duration);
      var px = effect.x * TILE + TILE / 2;
      var py = effect.y * TILE + TILE / 2;

      ctx.save();
      ctx.translate(px, py);
      ctx.globalCompositeOperation = "lighter";

      ctx.strokeStyle = "rgba(255, 246, 202, " + (0.72 * alpha) + ")";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -10, 12 + progress * 34, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(238, 86, 73, " + (0.7 * alpha) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-25 - progress * 9, -26);
      ctx.lineTo(25 + progress * 9, 16);
      ctx.moveTo(23 + progress * 8, -24);
      ctx.lineTo(-22 - progress * 8, 16);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, " + (0.62 * alpha) + ")";
      ctx.beginPath();
      ctx.ellipse(0, -12, 16 - progress * 4, 20 - progress * 6, 0, 0, Math.PI * 2);
      ctx.fill();

      effect.particles.forEach(function (particle) {
        ctx.fillStyle = colorWithAlpha(particle.color, alpha);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    });
  }

  function drawScreenHitFeedback() {
    if (state.screenHitTimer <= 0) return;
    var alpha = state.screenHitTimer / SCREEN_HIT_TIME;
    ctx.save();
    ctx.fillStyle = "rgba(177, 38, 31, " + (0.12 * alpha) + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255, 94, 78, " + (0.52 * alpha) + ")";
    ctx.lineWidth = 12 + 10 * alpha;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.restore();
  }

  function drawOverloadHud() {
    if (gamePhase !== "playing" || state.ended || state.overloadStage <= 0) return;
    var alpha = state.overloadStage > 1 ? 0.18 : 0.1;
    ctx.save();
    ctx.fillStyle = "rgba(229, 184, 76, " + alpha + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = state.overloadStage > 1 ? "rgba(255, 120, 82, 0.62)" : "rgba(229, 184, 76, 0.5)";
    ctx.lineWidth = state.overloadStage > 1 ? 10 : 7;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.fillStyle = state.overloadStage > 1 ? "#ffb18d" : "#fff2a8";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(state.overloadStage > 1 ? "MAX OVERLOAD" : "OVERLOAD", canvas.width - 16, 14);
    ctx.restore();
  }

  function colorWithAlpha(color, alpha) {
    if (color.charAt(0) !== "#" || color.length !== 7) {
      return color;
    }
    var r = parseInt(color.slice(1, 3), 16);
    var g = parseInt(color.slice(3, 5), 16);
    var b = parseInt(color.slice(5, 7), 16);
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  function drawOverlay() {
    ctx.fillStyle = "rgba(10, 12, 14, 0.58)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f2ea";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (state.paused && !state.ended) {
      if (state.resumeCountdown > 0) {
        ctx.font = "bold 86px sans-serif";
        ctx.fillText(Math.ceil(state.resumeCountdown / 1000), canvas.width / 2, canvas.height / 2 - 8);
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "rgba(244, 242, 234, 0.74)";
        ctx.fillText("Resuming", canvas.width / 2, canvas.height / 2 + 58);
        return;
      }
      ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "rgba(244, 242, 234, 0.74)";
      ctx.fillText("Press P or Resume to start countdown", canvas.width / 2, canvas.height / 2 + 42);
      return;
    }
    var winner = state.players.find(function (player) {
      return player.alive;
    });
    ctx.fillText(state.resultText || (winner ? winner.name + " wins" : "Draw"), canvas.width / 2, canvas.height / 2);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function frame(now) {
    var dt = Math.min(48, now - lastFrame);
    lastFrame = now;
    update(dt, now);
    updateToast(dt);
    render();
    requestAnimationFrame(frame);
  }

  function syncMapButtons() {
    mapButtons.forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-map") === currentMap().id);
    });
  }

  function syncDifficultyButtons() {
    difficultyButtons.forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-difficulty") === difficulty);
    });
  }

  function syncOptionButtons() {
    soundButtons.forEach(function (button) {
      button.classList.toggle("active", (button.getAttribute("data-sound") === "on") === soundEnabled);
    });
    vibrationSettingRows.forEach(function (row) {
      row.hidden = !vibrationAvailable;
    });
    vibrationButtons.forEach(function (button) {
      button.disabled = !vibrationAvailable;
      button.classList.toggle("active", (button.getAttribute("data-vibration") === "on") === vibrationEnabled);
    });
    blastGuideButtons.forEach(function (button) {
      button.classList.toggle("active", (button.getAttribute("data-blast-guide") === "on") === blastGuideEnabled);
    });
  }

  function allPauseButtons() {
    var buttons = [];
    if (pauseBtn) buttons.push(pauseBtn);
    pauseButtons.forEach(function (button) {
      buttons.push(button);
    });
    return buttons;
  }

  function syncPauseButtons() {
    allPauseButtons().forEach(function (button) {
      if (state.deathChoiceOpen) {
        button.setAttribute("aria-label", "Choose restart or watch");
        button.title = "Choose restart or watch";
        button.textContent = button.classList.contains("mobile-pause") ? "..." : "Choose";
        button.classList.add("active");
        button.disabled = true;
        return;
      }
      var label = state.resumeCountdown > 0 ? "Cancel resume countdown" : state.paused ? "Resume" : "Pause";
      button.setAttribute("aria-label", label);
      button.title = label;
      if (button.classList.contains("mobile-pause")) {
        button.textContent = state.resumeCountdown > 0 ? "X" : state.paused ? "Go" : "II";
      } else {
        button.textContent = state.resumeCountdown > 0 ? "Cancel" : state.paused ? "Resume" : "Pause";
      }
      button.classList.toggle("active", state.paused);
      button.disabled = gamePhase !== "playing";
    });
  }

  function fullscreenElement() {
    return document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null;
  }

  function canUseFullscreen() {
    var target = appShell || document.documentElement;
    return Boolean(target && (
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.mozRequestFullScreen ||
      target.msRequestFullscreen
    ));
  }

  function syncFullscreenButton() {
    if (platformEmbedMode) {
      fullscreenButtons.forEach(function (button) {
        button.hidden = true;
        button.classList.remove("active");
      });
      return;
    }
    var available = canUseFullscreen();
    var active = Boolean(fullscreenElement());
    var label = active ? "Exit fullscreen" : "Enter fullscreen";
    fullscreenButtons.forEach(function (button) {
      button.hidden = !available;
      if (!available) return;
      button.classList.toggle("active", active);
      button.setAttribute("aria-label", label);
      button.title = label;
      if (!button.classList.contains("mobile-fullscreen")) {
        button.textContent = active ? "Exit Fullscreen" : "Fullscreen";
      }
    });
  }

  function requestAppFullscreen() {
    var target = appShell || document.documentElement;
    if (!target) return;
    fullscreenTransitionUntil = performance.now() + 900;
    try {
      var result;
      if (target.requestFullscreen) {
        result = target.requestFullscreen({ navigationUI: "hide" });
      } else if (target.webkitRequestFullscreen) {
        result = target.webkitRequestFullscreen();
      } else if (target.mozRequestFullScreen) {
        result = target.mozRequestFullScreen();
      } else if (target.msRequestFullscreen) {
        result = target.msRequestFullscreen();
      }
      if (result && typeof result.catch === "function") {
        result.catch(function () {
          flash("Fullscreen unavailable");
          syncFullscreenButton();
        });
      }
    } catch (error) {
      flash("Fullscreen unavailable");
      syncFullscreenButton();
    }
  }

  function exitAppFullscreen() {
    fullscreenTransitionUntil = performance.now() + 900;
    try {
      var result;
      if (document.exitFullscreen) {
        result = document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        result = document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        result = document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        result = document.msExitFullscreen();
      }
      if (result && typeof result.catch === "function") {
        result.catch(function () {
          syncFullscreenButton();
        });
      }
    } catch (error) {
      syncFullscreenButton();
    }
  }

  function toggleFullscreen(event) {
    captureInput(event);
    if (platformEmbedMode) return;
    if (!canUseFullscreen()) {
      flash("Fullscreen unavailable");
      syncFullscreenButton();
      return;
    }
    if (fullscreenElement()) {
      exitAppFullscreen();
    } else {
      requestAppFullscreen();
    }
  }

  function togglePause() {
    if (gamePhase !== "playing" || state.ended || state.deathChoiceOpen) return;
    playButtonSound();
    if (!state.paused) {
      state.paused = true;
      state.resumeCountdown = 0;
      clearPlayerInput();
    } else if (state.resumeCountdown > 0) {
      state.resumeCountdown = 0;
    } else {
      state.resumeCountdown = RESUME_COUNTDOWN_TIME;
    }
    syncPauseButtons();
    trackPlatform(state.resumeCountdown > 0 ? "resume_countdown" : state.paused ? "pause" : "resume", platformState("pause_toggle"));
    setPlatformState("pause_toggle");
  }

  function openSettings(event) {
    captureInput(event);
    playButtonSound();
    if (gamePhase === "playing" && !state.ended && !state.paused) {
      state.paused = true;
      state.resumeCountdown = 0;
      settingsResumeAfterClose = true;
      clearPlayerInput();
    } else {
      if (state.resumeCountdown > 0) state.resumeCountdown = 0;
      settingsResumeAfterClose = false;
    }
    if (settingsModal) settingsModal.hidden = false;
    syncPauseButtons();
    trackPlatform("settings_open", platformState("settings_open"));
    setPlatformState("settings_open");
  }

  function closeSettings(event) {
    if (event) event.preventDefault();
    if (!settingsModal || settingsModal.hidden) return;
    playButtonSound();
    if (settingsModal) settingsModal.hidden = true;
    if (settingsResumeAfterClose && gamePhase === "playing" && state.paused && !state.ended) {
      state.resumeCountdown = RESUME_COUNTDOWN_TIME;
    }
    settingsResumeAfterClose = false;
    syncPauseButtons();
    trackPlatform("settings_close", platformState("settings_close"));
    setPlatformState("settings_close");
  }

  function isSettingsOpen() {
    return settingsModal && !settingsModal.hidden;
  }

  function pauseForInterruption() {
    if (performance.now() < fullscreenTransitionUntil) return;
    if (gamePhase !== "playing" || state.ended || state.paused) return;
    state.paused = true;
    state.resumeCountdown = 0;
    clearPlayerInput();
    syncPauseButtons();
    updateUi();
    trackPlatform("auto_pause", platformState("interruption"));
    setPlatformState("interruption");
  }

  function resetRound() {
    playButtonSound();
    resetWinStreak();
    state = makeGame(true, false, false);
    showStartOverlay("Round Reset");
    closeSettings();
    trackPlatform("round_reset", platformState("round_reset"));
  }

  function nextMap() {
    playButtonSound();
    resetWinStreak();
    mapIndex = (mapIndex + 1) % mapTemplates.length;
    syncMapButtons();
    state = makeGame(false, false, true);
    flash(currentMap().name + " map");
    showStartOverlay("New Map");
    closeSettings();
    trackPlatform("map_next", platformState("map_next"));
  }

  function selectMap(mapId) {
    var nextIndex = mapTemplates.findIndex(function (template) {
      return template.id === mapId;
    });
    if (nextIndex < 0) return;
    playButtonSound();
    resetWinStreak();
    mapIndex = nextIndex;
    syncMapButtons();
    state = makeGame(false, false, true);
    flash(currentMap().name + " map");
    showStartOverlay("New Map");
    closeSettings();
    trackPlatform("map_select", platformState("map_select"));
  }

  function updateJoystick(event) {
    var rect = joystick.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2 + joystickBaseX;
    var centerY = rect.top + rect.height / 2 + joystickBaseY;
    var dx = event.clientX - centerX;
    var dy = event.clientY - centerY;
    var distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

    var limit = rect.width * JOYSTICK_MAX_RANGE;
    if (distanceFromCenter > limit) {
      var overflow = distanceFromCenter - limit;
      var drift = Math.min(overflow, rect.width * 0.14);
      joystickBaseX += dx / distanceFromCenter * drift;
      joystickBaseY += dy / distanceFromCenter * drift;
      clampJoystickBase(rect);
      centerX = rect.left + rect.width / 2 + joystickBaseX;
      centerY = rect.top + rect.height / 2 + joystickBaseY;
      dx = event.clientX - centerX;
      dy = event.clientY - centerY;
      distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
    }

    var ratio = distanceFromCenter > 0 ? Math.min(distanceFromCenter, limit) / distanceFromCenter : 0;
    var knobX = dx * ratio;
    var knobY = dy * ratio;

    setJoystickVisual(joystickBaseX, joystickBaseY, knobX, knobY);

    var deadzone = rect.width * JOYSTICK_DEADZONE;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (distanceFromCenter < deadzone) {
      touchDir = null;
      touchSecondaryDir = null;
    } else {
      var primaryHorizontal;
      if (touchDir && touchDir.x) {
        primaryHorizontal = !(absY > absX * JOYSTICK_SWITCH_RATIO);
      } else if (touchDir && touchDir.y) {
        primaryHorizontal = absX > absY * JOYSTICK_SWITCH_RATIO;
      } else {
        primaryHorizontal = absX >= absY;
      }
      if (primaryHorizontal) {
        touchDir = { x: dx > 0 ? 1 : -1, y: 0 };
        touchSecondaryDir = absY > deadzone * 0.78 ? { x: 0, y: dy > 0 ? 1 : -1 } : null;
      } else {
        touchDir = { x: 0, y: dy > 0 ? 1 : -1 };
        touchSecondaryDir = absX > deadzone * 0.78 ? { x: dx > 0 ? 1 : -1, y: 0 } : null;
      }
    }
    event.preventDefault();
  }

  function setJoystickBaseFromPointer(event) {
    var rect = joystick.getBoundingClientRect();
    joystickBaseX = event.clientX - (rect.left + rect.width / 2);
    joystickBaseY = event.clientY - (rect.top + rect.height / 2);
    clampJoystickBase(rect);
    setJoystickVisual(joystickBaseX, joystickBaseY, 0, 0);
  }

  function clampJoystickBase(rect) {
    var limit = rect.width * JOYSTICK_FLOAT_RANGE;
    var distanceFromCenter = Math.sqrt(joystickBaseX * joystickBaseX + joystickBaseY * joystickBaseY);
    if (distanceFromCenter <= limit || distanceFromCenter === 0) return;
    joystickBaseX = joystickBaseX / distanceFromCenter * limit;
    joystickBaseY = joystickBaseY / distanceFromCenter * limit;
  }

  function setJoystickVisual(baseX, baseY, stickX, stickY) {
    if (joystick) {
      joystick.style.setProperty("--base-x", baseX + "px");
      joystick.style.setProperty("--base-y", baseY + "px");
    }
    if (joystickKnob) {
      joystickKnob.style.setProperty("--stick-x", stickX + "px");
      joystickKnob.style.setProperty("--stick-y", stickY + "px");
    }
  }

  function resetJoystick() {
    touchDir = null;
    touchSecondaryDir = null;
    joystickPointer = null;
    joystickBaseX = 0;
    joystickBaseY = 0;
    if (joystick) joystick.classList.remove("active");
    setJoystickVisual(0, 0, 0, 0);
  }

  function captureInput(event) {
    if (!event) return;
    unlockAudio();
    event.preventDefault();
    if (event.currentTarget && event.currentTarget.setPointerCapture && event.pointerId !== undefined) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handleBombPress(event) {
    captureInput(event);
    placeBomb(state.players[0]);
  }

  function handlePausePress(event) {
    captureInput(event);
    togglePause();
  }

  function restartGame(reason) {
    playButtonSound();
    resetWinStreak();
    state = makeGame(false, false, true);
    showStartOverlay(reason || "Restarted", "Round " + state.round + ". 90 seconds.");
    closeSettings();
    trackPlatform("game_restart", platformState("game_restart"));
    updateUi();
  }

  function setDifficulty(nextDifficulty) {
    if (!difficultySettings[nextDifficulty]) return false;
    playButtonSound();
    resetWinStreak();
    difficulty = nextDifficulty;
    syncDifficultyButtons();
    state = makeGame(false, false, true);
    flash(currentDifficulty().label + " difficulty");
    showStartOverlay("Difficulty Set");
    closeSettings();
    trackPlatform("difficulty_select", platformState("difficulty_select"));
    return true;
  }

  function setSoundEnabled(value) {
    soundEnabled = value;
    if (!soundEnabled && audioContext && audioContext.state === "running") {
      audioContext.suspend();
    } else if (soundEnabled) {
      unlockAudio();
      playButtonSound();
    }
    syncOptionButtons();
    updateStatusChips();
    flash(value ? "Sound On" : "Sound Off");
    trackPlatform("sound_toggle", platformState("sound_toggle"));
  }

  function setVibrationEnabled(value) {
    if (!vibrationAvailable) return;
    vibrationEnabled = value;
    if (vibrationEnabled) vibrate(25);
    syncOptionButtons();
    updateStatusChips();
    flash(value ? "Vibration On" : "Vibration Off");
    trackPlatform("vibration_toggle", platformState("vibration_toggle"));
  }

  function setBlastGuideEnabled(value) {
    blastGuideEnabled = value;
    syncOptionButtons();
    updateStatusChips();
    flash(value ? "Blast Guide On" : "Blast Guide Off");
    trackPlatform("blast_guide_toggle", platformState("blast_guide_toggle"));
  }

  function resumeWithCountdown() {
    if (gamePhase !== "playing" || state.ended || !state.paused) return false;
    playButtonSound();
    state.resumeCountdown = RESUME_COUNTDOWN_TIME;
    syncPauseButtons();
    trackPlatform("resume_countdown", platformState("resume_countdown"));
    setPlatformState("resume_countdown");
    return true;
  }

  function exposeHostApi() {
    window.BubbleBattle = Object.freeze({
      start: function () {
        startGameFlow();
      },
      restart: function () {
        restartGame("Restarted");
      },
      pause: function () {
        if (gamePhase === "playing" && !state.ended && !state.paused) togglePause();
      },
      resume: resumeWithCountdown,
      setDifficulty: setDifficulty,
      setMap: function (mapId) {
        selectMap(mapId);
      },
      getState: function () {
        return platformState("external");
      }
    });
  }

  function handleHostMessage(event) {
    if (!platformEmbedMode || !event.data || typeof event.data !== "object") return;
    var type = event.data.type;
    if (type === "bubble-battle:start") {
      startGameFlow();
    } else if (type === "bubble-battle:restart" || type === "aigameshare:restart") {
      restartGame("Restarted");
    } else if (type === "bubble-battle:pause") {
      if (gamePhase === "playing" && !state.ended && !state.paused) togglePause();
    } else if (type === "bubble-battle:resume") {
      resumeWithCountdown();
    }
  }

  document.addEventListener("keydown", function (event) {
    unlockAudio();
    var key = event.key.toLowerCase();
    var isBombKey = key === " " || key === "spacebar";
    var handledMovement = false;
    if (isSettingsOpen()) {
      if (key === "escape") closeSettings(event);
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "spacebar", "enter", "r", "p"].indexOf(key) !== -1) {
        event.preventDefault();
      }
      return;
    }
    if (state.deathChoiceOpen) {
      if ((key === "enter" || isBombKey || key === "r") && !event.repeat) {
        restartAfterDeath(event);
      } else if ((key === "escape" || key === "v") && !event.repeat) {
        watchAfterDeath(event);
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "spacebar", "enter", "escape", "r", "v"].indexOf(key) !== -1) {
        event.preventDefault();
      }
      return;
    }
    if (isGameFlowOpen()) {
      if ((key === "enter" || isBombKey) && !event.repeat) {
        startGameFlow();
        event.preventDefault();
      }
      if (key === "r" && !event.repeat) {
        resetRound();
        event.preventDefault();
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "spacebar", "enter"].indexOf(key) !== -1) {
        event.preventDefault();
      }
      return;
    }
    handledMovement = pressKeyboardKey(key, event.repeat);
    if (isBombKey) {
      if (!event.repeat) placeBomb(state.players[0]);
      event.preventDefault();
      return;
    }
    if (key === "r" && !event.repeat) {
      clearPlayerInput();
      resetWinStreak();
      state = makeGame(true, false, false);
      showStartOverlay("Round Reset");
      trackPlatform("round_reset", platformState("round_reset"));
      event.preventDefault();
      return;
    }
    if (key === "p" && !event.repeat) {
      togglePause();
      event.preventDefault();
      return;
    }
    if (key === "escape") {
      closeSettings(event);
    }
    if (handledMovement || ["arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(key) !== -1) {
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", function (event) {
    var key = event.key.toLowerCase();
    var handledMovement = releaseKeyboardKey(key);
    if (handledMovement || ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar"].indexOf(key) !== -1) {
      event.preventDefault();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pauseForInterruption();
  });

  ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach(function (eventName) {
    document.addEventListener(eventName, syncFullscreenButton);
  });

  ["fullscreenerror", "webkitfullscreenerror", "mozfullscreenerror", "MSFullscreenError"].forEach(function (eventName) {
    document.addEventListener(eventName, function () {
      flash("Fullscreen unavailable");
      syncFullscreenButton();
    });
  });

  window.addEventListener("blur", pauseForInterruption);
  window.addEventListener("message", handleHostMessage);
  window.addEventListener("pointerdown", unlockAudio, { capture: true });

  ["contextmenu", "selectstart", "dragstart", "gesturestart"].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      event.preventDefault();
    }, { capture: true });
  });

  document.addEventListener("touchmove", function (event) {
    var target = event.target;
    var insideSettings = target instanceof Element && target.closest(".settings-sheet");
    if (!insideSettings) event.preventDefault();
  }, { passive: false });

  resetBtn.addEventListener("click", function () {
    resetRound();
  });

  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      togglePause();
    });
  }

  newMapBtn.addEventListener("click", function () {
    nextMap();
  });

  difficultyButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setDifficulty(button.getAttribute("data-difficulty"));
    });
  });

  mapButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectMap(button.getAttribute("data-map"));
    });
  });

  pauseButtons.forEach(function (button) {
    button.addEventListener("pointerdown", handlePausePress);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (event.detail === 0) togglePause();
    });
  });

  fullscreenButtons.forEach(function (button) {
    button.addEventListener("pointerdown", toggleFullscreen);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (event.detail === 0) toggleFullscreen(event);
    });
  });

  settingsButtons.forEach(function (button) {
    button.addEventListener("pointerdown", openSettings);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (event.detail === 0) openSettings(event);
    });
  });

  settingsCloseButtons.forEach(function (button) {
    button.addEventListener("click", closeSettings);
  });

  resetRoundButtons.forEach(function (button) {
    button.addEventListener("click", resetRound);
  });

  nextMapButtons.forEach(function (button) {
    button.addEventListener("click", nextMap);
  });

  soundButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setSoundEnabled(button.getAttribute("data-sound") === "on");
    });
  });

  vibrationButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setVibrationEnabled(button.getAttribute("data-vibration") === "on");
    });
  });

  blastGuideButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setBlastGuideEnabled(button.getAttribute("data-blast-guide") === "on");
    });
  });

  if (deathRestartBtn) {
    deathRestartBtn.addEventListener("pointerdown", restartAfterDeath);
    deathRestartBtn.addEventListener("click", function (event) {
      event.preventDefault();
      if (event.detail === 0) restartAfterDeath(event);
    });
  }

  if (deathWatchBtn) {
    deathWatchBtn.addEventListener("pointerdown", watchAfterDeath);
    deathWatchBtn.addEventListener("click", function (event) {
      event.preventDefault();
      if (event.detail === 0) watchAfterDeath(event);
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener("click", function (event) {
      if (event.target === settingsModal) closeSettings(event);
    });
  }

  if (joystick && joystickKnob) {
    joystick.addEventListener("pointerdown", function (event) {
      captureInput(event);
      joystickPointer = event.pointerId;
      joystick.classList.add("active");
      setJoystickBaseFromPointer(event);
      updateJoystick(event);
    });
    joystick.addEventListener("pointermove", function (event) {
      if (joystickPointer === event.pointerId) updateJoystick(event);
    });
    joystick.addEventListener("pointerup", function (event) {
      event.preventDefault();
      if (joystickPointer === event.pointerId) resetJoystick();
    });
    joystick.addEventListener("pointercancel", function (event) {
      event.preventDefault();
      if (joystickPointer === event.pointerId) resetJoystick();
    });
  }

  if (bombButton) {
    bombButton.addEventListener("pointerdown", handleBombPress);
    bombButton.addEventListener("click", function (event) {
      event.preventDefault();
      if (event.detail === 0) placeBomb(state.players[0]);
    });
  }

  if (gameFlowPrimary) {
    gameFlowPrimary.addEventListener("click", function (event) {
      event.preventDefault();
      startGameFlow();
    });
  }

  exposeHostApi();
  showStartOverlay();
  updateUi();
  syncDifficultyButtons();
  syncMapButtons();
  syncOptionButtons();
  syncFullscreenButton();
  loadPlatformSdk();
  announcePlatformReady();
  requestAnimationFrame(frame);
}());

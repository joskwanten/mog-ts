/**
 * Entry point: loads the assets, runs the game loop at the remake's fixed
 * frame rate and presents the frame buffer (port of main.cpp / render.cpp).
 *
 * URL parameters (for development and testing):
 *   ?fps=N        logic frames per second (default 25 = the remake's 40 ms period)
 *   ?autostart    skip the "click to start" screen (audio stays locked)
 *   ?mute         start muted
 *   ?manual       do not run the loop; advance with window.mog.step(n)
 *   ?scale=N      frame buffer pixels per game pixel (default 2: 1280×800)
 */
import { Screen } from './engine/screen';
import { SCREEN_X, SCREEN_Y } from './game/constants';
import { redoDemonIntro } from './game/demons';
import {
  defaultConfig,
  initPaths,
  loadConfig,
  loadSounds,
  releaseGraphics,
  releaseSounds,
  saveConfig,
  setSfxVolume,
} from './game/gameaux';
import { gameCycle } from './game/gamecycle';
import { loadGraphics } from './game/gametiles';
import { sfx } from './game/resources';
import { G } from './game/state';
import { preloadGraphics } from './platform/assets';
import {
  initAudio,
  onAudioUnlocked,
  preloadSounds,
  restartMusic,
  resumeAudio,
  setMasterMute,
  setMusicVolume,
  setSoundPath,
} from './platform/audio';
import {
  installKeyboard,
  onKeyDown,
  pollKeyboard,
  SDLK_0,
  SDLK_9,
  SDLK_F10,
  SDLK_F11,
  setKey,
} from './platform/keyboard';
import { Video } from './platform/video';

const params = new URLSearchParams(location.search);
const FPS = Number(params.get('fps')) || 25;
const FRAME_MS = 1000 / FPS;

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLDivElement;
const SCALE = Number(params.get('scale')) || 2;
const video = new Video(canvas, SCALE);

/** The frame buffer the game draws into (render.cpp: buffer_screen). */
const bufferScreen = new Screen(SCREEN_X, SCREEN_Y, SCALE);

let running = false;
let busy = false;

function setName(path: string): string {
  return path.split('/')[1];
}

/** One game frame: input snapshot, game logic + drawing, present. */
function frame(): void {
  pollKeyboard();
  gameCycle(bufferScreen);
  video.present(bufferScreen, G);
}

function startLoop(): void {
  if (running) return;
  running = true;
  let last = performance.now();
  let acc = 0;
  let lastRaf = 0;
  const advance = (now: number) => {
    acc += now - last;
    last = now;
    // Never try to catch up more than a few frames (e.g. after a tab switch).
    if (acc > FRAME_MS * 5) acc = FRAME_MS;
    while (acc >= FRAME_MS) {
      acc -= FRAME_MS;
      if (!busy) frame();
    }
  };
  const onRaf = (now: number) => {
    lastRaf = now;
    advance(now);
    requestAnimationFrame(onRaf);
  };
  requestAnimationFrame(onRaf);
  // Fallback when requestAnimationFrame is throttled (embedded/hidden views):
  // keep the game running on a timer.
  setInterval(() => {
    const now = performance.now();
    if (now - lastRaf > 100) advance(now);
  }, FRAME_MS / 2);
}

/** F10/9: next graphic set; F11/0: next sound set (as in main.cpp). */
async function switchGraphicSet(): Promise<void> {
  busy = true;
  try {
    G.graphicsPathIndex = (G.graphicsPathIndex + 1) % G.graphicsPathCount;
    G.graphicsPath = G.graphicsPaths[G.graphicsPathIndex];
    await preloadGraphics([setName(G.graphicsPath), setName(G.defaultGraphicsPath)]);
    releaseGraphics();
    loadGraphics();
    saveConfig('mog.cfg');
    if (G.fightingDemon !== 0) redoDemonIntro(G.fightingDemon, null);
  } finally {
    busy = false;
  }
}

async function switchSoundSet(): Promise<void> {
  busy = true;
  try {
    G.soundPathIndex = (G.soundPathIndex + 1) % G.soundPathCount;
    G.soundPath = G.soundPaths[G.soundPathIndex];
    setSoundPath(G.soundPath);
    await preloadSounds([setName(G.soundPath)]);
    releaseSounds(false);
    loadSounds();
    restartMusic();
    saveConfig('mog.cfg');
    setMusicVolume(G.musicVolume);
    setSfxVolume(sfx.volume);
  } finally {
    busy = false;
  }
}

async function boot(): Promise<void> {
  installKeyboard();
  video.fitToWindow();
  window.addEventListener('resize', () => video.fitToWindow());

  // Read the configuration first so the right graphic/sound sets get loaded.
  initPaths();
  if (!loadConfig('mog.cfg')) defaultConfig();
  setSoundPath(G.soundPath);

  initAudio();
  if (params.has('mute')) setMasterMute(true);
  overlay.textContent = 'Loading graphics…';
  await preloadGraphics([setName(G.defaultGraphicsPath), setName(G.graphicsPath)]);
  overlay.textContent = 'Loading sound…';
  await preloadSounds([setName(G.defaultSoundPath), setName(G.soundPath)], (done, total) => {
    overlay.textContent = `Loading sound… ${done}/${total}`;
  });

  onKeyDown((key) => {
    if (busy) return;
    if (key === SDLK_F10 || key === SDLK_9) void switchGraphicSet();
    if (key === SDLK_F11 || key === SDLK_0) void switchSoundSet();
  });

  const start = async () => {
    overlay.classList.add('hidden');
    await resumeAudio();
    onAudioUnlocked();
    if (params.has('mute')) setMasterMute(true);
  };

  if (params.has('autostart') || params.has('manual')) {
    overlay.classList.add('hidden');
  } else {
    overlay.textContent = 'The Maze of Galious — click or press a key to start';
    await new Promise<void>((resolve) => {
      const go = () => {
        window.removeEventListener('keydown', go);
        overlay.removeEventListener('click', go);
        void start().then(resolve);
      };
      window.addEventListener('keydown', go);
      overlay.addEventListener('click', go);
    });
  }
  // Audio can still be unlocked later by any click (e.g. after ?autostart).
  window.addEventListener('pointerdown', () => void start(), { once: true });

  if (!params.has('manual')) startLoop();
}

/** Debug/test handle, e.g. `mog.step(50)` or `mog.G.playerX`. */
declare global {
  interface Window {
    mog: unknown;
  }
}
window.mog = {
  G,
  step(n = 1) {
    for (let i = 0; i < n; i++) frame();
  },
  setKey,
  buffer: bufferScreen,
};

boot().catch((err) => {
  console.error(err);
  overlay.classList.remove('hidden');
  overlay.textContent = `Error: ${String(err)}`;
});

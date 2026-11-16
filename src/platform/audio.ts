/**
 * Sound effects and music on WebAudio (replaces SDL_mixer / sound.cpp).
 *
 * Sound effects are fully decoded buffers; any number can overlap, like
 * Mix_PlayChannel(-1, ...). Music follows the remake's sequencing:
 * `playMusic(a, b, c)` plays a, then b, then c, and keeps looping the
 * last piece of the sequence.
 *
 * Lookup mirrors Sound_obtain_file_name: first the active sound set, then
 * the default set ("sound/original/"), extensions .wav/.ogg.
 */
import { assetUrl, soundPaths } from './assets';

export interface Sound {
  readonly name: string;
}
export type SoundRef = Sound | null;

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer | null>>();

export let defaultSoundPath = 'sound/original/';
export let soundPath = 'sound/original/';

export function setSoundPath(path: string): void {
  soundPath = path;
}

/** Create (but do not start) the audio context. Browsers keep it suspended until a user gesture. */
export function initAudio(): AudioContext {
  if (ctx === null) {
    ctx = new AudioContext();
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain.connect(ctx.destination);
    musicGain.connect(ctx.destination);
  }
  return ctx;
}

/** Resume audio output; must be called from a user gesture (click/key). */
export async function resumeAudio(): Promise<void> {
  if (ctx && ctx.state !== 'running') await ctx.resume();
}

/** Mute switch for automated tests (keeps all logic running). */
export function setMasterMute(mute: boolean): void {
  if (sfxGain) sfxGain.gain.value = mute ? 0 : sfxVolume / 127;
  if (musicGain) musicGain.gain.value = mute ? 0 : musicVolume / 127;
}

let musicVolume = 127;
let sfxVolume = 127;

export function setMusicVolume(volume: number): void {
  musicVolume = volume;
  if (musicGain) musicGain.gain.value = volume / 127;
}

export function setSfxGain(volume: number): void {
  sfxVolume = volume;
  if (sfxGain) sfxGain.gain.value = volume / 127;
}

function resolve(file: string): string | null {
  for (const base of [soundPath, defaultSoundPath]) {
    for (const ext of ['.wav', '.ogg']) {
      const p = base + file + ext;
      if (assetUrl(p)) return p;
    }
  }
  return null;
}

async function decode(path: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(path);
  if (cached) return cached;
  let job = pending.get(path);
  if (!job) {
    const url = assetUrl(path)!;
    const ac = initAudio();
    job = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ac.decodeAudioData(data))
      .then((buf) => {
        buffers.set(path, buf);
        return buf;
      })
      .catch((err) => {
        console.warn(`Could not decode ${path}`, err);
        return null;
      });
    pending.set(path, job);
  }
  return job;
}

/** Decode every sound of the given sets ahead of time (sound effects must play without delay). */
export async function preloadSounds(sets: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
  const paths = soundPaths(sets);
  let done = 0;
  await Promise.all(
    paths.map((p) =>
      decode(p).then(() => {
        done++;
        onProgress?.(done, paths.length);
      }),
    ),
  );
}

/** createSound: returns a handle; the buffer is looked up at play time so set switches apply. */
export function createSound(file: string, _flags = 0): SoundRef {
  if (resolve(file) === null) {
    console.error(`Sound_create_sound: could not find ${file}`);
    return null;
  }
  return { name: file };
}

export function deleteSound(_s: SoundRef): void {
  // Buffers are shared and cached; nothing to free.
}

/** Optional observer of every sound effect and music request (used by the replay tests). */
let soundListener: ((event: string) => void) | null = null;

export function setSoundListener(listener: ((event: string) => void) | null): void {
  soundListener = listener;
}

export function playSound(s: SoundRef): void {
  if (s !== null) soundListener?.(s.name);
  if (s === null || ctx === null || ctx.state !== 'running') return;
  const path = resolve(s.name);
  if (path === null) return;
  const buf = buffers.get(path);
  if (!buf) {
    void decode(path);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(sfxGain!);
  src.start();
}

// ---------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------

let musicSequence: string[] = [];
let musicIndex = 0;
let musicSource: AudioBufferSourceNode | null = null;
let musicToken = 0;
let musicPaused = false;
/** Wanted state, so music starts once audio is unlocked. */
let musicWanted = false;
/** Whether the current music source has actually been started (audio may still be locked). */
let musicStarted = false;

function stopMusicSource(): void {
  if (musicSource) {
    musicSource.onended = null;
    try {
      musicSource.stop();
    } catch {
      // already stopped
    }
    musicSource.disconnect();
    musicSource = null;
  }
  musicStarted = false;
}

function playMusicIndex(index: number): void {
  stopMusicSource();
  const name = musicSequence[index];
  if (name === undefined || ctx === null) return;
  const path = resolve(name);
  if (path === null) return;
  const token = ++musicToken;
  void decode(path).then((buf) => {
    if (token !== musicToken || buf === null || ctx === null) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(musicGain!);
    src.onended = () => {
      if (token !== musicToken || musicPaused) return;
      // Advance through the sequence; the last piece loops.
      const next = Math.min(index + 1, musicSequence.length - 1);
      musicIndex = next;
      playMusicIndex(next);
    };
    musicSource = src;
    if (ctx.state === 'running' && !musicPaused) {
      src.start();
      musicStarted = true;
    }
  });
}

export function playMusic(f1: string | null, f2: string | null = null, f3: string | null = null): void {
  soundListener?.(`music:${f1},${f2},${f3}`);
  musicSequence = [f1, f2, f3].filter((f): f is string => f !== null && f !== undefined);
  musicIndex = 0;
  musicPaused = false;
  musicWanted = musicSequence.length > 0;
  playMusicIndex(0);
}

export function stopMusic(): void {
  soundListener?.('music:stop');
  musicWanted = false;
  musicToken++;
  stopMusicSource();
  musicSequence = [];
}

export function releaseMusicTemporarily(): void {
  // The remake only used this around set switches; nothing to do here.
}

/**
 * Pause/unpause (F2 in game). An AudioBufferSourceNode cannot be resumed,
 * so unpausing restarts the current piece of the sequence.
 */
export function pauseMusic(): void {
  if (musicPaused) return;
  musicPaused = true;
  musicToken++;
  stopMusicSource();
}

export function resumeMusic(): void {
  if (!musicPaused) return;
  musicPaused = false;
  if (musicWanted) playMusicIndex(musicIndex);
}

/** Reload the current music after a sound-set switch (restartMusic). */
export function restartMusic(): void {
  if (musicWanted && !musicPaused) playMusicIndex(musicIndex);
}

/** Called once audio gets unlocked by a user gesture: (re)start the wanted music. */
export function onAudioUnlocked(): void {
  if (musicWanted && !musicPaused && !musicStarted) playMusicIndex(musicIndex);
}

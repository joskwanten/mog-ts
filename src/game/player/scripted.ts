/**
 * Player states that run without control: being hit, dying, walking through a
 * door, and entering a passage or a world.
 */
import { pauseMusic, playMusic, playSound, stopMusic } from '../../platform/audio';
import {
  HIT_TIME,
  S_HIT_COLISION,
  S_HIT_RECOVERY,
  S_QUIET,
  State,
  TILE_SIZE_X,
  TILE_SIZE_Y,
  TILE_UNIT,
} from '../constants';
import { sfx } from '../resources';
import { G } from '../state';
import { PlayerStep, characterTile } from './step';

/** S_HIT: knocked back by an enemy. */
export function knockedBack(s: PlayerStep): void {
  // (The C++ has the same knock-back code in an `if (playerSubState < 4)` and an
  // `if (playerSubState >= 4)` block; it does not change playerSubState.)
  G.playerFrame = (G.playerSubState % 4 >> 1) + 9;
  if (G.facingRight) {
    s.nextX = G.playerX - TILE_UNIT * 4;
  } else {
    s.nextX = G.playerX + TILE_UNIT * 4;
  }
  // NOTE (original): the tile base here is the one left over from the lava test
  // (`val`); facingRight has not changed since, so it is the current one.
  const base = characterTile();
  if (s.collides(base, s.nextX, G.playerY) && !s.collides(base, G.playerX, G.playerY)) {
    s.nextX = G.playerX;
    G.playerState = S_HIT_COLISION;
  }
  if (G.playerSubState >= 4) dropAfterHit(s);

  // if (playerSubState>=24) { playerState=S_QUIET; playerSubState=0; playerFrame=0; } else {
  G.playerSubState++;
  // }
}

/** S_HIT_COLISION: hit, with no room to be knocked back (or hit on a ladder). */
export function hitInPlace(s: PlayerStep): void {
  G.playerFrame = (G.playerSubState % 4 >> 1) + 9;
  if (G.playerSubState >= 4) dropAfterHit(s);

  // if (playerSubState>=24) { playerState=S_QUIET; playerSubState=0; playerFrame=0; } else {
  G.playerSubState++;
  // }
}

/** S_HIT_RECOVERY: getting up after landing from a hit. */
export function recoverFromHit(): void {
  G.playerFrame = (G.playerSubState % 4 >> 1) + 11;
  if (G.playerSubState >= 8) {
    G.playerState = S_QUIET;
    G.playerSubState = 0;
    G.playerFrame = 0;
    G.hitTime = HIT_TIME;
  } else {
    G.playerSubState++;
  }
}

/** S_DEATH */
export function die(): void {
  G.sword = false;
  if (G.playerSubState === 0) {
    pauseMusic();
    playSound(sfx.death);
  }
  if (G.playerSubState < 6) G.playerFrame = 13;
  if (G.playerSubState >= 6 && G.playerSubState < 12) G.playerFrame = 14;
  if (G.playerSubState >= 12 && G.playerSubState < 18) G.playerFrame = 15;
  if (G.playerSubState >= 18 && G.playerSubState < 24) G.playerFrame = 16;
  if (G.playerSubState >= 24) G.playerFrame = 17;

  if (G.playerSubState >= 40) {
    stopMusic();
    G.characterAlive[G.character] = false;
    G.state = State.CharacterDead;
    G.subState = 0;
  }
  G.playerSubState++;
}

/** S_DOORPASS: wait, then walk through an opened door. */
export function passDoor(s: PlayerStep): void {
  G.playerSubState++;
  if (G.playerSubState >= 20) {
    if (G.playerSubState <= 26) {
      if (G.facingRight) s.nextX = G.playerX + TILE_UNIT * 4;
      else s.nextX = G.playerX - TILE_UNIT * 4;
      G.playerFrame = (G.playerSubState & 0x01) === 0 ? 1 : 0;
    }

    if (G.playerSubState >= 30) {
      G.playerState = S_QUIET;
      G.playerSubState = 0;
      G.playerFrame = 0;
    }
  } else {
    G.playerFrame = 0;
  }
}

/** S_SLOWDOORPASS: walk slowly through a door. */
export function passDoorSlowly(s: PlayerStep): void {
  if (G.playerSubState <= 24) {
    if (G.facingRight) s.nextX = G.playerX + TILE_UNIT;
    else s.nextX = G.playerX - TILE_UNIT;
    G.playerFrame = (G.playerSubState & 0x04) === 0 ? 1 : 0;
  }

  if (G.playerSubState >= 24) {
    G.playerState = S_QUIET;
    G.playerSubState = 0;
    G.playerFrame = 0;
  }
  G.playerSubState++;
}

/** S_ENTERING_PASSAGE: climb into a passage door (shrine, shop, …) and back out. */
export function enterPassage(s: PlayerStep): void {
  if (G.playerSubState === 0) {
    stopMusic();
    playMusic('entering', 'shrine1', 'shrine2');
  }

  G.playerSubState++;
  if (G.inDoor >= 0) {
    s.nextY = G.objects[G.inDoor].y;
    s.nextX = G.objects[G.inDoor].x;
  }
  if (G.playerSubState <= 32) {
    G.playerFrame = (G.playerSubState & 0x07) < 4 ? 7 : 8;
    G.enterCut--;
  } else {
    G.playerFrame = (G.playerSubState & 0x07) < 4 ? 5 : 6;
    G.enterCut++;
  }
  if (G.playerSubState === 32) {
    // Has entered the door:
    G.state = State.Passage;
    G.subState = 0;
    // forgetDistantRooms(roomX,roomY);
    // loadroom(map,roomX,roomY);
    // restoreRoomMemory(roomX,roomY);
  }
  if (G.playerSubState > 64) {
    // Just came out of the door:
    comeOutOfDoor();
  }
}

/** The world doors of the castle: castle room → world and the room it starts in. */
const WORLD_DOORS: readonly { roomX: number; roomY: number; world: number; toX: number; toY: number }[] = [
  { roomX: 3, roomY: 12, world: 1, toX: 2, toY: 0 },
  { roomX: 10, roomY: 11, world: 2, toX: 1, toY: 4 },
  { roomX: 10, roomY: 8, world: 3, toX: 2, toY: 8 },
  { roomX: 0, roomY: 8, world: 4, toX: 0, toY: 4 },
  { roomX: 8, roomY: 8, world: 5, toX: 3, toY: 0 },
  { roomX: 14, roomY: 12, world: 6, toX: 3, toY: 0 },
  { roomX: 5, roomY: 2, world: 7, toX: 3, toY: 0 },
  { roomX: 4, roomY: 4, world: 8, toX: 3, toY: 0 },
  { roomX: 7, roomY: 0, world: 9, toX: 0, toY: 7 },
];

/** S_ENTERING_WORLD: go down into a world door and come out in the world. */
export function enterWorld(s: PlayerStep): void {
  if (G.playerSubState === 0) {
    stopMusic();
    playSound(sfx.entering);
  }
  G.playerSubState++;
  if (G.inDoor >= 0) {
    // NOTE (original): TILE_SIZE_X/TILE_SIZE_Y swapped (both 16).
    s.nextY = G.objects[G.inDoor].y + TILE_SIZE_X;
    s.nextX = G.objects[G.inDoor].x + TILE_SIZE_Y;
  }
  if (G.playerSubState <= 32) {
    G.playerFrame = (G.playerSubState & 0x07) < 4 ? 7 : 8;
    G.enterCut++;
  } else {
    G.playerFrame = (G.playerSubState & 0x07) < 4 ? 5 : 6;
    G.enterCut--;
  }
  if (G.playerSubState === 32) {
    // Has entered the door:
    G.state = State.WorldEntry;
    G.subState = 0;
    for (const door of WORLD_DOORS) {
      if (G.roomX === door.roomX && G.roomY === door.roomY) {
        G.world = door.world;
        G.roomX = door.toX;
        G.roomY = door.toY;
      }
    }
    // NOTE (original): the checks are sequential, so a room set by an earlier
    // check could match a later one (no such overlap with the actual values).
    if (G.roomX === G.world10DoorX && G.roomY === G.world10DoorY) {
      G.world = 10;
      G.roomX = 0;
      G.roomY = 0;
    }
  }
  if (G.playerSubState > 64) {
    // Just came out of the door:
    comeOutOfDoor();
  }
}

function comeOutOfDoor(): void {
  G.playerState = S_QUIET;
  G.playerSubState = 0;
  G.playerFrame = 0;
  G.enterCut = 0;
}

/** After a hit: fall (gaining speed) until landing, then recover. */
function dropAfterHit(s: PlayerStep): void {
  let dy = G.playerSubState - 4;
  if (dy > TILE_UNIT * 6) dy = TILE_UNIT * 6;
  s.nextY = G.playerY + dy;
  const base = characterTile();
  if (!s.collides(base, s.nextX, G.playerY) && s.collides(base, s.nextX, s.nextY)) {
    G.playerState = S_HIT_RECOVERY;
    G.playerSubState = 0;
    G.playerFrame = 0;
  }
}

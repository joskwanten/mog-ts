/**
 * Room changes (port of roomchange.cpp), checked every game frame after the
 * character has moved. When the character crosses one of the four borders
 * of the room, the neighbouring room is loaded, a world is left (back to the
 * castle) or a shrine is entered.
 */
import { playMusic, playSound, stopMusic } from '../platform/audio';
import {
  MAX_AW_RECORD,
  S_DOWN_LADDER,
  S_JUMPING,
  S_QUIET,
  S_UP_LADDER,
  S_WALKING_LEFT,
  S_WALKING_RIGHT,
  State,
  TILE_SIZE_X,
  TILE_SIZE_Y,
} from './constants';
import {
  clearTypedWord,
  findLadder,
  forgetDistantRooms,
  loadRoom,
  resetRoomMemory,
  restoreRoomMemory,
} from './gameaux';
import { roomEvents } from './gameinteractions';
import { sfx, tileIds } from './resources';
import { G } from './state';

/** A world exit: walking out of `world` at room (roomX, roomY) leads to a castle room. */
interface WorldExit {
  world: number;
  roomX: number;
  roomY: number;
  /** Castle room and character position (in tiles) after the exit. */
  to: [roomX: number, roomY: number, tileX: number, tileY: number];
}

/** Exits through the left border. (World 10 is handled separately: its door moves.) */
const LEFT_EXITS: WorldExit[] = [
  { world: 4, roomX: 0, roomY: 4, to: [0, 8, 9, 9] },
  { world: 9, roomX: 0, roomY: 7, to: [7, 0, 13, 5] },
];

/** Exits through the right border. */
const RIGHT_EXITS: WorldExit[] = [{ world: 5, roomX: 3, roomY: 0, to: [8, 8, 9, 5] }];

/** Exits by climbing out of the top of a world (roomY is already -1 when checked). */
const TOP_EXITS: WorldExit[] = [
  { world: 1, roomX: 2, roomY: -1, to: [3, 12, 9, 5] },
  { world: 6, roomX: 3, roomY: -1, to: [14, 12, 21, 5] },
  { world: 7, roomX: 3, roomY: -1, to: [5, 2, 5, 17] },
  { world: 8, roomX: 3, roomY: -1, to: [4, 4, 13, 17] },
];

/** Shrines (Demeter / Athena), entered by climbing up into these rooms. */
const SHRINES: [world: number, roomX: number, roomY: number][] = [
  [1, 0, 6], // Demeter
  [2, 3, 1], // Athena
  [3, 3, 3], // Athena
  [4, 4, 1], // Demeter
  [5, 5, 1], // Demeter
  [6, 5, 3], // Athena
  [7, 6, 1], // Athena
  [8, 1, 1], // Demeter
  [9, 2, 0], // Demeter
];

/** World 10's exit leads to the castle room of its (randomly placed) door: character position per door. */
const WORLD10_EXIT_POSITIONS: Record<number, [tileX: number, tileY: number]> = {
  1: [13, 17],
  5: [21, 9],
  9: [9, 17],
  14: [21, 1],
};

/** Castle room of the next world's door, for the bells (item 7). */
const WORLD_DOOR_ROOMS: Record<number, [roomX: number, roomY: number]> = {
  1: [3, 12],
  2: [10, 11],
  3: [10, 8],
  4: [0, 8],
  5: [8, 8],
  6: [14, 12],
  7: [5, 2],
  8: [4, 4],
  9: [7, 0],
};

/** Room changes are blocked while a demon fight is going on. */
function canLeaveRoom(): boolean {
  return G.fightingDemon === 0 || G.fightingDemon === 432;
}

/** Go to castle room (roomX, roomY) with the character at tile (tileX, tileY) and show the entry message. */
function leaveWorld(roomX: number, roomY: number, tileX: number, tileY: number): void {
  G.world = 0;
  G.roomX = roomX;
  G.roomY = roomY;
  G.playerX = TILE_SIZE_X * tileX;
  G.playerY = TILE_SIZE_Y * tileY;
  G.state = State.WorldEntry;
  G.subState = 0;
  G.inDoor = -1;
}

/** Leave the world if the current room is one of `exits`. Returns whether it did. */
function tryWorldExit(exits: WorldExit[]): boolean {
  const exit = exits.find((e) => e.world === G.world && e.roomX === G.roomX && e.roomY === G.roomY);
  if (exit === undefined) return false;
  leaveWorld(...exit.to);
  return true;
}

/** Enter the shrine if the (new) room is one of `shrines`. Returns whether it did. */
function enterShrine(shrines: [number, number, number][]): boolean {
  let entered = false;
  for (const [world, roomX, roomY] of shrines) {
    if (G.world === world && G.roomY === roomY && G.roomX === roomX) {
      G.state = State.Passage;
      G.subState = 0;
      stopMusic();
      playMusic('entering', 'shrine1', 'shrine2');
      entered = true;
    }
  }
  return entered;
}

/** Load the room G.roomX/G.roomY of the current world (with the memory of visited rooms). */
function enterRoom(): boolean {
  forgetDistantRooms(G.roomX, G.roomY);
  const loaded = loadRoom(G.world, G.roomX, G.roomY);
  restoreRoomMemory(G.roomX, G.roomY);
  G.firedArrows = 0;
  G.firedMines = 0;
  return loaded;
}

export function checkRoomChange(): void {
  const oldX = G.playerX;
  const oldY = G.playerY;
  let roomChanged = false;
  let roomLoaded = true;

  // Left border.
  if (G.playerX < TILE_SIZE_X) {
    if (!canLeaveRoom()) {
      G.playerX = TILE_SIZE_X;
    } else if (tryWorldExit(LEFT_EXITS)) {
      // left the world
    } else if (G.world === 10 && G.roomX === 0 && G.roomY === 0) {
      // Leave world 10 through the door it was entered by.
      G.world = 0;
      G.roomX = G.world10DoorX;
      G.roomY = G.world10DoorY;
      const pos = WORLD10_EXIT_POSITIONS[G.roomX];
      if (pos) {
        G.playerX = TILE_SIZE_X * pos[0];
        G.playerY = TILE_SIZE_Y * pos[1];
      }
      G.state = State.WorldEntry;
      G.subState = 0;
      G.inDoor = -1;
    } else if (G.world === 3 && G.roomY === 0) {
      // World 3, top row: no way sideways.
      G.playerX = TILE_SIZE_X;
    } else {
      G.roomX--;
      roomLoaded = enterRoom();
      roomChanged = true;
      G.playerX = (G.roomWidth - 2) * TILE_SIZE_X;
    }
  }

  // Right border.
  if (G.playerX > (G.roomWidth - 2) * TILE_SIZE_X) {
    if (!canLeaveRoom() || (G.world === 10 && G.roomX === 4 && G.nextWorld < 11)) {
      G.playerX = (G.roomWidth - 2) * TILE_SIZE_X;
    } else if (tryWorldExit(RIGHT_EXITS)) {
      // left the world
    } else if (G.world === 3 && G.roomY === 0) {
      G.playerX = (G.roomWidth - 2) * TILE_SIZE_X;
    } else {
      G.roomX++;
      roomLoaded = enterRoom();
      roomChanged = true;
      G.playerX = TILE_SIZE_X;
    }
  }

  // Top border: only by climbing, standing, walking or jumping off an elevator.
  if (G.playerY < -TILE_SIZE_Y) {
    const mayLeaveUp =
      G.playerState === S_UP_LADDER ||
      G.playerState === S_QUIET ||
      G.playerState === S_WALKING_LEFT ||
      G.playerState === S_WALKING_RIGHT ||
      (G.playerState === S_JUMPING && G.jumpingFromElevator);
    if (!canLeaveRoom()) {
      G.playerY = -TILE_SIZE_Y;
    } else if (!mayLeaveUp) {
      G.previousYCollision = true;
      G.playerY = -TILE_SIZE_Y;
    } else {
      G.roomY--;
      // World 3: climbing out of room (0,6) lands in (0,6) again (room 5 is skipped).
      // Like the original, this is checked between the world 4 and world 5 shrines.
      let shrine = enterShrine(SHRINES.slice(0, 4));
      if (G.world === 3 && G.roomY === 5 && G.roomX === 0) {
        G.world3Room06Counter++;
        G.roomY = 6;
      }
      shrine = enterShrine(SHRINES.slice(4)) || shrine;
      if (!shrine) {
        if (G.roomY >= 0) {
          roomLoaded = enterRoom();
          roomChanged = true;
          G.playerY = (G.roomHeight - 3) * TILE_SIZE_Y;
        } else {
          // Climbed a ladder that has no room above.
          tryWorldExit(TOP_EXITS);
        }
      }
    }
  }

  // Bottom border.
  if (G.playerY > (G.roomHeight - 2) * TILE_SIZE_Y) {
    G.roomY++;
    if (G.world === 2 && G.roomY >= 5) {
      leaveWorld(10, 11, 25, 5);
    } else if (G.world === 3 && G.roomY >= 9) {
      leaveWorld(10, 8, 21, 5);
    } else {
      roomLoaded = enterRoom();
      roomChanged = true;
      G.playerY = -TILE_SIZE_Y;
      G.onLadder = findLadder(G.playerX, G.playerY);
    }
  }

  if (roomChanged) afterRoomChange(roomLoaded);

  // The sword moves along with the character.
  if (G.sword) {
    G.swordX += G.playerX - oldX;
    G.swordY += G.playerY - oldY;
  }
}

/** Everything that happens once a new room has been loaded. */
function afterRoomChange(roomLoaded: boolean): void {
  G.stoneHitCounter = 0;
  G.state = State.InterScreen;
  G.interScreen = 6;
  G.world5Room44State = G.world5Room44State2;
  G.room26State = 0;
  G.room56State = 0;
  clearTypedWord();

  // Walls that appeared earlier stay.
  for (let i = 0; i < MAX_AW_RECORD; i++) {
    if (G.appearwallRecordX[i] === G.roomX && G.appearwallRecordY[i] === G.roomY) {
      // NOTE (original): uses roomAppearwallX/y of the room just loaded, not the record.
      for (let dy = 0; dy < 3; dy++) {
        G.roomTiles![(G.roomAppearwallY + dy) * G.roomWidth + G.roomAppearwallX] = tileIds.wall;
      }
      G.roomAppearwall = -1;
    }
  }

  // World 5, east part: item 3 turns tile 142 into tile 181.
  if (G.items[3] && G.world === 5 && G.roomX >= 5) {
    for (let i = 0; i < G.roomWidth * G.roomHeight; i++) {
      if (G.roomTiles![i] === 142) G.roomTiles![i] = 181;
    }
  }

  // Bells (item 7): ring near the door of the next world once the world key is found.
  if (G.items[7] && G.hasWorldKey) {
    const door: [number, number] =
      G.nextWorld === 10 ? [G.world10DoorX, G.world10DoorY] : (WORLD_DOOR_ROOMS[G.nextWorld] ?? [-10, -10]);
    if (Math.abs(G.roomX - door[0]) + Math.abs(G.roomY - door[1]) <= 2) playSound(sfx.bell);
  }

  if (!G.oldRoomDemonroom && G.roomDemonroom) {
    stopMusic();
    playMusic('demonroom2', 'demonroom1', null);
  }
  if (G.oldRoomDemonroom && !G.roomDemonroom && G.fightingDemon !== 432) {
    stopMusic();
    playMusic(G.world === 0 ? 'castle' : 'world', null, null);
  }

  G.lavaState = 0;

  if (!roomLoaded) {
    // The room file does not exist: emergency reset to the castle.
    G.state = G.world !== 0 ? State.WorldEntry : State.ResumeAfterReset;
    if (G.world !== 0) G.subState = 0;
    G.world = 0;
    G.roomX = 5;
    G.roomY = 9;
    G.playerX = TILE_SIZE_X * 16;
    G.playerY = TILE_SIZE_Y * 5;
    G.playerState = 0;
    G.playerFrame = 0;
    resetRoomMemory();
    loadRoom(G.world, G.roomX, G.roomY);
  } else {
    roomEvents();
    if (G.playerState === S_UP_LADDER) G.onLadder = findLadder(G.playerX, G.playerY + TILE_SIZE_Y);
    if (G.playerState === S_DOWN_LADDER) G.onLadder = findLadder(G.playerX, G.playerY);
  }
}

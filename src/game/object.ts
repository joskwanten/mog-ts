/** A room object: ladders, doors, items, enemies, bullets, ... (port of object.h). */
export class GameObject {
  type = 0;
  enemy = 0;

  x = 0;
  y = 0;
  xoffs = 0;
  yoffs = 0;
  baseTile = 0;
  tile = 0;

  size = 0;
  state = 0;
  state2 = 0;
  state3 = 0;
  lastHit = 0;
  desiredFloor = 0;
  onLadder = 0;

  /** Only used by the butterflies. */
  unionX = 0;
  unionY = 0;

  experience = 0;

  /** Position at the moment of drawing. */
  drawX = 0;
  drawY = 0;

  lightning = [0, 0, 0, 0, 0, 0];
}

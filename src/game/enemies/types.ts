/**
 * The per-enemy update functions of GameObjectAnimation (gameobjects.cpp).
 *
 * In the C++ code every enemy is a `case T_XXX:` of one big switch inside the
 * object loop. Here every case is its own function, registered by enemy type.
 */

/** Loop-level locals of animateObjects that the cases read or modify. */
export interface ObjAnimCtx {
  /** Collision mask for walls (`T_WALL|T_LADDER_WALL|T_DOOR_WALL`); cases may change it. */
  collision: number;
  /** `firstJumpingBush` from the C++ code. */
  firstJumpingBush: boolean;
}

/** Update one enemy object; `i` indexes G.objects. */
export type EnemyUpdater = (i: number, ctx: ObjAnimCtx) => void;

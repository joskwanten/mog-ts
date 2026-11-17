# Name map: C++ remake → TypeScript

The first pass of the port kept the C++ identifiers; the clean-up pass renamed them
(automatically, through the TypeScript language service, verified by the replay tests).
This table maps the names in `reference/cpp/` to the names in `src/`. Local variables
were converted mechanically from `snake_case` to `camelCase`. Constants (`T_*`, `S_*`,
`SDLK_*`, `TILE_SIZE_X`, …) kept their names.

Further changes of the clean-up:

- The game states (`STATE` 0…19) are named constants `State.*` in `game/constants.ts`
  (e.g. `STATE=4` → `G.state = State.Playing`), and each `case` of `GameCycle` is its own
  function (`konamiAppear`, `titleMenu`, `playing`, …).
- The `dx, dy` screen-size parameters (always 640×400) are gone; code uses
  `SCREEN_X`/`SCREEN_Y`.
- `tiles[t]->draw(x, y, sx, sy, screen, col_buffer, dx, dy, dx)` and friends are
  `drawTile(screen, t, x, y, w, h)`, `tileHits(t, x, y, w, h)`, `drawTileNative`, …
  (`game/tiledraw.ts`; w×h defaults to 32×32), and `col_buffer[x + y*dx]` is
  `collisionAt(x, y)`.
- Loaded resources are not in `G`: bitmaps → `gfx.*`, tile numbers → `tileIds.*`,
  sound effects → `sfx.*` (`game/resources.ts`).

## Functions

| C++                             | TypeScript                                    |
| ------------------------------- | --------------------------------------------- |
| `GameCycle`                     | `gameCycle` (game/gamecycle.ts)               |
| `drawcharacter`                 | `drawCharacter` (game/gamecycle.ts)           |
| `ActualizeLevers`               | `updateLevers` (game/gameinteractions.ts)     |
| `GameTestInteractions`          | `testInteractions` (game/gameinteractions.ts) |
| `GameRoomEvents`                | `roomEvents` (game/gameinteractions.ts)       |
| `fire_arrow`                    | `fireWeapon` (game/gameinteractions.ts)       |
| `test_if_weapon_colision`       | `weaponCollision` (game/gameinteractions.ts)  |
| `tile_anims`                    | `animateTiles` (game/gameinteractions.ts)     |
| `ReleaseGraphics`               | `releaseGraphics` (game/gameaux.ts)           |
| `SetSFXVolume`                  | `setSfxVolume` (game/gameaux.ts)              |
| `ReleaseSound`                  | `releaseSounds` (game/gameaux.ts)             |
| `GameEnd`                       | `gameEnd` (game/gameaux.ts)                   |
| `newgame`                       | `newGame` (game/gameaux.ts)                   |
| `drawmap`                       | `drawMap` (game/gameaux.ts)                   |
| `drawstats`                     | `drawStats` (game/gameaux.ts)                 |
| `tile_print`                    | `tilePrint` (game/gameaux.ts)                 |
| `tile_print2`                   | `tilePrintOpaque` (game/gameaux.ts)           |
| `loadroom`                      | `loadRoom` (game/gameaux.ts)                  |
| `search_ladder`                 | `findLadder` (game/gameaux.ts)                |
| `add_object`                    | `addObject` (game/gameaux.ts)                 |
| `guardar_configuracion`         | `saveConfig` (game/gameaux.ts)                |
| `cargar_configuracion`          | `loadConfig` (game/gameaux.ts)                |
| `configuracion_por_defecto`     | `defaultConfig` (game/gameaux.ts)             |
| `HP_objs_reset`                 | `resetRoomMemory` (game/gameaux.ts)           |
| `HP_filter`                     | `forgetDistantRooms` (game/gameaux.ts)        |
| `HP_restore`                    | `restoreRoomMemory` (game/gameaux.ts)         |
| `HP_add_record`                 | `rememberObject` (game/gameaux.ts)            |
| `HP_modify_record_aux`          | `updateRememberedObject` (game/gameaux.ts)    |
| `clear_typed_word`              | `clearTypedWord` (game/gameaux.ts)            |
| `check_typed_word`              | `updateTypedWord` (game/gameaux.ts)           |
| `typed_word_p`                  | `isWordTyped` (game/gameaux.ts)               |
| `draw_items_map`                | `drawItemsMap` (game/gameaux.ts)              |
| `iswall`                        | `isWall` (game/gameaux.ts)                    |
| `iswall_or_blockingobject`      | `isWallOrBlocker` (game/gameaux.ts)           |
| `get_palette`                   | `loadPalette` (game/gameaux.ts)               |
| `load_bitmap`                   | `loadBitmap` (game/gameaux.ts)                |
| `ReloadStuff`                   | `reloadAll` (game/gameaux.ts)                 |
| `ReloadSound`                   | `loadSounds` (game/gameaux.ts)                |
| `GameInit`                      | `gameInit` (game/gameaux.ts)                  |
| `init_paths`                    | `initPaths` (game/gameaux.ts)                 |
| `GameInGameCycle`               | `updatePlayer` (game/ingamecycle.ts)          |
| `ReloadGraphics`                | `loadGraphics` (game/gametiles.ts)            |
| `passage_mainloop`              | `passageCycle` (game/shrines.ts)              |
| `redo_demonintro`               | `redoDemonIntro` (game/demons.ts)             |
| `demon_intro`                   | `demonIntro` (game/demons.ts)                 |
| `draw_demon_background`         | `drawDemonBackground` (game/demons.ts)        |
| `load_demon1`                   | `loadDemon1` (game/demons.ts)                 |
| `load_demon2`                   | `loadDemon2` (game/demons.ts)                 |
| `load_demon3`                   | `loadDemon3` (game/demons.ts)                 |
| `load_demon4`                   | `loadDemon4` (game/demons.ts)                 |
| `load_demon5`                   | `loadDemon5` (game/demons.ts)                 |
| `load_demon6`                   | `loadDemon6` (game/demons.ts)                 |
| `load_demon7`                   | `loadDemon7` (game/demons.ts)                 |
| `load_demon8`                   | `loadDemon8` (game/demons.ts)                 |
| `load_demon9`                   | `loadDemon9` (game/demons.ts)                 |
| `load_demon10`                  | `loadDemon10` (game/demons.ts)                |
| `demon1_cycle`                  | `demon1Cycle` (game/demons.ts)                |
| `demon2_cycle`                  | `demon2Cycle` (game/demons.ts)                |
| `demon3_cycle`                  | `demon3Cycle` (game/demons.ts)                |
| `demon4_cycle`                  | `demon4Cycle` (game/demons.ts)                |
| `demon5_cycle`                  | `demon5Cycle` (game/demons.ts)                |
| `demon6_cycle`                  | `demon6Cycle` (game/demons.ts)                |
| `demon7_cycle`                  | `demon7Cycle` (game/demons.ts)                |
| `demon8_cycle`                  | `demon8Cycle` (game/demons.ts)                |
| `demon9_cycle`                  | `demon9Cycle` (game/demons.ts)                |
| `demon10_cycle`                 | `demon10Cycle` (game/demons.ts)               |
| `RoomChange`                    | `checkRoomChange` (game/roomchange.ts)        |
| `GameObjectAnimation`           | `animateObjects` (game/gameobjects.ts)        |
| `generatepassword`              | `generatePassword` (game/passwords.ts)        |
| `readpassword`                  | `readPassword` (game/passwords.ts)            |
| `SDL_GetKeyboardState`          | `getKeyboardState` (platform/keyboard.ts)     |
| `SDL_GetKeyName`                | `keyName` (platform/keyboard.ts)              |
| `Sound_play`                    | `playSound` (platform/audio.ts)               |
| `Sound_create_sound`            | `createSound` (platform/audio.ts)             |
| `Sound_create_music`            | `playMusic` (platform/audio.ts)               |
| `Sound_release_music`           | `stopMusic` (platform/audio.ts)               |
| `Sound_pause_music`             | `pauseMusic` (platform/audio.ts)              |
| `Sound_unpause_music`           | `resumeMusic` (platform/audio.ts)             |
| `Sound_temporary_release_music` | `releaseMusicTemporarily` (platform/audio.ts) |
| `Delete_sound`                  | `deleteSound` (platform/audio.ts)             |
| `Mix_VolumeMusic`               | `setMusicVolume` (platform/audio.ts)          |
| `SetSFXVolumeRaw`               | `setSfxGain` (platform/audio.ts)              |
| `music_recovery`                | `restartMusic` (platform/audio.ts)            |
| `B_rectangle`                   | `fillRect` (engine/drawing.ts)                |
| `B_rectangle2`                  | `strokeRect` (engine/drawing.ts)              |
| `Line8B`                        | `drawLine` (engine/drawing.ts)                |
| `line_clip`                     | `clipLine` (engine/drawing.ts)                |

## Global state (`G` in src/game/state.ts)

| C++                             | TypeScript                     |
| ------------------------------- | ------------------------------ |
| `default_g_path`                | `G.defaultGraphicsPath`        |
| `default_s_path`                | `G.defaultSoundPath`           |
| `g_paths`                       | `G.graphicsPaths`              |
| `n_g_paths`                     | `G.graphicsPathCount`          |
| `act_g_path`                    | `G.graphicsPathIndex`          |
| `g_path`                        | `G.graphicsPath`               |
| `s_paths`                       | `G.soundPaths`                 |
| `n_s_paths`                     | `G.soundPathCount`             |
| `act_s_path`                    | `G.soundPathIndex`             |
| `s_path`                        | `G.soundPath`                  |
| `konami_bmp`                    | `gfx.konami`                   |
| `menu_bmp`                      | `gfx.menu`                     |
| `tiles_bmp`                     | `gfx.tiles`                    |
| `tiles2_bmp`                    | `gfx.tiles2`                   |
| `enemy_bmp`                     | `gfx.enemy`                    |
| `enemy2_bmp`                    | `gfx.enemy2`                   |
| `final_bmp`                     | `gfx.final`                    |
| `n_tiles`                       | `G.tileCount`                  |
| `col_buffer`                    | `G.collision`                  |
| `colors`                        | `G.palette`                    |
| `demon_bmp`                     | `gfx.demon`                    |
| `back_bmp`                      | `gfx.back`                     |
| `n_smoke`                       | `G.smokeCount`                 |
| `smoke_x`                       | `G.smokeX`                     |
| `smoke_y`                       | `G.smokeY`                     |
| `smoke_t`                       | `G.smokeT`                     |
| `demonback_state`               | `G.demonBackState`             |
| `demon_max_life`                | `G.demonMaxLife`               |
| `demon_music`                   | `G.demonMusic`                 |
| `STATE`                         | `G.state`                      |
| `SUBSTATE`                      | `G.subState`                   |
| `OLDSTATE`                      | `G.oldState`                   |
| `MENUOPTION`                    | `G.menuOption`                 |
| `developer_start_x`             | `G.devStartX`                  |
| `developer_start_y`             | `G.devStartY`                  |
| `developer_start_map`           | `G.devStartWorld`              |
| `inter_screen`                  | `G.interScreen`                |
| `frame_counter`                 | `G.frameCounter`               |
| `pause_flag`                    | `G.pauseFlag`                  |
| `pause_state`                   | `G.pauseState`                 |
| `map`                           | `G.world`                      |
| `map_x`                         | `G.roomX`                      |
| `map_y`                         | `G.roomY`                      |
| `pers_x`                        | `G.playerX`                    |
| `pers_y`                        | `G.playerY`                    |
| `pers_pos`                      | `G.playerFrame`                |
| `pers_right`                    | `G.facingRight`                |
| `pers_state`                    | `G.playerState`                |
| `pers_substate`                 | `G.playerSubState`             |
| `pers_walk_state`               | `G.walkState`                  |
| `jump_inertia`                  | `G.jumpInertia`                |
| `old_sword`                     | `G.oldSword`                   |
| `sword_x`                       | `G.swordX`                     |
| `sword_y`                       | `G.swordY`                     |
| `sword_time`                    | `G.swordTime`                  |
| `in_ladder`                     | `G.onLadder`                   |
| `previous_x_collision`          | `G.previousXCollision`         |
| `previous_y_collision`          | `G.previousYCollision`         |
| `hit_time`                      | `G.hitTime`                    |
| `live_character`                | `G.characterAlive`             |
| `can_revive_character`          | `G.canRevive`                  |
| `current_weapon`                | `G.currentWeapon`              |
| `n_fired_arrows`                | `G.firedArrows`                |
| `n_fired_mines`                 | `G.firedMines`                 |
| `in_door`                       | `G.inDoor`                     |
| `freezed`                       | `G.frozen`                     |
| `in_water`                      | `G.inWater`                    |
| `in_lava`                       | `G.inLava`                     |
| `water_counter`                 | `G.waterCounter`               |
| `lava_counter`                  | `G.lavaCounter`                |
| `mine_stepped`                  | `G.mineStepped`                |
| `item`                          | `G.items`                      |
| `world_item`                    | `G.worldItems`                 |
| `cross`                         | `G.hasCross`                   |
| `world_key`                     | `G.hasWorldKey`                |
| `next_world`                    | `G.nextWorld`                  |
| `world_doors_open`              | `G.worldDoorsOpen`             |
| `world_key_item`                | `G.worldKeyItem`               |
| `to_enter_cut`                  | `G.enterCut`                   |
| `currently_selecting`           | `G.selecting`                  |
| `shop_item`                     | `G.shopItems`                  |
| `passage_state`                 | `G.passageState`               |
| `old_keyboard`                  | `G.oldKeyboard`                |
| `stone_hit_counter`             | `G.stoneHitCounter`            |
| `bible_counter`                 | `G.bibleCounter`               |
| `bible_subcounter`              | `G.bibleSubcounter`            |
| `ZEUS_password`                 | `G.zeusPassword`               |
| `ZEUS_used`                     | `G.zeusUsed`                   |
| `room_slimes`                   | `G.roomSlimes`                 |
| `room_waterdragons`             | `G.roomWaterdragons`           |
| `room_reddragon`                | `G.roomReddragon`              |
| `slime_counter`                 | `G.slimeCounter`               |
| `room_watermonster`             | `G.roomWatermonster`           |
| `room_fallingstones`            | `G.roomFallingstones`          |
| `room_rollingstones`            | `G.roomRollingstones`          |
| `stones_counter`                | `G.stonesCounter`              |
| `room_blobs`                    | `G.roomBlobs`                  |
| `room_demonroom`                | `G.roomDemonroom`              |
| `old_room_demonroom`            | `G.oldRoomDemonroom`           |
| `world5_room44_state`           | `G.world5Room44State`          |
| `world5_room44_state2`          | `G.world5Room44State2`         |
| `world5_room44_state3`          | `G.world5Room44State3`         |
| `world5_room64_state`           | `G.world5Room64State`          |
| `world6_room35_state`           | `G.world6Room35State`          |
| `world7_room12_state`           | `G.world7Room12State`          |
| `world8_room12_state`           | `G.world8Room12State`          |
| `room26_state`                  | `G.room26State`                |
| `room56_state`                  | `G.room56State`                |
| `room_bfly`                     | `G.roomBfly`                   |
| `room_fairy`                    | `G.roomFairy`                  |
| `room_appearwall`               | `G.roomAppearwall`             |
| `room_appearwall_x`             | `G.roomAppearwallX`            |
| `room_appearwall_y`             | `G.roomAppearwallY`            |
| `appearwall_record_x`           | `G.appearwallRecordX`          |
| `appearwall_record_y`           | `G.appearwallRecordY`          |
| `fairy_x`                       | `G.fairyX`                     |
| `fairy_y`                       | `G.fairyY`                     |
| `fighting_demon`                | `G.fightingDemon`              |
| `watermonster_state`            | `G.watermonsterState`          |
| `world3_room06_counter`         | `G.world3Room06Counter`        |
| `world4_state`                  | `G.world4State`                |
| `world10_door_x`                | `G.world10DoorX`               |
| `world10_door_y`                | `G.world10DoorY`               |
| `room_lava`                     | `G.roomLava`                   |
| `lava_state`                    | `G.lavaState`                  |
| `room_piranhas`                 | `G.roomPiranhas`               |
| `piranhas_counter`              | `G.piranhasCounter`            |
| `room_birds`                    | `G.roomBirds`                  |
| `n_arrows`                      | `G.arrows`                     |
| `n_coins`                       | `G.coins`                      |
| `n_keys`                        | `G.keys`                       |
| `player_energy`                 | `G.energy`                     |
| `player_experience`             | `G.experience`                 |
| `player_max`                    | `G.maxEnergy`                  |
| `player_denergy`                | `G.shownEnergy`                |
| `player_dexperience`            | `G.shownExperience`            |
| `room_size_x`                   | `G.roomWidth`                  |
| `room_size_y`                   | `G.roomHeight`                 |
| `room_tiles`                    | `G.roomTiles`                  |
| `jumping_from_elevator`         | `G.jumpingFromElevator`        |
| `character_over_vertical_lever` | `G.characterOverVerticalLever` |
| `object`                        | `G.objects`                    |
| `n_objects`                     | `G.objectCount`                |
| `wall_tile`                     | `tileIds.wall`                 |
| `stone_tile`                    | `tileIds.stone`                |
| `ladder_tile`                   | `tileIds.ladder`               |
| `wdoor_tile`                    | `tileIds.wdoor`                |
| `keydoor_tile`                  | `tileIds.keydoor`              |
| `stats_tile`                    | `tileIds.stats`                |
| `coin_tile`                     | `tileIds.coin`                 |
| `arrow_tile`                    | `tileIds.arrow`                |
| `key_tile`                      | `tileIds.key`                  |
| `door_tile`                     | `tileIds.door`                 |
| `character_tile`                | `tileIds.character`            |
| `character_tile_inv`            | `tileIds.characterInv`         |
| `colision_tile`                 | `tileIds.collision`            |
| `pause_tile`                    | `tileIds.pause`                |
| `sword_tile`                    | `tileIds.sword`                |
| `explosion_tile`                | `tileIds.explosion`            |
| `worm_tile`                     | `tileIds.worm`                 |
| `bat_tile`                      | `tileIds.bat`                  |
| `skeleton_tile`                 | `tileIds.skeleton`             |
| `smoke_tile`                    | `tileIds.smoke`                |
| `slime_tile`                    | `tileIds.slime`                |
| `bouncingball_tile`             | `tileIds.bouncingball`         |
| `watermonster_tile`             | `tileIds.watermonster`         |
| `jumpingbush_tile`              | `tileIds.jumpingbush`          |
| `bluespider_tile`               | `tileIds.bluespider`           |
| `whitefireball_tile`            | `tileIds.whitefireball`        |
| `fstone_tile`                   | `tileIds.fstone`               |
| `knight_tile`                   | `tileIds.knight`               |
| `blob_tile`                     | `tileIds.blob`                 |
| `bambu_tile`                    | `tileIds.bambu`                |
| `fairy_tile`                    | `tileIds.fairy`                |
| `porcupine_tile`                | `tileIds.porcupine`            |
| `items_tile`                    | `tileIds.items`                |
| `armas_tile`                    | `tileIds.weapons`              |
| `tomb_tile`                     | `tileIds.tomb`                 |
| `wkeydoor_tile`                 | `tileIds.wkeydoor`             |
| `wnokeydoor_tile`               | `tileIds.wnokeydoor`           |
| `black_tile`                    | `tileIds.black`                |
| `witch_tile`                    | `tileIds.witch`                |
| `whitebear_tile`                | `tileIds.whitebear`            |
| `feet_tile`                     | `tileIds.feet`                 |
| `redjumper_tile`                | `tileIds.redjumper`            |
| `livingwall_tile`               | `tileIds.livingwall`           |
| `lever_tile`                    | `tileIds.lever`                |
| `megabat_tile`                  | `tileIds.megabat`              |
| `lava_tile`                     | `tileIds.lava`                 |
| `piranha_tile`                  | `tileIds.piranha`              |
| `whitestar_tile`                | `tileIds.whitestar`            |
| `demonsign_tile`                | `tileIds.demonsign`            |
| `lupa_tile`                     | `tileIds.magnifier`            |
| `demonsmoke_tile`               | `tileIds.demonsmoke`           |
| `demon_tile`                    | `tileIds.demon`                |
| `spider_tile`                   | `tileIds.spider`               |
| `knighthead_tile`               | `tileIds.knighthead`           |
| `chicken_tile`                  | `tileIds.chicken`              |
| `rockman_tile`                  | `tileIds.rockman`              |
| `cloud_tile`                    | `tileIds.cloud`                |
| `bfly_tile`                     | `tileIds.bfly`                 |
| `armourarrow_tile`              | `tileIds.armourarrow`          |
| `ghost_tile`                    | `tileIds.ghost`                |
| `head_tile`                     | `tileIds.head`                 |
| `worm2_tile`                    | `tileIds.worm2`                |
| `octopus_tile`                  | `tileIds.octopus`              |
| `hairy_tile`                    | `tileIds.hairy`                |
| `waterdragon_tile`              | `tileIds.waterdragon`          |
| `waterbug_tile`                 | `tileIds.waterbug`             |
| `bird_tile`                     | `tileIds.bird`                 |
| `stoneman_tile`                 | `tileIds.stoneman`             |
| `pacman_tile`                   | `tileIds.pacman`               |
| `reddragon_tile`                | `tileIds.reddragon`            |
| `demon_obj`                     | `G.demonObject`                |
| `demon_obj2`                    | `G.demonObject2`               |
| `owl_tile`                      | `tileIds.owl`                  |
| `greenmonkey_tile`              | `tileIds.greenmonkey`          |
| `plant_tile`                    | `tileIds.plant`                |
| `transformer_tile`              | `tileIds.transformer`          |
| `flame_tile`                    | `tileIds.flame`                |
| `witch2_tile`                   | `tileIds.witch2`               |
| `cyclops_tile`                  | `tileIds.cyclops`              |
| `lcloud_tile`                   | `tileIds.lcloud`               |
| `glizard_tile`                  | `tileIds.glizard`              |
| `snake_tile`                    | `tileIds.snake`                |
| `bdemon_tile`                   | `tileIds.bdemon`               |
| `gorilla_tile`                  | `tileIds.gorilla`              |
| `pamperseball_tile`             | `tileIds.pamperseball`         |
| `lever_room_x`                  | `G.leverRoomX`                 |
| `lever_room_y`                  | `G.leverRoomY`                 |
| `lever_x`                       | `G.leverX`                     |
| `lever_y`                       | `G.leverY`                     |
| `lever_drx`                     | `G.leverDrx`                   |
| `lever_dry`                     | `G.leverDry`                   |
| `lever_dx`                      | `G.leverDx`                    |
| `lever_dy`                      | `G.leverDy`                    |
| `lever_going_to`                | `G.leverGoingTo`               |
| `worm_state_tile`               | `G.wormStateTile`              |
| `worm_state_tile_i`             | `G.wormStateTileI`             |
| `worm_state_y`                  | `G.wormStateY`                 |
| `HP_room_x`                     | `G.memRoomX`                   |
| `HP_room_y`                     | `G.memRoomY`                   |
| `HP_obj`                        | `G.memObject`                  |
| `HP_obj_type`                   | `G.memObjectType`              |
| `HP_obj_aux`                    | `G.memObjectAux`               |
| `S_pause`                       | `sfx.pause`                    |
| `S_death`                       | `sfx.death`                    |
| `S_gameover`                    | `sfx.gameover`                 |
| `S_worldkey`                    | `sfx.worldkey`                 |
| `S_entering`                    | `sfx.entering`                 |
| `S_gamestart`                   | `sfx.gamestart`                |
| `S_jump`                        | `sfx.jump`                     |
| `S_sword`                       | `sfx.sword`                    |
| `S_swordhit`                    | `sfx.swordhit`                 |
| `S_item`                        | `sfx.item`                     |
| `S_ah`                          | `sfx.ah`                       |
| `S_ah2`                         | `sfx.ah2`                      |
| `S_powerup`                     | `sfx.powerup`                  |
| `S_enemyhit`                    | `sfx.enemyhit`                 |
| `S_door`                        | `sfx.door`                     |
| `S_enemykill`                   | `sfx.enemykill`                |
| `S_ladderdisapear`              | `sfx.ladderdisapear`           |
| `S_armourhit`                   | `sfx.armourhit`                |
| `S_enterwater`                  | `sfx.enterwater`               |
| `S_select`                      | `sfx.select`                   |
| `S_firearrow`                   | `sfx.firearrow`                |
| `S_firearrow2`                  | `sfx.firearrow2`               |
| `S_waterhit`                    | `sfx.waterhit`                 |
| `S_fall`                        | `sfx.fall`                     |
| `S_nocoins`                     | `sfx.nocoins`                  |
| `S_stones`                      | `sfx.stones`                   |
| `S_blob`                        | `sfx.blob`                     |
| `S_shield`                      | `sfx.shield`                   |
| `S_bell`                        | `sfx.bell`                     |
| `S_lavahit`                     | `sfx.lavahit`                  |
| `S_flapwings`                   | `sfx.flapwings`                |
| `S_rotatedoor`                  | `sfx.rotatedoor`               |
| `S_demon2ball`                  | `sfx.demon2ball`               |
| `S_appearing`                   | `sfx.appearing`                |
| `S_firebreath`                  | `sfx.firebreath`               |
| `S_F1`                          | `sfx.f1`                       |
| `S_karrow`                      | `sfx.karrow`                   |
| `S_jumptree`                    | `sfx.jumptree`                 |
| `S_skeletonhit`                 | `sfx.skeletonhit`              |
| `S_enemybullet`                 | `sfx.enemybullet`              |
| `S_headbullet`                  | `sfx.headbullet`               |
| `S_dropmine`                    | `sfx.dropmine`                 |
| `S_firefire`                    | `sfx.firefire`                 |
| `S_fireball`                    | `sfx.fireball`                 |
| `S_fireball2`                   | `sfx.fireball2`                |
| `S_wdoor`                       | `sfx.wdoor`                    |
| `S_door2`                       | `sfx.door2`                    |
| `S_demonhit`                    | `sfx.demonhit`                 |
| `S_bearbullet`                  | `sfx.bearbullet`               |
| `S_chickenbomb`                 | `sfx.chickenbomb`              |
| `S_colormonster`                | `sfx.colormonster`             |
| `S_waterstone`                  | `sfx.waterstone`               |
| `S_demon4jump`                  | `sfx.demon4jump`               |
| `S_rockman`                     | `sfx.rockman`                  |
| `S_mine`                        | `sfx.mine`                     |
| `S_bible`                       | `sfx.bible`                    |
| `S_demon1jump`                  | `sfx.demon1jump`               |
| `S_demon1bones`                 | `sfx.demon1bones`              |
| `S_owl`                         | `sfx.owl`                      |
| `S_demon7bullet`                | `sfx.demon7bullet`             |
| `S_demon8bullet`                | `sfx.demon8bullet`             |
| `S_flamebullet`                 | `sfx.flamebullet`              |
| `S_snakebullet`                 | `sfx.snakebullet`              |
| `S_gorilla`                     | `sfx.gorilla`                  |
| `S_lizardtongue`                | `sfx.lizardtongue`             |
| `S_bdemonbullet`                | `sfx.bdemonbullet`             |
| `S_lightning`                   | `sfx.lightning`                |
| `music_volume`                  | `G.musicVolume`                |
| `sfx_volume`                    | `sfx.volume`                   |
| `logic_dx`                      | `G.logicDx`                    |
| `logic_dy`                      | `G.logicDy`                    |
| `logic_x`                       | `G.logicX`                     |
| `logic_y`                       | `G.logicY`                     |
| `physic_dx`                     | `G.physicDx`                   |
| `physic_dy`                     | `G.physicDy`                   |
| `physic_x`                      | `G.physicX`                    |
| `physic_y`                      | `G.physicY`                    |
| `UP_KEY`                        | `G.keyUp`                      |
| `DOWN_KEY`                      | `G.keyDown`                    |
| `LEFT_KEY`                      | `G.keyLeft`                    |
| `RIGHT_KEY`                     | `G.keyRight`                   |
| `SWORD_KEY`                     | `G.keySword`                   |
| `WEAPON_KEY`                    | `G.keyWeapon`                  |
| `ITEM_KEY`                      | `G.keyItem`                    |
| `PAUSE_KEY`                     | `G.keyPause`                   |
| `last_word`                     | `G.typedKeys`                  |
| `password_pos`                  | `G.passwordPos`                |

## Classes and members

| C++                         | TypeScript                                  |
| --------------------------- | ------------------------------------------- |
| `SOUNDT`                    | `SoundRef` (platform/audio.ts)              |
| `CSprite`                   | `Sprite` (engine/sprite.ts)                 |
| `CTile`                     | `Tile` (engine/tile.ts)                     |
| `MOGObject`                 | `GameObject` (game/object.ts)               |
| `Bitmap::get_image`         | `getPixels` (engine/bitmap.ts)              |
| `Bitmap::get_palete`        | `palette` of `decodePCX` (engine/bitmap.ts) |
| `Bitmap::get_ancho`         | `getWidth` (engine/bitmap.ts)               |
| `Bitmap::get_alto`          | `getHeight` (engine/bitmap.ts)              |
| `Bitmap::ancho`             | `width` (engine/bitmap.ts)                  |
| `Bitmap::alto`              | `height` (engine/bitmap.ts)                 |
| `Bitmap::pal`               | `palette` of `decodePCX` (engine/bitmap.ts) |
| `Bitmap::draw_sprite`       | `drawSprite` (engine/bitmap.ts)             |
| `Bitmap::draw_sprite_cut`   | `drawSpriteCut` (engine/bitmap.ts)          |
| `Bitmap::draw_sprite_mask`  | `drawSpriteMask` (engine/bitmap.ts)         |
| `Bitmap::coltest`           | `collisionTest` (engine/bitmap.ts)          |
| `Bitmap::to_tile_colision`  | `overlaps` (engine/bitmap.ts)               |
| `CSprite::m_src`            | `bitmap` (engine/sprite.ts)                 |
| `CSprite::m_x`              | `x` (engine/sprite.ts)                      |
| `CSprite::m_y`              | `y` (engine/sprite.ts)                      |
| `CSprite::m_dx`             | `w` (engine/sprite.ts)                      |
| `CSprite::m_dy`             | `h` (engine/sprite.ts)                      |
| `CSprite::m_xoffs`          | `offsetX` (engine/sprite.ts)                |
| `CSprite::m_yoffs`          | `offsetY` (engine/sprite.ts)                |
| `CSprite::draw_cut`         | `drawCut` (engine/sprite.ts)                |
| `CSprite::drawmask`         | `drawMask` (engine/sprite.ts)               |
| `CSprite::coltest`          | `collisionTest` (engine/sprite.ts)          |
| `CSprite::to_tile_colision` | `overlaps` (engine/sprite.ts)               |
| `CTile::m_sp`               | `sprite` (engine/tile.ts)                   |
| `CTile::m_type`             | `collisionType` (engine/tile.ts)            |
| `CTile::drawN`              | `drawNative` (engine/tile.ts)               |
| `CTile::draw_cut`           | `drawCut` (engine/tile.ts)                  |
| `CTile::draw_only_mask`     | `drawMask` (engine/tile.ts)                 |
| `CTile::draw_only_maskN`    | `drawMaskNative` (engine/tile.ts)           |
| `CTile::draw_without_mask`  | `drawNoMask` (engine/tile.ts)               |
| `CTile::draw_without_maskN` | `drawNoMaskNative` (engine/tile.ts)         |
| `CTile::coltest`            | `collisionTest` (engine/tile.ts)            |
| `CTile::coltestN`           | `collisionTestNative` (engine/tile.ts)      |
| `CTile::to_tile_colision`   | `overlaps` (engine/tile.ts)                 |
| `MOGObject::base_tile`      | `baseTile` (game/object.ts)                 |
| `MOGObject::last_hit`       | `lastHit` (game/object.ts)                  |
| `MOGObject::desired_floor`  | `desiredFloor` (game/object.ts)             |
| `MOGObject::in_ladder`      | `onLadder` (game/object.ts)                 |
| `MOGObject::union_x`        | `unionX` (game/object.ts)                   |
| `MOGObject::union_y`        | `unionY` (game/object.ts)                   |
| `MOGObject::draw_x`         | `drawX` (game/object.ts)                    |
| `MOGObject::draw_y`         | `drawY` (game/object.ts)                    |
| `default_s_path`            | `defaultSoundPath` (platform/audio.ts)      |
| `s_path`                    | `soundPath` (platform/audio.ts)             |
| `colision (local)`          | `collision` (game/enemies/types.ts)         |

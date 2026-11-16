"""Generate tools/renames.json: the C++ → TypeScript name map for the clean-up pass.

Run once (python3 tools/make-renames.py), then: node tools/rename.mjs tools/renames.json
"""
import json
import re

S = open('src/game/state.ts').read()
body = S[S.index('export const G = {'):S.index('export type GameState')]
FIELDS = re.findall(r'(?:^\s+|, )([A-Za-z_][A-Za-z0-9_]*):', body, re.M)


def camel(name: str) -> str:
    parts = [p for p in name.split('_') if p]
    if not parts:
        return name
    first = parts[0] if not parts[0].isupper() else parts[0].lower()
    return first + ''.join(p[:1].upper() + p[1:] for p in parts[1:])


FIELD_OVERRIDES = {
    'default_g_path': 'defaultGraphicsPath', 'default_s_path': 'defaultSoundPath',
    'g_paths': 'graphicsPaths', 'n_g_paths': 'graphicsPathCount', 'act_g_path': 'graphicsPathIndex', 'g_path': 'graphicsPath',
    's_paths': 'soundPaths', 'n_s_paths': 'soundPathCount', 'act_s_path': 'soundPathIndex', 's_path': 'soundPath',
    'n_tiles': 'tileCount', 'col_buffer': 'collision', 'colors': 'palette',
    'n_smoke': 'smokeCount', 'demonback_state': 'demonBackState',
    'STATE': 'state', 'SUBSTATE': 'subState', 'OLDSTATE': 'oldState', 'MENUOPTION': 'menuOption',
    'developer_start_x': 'devStartX', 'developer_start_y': 'devStartY', 'developer_start_map': 'devStartWorld',
    'inter_screen': 'interScreen',
    'map': 'world', 'map_x': 'roomX', 'map_y': 'roomY',
    'pers_x': 'playerX', 'pers_y': 'playerY', 'pers_pos': 'playerFrame', 'pers_right': 'facingRight',
    'pers_state': 'playerState', 'pers_substate': 'playerSubState', 'pers_walk_state': 'walkState',
    'in_ladder': 'onLadder', 'live_character': 'characterAlive', 'can_revive_character': 'canRevive',
    'n_fired_arrows': 'firedArrows', 'n_fired_mines': 'firedMines', 'freezed': 'frozen',
    'item': 'items', 'world_item': 'worldItems', 'cross': 'hasCross', 'world_key': 'hasWorldKey',
    'world_doors_open': 'worldDoorsOpen', 'to_enter_cut': 'enterCut', 'currently_selecting': 'selecting',
    'shop_item': 'shopItems', 'ZEUS_password': 'zeusPassword', 'ZEUS_used': 'zeusUsed',
    'n_arrows': 'arrows', 'n_coins': 'coins', 'n_keys': 'keys',
    'player_energy': 'energy', 'player_experience': 'experience', 'player_max': 'maxEnergy',
    'player_denergy': 'shownEnergy', 'player_dexperience': 'shownExperience',
    'room_size_x': 'roomWidth', 'room_size_y': 'roomHeight',
    'object': 'objects', 'n_objects': 'objectCount',
    'colision_tile': 'collisionTile', 'armas_tile': 'weaponsTile', 'lupa_tile': 'magnifierTile',
    'demon_obj': 'demonObject', 'demon_obj2': 'demonObject2',
    'HP_room_x': 'memRoomX', 'HP_room_y': 'memRoomY', 'HP_obj': 'memObject', 'HP_obj_type': 'memObjectType', 'HP_obj_aux': 'memObjectAux',
    'UP_KEY': 'keyUp', 'DOWN_KEY': 'keyDown', 'LEFT_KEY': 'keyLeft', 'RIGHT_KEY': 'keyRight',
    'SWORD_KEY': 'keySword', 'WEAPON_KEY': 'keyWeapon', 'ITEM_KEY': 'keyItem', 'PAUSE_KEY': 'keyPause',
    'last_word': 'typedKeys', 'password_pos': 'passwordPos',
}


def field_name(f: str) -> str:
    if f in FIELD_OVERRIDES:
        return FIELD_OVERRIDES[f]
    if f.endswith('_bmp'):
        return camel(f[:-4]) + 'Bitmap'
    if f.startswith('S_'):
        rest = f[2:]
        return 'sfx' + rest[:1].upper() + rest[1:]
    return camel(f)


renames = []
for f in FIELDS:
    to = field_name(f)
    if to != f:
        renames.append({'file': 'src/game/state.ts', 'name': f, 'to': to, 'kind': 'property', 'cpp': f})

FUNCS = {
    'src/game/gamecycle.ts': {'GameCycle': 'gameCycle', 'drawcharacter': 'drawCharacter'},
    'src/game/gameinteractions.ts': {
        'ActualizeLevers': 'updateLevers', 'GameTestInteractions': 'testInteractions', 'GameRoomEvents': 'roomEvents',
        'fire_arrow': 'fireWeapon', 'test_if_weapon_colision': 'weaponCollision', 'tile_anims': 'animateTiles'},
    'src/game/gameaux.ts': {
        'ReleaseGraphics': 'releaseGraphics', 'SetSFXVolume': 'setSfxVolume', 'ReleaseSound': 'releaseSounds',
        'GameEnd': 'gameEnd', 'newgame': 'newGame', 'drawmap': 'drawMap', 'drawstats': 'drawStats',
        'tile_print': 'tilePrint', 'tile_print2': 'tilePrintOpaque', 'loadroom': 'loadRoom',
        'search_ladder': 'findLadder', 'add_object': 'addObject', 'guardar_configuracion': 'saveConfig',
        'cargar_configuracion': 'loadConfig', 'configuracion_por_defecto': 'defaultConfig',
        'HP_objs_reset': 'resetRoomMemory', 'HP_filter': 'forgetDistantRooms', 'HP_restore': 'restoreRoomMemory',
        'HP_add_record': 'rememberObject', 'HP_modify_record_aux': 'updateRememberedObject',
        'clear_typed_word': 'clearTypedWord', 'check_typed_word': 'updateTypedWord', 'typed_word_p': 'isWordTyped',
        'draw_items_map': 'drawItemsMap', 'iswall': 'isWall', 'iswall_or_blockingobject': 'isWallOrBlocker',
        'get_palette': 'loadPalette', 'load_bitmap': 'loadBitmap', 'ReloadStuff': 'reloadAll',
        'ReloadSound': 'loadSounds', 'GameInit': 'gameInit', 'init_paths': 'initPaths'},
    'src/game/ingamecycle.ts': {'GameInGameCycle': 'updatePlayer'},
    'src/game/gametiles.ts': {'ReloadGraphics': 'loadGraphics'},
    'src/game/shrines.ts': {'passage_mainloop': 'passageCycle'},
    'src/game/demons.ts': {
        'redo_demonintro': 'redoDemonIntro', 'demon_intro': 'demonIntro', 'draw_demon_background': 'drawDemonBackground',
        **{f'load_demon{i}': f'loadDemon{i}' for i in range(1, 11)},
        **{f'demon{i}_cycle': f'demon{i}Cycle' for i in range(1, 11)}},
    'src/game/roomchange.ts': {'RoomChange': 'checkRoomChange'},
    'src/game/gameobjects.ts': {'GameObjectAnimation': 'animateObjects'},
    'src/game/passwords.ts': {'generatepassword': 'generatePassword', 'readpassword': 'readPassword'},
    'src/platform/keyboard.ts': {'SDL_GetKeyboardState': 'getKeyboardState', 'SDL_GetKeyName': 'keyName'},
    'src/platform/audio.ts': {
        'Sound_play': 'playSound', 'Sound_create_sound': 'createSound', 'Sound_create_music': 'playMusic',
        'Sound_release_music': 'stopMusic', 'Sound_pause_music': 'pauseMusic', 'Sound_unpause_music': 'resumeMusic',
        'Sound_temporary_release_music': 'releaseMusicTemporarily', 'Delete_sound': 'deleteSound',
        'Mix_VolumeMusic': 'setMusicVolume', 'SetSFXVolumeRaw': 'setSfxGain', 'music_recovery': 'restartMusic'},
    'src/engine/drawing.ts': {'B_rectangle': 'fillRect', 'B_rectangle2': 'strokeRect', 'Line8B': 'drawLine', 'line_clip': 'clipLine'},
}
for file, m in FUNCS.items():
    for old, new in m.items():
        renames.append({'file': file, 'name': old, 'to': new, 'kind': 'function', 'cpp': old})

# Module-level variables.
renames += [
    {'file': 'src/platform/audio.ts', 'name': 'default_s_path', 'to': 'defaultSoundPath', 'kind': 'variable', 'cpp': 'default_s_path'},
    {'file': 'src/platform/audio.ts', 'name': 's_path', 'to': 'soundPath', 'kind': 'variable', 'cpp': 's_path'},
    {'file': 'src/platform/audio.ts', 'name': 'SOUNDT', 'to': 'SoundRef', 'kind': 'class', 'cpp': 'SOUNDT'},
]

# Classes and their members.
CLASSES = [
    ('src/engine/bitmap.ts', 'Bitmap', None, {
        'get_image': 'getPixels', 'get_palete': 'getPalette', 'get_ancho': 'getWidth', 'get_alto': 'getHeight',
        'ancho': 'width', 'alto': 'height', 'pal': 'palette',
        'draw_sprite': 'drawSprite', 'draw_sprite_cut': 'drawSpriteCut', 'draw_sprite_mask': 'drawSpriteMask',
        'coltest': 'collisionTest', 'to_tile_colision': 'overlaps'}),
    ('src/engine/sprite.ts', 'CSprite', 'Sprite', {
        'm_src': 'bitmap', 'm_x': 'x', 'm_y': 'y', 'm_dx': 'w', 'm_dy': 'h', 'm_xoffs': 'offsetX', 'm_yoffs': 'offsetY',
        'draw_cut': 'drawCut', 'drawmask': 'drawMask', 'coltest': 'collisionTest', 'to_tile_colision': 'overlaps'}),
    ('src/engine/tile.ts', 'CTile', 'Tile', {
        'm_sp': 'sprite', 'm_type': 'collisionType', 'drawN': 'drawNative', 'draw_cut': 'drawCut',
        'draw_only_mask': 'drawMask', 'draw_only_maskN': 'drawMaskNative', 'draw_without_mask': 'drawNoMask',
        'draw_without_maskN': 'drawNoMaskNative', 'coltest': 'collisionTest', 'coltestN': 'collisionTestNative',
        'to_tile_colision': 'overlaps'}),
    ('src/game/object.ts', 'MOGObject', 'GameObject', {
        'base_tile': 'baseTile', 'last_hit': 'lastHit', 'desired_floor': 'desiredFloor', 'in_ladder': 'onLadder',
        'union_x': 'unionX', 'union_y': 'unionY', 'draw_x': 'drawX', 'draw_y': 'drawY'}),
]
for file, cls, newcls, members in CLASSES:
    for old, new in members.items():
        renames.append({'file': file, 'name': old, 'to': new, 'kind': 'member', 'cpp': f'{cls}::{old}'})
    if newcls:
        renames.append({'file': file, 'name': cls, 'to': newcls, 'kind': 'class', 'cpp': cls})

renames.append({'file': 'src/game/enemies/types.ts', 'name': 'colision', 'to': 'collision', 'kind': 'propsig', 'cpp': 'colision (local)'})

json.dump(renames, open('tools/renames.json', 'w'), indent=1)
print(len(renames), 'renames')

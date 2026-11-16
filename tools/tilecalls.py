"""Find (and optionally rewrite) tile draw/collision calls on G.tiles[...] with the
standard screen arguments. Usage: python3 tools/tilecalls.py [--apply]"""
import glob, re, sys, collections

SX = ['SCREEN_X', 'SCREEN_Y', 'SCREEN_X']
COL = 'G.collision!'

def split_args(s):
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch in '([{': depth += 1
        if ch in ')]}': depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    if cur.strip(): out.append(cur.strip())
    return out

def norm(a): return ' '.join(a.split())

def find_calls(text):
    for m in re.finditer(r'G\.tiles\[', text):
        i = m.end(); depth = 1
        while depth:
            if text[i] == '[': depth += 1
            elif text[i] == ']': depth -= 1
            i += 1
        idx = text[m.end():i-1]
        mm = re.match(r'\s*\.(\w+)\(', text[i:])
        if not mm: continue
        meth = mm.group(1); j = i + mm.end(); depth = 1; k = j
        while depth:
            if text[k] == '(': depth += 1
            elif text[k] == ')': depth -= 1
            k += 1
        yield m.start(), k, norm(idx), meth, [norm(a) for a in split_args(text[j:k-1])]

TWO = ('TILE_SIZE_X * 2', 'TILE_SIZE_Y * 2')

def sized(args, w, h):
    return args if (w, h) == TWO else args + [w, h]

def rewrite(t, meth, a):
    if meth == 'collisionTest' and len(a) == 8 and a[4] == COL and a[5:] == SX:
        return 'tileHits', sized([t, a[0], a[1]], a[2], a[3])
    if meth == 'collisionTestNative' and len(a) == 6 and a[2] == COL and a[3:] == SX:
        return 'tileHitsNative', [t, a[0], a[1]]
    if meth == 'draw' and len(a) == 9 and a[5] == COL and a[6:] == SX:
        return 'drawTile', sized([a[4], t, a[0], a[1]], a[2], a[3])
    if meth == 'drawNative' and len(a) == 7 and a[3] == COL and a[4:] == SX:
        return 'drawTileNative', [a[2], t, a[0], a[1]]
    if meth == 'drawMask' and len(a) == 8 and a[4] == COL and a[5:] == SX:
        return 'drawTileMask', sized([t, a[0], a[1]], a[2], a[3])
    if meth == 'drawNoMask' and len(a) == 8 and a[5:] == SX:
        return 'drawTileNoMask', sized([a[4], t, a[0], a[1]], a[2], a[3])
    if meth == 'drawCut' and len(a) == 10 and a[5] == COL and a[6:9] == SX:
        return 'drawTileCut', sized([a[4], t, a[0], a[1], a[9]], a[2], a[3])
    return None

apply = '--apply' in sys.argv
stats = collections.Counter(); unmatched = collections.Counter()
for f in [x for x in glob.glob('src/game/**/*.ts', recursive=True) if not x.endswith('tiledraw.ts')]:
    text = open(f).read(); edits = []; used = set()
    for s, e, t, meth, a in find_calls(text):
        r = rewrite(t, meth, a)
        if r is None:
            unmatched[(meth, len(a))] += 1; continue
        name, args = r
        stats[name] += 1; used.add(name)
        edits.append((s, e, f"{name}({', '.join(args)})"))
    if apply and edits:
        for s, e, rep in sorted(edits, reverse=True): text = text[:s] + rep + text[e:]
        rel = '../' * (f.count('/') - 2)
        spec = (rel or './') + 'tiledraw'
        text = f"import {{ {', '.join(sorted(used))} }} from '{spec}';\n" + text
        open(f, 'w').write(text)
print('rewritable:', dict(stats)); print('not matched:', dict(unmatched))

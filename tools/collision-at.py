"""Rewrite G.collision![X + Y * SCREEN_X] into collisionAt(X, Y) (same index).
Usage: python3 tools/collision-at.py [--apply]"""
import glob, re, sys, collections

def top_terms(expr):
    terms, depth, cur, sign = [], 0, '', '+'
    i = 0
    while i < len(expr):
        ch = expr[i]
        if ch in '([': depth += 1
        if ch in ')]': depth -= 1
        if depth == 0 and ch in '+-' and cur.strip() and not cur.rstrip().endswith(('*', '/', '(', '+', '-')):
            terms.append((sign, cur.strip())); sign = ch; cur = ''
        else:
            cur += ch
        i += 1
    if cur.strip(): terms.append((sign, cur.strip()))
    return terms

def strip_parens(e):
    e = e.strip()
    while e.startswith('(') and e.endswith(')'):
        depth = 0; ok = True
        for k, ch in enumerate(e):
            if ch == '(': depth += 1
            if ch == ')': depth -= 1
            if depth == 0 and k < len(e) - 1: ok = False; break
        if not ok: break
        e = e[1:-1].strip()
    return e

def convert(expr):
    terms = top_terms(' '.join(expr.split()))
    ys = [k for k, (s, t) in enumerate(terms) if re.search(r'\*\s*SCREEN_X$', t) and s == '+']
    if len(ys) != 1: return None
    s, t = terms[ys[0]]
    y = strip_parens(re.sub(r'\s*\*\s*SCREEN_X$', '', t))
    rest = [terms[k] for k in range(len(terms)) if k != ys[0]]
    if not rest: x = '0'
    else:
        x = rest[0][1] if rest[0][0] == '+' else '-' + rest[0][1]
        for sg, tt in rest[1:]: x += f' {sg} {tt}'
    return x, y

apply = '--apply' in sys.argv
n = 0; miss = collections.Counter()
for f in glob.glob('src/game/**/*.ts', recursive=True):
    if f.endswith('tiledraw.ts'): continue
    text = open(f).read(); edits = []
    for m in re.finditer(r'G\.collision!\[', text):
        i = m.end(); depth = 1
        while depth:
            if text[i] == '[': depth += 1
            elif text[i] == ']': depth -= 1
            i += 1
        # only reads (not assignments)
        after = text[i:i+4]
        if re.match(r'\s*(\||&|\^)?=[^=]', after): miss['assign'] += 1; continue
        c = convert(text[m.end():i-1])
        if c is None: miss[' '.join(text[m.end():i-1].split())[:60]] += 1; continue
        edits.append((m.start(), i, f'collisionAt({c[0]}, {c[1]})')); n += 1
    if apply and edits:
        for s, e, r in sorted(edits, reverse=True): text = text[:s] + r + text[e:]
        if "from './tiledraw'" in text or "from '../tiledraw'" in text:
            text = re.sub(r"import \{([^}]*)\} from '(\.\.?/)tiledraw';", lambda mm: f"import {{{mm.group(1).rstrip()}, collisionAt }} from '{mm.group(2)}tiledraw';", text, count=1)
        else:
            rel = '../' if f.count('/') == 3 else './'
            text = f"import {{ collisionAt }} from '{rel}tiledraw';\n" + text
        open(f, 'w').write(text)
print('rewritable', n); print(miss.most_common(8))

"""Build data/crests.json: normalised club name -> ESPN team id (logo at a.espncdn.com/i/teamlogos/soccer/500/<id>.png).

Sources: ESPN team lists for English and major European leagues, and every opponent in Leeds' ESPN schedules
since 2001 (which covers clubs no longer in those leagues). Archive (pre-2001) names are matched by the same
normalisation plus a small alias table. Usage: python3 build.py <folder with t_*.json and s_*.json>
"""
import json, glob, os, re, sys, unicodedata

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DROP = {'fc', 'afc', 'cf', 'cs', 'sc', 'ss', 'as', 'ac', 'sv', 'sk', 'fk', 'cd', 'rc', 'ud', 'sl', 'bk', 'if', 'the', 'and'}

def norm(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    s = s.replace('&', ' and ')
    s = re.sub(r'[^a-z0-9 ]+', ' ', s)
    return ' '.join(w for w in s.split() if w not in DROP)

# archive spellings (and common short forms) -> name ESPN uses
ALIAS = {
    'wolves': 'wolverhampton wanderers', 'spurs': 'tottenham hotspur', 'man utd': 'manchester united', 'man city': 'manchester city',
    'qpr': 'queens park rangers', 'west brom': 'west bromwich albion', 'brighton': 'brighton hove albion', 'brighton hove albion': 'brighton hove albion',
    'sheff utd': 'sheffield united', 'sheff wed': 'sheffield wednesday', 'nottm forest': 'nottingham forest', 'notts forest': 'nottingham forest',
    'bournemouth': 'bournemouth', 'milan': 'milan', 'internazionale': 'internazionale', 'inter milan': 'internazionale',
    'deportivo la coruna': 'deportivo', 'la coruna': 'deportivo', 'psv': 'psv eindhoven', 'psv eindhoven': 'psv eindhoven',
    'roma': 'roma', 'lazio': 'lazio', 'besiktas': 'besiktas', 'galatasaray': 'galatasaray', 'munich 1860': '1860 munich', 'tsv 1860 munich': '1860 munich',
}

ids = {}
def add(name, tid, prio):
    if not name or not tid: return
    k = norm(name)
    if k and (k not in ids or prio < ids[k][1]): ids[k] = (str(tid), prio)

for f in glob.glob(os.path.join(SRC, 't_*.json')):
    try: d = json.load(open(f))
    except Exception: continue
    for lg in d.get('sports', [{}])[0].get('leagues', []):
        for t in lg.get('teams', []):
            t = t['team']
            for n in (t.get('displayName'), t.get('shortDisplayName'), t.get('name'), t.get('location')):
                add(n, t['id'], 1)
for f in glob.glob(os.path.join(SRC, 's_*.json')):
    try: d = json.load(open(f))
    except Exception: continue
    for e in d.get('events', []):
        for c in e['competitions'][0]['competitors']:
            t = c.get('team', {})
            for n in (t.get('displayName'), t.get('shortDisplayName'), t.get('location')):
                add(n, t.get('id'), 0)

for a, target in ALIAS.items():
    k = norm(target)
    if k in ids and norm(a) not in ids: ids[norm(a)] = ids[k]

out = {k: v[0] for k, v in sorted(ids.items())}
json.dump(out, open(os.path.join(ROOT, 'data', 'crests.json'), 'w'), separators=(',', ':'))

# report coverage of every opponent in the bundled history + demo data
opps = set()
for f in glob.glob(os.path.join(ROOT, 'data', 'history', '*.json')) + [os.path.join(ROOT, 'data', 'demo.json')]:
    opps |= {m['opp'] for m in json.load(open(f)) if m.get('opp')}
missing = sorted(o for o in opps if norm(ALIAS.get(norm(o), o)) not in out and norm(o) not in out)
print(f'{len(out)} names -> crests; opponents covered {len(opps) - len(missing)}/{len(opps)}')
print('no crest:', missing)

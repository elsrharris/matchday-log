"""Turn cached lufchistory.com match pages into Matchday Log match data, one JSON file per season."""
import os, re, html, json, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
OUT = os.path.join(HERE, '..', '..', 'data', 'history')


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()


def minute(s):
    m = re.search(r"(\d+)(?:\s*\+\s*(\d+))?\s*'", s or '')
    return (m.group(1) + ('+' + m.group(2) if m.group(2) else '')) if m else ''


COMP = {'FA Charity Shield': 'Charity Shield', 'Division One': 'First Division', 'Division Two': 'Second Division', 'Premier League': 'Premier League',
        'FA Cup': 'FA Cup', 'League Cup': 'League Cup', 'Play-Off': 'Play-off', 'Full Members Cup': "Full Members' Cup",
        'UEFA Cup': 'UEFA Cup', 'Champions League': 'Champions League', 'European Cup': 'European Cup',
        'Cup Winners Cup': "Cup Winners' Cup", 'Charity Shield': 'Charity Shield'}


def parse(fn):
    h = open(fn, encoding='utf-8').read()
    main = h[h.find('<main'):]
    main = main[:main.find('The record')] if 'The record' in main else main
    ld = {}
    for blk in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', h, re.S):
        try:
            d = json.loads(blk)
        except Exception:
            continue
        for g in d.get('@graph', [d]):
            if g.get('@type') == 'SportsEvent':
                ld = g
    slug = re.search(r'seasons_(\d{4}-\d{4})_(\d{4}-\d\d-\d\d-vs-[^.]+)\.html', os.path.basename(fn))
    det = {clean(a): clean(b) for a, b in re.findall(r'<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>', main, re.S)}
    h1 = clean((re.search(r'<h1[^>]*>(.*?)</h1>', main, re.S) or [None, ''])[1])
    sm = re.match(r'(.+?)\s+(\d+)\s*[–-]\s*(\d+)\s+(.+)$', h1)
    home_name = (ld.get('homeTeam') or {}).get('name', '')
    venue = {'Home': 'H', 'Away': 'A', 'Neutral': 'N'}.get(det.get('Venue', ''), '')
    if sm:
        a, sa, sb, b = sm.groups()
        leeds_first = a.strip() in ('Leeds', 'Leeds United')
        ls, os_ = (sa, sb) if leeds_first else (sb, sa)
        opp = b if leeds_first else a
    else:
        ls = os_ = ''
        opp = ''
    if not opp:
        opp = re.sub(r'^.*? v(?:s)? ', '', clean(ld.get('name', '')))
    comp_raw = det.get('Competition', '') or (ld.get('superEvent') or {}).get('name', '')
    m = {
        'date': ld.get('startDate') or slug.group(2)[:10],
        'comp': COMP.get(comp_raw, comp_raw),
        'round': det.get('Round', '') or det.get('Stage', ''),
        'opp': opp.strip(),
        'venue': venue,
        'ground': det.get('Ground', '') or det.get('Stadium', '') or ('Elland Road' if venue == 'H' else ''),
        'att': re.sub(r'[^\d]', '', det.get('Attendance', '')),
        'ref': det.get('Referee', ''),
        'ls': ls, 'os': os_,
        'goals': [], 'subs': [], 'cards': [], 'lineup': [], 'bench': [],
        'manager': det.get('Manager', ''),
        'src': 'lufchistory', 'srcPath': f'/seasons/{slug.group(1)}/{slug.group(2)}/',
    }
    desc = (ld.get('description') or '') + ' ' + ' '.join(det.values())
    if re.search(r'after extra time|\baet\b|a\.e\.t', desc, re.I):
        m['et'] = True
    full = clean(re.sub(r'<script.*?</script>|<svg.*?</svg>', '', main, flags=re.S))
    pm = re.search(r'(\d+)\s*[–-]\s*(\d+)\s+on penalties', desc, re.I)
    if pm:
        m['pens'] = True
        m['pl'], m['po'] = pm.group(1), pm.group(2)
    elif re.search(r'(won|lost) on penalties', full, re.I):
        m['pens'] = True; m['pl'] = m['po'] = ''
    if '(ET)' in main:
        m['et'] = True
    # timeline (only some matches have one)
    tl = re.search(r'How it unfolded.*?<ol[^>]*>(.*?)</ol>', main, re.S)
    if tl:
        for li in re.findall(r'<li[^>]*>(.*?)</li>', tl.group(1), re.S):
            spans = [clean(x) for x in re.findall(r'<span[^>]*>(?:(?!<span).)*?</span>|<span[^>]*>.*?</span>\s*</span>', li, re.S)]
            text = clean(li)
            mn = minute(text)
            body = re.sub(r'^\s*[\d+\s\']+', '', text)
            if re.match(r'(Own )?Goal|Penalty', body, re.I):
                g = re.sub(r'^.*?(?:Goal|Penalty)\s*-\s*', '', body)
                if re.match(r'own goal', g, re.I):
                    m['goals'].append({'min': mn, 't': 'L', 'p': '', 'type': 'OG', 'a': ''})
                else:
                    who = re.split(r',\s*(?:assisted by|\d)', g)[0].strip()
                    ast = re.search(r'assisted by ([^,]+)', g)
                    typ = 'Pen' if re.search(r'pen', body, re.I) else 'Header' if re.search(r'header', body, re.I) else 'Free kick' if re.search(r'free.?kick', body, re.I) else ''
                    m['goals'].append({'min': mn, 't': 'L', 'p': who, 'type': typ, 'a': ast.group(1).strip() if ast else ''})
            elif re.match(r'Substitution', body, re.I):
                s = re.sub(r'^.*Substitution\s*-\s*', '', body)
                on_off = re.match(r'(.+?)\s+(?:on for|for|replaces|replacing)\s+(.+?)(?:,\s*\d.*)?$', s)
                if on_off:
                    m['subs'].append({'min': mn, 't': 'L', 'on': on_off.group(1).strip(), 'off': on_off.group(2).strip()})
                else:
                    m['subs'].append({'min': mn, 't': 'L', 'on': s, 'off': ''})
            elif re.search(r'card|booked|sent off', body, re.I):
                who = re.sub(r'^.*?(?:card|booked|sent off)\s*-\s*', '', body, flags=re.I).split(',')[0].strip()
                kind = 'Red' if re.search(r'red|sent off', body, re.I) else 'Yellow'
                m['cards'].append({'min': mn, 't': 'L', 'p': who, 'c': kind})
            else:
                m.setdefault('_unparsed', []).append(text)
    # line-up sections
    for title, ol in re.findall(r'<h3[^>]*>(.*?)</h3>.*?<ol[^>]*>(.*?)</ol>', main, re.S):
        title = clean(title)
        rows = []
        for li in re.findall(r'<li[^>]*>(.*?)</li>', ol, re.S):
            name = clean((re.search(r'<a[^>]*>(.*?)</a>', li, re.S) or [None, ''])[1])
            if not name:
                continue
            row = {'n': '', 'name': name}
            if re.search(r'<span[^>]*>\s*C\s*</span>', li):
                row['cap'] = True
            ttl = ' '.join(html.unescape(t) for t in re.findall(r'title="([^"]*)"', li))
            row['_goal_titles'] = ttl
            mult = re.search(r'×\s*(\d+)', clean(li))
            row['_goals'] = (int(mult.group(1)) if mult else 1) if '⚽' in li else 0
            rows.append(row)
        if re.search(r'starting', title, re.I):
            m['lineup'] = rows
        elif re.search(r'sub|bench|replacement', title, re.I):
            m['bench'] = rows
        else:
            m.setdefault('_other_sections', []).append(title)
    if det.get('Captain'):
        for r in m['lineup']:
            if r['name'] == det['Captain']:
                r['cap'] = True
    # goals: the summary line lists every known Leeds scorer; the timeline adds assists and goal types
    timeline = m['goals']
    marks = {r['name']: r['_goals'] for r in m['lineup'] + m['bench']}
    goals, unknown = [], 0
    summ = re.search(r'</span>\s*</span>\s*<p[^>]*>(.*?)</p>', main, re.S)
    for part in (clean(summ.group(1)).split('·') if summ else []):
        part = part.strip()
        if not part or re.match(r'no goals', part, re.I):
            continue
        u = re.match(r'(\d+) goals? scorers unavailable', part, re.I)
        if u:
            unknown += int(u.group(1)); continue
        mins = [x[0] + ('+' + x[1] if x[1] else '') for x in re.findall(r"(\d+)'(?:\s*\+\s*(\d+))?", part)]
        name = re.sub(r"\s*\d.*$", '', part).strip()
        og = re.match(r'own goal', name, re.I)
        n = len(mins) or (1 if og else max(1, marks.get(name, 1)))
        for i in range(n):
            goals.append({'min': mins[i] if i < len(mins) else '', 't': 'L', 'p': '' if og else name, 'type': 'OG' if og else '', 'a': ''})
    if len(timeline) > len(goals):
        goals = timeline
    else:
        pool = list(timeline)
        for g in goals:
            hit = next((t for t in pool if t['min'] == g['min'] and (t['p'] == g['p'] or t['type'] == 'OG' == g['type'])), None) \
               or next((t for t in pool if t['p'] == g['p'] and g['p']), None)
            if hit:
                pool.remove(hit)
                g['type'] = g['type'] or hit['type']; g['a'] = hit['a']; g['min'] = g['min'] or hit['min']
    goals.sort(key=lambda g: (int(re.match(r'\d+', g['min']).group()) if g['min'] else 999))
    m['goals'] = goals
    if unknown:
        m['notes'] = f"The archive doesn't record who scored {unknown} of the Leeds goals."
    elif int(ls or 0) > len(goals):
        m['notes'] = f"The archive doesn't record who scored {int(ls) - len(goals)} of the Leeds goals."
    for r in m['lineup'] + m['bench']:
        r.pop('_goal_titles', None); r.pop('_goals', None)
    if any(re.fullmatch(r'(9[1-9]|1[01]\d|120)', g['min'] or '') for g in m['goals']):
        m['et'] = True
    # (no half-time score: the archive only lists Leeds goals, so the opponent's half-time tally is unknown)
    return m


def fa_cup_rounds(ms):
    """Leeds (top two divisions throughout 1980-2001) always entered the FA Cup in the third round,
    so rounds follow from the order of ties; a repeat opponent is a replay."""
    names = ['3rd round', '4th round', '5th round', 'Quarter-final', 'Semi-final', 'Final']
    rnd, last, reps = -1, None, 0
    for m in sorted([x for x in ms if x['comp'] == 'FA Cup'], key=lambda x: x['date']):
        if m['round']:
            continue
        if m['opp'] == last:
            reps += 1
            m['round'] = names[min(rnd, 5)] + (' replay' if reps == 1 else ' 2nd replay' if reps == 2 else f' {reps}rd replay')
        else:
            rnd += 1; reps = 0; last = m['opp']
            m['round'] = names[min(rnd, 5)]


if __name__ == '__main__':
    files = sorted(f for f in glob.glob(RAW + '/seasons_*') if re.search(r'\d{4}-\d\d-\d\d-vs', f))
    by_season = collections.defaultdict(list)
    for f in files:
        m = parse(f)
        if m['date'] >= '1980-01-01':
            by_season[re.search(r'seasons_(\d{4})-\d{4}', f).group(1)].append(m)
    os.makedirs(OUT, exist_ok=True)
    for s, ms in sorted(by_season.items()):
        fa_cup_rounds(ms)
        ms.sort(key=lambda x: x['date'])
        json.dump(ms, open(os.path.join(OUT, f'{s}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(sum(len(v) for v in by_season.values()), 'matches in', len(by_season), 'season files')

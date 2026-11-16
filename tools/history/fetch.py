"""Polite one-off download of lufchistory.com match pages, 1979/80-2000/01.
One request at a time, ~1 per second, every page cached on disk so nothing is fetched twice."""
import os, re, subprocess, time, html, sys

BASE = 'https://lufchistory.com'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw')
os.makedirs(OUT, exist_ok=True)


def get(path):
    fn = os.path.join(OUT, re.sub(r'[^A-Za-z0-9._-]+', '_', path.strip('/')) + '.html')
    if os.path.exists(fn) and os.path.getsize(fn) > 1000:
        return open(fn, encoding='utf-8').read()
    for attempt in range(3):
        r = subprocess.run(['curl', '-s', '-m', '30', '-w', '\n%{http_code}', BASE + path], capture_output=True)
        body, _, code = r.stdout.decode('utf-8', 'replace').rpartition('\n')
        time.sleep(1.0)
        if code == '200':
            open(fn, 'w', encoding='utf-8').write(body)
            return body
        print('  retry', path, code, flush=True)
        time.sleep(5 * (attempt + 1))
    print('FAILED', path, flush=True)
    return ''


seasons = [f'{y}-{y + 1}' for y in range(1979, 2001)]
total = 0
for s in seasons:
    h = get(f'/seasons/{s}/')
    links = sorted(set(html.unescape(l) for l in re.findall(rf'href="(/seasons/{s}/[^"]+/)"', h)))
    links = [l for l in links if l.split('/')[3][:10] >= '1980-01-01']
    print(s, len(links), 'matches', flush=True)
    for l in links:
        get(l)
        total += 1
print('DONE', total, 'match pages', flush=True)

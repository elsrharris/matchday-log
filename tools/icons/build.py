"""Build the app icons (home screen, Android/desktop install, browser tab) from the Leeds crest.

Usage: python3 tools/icons/build.py <crest.png>   (ESPN 500px crest: a.espncdn.com/i/teamlogos/soccer/500/357.png)
Writes assets/icons/: apple-touch-icon.png (180, opaque – iOS fills transparency with black), icon-192.png,
icon-512.png, icon-maskable-512.png (crest inside the central safe zone), favicon-32.png, favicon-16.png.
"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'assets', 'icons')
os.makedirs(OUT, exist_ok=True)
S = 1024  # master size

def background(size):
    """deep navy with a soft floodlight glow from the top, like the app's background"""
    bg = Image.new('RGB', (size, size), (8, 15, 29))
    px = bg.load()
    top, bottom = (25, 69, 138), (8, 15, 29)
    for y in range(size):
        for x in range(size):
            # radial glow centred above the top edge
            dx, dy = (x - size * .5) / size, (y + size * .15) / size
            d = min(1.0, math.hypot(dx * 1.1, dy) / 1.05)
            t = (1 - d) ** 1.6
            px[x, y] = tuple(int(bottom[i] + (top[i] - bottom[i]) * t) for i in range(3))
    # faint diagonal floodlight beam
    beam = Image.new('L', (size, size), 0)
    ImageDraw.Draw(beam).polygon([(size * .05, 0), (size * .32, 0), (size * .75, size), (size * .45, size)], fill=34)
    beam = beam.filter(ImageFilter.GaussianBlur(size * .06))
    bg = Image.composite(Image.new('RGB', (size, size), (150, 185, 255)), bg, beam)
    return bg

def master(crest_path, crest_frac):
    bg = background(S).convert('RGBA')
    crest = Image.open(crest_path).convert('RGBA')
    crest = crest.crop(crest.getbbox())
    h = int(S * crest_frac); w = int(crest.width * h / crest.height)
    crest = crest.resize((w, h), Image.LANCZOS)
    x, y = (S - w) // 2, (S - h) // 2 + int(S * .01)
    # soft shadow under the crest for depth
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    a = crest.split()[3].point(lambda v: int(v * .55))
    sh.paste(Image.new('RGBA', crest.size, (0, 0, 0, 255)), (x, y + int(S * .02)), a)
    sh = sh.filter(ImageFilter.GaussianBlur(S * .025))
    bg = Image.alpha_composite(bg, sh)
    bg.alpha_composite(crest, (x, y))
    return bg.convert('RGB')

crest_path = sys.argv[1]
standard = master(crest_path, .66)
maskable = master(crest_path, .50)   # Android may crop to a circle: keep the crest inside the central 80%
for name, img, px in [('apple-touch-icon.png', standard, 180), ('icon-192.png', standard, 192), ('icon-512.png', standard, 512),
                      ('icon-maskable-512.png', maskable, 512), ('favicon-32.png', standard, 32), ('favicon-16.png', standard, 16)]:
    img.resize((px, px), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
    print(name, px, os.path.getsize(os.path.join(OUT, name)), 'bytes')
standard.resize((512, 512), Image.LANCZOS).save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'preview.png'))

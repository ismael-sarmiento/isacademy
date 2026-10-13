# Builds qr-isacademy.svg/.png (plain) and qr-isacademy-logo.svg (with the "Is" mark) from qr-matrix.txt.
# qr-matrix.txt comes from: ./qr gen "<url>" H > qr-matrix.txt   (CoreImage adds a 1-module border)
from PIL import Image, ImageDraw
NAVY = '#1c2547'
rows = [r for r in open('qr-matrix.txt').read().split('\n') if r]
m = [r[1:-1] for r in rows[1:-1]]
n, Q = len(m), 4
N = n + 2 * Q
c0 = (n - 11) // 2; c1 = c0 + 11  # 11×11 modules reserved for the logo (≈7 % of the code, fine with level H)

def svg(name, center=False):
    parts = [f'M{x + Q} {y + Q}h1v1h-1z' for y in range(n) for x in range(n)
             if m[y][x] == '1' and not (center and c0 <= x < c1 and c0 <= y < c1)]
    extra = ''
    if center:
        mono = open('../../assets/brand/print/is-monogram.svg').read()
        inner = mono[mono.index('<rect'):mono.rindex('</svg>')]
        s = (11 - 1.2) / 1024
        extra = (f'\n  <rect x="{c0 + Q}" y="{c0 + Q}" width="11" height="11" fill="#fff"/>'
                 f'\n  <g transform="translate({c0 + Q + 0.6} {c0 + Q + 0.6}) scale({s:.6f})">{inner}</g>')
    open(name, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" shape-rendering="crispEdges">\n'
                          f'  <rect width="{N}" height="{N}" fill="#fff"/>\n  <path fill="{NAVY}" d="{"".join(parts)}"/>{extra}\n</svg>\n')

svg('qr-isacademy.svg'); svg('qr-isacademy-logo.svg', True)
S = 48
img = Image.new('RGB', (N * S, N * S), 'white'); d = ImageDraw.Draw(img)
for y in range(n):
    for x in range(n):
        if m[y][x] == '1':
            d.rectangle([(x + Q) * S, (y + Q) * S, (x + Q + 1) * S - 1, (y + Q + 1) * S - 1], fill=NAVY)
img.save('qr-isacademy.png')

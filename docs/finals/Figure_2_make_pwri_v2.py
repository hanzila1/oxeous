#!/usr/bin/env python3
"""PWRI-3D isometric architecture figure v2 -> pwri_3d_v2.{html,svg,pdf,png}
The three layers and the output raster are COMPUTED from the same 16x16 fields, so the
output really is the pixel-wise intersection of Layer 2 (loss) and Layer 3 (legal zone)."""
import sys, numpy as np
from PIL import ImageFont
import cairosvg

W, H = 1000, 584
FONT = "Helvetica, Arial, 'Liberation Sans', sans-serif"
INK, GREY, LINE = "#0F172A", "#64748B", "#334155"
N, CW, CH = 16, 8.5, 3.8
OX, SH = 250, 2 * 16 * 3.8
Y1, Y2, Y3 = 82, 228, 398
RED, AMB, GRN = "#D93C4A", "#F2A91F", "#2E9E6F"

# ---------------------------------------------------------------- data fields
def vn(seed, n=N):
    r = np.random.default_rng(seed)
    def oct_(grid, s):
        g = np.random.default_rng(s).random((grid + 2, grid + 2))
        t = (np.arange(n) + .5) * grid / n; i0 = t.astype(int); f = t - i0; f = f * f * (3 - 2 * f)
        a = g[i0][:, i0] * (1 - f)[None, :] * (1 - f)[:, None] + g[i0][:, i0 + 1] * f[None, :] * (1 - f)[:, None]
        b = g[i0 + 1][:, i0] * (1 - f)[None, :] * f[:, None] + g[i0 + 1][:, i0 + 1] * f[None, :] * f[:, None]
        return a + b
    return .65 * oct_(3, seed) + .35 * oct_(6, seed + 99)

def sieve(m):  # MMU-style: drop loss pixels with <2 loss neighbours
    p = np.pad(m, 1); nb = sum(np.roll(np.roll(p, a, 0), b, 1) for a in (-1, 0, 1) for b in (-1, 0, 1)
                              if (a, b) != (0, 0))[1:-1, 1:-1]
    return m & (nb >= 2)

def build(seed):
    F = vn(seed) > np.quantile(vn(seed), .22)
    P = vn(seed + 1) > np.quantile(vn(seed + 1), .76)
    L = sieve(vn(seed + 2) > np.quantile(vn(seed + 2), .78))
    zone = np.where(P, 2, np.where(F, 1, 0))            # 0 other, 1 statutory forest, 2 plantation
    out = np.where(L & (zone == 1), 2, np.where(L & (zone == 2), 1, 0))   # 2 violation, 1 exempt, 0 clean
    return F, L, zone, out

for seed in range(1, 400):
    F, L, zone, out = build(seed)
    rr = np.argwhere(out == 2)
    if 28 <= len(rr) <= 55 and (out == 1).sum() >= 18 and (out == 0).sum() >= 120 and all(5 <= v <= 11 for v in rr.mean(0)):
        break
print("seed", seed, "violation", (out == 2).sum(), "exempt", (out == 1).sum())
shade = vn(seed + 7) * 1.0

# ---------------------------------------------------------------- helpers
def hx(c): return [int(c[i:i + 2], 16) for i in (1, 3, 5)]
def mix(a, b, t): return "#%02X%02X%02X" % tuple(int(x * (1 - t) + y * t) for x, y in zip(hx(a), hx(b)))
def dark(c, t=.25): return mix(c, "#000000", t)

_f = {}
def tw(s, size, bold=False):
    k = (size, bold)
    if k not in _f:
        _f[k] = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf" % ("Bold" if bold else "Regular"), int(size * 20))
    return _f[k].getlength(s) / 20

o, warn = [], []
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;")
def T(x, y, s, size=11, bold=False, a="start", fill=INK, it=False, maxw=None):
    if maxw and tw(s, size, bold) > maxw: warn.append(f"OVERFLOW '{s}' {tw(s, size, bold):.0f}>{maxw}")
    o.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" text-anchor="{a}" fill="{fill}"'
             f'{" font-weight=\"bold\"" if bold else ""}{" font-style=\"italic\"" if it else ""}>{esc(s)}</text>')
def P(pts, fill="none", stroke="none", sw=1, extra=""):
    o.append(f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')
def Ln(x1, y1, x2, y2, c=LINE, w=1, d=None):
    o.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{c}" stroke-width="{w}"{f" stroke-dasharray=\"{d}\"" if d else ""}/>')
def Pl(pts, c=LINE, w=1.2):
    o.append(f'<polyline points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in pts)}" fill="none" stroke="{c}" stroke-width="{w}"/>')
def head(x, y, c=LINE): P([(x, y), (x - 7, y - 3.4), (x - 7, y + 3.4)], c)
def arrow(pts): Pl(pts[:-1] + [(pts[-1][0] - 6, pts[-1][1])]); head(*pts[-1])
def R(x, y, w, h, fill, stroke, sw=1, r=3, d=None):
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{f" stroke-dasharray=\"{d}\"" if d else ""}/>')

def cell(oy, i, j, ox=OX):
    x, y = ox + (i - j) * CW, oy + (i + j) * CH
    return [(x, y), (x + CW, y + CH), (x, y + 2 * CH), (x - CW, y + CH)]

def slab(oy, colfn, th, side):
    Lx, Ly, Rx, By = OX - N * CW, oy + N * CH, OX + N * CW, oy + 2 * N * CH
    P([(Lx, Ly), (OX, By), (OX, By + th), (Lx, Ly + th)], side[0])
    P([(Rx, Ly), (OX, By), (OX, By + th), (Rx, Ly + th)], side[1])
    for j in range(N):
        for i in range(N):
            P(cell(oy, i, j), colfn(j, i), "#FFFFFF", .35, 'stroke-opacity=".55"')

# ---------------------------------------------------------------- colours per layer
def c_l1(r, c):
    base = ["#1D6A45", "#2A8052", "#3F9A5F", "#6FB36F"][min(3, int(shade[r, c] * 4))] if F[r, c] \
        else ["#CFC17E", "#BDA974"][int(shade[r, c] * 2) % 2]
    return mix(base, "#5A7FB5", .5) if L[r, c] else base          # SAR backscatter drop = blue tint
def c_base(r, c): return ["#6E7780", "#838C95"][int(shade[r, c] * 2) % 2] if F[r, c] else "#C4CAD0"
def c_cut(r, c): return ["#7FA48B", "#93B39C"][int(shade[r, c] * 2) % 2] if F[r, c] else "#D2CDA9"
def c_chg(r, c): return "#E0603F" if L[r, c] else ["#BFC9BD", "#C9D2C6"][int(shade[r, c] * 2) % 2]
def c_zone(r, c): return ["#BFE0CE", "#F4BDB9", "#F8DB95"][zone[r, c]]
def c_out(r, c): return [GRN, AMB, RED][out[r, c]]

# ---------------------------------------------------------------- draw
o.append(f'<rect width="{W}" height="{H}" fill="#fff"/>')
T(24, 28, "European Union Deforestation Regulation (EUDR 2023/1115) compliance", 17, True)
T(24, 46, "PWRI-3D: pixel-wise raster intersection in three dimensions (spatial × temporal × statutory legal ontologies)", 11.5, fill=GREY)

Lx, Rx = OX - N * CW, OX + N * CW
for x in (Lx, Rx): Ln(x, Y1 + N * CH, x, Y3 + N * CH, "#94A3B8", 1, "4 3")      # projection guides
red = np.argwhere(out == 2); r0, c0 = red[np.argmin(((red - 7.5) ** 2).sum(1))]                       # highlighted pixel (row, col)
px = OX + (c0 - r0) * CW
Ln(px, Y1 + (c0 + r0 + 1) * CH, px, Y3 + (c0 + r0 + 1) * CH, INK, 1, "1.5 2.5")  # same pixel through all layers

slab(Y3, c_zone, 6, ("#9AA5B1", "#7F8B99"))
for k, fn in ((2, c_base), (1, c_cut), (0, c_chg)): slab(Y2 + 14 * k, fn, 5, ("#8E98A3", "#6F7A86"))
slab(Y1, c_l1, 6, ("#2C5A40", "#214632"))
for oy in (Y1, Y2, Y3): P(cell(oy, c0, r0), "none", INK, 1.5)

dy = abs(c0 - r0) * CH
T(px + 8, ((Y1 + SH - dy + 6) + (Y2 + dy)) / 2 + 3, "same pixel (x, y) in every layer", 9.5, fill=GREY, it=True, maxw=150)

# layer headings
for oy, a, b, c in ((Y1, "Spatial / spectral", "dimension", "10 m pixels"), (Y2, "Temporal trajectory", "dimension", None),
                    (Y3, "Statutory legal", "ontology", None)):
    n_ = {Y1: 1, Y2: 2, Y3: 3}[oy]
    T(24, oy + 12, f"Layer {n_}", 13, True); T(24, oy + 27, a, 11, fill=LINE, maxw=100); T(24, oy + 40, b, 11, fill=LINE)
    if c: T(24, oy + 54, c, 10, fill=GREY, it=True)

# callouts (short leader lines instead of rotated text)
def call(x1, y1, x2, y2, lines, anchor):
    Ln(x1, y1, x2, y2, GREY, .8)
    for i, s in enumerate(lines): T(x2 + (2 if anchor == "start" else -2), y2 + 11 + i * 11, s, 10, a=anchor, fill=LINE, maxw=130)
call(182, 173, 168, 185, ["EC JRC Forest 2020", "Sentinel-2"], "end")
call(318, 173, 330, 185, ["Sentinel-1 SAR"], "start")
for k, s in enumerate(("2021–25 change", "Dec 2020 cutoff", "2000 baseline")):
    y = Y2 + N * CH + 14 * k + 2.5
    Ln(Lx, y, Lx - 8, y, GREY, .8); T(Lx - 11, y + 3.5, s, 10, a="end", fill=LINE, maxw=Lx - 14)
call(318, Y3 + 1.5 * N * CH, 330, Y3 + 1.5 * N * CH + 10, ["FAO ≥ 0.5 ha", "MMU sieve"], "start")

# layer 3 zone legend
lx = 24; T(lx, 561, "LAYER 3 ZONES", 8.5, True, fill=GREY); lx += 82
for col, s in (("#F4BDB9", "Art. 3(a) statutory forest"), ("#F8DB95", "Art. 2(5) tree-crop plantation"), ("#BFE0CE", "Other land")):
    R(lx, 553, 10, 10, col, dark(col, .25), .8, 2); T(lx + 14, 561, s, 10.5, fill=LINE); lx += 14 + tw(s, 10.5) + 16

# engine + arrows
EW, EH, ex = 150, 84, 528
ey = Y2 + 14 + N * CH - EH / 2
ay = [ey + EH * q for q in (.25, .5, .75)]
arrow([(Rx + 2, Y1 + N * CH), (490, Y1 + N * CH), (490, ay[0]), (ex, ay[0])])
arrow([(Rx + 2, ay[1]), (ex, ay[1])])
arrow([(Rx + 2, Y3 + N * CH), (490, Y3 + N * CH), (490, ay[2]), (ex, ay[2])])
R(ex, ey, EW, EH, "#F1F5F9", LINE, 1.2, 5)
T(ex + EW / 2, ey + 36, "PWRI-3D", 14, True, "middle"); T(ex + EW / 2, ey + 52, "Consensus map-algebra", 11, a="middle", maxw=EW - 10)
T(ex + EW / 2, ey + 65, "engine", 11, a="middle")
T(ex + EW / 2, ey - 17, "Tensor product", 10.5, a="middle", fill=GREY)
for k, kind in enumerate(("x", "x", "cap")):
    cx = ex + 37.5 + 37.5 * k
    o.append(f'<circle cx="{cx}" cy="{ey}" r="9" fill="#fff" stroke="{LINE}" stroke-width="1.2"/>')
    if kind == "x": Ln(cx - 4.2, ey - 4.2, cx + 4.2, ey + 4.2, LINE, 1.2); Ln(cx - 4.2, ey + 4.2, cx + 4.2, ey - 4.2, LINE, 1.2)
    else: o.append(f'<path d="M{cx - 4} {ey + 4} V{ey - 1} a4 4 0 0 1 8 0 V{ey + 4}" fill="none" stroke="{LINE}" stroke-width="1.2"/>')

# output raster
RX, RY, S = 730, 100, 14
T(RX + 8 * S, 88, "Classified output raster", 13, True, "middle")
arrow([(ex + EW, ay[1]), (704, ay[1]), (704, RY + 8 * S), (RX - 1, RY + 8 * S)])
for r in range(N):
    for c in range(N):
        R(RX + c * S, RY + r * S, S, S, c_out(r, c), "#FFFFFF", .3, 0)
R(RX, RY, N * S, N * S, "none", LINE, 1, 0); R(RX + c0 * S, RY + r0 * S, S, S, "none", INK, 1.5, 0)
yb = RY + N * S + 14
Ln(RX, yb, RX + 4 * S, yb, LINE, 1.2); Ln(RX, yb - 3, RX, yb + 3, LINE, 1.2); Ln(RX + 4 * S, yb - 3, RX + 4 * S, yb + 3, LINE, 1.2)
T(RX + 4 * S + 6, yb + 3.5, "40 m", 9.5, fill=GREY); T(RX + N * S, yb + 3.5, "EPSG:4326 · 10 m pixels", 9.5, a="end", fill=GREY)
for k, (col, a, b) in enumerate(((RED, "Statutory deforestation violation", "Art. 3(a) · quarantined"),
                                 (AMB, "Exempt agricultural replanting", "Art. 2(5) · lawful"),
                                 (GRN, "Verified clean hectares", "TRACES NT · customs cleared"))):
    y = 376 + k * 31
    R(RX, y - 9, 13, 13, col, dark(col, .2), .8, 2); T(RX + 20, y, a, 11, maxw=240); T(RX + 20, y + 12, b, 10, fill=GREY)

# carve-out protocol
px0, py0, pw, ph = 540, 470, 440, 96
R(px0, py0, pw, ph, "#F8FAFC", "#94A3B8", 1, 6, "4 3")
T(px0 + 14, py0 + 20, "Segregated plot carve-out protocol", 12, True)
cy, x = py0 + 62, px0 + 12
def txt2(x, w, l1, l2):
    T(x + w / 2, cy - 1, l1, 10.5, a="middle", maxw=w); T(x + w / 2, cy + 11, l2, 10.5, a="middle", maxw=w)
def box2(x, w, l1, l2, fill, stroke):
    R(x, cy - 22, w, 44, fill, stroke, 1.2, 4); T(x + w / 2, cy - 1, l1, 10.5, True, "middle", maxw=w - 4); T(x + w / 2, cy + 11, l2, 10.5, True, "middle", maxw=w - 4)
txt2(x, 84, "Quarantined", "pixels detected"); x += 84
arrow([(x + 1, cy), (x + 17, cy)]); x += 17
box2(x, 90, "Excise non-", "compliant pixels", "#FBE3E4", RED); x += 90
arrow([(x + 1, cy), (x + 17, cy)]); x += 17
box2(x, 92, "Export-cleared", "sub-polygon", "#DDF1E8", GRN); x += 92
arrow([(x + 1, cy), (x + 17, cy)]); x += 17
txt2(x, 84, "Due diligence", "statement (DDS)")

svg_body = "\n".join(o)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="7.16in" height="{7.16 * H / W:.3f}in" viewBox="0 0 {W} {H}" font-family="{FONT}">\n{svg_body}\n</svg>\n'
html = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>PWRI-3D architecture</title><style>html,body{margin:0;background:#fff}body{display:flex;justify-content:center;padding:16px}'
        'svg{width:100%;max-width:1200px;height:auto}</style></head><body>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="{FONT}" role="img" aria-label="PWRI-3D: three raster layers intersected into a classified output raster">\n{svg_body}\n</svg>\n</body></html>\n')
n = "pwri_3d_v2"
open(n + ".svg", "w").write(svg); open(n + ".html", "w").write(html)
cairosvg.svg2pdf(bytestring=svg.encode(), write_to=n + ".pdf")
cairosvg.svg2png(bytestring=svg.encode(), write_to=n + ".png", output_width=int(7.16 * 600))
cairosvg.svg2png(bytestring=svg.encode(), write_to="preview3.png", output_width=1800)
print("\n".join(warn) if warn else "OK: no text overflow"); sys.exit(1 if warn else 0)

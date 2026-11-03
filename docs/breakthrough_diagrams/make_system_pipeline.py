#!/usr/bin/env python3
"""IEEE-style Figure 1 (system overview). 1 unit = 1 pt at final 7.16 in width. Min text 6 pt."""
import sys, numpy as np
from PIL import ImageFont
import cairosvg

W, H = 624, 252
FONT = "'Liberation Sans', Arial, Helvetica, sans-serif"
INK, GREY, LINE = "#111111", "#555555", "#222222"
COL = {"remote": ("#DAE8FC", "#6C8EBF"), "geo": ("#D5E8D4", "#82B366"), "reg": ("#FFE6CC", "#D79B00"),
       "sup": ("#E1D5E7", "#9673A6"), "io": ("#F5F5F5", "#666666")}
RED, AMB, GRN, BLU = "#C4454F", "#E0A030", "#3A8F6B", "#4A7FB5"
NM, SB, HD = 7.4, 6.6, 7

# ---- fields shared with Figure 2 logic (mini stack + mini raster are computed, not drawn by hand)
def vn(seed, n=16):
    def oct_(grid, s):
        g = np.random.default_rng(s).random((grid + 2, grid + 2))
        t = (np.arange(n) + .5) * grid / n; i0 = t.astype(int); f = t - i0; f = f * f * (3 - 2 * f)
        a = g[i0][:, i0] * (1 - f)[None, :] * (1 - f)[:, None] + g[i0][:, i0 + 1] * f[None, :] * (1 - f)[:, None]
        b = g[i0 + 1][:, i0] * (1 - f)[None, :] * f[:, None] + g[i0 + 1][:, i0 + 1] * f[None, :] * f[:, None]
        return a + b
    return .65 * oct_(3, seed) + .35 * oct_(6, seed + 99)
sd = 6
F = vn(sd) > np.quantile(vn(sd), .22); Pm = vn(sd + 1) > np.quantile(vn(sd + 1), .76)
Lm = vn(sd + 2) > np.quantile(vn(sd + 2), .78); Sm = (vn(sd + 3) > np.quantile(vn(sd + 3), .80)) & F & ~Pm
zone = np.where(Pm, 2, np.where(Sm, 3, np.where(F, 1, 0))); shade = vn(sd + 7)
out_ = np.where(Lm & (zone == 1), 2, np.where(Lm & (zone == 2), 1, np.where(Lm & (zone == 3), 3, 0)))
def hx(c): return [int(c[i:i + 2], 16) for i in (1, 3, 5)]
def mix(a, b, t): return "#%02X%02X%02X" % tuple(int(x * (1 - t) + y * t) for x, y in zip(hx(a), hx(b)))
def c_l1(r, c):
    base = ["#1D6A45", "#2A8052", "#3F9A5F", "#6FB36F"][min(3, int(shade[r, c] * 4))] if F[r, c] else "#CFC17E"
    return mix(base, "#5A7FB5", .5) if Lm[r, c] else base
def c_chg(r, c): return "#E0603F" if Lm[r, c] else "#C4CEC1"
def c_zone(r, c): return ["#BFE0CE", "#F4BDB9", "#F8DB95", "#B9D3EE"][zone[r, c]]
CLS = [GRN, AMB, RED, BLU]

_f = {}
def tw(s, size, bold=False):
    k = (size, bold)
    if k not in _f:
        _f[k] = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf" % ("Bold" if bold else "Regular"), int(size * 20))
    return _f[k].getlength(s) / 20
o, warn = [], []
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;")
def T(x, y, s, size=SB, bold=False, a="middle", fill=INK, it=False, maxw=None, ls=None):
    if maxw and tw(s, size, bold) > maxw: warn.append("OVERFLOW '%s' %.0f>%.0f" % (s, tw(s, size, bold), maxw))
    st = (' font-weight="bold"' if bold else "") + (' font-style="italic"' if it else "") + (' letter-spacing="%s"' % ls if ls else "")
    o.append('<text x="%.1f" y="%.1f" font-size="%s" text-anchor="%s" fill="%s"%s>%s</text>' % (x, y, size, a, fill, st, esc(s)))
def RT(x, y, segs, size=SB, a="middle", fill=INK, it=True, maxw=None, bold=False):
    sub = size * .7; wd = sum(tw(t, sub if g else size, bold) for t, g in segs)
    if maxw and wd > maxw: warn.append("OVERFLOW RT %.0f>%.0f" % (wd, maxw))
    x0 = {"start": x, "middle": x - wd / 2, "end": x - wd}[a]; parts, prev = [], False
    for t, g in segs:
        if g: parts.append('<tspan font-size="%.1f" dy="%.1f">%s</tspan>' % (sub, size * .22, esc(t)))
        elif prev: parts.append('<tspan dy="-%.1f">%s</tspan>' % (size * .22, esc(t)))
        else: parts.append('<tspan>%s</tspan>' % esc(t))
        prev = g
    st = (' font-style="italic"' if it else "") + (' font-weight="bold"' if bold else "")
    o.append('<text x="%.1f" y="%.1f" font-size="%s" fill="%s" xml:space="preserve"%s>%s</text>' % (x0, y, size, fill, st, "".join(parts)))
def R(x, y, w, h, fill, stroke, sw=.9, r=3, d=None):
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%s" fill="%s" stroke="%s" stroke-width="%s"%s/>' % (x, y, w, h, r, fill, stroke, sw, ' stroke-dasharray="%s"' % d if d else ""))
def Ln(x1, y1, x2, y2, c=LINE, w=.8):
    o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%s"/>' % (x1, y1, x2, y2, c, w))
def Pg(pts, fill="none", stroke="none", sw=1):
    o.append('<polygon points="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (" ".join("%.1f,%.1f" % p for p in pts), fill, stroke, sw))
def dot(x, y, r, fill=LINE, stroke="none"): o.append('<circle cx="%.1f" cy="%.1f" r="%s" fill="%s" stroke="%s" stroke-width=".8"/>' % (x, y, r, fill, stroke))
def head_r(x, y): Pg([(x, y), (x - 4.2, y - 1.6), (x - 4.2, y + 1.6)], LINE)
def head_d(x, y): Pg([(x, y), (x - 1.6, y - 4.2), (x + 1.6, y - 4.2)], LINE)
def arrow_h(x1, x2, y): Ln(x1, y, x2 - 3.8, y); head_r(x2, y)
def arrow_d(x, y1, y2): Ln(x, y1, x, y2 - 3.8); head_d(x, y2)

def mslab(ox, oy, fn, th=2, side=("#9AA5B1", "#7F8B99"), n=4, cw=5, ch=2.2):
    idx = [2, 6, 9, 13]
    Lx, Ly, Rx, By = ox - n * cw, oy + n * ch, ox + n * cw, oy + 2 * n * ch
    Pg([(Lx, Ly), (ox, By), (ox, By + th), (Lx, Ly + th)], side[0]); Pg([(Rx, Ly), (ox, By), (ox, By + th), (Rx, Ly + th)], side[1])
    for j in range(n):
        for i in range(n):
            x, y = ox + (i - j) * cw, oy + (i + j) * ch
            Pg([(x, y), (x + cw, y + ch), (x, y + 2 * ch), (x - cw, y + ch)], fn(idx[j], idx[i]), "#fff", .25)

def block(x, y, w, h, kind, names, subs, nm_gap=9, sb_gap=7.8):
    R(x, y, w, h, COL[kind][0], COL[kind][1]); cx = x + w / 2
    blk = len(names) * nm_gap + (2 + len(subs) * sb_gap if subs else 0); ty = y + (h - blk) / 2
    for s in names: ty += nm_gap; T(cx, ty - 1.8, s, NM, True, maxw=w - 6)
    ty += 2 if subs else 0
    for s in subs:
        ty += sb_gap
        if isinstance(s, list): RT(cx, ty - 1.5, s, SB, "middle", GREY, True, w - 6)
        else: T(cx, ty - 1.5, s, SB, False, fill=GREY, maxw=w - 6)



import base64, io, argparse
from PIL import Image
from scipy import ndimage as ndi
ap = argparse.ArgumentParser(); ap.add_argument("--map", default="8"); ARGS, _ = ap.parse_known_args()
MAPS = {"6": "/mnt/user-data/uploads/1793443378216_image.png", "7": "/mnt/user-data/uploads/1793443435933_image.png", "8": "/mnt/user-data/uploads/1793447230714_image.png"}
def check(x, y, s=.8, c="#fff"): o.append('<polyline points="%.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="none" stroke="%s" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' % (x - 2.4 * s, y, x - .6 * s, y + 2 * s, x + 2.6 * s, y - 2.4 * s, c))
def image(x, y, w, h, data): o.append('<image x="%.1f" y="%.1f" width="%.1f" height="%.1f" preserveAspectRatio="none" xlink:href="data:image/jpeg;base64,%s"/>' % (x, y, w, h, data))

# ================================================================= REAL MAP: read class pixels, recolour to the figure palette
im = np.asarray(Image.open(MAPS[ARGS.map]).convert("RGB")).astype(float); H0, W0 = im.shape[:2]
SRC = {"clean": (42, 161, 107), "amb": (244, 170, 29), "sil": (0, 70, 254), "viol": (217, 58, 73)}
NEW = {"clean": (58, 143, 107), "amb": (224, 160, 48), "sil": (74, 127, 181), "viol": (196, 69, 79)}
def near(c, t): return np.sqrt(((im - np.array(c, float)) ** 2).sum(-1)) < t
masks = {k: near(v, 38) for k, v in SRC.items()}; ovl = masks["clean"] | masks["amb"] | masks["sil"] | masks["viol"]
lab, nl = ndi.label(ndi.binary_fill_holes(ndi.binary_closing(ovl, structure=np.ones((3, 3)), iterations=2)))
plots = []
for i in range(1, nl + 1):
    m = lab == i
    if m.sum() < 0.002 * H0 * W0: continue
    cnt = {k: int((masks[k] & m).sum()) for k in masks}; tot = sum(cnt.values()); cy, cx = ndi.center_of_mass(m)
    plots.append(dict(cx=cx / W0, cy=cy / H0, pct={k: 100 * v / tot for k, v in cnt.items()}, mask=m))
plots.sort(key=lambda p: (round(p["cy"], 1), p["cx"]))
for k, p in enumerate(plots, 1): p["id"] = k; p["bad"] = p["pct"]["viol"] > 50
print("plots:", [(p["id"], {k: round(v, 1) for k, v in p["pct"].items()}) for p in plots])
out_im = im.copy(); gold = near((255, 225, 0), 45)
for k in NEW: out_im[masks[k]] = NEW[k]
out_im[gold] = (242, 203, 70)
yy0, xx0 = np.mgrid[0:H0, 0:W0]; hatch = ((xx0 + yy0) % 26) < 5
for p in plots:                                   # carve-out: violation pixels inside CLEAN plots are excised (hatched)
    if not p["bad"]:
        ex = ndi.binary_dilation(masks["viol"] & p["mask"], iterations=2); out_im[ex] = (238, 238, 238); out_im[ex & hatch] = (150, 150, 150)
OW_, OH_ = 480, int(480 * H0 / W0)
b_ = io.BytesIO(); Image.fromarray(out_im.astype(np.uint8)).resize((OW_, OH_), Image.LANCZOS).save(b_, "JPEG", quality=90); MAP64 = base64.b64encode(b_.getvalue()).decode()

# ================================================================= ICONS (flat, 12x12)
def icon(kind, x, y, c):
    s = {
     "cattle": '<path d="M3.2 3.2H8.8L8.2 8Q6 11 3.8 8Z" fill="C"/><path d="M3 3.2Q1.2 2.6 1.4 .8M9 3.2Q10.8 2.6 10.6 .8" stroke="C" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse cx="1.8" cy="4.6" rx="1.6" ry=".8" fill="C"/><ellipse cx="10.2" cy="4.6" rx="1.6" ry=".8" fill="C"/><circle cx="5" cy="8.3" r=".5" fill="#fff"/><circle cx="7" cy="8.3" r=".5" fill="#fff"/>',
     "cocoa": '<path d="M6 .8C9.8 2.6 9.8 9.4 6 11.2C2.2 9.4 2.2 2.6 6 .8Z" fill="C"/><path d="M6 1.6V10.4M4.2 2.8Q3.6 6 4.2 9.2M7.8 2.8Q8.4 6 7.8 9.2" stroke="#fff" stroke-width=".6" fill="none" stroke-opacity=".85"/>',
     "coffee": '<ellipse cx="4.3" cy="4.3" rx="3.1" ry="2.1" transform="rotate(-40 4.3 4.3)" fill="C"/><ellipse cx="7.7" cy="7.7" rx="3.1" ry="2.1" transform="rotate(-40 7.7 7.7)" fill="C"/><path d="M2.6 5.7Q4.4 4.3 6 2.9M6 9.1Q7.8 7.7 9.4 6.3" stroke="#fff" stroke-width=".6" fill="none"/>',
     "palm": '<path d="M6.2 11.4Q6.8 8 6 5.4" stroke="C" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M6 5.4Q3.2 3.4 .8 5M6 5.4Q4.2 2.2 2 1.8M6 5.4Q6 2.2 6.2 .8M6 5.4Q8 2.2 10 1.8M6 5.4Q8.8 3.4 11.2 5" stroke="C" stroke-width="1" fill="none" stroke-linecap="round"/>',
     "rubber": '<path d="M6 .8C6 .8 2.4 5 2.4 7.4A3.6 3.6 0 0 0 9.6 7.4C9.6 5 6 .8 6 .8Z" fill="C"/><path d="M4.2 7.6Q4.3 9.2 5.8 9.6" stroke="#fff" stroke-width=".7" fill="none" stroke-linecap="round"/>',
     "soy": '<path d="M1.8 9.6Q.8 5.2 5 3.2Q9 1.4 10.6 2.6Q11.6 5.2 7.6 8.6Q4.2 11 1.8 9.6Z" fill="none" stroke="C" stroke-width=".9"/><circle cx="3.9" cy="7.2" r="1.15" fill="C"/><circle cx="6.1" cy="5.5" r="1.15" fill="C"/><circle cx="8.2" cy="3.9" r="1.15" fill="C"/>',
     "wood": '<circle cx="3.6" cy="8.2" r="2.8" fill="none" stroke="C" stroke-width=".9"/><circle cx="8.4" cy="8.2" r="2.8" fill="none" stroke="C" stroke-width=".9"/><circle cx="6" cy="3.6" r="2.8" fill="none" stroke="C" stroke-width=".9"/><circle cx="3.6" cy="8.2" r=".9" fill="C"/><circle cx="8.4" cy="8.2" r=".9" fill="C"/><circle cx="6" cy="3.6" r=".9" fill="C"/>'}[kind]
    o.append('<g transform="translate(%.1f %.1f)">%s</g>' % (x - 6, y - 6, s.replace('"C"', '"%s"' % c)))

# ================================================================= LAYOUT
o.append('<rect width="%d" height="%d" fill="#fff"/>' % (W, H))
Y0, Y1 = 22, 226
for cx, s in ((37, "1  INPUT"), (122, "2  EVIDENCE"), (304, "3  DETERMINISTIC ADJUDICATION"), (532, "4  OUTPUT MAP & STATUS")):
    T(cx, 12, s, HD, True, fill=GREY, ls=.3)

# ---- 1 input: plot polygon (+ mass) and a vertical commodity selector with icons
R(4, 22, 66, 64, COL["io"][0], COL["io"][1]); T(37, 33, "Plot polygon", NM, True, maxw=62)
pp_ = [(12 + nx * 50, 38 + ny * 22) for nx, ny in [(.05, .1), (.95, 0), (1, .9), (.2, 1)]]
Pg(pp_, "#DCE8F7", "#3B6EA8", 1)
for x, y in pp_: dot(x, y, 1.2, "#3B6EA8")
T(37, 53, "P", NM + 1, True, fill="#1E3A5F", it=True)
T(37, 72, "+ declared mass", SB, False, fill=GREY, it=True, maxw=62); T(37, 80, "m (kg)", SB, False, fill=GREY, it=True)
R(4, 92, 66, 134, "#FFFFFF", COL["reg"][1], 1); T(37, 103, "Commodity c", NM, True, maxw=62); T(37, 111, "EUDR Annex I", SB - .3, False, fill=GREY)
for i, (kd, nm) in enumerate((("cocoa", "Cocoa"), ("coffee", "Coffee"), ("palm", "Oil palm"), ("rubber", "Rubber"), ("soy", "Soya"), ("wood", "Wood"), ("cattle", "Cattle"))):
    y = 116 + i * 15.2
    if i == 0:
        R(7, y, 60, 13.5, COL["reg"][0], COL["reg"][1], 1.2, 3); icon(kd, 15, y + 6.75, "#9A6700"); T(24, y + 9.4, nm, SB + .2, True, "start", maxw=30)
        dot(60, y + 6.75, 3.4, COL["reg"][1]); check(60, y + 6.75, .5)
    else:
        R(7, y, 60, 13.5, "#fff", "#C8C8C8", .7, 3); icon(kd, 15, y + 6.75, "#4B5563"); T(24, y + 9.4, nm, SB + .2, False, "start", "#444444", maxw=40)

# ---- 2 evidence
ev = [("remote", "Remote sensing", ["forest baseline 2020", "canopy loss · SAR"]), ("geo", "Geospatial", ["protected areas", "geodesic area · DEM"]),
      ("reg", "Regulatory", ["EUDR articles", "crop model · yield cap"])]
ey = [22, 95, 168]; mids = [y + 29 for y in ey]
for (k, nm, sb), y in zip(ev, ey): block(82, y, 80, 58, k, [nm], sb)
Ln(70, 54, 76, 54); dot(76, 54, 1.3); Ln(76, mids[0], 76, mids[1]); arrow_h(76, 82, mids[0]); arrow_h(76, 82, mids[1])
arrow_h(70, 82, mids[2])                                   # commodity c -> regulatory (crop model, yield cap)

# ---- 3 adjudication
R(174, Y0, 260, Y1 - Y0, "none", "#666666", .8, 5, "3 2")
KX, KW, cA, cB, KH = 180, 146, 28, 128, 90
for y in (cA, cB): R(KX, y, KW, KH, "#FFFFFF", "#666666", .9, 3)
bx = 168
for m in mids: Ln(162, m, bx, m)
Ln(bx, mids[0], bx, mids[2])
for y in (cA, cB): dot(bx, y + 45, 1.3); arrow_h(bx, KX, y + 45)
T(KX + 6, cA + 11, "PWRI-3D map algebra", NM, True, "start", maxw=108); T(KX + KW - 5, cA + 11, "Fig. 2", SB, False, "end", GREY)
sx = KX + 32
mslab(sx, cA + 28 + 18, c_zone); mslab(sx, cA + 28 + 9, c_chg); mslab(sx, cA + 28, c_l1, 2, ("#2C5A40", "#214632"))
cxm, cym = KX + 66, cA + 50
dot(cxm, cym, 4.4, "#fff", LINE); Ln(cxm - 2.4, cym - 2.4, cxm + 2.4, cym + 2.4, LINE, .9); Ln(cxm - 2.4, cym + 2.4, cxm + 2.4, cym - 2.4, LINE, .9)
Ln(cxm + 4.4, cym, cxm + 8, cym)
R(KX + 74, cym - 6.5, 29, 13, "#FBEFEF", RED, .9, 6.5); T(KX + 88.5, cym + 2.4, "≥ 0.5 ha", SB, True, maxw=27)
arrow_h(KX + 103, KX + 108, cym)
edges = np.linspace(0, 16, 7).astype(int); rs = 5.2; rx0, ry0 = KX + 109, cA + 34.5
for r in range(6):
    for c in range(6):
        blk_ = out_[edges[r]:edges[r + 1], edges[c]:edges[c + 1]]
        cnt = [(blk_ == v).sum() for v in range(4)]; k = max(range(4), key=lambda v: (cnt[v], v in (2, 3)))
        R(rx0 + c * rs, ry0 + r * rs, rs, rs, CLS[k], "#fff", .3, 0)
R(rx0, ry0, 6 * rs, 6 * rs, "none", LINE, .7, 0)
T(KX + 73, cA + 82, "3 layers → sieve → 4 classes", SB, False, fill=GREY, maxw=140)
T(KX + 6, cB + 11, "Six-agent consensus", NM, True, "start", maxw=108); T(KX + KW - 5, cB + 11, "Fig. 3", SB, False, "end", GREY)
for i, k in enumerate(["remote", "remote", "geo", "geo", "reg", "reg"]):
    x = KX + 6 + i * 22.4
    R(x, cB + 21, 19, 15, COL[k][0], COL[k][1], .9, 2.5); T(x + 9.5, cB + 31.4, "A%d" % (i + 1), SB, True)
    Ln(x + 9.5, cB + 36, x + 9.5, cB + 42)
Ln(KX + 15.5, cB + 42, KX + 6 + 5 * 22.4 + 9.5, cB + 42); arrow_d(KX + 73, cB + 42, cB + 51)
R(KX + 8, cB + 51, 130, 17, COL["sup"][0], COL["sup"][1], 1, 3); T(KX + 73, cB + 62.6, "Supervisor · deterministic gate", SB + .4, True, maxw=126)
T(KX + 73, cB + 82, "fusion → statutory overrides → gate", SB, False, fill=GREY, maxw=140)
GX, GW, GY, GH = 340, 88, 82, 84
Ln(KX + KW, cA + 45, 333, cA + 45); Ln(KX + KW, cB + 45, 333, cB + 45); Ln(333, cA + 45, 333, cB + 45); dot(333, 124, 1.3); arrow_h(333, GX, 124)
R(GX, GY, GW, GH, "#FFFFFF", "#666666", .9, 3)
T(GX + GW / 2, GY + 12, "Carve-out", NM, True, maxw=80)
RT(GX + GW / 2, GY + 25, [("P", 0), ("export", 1), (" = P", 0), ("declared", 1), (" \\ V", 0), ("3(a)", 1)], 6.4, maxw=82)
Ln(GX + 6, GY + 33, GX + GW - 6, GY + 33, "#BBBBBB", .6)
T(GX + GW / 2, GY + 45, "Yield gate", NM, True, maxw=80)
RT(GX + GW / 2, GY + 57, [("M", 0), ("max", 1), (" = A", 0), ("export", 1), (" · Y", 0), ("c", 1)], 6.4, maxw=82)
RT(GX + GW / 2, GY + 68, [("M", 0), ("decl", 1), (" ≤ M", 0), ("max", 1)], 6.4, maxw=82)
gxm = GX + GW / 2 + 14
o.append('<path d="M37 22V17H%.1fV%.1f" fill="none" stroke="#6B7280" stroke-width=".9" stroke-dasharray="3 2"/>' % (gxm, GY - 4))
Pg([(gxm, GY), (gxm - 1.8, GY - 4.4), (gxm + 1.8, GY - 4.4)], "#6B7280"); T(172, 15.3, "declared mass m", SB - .6, False, "start", "#6B7280", it=True)

# ---- 4 output: real classified map + per-plot verdicts + deliverables
OX0 = 444; bx3 = 439
Ln(GX + GW, 124, bx3, 124); Ln(bx3, 95, bx3, 209); dot(bx3, 124, 1.3); arrow_h(bx3, OX0, 95); arrow_h(bx3, OX0, 209)
R(OX0, 22, 112, 148, "#FFFFFF", "#555555", .9, 3); T(OX0 + 5, 30.5, "Classified output", NM - .2, True, "start", maxw=102)
IMW = 106; IMH = IMW * H0 / W0; ix0, iy0 = OX0 + 3, 34; ioff = max(0, (126 - IMH) / 2)
R(ix0, iy0, IMW, 126, "#E5E7EB", "none", 0, 0); image(ix0, iy0 + ioff, IMW, IMH, MAP64); R(ix0, iy0, IMW, 126, "none", "#333333", .6, 0)
for p in plots:
    bxp, byp = ix0 + p["cx"] * IMW, iy0 + ioff + p["cy"] * IMH
    dot(bxp, byp, 5.6, "#fff", "#222"); T(bxp, byp + 2.4, str(p["id"]), SB, True)
T(OX0 + 56, 166, "satellite basemap + pipeline overlay", SB - .6, False, fill=GREY, maxw=106)
for i, p in enumerate(plots[:3]):
    x, y = 560, 34 + i * 44; bad = p["bad"]; c = RED if bad else GRN; pc = p["pct"]; tc = "#A63844" if bad else "#2F7A59"
    R(x, y, 60, 38, "#fff", c, 1.1, 3); R(x, y, 3.5, 38, c, "none", 0, 1.5)
    dot(x + 11, y + 8.5, 4.8, "#fff", "#222"); T(x + 11, y + 10.8, str(p["id"]), SB - .2, True)
    T(x + 18, y + 10.5, "VIOLATION" if bad else "CLEAN", SB, True, "start", tc, maxw=40)
    RT(x + 7, y + 22, [("V", 0), ("3(a)", 1), (" = %.1f %%" % pc["viol"], 0)], SB + .2, "start", INK, True, 50)
    bw_, bx_ = 48, x + 7; xx = bx_
    for k, col in (("clean", GRN), ("amb", AMB), ("sil", BLU), ("viol", RED)):
        w_ = bw_ * pc[k] / 100
        if w_ > 0: R(xx, y + 25, w_, 4.5, col, "none", 0, 0); xx += w_
    R(bx_, y + 25, bw_, 4.5, "none", "#999", .4, 0)
    T(x + 7, y + 35, "quarantined" if bad else ("carved out" if pc["viol"] >= 0.5 else ("exempt %.1f %%" % (pc["amb"] + pc["sil"]) if pc["amb"] + pc["sil"] >= 0.5 else "export-cleared")), SB - .4, False, "start", GREY, maxw=50)
nbad = sum(p["bad"] for p in plots); ngood = len(plots) - nbad
R(OX0, 176, 176, 13, "#F3F4F6", "#C5C9CF", .9, 3); T(OX0 + 88, 185.4, "Status: %d plots cleared · %d quarantined" % (ngood, nbad), SB + .2, True, maxw=170)
good_ids = ", ".join(str(p["id"]) for p in plots if not p["bad"])
for i, (c, nm, l1, l2) in enumerate(((GRN, "TRACES NT DDS", "plots %s cleared" % good_ids, "HS 1801 · code C716"), ("#8A6BAA", "Audit ledger", "SHA-256 Merkle proof", "per-pixel provenance"))):
    x = OX0 + i * 90
    R(x, 194, 86, 32, "#F5F5F5", "#666666", .9, 3); R(x, 194, 3.5, 32, c, "none", 0, 1.5)
    T(x + 46, 205, nm, SB + .3, True, maxw=78); T(x + 46, 214, l1, SB - .2, False, fill=GREY, maxw=78); T(x + 46, 222, l2, SB - .2, False, fill=GREY, maxw=78)

# ---- legend
ly, lx = 244, 4
for k, lab in (("remote", "Remote sensing"), ("geo", "Geospatial"), ("reg", "Regulatory"), ("sup", "Supervisor")):
    R(lx, ly - 6, 7, 7, COL[k][0], COL[k][1], .8, 1.5); T(lx + 10, ly, lab, SB, False, "start"); lx += 10 + tw(lab, SB) + 12
lx += 2; Ln(lx - 8, ly - 7, lx - 8, ly + 2, "#BBBBBB", .6)
for c, lab in ((GRN, "Clean"), (AMB, "Replanting"), (BLU, "Silviculture"), (RED, "Violation")):
    R(lx, ly - 6, 7, 7, c, "none", 0, 1.5); T(lx + 10, ly, lab, SB, False, "start"); lx += 10 + tw(lab, SB) + 12
R(lx, ly - 6, 7, 7, "#EEEEEE", "#999999", .6, 1.5); Ln(lx + 1, ly + .5, lx + 6, ly - 5, "#999", .7); Ln(lx + 1, ly - 2.5, lx + 3.5, ly - 5, "#999", .7); Ln(lx + 3.5, ly + .5, lx + 6, ly - 2, "#999", .7)
T(lx + 10, ly, "Excised", SB, False, "start"); lx += 10 + tw("Excised", SB) + 12
Ln(lx, ly - 2.5, lx + 14, ly - 2.5, "#F2CB46", 1.8); Ln(lx, ly - 2.5, lx + 14, ly - 2.5, "#8A7A20", .5); T(lx + 18, ly, "Plot boundary", SB, False, "start")

body = "\n".join(o)
NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
svg = '<svg %s width="7.16in" height="%.3fin" viewBox="0 0 %d %d" font-family="%s">\n%s\n</svg>\n' % (NS, 7.16 * H / W, W, H, FONT, body)
html = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>Fig. 1 system overview</title><style>html,body{margin:0;background:#fff}body{display:flex;justify-content:center;padding:16px}'
        'svg{width:100%%;max-width:1300px;height:auto}</style></head><body>\n<svg %s viewBox="0 0 %d %d" font-family="%s" role="img" '
        'aria-label="System overview from plot polygon and commodity selection to a classified satellite output map with per-plot verdicts">\n%s\n</svg>\n</body></html>\n') % (NS, W, H, FONT, body)
n = "fig1_v5" + ("" if ARGS.map == "8" else "_map" + ARGS.map)
open(n + ".svg", "w").write(svg); open(n + ".html", "w").write(html)
cairosvg.svg2pdf(bytestring=svg.encode(), write_to=n + ".pdf")
cairosvg.svg2png(bytestring=svg.encode(), write_to=n + ".png", output_width=int(7.16 * 600))
cairosvg.svg2png(bytestring=svg.encode(), write_to="preview_" + n + ".png", output_width=2100)
print("\n".join(warn) if warn else "OK: no text overflow"); sys.exit(1 if warn else 0)

#!/usr/bin/env python3
"""EUDR architecture figure v2 -> agent_architecture_v3.{html,svg,pdf,png}. 1 unit = 1 pt at 560 pt wide."""
import sys
from PIL import ImageFont
import cairosvg

# ------------------------------------------------------------- CONFIG
W, H = 622, 312
FONT = "'Liberation Sans', Arial, Helvetica, sans-serif"
NAME, SUB, GRP = 7.5, 6.4, 5.8
NLH, SLH = 9.2, 7.8
SW, AW, R, L, B = 1.0, 0.9, 3, 4.2, 1.7
GREY, INK = "#555555", "#111111"
COL = {"remote": ("#DAE8FC", "#6C8EBF"), "geo": ("#D5E8D4", "#82B366"),
       "reg": ("#FFE6CC", "#D79B00"), "sup": ("#E1D5E7", "#9673A6"),
       "io": ("#F5F5F5", "#666666"), "step": ("#FFFFFF", "#9673A6")}
GROUPS = [("remote", "REMOTE SENSING"), ("geo", "GEOSPATIAL"), ("reg", "REGULATORY")]
# CITES: edit here if you disagree. Verified against Reg. (EU) 2023/1115: Art. 2(3) deforestation, 2(4) forest (0.5 ha),
# 2(6) agricultural plantation, 2(7) forest degradation; Art. 9(1)(b) quantity. (Your draft had Art. 2(5) and Art. 16(3).)
AGENTS = [  # tag, group row, col, name lines, subtitle lines (str or list of (text, is_subscript))
    ("A1", 0, 0, ["Optical", "spectrometry"], ["EC JRC GFC2020 V3 · Hansen", "Sentinel-2 10 m phenology"]),
    ("A2", 0, 1, ["SAR disturbance"], ["Sentinel-1 RADD 10 m C-band", "Temporal backscatter coherence"]),
    ("A3", 1, 0, ["Cadastral &", "protected lands"], ["UNEP-WCMC WDPA · IUCN", "Indigenous land · GLO-30 DEM"]),
    ("A4", 1, 1, ["Topological", "geometry"], ["Geodesic area · ≥ 0.5 ha MMU (Art. 2(4))", [("Carve-out P", 0), ("decl", 1), (" \\ V", 0), ("3(a)", 1)]]),
    ("A5", 2, 0, ["Statutory legal"], ["Tree-crop replanting (Art. 2(6))", "Silviculture rules (Art. 2(3), 2(7))"]),
    ("A6", 2, 1, ["Biophysical yield", "& anti-laundering"], [[("Yield cap M", 0), ("decl", 1), (" ≤ A", 0), ("export", 1), (" · Y", 0), ("c", 1)], "Quantity plausibility (Art. 9(1)(b))"]),
]
STEPS = [("Weighted fusion", "multi-sensor matrix"), ("Overrides", "statutory, strict"),
         ("Gating", "zero-hallucination")]
FOOT = "* Provisional: legal article numbers, A4 method and A6 metric await confirmation."

# ------------------------------------------------------------- GEOMETRY
Y0 = 26
X_IN, W_IN = 6, 66
X_AG, W_AG = 88, 306
BX, BW, BH, BGAP, RH, RGAP = X_AG + 8, 290, 65, 8, 65, 8   # bands
BY = [Y0 + 20 + i * (BH + BGAP) for i in range(3)]
Y1 = BY[2] + BH + 6
MID = [y + BH / 2 for y in BY]
YM = MID[1]
X_SU, W_SU = 414, 100
X_OUT, W_OUT = 540, 76
BUS_IN, BUS_FI, BUS_OUT = 80, 402, 527
BOXW, BOXH, BOXGAP = 136, 47, 6

_f = {}
def tw(s, size, bold=False, italic=False):
    k = (size, bold)
    if k not in _f:
        _f[k] = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf"
                                   % ("Bold" if bold else "Regular"), int(size * 20))
    return _f[k].getlength(s) / 20.0

out, warn = [], []
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def text(x, y, s, size, bold=False, anchor="middle", fill=INK, italic=False, maxw=None, ls=None):
    if maxw and tw(s, size, bold) > maxw:
        warn.append(f"OVERFLOW '{s}' ({tw(s, size, bold):.1f} > {maxw:.1f})")
    extra = (' font-style="italic"' if italic else "") + (f' letter-spacing="{ls}"' if ls else "")
    out.append(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" text-anchor="{anchor}" fill="{fill}"'
               f'{" font-weight=\"bold\"" if bold else ""}{extra}>{esc(s)}</text>')

def rt(x, y, segs, size, anchor="start", fill=GREY, maxw=None):
    sub = size * .7; wd = sum(tw(t, sub if g else size) for t, g in segs)
    if maxw and wd > maxw: warn.append(f"OVERFLOW RT {wd:.1f} > {maxw:.1f}")
    x0 = {"start": x, "middle": x - wd / 2, "end": x - wd}[anchor]; parts, prev = [], False
    for t, g in segs:
        if g: parts.append(f'<tspan font-size="{sub:.1f}" dy="{size * .22:.1f}">{esc(t)}</tspan>')
        elif prev: parts.append(f'<tspan dy="-{size * .22:.1f}">{esc(t)}</tspan>')
        else: parts.append(f'<tspan>{esc(t)}</tspan>')
        prev = g
    out.append(f'<text x="{x0:.2f}" y="{y:.2f}" font-size="{size}" fill="{fill}" xml:space="preserve">{"".join(parts)}</text>')

def rect(x, y, w, h, kind, dash=False, r=R, sw=SW, fill=None, op=None):
    f, s = COL[kind]
    if dash: f = "none"
    if fill: f = fill
    d = ' stroke-dasharray="4 2.5"' if dash else ""
    o = f' fill-opacity="{op}" stroke-opacity="0.55"' if op else ""
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{f}" stroke="{s}" '
               f'stroke-width="{sw}"{d}{o}/>')

def line(x1, y1, x2, y2, c="#222", dash=False):
    d = ' stroke-dasharray="3 2"' if dash else ""
    out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{AW}"{d}/>')

def head(x, y, d, c="#222"):
    p = {"r": [(x, y), (x - L, y - B), (x - L, y + B)], "d": [(x, y), (x - B, y - L), (x + B, y - L)],
         "u": [(x, y), (x - B, y + L), (x + B, y + L)]}[d]
    out.append(f'<polygon points="{" ".join(f"{a:.2f},{b:.2f}" for a, b in p)}" fill="{c}"/>')

def arrow_h(x1, x2, y): line(x1, y, x2 - L + .4, y); head(x2, y, "r")
def arrow_d(x, y1, y2): line(x, y1, x, y2 - L + .4); head(x, y2, "d")
def dot(x, y): out.append(f'<circle cx="{x}" cy="{y}" r="1.7" fill="#222"/>')

def center_box(x, y, w, h, kind, names, subs, tag):
    rect(x, y, w, h, kind)
    blk = len(names) * NLH + (2.5 + len(subs) * SLH if subs else 0)
    ty, cx = y + (h - blk) / 2, x + w / 2
    for s in names:
        ty += NLH; text(cx, ty - 2.2, s, NAME, True, maxw=w - 6)
    ty += 2.5 if subs else 0
    for s in subs:
        ty += SLH; text(cx, ty - 1.8, s, SUB, fill=GREY, maxw=w - 6)

# ------------------------------------------------------------- DRAW
out.append(f'<rect width="{W}" height="{H}" fill="#fff"/>')
for cx, s in [(X_IN + W_IN / 2, "1  INPUT"), (X_AG + W_AG / 2, "2  EVIDENCE AGENTS"),
              (X_SU + W_SU / 2, "3  SUPERVISOR"), (X_OUT + W_OUT / 2, "4  OUTPUTS")]:
    text(cx, 14, s, 6.5, True, fill=GREY, ls=0.4)

# input
center_box(X_IN, YM - 42, W_IN, 84, "io", ["Operator", "payload"],
           ["Production-plot", "polygon P (WGS84)", "Declared net", "mass m (kg)"], "input")

# evidence container, bands, agents
rect(X_AG, Y0, W_AG, Y1 - Y0, "io", dash=True)
text(X_AG + 8, Y0 + 13, "Independent evidence", 8, True, "start")
for gi, (g, lab) in enumerate(GROUPS):
    rect(BX, BY[gi], BW, BH, g, r=R + 1, sw=0.6, op=0.32)
    text(BX + 6, BY[gi] + 9, lab, GRP, True, "start", fill=COL[g][1], ls=0.5)
for tag, r, c, names, subs in AGENTS:
    g = GROUPS[r][0]
    x, y = BX + 6 + c * (BOXW + BOXGAP), BY[r] + 13
    rect(x, y, BOXW, BOXH, g)
    out.append(f'<circle cx="{x + 11}" cy="{y + 10.5}" r="6.3" fill="#fff" stroke="{COL[g][1]}" stroke-width="0.9"/>')
    text(x + 11, y + 12.5, tag, 5.6, True)
    for i, s in enumerate(names):
        text(x + 21, y + 11.8 + i * NLH, s, NAME, True, "start", maxw=BOXW - 24)
    for i, s in enumerate(subs):
        yy = y + BOXH - 14.5 + i * SLH
        if isinstance(s, list): rt(x + 6, yy, s, SUB, "start", GREY, BOXW - 10)
        else: text(x + 6, yy, s, SUB, anchor="start", fill=GREY, maxw=BOXW - 10)

# supervisor
ys = YM - 79
rect(X_SU, ys, W_SU, 158, "sup")
text(X_SU + W_SU / 2, ys + 13.5, "Supervisor", 8, True)
text(X_SU + W_SU / 2, ys + 22.7, "consensus agent", 8, True)
text(X_SU + W_SU / 2, ys + 34, "Deterministic resolution", SUB, fill=GREY, italic=True, maxw=W_SU - 6)
sx, sw_, sh, sg = X_SU + 6, W_SU - 12, 28, 12
for i, (n, s) in enumerate(STEPS):
    y = ys + 42 + i * (sh + sg)
    center_box(sx, y, sw_, sh, "step", [n], [s], n)
    text(sx + 7.5, y + sh / 2 + 2.4, str(i + 1), 7, True, fill=COL["sup"][1])
    if i < 2: arrow_d(sx + sw_ / 2, y + sh, y + sh + sg)

# outputs
center_box(X_OUT, YM - 100 + 12, W_OUT, 76, "io", ["EU TRACES NT"],
           ["Due-diligence", "statement", "(DDS, TARIC C716)"], "o1")
center_box(X_OUT, YM + 12, W_OUT, 76, "io", ["Cryptographic", "audit ledger"],
           ["SHA-256 Merkle,", "tamper-evident"], "o2")
o1, o2 = YM - 100 + 12 + 38, YM + 12 + 38

# data flow: fan-out -> fan-in -> fan-out (every segment meets a box edge or a junction)
line(X_IN + W_IN, YM, BUS_IN, YM); line(BUS_IN, MID[0], BUS_IN, MID[2]); dot(BUS_IN, YM)
for m in MID: arrow_h(BUS_IN, BX, m)
for m in MID: line(BX + BW, m, BUS_FI, m)
line(BUS_FI, MID[0], BUS_FI, MID[2]); dot(BUS_FI, YM); arrow_h(BUS_FI, X_SU, YM)
line(X_SU + W_SU, YM, BUS_OUT, YM); line(BUS_OUT, o1, BUS_OUT, o2); dot(BUS_OUT, YM)
arrow_h(BUS_OUT, X_OUT, o1); arrow_h(BUS_OUT, X_OUT, o2)

# control: supervisor bottom edge -> container bottom edge (both ends attached)
cy, cx_ = Y1 + 12, X_AG + W_AG / 2
scx = X_SU + W_SU / 2
line(scx, ys + 158, scx, cy, "#555", True); line(scx, cy, cx_, cy, "#555", True)
line(cx_, cy, cx_, Y1 + L - .4, "#555", True); head(cx_, Y1, "u", "#555")
lw = tw("control", 6) + 6; lx = (scx + cx_) / 2
out.append(f'<rect x="{lx - lw / 2}" y="{cy - 4.5}" width="{lw}" height="9" fill="#fff"/>')
text(lx, cy + 2.2, "control", 6, fill=GREY)

# legend + footnote
ly, x = H - 28, 6
text(x, ly + 2, "AGENT TYPES", 6, True, "start", fill=GREY, ls=0.4); x += tw("AGENT TYPES", 6, True) + 14
for k, lab in [("remote", "Remote sensing"), ("geo", "Geospatial"), ("reg", "Regulatory"), ("sup", "Supervisor")]:
    out.append(f'<rect x="{x}" y="{ly - 4}" width="8" height="8" rx="1.5" fill="{COL[k][0]}" '
               f'stroke="{COL[k][1]}" stroke-width="0.9"/>')
    text(x + 12, ly + 2, lab, 6.5, anchor="start"); x += 12 + tw(lab, 6.5) + 16
x += 10
line(x, ly, x + 15, ly); head(x + 19, ly, "r"); text(x + 24, ly + 2, "Data flow", 6.5, anchor="start")
x += 24 + tw("Data flow", 6.5) + 18
line(x, ly, x + 19, ly, "#555", True); text(x + 24, ly + 2, "Closed-loop control", 6.5, anchor="start")
pass

body = "\n".join(out)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="7.16in" height="{7.16 * H / W:.3f}in" '
       f'viewBox="0 0 {W} {H}" font-family="{FONT}">\n{body}\n</svg>\n')
html = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>EUDR multi-agent verification architecture</title>'
        '<style>html,body{margin:0;background:#fff}body{display:flex;justify-content:center;padding:16px}'
        'svg{width:100%;max-width:1100px;height:auto}</style></head><body>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="{FONT}" '
        f'role="img" aria-label="Architecture: operator payload to six evidence agents to supervisor to outputs">\n'
        f'{body}\n</svg>\n</body></html>\n')
n = "agent_architecture_v3"
open(n + ".svg", "w").write(svg); open(n + ".html", "w").write(html)
cairosvg.svg2pdf(bytestring=svg.encode(), write_to=n + ".pdf")
cairosvg.svg2png(bytestring=svg.encode(), write_to=n + ".png", output_width=int(7.16 * 600))
cairosvg.svg2png(bytestring=svg.encode(), write_to="preview2.png", output_width=1800)
print("\n".join(warn) if warn else "OK: no text overflow")
sys.exit(1 if warn else 0)

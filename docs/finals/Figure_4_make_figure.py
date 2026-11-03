import os
import textwrap
import fitz
from PIL import Image, ImageDraw, ImageFont


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_px: int) -> list[str]:
    """Word-wrap text cleanly by actual pixel width — never slices inside a word."""
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        cand = f"{cur} {w}".strip()
        if draw.textlength(cand, font=font) <= max_px:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def generate_equations_image() -> None:
    W, H = 2400, 1350
    im = Image.new("RGBA", (W, H), "#F8FAFC")
    draw = ImageDraw.Draw(im)

    # Load OpenType / TrueType Fonts (Cambria Math has full BMP + Astral math coverage)
    font_bold_path = "C:/Windows/Fonts/segoeuib.ttf"
    font_reg_path = "C:/Windows/Fonts/segoeui.ttf"
    font_cambria_ttc = "C:/Windows/Fonts/cambria.ttc"
    font_cambria_bold = "C:/Windows/Fonts/cambriab.ttf"

    f_title = ImageFont.truetype(font_bold_path, 40)
    f_subtitle = ImageFont.truetype(font_reg_path, 21)
    f_badge = ImageFont.truetype(font_bold_path, 15)
    f_card_title = ImageFont.truetype(font_bold_path, 25)
    f_card_sub = ImageFont.truetype(font_reg_path, 16)
    f_card_sub_b = ImageFont.truetype(font_bold_path, 16)
    # Index 1 in cambria.ttc is Cambria Math!
    f_eq_big = ImageFont.truetype(font_cambria_ttc, 31, index=1)
    f_eq_sub = ImageFont.truetype(font_cambria_ttc, 20, index=1)
    f_body_bold = ImageFont.truetype(font_bold_path, 17)
    f_desc = ImageFont.truetype(font_reg_path, 14)
    f_master = ImageFont.truetype(font_cambria_ttc, 29, index=1)

    DARK = "#0F172A"
    SLATE = "#334155"
    MUTED = "#64748B"
    BORDER = "#CBD5E1"
    CARD_BG = "#FFFFFF"
    EMERALD = "#059669"
    EMERALD_BG = "#ECFDF5"
    AMBER = "#D97706"
    AMBER_BG = "#FFFBEB"
    BLUE = "#2563EB"
    BLUE_BG = "#EFF6FF"
    ROSE = "#E11D48"
    ROSE_BG = "#FFF1F2"
    PURPLE = "#7C3AED"
    PURPLE_BG = "#F5F3FF"

    # Outer frame & subtle vertical guides
    draw.rounded_rectangle([(18, 18), (W - 18, H - 18)], radius=16, fill="#FFFFFF", outline="#E2E8F0", width=2)
    for x in range(160, W - 120, 200):
        draw.line([(x, 30), (x, H - 30)], fill="#F8FAFC", width=1)

    # Header Emblem & Title
    draw.rounded_rectangle([(50, 42), (105, 97)], radius=12, fill="#315F50")
    draw.ellipse([(66, 58), (89, 81)], outline="#FFFFFF", width=3)
    draw.line([(77, 51), (77, 88)], fill="#FFFFFF", width=2)
    draw.line([(59, 69), (96, 69)], fill="#FFFFFF", width=2)

    draw.text((124, 38), "OXEOUS: MATHEMATICAL FOUNDATIONS & STATUTORY DERIVATIONS", fill=DARK, font=f_title)
    draw.text(
        (124, 88),
        "Direct First-Principles Mathematical Invariants Resolving EUDR (Reg. (EU) 2023/1115 & Reg. (EU) 2025/2650) Compliance Deadlocks",
        fill=MUTED,
        font=f_subtitle,
    )

    badges = [
        ("EUR-Lex OJ L 150 Compliant", EMERALD, EMERALD_BG, "#A7F3D0"),
        ("Zero Regulatory Hallucination", AMBER, AMBER_BG, "#FDE68A"),
        ("EIC Deep-Tech Moat", PURPLE, PURPLE_BG, "#DDD6FE"),
    ]
    bx = W - 50
    for txt, text_col, bg_col, border_col in reversed(badges):
        tw = int(draw.textlength(txt, font=f_badge)) + 26
        bx -= tw
        draw.rounded_rectangle([(bx, 48), (bx + tw, 82)], radius=17, fill=bg_col, outline=border_col, width=2)
        draw.text((bx + 13, 55), txt, fill=text_col, font=f_badge)
        bx -= 12

    card_w = 1130
    card_h = 505

    cards_data = [
        {
            "col": 0, "row": 0,
            "pillar": "PILLAR 1 · SPATIAL & ONTOLOGICAL TENSOR ENGINE",
            "article": "EUR-Lex Art. 2(4), Art. 2(5)/2(6) & Recital 37",
            "title": "PWRI-3D Tri-Axial Tensor Adjudication",
            "lead": "Industry Fatal Flaw:",
            "problem": "Conventional 2D GIS cannot distinguish primary forest clearing from cyclical cocoa, coffee, or oil palm renewal, triggering 66%–75% false positives across tropical smallholder farms (Thünen Institute, 2025).",
            "equation": "M(x, y)  =  L_spatial(x, y)  ⊗  L_temporal(x, y)  ∩  L_statutory(x, y)",
            "eq_sub": "C(x, y) = Φ_MMU>0.5ha [ ΔS_T0→Tcurr(x, y) ∩ B_2020(x, y) ]  ∖  [ E_Art.2(5)(x, y)  ∪  E_Art.2(3)/2(7)(x, y) ]",
            "outputs": [
                ("Art. 3(a) Violation (Red)", "Canopy loss > 0.5 ha inside statutory 2020 forest; quarantined from EU entry.", ROSE, ROSE_BG),
                ("Art. 2(5)/2(6) Replanting (Amber)", "Cyclical tree-crop renewal on pre-2020 agricultural plantation; certified lawful.", AMBER, AMBER_BG),
                ("Art. 2(3)/2(7) Silviculture (Blue)", "Sustainable timber harvest inside managed planted forest without conversion.", BLUE, BLUE_BG),
                ("Art. 3(a) Deforestation-Free (Green)", "Zero post-2020 statutory disturbance across multi-sensor consensus layers.", EMERALD, EMERALD_BG),
            ],
            "accent": EMERALD,
        },
        {
            "col": 1, "row": 0,
            "pillar": "PILLAR 2 · TOPOLOGICAL SEGREGATION STUDIO",
            "article": "EUR-Lex Art. 9(1)(d) & COM(2026) 191 Protocol",
            "title": "Continuous Topological Plot Carve-Out & Conservation",
            "lead": "Statutory Impasse:",
            "problem": "Under Art. 9(1)(d), any unsegregated deforestation within a declared polygon disqualifies the entire plot. An isolated 1 ha edge clearing on a 150 ha cooperative estate causes 100% commercial forfeiture.",
            "equation": "𝒫_export  =  𝒫_declared  ∖  𝒱_Art.3(a) ,    𝒱_Art.3(a) = { (x, y) ∈ 𝒫_decl | C(x, y) = Violation }",
            "eq_sub": "Geodesic Area Identity:  A_total = (A_clean + A_replant + A_silviculture) + A_violation  =  A_export + A_violation (±0.00 ha)",
            "outputs": [
                ("Planar Boolean Excision", "Shapely 2.0 difference operator (P_decl \\ V_3(a)) excises non-compliant polygons.", DARK, "#F1F5F9"),
                ("Exact Geodesic Conservation", "WGS84 ellipsoidal integration proves ±0.00 ha area conservation in TRACES NT.", EMERALD, EMERALD_BG),
                ("Compliant Harvest Salvage", "Retains clean & Art. 2(5) exempt sub-polygons (0.0% statutory deforestation).", BLUE, BLUE_BG),
                ("RFC 7946 6-Decimal GeoJSON", "Self-healing bowtie topology repair ready for EU Single Window submission.", PURPLE, PURPLE_BG),
            ],
            "accent": BLUE,
        },
        {
            "col": 0, "row": 1,
            "pillar": "PILLAR 3 · ANTI-FRAUD MASS-BALANCE GATE",
            "article": "EUR-Lex Art. 9(1)(b), Art. 10(2)(f), Art. 16(3) & Reg. 2025/2650",
            "title": "Biophysical Yield & Commodity Laundering Invariant",
            "lead": "Polygon-Laundering Risk:",
            "problem": "Without mass-balance gating, unscrupulous traders carve out a 1 ha clean parcel (or borrow neighbor coordinates) and claim a 50-tonne harvest came from it, laundering illicit volume through customs.",
            "equation": "Y_implied = M_decl / ∬_𝒫_export dA  ≤  Y_ceiling(c, region)   ⟺   M_decl ≤ A_export · Y_c",
            "eq_sub": "Laundering Gate:  CERTIFIED (PASS) if Y_implied ≤ Y_c  ;  QUARANTINED (FRAUD SHIELD) if Y_implied > Y_c",
            "outputs": [
                ("Implied Biophysical Yield", "Computes M_declared / A_export [kg/ha/yr] against verified exportable area.", DARK, "#F1F5F9"),
                ("FAO / CIRAD / ICRAF Ceilings", "Empirical regional biological caps across all 7 EUDR Annex I commodities.", BLUE, BLUE_BG),
                ("Anti-Laundering Fraud Shield", "Blocks shipments inflated beyond photosynthetic carrying capacity pre-customs.", ROSE, ROSE_BG),
                ("Point-Evasion Audit (< 4 ha)", "Screens Art. 9(1)(d) point declarations against perimeter evasion anomalies.", EMERALD, EMERALD_BG),
            ],
            "accent": AMBER,
        },
        {
            "col": 1, "row": 1,
            "pillar": "PILLAR 4 · MULTI-AGENT CONSENSUS & PROVENANCE",
            "article": "EUR-Lex Art. 3(b)/(c), Art. 25(2)(a) & Art. 33 (TRACES NT)",
            "title": "Six-Agent Deterministic Supervisor & SHA-256 Merkle Root",
            "lead": "Audit & Turnover Liability:",
            "problem": "Optical alerts fail under tropical cloud cover while unconstrained LLMs hallucinate legal verdicts, exposing first operators to administrative fines ≥ 4% of EU annual turnover and Art. 17 seizures.",
            "equation": "Φ_consensus  =  [ ∑ w_k · c_k · σ_k ]  /  [ ∑ w_k · c_k ]   ≥   τ_statutory",
            "eq_sub": "H_root  =  SHA256( H(𝒫_export)  ‖  H(C_PWRI)  ‖  H(Y_implied)  ‖  H(Φ_consensus) )",
            "outputs": [
                ("Six Concurrent Domain Agents", "Optical (A1), SAR (A2), Cadastre (A3), Topology (A4), Legal (A5), Yield (A6).", DARK, "#F1F5F9"),
                ("Deterministic Supervisor Gate", "Weighted fusion, strict IUCN/Art. 2(5) overrides & zero-hallucination gating.", PURPLE, PURPLE_BG),
                ("SHA-256 Merkle Provenance", "Immutable per-pixel & canonical JSON digest retained for 5-year statutory audit.", BLUE, BLUE_BG),
                ("TARIC Box 44 · Code C716", "Unlocks EU Customs Single Window (CERTEX) Due Diligence Statement clearance.", EMERALD, EMERALD_BG),
            ],
            "accent": PURPLE,
        },
    ]

    for c in cards_data:
        x0 = 50 + c["col"] * (card_w + 40)
        y0 = 132 + c["row"] * (card_h + 22)
        x1 = x0 + card_w
        y1 = y0 + card_h

        draw.rounded_rectangle([(x0, y0), (x1, y1)], radius=16, fill=CARD_BG, outline=BORDER, width=2)
        draw.rounded_rectangle([(x0, y0), (x1, y0 + 7)], radius=4, fill=c["accent"])

        draw.text((x0 + 24, y0 + 18), c["pillar"], fill=c["accent"], font=f_badge)
        art_w = int(draw.textlength(c["article"], font=f_badge)) + 20
        draw.rounded_rectangle([(x1 - art_w - 24, y0 + 14), (x1 - 24, y0 + 40)], radius=8, fill="#F8FAFC", outline=BORDER, width=1)
        draw.text((x1 - art_w - 14, y0 + 19), c["article"], fill=DARK, font=f_badge)

        draw.text((x0 + 24, y0 + 45), c["title"], fill=DARK, font=f_card_title)

        # Problem box with clean word wrapping
        draw.rounded_rectangle([(x0 + 24, y0 + 82), (x1 - 24, y0 + 144)], radius=8, fill="#F8FAFC", outline="#E2E8F0", width=1)
        full_prob = f"{c['lead']} {c['problem']}"
        prob_lines = wrap_lines(draw, full_prob, f_card_sub, card_w - 76)
        for li, pline in enumerate(prob_lines[:2]):
            py = y0 + 91 + li * 22
            if li == 0 and pline.startswith(c["lead"]):
                lead_w = draw.textlength(c["lead"] + " ", font=f_card_sub_b)
                draw.text((x0 + 36, py), c["lead"], fill=ROSE, font=f_card_sub_b)
                draw.text((x0 + 36 + lead_w, py), pline[len(c["lead"]):].lstrip(), fill=SLATE, font=f_card_sub)
            else:
                draw.text((x0 + 36, py), pline, fill=SLATE, font=f_card_sub)

        # Equation Box (rendered in Cambria Math — zero missing glyphs!)
        eq_y0 = y0 + 158
        eq_y1 = y0 + 276
        draw.rounded_rectangle([(x0 + 24, eq_y0), (x1 - 24, eq_y1)], radius=12, fill="#F8FAFC", outline=c["accent"], width=2)
        draw.rounded_rectangle([(x0 + 38, eq_y0 - 11), (x0 + 174, eq_y0 + 11)], radius=6, fill=c["accent"])
        draw.text((x0 + 47, eq_y0 - 8), "DERIVED INVARIANT", fill="#FFFFFF", font=ImageFont.truetype(font_bold_path, 11))

        # Auto-fit equation font size so it never overflows the box
        eq_font = f_eq_big
        for sz in (31, 29, 27, 25, 23):
            cand_f = ImageFont.truetype(font_cambria_ttc, sz, index=1)
            if draw.textlength(c["equation"], font=cand_f) <= (card_w - 92):
                eq_font = cand_f
                break
        sub_font = f_eq_sub
        for sz in (20, 19, 18, 17):
            cand_sf = ImageFont.truetype(font_cambria_ttc, sz, index=1)
            if draw.textlength(c["eq_sub"], font=cand_sf) <= (card_w - 92):
                sub_font = cand_sf
                break

        draw.text((x0 + 38, eq_y0 + 24), c["equation"], fill=DARK, font=eq_font)
        draw.text((x0 + 38, eq_y0 + 74), c["eq_sub"], fill=c["accent"], font=sub_font)

        # 4 Sub-boxes with clean word wrapping
        out_y0 = y0 + 292
        for idx, (label, desc, tcol, bcol) in enumerate(c["outputs"]):
            ox = x0 + 24 + (idx % 2) * (card_w // 2 - 14)
            oy = out_y0 + (idx // 2) * 98
            ow = card_w // 2 - 34
            oh = 88
            draw.rounded_rectangle([(ox, oy), (ox + ow, oy + oh)], radius=8, fill=bcol, outline=BORDER, width=1)
            draw.text((ox + 14, oy + 9), label, fill=tcol, font=f_body_bold)
            dlines = wrap_lines(draw, desc, f_desc, ow - 28)
            for dli, dline in enumerate(dlines[:2]):
                draw.text((ox + 14, oy + 35 + dli * 20), dline, fill=SLATE, font=f_desc)

    # Bottom Master Unifying Invariant Banner
    draw.rounded_rectangle([(50, 1192), (W - 50, 1316)], radius=16, fill="#0F172A")
    draw.rounded_rectangle([(52, 1194), (W - 52, 1314)], radius=14, outline="#315F50", width=2)

    draw.text((76, 1207), "THE OXEOUS UNIFIED REGULATORY INVARIANT THEOREM", fill="#34D399", font=ImageFont.truetype(font_bold_path, 15))
    master_eq = "𝒫_export = 𝒫_declared ∖ 𝒱_Art.3(a)     subject to:     [ M_declared / Area(𝒫_export) ]  ≤  Y_max(c, region)     ∧     Φ_consensus  ≥  τ_statutory"
    draw.text((76, 1236), master_eq, fill="#FFFFFF", font=f_master)
    draw.text(
        (76, 1281),
        "Simultaneously guarantees 100% deforestation-free EU customs clearance, eliminates up to 75% agroforestry false positives, and enforces a strict biophysical ceiling against polygon laundering.",
        fill="#94A3B8",
        font=ImageFont.truetype(font_reg_path, 18),
    )

    cx = W - 275
    draw.rounded_rectangle([(cx, 1218), (cx + 200, 1290)], radius=10, fill="#1E293B", outline="#34D399", width=2)
    draw.text((cx + 22, 1231), "TRACES NT · CERTEX", fill="#34D399", font=ImageFont.truetype(font_bold_path, 14))
    draw.text((cx + 20, 1255), "TARIC Box 44 · Code C716", fill="#E2E8F0", font=ImageFont.truetype(font_reg_path, 13))

    targets = [
        "docs/breakthrough_diagrams/Figure_4_Mathematical_Foundations_and_Statutory_Invariants",
        "docs/finals/Figure_4_Mathematical_Foundations_and_Statutory_Invariants",
    ]
    for base in targets:
        im.save(base + ".png", "PNG")
        img_doc = fitz.open(base + ".png")
        pdf_doc = fitz.open("pdf", img_doc.convert_to_pdf())
        pdf_doc.save(base + ".pdf")
        print(f"Saved PNG & PDF: {base}.png / .pdf")


if __name__ == "__main__":
    generate_equations_image()

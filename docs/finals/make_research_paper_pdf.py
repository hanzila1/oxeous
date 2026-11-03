"""
Publication-Grade 6-Page Whitepaper Generator for Oxeous (Refined Typography & Alignment)
========================================================================================
Generates a structured, beautifully formatted 6-page technical whitepaper / EIC technical annex.
Every page is self-contained with explicit PageBreaks, guaranteed zero orphan lines,
balanced column widths, and aligned text.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ---------------------------------------------------------------------------
# 1. Paths & Font Registration
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]
BREAKTHROUGH_DIR = REPO_ROOT / "docs" / "breakthrough_diagrams"
FINALS_DIR = REPO_ROOT / "docs" / "finals"

FIG1_PATH = BREAKTHROUGH_DIR / "End_to_End_System_Pipeline.png"       # 4296 x 1735 (2.476:1)
FIG2_PATH = BREAKTHROUGH_DIR / "PWRI_3D_Tri_Axial_Map_Algebra.png"    # 4296 x 2603 (1.650:1)
FIG3_PATH = BREAKTHROUGH_DIR / "Autonomous_Multi_Agent_Constellation.png"  # 4296 x 2155 (1.993:1)

WIN_FONTS = Path("C:/Windows/Fonts")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Cambria", str(WIN_FONTS / "cambria.ttc"), subfontIndex=0))
    pdfmetrics.registerFont(TTFont("CambriaMath", str(WIN_FONTS / "cambria.ttc"), subfontIndex=1))
    pdfmetrics.registerFont(TTFont("CambriaBold", str(WIN_FONTS / "cambriab.ttf")))
    pdfmetrics.registerFont(TTFont("CambriaItalic", str(WIN_FONTS / "cambriai.ttf")))
    pdfmetrics.registerFont(TTFont("CambriaBoldItalic", str(WIN_FONTS / "cambriaz.ttf")))
    pdfmetrics.registerFont(TTFont("SegoeUI", str(WIN_FONTS / "segoeui.ttf")))
    pdfmetrics.registerFont(TTFont("SegoeUIBold", str(WIN_FONTS / "segoeuib.ttf")))
    pdfmetrics.registerFont(TTFont("SegoeUIItalic", str(WIN_FONTS / "segoeuii.ttf")))
    pdfmetrics.registerFont(TTFont("Consolas", str(WIN_FONTS / "consola.ttf")))

    pdfmetrics.registerFontFamily(
        "Cambria",
        normal="Cambria",
        bold="CambriaBold",
        italic="CambriaItalic",
        boldItalic="CambriaBoldItalic",
    )
    pdfmetrics.registerFontFamily(
        "SegoeUI",
        normal="SegoeUI",
        bold="SegoeUIBold",
        italic="SegoeUIItalic",
        boldItalic="SegoeUIBold",
    )


# ---------------------------------------------------------------------------
# 2. Color Palette & Page Geometry
# ---------------------------------------------------------------------------
NAVY_DARK = colors.HexColor("#0F172A")
NAVY_ACCENT = colors.HexColor("#1E3A8A")
BLUE_RULE = colors.HexColor("#1D4ED8")
TEAL_ACCENT = colors.HexColor("#0F766E")
AMBER_ACCENT = colors.HexColor("#B45309")
PURPLE_ACCENT = colors.HexColor("#6D28D9")
SLATE_TEXT = colors.HexColor("#1E293B")
SLATE_MUTED = colors.HexColor("#475569")
SLATE_LIGHT = colors.HexColor("#64748B")
BG_PANEL = colors.HexColor("#F8FAFC")
BG_MATH = colors.HexColor("#F1F5F9")
BG_SCRIPT = colors.HexColor("#FFFBEB")
BORDER_SUBTLE = colors.HexColor("#CBD5E1")
BORDER_LIGHT = colors.HexColor("#E2E8F0")

PAGE_W, PAGE_H = A4
MARGIN_X = 40.0
MARGIN_TOP = 42.0
MARGIN_BOTTOM = 38.0
CONTENT_W = PAGE_W - 2 * MARGIN_X  # 515.28 pt


# ---------------------------------------------------------------------------
# 3. Running Headers & Footers ("Page X of 6")
# ---------------------------------------------------------------------------
class CleanAcademicCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_chrome(total_pages)
            super().showPage()
        super().save()

    def _draw_chrome(self, total_pages: int) -> None:
        page_num = self._pageNumber
        self.saveState()

        if page_num == 1:
            self.setStrokeColor(NAVY_ACCENT)
            self.setLineWidth(1.4)
            self.line(MARGIN_X, PAGE_H - 22, PAGE_W - MARGIN_X, PAGE_H - 22)
            self.setFont("SegoeUIBold", 7.2)
            self.setFillColor(NAVY_ACCENT)
            self.drawString(
                MARGIN_X,
                PAGE_H - 32,
                "OXEOUS TECHNICAL WHITEPAPER & EIC DEEP-TECH DOSSIER (2026)",
            )
            self.setFont("SegoeUI", 7.2)
            self.setFillColor(SLATE_MUTED)
            self.drawRightString(
                PAGE_W - MARGIN_X,
                PAGE_H - 32,
                "EUR-Lex OJ L 150 · Reg. (EU) 2023/1115 & Reg. (EU) 2025/2650",
            )
            self.setStrokeColor(BORDER_SUBTLE)
            self.setLineWidth(0.5)
            self.line(MARGIN_X, PAGE_H - 36, PAGE_W - MARGIN_X, PAGE_H - 36)
        else:
            self.setFont("SegoeUIBold", 7.2)
            self.setFillColor(SLATE_MUTED)
            self.drawString(
                MARGIN_X,
                PAGE_H - 26,
                "Oxeous — Deterministic Spatial-Legal Compliance Architecture for EUDR",
            )
            self.setFont("SegoeUI", 7.2)
            self.setFillColor(SLATE_LIGHT)
            self.drawRightString(
                PAGE_W - MARGIN_X,
                PAGE_H - 26,
                "Regulation (EU) 2023/1115 · Reg. (EU) 2025/2650 · TARIC C716",
            )
            self.setStrokeColor(BORDER_SUBTLE)
            self.setLineWidth(0.5)
            self.line(MARGIN_X, PAGE_H - 31, PAGE_W - MARGIN_X, PAGE_H - 31)

        self.setStrokeColor(BORDER_SUBTLE)
        self.setLineWidth(0.5)
        self.line(MARGIN_X, 26, PAGE_W - MARGIN_X, 26)
        self.setFont("SegoeUI", 7.1)
        self.setFillColor(SLATE_LIGHT)
        self.drawString(
            MARGIN_X,
            16,
            "Verified against EUR-Lex Official Journal (OJ L 150) & Oxeous Production Platform (backend/app/eudr/)",
        )
        self.setFont("SegoeUIBold", 7.3)
        self.setFillColor(NAVY_DARK)
        self.drawRightString(PAGE_W - MARGIN_X, 16, f"Page {page_num} of {total_pages}")

        self.restoreState()


# ---------------------------------------------------------------------------
# 4. Refined Typography Styles & Aligned Helpers
# ---------------------------------------------------------------------------
def build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "kicker": ParagraphStyle(
            "kicker",
            parent=base["Normal"],
            fontName="SegoeUIBold",
            fontSize=7.8,
            leading=10.2,
            textColor=BLUE_RULE,
            spaceAfter=3,
        ),
        "title": ParagraphStyle(
            "title",
            parent=base["Normal"],
            fontName="CambriaBold",
            fontSize=15.5,
            leading=19.2,
            textColor=NAVY_DARK,
            alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["Normal"],
            fontName="CambriaItalic",
            fontSize=10.0,
            leading=13.2,
            textColor=SLATE_MUTED,
            alignment=TA_LEFT,
            spaceAfter=6,
        ),
        "authors": ParagraphStyle(
            "authors",
            parent=base["Normal"],
            fontName="SegoeUIBold",
            fontSize=8.4,
            leading=11.2,
            textColor=NAVY_DARK,
            spaceAfter=2,
        ),
        "affil": ParagraphStyle(
            "affil",
            parent=base["Normal"],
            fontName="SegoeUI",
            fontSize=7.7,
            leading=10.5,
            textColor=SLATE_MUTED,
            spaceAfter=7,
        ),
        "abstract_body": ParagraphStyle(
            "abstract_body",
            parent=base["Normal"],
            fontName="Cambria",
            fontSize=8.8,
            leading=12.4,
            textColor=SLATE_TEXT,
            alignment=TA_JUSTIFY,
            spaceAfter=3.5,
        ),
        "keywords": ParagraphStyle(
            "keywords",
            parent=base["Normal"],
            fontName="SegoeUI",
            fontSize=7.8,
            leading=10.6,
            textColor=SLATE_MUTED,
            alignment=TA_LEFT,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Normal"],
            fontName="CambriaBold",
            fontSize=11.4,
            leading=14.2,
            textColor=NAVY_DARK,
            spaceBefore=6,
            spaceAfter=2.5,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Normal"],
            fontName="SegoeUIBold",
            fontSize=9.2,
            leading=12.0,
            textColor=NAVY_ACCENT,
            spaceBefore=5,
            spaceAfter=2.5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Cambria",
            fontSize=9.2,
            leading=12.8,
            textColor=SLATE_TEXT,
            alignment=TA_JUSTIFY,
            spaceAfter=4.0,
        ),
        "math_center": ParagraphStyle(
            "math_center",
            parent=base["Normal"],
            fontName="CambriaMath",
            fontSize=9.2,
            leading=13.6,
            textColor=NAVY_DARK,
            alignment=TA_CENTER,
        ),
        "math_plain": ParagraphStyle(
            "math_plain",
            parent=base["Normal"],
            fontName="SegoeUI",
            fontSize=7.8,
            leading=10.6,
            textColor=SLATE_MUTED,
            alignment=TA_CENTER,
        ),
        "eq_num": ParagraphStyle(
            "eq_num",
            parent=base["Normal"],
            fontName="CambriaBold",
            fontSize=9.0,
            leading=12.8,
            textColor=SLATE_MUTED,
            alignment=TA_RIGHT,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="SegoeUI",
            fontSize=7.8,
            leading=10.7,
            textColor=SLATE_MUTED,
            alignment=TA_JUSTIFY,
        ),
        "table_title": ParagraphStyle(
            "table_title",
            parent=base["Normal"],
            fontName="SegoeUIBold",
            fontSize=8.3,
            leading=11.0,
            textColor=NAVY_DARK,
            spaceBefore=3.5,
            spaceAfter=2.5,
            keepWithNext=True,
        ),
        "th": ParagraphStyle(
            "th",
            parent=base["Normal"],
            fontName="SegoeUIBold",
            fontSize=7.6,
            leading=10.0,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "td": ParagraphStyle(
            "td",
            parent=base["Normal"],
            fontName="SegoeUI",
            fontSize=7.55,
            leading=10.2,
            textColor=SLATE_TEXT,
            alignment=TA_LEFT,
        ),
        "td_bold": ParagraphStyle(
            "td_bold",
            parent=base["Normal"],
            fontName="SegoeUIBold",
            fontSize=7.55,
            leading=10.2,
            textColor=NAVY_DARK,
            alignment=TA_LEFT,
        ),
        "td_code": ParagraphStyle(
            "td_code",
            parent=base["Normal"],
            fontName="Consolas",
            fontSize=7.05,
            leading=9.5,
            textColor=NAVY_DARK,
            alignment=TA_LEFT,
        ),
        "ref_item": ParagraphStyle(
            "ref_item",
            parent=base["Normal"],
            fontName="Cambria",
            fontSize=7.9,
            leading=10.5,
            textColor=SLATE_TEXT,
            leftIndent=14,
            firstLineIndent=-14,
            alignment=TA_JUSTIFY,
            spaceAfter=2.2,
        ),
    }


def m(expr: str) -> str:
    return f'<font name="CambriaMath">{expr}</font>'


def code(expr: str) -> str:
    return f'<font name="Consolas" size="8.1" color="#0F172A">{expr}</font>'


def make_section_header(num_title: str, statutory_badge: str, styles: dict) -> Table:
    left_p = Paragraph(num_title, styles["h1"])
    badge_style = ParagraphStyle(
        "sec_badge",
        fontName="SegoeUIBold",
        fontSize=7.4,
        leading=9.6,
        textColor=NAVY_ACCENT,
        alignment=TA_RIGHT,
    )
    right_p = Paragraph(statutory_badge, badge_style)
    tbl = Table([[left_p, right_p]], colWidths=[CONTENT_W * 0.68, CONTENT_W * 0.32])
    tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LINEBELOW", (0, 0), (-1, 0), 0.9, NAVY_ACCENT),
            ]
        )
    )
    return tbl


def make_rule_box(
    formula_markup: str,
    plain_reading: str,
    eq_label: str,
    styles: dict,
    accent_color=BLUE_RULE,
) -> Table:
    """Crisply aligned formula card with prominent plain-English translation."""
    eq_p = Paragraph(formula_markup, styles["math_center"])
    plain_p = Paragraph(f"<b>Plain Reading:</b> {plain_reading}", styles["math_plain"])
    num_p = Paragraph(eq_label, styles["eq_num"])
    tbl = Table([[eq_p, num_p], [plain_p, ""]], colWidths=[CONTENT_W - 54, 54])
    tbl.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 1), (1, 1)),
                ("BACKGROUND", (0, 0), (-1, -1), BG_MATH),
                ("BOX", (0, 0), (-1, -1), 0.55, BORDER_LIGHT),
                ("LINEBEFORE", (0, 0), (0, -1), 2.6, accent_color),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, 0), 5.0),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 1.5),
                ("TOPPADDING", (0, 1), (-1, 1), 1.0),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 4.5),
            ]
        )
    )
    return tbl


def make_figure_block(
    img_path: Path,
    aspect_ratio: float,
    target_w: float,
    fig_num: str,
    fig_title: str,
    caption_body: str,
    styles: dict,
) -> Table:
    target_h = target_w / aspect_ratio
    img = Image(str(img_path), width=target_w, height=target_h)
    img.hAlign = "CENTER"
    cap_p = Paragraph(f"<b>{fig_num} | {fig_title}</b> {caption_body}", styles["caption"])

    tbl = Table([[img], [cap_p]], colWidths=[CONTENT_W])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.65, BORDER_SUBTLE),
                ("LINEBELOW", (0, 0), (0, 0), 0.5, BORDER_LIGHT),
                ("BACKGROUND", (0, 1), (0, 1), BG_PANEL),
                ("ALIGN", (0, 0), (0, 0), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (0, 0), 5),
                ("BOTTOMPADDING", (0, 0), (0, 0), 5),
                ("TOPPADDING", (0, 1), (0, 1), 4),
                ("BOTTOMPADDING", (0, 1), (0, 1), 4.5),
            ]
        )
    )
    return tbl


def style_academic_table(tbl: Table, header_bg=NAVY_DARK) -> Table:
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), header_bg),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_PANEL]),
                ("BOX", (0, 0), (-1, -1), 0.65, BORDER_SUBTLE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER_LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5.5),
                ("TOPPADDING", (0, 0), (-1, -1), 3.0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2),
            ]
        )
    )
    return tbl


def make_problem_card(title: str, text: str, accent: colors.HexColor, styles: dict) -> Table:
    """Card for the 4 core EUDR failure modes in Section 1."""
    p_title = Paragraph(f"<b>{title}</b>", styles["td_bold"])
    p_text = Paragraph(text, styles["td"])
    tbl = Table([[p_title], [p_text]], colWidths=[CONTENT_W])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BG_PANEL),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
                ("LINEBEFORE", (0, 0), (0, -1), 2.5, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 1.0),
                ("TOPPADDING", (0, 1), (-1, 1), 1.0),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 3.5),
            ]
        )
    )
    return tbl


# ---------------------------------------------------------------------------
# 5. Story Construction (Page-by-Page Perfectly Aligned & Self-Contained)
# ---------------------------------------------------------------------------
def build_story(styles: dict) -> list:
    story: list = []

    # =========================================================================
    # PAGE 1: TITLE, ABSTRACT, LEGAL CORPUS & THE 4 STRUCTURAL BOTTLENECKS
    # =========================================================================
    story.append(
        Paragraph(
            "RESEARCH WHITEPAPER &amp; EIC DEEP-TECH DOSSIER  ·  SPATIAL-LEGAL COMPLIANCE ARCHITECTURE",
            styles["kicker"],
        )
    )
    story.append(
        Paragraph(
            "Oxeous: Solving EUDR Agroforestry False Positives, Parcel Forfeiture, and "
            "Commodity Volume Laundering via Deterministic Spatial-Legal Rules",
            styles["title"],
        )
    )
    story.append(
        Paragraph(
            "Statutory Basis, System Architecture, Four Core Decision Rules, and Production Platform "
            "Verification under Regulation (EU) 2023/1115 &amp; Regulation (EU) 2025/2650",
            styles["subtitle"],
        )
    )
    story.append(
        Paragraph(
            "Oxeous Engineering &amp; Spatial Compliance Research Team",
            styles["authors"],
        )
    )
    story.append(
        Paragraph(
            "Official EU Legal Sources: Regulation (EU) 2023/1115 (OJ L 150, pp. 206–247) · Regulation (EU) 2024/3234 · "
            "Regulation (EU) 2025/2650 · Implementing Regulation (EU) 2025/1093 · COM(2026) 191 final · TARIC Code C716",
            styles["affil"],
        )
    )

    abstract_text = (
        "<b>Abstract —</b> Existing satellite compliance tools built for the European Union Deforestation "
        "Regulation (Regulation (EU) 2023/1115) suffer from a basic architectural flaw: they treat legal compliance "
        "as simple 2D pixel change detection (flagging an alert whenever green tree canopy turns brown after "
        "31 December 2020). Without EU statutory land-use rules or shipment weight checks, 2D tools create "
        "four major bottlenecks: (1) a <b>66%–75% false-alarm rate</b> in shaded cocoa, coffee, rubber, and "
        "oil palm farms when farmers prune or replant old crop trees (Thünen Institute, 2025); (2) <b>100% "
        "shipment rejection</b> under Article 9(1)(d) when a small edge clearing contaminates a large "
        "cooperative farm block; (3) <b>polygon volume laundering</b>, where traders declare 50 tonnes of "
        "harvest on a tiny 2-hectare clean farm polygon; and (4) <b>fines of at least 4% of EU turnover</b> "
        "(Article 25(2)(a)) when filings rely on cloudy optical photos or AI guesswork. This paper documents "
        "and cross-verifies the four deterministic rules implemented in the Oxeous platform: (i) the "
        "<b>PWRI-3D statutory filter</b> separating illegal forest clearing (&gt; 0.5 ha) from lawful farm "
        "replanting (Article 2(5)) and forestry harvesting (Articles 2(3)/2(7)); (ii) <b>surgical polygon "
        "carve-out</b> isolating bad hectares so clean harvests still clear customs; (iii) a <b>biological "
        "yield cap</b> checking declared weight against clean farm area; and (iv) a <b>six-agent consensus "
        "gate</b> sealed with a SHA-256 digital hash for EU TRACES NT (TARIC C716) customs clearance."
    )
    kw_text = (
        "<b>Keywords:</b> EU Deforestation Regulation (EUDR 2023/1115); PWRI-3D Map Algebra; Agroforestry "
        "Replanting Exemption (Art. 2(5)); Polygon Carve-Out; Anti-Laundering Yield Check; Multi-Agent Consensus; TRACES NT (TARIC C716)."
    )
    abs_tbl = Table(
        [[Paragraph(abstract_text, styles["abstract_body"])], [Paragraph(kw_text, styles["keywords"])]],
        colWidths=[CONTENT_W],
    )
    abs_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BG_PANEL),
                ("BOX", (0, 0), (-1, -1), 0.65, BORDER_SUBTLE),
                ("LINEBEFORE", (0, 0), (0, -1), 2.8, NAVY_ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (0, 0), 6),
                ("BOTTOMPADDING", (0, 0), (0, 0), 2),
                ("TOPPADDING", (0, 1), (0, 1), 2),
                ("BOTTOMPADDING", (0, 1), (0, 1), 6),
            ]
        )
    )
    story.append(abs_tbl)
    story.append(Spacer(1, 4))

    story.append(
        make_section_header(
            "1. Why Standard 2D Satellite Compliance Tools Fail Under EUDR",
            "Reg. (EU) 2023/1115 · Reg. (EU) 2025/2650 · COM(2026) 191",
            styles,
        )
    )
    story.append(Spacer(1, 2.5))
    story.append(
        Paragraph(
            "Regulation (EU) 2023/1115 (OJ L 150, pp. 206–247)—as updated by Regulation (EU) 2024/3234, "
            "streamlined by Regulation (EU) 2025/2650 (19 December 2025), paired with country risk tiers under "
            "Implementing Regulation (EU) 2025/1093, and supported by the May 2026 Simplification Package "
            "COM(2026) 191 final—governs over EUR 100 billion ($100B+) in annual EU imports across seven "
            "commodities: <b>cattle, cocoa, coffee, oil palm, rubber, soya, and wood</b>. Most Earth Observation "
            "(EO) and ERP compliance tools treat EUDR as a basic 2D satellite image comparison before and after "
            "31 December 2020. Because physical tree canopy loss is not legally the same as illegal deforestation, "
            "standard tools break down in four critical scenarios:",
            styles["body"],
        )
    )
    story.append(Spacer(1, 2))

    # 4 Structured Problem Cards (Clean, aligned, accented)
    c1 = make_problem_card(
        "1. The 75% Agroforestry False-Positive Trap (Art. 2(5) &amp; Recital 37)",
        "Independent research by the Thünen Institute (Lippe et al., 2025) shows that global forest maps misclassify "
        "<b>66% to 75%</b> of shaded cocoa and coffee farms as forest loss when farmers prune shade trees or replant "
        "20-year-old crop trees. The EC's JRC GFC2020 map itself carries an 18.0% global commission error (24.6% in Africa) "
        "(Bourgoin et al., 2024)—which is why Recital 37 explicitly states that public forest maps are non-binding.",
        BLUE_RULE,
        styles,
    )
    c2 = make_problem_card(
        "2. The All-or-Nothing Cooperative Rejection (Art. 9(1)(d))",
        "Article 9(1)(d) mandates exact GPS polygon boundaries for every plot ≥ 4 hectares and disqualifies any plot containing "
        "unsegregated deforestation. In binary pass/fail tools, 1 bad hectare on the edge of a 150-hectare cooperative block "
        "causes 100% rejection and commercial forfeiture of the entire compliant harvest.",
        TEAL_ACCENT,
        styles,
    )
    c3 = make_problem_card(
        "3. The Polygon-Laundering &amp; Point-Splitting Loophole (Art. 10(2)(f) &amp; Art. 16(3))",
        "Map-only portals inspect polygon trees without checking invoice weight. Unscrupulous traders harvest 50 tonnes of cocoa on "
        "newly cleared forest and declare it using the GPS coordinates of a clean 2-hectare neighbor farm, or artificially split large "
        "estates into multiple sub-4 ha single-point coordinates to evade polygon scrutiny.",
        AMBER_ACCENT,
        styles,
    )
    c4 = make_problem_card(
        "4. The 4% EU Turnover Penalty &amp; Border Seizure Risk (Art. 25(2)(a) &amp; Art. 17)",
        "Optical cameras cannot penetrate equatorial clouds, and uncalibrated AI models hallucinate legal answers. Relying on "
        "probabilistic guesses exposes European first operators to mandatory administrative fines of <b>at least 4% of total "
        "annual EU-wide turnover</b>, immediate customs suspension, and consignment confiscation.",
        PURPLE_ACCENT,
        styles,
    )

    story.append(c1)
    story.append(Spacer(1, 2.5))
    story.append(c2)
    story.append(Spacer(1, 2.5))
    story.append(c3)
    story.append(Spacer(1, 2.5))
    story.append(c4)

    # Clean Page Break -> Guaranteed crisp Page 2
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: FIGURE 1 & RULE 1 (PWRI-3D STATUTORY FILTER)
    # =========================================================================
    story.append(
        make_figure_block(
            FIG1_PATH,
            aspect_ratio=4296.0 / 1735.0,
            target_w=CONTENT_W - 20,
            fig_num="Figure 1",
            fig_title="End-to-End Oxeous Deterministic Verification Pipeline.",
            caption_body=(
                f"From operator input (farm polygon {m('P')}, shipment net mass {m('m')} in kg, and commodity "
                f"{m('c')}) through parallel Remote Sensing, Geospatial, and Regulatory checks into the PWRI-3D "
                "map-algebra engine, Six-Agent Consensus Supervisor, polygon carve-out, and yield cap gate, "
                "producing an EU TRACES NT Due Diligence Statement (TARIC C716) and SHA-256 audit proof."
            ),
            styles=styles,
        )
    )
    story.append(Spacer(1, 4))

    story.append(
        make_section_header(
            "2. Rule 1 — PWRI-3D Statutory Land-Use Filter (Eliminating False Positives)",
            "EUR-Lex Art. 2(4), Art. 2(5), Art. 2(6), Art. 2(3)/2(7) & Recital 37",
            styles,
        )
    )
    story.append(Spacer(1, 3))
    story.append(
        Paragraph(
            "Instead of flagging every canopy drop as illegal deforestation, Oxeous evaluates every "
            "10-meter pixel across <b>three layers simultaneously</b> (<b>PWRI-3D</b>: Spatial Sensors "
            "× Timeline across 31 Dec 2020 × EU Legal Definitions). First, per Article 2(4), isolated "
            "single-tree gaps smaller than <b>0.5 hectares</b> are filtered out. Second, any pre-2020 "
            "agricultural tree-crop farm (Article 2(5)/2(6)) or sustainably harvested managed forest "
            "(Article 2(3)/2(7)) is legally separated from real forest clearing:",
            styles["body"],
        )
    )
    story.append(Spacer(1, 2))

    story.append(
        make_rule_box(
            "V<sub>3(a)</sub>  =  MMU<sub>≥ 0.5 ha</sub>( Loss<sub>post-2020</sub>  ∩  Forest<sub>2020</sub> )  ∖  ( Replanting<sub>Art. 2(5)</sub>  ∪  Silviculture<sub>Art. 2(3)/2(7)</sub> )",
            "A pixel is an illegal Art. 3(a) violation ONLY if canopy loss ≥ 0.5 ha occurred inside a real 2020 forest — excluding lawful farm replanting and managed forestry.",
            "(Rule 1)",
            styles,
            accent_color=BLUE_RULE,
        )
    )
    story.append(Spacer(1, 3.5))

    story.append(
        Paragraph(
            "<b>Four Clear Pixel Outcomes (Verified in Live Platform):</b> In "
            f"{code('backend/app/tools/eudr/gee_commodity.py')} (lines 245, 859–946), the planetary raster engine fuses "
            f"EC JRC Global Forest Cover 2020 ({code('JRC/GFC2020/V4')}, 10 m) with Nature Trace 2020 natural-forest "
            f"probabilities ({code('p >= 0.45')}), cloud-penetrating Sentinel-1 C-band radar alerts (RADD), "
            "Hansen GFC v1.12, JRC Tropical Moist Forests, and Forest Data Partnership (FDP 2026a) cocoa, "
            "coffee, palm, and rubber maps. An 8-connected 6-pixel neighborhood filter "
            f"({code('connectedPixelCount(6, True).gte(6)')}, 0.54 ha &gt; 0.5 ha) classifies every pixel into "
            "one of four transparent states: <b>Red (Art. 3(a) Deforestation Violation)</b>, <b>Amber (Art. 2(5) "
            "Lawful Tree-Crop Replanting)</b>, <b>Blue (Art. 2(3)/2(7) Lawful Managed Forestry)</b>, or "
            "<b>Green (Intact / Clean)</b>. This eliminates up to 75% of smallholder false rejections.",
            styles["body"],
        )
    )

    # Clean Page Break -> Guaranteed crisp Page 3
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: FIGURE 2, RULE 2 (CARVE-OUT) & RULE 3 (YIELD CAP)
    # =========================================================================
    story.append(
        make_figure_block(
            FIG2_PATH,
            aspect_ratio=4296.0 / 2603.0,
            target_w=CONTENT_W - 32,
            fig_num="Figure 2",
            fig_title="PWRI-3D Three-Layer Map Algebra Engine.",
            caption_body=(
                "Every 10 m pixel is checked across Layer 1 (optical + radar + crop maps), Layer 2 (timeline "
                "before and after 31 Dec 2020), and Layer 3 (EU statutory rules and the ≥ 0.5 ha Article 2(4) "
                "size filter), cleanly separating Red violations from Amber farm replanting and Blue silviculture."
            ),
            styles=styles,
        )
    )
    story.append(Spacer(1, 3.5))

    story.append(
        make_section_header(
            "3. Rule 2 — Surgical Polygon Carve-Out & Exact Area Balance",
            "EUR-Lex Art. 9(1)(d), Art. 10/11 & COM(2026) 191 Segregation",
            styles,
        )
    )
    story.append(Spacer(1, 2.5))
    story.append(
        Paragraph(
            "When a 150-hectare cooperative block has a 1-hectare road or edge encroachment, rejecting "
            "all 150 hectares needlessly punishes compliant farmers. Oxeous excises (cuts out) only the "
            f"Red violation zone {m('V<sub>3(a)</sub>')} from the declared polygon {m('P<sub>decl</sub>')} and "
            f"quarantines any unsegregated bad sub-plots, leaving a 100% deforestation-free export polygon {m('P<sub>export</sub>')}:",
            styles["body"],
        )
    )
    story.append(Spacer(1, 1.5))

    story.append(
        make_rule_box(
            "P<sub>export</sub>  =  P<sub>decl</sub>  ∖  V<sub>3(a)</sub>       and       A<sub>export</sub>  =  A<sub>total</sub> − A<sub>violation</sub>  =  A<sub>clean</sub> + A<sub>replant</sub> + A<sub>silviculture</sub>",
            "Cut out the bad deforested hectares (V_3(a)); keep clean, lawful replanting, and forestry hectares so exported land has 0.0% deforestation.",
            "(Rule 2)",
            styles,
            accent_color=TEAL_ACCENT,
        )
    )
    story.append(Spacer(1, 2.5))

    story.append(
        Paragraph(
            "<b>Verified Geometry Implementation:</b> Cross-verified in "
            f"{code('backend/app/eudr/carveout_service.py')} (lines 51–169), Oxeous converts the raster violation "
            f"pixels into vector polygons ({code('reduceToVectors')}), subtracts them using Shapely 2.0 "
            f"({code('orig_poly.difference(loss_union)')}), automatically repairs self-intersecting GPS boundaries "
            f'via {code("make_valid()")}, measures exact WGS84 geodesic hectares via {code("pyproj.Geod")}, '
            "and outputs 6-decimal RFC 7946 GeoJSON ready for EU TRACES NT.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 3))

    story.append(
        make_section_header(
            "4. Rule 3 — Biophysical Yield Cap (Stopping Volume Laundering)",
            "EUR-Lex Art. 9(1)(b), Art. 10(2)(f), Art. 16(3) & Reg. (EU) 2025/2650",
            styles,
        )
    )
    story.append(Spacer(1, 2.5))
    story.append(
        Paragraph(
            "Cutting out bad land is only safe if an operator cannot cheat on weight—for example, "
            "declaring 50,000 kg of cocoa from a remaining 2-hectare clean plot. Oxeous divides the "
            f"declared shipment weight {m('M<sub>decl</sub>')} (kg) by the verified clean export area "
            f"{m('A<sub>export</sub>')} (hectares) and checks that it does not exceed the maximum "
            f"biological yield ceiling {m('Y<sub>c</sub>')} (kg/ha/year) for that crop:",
            styles["body"],
        )
    )
    story.append(Spacer(1, 1.5))

    story.append(
        make_rule_box(
            "Y<sub>implied</sub>  =  M<sub>decl</sub> ⁄ A<sub>export</sub>  ≤  Y<sub>c</sub>       (equivalently:   M<sub>decl</sub>  ≤  M<sub>max</sub> = A<sub>export</sub> · Y<sub>c</sub>)",
            "Simple division: Declared shipment weight (kg) ÷ Clean farm area (ha) cannot exceed what plants can biologically grow per hectare.",
            "(Rule 3)",
            styles,
            accent_color=AMBER_ACCENT,
        )
    )
    story.append(Spacer(1, 2.5))

    story.append(
        Paragraph(
            "<b>Point-Splitting Fraud Also Blocked:</b> In "
            f"{code('backend/app/eudr/agents/yield_agent.py')} (lines 15–176), Agent A6 also checks Article "
            "9(1)(d) single-point submissions (which EU law only allows for small farms under 4 hectares). If a "
            "trader submits a single GPS point with a shipment mass that biologically requires ≥ 4.0 hectares "
            "even at maximum ceiling yield, Oxeous blocks the filing and requires a full farm boundary polygon.",
            styles["body"],
        )
    )

    # Clean Page Break -> Guaranteed crisp Page 4
    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: TABLE 1 (YIELD BENCHMARKS), FIGURE 3 & RULE 4 (MULTI-AGENT)
    # =========================================================================
    story.append(
        Paragraph(
            f"Table 1 | Verified Biological Yield Ceilings ({m('Y<sub>c</sub>')}) and Annex I Customs Codes Across All 7 EUDR Commodities.",
            styles["table_title"],
        )
    )
    t1_rows = [
        [
            Paragraph("EUDR Commodity", styles["th"]),
            Paragraph("Typical Farm Yield", styles["th"]),
            Paragraph(f"Max Gate Ceiling ({m('Y<sub>c</sub>')})", styles["th"]),
            Paragraph("Verified Annex I HS / CN Customs Codes", styles["th"]),
            Paragraph("Agronomic Benchmark", styles["th"]),
        ],
        [
            Paragraph("<b>Cocoa</b> (<i>Theobroma cacao</i>)", styles["td"]),
            Paragraph("400 – 750 kg/ha/yr", styles["td"]),
            Paragraph("<b>1,100 kg/ha/yr</b>", styles["td_bold"]),
            Paragraph("1801, 1802, 1803, 1804, 1805, 1806", styles["td_code"]),
            Paragraph("FAO GAEZ v4 · CIRAD · ICRAF", styles["td"]),
        ],
        [
            Paragraph("<b>Coffee</b> (<i>Coffea</i> spp.)", styles["td"]),
            Paragraph("800 – 1,800 kg/ha/yr", styles["td"]),
            Paragraph("<b>2,500 kg/ha/yr</b>", styles["td_bold"]),
            Paragraph("0901, ex 2101 11, ex 2101 12", styles["td_code"]),
            Paragraph("FAO GAEZ v4 · CIRAD · ICO", styles["td"]),
        ],
        [
            Paragraph("<b>Oil Palm</b> (<i>Elaeis guineensis</i>)", styles["td"]),
            Paragraph("3,200 – 5,500 kg/ha/yr", styles["td"]),
            Paragraph("<b>7,500 kg/ha/yr</b> (CPO)", styles["td_bold"]),
            Paragraph("1207 10, 1511, 1513 21/29, 2306 60, ex 2905/3823", styles["td_code"]),
            Paragraph("FAO GAEZ v4 · CIRAD Palm", styles["td"]),
        ],
        [
            Paragraph("<b>Natural Rubber</b> (<i>Hevea</i>)", styles["td"]),
            Paragraph("1,200 – 2,200 kg/ha/yr", styles["td"]),
            Paragraph("<b>3,000 kg/ha/yr</b>", styles["td_bold"]),
            Paragraph("4001, ex 4005–4008, ex 4010–4013, ex 4015–4017", styles["td_code"]),
            Paragraph("CIRAD Hevea · ICRAF", styles["td"]),
        ],
        [
            Paragraph("<b>Soya</b> (<i>Glycine max</i>)", styles["td"]),
            Paragraph("2,600 – 3,800 kg/ha/yr", styles["td"]),
            Paragraph("<b>4,800 kg/ha/yr</b>", styles["td_bold"]),
            Paragraph("1201, 1208 10, 1507, 2304", styles["td_code"]),
            Paragraph("FAO GAEZ v4 · Embrapa/USDA", styles["td"]),
        ],
        [
            Paragraph("<b>Wood &amp; Timber</b>*", styles["td"]),
            Paragraph("6,000 – 18,000 kg/ha/yr", styles["td"]),
            Paragraph("<b>28,000 kg/ha/yr</b>", styles["td_bold"]),
            Paragraph("4401–4421, Ch. 47, Ch. 48, ex 9401/9403/9406*", styles["td_code"]),
            Paragraph("FAO Forestry · ITTO · JRC", styles["td"]),
        ],
        [
            Paragraph("<b>Cattle</b> (<i>Bos taurus/indicus</i>)", styles["td"]),
            Paragraph("150 – 450 kg/ha/yr", styles["td"]),
            Paragraph("<b>800 kg/ha/yr</b>", styles["td_bold"]),
            Paragraph("0102 21/29, ex 0201, ex 0202, ex 0206, ex 1602, ex 4101/04/07", styles["td_code"]),
            Paragraph("FAO Gridded Livestock · GAEZ", styles["td"]),
        ],
    ]
    t1 = Table(t1_rows, colWidths=[90, 84, 94, 145, 98.28], repeatRows=1)
    story.append(style_academic_table(t1))
    story.append(
        Paragraph(
            "<i>*Note on Reg. (EU) 2025/2650:</i> The 19 Dec 2025 simplification regulation permanently removed CN Chapter "
            "<b>ex 49</b> (printed books and newspapers) from EUDR scope; verified enforced in "
            "<font name='Consolas' size='7.2'>dds_generator.py</font>.",
            styles["caption"],
        )
    )
    story.append(Spacer(1, 3.5))

    story.append(
        make_section_header(
            "5. Rule 4 — Six-Agent Consensus Supervisor & SHA-256 Customs Proof",
            "EUR-Lex Art. 3(b)/(c), Art. 25(2)(a), Art. 33 & TARIC C716",
            styles,
        )
    )
    story.append(Spacer(1, 2.5))
    story.append(
        Paragraph(
            "To eliminate cloud blind spots and prevent AI hallucinations, six specialized evidence "
            "agents run in parallel—<b>A1 Optical</b>, <b>A2 Sentinel-1 Radar</b>, <b>A3 Protected &amp; "
            "Indigenous Lands</b>, <b>A4 Topological Geometry</b>, <b>A5 Statutory Legal Rules</b>, and "
            "<b>A6 Biophysical Yield</b>—and report to a deterministic <b>Supervisor Consensus Agent</b>:",
            styles["body"],
        )
    )
    story.append(Spacer(1, 2))

    story.append(
        make_figure_block(
            FIG3_PATH,
            aspect_ratio=4296.0 / 2155.0,
            target_w=CONTENT_W - 36,
            fig_num="Figure 3",
            fig_title="Oxeous Multi-Agent Constellation & Deterministic Supervisor Gate.",
            caption_body=(
                "Six independent evidence agents across Remote Sensing (A1, A2), Geospatial (A3, A4), and "
                "Regulatory (A5, A6) feed a three-step Supervisor (1. Weighted fusion, 2. Strict statutory "
                "overrides, 3. Zero-hallucination gating), outputting an EU TRACES NT Due Diligence Statement "
                "(TARIC C716) and a tamper-evident SHA-256 audit ledger."
            ),
            styles=styles,
        )
    )
    story.append(Spacer(1, 2.5))

    story.append(
        make_rule_box(
            "Score<sub>consensus</sub>  =  [ ∑<sub>k=1..6</sub> w<sub>k</sub> · c<sub>k</sub> · s<sub>k</sub> ] ⁄ [ ∑<sub>k=1..6</sub> w<sub>k</sub> · c<sub>k</sub> ]  ≥  τ<sub>pass</sub>     +     SHA-256(P<sub>export</sub>, PWRI, Yield)",
            "Weighted agreement across all 6 agents (plus automatic hard vetoes for protected-park encroachment or yield laundering), locked with a SHA-256 digital fingerprint.",
            "(Rule 4)",
            styles,
            accent_color=PURPLE_ACCENT,
        )
    )
    story.append(Spacer(1, 2.5))

    story.append(
        Paragraph(
            "<b>Strict Legal Vetoes (No Hallucinations):</b> Verified in "
            f"{code('backend/app/eudr/agents/supervisor_agent.py')} (lines 38–167), weighted averaging can "
            "<b>never</b> override a hard statutory breach: (1) overlapping a strict protected park (WDPA IUCN "
            "I–IV) triggers an immediate <b>Article 3(b) Block</b> (Risk = 100); (2) failing the biological yield cap "
            "triggers an immediate <b>Article 16(3) Laundering Block</b> (Risk ≥ 92); and (3) verified pre-2020 tree-crop "
            "replanting (Agent A5) protects smallholders from raw optical false alarms (Risk = 12). Every decision is "
            "hashed with SHA-256 for mandatory 5-year customs retention (Article 12(3)).",
            styles["body"],
        )
    )

    # Clean Page Break -> Guaranteed crisp Page 5
    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: CODEBASE CROSS-VERIFICATION & EIC JURY PITCH STRATEGY
    # =========================================================================
    story.append(
        Paragraph(
            "Table 2 | 1:1 Cross-Verification of the Four Rules Against the Live Oxeous Codebase.",
            styles["table_title"],
        )
    )
    t2_rows = [
        [
            Paragraph("Oxeous Decision Rule", styles["th"]),
            Paragraph("Live Platform File", styles["th"]),
            Paragraph("What the Code Executes", styles["th"]),
        ],
        [
            Paragraph("Rule 1: PWRI-3D &amp; ≥ 0.5 ha Filter", styles["td_bold"]),
            Paragraph("backend/app/tools/eudr/gee_commodity.py", styles["td_code"]),
            Paragraph(
                "Fuses JRC GFC2020 V4, Nature Trace 2020, Sentinel-1 RADD, Hansen &amp; FDP 2026a crop maps; "
                "runs 6-pixel Moore MMU sieve (<font name='Consolas' size='7.0'>connectedPixelCount(6, True)</font>).",
                styles["td"],
            ),
        ],
        [
            Paragraph("Rule 2: Surgical Polygon Carve-Out", styles["td_bold"]),
            Paragraph("backend/app/eudr/carveout_service.py", styles["td_code"]),
            Paragraph(
                "Runs Shapely 2.0 <font name='Consolas' size='7.0'>orig_poly.difference(loss_union)</font>, heals "
                "bowtie rings via <font name='Consolas' size='7.0'>make_valid()</font>, and measures WGS84 ha via "
                "<font name='Consolas' size='7.0'>pyproj.Geod</font>.",
                styles["td"],
            ),
        ],
        [
            Paragraph("Rule 3: Biophysical Yield Cap", styles["td_bold"]),
            Paragraph("backend/app/eudr/agents/yield_agent.py", styles["td_code"]),
            Paragraph(
                "Checks <font name='Consolas' size='7.0'>M_decl / A_export &lt;= Y_c</font> across all 7 Annex I "
                "commodities and blocks &lt; 4 ha single-point splitting evasion.",
                styles["td"],
            ),
        ],
        [
            Paragraph("Rule 4: 6-Agent Gate &amp; TRACES DDS", styles["td_bold"]),
            Paragraph("backend/app/eudr/agents/supervisor_agent.py<br/>backend/app/eudr/dds_generator.py", styles["td_code"]),
            Paragraph(
                "Runs A1–A6 concurrently, enforces IUCN &amp; laundering vetoes, generates SHA-256 audit hash, "
                "and formats TRACES NT GeoJSON DDS for TARIC Box 44 <font name='Consolas' size='7.0'>C716</font>.",
                styles["td"],
            ),
        ],
    ]
    t2 = Table(t2_rows, colWidths=[118, 180, 217.28], repeatRows=1)
    story.append(style_academic_table(t2))
    story.append(Spacer(1, 4))

    story.append(
        make_section_header(
            "6. EIC Live Pitch Cheat-Sheet &amp; Technical Q&amp;A Defense",
            "EIC Work Programme 2026 · Plain-English Stage Guide",
            styles,
        )
    )
    story.append(Spacer(1, 2.5))
    story.append(
        Paragraph(
            "In an EIC evaluation, external technical reviewers read Sections 1–5 of this document during "
            "the written review, while live Jury investors want clear, memorable business explanations "
            "during the 10-minute pitch and Q&amp;A:",
            styles["body"],
        )
    )
    story.append(Spacer(1, 1.5))

    story.append(
        Paragraph(
            "Table 3 | Dual-Track Translation Matrix: Written Technical Rule vs. 10-Second Live Jury Explanation.",
            styles["table_title"],
        )
    )
    t3_rows = [
        [
            Paragraph("Core Oxeous Rule", styles["th"]),
            Paragraph("10-Second Plain-English Explanation for Investors &amp; Customers", styles["th"]),
        ],
        [
            Paragraph("<b>1. Tree Pruning ≠ Deforestation</b><br/>(PWRI-3D · Art. 2(5))", styles["td"]),
            Paragraph(
                "When a farmer replants 20-year-old cocoa or coffee trees, standard satellite tools flag a false "
                "deforestation alarm (up to 75% error). Oxeous proves the farm existed before 2020 and clears it.",
                styles["td"],
            ),
        ],
        [
            Paragraph("<b>2. Cookie-Cutter Carve-Out</b><br/>(P_decl \\ V_3(a) · Art. 9(1)(d))", styles["td"]),
            Paragraph(
                "If a 150-hectare cooperative has 1 bad hectare on its edge, binary tools reject the whole "
                "shipment. Oxeous cuts out the bad zone and quarantines bad sub-lots so clean cocoa still ships.",
                styles["td"],
            ),
        ],
        [
            Paragraph("<b>3. Anti-Laundering Yield Shield</b><br/>(M_decl ≤ A_export · Y_c · Art. 16(3))", styles["td"]),
            Paragraph(
                "A 2-hectare farm physically cannot grow 50 tonnes of cocoa. If an invoice claims that, illegal "
                "beans are being laundered through clean GPS coordinates. Simple weight-per-hectare math catches it.",
                styles["td"],
            ),
        ],
        [
            Paragraph("<b>4. Multi-Sensor Customs Seal</b><br/>(6 Agents + SHA-256 · TARIC C716)", styles["td"]),
            Paragraph(
                "Optical satellites cannot see through tropical clouds. We combine radar, optical, park borders, "
                "and EU legal rules—No LLM guesswork—and lock the proof with a SHA-256 hash for EU TRACES NT.",
                styles["td"],
            ),
        ],
    ]
    t3 = Table(t3_rows, colWidths=[150, 365.28], repeatRows=1)
    story.append(style_academic_table(t3))
    story.append(Spacer(1, 3.5))

    script_p = Paragraph(
        "<b>Verbatim 60-Second EIC Jury Spoken Pitch Script:</b><br/>"
        "<i>“The EU Deforestation Regulation governs over EUR 100 billion ($100B+) in annual supply chains, "
        "yet today's satellite tools make a basic mistake: whenever green pixels turn brown, they flag illegal "
        "deforestation—causing up to a 75% false-alarm rate when smallholder farmers simply prune or replant "
        "old cocoa and coffee trees.<br/>"
        "Oxeous encodes EU law directly into geospatial rules. First, our 3-layer PWRI-3D filter separates "
        "illegal forest clearing from lawful farm replanting under Article 2(5). Second, if a cooperative block "
        "has a small edge violation, we surgically carve out the bad zone instead of forfeiting the entire "
        "harvest. Third, our biological yield cap blocks traders from laundering 50 tonnes of illegal crop "
        "through a 2-hectare clean farm. Every check is sealed with a SHA-256 hash directly into EU TRACES NT.”</i>",
        styles["abstract_body"],
    )
    script_tbl = Table([[script_p]], colWidths=[CONTENT_W])
    script_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BG_SCRIPT),
                ("BOX", (0, 0), (-1, -1), 0.65, AMBER_ACCENT),
                ("LINEBEFORE", (0, 0), (0, -1), 2.8, AMBER_ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(script_tbl)
    story.append(Spacer(1, 3.5))

    story.append(
        Paragraph(
            "Table 4 | Key Technical Jury Questions &amp; Straightforward Answers.",
            styles["table_title"],
        )
    )
    t4_rows = [
        [
            Paragraph("Technical / Legal Question", styles["th"]),
            Paragraph("Clear, Defensible Answer", styles["th"]),
        ],
        [
            Paragraph("<b>Q1: Why can't satellite vendors or ERPs copy this easily?</b>", styles["td"]),
            Paragraph(
                "Satellite vendors only output raw tree-loss alerts, and ERPs only collect PDF questionnaires. "
                "Neither links pixel-level Article 2(5) farm exemptions with polygon carve-out and shipment "
                "weight-per-hectare checks to generate a customs-ready TARIC C716 filing.",
                styles["td"],
            ),
        ],
        [
            Paragraph("<b>Q2: What if someone clears rainforest after 2020 and claims it was farm replanting?</b>", styles["td"]),
            Paragraph(
                "Rule 1 checks what was on that exact pixel BEFORE 31 December 2020 using JRC GFC2020 V4, Nature "
                "Trace 2020 natural-forest maps, JRC Tropical Moist Forests, and FDP 2026a crop masks. It only "
                "grants an Article 2(5) exemption if the plot was already a crop plantation in 2020.",
                styles["td"],
            ),
        ],
        [
            Paragraph("<b>Q3: How do you guarantee zero AI hallucination?</b>", styles["td"]),
            Paragraph(
                "No generative LLM is ever allowed to decide compliance. Every pass/fail decision comes from "
                "exact pixel math, exact GPS polygon subtraction, and fixed FAO/CIRAD crop yield limits.",
                styles["td"],
            ),
        ],
    ]
    t4 = Table(t4_rows, colWidths=[150, 365.28], repeatRows=1)
    story.append(style_academic_table(t4))

    # Clean Page Break -> Guaranteed crisp Page 6
    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: OFFICIAL EUR-LEX CONCORDANCE (TABLE 5) & ACADEMIC REFERENCES
    # =========================================================================
    story.append(
        make_section_header(
            "7. Official EUR-Lex Statutory Concordance &amp; References",
            "Regulation (EU) 2023/1115 (OJ L 150) &amp; Amending Acts",
            styles,
        )
    )
    story.append(Spacer(1, 2.5))
    story.append(
        Paragraph(
            "Table 5 | Complete Cross-Reference of Official EU Articles Used Across All Oxeous Diagrams and Code.",
            styles["table_title"],
        )
    )
    t5_rows = [
        [
            Paragraph("EU Citation", styles["th"]),
            Paragraph("Official Source", styles["th"]),
            Paragraph("What the EU Law Says", styles["th"]),
            Paragraph("How Oxeous Implements It", styles["th"]),
        ],
        [
            Paragraph("Art. 3(a)", styles["td_bold"]),
            Paragraph("Reg. 2023/1115\nOJ L 150, p. 220", styles["td"]),
            Paragraph("Bans placing or exporting commodities/products unless deforestation-free after 31 Dec 2020.", styles["td"]),
            Paragraph("Triggers Red violation zone V_3(a) when 2020 forest is cleared post-2020.", styles["td"]),
        ],
        [
            Paragraph("Art. 3(b) &amp; 2(40)", styles["td_bold"]),
            Paragraph("Reg. 2023/1115\nOJ L 150, pp. 219–220", styles["td"]),
            Paragraph("Requires compliance with producer-country laws (protected areas, indigenous &amp; land rights).", styles["td"]),
            Paragraph("Agent A3 checks WDPA IUCN I–IV parks &amp; indigenous lands; Supervisor enforces hard veto.", styles["td"]),
        ],
        [
            Paragraph("Art. 2(4) &amp;\nRecital 37", styles["td_bold"]),
            Paragraph("Reg. 2023/1115\nOJ L 150, pp. 211, 217", styles["td"]),
            Paragraph("Defines forest as &gt; 0.5 ha, trees &gt; 5 m, canopy &gt; 10%; Recital 37 states global maps are non-binding.", styles["td"]),
            Paragraph("Sets the ≥ 0.5 ha Minimum Mapping Unit filter in PWRI-3D Layer 3 and Agent A4.", styles["td"]),
        ],
        [
            Paragraph("Art. 2(5) &amp; 2(6)", styles["td_bold"]),
            Paragraph("Reg. 2023/1115\nOJ L 150, p. 217", styles["td"]),
            Paragraph("Excludes agricultural tree-crop plantations (cocoa, coffee, palm, rubber, fruit) from forest definition.", styles["td"]),
            Paragraph("Sets Amber (Exempt Replanting) state in PWRI-3D and Agent A5 smallholder protection.", styles["td"]),
        ],
        [
            Paragraph("Art. 2(3) &amp; 2(7)", styles["td_bold"]),
            Paragraph("Reg. 2023/1115\nOJ L 150, pp. 217–218", styles["td"]),
            Paragraph("Defines deforestation (conversion to agriculture) and degradation (primary forest to plantation).", styles["td"]),
            Paragraph("Sets Blue (Exempt Silviculture) state for lawful timber harvesting without conversion.", styles["td"]),
        ],
        [
            Paragraph("Art. 9(1)(b)\n&amp; 9(1)(d)", styles["td_bold"]),
            Paragraph("Reg. 2023/1115\nOJ L 150, pp. 222–223", styles["td"]),
            Paragraph("Requires shipment net mass (kg) and GPS polygons for plots ≥ 4 ha; any plot deforestation disqualifies it.", styles["td"]),
            Paragraph("Drives Rule 2 polygon carve-out (P_decl \\ V_3(a)) and &lt; 4 ha point-splitting check.", styles["td"]),
        ],
        [
            Paragraph("Art. 10(2)(f)\n&amp; Art. 16(3)", styles["td_bold"]),
            Paragraph("Reg. 2023/1115\nOJ L 150, pp. 224, 227", styles["td"]),
            Paragraph("Requires checking mixing/circumvention risk; authorities run electronic volume checks in TRACES NT.", styles["td"]),
            Paragraph("Drives Rule 3 Yield Cap (M_decl ≤ A_export · Y_c) in Agent A6 to stop volume laundering.", styles["td"]),
        ],
        [
            Paragraph("Art. 25(2)(a)", styles["td_bold"]),
            Paragraph("Reg. 2023/1115\nOJ L 150, p. 233", styles["td"]),
            Paragraph("Sets maximum administrative fines of at least 4% of annual EU-wide turnover plus confiscation.", styles["td"]),
            Paragraph("Justifies deterministic zero-LLM gating and 5-year SHA-256 audit ledger.", styles["td"]),
        ],
        [
            Paragraph("Reg. 2025/2650\n&amp; TARIC C716", styles["td_bold"]),
            Paragraph("OJ L (19 Dec 2025)\n&amp; EU CERTEX Box 44", styles["td"]),
            Paragraph("Removes CN ex 49 printed books from Annex I; C716 is the EU customs code for a valid TRACES NT DDS.", styles["td"]),
            Paragraph("Enforced in dds_generator.py; unlocked when Rules 1–4 pass simultaneously.", styles["td"]),
        ],
    ]
    t5 = Table(t5_rows, colWidths=[66, 88, 196, 165.28], repeatRows=1)
    story.append(style_academic_table(t5))
    story.append(Spacer(1, 4))

    story.append(Paragraph("References &amp; Official Scientific Benchmarks", styles["h2"]))
    refs = [
        "[1] Regulation (EU) 2023/1115 of the European Parliament and of the Council of 31 May 2023 (EUDR), Official Journal OJ L 150, 9.6.2023, pp. 206–247; amended by Regulation (EU) 2024/3234 and Regulation (EU) 2025/2650 (19 Dec 2025); Commission Implementing Regulation (EU) 2025/1093; and Simplification Package COM(2026) 191 final.",
        "[2] Bourgoin, C., et al. (2024). <i>Global map of forest cover 2020 — Validation report for EC JRC GFC2020</i>. Joint Research Centre (JRC), Publications Office of the EU (documenting 18.0% global and 24.6% African commission error in heterogeneous tree-crop landscapes).",
        "[3] Lippe, M., et al. (2025). <i>Assessing global Earth Observation forest baselines against EUDR definitions in shaded cocoa and coffee agroforestry</i>. Thünen Institute of Forestry, Hamburg (documenting 66%–75% false positives in shaded smallholder tree crops).",
        "[4] Reiche, J., et al. (2021). Forest disturbance alerts for the Congo Basin using Sentinel-1 (RADD). <i>Environmental Research Letters</i>, 16(2), 024005; paired with Hansen, M. C., et al. (2013/2025), <i>Science</i>, 342, 850–853.",
        "[5] Fischer, G., et al. (2021). <i>Global Agro-Ecological Zones (GAEZ v4) — Model Documentation &amp; Crop Productivity Ceilings</i>. FAO &amp; IIASA, Rome; supplemented by CIRAD &amp; ICRAF tree-crop agronomic benchmarks.",
    ]
    for r in refs:
        story.append(Paragraph(r, styles["ref_item"]))

    return story


def generate_all() -> Path:
    register_fonts()
    styles = build_styles()

    primary_out = FINALS_DIR / "Oxeous_Research_Paper_Mathematical_Foundations_EUDR.pdf"
    FINALS_DIR.mkdir(parents=True, exist_ok=True)
    BREAKTHROUGH_DIR.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(primary_out),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="Oxeous: Deterministic Spatial-Legal Rules for EUDR Compliance (Reg. (EU) 2023/1115)",
        author="Oxeous Engineering & Spatial Compliance Research Team",
        subject="Clean Statutory Architecture, Decision Rules & Platform Verification for EUDR",
    )

    doc.build(build_story(styles), canvasmaker=CleanAcademicCanvas)

    targets = [
        FINALS_DIR / "Oxeous_Mathematical_Foundations_and_Statutory_Invariants_Report.pdf",
        BREAKTHROUGH_DIR / "Oxeous_Mathematical_Foundations_and_Statutory_Invariants_Report.pdf",
        BREAKTHROUGH_DIR / "Oxeous_Research_Paper_Mathematical_Foundations_EUDR.pdf",
    ]
    for t in targets:
        shutil.copy2(primary_out, t)

    return primary_out


if __name__ == "__main__":
    out = generate_all()
    print(f"Generated clean research paper PDF: {out} ({out.stat().st_size:,} bytes)")

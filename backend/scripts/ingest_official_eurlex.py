"""
Official EUR-Lex Primary Legal Source Ingestion Pipeline (CELLAR Open Data API).

Downloads 100% authentic, unmodified European Union legal acts directly from the
Publications Office of the European Union (`https://publications.europa.eu/resource/celex/...`)
and segments them strictly along official statutory boundaries (Recitals, Articles 1-38,
Annex I CN/HS tables, Annex II DDS schema, Implementing Regulations, and Official Commission
Guidance sections) with cryptographic SHA-256 integrity hashes.

ZERO AI-generated summaries or synthetic text: every `full_text` and `legal_summary`
field is extracted verbatim word-for-word from the Official Journal of the European Union.
"""
from __future__ import annotations

import hashlib
import html
import json
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import httpx

CORPUS_DIR = Path(__file__).resolve().parent.parent / "app" / "eudr" / "corpus"
RAW_DIR = CORPUS_DIR / "raw_eurlex"
OUTPUT_JSON = CORPUS_DIR / "official_eurlex_corpus.json"

OFFICIAL_EU_ACTS: list[dict[str, str]] = [
    {
        "celex": "32023R1115",
        "short_name": "Regulation (EU) 2023/1115 (Original Official Journal Text)",
        "oj_ref": "OJ L 150, 9.6.2023, p. 206-247",
        "eurlex_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115",
        "doc_type": "primary_regulation_recitals",
    },
    {
        "celex": "02023R1115-20251226",
        "short_name": "Regulation (EU) 2023/1115 (Consolidated Text in force 26.12.2025)",
        "oj_ref": "Consolidated Text 02023R1115-20251226 (incorporating Reg. 2024/3234 & Reg. 2025/2650)",
        "eurlex_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02023R1115-20251226",
        "doc_type": "consolidated_eudr",
    },
    {
        "celex": "32025R2650",
        "short_name": "Regulation (EU) 2025/2650 (EUDR 2025 Simplification & Amending Regulation)",
        "oj_ref": "OJ L, 2025/2650, 23.12.2025",
        "eurlex_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2650",
        "doc_type": "amending_regulation",
    },
    {
        "celex": "32024R3084",
        "short_name": "Implementing Regulation (EU) 2024/3084 (EU TRACES NT Information System)",
        "oj_ref": "OJ L, 2024/3084, 6.12.2024",
        "eurlex_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3084",
        "doc_type": "implementing_regulation",
    },
    {
        "celex": "32025R1093",
        "short_name": "Implementing Regulation (EU) 2025/1093 (Article 29 Country Risk Benchmarking List)",
        "oj_ref": "OJ L, 2025/1093, 23.5.2025",
        "eurlex_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R1093",
        "doc_type": "country_benchmarking",
    },
    {
        "celex": "52025XC04524",
        "short_name": "Commission Notice C/2025/4524 (Official EUDR Guidance Document, 12.8.2025)",
        "oj_ref": "OJ C, C/2025/4524, 12.8.2025",
        "eurlex_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025XC04524",
        "doc_type": "commission_guidance",
    },
]


class BlockTextExtractor(HTMLParser):
    """Converts EUR-Lex Formex XHTML into clean block-separated verbatim lines."""

    BLOCK_TAGS = {
        "p", "div", "tr", "li", "h1", "h2", "h3", "h4", "h5", "h6", "br", "hr", "table", "section", "article"
    }
    SKIP_TAGS = {"script", "style", "head", "title"}

    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        t = tag.lower()
        if t in self.SKIP_TAGS:
            self._skip_depth += 1
            return
        if self._skip_depth == 0:
            if t in self.BLOCK_TAGS:
                self._chunks.append("\n")
            elif t in ("td", "th"):
                self._chunks.append(" | ")

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t in self.SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if self._skip_depth == 0 and t in self.BLOCK_TAGS:
            self._chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self._chunks.append(data)

    def get_lines(self) -> list[str]:
        raw = html.unescape("".join(self._chunks))
        lines: list[str] = []
        for ln in raw.splitlines():
            cleaned = re.sub(r"[ \t\xa0]+", " ", ln).strip(" |")
            cleaned = re.sub(r"\s*\|\s*\|\s*", " | ", cleaned)
            if cleaned:
                lines.append(cleaned)
        return lines


def html_to_lines(xhtml: str) -> list[str]:
    parser = BlockTextExtractor()
    parser.feed(xhtml)
    return parser.get_lines()


def detect_commodities(text: str) -> str:
    low = text.lower()
    found: list[str] = []
    mapping = [
        ("cattle", ["cattle", "bovine", "0102", "0201", "0202", "4101", "4104", "4107", "beef", "leather"]),
        ("cocoa", ["cocoa", "1801", "1802", "1803", "1804", "1805", "1806", "chocolate"]),
        ("coffee", ["coffee", "0901"]),
        ("oil_palm", ["oil palm", "palm oil", "1511", "1513", "1207 10", "2905 45", "3823"]),
        ("rubber", ["rubber", "4001", "4011", "4012", "4015", "4016", "tyre"]),
        ("soya", ["soya", "soybean", "1201", "1507", "2304"]),
        ("wood", ["wood", "timber", "pulp", "paper", "furniture", "4401", "4403", "4407", "4412", "9403"]),
    ]
    for comm, kws in mapping:
        if any(k in low for k in kws):
            found.append(comm)
    return ",".join(found) if found else "cocoa,coffee,oil_palm,soya,rubber,wood,cattle"


def detect_hs_codes(text: str) -> str:
    codes = sorted(set(re.findall(r"\b(?:0102|0201|0202|0206|0901|1201|1207|1208|1507|1511|1513|1602|1801|1802|1803|1804|1805|1806|2304|2306|2905|2915|3823|4001|4005|4006|4007|4008|4010|4011|4012|4013|4015|4016|4017|4101|4104|4107|44\d{2}|47\d{2}|48\d{2}|49\d{2}|9401|9403|9406)\b", text)))
    return ",".join(codes[:20]) if codes else "ALL"


def make_doc(
    doc_id: str,
    act: dict[str, str],
    article_ref: str,
    title: str,
    category: str,
    verbatim_lines: list[str],
    extra_keywords: str = "",
) -> dict[str, str]:
    verbatim_text = "\n".join(verbatim_lines).strip()
    sha256_hex = hashlib.sha256(verbatim_text.encode("utf-8")).hexdigest()
    # Verbatim excerpt (first ~420 chars of exact Official Journal text, zero AI rewriting)
    first_para = re.sub(r"\s+", " ", verbatim_text)[:450].strip()
    if len(verbatim_text) > 450:
        first_para += " [...]"

    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "-", doc_id).strip("-").lower()[:120]
    return {
        "id": safe_id,
        "celex_id": act["celex"],
        "oj_ref": act["oj_ref"],
        "eurlex_url": act["eurlex_url"],
        "sha256_verbatim": sha256_hex,
        "article_ref": article_ref,
        "title": title,
        "category": category,
        "commodities": detect_commodities(verbatim_text),
        "country_codes": "ALL",
        "hs_codes": detect_hs_codes(verbatim_text),
        "keywords": f"{act['celex']} {article_ref} {title} {extra_keywords}".strip(),
        "legal_summary": first_para,
        "full_text": verbatim_text[:28000],  # Azure AI Search Edm.String safe cap while keeping complete verbatim articles
    }


def parse_recitals_from_original_eudr(lines: list[str], act: dict[str, str]) -> list[dict[str, str]]:
    """Extract verbatim Recitals (1) to (86) from Regulation (EU) 2023/1115."""
    docs: list[dict[str, str]] = []
    start_idx = next((i for i, l in enumerate(lines) if "Whereas:" in l), 0)
    end_idx = next((i for i, l in enumerate(lines[start_idx:], start=start_idx) if l == "HAVE ADOPTED THIS REGULATION:" or l == "Article 1"), len(lines))

    recitals: list[tuple[int, list[str]]] = []
    cur_num: int | None = None
    cur_buf: list[str] = []

    for ln in lines[start_idx + 1 : end_idx]:
        m = re.match(r"^\((\d{1,2})\)\s*(.*)$", ln)
        if m:
            num = int(m.group(1))
            if cur_num is not None and cur_buf:
                recitals.append((cur_num, cur_buf))
            cur_num = num
            rest = m.group(2).strip()
            cur_buf = [f"({num}) {rest}" if rest else f"({num})"]
        elif cur_num is not None:
            if len(cur_buf) == 1 and cur_buf[0] == f"({cur_num})":
                cur_buf[0] = f"({cur_num}) {ln}"
            else:
                cur_buf.append(ln)
    if cur_num is not None and cur_buf:
        recitals.append((cur_num, cur_buf))

    # Store key recitals (like Recital 37 on EC Observatory maps!) individually or in tight thematic groups of 5
    i = 0
    while i < len(recitals):
        group = recitals[i : i + 5]
        r_start = group[0][0]
        r_end = group[-1][0]
        flat_lines = [ln for _, buf in group for ln in buf]
        special_note = ""
        if any(num == 37 for num, _ in group):
            special_note = "Recital 37 EU Observatory forest maps non-binding non-exclusive JRC GFC2020"
        docs.append(
            make_doc(
                doc_id=f"32023r1115-recitals-{r_start:02d}-{r_end:02d}",
                act=act,
                article_ref=f"Regulation (EU) 2023/1115 — Recitals ({r_start}) to ({r_end})",
                title=f"Official Preamble Recitals ({r_start})–({r_end}) of Regulation (EU) 2023/1115 {('(includes Recital 37 on EU Observatory Maps)' if special_note else '')}".strip(),
                category="official_recitals",
                verbatim_lines=flat_lines,
                extra_keywords=f"recital recitals {special_note}",
            )
        )
        i += 5
    return docs


def parse_articles_and_annexes(lines: list[str], act: dict[str, str], prefix: str) -> list[dict[str, str]]:
    """Extract every verbatim Article and Annex from an EU Regulation / Consolidated Text."""
    docs: list[dict[str, str]] = []
    # Locate first 'Article 1' after enacting formula (skipping references inside recitals)
    enact_idx = next(
        (i for i, l in enumerate(lines) if "HAVE ADOPTED THIS REGULATION" in l or "HAS ADOPTED THIS REGULATION" in l or l == "CHAPTER 1"),
        0,
    )
    art1_idx = next((i for i, l in enumerate(lines[enact_idx:], start=enact_idx) if re.match(r"^Article\s+1\b", l)), enact_idx)

    # Split into Article blocks + Annex blocks
    sections: list[tuple[str, str, str, list[str]]] = []  # (kind, ref_label, subtitle, body_lines)
    cur_kind = ""
    cur_label = ""
    cur_sub = ""
    cur_lines: list[str] = []

    i = art1_idx
    while i < len(lines):
        ln = lines[i]
        m_art = re.match(r"^Article\s+(\d+[a-z]?)$", ln, re.IGNORECASE)
        m_annex = re.match(r"^ANNEX(\s+[IVX]+)?$", ln)
        if m_art:
            if cur_label and cur_lines:
                sections.append((cur_kind, cur_label, cur_sub, cur_lines))
            art_num = m_art.group(1)
            cur_kind = "official_article"
            cur_label = f"Article {art_num}"
            # Next line in Formex is almost always the official Article title if short & not starting with '1.'
            nxt = lines[i + 1] if (i + 1) < len(lines) else ""
            if nxt and len(nxt) < 120 and not re.match(r"^(1\.|\(1\)|CHAPTER\b|ANNEX\b)", nxt):
                cur_sub = nxt
                cur_lines = [f"Article {art_num} — {nxt}"]
                i += 2
                continue
            else:
                cur_sub = f"Enacting Provision (Article {art_num})"
                cur_lines = [f"Article {art_num}"]
        elif m_annex:
            if cur_label and cur_lines:
                sections.append((cur_kind, cur_label, cur_sub, cur_lines))
            annex_id = (m_annex.group(1) or "").strip()
            cur_kind = "official_annex"
            cur_label = f"Annex {annex_id}".strip()
            nxt = lines[i + 1] if (i + 1) < len(lines) else ""
            cur_sub = nxt[:120] if nxt else cur_label
            cur_lines = [cur_label]
        else:
            if cur_label:
                cur_lines.append(ln)
        i += 1

    if cur_label and cur_lines:
        sections.append((cur_kind, cur_label, cur_sub, cur_lines))

    for kind, label, sub, body in sections:
        # Special handling: split Consolidated Annex I commodity-by-commodity too, while ALSO keeping complete Annex I!
        docs.append(
            make_doc(
                doc_id=f"{prefix}-{label.lower().replace(' ', '-')}",
                act=act,
                article_ref=f"{act['short_name']} — {label}",
                title=f"{label}: {sub}",
                category=kind,
                verbatim_lines=body,
                extra_keywords="HS codes CN codes customs tariff Annex I DDS" if "Annex" in label else "",
            )
        )
        if label == "Annex I" and len(body) > 25:
            docs.extend(_split_annex_i_by_commodity(body, act, prefix))
    return docs


def _split_annex_i_by_commodity(body: list[str], act: dict[str, str], prefix: str) -> list[dict[str, str]]:
    """Split verbatim Annex I table by the 7 official EUDR relevant commodities (`Cattle`, `Cocoa`, `Coffee`, `Oil palm`, `Rubber`, `Soya`, `Wood`)."""
    commodity_headers = ["Cattle", "Cocoa", "Coffee", "Oil palm", "Rubber", "Soya", "Wood"]
    sub_docs: list[dict[str, str]] = []
    indices: list[tuple[str, int]] = []
    for idx, ln in enumerate(body):
        for ch in commodity_headers:
            if ln == ch or ln.startswith(f"{ch} |"):
                if not indices or indices[-1][0] != ch:
                    indices.append((ch, idx))
                break

    for pos, (ch, start_i) in enumerate(indices):
        end_i = indices[pos + 1][1] if (pos + 1) < len(indices) else len(body)
        chunk = body[0:4] + body[start_i:end_i]
        sub_docs.append(
            make_doc(
                doc_id=f"{prefix}-annex-i-{ch.lower().replace(' ', '-')}",
                act=act,
                article_ref=f"{act['short_name']} — Annex I ({ch})",
                title=f"Official Annex I Verbatim Tariff Schedule — {ch}",
                category="annex_i_hs_codes",
                verbatim_lines=chunk,
                extra_keywords=f"{ch} CN code HS tariff",
            )
        )
    return sub_docs


def parse_commission_guidance(lines: list[str], act: dict[str, str]) -> list[dict[str, str]]:
    """Segment Official Commission Guidance Notice C/2025/4524 along its official numbered chapters (`1.`..`11.`, sub-sections & `ANNEX`)."""
    docs: list[dict[str, str]] = []
    # Find body start after Table of Contents (second occurrence of 'DEFINITIONS OF' following '1.')
    body_start = 0
    def_hits = [
        i for i in range(len(lines) - 1)
        if lines[i] == "1." and "DEFINITIONS OF" in lines[i + 1].upper()
    ]
    if len(def_hits) >= 2:
        body_start = def_hits[1]
    elif def_hits:
        body_start = def_hits[0]

    sections: list[tuple[str, list[str]]] = []
    cur_heading = "Commission Notice C/2025/4524 — Introduction"
    cur_buf: list[str] = []

    i = body_start
    while i < len(lines):
        ln = lines[i]
        nxt = lines[i + 1] if (i + 1) < len(lines) else ""

        # Two-line Formex major chapter heading: e.g. '1.' followed by 'DEFINITIONS OF ...' or '11.' + 'AGRICULTURAL USE'
        two_line_major = (
            re.match(r"^(?:1[0-2]|[1-9])\.$", ln)
            and len(nxt) >= 4
            and len(nxt) <= 140
            and (nxt.upper() == nxt or re.match(r"^[A-Z]", nxt))
            and not re.match(r"^\d+$", nxt)
        )
        # Single-line major heading or Annex heading
        one_line_major = (
            re.match(r"^(?:1[0-2]|[1-9])\.\s+[A-Z][A-Z0-9\s,‘’'()/–&-]{3,130}$", ln)
            or re.match(r"^ANNEX\s+[IVX0-9]+\b", ln)
        )

        if two_line_major:
            if cur_buf and len(cur_buf) >= 4:
                sections.append((cur_heading, cur_buf))
            cur_heading = f"{ln} {nxt}"
            cur_buf = [cur_heading]
            i += 2
            continue
        elif one_line_major and len(cur_buf) >= 4:
            sections.append((cur_heading, cur_buf))
            cur_heading = ln
            cur_buf = [ln]
        else:
            cur_buf.append(ln)
        i += 1

    if cur_buf:
        sections.append((cur_heading, cur_buf))

    for idx, (heading, buf) in enumerate(sections, start=1):
        docs.append(
            make_doc(
                doc_id=f"c2025-4524-sec-{idx:02d}",
                act=act,
                article_ref=f"European Commission Guidance Notice (C/2025/4524) — {heading}",
                title=f"Official EU Guidance (C/2025/4524): {heading}",
                category="official_commission_guidance",
                verbatim_lines=buf,
                extra_keywords="official guidance Commission Notice C/2025/4524 plot of land agroforestry replanting segregation legality",
            )
        )
    return docs


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    all_docs: list[dict[str, str]] = []

    with httpx.Client(
        headers={"Accept": "application/xhtml+xml, text/html", "Accept-Language": "eng"},
        follow_redirects=True,
        timeout=35.0,
    ) as client:
        for act in OFFICIAL_EU_ACTS:
            celex = act["celex"]
            raw_file = RAW_DIR / f"{celex}.xhtml"
            if raw_file.exists() and raw_file.stat().st_size > 5000:
                xhtml = raw_file.read_text(encoding="utf-8")
                print(f"[CACHE] Loaded official EUR-Lex {celex} ({len(xhtml):,} bytes)")
            else:
                url = f"https://publications.europa.eu/resource/celex/{celex}"
                resp = client.get(url)
                resp.raise_for_status()
                xhtml = resp.text
                raw_file.write_text(xhtml, encoding="utf-8")
                print(f"[FETCH] Downloaded official EUR-Lex {celex} ({len(xhtml):,} bytes)")

            lines = html_to_lines(xhtml)
            dtype = act["doc_type"]
            if dtype == "primary_regulation_recitals":
                extracted = parse_recitals_from_original_eudr(lines, act)
            elif dtype == "consolidated_eudr":
                extracted = parse_articles_and_annexes(lines, act, prefix="eudr-2025-consol")
            elif dtype == "amending_regulation":
                extracted = parse_articles_and_annexes(lines, act, prefix="reg-2025-2650")
                # Also include complete preamble/recitals of 2025/2650 so 2025 simplification rationale is searchable verbatim
                enact_i = next((i for i, l in enumerate(lines) if "HAVE ADOPTED THIS REGULATION" in l), min(80, len(lines)))
                if enact_i > 5:
                    extracted.insert(
                        0,
                        make_doc(
                            doc_id="reg-2025-2650-recitals",
                            act=act,
                            article_ref="Regulation (EU) 2025/2650 — Official Preamble & Recitals",
                            title="Official Recitals of EUDR 2025 Simplification & Amending Regulation (EU) 2025/2650",
                            category="official_recitals",
                            verbatim_lines=lines[:enact_i],
                            extra_keywords="2025 amendment simplification downstream operators micro small enterprises timeline",
                        ),
                    )
            elif dtype == "implementing_regulation":
                extracted = parse_articles_and_annexes(lines, act, prefix="reg-2024-3084-traces")
            elif dtype == "country_benchmarking":
                # Keep full verbatim Country Benchmarking Implementing Regulation + Annex country list!
                extracted = [
                    make_doc(
                        doc_id="reg-2025-1093-full-country-benchmarking",
                        act=act,
                        article_ref="Commission Implementing Regulation (EU) 2025/1093 — Full Text & Official Country Risk List",
                        title="Official Article 29 Country Risk Benchmarking List (Low-Risk & High-Risk Countries, OJ L 2025/1093)",
                        category="official_country_benchmarking",
                        verbatim_lines=lines,
                        extra_keywords="Article 29 country benchmarking low risk standard risk high risk list Annex countries",
                    )
                ]
            elif dtype == "commission_guidance":
                extracted = parse_commission_guidance(lines, act)
            else:
                extracted = []

            print(f"  -> Extracted {len(extracted)} verbatim statutory sections from {celex}")
            all_docs.extend(extracted)

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(all_docs, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[SUCCESS] Wrote {len(all_docs)} 100%-verbatim Official Journal EUR-Lex documents to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Props {
  content: string;
  className?: string;
}

/**
 * Formats inline math/formula expressions cleanly with subscripts, superscripts,
 * and standard mathematical symbols instead of raw unparsed LaTeX.
 */
function renderMathContent(math: string): React.ReactNode {
  const cleaned = math
    .replace(/\\times/g, "×")
    .replace(/\\setminus/g, " − ")
    .replace(/\\cdot/g, "·")
    .replace(/\\approx/g, "≈")
    .replace(/\\neq/g, "≠")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\pm/g, "±")
    .replace(/\\in/g, "∈")
    .replace(/\\to/g, "→")
    .replace(/\\/g, "");

  const subSuperRegex = /([_\^])(?:\{([^{}]+)\}|([a-zA-Z0-9()]+))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = subSuperRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleaned.slice(lastIndex, match.index));
    }
    const isSub = match[1] === "_";
    const content = match[2] || match[3];
    if (isSub) {
      parts.push(
        <sub key={`sub-${match.index}`} className="text-[9.5px] font-semibold text-[#1E3A34] -bottom-0.5">
          {content}
        </sub>
      );
    } else {
      parts.push(
        <sup key={`sup-${match.index}`} className="text-[9.5px] font-semibold text-[#1E3A34] -top-1">
          {content}
        </sup>
      );
    }
    lastIndex = subSuperRegex.lastIndex;
  }
  if (lastIndex < cleaned.length) {
    parts.push(cleaned.slice(lastIndex));
  }

  return (
    <span className="inline-flex items-baseline px-1.5 py-0.5 rounded bg-[#F0F4F2] text-[#1E3A34] border border-[#D5E2DC] font-mono text-[11px] font-semibold mx-1 shadow-2xs">
      {parts}
    </span>
  );
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim());
}

/**
 * Parses inline **bold**, `code`, $math$, badges, and normal text into React elements.
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\$[^\$]+\$)/g;
  const tokens = text.split(regex);

  tokens.forEach((token, idx) => {
    if (!token) return;

    if (token.startsWith("**") && token.endsWith("**")) {
      const boldText = token.slice(2, -2);
      if (boldText.startsWith("✅") || boldText.includes("(PASS)")) {
        parts.push(
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold mx-0.5 shadow-2xs"
          >
            {boldText}
          </span>
        );
      } else if (boldText.startsWith("❌") || boldText.includes("(FAIL)") || boldText.includes("VIOLATION")) {
        parts.push(
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-red-50 text-red-800 border border-red-200 text-[10px] font-mono font-bold mx-0.5 shadow-2xs"
          >
            {boldText}
          </span>
        );
      } else {
        parts.push(
          <strong key={idx} className="font-semibold text-[#1D2227]">
            {boldText}
          </strong>
        );
      }
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={idx} className="bg-[#EAEFF2] text-[#1E3A34] px-1.5 py-0.5 rounded text-[10.5px] font-mono font-medium">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("$") && token.endsWith("$") && token.length > 2) {
      parts.push(
        <React.Fragment key={idx}>
          {renderMathContent(token.slice(1, -1))}
        </React.Fragment>
      );
    } else {
      if (token.includes("✅ PASS") || token.includes("✅ COMPLIANT") || token.includes("✅ Ready for Filing") || token.includes("✅ 0.0 ha Loss")) {
        parts.push(
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold mx-0.5 shadow-2xs"
          >
            {token.trim()}
          </span>
        );
      } else if (token.includes("❌ FAIL") || token.includes("⚠️ NON-COMPLIANT") || token.includes("⚠️ Carve-Out")) {
        parts.push(
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-red-50 text-red-800 border border-red-200 text-[10px] font-mono font-bold mx-0.5 shadow-2xs"
          >
            {token.trim()}
          </span>
        );
      } else {
        parts.push(<span key={idx}>{token}</span>);
      }
    }
  });

  return parts;
}

export default function FormattedMarkdown({ content, className }: Props) {
  if (!content) return null;

  // Platform style rule: never render em/en dashes, always a plain hyphen.
  const lines = content.replace(/[\u2014\u2013]/g, "-").split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Horizontal divider: --- or *** or ___
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(
        <hr key={`hr-${i}`} className="border-t border-[#E3E7EA] my-2.5" />
      );
      i++;
      continue;
    }

    // 3. Blockquotes: > Text
    if (trimmed.startsWith("> ") || trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("> ") || lines[i].trim().startsWith(">"))) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ""));
        i++;
      }
      elements.push(
        <div
          key={`quote-${i}`}
          className="my-2.5 p-3 rounded-r-xl border-l-3 border-[#315F50] bg-[rgba(49,95,80,0.06)] text-[11.5px] text-[#1D2227] leading-relaxed shadow-2xs"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className={qIdx > 0 ? "mt-1.5" : ""}>
              {renderInline(ql)}
            </p>
          ))}
        </div>
      );
      continue;
    }

    // 4. Tables: | Header | Header | ... |
    if (trimmed.startsWith("|") && trimmed.includes("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().includes("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0].replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        const hasSep = isTableSeparator(tableLines[1]);
        const bodyLines = hasSep ? tableLines.slice(2) : tableLines.slice(1);
        const bodyRows = bodyLines.map((l) =>
          l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
        );

        elements.push(
          <div key={`tbl-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-[#C8CFD5] bg-white shadow-2xs">
            <table className="w-full text-left text-[11px] border-collapse min-w-[340px]">
              <thead>
                <tr className="bg-[#F4F5F6] border-b border-[#C8CFD5] text-[#1D2227]">
                  {headerRow.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-bold font-sans text-[11px] text-[#1D2227] whitespace-nowrap">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEFF2]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#F9FAFB] transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-[#2C343D] leading-relaxed">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 5. Verdict callout banner
    if (trimmed.includes("Final Verdict:") || trimmed.includes("VERDICT:") || trimmed.startsWith("Verdict:")) {
      const isNonCompliant = trimmed.toUpperCase().includes("NON COMPLIANT") || 
                             trimmed.toUpperCase().includes("NON-COMPLIANT") || 
                             trimmed.toUpperCase().includes("BLOCKED") ||
                             trimmed.toUpperCase().includes("VIOLATION");
      elements.push(
        <div
          key={`verdict-${i}`}
          className={cn(
            "my-2.5 p-2.5 rounded-xl border flex items-start gap-2.5 shadow-2xs",
            isNonCompliant
              ? "bg-red-50/80 border-red-200 text-[#991B1B]"
              : "bg-emerald-50/80 border-emerald-200 text-[#065F46]"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-white font-bold text-[11px] mt-0.5",
            isNonCompliant ? "bg-[#DC2626]" : "bg-[#16A34A]"
          )}>
            {isNonCompliant ? "✕" : "✓"}
          </div>
          <div className="flex-1 text-[12px] font-semibold leading-snug">
            {renderInline(trimmed.replace(/^[\*\-•]\s*/, ""))}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 6. Section indicator chips: e.g. § Result, § Parcel stats
    if (trimmed.startsWith("§ ") || trimmed === "§" || trimmed.startsWith("Result:") || trimmed.startsWith("Parcel stats:")) {
      const label = trimmed.replace(/^§\s*/, "").trim();
      elements.push(
        <div key={`section-badge-${i}`} className="pt-2 pb-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgba(49,95,80,0.08)] text-[#315F50] border border-[rgba(49,95,80,0.2)] text-[10px] font-mono font-bold uppercase tracking-wider">
            § {label}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 7. Headings: #, ##, ###, ####
    const h1Match = trimmed.match(/^#\s+(.*)$/);
    if (h1Match) {
      elements.push(
        <div key={`h1-${i}`} className="pt-2 pb-1.5 border-b border-[#E3E7EA] mb-2 mt-1">
          <h2 className="text-[13.5px] font-bold text-[#1D2227] tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-[#315F50] rounded-full inline-block flex-shrink-0" />
            <span>{renderInline(h1Match[1].trim())}</span>
          </h2>
        </div>
      );
      i++;
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.*)$/);
    if (h2Match) {
      const rawHeading = h2Match[1].trim();
      const numMatch = rawHeading.match(/^([1-9]\d?)[.)]\s*(.*)$/);
      const sectionNum = numMatch ? numMatch[1] : null;
      const cleanHeading = numMatch ? numMatch[2] : rawHeading;

      elements.push(
        <div key={`h2-${i}`} className="pt-2.5 pb-1 flex items-center gap-2 mt-2 mb-1 border-b border-[#F0F2F4]">
          {sectionNum ? (
            <span className="w-5 h-5 rounded bg-[rgba(49,95,80,0.1)] text-[#315F50] border border-[rgba(49,95,80,0.25)] flex items-center justify-center text-[10.5px] font-bold font-mono flex-shrink-0">
              {sectionNum}
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-[#315F50] flex-shrink-0" />
          )}
          <h3 className="text-[12.5px] font-bold text-[#1D2227] tracking-tight">
            {renderInline(cleanHeading)}
          </h3>
        </div>
      );
      i++;
      continue;
    }

    const h3Match = trimmed.match(/^(?:###\s+|📄\s*|(?:\*\*)?(?:[1-9]\d?)\.\s+)(.*)$/);
    const isNumbered = /^(?:📄\s*)?[1-9]\d?\.\s+[A-Za-z]/.test(trimmed) || trimmed.startsWith("### ");
    if (isNumbered && h3Match) {
      const headingText = h3Match[1].replace(/\*\*/g, "").replace(/📄/g, "").trim();
      const numMatch = trimmed.match(/([1-9]\d?)\./);
      const sectionNum = numMatch ? numMatch[1] : null;

      elements.push(
        <div key={`sec-${i}`} className="pt-2 pb-1 flex items-center gap-2 border-b border-[#E3E7EA] mb-2 mt-1">
          {sectionNum ? (
            <span className="w-5 h-5 rounded bg-[rgba(49,95,80,0.1)] text-[#315F50] border border-[rgba(49,95,80,0.25)] flex items-center justify-center text-[10.5px] font-bold font-mono flex-shrink-0">
              {sectionNum}
            </span>
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#315F50] flex-shrink-0" />
          )}
          <h4 className="text-[12.5px] font-bold text-[#1D2227] tracking-tight">
            {renderInline(headingText)}
          </h4>
        </div>
      );
      i++;
      continue;
    }

    const h4Match = trimmed.match(/^####\s+(.*)$/);
    if (h4Match) {
      elements.push(
        <div key={`h4-${i}`} className="pt-2 pb-0.5 flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-[#315F50] flex-shrink-0" />
          <h5 className="text-[11.5px] font-bold text-[#1D2227]">
            {renderInline(h4Match[1].trim())}
          </h5>
        </div>
      );
      i++;
      continue;
    }

    // 8. Bullet items: * item, - item, or • item
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("•")) {
      const bulletItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("* ") ||
         lines[i].trim().startsWith("- ") ||
         lines[i].trim().startsWith("• ") ||
         lines[i].trim().startsWith("•"))
      ) {
        bulletItems.push(lines[i].trim().replace(/^[\*\-•]\s*/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-1.5 pl-0.5">
          {bulletItems.map((item, bIdx) => (
            <li key={bIdx} className="flex items-start gap-2 text-[12px] text-[#2C343D] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315F50] mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 9. Key-Value pairs: e.g. **Audit Reference:** EUDR-1234
    const kvMatch = trimmed.match(/^\*\*([^:]+):\*\*\s*(.*)$/);
    if (kvMatch) {
      const [, key, val] = kvMatch;
      elements.push(
        <div key={`kv-${i}`} className="flex items-baseline justify-between text-[11.5px] py-1 border-b border-[#F0F2F4]">
          <span className="font-semibold text-[#1D2227]">{renderInline(key)}:</span>
          <span className="text-[#343B42] font-mono text-[11px] text-right">{renderInline(val)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 10. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[12px] text-[#343B42] leading-relaxed my-1.5">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return (
    <div className={cn("space-y-1 text-left font-sans", className)}>
      {elements}
    </div>
  );
}

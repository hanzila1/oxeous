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
  // Clean common LaTeX commands and stray control characters
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

  // Match subscripts: _{content} or _word, and superscripts: ^{content} or ^2
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

/**
 * Parses inline **bold**, `code`, $math$, and normal text into React elements.
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Match **bold**, `code`, and $formula$
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\$[^\$]+\$)/g;
  const tokens = text.split(regex);

  tokens.forEach((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={idx} className="font-semibold text-[#1D2227]">
          {token.slice(2, -2)}
        </strong>
      );
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
    } else if (token) {
      parts.push(<span key={idx}>{token}</span>);
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

    // 2. Horizontal divider: --- or ***
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(
        <hr key={`hr-${i}`} className="border-t border-[#E3E7EA] my-2.5" />
      );
      i++;
      continue;
    }

    // 3. Section Headings: e.g. "### Title", "📄 1. What This Result Means", or "1. What This Result Means"
    const headingMatch = trimmed.match(/^(?:###\s+|📄\s*|(?:\*\*)?(?:[1-9]\d?)\.\s+)(.*)$/);
    const isNumberedSection = /^(?:📄\s*)?[1-9]\d?\.\s+[A-Za-z]/.test(trimmed) || trimmed.startsWith("### ");

    if (isNumberedSection && headingMatch) {
      const headingText = headingMatch[1].replace(/\*\*/g, "").replace(/📄/g, "").trim();
      const numMatch = trimmed.match(/([1-9]\d?)\./);
      const sectionNum = numMatch ? numMatch[1] : "§";

      elements.push(
        <div key={`sec-${i}`} className="pt-3 pb-1.5 flex items-center gap-2 border-b border-[#E3E7EA] mb-2 mt-1">
          <span className="w-5 h-5 rounded bg-[rgba(49,95,80,0.1)] text-[#315F50] border border-[rgba(49,95,80,0.25)] flex items-center justify-center text-[10.5px] font-bold font-mono flex-shrink-0">
            {sectionNum}
          </span>
          <h3 className="text-[12.5px] font-bold text-[#1D2227] tracking-tight">
            {headingText}
          </h3>
        </div>
      );
      i++;
      continue;
    }

    // 4. Statutory Verdict Callout Banner (Executive Highlighting)
    if (trimmed.includes("Final Verdict:") || trimmed.includes("VERDICT:")) {
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

    // 5. Level 4 Heading: #### Subtitle
    if (trimmed.startsWith("#### ")) {
      const headingText = trimmed.replace(/^####\s+/, "").replace(/\*\*/g, "").trim();
      elements.push(
        <div key={`h4-${i}`} className="pt-2 pb-0.5 flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-[#315F50] flex-shrink-0" />
          <h4 className="text-[12px] font-bold text-[#1D2227]">
            {headingText}
          </h4>
        </div>
      );
      i++;
      continue;
    }

    // 6. Bullet items: * item, - item, or • item
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
              <div className="flex-1">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Key-Value pairs: e.g. **Audit Reference:** EUDR-1234
    const kvMatch = trimmed.match(/^\*\*([^:]+):\*\*\s*(.*)$/);
    if (kvMatch) {
      const [, key, val] = kvMatch;
      elements.push(
        <div key={`kv-${i}`} className="flex items-baseline justify-between text-[11.5px] py-1 border-b border-[#F0F2F4]">
          <span className="font-semibold text-[#1D2227]">{key}:</span>
          <span className="text-[#343B42] font-mono text-[11px] text-right">{val}</span>
        </div>
      );
      i++;
      continue;
    }

    // 8. Standard Paragraph
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

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { FileText, ChevronRight } from "lucide-react";

interface Props {
  content: string;
  className?: string;
}

/**
 * Parses inline **bold**, `code`, and normal text into React elements.
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
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
        <code key={idx} className="bg-[#E3E7EA] text-[#1D2227] px-1 py-0.5 rounded text-[10px] font-mono">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token) {
      parts.push(<span key={idx}>{token}</span>);
    }
  });

  return parts;
}

export default function FormattedMarkdown({ content, className }: Props) {
  if (!content) return null;

  const lines = content.split("\n");
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
        <hr key={`hr-${i}`} className="border-t border-[#E3E7EA] my-2" />
      );
      i++;
      continue;
    }

    // 3. Level 3 Heading: ### Title
    if (trimmed.startsWith("### ")) {
      const headingText = trimmed.replace(/^###\s+/, "").replace(/\*\*/g, "").trim();
      elements.push(
        <div key={`h3-${i}`} className="pt-2 pb-1 flex items-center gap-1.5 border-b border-[#E3E7EA]/80 mb-1">
          <FileText className="w-3.5 h-3.5 text-[#315F50] flex-shrink-0" />
          <h3 className="text-[12px] font-bold text-[#1D2227] tracking-tight">
            {headingText}
          </h3>
        </div>
      );
      i++;
      continue;
    }

    // 4. Level 4 Heading: #### Subtitle
    if (trimmed.startsWith("#### ")) {
      const headingText = trimmed.replace(/^####\s+/, "").replace(/\*\*/g, "").trim();
      elements.push(
        <div key={`h4-${i}`} className="pt-2 pb-0.5 flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-[#315F50] flex-shrink-0" />
          <h4 className="text-[11.5px] font-bold text-[#1D2227]">
            {headingText}
          </h4>
        </div>
      );
      i++;
      continue;
    }

    // 5. Bullet items: * item or - item
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const bulletItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("* ") || lines[i].trim().startsWith("- "))) {
        bulletItems.push(lines[i].trim().replace(/^[\*\-]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-1.5 pl-0.5">
          {bulletItems.map((item, bIdx) => (
            <li key={bIdx} className="flex items-start gap-2 text-[11px] text-[#343B42] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315F50] mt-1.5 flex-shrink-0" />
              <div className="flex-1">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Key-Value pairs: e.g. **Audit Reference:** EUDR-1234
    const kvMatch = trimmed.match(/^\*\*([^:]+):\*\*\s*(.*)$/);
    if (kvMatch) {
      const [, key, val] = kvMatch;
      elements.push(
        <div key={`kv-${i}`} className="flex items-baseline justify-between text-[11px] py-0.5 border-b border-[#F0F2F4]">
          <span className="font-semibold text-[#1D2227]">{key}:</span>
          <span className="text-[#343B42] font-mono text-[10.5px] text-right">{val}</span>
        </div>
      );
      i++;
      continue;
    }

    // 7. Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[11px] text-[#343B42] leading-relaxed my-1">
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

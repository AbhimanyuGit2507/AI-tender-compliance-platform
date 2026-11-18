import React from 'react';
import { ExternalLink, FileText, CheckCircle2 } from 'lucide-react';

/**
 * Parses inline text for bold (**text**), italics (*text*), inline code (`code`),
 * and interactive citations: [Source X, Page Y, Clause Z] or [Page Y, Clause Z] or [Clause Z].
 */
export function renderInlineMarkdown(text, onCitationClick) {
  if (!text) return null;

  // Regex matches:
  // 1. [Source 1, Page 40, Clause 22.9] or [Page 40, Clause 22.9] or [Clause 22.9] or [Source 2, Page 18]
  // 2. **bold**
  // 3. `code`
  const tokenRegex = /(\[(?:Source\s*\d+,?\s*)?(?:Page\s*\d+[^\]]*|Clause\s*[^\]]*)\]|\*\*[^*]+\*\*|`[^`]+`)/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchStr = match[0];

    // Push preceding text
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    if (matchStr.startsWith('[') && matchStr.endsWith(']')) {
      // Citation pill
      const inner = matchStr.slice(1, -1);
      // Extract page number if present
      const pageMatch = inner.match(/Page\s*(\d+)/i);
      const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : null;
      // Extract clause ref if present
      const clauseMatch = inner.match(/Clause\s*([^,\]]+)/i);
      const clauseRef = clauseMatch ? `Clause ${clauseMatch[1].trim()}` : null;
      const clauseNumber = clauseMatch ? clauseMatch[1].trim() : (clauseRef ? clauseRef.replace(/[^0-9.]/g, '') : null);
      const label = clauseRef || (clauseNumber ? `Clause ${clauseNumber}` : 'Official Evidence');

      parts.push(
        <button
          key={`cite-${matchIndex}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onCitationClick) {
              onCitationClick({
                page_number: pageNum || 1,
                clause_ref: label,
                clause_number: clauseNumber,
                title: `${label} (Page ${pageNum || 1})`,
                exact_snippet: inner,
                raw_citation: inner,
              });
            }
          }}
          className="inline-citation-chip"
          title={`Click to view proof on ${pageNum ? `Page ${pageNum}` : 'official document'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '2px 8px',
            margin: '0 3px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 5,
            background: 'rgba(2, 132, 199, 0.14)',
            color: '#38BDF8',
            border: '1px solid rgba(56, 189, 248, 0.40)',
            cursor: 'pointer',
            verticalAlign: 'baseline',
            transition: 'all 150ms ease',
            fontFamily: 'var(--font-mono, monospace)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.28)';
            e.currentTarget.style.borderColor = '#38BDF8';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.14)';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.40)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <FileText size={11} style={{ opacity: 0.85 }} />
          <span>{inner.replace(/^Source\s*\d+,\s*/i, '')}</span>
          <ExternalLink size={10} style={{ opacity: 0.7 }} />
        </button>
      );
    } else if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
      // Bold text
      parts.push(
        <strong key={`b-${matchIndex}`} style={{ fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>
          {matchStr.slice(2, -2)}
        </strong>
      );
    } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
      // Inline code
      parts.push(
        <code
          key={`c-${matchIndex}`}
          style={{
            background: 'var(--bg-elevated, rgba(255,255,255,0.06))',
            padding: '2px 5px',
            borderRadius: 4,
            fontSize: 11.5,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--accent-primary, #F97316)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          }}
        >
          {matchStr.slice(1, -1)}
        </code>
      );
    }

    lastIndex = matchIndex + matchStr.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

/**
 * Complete, rich Markdown parser tailored for procurement audits,
 * handling headers, steps, bullets, tables, and clickable clause evidence links.
 */
export function CopilotMarkdown({ content, onCitationClick }) {
  if (!content) return null;

  // Clean raw prefix artifacts if any
  let cleanContent = (content || '').trimStart();
  if (/^text:\s*/i.test(cleanContent)) {
    cleanContent = cleanContent.replace(/^text:\s*/i, '').trimStart();
  }

  const lines = cleanContent.split('\n');

  return (
    <div
      className="copilot-markdown-flow"
      style={{
        lineHeight: 1.68,
        fontSize: 13,
        color: 'var(--text-primary, #F1F5F9)',
      }}
    >
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();

        // Empty lines
        if (!line) {
          return <div key={`spacer-${idx}`} style={{ height: 8 }} />;
        }

        // H1 Header (# Title)
        if (line.startsWith('# ')) {
          return (
            <h2
              key={`h1-${idx}`}
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: 'var(--text-primary, #FFFFFF)',
                margin: '18px 0 8px 0',
                paddingBottom: 4,
                borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                letterSpacing: '-0.02em',
              }}
            >
              {renderInlineMarkdown(line.slice(2), onCitationClick)}
            </h2>
          );
        }

        // H2 Header (## Section)
        if (line.startsWith('## ')) {
          return (
            <h3
              key={`h2-${idx}`}
              style={{
                fontSize: 16,
                fontWeight: 750,
                color: 'var(--text-primary, #F8FAFC)',
                margin: '16px 0 8px 0',
                letterSpacing: '-0.01em',
              }}
            >
              {renderInlineMarkdown(line.slice(3), onCitationClick)}
            </h3>
          );
        }

        // H3 Header (### Phase 2: If You Have Won the Contract...)
        if (line.startsWith('### ')) {
          return (
            <div
              key={`h3-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 16,
                marginBottom: 8,
                padding: '6px 12px',
                borderRadius: 7,
                background: 'rgba(249, 115, 22, 0.09)',
                borderLeft: '3px solid var(--accent-primary, #F97316)',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: 'var(--accent-primary, #FB923C)',
                  letterSpacing: '-0.01em',
                }}
              >
                {renderInlineMarkdown(line.slice(4), onCitationClick)}
              </h4>
            </div>
          );
        }

        // H4 Header (#### A. Pre-Dispatch and Inspection)
        if (line.startsWith('#### ')) {
          return (
            <h5
              key={`h4-${idx}`}
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: '#38BDF8',
                margin: '12px 0 6px 0',
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
              }}
            >
              {renderInlineMarkdown(line.slice(5), onCitationClick)}
            </h5>
          );
        }

        // Numbered Steps (1. **Step Title:** Step content...)
        const stepMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (stepMatch) {
          const stepNum = stepMatch[1];
          const stepBody = stepMatch[2];
          return (
            <div
              key={`step-${idx}`}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                margin: '8px 0',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--bg-elevated, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'rgba(249, 115, 22, 0.2)',
                  color: 'var(--accent-primary, #F97316)',
                  fontSize: 11.5,
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {stepNum}
              </span>
              <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.6 }}>
                {renderInlineMarkdown(stepBody, onCitationClick)}
              </div>
            </div>
          );
        }

        // Bullet points (- or *)
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div
              key={`bullet-${idx}`}
              style={{
                display: 'flex',
                gap: 9,
                alignItems: 'flex-start',
                margin: '6px 0',
                paddingLeft: 4,
              }}
            >
              <span
                style={{
                  color: 'var(--accent-primary, #F97316)',
                  fontSize: 15,
                  lineHeight: '22px',
                }}
              >
                •
              </span>
              <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.6 }}>
                {renderInlineMarkdown(line.slice(2), onCitationClick)}
              </div>
            </div>
          );
        }

        // Markdown Table Row (| col1 | col2 |)
        if (line.startsWith('|') && line.endsWith('|')) {
          const cells = line.split('|').slice(1, -1).map((c) => c.trim());
          if (cells.every((c) => c.match(/^:?-+:?$/))) {
            return null; // Separator row
          }
          return (
            <div
              key={`table-${idx}`}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
                gap: 10,
                padding: '8px 12px',
                background: 'var(--bg-elevated, rgba(255,255,255,0.04))',
                borderRadius: 6,
                margin: '4px 0',
                fontSize: 13,
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              }}
            >
              {cells.map((cell, cIdx) => (
                <div key={cIdx} style={{ fontWeight: 500 }}>
                  {renderInlineMarkdown(cell, onCitationClick)}
                </div>
              ))}
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={`p-${idx}`} style={{ margin: '6px 0', fontSize: 13.5, lineHeight: 1.65 }}>
            {renderInlineMarkdown(line, onCitationClick)}
          </p>
        );
      })}
    </div>
  );
}

export default CopilotMarkdown;


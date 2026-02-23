// WebScribe PDF Generator
// Renders content model into a styled, print-quality PDF by opening a clean print window.

const PDFGenerator = (() => {
    'use strict';

    function generate(data, options = {}) {
        const { metadata, nodes } = data;
        const { includeImages = true, includeAI = false, aiData = null } = options;

        const html = buildHTML(metadata, nodes, { includeImages, includeAI, aiData });
        openPrintWindow(html, metadata.title);
    }

    // ── Build full HTML for print window ─────────────────────────────────────
    function buildHTML(metadata, nodes, opts) {
        const bodyContent = buildBody(nodes, opts);
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(metadata.title)}</title>
  <style>
    /* ── Print CSS ── */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 11pt;
      line-height: 1.75;
      color: #1a1a2e;
      background: #fff;
      padding: 0;
    }

    .page-wrapper {
      max-width: 740px;
      margin: 0 auto;
      padding: 48px 52px;
    }

    /* ── Header ── */
    .doc-header {
      border-bottom: 2px solid #e0e7ff;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }

    .doc-badge {
      display: inline-block;
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #6366f1;
      background: #eef2ff;
      padding: 3px 10px;
      border-radius: 100px;
      margin-bottom: 10px;
    }

    .doc-title {
      font-size: 22pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 8px;
      line-height: 1.2;
    }

    .doc-meta {
      font-size: 8.5pt;
      color: #6b7280;
    }

    .doc-meta a { color: #6366f1; text-decoration: none; }

    /* ── AI Block ── */
    .ai-block {
      background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
      border: 1px solid #c7d2fe;
      border-radius: 10px;
      padding: 20px 24px;
      margin: 24px 0;
    }

    .ai-block h2 { font-size: 11pt; color: #6366f1; margin-bottom: 12px; }
    .ai-block h3 { font-size: 9pt; text-transform: uppercase; letter-spacing: .06em; color: #818cf8; margin: 12px 0 6px; }
    .ai-block p  { font-size: 10pt; color: #374151; line-height: 1.6; }
    .ai-block ul { padding-left: 18px; }
    .ai-block li { font-size: 10pt; color: #374151; margin-bottom: 3px; }

    /* ── TOC ── */
    .toc {
      background: #f8fafc;
      border-left: 3px solid #6366f1;
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    .toc-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #6366f1; margin-bottom: 10px; }
    .toc a { color: #374151; text-decoration: none; font-size: 10pt; }
    .toc li { margin-bottom: 4px; }
    .toc ul { padding-left: 18px; }

    /* ── Content ── */
    h1 { font-size: 18pt; font-weight: 700; color: #1a1a2e; margin: 28px 0 10px; line-height: 1.25; }
    h2 { font-size: 14pt; font-weight: 700; color: #1e293b; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    h3 { font-size: 12pt; font-weight: 600; color: #334155; margin: 18px 0 6px; }
    h4 { font-size: 11pt; font-weight: 600; color: #475569; margin: 14px 0 5px; }
    h5 { font-size: 10.5pt; font-weight: 600; color: #64748b; margin: 12px 0 4px; }
    h6 { font-size: 10pt; font-weight: 600; color: #94a3b8; margin: 10px 0 4px; }

    p { margin: 0 0 12px; color: #1f2937; }

    ul, ol { padding-left: 22px; margin: 0 0 12px; }
    li { margin-bottom: 4px; color: #1f2937; }

    pre {
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      padding: 16px 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 14px 0;
      line-height: 1.6;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #6366f1;
      padding: 2px 5px;
      border-radius: 4px;
    }

    pre code { background: none; color: inherit; padding: 0; }

    blockquote {
      border-left: 4px solid #6366f1;
      margin: 14px 0;
      padding: 10px 18px;
      background: #f8f9ff;
      color: #475569;
      border-radius: 0 6px 6px 0;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 14px 0;
      display: block;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 14px 0;
      font-size: 10pt;
    }

    th {
      background: #f1f5f9;
      font-weight: 600;
      padding: 8px 12px;
      text-align: left;
      border: 1px solid #e2e8f0;
      color: #374151;
    }

    td {
      padding: 7px 12px;
      border: 1px solid #e2e8f0;
      color: #1f2937;
    }

    tr:nth-child(even) td { background: #f8fafc; }

    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }

    .source-footer {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5pt;
      color: #9ca3af;
    }

    .source-footer a { color: #6366f1; }

    /* ── Print-specific ── */
    @media print {
      body { padding: 0; }
      .page-wrapper { padding: 20px 24px; max-width: 100%; }
      pre { white-space: pre-wrap; word-break: break-all; }
      a { color: inherit; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    ${bodyContent}
  </div>
  <script>
    // Auto-trigger print dialog
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;
    }

    // ── Build HTML body from content model ────────────────────────────────────
    function buildBody(nodes, { includeImages, includeAI, aiData } = {}) {
        const parts = [];

        // Header
        parts.push(`<div class="doc-header">
  <div class="doc-badge">WebScribe Notes</div>
</div>`);

        // AI block
        if (includeAI && aiData) {
            parts.push(buildAIBlock(aiData));
        }

        // TOC
        const headings = nodes.filter((n) => n.type === 'heading');
        if (headings.length > 2) {
            parts.push(buildTOC(headings));
        }

        // Content nodes
        for (const node of nodes) {
            const html = nodeToHTML(node, includeImages);
            if (html) parts.push(html);
        }

        return parts.join('\n');
    }

    function buildAIBlock(aiData) {
        const inner = [];
        inner.push('<div class="ai-block"><h2>✨ AI-Generated Notes</h2>');
        if (aiData.summary) {
            inner.push(`<h3>Summary</h3><p>${escapeHTML(aiData.summary)}</p>`);
        }
        if (aiData.keyPoints?.length) {
            inner.push('<h3>Key Points</h3><ul>');
            aiData.keyPoints.forEach((p) => inner.push(`<li>${escapeHTML(p)}</li>`));
            inner.push('</ul>');
        }
        if (aiData.definitions?.length) {
            inner.push('<h3>Key Terms</h3><ul>');
            aiData.definitions.forEach(([term, def]) =>
                inner.push(`<li><strong>${escapeHTML(term)}</strong>: ${escapeHTML(def)}</li>`)
            );
            inner.push('</ul>');
        }
        inner.push('</div>');
        return inner.join('');
    }

    function buildTOC(headings) {
        const items = headings.map((h) => {
            const indent = h.level > 1 ? `style="margin-left:${(h.level - 1) * 14}px"` : '';
            const anchor = slugify(h.text);
            return `<li ${indent}><a href="#${anchor}">${escapeHTML(h.text)}</a></li>`;
        });
        return `<div class="toc"><div class="toc-title">Contents</div><ul>${items.join('')}</ul></div>`;
    }

    function nodeToHTML(node, includeImages) {
        switch (node.type) {
            case 'heading': {
                const tag = `h${node.level}`;
                const id = slugify(node.text);
                return `<${tag} id="${id}">${escapeHTML(node.text)}</${tag}>`;
            }
            case 'paragraph':
                return `<p>${escapeHTML(node.text)}</p>`;
            case 'list': {
                const tag = node.ordered ? 'ol' : 'ul';
                const items = node.items.map((i) => `<li>${escapeHTML(i)}</li>`).join('');
                return `<${tag}>${items}</${tag}>`;
            }
            case 'code':
                return `<pre><code class="language-${node.lang || ''}">${escapeHTML(node.code)}</code></pre>`;
            case 'blockquote':
                return `<blockquote>${escapeHTML(node.text)}</blockquote>`;
            case 'image':
                if (!includeImages) return '';
                return `<img src="${node.src}" alt="${escapeHTML(node.alt || '')}" loading="lazy">`;
            case 'table':
                return buildHTMLTable(node.rows);
            case 'hr':
                return '<hr>';
            default:
                return '';
        }
    }

    function buildHTMLTable(rows) {
        if (!rows?.length) return '';
        const header = rows[0].map((c) => `<th>${escapeHTML(c)}</th>`).join('');
        const body = rows.slice(1).map(
            (row) => `<tr>${row.map((c) => `<td>${escapeHTML(c)}</td>`).join('')}</tr>`
        ).join('');
        return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
    }

    // ── Print window ──────────────────────────────────────────────────────────
    function openPrintWindow(html, title) {
        const printWin = window.open('', '_blank', 'width=900,height=700');
        if (!printWin) {
            alert('WebScribe: Please allow popups for this site to export PDF.');
            return;
        }
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        printWin.document.title = title + ' – WebScribe';
    }

    // ── Utilities ─────────────────────────────────────────────────────────────
    function slugify(text) {
        return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    }

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    return { generate };
})();

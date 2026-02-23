// WebScribe AI Assistant (Local Heuristics – No API Key Required)
// Produces summary, key points, and definitions from the structured content model.

const AIAssistant = (() => {
    'use strict';

    // Signal words that indicate important sentences
    const SIGNAL_WORDS = [
        'important', 'key', 'note that', 'remember', 'definition',
        'defined as', 'refers to', 'means that', 'is called', 'known as',
        'in summary', 'to summarize', 'in conclusion', 'therefore',
        'the goal', 'the purpose', 'the main', 'this allows', 'this means',
        'step 1', 'step 2', 'first,', 'second,', 'finally,', 'however',
    ];

    function analyze(nodes) {
        const paragraphs = nodes
            .filter((n) => n.type === 'paragraph')
            .map((n) => n.text.trim())
            .filter((t) => t.length > 60);

        const summary = buildSummary(paragraphs);
        const keyPoints = extractKeyPoints(paragraphs);
        const definitions = extractDefinitions(nodes);

        return { summary, keyPoints, definitions };
    }

    // ── Summary: first 2–3 substantial paragraphs ────────────────────────────
    function buildSummary(paragraphs) {
        const selected = [];
        for (const p of paragraphs) {
            if (selected.length >= 2) break;
            if (p.length > 80) selected.push(p);
        }
        return selected.join(' ').slice(0, 600) + (selected.join(' ').length > 600 ? '…' : '');
    }

    // ── Key points: sentences matching signal words ───────────────────────────
    function extractKeyPoints(paragraphs) {
        const points = new Set();

        for (const p of paragraphs) {
            // Split paragraph into sentences
            const sentences = p.match(/[^.!?]*[.!?]/g) || [p];
            for (const sentence of sentences) {
                const lower = sentence.toLowerCase();
                if (SIGNAL_WORDS.some((w) => lower.includes(w))) {
                    const clean = sentence.trim();
                    if (clean.length > 20 && clean.length < 300) {
                        points.add(clean);
                    }
                }
                if (points.size >= 8) break;
            }
            if (points.size >= 8) break;
        }

        return [...points];
    }

    // ── Definitions: bold terms + abbr/dfn elements ──────────────────────────
    function extractDefinitions(nodes) {
        const defs = [];

        for (const node of nodes) {
            if (node.type !== 'paragraph' || !node.html) continue;

            // Find <strong>/<b> term followed by definition text
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${node.html}</div>`, 'text/html');

            // <dfn> elements
            doc.querySelectorAll('dfn').forEach((el) => {
                const term = el.textContent.trim();
                const parent = el.parentElement?.textContent.trim() || '';
                if (term && parent.length > term.length) {
                    defs.push([term, parent.replace(term, '').replace(/^[:–—\s]+/, '').slice(0, 200)]);
                }
            });

            // <abbr title="..."> elements
            doc.querySelectorAll('abbr[title]').forEach((el) => {
                const abbr = el.textContent.trim();
                const title = el.getAttribute('title');
                if (abbr && title) defs.push([abbr, title]);
            });

            // Bold term at start of sentence: "**Term** — definition..."
            const boldPattern = /<(strong|b)>([^<]{2,40})<\/\1>/gi;
            let m;
            while ((m = boldPattern.exec(node.html)) !== null) {
                const term = m[2].trim();
                if (/^[A-Z]/.test(term) || term.split(' ').length <= 4) {
                    const after = node.html.slice(boldPattern.lastIndex).replace(/<[^>]+>/g, '').trim();
                    const def = after.split(/[.!?]/)[0].replace(/^[:–—\s]+/, '').trim();
                    if (def.length > 10) defs.push([term, def]);
                }
            }

            if (defs.length >= 10) break;
        }

        // Deduplicate by term
        const seen = new Set();
        return defs.filter(([term]) => {
            if (seen.has(term)) return false;
            seen.add(term);
            return true;
        }).slice(0, 10);
    }

    return { analyze };
})();

// WebScribe Content Script — v3 (Direct DOM Walk)
// Reads the live rendered DOM directly. No cloning. No tricks.
// This is exactly equivalent to reading the Elements panel in DevTools.

(function () {
    'use strict';

    // Double-injection guard
    if (window.__webscribeLoaded) {
        // Already loaded — re-register listener in case previous one is stale
        window.__webscribeLoaded = true;
    }
    window.__webscribeLoaded = true;

    // ── Tags that are always noise ────────────────────────────────────────────
    const NOISE_TAGS = new Set([
        'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
        'nav', 'header', 'footer', 'aside', 'form',
    ]);

    // ── Class/ID fragments that indicate noise ────────────────────────────────
    const NOISE_PATTERNS = [
        'nav', 'menu', 'header', 'footer', 'sidebar', 'side-bar',
        'ad-', '-ad', 'advert', 'banner', 'promo', 'promotion',
        'cookie', 'gdpr', 'consent', 'popup', 'modal', 'overlay',
        'newsletter', 'subscribe', 'signup', 'sign-up',
        'comment', 'disqus', 'share', 'social', 'tweet', 'facebook',
        'related', 'recommend', 'suggested', 'more-article',
        'widget', 'toolbar', 'breadcrumb', 'pagination', 'pager',
        'toc-float', 'sticky', 'fixed-', 'back-to-top',
    ];

    chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
        if (message.type === 'DO_EXTRACT') {
            console.log('[WebScribe] Extraction triggered');
            try {
                const result = extractContent();
                console.log('[WebScribe] Extracted nodes:', result.nodes.length);
                sendResponse({ success: true, ...result });
            } catch (err) {
                console.error('[WebScribe] Extraction error:', err);
                sendResponse({ success: false, error: err.message });
            }
            return true;
        }
        return false;
    });

    // ── Main ──────────────────────────────────────────────────────────────────
    function extractContent() {
        const metadata = buildMetadata();
        const root = findContentRoot();
        console.log('[WebScribe] Content root:', root.tagName, root.id || root.className);

        const nodes = [];
        walkDOM(root, nodes, 0);

        // If Readability is available as an enhancement, use it to pick a better root
        // but only if our direct walk produced too little
        if (nodes.length < 3 && typeof Readability !== 'undefined') {
            try {
                const docClone = document.cloneNode(true);
                const article = new Readability(docClone).parse();
                if (article && article.content) {
                    const parser = new DOMParser();
                    const parsed = parser.parseFromString(article.content, 'text/html');
                    metadata.title = article.title || metadata.title;
                    const readNodes = [];
                    walkDOM(parsed.body, readNodes, 0);
                    if (readNodes.length > nodes.length) return { metadata, nodes: readNodes };
                }
            } catch (_) { /* Readability failed, use what we have */ }
        }

        // Ultimate fallback: grab all visible text
        if (nodes.length === 0) {
            console.warn('[WebScribe] No structured nodes found, using innerText fallback');
            const text = document.body.innerText || '';
            text.split(/\n{2,}/).forEach(function (block) {
                const t = block.trim();
                if (t.length > 15) nodes.push({ type: 'paragraph', text: t });
            });
        }

        return { metadata, nodes };
    }

    // ── Build metadata from page ───────────────────────────────────────────────
    function buildMetadata() {
        const ogTitle = getMetaContent('og:title');
        const ogDesc = getMetaContent('og:description') || getMetaContent('description');
        return {
            title: ogTitle || document.title || 'Untitled',
            url: location.href,
            date: new Date().toISOString().slice(0, 10),
            description: ogDesc || '',
        };
    }

    function getMetaContent(name) {
        const el = document.querySelector(
            'meta[name="' + name + '"], meta[property="' + name + '"]'
        );
        return el ? (el.getAttribute('content') || '') : '';
    }

    // ── Find the best content root element ────────────────────────────────────
    function findContentRoot() {
        // List of selectors from most to least specific
        const selectors = [
            'article[class*="content"]', 'article[class*="post"]', 'article[class*="article"]',
            'article', '[role="main"] article', '[role="article"]',
            'main article', 'main', '[role="main"]',
            '.post-content', '.post-body', '.post__content',
            '.article-content', '.article-body', '.article__body',
            '.entry-content', '.entry-body',
            '.content-body', '.page-content', '.page-body',
            '.main-content', '.main__content',
            '.markdown-body', '.prose', '.rich-text',
            '.blog-content', '.blog-post', '.blog__content',
            '.story-body', '.story__body',
            '.text-content', '.body-content',
            '#article-body', '#post-body', '#content-body',
            '#main-content', '#article', '#post',
            '.container > article', 'section > article',
        ];

        let best = null;
        let bestScore = -1;

        for (let i = 0; i < selectors.length; i++) {
            const el = document.querySelector(selectors[i]);
            if (el && isVisible(el)) {
                const score = scoreElement(el);
                if (score > bestScore) {
                    bestScore = score;
                    best = el;
                }
            }
        }

        // If specific selectors didn't work, scan all large elements
        if (!best || bestScore < 200) {
            const candidates = document.querySelectorAll(
                'div, section, article, main'
            );
            for (let i = 0; i < candidates.length; i++) {
                const el = candidates[i];
                if (!isVisible(el)) continue;
                if (isNoisy(el)) continue;
                const score = scoreElement(el);
                if (score > bestScore) {
                    bestScore = score;
                    best = el;
                }
            }
        }

        return best || document.body;
    }

    // ── Score element by text density ─────────────────────────────────────────
    function scoreElement(el) {
        const allText = el.innerText || '';
        const totalLen = allText.trim().length;
        if (totalLen < 100) return 0;

        // Penalize link-heavy elements (navigation)
        const links = el.querySelectorAll('a');
        let linkTextLen = 0;
        for (let i = 0; i < links.length; i++) {
            linkTextLen += (links[i].innerText || '').length;
        }
        const linkRatio = linkTextLen / (totalLen || 1);
        if (linkRatio > 0.6) return 0;

        // Reward structural content (headings + paragraphs + code)
        const structural = el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, pre, blockquote, li').length;

        return Math.round(totalLen * (1 - linkRatio)) + (structural * 40);
    }

    // ── Recursively walk DOM and build content model ───────────────────────────
    function walkDOM(root, nodes, depth) {
        if (!root || !root.children) return;
        if (depth > 20) return; // safety limit

        const children = root.children;
        for (let i = 0; i < children.length; i++) {
            const el = children[i];
            const tag = (el.tagName || '').toLowerCase();

            // Always skip these tags
            if (NOISE_TAGS.has(tag)) continue;

            // Skip noisy containers
            if (isNoisy(el)) continue;

            // Skip invisible elements
            if (!isVisible(el)) continue;

            // ── Process by element type ────────────────────────────────────
            if (/^h[1-6]$/.test(tag)) {
                const text = getInnerText(el);
                if (text && text.length > 1) {
                    nodes.push({ type: 'heading', level: parseInt(tag[1]), text: text });
                }
                continue; // don't recurse into headings
            }

            if (tag === 'p') {
                const text = getInnerText(el);
                if (text && text.length > 5) {
                    nodes.push({ type: 'paragraph', text: text, html: el.innerHTML });
                }
                continue;
            }

            if (tag === 'pre') {
                const codeEl = el.querySelector('code') || el;
                const lang = detectCodeLang(codeEl);
                const code = codeEl.innerText || codeEl.textContent || '';
                if (code.trim()) {
                    nodes.push({ type: 'code', lang: lang, code: code.trim() });
                }
                continue;
            }

            if (tag === 'code' && !el.closest('pre')) {
                // Standalone code block outside pre
                const code = el.innerText || el.textContent || '';
                if (code.trim().length > 30) {
                    nodes.push({ type: 'code', lang: 'code', code: code.trim() });
                }
                continue;
            }

            if (tag === 'blockquote') {
                const text = getInnerText(el);
                if (text) nodes.push({ type: 'blockquote', text: text });
                continue;
            }

            if (tag === 'ul' || tag === 'ol') {
                const items = [];
                const lis = el.querySelectorAll(':scope > li');
                for (let j = 0; j < lis.length; j++) {
                    const t = getInnerText(lis[j]);
                    if (t) items.push(t);
                }
                if (items.length) {
                    nodes.push({ type: 'list', ordered: tag === 'ol', items: items });
                }
                continue;
            }

            if (tag === 'table') {
                const rows = extractTable(el);
                if (rows.length > 1) {
                    nodes.push({ type: 'table', rows: rows });
                }
                continue;
            }

            if (tag === 'hr') {
                nodes.push({ type: 'hr' });
                continue;
            }

            if (tag === 'img' || tag === 'figure') {
                const img = tag === 'img' ? el : el.querySelector('img');
                if (img) {
                    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
                    const alt = img.getAttribute('alt') || getInnerText(el.querySelector('figcaption')) || '';
                    if (src && !src.startsWith('data:') && src.trim()) {
                        nodes.push({ type: 'image', src: toAbsURL(src), alt: alt });
                    }
                }
                continue;
            }

            // Container — recurse in
            walkDOM(el, nodes, depth + 1);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function isVisible(el) {
        if (!el) return false;
        try {
            const s = window.getComputedStyle(el);
            if (s.display === 'none') return false;
            if (s.visibility === 'hidden') return false;
            if (parseFloat(s.opacity) < 0.01) return false;
        } catch (_) { /* best effort */ }
        return true;
    }

    function isNoisy(el) {
        const tag = (el.tagName || '').toLowerCase();
        if (NOISE_TAGS.has(tag)) return true;

        const cls = ((el.className || '') + '').toLowerCase();
        const id = ((el.id || '') + '').toLowerCase();
        const combined = cls + ' ' + id;

        for (let i = 0; i < NOISE_PATTERNS.length; i++) {
            if (combined.includes(NOISE_PATTERNS[i])) return true;
        }

        // Also check role
        const role = (el.getAttribute('role') || '').toLowerCase();
        if (['navigation', 'banner', 'complementary', 'contentinfo'].includes(role)) return true;

        return false;
    }

    function getInnerText(el) {
        if (!el) return '';
        return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    }

    function detectCodeLang(el) {
        if (!el) return '';
        const classes = (el.className || '').split(/\s+/);
        for (let i = 0; i < classes.length; i++) {
            const m = classes[i].match(/^language-(.+)$/) || classes[i].match(/^lang-(.+)$/);
            if (m) return m[1];
        }
        // Check data attributes
        return el.getAttribute('data-language') || el.getAttribute('data-lang') || '';
    }

    function extractTable(tableEl) {
        const rows = [];
        const trs = tableEl.querySelectorAll('tr');
        for (let i = 0; i < trs.length; i++) {
            const cells = trs[i].querySelectorAll('th, td');
            const row = [];
            for (let j = 0; j < cells.length; j++) {
                row.push(getInnerText(cells[j]));
            }
            if (row.some(function (c) { return c.length > 0; })) rows.push(row);
        }
        return rows;
    }

    function toAbsURL(url) {
        try { return new URL(url, document.baseURI).href; }
        catch (_) { return url; }
    }

})();

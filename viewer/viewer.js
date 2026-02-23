// WebScribe Viewer — reads extracted content from chrome.storage.local and renders PDF-ready HTML

function escH(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function slugify(text) {
    return String(text).toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-').trim();
}

// ── Render ────────────────────────────────────────────────────────────────────
function buildPageHTML(data) {
    var metadata = data.metadata;
    var nodes = data.nodes;
    var options = data.options || {};
    var parts = [];

    // Header
    parts.push(
        '<div class="doc-header">' +
        '<div class="doc-badge">WebScribe Notes</div>' +
        '<div class="doc-title">' + escH(metadata.title) + '</div>' +
        '<div class="doc-meta">Source: <a href="' + escH(metadata.url) + '">' + escH(metadata.url.slice(0, 80)) + '</a>&nbsp;·&nbsp;' + escH(metadata.date) + '</div>' +
        '</div>'
    );

    // AI block
    if (options.includeAI && options.aiData) {
        parts.push(buildAIBlock(options.aiData));
    }

    // TOC
    var headings = nodes.filter(function (n) { return n.type === 'heading'; });
    if (options.includeTOC && headings.length > 2) {
        parts.push(buildTOC(headings));
    }

    // Nodes
    nodes.forEach(function (node) {
        var html = nodeToHTML(node, options.includeImages !== false);
        if (html) parts.push(html);
    });

    // Footer
    parts.push(
        '<div class="source-footer">Saved with WebScribe · ' + escH(metadata.date) +
        ' · <a href="' + escH(metadata.url) + '">' + escH(metadata.title) + '</a></div>'
    );

    return parts.join('\n');
}

function buildAIBlock(ai) {
    var h = '<div class="ai-block"><h2>✨ AI-Generated Notes</h2>';
    if (ai.summary) h += '<h3>Summary</h3><p>' + escH(ai.summary) + '</p>';
    if (ai.keyPoints && ai.keyPoints.length) {
        h += '<h3>Key Points</h3><ul>';
        ai.keyPoints.forEach(function (p) { h += '<li>' + escH(p) + '</li>'; });
        h += '</ul>';
    }
    if (ai.definitions && ai.definitions.length) {
        h += '<h3>Key Terms</h3><ul>';
        ai.definitions.forEach(function (d) {
            h += '<li><strong>' + escH(d[0]) + '</strong>: ' + escH(d[1]) + '</li>';
        });
        h += '</ul>';
    }
    return h + '</div>';
}

function buildTOC(headings) {
    var h = '<div class="toc"><div class="toc-label">Contents</div>';
    headings.forEach(function (heading) {
        var indent = 'margin-left:' + ((heading.level - 1) * 16) + 'px';
        var id = slugify(heading.text);
        h += '<a class="toc-item" href="#' + id + '" style="' + indent + '">' + escH(heading.text) + '</a>';
    });
    return h + '</div>';
}

function nodeToHTML(node, includeImages) {
    switch (node.type) {
        case 'heading': {
            var tag = 'h' + node.level;
            var id = slugify(node.text);
            return '<' + tag + ' id="' + id + '">' + escH(node.text) + '</' + tag + '>';
        }
        case 'paragraph':
            return '<p>' + escH(node.text) + '</p>';
        case 'list': {
            var ltag = node.ordered ? 'ol' : 'ul';
            var items = node.items.map(function (i) { return '<li>' + escH(i) + '</li>'; }).join('');
            return '<' + ltag + '>' + items + '</' + ltag + '>';
        }
        case 'code':
            return '<pre><code>' + escH(node.code) + '</code></pre>';
        case 'blockquote':
            return '<blockquote>' + escH(node.text) + '</blockquote>';
        case 'image':
            if (!includeImages) return '';
            return '<img src="' + escH(node.src) + '" alt="' + escH(node.alt || '') + '">';
        case 'table':
            return buildTable(node.rows);
        case 'hr':
            return '<hr>';
        default:
            return '';
    }
}

function buildTable(rows) {
    if (!rows || !rows.length) return '';
    var h = '<table><thead><tr>';
    rows[0].forEach(function (c) { h += '<th>' + escH(c) + '</th>'; });
    h += '</tr></thead><tbody>';
    rows.slice(1).forEach(function (row) {
        h += '<tr>';
        row.forEach(function (c) { h += '<td>' + escH(c) + '</td>'; });
        h += '</tr>';
    });
    return h + '</tbody></table>';
}

// ── Boot: load from storage ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.local.get('webscribe_data', function (result) {
        var data = result && result.webscribe_data;
        var page = document.getElementById('page');

        if (!data || !data.nodes || data.nodes.length === 0) {
            page.innerHTML =
                '<div class="state-box">' +
                '<h2>⚠️ No content loaded</h2>' +
                '<p>Close this tab, go back to the page you want to save, and click the WebScribe icon again.</p>' +
                '</div>';
            return;
        }

        page.innerHTML = buildPageHTML(data);

        // Clean up storage after render
        chrome.storage.local.remove('webscribe_data');
    });
});

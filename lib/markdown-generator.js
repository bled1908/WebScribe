// WebScribe Markdown Generator
// Converts the structured content model into clean, Obsidian-ready Markdown.

const MarkdownGenerator = (() => {
    'use strict';

    function generate(data, options = {}) {
        const { metadata, nodes } = data;
        const { includeAI = false, aiData = null, includeTOC = true, includeImages = true } = options;

        const parts = [];

        // ── Frontmatter ────────────────────────────────────────────────────────
        parts.push(buildFrontmatter(metadata));

        // ── AI Summary block (optional) ────────────────────────────────────────
        if (includeAI && aiData) {
            parts.push(buildAIBlock(aiData));
        }

        // ── Table of Contents ──────────────────────────────────────────────────
        const headings = nodes.filter((n) => n.type === 'heading');
        if (includeTOC && headings.length > 1) {
            parts.push(buildTOC(headings));
        }

        // ── Main content ───────────────────────────────────────────────────────
        for (const node of nodes) {
            const md = nodeToMarkdown(node, includeImages);
            if (md) parts.push(md);
        }

        // ── Source footer ──────────────────────────────────────────────────────
        parts.push(`\n---\n*Source: [${escapeMarkdown(metadata.title)}](${metadata.url})*  \n*Saved with WebScribe on ${metadata.date}*`);

        return parts.join('\n');
    }

    // ── Frontmatter ──────────────────────────────────────────────────────────
    function buildFrontmatter(meta) {
        const lines = ['---'];
        lines.push(`title: "${escapeFrontmatter(meta.title)}"`);
        lines.push(`source: "${meta.url}"`);
        lines.push(`date: ${meta.date}`);
        if (meta.description) lines.push(`description: "${escapeFrontmatter(meta.description)}"`);
        lines.push('tags: [webscribe]');
        lines.push('---');
        return lines.join('\n');
    }

    // ── AI Block ─────────────────────────────────────────────────────────────
    function buildAIBlock(aiData) {
        const parts = ['\n## ✨ AI-Generated Notes\n'];
        if (aiData.summary) {
            parts.push('### Summary\n');
            parts.push(aiData.summary + '\n');
        }
        if (aiData.keyPoints && aiData.keyPoints.length) {
            parts.push('### Key Points\n');
            aiData.keyPoints.forEach((pt) => parts.push(`- ${pt}`));
            parts.push('');
        }
        if (aiData.definitions && aiData.definitions.length) {
            parts.push('### Key Terms\n');
            aiData.definitions.forEach(([term, def]) => parts.push(`**${term}**: ${def}`));
            parts.push('');
        }
        parts.push('---\n');
        return parts.join('\n');
    }

    // ── Table of Contents ─────────────────────────────────────────────────────
    function buildTOC(headings) {
        const lines = ['\n## Contents\n'];
        headings.forEach((h) => {
            const indent = '  '.repeat(Math.max(0, h.level - 1));
            const anchor = slugify(h.text);
            lines.push(`${indent}- [${h.text}](#${anchor})`);
        });
        lines.push('');
        return lines.join('\n');
    }

    // ── Node → Markdown ───────────────────────────────────────────────────────
    function nodeToMarkdown(node, includeImages) {
        switch (node.type) {
            case 'heading': {
                const hashes = '#'.repeat(node.level);
                return `\n${hashes} ${node.text}\n`;
            }

            case 'paragraph': {
                const clean = cleanText(node.text);
                return clean ? `\n${clean}\n` : null;
            }

            case 'list': {
                const lines = node.items.map((item, i) =>
                    node.ordered ? `${i + 1}. ${cleanText(item)}` : `- ${cleanText(item)}`
                );
                return '\n' + lines.join('\n') + '\n';
            }

            case 'code': {
                const lang = node.lang || '';
                return `\n\`\`\`${lang}\n${node.code}\n\`\`\`\n`;
            }

            case 'blockquote': {
                const lines = node.text.split('\n').map((l) => `> ${l}`);
                return '\n' + lines.join('\n') + '\n';
            }

            case 'image': {
                if (!includeImages) return null;
                return `\n![${node.alt || 'image'}](${node.src})\n`;
            }

            case 'table': {
                return buildMarkdownTable(node.rows);
            }

            case 'hr': {
                return '\n---\n';
            }

            default:
                return null;
        }
    }

    // ── Table builder ─────────────────────────────────────────────────────────
    function buildMarkdownTable(rows) {
        if (!rows || rows.length === 0) return null;
        const header = rows[0];
        const separator = header.map(() => '---');
        const body = rows.slice(1);

        const lines = [
            '| ' + header.join(' | ') + ' |',
            '| ' + separator.join(' | ') + ' |',
            ...body.map((row) => '| ' + row.join(' | ') + ' |'),
        ];
        return '\n' + lines.join('\n') + '\n';
    }

    // ── Utility ───────────────────────────────────────────────────────────────
    function slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    function cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .trim();
    }

    function escapeMarkdown(text) {
        return text.replace(/["\\]/g, '\\$&');
    }

    function escapeFrontmatter(text) {
        return text.replace(/"/g, '\\"').replace(/\n/g, ' ');
    }

    return { generate };
})();

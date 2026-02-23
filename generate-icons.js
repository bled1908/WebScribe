// generate-icons.js
// Run once with Node.js (or open in browser) to generate PNG icons for the extension.
// Usage: node generate-icons.js   (requires 'canvas' npm package)
// OR: open generate-icons.html in Chrome to generate icons via browser canvas

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

sizes.forEach((size) => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    const bgRadius = size * 0.22;
    ctx.beginPath();
    roundRect(ctx, 0, 0, size, size, bgRadius);
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, '#1e1b4b');
    bgGrad.addColorStop(1, '#13162a');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Subtle inner glow
    const glowGrad = ctx.createRadialGradient(size * 0.3, size * 0.25, 0, size * 0.5, size * 0.5, size * 0.7);
    glowGrad.addColorStop(0, 'rgba(129,140,248,0.25)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Stack of layers (layered pages icon)
    const cx = size / 2;
    const cy = size / 2;
    const layerGrad = ctx.createLinearGradient(0, 0, size, size);
    layerGrad.addColorStop(0, '#818cf8');
    layerGrad.addColorStop(1, '#a78bfa');

    const w = size * 0.58;
    const h = size * 0.16;
    const gap = size * 0.13;

    [-gap, 0, gap].forEach((offset, i) => {
        const alpha = i === 1 ? 1 : 0.55;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.ellipse(cx, cy + offset, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = layerGrad;
        ctx.fill();
    });

    ctx.globalAlpha = 1;

    // Write out PNG
    const buf = canvas.toBuffer('image/png');
    const outPath = path.join(__dirname, 'assets', `icon${size}.png`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buf);
    console.log(`✓ icon${size}.png (${size}×${size})`);
});

function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

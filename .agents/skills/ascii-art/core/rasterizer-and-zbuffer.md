# Core: Rasterizer & Depth (Z-Buffer) Engine

Whether rendering 3D polyhedra, isometric architectural complexes, or multi-layered landscapes, objects must properly occlude one another. This module provides the universal 2D/3D depth buffer engine and canvas/terminal rasterizers.

---

## 1. The Unified AsciiRasterizer (With Z-Buffer)

The Z-Buffer stores the depth of every character cell. A incoming character is drawn if and only if its depth is closer to the viewer than the existing depth in that cell:

```javascript
class AsciiRasterizer {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.chars = Array.from({ length: rows }, () => Array(cols).fill(' '));
    this.colors = Array.from({ length: rows }, () => Array(cols).fill(null));
    this.zBuffer = Array.from({ length: rows }, () => Array(cols).fill(-Infinity));
  }

  clear(bgChar = ' ', bgRgb = null) {
    for (let r = 0; r < this.rows; r++) {
      this.chars[r].fill(bgChar);
      this.colors[r].fill(bgRgb);
      this.zBuffer[r].fill(-Infinity);
    }
  }

  // Draw a single character with depth testing
  set(x, y, z, char, rgb = null) {
    const col = Math.floor(x);
    const row = Math.floor(y);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;

    // Depth test: higher z is closer to the camera
    if (z > this.zBuffer[row][col]) {
      this.chars[row][col] = char;
      this.colors[row][col] = rgb;
      this.zBuffer[row][col] = z;
    }
  }

  // 3D Bresenham line rasterization with depth interpolation
  drawLine3D(x0, y0, z0, x1, y1, z1, char = null, rgb = null) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 1.5));
    const angle = Math.atan2(dy, dx);

    // Auto-select directional character if char not specified
    let stroke = char;
    if (!stroke) {
      const deg = ((angle * 180 / Math.PI) % 180 + 180) % 180;
      if (deg >= 22.5 && deg < 67.5) stroke = '/';
      else if (deg >= 67.5 && deg < 112.5) stroke = '|';
      else if (deg >= 112.5 && deg < 157.5) stroke = '\\';
      else stroke = '-';
    }

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.set(x0 + dx * t, y0 + dy * t, z0 + dz * t, stroke, rgb);
    }
  }

  // Scanline flat or shaded triangle rasterization
  drawTriangle3D(p1, p2, p3, char, rgb) {
    // Sort vertices by y (p1 top, p2 mid, p3 bottom)
    const pts = [p1, p2, p3].sort((a, b) => a.y - b.y);
    const [v1, v2, v3] = pts;

    const interpolate = (y1, y2, v1, v2, y) => {
      if (y1 === y2) return v1;
      return v1 + (v2 - v1) * ((y - y1) / (y2 - y1));
    };

    const minY = Math.max(0, Math.floor(v1.y));
    const maxY = Math.min(this.rows - 1, Math.floor(v3.y));

    for (let y = minY; y <= maxY; y++) {
      // Find left and right x bounds at current scanline y
      const xA = (y < v2.y) ? interpolate(v1.y, v2.y, v1.x, v2.x, y) : interpolate(v2.y, v3.y, v2.x, v3.x, y);
      const xB = interpolate(v1.y, v3.y, v1.x, v3.x, y);
      const zA = (y < v2.y) ? interpolate(v1.y, v2.y, v1.z, v2.z, y) : interpolate(v2.y, v3.y, v2.z, v3.z, y);
      const zB = interpolate(v1.y, v3.y, v1.z, v3.z, y);

      const minX = Math.max(0, Math.floor(Math.min(xA, xB)));
      const maxX = Math.min(this.cols - 1, Math.floor(Math.max(xA, xB)));

      for (let x = minX; x <= maxX; x++) {
        const t = (minX === maxX) ? 0 : (x - minX) / (maxX - minX);
        const z = zA + (zB - zA) * t;
        this.set(x, y, z, char, rgb);
      }
    }
  }

  // Output ANSI 24-bit string for terminal stdout
  renderToString() {
    let out = '';
    for (let r = 0; r < this.rows; r++) {
      let activeColor = null;
      for (let c = 0; c < this.cols; c++) {
        const char = this.chars[r][c];
        const rgb = this.colors[r][c];
        if (rgb && activeColor !== rgb) {
          out += `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
          activeColor = rgb;
        } else if (!rgb && activeColor) {
          out += '\x1b[0m';
          activeColor = null;
        }
        out += char;
      }
      if (activeColor) out += '\x1b[0m';
      out += '\n';
    }
    return out;
  }
}
```

---

## 2. Canvas Subpixel Vector Pipeline

When rendering on an HTML5 Canvas, characters are treated as vector sprites rendered with arbitrary rotation $\theta$:

```javascript
function renderRotatedChar(ctx, char, x, y, angleRad, color, fontSize = 14) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);
  ctx.font = `bold ${fontSize}px "JetBrains Mono", Consolas, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, 0, 0);
  ctx.restore();
}
```

### Dual-Pass Hardware Screen-Space Bloom
Produce glowing phosphor monitors or luminous architectural lamps using canvas blur composite passes:

```javascript
function renderWithBloomPass(ctx, width, height, renderPrimitives) {
  // Clear scene
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, width, height);

  // Pass 1: Diffuse glow underlay
  ctx.save();
  ctx.filter = 'blur(6px)';
  ctx.globalAlpha = 0.40;
  renderPrimitives(ctx);
  ctx.restore();

  // Pass 2: Crisp sharp foreground
  ctx.save();
  ctx.globalAlpha = 1.0;
  renderPrimitives(ctx);
  ctx.restore();
}
```

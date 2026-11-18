# Rendering Pipeline: Hardware Bloom & Terminal Buffers

This reference covers the dual implementation paradigms for procedural ASCII graphics:
1. **HTML5 Canvas Pipeline**: Hardware-accelerated subpixel rotation, screen-space bloom, and mobile high-DPI scaling.
2. **Terminal String Grid Pipeline**: Spatial 2D text buffer rasterization, aspect ratio compensation, and ANSI 24-bit color output.

---

## Part 1: HTML5 Canvas Pipeline

### 1. Canvas Setup & High-DPI Mobile Scaling
Modern phone displays feature $3\times$ retina pixel densities. Rendering large canvases at native $3\times$ resolution causes GPU fillrate throttling. Clamp device pixel ratio to $2.0$:

```javascript
function resizeCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2.0, window.devicePixelRatio || 1);
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  // Set logical coordinate scale
  ctx.scale(dpr, dpr);
  canvas.cssWidth = rect.width;
  canvas.cssHeight = rect.height;
}
```

### 2. Rotated Glyph Emission
Every character is rendered as a standalone geometric entity centered at $(x, y)$ rotated by angle $\theta$:

```javascript
function drawGlyph(ctx, char, x, y, angle, color, fontSize = 14) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `bold ${fontSize}px "JetBrains Mono", Consolas, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, 0, 0);
  ctx.restore();
}
```

### 3. Screen-Space Hardware Bloom Pass
ASCII characters achieve a vibrant neon phosphor glow using native Canvas 2D filters:

```javascript
function renderScene(ctx, width, height, drawPrimitives) {
  // Clear canvas
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, width, height);

  // PASS 1: Subtle Diffuse Bloom Layer
  ctx.save();
  ctx.filter = 'blur(6px)';
  ctx.globalAlpha = 0.40;
  drawPrimitives(ctx); // Render all stems, petals, leaves
  ctx.restore();

  // PASS 2: Sharp Crisp Foreground Layer
  ctx.save();
  ctx.globalAlpha = 1.0;
  drawPrimitives(ctx); // Render identical glyphs sharp on top
  ctx.restore();
}
```

### 4. Touch & Pointer Optimization
To support touch drag, seed sowing, and dandelion blowing without triggering mobile browser pull-to-refresh or page panning:
```css
canvas {
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}
```

---

## Part 2: Terminal String Grid Pipeline (Zero DOM)

When targeting CLI tools, Node.js scripts, terminal dashboards, or markdown blocks, render onto an in-memory 2D character buffer.

### 1. Terminal Aspect Ratio Compensation
Terminal monospace characters are typically twice as tall as they are wide ($1:2$ width-to-height ratio). If world coordinates assume square pixels, circles will render squashed.

Multiply horizontal world coordinates by $2.0$:
$$x_{\text{grid}} = \lfloor x_{\text{world}} \times 2.0 \rfloor, \quad y_{\text{grid}} = \lfloor y_{\text{world}} \rfloor$$

### 2. The 2D Text Grid Buffer

```javascript
class AsciiGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.charGrid = Array.from({ length: rows }, () => Array(cols).fill(' '));
    this.colorGrid = Array.from({ length: rows }, () => Array(cols).fill(null));
    this.depthGrid = Array.from({ length: rows }, () => Array(cols).fill(-Infinity));
  }

  set(col, row, char, color = null, depth = 0) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    // Painter's algorithm: higher depth overwrites lower depth
    if (depth >= this.depthGrid[row][col]) {
      this.charGrid[row][col] = char;
      this.colorGrid[row][col] = color;
      this.depthGrid[row][col] = depth;
    }
  }

  // Draw line via Bresenham algorithm with directional character selection
  drawLine(x0, y0, x1, y1, color = null, depth = 0) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    // Pick character based on slope
    let stroke = '|';
    if (dx > 2 * dy) stroke = '-';
    else if (dy > 2 * dx) stroke = '|';
    else stroke = (sx * sy > 0) ? '\\' : '/';

    let cx = x0;
    let cy = y0;
    while (true) {
      this.set(cx, cy, stroke, color, depth);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
  }

  // Serialize to ANSI colored string for terminal stdout
  toString(useAnsiColors = true) {
    let out = '';
    for (let r = 0; r < this.rows; r++) {
      let lastColor = null;
      for (let c = 0; c < this.cols; c++) {
        const char = this.charGrid[r][c];
        const color = this.colorGrid[r][c];
        if (useAnsiColors) {
          if (color !== lastColor) {
            if (color) {
              out += `\x1b[38;2;${color.r};${color.g};${color.b}m`;
            } else {
              out += '\x1b[0m';
            }
            lastColor = color;
          }
        }
        out += char;
      }
      if (useAnsiColors && lastColor) out += '\x1b[0m';
      out += '\n';
    }
    return out;
  }
}
```

---

## Part 3: Chromatic Palette Engineering

Colors breathe life into monochrome glyphs. Maintain separate palettes for vegetative stems, petals, and senescent tissue:

```javascript
const PALETTES = {
  botanical: {
    stemBase: '#2e7d32',   // Mature lignified green
    stemApex: '#55e64b',   // Bright young shoot green
    leaf: '#4caf50',       // Vibrant foliage green
    bud: '#8bc34a',        // Unopened calyx
    petal: '#ffd54f',      // Sunlit anthesis gold
    disc: '#ff8f00',       // Deep amber seed center
    senescence: '#795548'  // Autumn brown / withered
  },
  neonCyber: {
    stemBase: '#00b0ff',
    stemApex: '#00e5ff',
    leaf: '#1de9b6',
    bud: '#00e676',
    petal: '#ff007f',
    disc: '#d500f9',
    senescence: '#455a64'
  },
  amberPhosphor: {
    stemBase: '#bf360c',
    stemApex: '#e65100',
    leaf: '#ff6f00',
    bud: '#ff8f00',
    petal: '#ffb300',
    disc: '#ffe082',
    senescence: '#3e2723'
  }
};
```

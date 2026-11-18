#!/usr/bin/env node
/**
 * Procedural Terminal Botany Engine (Zero Dependencies)
 * Generates continuous mathematical ASCII plants directly in terminal stdout.
 * 
 * Usage: node terminal-tree.js [sunflower|rose|dandelion]
 */

const COLS = Math.min(80, process.stdout.columns || 80);
const ROWS = Math.min(32, (process.stdout.rows || 32) - 2);

class TerminalBuffer {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.chars = Array.from({ length: rows }, () => Array(cols).fill(' '));
    this.colors = Array.from({ length: rows }, () => Array(cols).fill(null));
  }

  set(x, y, char, rgb = null) {
    const col = Math.floor(x);
    const row = Math.floor(y);
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.chars[row][col] = char;
      this.colors[row][col] = rgb;
    }
  }

  // Draw continuous smooth stroke using quantized directional characters
  drawSegment(x0, y0, x1, y1, rgb) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist * 2));
    const angle = Math.atan2(dy, dx);

    // Directional character selection
    let char = '|';
    const deg = (angle * 180 / Math.PI + 360) % 180;
    if (deg >= 22.5 && deg < 67.5) char = '/';
    else if (deg >= 67.5 && deg < 112.5) char = '|';
    else if (deg >= 112.5 && deg < 157.5) char = '\\';
    else char = '-';

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.set(x0 + dx * t, y0 + dy * t, char, rgb);
    }
  }

  render() {
    let out = '\n';
    for (let r = 0; r < this.rows; r++) {
      let activeColor = null;
      for (let c = 0; c < this.cols; c++) {
        const char = this.chars[r][c];
        const rgb = this.colors[r][c];
        if (rgb && (activeColor !== rgb)) {
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

function generatePlant(species = 'sunflower') {
  const buf = new TerminalBuffer(COLS, ROWS);
  const groundY = ROWS - 2;
  const centerX = Math.floor(COLS / 2);

  // 1. Draw soil line
  for (let c = 4; c < COLS - 4; c++) {
    const soilChar = (c % 3 === 0) ? '~' : (c % 2 === 0) ? '-' : '.';
    buf.set(c, groundY, soilChar, [85, 139, 47]);
    if (c % 4 === 0) buf.set(c, groundY - 1, 'w', [56, 142, 60]);
  }

  // 2. Generate Stem Spine (Logistic elongation & slight natural curve)
  const stemHeight = Math.floor(ROWS * 0.70);
  const segments = 18;
  const spine = [];
  let prevX = centerX;
  let prevY = groundY;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Terminal aspect ratio correction: 1 row = 2 columns width
    const curveOffset = Math.sin(t * Math.PI * 0.8) * 6;
    const x = centerX + curveOffset;
    const y = groundY - (t * stemHeight);
    spine.push({ x, y });

    if (i > 0) {
      const stemColor = t < 0.3 ? [46, 125, 50] : [85, 230, 75];
      buf.drawSegment(prevX, prevY, x, y, stemColor);
    }
    prevX = x;
    prevY = y;
  }

  // 3. Bilateral Axillary Leaves
  const leafNodes = [Math.floor(segments * 0.3), Math.floor(segments * 0.55), Math.floor(segments * 0.75)];
  leafNodes.forEach((nodeIdx, idx) => {
    const pt = spine[nodeIdx];
    const leafColor = [76, 175, 80];
    const dir = (idx % 2 === 0) ? 1 : -1;

    // Compound curved leaf blade (aspect ratio compensated)
    const lx1 = pt.x + (dir * 3);
    const ly1 = pt.y - 1;
    const lx2 = pt.x + (dir * 7);
    const ly2 = pt.y;

    buf.set(lx1, ly1, dir > 0 ? '{' : '}', leafColor);
    buf.set(lx1 + dir, ly1, '-', leafColor);
    buf.set(lx2, ly2, dir > 0 ? ')' : '(', leafColor);
    buf.set(lx2 + dir, ly2, '~', leafColor);
  });

  // 4. Apical Flower Blossom
  const apex = spine[spine.length - 1];

  // Calyx cup
  buf.set(apex.x - 1, apex.y + 1, '\\', [56, 142, 60]);
  buf.set(apex.x, apex.y + 1, 'v', [56, 142, 60]);
  buf.set(apex.x + 1, apex.y + 1, '/', [56, 142, 60]);

  if (species === 'sunflower') {
    const gold = [255, 190, 40];
    const amber = [255, 160, 0];
    const discColor = [190, 110, 0];

    // Radial ray petals (Aspect ratio scaled: x * 1.8)
    const petals = 16;
    const radiusY = 3.5;
    const radiusX = radiusY * 2.0;

    for (let p = 0; p < petals; p++) {
      const theta = (p / petals) * Math.PI * 2;
      const px = apex.x + Math.cos(theta) * radiusX;
      const py = apex.y + Math.sin(theta) * radiusY;
      const char = (p % 2 === 0) ? '%' : '8';
      buf.set(px, py, char, (p % 4 === 0) ? gold : amber);
    }

    // Dense Bounded Seed Disc Heart
    buf.set(apex.x - 1, apex.y, '#', discColor);
    buf.set(apex.x, apex.y, '*', [255, 230, 80]);
    buf.set(apex.x + 1, apex.y, '#', discColor);
    buf.set(apex.x, apex.y - 1, '&', discColor);
    buf.set(apex.x, apex.y + 1, '&', discColor);

  } else if (species === 'rose') {
    const crimson = [240, 40, 90];
    const ruby = [200, 20, 60];
    const pink = [255, 120, 160];

    // Rosette concentric whorls
    buf.set(apex.x - 2, apex.y - 1, '(', crimson);
    buf.set(apex.x - 1, apex.y - 1, '@', ruby);
    buf.set(apex.x, apex.y - 1, '%', pink);
    buf.set(apex.x + 1, apex.y - 1, '@', ruby);
    buf.set(apex.x + 2, apex.y - 1, ')', crimson);

    buf.set(apex.x - 3, apex.y, '{', pink);
    buf.set(apex.x - 1, apex.y, '#', crimson);
    buf.set(apex.x, apex.y, '8', pink);
    buf.set(apex.x + 1, apex.y, '#', crimson);
    buf.set(apex.x + 3, apex.y, '}', pink);

    buf.set(apex.x - 2, apex.y + 1, '(', crimson);
    buf.set(apex.x - 1, apex.y + 1, '%', ruby);
    buf.set(apex.x, apex.y + 1, 'w', pink);
    buf.set(apex.x + 1, apex.y + 1, '%', ruby);
    buf.set(apex.x + 2, apex.y + 1, ')', crimson);

  } else {
    // Dandelion clock
    const white = [240, 240, 255];
    const gray = [180, 180, 200];
    for (let p = 0; p < 14; p++) {
      const theta = (p / 14) * Math.PI * 2;
      const px = apex.x + Math.cos(theta) * 6;
      const py = apex.y + Math.sin(theta) * 3;
      buf.set(px, py, (p % 2 === 0) ? '✦' : '*', (p % 3 === 0) ? white : gray);
    }
    buf.set(apex.x, apex.y, 'o', [140, 140, 160]);
  }

  return buf.render();
}

const chosenSpecies = process.argv[2] || 'sunflower';
process.stdout.write(`\x1b[2J\x1b[H\x1b[1m✿ PROCEDURAL BOTANICAL ENGINE: ${chosenSpecies.toUpperCase()} ✿\x1b[0m\n`);
process.stdout.write(generatePlant(chosenSpecies));

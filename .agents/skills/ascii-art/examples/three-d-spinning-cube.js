#!/usr/bin/env node
/**
 * Modular 3D ASCII Engine: Shaded Rotating Cube with Z-Buffer & Lambertian Light
 * Zero dependencies. Runs in any terminal.
 * 
 * Usage: node three-d-spinning-cube.js
 */

const COLS = Math.min(80, process.stdout.columns || 80);
const ROWS = Math.min(30, (process.stdout.rows || 30) - 2);

class ZBufferRenderer {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.chars = Array.from({ length: rows }, () => Array(cols).fill(' '));
    this.colors = Array.from({ length: rows }, () => Array(cols).fill(null));
    this.zBuffer = Array.from({ length: rows }, () => Array(cols).fill(-Infinity));
  }

  clear() {
    for (let r = 0; r < this.rows; r++) {
      this.chars[r].fill(' ');
      this.colors[r].fill(null);
      this.zBuffer[r].fill(-Infinity);
    }
  }

  set(x, y, z, char, rgb) {
    const col = Math.floor(x);
    const row = Math.floor(y);
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      if (z > this.zBuffer[row][col]) {
        this.chars[row][col] = char;
        this.colors[row][col] = rgb;
        this.zBuffer[row][col] = z;
      }
    }
  }

  // Draw 3D surface patch via fine grid sampling
  drawQuad3D(p1, p2, p3, p4, char, rgb) {
    const steps = 14;
    for (let u = 0; u <= steps; u++) {
      const tu = u / steps;
      // Interpolate top and bottom edges
      const top = [
        p1[0] + (p2[0] - p1[0]) * tu,
        p1[1] + (p2[1] - p1[1]) * tu,
        p1[2] + (p2[2] - p1[2]) * tu
      ];
      const bot = [
        p4[0] + (p3[0] - p4[0]) * tu,
        p4[1] + (p3[1] - p4[1]) * tu,
        p4[2] + (p3[2] - p4[2]) * tu
      ];

      for (let v = 0; v <= steps; v++) {
        const tv = v / steps;
        const x3d = top[0] + (bot[0] - top[0]) * tv;
        const y3d = top[1] + (bot[1] - top[1]) * tv;
        const z3d = top[2] + (bot[2] - top[2]) * tv;

        // Perspective projection: f = 35, d = 3.5
        const camZ = z3d + 3.2;
        if (camZ <= 0.1) continue;
        const scale = 36 / camZ;

        // 1:2 terminal aspect ratio compensation (multiply x by 2.0)
        const projX = (this.cols / 2) + (x3d * scale * 2.0);
        const projY = (this.rows / 2) + (y3d * scale);

        // Z-buffer depth test (higher 1/z is closer)
        this.set(projX, projY, 1 / camZ, char, rgb);
      }
    }
  }

  render() {
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

// 3D Cube Definition
const SIZE = 1.0;
const RAW_FACES = [
  // Front face (normal [0, 0, -1])
  { verts: [[-SIZE, -SIZE, -SIZE], [ SIZE, -SIZE, -SIZE], [ SIZE,  SIZE, -SIZE], [-SIZE,  SIZE, -SIZE]], normal: [0, 0, -1], color: [85, 230, 75] },
  // Back face (normal [0, 0, 1])
  { verts: [[ SIZE, -SIZE,  SIZE], [-SIZE, -SIZE,  SIZE], [-SIZE,  SIZE,  SIZE], [ SIZE,  SIZE,  SIZE]], normal: [0, 0, 1], color: [0, 176, 255] },
  // Left face (normal [-1, 0, 0])
  { verts: [[-SIZE, -SIZE,  SIZE], [-SIZE, -SIZE, -SIZE], [-SIZE,  SIZE, -SIZE], [-SIZE,  SIZE,  SIZE]], normal: [-1, 0, 0], color: [255, 60, 150] },
  // Right face (normal [1, 0, 0])
  { verts: [[ SIZE, -SIZE, -SIZE], [ SIZE, -SIZE,  SIZE], [ SIZE,  SIZE,  SIZE], [ SIZE,  SIZE, -SIZE]], normal: [1, 0, 0], color: [255, 190, 40] },
  // Top face (normal [0, -1, 0])
  { verts: [[-SIZE, -SIZE,  SIZE], [ SIZE, -SIZE,  SIZE], [ SIZE, -SIZE, -SIZE], [-SIZE, -SIZE, -SIZE]], normal: [0, -1, 0], color: [180, 75, 255] },
  // Bottom face (normal [0, 1, 0])
  { verts: [[-SIZE,  SIZE, -SIZE], [ SIZE,  SIZE, -SIZE], [ SIZE,  SIZE,  SIZE], [-SIZE,  SIZE,  SIZE]], normal: [0, 1, 0], color: [0, 230, 118] }
];

function rotate(x, y, z, ax, ay, az) {
  // X rotation
  let y1 = y * Math.cos(ax) - z * Math.sin(ax);
  let z1 = y * Math.sin(ax) + z * Math.cos(ax);
  let x1 = x;

  // Y rotation
  let x2 = x1 * Math.cos(ay) + z1 * Math.sin(ay);
  let z2 = -x1 * Math.sin(ay) + z1 * Math.cos(ay);
  let y2 = y1;

  // Z rotation
  let x3 = x2 * Math.cos(az) - y2 * Math.sin(az);
  let y3 = x2 * Math.sin(az) + y2 * Math.cos(az);
  let z3 = z2;

  return [x3, y3, z3];
}

const DENSITY_RAMP = " .:-=+*#%@";
const LIGHT_DIR = [0.577, -0.577, -0.577]; // Key light from top-left-front

const renderer = new ZBufferRenderer(COLS, ROWS);
let angleX = 0.4;
let angleY = 0.6;
let angleZ = 0.2;

function renderFrame() {
  renderer.clear();

  RAW_FACES.forEach(face => {
    // Rotate surface normal
    const rotNorm = rotate(face.normal[0], face.normal[1], face.normal[2], angleX, angleY, angleZ);

    // Back-face culling: discard faces pointing away from camera (+Z)
    if (rotNorm[2] > 0.05) return;

    // Lambertian lighting calculation
    const dot = -(rotNorm[0] * LIGHT_DIR[0] + rotNorm[1] * LIGHT_DIR[1] + rotNorm[2] * LIGHT_DIR[2]);
    const luminance = Math.max(0.1, dot);
    const charIdx = Math.min(DENSITY_RAMP.length - 1, Math.max(0, Math.floor(luminance * DENSITY_RAMP.length)));
    const shadeChar = DENSITY_RAMP[charIdx];

    // Transform 4 face vertices
    const rotVerts = face.verts.map(v => rotate(v[0], v[1], v[2], angleX, angleY, angleZ));

    // Shade face with Z-buffer occlusion
    renderer.drawQuad3D(rotVerts[0], rotVerts[1], rotVerts[2], rotVerts[3], shadeChar, face.color);
  });

  // Output frame
  process.stdout.write(`\x1b[H\x1b[1m✿ MODULAR 3D ASCII ENGINE: PERSPECTIVE ROTATING CUBE (Z-BUFFER) ✿\x1b[0m\n`);
  process.stdout.write(renderer.render());
}

// Clear screen and hide cursor
process.stdout.write('\x1b[2J\x1b[?25l');

let count = 0;
const interval = setInterval(() => {
  angleX += 0.04;
  angleY += 0.07;
  angleZ += 0.02;
  renderFrame();
  count++;
  if (count > 60) {
    clearInterval(interval);
    process.stdout.write('\x1b[?25h\n3D render demo complete.\n');
  }
}, 50);

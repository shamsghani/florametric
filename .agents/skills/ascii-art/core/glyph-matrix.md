# Core: Glyph Matrix, Typography & Densities

The foundation of procedural ASCII graphics is treating typography as a structural material. This module provides the universal glyph vocabularies, directional quantization mechanics, and density scales across all domains.

---

## 1. The Aspect Ratio Problem: Square Canvas vs. 1:2 Terminal

In HTML5 Canvas, pixels are isotropic ($1:1$ aspect ratio).
In terminals and monospace code editors, character cells are typically **twice as tall as they are wide** ($1:2$ aspect ratio, e.g. $8\text{px} \times 16\text{px}$).

If you draw a circle with radius $R$ without compensation:
- On Canvas: it renders as a true circle.
- In Terminal: it renders squished into a tall vertical ellipse!

### The Universal Compensation Rule:
To achieve geometric isometry in terminal grid output, scale horizontal world coordinates by $2.0$:
$$x_{\text{grid}} = \lfloor x_{\text{world}} \times 2.0 \rfloor, \quad y_{\text{grid}} = \lfloor y_{\text{world}} \rfloor$$

---

## 2. Universal 16-Sector Directional Quantization

When rendering strokes without free canvas rotation (e.g. CLI output, text files, markdown diagrams), map continuous tangent angles $\theta = \operatorname{atan2}(dy, dx)$ to discrete directional glyphs:

```
           | (90°)
     \     |     /
(-135°) \  |  / (45°)
          \|/
    -------+------- (0° / 180°)
          /|\
 (-45°) /  |  \ (135°)
     /     |     \
           | (-90°)
```

### 16-Sector Lookup Function:
```javascript
function getDirectionalGlyph(angleRad) {
  const deg = ((angleRad * 180 / Math.PI) % 180 + 180) % 180; // 0 to 180
  if (deg < 11.25 || deg >= 168.75) return '-';
  if (deg < 33.75)  return '~';
  if (deg < 56.25)  return '/';
  if (deg < 78.75)  return 'l';
  if (deg < 101.25) return '|';
  if (deg < 123.75) return 'j';
  if (deg < 146.25) return '\\';
  return '~';
}
```

---

## 3. Calibrated Density Ramps

Use density ramps to translate scalar fields (light illumination $I \in [0, 1]$, terrain height, fog density, or tissue mass) into ASCII characters:

### A. Standard 10-Tier ASCII Ramp
```
" .:-=+*#%@"
```
- Ideal for: General terminal shading, foliage density, 3D Lambertian lighting.

### B. Paul Bourke 70-Character Precision Ramp
```
" .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
```
- Ideal for: High-fidelity image and gradient rendering where subtle variations matter.

### C. Unicode Block Shading Ramp
```
" ░▒▓█"
```
- Ideal for: Architectural solids, isometric masonry, opaque walls, and elevation heightmaps.

### D. Reverse Negative Ramp (Dark on Bright)
```
"@%#*+=-:. "
```

---

## 4. Unicode Box-Drawing & Architectural Glyphs

For structural frameworks, architectural elevations, floor plans, and wireframe edges:

### Single-Line Frame:
- Horizontals / Verticals: `─`, `│`
- Corners: `┌`, `┐`, `└`, `┘`
- Tees: `├`, `┤`, `┬`, `┴`
- Crossings: `┼`

### Double-Line Load-Bearing Walls:
- Horizontals / Verticals: `═`, `║`
- Corners: `╔`, `╗`, `╚`, `╝`
- Junctions: `╠`, `╣`, `╦`, `╩`, `╬`

### Diagonal & Isometric Elements:
- Slopes & Bracing: `╱`, `╲`, `╳`
- Roof gables & Peaks: `▲`, `▼`, `◄`, `►`
- Semi-solid infill: `▚`, `▞`, `▀`, `▄`

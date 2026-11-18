---
name: ascii-art
description: Build procedural, animated, glowing, and interactive graphics drawn entirely with ASCII and Unicode symbols across any domain: architectural structures, natural landscapes, true 3D polyhedra with z-buffering, 2:1 axonometric isometric worlds, and continuous biological botany. Covers the rotated glyph language, mathematical curves (logistic growth, phyllotaxis, simplex noise, multi-octave terrain, 3D rotation matrices, Lambertian lighting), physics (Euler wind, gravity, rain/snow particles, heliotropism), screen-space hardware bloom, and multi-layer palette rendering across HTML5 Canvas and terminal string grids. Use whenever someone wants to draw, animate, or simulate anything with ASCII characters, Unicode text art, terminal visual effects, living nature, or glowing generative typography.
license: MIT
metadata:
  opencode/slash: "true"
---

# Modular Procedural ASCII & Unicode Graphics Engine

This skill is a modular architecture for generating living, procedural, animated, and interactive assets drawn entirely with ASCII and Unicode glyphs.

Instead of traditional ASCII art—which treats characters as brightness pixels approximating pre-baked bitmap images—this engine models graphics as **continuous vector strokes, geometric boundaries, and structural elements**, whether rendering a 3D rotating polyhedron, an isometric skyscraper complex, an atmospheric mountain landscape, or a living biological flower.

```
       .---.                   /\                      / \
      /     \                 /  \                    /   \
     |       |               /\  /\                  |     |
    .---------.-+           /  \/  \                .-------.
    | [ ] [ ] | |           |  ||  |                | [+][+] |
    |=========| |           \  /\  /                |=======|
    | [+][+]  | |            \/  \/                 | [###] |
   =================      =================      ===============
     Architectural            Isometric            3D Shaded &
       Elevation                Block                Botany
```

---

## 1. Modular System Architecture

The engine is decomposed into **Core Primitives** and plug-and-play **Domain Modules**:

```
ascii-art/
├── SKILL.md                          <- Master Architecture & Selection Guide
├── core/
│   ├── glyph-matrix.md               <- Directional tangents, density ramps, box-drawing
│   ├── rasterizer-and-zbuffer.md     <- Depth testing, canvas subpixel rotation, bloom
│   └── camera-and-projection.md      <- Orthographic, 3D Perspective & 2:1 Isometric
├── modules/
│   ├── architecture.md               <- Facades, arches, trusses, masonry, floorplans
│   ├── landscapes.md                 <- Multi-octave terrain, animated waves, reflections
│   ├── three-dimensional.md          <- 3D vertices, rotation matrices, Lambertian shading
│   ├── isometric.md                  <- Diamond tiles, extruded blocks, painter's sorting
│   └── botany-and-organic.md         <- Logistic growth, phyllotaxis, 20n prime plateaus
└── examples/
    ├── isometric-building.html       <- Interactive Canvas isometric tower with lighting
    ├── three-d-spinning-cube.js      <- Terminal CLI rotating 3D shaded cube (z-buffer)
    ├── landscape-terrain.html        <- Multi-octave mountains, animated water & rain
    ├── minimal-canvas-plant.html     <- Blooming ASCII flower with hardware bloom glow
    └── terminal-tree.js              <- Zero-dependency Node.js CLI procedural botany
```

---

## 2. Quick Domain Selection Matrix

Match your project goal to the dedicated module and core components:

| Desired Asset / Scene | Primary Module | Core Components Used | Typical Output Target |
| :--- | :--- | :--- | :--- |
| **Buildings, Facades, Bridges** | [`modules/architecture.md`](./modules/architecture.md) | Box-drawing sets, orthographic projection | Canvas or Markdown diagrams |
| **Mountains, Oceans, Weather** | [`modules/landscapes.md`](./modules/landscapes.md) | Multi-octave heightmaps, wave harmonics | Animated Canvas / Terminal |
| **Rotating Solids, Donut, 3D Mesh**| [`modules/three-dimensional.md`](./modules/three-dimensional.md) | Perspective camera, Z-buffer, Lambertian lighting | Terminal CLI / Canvas |
| **SimCity / RPG World, Towers** | [`modules/isometric.md`](./modules/isometric.md) | 2:1 isometric projection, painter's depth sorting | Canvas or Web Component |
| **Living Flowers, Plants, Vines**| [`modules/botany-and-organic.md`](./modules/botany-and-organic.md) | Rotated tangents, logistic kinetics, 20n plateaus | Canvas with hardware bloom |

---

## 3. The Universal Engineering Invariants

Regardless of domain, every procedural ASCII creation adheres to five universal rules:

### A. Vector Strokes, Not Pixel Blocks
Characters are selected according to **direction** (local curve tangent $\theta$), **role** (backbone, node, leaf, petal, column, lintel, water wave), and **density** (fill weight). Never convert an image with a threshold loop when a mathematical function can draw it organically.

### B. Aspect Ratio Compensation ($1:2$ Terminal vs $1:1$ Canvas)
In monospaced text environments (terminals, code editors), character cells are twice as tall as they are wide. To prevent circles and diagonals from squishing:
$$x_{\text{terminal}} = \lfloor x_{\text{world}} \times 2.0 \rfloor, \quad y_{\text{terminal}} = \lfloor y_{\text{world}} \rfloor$$

### C. Z-Buffer Depth Testing for 3D & Occlusion
When objects overlap in 3D space, store per-cell floating-point depth in `zBuffer[row][col]`. Only draw an incoming character if:
$$z_{\text{incoming}} > z_{\text{buffer}}[\text{row}][\text{col}]$$
In isometric space, achieve the same result via the **Painter's Key Invariant**:
$$\text{DepthKey} = (u + v) \times 1000 + z_{\text{elevation}}$$
Render blocks strictly sorted from lowest key to highest key.

### D. Dual-Pass Hardware Screen-Space Bloom
ASCII glyphs achieve a glowing CRT phosphor aesthetic using native Canvas 2D filters without costly post-processing shaders:
```javascript
// Pass 1: Diffuse glow underlay
ctx.save();
ctx.filter = 'blur(6px)';
ctx.globalAlpha = 0.40;
drawPrimitives(ctx);
ctx.restore();

// Pass 2: Sharp foreground
ctx.save();
ctx.globalAlpha = 1.0;
drawPrimitives(ctx);
ctx.restore();
```

### E. High-DPI Mobile Performance Rule
Modern smartphones feature $3\times$ retina pixel densities. Always clamp DPR to $2.0$ to avoid mobile GPU fillrate collapse:
```javascript
const dpr = Math.min(2.0, window.devicePixelRatio || 1);
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
ctx.scale(dpr, dpr);
```

---

## 4. Module Deep Dives & Documentation

1. **[Core Glyph Matrix](./core/glyph-matrix.md)**
   - 16-sector tangent angle quantization table.
   - Calibrated 10-tier, 70-character, and Unicode block density ramps.
   - Unicode box-drawing character vocabulary (`─`, `│`, `┌`, `┐`, `═`, `║`, `╔`, `╗`, `╱`, `╲`).

2. **[Core Rasterizer & Z-Buffer Engine](./core/rasterizer-and-zbuffer.md)**
   - Unified `AsciiRasterizer` class with 3D Bresenham line and scanline polygon rasterization.
   - Dual-pass hardware screen-space bloom implementation.
   - 24-bit TrueColor ANSI escape code serialization (`\x1b[38;2;R;G;Bm`).

3. **[Core Camera & Projection](./core/camera-and-projection.md)**
   - Orthographic parallel ray projection for floor plans and technical drawings.
   - Perspective 3D camera transformation with pitch, yaw, roll, and focal length division.
   - 2:1 axonometric isometric projection equations and inverse screen-to-world picking.

4. **[Architectural Design Module](./modules/architecture.md)**
   - Multi-story elevation stratification (base, shaft, capital).
   - Fenestration grids and procedural window patterns (`[+]`, `[*]`, `[=]`, `[#]`).
   - Semicircular Roman arches and Gothic pointed lancet vaults.
   - Structural trusses (Warren, Pratt, Howe) and suspension bridge catenaries.

5. **[Landscapes & Atmospheric Nature Module](./modules/landscapes.md)**
   - Multi-octave fractal terrain heightmaps.
   - 3-plane atmospheric perspective and parallax depth fog.
   - Dynamic ocean wave traveling harmonics with specular sun reflection columns.
   - Rain and snow weather particle physics.

6. **[3D Wireframes & Shaded Solids Module](./modules/three-dimensional.md)**
   - Polyhedral vertex/face mesh representations.
   - 3D Euler matrix rotation transformations.
   - Lambertian diffuse lighting ($I = \max(0, \vec{N} \cdot \vec{L})$) mapped to ASCII density ramps.
   - Back-face culling optimization.

7. **[Isometric Worlds & Axonometric Blocks Module](./modules/isometric.md)**
   - The 2:1 diamond grid coordinates $(u, v) \to (x, y)$.
   - 3-face shaded block primitives (lit top, shaded left, mid-tone right).
   - Painter's depth sorting key: $\text{DepthKey} = (u + v) \times 1000 + h$.
   - Multi-level staircases, ramps, and fluted column colonnades.

8. **[Botany & Organic Nature Module](./modules/botany-and-organic.md)**
   - Continuous logistic shoot elongation kinetics: $L(t) = L_{\max} \frac{1 - e^{-kt}}{1 - e^{-k}}$.
   - Rotated tangent glyph language for vascular stems and curved foliage.
   - Polar petal rosettes and Fermat's phyllotaxis Golden Angle seed heads.
   - The 20n mature prime plateau and organ subcycles.
   - Traveling Euler wind harmonics and pointer heliotropism.

---

## 5. Executable Examples Directory

Every module is accompanied by an executable reference implementation:

- **[isometric-building.html](./examples/isometric-building.html)**: Interactive HTML5 Canvas isometric multi-story building complex with depth sorting and sun lighting.
- **[three-d-spinning-cube.js](./examples/three-d-spinning-cube.js)**: Standalone zero-dependency Node.js CLI script that renders a rotating 3D shaded cube with Z-buffer and Lambertian light in terminal stdout.
- **[landscape-terrain.html](./examples/landscape-terrain.html)**: Procedural mountain landscape with animated ocean waves, golden sunlight reflections, and weather particles.
- **[minimal-canvas-plant.html](./examples/minimal-canvas-plant.html)**: Animated blooming ASCII flower featuring hardware screen-space bloom glow and cursor reach.
- **[terminal-tree.js](./examples/terminal-tree.js)**: Zero-dependency Node.js CLI procedural botany generator.

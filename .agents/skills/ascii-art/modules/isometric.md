# Module: Isometric Worlds, Axonometric Blocks & Depth Sorting

Isometric graphics present 3D spaces with clear dimensional proportions and zero perspective vanishing convergence. This module provides the mathematical formulas, block primitives, depth-sorting rules, and lighting techniques for creating isometric cities, buildings, stairs, and landscapes.

---

## 1. The 2:1 Isometric Diamond Grid

In isometric space, the horizontal X-axis and Y-axis are slanted at $30^\circ$ to the horizon. In discrete pixel/cell art, this is approximated by a **$2:1$ ratio** (2 units horizontal per 1 unit vertical):

```
            (0, 0)
            /\
   (-1, 0) /  \ (1, 0)
          /\  /\
 (0, -1) /  \/  \ (0, 1)
         \  /\  /
          \/  \/
```

### Tile Coordinate Transformation:
Given grid tile coordinates $(u, v)$ and elevation height $h$:

$$x = (u - v) \cdot \text{halfWidth}$$
$$y = (u + v) \cdot \text{halfHeight} - (h \cdot \text{unitElevation})$$

For monospace text grids (where characters are tall, $1:2$ ratio):
- $\text{halfWidth} = 4$
- $\text{halfHeight} = 2$
- $\text{unitElevation} = 2$

---

## 2. The Standard Isometric Block Primitive

An isometric cube has three visible faces: **Top (Ground/Roof)**, **Left (Shaded)**, and **Right (Lit)**:

```
        .------.         <- Top Face (Diamond)
       /        \
      /          \
     +------------+      <- Front Top Edge
     | \        / |
     |  \      /  |
     |   '----'   |      <- Rear Top Edge
     |    |  |    |
     |Left|  |Righ|      <- Left Face & Right Face
     |Face|  |Face|
     |    |  |    |
     '----+-------'
```

### In ASCII Characters (Compact Block):
```
    /\
   /  \    <- Top Face (light gray: '░' or ' ')
  /\  /\
 /  \/  \
 |  ||  |
 |  ||  |  <- Left Face: shadow ('▒', ':')
 \  /\  /  <- Right Face: lit (' ', '|')
  \/  \/
```

### Face Shading Rules:
Assuming the sun shines from the top-right:
1. **Top Face**: Receives direct vertical illumination $\implies$ Brightest tone (`.`, `░`, `#ffffff`).
2. **Right Face**: Receives direct side illumination $\implies$ Medium tone (`:`, `│`, `#a0aec0`).
3. **Left Face**: In self-shadow $\implies$ Darkest tone (`▒`, `▓`, `#4a5568`).

---

## 3. The Painter's Depth Sorting Invariant

In isometric projection, distant objects in the upper grid $(u=0, v=0)$ must be drawn **before** objects in the foreground $(u>0, v>0)$. Furthermore, lower elevations must be drawn before higher elevations.

### Universal Sorting Key:
Sort all objects and blocks by their composite depth key:

$$\text{DepthKey} = (u + v) \times 1000 + h$$

```javascript
// Render back-to-front
blocks.sort((a, b) => {
  const depthA = (a.u + a.v) * 1000 + a.h;
  const depthB = (b.u + b.v) * 1000 + b.h;
  return depthA - depthB;
});
```

This invariant guarantees that a high tower in the foreground properly occludes low buildings behind it without visual clipping or artifacts.

---

## 4. Multi-Level Staircases & Ramps

Stairs bridge elevation $h$ to $h+1$ along an isometric axis:

### X-Axis Ascending Stair:
```
       .---. [Level 2]
      /   /|
     .---. |
    /   /| '
   .---. |
  /   /| '
 '---' | [Level 0]
```
- Each tread steps $+2\text{px}$ X, $+1\text{px}$ Y, and $+1\text{px}$ elevation.
- Risers are drawn with vertical strokes (`|`, `!`).
- Treads are drawn with horizontal/slanted lines (`-`, `_`, `/`).

---

## 5. Architectural Inset Elements

### Windows on Isometric Walls:
- **Left Wall Window**: Slanted parallel to left axis (`/`, `\`, `|`):
  ```
  | /| |
  |/_| |
  ```
- **Right Wall Window**: Slanted parallel to right axis:
  ```
  | |\ |
  |_\| |
  ```

### Columns and Pillars:
Vertical cylinders connecting elevated ceilings to the floor:
```
   /\
  |  |  <- Capital
  |  |  <- Fluted Shaft ('||', '!!', '││')
  |  |
  \  /  <- Base Plinth
```

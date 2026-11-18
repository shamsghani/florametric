# Core: Camera & Projection Engines

To project 3D worlds, isometric game levels, or architectural elevations onto a 2D ASCII grid or canvas, select the appropriate projection engine from this reference.

---

## 1. Orthographic Projection (Architectural & Side Views)

In orthographic projection, parallel projection rays discard depth distortion. Ideal for floor plans, building cross-sections, and structural elevations:

$$\begin{pmatrix} x_{\text{screen}} \\ y_{\text{screen}} \end{pmatrix} = \begin{pmatrix} X \cdot s_x + c_x \\ -Y \cdot s_y + c_y \end{pmatrix}$$

- $Z$ represents layer order / depth for the Z-buffer.
- No vanishing points; objects maintain constant size regardless of distance.

---

## 2. Perspective 3D Camera Projection

Perspective projection simulates the human eye or camera lens, where distant objects appear smaller and lines converge toward vanishing points.

### World-to-Camera Coordinate Transformation:
Given world point $P = (X, Y, Z)$ and camera at origin looking down $+Z$:

1. **Yaw ($\psi$, around Y-axis)** and **Pitch ($\theta$, around X-axis)**:
   $$X' = X \cos\psi + Z \sin\psi$$
   $$Z' = -X \sin\psi + Z \cos\psi$$
   $$Y' = Y \cos\theta - Z' \sin\theta$$
   $$Z'' = Y \sin\theta + Z' \cos\theta + d_{\text{camera}}$$

2. **Perspective Division**:
   $$x_{\text{proj}} = \frac{X' \cdot f}{Z''} \cdot \text{aspectRatioCompensation} + x_{\text{center}}$$
   $$y_{\text{proj}} = \frac{Y' \cdot f}{Z''} + y_{\text{center}}$$
   $$z_{\text{depth}} = Z''$$

- $f$: Focal length (determines field of view; higher values zoom in, lower values create wide-angle/fisheye effect).
- $d_{\text{camera}}$: Distance from camera to object center.
- $\text{aspectRatioCompensation}$: Set to $2.0$ for terminal monospace characters, $1.0$ for canvas.

---

## 3. The 2:1 Axonometric Isometric Projection

Isometric projection represents three-dimensional objects in two dimensions, where the three coordinate axes appear equally foreshortened and the angles between any two of them are $120^\circ$.

In pixel and character art, a true $30^\circ$ angle produces jagged lines. The universal game standard is the **$2:1$ Dimetric / Isometric projection**, where moving $2$ pixels horizontally corresponds to $1$ pixel vertically.

```
       /\
      /  \  <- Top Face (Width: 2, Height: 1)
     /\  /\
    /  \/  \
    \  /\  /
     \/  \/
     | \/ |
     |    | <- Vertical Height (Z)
     \    /
      \  /
       \/
```

### Transformation Equations:
Given 3D world coordinates $(X, Y, Z)$ where $X$ is right-down, $Y$ is left-down, and $Z$ is vertical elevation:

$$x_{\text{iso}} = (X - Y) \cdot \text{tileWidthHalf} + x_{\text{origin}}$$
$$y_{\text{iso}} = (X + Y) \cdot \text{tileHeightHalf} - (Z \cdot \text{elevationStep}) + y_{\text{origin}}$$

### Dimension Proportions:
- $\text{tileWidthHalf} = 2 \times \text{tileHeightHalf}$
- Example for Terminal Monospace ($1:2$ cell ratio):
  `tileWidthHalf = 4`, `tileHeightHalf = 2`, `elevationStep = 2`.
- Example for HTML5 Canvas:
  `tileWidthHalf = 32`, `tileHeightHalf = 16`, `elevationStep = 24`.

### Inverse Screen-to-World (Picking / Cursor Interaction):
To find which isometric tile $(X, Y)$ is clicked on screen $(x_{\text{screen}}, y_{\text{screen}})$ at ground level ($Z=0$):

$$dx = x_{\text{screen}} - x_{\text{origin}}$$
$$dy = y_{\text{screen}} - y_{\text{origin}}$$
$$X = \frac{1}{2} \left( \frac{dx}{\text{tileWidthHalf}} + \frac{dy}{\text{tileHeightHalf}} \right)$$
$$Y = \frac{1}{2} \left( \frac{dy}{\text{tileHeightHalf}} - \frac{dx}{\text{tileWidthHalf}} \right)$$

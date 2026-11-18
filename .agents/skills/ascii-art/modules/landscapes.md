# Module: Landscapes, Terrains & Atmospheric Nature

This module covers procedural generation of continuous outdoor environments: mountain silhouettes, multi-octave terrain heightmaps, animated ocean waves with specular reflections, clouds, and weather particle systems.

---

## 1. Multi-Octave Terrain Heightmaps

Natural terrain is self-similar across scales (fractal noise). Compute elevation $H(x)$ across $K$ octaves:

$$H(x) = H_{\text{base}} - \sum_{o=1}^4 \frac{A}{2^{o-1}} \cdot \sin\left( 2^{o-1} \cdot f \cdot x + \phi_o \right)$$

```
                    /\
      /\           /  \      /\
     /  \  /\     /    \    /  \
    /    \/  \   /      \  /    \
   /          \_/        \/      \
  /                               \
```

### Ridge Character Assignment by Slope:
```javascript
function getTerrainGlyph(slope, isRidgeTop) {
  if (isRidgeTop) return '^';
  if (slope > 0.6)  return '/';
  if (slope < -0.6) return '\\';
  if (slope > 0.2)  return '/';
  if (slope < -0.2) return '\\';
  return '_';
}
```

---

## 2. Atmospheric Perspective & Parallax Layers

In traditional landscape painting and terminal art, distance creates atmosphere. Render landscapes in 3 discrete depth planes:

```
  PLANE 1 (Distant Range):   :   .  :  .   :      (Desaturated, Low Density: '.', ':')
  PLANE 2 (Midground Hills): /~\ /~~\ /~~\        (Medium Density: '/', '\', '~')
  PLANE 3 (Foreground Bluffs): [###][###][###]    (High Density: '#', '█', '▓')
```

### Depth-Color-Density Matrix:

| Depth Layer | Character Palette | Typical Color (Hex) | ANSI 24-bit RGB |
| :--- | :--- | :--- | :--- |
| **Sky & Clouds** | `(`, `)`, `~`, `.`, `'` | `#1a1a2e` | `[26, 26, 46]` |
| **Distant Mountain** | `:`, `.`, `^`, `~` | `#4a5568` | `[74, 85, 104]` |
| **Midground Foothills** | `/`, `\`, `*`, `~`, `n` | `#2d3748` | `[45, 55, 72]` |
| **Foreground Ridge** | `#`, `%`, `&`, `|`, `█` | `#1a202c` | `[26, 32, 44]` |
| **Water / Reflection** | `~`, `-`, `=`, `.` | `#2b6cb0` | `[43, 108, 176]` |

---

## 3. Water Bodies & Dynamic Ocean Waves

Water consists of horizontal undulating bands. Propagate traveling waves over time $t$:

$$y_{\text{wave}}(x, t) = y_{\text{surface}} + A_1 \sin(k_1 x - \omega_1 t) + A_2 \sin(k_2 x + \omega_2 t)$$

```
     ~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~
    ~.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.
   ~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-.~-
```

### Specular Light Reflections (Sun/Moon Path):
Light reflecting off water creates an expanding shimmering column directly beneath the celestial light source:

```javascript
function getWaterChar(x, y, time, sunX) {
  const distFromSunColumn = Math.abs(x - sunX);
  const waveHeight = Math.sin(x * 0.15 - time * 2.0) + Math.cos(y * 0.3 + time);

  // Inside the shimmering sun column
  if (distFromSunColumn < 8 + (y * 0.2)) {
    if (waveHeight > 0.8) return '*'; // Bright glint
    if (waveHeight > 0.2) return '=';
    return '-';
  }

  // Ambient water
  if (waveHeight > 0.6) return '~';
  if (waveHeight > 0.0) return '-';
  return '.';
}
```

---

## 4. Clouds & Nebulae

Clouds are modeled as soft overlapping disc envelopes:
$$(x - x_0)^2 + \frac{(y - y_0)^2}{\beta^2} \le R^2$$
where $\beta \approx 0.5$ flattens the cloud into a horizontal puff.

```
          .---.
        .'     '.
     .-'         '-.
   .'               '.
  (___________________)
```

Character fill transitions from dense core (`%`, `8`) out to whisper fringes (`~`, `.`, `'`).

---

## 5. Weather Particle Systems

### Rain Engine:
Rain falls with vertical gravity and wind slant $\theta_{\text{wind}}$:
```javascript
function updateRainDrop(drop, windSpeed) {
  drop.y += 1.2; // Falling velocity
  drop.x += windSpeed * 0.4;
  drop.char = (Math.abs(windSpeed) > 1.0) ? (windSpeed > 0 ? '/' : '\\') : '|';

  // Splash on ground
  if (drop.y >= groundY) {
    drop.y = 0;
    drop.x = Math.random() * width;
    emitSplash(drop.x, groundY); // Generates '.' or 'v'
  }
}
```

### Snow Engine:
Snow drifts with slow terminal settling and sinusoidal Brownian flutter:
$$x(t) = x_0 + \sin(\omega t + \phi) \cdot A_{\text{drift}}$$
$$y(t) = y_0 + v_{\text{fall}} \cdot t$$
Glyphs: `*`, `+`, `.`, `✦`. Accumulates on horizontal surfaces (`_` $\to$ `*` $\to$ `█`).

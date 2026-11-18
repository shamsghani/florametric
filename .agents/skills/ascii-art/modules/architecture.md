# Module: Architecture, Structures & Urban Design

This module provides procedural formulas, structural patterns, and character grammars for generating architectural assets: classical facades, skyscrapers, archways, masonry, trusses, bridges, and interior floor plans.

---

## 1. Architectural Elevation Anatomy

A well-proportioned building follows classical tri-partite vertical stratification:
1. **Base (Ground / Rustication)**: Heavy, dark, stone-textured foundations (`#`, `▓`, `░`).
2. **Shaft (Piano Nobile & Fenestration)**: Rhythmic grid of windows, pilasters, and cornices (`|`, `║`, `[+]`).
3. **Capital (Roof / Entablature / Spire)**: Pediments, balustrades, gables, and antennae (`▲`, `/\`, `TTT`).

```
       / \         <- Finial / Spire
      /   \
    .-------.      <- Balustrade / Cornice
    | [ ] [ ] |    <- Attic Story
    |=======|      <- Stringcourse Lintel
    | [+][+] |    <- Upper Windows
    | |   | | |    <- Fluted Pilasters
    | [+][+] |    <- Main Fenestration
    |=======|      <- Base Lintel
    | [###] |      <- Ground Masonry / Doorway
  ~~~~~~~~~~~~~    <- Sidewalk / Ground Plane
```

---

## 2. Windows, Doors & Fenestration Grids

Use consistent 2-to-4 character window glyphs based on architectural era:

| Architectural Style | Closed Window | Lit Window | Balcony / Arch | Doorway |
| :--- | :--- | :--- | :--- | :--- |
| **Classical / Beaux-Arts** | `[+]` | `[*]` | `(o)` | `[║║]` |
| **Modern Skyscraper** | `[=]` | `[#]` | `|#|` | `| |` |
| **Industrial / Factory** | `[x]` | `[X]` | `[#]` | `[===]` |
| **Gothic / Medieval** | `(A)` | `(o)` | `/ \` | `n_n` |
| **Cyberpunk Neon** | `[░]` | `[█]` | `[▓]` | `[!!]` |

### Procedural Facade Generator Formula:
```javascript
function generateFacade(stories, bays) {
  let facade = '';
  // Roofline
  facade += ' _' + '___'.repeat(bays) + '_\n';
  facade += '|=' + '==='.repeat(bays) + '=|\n';

  for (let s = stories - 1; s >= 0; s--) {
    let row = '| ';
    for (let b = 0; b < bays; b++) {
      // Lit window probability (e.g. at night)
      const isLit = Math.random() < 0.45;
      row += isLit ? '[*] ' : '[ ] ';
    }
    row += '|\n';
    // Intermediate floor slab
    if (s > 0) facade += '|-' + '---'.repeat(bays) + '-|\n';
  }
  // Ground floor entrance
  facade += '|=' + '==='.repeat(bays) + '=|\n';
  return facade;
}
```

---

## 3. Archways, Vaults & Domes

To generate a true semi-circular Roman arch or Gothic pointed arch:

### Semi-Circular Roman Arch:
Given span width $W$ and center $x_c = W / 2$:
$$y(x) = y_{\text{springing}} - \sqrt{\left(\frac{W}{2}\right)^2 - (x - x_c)^2}$$

Select glyphs by tangent slope $\theta$:
- Springing bases (vertical): `|`, `║`
- Shoulders ($45^\circ$): `/`, `\`, `(`
- Crown / Keystone (horizontal): `_`, `─`, `^`, `П`

```
       .---.       <- Keystone / Crown
      /     \      <- Extrados / Voussoirs
     /       \
    |         |    <- Impost / Springing Line
    |         |    <- Pier / Column
    |         |
```

### Gothic Pointed Arch (Lancet):
Created by overlapping two circles centered outside the span:
$$y(x) = y_{\text{springing}} - \min\left( \sqrt{R^2 - x^2}, \sqrt{R^2 - (W - x)^2} \right)$$
Produces the distinctive sharp Gothic apex (`/\`, `^`).

---

## 4. Trusses, Bridges & Infrastructure

Structural engineering frameworks rely on triangulation:

### Warren Truss:
```
  .---.---.---.---.---.---.
  | \ / \ / \ / \ / \ / \ |
  '---'---'---'---'---'---'
```

### Pratt / Howe Truss (with Vertical Posts):
```
  .---.---.---.---.---.---.
  |\|/|\|/|\|/|\|/|\|/|\|/|
  '---'---'---'---'---'---'
```

### Suspension Bridge Cable Cattenary:
Cables hang in a hyperbolic cosine catenary curve:
$$y(x) = a \cdot \cosh\left(\frac{x}{a}\right) - a$$
Characters: `\`, `_`, `_`, `/` for the main cable, and `|`, `!` for vertical suspenders dropping to the bridge deck.

---

## 5. Masonry & Wall Infill Ramps

Mix characters to simulate courses of stone or weathering:

- **Ashlar Smooth Stone**:
  ```
  [========][========]
  ====][========][====
  [========][========]
  ```
- **Rustic Rough Cobble**:
  ```
  (#)(#)(#)(#)(#)(#)
  (#)(#)(#)(#)(#)(#)
  ```
- **Brickwork Running Bond**:
  ```
  |---|---|---|---|---|
  --|---|---|---|---|--
  |---|---|---|---|---|
  ```

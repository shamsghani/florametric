# The Rotated Glyph Language: Typographic Anatomy

Characters in procedural ASCII graphics are not mere tonal shades; they are directional strokes, physical enclosures, and anatomical organs. This reference details how to select, orient, and assemble characters into organic structures.

---

## 1. Directional Tangent Quantization

When rendering without continuous canvas rotation (e.g. in terminal string grids, CLI output, or markdown pre blocks), map the local derivative $\theta = \operatorname{atan2}(dy, dx)$ to discrete directional glyphs:

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

### Quantization Table (16-Sector Mapping)

| Angle Range | Primary Stroke | Density Variants | Ideal For |
| :--- | :--- | :--- | :--- |
| **$-15^\circ$ to $+15^\circ$** | `-` | `=`, `_`, `~`, `---` | Soil line, horizontal branches, flat petal rims |
| **$+15^\circ$ to $+35^\circ$** | `~` | `,`, `.`, `-` | Gentle horizontal curve meanders, leaf tips |
| **$+35^\circ$ to $+55^\circ$** | `/` | `,`, `/` | Rightward branch, lower-right petal lobe |
| **$+55^\circ$ to $+75^\circ$** | `l` | `!`, `/`, `(` | Steep rightward ascending stem |
| **$+75^\circ$ to $+105^\circ$**| `\|` | `!`, `)`, `(`, `1` | Vertical stem backbone, central taproot |
| **$+105^\circ$ to $+125^\circ$**| `j` | `!`, `\`, `)` | Steep leftward ascending stem |
| **$+125^\circ$ to $+145^\circ$**| `\` | `'`, `\` | Leftward branch, lower-left petal lobe |
| **$+145^\circ$ to $+165^\circ$**| `~` | `_`, `.` | Gentle leftward meander |

---

## 2. Anatomical Role Vocabularies

### A. Stem & Vascular Architecture
- **Sprout & Apex**: `.`, `'`, `,`, `^`, `!` (delicate nascent shoot tip)
- **Primary Stem (Vegetative)**: `|`, `!`, `)`, `(` (smooth continuous elongation)
- **Lignified Base (Mature/Old)**: `#`, `%`, `&`, `8`, `O`, `0` (high visual density indicating thick bark or fiber)
- **Axillary Nodes**: `+`, `*`, `%` (points where vascular tissue splits to feed branches)

### B. Foliage & Leaf Blades
Leaves are modeled with pairs of opposing brackets enclosing curved rib lines:
```
  Left Leaf:   ~/ ( = = ) /~   or   {-(
  Right Leaf:  ~\ ( = = ) \~   or   )-}
  Nascent Bud: `.` or `,`
  Young Leaf:  `(` or `)`
  Mature Leaf: `{-(` or `)-}`
```
- **Compound Leaf Blades**: `(===)`, `{~~~}`, `{---}`
- **Leaf Veins / Ribs**: `-`, `~`, `=`
- **Serrations**: `*`, `^`, `v`

### C. Calyx & Receptacle (The Flower Base)
The calyx cups the base of the petals and connects to the peduncle (flower stalk):
- **Small Calyx**: `\v/`
- **Flared Calyx**: `\w/` or `\Y/`
- **Cup-Shaped Involucre**: `(Y)` or `\|/`
- **Thistle / Spiny Calyx**: `(#)` or `<*>`

### D. Petals & Corolla Architecture
Petals use radial symphonies of curved and loop glyphs:
- **Outer Ray Petals**: `%`, `8`, `@`, `O`, `&`, `*`, `c`, `s`
- **Inner Florets**: `*`, `+`, `o`, `.`
- **Ruffled Frills**: `c`, `C`, `~`, `S`, `s`
- **Tubular Trumpet / Corona (e.g. Daffodil)**:
  ```
     _.-'""'-._
   .'   cCC    '.
  /   cCCCCCC    \
 |   (  Dark )    |
  \   cCCCCCC    /
   '.   cCC    .'
     '-.____.-'
  ```

### E. Disc Florets (The Seed Head)
Arranged via Fermat's spiral (phyllotaxis). Characters transition in density from center outward:
- **Core (Dense)**: `#`, `8`, `&`
- **Mid-disc**: `*`, `o`
- **Perimeter (Loose)**: `.`, `'`

> [!CAUTION]
> **Boundary Integrity**: The maximum radius of any disc floret must be strictly smaller than the inner radius of the petals. If the petal inner radius is $R_{\text{inner}}$, cap disc radius at $R_{\text{disc}} \le 0.85 \cdot R_{\text{inner}}$.

### F. Specialized Structures
1. **Dandelion Clock (Pappus Parachute)**:
   - Flower head: Radial burst of `✦`, `*`, `+`, `.`
   - Parachute seed: `✦` (tuft) on top of `|` (stalk) with `.` (achene seed) at base:
     ```
       ✦
       |
       .
     ```
2. **Venus Flytrap (Bivalve Marginal Cilia)**:
   - Jaws: `(`, `)`
   - Sensitive trigger hairs: `!`, `'`
   - Interlocking marginal teeth: `^`, `v`, `/`, `\`

---

## 3. Density Gradient Hierarchy

When blending tissue or simulating lighting/senescence, use this calibrated 10-tier density scale:

```
Tier 0 (Empty):      ' '
Tier 1 (Whisper):    '.'  ','  '`'
Tier 2 (Sparse):     '-'  '~'  ':'
Tier 3 (Light):      '+'  '='  '*'
Tier 4 (Medium):     '('  ')'  '/'  '\'
Tier 5 (Firm):       'o'  'c'  's'
Tier 6 (Dense):      '%'  '8'  'O'
Tier 7 (Heavy):      '#'  '&'  '@'
Tier 8 (Solid):      '█'  '▓'  '▒'  (Unicode)
```

Selecting glyphs based on continuous parameters $\rho \in [0, 1]$:
```javascript
const DENSITY_RAMP = " .:-=+*#%@";
function getGlyphForDensity(rho) {
  const idx = Math.min(DENSITY_RAMP.length - 1, Math.max(0, Math.floor(rho * DENSITY_RAMP.length)));
  return DENSITY_RAMP[idx];
}
```

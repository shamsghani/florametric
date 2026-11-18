# Module: Botany, Living Nature & Organic Growth

This module encapsulates the procedural botanical system discovered in the Florametric engine: continuous logistic shoot elongation, the rotated tangent glyph language, polar petals, bounded phyllotaxis seed discs, member subcycles, the 20n plateau, and Euler wind dynamics.

---

## 1. Continuous Shoot Elongation (Logistic Kinetics)

Plants grow smoothly according to continuous developmental age $t \in [0, 1]$:

$$L(t) = L_{\max} \cdot \frac{1 - e^{-k t}}{1 - e^{-k}}$$

- $L_{\max}$: Maximum genetic height ($280\text{px}$ to $420\text{px}$).
- $k \approx 4.0$: Steepness coefficient modeling rapid seedling vigor tapering into adult maturity.
- Segment spacing remains continuous to avoid visual "popping".

---

## 2. The Rotated Tangent Language for Botany

In HTML5 Canvas, characters are rotated to match the local curve derivative $\theta = \operatorname{atan2}(dy, dx)$:

```javascript
function drawRotatedGlyph(ctx, char, x, y, angle, color, fontSize = 14) {
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

### Anatomical Character Assignment:
- **Apical Shoot Tip**: `.`, `'`, `,`, `^`, `!`
- **Vascular Stem Backbone**: `|`, `!`, `)`, `(`, `/`, `\`
- **Lignified Base**: `#`, `%`, `&`, `8`, `O` (high optical density near soil)
- **Nodes & Axils**: `+`, `*`, `%`
- **Leaves & Foliage**: `{-(` (left) and `)-}` (right), smoothly scaling from $0.15\times$ bud to $1.0\times$ adult
- **Calyx / Involucre**: `\v/`, `\w/`, `\Y/`, `(Y)`
- **Ray Petals**: `%`, `8`, `@`, `O`, `&`, `*`, `c`
- **Disc Florets**: Dense `#`, `*`, `&` bounded within petals
- **Seed Pappus**: Floating parachute stars `✦`, `*`, `+`

---

## 3. The 20n Mature Prime Plateau

Never allow plants to bloom and die in quick symmetric succession. Real biological entities spend the vast majority of their lives in flowering prime:

- If growth takes $n$ cycles (e.g. 24 hours), the plant **must remain at full height in prime bloom for at least $20n$ cycles** (e.g. 20 days) before any senescence begins.
- Senescence is strictly $0.0$ between $[1.0, 21.0]$.
- Senescence starts only after age $21.0$, browning bottom-up from roots to flowers.

---

## 4. Member Subcycles & The Branch Dependency Invariant

Each organ (leaves, branches, flowers) possesses an independent lifecycle state machine:
`DORMANT -> BUDDING -> MATURE -> WILTING -> DEAD -> RESPROUTING`

### The Branch Dependency Invariant:
An axillary branch must never wither while any organ on it is alive:
$$\text{CanBranchDie} = \left(\forall l \in \text{Leaves}_{\text{branch}}, \text{state}(l) = \text{DEAD}\right) \land \left(\forall f \in \text{Flowers}_{\text{branch}}, \text{state}(f) = \text{DEAD}\right)$$

---

## 5. Bounded Sunflower Seed Discs (Zero Bleeding Rule)

For composite flowers (sunflowers, daisies), place seed florets using Fermat's Golden Angle spiral ($137.507764^\circ$):
$$r_i = c \sqrt{i}, \quad \phi_i = i \times 2.39996323$$

> [!CAUTION]
> **Strict Geometric Clamping**:
> Always clamp $r_i \le R_{\text{petal\_inner}} - \delta$ to guarantee seed florets never bleed outside the ray petals.

---

## 6. Traveling Euler Wind Kinematics

Propagate harmonic breeze waves horizontally across the canopy:
$$W(y, x, t) = \sum_{m=1}^3 A_m \sin(\omega_m t + k_m y - c_m x) \cdot \left(\frac{y}{H}\right)^{1.4}$$
- The spatial offset $-c_m x$ causes gusts to visibly roll across the screen from left to right.
- The power-law $(y/H)^{1.4}$ keeps roots anchored at soil while flexing the apex.

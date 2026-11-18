# Mathematical Botany & Continuous Physics

Living ASCII graphics derive their beauty from continuous mathematical curves. This reference details the core equations governing shoot growth, petal rosettes, wind sway, heliotropism, and drifting seed physics.

---

## 1. Continuous Shoot Elongation (Logistic Kinetics)

Plants do not grow linearly; they accelerate during youth and decelerate as they reach maximum genetic height. The normalized length $L(t)$ at biological vegetative age $t \in [0, 1]$ is:

$$L(t) = L_{\max} \cdot \frac{1 - e^{-k t}}{1 - e^{-k}}$$

- $L_{\max}$: Maximum mature height in pixels (e.g. $280\text{px}$ to $420\text{px}$).
- $k$: Logistic growth steepness (typically $3.5 \le k \le 4.5$).
- $t = \operatorname{clamp}(\text{age}, 0, 1)$.

### Stem Spine Parametric Curve
A stem of length $L$ with curvature $C \in [-1, 1]$ and natural meander is computed as a series of $N$ discrete spine vertices $i \in [0, N]$:

$$s = \frac{i}{N} \cdot L$$
$$x(s) = x_{\text{base}} + C \cdot L \cdot \left(\frac{s}{L}\right)^2 + \text{noise}(s \cdot 0.02) \cdot 15$$
$$y(s) = y_{\text{base}} - s$$

The tangent angle at each vertex is:
$$\theta(s) = \operatorname{atan2}\left(y(s + \Delta s) - y(s), x(s + \Delta s) - x(s)\right)$$

---

## 2. Polar Rosette Petal Geometry

Flower blossoms are generated in polar coordinates $(r, \phi)$ centered at the apex $(x_{\text{apex}}, y_{\text{apex}})$:

$$r(\phi) = R_{\text{inner}} + (R_{\text{outer}} - R_{\text{inner}}) \cdot \left|\cos\left(\frac{k}{2} \cdot \phi\right)\right|^p$$

- $k$: Number of petal lobes (e.g. $5$ for rose/hibiscus, $6$ for daffodil, $16$ for sunflower).
- $p$: Petal roundness ($p = 1.0$ for sinusoidal, $p = 0.5$ for wide blunt lobes, $p = 2.0$ for pointed tepals).
- $R_{\text{inner}}, R_{\text{outer}}$: Inner calyx and outer petal boundary.

### Anthesis (Bloom Expansion Curve)
During the blooming phase, effective petal radius scales from a tight closed bud ($b=0$) to full anthesis ($b=1$):
$$R_{\text{eff}}(b) = R_{\text{bud}} + (R_{\text{full}} - R_{\text{bud}}) \cdot \left(3b^2 - 2b^3\right)$$
Using the cubic smoothstep polynomial $S(b) = 3b^2 - 2b^3$ ensures zero initial velocity and gentle settling.

---

## 3. Fermat's Phyllotaxis Spiral (Seed Heads & Succulents)

For composite flowers (sunflowers, daisies) and succulent rosettes, place florets using the Golden Angle $\alpha \approx 137.507764^\circ \approx 2.399963\text{ rad}$:

For floret index $i = 0, 1, 2, \dots, M$:
$$r_i = c \cdot \sqrt{i}$$
$$\phi_i = i \cdot 2.399963229728653$$
$$x_i = x_{\text{center}} + r_i \cos(\phi_i)$$
$$y_i = y_{\text{center}} + r_i \sin(\phi_i)$$

- $c$: Radial spread constant (typically $2.5 \le c \le 4.5$).
- $M$: Total seed floret count (e.g. $80 \le M \le 220$).

> [!IMPORTANT]
> **Strict Radial Boundary Check**:
> Never emit a floret if $r_i \ge R_{\text{petal\_inner}} - 2.0$. This prevents unsightly seed disc bleeding outside the ray petals.

---

## 4. Multi-Harmonic Euler Wind Waves

Organic wind sway consists of low-frequency standing waves superimposed with traveling high-frequency ripples. At height $y$ from base ($y=0$ at ground, $y=H$ at apex):

$$W(y, x, t) = \left( \frac{y}{H} \right)^{1.4} \cdot \left[ A_1 \sin(\omega_1 t - c_1 x) + A_2 \sin(\omega_2 t + k_2 y) + A_3 \sin(\omega_3 t - c_3 x) \right]$$

### Typical Calibrated Constants:
- Primary Gust ($A_1 = 18\text{px}, \omega_1 = 1.2\text{ rad/s}, c_1 = 0.003$): Slow rolling front across the meadow.
- Secondary Harmonic ($A_2 = 6\text{px}, \omega_2 = 2.7\text{ rad/s}, k_2 = 0.015$): Vertical flex and rebound.
- Flutter ($A_3 = 2.5\text{px}, \omega_3 = 5.8\text{ rad/s}, c_3 = 0.01$): Leaf and petal micro-vibration.
- Power Law Exponent $1.4$: Roots remain stationary at the soil line ($0^{1.4} = 0$), while apex sways with maximum amplitude ($1^{1.4} = 1$).

---

## 5. Pointer Heliotropism (Phototropic Reach)

Plants naturally reach toward bright light sources (cursor or touch point). Rather than an unnatural linear stretch, compute inverse kinematics angle displacement:

$$\vec{D} = (x_{\text{pointer}} - x_{\text{apex}}, y_{\text{pointer}} - y_{\text{apex}})$$
$$d = \|\vec{D}\| = \sqrt{D_x^2 + D_y^2}$$
$$\theta_{\text{target}} = \operatorname{atan2}(D_y, D_x) + \frac{\pi}{2}$$

Angle displacement with quadratic falloff:
$$\Delta \theta_{\text{reach}} = \kappa \cdot \theta_{\text{target}} \cdot \frac{1}{1 + \left(\frac{d}{R_{\text{reach}}}\right)^2}$$
- $\kappa \approx 0.35$: Plant phototropic flexibility.
- $R_{\text{reach}} \approx 250\text{px}$: Effective light sensitivity horizon.

Smooth the reaction over time with exponential decay:
$$\theta_{\text{current}} = \theta_{\text{current}} + (\Delta \theta_{\text{reach}} - \theta_{\text{current}}) \cdot (1 - e^{-\lambda \Delta t})$$

---

## 6. Dandelion Parachute Seed Aerodynamics

When a dandelion head is tapped or blown, $N \approx 32$ parachute seeds detach with initial explosive radial velocity $\vec{v}_0$ and enter aerodynamic drift:

### Per-Frame Physics Update ($\Delta t$):
```javascript
// Horizontal drag towards ambient breeze
const targetVx = windSpeed * 1.5;
seed.vx += (targetVx - seed.vx) * 0.04;

// Terminal settling velocity (parachute drag balances gravity)
const terminalVy = 0.85; // px/frame
if (seed.vy < terminalVy) {
  seed.vy += 0.03; // gravity
} else {
  seed.vy += (terminalVy - seed.vy) * 0.08; // air resistance
}

// Gentle flutter oscillation
seed.x += seed.vx + Math.sin(seed.age * 0.08 + seed.id) * 0.7;
seed.y += seed.vy;
seed.age += 1;

// Soil impact & germination check
if (seed.y >= groundY) {
  seed.landed = true;
  // 5% germination probability on fertile soil
  if (Math.random() < 0.05) {
    germinateNewPlant(seed.x);
  }
}
```

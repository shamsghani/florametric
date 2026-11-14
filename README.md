# ✿ Florametric — Parametric Living ASCII Plants & Flowers

A generative, mathematical procedural engine for glowing, living ASCII flowers and plants. Zero dependencies. 100% parametric. Ready to deploy directly to **GitHub Pages** or drop into any website, blog, terminal CLI, or README.

🌿 **Live Demo on GitHub Pages**: [https://shamsghani.github.io/florametric/](https://shamsghani.github.io/florametric/)

```
       ######&&&88|
   #*#*#*#*#*#*#*#*#*#&&88#|
   ###################&&88#     <-- Swirling Golden Sunflower
   #*#*#*#*#*#*#*#*#*#&&88#         (100% pure glowing typographic marks)
       ######&&&88|
            ||
       +++++-         -+++++
        ***%### ||| ###%***     <-- Rhythmic leaf clusters & internodes
         |#%&%&% +|| %&%&%#|
            ||
            ||
            ||
   ---------||----------------- (Soil)
```

---

## ✨ Features

- **Pure Glowing Typography**: No solid background blocks. Pure characters rendered on an OLED dark background (`#050508`) with multi-scale atmospheric bloom halos.
- **100% Procedural & Math-Based**:
  - Continuous logistic growth curve: $L(t) = L_{max} \cdot \frac{1 - e^{-4t}}{1 - e^{-4}}$
  - Harmonic Euler wind oscillations and spring-damping physics
  - Polar and whorl flower geometry (Vogel Fibonacci spirals, rhodonea curves, and epitrochoids)
- **High Genetic Diversity (Deterministic DNA Seeds)**:
  - Every plant has a unique genetic profile: stem habits (*erect, weeping, S-curve, windswept, zig-zag*), branching patterns (0 to 3 lateral branches), and natural flower head tilts ($-20^\circ$ to $+20^\circ$).
- **Species-Specific Botanical Guidelines**:
  - **Sunflower**: Stout fibrous column stalk with cordate spade leaves on long petioles.
  - **Iris**: Tall upright sword-like ensiform blade leaves rising from the soil, smooth scape with internode sheaths.
  - **Thistle**: Decurrent spiny winged stem with prickles (`!`, `*`) and spiny lobed leaves.
  - **Dandelion**: Basal rosette of runcinate "lion's-tooth" leaves hugging the soil, completely leafless scape.
  - **Marigold**: Feathery pinnately compound paired leaflets along a central rachis.
  - **Tulip**: Broad curving sheath leaves clasping and cradling the lower stem.
  - **Daffodil**: Flat linear ribbon leaves rising from the base with a membranous neck spathe.
  - **Rose**: Sharp hooked thorns (`<`, `>`) alternating on the cane with serrated leaves.
  - **Hibiscus**: Meandering woody stem with petiolate ovate leaves.
- **5 Biological Growth Rules**:
  1. **Shoot Internodes**: Longer shoots have more vertical space to sprout leaves.
  2. **Spacing & Bunching**: Leaves inhibit adjacent nodes but cluster in natural rhythmic pairs and whorls.
  3. **Auxin & Branching**: Once a plant has $\ge 4$ healthy leaves, photosynthetic energy triggers an axillary secondary branch to sprout!
  4. **Leaf Energy Modulates Flowers**: Healthy active leaf count directly scales flower diameter, petal density, and secondary blossoms.
  5. **Senescence & Wilting**: As the plant matures and directs energy to flowers, the oldest basal leaves wilt, turning golden-brown/drab and drooping downward into curled glyphs (`\`, `~`, `v`, `.`).
- **Interactive Sunlight / Plant Food Nourishment**:
  - Toggle **Nourish Mode ☀️** to shower golden sunlight nutrient motes (`*`, `✦`, `°`, `·`, `☼`, `✧`, `+`) onto the garden by clicking, tapping, or dragging.
  - Accelerates plant growth velocity ($d(\text{age})/dt$), causes buds to burst into bloom, and revitalizes vitality!
- **Pointer & Cursor Reactive**:
  - **Heliotropism**: Stems and flower heads lean and reach smoothly towards your mouse pointer.
  - **Pollen Particle Drift**: Brushing your cursor against flowers releases drifting ASCII pollen particles.
- **5 Color Palettes**:
  - `botanical` (Authentic Glowing Colors)
  - `phosphor` (Matrix CRT Green)
  - `amber` (1982 Terminal Amber)
  - `cyberpunk` (Electric Neon Cyan & Magenta)
  - `monochrome` (Pure White on Black)

---

## 🚀 Quickstart: How to Add ASCII Plants to Things

### 1. Drop-In Web Component (Zero JavaScript Needed)

```html
<!-- Load the zero-dependency library -->
<script src="https://shamsghani.github.io/florametric/florametric.js"></script>

<!-- Add an animated, cursor-reactive flower -->
<florametric-plant type="sunflower" age="1.0" bloom="1.0" interactive></florametric-plant>

<!-- Add a neon hibiscus in matrix phosphor green -->
<florametric-plant type="hibiscus" palette="phosphor" height="320"></florametric-plant>
```

### 2. Vanilla JavaScript Canvas & Multi-Plant Garden

```html
<canvas id="my-garden" style="width: 100%; height: 500px;"></canvas>

<script src="florametric.js"></script>
<script>
  const garden = new Florametric.AsciiGarden('#my-garden', {
    wind: 0.65,
    palette: 'botanical'
  });

  // Plant seeds at specific X coordinates
  garden.addPlant(200, { type: 'sunflower', age: 1.0 });
  garden.addPlant(450, { type: 'hibiscus', age: 0.85 });
  garden.addPlant(700, { type: 'iris', age: 1.0 });

  // Start 60 FPS wind physics & cursor tracking loop
  garden.start();
</script>
```

### 3. Generate Static ASCII String (For READMEs, CLIs & Discord)

```javascript
const asciiArt = Florametric.generateString({
  type: 'sunflower',
  age: 1.0,
  bloom: 1.0,
  cols: 45,
  rows: 38
});

console.log(asciiArt);
```

---

## 🌐 Deploy to GitHub Pages

This project is built with 100% standard web technologies (pure vanilla HTML5, CSS3, ES6) with zero build steps or external dependencies.

1. In your GitHub repository **[shamsghani/florametric](https://github.com/shamsghani/florametric)**:
2. Navigate to **Settings** $\to$ **Pages**
3. Under **Branch**, select `main` and folder `/ (root)`
4. Click **Save**
5. Your garden will be live at `https://shamsghani.github.io/florametric/`!

---

## 📄 License

MIT License &copy; 2026 Shams Ghani. Free to use, adapt, and embed anywhere.

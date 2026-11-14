# Botanical Study: The Ten Florametric Species

This study is the reference for how Florametric draws each plant. For every species it
records the real-world shoot (stem, branches, leaves) and the flower. It then lists the
procedural parameters in `BOTANY` (`florametric.js`) that encode those traits.

In botany the *shoot system* is the stem together with its leaves and flowers, so the
study covers all three. Everything stays procedural: the profiles are ranges and
tendencies, and each individual's genome, seed and noise still vary within them.

---

## 1. Shoot parameters

| Parameter | Meaning | Low value | High value |
| :--- | :--- | :--- | :--- |
| `straightness` | How strongly the stem holds one direction between nodes | jagged, wandering (rose cane) | ruler-straight (iris scape) |
| `kink` | Direction change at each node, alternating sides (sympodial zigzag) | smooth | zigzag |
| `internode` | Distance between nodes, where kinks, prickles and node marks occur | short (marigold) | long (leafless scapes) |
| `meander` | Low-frequency wandering of the stem | stiff | sinuous |
| `habitAmp` | How much the genome's stem habit (curved, S-curve…) is expressed | habit suppressed | fully expressed |
| `flex` | Bending response to wind | woody, stiff | hollow, whippy |
| `width`, `taper` | Stem thickness at the base and how much it narrows | thin scape | stout stalk |
| `texture` | Surface: hairy, thorny, spiny-winged, woody, ridged, two-edged, smooth | | |
| `nod`, `neck` | Flower-head nodding and the bend of the stalk just below it | upright | facing sideways or down |
| `branch.*` | Branch count cap, angle, straightness, kink, up-turn | | |
| `leaf.*` | Leaf form, size, width ratio, petiole, margin, droop | | |

---

## 2. Species

### Sunflower — *Helianthus annuus*
* **Stem:** a single stout, rough-hairy (hispid) stalk that is very straight and stiff. It is
  unbranched in cultivars; wild plants branch from the upper axils, and their branches curve
  upward. The stalk is pale green.
* **Leaves:** large, broadly ovate to cordate (heart-shaped) blades with serrate margins and
  long petioles. Lower leaves are opposite and upper leaves alternate. Large blades droop
  under their own weight.
* **Flower:** a capitulum. Fibonacci-numbered ray florets (21 / 34 / 55) form golden
  strap-shaped "petals" around a brown disc of florets packed in phyllotactic spirals
  (137.5°). Green involucral bracts sit behind the rays. The outermost ring of disc florets
  opens first and shows yellow pollen.
* **Habit:** heads track the sun while young; mature heads **nod** downward and face east.
* **Bud:** a flat disc closed under overlapping green bracts.
* **Seed head:** a brown disc of seeds that dries and droops.
* **Parameters:** `straightness 0.92`, `kink 0.02`, `flex 0.55`, `width 8`, `texture hairy`,
  `nod 0.5`; leaves `cordate`, petiole 0.32; branches max 2, up-turn 0.55.

### Hibiscus — *Hibiscus rosa-sinensis*
* **Stem:** a woody, much-branched shrub. Stems are moderately straight but change
  direction a little at each node, and the lower stem is brown and woody with leaf scars.
* **Leaves:** alternate, glossy, ovate with serrate upper margins and short petioles.
* **Flower:** five large, broad, overlapping petals in a funnel, with a darker "eye" at the
  base. A long **staminal column** projects from the centre, carrying anthers along its upper
  part and five red stigma pads at the tip. An epicalyx and calyx sit below.
* **Bud:** a twisted green spindle (the petals are rolled in convolute aestivation).
* **Seed head:** a capsule.
* **Parameters:** `straightness 0.7`, `kink 0.12`, `texture woody`; leaves `ovate`;
  branches max 3, angle 0.5–1.0.

### Iris — *Iris germanica*
* **Stem:** a smooth, ruler-straight, glaucous scape that may carry one side branch. Papery
  spathes sheath the buds.
* **Leaves:** basal and sword-shaped (ensiform), arranged in an equitant fan from the
  rhizome, glaucous blue-green.
* **Flower:** three upright **standards** that arch inward, three drooping **falls** that
  flare outward and curl under (each with a fuzzy yellow **beard**), and three petal-like
  style arms over the falls.
* **Bud:** a narrow, pointed spear.
* **Seed head:** a three-chambered capsule.
* **Parameters:** `straightness 0.97`, `kink 0.01`, `texture scape`, bluish stem tint;
  basal `sword` leaves.

### Thistle — *Cirsium vulgare*
* **Stem:** erect, branched, ridged and hairy, with **spiny wings** running down the stem
  from each leaf base (decurrent). It is moderately straight with slight node kinks.
* **Leaves:** deeply pinnatifid lobes, each ending in a sharp spine.
* **Flower:** a capitulum. An urn- to egg-shaped **involucre** of overlapping, spine-tipped
  bracts is topped by a dense brush of purple tubular florets that spray outward.
* **Bud:** a spiny green globe.
* **Seed head:** a pappus puff (here, a drying disc).
* **Parameters:** `straightness 0.78`, `kink 0.07`, `texture winged`; leaves `spinyLobed`.

### French marigold — *Tagetes patula*
* **Stem:** low, bushy and much-branched, with ridged stems often flushed purplish-red.
  Short internodes and frequent small direction changes.
* **Leaves:** pinnate with many narrow, lanceolate, serrate leaflets (aromatic).
* **Flower:** a double "pompon" capitulum of many layered, ruffled ligules. It is often
  **bicolor**: yellow or orange with a mahogany-red blotch at the petal base. Florets sit in
  rings that form a dome over a green involucral tube.
* **Seed head:** dried bracts around a seed cluster.
* **Parameters:** `straightness 0.75`, `kink 0.10`, `internode 16`, `texture ridged`,
  red-tinted stem; leaves `pinnateFine`; branches max 3, wide angles.

### Daffodil — *Narcissus pseudonarcissus*
* **Stem:** a leafless, hollow, **two-edged** (flattened) scape that is very straight and
  unbranched. Just below the flower it bends (the "swan neck"), so the flower faces
  **sideways**. A dry papery **spathe** sits behind the flower.
* **Leaves:** basal, strap-shaped and flat, arching outward.
* **Flower:** six tepals (the perianth) radiate as a star around a **corona** (cup or
  trumpet) with a ruffled rim. In nature the flower faces sideways, but a side view of a
  trumpet reads as a tangle at ASCII scale, so the renderer turns the head about 30° toward
  the viewer: the tepals start at the cup's edge, the cup is a textured ring (`% & #`) with
  a bright ruffled rim (`~`) and a dark throat (`@ #`), and the green ovary and papery spathe
  sit just below and behind it.
* **Bud:** a pointed spindle inside the papery spathe, angled sideways.
* **Parameters:** `straightness 0.95`, `kink 0`, `texture twoEdged`, `neck 16`;
  basal `strap` leaves.

### Rose — *Rosa* (garden / sweet briar)
* **Stem:** a woody **cane** that grows sympodially, so it changes direction at every node
  and forms a **zigzag**. It carries hooked **prickles** (botanically not thorns), often
  reddish. Branches arch outward rather than up.
* **Leaves:** odd-pinnate with five to seven ovate, serrate leaflets, and a pair of
  stipules at the base.
* **Flower:** many petals arranged in a **spiral**: inner petals cupped upright and tight,
  outer petals reflexed with curled lips. Five slender sepals reflex down as the flower
  opens.
* **Bud:** a pointed, spirally wrapped cone.
* **Seed head:** a **hip**, a swollen fruit crowned by withered sepals.
* **Parameters:** `straightness 0.45`, `kink 0.22`, `internode 22`, `texture thorny`;
  leaves `pinnate`; branches max 3, `straightness 0.45`, up-turn 0.1 (arching).

### Dandelion — *Taraxacum officinale*
* **Stem:** a leafless, hollow, smooth, pale scape. It is unbranched and very **flexible**:
  it curves gracefully and bends readily in the wind.
* **Leaves:** a basal rosette of runcinate "lion's-tooth" leaves whose lobes point back
  toward the base.
* **Flower:** a flat golden head of hundreds of strap-shaped ray florets (no disc florets),
  with outer green bracts that reflex downward. After flowering the head closes, then
  reopens as the **seed clock**: a sphere of parachute seeds (achene, beak, pappus).
* **Parameters:** `straightness 0.97`, `flex 1.35`, `width 2.5`, `texture smooth`, pale
  stem; rosette; two flower phases (yellow head, then seed clock).

### Tulip — *Tulipa gesneriana*
* **Stem:** stout, smooth, glaucous, straight and unbranched, often curving slightly near
  the top.
* **Leaves:** two to four broad, lanceolate, glaucous leaves that clasp the stem base and
  arch outward with gently wavy margins.
* **Flower:** a **goblet** of six tepals, three outer and three inner. They are closed and
  egg-shaped at first and open wider in sun. Dark stamens are visible inside. Buds are
  green and colour up as they mature.
* **Parameters:** `straightness 0.96`, `kink 0`, `width 5`, `texture smooth`;
  broad basal leaves.

### Venus flytrap — *Dionaea muscipula*
* **Shoot:** a low **rosette**. Each leaf has a flat, winged, heart-shaped petiole ending
  in a **trap**: two kidney-shaped lobes hinged on the midrib, red inside, rimmed with long
  marginal **cilia** (the "teeth").
* **Flower:** a tall, thin, smooth scape held far above the traps, which keeps pollinators
  away from them. It carries a small **umbel of white five-petalled flowers** with green
  centres.
* **Parameters:** `straightness 0.95`, `width 2`, `texture smooth`; foliage = trap
  rosette; flower = white umbel.

---

## 3. How the parameters drive the drawing

* **Stem spine:** integrated upward from the base in fixed 8 px steps, keyed to absolute
  height so tissue that has already grown keeps its shape. The heading at each step is:
  * a node kink that alternates sides at every `internode`;
  * plus high-frequency jaggedness, scaled by (1 − `straightness`);
  * plus low-frequency meander.

  Straight species follow that target heading smoothly; jagged species jump to it at each
  node.
* **Stem rendering:** 1–3 parallel strokes (from `width` and `taper`), every glyph rotated
  to the local tangent, then the `texture` adornments: hairs, prickles, spiny wings, node
  scars, ridges or spathes.
* **Leaves:** drawn as laminas: a parametric outline `w(u)` (cordate, ovate, lanceolate,
  obovate, linear…) traced with rotated strokes, plus midrib, veins and optional
  serration. Pinnate leaves place leaflets along a rachis.
* **Flowers:** each species is built from the same primitives: laminas for petals,
  tepals, sepals and bracts; phyllotactic spirals for florets; Fibonacci spheres for
  seed clocks. Buds are the same petals folded closed (opening angle → 0) and tinted toward
  green, so anthesis is continuous rather than staged.

import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

os.makedirs("test/output", exist_ok=True)

# Botanical ASCII Engine: Dedicated Species Stem & Foliage Blueprint System
# Each species has its own unique mathematical rules for stem texture/structure and leaf morphology.

from generate_polished_gemini import MasterGlowingRenderer, draw_flower_by_type

class SpeciesBlueprint:
    """
    Defines botanical morphology rules for each plant type:
    - Stem architecture (thickness, spine, texture, thorns, wings, sheaths)
    - Leaf architecture (ensiform sword, lion's tooth, feathery pinnate, cordate spade, spiny lobed, clasping sheath)
    - Phyllotaxis (basal rosette vs alternate vs opposite vs whorled)
    """

    @staticmethod
    def draw_plant(renderer, ox, ground_y, p, seed=42):
        rng = random.Random(seed)
        p_type = p['type']
        nodes = p['stem_nodes']
        shoot_h = p['shoot_h']
        leaves = p['leaves']
        branches = p['branches']
        f_scale = p['flower_scale']
        bloom = p['bloom']
        age = p['age']
        
        # Color palettes
        C_STEM = (85, 230, 75)
        C_STEM_DARK = (45, 175, 45)
        C_WILT = (175, 140, 45)
        C_DEAD = (125, 95, 40)
        
        # -------------------------------------------------------------
        # 1. SPECIES-SPECIFIC STEM DRAWING
        # -------------------------------------------------------------
        if p_type == 'sunflower':
            # SUNFLOWER: Heavy, fibrous, triple/double column stalk with rough nodes
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                ch = "%" if i%5==0 else ("#" if i%7==0 else "|")
                if n['y'] < shoot_h * 0.6:
                    renderer.add(px - 4, py, "|", C_STEM, size=14, glow_rad=8)
                    renderer.add(px, py, ch, C_STEM, size=14, glow_rad=8)
                    renderer.add(px + 4, py, "|", C_STEM, size=14, glow_rad=8)
                else:
                    renderer.add(px - 2, py, "|", C_STEM, size=14, glow_rad=8)
                    renderer.add(px + 2, py, ch, C_STEM, size=14, glow_rad=8)

        elif p_type == 'iris':
            # IRIS: Slender, smooth, angular scape with triangular node sheaths
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                ch = "/" if (i > 10 and nodes[i]['x'] > nodes[i-5]['x']) else ("\\" if (i > 10 and nodes[i]['x'] < nodes[i-5]['x']) else "|")
                renderer.add(px, py, ch, C_STEM, size=14, glow_rad=7)
                # Bract node sheaths (sharp triangular sheath embracing stem at internodes)
                if i % 12 == 0 and i > 5 and i < len(nodes) - 8:
                    renderer.add(px - 4, py - 4, "(", C_STEM_DARK, size=13, glow_rad=6)
                    renderer.add(px + 4, py - 4, ")", C_STEM_DARK, size=13, glow_rad=6)

        elif p_type == 'thistle':
            # THISTLE: Spiny winged stem! Longitudinal spiny wings running up the stem
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                # Main stem
                renderer.add(px, py, "|", C_STEM, size=14, glow_rad=8)
                # Decurrent spiny wings with prickles
                if i % 3 == 0:
                    renderer.add(px - 5, py, "!", C_STEM, size=12, glow_rad=6)
                    renderer.add(px + 5, py, "!", C_STEM, size=12, glow_rad=6)
                if i % 6 == 0:
                    renderer.add(px - 7, py, "*", C_STEM_DARK, size=10, glow_rad=6)
                    renderer.add(px + 7, py, "*", C_STEM_DARK, size=10, glow_rad=6)

        elif p_type == 'dandelion':
            # DANDELION: Leafless hollow scape! Completely bare single tubular stem
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                renderer.add(px, py, "|", (130, 215, 80), size=14, glow_rad=7)

        elif p_type == 'rose':
            # ROSE: Woody thorny cane with sharp alternating hooked thorns
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                renderer.add(px, py, "|", C_STEM, size=14, glow_rad=8)
                # Hooked thorns projecting left and right
                if i % 8 == 0 and i > 4:
                    thorn_side = -1 if (i % 16 == 0) else 1
                    thorn_ch = "<" if thorn_side < 0 else ">"
                    renderer.add(px + thorn_side * 6, py, thorn_ch, (200, 60, 60), size=13, glow_rad=6)

        elif p_type == 'tulip':
            # TULIP: Smooth fleshy cylindrical scape, pristine glaucous green
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                renderer.add(px - 2, py, "|", C_STEM, size=14, glow_rad=7)
                renderer.add(px + 2, py, "|", C_STEM, size=14, glow_rad=7)

        elif p_type == 'marigold':
            # MARIGOLD: Slender multi-branched ridged square stem
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                ch = ":" if i%4==0 else "|"
                renderer.add(px, py, ch, C_STEM, size=13, glow_rad=7)

        elif p_type == 'daffodil':
            # DAFFODIL: Slender scape with paper-thin papery spathe neck at apex
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                renderer.add(px, py, "|", C_STEM, size=14, glow_rad=7)
            # Papery brown spathe wrapping neck under flower
            apex_x = ox + nodes[-1]['x']
            apex_y = ground_y - nodes[-1]['y']
            renderer.add(apex_x - 4, apex_y + 4, "(", (180, 150, 80), size=13, glow_rad=6)
            renderer.add(apex_x + 4, apex_y + 4, ")", (180, 150, 80), size=13, glow_rad=6)

        else: # hibiscus and defaults
            # HIBISCUS: Woody organic meandering stem
            for i, n in enumerate(nodes):
                px = ox + n['x']
                py = ground_y - n['y']
                ch = "%" if i%6==0 else ("+" if i%7==0 else "|")
                if n['y'] < shoot_h * 0.4:
                    renderer.add(px - 3, py, "|", C_STEM, size=14, glow_rad=8)
                    renderer.add(px + 3, py, ch, C_STEM, size=14, glow_rad=8)
                else:
                    renderer.add(px, py, ch, C_STEM, size=14, glow_rad=8)

        # -------------------------------------------------------------
        # 2. SPECIES-SPECIFIC LEAF & FOLIAGE DRAWING
        # -------------------------------------------------------------
        if p_type == 'iris':
            # IRIS LEAVES: Long, upright, sword-like ensiform blades rising from base!
            # They do not branch from the upper stem; they rise from soil like tall green sabres
            blade_heights = [shoot_h * 0.55, shoot_h * 0.70, shoot_h * 0.85, shoot_h * 0.65]
            blade_x_offsets = [-22, -10, 12, 24]
            for bh, bx in zip(blade_heights, blade_x_offsets):
                blade_steps = int(bh / 10)
                for bi in range(blade_steps):
                    bt = bi / blade_steps
                    by = ground_y - (bi * 10)
                    curv = math.sin(bt * math.pi * 0.5) * (bx * 0.4)
                    px = ox + bx + curv
                    ch = "/" if bx > 0 else "\\"
                    col = C_STEM if bt < 0.7 else C_STEM_DARK
                    renderer.add(px, by, ch, col, size=13, glow_rad=7)
                # Sharp pointed tip
                renderer.add(ox + bx + (bx*0.4), ground_y - bh, "^", C_STEM, size=12, glow_rad=8)

        elif p_type == 'dandelion':
            # DANDELION LEAVES: Basal rosette of deeply jagged "lion's tooth" leaves hugging the ground!
            # Zero leaves on the flower stem!
            for leaf_ang in [-1.2, -0.7, -0.3, 0.3, 0.7, 1.2]:
                leaf_len = rng.uniform(45, 75) * age
                # Teeth along leaf
                for dist in range(10, int(leaf_len), 8):
                    lx = ox + math.sin(leaf_ang) * dist
                    ly = ground_y - math.cos(leaf_ang) * (dist * 0.35)
                    # Jagged triangular runcinate teeth (pointing backward!)
                    ch = ">" if leaf_ang < 0 else "<"
                    renderer.add(lx, ly, ch, C_STEM, size=13, glow_rad=7)
                    renderer.add(lx, ly - 3, "#", C_STEM_DARK, size=11, glow_rad=6)

        elif p_type == 'marigold':
            # MARIGOLD LEAVES: Pinnately compound! Multiple small feathery paired leaflets along rachis
            for leaf in leaves:
                ly = leaf['y']
                side = leaf['side']
                t = ly / max(1, shoot_h)
                n_idx = min(len(nodes)-1, int(t * (len(nodes)-1)))
                lx = ox + nodes[n_idx]['x']
                ly_screen = ground_y - ly
                
                # Central petiole
                rachis_len = 32
                for r_step in range(8, rachis_len, 8):
                    rx = lx + side * r_step
                    ry = ly_screen - (r_step * 0.3)
                    renderer.add(rx, ry, "-", C_STEM, size=12, glow_rad=6)
                    # Paired mini-leaflets
                    renderer.add(rx, ry - 6, "/", C_STEM, size=11, glow_rad=6)
                    renderer.add(rx, ry + 6, "\\", C_STEM, size=11, glow_rad=6)

        elif p_type == 'tulip':
            # TULIP LEAVES: Large broad clasping leaves cradling the lower stem!
            # Deep curving trough wrapping stem
            for side in [-1, 1]:
                t_leaf_h = shoot_h * 0.55
                for step in range(0, int(t_leaf_h), 9):
                    lt = step / t_leaf_h
                    ly = ground_y - step
                    # Wide outward curve then arching back in
                    arch = math.sin(lt * math.pi) * 28 * side
                    lx = ox + arch
                    ch = "(" if side < 0 else ")"
                    renderer.add(lx, ly, ch, C_STEM, size=15, glow_rad=8)
                    renderer.add(lx + side * 3, ly, "|", C_STEM_DARK, size=13, glow_rad=7)

        elif p_type == 'thistle':
            # THISTLE LEAVES: Deeply lobed, spiny, undulate leaves with needle tips
            for leaf in leaves:
                ly = leaf['y']
                side = leaf['side']
                t = ly / max(1, shoot_h)
                n_idx = min(len(nodes)-1, int(t * (len(nodes)-1)))
                lx = ox + nodes[n_idx]['x']
                ly_screen = ground_y - ly
                
                spiny_pts = [
                    (side * 8, -6, "/"), (side * 16, -10, "*"), (side * 22, -6, "\\"),
                    (side * 12, 0, "#"), (side * 20, 0, "%"), (side * 28, 0, "!"), # needle tip!
                    (side * 8, 6, "\\"), (side * 16, 10, "*"), (side * 24, 6, "/"),
                ]
                for ox_l, oy_l, ch in spiny_pts:
                    renderer.add(lx + ox_l, ly_screen + oy_l, ch, C_STEM, size=13, glow_rad=7)

        elif p_type == 'daffodil':
            # DAFFODIL LEAVES: Flat linear ribbon-like leaves rising from ground
            for side in [-1, 1]:
                leaf_h = shoot_h * 0.75
                for step in range(0, int(leaf_h), 10):
                    lx = ox + side * 16
                    ly = ground_y - step
                    renderer.add(lx, ly, "|", C_STEM, size=14, glow_rad=7)
                renderer.add(ox + side * 16, ground_y - leaf_h, "n", C_STEM, size=13, glow_rad=7)

        else:
            # SUNFLOWER / HIBISCUS: Broad cordate / ovate leaves with distinct midrib vein & serration
            for leaf in leaves:
                ly = leaf['y']
                side = leaf['side']
                t = ly / max(1, shoot_h)
                n_idx = min(len(nodes)-1, int(t * (len(nodes)-1)))
                lx = ox + nodes[n_idx]['x']
                ly_screen = ground_y - ly
                
                if leaf['is_wilted']:
                    wilt_pts = [(side * 8, 4, "\\"), (side * 14, 10, "~"), (side * 19, 16, "v"), (side * 23, 22, ".")]
                    for ox_l, oy_l, ch in wilt_pts:
                        renderer.add(lx + ox_l, ly_screen + oy_l, ch, C_DEAD, size=13, glow_col=C_WILT, glow_rad=6)
                else:
                    leaf_glyphs = [
                        (side * 8, -10, "+"), (side * 14, -10, "+"), (side * 20, -10, "+"), (side * 26, -10, "-"),
                        (side * 6, -2, "|"), (side * 12, -2, "*"), (side * 18, -2, "%"), (side * 24, -2, "#"), (side * 30, -2, "#"),
                        (side * 8, 6, "|"), (side * 14, 6, "#"), (side * 20, 6, "%"), (side * 26, 6, "&"), (side * 32, 6, "%"),
                        (side * 10, 14, "+"), (side * 16, 14, "+"), (side * 22, 14, "+"), (side * 28, 14, "/"),
                    ]
                    for ox_l, oy_l, ch in leaf_glyphs:
                        renderer.add(lx + ox_l, ly_screen + oy_l, ch, C_STEM, size=13, glow_rad=8)

        # -------------------------------------------------------------
        # 3. BRANCHES & SECONDARY BLOSSOMS
        # -------------------------------------------------------------
        for b in branches:
            t = b['start_y'] / max(1, shoot_h)
            n_idx = min(len(nodes)-1, int(t * (len(nodes)-1)))
            bx0 = ox + nodes[n_idx]['x']
            by0 = ground_y - b['start_y']
            bside = b['side']
            blen = b['length']
            b_ang = b['angle']
            for bi in range(0, blen, 8):
                curv_x = bx0 + bside * (bi * math.sin(b_ang) + math.sin(bi * 0.12) * 5)
                curv_y = by0 - (bi * math.cos(b_ang))
                renderer.add(curv_x, curv_y, "/" if bside > 0 else "\\", C_STEM, size=13, glow_rad=8)
            if b['has_flower']:
                f_end_x = bx0 + bside * (blen * math.sin(b_ang))
                f_end_y = by0 - (blen * math.cos(b_ang))
                draw_flower_by_type(renderer, p_type, f_end_x, f_end_y, f_scale * 0.65, bloom)

        # -------------------------------------------------------------
        # 4. APICAL FLOWER HEAD
        # -------------------------------------------------------------
        apex_x = ox + nodes[-1]['x']
        apex_y = ground_y - nodes[-1]['y']
        tilt = p.get('head_tilt', 0.0)
        tilt_x = apex_x + math.sin(tilt) * 18
        tilt_y = apex_y - math.cos(tilt) * 14
        
        draw_flower_by_type(renderer, p_type, tilt_x, tilt_y, f_scale, bloom)

# Generate a showcase comparing the 6 species with their bespoke stems & leaves!
from test_genetic_variance import GeneticPlantSimulator

def render_bespoke_species_gallery():
    w = 1500
    h = 900
    renderer = MasterGlowingRenderer(w=w, h=h, bg=(5, 5, 8))
    
    species = ["sunflower", "iris", "dandelion", "thistle", "marigold", "tulip"]
    col_w = w // len(species)
    
    for i, sp in enumerate(species):
        ox = i * col_w + col_w // 2
        oy = h - 60
        
        sim = GeneticPlantSimulator(seed=100 + i*37, plant_type=sp)
        p_data = sim.simulate(age=1.0)
        p_data['type'] = sp
        
        SpeciesBlueprint.draw_plant(renderer, ox, oy, p_data, seed=100 + i*37)
        
    renderer.render_file("test/output/bespoke_species_stems_leaves.png")

render_bespoke_species_gallery()
print("Rendered bespoke species stems and leaves gallery!")

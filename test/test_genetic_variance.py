import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

os.makedirs("test/output", exist_ok=True)

# Testing Deep Genetic Variance & Random Morphological Forms
# Generating 5 distinct specimens of the SAME species (Sunflower) showing large structural variance!

class GeneticPlantSimulator:
    def __init__(self, seed=42, plant_type="sunflower"):
        self.rng = random.Random(seed)
        self.seed = seed
        self.type = plant_type
        
        # 1. Stem Genetic Profile
        self.habit = self.rng.choice(['erect', 'curved_left', 'curved_right', 's_curve', 'windswept', 'zigzag'])
        self.stem_height = self.rng.uniform(320, 440)
        self.bend_amp = self.rng.uniform(15, 45)
        self.bend_freq = self.rng.uniform(0.7, 1.3)
        self.stem_wiggle = self.rng.uniform(2, 6)
        
        # 2. Branching Genetic Profile
        # Some plants have no branches, some 1, some 2, some 3!
        self.max_branches = self.rng.choice([0, 1, 1, 2, 2, 3])
        self.branch_angles = [self.rng.uniform(0.5, 0.9) for _ in range(3)]
        self.branch_lengths = [self.rng.uniform(0.35, 0.55) for _ in range(3)]
        
        # 3. Foliage Genetic Profile
        self.num_leaf_clusters = self.rng.randint(2, 5)
        self.leaves_per_cluster = self.rng.choice([1, 2, 2, 3])
        self.leaf_size_scale = self.rng.uniform(0.8, 1.3)
        self.leaf_angle_jitter = self.rng.uniform(-0.25, 0.25)
        
        # 4. Flower Head Genetic Profile
        self.head_tilt = self.rng.uniform(-0.35, 0.35) # nodding or tilted head!
        self.flower_scale_mod = self.rng.uniform(0.85, 1.3)
        self.petal_count_mod = self.rng.uniform(0.8, 1.3)
        self.petal_curl_chaos = self.rng.uniform(0.6, 1.4)
        
        # 5. Color Mutation Profile (subtle genetic pigmentation shifts)
        self.hue_shift = self.rng.uniform(-25, 25)

    def simulate(self, age=1.0):
        shoot_h = max(25, int(self.stem_height * age))
        stem_segments = int(shoot_h / 8)
        stem_nodes = []
        
        dir_mult = -1 if 'left' in self.habit else 1
        
        for i in range(stem_segments + 1):
            t = i / max(1, stem_segments)
            
            # Form-specific spline math
            if self.habit == 'erect':
                dx = math.sin(t * math.pi) * 8 * dir_mult
            elif 'curved' in self.habit:
                dx = math.sin(t * math.pi * 0.8) * self.bend_amp * dir_mult
            elif self.habit == 's_curve':
                dx = math.sin(t * math.pi * 1.8) * (self.bend_amp * 0.7)
            elif self.habit == 'windswept':
                dx = (t ** 1.6) * (self.bend_amp * 1.5) * dir_mult
            elif self.habit == 'zigzag':
                dx = math.sin(t * math.pi * 3.5) * 12
            else:
                dx = math.sin(t * math.pi) * 15
                
            # Add organic organic micro-wiggle
            dx += math.sin(t * 14.0) * self.stem_wiggle * t
            y = t * shoot_h
            stem_nodes.append({'x': dx, 'y': y, 't': t})
            
        # Leaves
        leaves = []
        if age > 0.20:
            for c in range(1, self.num_leaf_clusters + 1):
                target_y = int((c / (self.num_leaf_clusters + 1)) * shoot_h)
                if target_y < shoot_h - 30:
                    for l_idx in range(self.leaves_per_cluster):
                        side = -1 if (l_idx % 2 == 0) else 1
                        leaves.append({
                            'y': target_y + (l_idx * 5),
                            'side': side,
                            'is_wilted': (age > 0.65 and target_y < self.stem_height * 0.3),
                            'size': self.leaf_size_scale * self.rng.uniform(0.9, 1.1)
                        })

        # Branches
        active_leaves = [l for l in leaves if not l['is_wilted']]
        branches = []
        if len(active_leaves) >= 3 and age > 0.60 and self.max_branches > 0:
            actual_branches = min(self.max_branches, len(active_leaves) // 2)
            for b_i in range(actual_branches):
                origin_l = active_leaves[min(len(active_leaves)-1, b_i * 2 + 1)]
                b_progress = (age - 0.60) / 0.40
                b_len = int(shoot_h * self.branch_lengths[b_i] * b_progress)
                branches.append({
                    'start_y': origin_l['y'],
                    'side': origin_l['side'],
                    'length': b_len,
                    'angle': self.branch_angles[b_i],
                    'has_flower': (b_progress > 0.8)
                })

        flower_scale = (0.7 + len(active_leaves) * 0.08) * self.flower_scale_mod
        
        return {
            'stem_nodes': stem_nodes,
            'shoot_h': shoot_h,
            'leaves': leaves,
            'branches': branches,
            'flower_scale': flower_scale,
            'head_tilt': self.head_tilt,
            'petal_count_mod': self.petal_count_mod,
            'petal_curl_chaos': self.petal_curl_chaos,
            'age': age,
            'is_bud': (age > 0.45),
            'bloom': min(1.0, max(0.0, (age - 0.5) / 0.5)) if age > 0.5 else 0.0
        }

# Render 5 specimens of Sunflower with different seeds
from generate_polished_gemini import MasterGlowingRenderer, draw_gemini_sunflower as draw_sunflower_head

def test_genetic_variance():
    w = 1600
    h = 800
    renderer = MasterGlowingRenderer(w=w, h=h, bg=(5, 5, 8))
    
    seeds = [101, 777, 404, 8888, 9999]
    col_w = w // len(seeds)
    
    for i, s in enumerate(seeds):
        ox = i * col_w + col_w // 2
        oy = h - 60
        
        sim = GeneticPlantSimulator(seed=s, plant_type="sunflower")
        p = sim.simulate(age=1.0)
        
        # Draw stem with varying double/single lines
        nodes = p['stem_nodes']
        shoot_h = p['shoot_h']
        C_STEM = (85, 230, 75)
        
        for n_i, node in enumerate(nodes):
            px = ox + node['x']
            py = oy - node['y']
            ch = "%" if (n_i % 6 == 0) else ("+" if (n_i % 7 == 0) else "|")
            if node['y'] < shoot_h * 0.45:
                renderer.add(px - 3, py, "|", C_STEM, size=14, glow_rad=8)
                renderer.add(px + 3, py, ch, C_STEM, size=14, glow_rad=8)
            else:
                renderer.add(px, py, ch, C_STEM, size=14, glow_rad=8)
                
        # Leaves
        for leaf in p['leaves']:
            ly = leaf['y']
            side = leaf['side']
            t = ly / max(1, shoot_h)
            n_idx = min(len(nodes)-1, int(t * (len(nodes)-1)))
            lx = ox + nodes[n_idx]['x']
            ly_screen = oy - ly
            sz_scale = leaf['size']
            
            if leaf['is_wilted']:
                wilt_pts = [(side * 8, 4, "\\"), (side * 14, 10, "~"), (side * 19, 16, "v"), (side * 23, 22, ".")]
                for ox_l, oy_l, ch in wilt_pts:
                    renderer.add(lx + ox_l, ly_screen + oy_l, ch, (125, 95, 40), size=13, glow_col=(175, 140, 45), glow_rad=6)
            else:
                leaf_glyphs = [
                    (side * 8 * sz_scale, -10, "+"), (side * 14 * sz_scale, -10, "+"), (side * 20 * sz_scale, -10, "+"), (side * 26 * sz_scale, -10, "-"),
                    (side * 6 * sz_scale, -2, "|"), (side * 12 * sz_scale, -2, "*"), (side * 18 * sz_scale, -2, "%"), (side * 24 * sz_scale, -2, "#"), (side * 30 * sz_scale, -2, "#"),
                    (side * 8 * sz_scale, 6, "|"), (side * 14 * sz_scale, 6, "#"), (side * 20 * sz_scale, 6, "%"), (side * 26 * sz_scale, 6, "&"), (side * 32 * sz_scale, 6, "%"),
                    (side * 10 * sz_scale, 14, "+"), (side * 16 * sz_scale, 14, "+"), (side * 22 * sz_scale, 14, "+"), (side * 28 * sz_scale, 14, "/"),
                ]
                for ox_l, oy_l, ch in leaf_glyphs:
                    renderer.add(lx + ox_l, ly_screen + oy_l, ch, C_STEM, size=int(13 * sz_scale), glow_rad=8)
                    
        # Branches
        for b in p['branches']:
            t = b['start_y'] / max(1, shoot_h)
            n_idx = min(len(nodes)-1, int(t * (len(nodes)-1)))
            bx0 = ox + nodes[n_idx]['x']
            by0 = oy - b['start_y']
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
                draw_sunflower_head(renderer, f_end_x, f_end_y, p['flower_scale'] * 0.6, 1.0)

        # Apex Flower with Head Tilt & Petal Chaos!
        apex_x = ox + nodes[-1]['x']
        apex_y = oy - nodes[-1]['y']
        
        # Apply head tilt
        tilt = p['head_tilt']
        tilt_x = apex_x + math.sin(tilt) * 20
        tilt_y = apex_y - math.cos(tilt) * 15
        
        draw_sunflower_head(renderer, tilt_x, tilt_y, p['flower_scale'], 1.0)
        
    renderer.render_file("test/output/sunflower_genetic_diversity.png")

test_genetic_variance()
print("Genetic diversity test rendered!")

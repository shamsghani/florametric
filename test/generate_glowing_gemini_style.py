import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

os.makedirs("test/output", exist_ok=True)

# Botanical ASCII Engine: Biological Growth Simulation + Glowing Typography
# Direct alignment with user's Gemini reference image and biological growth mechanics.

class PlantGrowthSimulation:
    def __init__(self, seed=42):
        self.rng = random.Random(seed)
        
    def grow_plant(self, plant_type="sunflower", age=1.0, max_height=280):
        # 1. Biological parameters based on age
        # Age 0.0 -> 1.0
        # Shoot length grows with age
        shoot_len = max(20, int(max_height * age))
        
        # Internode physics: Longer shoot has more nodes
        # Base node count
        num_potential_nodes = int(shoot_len / 22)
        
        # Rule 1: A plant with a longer shoot has more chances of sprouting new leaves
        # Rule 2: New leaves will want to not grow right next to an old leaf, but leaves will also kind of bunch together
        leaves = []
        last_leaf_y = -999
        
        # Shoot curve function: gentle organic lean
        curve_dir = self.rng.choice([-1, 1])
        curve_amp = self.rng.uniform(8, 20)
        
        # Build main stem nodes
        stem_points = []
        for i in range(shoot_len):
            progress = i / max(1, shoot_len)
            # Natural sway curve: slight S-bend or lean
            dx = curve_amp * math.sin(progress * math.pi) * curve_dir
            # Y goes from ground (0) upwards to apex
            stem_points.append((dx, i))
            
        # Determine leaf placements along stem
        # Leaves start appearing after stem is at least 30% grown
        if age > 0.25:
            # We cluster leaves around 2-3 nodal regions (bunching together)
            cluster_centers = [0.35, 0.55, 0.75]
            for cc in cluster_centers:
                if progress_to_reach := cc * max_height:
                    if shoot_len >= progress_to_reach:
                        # Cluster of 1-3 leaves around this node
                        node_y = int(progress_to_reach)
                        # Spacing check from last leaf cluster
                        if abs(node_y - last_leaf_y) > 25:
                            cluster_size = self.rng.choice([1, 2, 2, 3])
                            for c_idx in range(cluster_size):
                                leaf_side = -1 if (len(leaves) % 2 == 0) else 1
                                offset_y = node_y + (c_idx * 8)
                                if offset_y < shoot_len - 15: # Don't grow on top of terminal bud
                                    leaves.append({
                                        'y': offset_y,
                                        'side': leaf_side,
                                        'age': age - (offset_y / max_height * 0.3),
                                        'is_wilted': False
                                    })
                            last_leaf_y = node_y

        # Rule 5: Leaves can sometimes wilt and die (basal/oldest leaves when plant matures)
        if age > 0.75 and len(leaves) > 2:
            # The lowest leaf or two may wilt
            for leaf in leaves[:2]:
                if leaf['y'] < shoot_len * 0.4:
                    leaf['is_wilted'] = True

        # Rule 3: If a plant has enough leaves, it will want to grow another shoot
        active_leaves = [l for l in leaves if not l['is_wilted']]
        has_secondary_shoot = (len(active_leaves) >= 4 and age > 0.6)
        secondary_shoot = None
        if has_secondary_shoot:
            # Branch off from an active leaf node
            branch_node_y = leaves[2]['y']
            branch_side = leaves[2]['side']
            branch_len = int(shoot_len * 0.45 * (age - 0.5) / 0.5)
            secondary_shoot = {
                'start_y': branch_node_y,
                'side': branch_side,
                'length': branch_len,
                'leaves': 1 if branch_len > 30 else 0
            }

        # Rule 4: When a plant is ready to flower, the size and number of flowers
        # is affected by the number of leaves on the plant!
        # Healthy active leaves boost flower scale
        leaf_vigor = len(active_leaves)
        # Base flower scale
        flower_scale = 0.7 + (leaf_vigor * 0.08) # More leaves -> larger, lusher flower!
        flower_scale = min(1.35, max(0.6, flower_scale))
        
        # Flowering state
        is_flowering = (age > 0.55)
        bloom_progress = max(0.0, min(1.0, (age - 0.55) / 0.45))
        
        return {
            'type': plant_type,
            'age': age,
            'shoot_len': shoot_len,
            'stem_points': stem_points,
            'leaves': leaves,
            'secondary_shoot': secondary_shoot,
            'flower_scale': flower_scale,
            'is_flowering': is_flowering,
            'bloom_progress': bloom_progress,
            'active_leaf_count': len(active_leaves)
        }

# Glowing ASCII Renderer for high-fidelity typographic rendering
class GlowingGeminiRenderer:
    def __init__(self, w=1000, h=1000, bg=(5, 5, 8)):
        self.w = w
        self.h = h
        self.bg = bg
        self.glyphs = [] # {x, y, char, fg, size, glow_col, glow_rad}
        
    def add(self, x, y, char, fg, size=15, glow_col=None, glow_rad=14):
        if char and char != ' ':
            self.glyphs.append({
                'x': float(x),
                'y': float(y),
                'char': char,
                'fg': fg,
                'size': int(size),
                'glow_col': glow_col if glow_col else fg,
                'glow_rad': glow_rad
            })
            
    def render_to_file(self, path, font_path="consola.ttf"):
        img = Image.new("RGBA", (self.w, self.h), (*self.bg, 255))
        
        fonts = {}
        for sz in [9, 11, 13, 14, 15, 16, 17, 18, 20, 22, 25, 28, 32]:
            try:
                fonts[sz] = ImageFont.truetype(font_path, sz)
            except:
                fonts[sz] = ImageFont.load_default()
                
        # 1. Broad atmospheric glow aura pass
        aura = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        adraw = ImageDraw.Draw(aura)
        for g in self.glyphs:
            rad = g['glow_rad']
            col = g['glow_col']
            adraw.ellipse([g['x'] - rad, g['y'] - rad, g['x'] + rad, g['y'] + rad], fill=(*col, 22))
            
        aura_blur1 = aura.filter(ImageFilter.GaussianBlur(radius=32))
        aura_blur2 = aura.filter(ImageFilter.GaussianBlur(radius=16))
        img = Image.alpha_composite(img, aura_blur1)
        img = Image.alpha_composite(img, aura_blur2)
        
        # 2. Sharp typographic text layer
        text_layer = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        tdraw = ImageDraw.Draw(text_layer)
        for g in self.glyphs:
            f = fonts.get(g['size'], fonts.get(15))
            bb = f.getbbox(g['char'])
            tw = bb[2] - bb[0]
            th = bb[3] - bb[1]
            tdraw.text((g['x'] - tw/2.0, g['y'] - th/2.0), g['char'], font=f, fill=(*g['fg'], 255))
            
        # 3. Text self-bloom pass (halo around the glyphs)
        text_glow_wide = text_layer.filter(ImageFilter.GaussianBlur(radius=7))
        text_glow_tight = text_layer.filter(ImageFilter.GaussianBlur(radius=2))
        
        img = Image.alpha_composite(img, text_glow_wide)
        img = Image.alpha_composite(img, text_glow_tight)
        img = Image.alpha_composite(img, text_layer)
        
        img.save(path)
        print(f"Saved: {path}")

# Typographic Plant Synthesizer
def synthesize_plant(renderer, origin_x, ground_y, plant_data):
    stem_pts = plant_data['stem_points']
    shoot_len = plant_data['shoot_len']
    leaves = plant_data['leaves']
    f_scale = plant_data['flower_scale']
    p_type = plant_data['type']
    bloom = plant_data['bloom_progress']
    
    # Stem Colors: bright neon greens like in the reference image
    C_STEM = (75, 215, 65)
    C_STEM_DARK = (45, 155, 40)
    C_WILTED = (165, 140, 50)
    C_DEAD = (125, 95, 45)
    
    # 1. Draw Stem using characters: |, /, \, %, +, ?, !, &
    stem_chars = ["|", "|", "|", "/", "\\", "%", "+", "|", "||", "\\"]
    step = 10
    mapped_pts = []
    for idx in range(0, shoot_len, step):
        dx, y_up = stem_pts[idx]
        px = origin_x + dx
        py = ground_y - y_up
        mapped_pts.append((px, py, y_up))
        # Choose character based on slope
        slope_ch = "|"
        if idx > 10:
            pdx = stem_pts[idx][0] - stem_pts[idx-10][0]
            if pdx > 1.5: slope_ch = "\\"
            elif pdx < -1.5: slope_ch = "/"
            elif (idx // 10) % 4 == 0: slope_ch = "%"
            elif (idx // 10) % 5 == 0: slope_ch = "+"
            elif (idx // 10) % 7 == 0: slope_ch = "?"
            
        renderer.add(px, py, slope_ch, C_STEM, size=14, glow_rad=8)
        
    # Apex (top of stem)
    top_x, top_y, _ = mapped_pts[-1]
    
    # 2. Draw Leaves
    # Leaves in Gemini image are clusters of characters:
    # +++++-         -+++++
    # ***%### ||| ###%***
    # |#%&%&% +|| %&%&%#|
    for leaf in leaves:
        ly = leaf['y']
        side = leaf['side']
        is_wilt = leaf['is_wilted']
        
        # Find stem position at ly
        idx = min(len(stem_pts)-1, ly)
        lx = origin_x + stem_pts[idx][0]
        ly_screen = ground_y - ly
        
        leaf_col = C_WILTED if is_wilt else C_STEM
        
        if is_wilt:
            # Wilted drooping leaf: curling downwards
            wilt_rows = [
                (side * 8, 4, "\\"),
                (side * 14, 8, "~"),
                (side * 20, 14, "v"),
                (side * 24, 18, "."),
            ]
            for ox, oy, ch in wilt_rows:
                renderer.add(lx + ox, ly_screen + oy, ch, C_DEAD, size=13, glow_rad=6)
        else:
            # Lush healthy leaf cluster like Gemini image:
            # Layered brackets, pluses, asterisks, hashes
            leaf_cluster = [
                # Top edge
                (side * 10, -8, "+"), (side * 16, -8, "+"), (side * 22, -8, "+"), (side * 28, -8, "-"),
                # Core
                (side * 6, 0, "|"), (side * 12, 0, "*"), (side * 18, 0, "%"), (side * 24, 0, "#"), (side * 30, 0, "#"),
                # Underside
                (side * 8, 8, "|"), (side * 14, 8, "%"), (side * 20, 8, "&"), (side * 26, 8, "%"), (side * 32, 8, "#"),
                (side * 12, 16, "+"), (side * 18, 16, "+"), (side * 24, 16, "/"),
            ]
            for ox, oy, ch in leaf_cluster:
                renderer.add(lx + ox, ly_screen + oy, ch, leaf_col, size=13, glow_rad=8)
                
    # 3. Draw Secondary Shoot if present
    if sec := plant_data['secondary_shoot']:
        by = sec['start_y']
        bside = sec['side']
        blen = sec['length']
        b_idx = min(len(stem_pts)-1, by)
        bx0 = origin_x + stem_pts[b_idx][0]
        by0 = ground_y - by
        
        for bi in range(0, blen, 8):
            curv_x = bx0 + (bside * (bi * 0.75 + math.sin(bi * 0.1) * 4))
            curv_y = by0 - (bi * 0.8)
            renderer.add(curv_x, curv_y, "/" if bside > 0 else "\\", C_STEM, size=13, glow_rad=8)
            
    # 4. Draw Flower if ready
    if plant_data['is_flowering']:
        if p_type == "sunflower":
            draw_sunflower_head(renderer, top_x, top_y, f_scale, bloom)
        elif p_type == "hibiscus":
            draw_hibiscus_head(renderer, top_x, top_y, f_scale, bloom)
        elif p_type == "iris":
            draw_iris_head(renderer, top_x, top_y, f_scale, bloom)
        elif p_type == "marigold":
            draw_marigold_head(renderer, top_x, top_y, f_scale, bloom)
        elif p_type == "thistle":
            draw_thistle_head(renderer, top_x, top_y, f_scale, bloom)
        elif p_type == "daffodil":
            draw_daffodil_head(renderer, top_x, top_y, f_scale, bloom)

def draw_sunflower_head(renderer, cx, cy, scale, bloom):
    # Colors: blazing golden yellows and deep chocolate/amber core
    C_CORE = (210, 130, 25)
    C_CORE_DEEP = (140, 75, 15)
    C_PETAL_BRIGHT = (255, 230, 45)
    C_PETAL_WARM = (255, 185, 25)
    C_GLOW = (255, 170, 0)
    
    # Disc center: Dense horizontal text bands like in Gemini image!
    disc_lines = [
        "######&&&88|",
        "#*#*#*#*#*#*#*#*#*#&&88#|",
        "###################&&88#",
        "#*#*#*#*#*#*#*#*#*#&&88#",
        "######&&&88|"
    ]
    char_spacing_x = 9 * scale
    line_spacing_y = 13 * scale
    
    y_start = cy - (len(disc_lines) * line_spacing_y) / 2.0
    for row_idx, line in enumerate(disc_lines):
        line_y = y_start + row_idx * line_spacing_y
        line_w = len(line) * char_spacing_x
        x_start = cx - line_w / 2.0
        for char_idx, ch in enumerate(line):
            col = C_CORE_DEEP if ch in ["#", "&"] else C_CORE
            renderer.add(x_start + char_idx * char_spacing_x, line_y, ch, col, size=int(14 * scale), glow_col=C_GLOW, glow_rad=18)
            
    # Radiating flamed ray petals swirling outward
    num_petals = 28
    petal_len = 55 * scale * bloom
    for i in range(num_petals):
        angle = (i / num_petals) * 2 * math.pi
        # Multi-segment curling flame petal
        for seg in range(1, 5):
            seg_dist = 22 * scale + (seg / 4.0) * petal_len
            # Tangential curl
            curl = math.sin(seg * 0.8) * 6 * scale
            px = cx + math.cos(angle) * seg_dist - math.sin(angle) * curl
            py = cy + math.sin(angle) * seg_dist + math.cos(angle) * curl
            
            p_chars = ["(", ")", "{", "}", "~", "S", "8", "*", "%"]
            ch = p_chars[(i + seg) % len(p_chars)]
            col = C_PETAL_BRIGHT if seg >= 3 else C_PETAL_WARM
            renderer.add(px, py, ch, col, size=int((12 + seg*2) * scale), glow_col=C_GLOW, glow_rad=22)

def draw_hibiscus_head(renderer, cx, cy, scale, bloom):
    C_MAGENTA = (255, 75, 175)
    C_PINK = (255, 150, 215)
    C_INNER = (200, 40, 130)
    C_STAMEN = (255, 235, 45)
    C_GLOW = (255, 40, 160)
    
    # Dense organic swirls of text forming the 5 lobes (exactly like Gemini image!)
    hib_text_rows = [
        ("           /!/          ", C_PINK),
        ("     /**%/ 1@@@@@@1****- ", C_PINK),
        (" ****%) )/ @@@@@@@#@& !&#", C_MAGENTA),
        ("@@@/ /%*======@@@/#&/ /**%", C_MAGENTA),
        ("@@@// /#**%) #######/#//**", C_INNER),
        (" |##/@///#%#@@@@@@@@@@/|@@@/**#", C_INNER),
        (" #@ /(@############/==*###", C_MAGENTA),
        (" % |##@@@@@@#@@@/@@######*", C_MAGENTA),
        (" *@@@&%@--@@### / | */ ", C_PINK),
        ("   **@@@%# / *%&-#*%%   ", C_PINK),
        ("          | |@@@#*      ", C_MAGENTA)
    ]
    char_spacing_x = 8.5 * scale * bloom
    line_spacing_y = 12 * scale * bloom
    y_start = cy - (len(hib_text_rows) * line_spacing_y) / 2.0
    
    for row_idx, (line, col) in enumerate(hib_text_rows):
        line_y = y_start + row_idx * line_spacing_y
        line_w = len(line) * char_spacing_x
        x_start = cx - line_w / 2.0
        for char_idx, ch in enumerate(line):
            if ch != ' ':
                renderer.add(x_start + char_idx * char_spacing_x, line_y, ch, col, size=int(13 * scale), glow_col=C_GLOW, glow_rad=18)
                
    # Prominent curved golden stamen arching upwards/leftwards
    stamen_pts = [
        (cx - 5 * scale, cy + 5 * scale, "%"),
        (cx - 15 * scale, cy - 2 * scale, "/"),
        (cx - 25 * scale, cy - 12 * scale, "("),
        (cx - 35 * scale, cy - 22 * scale, "~"),
        (cx - 45 * scale, cy - 30 * scale, "o"),
        (cx - 50 * scale, cy - 35 * scale, "*"), # Anther tip
    ]
    for sx, sy, ch in stamen_pts:
        renderer.add(sx, sy, ch, C_STAMEN, size=int(15 * scale), glow_col=(255, 220, 0), glow_rad=20)

def draw_iris_head(renderer, cx, cy, scale, bloom):
    C_PURPLE = (175, 110, 255)
    C_VIOLET = (130, 60, 230)
    C_DEEP = (90, 35, 180)
    C_SIGNAL = (255, 225, 45)
    C_GLOW = (150, 60, 255)
    
    # 1. Upright standards (two feathery columns arching inward at top)
    standards_left = [
        (cx - 14*scale, cy - 20*scale, "(("),
        (cx - 18*scale, cy - 35*scale, "%%%"),
        (cx - 20*scale, cy - 50*scale, "@@@"),
        (cx - 16*scale, cy - 65*scale, "(((("),
        (cx - 8*scale, cy - 75*scale, "\\\\")
    ]
    standards_right = [
        (cx + 14*scale, cy - 20*scale, "))"),
        (cx + 18*scale, cy - 35*scale, "%%%"),
        (cx + 20*scale, cy - 50*scale, "@@@"),
        (cx + 16*scale, cy - 65*scale, "))))"),
        (cx + 8*scale, cy - 75*scale, "//")
    ]
    for pts in [standards_left, standards_right]:
        for px, py, text in pts:
            for ci, ch in enumerate(text):
                renderer.add(px + ci*7*scale, py, ch, C_PURPLE, size=int(14*scale), glow_col=C_GLOW, glow_rad=18)
                
    # 2. Arching drooping falls (broad horizontal wings)
    falls_text_left = "///###@@@@@@@@@@@@@@@@@@@"
    falls_text_right = "@@@@@@@@@@@@@@@@@@@###\\\\\\"
    for i, ch in enumerate(falls_text_left):
        px = cx - 15*scale - (i * 4 * scale)
        py = cy - 5*scale + (math.sin(i * 0.15) * 15 * scale)
        renderer.add(px, py, ch, C_VIOLET if i%2==0 else C_PURPLE, size=int(13*scale), glow_col=C_GLOW, glow_rad=18)
    for i, ch in enumerate(falls_text_right):
        px = cx + 15*scale + (i * 4 * scale)
        py = cy - 5*scale + (math.sin(i * 0.15) * 15 * scale)
        renderer.add(px, py, ch, C_VIOLET if i%2==0 else C_PURPLE, size=int(13*scale), glow_col=C_GLOW, glow_rad=18)
        
    # 3. Center throat with golden signal flare characters (exactly as in Gemini image!)
    throat = [
        (cx, cy - 10*scale, "|(@/9|"),
        (cx, cy, "|%&%#|"),
        (cx, cy + 10*scale, "\\b)|")
    ]
    for tx, ty, txt in throat:
        for ci, ch in enumerate(txt):
            col = C_SIGNAL if ch in ["@", "9", "&"] else C_DEEP
            renderer.add(tx + (ci - len(txt)/2.0)*8*scale, ty, ch, col, size=int(14*scale), glow_col=(255, 200, 0), glow_rad=18)

def draw_marigold_head(renderer, cx, cy, scale, bloom):
    C_YELLOW = (255, 225, 45)
    C_ORANGE = (255, 125, 20)
    C_CRIMSON = (220, 35, 25)
    C_GLOW = (255, 70, 0)
    
    # Concentric bands of characters matching Gemini image:
    bands = [
        ("=======", C_YELLOW),
        ("##############", C_YELLOW),
        ("##==============##", C_ORANGE),
        ("|||||||||||||||||||", C_ORANGE),
        ("#%==============%:9", C_ORANGE),
        ("@@@@@@@@@@@@@@@@@@@@@", C_CRIMSON),
        ("@@@@@@@@@@@@@@@@@", C_CRIMSON)
    ]
    spacing_y = 11 * scale
    spacing_x = 8 * scale
    start_y = cy - (len(bands) * spacing_y) / 2.0
    for row_idx, (txt, col) in enumerate(bands):
        ry = start_y + row_idx * spacing_y
        rx_start = cx - (len(txt) * spacing_x) / 2.0
        for ci, ch in enumerate(txt):
            renderer.add(rx_start + ci * spacing_x, ry, ch, col, size=int(14*scale), glow_col=C_GLOW, glow_rad=18)

def draw_thistle_head(renderer, cx, cy, scale, bloom):
    C_GREEN = (90, 220, 70)
    C_VIOLET = (210, 110, 255)
    C_PURPLE = (160, 60, 230)
    C_GLOW = (180, 70, 255)
    
    # 1. Calyx: Rounded cup of dense green stippled characters
    calyx_chars = [":", ";", "%", "&", "#", "@", "|"]
    r_calyx = 22 * scale
    for dy in range(0, int(r_calyx * 1.2), 6):
        width_at_y = math.sin((dy / (r_calyx * 1.2)) * math.pi) * r_calyx
        for dx in range(-int(width_at_y), int(width_at_y) + 1, 7):
            ch = calyx_chars[(dx + dy) % len(calyx_chars)]
            renderer.add(cx + dx, cy + dy, ch, C_GREEN, size=int(12*scale), glow_col=(70, 200, 50), glow_rad=14)
            
    # 2. Crown: Explosive radiating purple brush plumes
    for plume in range(-3, 4):
        p_angle = (plume / 4.0) * 0.7 - math.pi/2.0
        for step in range(1, 6):
            dist = step * 9 * scale * bloom
            px = cx + math.cos(p_angle) * dist
            py = cy + math.sin(p_angle) * dist
            ch = "!" if step == 5 else ("/" if plume > 0 else "\\")
            renderer.add(px, py, ch, C_VIOLET if step >= 4 else C_PURPLE, size=int(14*scale), glow_col=C_GLOW, glow_rad=18)

def draw_daffodil_head(renderer, cx, cy, scale, bloom):
    C_GOLD = (255, 230, 45)
    C_ORANGE = (255, 130, 20)
    C_GLOW = (255, 200, 0)
    
    # Center square trumpet disc
    grid_chars = ["#", "*", "%", "#", "*"]
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            ch = grid_chars[(dx + dy) % len(grid_chars)]
            renderer.add(cx + dx*8*scale, cy + dy*8*scale, ch, C_ORANGE, size=int(13*scale), glow_col=C_GLOW, glow_rad=16)
            
    # 6 radiating star points of yellow characters
    for i in range(6):
        ang = (i / 6.0) * 2 * math.pi
        for step in range(1, 5):
            dist = 16 * scale + step * 9 * scale * bloom
            px = cx + math.cos(ang) * dist
            py = cy + math.sin(ang) * dist
            ch = "*" if step == 4 else ("^" if step == 3 else "+")
            renderer.add(px, py, ch, C_GOLD, size=int(14*scale), glow_col=C_GLOW, glow_rad=18)

# Run test simulation of the 6 plants in a 3x2 gallery sheet!
def render_full_gemini_gallery():
    sim = PlantGrowthSimulation(seed=101)
    
    species_list = ["hibiscus", "sunflower", "iris", "thistle", "marigold", "daffodil"]
    
    gallery_w = 1200
    gallery_h = 1200
    renderer = GlowingGeminiRenderer(w=gallery_w, h=gallery_h, bg=(6, 6, 9))
    
    col_w = gallery_w // 3
    row_h = gallery_h // 2
    
    for idx, sp in enumerate(species_list):
        c_idx = idx % 3
        r_idx = idx // 3
        
        ox = c_idx * col_w + col_w // 2
        oy = r_idx * row_h + row_h - 40 # ground line
        
        # Grow plant with our biological growth simulation!
        # Age 1.0 = fully mature
        p_data = sim.grow_plant(plant_type=sp, age=1.0, max_height=260)
        synthesize_plant(renderer, ox, oy, p_data)
        
    renderer.render_to_file("test/output/glowing_gemini_recreation.png")

render_full_gemini_gallery()

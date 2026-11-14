import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

os.makedirs("test/output", exist_ok=True)

# Polished Biological Growth Model & Glowing Typographic ASCII Renderer

class BiologicalPlantModel:
    def __init__(self, plant_type="sunflower", seed=42):
        self.type = plant_type
        self.rng = random.Random(seed)
        self.seed = seed
        
    def simulate(self, age=1.0, max_stem_height=420):
        # 1. Stem shoot elongation
        # Age 0.0 -> 1.0
        # Shoot grows continuously
        shoot_height = max(25, int(max_stem_height * age))
        
        # Build main stem spine with natural wind/phototropic curvature
        stem_nodes = []
        stem_segments = int(shoot_height / 10)
        bend_bias = 0.15 # slight natural curve
        
        for i in range(stem_segments + 1):
            t = i / max(1, stem_segments)
            # Quadratic + sine organic curvature
            x = math.sin(t * math.pi * 0.9) * 22 * (1.0 if self.seed % 2 == 0 else -0.8)
            y = t * shoot_height
            stem_nodes.append({'x': x, 'y': y, 't': t})
            
        # 2. Rule 1: Longer shoot -> more leaf nodes (internode distribution)
        # Rule 2: Inhibit growing directly adjacent, but cluster into rhythmic pairs/whorls
        leaves = []
        last_cluster_y = -999
        
        # Leaves begin appearing once stem reaches 20% height
        if age > 0.20:
            # Internode rhythm: leaves form at specific vertical intervals
            num_clusters = min(4, int(shoot_height / 75))
            for c in range(1, num_clusters + 1):
                target_y = int(c * (shoot_height / (num_clusters + 1)))
                if target_y < shoot_height - 35: # Keep clear of apical bud
                    if abs(target_y - last_cluster_y) > 40:
                        # Cluster of 2 opposing or bunched leaves
                        leaves.append({
                            'y': target_y,
                            'side': -1,
                            'age_formed': target_y / max_stem_height,
                            'is_wilted': False
                        })
                        leaves.append({
                            'y': target_y + 4,
                            'side': 1,
                            'age_formed': target_y / max_stem_height,
                            'is_wilted': False
                        })
                        last_cluster_y = target_y

        # Rule 5: Senescence / wilting of oldest (lowest) leaves at high plant age
        if age > 0.70:
            for l in leaves:
                # If leaf is near base (lowest 28% of max height) and mature
                if l['y'] < max_stem_height * 0.28:
                    l['is_wilted'] = True

        # Rule 3: If plant has enough active leaves, sprout another shoot!
        active_leaves = [l for l in leaves if not l['is_wilted']]
        has_branch = (len(active_leaves) >= 4 and age > 0.65)
        secondary_shoot = None
        if has_branch:
            # Branch sprouts from second leaf node
            b_node = leaves[2]
            b_growth = (age - 0.65) / 0.35 # 0.0 to 1.0
            secondary_shoot = {
                'start_y': b_node['y'],
                'side': b_node['side'],
                'length': int(shoot_height * 0.40 * b_growth),
                'flower': (b_growth > 0.85) # secondary flower if mature enough!
            }

        # Rule 4: Flower readiness, size, and petal luxuriance modulated by active leaf count!
        # Healthy leaves provide photosynthetic energy
        leaf_energy = len(active_leaves)
        # Flower scale is boosted by leaf energy:
        flower_scale = 0.65 + (leaf_energy * 0.09) # 4 leaves = 1.01x, 6 leaves = 1.19x
        flower_scale = min(1.35, max(0.5, flower_scale))
        
        # Bloom progress
        is_bud = (age > 0.45)
        bloom_progress = 0.0
        if age > 0.55:
            bloom_progress = min(1.0, (age - 0.55) / 0.45)

        return {
            'type': self.type,
            'age': age,
            'shoot_height': shoot_height,
            'stem_nodes': stem_nodes,
            'leaves': leaves,
            'secondary_shoot': secondary_shoot,
            'flower_scale': flower_scale,
            'is_bud': is_bud,
            'bloom': bloom_progress,
            'active_leaf_count': len(active_leaves)
        }

# High-Detail Glowing Typographic ASCII Renderer
class MasterGlowingRenderer:
    def __init__(self, w=1400, h=1000, bg=(5, 5, 8)):
        self.w = w
        self.h = h
        self.bg = bg
        self.glyphs = []
        
    def add(self, x, y, char, fg, size=15, glow_col=None, glow_rad=16):
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
            
    def render_file(self, path, font_path="consola.ttf"):
        img = Image.new("RGBA", (self.w, self.h), (*self.bg, 255))
        
        fonts = {}
        for sz in range(8, 36, 2):
            try:
                fonts[sz] = ImageFont.truetype(font_path, sz)
            except:
                fonts[sz] = ImageFont.load_default()
                
        # 1. Broad atmospheric halo pass
        aura = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        adraw = ImageDraw.Draw(aura)
        for g in self.glyphs:
            rad = g['glow_rad']
            col = g['glow_col']
            adraw.ellipse([g['x'] - rad, g['y'] - rad, g['x'] + rad, g['y'] + rad], fill=(*col, 20))
            
        aura_wide = aura.filter(ImageFilter.GaussianBlur(radius=32))
        aura_tight = aura.filter(ImageFilter.GaussianBlur(radius=16))
        img = Image.alpha_composite(img, aura_wide)
        img = Image.alpha_composite(img, aura_tight)
        
        # 2. Crisp sharp text layer
        text_layer = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        tdraw = ImageDraw.Draw(text_layer)
        for g in self.glyphs:
            sz = g['size']
            f = fonts.get(sz, fonts.get(14))
            bb = f.getbbox(g['char'])
            tw = bb[2] - bb[0]
            th = bb[3] - bb[1]
            tdraw.text((g['x'] - tw/2.0, g['y'] - th/2.0), g['char'], font=f, fill=(*g['fg'], 255))
            
        # 3. Text glow pass
        tg_wide = text_layer.filter(ImageFilter.GaussianBlur(radius=8))
        tg_tight = text_layer.filter(ImageFilter.GaussianBlur(radius=2))
        
        img = Image.alpha_composite(img, tg_wide)
        img = Image.alpha_composite(img, tg_tight)
        img = Image.alpha_composite(img, text_layer)
        
        img.save(path)
        print(f"Generated: {path}")

# Typographic Plant Drawer
def draw_botanical_plant(renderer, ox, ground_y, p):
    nodes = p['stem_nodes']
    shoot_h = p['shoot_height']
    leaves = p['leaves']
    f_scale = p['flower_scale']
    p_type = p['type']
    bloom = p['bloom']
    is_bud = p['is_bud']
    age = p['age']
    
    C_STEM = (85, 230, 75)
    C_STEM_DARK = (45, 175, 45)
    C_WILT = (175, 140, 45)
    C_DEAD = (125, 95, 40)
    
    # 1. Draw Multi-column textured stem (matching Gemini image: ||, |, \, /, %, +, ?)
    for i, node in enumerate(nodes):
        px = ox + node['x']
        py = ground_y - node['y']
        
        # Stem character selection based on vertical position
        ch1 = "|"
        if i % 6 == 0: ch1 = "%"
        elif i % 7 == 0: ch1 = "+"
        elif i % 11 == 0: ch1 = "?"
        
        # Double-line stem for lower half to give sturdy plant weight
        if node['y'] < shoot_h * 0.5:
            renderer.add(px - 3, py, "|", C_STEM, size=14, glow_rad=8)
            renderer.add(px + 3, py, ch1, C_STEM, size=14, glow_rad=8)
        else:
            renderer.add(px, py, ch1, C_STEM, size=14, glow_rad=8)
            
    apex_x = ox + nodes[-1]['x']
    apex_y = ground_y - nodes[-1]['y']
    
    # 2. Draw Leaves (matching Gemini image clusters!)
    for leaf in leaves:
        ly = leaf['y']
        side = leaf['side']
        is_wilted = leaf['is_wilted']
        
        # Interpolate stem x at ly
        t = ly / max(1, shoot_h)
        node_idx = min(len(nodes)-1, int(t * (len(nodes)-1)))
        lx = ox + nodes[node_idx]['x']
        ly_screen = ground_y - ly
        
        if is_wilted:
            # Wilted drooping leaf hanging down
            wilt_pts = [
                (side * 8, 4, "\\"),
                (side * 14, 10, "~"),
                (side * 19, 16, "v"),
                (side * 23, 22, ".")
            ]
            for ox_l, oy_l, ch in wilt_pts:
                renderer.add(lx + ox_l, ly_screen + oy_l, ch, C_DEAD, size=13, glow_col=C_WILT, glow_rad=6)
        else:
            # Vibrant character cluster matching Gemini image!
            # +++++-         -+++++
            #  ***%### ||| ###%***
            #   |#%&%&% +|| %&%&%#|
            #    +++++++
            leaf_glyphs = [
                # Upper edge
                (side * 8, -10, "+"), (side * 14, -10, "+"), (side * 20, -10, "+"), (side * 26, -10, "-"),
                # Core
                (side * 6, -2, "|"), (side * 12, -2, "*"), (side * 18, -2, "%"), (side * 24, -2, "#"), (side * 30, -2, "#"),
                # Lower ribs
                (side * 8, 6, "|"), (side * 14, 6, "#"), (side * 20, 6, "%"), (side * 26, 6, "&"), (side * 32, 6, "%"),
                (side * 10, 14, "+"), (side * 16, 14, "+"), (side * 22, 14, "+"), (side * 28, 14, "/"),
            ]
            for ox_l, oy_l, ch in leaf_glyphs:
                renderer.add(lx + ox_l, ly_screen + oy_l, ch, C_STEM, size=13, glow_rad=8)
                
    # 3. Secondary Shoot
    if sec := p['secondary_shoot']:
        sy = sec['start_y']
        sside = sec['side']
        slen = sec['length']
        t = sy / max(1, shoot_h)
        n_idx = min(len(nodes)-1, int(t * (len(nodes)-1)))
        bx0 = ox + nodes[n_idx]['x']
        by0 = ground_y - sy
        for bi in range(0, slen, 9):
            curv_x = bx0 + sside * (bi * 0.8 + math.sin(bi * 0.12) * 5)
            curv_y = by0 - (bi * 0.85)
            renderer.add(curv_x, curv_y, "/" if sside > 0 else "\\", C_STEM, size=13, glow_rad=8)
        if sec['flower'] and bloom > 0.2:
            # Secondary smaller flower head!
            f_end_x = bx0 + sside * (slen * 0.8)
            f_end_y = by0 - (slen * 0.85)
            draw_flower_by_type(renderer, p_type, f_end_x, f_end_y, f_scale * 0.65, bloom * 0.8)

    # 4. Apical Flower / Bud
    if is_bud:
        if bloom < 0.15:
            # Early bud: compact green calyx with colored tip
            renderer.add(apex_x, apex_y - 6, "(#)", C_STEM, size=16, glow_rad=10)
            renderer.add(apex_x, apex_y - 14, "*", (255, 200, 50), size=14, glow_rad=14)
        else:
            # Blooming flower!
            draw_flower_by_type(renderer, p_type, apex_x, apex_y, f_scale, bloom)

def draw_flower_by_type(renderer, p_type, cx, cy, scale, bloom):
    if p_type == "sunflower":
        draw_gemini_sunflower(renderer, cx, cy, scale, bloom)
    elif p_type == "hibiscus":
        draw_gemini_hibiscus(renderer, cx, cy, scale, bloom)
    elif p_type == "iris":
        draw_gemini_iris(renderer, cx, cy, scale, bloom)
    elif p_type == "thistle":
        draw_gemini_thistle(renderer, cx, cy, scale, bloom)
    elif p_type == "marigold":
        draw_gemini_marigold(renderer, cx, cy, scale, bloom)
    elif p_type == "daffodil":
        draw_gemini_daffodil(renderer, cx, cy, scale, bloom)

# ================= SPECIFIC FLOWER DRAWERS =================

def draw_gemini_sunflower(renderer, cx, cy, scale, bloom):
    # Sunburst with dark fibrous disc & swirling flame ray petals!
    C_DISC_DARK = (150, 75, 15)
    C_DISC_MID  = (210, 130, 25)
    C_GOLD_HOT  = (255, 235, 40)
    C_GOLD_WARM = (255, 185, 20)
    C_GLOW      = (255, 160, 0)
    
    flower_cy = cy - 25 * scale
    
    # 1. Center Disc: Dense horizontal character rows matching Gemini image
    disc_lines = [
        "######&&&88|",
        "#*#*#*#*#*#*#*#*#*#&&88#|",
        "###################&&88#",
        "#*#*#*#*#*#*#*#*#*#&&88#",
        "######&&&88|"
    ]
    sp_x = 9.5 * scale
    sp_y = 13.0 * scale
    start_y = flower_cy - (len(disc_lines) * sp_y) / 2.0
    for r_idx, line in enumerate(disc_lines):
        line_y = start_y + r_idx * sp_y
        line_w = len(line) * sp_x
        start_x = cx - line_w / 2.0
        for c_idx, ch in enumerate(line):
            col = C_DISC_DARK if ch in ["#", "&"] else C_DISC_MID
            renderer.add(start_x + c_idx * sp_x, line_y, ch, col, size=int(14 * scale), glow_col=C_GLOW, glow_rad=18)
            
    # 2. Radiating Swirling Flame Ray Petals (Gemini image: dense swirling curves wrapping disc!)
    num_petals = 32
    max_len = 65 * scale * bloom
    for i in range(num_petals):
        angle = (i / num_petals) * 2 * math.pi
        # Multi-tiered curving flame
        for seg in range(1, 6):
            r_dist = 28 * scale + (seg / 5.0) * max_len
            curl = math.sin(seg * 0.9 + i) * 8 * scale
            px = cx + math.cos(angle) * r_dist - math.sin(angle) * curl
            py = flower_cy + math.sin(angle) * r_dist + math.cos(angle) * curl
            
            p_glyphs = ["(", ")", "{", "}", "~", "S", "s", "8", "*", "%", "&"]
            ch = p_glyphs[(i * 3 + seg) % len(p_glyphs)]
            col = C_GOLD_HOT if seg >= 4 else C_GOLD_WARM
            renderer.add(px, py, ch, col, size=int((11 + seg*2) * scale), glow_col=C_GLOW, glow_rad=24)

def draw_gemini_hibiscus(renderer, cx, cy, scale, bloom):
    C_MAGENTA = (255, 65, 175)
    C_PINK    = (255, 155, 220)
    C_INNER   = (210, 35, 130)
    C_STAMEN  = (255, 235, 45)
    C_GLOW    = (255, 30, 160)
    
    flower_cy = cy - 25 * scale
    
    # Exact text layout from Gemini reference image!
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
    sp_x = 9.0 * scale * bloom
    sp_y = 12.5 * scale * bloom
    start_y = flower_cy - (len(hib_text_rows) * sp_y) / 2.0
    for r_idx, (txt, col) in enumerate(hib_text_rows):
        line_y = start_y + r_idx * sp_y
        line_w = len(txt) * sp_x
        start_x = cx - line_w / 2.0
        for c_idx, ch in enumerate(txt):
            if ch != ' ':
                renderer.add(start_x + c_idx * sp_x, line_y, ch, col, size=int(13.5 * scale), glow_col=C_GLOW, glow_rad=18)
                
    # Prominent curved yellow stamen arching up-left
    stamen_pts = [
        (cx - 6 * scale, flower_cy + 5 * scale, "%"),
        (cx - 18 * scale, flower_cy - 4 * scale, "/"),
        (cx - 30 * scale, flower_cy - 16 * scale, "("),
        (cx - 42 * scale, flower_cy - 28 * scale, "~"),
        (cx - 52 * scale, flower_cy - 38 * scale, "o"),
        (cx - 58 * scale, flower_cy - 44 * scale, "*"),
    ]
    for sx, sy, ch in stamen_pts:
        renderer.add(sx, sy, ch, C_STAMEN, size=int(15 * scale), glow_col=(255, 220, 0), glow_rad=20)

def draw_gemini_iris(renderer, cx, cy, scale, bloom):
    C_PURPLE = (185, 115, 255)
    C_VIOLET = (140, 65, 235)
    C_DEEP   = (95, 35, 190)
    C_SIGNAL = (255, 225, 45)
    C_GLOW   = (160, 60, 255)
    
    flower_cy = cy - 20 * scale
    
    # 1. Upright Standards (two feathery columns arching inward at top)
    standards_left = [
        (cx - 16*scale, flower_cy - 20*scale, "(("),
        (cx - 20*scale, flower_cy - 36*scale, "%%%"),
        (cx - 22*scale, flower_cy - 54*scale, "@@@"),
        (cx - 18*scale, flower_cy - 72*scale, "(((("),
        (cx - 10*scale, flower_cy - 84*scale, "\\\\")
    ]
    standards_right = [
        (cx + 16*scale, flower_cy - 20*scale, "))"),
        (cx + 20*scale, flower_cy - 36*scale, "%%%"),
        (cx + 22*scale, flower_cy - 54*scale, "@@@"),
        (cx + 18*scale, flower_cy - 72*scale, "))))"),
        (cx + 10*scale, flower_cy - 84*scale, "//")
    ]
    for pts in [standards_left, standards_right]:
        for px, py, text in pts:
            for ci, ch in enumerate(text):
                renderer.add(px + ci*7.5*scale, py, ch, C_PURPLE, size=int(14*scale), glow_col=C_GLOW, glow_rad=18)
                
    # 2. Arching drooping falls (broad horizontal wings)
    falls_left = "///###@@@@@@@@@@@@@@@@@@@@@@"
    falls_right = "@@@@@@@@@@@@@@@@@@@@@@###\\\\\\"
    for i, ch in enumerate(falls_left):
        px = cx - 18*scale - (i * 4.5 * scale)
        py = flower_cy - 4*scale + (math.sin(i * 0.14) * 18 * scale)
        renderer.add(px, py, ch, C_VIOLET if i%2==0 else C_PURPLE, size=int(13.5*scale), glow_col=C_GLOW, glow_rad=18)
    for i, ch in enumerate(falls_right):
        px = cx + 18*scale + (i * 4.5 * scale)
        py = flower_cy - 4*scale + (math.sin(i * 0.14) * 18 * scale)
        renderer.add(px, py, ch, C_VIOLET if i%2==0 else C_PURPLE, size=int(13.5*scale), glow_col=C_GLOW, glow_rad=18)
        
    # 3. Center throat with golden signal flare characters (exactly as in Gemini image!)
    throat = [
        (cx, flower_cy - 12*scale, "|(@/9|"),
        (cx, flower_cy - 2*scale, "|%&%#|"),
        (cx, flower_cy + 8*scale, "\\b)|")
    ]
    for tx, ty, txt in throat:
        for ci, ch in enumerate(txt):
            col = C_SIGNAL if ch in ["@", "9", "&"] else C_DEEP
            renderer.add(tx + (ci - len(txt)/2.0)*8*scale, ty, ch, col, size=int(14*scale), glow_col=(255, 200, 0), glow_rad=18)

def draw_gemini_thistle(renderer, cx, cy, scale, bloom):
    C_GREEN  = (95, 225, 75)
    C_VIOLET = (215, 115, 255)
    C_PURPLE = (165, 65, 235)
    C_GLOW   = (185, 75, 255)
    
    flower_cy = cy - 15 * scale
    
    # 1. Calyx: Rounded cup of dense green stippled characters
    calyx_chars = [":", ";", "%", "&", "#", "@", "|"]
    r_calyx = 26 * scale
    for dy in range(0, int(r_calyx * 1.3), 6):
        width_at_y = math.sin((dy / (r_calyx * 1.3)) * math.pi) * r_calyx
        for dx in range(-int(width_at_y), int(width_at_y) + 1, 7):
            ch = calyx_chars[(dx + dy) % len(calyx_chars)]
            renderer.add(cx + dx, flower_cy + dy, ch, C_GREEN, size=int(12.5*scale), glow_col=(70, 200, 50), glow_rad=14)
            
    # 2. Crown: Explosive radiating purple brush plumes
    for plume in range(-4, 5):
        p_angle = (plume / 5.0) * 0.75 - math.pi/2.0
        for step in range(1, 7):
            dist = step * 11 * scale * bloom
            px = cx + math.cos(p_angle) * dist
            py = flower_cy + math.sin(p_angle) * dist
            ch = "!" if step >= 5 else ("/" if plume > 0 else "\\")
            renderer.add(px, py, ch, C_VIOLET if step >= 4 else C_PURPLE, size=int(14*scale), glow_col=C_GLOW, glow_rad=18)

def draw_gemini_marigold(renderer, cx, cy, scale, bloom):
    C_YELLOW  = (255, 230, 45)
    C_ORANGE  = (255, 130, 20)
    C_CRIMSON = (225, 40, 25)
    C_GLOW    = (255, 75, 0)
    
    flower_cy = cy - 20 * scale
    
    bands = [
        ("=======", C_YELLOW),
        ("##############", C_YELLOW),
        ("##==============##", C_ORANGE),
        ("|||||||||||||||||||", C_ORANGE),
        ("#%==============%:9", C_ORANGE),
        ("@@@@@@@@@@@@@@@@@@@@@", C_CRIMSON),
        ("@@@@@@@@@@@@@@@@@", C_CRIMSON)
    ]
    sp_y = 12 * scale * bloom
    sp_x = 9 * scale * bloom
    start_y = flower_cy - (len(bands) * sp_y) / 2.0
    for r_idx, (txt, col) in enumerate(bands):
        ry = start_y + r_idx * sp_y
        rx_start = cx - (len(txt) * sp_x) / 2.0
        for ci, ch in enumerate(txt):
            renderer.add(rx_start + ci * sp_x, ry, ch, col, size=int(14*scale), glow_col=C_GLOW, glow_rad=18)

def draw_gemini_daffodil(renderer, cx, cy, scale, bloom):
    C_GOLD   = (255, 230, 45)
    C_ORANGE = (255, 135, 20)
    C_GLOW   = (255, 200, 0)
    
    flower_cy = cy - 20 * scale
    
    # Center square trumpet disc
    grid_chars = ["#", "*", "%", "#", "*"]
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            ch = grid_chars[(dx + dy) % len(grid_chars)]
            renderer.add(cx + dx*9*scale, flower_cy + dy*9*scale, ch, C_ORANGE, size=int(13.5*scale), glow_col=C_GLOW, glow_rad=16)
            
    # 6 radiating star points of yellow characters
    for i in range(6):
        ang = (i / 6.0) * 2 * math.pi
        for step in range(1, 6):
            dist = 18 * scale + step * 10 * scale * bloom
            px = cx + math.cos(ang) * dist
            py = flower_cy + math.sin(ang) * dist
            ch = "*" if step == 5 else ("^" if step >= 3 else "+")
            renderer.add(px, py, ch, C_GOLD, size=int(14*scale), glow_col=C_GLOW, glow_rad=18)

# Generate:
# 1. Full polished gallery matching the Gemini image!
def generate_polished_gallery():
    w = 1400
    h = 1400
    renderer = MasterGlowingRenderer(w=w, h=h, bg=(5, 5, 8))
    
    species = ["hibiscus", "sunflower", "iris", "thistle", "marigold", "daffodil"]
    col_w = w // 3
    row_h = h // 2
    
    for idx, sp in enumerate(species):
        col_idx = idx % 3
        row_idx = idx // 3
        
        ox = col_idx * col_w + col_w // 2
        oy = row_idx * row_h + row_h - 50 # ground line
        
        sim = BiologicalPlantModel(plant_type=sp, seed=200 + idx)
        plant_data = sim.simulate(age=1.0, max_stem_height=380)
        draw_botanical_plant(renderer, ox, oy, plant_data)
        
    renderer.render_file("test/output/gemini_gallery_polished.png")

# 2. Growth stages sequence for Sunflower (demonstrating all 5 biological rules!)
def generate_growth_sequence():
    w = 1600
    h = 800
    renderer = MasterGlowingRenderer(w=w, h=h, bg=(5, 5, 8))
    
    ages = [0.25, 0.45, 0.65, 0.85, 1.0]
    step_w = w // len(ages)
    
    for idx, age in enumerate(ages):
        ox = idx * step_w + step_w // 2
        oy = h - 60
        
        sim = BiologicalPlantModel(plant_type="sunflower", seed=42)
        plant_data = sim.simulate(age=age, max_stem_height=420)
        draw_botanical_plant(renderer, ox, oy, plant_data)
        
    renderer.render_file("test/output/sunflower_growth_stages.png")

generate_polished_gallery()
generate_growth_sequence()
print("All generation completed!")

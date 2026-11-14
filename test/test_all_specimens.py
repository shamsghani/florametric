import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

os.makedirs("test/output", exist_ok=True)

# Complete Palette matching user reference image & botanical richness
PALETTE = {
    # Greens
    'stem_dark':  (50, 110, 25),
    'stem_mid':   (90, 165, 45),
    'stem_light': (135, 210, 75),
    
    # Hibiscus
    'hib_outer':  (235, 130, 185),
    'hib_mid':    (205, 80, 150),
    'hib_inner':  (165, 45, 115),
    'hib_stamen': (255, 225, 40),
    'hib_anther': (255, 175, 20),
    
    # Sunflower
    'sun_dark':   (55, 30, 18),
    'sun_mid':    (95, 55, 32),
    'sun_gold':   (235, 165, 20),
    'sun_yellow': (255, 220, 45),
    
    # Iris
    'iris_dark':  (75, 50, 135),
    'iris_mid':   (115, 85, 185),
    'iris_light': (165, 135, 230),
    'iris_signal':(255, 215, 40),
    
    # Thistle
    'thistle_calyx_dark':  (70, 130, 40),
    'thistle_calyx_light': (120, 185, 70),
    'thistle_brush_dark':  (115, 45, 125),
    'thistle_brush_mid':   (165, 70, 175),
    'thistle_brush_light': (210, 110, 220),
    
    # Marigold
    'mari_red':    (185, 45, 20),
    'mari_orange': (235, 105, 20),
    'mari_gold':   (255, 175, 30),
    'mari_yellow': (255, 225, 50),
    
    # Daffodil
    'daff_petal':       (255, 230, 65),
    'daff_petal_shade': (230, 195, 35),
    'daff_cup':         (245, 125, 20),
    'daff_cup_inner':   (190, 85, 15),
    'daff_cup_rim':     (255, 155, 35),
    
    # Rose
    'rose_crimson_dark':  (140, 20, 40),
    'rose_crimson_mid':   (200, 35, 60),
    'rose_crimson_light': (240, 75, 100),
    'rose_sepal':         (75, 140, 45),
    
    # Dandelion (fluffy seed clock)
    'dand_core':  (120, 110, 80),
    'dand_seed':  (240, 240, 245),
    'dand_stem':  (130, 175, 80),
    
    # Venus Flytrap
    'fly_green':  (95, 175, 50),
    'fly_jaw_in': (205, 55, 75),
    'fly_teeth':  (240, 235, 200),
}

class PlantModel:
    def __init__(self, w=18, h=26):
        self.w = w
        self.h = h
        self.cells = [[None for _ in range(w)] for _ in range(h)]
        
    def set(self, x, y, color, char=None):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.cells[y][x] = {'color': color, 'char': char}

def build_hibiscus():
    p = PlantModel(18, 26)
    sx, sy = 9, 13
    # Stem
    for y in range(sy, 25):
        p.set(sx, y, PALETTE['stem_mid'])
    # Leaves
    p.set(sx-1, 19, PALETTE['stem_light'])
    p.set(sx-2, 18, PALETTE['stem_light'])
    p.set(sx-3, 18, PALETTE['stem_mid'])
    p.set(sx-2, 19, PALETTE['stem_mid'])
    p.set(sx-3, 19, PALETTE['stem_dark'])
    
    p.set(sx+1, 16, PALETTE['stem_light'])
    p.set(sx+2, 15, PALETTE['stem_light'])
    p.set(sx+3, 15, PALETTE['stem_mid'])
    p.set(sx+2, 16, PALETTE['stem_mid'])
    p.set(sx+3, 16, PALETTE['stem_dark'])
    
    # Calyx
    p.set(sx, sy, PALETTE['stem_dark'])
    
    # Petals (Round 5-lobed cluster from reference image)
    cx, cy = 9, 8
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            d = math.sqrt(dx*dx + dy*dy)
            ang = math.atan2(dy, dx)
            # subtle 5-lobe pinch
            r_max = 4.2 * (1.0 + 0.1 * math.cos(5 * ang))
            if d <= r_max:
                if d < 1.6:
                    col = PALETTE['hib_inner']
                elif d < 3.0:
                    col = PALETTE['hib_mid']
                else:
                    col = PALETTE['hib_outer']
                p.set(cx + dx, cy + dy, col)
                
    # Curved long stamen arching up-left
    stamen = [(cx, cy), (cx-1, cy-1), (cx-2, cy-1), (cx-3, cy-2), (cx-4, cy-3)]
    for pt in stamen:
        p.set(pt[0], pt[1], PALETTE['hib_stamen'])
    p.set(cx-5, cy-3, PALETTE['hib_anther'])
    p.set(cx-5, cy-4, PALETTE['hib_anther'])
    return p

def build_sunflower():
    p = PlantModel(18, 26)
    sx, sy = 9, 13
    for y in range(sy, 25):
        p.set(sx, y, PALETTE['stem_mid'])
    # Paired leaves
    p.set(sx-1, 19, PALETTE['stem_light'])
    p.set(sx-2, 18, PALETTE['stem_light'])
    p.set(sx-3, 18, PALETTE['stem_mid'])
    p.set(sx-2, 19, PALETTE['stem_dark'])
    
    p.set(sx+1, 19, PALETTE['stem_light'])
    p.set(sx+2, 18, PALETTE['stem_light'])
    p.set(sx+3, 18, PALETTE['stem_mid'])
    p.set(sx+2, 19, PALETTE['stem_dark'])
    
    cx, cy = 9, 7
    # Center disc
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            d = math.sqrt(dx*dx + dy*dy)
            if d <= 2.2:
                col = PALETTE['sun_dark'] if d < 1.3 else PALETTE['sun_mid']
                p.set(cx + dx, cy + dy, col)
                
    # Radiating petals (stepped tooth pattern from reference)
    petals = [
        # Cardinals
        (cx, cy-3, PALETTE['sun_yellow']), (cx, cy-4, PALETTE['sun_gold']),
        (cx, cy+3, PALETTE['sun_yellow']), (cx, cy+4, PALETTE['sun_gold']),
        (cx-3, cy, PALETTE['sun_yellow']), (cx-4, cy, PALETTE['sun_gold']),
        (cx+3, cy, PALETTE['sun_yellow']), (cx+4, cy, PALETTE['sun_gold']),
        # Diagonals
        (cx-2, cy-2, PALETTE['sun_gold']), (cx-3, cy-3, PALETTE['sun_yellow']),
        (cx+2, cy-2, PALETTE['sun_gold']), (cx+3, cy-3, PALETTE['sun_yellow']),
        (cx-2, cy+2, PALETTE['sun_gold']), (cx-3, cy+3, PALETTE['sun_yellow']),
        (cx+2, cy+2, PALETTE['sun_gold']), (cx+3, cy+3, PALETTE['sun_yellow']),
        # Intermediates
        (cx-1, cy-3, PALETTE['sun_gold']), (cx+1, cy-3, PALETTE['sun_gold']),
        (cx-1, cy+3, PALETTE['sun_gold']), (cx+1, cy+3, PALETTE['sun_gold']),
        (cx-3, cy-1, PALETTE['sun_gold']), (cx-3, cy+1, PALETTE['sun_gold']),
        (cx+3, cy-1, PALETTE['sun_gold']), (cx+3, cy+1, PALETTE['sun_gold']),
    ]
    for px, py, col in petals:
        p.set(px, py, col)
    return p

def build_iris():
    p = PlantModel(18, 26)
    sx, sy = 9, 13
    for y in range(sy, 25):
        p.set(sx, y, PALETTE['stem_mid'])
    # Slender leaves / bracts
    p.set(sx-1, 18, PALETTE['stem_light'])
    p.set(sx-2, 17, PALETTE['stem_light'])
    p.set(sx-2, 16, PALETTE['stem_mid'])
    p.set(sx-1, 17, PALETTE['stem_dark'])
    
    p.set(sx+1, 16, PALETTE['stem_light'])
    p.set(sx+2, 15, PALETTE['stem_light'])
    p.set(sx+2, 14, PALETTE['stem_mid'])
    
    # Iris flower (distinct standards & falls from reference)
    cx, cy = 9, 7
    # Standards (top upright petals)
    p.set(cx, cy-3, PALETTE['iris_light'])
    p.set(cx-1, cy-2, PALETTE['iris_light'])
    p.set(cx, cy-2, PALETTE['iris_mid'])
    p.set(cx+1, cy-2, PALETTE['iris_light'])
    p.set(cx-1, cy-1, PALETTE['iris_mid'])
    p.set(cx, cy-1, PALETTE['iris_dark'])
    p.set(cx+1, cy-1, PALETTE['iris_mid'])
    
    # Falls (drooping lateral petals with yellow signal flare)
    p.set(cx-2, cy, PALETTE['iris_mid'])
    p.set(cx-3, cy, PALETTE['iris_light'])
    p.set(cx-4, cy+1, PALETTE['iris_mid'])
    p.set(cx-3, cy+1, PALETTE['iris_dark'])
    p.set(cx-2, cy+1, PALETTE['iris_signal']) # Yellow signal!
    
    p.set(cx+2, cy, PALETTE['iris_mid'])
    p.set(cx+3, cy, PALETTE['iris_light'])
    p.set(cx+4, cy+1, PALETTE['iris_mid'])
    p.set(cx+3, cy+1, PALETTE['iris_dark'])
    p.set(cx+2, cy+1, PALETTE['iris_signal']) # Yellow signal!
    
    # Center lower beard/fall
    p.set(cx, cy, PALETTE['iris_dark'])
    p.set(cx, cy+1, PALETTE['iris_mid'])
    p.set(cx, cy+2, PALETTE['iris_light'])
    return p

def build_thistle():
    p = PlantModel(18, 26)
    sx, sy = 9, 13
    for y in range(sy, 25):
        p.set(sx, y, PALETTE['stem_mid'])
    # Spiny paired leaves
    p.set(sx-1, 20, PALETTE['stem_light'])
    p.set(sx-2, 19, PALETTE['stem_light'])
    p.set(sx-3, 19, PALETTE['stem_mid'])
    p.set(sx-2, 20, PALETTE['stem_dark'])
    
    p.set(sx+1, 17, PALETTE['stem_light'])
    p.set(sx+2, 16, PALETTE['stem_light'])
    p.set(sx+3, 16, PALETTE['stem_mid'])
    p.set(sx+2, 17, PALETTE['stem_dark'])
    
    cx, cy = 9, 9
    # Bulbous green calyx / involucre (inverted vase shape)
    calyx_pts = [
        (cx, cy+2, PALETTE['thistle_calyx_dark']),
        (cx-1, cy+1, PALETTE['thistle_calyx_dark']), (cx, cy+1, PALETTE['thistle_calyx_light']), (cx+1, cy+1, PALETTE['thistle_calyx_dark']),
        (cx-2, cy, PALETTE['thistle_calyx_dark']), (cx-1, cy, PALETTE['thistle_calyx_light']), (cx, cy, PALETTE['thistle_calyx_light']), (cx+1, cy, PALETTE['thistle_calyx_light']), (cx+2, cy, PALETTE['thistle_calyx_dark']),
        (cx-2, cy-1, PALETTE['thistle_calyx_light']), (cx-1, cy-1, PALETTE['thistle_calyx_light']), (cx, cy-1, PALETTE['thistle_calyx_light']), (cx+1, cy-1, PALETTE['thistle_calyx_light']), (cx+2, cy-1, PALETTE['thistle_calyx_light']),
    ]
    for px, py, col in calyx_pts:
        p.set(px, py, col)
        
    # Flat-topped explosive brush of purple bristles
    brush_pts = [
        (cx-2, cy-2, PALETTE['thistle_brush_dark']), (cx-1, cy-2, PALETTE['thistle_brush_mid']), (cx, cy-2, PALETTE['thistle_brush_light']), (cx+1, cy-2, PALETTE['thistle_brush_mid']), (cx+2, cy-2, PALETTE['thistle_brush_dark']),
        (cx-2, cy-3, PALETTE['thistle_brush_mid']), (cx-1, cy-3, PALETTE['thistle_brush_light']), (cx, cy-3, PALETTE['thistle_brush_light']), (cx+1, cy-3, PALETTE['thistle_brush_light']), (cx+2, cy-3, PALETTE['thistle_brush_mid']),
        (cx-2, cy-4, PALETTE['thistle_brush_light']), (cx, cy-4, PALETTE['thistle_brush_light']), (cx+2, cy-4, PALETTE['thistle_brush_light']),
    ]
    for px, py, col in brush_pts:
        p.set(px, py, col)
    return p

def build_marigold():
    p = PlantModel(18, 26)
    sx, sy = 9, 13
    for y in range(sy, 25):
        p.set(sx, y, PALETTE['stem_mid'])
    # Feathery pinnate leaflets along stem
    p.set(sx-1, 19, PALETTE['stem_light'])
    p.set(sx-2, 19, PALETTE['stem_light'])
    p.set(sx-2, 18, PALETTE['stem_mid'])
    p.set(sx-3, 20, PALETTE['stem_dark'])
    
    p.set(sx+1, 17, PALETTE['stem_light'])
    p.set(sx+2, 17, PALETTE['stem_light'])
    p.set(sx+2, 16, PALETTE['stem_mid'])
    p.set(sx+3, 18, PALETTE['stem_dark'])
    
    cx, cy = 9, 8
    # Dense domed button of concentric fiery orange/red petals
    # Bottom layer: deep red
    for dx in range(-4, 5):
        p.set(cx + dx, cy + 2, PALETTE['mari_red'])
    for dx in range(-3, 4):
        p.set(cx + dx, cy + 3, PALETTE['mari_red'])
        
    # Mid layer: fiery orange
    for dx in range(-4, 5):
        p.set(cx + dx, cy + 1, PALETTE['mari_orange'])
    for dx in range(-3, 4):
        p.set(cx + dx, cy, PALETTE['mari_orange'])
        
    # Top dome: warm gold and bright yellow
    for dx in range(-3, 4):
        p.set(cx + dx, cy - 1, PALETTE['mari_gold'])
    for dx in range(-2, 3):
        p.set(cx + dx, cy - 2, PALETTE['mari_yellow'])
    p.set(cx, cy - 2, PALETTE['mari_yellow'])
    return p

def build_daffodil():
    p = PlantModel(18, 26)
    sx, sy = 9, 13
    for y in range(sy, 25):
        p.set(sx, y, PALETTE['stem_mid'])
    # Tall blade leaves
    for y in range(16, 23):
        p.set(sx-2, y, PALETTE['stem_light'])
        p.set(sx+2, y-2, PALETTE['stem_light'])
        
    cx, cy = 9, 7
    # 6-pointed star petals
    # Top
    p.set(cx, cy-4, PALETTE['daff_petal'])
    p.set(cx, cy-3, PALETTE['daff_petal'])
    # Bottom
    p.set(cx, cy+3, PALETTE['daff_petal'])
    p.set(cx, cy+4, PALETTE['daff_petal'])
    # Top-Left & Top-Right
    p.set(cx-3, cy-2, PALETTE['daff_petal'])
    p.set(cx-2, cy-1, PALETTE['daff_petal'])
    p.set(cx+3, cy-2, PALETTE['daff_petal'])
    p.set(cx+2, cy-1, PALETTE['daff_petal'])
    # Bottom-Left & Bottom-Right
    p.set(cx-3, cy+2, PALETTE['daff_petal'])
    p.set(cx-2, cy+1, PALETTE['daff_petal'])
    p.set(cx+3, cy+2, PALETTE['daff_petal'])
    p.set(cx+2, cy+1, PALETTE['daff_petal'])
    
    # Outer perianth filling
    p.set(cx-1, cy-2, PALETTE['daff_petal_shade'])
    p.set(cx+1, cy-2, PALETTE['daff_petal_shade'])
    p.set(cx-1, cy+2, PALETTE['daff_petal_shade'])
    p.set(cx+1, cy+2, PALETTE['daff_petal_shade'])
    
    # Center orange trumpet cup/corona
    for dy in range(-1, 2):
        for dx in range(-1, 2):
            col = PALETTE['daff_cup_inner'] if (dx==0 and dy==0) else PALETTE['daff_cup']
            p.set(cx + dx, cy + dy, col)
    p.set(cx, cy, PALETTE['daff_cup_rim'])
    return p

# Render function combining ASCII glyphs + pixel color tiles + edge detection
def render_specimen_to_image(plant, tile_size=18, font_size=13, bloom=True):
    img_w = plant.w * tile_size
    img_h = plant.h * tile_size
    
    img = Image.new("RGBA", (img_w, img_h), (8, 8, 12, 255))
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("consola.ttf", font_size)
    except:
        font = ImageFont.load_default()
        
    GLYPHS = [" ", ".", ":", "-", "=", "+", "*", "%", "#", "@"]
    
    for y in range(plant.h):
        for x in range(plant.w):
            cell = plant.cells[y][x]
            if cell and cell['color']:
                color = cell['color']
                px = x * tile_size
                py = y * tile_size
                
                # Check neighbors for edges
                has_top = y > 0 and plant.cells[y-1][x] is not None
                has_bottom = y < plant.h - 1 and plant.cells[y+1][x] is not None
                has_left = x > 0 and plant.cells[y][x-1] is not None
                has_right = x < plant.w - 1 and plant.cells[y][x+1] is not None
                
                is_edge = not (has_top and has_bottom and has_left and has_right)
                
                # Background color tile
                draw.rectangle([px, py, px + tile_size - 1, py + tile_size - 1], fill=(*color, 245))
                
                # ASCII Glyph
                if cell['char']:
                    ch = cell['char']
                    fg_col = (255, 255, 255, 240)
                elif is_edge:
                    if not has_top and (has_left or has_right):
                        ch = "¯" if has_bottom else "-"
                    elif not has_bottom and (has_left or has_right):
                        ch = "_"
                    elif not has_left or not has_right:
                        ch = "|"
                    else:
                        ch = "+"
                    fg_col = (255, 255, 255, 230)
                else:
                    lum = (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255.0
                    idx = int(lum * (len(GLYPHS) - 1))
                    ch = GLYPHS[idx]
                    fg_col = (int(color[0]*0.55), int(color[1]*0.55), int(color[2]*0.55), 255)
                    
                bbox = font.getbbox(ch)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                tx = px + (tile_size - tw) // 2
                ty = py + (tile_size - th) // 2 - 1
                draw.text((tx, ty), ch, font=font, fill=fg_col)
                
    if bloom:
        blur = img.filter(ImageFilter.GaussianBlur(radius=8))
        img = Image.blend(img, blur, alpha=0.32)
        glow = img.filter(ImageFilter.GaussianBlur(radius=2))
        img = Image.blend(img, glow, alpha=0.22)
        
    return img

# Generate composite grid image of the 6 flowers side by side!
flowers = [
    ("Hibiscus", build_hibiscus()),
    ("Sunflower", build_sunflower()),
    ("Iris", build_iris()),
    ("Thistle", build_thistle()),
    ("Marigold", build_marigold()),
    ("Daffodil", build_daffodil())
]

tile_size = 16
card_w = 18 * tile_size
card_h = 26 * tile_size

# 3 columns x 2 rows
gallery_w = 3 * card_w + 40
gallery_h = 2 * card_h + 80

gallery = Image.new("RGBA", (gallery_w, gallery_h), (8, 8, 12, 255))
draw_gal = ImageDraw.Draw(gallery)

for i, (name, flower) in enumerate(flowers):
    col_idx = i % 3
    row_idx = i // 3
    
    ox = 10 + col_idx * (card_w + 10)
    oy = 10 + row_idx * (card_h + 30)
    
    f_img = render_specimen_to_image(flower, tile_size=tile_size, font_size=11, bloom=True)
    gallery.paste(f_img, (ox, oy))

gallery.save("test/output/six_flowers_gallery.png")
print("Gallery rendered successfully: test/output/six_flowers_gallery.png")

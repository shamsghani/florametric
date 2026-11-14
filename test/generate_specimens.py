import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

os.makedirs("test/output", exist_ok=True)

# Colors from reference image
PALETTE = {
    # Greens for stems and leaves
    'stem_dark': (76, 154, 42),
    'stem_mid': (117, 187, 63),
    'stem_light': (157, 218, 93),
    
    # Hibiscus
    'hibiscus_dark': (186, 75, 137),
    'hibiscus_mid': (222, 114, 173),
    'hibiscus_light': (242, 160, 206),
    'stamen_yellow': (255, 222, 59),
    'stamen_gold': (230, 180, 20),
    
    # Sunflower
    'sun_center_dark': (66, 39, 24),
    'sun_center_mid': (102, 62, 38),
    'sun_petal_gold': (245, 178, 22),
    'sun_petal_yellow': (255, 216, 44),
    
    # Iris
    'iris_dark': (88, 62, 142),
    'iris_mid': (126, 96, 186),
    'iris_light': (168, 140, 222),
    'iris_signal': (255, 220, 50),
    
    # Thistle
    'thistle_calyx_dark': (85, 145, 50),
    'thistle_calyx_light': (130, 195, 80),
    'thistle_fluff_dark': (110, 45, 120),
    'thistle_fluff_mid': (155, 65, 165),
    'thistle_fluff_light': (195, 95, 205),
    
    # Marigold
    'mari_red': (180, 50, 20),
    'mari_orange': (230, 110, 20),
    'mari_gold': (255, 185, 30),
    'mari_yellow': (255, 220, 50),
    
    # Daffodil
    'daff_petal': (255, 230, 60),
    'daff_petal_shade': (230, 195, 30),
    'daff_cup': (245, 130, 20),
    'daff_cup_inner': (200, 90, 15),
}

class GridCanvas:
    def __init__(self, cols=24, rows=32, cell_size=16):
        self.cols = cols
        self.rows = rows
        self.cell_size = cell_size
        # cell: (char, fg_color, bg_color)
        self.grid = {}

    def set_cell(self, x, y, char, fg, bg=None):
        if 0 <= x < self.cols and 0 <= y < self.rows:
            self.grid[(x, y)] = (char, fg, bg)

    def draw_stem(self, x, y_start, y_end, fg=PALETTE['stem_mid'], char="║"):
        for y in range(y_start, y_end + 1):
            self.set_cell(x, y, char, fg)

    def render_to_image(self, out_path, font_path="consola.ttf", bloom=True):
        img_w = self.cols * self.cell_size
        img_h = self.rows * self.cell_size
        
        img = Image.new("RGBA", (img_w, img_h), (12, 12, 18, 255))
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype(font_path, int(self.cell_size * 0.9))
        except:
            font = ImageFont.load_default()
            
        # Draw cells
        for (x, y), (char, fg, bg) in self.grid.items():
            px = x * self.cell_size
            py = y * self.cell_size
            if bg:
                draw.rectangle([px, py, px + self.cell_size, py + self.cell_size], fill=bg)
            if char and char != ' ':
                # Center character in cell
                draw.text((px + 2, py - 1), char, font=font, fill=(*fg, 255))
                
        if bloom:
            # Gaussian blur bloom pass (user's technique from claude.ipynb)
            blur = img.filter(ImageFilter.GaussianBlur(radius=6))
            img = Image.blend(img, blur, alpha=0.35)
            glow = img.filter(ImageFilter.GaussianBlur(radius=2))
            img = Image.blend(img, glow, alpha=0.25)
            
        img.save(out_path)
        print(f"Generated {out_path}")

# Let's generate the 6 flowers!
def generate_all_six():
    # 1. HIBISCUS
    c = GridCanvas(cols=24, rows=32, cell_size=18)
    # Stem
    for y in range(16, 28):
        c.set_cell(11, y, "┃", PALETTE['stem_mid'])
    # Leaves
    # Left leaf
    c.set_cell(9, 21, "╱", PALETTE['stem_light'])
    c.set_cell(8, 20, "█", PALETTE['stem_mid'])
    c.set_cell(9, 20, "█", PALETTE['stem_light'])
    c.set_cell(7, 21, "█", PALETTE['stem_dark'])
    c.set_cell(8, 21, "█", PALETTE['stem_mid'])
    # Right leaf
    c.set_cell(13, 19, "╲", PALETTE['stem_light'])
    c.set_cell(14, 18, "█", PALETTE['stem_light'])
    c.set_cell(15, 18, "█", PALETTE['stem_mid'])
    c.set_cell(14, 19, "█", PALETTE['stem_dark'])
    c.set_cell(15, 19, "█", PALETTE['stem_mid'])
    
    # Flower base/calyx
    c.set_cell(11, 15, "◓", PALETTE['stem_dark'])
    
    # Hibiscus petals (round 5-lobed cluster)
    cx, cy = 11, 10
    petal_layout = [
        # top row
        (9, 6, "╭", PALETTE['hibiscus_light']), (10, 6, "─", PALETTE['hibiscus_light']), (11, 6, "─", PALETTE['hibiscus_light']), (12, 6, "─", PALETTE['hibiscus_light']), (13, 6, "╮", PALETTE['hibiscus_light']),
        (8, 7, "╱", PALETTE['hibiscus_light']), (9, 7, "█", PALETTE['hibiscus_light']), (10, 7, "█", PALETTE['hibiscus_light']), (11, 7, "█", PALETTE['hibiscus_mid']), (12, 7, "█", PALETTE['hibiscus_light']), (13, 7, "█", PALETTE['hibiscus_light']), (14, 7, "╲", PALETTE['hibiscus_light']),
        (7, 8, "│", PALETTE['hibiscus_light']), (8, 8, "█", PALETTE['hibiscus_light']), (9, 8, "█", PALETTE['hibiscus_mid']), (10, 8, "█", PALETTE['hibiscus_dark']), (11, 8, "█", PALETTE['hibiscus_dark']), (12, 8, "█", PALETTE['hibiscus_mid']), (13, 8, "█", PALETTE['hibiscus_light']), (14, 8, "│", PALETTE['hibiscus_light']),
        (7, 9, "│", PALETTE['hibiscus_light']), (8, 9, "█", PALETTE['hibiscus_mid']), (9, 9, "█", PALETTE['hibiscus_dark']), (10, 9, "█", PALETTE['hibiscus_dark']), (11, 9, "█", PALETTE['hibiscus_dark']), (12, 9, "█", PALETTE['hibiscus_dark']), (13, 9, "█", PALETTE['hibiscus_mid']), (14, 9, "│", PALETTE['hibiscus_light']),
        (7, 10, "│", PALETTE['hibiscus_mid']), (8, 10, "█", PALETTE['hibiscus_light']), (9, 10, "█", PALETTE['hibiscus_mid']), (10, 10, "█", PALETTE['hibiscus_dark']), (11, 10, "█", PALETTE['hibiscus_dark']), (12, 10, "█", PALETTE['hibiscus_mid']), (13, 10, "█", PALETTE['hibiscus_light']), (14, 10, "│", PALETTE['hibiscus_mid']),
        (8, 11, "╲", PALETTE['hibiscus_mid']), (9, 11, "█", PALETTE['hibiscus_light']), (10, 11, "█", PALETTE['hibiscus_mid']), (11, 11, "█", PALETTE['hibiscus_mid']), (12, 11, "█", PALETTE['hibiscus_light']), (13, 11, "█", PALETTE['hibiscus_mid']), (14, 11, "╱", PALETTE['hibiscus_mid']),
        (9, 12, "╰", PALETTE['hibiscus_dark']), (10, 12, "─", PALETTE['hibiscus_dark']), (11, 12, "─", PALETTE['hibiscus_dark']), (12, 12, "─", PALETTE['hibiscus_dark']), (13, 12, "╯", PALETTE['hibiscus_dark']),
    ]
    for px, py, ch, col in petal_layout:
        c.set_cell(px, py, ch, col)
        
    # Long curved stamen arching out to the left!
    c.set_cell(11, 9, "╭", PALETTE['stamen_yellow'])
    c.set_cell(10, 8, "╯", PALETTE['stamen_yellow'])
    c.set_cell(9, 8, "╰", PALETTE['stamen_yellow'])
    c.set_cell(8, 7, "╭", PALETTE['stamen_yellow'])
    c.set_cell(7, 7, "█", PALETTE['stamen_gold'])
    c.set_cell(6, 6, "✦", PALETTE['stamen_yellow'])
    
    c.render_to_image("test/output/specimen_hibiscus.png")

    # 2. SUNFLOWER
    c2 = GridCanvas(cols=24, rows=32, cell_size=18)
    for y in range(16, 28):
        c2.set_cell(11, y, "┃", PALETTE['stem_mid'])
    # Paired leaves
    c2.set_cell(10, 20, "◖", PALETTE['stem_light'])
    c2.set_cell(9, 19, "▲", PALETTE['stem_light'])
    c2.set_cell(8, 19, "█", PALETTE['stem_mid'])
    c2.set_cell(8, 20, "█", PALETTE['stem_dark'])
    
    c2.set_cell(12, 20, "◗", PALETTE['stem_light'])
    c2.set_cell(13, 19, "▲", PALETTE['stem_light'])
    c2.set_cell(14, 19, "█", PALETTE['stem_mid'])
    c2.set_cell(14, 20, "█", PALETTE['stem_dark'])
    
    # Sunflower head
    # Disc floret (center)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            dist = math.sqrt(dx*dx + dy*dy)
            if dist <= 2.2:
                col = PALETTE['sun_center_dark'] if dist < 1.4 else PALETTE['sun_center_mid']
                ch = "▓" if dist < 1.0 else "▒"
                c2.set_cell(11 + dx, 10 + dy, ch, col)
                
    # Radiating ray petals
    sun_petals = [
        # Cardinals
        (11, 6, "▲", PALETTE['sun_petal_yellow']), (11, 7, "█", PALETTE['sun_petal_gold']),
        (11, 14, "▼", PALETTE['sun_petal_yellow']), (11, 13, "█", PALETTE['sun_petal_gold']),
        (6, 10, "◄", PALETTE['sun_petal_yellow']), (7, 10, "█", PALETTE['sun_petal_gold']),
        (16, 10, "►", PALETTE['sun_petal_yellow']), (15, 10, "█", PALETTE['sun_petal_gold']),
        # Diagonals
        (8, 7, "◤", PALETTE['sun_petal_yellow']), (9, 7, "█", PALETTE['sun_petal_gold']),
        (14, 7, "◥", PALETTE['sun_petal_yellow']), (13, 7, "█", PALETTE['sun_petal_gold']),
        (8, 13, "◣", PALETTE['sun_petal_yellow']), (9, 13, "█", PALETTE['sun_petal_gold']),
        (14, 13, "◢", PALETTE['sun_petal_yellow']), (13, 13, "█", PALETTE['sun_petal_gold']),
        # Intermediates
        (10, 6, "╱", PALETTE['sun_petal_yellow']), (12, 6, "╲", PALETTE['sun_petal_yellow']),
        (6, 9, "╱", PALETTE['sun_petal_yellow']), (6, 11, "╲", PALETTE['sun_petal_yellow']),
        (16, 9, "╲", PALETTE['sun_petal_yellow']), (16, 11, "╱", PALETTE['sun_petal_yellow']),
        (10, 14, "╲", PALETTE['sun_petal_yellow']), (12, 14, "╱", PALETTE['sun_petal_yellow']),
    ]
    for px, py, ch, col in sun_petals:
        c2.set_cell(px, py, ch, col)
        
    c2.render_to_image("test/output/specimen_sunflower.png")

generate_all_six()

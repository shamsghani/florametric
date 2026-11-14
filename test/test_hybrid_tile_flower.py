import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

os.makedirs("test/output", exist_ok=True)

# Let's test the tile / hybrid approach:
# Each botanical specimen is defined on a pixel-grid (like the user's reference image!)
# But rendered with ASCII glyphs, edge detection, tone mapping, and bloom glow.

# Reference image colors
C_STEM_DARK = (55, 120, 30)
C_STEM_MID  = (95, 175, 50)
C_STEM_LIGHT= (140, 215, 80)

C_HIBISCUS_OUTER = (235, 130, 185)
C_HIBISCUS_MID   = (210, 85, 155)
C_HIBISCUS_INNER = (170, 50, 120)
C_HIBISCUS_STAMEN= (255, 225, 40)
C_HIBISCUS_ANTHER= (255, 180, 20)

C_SUN_CENTER_DARK= (55, 30, 18)
C_SUN_CENTER_MID = (90, 50, 30)
C_SUN_PETAL_GOLD = (240, 170, 20)
C_SUN_PETAL_BRIGHT = (255, 220, 40)

C_IRIS_DEEP = (70, 45, 125)
C_IRIS_MID  = (115, 85, 180)
C_IRIS_LIGHT= (160, 135, 225)
C_IRIS_GOLD = (255, 215, 40)

class PixelPlant:
    def __init__(self, w=18, h=26):
        self.w = w
        self.h = h
        # grid stores (r, g, b) or None
        self.pixels = [[None for _ in range(w)] for _ in range(h)]
        
    def set(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.pixels[y][x] = color

def create_hibiscus(bloom=1.0, age=1.0):
    p = PixelPlant(20, 28)
    
    # Stem
    stem_top = int(14 - (bloom * 2))
    stem_bottom = 27
    stem_x = 10
    
    for y in range(stem_top, stem_bottom):
        p.set(stem_x, y, C_STEM_MID)
        
    # Leaves (like reference image)
    # Left leaf
    p.set(stem_x - 1, 20, C_STEM_LIGHT)
    p.set(stem_x - 2, 19, C_STEM_LIGHT)
    p.set(stem_x - 3, 19, C_STEM_MID)
    p.set(stem_x - 2, 20, C_STEM_MID)
    p.set(stem_x - 3, 20, C_STEM_DARK)
    p.set(stem_x - 4, 20, C_STEM_DARK)
    
    # Right leaf
    p.set(stem_x + 1, 17, C_STEM_LIGHT)
    p.set(stem_x + 2, 16, C_STEM_LIGHT)
    p.set(stem_x + 3, 16, C_STEM_MID)
    p.set(stem_x + 2, 17, C_STEM_MID)
    p.set(stem_x + 3, 17, C_STEM_DARK)
    p.set(stem_x + 4, 17, C_STEM_DARK)
    
    # Calyx
    p.set(stem_x - 1, stem_top, C_STEM_DARK)
    p.set(stem_x, stem_top, C_STEM_MID)
    p.set(stem_x + 1, stem_top, C_STEM_DARK)
    
    # Petals (Round 5-lobed shape from reference)
    cx, cy = 10, stem_top - 5
    r_max = 5.2 * bloom
    r_mid = 3.2 * bloom
    r_inner = 1.5 * bloom
    
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            d = math.sqrt(dx*dx + dy*dy)
            # slight 5-fold modulation
            angle = math.atan2(dy, dx)
            petal_mod = 1.0 + 0.12 * math.cos(5 * angle)
            eff_d = d / petal_mod
            
            if eff_d <= r_max:
                if eff_d < r_inner:
                    col = C_HIBISCUS_INNER
                elif eff_d < r_mid:
                    col = C_HIBISCUS_MID
                else:
                    col = C_HIBISCUS_OUTER
                p.set(cx + dx, cy + dy, col)
                
    # Long curved stamen arching out (prominent feature in reference image!)
    if bloom > 0.4:
        stamen_pts = [
            (cx, cy),
            (cx - 1, cy - 1),
            (cx - 2, cy - 1),
            (cx - 3, cy - 2),
            (cx - 4, cy - 3),
            (cx - 5, cy - 4),
        ]
        for sx, sy in stamen_pts:
            p.set(sx, sy, C_HIBISCUS_STAMEN)
        # Anther tip
        p.set(cx - 6, cy - 4, C_HIBISCUS_ANTHER)
        p.set(cx - 6, cy - 5, C_HIBISCUS_ANTHER)
        
    return p

def create_sunflower(bloom=1.0, age=1.0):
    p = PixelPlant(22, 28)
    stem_x = 11
    stem_top = 13
    
    # Stem
    for y in range(stem_top, 27):
        p.set(stem_x, y, C_STEM_MID)
        
    # Paired leaves
    p.set(stem_x - 1, 19, C_STEM_LIGHT)
    p.set(stem_x - 2, 18, C_STEM_LIGHT)
    p.set(stem_x - 3, 18, C_STEM_MID)
    p.set(stem_x - 2, 19, C_STEM_DARK)
    p.set(stem_x - 3, 19, C_STEM_DARK)
    
    p.set(stem_x + 1, 19, C_STEM_LIGHT)
    p.set(stem_x + 2, 18, C_STEM_LIGHT)
    p.set(stem_x + 3, 18, C_STEM_MID)
    p.set(stem_x + 2, 19, C_STEM_DARK)
    p.set(stem_x + 3, 19, C_STEM_DARK)
    
    # Calyx
    p.set(stem_x - 1, stem_top, C_STEM_MID)
    p.set(stem_x, stem_top, C_STEM_MID)
    p.set(stem_x + 1, stem_top, C_STEM_MID)
    
    # Flower head
    cx, cy = 11, 7
    # Center disc
    r_core = 3.2
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            d = math.sqrt(dx*dx + dy*dy)
            if d <= r_core:
                col = C_SUN_CENTER_DARK if d < 1.8 else C_SUN_CENTER_MID
                p.set(cx + dx, cy + dy, col)
                
    # Radiating petals around disc
    # Exactly like the reference image: toothed golden outer petals
    for angle_deg in range(0, 360, 20):
        rad = math.radians(angle_deg)
        # inner petal tip
        px1 = cx + math.cos(rad) * 4.2
        py1 = cy + math.sin(rad) * 4.2
        # outer petal tip
        px2 = cx + math.cos(rad) * 5.8
        py2 = cy + math.sin(rad) * 5.8
        
        p.set(int(round(px1)), int(round(py1)), C_SUN_PETAL_GOLD)
        p.set(int(round(px2)), int(round(py2)), C_SUN_PETAL_BRIGHT)
        
    return p

# Render function combining ASCII glyphs + pixel color tiles + edge detection!
def render_hybrid(plant, tile_size=16, font_size=12, bloom=True):
    img_w = plant.w * tile_size
    img_h = plant.h * tile_size
    
    img = Image.new("RGBA", (img_w, img_h), (10, 10, 15, 255))
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("consola.ttf", font_size)
    except:
        font = ImageFont.load_default()
        
    # Density glyphs from dark to light
    GLYPHS = [" ", ".", ":", "-", "=", "+", "*", "%", "#", "@"]
    
    for y in range(plant.h):
        for x in range(plant.w):
            color = plant.pixels[y][x]
            if color:
                px = x * tile_size
                py = y * tile_size
                
                # Check neighbors to detect edges (Sobel/contour style)
                has_top = y > 0 and plant.pixels[y-1][x] is not None
                has_bottom = y < plant.h - 1 and plant.pixels[y+1][x] is not None
                has_left = x > 0 and plant.pixels[y][x-1] is not None
                has_right = x < plant.w - 1 and plant.pixels[y][x+1] is not None
                
                is_edge = not (has_top and has_bottom and has_left and has_right)
                
                # Determine background tint (rich color tile)
                bg_col = (*color, 240)
                draw.rectangle([px, py, px + tile_size - 1, py + tile_size - 1], fill=bg_col)
                
                # Foreground ASCII character for texture & detail
                # If edge, choose directional edge character!
                if is_edge:
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
                    # Inner fill glyph based on luminance
                    lum = (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255.0
                    idx = int(lum * (len(GLYPHS) - 1))
                    ch = GLYPHS[idx]
                    # Subtly darker or lighter glyph for internal embossed texture
                    fg_col = (int(color[0]*0.6), int(color[1]*0.6), int(color[2]*0.6), 255)
                    
                # Draw glyph inside the tile
                # calculate text size for centering
                bbox = font.getbbox(ch)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                tx = px + (tile_size - tw) // 2
                ty = py + (tile_size - th) // 2 - 1
                draw.text((tx, ty), ch, font=font, fill=fg_col)
                
    if bloom:
        # Bloom pass like user's claude.ipynb
        blur = img.filter(ImageFilter.GaussianBlur(radius=8))
        img = Image.blend(img, blur, alpha=0.3)
        glow = img.filter(ImageFilter.GaussianBlur(radius=2))
        img = Image.blend(img, glow, alpha=0.2)
        
    return img

hibiscus = create_hibiscus(bloom=1.0)
img_hib = render_hybrid(hibiscus, tile_size=18, font_size=13, bloom=True)
img_hib.save("test/output/hybrid_hibiscus.png")

sunflower = create_sunflower(bloom=1.0)
img_sun = render_hybrid(sunflower, tile_size=18, font_size=13, bloom=True)
img_sun.save("test/output/hybrid_sunflower.png")

print("Rendered hybrid specimens successfully!")

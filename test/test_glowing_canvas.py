import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

os.makedirs("test/output", exist_ok=True)

# Botanical ASCII Engine Prototype: Glowing Pure-Typographic Character Rendering
# Pure black background, NO background rectangular blocks, rich glowing text with atmospheric light haze!

class GlowingAsciiCanvas:
    def __init__(self, width=800, height=900, bg=(6, 6, 8)):
        self.w = width
        self.h = height
        self.bg = bg
        # list of {x, y, char, fg, size, glow_radius, glow_color}
        self.glyphs = []
        
    def add_glyph(self, x, y, char, fg, size=18, glow_color=None, glow_radius=12):
        if char and char != ' ':
            self.glyphs.append({
                'x': float(x),
                'y': float(y),
                'char': char,
                'fg': fg,
                'size': int(size),
                'glow_color': glow_color if glow_color else fg,
                'glow_radius': glow_radius
            })

    def render(self, out_path, font_family="consola.ttf", global_bloom=True):
        # Create high-res black image
        img = Image.new("RGBA", (self.w, self.h), (*self.bg, 255))
        
        # Load fonts at needed sizes
        fonts = {}
        for sz in [10, 12, 14, 16, 18, 20, 22, 24, 28, 32]:
            try:
                fonts[sz] = ImageFont.truetype(font_family, sz)
            except:
                fonts[sz] = ImageFont.load_default()
                
        # 1. First pass: Draw a diffuse colored light aura map (ambient glow behind the flowers)
        # Group glyphs by general aura regions or draw soft light blobs
        aura_img = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        aura_draw = ImageDraw.Draw(aura_img)
        
        for g in self.glyphs:
            rad = g['glow_radius']
            gc = g['glow_color']
            # Draw soft circle of light at glyph position
            bbox = [g['x'] - rad, g['y'] - rad, g['x'] + rad, g['y'] + rad]
            aura_draw.ellipse(bbox, fill=(*gc, 18))
            
        # Blur the aura heavily to create the celestial atmospheric haze
        aura_blurred = aura_img.filter(ImageFilter.GaussianBlur(radius=28))
        aura_blurred2 = aura_img.filter(ImageFilter.GaussianBlur(radius=14))
        
        # Composite aura onto black background
        img = Image.alpha_composite(img, aura_blurred)
        img = Image.alpha_composite(img, aura_blurred2)
        
        # 2. Second pass: Draw the crisp sharp characters
        text_layer = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        text_draw = ImageDraw.Draw(text_layer)
        
        for g in self.glyphs:
            sz = g['size']
            font = fonts.get(sz, fonts.get(18))
            # Center character around (x, y)
            bbox = font.getbbox(g['char'])
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            tx = g['x'] - tw / 2.0
            ty = g['y'] - th / 2.0
            text_draw.text((tx, ty), g['char'], font=font, fill=(*g['fg'], 255))
            
        # 3. Third pass: Character self-glow pass (Gaussian blur of the sharp text layer)
        glow_sharp = text_layer.filter(ImageFilter.GaussianBlur(radius=3))
        glow_wide = text_layer.filter(ImageFilter.GaussianBlur(radius=8))
        
        # Composite glow passes
        img = Image.alpha_composite(img, glow_wide)
        img = Image.alpha_composite(img, glow_sharp)
        img = Image.alpha_composite(img, text_layer)
        
        img.save(out_path)
        print(f"Rendered glowing ASCII to {out_path}")

print("GlowingAsciiCanvas defined successfully")

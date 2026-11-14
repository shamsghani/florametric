import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

os.makedirs("test/output", exist_ok=True)

class HybridRenderer:
    def __init__(self, width=640, height=480, bg=(10, 10, 14)):
        self.w = width
        self.h = height
        self.bg = bg
        self.elements = [] # list of (x, y, char, fg, size, glow)
        
    def add(self, x, y, char, fg, size=16, glow=False):
        self.elements.append({
            'x': x, 'y': y, 'char': char, 'fg': fg, 'size': size, 'glow': glow
        })
        
    def render(self, output_path, bloom=True):
        img = Image.new("RGBA", (self.w, self.h), (*self.bg, 255))
        draw = ImageDraw.Draw(img)
        
        # Load fonts
        try:
            font_cache = {
                sz: ImageFont.truetype("consola.ttf", sz) for sz in [12, 14, 16, 20, 24, 28, 32]
            }
        except:
            font_cache = {sz: ImageFont.load_default() for sz in [12, 14, 16, 20, 24, 28, 32]}
            
        for el in self.elements:
            sz = el['size']
            font = font_cache.get(sz, font_cache.get(16))
            draw.text((el['x'], el['y']), el['char'], font=font, fill=el['fg'])
            
        if bloom:
            # Gaussian blur bloom pass (user's technique from claude.ipynb)
            blur1 = img.filter(ImageFilter.GaussianBlur(radius=8))
            blur2 = img.filter(ImageFilter.GaussianBlur(radius=3))
            
            # Blend bloom
            img = Image.blend(img, blur1, alpha=0.35)
            img = Image.blend(img, blur2, alpha=0.25)
            
        img.save(output_path)
        print(f"Saved {output_path}")

print("HybridRenderer initialized")

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Test directory
os.makedirs("test/output", exist_ok=True)

# Let's test procedural generation of the flowers from the user's reference image
# combining glyphs/characters, rich colors, and bloom glow!

class GlyphCell:
    def __init__(self, char=' ', fg=(255, 255, 255), bg=None, edge=None):
        self.char = char
        self.fg = fg
        self.bg = bg
        self.edge = edge

class HybridAsciiCanvas:
    def __init__(self, width=40, height=50, cell_w=12, cell_h=16):
        self.w = width
        self.h = height
        self.cell_w = cell_w
        self.cell_h = cell_h
        self.grid = [[GlyphCell() for _ in range(width)] for _ in range(height)]
        
    def set(self, x, y, char, fg, bg=None, edge=None):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.grid[y][x] = GlyphCell(char, fg, bg, edge)
            
    def render_to_image(self, font_name="consola.ttf", font_size=14, bloom=True):
        img_w = self.w * self.cell_w
        img_h = self.h * self.cell_h
        
        # Base image: deep dark background
        img = Image.new("RGBA", (img_w, img_h), (10, 10, 14, 255))
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype(font_name, font_size)
        except:
            font = ImageFont.load_default()
            
        # Draw background blocks first if any
        for y in range(self.h):
            for x in range(self.w):
                cell = self.grid[y][x]
                if cell.bg:
                    px = x * self.cell_w
                    py = y * self.cell_h
                    draw.rectangle([px, py, px + self.cell_w, py + self.cell_h], fill=cell.bg)
                    
        # Draw glyphs
        for y in range(self.h):
            for x in range(self.w):
                cell = self.grid[y][x]
                if cell.char and cell.char != ' ':
                    px = x * self.cell_w + 1
                    py = y * self.cell_h
                    draw.text((px, py), cell.char, font=font, fill=cell.fg)
                    
        if bloom:
            # Gaussian blur bloom pass (inspired by user's claude.ipynb!)
            blur = img.filter(ImageFilter.GaussianBlur(radius=6))
            # Screen / additive blend
            img = Image.blend(img, blur, alpha=0.35)
            
            # Subtle second sharp glow
            glow = img.filter(ImageFilter.GaussianBlur(radius=2))
            img = Image.blend(img, glow, alpha=0.2)
            
        return img

print("Canvas class created successfully")

import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

sys.stdout.reconfigure(encoding="utf-8")

font = TTFont("Inter.ttf")
glyph_set = font.getGlyphSet()
hmtx = font["hmtx"]
upm = font["head"].unitsPerEm

print(f"Font UPM: {upm}")

def text_to_svg_paths(text, font_size, start_x, baseline_y, letter_spacing_em=0.0):
    scale = font_size / upm
    pen = SVGPathPen(glyph_set)
    curr_x = start_x
    paths = []
    
    cmap = font.getBestCmap()
    for char in text:
        code = ord(char)
        glyph_name = cmap.get(code)
        if not glyph_name or glyph_name not in glyph_set:
            glyph_name = ".notdef"
        
        advance_width, lsb = hmtx[glyph_name]
        
        # Glyph path
        char_pen = SVGPathPen(glyph_set)
        # Transform: flip y (font coordinates have y up, SVG has y down)
        # and translate to (curr_x, baseline_y)
        # transform matrix: (scale, 0, 0, -scale, curr_x, baseline_y)
        tpen = TransformPen(char_pen, (scale, 0, 0, -scale, curr_x, baseline_y))
        glyph_set[glyph_name].draw(tpen)
        cmd = char_pen.getCommands()
        if cmd.strip():
            paths.append(cmd)
        
        curr_x += (advance_width + letter_spacing_em * upm) * scale
        
    return " ".join(paths), curr_x

title_path, end_x = text_to_svg_paths("Thenar", 76.0, 351.5, 131.1, letter_spacing_em=0.04)
print(f"Title path generated, length: {len(title_path)}, end_x: {end_x:.1f}")

tagline_path, end_x_tag = text_to_svg_paths("“It knows how you open.”", 25.5, 352.5, 193.1, letter_spacing_em=0.01)
print(f"Tagline path generated, length: {len(tagline_path)}, end_x: {end_x_tag:.1f}")

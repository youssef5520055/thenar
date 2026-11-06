import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

sys.stdout.reconfigure(encoding="utf-8")

font = TTFont("Inter.ttf")
glyph_set = font.getGlyphSet()

pen = SVGPathPen(glyph_set)
glyph_set["T"].draw(pen)
print("Glyph 'T' path length:", len(pen.getCommands()))
print("Sample path command:", pen.getCommands()[:100])

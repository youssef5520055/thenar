import os
import sys
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

os.makedirs("study/assets/brand_verification", exist_ok=True)

logo_1024 = Image.open("logo-1024.png").convert("RGBA")
lw, lh = logo_1024.size

bg_configs = {
    "white": (255, 255, 255, 255),
    "black": (0, 0, 0, 255),
    "dark": (11, 14, 20, 255), # #0B0E14
    "accent": (26, 165, 154, 255), # #1AA59A
}

pad = 60
canvas_w = lw + pad * 2
canvas_h = lh + pad * 2

for name, color in bg_configs.items():
    comp = Image.new("RGBA", (canvas_w, canvas_h), color)
    comp.alpha_composite(logo_1024, (pad, pad))
    comp_path = f"study/assets/brand_verification/composite_{name}.png"
    comp.save(comp_path)
    
    # 100% crop around emblem and text
    crop_100 = comp.crop((pad, pad, pad + 400, pad + 200))
    crop_100.save(f"study/assets/brand_verification/crop_100_{name}.png")
    
    # 400% zoom crop around junction / arc edge to show pristine sharpness
    crop_junction = comp.crop((pad + 60, pad + 90, pad + 160, pad + 190))
    crop_400 = crop_junction.resize((400, 400), Image.Resampling.NEAREST)
    crop_400.save(f"study/assets/brand_verification/crop_400_{name}.png")
    
    print(f"Generated composites and crops for {name}")

print("All background verification assets generated successfully!")

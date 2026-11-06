import os
import shutil

dest_dirs = [
    "public",
    "assets/brand",
    "apps/web/public",
    "study/assets/brand"
]

files_to_copy = [
    "logo.svg",
    "emblem.svg",
    "logo-4096.png",
    "logo-2048.png",
    "logo-1024.png",
    "logo-512.png",
    "logo-256.png",
    "logo.png",
    "logo@2x.png",
    "icon-512.png",
    "icon-192.png",
    "apple-touch-icon-180.png",
    "favicon-32.png",
    "favicon-16.png",
    "favicon.ico",
    "favicon.png",
]

for d in dest_dirs:
    os.makedirs(d, exist_ok=True)
    for f in files_to_copy:
        if os.path.exists(f):
            shutil.copy2(f, os.path.join(d, f))

# Also copy to artifacts directory for inspection
artifact_dir = r"C:\Users\laptop.house\.gemini\antigravity\brain\5ee67ec9-084a-47a7-920e-f7098b09656d\brand_verification"
os.makedirs(artifact_dir, exist_ok=True)
for f in files_to_copy:
    if os.path.exists(f):
        shutil.copy2(f, os.path.join(artifact_dir, f))

for bg in ["white", "black", "dark", "accent"]:
    for prefix in ["composite_", "crop_100_", "crop_400_"]:
        src_crop = f"study/assets/brand_verification/{prefix}{bg}.png"
        if os.path.exists(src_crop):
            shutil.copy2(src_crop, os.path.join(artifact_dir, f"{prefix}{bg}.png"))

print("All crisp brand assets copied and synchronized successfully!")

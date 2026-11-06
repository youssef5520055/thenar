import os
import sys
import shutil
import numpy as np
from PIL import Image
import scipy.ndimage as ndi

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SRC_IMG_PATH = r"C:/Users/laptop.house/.gemini/antigravity/brain/5ee67ec9-084a-47a7-920e-f7098b09656d/.user_uploaded/media_1793966847278_aeb6cf11.png"

def main():
    print(f"Loading source image: {SRC_IMG_PATH}")
    im = Image.open(SRC_IMG_PATH)
    arr = np.array(im)
    H, W = arr.shape[:2]
    print(f"Original dimensions: {W}x{H}, mode: {im.mode}")

    bg_ref = np.array([11.0, 14.0, 20.0])
    rgb = arr[:, :, :3].astype(np.float64)
    dist = np.sqrt(np.sum((rgb - bg_ref)**2, axis=2))
    labels, num_features = ndi.label(dist > 1.0)
    print(f"Detected {num_features} connected components.")

    # Components 3..31 are the logo artwork (dots, ring, text, tagline)
    final_rgb = np.zeros((H, W, 3), dtype=np.float64)
    final_alpha = np.zeros((H, W), dtype=np.float64)

    for i in range(3, 32):
        mask_i = (labels == i)
        core_i = ndi.binary_erosion(mask_i, iterations=1)
        dilated_i = ndi.binary_dilation(mask_i, iterations=1)
        
        _, indices = ndi.distance_transform_edt(~core_i, return_indices=True)
        F_near = rgb[indices[0], indices[1]]
        
        v = F_near - bg_ref
        u = rgb - bg_ref
        
        v_dot_v = np.sum(v**2, axis=2)
        v_dot_v = np.maximum(v_dot_v, 1e-4)
        u_dot_v = np.sum(u * v, axis=2)
        
        alpha_i = np.clip(u_dot_v / v_dot_v, 0.0, 1.0)
        alpha_i[core_i] = 1.0
        alpha_i[~dilated_i] = 0.0
        alpha_i[alpha_i < 0.02] = 0.0
        
        F_i = np.zeros_like(rgb)
        decont_mask = (alpha_i > 0.08)
        F_i[decont_mask] = bg_ref + u[decont_mask] / alpha_i[decont_mask, None]
        F_i[~decont_mask] = F_near[~decont_mask]
        F_i[core_i] = rgb[core_i]
        F_i = np.clip(F_i, 0.0, 255.0)
        
        active = dilated_i & (alpha_i > 0)
        final_rgb[active] = F_i[active]
        final_alpha[active] = np.maximum(final_alpha[active], alpha_i[active])

    # 1. Full Logo Bounding Box
    y_nz, x_nz = np.where(final_alpha > 0)
    ymin, ymax = y_nz.min(), y_nz.max()
    xmin, xmax = x_nz.min(), x_nz.max()
    h_box = ymax - ymin + 1
    w_box = xmax - xmin + 1
    print(f"Strict logo bounds: y={ymin}..{ymax} (h={h_box}), x={xmin}..{xmax} (w={w_box})")

    # 4% padding of largest side (632 * 0.04 ~= 25px)
    pad = int(round(max(h_box, w_box) * 0.04))
    print(f"4% transparent padding: {pad}px")

    ymin_pad = max(0, ymin - pad)
    ymax_pad = min(H - 1, ymax + pad)
    xmin_pad = max(0, xmin - pad)
    xmax_pad = min(W - 1, xmax + pad)

    cropped_rgb = final_rgb[ymin_pad:ymax_pad+1, xmin_pad:xmax_pad+1]
    cropped_alpha = final_alpha[ymin_pad:ymax_pad+1, xmin_pad:xmax_pad+1]

    logo_uint8 = np.zeros((cropped_alpha.shape[0], cropped_alpha.shape[1], 4), dtype=np.uint8)
    logo_uint8[:, :, :3] = np.clip(np.round(cropped_rgb), 0, 255).astype(np.uint8)
    logo_uint8[:, :, 3] = np.clip(np.round(cropped_alpha * 255.0), 0, 255).astype(np.uint8)

    logo_im = Image.fromarray(logo_uint8, "RGBA")
    w_final, h_final = logo_im.size
    print(f"Final transparent logo.png dimensions: {w_final}x{h_final}")

    # 2. Extract Mark Emblem separately (components 3..6, 13..14)
    mark_components = [3, 4, 5, 6, 13, 14]
    mark_mask = np.isin(labels, mark_components)
    y_m, x_m = np.where(mark_mask & (final_alpha > 0))
    ymin_m, ymax_m = y_m.min(), y_m.max()
    xmin_m, xmax_m = x_m.min(), x_m.max()
    hm = ymax_m - ymin_m + 1
    wm = xmax_m - xmin_m + 1
    print(f"Mark emblem bounds: y={ymin_m}..{ymax_m} (h={hm}), x={xmin_m}..{xmax_m} (w={wm})")
    
    pad_m = int(round(max(hm, wm) * 0.04))
    ymin_mp = max(0, ymin_m - pad_m)
    ymax_mp = min(H - 1, ymax_m + pad_m)
    xmin_mp = max(0, xmin_m - pad_m)
    xmax_mp = min(W - 1, xmax_m + pad_m)

    mark_rgb = final_rgb[ymin_mp:ymax_mp+1, xmin_mp:xmax_mp+1]
    mark_alpha = final_alpha[ymin_mp:ymax_mp+1, xmin_mp:xmax_mp+1]
    mark_uint8 = np.zeros((mark_alpha.shape[0], mark_alpha.shape[1], 4), dtype=np.uint8)
    mark_uint8[:, :, :3] = np.clip(np.round(mark_rgb), 0, 255).astype(np.uint8)
    mark_uint8[:, :, 3] = np.clip(np.round(mark_alpha * 255.0), 0, 255).astype(np.uint8)
    mark_im = Image.fromarray(mark_uint8, "RGBA")

    # Destination directories
    dest_dirs = [
        os.path.abspath("public"),
        os.path.abspath("apps/web/public"),
        os.path.abspath("assets/brand"),
        os.path.abspath("apps/web/src/assets/brand"),
        os.path.abspath("study/assets")
    ]
    for d in dest_dirs:
        os.makedirs(d, exist_ok=True)

    # Function to save across all dest dirs
    def save_all(img_obj, filename):
        for d in dest_dirs:
            target = os.path.join(d, filename)
            img_obj.save(target)
        print(f"  [OK] Saved {filename} ({img_obj.size[0]}x{img_obj.size[1]})")

    print("\nGenerating asset variations:")

    # 1. logo.png (transparent 1x)
    save_all(logo_im, "logo.png")

    # 2. logo@2x.png (transparent 2x via Lanczos)
    logo_2x = logo_im.resize((w_final * 2, h_final * 2), Image.Resampling.LANCZOS)
    save_all(logo_2x, "logo@2x.png")

    # 3. logo-original-backup.png
    for d in dest_dirs:
        shutil.copyfile(SRC_IMG_PATH, os.path.join(d, "logo-original-backup.png"))
    print("  [OK] Saved logo-original-backup.png (original backup)")

    # 4. Helper for square canvas with centered image
    def make_square_centered(src_img, size, inner_padding_ratio=0.08):
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        max_dim = int(size * (1.0 - inner_padding_ratio * 2))
        sw, sh = src_img.size
        scale = min(max_dim / sw, max_dim / sh)
        new_w = int(round(sw * scale))
        new_h = int(round(sh * scale))
        resized = src_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        offset_x = (size - new_w) // 2
        offset_y = (size - new_h) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    # logo-512.png and logo-192.png (full logo on square canvas)
    logo_512 = make_square_centered(logo_im, 512, inner_padding_ratio=0.10)
    save_all(logo_512, "logo-512.png")

    logo_192 = make_square_centered(logo_im, 192, inner_padding_ratio=0.10)
    save_all(logo_192, "logo-192.png")

    # Also make icon-512 and icon-192 (mark emblem on square canvas)
    mark_512 = make_square_centered(mark_im, 512, inner_padding_ratio=0.06)
    save_all(mark_512, "icon-512.png")

    mark_192 = make_square_centered(mark_im, 192, inner_padding_ratio=0.06)
    save_all(mark_192, "icon-192.png")

    # Favicon PNGs (using the high-legibility mark emblem for crisp 32px / 16px)
    fav_48 = make_square_centered(mark_im, 48, inner_padding_ratio=0.04)
    fav_32 = make_square_centered(mark_im, 32, inner_padding_ratio=0.04)
    fav_16 = make_square_centered(mark_im, 16, inner_padding_ratio=0.04)

    save_all(fav_32, "favicon-32.png")
    save_all(fav_16, "favicon-16.png")
    save_all(fav_32, "favicon.png") # Update default favicon.png

    # Also full-logo variants at 32 and 16
    full_fav_32 = make_square_centered(logo_im, 32, inner_padding_ratio=0.02)
    full_fav_16 = make_square_centered(logo_im, 16, inner_padding_ratio=0.02)
    save_all(full_fav_32, "logo-32.png")
    save_all(full_fav_16, "logo-16.png")

    # favicon.ico (multi-resolution 16, 32, 48)
    for d in dest_dirs:
        ico_path = os.path.join(d, "favicon.ico")
        fav_48.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("  [OK] Saved favicon.ico (multi-size: 16x16, 32x32, 48x48)")

    # 5. Composite Verification Over 4 Backgrounds
    print("\nGenerating composite verifications over 4 backgrounds:")
    comp_bg = {
        "white": [255, 255, 255],
        "black": [0, 0, 0],
        "app_dark": [11, 14, 20],      # #0B0E14 Thenar Theme
        "app_accent": [26, 165, 154]   # #1AA59A Thenar Emerald/Teal
    }

    comp_dir = os.path.abspath("study/assets/logo_composites")
    os.makedirs(comp_dir, exist_ok=True)

    arr_logo = np.array(logo_im).astype(np.float64)
    a = arr_logo[:, :, 3:4] / 255.0
    c = arr_logo[:, :, :3]

    for name, bg_val in comp_bg.items():
        bg = np.array(bg_val, dtype=np.float64).reshape((1, 1, 3))
        comp = a * c + (1.0 - a) * bg
        comp_uint8 = np.clip(np.round(comp), 0, 255).astype(np.uint8)
        comp_img = Image.fromarray(comp_uint8, "RGB")
        target_path = os.path.join(comp_dir, f"composite_{name}.png")
        comp_img.save(target_path)
        print(f"  [OK] Saved composite verification: study/assets/logo_composites/composite_{name}.png")

    print("\nAll assets processed, verified, and saved successfully!")

if __name__ == "__main__":
    main()

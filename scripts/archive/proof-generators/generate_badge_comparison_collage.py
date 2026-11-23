"""
scripts/generate_badge_comparison_collage.py
Composes high-impact comparative visual atlas for Tooth 46 Gate 0 status badge sizes (S, M, L, XL, XXL).
"""

import os
from PIL import Image, ImageDraw, ImageFont

SRC_DIR = r"C:\Clinic_MVP\dental-crm\docs\proofs\odontogram\arch32"
BRAIN_DIR = r"C:\Users\Admin\.gemini\antigravity\brain\a6f2b5ab-6bb4-4d96-af8a-9006a477cf49"

def main():
    macro_path = os.path.join(SRC_DIR, "badge_sizes_macro_zoom.png")
    compare_path = os.path.join(SRC_DIR, "badge_size_compare.png")
    l_path = os.path.join(SRC_DIR, "badge_size_l.png")
    xl_path = os.path.join(SRC_DIR, "badge_size_xl.png")

    macro_img = Image.open(macro_path).convert("RGBA")
    comp_img = Image.open(compare_path).convert("RGBA")
    l_img = Image.open(l_path).convert("RGBA")
    xl_img = Image.open(xl_path).convert("RGBA")

    # Target canvas: 1440 width x (height of macro + height of arch)
    # Let's crop macro cleanly
    w = 1440
    # Macro aspect resize to fit top section
    macro_w = 1400
    macro_h = int(macro_img.height * (macro_w / macro_img.width))
    macro_resized = macro_img.resize((macro_w, macro_h), Image.Resampling.LANCZOS)

    # L arch crop/resize to show 32 teeth
    arch_w = 1400
    arch_h = int(l_img.height * (arch_w / l_img.width))
    l_resized = l_img.resize((arch_w, arch_h), Image.Resampling.LANCZOS)

    canvas_h = macro_h + arch_h + 100
    canvas = Image.new("RGBA", (w, canvas_h), (248, 250, 252, 255))
    draw = ImageDraw.Draw(canvas)

    # Title header
    draw.rectangle([(0, 0), (w, 50)], fill=(15, 23, 42, 255))
    draw.text((20, 15), "DENTE CLINIC CRM — GATE 0 ODONTOGRAM: STATUS BADGE SIZE COMPARISON (S, M, L, XL, XXL)", fill=(255, 255, 255, 255))

    # Paste macro zoom
    y_offset = 60
    x_offset = (w - macro_w) // 2
    canvas.paste(macro_resized, (x_offset, y_offset), macro_resized)

    # Subtitle for arch
    y_offset += macro_h + 10
    draw.text((20, y_offset), "32-TOOTH FULL ARCH OVERVIEW (RECOMMENDED SIZE L: 27px / XL: 32px)", fill=(15, 23, 42, 255))

    y_offset += 25
    canvas.paste(l_resized, (x_offset, y_offset), l_resized)

    out_path = os.path.join(SRC_DIR, "badge_sizes_comparison.png")
    canvas.save(out_path, "PNG")
    print(f"Saved {out_path} ({os.path.getsize(out_path)} bytes)")

    brain_out = os.path.join(BRAIN_DIR, "badge_sizes_comparison.png")
    canvas.save(brain_out, "PNG")
    print(f"Copied to brain: {brain_out} ({os.path.getsize(brain_out)} bytes)")

if __name__ == "__main__":
    main()

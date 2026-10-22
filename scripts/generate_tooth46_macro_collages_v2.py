import os
from PIL import Image, ImageDraw, ImageFont, ImageChops

BASE_DIR = r"C:\Clinic_MVP\dental-crm\docs\proofs\odontogram"
OUT_DIR = os.path.join(BASE_DIR, "collages")
os.makedirs(OUT_DIR, exist_ok=True)

def get_font(size, bold=False):
    font_files = ["arialbd.ttf", "segoeuib.ttf"] if bold else ["arial.ttf", "segoeui.ttf"]
    for font_name in font_files:
        p = os.path.join(r"C:\Windows\Fonts", font_name)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

font_title = get_font(26, bold=True)
font_label = get_font(18, bold=False)
font_badge = get_font(22, bold=True)
font_header = get_font(34, bold=True)

def auto_crop_tooth(im):
    """
    Crops away uniform background (white or dark slate) so the tooth is zoomed to max.
    """
    im_rgb = im.convert("RGB")
    bg_color = im_rgb.getpixel((0, 0))
    bg = Image.new("RGB", im.size, bg_color)
    diff = ImageChops.difference(im_rgb, bg)
    bbox = diff.getbbox()
    if bbox:
        # Pad slightly by 4px
        x0 = max(0, bbox[0] - 4)
        y0 = max(0, bbox[1] - 4)
        x1 = min(im.width, bbox[2] + 4)
        y1 = min(im.height, bbox[3] + 4)
        return im.crop((x0, y0, x1, y1)), bg_color
    return im, bg_color

def create_tight_2x2_collage(items, title, out_filename, cell_w=480, cell_h=700, pad=16, header_h=75):
    """
    Tight high-zoom 2x2 collage where the tooth fills 85-90% of the visible cell area.
    """
    canvas_w = cell_w * 2 + pad * 3
    canvas_h = cell_h * 2 + pad * 3 + header_h
    # Dark modern canvas
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (11, 17, 32, 255))
    draw = ImageDraw.Draw(canvas)

    # Title header
    draw.text((pad * 2, 20), title, fill=(241, 245, 249, 255), font=font_header)

    coords = [
        (pad, header_h + pad),                          # 1: Top-Left
        (cell_w + pad * 2, header_h + pad),             # 2: Top-Right
        (pad, header_h + cell_h + pad * 2),             # 3: Bottom-Left
        (cell_w + pad * 2, header_h + cell_h + pad * 2) # 4: Bottom-Right
    ]

    caption_h = 82 # Bottom info bar height

    for idx, (item, (cx, cy)) in enumerate(zip(items, coords), 1):
        # Card outer border
        card_rect = [cx, cy, cx + cell_w, cy + cell_h]
        draw.rounded_rectangle(card_rect, radius=16, fill=(19, 28, 49, 255), outline=(37, 50, 78, 255), width=2)

        img_path = os.path.join(BASE_DIR, item["path"])
        if os.path.exists(img_path):
            with Image.open(img_path) as raw_img:
                raw_img = raw_img.convert("RGBA")
                cropped_img, bg_col = auto_crop_tooth(raw_img)

                # Available area for tooth
                avail_w = cell_w - 24
                avail_h = cell_h - caption_h - 24

                scale = min(avail_w / cropped_img.width, avail_h / cropped_img.height)
                target_w = int(cropped_img.width * scale)
                target_h = int(cropped_img.height * scale)

                resized = cropped_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

                # Inner tooth display area background (subtle soft contrast)
                inner_bg_rect = [cx + 8, cy + 8, cx + cell_w - 8, cy + cell_h - caption_h]
                # If original had dark bg, keep dark; if light, provide crisp light slate pill
                is_dark_source = (sum(bg_col) / 3) < 128
                inner_fill = (15, 23, 42, 255) if is_dark_source else (248, 250, 252, 255)
                draw.rounded_rectangle(inner_bg_rect, radius=12, fill=inner_fill)

                # Center paste
                px = cx + 8 + (avail_w - target_w) // 2 + 4
                py = cy + 8 + (avail_h - target_h) // 2 + 4
                canvas.paste(resized, (px, py), resized)

        # Top-Left Number Badge (floating pill)
        badge_text = f"#{idx}"
        badge_box = [cx + 16, cy + 16, cx + 66, cy + 54]
        draw.rounded_rectangle(badge_box, radius=8, fill=(14, 165, 233, 255)) # Sky blue
        draw.text((cx + 23, cy + 20), badge_text, fill=(255, 255, 255, 255), font=font_badge)

        # Bottom Caption Bar
        cap_y0 = cy + cell_h - caption_h
        cap_rect = [cx + 2, cap_y0, cx + cell_w - 2, cy + cell_h - 2]
        draw.rounded_rectangle(cap_rect, radius=14, fill=(15, 23, 42, 255))
        draw.line([(cx + 2, cap_y0), (cx + cell_w - 2, cap_y0)], fill=(51, 65, 85, 255), width=1)

        # Text inside caption bar
        draw.text((cx + 16, cap_y0 + 10), item["badge"], fill=(56, 189, 248, 255), font=font_title)
        draw.text((cx + 16, cap_y0 + 44), item["label"], fill=(148, 163, 184, 255), font=font_label)

    out_path = os.path.join(OUT_DIR, out_filename)
    canvas.save(out_path, "PNG")
    print(f"[OK] Saved tight collage: {out_path} ({canvas_w}x{canvas_h})")

COLLAGES_V2 = [
    {
        "title": "Зуб 4.6 — Коллаж 1: Анатомия & Кариес & Пломбы (Терапия)",
        "file": "tight_01_therapy_and_caries.png",
        "items": [
            {"path": "gate0_tooth46_macro_cusps.png", "badge": "1. Интактный (Норма Y-5)", "label": "5 анатомических бугров, борозда, CEJ"},
            {"path": "gate0_tooth46_macro_caries.png", "badge": "2. Кариес Class I", "label": "Фиссурная деструкция + ямка caecum"},
            {"path": "gate0_tooth46_macro_composite.png", "badge": "3. Пломба A2/A3 (сост.)", "label": "Анатомический композит жевательной зоны"},
            {"path": "gate0_tooth46_macro_composite_defective.png", "badge": "4. Пломба со сколом", "label": "Разгерметизация шва, вторкариес, скол"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 2: Пульпа & 3 канала (Эндодонтия)",
        "file": "tight_02_endo_system.png",
        "items": [
            {"path": "gate0_tooth46_macro_pulpitis.png", "badge": "1. Острый пульпит", "label": "Гиперемия пульпы, капиллярный стаз"},
            {"path": "gate0_tooth46_macro_roots_canals.png", "badge": "2. Обтурация гуттаперчей", "label": "3D-силер: MB, ML, Distal каналы"},
            {"path": "gate0_tooth46_macro_underfill.png", "badge": "3. Недопломбировка (-3мм)", "label": "Пустой инфицированный апекс корня"},
            {"path": "gate0_tooth46_macro_broken_file.png", "badge": "4. Сломанный NiTi файл", "label": "Обломок в верхушке MB канала"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 3: Осложнения апексов & Периапикалка",
        "file": "tight_03_periapical_pathology.png",
        "items": [
            {"path": "gate0_tooth46_macro_granuloma.png", "badge": "1. Гранулема / Периодонтит", "label": "Некроз пульпы + воспалительные гало"},
            {"path": "gate0_tooth46_macro_cyst.png", "badge": "2. Радикулярная киста", "label": "Деструкция с кортикальным ободком"},
            {"path": "gate0_tooth46_macro_resorption.png", "badge": "3. Апикальная резорбция", "label": "Укорочение верхушек обоих корней"},
            {"path": "gate0_tooth46_macro_overfill.png", "badge": "4. Выведение силера (Puff)", "label": "Материал выдавлен за апекс в периодонт"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 4: Культи & Штифты (Подготовка к коронке)",
        "file": "tight_04_posts_and_cores.png",
        "items": [
            {"path": "gate0_tooth46_macro_post_core_fiber.png", "badge": "1. СВШ Штифт (дистальный)", "label": "Стекловолоконный штифт + культя"},
            {"path": "gate0_tooth46_macro_post_core_cast.png", "badge": "2. КШВ Вкладка (металл)", "label": "Литая разборная культевая вкладка Co-Cr"},
            {"path": "gate0_tooth46_macro_zirconia.png", "badge": "3. Цирконий (состоятельный)", "label": "CAD/CAM многослойный цирконий"},
            {"path": "gate0_tooth46_macro_crown_defective.png", "badge": "4. Скол коронки / Щель", "label": "Скол керамики, истирание, зазор шейки"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 5: Материалы коронок (CAD/CAM палитра)",
        "file": "tight_05_crown_materials.png",
        "items": [
            {"path": "gate0_tooth46_macro_crown_pfm.png", "badge": "1. Металлокерамика PFM", "label": "Керамика + металлическая гирлянда"},
            {"path": "gate0_tooth46_macro_crown_emax.png", "badge": "2. E-Max Стеклокерамика", "label": "Опалесцирующий дисиликат лития"},
            {"path": "gate0_tooth46_macro_crown_gold.png", "badge": "3. Золото 18K", "label": "Полированный благородный сплав"},
            {"path": "gate0_tooth46_macro_crown_pmma.png", "badge": "4. PMMA Пластмасса", "label": "Фрезерованная провизорная коронка"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 6: Дентальная имплантация (Хирургия)",
        "file": "tight_06_implantology.png",
        "items": [
            {"path": "gate0_tooth46_macro_implant_pure.png", "badge": "1. Винт с заглушкой", "label": "Титановый имплант, cover screw, швы"},
            {"path": "gate0_tooth46_macro_implant_healing_abutment.png", "badge": "2. Формирователь десны", "label": "Купол «формика» с шестигранником 1.2мм"},
            {"path": "gate0_tooth46_macro_implant_crown_screw.png", "badge": "3. Коронка с шахтой винта", "label": "Винтовая фиксация, шахта с пломбой"},
            {"path": "gate0_tooth46_macro_missing.png", "badge": "4. Удаленный зуб", "label": "Красный крест + костная лунка после экстракции"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 7: Пороки твердых тканей зуба",
        "file": "tight_07_tissue_defects.png",
        "items": [
            {"path": "gate0_tooth46_macro_abfraction.png", "badge": "1. Клиновидный дефект", "label": "V-образная деструкция эмали у CEJ"},
            {"path": "gate0_tooth46_macro_calculus.png", "badge": "2. Зубной камень", "label": "Минерализованные над/поддесневые бляшки"},
            {"path": "gate0_tooth46_macro_crack.png", "badge": "3. Трещина эмали (Infraction)", "label": "Субмиллиметровая вертикальная трещина"},
            {"path": "gate0_tooth46_macro_crown_metal.png", "badge": "4. Коронка цельнолитая", "label": "Полированный кобальт-хром КХС"}
        ]
    }
]

for cfg in COLLAGES_V2:
    create_tight_2x2_collage(
        items=cfg["items"],
        title=cfg["title"],
        out_filename=cfg["file"],
        cell_w=480,
        cell_h=700
    )

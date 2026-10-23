import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"C:\Clinic_MVP\dental-crm\docs\proofs\odontogram"
OUT_DIR = os.path.join(BASE_DIR, "collages")
os.makedirs(OUT_DIR, exist_ok=True)

def get_font(size):
    try:
        # Windows system fonts
        for font_name in ["arialbd.ttf", "arial.ttf", "segoeui.ttf", "calibri.ttf"]:
            font_path = os.path.join(r"C:\Windows\Fonts", font_name)
            if os.path.exists(font_path):
                return ImageFont.truetype(font_path, size)
    except Exception:
        pass
    return ImageFont.load_default()

font_title = get_font(32)
font_badge = get_font(28)
font_header = get_font(40)

def create_2x2_collage(items, title, out_filename, cell_w=600, cell_h=900, pad=16, header_h=90):
    """
    items: list of 4 dicts: [{"path": str, "badge": str, "label": str}]
    """
    canvas_w = cell_w * 2 + pad * 3
    canvas_h = cell_h * 2 + pad * 3 + header_h
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (15, 23, 42, 255)) # Dark navy background
    draw = ImageDraw.Draw(canvas)

    # Main header
    draw.text((pad * 2, pad + 15), title, fill=(248, 250, 252, 255), font=font_header)

    coords = [
        (pad, header_h + pad),                          # 1: Top-Left
        (cell_w + pad * 2, header_h + pad),             # 2: Top-Right
        (pad, header_h + cell_h + pad * 2),             # 3: Bottom-Left
        (cell_w + pad * 2, header_h + cell_h + pad * 2) # 4: Bottom-Right
    ]

    for idx, (item, (cx, cy)) in enumerate(zip(items, coords), 1):
        # Cell background card
        card_rect = [cx, cy, cx + cell_w, cy + cell_h]
        draw.rounded_rectangle(card_rect, radius=18, fill=(30, 41, 59, 255), outline=(51, 65, 85, 255), width=2)

        img_path = os.path.join(BASE_DIR, item["path"])
        if os.path.exists(img_path):
            with Image.open(img_path) as raw_img:
                raw_img = raw_img.convert("RGBA")
                # Fit inside inner area (leave room for bottom caption bar)
                caption_h = 95
                inner_w = cell_w - 32
                inner_h = cell_h - caption_h - 32

                # Aspect ratio fit
                scale = min(inner_w / raw_img.width, inner_h / raw_img.height)
                new_w = max(1, int(raw_img.width * scale))
                new_h = max(1, int(raw_img.height * scale))
                resized = raw_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

                # Paste centered
                px = cx + 16 + (inner_w - new_w) // 2
                py = cy + 16 + (inner_h - new_h) // 2
                canvas.paste(resized, (px, py), resized)

        # Number Badge (Top-Left of cell)
        badge_text = f"#{idx}"
        badge_box = [cx + 20, cy + 20, cx + 75, cy + 65]
        draw.rounded_rectangle(badge_box, radius=10, fill=(13, 148, 136, 255)) # Teal badge
        draw.text((cx + 28, cy + 24), badge_text, fill=(255, 255, 255, 255), font=font_badge)

        # Bottom Caption Bar
        cap_y0 = cy + cell_h - caption_h
        cap_rect = [cx + 2, cap_y0, cx + cell_w - 2, cy + cell_h - 2]
        draw.rounded_rectangle(cap_rect, radius=16, fill=(15, 23, 42, 230))
        # Top dividing line inside card
        draw.line([(cx + 2, cap_y0), (cx + cell_w - 2, cap_y0)], fill=(71, 85, 105, 255), width=1)

        # Text labels
        draw.text((cx + 20, cap_y0 + 12), item["badge"], fill=(56, 189, 248, 255), font=font_title) # Cyan badge
        draw.text((cx + 20, cap_y0 + 50), item["label"], fill=(203, 213, 225, 255), font=get_font(22))

    out_path = os.path.join(OUT_DIR, out_filename)
    canvas.save(out_path, "PNG")
    print(f"[OK] Saved collage: {out_path} ({canvas_w}x{canvas_h})")

COLLAGES = [
    {
        "title": "Зуб 4.6 — Коллаж 1: Стенд & Адаптив (Gate 0 Stand 4-State)",
        "file": "collage_01_stand_overview.png",
        "cell_w": 800,
        "cell_h": 550,
        "items": [
            {"path": "gate0_tooth46_pc_light.png", "badge": "1. PC Light (1440x900)", "label": "Дневная тема, зум 2х, полный тулбар слоев"},
            {"path": "gate0_tooth46_pc_dark.png", "badge": "2. PC Dark (1440x900)", "label": "Темная тема, контраст WCAG AAA, HUD"},
            {"path": "gate0_tooth46_mobile_light.png", "badge": "3. Mobile Light (390x844)", "label": "Смартфон, горизонтальный скролл чипов"},
            {"path": "gate0_tooth46_mobile_dark.png", "badge": "4. Mobile Dark (390x844)", "label": "Смартфон темная тема, тач-таргеты 44px"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 2: Терапия & Рельеф коронки (Wheeler 2.5D)",
        "file": "collage_02_caries_and_fillings.png",
        "cell_w": 600,
        "cell_h": 900,
        "items": [
            {"path": "gate0_tooth46_macro_cusps.png", "badge": "1. Норма / Интактный", "label": "5 бугров Y-5, sulcus longitudinalis, CEJ"},
            {"path": "gate0_tooth46_macro_caries.png", "badge": "2. Кариес Class I", "label": "Дендритная деструкция фиссуры + ямка caecum"},
            {"path": "gate0_tooth46_macro_composite.png", "badge": "3. Пломба A2/A3 (сост.)", "label": "Анатомический композит с рельефом бугров"},
            {"path": "gate0_tooth46_macro_composite_defective.png", "badge": "4. Пломба дефектная", "label": "Скол реставрации, краевая щель, вторкариес"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 3: Эндодонтия (Пульпа & 3 канала)",
        "file": "collage_03_endodontics_system.png",
        "cell_w": 600,
        "cell_h": 900,
        "items": [
            {"path": "gate0_tooth46_macro_pulpitis.png", "badge": "1. Пульпит очаговый", "label": "Гиперемия пульпы, 5 рогов, сосуды"},
            {"path": "gate0_tooth46_macro_roots_canals.png", "badge": "2. Обтурация гуттаперчей", "label": "3 канала: MB, ML, Distal + апикальный силер"},
            {"path": "gate0_tooth46_macro_underfill.png", "badge": "3. Недопломбировка (-3мм)", "label": "Пустой инфицированный апекс в каналах"},
            {"path": "gate0_tooth46_macro_broken_file.png", "badge": "4. Сломанный NiTi файл", "label": "Обломок инструмента в MB канале с алертом"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 4: Периапикалка & Осложнения корней",
        "file": "collage_04_periapical_pathology.png",
        "cell_w": 600,
        "cell_h": 900,
        "items": [
            {"path": "gate0_tooth46_macro_granuloma.png", "badge": "1. Периодонтит / Гранулема", "label": "Некроз пульпы + воспалительное гало на апексах"},
            {"path": "gate0_tooth46_macro_cyst.png", "badge": "2. Радикулярная киста", "label": "Очаг деструкции с кортикальной каймой"},
            {"path": "gate0_tooth46_macro_resorption.png", "badge": "3. Резорбция корней", "label": "Апикальное укорочение и сглаживание верхушек"},
            {"path": "gate0_tooth46_macro_overfill.png", "badge": "4. Выведение силера (Puff)", "label": "Капли силера выдавлены за апекс в периодонт"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 5: Культевые вкладки & Ортопедия",
        "file": "collage_05_posts_and_crowns.png",
        "cell_w": 600,
        "cell_h": 900,
        "items": [
            {"path": "gate0_tooth46_macro_post_core_fiber.png", "badge": "1. СВШ Штифт (стекловолокно)", "label": "Стекловолоконный штифт в дистальном канале + культя"},
            {"path": "gate0_tooth46_macro_post_core_cast.png", "badge": "2. КШВ Вкладка (металл)", "label": "Литая разборная анатомическая культевая вкладка"},
            {"path": "gate0_tooth46_macro_zirconia.png", "badge": "3. Коронка: Цирконий (сост.)", "label": "Монолитный цирконий с глазурью и скатами"},
            {"path": "gate0_tooth46_macro_crown_defective.png", "badge": "4. Скол коронки / Щель", "label": "Скол керамики, окклюзионная дыра, зазор шейки"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 6: Материалы коронок (CAD/CAM палитра)",
        "file": "collage_06_crown_materials.png",
        "cell_w": 600,
        "cell_h": 900,
        "items": [
            {"path": "gate0_tooth46_macro_crown_pfm.png", "badge": "1. Металлокерамика PFM", "label": "Керамическая облицовка + металлическая гирлянда"},
            {"path": "gate0_tooth46_macro_crown_emax.png", "badge": "2. E-Max Дисиликат лития", "label": "Опалесцирующая высокоэстетичная стеклокерамика"},
            {"path": "gate0_tooth46_macro_crown_gold.png", "badge": "3. Золото 18K", "label": "Полированный благородный сплав с фасетками"},
            {"path": "gate0_tooth46_macro_crown_pmma.png", "badge": "4. PMMA Пластмасса", "label": "Фрезерованная временная коронка на провизорный срок"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 7: Хирургия & Дентальная имплантация",
        "file": "collage_07_implant_surgery.png",
        "cell_w": 600,
        "cell_h": 900,
        "items": [
            {"path": "gate0_tooth46_macro_implant_pure.png", "badge": "1. Имплант (чистый винт)", "label": "Титановый винт, заглушка cover screw, швы десны"},
            {"path": "gate0_tooth46_macro_implant_healing_abutment.png", "badge": "2. Формирователь десны", "label": "Титановый купол («формик») с шестигранником 1.2мм"},
            {"path": "gate0_tooth46_macro_implant_crown_screw.png", "badge": "3. Коронка с винтовой фикс.", "label": "Сквозная шахта винта, Ti-Base + композитная пломба"},
            {"path": "gate0_tooth46_macro_missing.png", "badge": "4. Удаленный зуб", "label": "Клинический красный крест + контур пустой костной лунки"}
        ]
    },
    {
        "title": "Зуб 4.6 — Коллаж 8: Патологии твердых тканей & Металл",
        "file": "collage_08_tissue_pathologies.png",
        "cell_w": 600,
        "cell_h": 900,
        "items": [
            {"path": "gate0_tooth46_macro_abfraction.png", "badge": "1. Клиновидный дефект", "label": "V-образная цервикальная деструкция эмали у шейки CEJ"},
            {"path": "gate0_tooth46_macro_calculus.png", "badge": "2. Зубной камень", "label": "Минерализованные бляшки: над- и поддесневой камень"},
            {"path": "gate0_tooth46_macro_crack.png", "badge": "3. Микротрещина эмали", "label": "Вертикальная трещина (Infraction 0.5px) от фиссуры"},
            {"path": "gate0_tooth46_macro_crown_metal.png", "badge": "4. Цельнолитой металл Co-Cr", "label": "Кобальт-хромовый сплав (КХС) полированный"}
        ]
    }
]

for cfg in COLLAGES:
    create_2x2_collage(
        items=cfg["items"],
        title=cfg["title"],
        out_filename=cfg["file"],
        cell_w=cfg.get("cell_w", 600),
        cell_h=cfg.get("cell_h", 900)
    )

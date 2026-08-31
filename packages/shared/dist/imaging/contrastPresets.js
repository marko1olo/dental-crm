/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RADIOGRAPHY CONTRAST & WINDOW WIDTH / WINDOW LEVEL (WW/WL) PRESETS
 * Bone, Soft Tissue, Enamel/Dentine & Nerve/Sinus HU Presets
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const DICOM_CONTRAST_PRESETS = {
    bone: {
        id: "bone",
        labelRu: "Костная ткань / Кортикал",
        windowWidth: 2000,
        windowCenter: 500,
        descriptionRu: "Оптимальная визуализация кортикальной пластинки, трабекул и ложа имплантата (WW 2000, WL 500)",
        optimalFor: "Дентальная имплантация, кортикальная кость, остеоинтеграция",
    },
    soft_tissue: {
        id: "soft_tissue",
        labelRu: "Мягкие ткани / Периодонт",
        windowWidth: 400,
        windowCenter: 40,
        descriptionRu: "Дифференциация слизистой, периодонтальной щели и десны (WW 400, WL 40)",
        optimalFor: "Периодонтит, десна, мягкотканные инфильтраты",
    },
    enamel: {
        id: "enamel",
        labelRu: "Эмаль и дентин",
        windowWidth: 3000,
        windowCenter: 1000,
        descriptionRu: "Высококонтрастный режим для выявления скрытого кариеса, эмалево-дентинной границы (WW 3000, WL 1000)",
        optimalFor: "Кариес коронок, трещины эмали, границы реставраций",
    },
    nerve_sinus: {
        id: "nerve_sinus",
        labelRu: "Нервный канал и пазухи",
        windowWidth: 1200,
        windowCenter: 200,
        descriptionRu: "Контрастирование нижнеальвеолярного канала и дна верхнечелюстной пазухи (WW 1200, WL 200)",
        optimalFor: "Нижнечелюстной нерв, гайморова пазуха, синус-лифтинг",
    },
    wide_range: {
        id: "wide_range",
        labelRu: "Полный динамический диапазон",
        windowWidth: 4000,
        windowCenter: 1000,
        descriptionRu: "Обзорный режим для визуализации металлоконструкций и плотных аномалий (WW 4000, WL 1000)",
        optimalFor: "Обзорные снимки, титановые имплантаты, металлокерамика",
    },
};
export const DICOM_CONTRAST_PRESET_LIST = Object.values(DICOM_CONTRAST_PRESETS);
/**
 * Converts a Hounsfield Unit (HU) value to an 8-bit grayscale intensity (0..255).
 */
export function huToGrayscale8Bit(hu, windowWidth, windowCenter, invert = false) {
    const ww = Math.max(1, windowWidth);
    const minVal = windowCenter - ww / 2;
    const maxVal = windowCenter + ww / 2;
    let normalized;
    if (hu <= minVal) {
        normalized = 0;
    }
    else if (hu >= maxVal) {
        normalized = 255;
    }
    else {
        normalized = Math.max(0, Math.min(255, ((hu - minVal) / (maxVal - minVal)) * 255));
    }
    let byteVal = Math.round(normalized);
    if (invert) {
        // Air & ambient background voxels (HU <= -600) map to dark graphite #090d16 (byte intensity 10)
        // to eliminate white background blinding on inversion
        if (hu <= -600) {
            return 10;
        }
        byteVal = 255 - byteVal;
    }
    return byteVal;
}
/**
 * Builds a 256-element Look-Up Table (LUT) for rapid shader/canvas contrast mapping.
 */
export function buildContrastLUT(options) {
    const lut = new Uint8Array(256);
    const ww = Math.max(1, options.windowWidth);
    const wl = options.windowCenter;
    const invert = Boolean(options.invert);
    const gamma = Math.max(0.1, Math.min(4.0, options.gamma || 1.0));
    const invGamma = 1.0 / gamma;
    const minVal = wl - ww / 2;
    const maxVal = wl + ww / 2;
    for (let i = 0; i < 256; i++) {
        let normalized;
        if (i <= minVal) {
            normalized = 0;
        }
        else if (i >= maxVal) {
            normalized = 255;
        }
        else {
            normalized = Math.max(0, Math.min(255, ((i - minVal) / (maxVal - minVal)) * 255));
        }
        // Ensure full 0..255 clamp at limits
        if (i === 0 && minVal <= 0)
            normalized = 0;
        if (i === 255 && maxVal >= 255)
            normalized = 255;
        // Gamma curve
        let val = 255 * (normalized / 255) ** invGamma;
        let clamped = Math.round(Math.max(0, Math.min(255, val)));
        if (invert) {
            clamped = 255 - clamped;
        }
        lut[i] = clamped;
    }
    return lut;
}

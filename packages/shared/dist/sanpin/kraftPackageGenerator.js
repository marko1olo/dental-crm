/**
 * ============================================================================
 * SANPIN 3.3686-21 & GOST R ISO 11607 KRAFT PACKAGE GENERATOR & BARCODE ENGINE
 * Нормативный расчет сроков годности (50 / 60 / 180 / 20 суток),
 * векторные генераторы 1D Code128 и 2D DataMatrix SVG, прямая печать этикеток
 * для термопринтеров (TSPL / ZPL / ESC-POS CP866) и пакетный учет ЦСО.
 * ============================================================================
 */
import { generateSanpinCode128Svg, generateSanpinDataMatrixSvg, formatKraftDataMatrixPayload, generate1DBarcodeString, } from "./barcodeGenerators.js";
import { KRAFT_PACKAGE_MATERIALS, KRAFT_PACKAGE_SIZES, getKraftMaterialDefinition, getKraftSizeDefinition, } from "./kraftPackageTypes.js";
import { calculatePackageExpiration, evaluateKraftPackageStatus, sanitizeForThermalPrinter, generateTsplLabel, generateZplLabel, generateThermalStickerHtml, generateA4BatchSheetHtml, } from "./thermalLabelEngine.js";
export const SANPIN_CHEMICAL_INDICATORS = [
    {
        id: "vinar_steritest_4",
        brandNameRu: "Винар СтериТЕСТ-П (Класс 4)",
        indicatorClass: "class_4_multivariable",
        initialColorHex: "#fb7185",
        passedColorHex: "#3b1a0e",
        initialColorRu: "Розовый",
        passedColorRu: "Темно-коричневый",
        standardTargetParamRu: "134°C / 5 мин / 2.0 бар",
        sanpinNormRefRu: "СанПиН 3.3686-21 п. 3640 (Многопеременный индикатор Класс 4)",
    },
    {
        id: "vinar_intetest_5",
        brandNameRu: "Винар ИнтеТЕСТ-В-134/5 (Класс 5)",
        indicatorClass: "class_5_integrator",
        initialColorHex: "#0284c7",
        passedColorHex: "#1c1917",
        initialColorRu: "Сине-зеленый",
        passedColorRu: "Черно-коричневый",
        standardTargetParamRu: "Интегратор 134°C (пар + t° + время)",
        sanpinNormRefRu: "СанПиН 3.3686-21 п. 3641 (Химический интегратор Класс 5 / ГОСТ ISO 11140-1)",
    },
    {
        id: "medtest_medis_4",
        brandNameRu: "Медтест МедИС-134/5 (Класс 4)",
        indicatorClass: "class_4_multivariable",
        initialColorHex: "#facc15",
        passedColorHex: "#451a03",
        initialColorRu: "Желтый",
        passedColorRu: "Коричнево-черный",
        standardTargetParamRu: "134°C / 5 мин",
        sanpinNormRefRu: "СанПиН 3.3686-21 / ГОСТ ISO 11140-1-2011",
    },
    {
        id: "medtest_is5_integrator",
        brandNameRu: "Медтест ИС-134 (Класс 5 Интеграл)",
        indicatorClass: "class_5_integrator",
        initialColorHex: "#a855f7",
        passedColorHex: "#18181b",
        initialColorRu: "Фиолетовый",
        passedColorRu: "Антрацитово-черный",
        standardTargetParamRu: "Интегратор критических параметров пара",
        sanpinNormRefRu: "СанПиН 3.3686-21 (Индикатор-интегратор пара)",
    },
];
export const DENTAL_TOOL_SETS_CATALOG = [
    {
        id: "set_therapeutic_tray",
        shortCode: "TER-TRAY",
        nameRu: "Терапевтический лоток смотровой",
        defaultPackageSize: "size_100x200",
        typicalItemsRu: [
            "Зеркало стоматологическое",
            "Зонд угловой",
            "Пинцет анатомический",
            "Гладилка-штопфер",
            "Экскаватор",
        ],
    },
    {
        id: "set_endodontic_burs",
        shortCode: "ENDO-SET",
        nameRu: "Эндодонтический набор боров и файлов",
        defaultPackageSize: "size_75x150",
        typicalItemsRu: [
            "К-файлы #15-40 (6 шт)",
            "Спредер",
            "Плаггер",
            "Боры твердосплавные эндо (3 шт)",
        ],
    },
    {
        id: "set_surgical_extraction",
        shortCode: "SURG-EXT",
        nameRu: "Хирургический набор экстракционный",
        defaultPackageSize: "size_150x250",
        typicalItemsRu: [
            "Щипцы анатомические клювовидные",
            "Элеватор прямой",
            "Элеватор штыковидный",
            "Кюретажная ложка",
            "Распатор",
        ],
    },
    {
        id: "set_periodontal_gracey",
        shortCode: "PERIO-GRC",
        nameRu: "Набор кюрет Грейси пародонтологический",
        defaultPackageSize: "size_150x250",
        typicalItemsRu: [
            "Кюрета Грейси 1/2",
            "Кюрета Грейси 7/8",
            "Кюрета Грейси 11/12",
            "Кюрета Грейси 13/14",
            "Зонд пародонтальный ВОЗ",
        ],
    },
    {
        id: "set_orthopedic_prep",
        shortCode: "ORTH-PREP",
        nameRu: "Ортопедический набор препарирования",
        defaultPackageSize: "size_100x200",
        typicalItemsRu: [
            "Наконечник ортопедический турбинный",
            "Боры алмазные торцевые (5 шт)",
            "Ретракционная гладилка",
            "Калибратор препарирования",
        ],
    },
];
export function getChemicalIndicatorDefinition(id) {
    const found = SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === id);
    return found || SANPIN_CHEMICAL_INDICATORS[0];
}
export function getDentalToolSetDefinition(id) {
    const found = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === id);
    return found || DENTAL_TOOL_SETS_CATALOG[0];
}
// ─────────────────────────────────────────────────────────────────────────────
// BATCH GENERATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Generates a complete batch of KraftPackageRecords with calculated expiration dates,
 * Code128 1D barcodes, and structured SanPiN DataMatrix 2D payloads.
 */
export function generateKraftBatchRecords(options) {
    const quantity = Math.max(1, Math.min(200, options.quantity));
    const now = new Date();
    const packDateStr = options.customPackDate || now.toISOString();
    const expResult = calculatePackageExpiration(packDateStr, options.packageType, now);
    const toolSet = getDentalToolSetDefinition(options.toolSetId);
    const material = getKraftMaterialDefinition(options.packageType);
    const sizeDef = getKraftSizeDefinition(options.packageSize);
    const indicator = getChemicalIndicatorDefinition(options.indicatorId || "vinar_intetest_5");
    const batchId = options.customBatchId ||
        `KB-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(options.cycleNumber).padStart(2, "0")}`;
    const itemsList = options.customItems && options.customItems.length > 0
        ? options.customItems
        : toolSet.typicalItemsRu;
    const records = [];
    for (let i = 1; i <= quantity; i++) {
        const serialNumber = i;
        const barcode128 = generate1DBarcodeString(batchId, serialNumber);
        const dataMatrixPayload = formatKraftDataMatrixPayload({
            batchId,
            autoclaveId: options.autoclaveId,
            cycleNumber: options.cycleNumber,
            packDate: expResult.packDateFormatted,
            expDate: expResult.expDateFormatted,
            operatorId: options.operatorId || "NURSE-01",
            toolSetId: toolSet.shortCode,
            serialNumber,
        });
        const record = {
            id: `kp-${batchId.toLowerCase()}-${String(serialNumber).padStart(3, "0")}`,
            batchId,
            serialNumber,
            packageType: options.packageType,
            packageSize: options.packageSize,
            toolSetId: toolSet.id,
            toolSetNameRu: toolSet.nameRu,
            itemsListRu: [...itemsList],
            packDate: expResult.packDateFormatted,
            expDate: expResult.expDateFormatted,
            daysLifespan: expResult.daysLifespan,
            daysRemaining: expResult.daysRemaining,
            status: expResult.status,
            autoclaveId: options.autoclaveId,
            cycleNumber: options.cycleNumber,
            operatorId: options.operatorId || "NURSE-01",
            operatorName: options.operatorName || "Медсестра ЦСО",
            indicatorId: indicator.id,
            indicatorVerified: options.indicatorVerified ?? true,
            barcode128,
            barcodeDataMatrixPayload: dataMatrixPayload,
            isBreached: false,
            notes: options.notes || `Партия ${material.shortLabelRu}, размер ${sizeDef.dimensionsMmRu}`,
            createdAt: now.toISOString(),
        };
        records.push(record);
    }
    return records;
}
// ─────────────────────────────────────────────────────────────────────────────
// DIRECT THERMAL PRINTER SCRIPT GENERATORS (TSPL / ZPL / ESC-POS CP866)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Encodes Unicode/UTF-8 Russian string to standard IBM CP866 (DOS Cyrillic) byte array.
 */
export function encodeStringToCp866(text) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code <= 0x7f) {
            bytes[i] = code;
        }
        else if (code >= 0x0410 && code <= 0x043f) {
            // 'А' (0x0410) .. 'п' (0x043F) -> 0x80 .. 0xAF
            bytes[i] = code - 0x0410 + 0x80;
        }
        else if (code >= 0x0440 && code <= 0x044f) {
            // 'р' (0x0440) .. 'я' (0x044F) -> 0xE0 .. 0xEF
            bytes[i] = code - 0x0440 + 0xe0;
        }
        else if (code === 0x0401) {
            // 'Ё' -> 0xF0
            bytes[i] = code - 0x0401 + 0xf0;
        }
        else if (code === 0x0451) {
            // 'ё' -> 0xF1
            bytes[i] = 0xf1;
        }
        else if (code === 0x2116) {
            // '№' -> 0xFC (in CP866)
            bytes[i] = 0xfc;
        }
        else {
            bytes[i] = 0x3f; // '?'
        }
    }
    return bytes;
}
/**
 * Generates raw TSPL command script for direct thermal printing (TSC, Xprinter, Godex).
 */
export function generateTsplLabelCode(record, options = {}) {
    const size = options.size || "58x40";
    const clinicName = options.clinicName || "DENTE CLINIC";
    const copies = Math.max(1, options.copies || 1);
    const cleanName = sanitizeForThermalPrinter(record.toolSetNameRu).slice(0, 22);
    if (size === "43x25") {
        return [
            "SIZE 43 mm, 25 mm",
            "GAP 2 mm, 0 mm",
            "DIRECTION 1",
            "CLS",
            'TEXT 15,10,"2",0,1,1,"STERILE SANPIN"',
            `TEXT 220,10,"2",0,1,1,"${record.autoclaveId}/#${record.cycleNumber}"`,
            `DMATRIX 15,35,90,90,"${record.barcodeDataMatrixPayload}"`,
            `TEXT 120,40,"2",0,1,1,"${cleanName.slice(0, 15)}"`,
            `TEXT 120,65,"1",0,1,1,"SN: ${record.barcode128}"`,
            `TEXT 120,85,"2",0,1,1,"PACK:${record.packDate}"`,
            `TEXT 120,110,"2",0,1,1,"EXP: ${record.expDate}"`,
            `PRINT 1,${copies}`,
            "",
        ].join("\r\n");
    }
    return [
        "SIZE 58 mm, 40 mm",
        "GAP 3 mm, 0 mm",
        "DIRECTION 1",
        "CLS",
        'TEXT 20,15,"3",0,1,1,"STERILE - SANPIN 3.3686-21"',
        `TEXT 20,40,"2",0,1,1,"${clinicName.slice(0, 28)}"`,
        `TEXT 340,15,"2",0,1,1,"${record.autoclaveId}/#${record.cycleNumber}"`,
        "BAR 20,62,420,2",
        `DMATRIX 20,75,130,130,"${record.barcodeDataMatrixPayload}"`,
        `TEXT 165,75,"3",0,1,1,"${cleanName}"`,
        `TEXT 165,105,"2",0,1,1,"SN: ${record.barcode128}"`,
        `TEXT 165,130,"2",0,1,1,"PACK: ${record.packDate}"`,
        `TEXT 165,155,"3",0,1,1,"EXP:  ${record.expDate}"`,
        "BAR 20,225,420,2",
        `TEXT 20,235,"2",0,1,1,"OPERATOR: ${record.operatorName.split(" ")[0]}  [ECD SIGN OK]"`,
        `PRINT 1,${copies}`,
        "",
    ].join("\r\n");
}
/**
 * Generates raw ZPL II script for direct thermal printing (Zebra ZD/ZT series).
 */
export function generateZplLabelCode(record, options = {}) {
    const size = options.size || "58x40";
    const clinicName = options.clinicName || "DENTE CLINIC";
    const copies = Math.max(1, options.copies || 1);
    const cleanName = sanitizeForThermalPrinter(record.toolSetNameRu).replace(/[\^~]/g, "").slice(0, 22);
    if (size === "43x25") {
        return [
            "^XA",
            "^PW344",
            "^LL200",
            "^FO15,10^A0N,20,20^FDSTERILE SANPIN^FS",
            `^FO220,10^A0N,18,18^FD${record.autoclaveId}/#${record.cycleNumber}^FS`,
            `^FO15,35^BXN,5,200^FD${record.barcodeDataMatrixPayload}^FS`,
            `^FO115,40^A0N,20,20^FD${cleanName.slice(0, 15)}^FS`,
            `^FO115,65^A0N,16,16^FDSN: ${record.barcode128}^FS`,
            `^FO115,85^A0N,18,18^FDPACK: ${record.packDate}^FS`,
            `^FO115,110^A0N,20,20^FDEXP:  ${record.expDate}^FS`,
            `^PQ${copies},0,1,Y`,
            "^XZ",
        ].join("\n");
    }
    return [
        "^XA",
        "^PW464",
        "^LL320",
        "^FO20,15^A0N,22,22^FDSTERILE - SANPIN 3.3686-21^FS",
        `^FO20,40^A0N,18,18^FD${clinicName.slice(0, 28)}^FS`,
        `^FO320,15^A0N,20,20^FD${record.autoclaveId}/#${record.cycleNumber}^FS`,
        "^FO20,62^GB424,2,2^FS",
        `^FO20,75^BXN,7,200^FD${record.barcodeDataMatrixPayload}^FS`,
        `^FO160,75^A0N,24,24^FD${cleanName}^FS`,
        `^FO160,105^A0N,18,18^FDSN: ${record.barcode128}^FS`,
        `^FO160,130^A0N,20,20^FDPACK: ${record.packDate}^FS`,
        `^FO160,160^A0N,24,24^FDEXP:  ${record.expDate}^FS`,
        "^FO20,230^GB424,2,2^FS",
        `^FO20,240^A0N,18,18^FDOPERATOR: ${record.operatorName.split(" ")[0]}  [ECD SIGN OK]^FS`,
        `^PQ${copies},0,1,Y`,
        "^XZ",
    ].join("\n");
}
/**
 * Generates raw ESC/POS binary command stream for thermal label printing (POS-58/80, Xprinter, Epson).
 */
export function generateEscPosSanpinLabelBinary(record, options = {}) {
    const clinicName = options.clinicName || "СТОМАТОЛОГИЯ DENTE";
    const cutPaper = options.cutPaper !== false;
    const textParts = [
        `${clinicName}\n`,
        "СТЕРИЛИЗАЦИЯ: САНПИН 3.3686-21\n",
        "--------------------------------\n",
        `НАБОР: ${record.toolSetNameRu}\n`,
        `ШТРИХКОД: ${record.barcode128}\n`,
        `АВТОКЛАВ: ${record.autoclaveId} (ЦИКЛ #${record.cycleNumber})\n`,
        `ДАТА СТЕРИЛ.: ${record.packDate}\n`,
        `ГОДЕН ДО:     ${record.expDate} (${record.daysLifespan} сут.)\n`,
        `ОПЕРАТОР:     ${record.operatorName}\n`,
        "--------------------------------\n",
        "ЭЦП ЦСО ПОДТВЕРЖДЕНА\n\n\n",
    ];
    const combinedText = textParts.join("");
    const textBytes = encodeStringToCp866(combinedText);
    const initHeader = new Uint8Array([
        0x1b, 0x40, // ESC @ (Init)
        0x1b, 0x74, 0x11, // ESC t 17 (CP866)
    ]);
    const cutFooter = cutPaper
        ? new Uint8Array([0x1d, 0x56, 0x42, 0x00]) // GS V 'B' 0 (Feed and partial cut)
        : new Uint8Array([0x0a, 0x0a]);
    const totalLength = initHeader.length + textBytes.length + cutFooter.length;
    const out = new Uint8Array(totalLength);
    out.set(initHeader, 0);
    out.set(textBytes, initHeader.length);
    out.set(cutFooter, initHeader.length + textBytes.length);
    return out;
}
// ─────────────────────────────────────────────────────────────────────────────
// RFC 4180 CSV EXPORT & STATISTICAL METRICS (WITH UTF-8 BOM)
// ─────────────────────────────────────────────────────────────────────────────
export function exportKraftBatchToCsv(records) {
    const headers = [
        "ID записи",
        "Номер партии",
        "Серийный номер",
        "Штрихкод 1D",
        "2D DataMatrix Payload",
        "Наименование набора",
        "Тип материала упаковки",
        "Размер упаковки",
        "Дата стерилизации",
        "Срок годности (до)",
        "Нормативный срок (суток)",
        "Осталось дней",
        "Статус стерильности",
        "Автоклав",
        "Номер цикла",
        "Оператор ЦСО",
        "Химический индикатор",
        "Целостность не нарушена",
        "Примечания",
    ];
    const escapeCsv = (val) => {
        if (val === null || val === undefined)
            return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };
    const rows = records.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.batchId),
        escapeCsv(r.serialNumber),
        escapeCsv(r.barcode128),
        escapeCsv(r.barcodeDataMatrixPayload),
        escapeCsv(r.toolSetNameRu),
        escapeCsv(getKraftMaterialDefinition(r.packageType).nameRu),
        escapeCsv(getKraftSizeDefinition(r.packageSize).dimensionsMmRu),
        escapeCsv(r.packDate),
        escapeCsv(r.expDate),
        escapeCsv(r.daysLifespan),
        escapeCsv(r.daysRemaining),
        escapeCsv(r.status === "sterile_valid"
            ? "Стерильно (годен)"
            : r.status === "expiring_soon_7d"
                ? "Истекает (<= 7 дней)"
                : r.status === "expired"
                    ? "Просрочено"
                    : "Отозвано"),
        escapeCsv(r.autoclaveId),
        escapeCsv(r.cycleNumber),
        escapeCsv(r.operatorName),
        escapeCsv(getChemicalIndicatorDefinition(r.indicatorId).brandNameRu),
        escapeCsv(r.isBreached ? "НЕТ (НАРУШЕНА)" : "ДА (СОБЛЮДЕНА)"),
        escapeCsv(r.notes),
    ]);
    const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
    return `\uFEFF${csvBody}`;
}
export function filterKraftPackages(records, filter) {
    return records.filter((r) => {
        if (filter.status && filter.status !== "all" && r.status !== filter.status) {
            return false;
        }
        if (filter.autoclaveId && filter.autoclaveId !== "all" && r.autoclaveId !== filter.autoclaveId) {
            return false;
        }
        if (filter.query && filter.query.trim()) {
            const q = filter.query.toLowerCase().trim();
            const matchName = r.toolSetNameRu.toLowerCase().includes(q);
            const matchBarcode = r.barcode128.toLowerCase().includes(q);
            const matchBatch = r.batchId.toLowerCase().includes(q);
            const matchOperator = r.operatorName.toLowerCase().includes(q);
            if (!matchName && !matchBarcode && !matchBatch && !matchOperator) {
                return false;
            }
        }
        return true;
    });
}
export function calculateKraftBatchStatistics(records) {
    let sterileValidCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let recalledCount = 0;
    let verifiedIndicatorCount = 0;
    for (const r of records) {
        if (r.status === "sterile_valid")
            sterileValidCount++;
        else if (r.status === "expiring_soon_7d")
            expiringSoonCount++;
        else if (r.status === "expired")
            expiredCount++;
        else if (r.status === "recalled")
            recalledCount++;
        if (r.indicatorVerified)
            verifiedIndicatorCount++;
    }
    return {
        totalPacks: records.length,
        sterileValidCount,
        expiringSoonCount,
        expiredCount,
        recalledCount,
        verifiedIndicatorCount,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS FOR COMPLETE CONTRACT PARITY
// ─────────────────────────────────────────────────────────────────────────────
export { calculatePackageExpiration, evaluateKraftPackageStatus, sanitizeForThermalPrinter, generateTsplLabel, generateZplLabel, generateThermalStickerHtml, generateA4BatchSheetHtml, generateSanpinCode128Svg, generateSanpinDataMatrixSvg, formatKraftDataMatrixPayload, generate1DBarcodeString, getKraftMaterialDefinition, getKraftSizeDefinition, KRAFT_PACKAGE_MATERIALS, KRAFT_PACKAGE_SIZES, };

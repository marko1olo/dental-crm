/**
 * ============================================================================
 * SANPIN 3.3686-21 KRAFT PACKAGE PROTOCOL LINK & INVENTORY AUTOPILOT
 * 1-клик привязка крафт-пакетов к протоколу приёма (Форма № 043/у)
 * по 1D/2D штрихкодам и автоматическое списание расходников по техкартам.
 * ============================================================================
 */
import { formatKopecksRu, multiplyKopecks, parseKopecks, sumKopecks, } from "../utils/money.js";
import { getKraftMaterialDefinition, } from "./kraftPackageTypes.js";
import { getDentalToolSetDefinition, } from "./kraftPackageGenerator.js";
// ─────────────────────────────────────────────────────────────────────────────
// 2. PARSING & VALIDATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Нормализует дату к формату YYYY-MM-DD
 */
function normalizeDateStr(d) {
    if (typeof d === "string") {
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
        if (match)
            return `${match[1]}-${match[2]}-${match[3]}`;
        const parsed = new Date(d);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }
        return d.slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
}
/**
 * Добавляет дни к дате YYYY-MM-DD
 */
function addDays(dateStr, days) {
    const dt = new Date(`${dateStr}T12:00:00.000Z`);
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
}
/**
 * Расчет оставшихся дней между refDate и expDate
 */
function calculateDaysDifference(refDateStr, targetDateStr) {
    const ref = new Date(`${refDateStr}T00:00:00.000Z`).getTime();
    const target = new Date(`${targetDateStr}T00:00:00.000Z`).getTime();
    const diffMs = target - ref;
    return Math.round(diffMs / (24 * 3600 * 1000));
}
/**
 * 1-клик парсер и валидатор 2D DataMatrix и 1D Code128 штрихкодов крафт-пакетов стерилизации.
 * Выполняет строгую проверку срока годности по СанПиН 3.3686-21.
 */
export function parseAndValidateKraftBarcode(rawInput, options = {}) {
    const trimmed = (rawInput || "").trim();
    const refDate = options.referenceDate ? normalizeDateStr(options.referenceDate) : new Date().toISOString().slice(0, 10);
    const defaultOperator = options.defaultOperatorName || "Медсестра ЦСО Смирнова А.В.";
    const defaultAutoclave = options.defaultAutoclaveId || "АК-01 (Melag 23B+)";
    if (!trimmed) {
        return {
            rawInput: "",
            barcodeType: "code128_1d",
            isValid: false,
            isExpired: true,
            isExpiringSoon: false,
            daysRemaining: 0,
            daysLifespan: 50,
            batchId: "UNKNOWN",
            autoclaveId: defaultAutoclave,
            cycleNumber: 1,
            packDateIso: refDate,
            expDateIso: refDate,
            operatorId: "NURSE-01",
            operatorName: defaultOperator,
            toolSetId: "set_therapeutic_tray",
            toolSetNameRu: "Терапевтический лоток",
            packageMaterialId: "paper_self_seal_single",
            packageSizeId: "size_100x200",
            indicatorId: "vinar_intetest_5",
            indicatorClassRu: "Химический интегратор 5 класса (пар 134°C)",
            indicatorPassed: false,
            sanpinClauseRu: "СанПиН 3.3686-21 п. 3632",
            formattedProtocolRecord043: "",
            errorMessage: "Штрихкод крафт-пакета не указан (пустая строка).",
        };
    }
    // 1. Формат 2D DataMatrix (SanPiN Structured): BATCH_ID#SERIAL|AUTOCLAVE_ID|CYC{N}|PACK_DATE|EXP_DATE|OPERATOR_ID|TOOL_SET_ID
    if (trimmed.includes("|")) {
        const parts = trimmed.split("|").map((p) => p.trim());
        const batchWithSerial = parts[0] || "";
        const [batchId, serialStr] = batchWithSerial.split("#");
        const serialNumber = serialStr ? parseInt(serialStr, 10) : undefined;
        const autoclaveId = parts[1] || defaultAutoclave;
        const cycPart = parts[2] || "CYC1";
        const cycleNumber = parseInt(cycPart.replace(/[^0-9]/g, ""), 10) || 1;
        let packDateIso = normalizeDateStr(parts[3] || refDate);
        let expDateIso = normalizeDateStr(parts[4] || addDays(packDateIso, 50));
        const operatorId = parts[5] || "NURSE-01";
        const toolSetCode = parts[6] || "TER-TRAY";
        // Сопоставление с каталогом наборов
        const toolSet = getDentalToolSetDefinition(toolSetCode) || getDentalToolSetDefinition("set_therapeutic_tray");
        const materialId = "paper_self_seal_single";
        const sizeId = toolSet.defaultPackageSize || "size_100x200";
        const materialDef = getKraftMaterialDefinition(materialId);
        const daysRemaining = calculateDaysDifference(refDate, expDateIso);
        const isExpired = daysRemaining < 0;
        const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 7;
        const daysLifespan = calculateDaysDifference(packDateIso, expDateIso) || materialDef.statutoryShelfLifeDays;
        let errorMessage;
        if (isExpired) {
            errorMessage = `Срок годности стерильного крафт-пакета ИСТЁК ${Math.abs(daysRemaining)} дн. назад (годен до ${expDateIso}). Использование просроченного инструментария категорически запрещено СанПиН 3.3686-21 п. 3632!`;
        }
        const formattedRecord = format043SterilizationRecord({
            autoclaveId,
            cycleNumber,
            packDateIso,
            expDateIso,
            barcode: trimmed,
            operatorName: defaultOperator,
            indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ / ГОСТ ISO 11140-1)",
            toolSetNameRu: toolSet.nameRu,
            isExpired,
        });
        return {
            rawInput: trimmed,
            barcodeType: "datamatrix_2d",
            isValid: !isExpired,
            isExpired,
            isExpiringSoon,
            daysRemaining,
            daysLifespan,
            batchId: batchId || "KB-BATCH",
            serialNumber,
            autoclaveId,
            cycleNumber,
            packDateIso,
            expDateIso,
            operatorId,
            operatorName: defaultOperator,
            toolSetId: toolSet.id,
            toolSetNameRu: toolSet.nameRu,
            packageMaterialId: materialId,
            packageSizeId: sizeId,
            indicatorId: "vinar_intetest_5",
            indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ / ГОСТ ISO 11140-1)",
            indicatorPassed: !isExpired,
            sanpinClauseRu: materialDef.sanpinClauseRu,
            formattedProtocolRecord043: formattedRecord,
            errorMessage,
        };
    }
    // 2. Формат 1D Code128 (например KB2608250001 или TRAY-10293)
    const cleanCode = trimmed.toUpperCase();
    let packDateIso = refDate;
    let expDateIso = addDays(refDate, 50);
    let cycleNumber = 1;
    let batchId = cleanCode;
    let toolSetNameRu = "Терапевтический лоток смотровой";
    let toolSetId = "set_therapeutic_tray";
    // Попытка извлечь дату из серийного формата KB{YYMMDD}{NNNN}
    const kbMatch = /^KB(\d{2})(\d{2})(\d{2})(\d{4})$/.exec(cleanCode);
    if (kbMatch) {
        const yy = kbMatch[1];
        const mm = kbMatch[2];
        const dd = kbMatch[3];
        packDateIso = `20${yy}-${mm}-${dd}`;
        expDateIso = addDays(packDateIso, 50);
        cycleNumber = Math.max(1, parseInt(kbMatch[4] || "1", 10) % 10);
    }
    else if (cleanCode.includes("ENDO")) {
        toolSetNameRu = "Эндодонтический набор боров и файлов";
        toolSetId = "set_endodontic_burs";
    }
    else if (cleanCode.includes("SURG")) {
        toolSetNameRu = "Хирургический набор экстракционный";
        toolSetId = "set_surgical_extraction";
    }
    else if (cleanCode.includes("PERIO")) {
        toolSetNameRu = "Набор кюрет Грейси пародонтологический";
        toolSetId = "set_periodontal_gracey";
    }
    else if (cleanCode.includes("ORTH")) {
        toolSetNameRu = "Ортопедический набор препарирования";
        toolSetId = "set_orthopedic_prep";
    }
    const daysRemaining = calculateDaysDifference(refDate, expDateIso);
    const isExpired = daysRemaining < 0;
    const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 7;
    let errorMessage;
    if (isExpired) {
        errorMessage = `Срок годности стерильного крафт-пакета ИСТЁК ${Math.abs(daysRemaining)} дн. назад (годен до ${expDateIso}). Использование запрещено СанПиН 3.3686-21!`;
    }
    const formattedRecord = format043SterilizationRecord({
        autoclaveId: defaultAutoclave,
        cycleNumber,
        packDateIso,
        expDateIso,
        barcode: cleanCode,
        operatorName: defaultOperator,
        indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ-В-134/5)",
        toolSetNameRu,
        isExpired,
    });
    return {
        rawInput: trimmed,
        barcodeType: "code128_1d",
        isValid: !isExpired,
        isExpired,
        isExpiringSoon,
        daysRemaining,
        daysLifespan: 50,
        batchId,
        serialNumber: kbMatch ? parseInt(kbMatch[4] || "1", 10) : undefined,
        autoclaveId: defaultAutoclave,
        cycleNumber,
        packDateIso,
        expDateIso,
        operatorId: "NURSE-01",
        operatorName: defaultOperator,
        toolSetId,
        toolSetNameRu,
        packageMaterialId: "paper_self_seal_single",
        packageSizeId: "size_100x200",
        indicatorId: "vinar_intetest_5",
        indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ-В-134/5)",
        indicatorPassed: !isExpired,
        sanpinClauseRu: "СанПиН 3.3686-21 п. 3632",
        formattedProtocolRecord043: formattedRecord,
        errorMessage,
    };
}
/**
 * Формирует нормативную запись стерилизации для медкарты формы № 043/у
 */
export function format043SterilizationRecord(params) {
    const indicatorText = params.indicatorClassRu || "Химический интегратор 5 класса (пар 134°C, норма)";
    const toolText = params.toolSetNameRu ? ` [${params.toolSetNameRu}]` : "";
    if (params.isExpired) {
        return `[ОШИБКА САНПИН: ПАКЕТ ПРОСРОЧЕН] Стерилизация: Автоклав ${params.autoclaveId} (цикл №${params.cycleNumber} от ${params.packDateIso}), пакет ${params.barcode} ИСТЁК ${params.expDateIso}. Ответственная медсестра: ${params.operatorName}.`;
    }
    return `Стерилизация СанПиН 3.3686-21: Автоклав ${params.autoclaveId} (цикл №${params.cycleNumber} от ${params.packDateIso}), ${indicatorText}, крафт-пакет ${params.barcode}${toolText} годен до ${params.expDateIso}. Ответственная медсестра ЦСО: ${params.operatorName}. Целостность упаковки сохранена.`;
}
export function attachKraftPackageTo043Diary(diaryOrText, parsedKraft) {
    const sterRecord = parsedKraft.formattedProtocolRecord043;
    if (typeof diaryOrText === "string") {
        const curText = diaryOrText.trim();
        if (curText.includes(parsedKraft.rawInput) ||
            (parsedKraft.cycleNumber &&
                curText.includes(`цикл №${parsedKraft.cycleNumber}`) &&
                curText.includes(parsedKraft.autoclaveId))) {
            return diaryOrText;
        }
        return curText ? `${curText}\n\n${sterRecord}` : sterRecord;
    }
    const curMaterials = (diaryOrText.appliedMaterials || "").trim();
    if (curMaterials.includes(parsedKraft.rawInput) ||
        (parsedKraft.cycleNumber &&
            curMaterials.includes(`цикл №${parsedKraft.cycleNumber}`) &&
            curMaterials.includes(parsedKraft.autoclaveId))) {
        return diaryOrText;
    }
    const newMaterials = curMaterials
        ? `${curMaterials}\n\n${sterRecord}`
        : sterRecord;
    return {
        ...diaryOrText,
        appliedMaterials: newMaterials,
    };
}
/**
 * Каталог базовых цен материалов (в копейках)
 */
const DEFAULT_MATERIAL_PRICES = {
    gloves_nitrile_pair: parseKopecks("35.00"), // 35 ₽
    mask_protective_3ply: parseKopecks("15.00"), // 15 ₽
    saliva_ejector: parseKopecks("12.50"), // 12.50 ₽
    bib_napkin: parseKopecks("18.00"), // 18 ₽
    cotton_rolls: parseKopecks("3.50"), // 3.50 ₽
    microbrush: parseKopecks("8.50"), // 8.50 ₽
    suction_cannula: parseKopecks("25.00"), // 25 ₽
    // Анестезия
    anesthetic_articaine_carpule: parseKopecks("220.00"), // 220 ₽
    carpule_needle_30g: parseKopecks("28.00"), // 28 ₽
    // Терапия и пломбирование
    cofferdam_sheet: parseKopecks("115.00"), // 115 ₽
    adhesive_bond_7th: parseKopecks("180.00"), // 180 ₽ за 0.1 мл
    etching_gel_37: parseKopecks("35.00"), // 35 ₽ за 0.2 мл
    composite_filtek_gram: parseKopecks("520.00"), // 520 ₽ за 0.4 г
    polishing_head: parseKopecks("65.00"), // 65 ₽
    section_matrix_wedge: parseKopecks("95.00"), // 95 ₽
    // Эндодонтия
    endo_paper_point: parseKopecks("15.00"), // 15 ₽ за шт.
    endo_gutta_percha_point: parseKopecks("60.00"), // 60 ₽ за шт.
    endo_sealer_ah_plus: parseKopecks("480.00"), // 480 ₽ за дозу 0.1 г
    endo_niti_file: parseKopecks("850.00"), // 850 ₽
    endo_hypochlorite_na_ml: parseKopecks("8.00"), // 8 ₽ за 1 мл
    endo_edta_gel_ml: parseKopecks("240.00"), // 240 ₽ за 1 мл
    // Хирургия
    surg_hemostatic_sponge: parseKopecks("310.00"), // 310 ₽
    surg_suture_ptfe: parseKopecks("340.00"), // 340 ₽
    surg_scalpel_blade_15c: parseKopecks("85.00"), // 85 ₽
    surg_antiseptic_gel: parseKopecks("60.00"), // 60 ₽
    // Гигиена
    hyg_airflow_powder_gram: parseKopecks("18.00"), // 18 ₽ за 1 г
    hyg_prophy_paste_gram: parseKopecks("40.00"), // 40 ₽ за 1 г
    hyg_brush_nylon: parseKopecks("65.00"), // 65 ₽
    hyg_optragate: parseKopecks("210.00"), // 210 ₽
    hyg_fluoride_varnish: parseKopecks("320.00"), // 320 ₽
};
/**
 * Автоматический расчет списания расходных материалов по технологической карте процедуры:
 * - Пломбирование: 1 карпула анестетика, 1 платок коффердама, бонд, полировочная головка, перчатки, маска, слюноотсос;
 * - Эндодонтия: бумажные пины (по числу каналов), гуттаперча, силер, файл;
 * - Удаление зуба: анестетик, гемостатическая губка, шовный материал.
 */
export function calculateProcedureAutoDeduction(request) {
    const items = [];
    const includePpe = request.includePpe !== false;
    const anesthCarpules = Math.max(1, request.anesthesiaCarpules || 1);
    const canalsCount = Math.max(1, Math.min(5, request.rootCanalsCount || 1));
    // 1. Базовые СИЗ (СанПиН 3.3686-21)
    if (includePpe) {
        items.push({
            id: "ppe-gloves",
            name: "Перчатки нитриловые неопудренные (врач + ассистент)",
            category: "ppe",
            unit: "пары",
            quantity: 2,
            unitCostKopecks: DEFAULT_MATERIAL_PRICES.gloves_nitrile_pair,
            totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.gloves_nitrile_pair, 2),
            isMandatory: true,
            descriptionRu: "2 пары на прием по СанПиН 3.3686-21",
        }, {
            id: "ppe-mask",
            name: "Маска медицинская трехслойная защитная",
            category: "ppe",
            unit: "шт.",
            quantity: 2,
            unitCostKopecks: DEFAULT_MATERIAL_PRICES.mask_protective_3ply,
            totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.mask_protective_3ply, 2),
            isMandatory: true,
            descriptionRu: "2 шт. (врач + ассистент)",
        }, {
            id: "ppe-saliva-ejector",
            name: "Слюноотсос одноразовый с гибким наконечником",
            category: "ppe",
            unit: "шт.",
            quantity: 1,
            unitCostKopecks: DEFAULT_MATERIAL_PRICES.saliva_ejector,
            totalCostKopecks: DEFAULT_MATERIAL_PRICES.saliva_ejector,
            isMandatory: true,
            descriptionRu: "Одноразовый аспирационный элемент",
        }, {
            id: "ppe-napkin",
            name: "Салфетка нагрудная двухслойная влагонепроницаемая",
            category: "ppe",
            unit: "шт.",
            quantity: 1,
            unitCostKopecks: DEFAULT_MATERIAL_PRICES.bib_napkin,
            totalCostKopecks: DEFAULT_MATERIAL_PRICES.bib_napkin,
            isMandatory: true,
            descriptionRu: "Индивидуальная защита пациента",
        });
    }
    let procedureTitleRu = "Клиническая процедура";
    let summaryDescriptionRu = "";
    switch (request.procedureKind) {
        // ─────────────────────────────────────────────────────────────────────
        // ПРОЦЕДУРА 1: ПЛОМБИРОВАНИЕ КАРИЕСА / РЕСТАВРАЦИЯ
        // 1 карпула анестетика, 1 платок коффердама, бонд, полировочная головка, перчатки, маска, слюноотсос
        // ─────────────────────────────────────────────────────────────────────
        case "filling_composite": {
            procedureTitleRu = "Пломбирование кариеса светоотверждаемым композитом";
            summaryDescriptionRu = "Списание расходников: анестезия (1 карп.), коффердам, адгезивный бонд, композит, полировка, СИЗ";
            // Анестезия
            items.push({
                id: "anes-cartridge",
                name: "Анестетик артикаиновый 4% с адреналином 1:100000 1.7 мл",
                category: "anesthesia",
                unit: "карп.",
                quantity: anesthCarpules,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.anesthetic_articaine_carpule,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.anesthetic_articaine_carpule, anesthCarpules),
                isMandatory: true,
                descriptionRu: `${anesthCarpules} карпула (1.7 мл) с МДЛП учетом`,
                order804nCode: "A16.07.004",
            }, {
                id: "anes-needle",
                name: "Игла карпульная 30G евростандарт стерильная",
                category: "anesthesia",
                unit: "шт.",
                quantity: anesthCarpules,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.carpule_needle_30g,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.carpule_needle_30g, anesthCarpules),
                isMandatory: true,
                descriptionRu: "Одноразовая карпульная игла",
            });
            // Изоляция и коффердам
            items.push({
                id: "caries-cofferdam",
                name: "Платок коффердама латексный (Dental Dam)",
                category: "composite",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.cofferdam_sheet,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.cofferdam_sheet,
                isMandatory: true,
                descriptionRu: "1 платок абсолютной изоляции рабочего поля",
            });
            // Бонд / адгезив
            items.push({
                id: "caries-bond",
                name: "Адгезивная система светового отверждения (бонд 7-го поколения)",
                category: "composite",
                unit: "мл",
                quantity: 0.1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.adhesive_bond_7th,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.adhesive_bond_7th,
                isMandatory: true,
                descriptionRu: "0.1 мл самопротравливающего адгезива Single Bond Universal",
            });
            // Травильный гель
            items.push({
                id: "caries-etching",
                name: "Гель травильный 37% ортофосфорная кислота",
                category: "composite",
                unit: "мл",
                quantity: 0.2,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.etching_gel_37,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.etching_gel_37,
                isMandatory: true,
                descriptionRu: "0.2 мл для селективного травления эмали",
            });
            // Композит
            items.push({
                id: "caries-composite",
                name: "Наногибридный композит светового отверждения (Filtek / Estelite)",
                category: "composite",
                unit: "г",
                quantity: 0.4,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.composite_filtek_gram,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.composite_filtek_gram,
                isMandatory: true,
                descriptionRu: "0.4 г фотополимерного пломбировочного материала",
                order804nCode: "A16.07.002.001",
            });
            // Полировочная головка / диски
            items.push({
                id: "caries-polishing",
                name: "Полировочная силиконовая головка / диск Enhance / Sof-Lex",
                category: "composite",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.polishing_head,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.polishing_head,
                isMandatory: true,
                descriptionRu: "1 шт. для финишного контурирования и полировки пломбы",
            });
            // Ватные валики и микробраши
            items.push({
                id: "caries-cotton-rolls",
                name: "Ватные валики стоматологические стерильные",
                category: "ppe",
                unit: "шт.",
                quantity: 6,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.cotton_rolls,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.cotton_rolls, 6),
                isMandatory: true,
                descriptionRu: "6 шт. на процедуру",
            }, {
                id: "caries-microbrush",
                name: "Микроаппликаторы стоматологические (браши)",
                category: "ppe",
                unit: "шт.",
                quantity: 2,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.microbrush,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.microbrush, 2),
                isMandatory: true,
                descriptionRu: "2 шт. для внесения травильного геля и бонда",
            });
            break;
        }
        // ─────────────────────────────────────────────────────────────────────
        // ПРОЦЕДУРА 2: ЭНДОДОНТИЯ (ОБРАБОТКА И ОБТУРАЦИЯ КАНАЛОВ)
        // бумажные пины (по числу каналов), гуттаперча, силер, файл
        // ─────────────────────────────────────────────────────────────────────
        case "endodontics": {
            procedureTitleRu = `Эндодонтическое лечение (${canalsCount} каналов)`;
            summaryDescriptionRu = `Списание эндодонтических расходников на ${canalsCount} кан.: пины (${canalsCount * 3} шт.), гуттаперча (${canalsCount} шт.), силер AH Plus, Ni-Ti файлы, ирригация NaOCl/EDTA`;
            // Анестезия
            items.push({
                id: "endo-anes-cartridge",
                name: "Анестетик артикаиновый 4% с адреналином 1:100000 1.7 мл",
                category: "anesthesia",
                unit: "карп.",
                quantity: anesthCarpules,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.anesthetic_articaine_carpule,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.anesthetic_articaine_carpule, anesthCarpules),
                isMandatory: true,
                descriptionRu: `${anesthCarpules} карп. инфильтрационной/проводниковой анестезии`,
                order804nCode: "A16.07.004",
            }, {
                id: "endo-anes-needle",
                name: "Игла карпульная 30G евростандарт",
                category: "anesthesia",
                unit: "шт.",
                quantity: anesthCarpules,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.carpule_needle_30g,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.carpule_needle_30g, anesthCarpules),
                isMandatory: true,
                descriptionRu: "Стерильная карпульная игла",
            });
            // Коффердам (обязателен для эндодонтии)
            items.push({
                id: "endo-cofferdam",
                name: "Платок коффердама повышенной эластичности",
                category: "endo",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.cofferdam_sheet,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.cofferdam_sheet,
                isMandatory: true,
                descriptionRu: "Обязательная асептическая изоляция по стандартам ESE/СтАР",
            });
            // Бумажные пины (абсорбирующие штифты) — ПО ЧИСЛУ КАНАЛОВ (3 шт. на 1 канал)
            const paperPointsQty = canalsCount * 3;
            items.push({
                id: "endo-paper-points",
                name: "Штифты бумажные абсорбирующие стерильные (пины)",
                category: "endo",
                unit: "шт.",
                quantity: paperPointsQty,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.endo_paper_point,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.endo_paper_point, paperPointsQty),
                isMandatory: true,
                descriptionRu: `${paperPointsQty} шт. (${canalsCount} канала × 3 пина на канал для высушивания)`,
            });
            // Гуттаперча — ПО ЧИСЛУ КАНАЛОВ (1-2 штифта на канал)
            const guttaPerchaQty = canalsCount * 1;
            items.push({
                id: "endo-gutta-percha",
                name: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
                category: "endo",
                unit: "шт.",
                quantity: guttaPerchaQty,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.endo_gutta_percha_point,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.endo_gutta_percha_point, guttaPerchaQty),
                isMandatory: true,
                descriptionRu: `${guttaPerchaQty} шт. (по 1 штифту на каждый из ${canalsCount} каналов)`,
                order804nCode: "A16.07.008.001",
            });
            // Силер эпоксидный (AH Plus) — пропорционально каналам
            const sealerCost = Math.round(DEFAULT_MATERIAL_PRICES.endo_sealer_ah_plus * (canalsCount / 1));
            items.push({
                id: "endo-sealer",
                name: "Эпоксидный силер для постоянной 3D-обтурации AH Plus (Dentsply)",
                category: "endo",
                unit: "г",
                quantity: Number((0.1 * canalsCount).toFixed(2)),
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.endo_sealer_ah_plus,
                totalCostKopecks: sealerCost,
                isMandatory: true,
                descriptionRu: `${(0.1 * canalsCount).toFixed(2)} г постоянного корневого герметика`,
            });
            // Машинный Ni-Ti ротационный файл
            const filesQty = canalsCount >= 3 ? 2 : 1;
            items.push({
                id: "endo-niti-files",
                name: "Машинный никель-титановый ротационный файл ProTaper / WaveOne Gold",
                category: "endo",
                unit: "шт.",
                quantity: filesQty,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.endo_niti_file,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.endo_niti_file, filesQty),
                isMandatory: true,
                descriptionRu: `${filesQty} шт. для механической хемомеханической обработки`,
                order804nCode: "A16.07.030.001",
            });
            // Ирригация: Гипохлорит Na 3% и ЭДТА гель
            const hypochloriteMl = canalsCount * 15;
            items.push({
                id: "endo-hypochlorite",
                name: "Раствор натрия гипохлорита 3% для эндодонтической ирригации",
                category: "endo",
                unit: "мл",
                quantity: hypochloriteMl,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.endo_hypochlorite_na_ml,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.endo_hypochlorite_na_ml, hypochloriteMl),
                isMandatory: true,
                descriptionRu: `${hypochloriteMl} мл подогретого раствора с УЗ-активацией`,
            }, {
                id: "endo-edta",
                name: "Гель ЭДТА 17% для хелатирования смазанного слоя (Endo-Prep)",
                category: "endo",
                unit: "мл",
                quantity: Number((0.5 * canalsCount).toFixed(1)),
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.endo_edta_gel_ml,
                totalCostKopecks: Math.round(DEFAULT_MATERIAL_PRICES.endo_edta_gel_ml * (0.5 * canalsCount)),
                isMandatory: true,
                descriptionRu: `${(0.5 * canalsCount).toFixed(1)} мл эндолубриканта`,
            });
            break;
        }
        // ─────────────────────────────────────────────────────────────────────
        // ПРОЦЕДУРА 3: УДАЛЕНИЕ ЗУБА (ХИРУРГИЯ)
        // анестетик, гемостатическая губка, шовный материал
        // ─────────────────────────────────────────────────────────────────────
        case "tooth_extraction": {
            procedureTitleRu = "Хирургическое удаление зуба с ревизией лунки";
            summaryDescriptionRu = "Списание хирургических расходников: анестетик, гемостатическая губка Альвостаз, шовный материал PTFE, микроскальпель, СИЗ";
            // Анестетик
            items.push({
                id: "surg-anes-cartridge",
                name: "Анестетик артикаиновый 4% с адреналином 1:100000 1.7 мл",
                category: "anesthesia",
                unit: "карп.",
                quantity: anesthCarpules,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.anesthetic_articaine_carpule,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.anesthetic_articaine_carpule, anesthCarpules),
                isMandatory: true,
                descriptionRu: `${anesthCarpules} карпула (1.7 мл) инфильтрационной/мандибулярной анестезии`,
                order804nCode: "A16.07.004",
            }, {
                id: "surg-anes-needle",
                name: "Игла карпульная 30G евростандарт стерильная",
                category: "anesthesia",
                unit: "шт.",
                quantity: anesthCarpules,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.carpule_needle_30g,
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.carpule_needle_30g, anesthCarpules),
                isMandatory: true,
                descriptionRu: "Стерильная карпульная игла",
            });
            // Гемостатическая губка
            items.push({
                id: "surg-sponge",
                name: "Гемостатическая коллагеновая губка Альвостаз / Parasorb Cone",
                category: "surgery",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.surg_hemostatic_sponge,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.surg_hemostatic_sponge,
                isMandatory: true,
                descriptionRu: "1 конус коллагеновой губки для стабильного гемостаза в лунке",
                order804nCode: "A16.07.001.001",
            });
            // Шовный материал
            items.push({
                id: "surg-suture",
                name: "Шовный материал монофиламентный PTFE / Пролен 4-0 с атравматической иглой",
                category: "surgery",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.surg_suture_ptfe,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.surg_suture_ptfe,
                isMandatory: true,
                descriptionRu: "1 стерильный шовный комплект для ушивания десневого края",
            });
            // Микрохирургическое лезвие 15C
            items.push({
                id: "surg-blade",
                name: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
                category: "surgery",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.surg_scalpel_blade_15c,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.surg_scalpel_blade_15c,
                isMandatory: true,
                descriptionRu: "1 шт. для синдесмотомии и мобилизации лоскута",
            });
            // Хирургический аспиратор
            items.push({
                id: "surg-aspirator",
                name: "Наконечник для хирургического аспиратора одноразовый стерильный",
                category: "ppe",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.suction_cannula,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.suction_cannula,
                isMandatory: true,
                descriptionRu: "1 шт. для чистого хирургического поля",
            });
            break;
        }
        // ─────────────────────────────────────────────────────────────────────
        // ПРОЦЕДУРА 4: ПРОФЕССИОНАЛЬНАЯ ГИГИЕНА (AIR-FLOW + УЗ)
        // ─────────────────────────────────────────────────────────────────────
        case "hygiene_airflow": {
            procedureTitleRu = "Профессиональная гигиена полости рта (Air-Flow + УЗ)";
            summaryDescriptionRu = "Списание расходников: порошок Air-Flow глицин (25 г), полировочная паста, циркулярная щетка, ретрактор OptraGate, фторлак, СИЗ";
            items.push({
                id: "hyg-powder",
                name: "Порошок Air-Flow глициновый мелкодисперсный EMS Plus / Clinpro",
                category: "hygiene",
                unit: "г",
                quantity: 25,
                unitCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.hyg_airflow_powder_gram, 25),
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.hyg_airflow_powder_gram, 25),
                isMandatory: true,
                descriptionRu: "25 г мягкого глицинового порошка для поддесневой и наддесневой очистки",
                order804nCode: "A16.07.051",
            }, {
                id: "hyg-paste",
                name: "Полировочная паста Cleanic / Detartrine",
                category: "hygiene",
                unit: "г",
                quantity: 3,
                unitCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.hyg_prophy_paste_gram, 3),
                totalCostKopecks: multiplyKopecks(DEFAULT_MATERIAL_PRICES.hyg_prophy_paste_gram, 3),
                isMandatory: true,
                descriptionRu: "3 г абразивной пасты для финишного блеска",
            }, {
                id: "hyg-brush",
                name: "Щетка полировочная циркулярная нейлоновая",
                category: "hygiene",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.hyg_brush_nylon,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.hyg_brush_nylon,
                isMandatory: true,
                descriptionRu: "1 шт. для механической полировки окклюзионных фиссур",
            }, {
                id: "hyg-optragate",
                name: "Ретрактор мягкий губной OptraGate (Ivoclar)",
                category: "hygiene",
                unit: "шт.",
                quantity: 1,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.hyg_optragate,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.hyg_optragate,
                isMandatory: true,
                descriptionRu: "1 шт. для комфортной 3D-ретракции губ и щек",
            }, {
                id: "hyg-varnish",
                name: "Фторлак защитный Clinpro White Varnish с трикальцийфосфатом",
                category: "hygiene",
                unit: "мл",
                quantity: 0.5,
                unitCostKopecks: DEFAULT_MATERIAL_PRICES.hyg_fluoride_varnish,
                totalCostKopecks: DEFAULT_MATERIAL_PRICES.hyg_fluoride_varnish,
                isMandatory: true,
                descriptionRu: "0.5 мл для глубокого фторирования эмали после чистки",
            });
            break;
        }
    }
    // Дополнительные кастомные материалы (если переданы)
    if (request.customAdditions && request.customAdditions.length > 0) {
        for (let i = 0; i < request.customAdditions.length; i++) {
            const custom = request.customAdditions[i];
            const qty = Math.max(0, custom.quantity);
            const totalCost = multiplyKopecks(custom.unitCostKopecks, qty);
            items.push({
                id: `custom-add-${i}-${Date.now()}`,
                name: custom.name,
                category: "other",
                unit: custom.unit || "шт.",
                quantity: qty,
                unitCostKopecks: custom.unitCostKopecks,
                totalCostKopecks: totalCost,
                isMandatory: false,
                descriptionRu: "Дополнительный материал из каталога склада",
            });
        }
    }
    const totalCostKopecks = sumKopecks(items.map((i) => i.totalCostKopecks));
    return {
        procedureKind: request.procedureKind,
        procedureTitleRu,
        toothNumber: request.toothNumber,
        rootCanalsCount: canalsCount,
        items,
        totalItemsCount: items.length,
        totalCostKopecks,
        totalCostFormatted: formatKopecksRu(totalCostKopecks),
        summaryDescriptionRu,
    };
}

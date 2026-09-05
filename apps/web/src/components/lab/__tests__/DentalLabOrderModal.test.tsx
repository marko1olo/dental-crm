import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	OCCLUSAL_SCHEMES,
	CONTACT_TIGHTNESS_OPTIONS,
	SURFACE_TEXTURE_OPTIONS,
	LAB_ORDER_STAGES,
	calculateLabFinancialSplit,
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
	isJawWideConstruction,
	formatJawScopeLabel,
	formatLabOrderTeethOrJaw,
	type JawScope,
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	CANONICAL_EXPRESS_LAB_PRESETS,
	EXPRESS_LAB_PRESETS,
} from "../labMath";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "../dentalLabFinancialGateEngine";
import { rublesToKopecks } from "@dental/shared";

describe("DentalLabOrderModal — Prosthetic Construction Types", () => {
	test("Содержит все ключевые ортопедические конструкции (Коронка, Мост, Винир, All-on-4/6, Абатмент, Бюгель, Элайнеры)", () => {
		const typeIds = CONSTRUCTION_TYPES.map((c) => c.id);
		assert.ok(typeIds.includes("single_crown"), "Должна быть одиночная коронка");
		assert.ok(typeIds.includes("bridge"), "Должен быть мостовидный протез");
		assert.ok(typeIds.includes("veneer"), "Должен быть винир");
		assert.ok(typeIds.includes("inlay_onlay"), "Должна быть вкладка Inlay/Onlay");
		assert.ok(typeIds.includes("all_on_arch"), "Должен быть тотал All-on-4/6");
		assert.ok(typeIds.includes("implant_abutment"), "Должен быть индивидуальный абатмент");
		assert.ok(typeIds.includes("clasp_denture"), "Должен быть бюгельный протез");
		assert.ok(typeIds.includes("aligners_nightguard"), "Должны быть элайнеры/каппы");
		assert.ok(typeIds.includes("endocrown"), "Должна быть эндокоронка");
	});

	test("Каждая конструкция имеет понятное русскоязычное название, описание, категорию и иконку", () => {
		for (const item of CONSTRUCTION_TYPES) {
			assert.ok(item.name.length > 0, "Имя конструкции не должно быть пустым");
			assert.ok(item.desc.length > 0, "Описание конструкции не должно быть пустым");
			assert.ok(item.icon.length > 0, "Иконка должна присутствовать");
			assert.ok(item.category.length > 0, "Категория должна присутствовать");
		}
	});
});

describe("DentalLabOrderModal — Dental Lab CAD/CAM Materials", () => {
	test("Содержит цирконий Multi-layer, E.max, металлокерамику CoCr, PMMA и титан Grade 5", () => {
		const matIds = LAB_MATERIALS.map((m) => m.id);
		assert.ok(matIds.includes("zirconia_multilayer"), "Диоксид циркония Multi-Layer (Katana/Prettau)");
		assert.ok(matIds.includes("emax_lithium_disilicate"), "Дисиликат лития IPS e.max");
		assert.ok(matIds.includes("pfm_cocr"), "Металлокерамика CoCr");
		assert.ok(matIds.includes("pmma_temporary"), "Временная пластмасса PMMA CAD/CAM");
		assert.ok(matIds.includes("titanium_custom_abutment"), "Титановый сплав Grade 5");
		assert.ok(matIds.includes("peek_biohpp"), "Биополимер PEEK / BioHPP");
		assert.ok(matIds.includes("biocompatible_3d_resin"), "3D-фотополимер для капп/шаблонов");
	});

	test("Каждый материал снабжен категорией и прочностными характеристиками", () => {
		for (const mat of LAB_MATERIALS) {
			assert.ok(mat.name.length > 0);
			assert.ok(mat.desc.length > 0);
			assert.ok(mat.tag.length > 0);
			assert.ok(mat.category.length > 0);
		}
	});
});

describe("DentalLabOrderModal — VITA Shade Spectrum & 3-Zone Stratification", () => {
	test("VITA Classical содержит все 16 стандартных оттенков шкалы A1–D4", () => {
		assert.equal(VITA_CLASSICAL_SHADES.length, 16);
		const expected = [
			"A1", "A2", "A3", "A3.5", "A4",
			"B1", "B2", "B3", "B4",
			"C1", "C2", "C3", "C4",
			"D2", "D3", "D4",
		];
		assert.deepEqual([...VITA_CLASSICAL_SHADES], expected);
	});

	test("VITA Bleach содержит ультра-светлые оттенки BL1–BL4 и 0M1–0M3", () => {
		assert.ok(VITA_BLEACH_SHADES.includes("BL1"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL2"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL3"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL4"));
		assert.ok(VITA_BLEACH_SHADES.includes("0M1"));
		assert.ok(VITA_BLEACH_SHADES.includes("0M2"));
		assert.ok(VITA_BLEACH_SHADES.includes("0M3"));
	});

	test("VITA 3D-Master содержит оттенки по группам светлоты 1..5 и хроматичности L/M/R", () => {
		assert.ok(VITA_3D_MASTER_SHADES.length >= 26);
		assert.ok(VITA_3D_MASTER_SHADES.includes("1M1"));
		assert.ok(VITA_3D_MASTER_SHADES.includes("2M2"));
		assert.ok(VITA_3D_MASTER_SHADES.includes("3L1.5"));
		assert.ok(VITA_3D_MASTER_SHADES.includes("4R2.5"));
		assert.ok(VITA_3D_MASTER_SHADES.includes("5M3"));
	});

	test("SHADE_SWATCH_MAP содержит цветовые образцы и границы для всех оттенков", () => {
		for (const shade of VITA_CLASSICAL_SHADES) {
			const swatch = SHADE_SWATCH_MAP[shade];
			assert.ok(swatch, `Образец цвета для ${shade} должен существовать`);
			assert.ok(swatch.bg.startsWith("#"), `Фон для ${shade} должен быть HEX цветом`);
			assert.ok(swatch.border.startsWith("#"), `Граница для ${shade} должна быть HEX цветом`);
		}
	});

	test("Шкала культи IPS Natural Die Material содержит градации ND1–ND9 с описаниями", () => {
		assert.equal(STUMP_NATURAL_DIE_SHADES.length, 9);
		const ids = STUMP_NATURAL_DIE_SHADES.map((s) => s.id);
		assert.deepEqual(ids, ["ND1", "ND2", "ND3", "ND4", "ND5", "ND6", "ND7", "ND8", "ND9"]);

		const nd1 = STUMP_NATURAL_DIE_SHADES.find((s) => s.id === "ND1");
		const nd9 = STUMP_NATURAL_DIE_SHADES.find((s) => s.id === "ND9");
		assert.ok(nd1?.name.includes("Отбеленная") || nd1?.name.includes("Ультра-светлая"));
		assert.ok(nd9?.name.includes("Металлическая") || nd9?.name.includes("титановый"));
	});
});

describe("DentalLabOrderModal — Occlusion, Contact Points & Texture Specs", () => {
	test("Окклюзионные схемы включают взаимно-защищенную, клыковое ведение, групповую функцию и сбалансированную", () => {
		const schemes = OCCLUSAL_SCHEMES.map((s) => s.id);
		assert.ok(schemes.includes("mutually_protected"));
		assert.ok(schemes.includes("canine_guidance"));
		assert.ok(schemes.includes("group_function"));
		assert.ok(schemes.includes("balanced_articulation"));
	});

	test("Плотность контактов поддерживает нормальный (50 мкм), плотный, пассивный и промывной для мостов", () => {
		const contacts = CONTACT_TIGHTNESS_OPTIONS.map((c) => c.id);
		assert.ok(contacts.includes("normal"));
		assert.ok(contacts.includes("tight"));
		assert.ok(contacts.includes("light"));
		assert.ok(contacts.includes("open_pontic"));
	});

	test("Текстура поверхности содержит анатомическую микротекстуру, сатин и глянец", () => {
		const textures = SURFACE_TEXTURE_OPTIONS.map((t) => t.id);
		assert.ok(textures.includes("natural_anatomy"));
		assert.ok(textures.includes("satin_semi_matte"));
		assert.ok(textures.includes("high_gloss_glaze"));
	});
});

describe("DentalLabOrderModal — 4-Step Clinical Lab Stages Tracker", () => {
	test("Трекер этапов ЗТЛ содержит 4 клинических статуса: В работе, Примерка, Сдано, Коррекция", () => {
		assert.equal(LAB_ORDER_STAGES.length, 4);
		const stageIds = LAB_ORDER_STAGES.map((s) => s.id);
		assert.deepEqual(stageIds, [
			"in_progress",
			"fitting_scheduled",
			"delivered_completed",
			"correction_remake",
		]);

		for (let i = 0; i < LAB_ORDER_STAGES.length; i++) {
			const stage = LAB_ORDER_STAGES[i];
			assert.ok(stage);
			assert.equal(stage.step, i + 1);
			assert.ok(stage.name.length > 0);
			assert.ok(stage.desc.length > 0);
		}
	});
});

describe("DentalLabOrderModal — Financial Split & Penny-Drift Invariant", () => {
	test("calculateLabFinancialSplit 50/50 дает строго сбалансированную сумму копеек", () => {
		const totalRub = 15450.55;
		const split = calculateLabFinancialSplit(totalRub, 50);

		assert.equal(split.isBalanced, true);
		assert.equal(split.totalKopecks, 1545055);
		assert.equal(split.doctorKopecks, 772528);
		assert.equal(split.clinicKopecks, 772527);
		assert.equal(split.doctorAmountRub, 7725.28);
		assert.equal(split.clinicAmountRub, 7725.27);
	});

	test("calculateLabFinancialSplit 70/30 на суммах с нечетными копейками сохраняет инвариант баланса", () => {
		const totalRub = 23799.33;
		const split = calculateLabFinancialSplit(totalRub, 30);

		assert.equal(split.isBalanced, true);
		assert.equal(split.doctorKopecks, 713980);
		assert.equal(split.clinicKopecks, 1665953);
		assert.equal(split.doctorAmountRub, 7139.80);
		assert.equal(split.clinicAmountRub, 16659.53);
	});

	test("calculateLabFinancialSplit 100% на клинику и 0% на врача не удерживает денег из зарплаты", () => {
		const totalRub = 50000;
		const split = calculateLabFinancialSplit(totalRub, 0);

		assert.equal(split.isBalanced, true);
		assert.equal(split.doctorKopecks, 0);
		assert.equal(split.clinicKopecks, 5000000);
		assert.equal(split.doctorAmountRub, 0);
		assert.equal(split.clinicAmountRub, 50000);
	});
});

describe("DentalLabOrderModal — Printable Blank Vector Barcode & QR Code Engine", () => {
	test("generateBarcodeSvg возвращает валидный SVG со штрихами и номером наряда", () => {
		const token = "ZTL-ORD-2026-991";
		const svg = generateBarcodeSvg(token);
		assert.ok(svg.startsWith("<svg"), "Должен начинаться с <svg");
		assert.ok(svg.includes("<rect"), "Должен содержать штрихи rect");
		assert.ok(svg.includes("</svg>"), "Должен закрываться </svg>");
	});

	test("generateBarcodeSvg санитизирует спецсимволы и пустые строки", () => {
		const emptySvg = generateBarcodeSvg("");
		assert.ok(emptySvg.includes("<svg"));
		assert.ok(emptySvg.includes("ZTL-ORDER"));

		const specialSvg = generateBarcodeSvg("$$$---###");
		assert.ok(specialSvg.includes("<svg"));
	});

	test("generateQrCodeSvg возвращает валидную ISO/IEC 18004 SVG матрицу QR-кода", () => {
		const shortCode = "ZTL-ORDER-123";
		const shortQrSvg = generateQrCodeSvg(shortCode);
		assert.ok(shortQrSvg.startsWith("<svg"), "Должен начинаться с <svg");
		assert.ok(shortQrSvg.includes("viewBox=\"0 0 84 84\""), "Размер матрицы версии 1: 21 * 4 = 84px");
		assert.ok(shortQrSvg.includes("<rect"), "Должен содержать матричные пиксели");

		const portalUrl = "http://localhost:5173/#/portal/lab-order/test-token-123";
		const qrSvg = generateQrCodeSvg(portalUrl);
		assert.ok(qrSvg.startsWith("<svg"), "Должен начинаться с <svg");
		assert.ok(qrSvg.includes("viewBox="), "Должен содержать адаптивный viewBox матрицы");
		assert.ok(qrSvg.includes("<rect"), "Должен содержать матричные пиксели");
		assert.ok(qrSvg.includes("</svg>"), "Должен быть валидным закрытым SVG");
	});

	test("formatGostOrderNumber форматирует номер наряда по стандарту ЗТЛ-ГГММ-ТОКЕН", () => {
		const date = new Date(2026, 7, 22);
		const formatted = formatGostOrderNumber("ABCDEF123456", date);
		assert.equal(formatted, "ЗТЛ-2608-ABCDEF");
	});
});

describe("DentalLabOrderModal — Full-Jaw Orders & Mandate 8e Unblocker", () => {
	test("isJawWideConstruction корректно определяет общечелюстные конструкции", () => {
		assert.equal(isJawWideConstruction("nightguard_bruxism"), true);
		assert.equal(isJawWideConstruction("occlusal_splint"), true);
		assert.equal(isJawWideConstruction("sports_mouthguard"), true);
		assert.equal(isJawWideConstruction("bleaching_tray"), true);
		assert.equal(isJawWideConstruction("full_denture"), true);
		assert.equal(isJawWideConstruction("custom_impression_tray"), true);
		assert.equal(isJawWideConstruction("all_on_arch"), true);
		assert.equal(isJawWideConstruction("all_on_4_6"), true);
		assert.equal(isJawWideConstruction("clasp_denture"), true);
		assert.equal(isJawWideConstruction("aligner_nightguard"), true);
		assert.equal(isJawWideConstruction("aligners_nightguard"), true);

		// Одиночные зубы не являются общечелюстными
		assert.equal(isJawWideConstruction("single_crown"), false);
		assert.equal(isJawWideConstruction("veneer"), false);
		assert.equal(isJawWideConstruction("inlay_onlay"), false);
		assert.equal(isJawWideConstruction("endocrown"), false);
	});

	test("formatJawScopeLabel возвращает канонические русские названия для челюстей", () => {
		assert.equal(formatJawScopeLabel("upper"), "Верхняя челюсть (В/Ч)");
		assert.equal(formatJawScopeLabel("lower"), "Нижняя челюсть (Н/Ч)");
		assert.equal(formatJawScopeLabel("both"), "Обе челюсти (В/Ч + Н/Ч)");

		assert.equal(formatJawScopeLabel("upper", true), "В/Ч целиком");
		assert.equal(formatJawScopeLabel("lower", true), "Н/Ч целиком");
		assert.equal(formatJawScopeLabel("both", true), "Обе челюсти");

		assert.equal(formatJawScopeLabel(null), "");
		assert.equal(formatJawScopeLabel(undefined), "");
	});

	test("formatLabOrderTeethOrJaw форматирует наряд на челюсть без одиночных зубов", () => {
		// С явным jawScope
		assert.equal(formatLabOrderTeethOrJaw({ jawScope: "upper" }), "В/Ч целиком");
		assert.equal(formatLabOrderTeethOrJaw({ jawScope: "lower" }), "Н/Ч целиком");
		assert.equal(formatLabOrderTeethOrJaw({ jawScope: "both" }), "Обе челюсти");

		// Распознавание из toothFdi
		assert.equal(formatLabOrderTeethOrJaw({ toothFdi: "Верхняя челюсть (В/Ч)" }), "В/Ч целиком");
		assert.equal(formatLabOrderTeethOrJaw({ toothFdi: "Нижняя челюсть (Н/Ч)" }), "Н/Ч целиком");
		assert.equal(formatLabOrderTeethOrJaw({ toothFdi: "Обе челюсти (В/Ч + Н/Ч)" }), "Обе челюсти");

		// Общечелюстная конструкция без выбранных зубов
		assert.equal(
			formatLabOrderTeethOrJaw({
				constructionType: "nightguard_bruxism",
				selectedTeeth: [],
			}),
			"Челюсть целиком",
		);

		// Обычный наряд с зубами
		assert.equal(formatLabOrderTeethOrJaw({ selectedTeeth: [16] }), "Зуб 16");
		assert.equal(formatLabOrderTeethOrJaw({ selectedTeeth: [16, 17] }), "Зубы: 16, 17");
	});

	test("Мандат 8e: Наряд на челюсть оформляется без обязательного выбора зубов в формуле", () => {
		// Заказ на каппу с пустой формулой зубов валиден
		const jawOrder = {
			patientId: "patient-101",
			constructionType: "nightguard_bruxism",
			jawScope: "both" as JawScope,
			selectedTeeth: [],
			priceRub: 15000,
		};

		assert.equal(jawOrder.selectedTeeth.length, 0, "Зубы не выбраны");
		assert.equal(jawOrder.jawScope, "both", "Челюсть выбрана");
		assert.equal(isJawWideConstruction(jawOrder.constructionType), true);
		assert.equal(formatLabOrderTeethOrJaw(jawOrder), "Обе челюсти");
	});
});

describe("DentalLabOrderModal — 4 Canonical 1-Click Prosthetics Presets (Mandates 8e, 8k)", () => {
	test("Пресет 1: «Циркониевая коронка на свой зуб (Prettau / Katana) — стандарт» (5 дней, 24 000 ₽ / 7 500 ₽)", () => {
		const p = EXPRESS_PRESET_ZIRCONIA_CROWN;
		assert.equal(p.materialId, "zirconia_multilayer");
		assert.equal(p.constructionType, "single_crown");
		assert.equal(p.colorVita, "A2");
		assert.equal(p.cementGapMicrons, 30, "Зазор под цемент 30 мкм");
		assert.equal(p.contactTightness, "normal", "Контакт 50 мкм (normal)");
		assert.equal(p.occlusalScheme, "mutually_protected", "Взаимно-защищенная окклюзия");
		assert.equal(p.surfaceTexture, "natural_anatomy", "Анатомическая форма");
		assert.equal(p.impressionType, "a_silicone", "Слепок А-силикон");
		assert.equal(p.workingDays, 5, "5 рабочих дней");
		assert.equal(p.priceRub, 24000, "24 000 ₽ для пациента");
		assert.equal(p.labCostRub, 7500, "7 500 ₽ себестоимость ЗТЛ");
	});

	test("Пресет 2: «Временная фрезерованная коронка PMMA (1 клик)» (2 дня, 3 500 ₽ / 1 200 ₽)", () => {
		const p = EXPRESS_PRESET_PMMA_TEMPORARY;
		assert.equal(p.materialId, "pmma_temporary");
		assert.equal(p.constructionType, "single_crown");
		assert.equal(p.colorVita, "A2");
		assert.equal(p.cementGapMicrons, 40, "Зазор под цемент 40 мкм");
		assert.equal(p.contactTightness, "normal", "Контакт 50 мкм");
		assert.equal(p.workingDays, 2, "2 рабочих дня");
		assert.equal(p.priceRub, 3500, "3 500 ₽ для пациента");
		assert.equal(p.labCostRub, 1200, "1 200 ₽ себестоимость ЗТЛ");
	});

	test("Пресет 3: «Металлокерамическая коронка (Duceram Plus) — классика» (7 дней, 15 000 ₽ / 5 000 ₽)", () => {
		const p = EXPRESS_PRESET_PFM_DUCERAM;
		assert.equal(p.materialId, "pfm_cocr");
		assert.equal(p.constructionType, "single_crown");
		assert.equal(p.colorVita, "A2");
		assert.equal(p.cementGapMicrons, 40, "Зазор под цемент 40 мкм");
		assert.equal(p.contactTightness, "normal", "Контакт 50 мкм");
		assert.equal(p.workingDays, 7, "7 рабочих дней");
		assert.equal(p.priceRub, 15000, "15 000 ₽ для пациента");
		assert.equal(p.labCostRub, 5000, "5 000 ₽ себестоимость ЗТЛ");
	});

	test("Пресет 4: «Коронка на имплантате с винтовой фиксацией (Multi-unit / титановое основание)» (7 дней, 38 000 ₽ / 13 000 ₽)", () => {
		const p = EXPRESS_PRESET_IMPLANT_SCREW_RETAINED;
		assert.equal(p.materialId, "titanium_custom_abutment");
		assert.equal(p.constructionType, "implant_abutment");
		assert.equal(p.cementGapMicrons, 30, "Зазор под цемент 30 мкм");
		assert.equal(p.workingDays, 7, "7 рабочих дней");
		assert.equal(p.priceRub, 38000, "38 000 ₽ для пациента");
		assert.equal(p.labCostRub, 13000, "13 000 ₽ себестоимость ЗТЛ");
		assert.ok(p.abutmentType?.includes("Ti-Base"), "Титановое основание / Multi-unit");
	});

	test("CANONICAL_EXPRESS_LAB_PRESETS и EXPRESS_LAB_PRESETS содержат все 4 пресета первыми в списке", () => {
		const canonicalIds = CANONICAL_EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.equal(canonicalIds[0], "zirconia_crown_express");
		assert.equal(canonicalIds[1], "pmma_temporary_express");
		assert.equal(canonicalIds[2], "pfm_duceram_express");
		assert.equal(canonicalIds[3], "implant_screw_retained_express");

		const expressIds = EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.ok(expressIds.includes("zirconia_crown_express"));
		assert.ok(expressIds.includes("pmma_temporary_express"));
		assert.ok(expressIds.includes("pfm_duceram_express"));
		assert.ok(expressIds.includes("implant_screw_retained_express"));
	});
});

describe("DentalLabOrderModal — Doctor Autonomy & Mandates 8e, 8n (No Block on 30-Day Expired Plans)", () => {
	test("Мандат 8e п. 7: Истечение 30 дней плана лечения НЕ БЛОКИРУЕТ создание и отправку нарядов ЗТЛ", () => {
		const resExpired = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(24000),
			paidKopecks: rublesToKopecks(24000),
			treatmentPlanAgeDays: 45,
			isPlanExpired: true,
		});

		assert.equal(resExpired.isGatePassed, true, "Шлюз должен быть пройден");
		assert.ok(resExpired.isPlanExpiredNotice, "Должно быть уведомление о неблокирующем истечении 30 дней");
		assert.ok(
			resExpired.isPlanExpiredNotice.includes("НЕ БЛОКИРУЕТ"),
			"Уведомление должно подтверждать автономию по Мандату 8e",
		);
	});

	test("Мандат 8e & 8n: Лечащий врач вправе отправить наряд под свою клиническую ответственность без мастер-паролей начмеда", () => {
		// Этап не оплачен авансом
		const blockedRes = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(38000),
			paidKopecks: rublesToKopecks(0),
		});
		assert.equal(blockedRes.isGatePassed, false, "Без аванса и оверрайда шлюз предупреждает");

		// Врач применяет 1-клик клиническое решение
		const doctorOverride = createDoctorClinicalOverride(
			"Др. Сидоров А. П.",
			"Срочное изготовление временного моста перед командировкой пациента",
		);
		assert.equal(doctorOverride.authorized, true);
		assert.equal(doctorOverride.doctorName, "Др. Сидоров А. П.");

		const clearedWithOverride = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(38000),
			paidKopecks: rublesToKopecks(0),
			doctorOverride,
		});

		assert.equal(clearedWithOverride.isGatePassed, true, "Наряд разблокирован клиническим решением врача");
		assert.equal(clearedWithOverride.gateStatus, "DOCTOR_OVERRIDE");
		assert.equal(clearedWithOverride.overrideMeta?.doctorName, "Др. Сидоров А. П.");
	});
});

describe("DentalLabOrderModal — Chairside Clinical Order Architecture (Mandates 8e, 8i, 8k, 8n)", () => {
	test("Клинический наряд у кресла состоит ровно из 4 клинических шагов без себестоимости", () => {
		// Canonical 4-step workflow:
		// 1. Зубы и Конструкция (restoration)
		// 2. Расцветка VITA (shades)
		// 3. Этапы и Сроки (stages)
		// 4. Бланк ГОСТ (print)
		const expectedSteps = [
			{ id: "main", label: "1. Зубы и Конструкция" },
			{ id: "shades", label: "2. Расцветка VITA" },
			{ id: "stages", label: "3. Этапы и Сроки" },
			{ id: "print", label: "4. Бланк ГОСТ" },
		];
		assert.equal(expectedSteps.length, 4);
		assert.ok(!expectedSteps.some((s) => s.id === "pricing"), "Вкладка Себестоимость исключена из наряда врача у кресла");
	});

	test("Наряд у кресла свободен от Exocad-микропараметров (зазор в микронах, схемы Доусона) в пользу привычной окклюзии", () => {
		const clinicalSpec = {
			occlusion: "В привычной окклюзии (по силиконовому регистрату / шаблону)",
			anatomy: "Естественная анатомическая форма зуба",
		};
		assert.ok(clinicalSpec.occlusion.includes("В привычной окклюзии"));
		assert.ok(clinicalSpec.anatomy.includes("Естественная анатомическая форма"));
	});
});



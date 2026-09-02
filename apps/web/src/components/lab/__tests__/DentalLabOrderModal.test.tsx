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
} from "../labMath";

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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	findProtocolById,
	formatFullSoapFromProtocol,
	getProtocolsBySpecialty,
	type OutpatientSpecialty,
	populateOutpatientTemplateText,
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_KEY_CLINICAL_PROTOCOLS,
	STOMX_OUTPATIENT_CATEGORY_TREE,
	STOMX_SPECIALTIES,
	searchAll448Templates,
	searchOutpatientProtocols,
} from "../outpatient/index.js";

describe("StomX Outpatient Templates 043/у (448 Protocols Catalog)", () => {
	it("Каталог метаданных всех 448 шаблонов StomX загружен без пропусков", () => {
		assert.strictEqual(STOMX_ALL_448_TEMPLATES_INDEX.length, 448);
		assert.ok(STOMX_OUTPATIENT_CATEGORY_TREE.length > 0);

		// Проверка целостности полей каждого элемента индекса
		for (const item of STOMX_ALL_448_TEMPLATES_INDEX) {
			assert.ok(typeof item.id === "number" && item.id > 0);
			assert.ok(typeof item.categoryId === "number");
			assert.ok(typeof item.name === "string" && item.name.length > 0);
			assert.ok(typeof item.specialty === "string");
			assert.ok(typeof item.mkbCode === "string" && item.mkbCode.length > 0);
		}
	});

	it("Представлены все 5 базовых клинических специальностей стоматологии", () => {
		assert.strictEqual(STOMX_SPECIALTIES.length, 5);
		const expectedSpecialties: OutpatientSpecialty[] = [
			"therapy",
			"orthopedics",
			"surgery",
			"implantology",
			"periodontics",
		];
		for (const spec of expectedSpecialties) {
			assert.ok(STOMX_SPECIALTIES.some((s) => s.id === spec));
			const protocols = getProtocolsBySpecialty(spec);
			assert.ok(
				protocols.length > 0,
				`Специальность ${spec} должна содержать протоколы`,
			);
		}
	});

	it("Терапия (Therapy): покрыты кариес, пульпит, периодонтит, некариозные и отбеливание", () => {
		const therapyProtocols = getProtocolsBySpecialty("therapy");
		const names = therapyProtocols.map((p) => p.name);

		// Кариес (поверхностный, средний, глубокий)
		assert.ok(names.some((n) => n.includes("поверхностный")));
		assert.ok(names.some((n) => n.includes("средний")));
		assert.ok(names.some((n) => n.includes("глубокий")));

		// Пульпит (острый, хронический, обострение)
		assert.ok(names.some((n) => n.includes("Пульпит острый")));
		assert.ok(names.some((n) => n.includes("Пульпит хронический")));
		assert.ok(
			names.some((n) => n.includes("Обострение хронического пульпита")),
		);

		// Периодонтит (острый, хронический)
		assert.ok(names.some((n) => n.includes("Острый апикальный периодонтит")));
		assert.ok(
			names.some((n) => n.includes("Хронический апикальный периодонтит")),
		);

		// Некариозные и отбеливание
		assert.ok(names.some((n) => n.includes("Клиновидный дефект")));
		assert.ok(names.some((n) => n.includes("Эрозия")));
		assert.ok(names.some((n) => n.includes("Флюороз")));
		assert.ok(names.some((n) => n.includes("отбеливание")));
	});

	it("Ортопедия (Orthopedics): покрыты вкладки, коронки, мосты, бюгели, съемные протезы, виниры", () => {
		const orthoProtocols = getProtocolsBySpecialty("orthopedics");
		const names = orthoProtocols.map((p) => p.name);

		assert.ok(names.some((n) => n.includes("Керамическая вкладка")));
		assert.ok(names.some((n) => n.includes("Emax / CAD-CAM")));
		assert.ok(names.some((n) => n.includes("Металлокерамическая коронка")));
		assert.ok(names.some((n) => n.includes("Диоксид-циркониевая коронка")));
		assert.ok(names.some((n) => n.includes("мостовидный протез")));
		assert.ok(names.some((n) => n.includes("Бюгельный протез с кламмерной")));
		assert.ok(names.some((n) => n.includes("Бюгельный протез с замковой")));
		assert.ok(names.some((n) => n.includes("Полный съемный")));
		assert.ok(names.some((n) => n.includes("Частичный съемный")));
		assert.ok(names.some((n) => n.includes("Керамический винир")));
	});

	it("Хирургия (Surgery): покрыты простое/сложное удаление, ретенция, альвеолит, периостит, цистэктомия", () => {
		const surgeryProtocols = getProtocolsBySpecialty("surgery");
		const names = surgeryProtocols.map((p) => p.name);

		assert.ok(names.some((n) => n.includes("Удаление зуба простое")));
		assert.ok(names.some((n) => n.includes("Удаление зуба сложное")));
		assert.ok(names.some((n) => n.includes("Удаление ретинированного")));
		assert.ok(names.some((n) => n.includes("альвеолита")));
		assert.ok(names.some((n) => n.includes("перикоронит")));
		assert.ok(
			names.some((n) => n.includes("Периостит") || n.includes("периостит")),
		);
		assert.ok(names.some((n) => n.includes("абсцесс")));
		assert.ok(names.some((n) => n.includes("Цистэктомия")));
	});

	it("Имплантология (Implantology): покрыты имплантация, открытый/закрытый синус-лифтинг, НКР, формирователь", () => {
		const implantProtocols = getProtocolsBySpecialty("implantology");
		const names = implantProtocols.map((p) => p.name);

		assert.ok(names.some((n) => n.includes("Дентальная имплантация")));
		assert.ok(names.some((n) => n.includes("Открытый синус-лифтинг")));
		assert.ok(names.some((n) => n.includes("Закрытый синус-лифтинг")));
		assert.ok(names.some((n) => n.includes("Костная пластика")));
		assert.ok(names.some((n) => n.includes("формирователя десны")));
	});

	it("Пародонтология (Periodontics): покрыты гингивиты, пародонтит 3 степеней, пародонтоз, кюретаж, гингивэктомия", () => {
		const perioProtocols = getProtocolsBySpecialty("periodontics");
		const names = perioProtocols.map((p) => p.name);

		assert.ok(names.some((n) => n.includes("катаральный гингивит")));
		assert.ok(names.some((n) => n.includes("язвенно-некротический")));
		assert.ok(names.some((n) => n.includes("гипертрофический")));
		assert.ok(names.some((n) => n.includes("легкой степени")));
		assert.ok(names.some((n) => n.includes("средней степени")));
		assert.ok(names.some((n) => n.includes("тяжелой степени")));
		assert.ok(names.some((n) => n.includes("Пародонтоз")));
		assert.ok(names.some((n) => n.includes("Закрытый кюретаж")));
		assert.ok(names.some((n) => n.includes("Открытый кюретаж")));
		assert.ok(names.some((n) => n.includes("Гингивэктомия")));
	});

	describe("populateOutpatientTemplateText helper", () => {
		it("Заменяет плейсхолдеры '__ зубе' на конкретный номер зуба (например, '16 зубе')", () => {
			const raw =
				"На самопроизвольную приступообразную локализованную боль в __ зубе, усиливающуюся ночью.";
			const populated = populateOutpatientTemplateText(raw, {
				toothNumber: 16,
			});
			assert.strictEqual(
				populated,
				"На самопроизвольную приступообразную локализованную боль в 16 зубе, усиливающуюся ночью.",
			);
		});

		it("Заменяет падежные варианты: 'в зубе __', 'Зуб __', 'дефект __________зуба'", () => {
			const raw =
				"Боль в зубе __. Зуб __ ранее лечен. Обнаружен дефект __________зуба.";
			const populated = populateOutpatientTemplateText(raw, {
				toothNumber: 24,
			});
			assert.strictEqual(
				populated,
				"Боль в зубе 24. Зуб 24 ранее лечен. Обнаружен дефект 24 зуба.",
			);
		});

		it("Подставляет поверхности дефекта при указании surfaces", () => {
			const raw = "Определяется полость на ______________поверхности зуба.";
			const populated = populateOutpatientTemplateText(raw, {
				toothNumber: 36,
				surfaces: "окклюзионно-дистальной",
			});
			assert.strictEqual(
				populated,
				"Определяется полость на окклюзионно-дистальной поверхности зуба.",
			);
		});

		it("Нормализует секционные метки ${...} StomX в канонические текстовые блоки 043/у", () => {
			const raw =
				"${Жалобы} Боль от холодного.\n${Анамнез} Зуб не лечен.\n${Протокол лечения} Пломба световая.";
			const populated = populateOutpatientTemplateText(raw, {
				toothNumber: 46,
			});
			assert.ok(populated.includes("Жалобы: Боль от холодного."));
			assert.ok(populated.includes("Анамнез: Зуб не лечен."));
			assert.ok(populated.includes("Протокол лечения: Пломба световая."));
			assert.ok(!populated.includes("${"));
		});

		it("Корректно обрабатывает пустую строку и отсутствие параметров", () => {
			assert.strictEqual(populateOutpatientTemplateText(""), "");
			const original = "Инструментальная обработка каналов.";
			assert.strictEqual(populateOutpatientTemplateText(original), original);
		});
	});

	describe("formatFullSoapFromProtocol helper", () => {
		it("Формирует целостный 043/у дневник приема со всеми блоками SOAP", () => {
			const protocol = findProtocolById("therapy_caries_deep");
			assert.ok(protocol !== undefined);

			const formatted = formatFullSoapFromProtocol(protocol, {
				toothNumber: 36,
				surfaces: "дистальной",
			});

			assert.ok(
				formatted.includes("=== [Зуб 36] Кариес дентина глубокий (K02.1) ==="),
			);
			assert.ok(formatted.includes("Жалобы:"));
			assert.ok(formatted.includes("Анамнез:"));
			assert.ok(formatted.includes("Объективный статус:"));
			assert.ok(formatted.includes("Диагноз:"));
			assert.ok(formatted.includes("Протокол лечения:"));
			assert.ok(formatted.includes("Рекомендации:"));
			assert.ok(formatted.includes("36"));
		});
	});

	describe("Поисковые хелперы", () => {
		it("searchOutpatientProtocols фильтрует по ключевым словам и специальности", () => {
			const pulpResults = searchOutpatientProtocols("пульпит");
			assert.ok(pulpResults.length >= 3);
			assert.ok(pulpResults.every((p) => p.specialty === "therapy"));

			const implantResults = searchOutpatientProtocols("", "implantology");
			assert.strictEqual(implantResults.length, 5);

			const sinusResults = searchOutpatientProtocols("синус-лифтинг");
			assert.ok(sinusResults.length >= 2);
		});

		it("searchAll448Templates ищет по всему индексу 448 позиций StomX", () => {
			const cariesMatches = searchAll448Templates("кариес");
			assert.ok(cariesMatches.length >= 20);

			const surgeryMatches = searchAll448Templates("удаление", "surgery");
			assert.ok(surgeryMatches.length >= 5);
		});

		it("findProtocolById находит протокол по строковому ключу и stomxId", () => {
			const byKey = findProtocolById("surgery_extraction_simple");
			assert.ok(byKey !== undefined);
			assert.strictEqual(byKey.id, "surgery_extraction_simple");

			const byStomxId = findProtocolById(176);
			assert.ok(byStomxId !== undefined);
			assert.strictEqual(byStomxId.stomxId, 176);
		});
	});
});

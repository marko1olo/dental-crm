import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	formatOrthopedicProtocolStatement,
	createDoctorClinicalOverride,
	applyOrthopedicProtocolToVisit,
	VITA_BLEACH_SHADES,
	VITA_CLASSICAL_SHADES,
	VITA_SHADE_GROUPS,
	ALL_VITA_AND_BLEACH_SHADES,
	type OrthopedicProtocolPreset,
} from "../orthopedicProtocols.js";

describe("Orthopedic Protocols & Dental Lab Chairside Engine (Mandate 8e, 8i, 8k, 8n)", () => {
	test("Содержит 5 канонических ортопедических протоколов включая физиологическую норму СтАР", () => {
		assert.equal(ORTHOPEDIC_CANONICAL_PROTOCOLS.length, 5);

		const ids = ORTHOPEDIC_CANONICAL_PROTOCOLS.map((p) => p.id);
		assert.ok(ids.includes("ortho_prep_zirconia_emax"));
		assert.ok(ids.includes("ortho_try_in_framework_crown"));
		assert.ok(ids.includes("ortho_permanent_cementation"));
		assert.ok(ids.includes("ortho_removable_prosthetics"));
		assert.ok(ids.includes("ortho_norm_occlusion"));
	});

	test("Каждый протокол привязан к Этапу 3 плана лечения (stage_3_orthopedics) и Приказу 804н", () => {
		for (const proto of ORTHOPEDIC_CANONICAL_PROTOCOLS) {
			assert.ok(proto.order804nServices.length > 0, `${proto.id} должен содержать услуги 804н`);
			for (const s of proto.order804nServices) {
				assert.equal(
					s.stageKind,
					"stage_3_orthopedics",
					`Услуга ${s.code} в протоколе ${proto.id} должна принадлежать stage_3_orthopedics`,
				);
				assert.match(s.code, /^[A-Z]\d{2}\.\d{2}\.\d{3}/, `Код ${s.code} должен соответствовать формату 804н`);
			}
		}
	});

	test("Протоколы содержат валидные коды МКБ-10 и полные клинические разделы Формы 043/у", () => {
		for (const proto of ORTHOPEDIC_CANONICAL_PROTOCOLS) {
			assert.ok(proto.defaultIcd10.length >= 4, `Код МКБ-10 в ${proto.id} некорректен`);
			assert.ok(proto.anamnesis.trim().length > 20, `Анамнез в ${proto.id} не может быть пустым`);
			assert.ok(proto.objective.trim().length > 20, `Объективный статус в ${proto.id} не может быть пустым`);
			assert.ok(proto.treatment.trim().length > 30, `Лечение в ${proto.id} не может быть пустым`);
			assert.ok(proto.recommendations.trim().length > 10, `Рекомендации в ${proto.id} не могут быть пустыми`);
		}
	});

	test("formatOrthopedicProtocolStatement корректно добавляет зубы, челюсть, материал и цвет", () => {
		const prepProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find((p) => p.id === "ortho_prep_zirconia_emax")!;
		const formatted = formatOrthopedicProtocolStatement(prepProto, {
			teethFdi: [16, 26],
			jawScope: "upper",
			material: "ZrO2 Multi-Layer",
			colorVita: "A2",
		});

		assert.ok(formatted.objective.includes("[Зуб(ы): 16, 26 · Область: Верхняя челюсть · Материал: ZrO2 Multi-Layer · Цвет: A2]"));
		assert.ok(formatted.treatment.includes("[Зуб(ы): 16, 26 · Область: Верхняя челюсть · Материал: ZrO2 Multi-Layer · Цвет: A2]"));
		assert.ok(formatted.summaryLine.includes("Зуб 16, 26"));
	});

	test("createDoctorClinicalOverride создает валидный объект автономии врача (Мандат 8e п. 7)", () => {
		const override = createDoctorClinicalOverride({
			reason: "Аванс 30%, срочное изготовление каркаса",
			doctorName: "Д-р Иванов А.С.",
		});

		assert.equal(override.doctorClinicalOverride, true);
		assert.equal(override.mandate8e, true);
		assert.equal(override.doctorName, "Д-р Иванов А.С.");
		assert.ok(override.doctorOverrideReason.includes("Аванс 30%"));
		assert.ok(override.timestampIso.length > 10);
		assert.ok(override.notice.includes("Мандат 8e"));
	});

	test("applyOrthopedicProtocolToVisit генерирует CustomEvents для Формы 043/у, формулы, сметы и счёта (dente-add-services-to-invoice)", () => {
		const cementProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find((p) => p.id === "ortho_permanent_cementation")!;
		const eventsDispatched: Array<{ type: string; detail: unknown }> = [];
		let callbackServices: unknown = null;

		const originalWindow = globalThis.window;
		try {
			// Mock window.dispatchEvent
			(globalThis as unknown as { window: unknown }).window = {
				dispatchEvent: (event: { type: string; detail: unknown }) => {
					eventsDispatched.push({ type: event.type, detail: event.detail });
					return true;
				},
			};

			const result = applyOrthopedicProtocolToVisit({
				protocol: cementProto,
				options: {
					toothFdi: 21,
					material: "IPS e.max Press",
					colorVita: "A1",
				},
				showNotification: false,
				copyToClipboard: false,
				onAddToInvoice: (services) => {
					callbackServices = services;
				},
			});

			assert.deepEqual(result.teethNumbers, [21]);
			assert.equal(result.services.length, 2);
			assert.ok(eventsDispatched.some((e) => e.type === "dente-apply-soap-protocol"));
			assert.ok(eventsDispatched.some((e) => e.type === "dente-odontogram-update"));
			assert.ok(eventsDispatched.some((e) => e.type === "dente-estimate-stage-add"));
			assert.ok(
				eventsDispatched.some((e) => e.type === "dente-add-services-to-invoice"),
				"Событие dente-add-services-to-invoice должно быть отправлено для немедленной оплаты у кресла",
			);

			const estimateEvent = eventsDispatched.find((e) => e.type === "dente-estimate-stage-add");
			assert.equal((estimateEvent?.detail as { stageKind: string }).stageKind, "stage_3_orthopedics");

			// Проверка структуры dente-add-services-to-invoice
			const invoiceEvent = eventsDispatched.find((e) => e.type === "dente-add-services-to-invoice")!;
			const invoiceDetail = invoiceEvent.detail as {
				toothNumber: number;
				teethNumbers: number[];
				services: Array<{
					code: string;
					nameRu: string;
					name: string;
					priceRub: number;
					suggestedPriceRub: number;
					toothNumber: number;
					stageKind: string;
				}>;
			};
			assert.equal(invoiceDetail.toothNumber, 21);
			assert.deepEqual(invoiceDetail.teethNumbers, [21]);
			assert.ok(invoiceDetail.services.length >= 2);

			for (const s of invoiceDetail.services) {
				assert.ok(s.code, "Услуга должна содержать code");
				assert.ok(s.nameRu, "Услуга должна содержать nameRu");
				assert.ok(s.name, "Услуга должна содержать name");
				assert.equal(typeof s.priceRub, "number", "priceRub должен быть числом");
				assert.ok(s.priceRub > 0, "priceRub должен быть > 0");
				assert.equal(s.toothNumber, 21, "toothNumber должен совпадать с зубом");
				assert.equal(s.stageKind, "stage_3_orthopedics");
			}

			// Проверка прямого вызова коллбека onAddToInvoice
			assert.ok(Array.isArray(callbackServices), "onAddToInvoice должен быть вызван с массивом услуг");
			assert.equal((callbackServices as Array<unknown>).length, 2);
		} finally {
			(globalThis as unknown as { window: unknown }).window = originalWindow;
		}
	});

	test("Все ортопедические протоколы содержат канонические коды Приказа 804н", () => {
		const prepProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find((p) => p.id === "ortho_prep_zirconia_emax")!;
		const tryInProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find((p) => p.id === "ortho_try_in_framework_crown")!;
		const cementProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find((p) => p.id === "ortho_permanent_cementation")!;
		const removableProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find((p) => p.id === "ortho_removable_prosthetics")!;

		// Препарирование и временная коронка (A16.07.004, A16.07.004.001) + слепок/сканирование + окклюзия
		const prepCodes = prepProto.order804nServices.map((s) => s.code);
		assert.ok(prepCodes.includes("A16.07.004"), "Препарирование A16.07.004 обязательно");
		assert.ok(prepCodes.includes("A16.07.004.001"), "Временная коронка A16.07.004.001 обязательна");
		assert.ok(prepCodes.includes("A02.07.010"), "Регистрация окклюзии A02.07.010 обязательна");

		// Примерка конструкции (A16.07.025)
		const tryInCodes = tryInProto.order804nServices.map((s) => s.code);
		assert.ok(tryInCodes.includes("A16.07.025"), "Примерка A16.07.025 обязательна");

		// Постоянная фиксация (A16.07.004.002, A06.07.007)
		const cementCodes = cementProto.order804nServices.map((s) => s.code);
		assert.ok(cementCodes.includes("A16.07.004.002"), "Постоянная фиксация A16.07.004.002 обязательна");
		assert.ok(cementCodes.includes("A06.07.007"), "Рентген-контроль A06.07.007 обязателен");

		// Съемное протезирование (A16.07.035, A16.07.023, A02.07.010)
		const removableCodes = removableProto.order804nServices.map((s) => s.code);
		assert.ok(removableCodes.includes("A16.07.035"), "ЧСПП A16.07.035 обязательно");
		assert.ok(removableCodes.includes("A16.07.023"), "ПСПП A16.07.023 обязательно");
		assert.ok(removableCodes.includes("A02.07.010"), "ЦСЧ валиками A02.07.010 обязательно");
	});

	test("Абсолютный запрет эмодзи в протоколах ортопедии (Мандат 8d)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		for (const proto of ORTHOPEDIC_CANONICAL_PROTOCOLS) {
			assert.equal(emojiRegex.test(proto.titleRu), false, `Emoji в titleRu: ${proto.titleRu}`);
			assert.equal(emojiRegex.test(proto.shortLabel), false, `Emoji в shortLabel: ${proto.shortLabel}`);
			assert.equal(emojiRegex.test(proto.anamnesis), false, `Emoji в anamnesis`);
			assert.equal(emojiRegex.test(proto.objective), false, `Emoji в objective`);
			assert.equal(emojiRegex.test(proto.treatment), false, `Emoji в treatment`);
			assert.equal(emojiRegex.test(proto.recommendations), false, `Emoji в recommendations`);
			for (const s of proto.order804nServices) {
				assert.equal(emojiRegex.test(s.nameRu), false, `Emoji в названии услуги: ${s.nameRu}`);
			}
		}
	});

	test("Шкала VITA Classical и Bleach содержит полные наборы калиброванных оттенков (BL1..BL4, A1..D4)", () => {
		assert.equal(VITA_BLEACH_SHADES.length, 4);
		assert.deepEqual([...VITA_BLEACH_SHADES], ["BL1", "BL2", "BL3", "BL4"]);

		assert.equal(VITA_CLASSICAL_SHADES.length, 16);
		assert.ok(VITA_CLASSICAL_SHADES.includes("A1"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("A2"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("A3"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("A3.5"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("B1"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("B2"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("C1"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("D2"));

		assert.equal(ALL_VITA_AND_BLEACH_SHADES.length, 20);
		assert.equal(VITA_SHADE_GROUPS.length, 5);

		const groupNames = VITA_SHADE_GROUPS.map((g) => g.group);
		assert.deepEqual(groupNames, ["Bleach", "A", "B", "C", "D"]);
	});
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	formatOrthopedicProtocolStatement,
	createDoctorClinicalOverride,
	applyOrthopedicProtocolToVisit,
	type OrthopedicProtocolPreset,
} from "../orthopedicProtocols.js";

describe("Orthopedic Protocols & Dental Lab Chairside Engine (Mandate 8e, 8i, 8k, 8n)", () => {
	test("Содержит ровно 4 канонических ортопедических протокола", () => {
		assert.equal(ORTHOPEDIC_CANONICAL_PROTOCOLS.length, 4);

		const ids = ORTHOPEDIC_CANONICAL_PROTOCOLS.map((p) => p.id);
		assert.ok(ids.includes("ortho_prep_zirconia_emax"));
		assert.ok(ids.includes("ortho_try_in_framework_crown"));
		assert.ok(ids.includes("ortho_permanent_cementation"));
		assert.ok(ids.includes("ortho_removable_prosthetics"));
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

	test("applyOrthopedicProtocolToVisit генерирует CustomEvents для Формы 043/у, формулы и сметы", () => {
		const cementProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find((p) => p.id === "ortho_permanent_cementation")!;
		const eventsDispatched: Array<{ type: string; detail: unknown }> = [];

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
			});

			assert.deepEqual(result.teethNumbers, [21]);
			assert.ok(eventsDispatched.some((e) => e.type === "dente-apply-soap-protocol"));
			assert.ok(eventsDispatched.some((e) => e.type === "dente-odontogram-update"));
			assert.ok(eventsDispatched.some((e) => e.type === "dente-estimate-stage-add"));

			const estimateEvent = eventsDispatched.find((e) => e.type === "dente-estimate-stage-add");
			assert.equal((estimateEvent?.detail as { stageKind: string }).stageKind, "stage_3_orthopedics");
		} finally {
			(globalThis as unknown as { window: unknown }).window = originalWindow;
		}
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
});

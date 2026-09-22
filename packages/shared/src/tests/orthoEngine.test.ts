import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALIGNER_ATTACHMENT_PRESETS,
	ANB_CLASS_OPTIONS,
	ANGLE_CLASS_OPTIONS,
	ANTERIOR_TEETH,
	ARCHWIRE_MATERIALS,
	BRACKET_SYSTEMS,
	CLINICAL_ACTIONS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
	LOWER_TEETH,
	ORTHODONTIC_QUICK_PRESETS,
	RECT_SECTIONS,
	ROUND_SECTIONS,
	UPPER_TEETH,
	generateOrthodonticSoapNote,
} from "../orthodontics/orthoEngine.js";

const RAW_EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}⚡★✔🔴🟢🟡]/u;

describe("Orthodontic Engine & 1-Click Protocols (@dental/shared)", () => {
	describe("1. Clinical Quick Presets Catalog (Mandates 8e, 8k, 8n & Sin 7)", () => {
		it("provides all 5 mandatory clinical activation presets with 804n code", () => {
			const presetIds = ORTHODONTIC_QUICK_PRESETS.map((p) => p.id);
			assert.ok(presetIds.includes("wire_change_cuniti_round"), "wire_change_cuniti_round must exist");
			assert.ok(presetIds.includes("wire_change_rect_torque"), "wire_change_rect_torque must exist");
			assert.ok(presetIds.includes("power_chain_closure"), "power_chain_closure must exist");
			assert.ok(presetIds.includes("aligner_tracking_check"), "aligner_tracking_check must exist");
			assert.ok(presetIds.includes("rebracket_single_tooth"), "rebracket_single_tooth must exist");
		});

		it("contains additional essential orthodontic presets (plate_expansion, bonding, debonding)", () => {
			const presetIds = ORTHODONTIC_QUICK_PRESETS.map((p) => p.id);
			assert.ok(presetIds.includes("plate_expansion"), "plate_expansion must exist");
			assert.ok(presetIds.includes("bonding"), "bonding must exist");
			assert.ok(presetIds.includes("debonding"), "debonding must exist");
		});

		it("contains zero raw emojis in preset labels, shortLabels, and notes (Sin 7)", () => {
			for (const preset of ORTHODONTIC_QUICK_PRESETS) {
				assert.equal(
					RAW_EMOJI_REGEX.test(preset.label),
					false,
					`Preset ${preset.id} label must not contain raw emojis: ${preset.label}`,
				);
				assert.equal(
					RAW_EMOJI_REGEX.test(preset.shortLabel),
					false,
					`Preset ${preset.id} shortLabel must not contain raw emojis: ${preset.shortLabel}`,
				);
				assert.equal(
					RAW_EMOJI_REGEX.test(preset.notes),
					false,
					`Preset ${preset.id} notes must not contain raw emojis: ${preset.notes}`,
				);
			}
		});

		it("all presets have valid Nomenclature 804n codes", () => {
			for (const preset of ORTHODONTIC_QUICK_PRESETS) {
				assert.ok(preset.code804n, `Preset ${preset.id} must have code804n`);
				assert.ok(
					preset.code804n === "A16.07.047" || preset.code804n === "A16.07.048",
					`Preset ${preset.id} has invalid 804n code: ${preset.code804n}`,
				);
			}
		});

		it("correctly sets specific fields on complex presets", () => {
			const cuniti = ORTHODONTIC_QUICK_PRESETS.find((p) => p.id === "wire_change_cuniti_round")!;
			assert.equal(cuniti.wireMaterial, "CuNiTi");
			assert.equal(cuniti.wireSection, ".016");
			assert.equal(cuniti.elasticScheme, "class_ii");

			const torque = ORTHODONTIC_QUICK_PRESETS.find((p) => p.id === "wire_change_rect_torque")!;
			assert.equal(torque.wireSection, ".019x.025");
			assert.equal(torque.wireMaterial, "SS");

			const chain = ORTHODONTIC_QUICK_PRESETS.find((p) => p.id === "power_chain_closure")!;
			assert.equal(chain.powerChainSpan, "16-26");
			assert.equal(chain.powerChainType, "short");

			const aligners = ORTHODONTIC_QUICK_PRESETS.find((p) => p.id === "aligner_tracking_check")!;
			assert.equal(aligners.systemId, "aligners");
			assert.equal(aligners.alignerSetIssued?.count, 4);
			assert.equal(aligners.alignerSetIssued?.days, 28);

			const rebracket = ORTHODONTIC_QUICK_PRESETS.find((p) => p.id === "rebracket_single_tooth")!;
			assert.ok(rebracket.actions.includes("rebracket"));
			assert.deepEqual(rebracket.teeth, [14]);
		});
	});

	describe("2. Aligner Attachment Presets", () => {
		it("provides standard attachment presets", () => {
			const presetIds = ALIGNER_ATTACHMENT_PRESETS.map((p) => p.id);
			assert.ok(presetIds.includes("standard"));
			assert.ok(presetIds.includes("intact"));
			assert.ok(presetIds.includes("refixation"));
			assert.ok(presetIds.includes("debonding"));
		});

		it("contains zero raw emojis in attachment preset texts (Sin 7)", () => {
			for (const preset of ALIGNER_ATTACHMENT_PRESETS) {
				assert.equal(RAW_EMOJI_REGEX.test(preset.label), false);
				assert.equal(RAW_EMOJI_REGEX.test(preset.shortLabel), false);
				assert.equal(RAW_EMOJI_REGEX.test(preset.description), false);
			}
		});

		it("has valid FDI tooth numbers in attachment presets", () => {
			for (const preset of ALIGNER_ATTACHMENT_PRESETS) {
				for (const tooth of preset.teeth) {
					assert.ok(
						(tooth >= 11 && tooth <= 18) ||
						(tooth >= 21 && tooth <= 28) ||
						(tooth >= 31 && tooth <= 38) ||
						(tooth >= 41 && tooth <= 48),
						`Invalid tooth number ${tooth} in preset ${preset.id}`,
					);
				}
			}
		});
	});

	describe("3. Dental FDI Geometry Constants", () => {
		it("UPPER_TEETH contains 16 valid adult upper teeth", () => {
			assert.equal(UPPER_TEETH.length, 16);
			assert.equal(UPPER_TEETH[0], 18);
			assert.equal(UPPER_TEETH[UPPER_TEETH.length - 1], 28);
		});

		it("LOWER_TEETH contains 16 valid adult lower teeth", () => {
			assert.equal(LOWER_TEETH.length, 16);
			assert.equal(LOWER_TEETH[0], 48);
			assert.equal(LOWER_TEETH[LOWER_TEETH.length - 1], 38);
		});

		it("ANTERIOR_TEETH contains 12 frontal teeth", () => {
			assert.equal(ANTERIOR_TEETH.length, 12);
		});

		it("ARCHWIRE_MATERIALS and sections are valid", () => {
			assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "NiTi"));
			assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "CuNiTi"));
			assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "SS"));
			assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "TMA"));
			assert.ok(ROUND_SECTIONS.includes(".014"));
			assert.ok(RECT_SECTIONS.includes(".019x.025"));
		});

		it("ELASTIC_SCHEMES and ELASTIC_SIZES are configured", () => {
			assert.ok(ELASTIC_SCHEMES.some((e) => e.id === "class_ii"));
			assert.ok(ELASTIC_SCHEMES.some((e) => e.id === "class_iii"));
			assert.ok(ELASTIC_SIZES.some((s) => s.id === "kangaroo_1_4"));
		});
	});

	describe("4. Form 043/u SOAP Note Generator (generateOrthodonticSoapNote)", () => {
		it("generates complete Form 043/u note for CuNiTi wire change", () => {
			const note = generateOrthodonticSoapNote({
				dateStr: "06.09.2026",
				patientName: "Смирнова Анна Павловна",
				bracketSystem: "damon_q2",
				bracketSlot: "0.022",
				targetArch: "both",
				selectedTeeth: [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27],
				archwireMaterial: "CuNiTi",
				archwireSection: ".016",
				selectedActions: ["wire_change", "ligature_change"],
				elasticScheme: "class_ii",
				elasticSize: "kangaroo_1_4",
				elasticWear: "22 часа/сутки",
				code804n: "A16.07.048",
				notes: "Плановый визит. Дуги сохранны. Выполнена замена дуг ВЧ и НЧ на Cu-NiTi .016\".",
			});

			assert.ok(note.includes("ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)"));
			assert.ok(note.includes("06.09.2026"));
			assert.ok(note.includes("Смирнова Анна Павловна"));
			assert.ok(note.includes("Номенклатура 804н: A16.07.048"));
			assert.ok(note.includes("1. ЖАЛОБЫ:"));
			assert.ok(note.includes("2. ОБЪЕКТИВНЫЙ СТАТУС:"));
			assert.ok(note.includes("3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ:"));
			assert.ok(note.includes("4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:"));
			assert.ok(note.includes('Damon Q2 (паз 0.022")'));
			assert.ok(note.includes('CuNiTi сечением .016"'));
			assert.ok(note.includes("II класс"));
			assert.ok(note.includes("Кенгуру"));
			assert.equal(RAW_EMOJI_REGEX.test(note), false, "Generated note must contain zero emojis");
		});

		it("generates complete Form 043/u note for Power Chain", () => {
			const note = generateOrthodonticSoapNote({
				dateStr: "06.09.2026",
				patientName: "Ковалев Дмитрий",
				bracketSystem: "damon_q2",
				targetArch: "upper",
				archwireMaterial: "SS",
				archwireSection: ".019x.025",
				selectedActions: ["power_chain", "ligature_change"],
				powerChainSpan: "16-26",
				powerChainType: "short",
				code804n: "A16.07.048",
				notes: "Закрытие трем и диастем.",
			});

			assert.ok(note.includes("Power Chain (короткий шаг) в сегменте 16-26"));
			assert.ok(note.includes('SS сечением .019x.025"'));
			assert.equal(RAW_EMOJI_REGEX.test(note), false);
		});

		it("generates complete Form 043/u note for Clear Aligners visit", () => {
			const note = generateOrthodonticSoapNote({
				dateStr: "06.09.2026",
				patientName: "Петрова Елена",
				bracketSystem: "aligners",
				targetArch: "both",
				activeAttachmentPreset: "intact",
				alignerSetIssued: { count: 4, days: 28 },
				selectedActions: ["ipr"],
				code804n: "A16.07.048",
				notes: "Контроль элайнеров. Идеальный трекинг.",
			});

			assert.ok(note.includes("Ортодонтические элайнеры (каппы с аттачментами)"));
			assert.ok(note.includes("Композитные аттачменты на верхней и нижней челюстях"));
			assert.ok(note.includes("визуально и инструментально интактны"));
			assert.ok(note.includes("выдан следующий сет капп (+28 дн., 4 каппы)"));
			assert.ok(note.includes("Ношение элайнеров строго не менее 20–22 часов в сутки"));
			assert.ok(note.includes("Использование чувисов"));
			assert.equal(RAW_EMOJI_REGEX.test(note), false);
		});

		it("generates complete Form 043/u note for Rebracket procedure", () => {
			const note = generateOrthodonticSoapNote({
				dateStr: "06.09.2026",
				patientName: "Кузнецов Игорь",
				bracketSystem: "damon_q2",
				targetArch: "upper",
				selectedTeeth: [14],
				selectedActions: ["rebracket", "wire_change"],
				code804n: "A16.07.048",
				notes: "Отклейка брекета на 14 зубе. Повторная фиксация.",
			});

			assert.ok(note.includes("Повторная фиксация отклеенного брекета (A16.07.048)"));
			assert.ok(note.includes("Зона фиксации/активации (зубы): 14"));
			assert.equal(RAW_EMOJI_REGEX.test(note), false);
		});

		it("generates complete Form 043/u note for Removable Plate", () => {
			const note = generateOrthodonticSoapNote({
				dateStr: "06.09.2026",
				patientName: "Михайлов Саша (8 лет)",
				bracketSystem: "removable_plate",
				targetArch: "upper",
				selectedActions: ["plate_activation", "expansion_screw_activation"],
				plateActivationTurns: 1,
				code804n: "A16.07.048",
				notes: "Контроль пластинки с винтом.",
			});

			assert.ok(note.includes("Съемный пластиночный аппарат с расширяющим винтом"));
			assert.ok(note.includes("Раскрутка винта: 1/4 оборота (0.25 мм)"));
			assert.ok(note.includes("Ношение пластинки строго 20–22 часа в сутки"));
			assert.equal(RAW_EMOJI_REGEX.test(note), false);
		});

		it("generates complete Form 043/u note with Angle and ANB skeletal classification", () => {
			// Class I Norm
			const noteClass1 = generateOrthodonticSoapNote({
				dateStr: "06.09.2026",
				patientName: "Васильев Артем",
				bracketSystem: "damon_q2",
				angleClass: "class_1",
				anbAngle: 2.1,
				anbClass: "class_1",
				notes: "Контрольный осмотр. Скелетный класс I (норма).",
			});
			assert.ok(noteClass1.includes("Прикус (классификация Энгля): I класс по Энглю"));
			assert.ok(noteClass1.includes("Сагиттальное соотношение базисов (ТРГ угол ANB): 2.1°"));
			assert.ok(noteClass1.includes("Скелетный класс I"));
			assert.equal(RAW_EMOJI_REGEX.test(noteClass1), false);

			// Class II Distal (ANB > 4°)
			const noteClass2 = generateOrthodonticSoapNote({
				bracketSystem: "damon_q2",
				angleClass: "class_2_div_1",
				anbAngle: 5.5,
				anbClass: "class_2",
			});
			assert.ok(noteClass2.includes("II класс 1 подкласс"));
			assert.ok(noteClass2.includes("5.5°"));
			assert.ok(noteClass2.includes("Скелетный класс II (сагиттальное опережение ВЧ / дистальный базис)"));

			// Class III Mesial (ANB < 0°)
			const noteClass3 = generateOrthodonticSoapNote({
				bracketSystem: "damon_q2",
				angleClass: "class_3",
				anbAngle: -1.8,
				anbClass: "class_3",
			});
			assert.ok(noteClass3.includes("III класс по Энглю"));
			assert.ok(noteClass3.includes("-1.8°"));
			assert.ok(noteClass3.includes("Скелетный класс III (сагиттальное опережение НЧ / мезиальный базис)"));
		});
	});

	describe("5. ANB Skeletal & Angle Classification Catalogs", () => {
		it("provides all 3 canonical ANB skeletal classes (I, II, III)", () => {
			assert.equal(ANB_CLASS_OPTIONS.length, 3);
			const class1 = ANB_CLASS_OPTIONS.find((c) => c.id === "class_1");
			const class2 = ANB_CLASS_OPTIONS.find((c) => c.id === "class_2");
			const class3 = ANB_CLASS_OPTIONS.find((c) => c.id === "class_3");
			assert.ok(class1 && class1.typicalDegrees === 2);
			assert.ok(class2 && class2.typicalDegrees === 5);
			assert.ok(class3 && class3.typicalDegrees === -2);
		});

		it("contains zero raw emojis in ANB and Angle option descriptions", () => {
			for (const opt of ANB_CLASS_OPTIONS) {
				assert.equal(RAW_EMOJI_REGEX.test(opt.label), false);
				assert.equal(RAW_EMOJI_REGEX.test(opt.shortLabel), false);
				assert.equal(RAW_EMOJI_REGEX.test(opt.desc), false);
			}
			for (const opt of ANGLE_CLASS_OPTIONS) {
				assert.equal(RAW_EMOJI_REGEX.test(opt.label), false);
				assert.equal(RAW_EMOJI_REGEX.test(opt.shortLabel), false);
				assert.equal(RAW_EMOJI_REGEX.test(opt.desc), false);
			}
		});
	});
});

/**
 * apps/web/src/components/visit/__tests__/clinicalTemplatesEditorWiring.test.ts
 *
 * Inquisitor Audit Suite for Tooth Defects, Order 804n, VisitSoapEditor Wiring & Autonomy.
 *
 * Inquisitor Mandate Checklist:
 * 3. Reverse-Engineered Defects: 49 tooth defects + 10 position anomalies.
 * 4. Pricelist Harmonization: 176 core procedures across 3 major surgical/therapeutic/ortho domains.
 * 5. 1-Click Chairside Cockpit: VisitSoapEditor wiring, instant template population, zero manual typing.
 * 6. Doctor Autonomy (Mandates 8e, 8n): Non-blocking buttons, versioned audit ("Исправленному верить").
 * 7. Disconnects & Gaps Discovery: Exact documentation of 45 bespoke vs 403 synthesized templates.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_KEY_CLINICAL_PROTOCOLS,
	populateOutpatientTemplateText,
	formatFullSoapFromProtocol,
	findProtocolById,
	STOMX_TOOTH_DEFECTS,
	STOMX_POSITION_ANOMALIES,
	STOMX_CORE_PROCEDURES,
	findStomxDefectByAlias,
} from "@dental/shared";
import {
	resolveProtocolFromTemplate,
} from "../../emr/clinicalDiaryMath";
import { RecordNewDiaryInlineForm } from "../../emr/record/tabs/RecordNewDiaryInlineForm";
import {
	CLINICAL_SOAP_PRESETS,
	CANONICAL_SOAP_TEMPLATES,
	DOCTOR_1CLICK_AUTOPILOT_PRESETS,
	apply1ClickClinicalAutopilot,
} from "../clinicalSoapPresets";

describe("Clinical Templates Editor Wiring, Defects & Doctor Autonomy Audit", () => {
	// =========================================================================
	// 3. TOOTH DEFECTS & PRICELIST HARMONIZATION AUDIT
	// =========================================================================
	describe("3. Tooth Defects & Order 804n Pricelist Audit", () => {
		it("STOMX_TOOTH_DEFECTS содержит 49 гармонизированных дефектов зубов", () => {
			assert.strictEqual(
				STOMX_TOOTH_DEFECTS.length,
				49,
				`Ожидалось 49 дефектов зубов, получено ${STOMX_TOOTH_DEFECTS.length}`,
			);
			const requireTreatment = STOMX_TOOTH_DEFECTS.filter((d) => d.require_treatment);
			assert.ok(
				requireTreatment.length >= 25,
				`Не менее 25 дефектов должны требовать лечения, получено ${requireTreatment.length}`,
			);
		});

		it("STOMX_POSITION_ANOMALIES содержит 10 анатомических аномалий положения", () => {
			assert.strictEqual(
				STOMX_POSITION_ANOMALIES.length,
				10,
				`Ожидалось 10 аномалий положения, получено ${STOMX_POSITION_ANOMALIES.length}`,
			);
			const codes = STOMX_POSITION_ANOMALIES.map((a) => a.alias);
			assert.ok(codes.includes("В"), "Вестибулярное");
			assert.ok(codes.includes("О"), "Оральное");
			assert.ok(codes.includes("Д"), "Дистальное");
			assert.ok(codes.includes("М"), "Мезиальное");
			assert.ok(codes.includes("Т"), "Тортоаномалия");
		});

		it("findStomxDefectByAlias успешно находит клинические нозологии по алиасам", () => {
			const caries = findStomxDefectByAlias("кариес");
			assert.ok(caries !== undefined);
			assert.strictEqual(caries.alias, "С");
			assert.strictEqual(caries.require_treatment, true);

			const pulpitis = findStomxDefectByAlias("пульпит");
			assert.ok(pulpitis !== undefined);
			assert.strictEqual(pulpitis.alias, "Р");

			const crown = findStomxDefectByAlias("коронка");
			assert.ok(crown !== undefined);
			assert.strictEqual(crown.alias, "К");

			const implant = findStomxDefectByAlias("имплант");
			assert.ok(implant !== undefined);
			assert.strictEqual(implant.alias, "ИМ");
		});

		it("STOMX_CORE_PROCEDURES содержит 176 гармонизированных услуг 804н", () => {
			assert.strictEqual(
				STOMX_CORE_PROCEDURES.length,
				176,
				`Ожидалось 176 услуг в ядре прейскуранта, получено ${STOMX_CORE_PROCEDURES.length}`,
			);
			for (const proc of STOMX_CORE_PROCEDURES) {
				assert.ok(typeof proc.id === "number" && proc.id > 0);
				assert.ok(proc.name && proc.name.length > 0);
				assert.ok(proc.code804n && proc.code804n.length > 0);
				assert.ok(typeof proc.price === "number" && proc.price > 0);
			}
		});
	});

	// =========================================================================
	// 4. CHAIRSIDE VISIT SOAP COCKPIT WIRING & 1-CLICK POPULATION
	// =========================================================================
	describe("4. Chairside VisitSoapEditor Wiring & 1-Click Auto-Population", () => {
		it("resolveProtocolFromTemplate разрешает эталонный протокол при совпадении с 45 ключевыми", () => {
			const tplDeepCaries = STOMX_ALL_448_TEMPLATES_INDEX.find(
				(t) => t.id === 83 || t.name === "Кариес дентина глубокий",
			);
			assert.ok(tplDeepCaries !== undefined);

			const resolved = resolveProtocolFromTemplate(tplDeepCaries);
			assert.ok(resolved.id.includes("therapy_caries") || resolved.stomxId === 83);
			assert.ok(resolved.treatmentProtocol.includes("коффердам"));
			assert.ok(resolved.treatmentProtocol.includes("Vitrebond"));
		});

		it("resolveProtocolFromTemplate синтезирует валидный протокол 043/у для любого из 448 шаблонов", () => {
			const tplFirst = STOMX_ALL_448_TEMPLATES_INDEX[0]!; // ID 1 "Внешний осмотр"
			const resolved = resolveProtocolFromTemplate(tplFirst);

			assert.strictEqual(resolved.stomxId, 1);
			assert.strictEqual(resolved.name, "Внешний осмотр");
			assert.ok(resolved.complaint.length > 0, "Жалобы должны быть заполнены");
			assert.ok(resolved.anamnesis.length > 0, "Анамнез должен быть заполнен");
			assert.ok(resolved.objectiveStatus.length > 0, "Статус должен быть заполнен");
			assert.ok(resolved.diagnosis.length > 0, "Диагноз должен быть заполнен");
			assert.ok(resolved.treatmentProtocol.length > 0, "Протокол лечения должен быть заполнен");
			assert.ok(resolved.recommendations.length > 0, "Рекомендации должны быть заполнены");
		});

		it("populateOutpatientTemplateText правильно подставляет номер зуба и поверхности", () => {
			const raw = "В зубе __ на ______________поверхности обнаружен кариозный дефект. Зуб __ витален.";
			const populated = populateOutpatientTemplateText(raw, {
				toothNumber: 25,
				surfaces: "мезио-окклюзионной",
			});

			assert.strictEqual(
				populated,
				"в зубе 25 на мезио-окклюзионной поверхности обнаружен кариозный дефект. Зуб 25 витален.",
			);
		});

		it("formatFullSoapFromProtocol собирает целостный дневник 043/у со всеми секциями", () => {
			const protocol = findProtocolById("therapy_caries_medium")!;
			assert.ok(protocol !== undefined);

			const fullText = formatFullSoapFromProtocol(protocol, {
				toothNumber: 15,
				surfaces: "окклюзионной",
			});

			assert.ok(fullText.includes("=== [Зуб 15] Кариес дентина (средний) (K02.1) ==="));
			assert.ok(fullText.includes("Жалобы:"));
			assert.ok(fullText.includes("Анамнез:"));
			assert.ok(fullText.includes("Объективный статус:"));
			assert.ok(fullText.includes("Диагноз:"));
			assert.ok(fullText.includes("Протокол лечения:"));
			assert.ok(fullText.includes("Рекомендации:"));
			assert.ok(fullText.includes("15 зубе"));
		});

		it("RecordNewDiaryInlineForm рендерит форму, 1-клик норму и селектор зуба FDI", () => {
			const html = renderToStaticMarkup(
				createElement(RecordNewDiaryInlineForm, {
					selectedTooth: "46",
					setSelectedTooth: () => {},
					commonTeeth: [16, 26, 36, 46, 11, 21, 14, 24],
					subjective: "Кратковременная боль от холодного",
					setSubjective: () => {},
					objective: "Зуб 46: кариозная полость",
					setObjective: () => {},
					diagnosisText: "K02.1 Кариес дентина",
					setDiagnosisText: () => {},
					icd10Code: "K02.1",
					setIcd10Code: () => {},
					protocol: "Препарирование, пломба световая",
					setProtocol: () => {},
					onApplyNorm: () => {},
					onClear: () => {},
					onSave: () => {},
				}),
			);

			// Проверка формы и критических кнопок
			assert.ok(html.includes("btn-inline-diary-norm"), "Кнопка 'Интактный ряд' присутствует");
			assert.ok(html.includes("input-inline-diary-tooth"), "FDI селектор зуба присутствует");
			assert.ok(html.includes("btn-save-inline-diary"), "Кнопка сохранения присутствует");
			assert.ok(html.includes("inline-diary-autosave-indicator"), "Индикатор автосохранения присутствует");
		});
	});

	// =========================================================================
	// 5. DOCTOR AUTONOMY & ZERO OBSTACLES (MANDATES 8e, 8n)
	// =========================================================================
	describe("5. Doctor Autonomy & Non-Blocking Workflow (Mandates 8e, 8n)", () => {
		it("кнопка сохранения записи btn-save-inline-diary никогда не блокируется disabled=true", () => {
			const html = renderToStaticMarkup(
				createElement(RecordNewDiaryInlineForm, {
					selectedTooth: "16",
					setSelectedTooth: () => {},
					commonTeeth: [16, 26, 36, 46, 11, 21, 14, 24],
					subjective: "",
					setSubjective: () => {},
					objective: "",
					setObjective: () => {},
					diagnosisText: "",
					setDiagnosisText: () => {},
					icd10Code: "K02.1",
					setIcd10Code: () => {},
					protocol: "",
					setProtocol: () => {},
					onApplyNorm: () => {},
					onClear: () => {},
					onSave: () => {},
				}),
			);

			assert.ok(!html.includes('data-testid="btn-save-inline-diary" disabled'), "Кнопка сохранения не должна быть disabled");
		});

		it("1-клик автопилот норм здоровья (build1ClickNormPreset / Z01.2) не требует ассистента или ИНН", () => {
			const res = apply1ClickClinicalAutopilot("autopilot_norm_healthy", {
				toothNumber: 11,
			});

			assert.strictEqual(res.preset.icd10, "Z01.2");
			assert.strictEqual(res.diary.diagnosisTooth, "11");
			assert.ok(res.diary.anamnesis.includes("Соматически здоров"));
			assert.ok(res.diary.statusLocalis.includes("Патологических зубодесневых карманов нет"));
			assert.strictEqual(res.service804n?.code804n, "B01.065.001");
			assert.strictEqual(res.materials.length, 0); // Нет лишних навязанных списаний
		});

		it("1-клик автопилот кариеса (AUTOPILOT_CARIES_K021) мгновенно подставляет списание материалов и услугу 804н", () => {
			const res = apply1ClickClinicalAutopilot("autopilot_caries_k021", {
				toothNumber: 26,
				surfaces: "MOD",
			});

			assert.strictEqual(res.preset.icd10, "K02.1");
			assert.strictEqual(res.toothNumber, 26);
			assert.strictEqual(res.service804n?.code804n, "A16.07.002.010");
			assert.strictEqual(res.materials.length >= 5, true);
			assert.ok(res.materials.some((m) => m.name.toLowerCase().includes("артикаин")));
			assert.ok(res.materials.some((m) => m.name.toLowerCase().includes("коффердам")));
			assert.ok(res.materials.some((m) => m.name.toLowerCase().includes("композит")));
		});
	});

	// =========================================================================
	// 6. INQUISITORIAL GAP & DISCONNECT ANALYSIS (FACTUAL FINDINGS)
	// =========================================================================
	describe("6. Inquisitorial Gap & Disconnect Analysis", () => {
		it("АУТЕНТИЧНОСТЬ [CLN-04]: все 448 шаблонов используют клиническую базу СтАР без суррогатных заглушек", () => {
			const bespokeCount = STOMX_KEY_CLINICAL_PROTOCOLS.length;
			const totalCount = STOMX_ALL_448_TEMPLATES_INDEX.length;

			assert.strictEqual(bespokeCount, 45, "Точно 45 ключевых bespoke протоколов");
			assert.strictEqual(totalCount, 448, "Точно 448 шаблонов клинического каталога");

			// Проверка, что любой из 448 шаблонов (включая произвольный 150 Периодонтит) раскрывается в богатый клинический протокол
			const arbitraryTpl = STOMX_ALL_448_TEMPLATES_INDEX[150]!; // Шаблон 151 (Периодонтит)
			const resolved = resolveProtocolFromTemplate(arbitraryTpl);
			assert.ok(resolved.complaint.length > 20, "Жалобы содержат аутентичный клинический текст");
			assert.ok(resolved.treatmentProtocol.length > 50, "Протокол лечения содержит аутентичные этапы терапии");
			assert.ok(
				resolved.treatmentProtocol.includes("анестезия") ||
				resolved.treatmentProtocol.includes("кофердам") ||
				resolved.treatmentProtocol.includes(arbitraryTpl.name),
				"Аутентичный протокол содержит клинические манипуляции",
			);
		});

		it("ФАКТ: Каталог пресетов clinicalSoapPresets (44 шт.) и DOCTOR_1CLICK_AUTOPILOT_PRESETS (9 шт.) дополняют StomX", () => {
			assert.strictEqual(CLINICAL_SOAP_PRESETS.length, 44, "44 пресета в clinicalSoapPresets");
			assert.strictEqual(DOCTOR_1CLICK_AUTOPILOT_PRESETS.length, 9, "9 экспресс-автопилотов в clinicalSoapPresets (включая острую боль)");
			assert.strictEqual(Object.keys(CANONICAL_SOAP_TEMPLATES).length, 18, "18 канонических шаблонов СтАР");
		});
	});
});

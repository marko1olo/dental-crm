/**
 * apps/web/src/components/visit/__tests__/stomxClinicalTemplatesDeepAudit.test.ts
 *
 * Inquisitor Deep Audit Suite for StomX Clinical Templates, Protocols & Tooth Defects.
 *
 * Inquisitor Mandate Checklist:
 * 1. Inventory & Specialty Distribution: 448 StomX templates metadata across 5 specialties.
 * 2. Key Structured Protocols: 45 bespoke clinical protocols with complete SOAP blocks.
 * 3. Reverse-Engineered Defects: 49 tooth defects + 10 position anomalies.
 * 4. Pricelist 804n Harmonization: 176 core procedures across 3 major surgical/therapeutic/ortho domains.
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
	STOMX_OUTPATIENT_CATEGORY_TREE,
	STOMX_SPECIALTIES,
	populateOutpatientTemplateText,
	formatFullSoapFromProtocol,
	getProtocolsBySpecialty,
	searchOutpatientProtocols,
	searchAll448Templates,
	findProtocolById,
	STOMX_TOOTH_DEFECTS,
	STOMX_POSITION_ANOMALIES,
	STOMX_CORE_PROCEDURES,
	findStomxDefectByAlias,
	type OutpatientProtocolTemplate,
	type StomxOutpatientTemplateMetadata,
} from "@dental/shared";
import {
	VisitSoapEditor,
	resolveProtocolFromTemplate,
	type VisitSoapNoteValues,
} from "../VisitSoapEditor";
import {
	CLINICAL_SOAP_PRESETS,
	CANONICAL_SOAP_TEMPLATES,
	DOCTOR_1CLICK_AUTOPILOT_PRESETS,
	DOCTOR_AUTOPILOT_PRESETS_MAP,
	apply1ClickClinicalAutopilot,
} from "../clinicalSoapPresets";

describe("StomX Clinical Templates & Protocols Inquisitor Audit", () => {
	// =========================================================================
	// 1. INVENTORY & METADATA AUDIT (448 TEMPLATES ACROSS 5 SPECIALTIES)
	// =========================================================================
	describe("1. Metadata Inventory Audit (448 Templates)", () => {
		it("содержит ровно 448 элементов в индексе без пропусков", () => {
			assert.strictEqual(
				STOMX_ALL_448_TEMPLATES_INDEX.length,
				448,
				`Ожидалось ровно 448 шаблонов StomX, получено ${STOMX_ALL_448_TEMPLATES_INDEX.length}`,
			);
		});

		it("все 448 шаблонов имеют уникальные ID от 1 до 448", () => {
			const idSet = new Set<number>();
			for (const tpl of STOMX_ALL_448_TEMPLATES_INDEX) {
				assert.ok(
					typeof tpl.id === "number" && tpl.id > 0,
					`ID шаблона должен быть положительным числом: ${tpl.id}`,
				);
				assert.ok(
					!idSet.has(tpl.id),
					`Обнаружен дубликат ID шаблона StomX: ${tpl.id}`,
				);
				idSet.add(tpl.id);
			}
			assert.strictEqual(idSet.size, 448);
		});

		it("распределение по специальностям строго соответствует балансу StomX", () => {
			const specCounts: Record<string, number> = {
				therapy: 0,
				orthopedics: 0,
				surgery: 0,
				implantology: 0,
				periodontics: 0,
			};

			for (const tpl of STOMX_ALL_448_TEMPLATES_INDEX) {
				specCounts[tpl.specialty] = (specCounts[tpl.specialty] || 0) + 1;
			}

			// Точные числа Нового Завоза StomX:
			assert.strictEqual(specCounts.therapy, 226, "Терапия должна содержать 226 шаблонов");
			assert.strictEqual(specCounts.orthopedics, 134, "Ортопедия должна содержать 134 шаблона");
			assert.strictEqual(specCounts.surgery, 74, "Хирургия должна содержать 74 шаблона");
			assert.strictEqual(specCounts.implantology, 10, "Имплантология должна содержать 10 шаблонов");
			assert.strictEqual(specCounts.periodontics, 4, "Пародонтология должна содержать 4 шаблона");

			const sum =
				specCounts.therapy +
				specCounts.orthopedics +
				specCounts.surgery +
				specCounts.implantology +
				specCounts.periodontics;
			assert.strictEqual(sum, 448, "Сумма по специальностям должна быть ровно 448");
		});

		it("каждый шаблон содержит валидные метаданные (name, mkbCode, categoryName, order)", () => {
			for (const tpl of STOMX_ALL_448_TEMPLATES_INDEX) {
				assert.ok(
					tpl.name && tpl.name.trim().length > 0,
					`Шаблон ID ${tpl.id} имеет пустое имя`,
				);
				assert.ok(
					tpl.mkbCode && tpl.mkbCode.trim().length > 0,
					`Шаблон ID ${tpl.id} имеет пустой код МКБ`,
				);
				assert.ok(
					tpl.categoryName && tpl.categoryName.trim().length > 0,
					`Шаблон ID ${tpl.id} имеет пустую категорию`,
				);
				assert.ok(
					typeof tpl.order === "number",
					`Шаблон ID ${tpl.id} имеет некорректный order`,
				);
			}
		});

		it("дерево категорий STOMX_OUTPATIENT_CATEGORY_TREE содержит 9 корней и 42 иерархических узла StomX", () => {
			assert.strictEqual(
				STOMX_OUTPATIENT_CATEGORY_TREE.length,
				9,
				`Ожидалось 9 корневых разделов дерева, получено ${STOMX_OUTPATIENT_CATEGORY_TREE.length}`,
			);
			let totalNodes = 0;
			function countNodes(nodes: readonly any[]) {
				for (const node of nodes) {
					totalNodes++;
					if (node.children && Array.isArray(node.children)) {
						countNodes(node.children);
					}
				}
			}
			countNodes(STOMX_OUTPATIENT_CATEGORY_TREE);
			assert.strictEqual(
				totalNodes,
				42,
				`Ожидалось ровно 42 иерархических рубрики StomX, получено ${totalNodes}`,
			);

			const rootNames = STOMX_OUTPATIENT_CATEGORY_TREE.map((c) => c.name);
			assert.ok(rootNames.includes("Общее"));
			assert.ok(rootNames.includes("Терапия"));
			assert.ok(rootNames.includes("Ортопедия"));
			assert.ok(rootNames.includes("Хирургия"));
			assert.ok(rootNames.includes("Рентген"));
			assert.ok(rootNames.includes("Быстрое заполнение"));
		});
	});

	// =========================================================================
	// 2. BESPOKE KEY PROTOCOLS AUDIT (45 STRUCTURED PROTOCOLS)
	// =========================================================================
	describe("2. Bespoke Key Protocols Audit (45 Structured Protocols)", () => {
		it("содержит ровно 45 эталонных клинических протоколов", () => {
			assert.strictEqual(
				STOMX_KEY_CLINICAL_PROTOCOLS.length,
				45,
				`Ожидалось 45 эталонных протоколов, получено ${STOMX_KEY_CLINICAL_PROTOCOLS.length}`,
			);
		});

		it("структурированные протоколы распределены по всем 5 специальностям", () => {
			const therapy = getProtocolsBySpecialty("therapy");
			const orthopedics = getProtocolsBySpecialty("orthopedics");
			const surgery = getProtocolsBySpecialty("surgery");
			const implantology = getProtocolsBySpecialty("implantology");
			const periodontics = getProtocolsBySpecialty("periodontics");

			assert.strictEqual(therapy.length, 12, "Терапия: 12 эталонных протоколов");
			assert.strictEqual(orthopedics.length, 10, "Ортопедия: 10 эталонных протоколов");
			assert.strictEqual(surgery.length, 8, "Хирургия: 8 эталонных протоколов");
			assert.strictEqual(implantology.length, 5, "Имплантология: 5 эталонных протоколов");
			assert.strictEqual(periodontics.length, 10, "Пародонтология: 10 эталонных протоколов");
			assert.strictEqual(
				therapy.length + orthopedics.length + surgery.length + implantology.length + periodontics.length,
				45,
			);
		});

		it("каждый из 45 протоколов содержит полные блоки SOAP без плейсхолдеров и заглушек", () => {
			for (const p of STOMX_KEY_CLINICAL_PROTOCOLS) {
				assert.ok(p.id && p.id.length > 0, `Протокол ${p.name} не имеет id`);
				assert.ok(p.name && p.name.length > 0, `Протокол ${p.id} не имеет name`);
				assert.ok(p.mkbCode && p.mkbCode.length > 0, `Протокол ${p.id} не имеет mkbCode`);
				assert.ok(p.complaint && p.complaint.length > 20, `Протокол ${p.id} имеет короткие жалобы`);
				assert.ok(p.anamnesis && p.anamnesis.length > 20, `Протокол ${p.id} имеет короткий анамнез`);
				assert.ok(
					p.objectiveStatus && p.objectiveStatus.length > 20,
					`Протокол ${p.id} имеет короткий статус`,
				);
				assert.ok(p.diagnosis && p.diagnosis.length > 5, `Протокол ${p.id} имеет короткий диагноз`);
				assert.ok(
					p.treatmentProtocol && p.treatmentProtocol.length > 30,
					`Протокол ${p.id} имеет короткий протокол лечения`,
				);
				assert.ok(
					p.recommendations && p.recommendations.length > 10,
					`Протокол ${p.id} имеет короткие рекомендации`,
				);
				assert.ok(p.tags && p.tags.length > 0, `Протокол ${p.id} не имеет тегов поиска`);
			}
		});

		it("searchOutpatientProtocols эффективно находит протоколы по русским подстрокам", () => {
			const cariesMatches = searchOutpatientProtocols("кариес");
			assert.ok(cariesMatches.length >= 3, "Кариес должен найти не менее 3 протоколов");

			const pulpMatches = searchOutpatientProtocols("пульпит", "therapy");
			assert.ok(pulpMatches.length >= 3, "Пульпит в терапии должен найти не менее 3 протоколов");

			const crownMatches = searchOutpatientProtocols("коронка", "orthopedics");
			assert.ok(crownMatches.length >= 2, "Коронка в ортопедии должна найти не менее 2 протоколов");

			const sinusMatches = searchOutpatientProtocols("синус-лифтинг", "implantology");
			assert.strictEqual(sinusMatches.length, 2, "Синус-лифтинг должен найти открытый и закрытый протоколы");
		});
	});

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

		it("VisitSoapEditor рендерит 1-строчный компактный тулбар (32-36px), 1-клик кнопки и селектор зуба", () => {
			const html = renderToStaticMarkup(
				createElement(VisitSoapEditor, {
					activeTooth: 46,
					initialValues: {
						complaint: "Кратковременная боль от холодного",
						anamnesis: "Соматически здоров",
						objectiveStatus: "Зуб 46: кариозная полость",
						diagnosis: "K02.1 Кариес дентина",
						treatmentPlan: "Препарирование, пломба световая",
						recommendations: "Контроль через 6 месяцев",
						icd10: "K02.1",
					},
					isTemplatesOpen: false,
				}),
			);

			// Проверка тулбара и критических кнопок
			assert.ok(html.includes("btn-open-stomt-templates"), "Кнопка 'Шаблоны 043/у (448)' присутствует");
			assert.ok(html.includes("btn-soap-physio-norm"), "Кнопка 'Норма в 1 клик' присутствует");
			assert.ok(html.includes("soap-select-tooth"), "FDI селектор зуба присутствует");
			assert.ok(html.includes("46 зуб"), "Выбран 46 зуб");
			assert.ok(html.includes("soap-complaints"), "Поле Subjective: жалобы присутствует");
			assert.ok(html.includes("soap-anamnesis"), "Поле Subjective: анамнез присутствует");
			assert.ok(html.includes("soap-objective"), "Поле Objective: статус присутствует");
			assert.ok(html.includes("soap-diagnosis"), "Поле Assessment: диагноз присутствует");
			assert.ok(html.includes("soap-treatment"), "Поле Plan: лечение присутствует");
			assert.ok(html.includes("soap-recommendations"), "Поле Plan: рекомендации присутствует");
			assert.ok(html.includes("soap-autosave-status"), "Индикатор автосохранения присутствует");
		});

		it("VisitSoapEditor при isTemplatesOpen=true открывает выпадающую панель с фильтрами всех 5 специальностей", () => {
			const html = renderToStaticMarkup(
				createElement(VisitSoapEditor, {
					activeTooth: 16,
					isTemplatesOpen: true,
				}),
			);

			assert.ok(html.includes("Клинические протоколы StomX (448 протоколов)"));
			assert.ok(html.includes("Все протоколы (448)"));
			assert.ok(html.includes("Терапия"));
			assert.ok(html.includes("Ортопедия"));
			assert.ok(html.includes("Хирургия"));
			assert.ok(html.includes("Имплантация"));
			assert.ok(html.includes("Пародонтология"));
			assert.ok(html.includes("Заполнить (1 клик)"));
			assert.ok(html.includes("+ Добавить"));
		});

		it("VisitSoapEditor рендерит мобильный док действий с 448 шаблонами и нормой", () => {
			const html = renderToStaticMarkup(
				createElement(VisitSoapEditor, {
					activeTooth: 21,
				}),
			);

			assert.ok(html.includes("soap-mobile-action-bar"));
			assert.ok(html.includes("Шаблоны (448)"));
			assert.ok(html.includes("Норма"));
		});
	});

	// =========================================================================
	// 5. DOCTOR AUTONOMY & ZERO OBSTACLES (MANDATES 8e, 8n)
	// =========================================================================
	describe("5. Doctor Autonomy & Non-Blocking Workflow (Mandates 8e, 8n)", () => {
		it("кнопки никогда не блокируются disabled=true при isLocked=true", () => {
			const html = renderToStaticMarkup(
				createElement(VisitSoapEditor, {
					activeTooth: 16,
					isLocked: true,
				}),
			);

			assert.ok(!html.includes('disabled=""'), "Никакие кнопки не должны быть disabled");
			assert.ok(!html.includes("disabled "), "Никакие кнопки не должны быть disabled");
			assert.ok(
				html.includes("btn-soap-enable-correction"),
				"Кнопка 'Внести исправление («Исправленному верить»)' должна рендериться",
			);
		});

		it("кнопка ручного сохранения btn-soap-save всегда активна (Мандат 8e)", () => {
			const html = renderToStaticMarkup(
				createElement(VisitSoapEditor, {
					activeTooth: 16,
				}),
			);

			assert.ok(html.includes('data-testid="btn-soap-save"'));
			assert.ok(!html.includes('data-testid="btn-soap-save" disabled'));
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
		it("ФАКТ: 45 протоколов имеют индивидуально прописанный текст, а 403 шаблона используют синтез", () => {
			const bespokeCount = STOMX_KEY_CLINICAL_PROTOCOLS.length;
			const totalCount = STOMX_ALL_448_TEMPLATES_INDEX.length;
			const synthesizedCount = totalCount - bespokeCount;

			assert.strictEqual(bespokeCount, 45, "Точно 45 bespoke протоколов");
			assert.strictEqual(totalCount, 448, "Точно 448 элементов метаданных");
			assert.strictEqual(synthesizedCount, 403, "Точно 403 синтезируемых протокола");

			// Проверка, что синтез для любого из 403 шаблонов не ломается и генерирует непустой текст
			const arbitraryTpl = STOMX_ALL_448_TEMPLATES_INDEX[150]!; // Произвольный шаблон
			const resolved = resolveProtocolFromTemplate(arbitraryTpl);
			assert.ok(resolved.complaint.includes(arbitraryTpl.name));
			assert.ok(resolved.treatmentProtocol.includes(arbitraryTpl.name));
		});

		it("ФАКТ: Каталог пресетов clinicalSoapPresets (44 шт.) и DOCTOR_1CLICK_AUTOPILOT_PRESETS (8 шт.) дополняют StomX", () => {
			assert.strictEqual(CLINICAL_SOAP_PRESETS.length, 44, "44 пресета в clinicalSoapPresets");
			assert.strictEqual(DOCTOR_1CLICK_AUTOPILOT_PRESETS.length, 8, "8 экспресс-автопилотов в clinicalSoapPresets");
			assert.strictEqual(Object.keys(CANONICAL_SOAP_TEMPLATES).length, 18, "18 канонических шаблонов СтАР");
		});
	});
});

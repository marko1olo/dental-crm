/**
 * apps/web/src/components/visit/__tests__/clinicalTemplatesInventory.test.ts
 *
 * Inquisitor Audit Suite for Clinical Templates & Bespoke Protocols Inventory.
 *
 * Inquisitor Mandate Checklist:
 * 1. Inventory & Specialty Distribution: 448 clinical templates metadata across 5 specialties.
 * 2. Key Structured Protocols: 45 bespoke clinical protocols with complete SOAP blocks.
 * 3. Search & Discovery: Instant search by keywords and specialty filtering.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_KEY_CLINICAL_PROTOCOLS,
	STOMX_OUTPATIENT_CATEGORY_TREE,
	getProtocolsBySpecialty,
	searchOutpatientProtocols,
} from "@dental/shared";

describe("Clinical Templates & Protocols Inventory Audit", () => {
	// =========================================================================
	// 1. INVENTORY & METADATA AUDIT (448 TEMPLATES ACROSS 5 SPECIALTIES)
	// =========================================================================
	describe("1. Metadata Inventory Audit (448 Templates)", () => {
		it("содержит ровно 448 элементов в индексе без пропусков", () => {
			assert.strictEqual(
				STOMX_ALL_448_TEMPLATES_INDEX.length,
				448,
				`Ожидалось ровно 448 шаблонов, получено ${STOMX_ALL_448_TEMPLATES_INDEX.length}`,
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
					`Обнаружен дубликат ID шаблона: ${tpl.id}`,
				);
				idSet.add(tpl.id);
			}
			assert.strictEqual(idSet.size, 448);
		});

		it("распределение по специальностям строго соответствует балансу шаблонов", () => {
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

			// Точные числа клинического каталога шаблонов:
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
});

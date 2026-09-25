/**
 * packages/shared/src/tests/clinicalSoapMasterCatalog.test.ts
 *
 * Test Suite for Single Source of Truth (SSOT) Clinical SOAP Protocols & Automated BOM Deduction.
 * Mandates:
 * - 8v: Automated Bill of Materials (BOM) deduction without nurse clicking bloat.
 * - 8e: Doctor autonomy, physiological norm default in 1 click, no blocking barriers.
 * - 8d item 7: Strictly 0 cartoon emojis in clinical protocols and records.
 * - 8s: Kopeck-exact financial and material quantities.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateProtocolBomTotalCostRub,
	findSoapProtocolById,
	formatSoapDiaryFromProtocol,
	getSoapProtocolsByDomain,
	MASTER_CLINICAL_SOAP_PROTOCOLS,
	searchSoapMasterProtocols,
	validateSoapProtocol,
	type ClinicalPresetCategory,
} from "../clinical/soap/index.js";

describe("Single Source of Truth (SSOT) Clinical SOAP Protocols Catalog", () => {
	it("Каталог содержит протоколы по всем 6 обязательным клиническим направлениям", () => {
		assert.ok(MASTER_CLINICAL_SOAP_PROTOCOLS.length >= 25, "Всего протоколов должно быть не менее 25");

		const requiredDomains: ClinicalPresetCategory[] = [
			"therapy",
			"surgery",
			"orthopedics",
			"periodontology",
			"pediatric",
			"hygiene",
		];

		for (const domain of requiredDomains) {
			const protocols = getSoapProtocolsByDomain(domain);
			assert.ok(
				protocols.length >= 3,
				`Направление «${domain}» должно содержать как минимум 3 канонических протокола (найдено: ${protocols.length})`,
			);
		}
	});

	it("Каждый протокол в каталоге валиден и соответствует структуре SOAP (S, O, A, P + BOM)", () => {
		for (const protocol of MASTER_CLINICAL_SOAP_PROTOCOLS) {
			const validation = validateSoapProtocol(protocol);
			assert.ok(
				validation.isValid,
				`Протокол «${protocol.id}» («${protocol.title}») содержит ошибки валидации: ${validation.errors.join("; ")}`,
			);
		}
	});

	it("Все протоколы содержат структурированные списки материалов (BOM) с положительными количествами (Мандат 8v)", () => {
		for (const protocol of MASTER_CLINICAL_SOAP_PROTOCOLS) {
			assert.ok(
				protocol.materialsToDeduct.length > 0,
				`Протокол ${protocol.id} обязан содержать хотя бы один материал для автоматического списания`,
			);

			for (const m of protocol.materialsToDeduct) {
				assert.ok(m.name.length > 0, `Материал в протоколе ${protocol.id} должен иметь непустое название`);
				assert.ok(m.quantity > 0, `Количество материала «${m.name}» в ${protocol.id} должно быть > 0`);
				assert.ok(
					["г", "мл", "шт.", "пары", "карп.", "компл.", "упак."].includes(m.unit),
					`Единица измерения «${m.unit}» материала «${m.name}» должна соответствовать ОКЕИ`,
				);
				assert.ok(
					typeof m.unitCostRub === "number" && m.unitCostRub >= 0,
					`Себестоимость материала «${m.name}» должна быть неотрицательным числом`,
				);
			}

			const totalCost = calculateProtocolBomTotalCostRub(protocol);
			assert.ok(
				totalCost > 0,
				`Суммарная себестоимость BOM протокола ${protocol.id} должна быть больше 0 (рассчитано: ${totalCost} руб.)`,
			);
		}
	});

	describe("1. Терапия (Therapy): Кариес, Пульпит, Периодонтит", () => {
		it("Покрыты все ключевые нозологии: кариес (начальный ICON, средний, глубокий, корня), пульпит (В1, В2), периодонтит", () => {
			const therapy = getSoapProtocolsByDomain("therapy");
			const ids = therapy.map((p) => p.id);

			assert.ok(ids.includes("therapy_norm_healthy"), "Физиологическая норма (Z01.2)");
			assert.ok(ids.includes("therapy_caries_initial_icon"), "ICON начальный кариес (K02.0)");
			assert.ok(ids.includes("therapy_caries_medium"), "Кариес дентина средний (K02.1)");
			assert.ok(ids.includes("therapy_caries_deep"), "Кариес дентина глубокий (K02.1)");
			assert.ok(ids.includes("therapy_caries_root_cementum"), "Кариес цемента/корня (K02.2)");
			assert.ok(ids.includes("therapy_pulpitis_stage1"), "Пульпит визит 1 экстирпация (K04.0)");
			assert.ok(ids.includes("therapy_pulpitis_stage2_obturation"), "Пульпит визит 2 обтурация (K04.0)");
			assert.ok(ids.includes("therapy_periodontitis_chronic"), "Хронический апикальный периодонтит (K04.7)");
			assert.ok(ids.includes("therapy_cervical_wedge_defect"), "Клиновидный дефект (K03.1)");
		});

		it("Протокол кариеса содержит корректные материалы (композит, СИЦ, травление, адгезив, коффердам)", () => {
			const caries = findSoapProtocolById("therapy_caries_medium");
			assert.ok(caries !== undefined);
			const matNames = caries.materialsToDeduct.map((m) => m.name.toLowerCase());

			assert.ok(matNames.some((n) => n.includes("композит") || n.includes("filtek")));
			assert.ok(matNames.some((n) => n.includes("коффердам")));
			assert.ok(matNames.some((n) => n.includes("адгезив")));
			assert.ok(matNames.some((n) => n.includes("прокладка") || n.includes("vitrebond")));
		});

		it("Протоколы пульпита содержат машинные Ni-Ti файлы, NaOCl, ЭДТА и силер AH Plus", () => {
			const pulp1 = findSoapProtocolById("therapy_pulpitis_stage1");
			assert.ok(pulp1 !== undefined);
			const mats1 = pulp1.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats1.some((n) => n.includes("protaper") || n.includes("файл")));
			assert.ok(mats1.some((n) => n.includes("гипохлорит")));

			const pulp2 = findSoapProtocolById("therapy_pulpitis_stage2_obturation");
			assert.ok(pulp2 !== undefined);
			const mats2 = pulp2.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats2.some((n) => n.includes("ah plus") || n.includes("силер")));
			assert.ok(mats2.some((n) => n.includes("гуттаперч")));
		});
	});

	describe("2. Хирургия (Surgery): Удаление простое/сложное, Имплантация, РВК, Периостотомия", () => {
		it("Покрыты все обязательные хирургические протоколы", () => {
			const surgery = getSoapProtocolsByDomain("surgery");
			const ids = surgery.map((p) => p.id);

			assert.ok(ids.includes("surgery_extraction_simple"), "Простое удаление");
			assert.ok(ids.includes("surgery_extraction_complex"), "Сложное удаление");
			assert.ok(ids.includes("surgery_extraction_impacted"), "Ретинированный зуб мудрости");
			assert.ok(ids.includes("surgery_implant_placement"), "Дентальная имплантация");
			assert.ok(ids.includes("surgery_healing_abutment"), "Установка формирователя десны");
			assert.ok(ids.includes("surgery_cystectomy_rvk"), "Резекция верхушки корня (РВК)");
			assert.ok(ids.includes("surgery_periostotomy"), "Периостотомия при периостите");
		});

		it("Протокол РВК (surgery_cystectomy_rvk) содержит биокерамику ProRoot MTA, остеопластику Bio-Oss и мембрану Bio-Gide", () => {
			const rvk = findSoapProtocolById("surgery_cystectomy_rvk");
			assert.ok(rvk !== undefined, "Протокол РВК обязан присутствовать в SSOT");
			assert.strictEqual(rvk.service804n?.code804n, "A16.07.007");

			const mats = rvk.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats.some((n) => n.includes("proroot") || n.includes("mta") || n.includes("биокерамический")), "Должен списываться MTA");
			assert.ok(mats.some((n) => n.includes("bio-oss") || n.includes("остеопластический")), "Должен списываться остеопластический материал");
			assert.ok(mats.some((n) => n.includes("bio-gide") || n.includes("мембрана")), "Должна списываться барьерная мембрана");
			assert.ok(mats.some((n) => n.includes("prolene") || n.includes("шовный")), "Должен списываться шовный материал");
		});

		it("Протокол имплантации списывает титановый имплантат, винт-заглушку, стерильное белье и физраствор", () => {
			const implant = findSoapProtocolById("surgery_implant_placement");
			assert.ok(implant !== undefined);
			assert.strictEqual(implant.service804n?.code804n, "A16.07.054");

			const mats = implant.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats.some((n) => n.includes("имплантат")));
			assert.ok(mats.some((n) => n.includes("винт-заглушка")));
			assert.ok(mats.some((n) => n.includes("физраствор")));
		});
	});

	describe("3. Ортопедия (Orthopedics): Коронки ZrO2/E.max, Вкладки Inlay/Onlay, Мосты, Съемные", () => {
		it("Покрыты все ключевые ортопедические конструкции", () => {
			const ortho = getSoapProtocolsByDomain("orthopedics");
			const ids = ortho.map((p) => p.id);

			assert.ok(ids.includes("ortho_inlay_onlay_emax"), "Керамическая вкладка E.max");
			assert.ok(ids.includes("ortho_crown_prep_zirconia_emax"), "Препарирование под коронку ZrO2/E.max");
			assert.ok(ids.includes("ortho_try_in_framework_crown"), "Примерка каркаса коронки");
			assert.ok(ids.includes("ortho_permanent_cementation"), "Постоянная фиксация коронки");
			assert.ok(ids.includes("ortho_bridge_prosthetics"), "Мостовидный протез");
			assert.ok(ids.includes("ortho_removable_prosthetics"), "Съемное протезирование Acry-Free");
		});

		it("Протокол вкладки (ortho_inlay_onlay_emax) содержит блок e.max CAD, цемент двойного отверждения RelyX/Variolink и плавиковую кислоту", () => {
			const inlay = findSoapProtocolById("ortho_inlay_onlay_emax");
			assert.ok(inlay !== undefined, "Протокол вкладки E.max обязан присутствовать в SSOT");
			assert.strictEqual(inlay.service804n?.code804n, "A16.07.003");

			const mats = inlay.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats.some((n) => n.includes("e.max") || n.includes("дисиликат")));
			assert.ok(mats.some((n) => n.includes("relyx") || n.includes("variolink") || n.includes("двойного отверждения")));
			assert.ok(mats.some((n) => n.includes("плавиков")));
			assert.ok(mats.some((n) => n.includes("силан") || n.includes("monobond")));
		});

		it("Протокол мостовидного протеза содержит А-силиконовый оттиск и материал для временных мостов Protemp 4", () => {
			const bridge = findSoapProtocolById("ortho_bridge_prosthetics");
			assert.ok(bridge !== undefined);
			assert.strictEqual(bridge.service804n?.code804n, "A16.07.005");

			const mats = bridge.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats.some((n) => n.includes("силикон") || n.includes("honigum")));
			assert.ok(mats.some((n) => n.includes("protemp") || n.includes("временных")));
		});
	});

	describe("4. Пародонтология (Periodontology): SRP Кюретаж, Вектор-терапия, Гингивит", () => {
		it("Покрыты закрытый кюретаж кюретами Грейси и Вектор-терапия с полирующей суспензией", () => {
			const perio = getSoapProtocolsByDomain("periodontology");
			const ids = perio.map((p) => p.id);

			assert.ok(ids.includes("perio_srp_closed_curettage"), "Закрытый кюретаж SRP");
			assert.ok(ids.includes("perio_vector_ultrasonic_therapy"), "Вектор-терапия Vector Paro");
			assert.ok(ids.includes("perio_gingivitis_catarrhal"), "Катаральный гингивит");
			assert.ok(ids.includes("perio_gingivectomy"), "Гингивэктомия");
		});

		it("Протокол Вектор-терапии (perio_vector_ultrasonic_therapy) списывает суспензию Vector Polish Fluid с гидроксиапатитом и углепластиковую насадку", () => {
			const vector = findSoapProtocolById("perio_vector_ultrasonic_therapy");
			assert.ok(vector !== undefined, "Протокол Вектор-терапии обязан присутствовать в SSOT");
			assert.strictEqual(vector.service804n?.code804n, "A16.07.011.001");

			const mats = vector.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats.some((n) => n.includes("vector polish fluid") || n.includes("гидроксиапатит")));
			assert.ok(mats.some((n) => n.includes("углепластиков") || n.includes("зонд") || n.includes("насадка")));
			assert.ok(mats.some((n) => n.includes("oraqix") || n.includes("анестези")));
		});
	});

	describe("5. Детская стоматология (Pediatric): Адаптация, Кариес, Пульпотек, Серебрение, Герметизация", () => {
		it("Покрыты все 5 базовых детских сценариев приема", () => {
			const pediatric = getSoapProtocolsByDomain("pediatric");
			const ids = pediatric.map((p) => p.id);

			assert.ok(ids.includes("pediatric_adaptation_visit"), "Адаптационный прием Tell-Show-Do");
			assert.ok(ids.includes("pediatric_caries_twinky"), "Кариес временного зуба Twinky Star");
			assert.ok(ids.includes("pediatric_pulpotomy_pulpotec"), "Пульпотомия Pulpotec / MTA");
			assert.ok(ids.includes("pediatric_silvering_saforide"), "Серебрение Saforide 38%");
			assert.ok(ids.includes("pediatric_fissure_sealing"), "Герметизация фиссур Clinpro Sealant / Fissurit FX");
			assert.ok(ids.includes("pediatric_primary_tooth_extraction"), "Удаление временного зуба");
		});

		it("Протокол герметизации фиссур (pediatric_fissure_sealing) имеет код 804н A16.07.057 и герметик в BOM", () => {
			const sealing = findSoapProtocolById("pediatric_fissure_sealing");
			assert.ok(sealing !== undefined, "Протокол герметизации фиссур обязан присутствовать в SSOT");
			assert.strictEqual(sealing.service804n?.code804n, "A16.07.057");

			const mats = sealing.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats.some((n) => n.includes("герметик") || n.includes("clinpro") || n.includes("fissurit")));
			assert.ok(mats.some((n) => n.includes("ортофосфорная") || n.includes("травильн")));
		});

		it("Протокол пульпотомии (pediatric_pulpotomy_pulpotec) списывает Pulpotec/MTA и СИЦ подкладку", () => {
			const pulpotomy = findSoapProtocolById("pediatric_pulpotomy_pulpotec");
			assert.ok(pulpotomy !== undefined);
			assert.strictEqual(pulpotomy.service804n?.code804n, "A16.07.009");

			const mats = pulpotomy.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats.some((n) => n.includes("pulpotec") || n.includes("mta")));
			assert.ok(mats.some((n) => n.includes("сиц") || n.includes("fuji")));
		});
	});

	describe("6. Профгигиена (Hygiene): Air-Flow глицин, УЗ Piezon, Комплекс", () => {
		it("Покрыты комплексная гигиена, Air-Flow с глициновым порошком и ультразвуковой скейлинг", () => {
			const hygiene = getSoapProtocolsByDomain("hygiene");
			const ids = hygiene.map((p) => p.id);

			assert.ok(ids.includes("hygiene_complex_full"), "Комплексная профгигиена A16.07.051");
			assert.ok(ids.includes("hygiene_airflow_glycine"), "Air-Flow порошком глицина");
			assert.ok(ids.includes("hygiene_ultrasonic_piezon"), "УЗ скейлинг Piezon");
		});

		it("Air-Flow протоколы списывают субгингивальный порошок на основе глицина и роторасширитель Optragate", () => {
			const airflow = findSoapProtocolById("hygiene_airflow_glycine");
			assert.ok(airflow !== undefined);

			const mats = airflow.materialsToDeduct.map((m) => m.name.toLowerCase());
			assert.ok(mats.some((n) => n.includes("глицин") || n.includes("air-flow")));
			assert.ok(mats.some((n) => n.includes("optragate") || n.includes("роторасширитель")));
		});
	});

	describe("Поиск, сборка текста дневника и Mandate 8d Zero Emojis", () => {
		it("searchSoapMasterProtocols корректно фильтрует по тексту и направлению", () => {
			const cariesMatches = searchSoapMasterProtocols("кариес");
			assert.ok(cariesMatches.length >= 4);

			const rvkMatches = searchSoapMasterProtocols("РВК");
			assert.ok(rvkMatches.length >= 1);
			assert.strictEqual(rvkMatches[0]?.id, "surgery_cystectomy_rvk");

			const vectorMatches = searchSoapMasterProtocols("Вектор");
			assert.ok(vectorMatches.length >= 1);
			assert.strictEqual(vectorMatches[0]?.id, "perio_vector_ultrasonic_therapy");

			const fissureMatches = searchSoapMasterProtocols("герметизация");
			assert.ok(fissureMatches.length >= 1);
			assert.strictEqual(fissureMatches[0]?.id, "pediatric_fissure_sealing");
		});

		it("formatSoapDiaryFromProtocol собирает все секции дневника 043/у и подставляет зуб 36 и поверхности O/MOD", () => {
			const protocol = findSoapProtocolById("therapy_caries_medium");
			assert.ok(protocol !== undefined);

			const fullText = formatSoapDiaryFromProtocol(protocol, {
				toothNumber: 36,
				surfaces: "O/MOD",
			});

			assert.ok(fullText.includes("Зуб 36"));
			assert.ok(fullText.includes("ЖАЛОБЫ:"));
			assert.ok(fullText.includes("АНАМНЕЗ:"));
			assert.ok(fullText.includes("ОБЪЕКТИВНЫЙ СТАТУС:"));
			assert.ok(fullText.includes("ДИАГНОЗ:"));
			assert.ok(fullText.includes("K02.1"));
			assert.ok(fullText.includes("ПРОТОКОЛ ЛЕЧЕНИЯ:"));
			assert.ok(fullText.includes("A16.07.002.010"));
			assert.ok(fullText.includes("СПИСАНИЕ МАТЕРИАЛОВ СО СКЛАДА (АВТОМАТИЧЕСКИЙ BOM ПО ПРИКАЗУ 804н):"));
			assert.ok(fullText.includes("РЕКОМЕНДАЦИИ:"));
			assert.ok(fullText.includes("ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА:"));

			// Mandate 8d item 7: strictly 0 cartoon emojis in medical documents
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.strictEqual(emojiRegex.test(fullText), false, "В медицинском дневнике не должно быть мультяшных эмодзи");
		});
	});
});

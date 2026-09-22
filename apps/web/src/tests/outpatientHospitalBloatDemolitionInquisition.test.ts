/**
 * outpatientHospitalBloatDemolitionInquisition.test.ts
 *
 * Бескомпромиссная инквизиция полного демонтажа стационарного и академического медицинского блоата:
 * Hospital & General Medicine Bloat Demolition Specialist (Mandates 8e, 8i, 8s, 8k, 8t).
 *
 * ПРОВЕРЯЕМЫЕ ОБЛАСТИ:
 * 1. apps/web/src/components/patients/ — отсутствие стационарного блоата, коек, трансфузиологии, автономия анкеты здоровья.
 * 2. apps/web/src/components/visit/ — отсутствие госпитального наркоза/коек/трансфузий, автономия дневника 043/у, свобода скидок 0–100%.
 * 3. apps/web/src/components/emr/ — чистота Формы 043/у, 0 disabled кнопок, 1-клик нормы и протоколы СтАР/804н.
 * 4. packages/shared/src/ — ликвидация схемы 025/у, чистота хирургии, амбулаторный СанПиН 3.3686-21 без комиссий из 3 человек.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

import {
	process100PercentDiscountCheckout,
} from "../components/finance/cashboxOperations.js";
import {
	calculatePaymentDiscount,
} from "../components/finance/PaymentModal.js";

import {
	PHYSIOLOGICAL_NORM_PRESET,
} from "../components/emr/templates/ClinicalDiaryTemplatesModal.js";
import {
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
} from "../components/emr/templates/clinicalDiaryTemplatesEngine.js";

import {
	CORE_1CLICK_PRESETS,
} from "../components/emr/protocolGenerator/EmrProtocolGeneratorModal.js";
import {
	STATUTORY_EMR_PROTOCOL_CATALOG,
} from "../components/emr/protocolGenerator/emrProtocolEngine.js";

import {
	SURGICAL_OPERATION_NORMS,
	evaluateWarehouseOverdraft,
} from "../components/surgery/surgeryProtocols.js";

describe("Demolition Mandate: Eradication of Hospital & Inpatient Bloat (Mandates 8e, 8i, 8s, 8k)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../..");
	const webRoot = path.resolve(__dirname, "..");
	const sharedRoot = path.join(repoRoot, "packages/shared/src");

	// Запрещенные термины стационарного госпитального блоата (Мандат 8i)
	const FORBIDDEN_HOSPITAL_TERMS = [
		"койко-день",
		"койко-дни",
		"койко-фонд",
		"коечный фонд",
		"коечный режим",
		"палата интенсивной",
		"стационарное отделение",
		"гемотрансфуз",
		"переливание крови",
		"переливание плазмы",
		"донор крови",
		"kell-антиген",
		"лапаротомия",
		"полостная операция",
		"общий интубационный наркоз",
	];

	// ═════════════════════════════════════════════════════════════════════════
	// БЛОК 1: apps/web/src/components/patients/
	// ═════════════════════════════════════════════════════════════════════════
	describe("1. apps/web/src/components/patients/ — Амбулаторная чистота и автономия", () => {
		const patientsDir = path.join(webRoot, "components/patients");

		it("1.1. В кодовой базе components/patients отсутствуют термины стационара, коек и трансфузиологии", () => {
			assert.ok(fs.existsSync(patientsDir), "components/patients должен существовать");
			const files = fs.readdirSync(patientsDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

			for (const file of files) {
				if (file.includes(".test.")) continue;
				const content = fs.readFileSync(path.join(patientsDir, file), "utf-8").toLowerCase();

				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!content.includes(term),
						`Файл patients/${file} содержит запрещенный госпитальный термин: «${term}»`,
					);
				}
			}
		});

		it("1.2. PatientAnamnesisModal.tsx предоставляет 1-клик пресет нормы и не блокирует сохранение", () => {
			const modalContent = fs.readFileSync(
				path.join(patientsDir, "PatientAnamnesisModal.tsx"),
				"utf-8",
			);

			// Проверка наличия 1-клик нормы
			assert.ok(
				modalContent.includes("btn-somatic-healthy-norm"),
				"Должна присутствовать кнопка 'Соматически здоров / норма (1 клик)'",
			);
			assert.ok(
				modalContent.includes("Соматически здоров. Аллергоанамнез не отягощен"),
				"Пресет нормы должен заполнять физиологическую норму в 1 клик",
			);

			// Проверка отсутствия disabled на кнопке сохранения
			assert.ok(
				!modalContent.includes('disabled={!evaluation') &&
				!modalContent.includes('disabled={isInvalid'),
				"Кнопка сохранения анкеты не должна блокироваться",
			);
		});

		it("1.3. PatientWorkspaceView.tsx направляет пациента строго в Карту 043/у", () => {
			const wsContent = fs.readFileSync(
				path.join(patientsDir, "PatientWorkspaceView.tsx"),
				"utf-8",
			);

			assert.ok(
				wsContent.includes("Карта пациента (043/у)") || wsContent.includes("043/у"),
				"Рабочее место пациента должно использовать форму 043/у",
			);
			assert.ok(
				!wsContent.includes("025/у") && !wsContent.includes("025u"),
				"Рабочее место пациента не должно содержать госпитальную карту 025/у",
			);
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// БЛОК 2: apps/web/src/components/visit/
	// ═════════════════════════════════════════════════════════════════════════
	describe("2. apps/web/src/components/visit/ — Чистота приёма у кресла и автономия врача", () => {
		const visitDir = path.join(webRoot, "components/visit");

		it("2.1. В кодовой базе components/visit отсутствуют термины стационара, коек и трансфузиологии", () => {
			assert.ok(fs.existsSync(visitDir), "components/visit должен существовать");
			const files = fs.readdirSync(visitDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

			for (const file of files) {
				if (file.includes(".test.")) continue;
				const content = fs.readFileSync(path.join(visitDir, file), "utf-8").toLowerCase();

				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!content.includes(term),
						`Файл visit/${file} содержит запрещенный госпитальный термин: «${term}»`,
					);
				}
			}
		});

		it("2.2. VisitDiarySection.tsx гарантирует автономию врача (fieldsDisabled = false)", () => {
			const diaryContent = fs.readFileSync(
				path.join(visitDir, "VisitDiarySection.tsx"),
				"utf-8",
			);

			assert.ok(
				diaryContent.includes("const fieldsDisabled = false;"),
				"Дневник приёма должен гарантировать автономию врача: поля никогда не блокируются (Мандат 8e)",
			);
			assert.ok(
				diaryContent.includes("дезинфекция 1 клик без комиссии"),
				"Списание карпул медсестрой производится в 1 клик без комиссии по СанПиН 3.3686-21",
			);
		});

		it("2.3. VisitEmkTab.tsx при пустом дневнике не блокирует врача, а авто-заполняет Z01.2 норму", () => {
			const emkContent = fs.readFileSync(
				path.join(visitDir, "VisitEmkTab.tsx"),
				"utf-8",
			);

			assert.ok(
				emkContent.includes("Z01.2 Осмотр полости рта, патологий не выявлено (Норма)"),
				"При сохранении пустого дневника система должна авто-заполнять физиологическую норму Z01.2",
			);
			assert.ok(
				emkContent.includes("Сохранить («Исправленному верить»)"),
				"Врач свободно правит свои дневники со штампом «Исправленному верить» (Мандат 8e п. 4)",
			);
		});

		it("2.4. VisitServiceBillingWidget.tsx предоставляет 100% свободу скидок врача без паролей начмеда", () => {
			// Расчет 100% скидки на гарантийную переделку (Мандат 8e п. 7)
			const calc = calculatePaymentDiscount(12000, {
				isWarranty100: true,
			});
			assert.equal(calc.isWarranty100, true);
			assert.equal(calc.totalDueRub, 0);
			assert.equal(calc.discountRub, 12000);
			assert.equal(calc.effectiveDiscountPercent, 100);

			// Закрытие визита с гарантией в 1 клик (0 руб) без блокировок ККТ
			const warrantyCheckout = process100PercentDiscountCheckout({
				totalGrossRub: 8500,
				isWarrantyRework: true,
			});
			assert.equal(warrantyCheckout.isZeroDue, true);
			assert.equal(warrantyCheckout.totalNetRub, 0);
			assert.equal(warrantyCheckout.status, "completed");
			assert.equal(warrantyCheckout.bypassKktZeroReceipt, true);
		});

		it("2.5. VisitSurgeryProtocolTab.tsx поддерживает мягкий овердрафт склада без блокировки операции", () => {
			const implantNorm = SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_implant_standard");
			assert.ok(implantNorm, "Стандартная имплантация должна быть в нормах");

			// Проверка мягкого овердрафта при задержке накладной
			const overdraft = evaluateWarehouseOverdraft(implantNorm.requiredMaterials, true);
			assert.equal(overdraft.hasOverdraft, true);
			assert.equal(overdraft.canProceed, true); // Операция НЕ блокируется!
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// БЛОК 3: apps/web/src/components/emr/
	// ═════════════════════════════════════════════════════════════════════════
	describe("3. apps/web/src/components/emr/ — Стандарты Формы 043/у СтАР и 0 disabled", () => {
		const emrDir = path.join(webRoot, "components/emr");

		it("3.1. В кодовой базе components/emr отсутствуют госпитальные термины и 025/у", () => {
			assert.ok(fs.existsSync(emrDir), "components/emr должен существовать");

			const checkDir = (dir: string) => {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						if (entry.name !== "__tests__" && entry.name !== "node_modules") {
							checkDir(fullPath);
						}
					} else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
						if (entry.name.includes(".test.")) continue;
						const content = fs.readFileSync(fullPath, "utf-8").toLowerCase();
						for (const term of FORBIDDEN_HOSPITAL_TERMS) {
							assert.ok(
								!content.includes(term),
								`Файл ${entry.name} содержит запрещенный госпитальный термин: «${term}»`,
							);
						}
					}
				}
			};

			checkDir(emrDir);
		});

		it("3.2. Form043PrintModal.tsx: кнопки печати, сохранения и нормы всегда disabled={false}", () => {
			const printModalContent = fs.readFileSync(
				path.join(emrDir, "Form043PrintModal.tsx"),
				"utf-8",
			);

			assert.ok(
				printModalContent.includes('data-testid="btn-print-043-card"'),
				"Кнопка печати карты 043/у должна присутствовать",
			);
			assert.ok(
				printModalContent.includes('disabled={false}'),
				"Печать и сохранение карты 043/у всегда доступны (Мандат 8e: печать в любой момент)",
			);
			assert.ok(
				printModalContent.includes("Норма (1 клик)"),
				"Кнопка нормы в 1 клик должна быть на тулбаре карты 043/у",
			);
		});

		it("3.3. ClinicalDiaryTemplatesModal: канонический пресет PHYSIOLOGICAL_NORM_PRESET соответствует 804н", () => {
			assert.equal(PHYSIOLOGICAL_NORM_PRESET.icd10Code, "Z01.2");
			assert.equal(PHYSIOLOGICAL_NORM_PRESET.order804nServices[0]?.code, "B01.065.001");
			assert.ok(PHYSIOLOGICAL_NORM_PRESET.defaultObjectiveStatus.includes("Врач правит только патологию!"));
		});

		it("3.4. EmrProtocolGeneratorModal: 6 канонических клинических пресетов СтАР покрывают номенклатуру", () => {
			assert.equal(CORE_1CLICK_PRESETS.length, 6);
			const codes = CORE_1CLICK_PRESETS.map((p) => p.code);
			assert.ok(codes.includes("K02.1"), "Кариес должен присутствовать");
			assert.ok(codes.includes("K04.0"), "Пульпит должен присутствовать");
			assert.ok(codes.includes("K04.5"), "Периодонтит должен присутствовать");
			assert.ok(codes.includes("K08.1"), "Хирургическое удаление должно присутствовать");
			assert.ok(codes.includes("K08.1_ORTHO"), "Ортопедическое препарирование должно присутствовать");
			assert.ok(codes.includes("K05.3"), "Профгигиена должна присутствовать");
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// БЛОК 4: packages/shared/src/
	// ═════════════════════════════════════════════════════════════════════════
	describe("4. packages/shared/src/ — Ликвидация госпитальной карты 025/у и суверенитет 043/у", () => {
		it("4.1. packages/shared/src/index.ts: Форма 025/у ликвидирована, активной формой является 043/у", () => {
			const sharedIndex = fs.readFileSync(path.join(sharedRoot, "index.ts"), "utf-8");

			assert.ok(
				sharedIndex.includes("ФОРМА 025/у ЛИКВИДИРОВАНА (МАНДАТЫ 8i, 8s)"),
				"packages/shared должен фиксировать ликвидацию 025/у по Мандатам 8i, 8s",
			);
			assert.ok(
				!sharedIndex.includes("export const outpatientMedicalCard025uPayloadSchema ="),
				"outpatientMedicalCard025uPayloadSchema не должна экспортироваться как активная схема",
			);
			assert.ok(
				sharedIndex.includes("export type OutpatientMedicalCard025uPayload = DentalMedicalCard043uPayload;"),
				"Алиас 025/у должен перенаправлять на DentalMedicalCard043uPayload",
			);
		});

		it("4.2. packages/shared/src/types/surgery.ts: явный отказ от госпитального наркоза, коек и комиссий", () => {
			const surgeryTypes = fs.readFileSync(path.join(sharedRoot, "types/surgery.ts"), "utf-8");

			assert.ok(
				surgeryTypes.includes("НЕТ общему наркозу, НЕТ койко-дням, НЕТ трансфузиям крови"),
				"Хирургические типы должны прямо исключать стационарный госпитальный блоат",
			);
			assert.ok(
				surgeryTypes.includes("Мягкий овердрафт склада"),
				"Хирургические типы должны поддерживать мягкий овердрафт склада по Мандату 8e",
			);
		});

		it("4.3. packages/shared/src/anesthesia/pkuDisposal.ts: списание пустых карпул без комиссии из 3 человек", () => {
			const pkuContent = fs.readFileSync(path.join(sharedRoot, "anesthesia/pkuDisposal.ts"), "utf-8");

			assert.ok(
				pkuContent.includes("Для списания НЕ требуется комиссия из 3 человек"),
				"Списание карпул медсестрой не требует комиссии из 3 человек (Мандат 8e п. 10)",
			);
			assert.ok(
				pkuContent.includes("СанПиН 3.3686-21"),
				"Списание должно опираться на санитарные правила СанПиН 3.3686-21",
			);
		});
	});
});

/**
 * emrPerioAutonomyInquisition.test.ts
 *
 * DENTE Dental CRM — ЭМК, Пародонтограмма, Форма 043/у и Дневник визита
 * Инквизиционный аудит по Мандатам 8e, 8i, 8k, 8n:
 *
 * 1. МАНДАТ 8e (Автономия врача):
 *    - Физиологическая норма в 1 клик для всех клинических блоков.
 *    - Отсутствие заблокированных кнопок (disabled) из-за вторичных полей.
 *    - Мгновенная печать Формы 043/у без бюрократических барьеров.
 *    - Свободное версионное исправление подписанного дневника визита («Исправленному верить»).
 *
 * 2. МАНДАТ 8i (Суверенитет амбулаторного стоматологического контекста):
 *    - 100% амбулаторная стоматология у кресла (Форма 043/у, Номенклатура 804н, МКБ-10 K00–K14).
 *    - Полное отсутствие чужеродного госпитального блоата (Форма 025/у, трансфузии, койко-дни, лапаротомия, паллиатив).
 *
 * 3. МАНДАТ 8k (ЦРМ — не симулятор реальности, а инструмент снижения трения):
 *    - Запрет на принудительный ввод 192 точек Florida Probe для рутинного осмотра.
 *    - Экспресс-скрининг PSR ВОЗ по 6 секстантам в 1 клик (< 1 мс).
 *    - 1-клик протокол «Профгигиена» с автоматическим добавлением услуги A16.07.051 и списания глицина.
 *
 * 4. МАНДАТ 8n (Суверенитет масштаба: соло-врач и небольшая клиника):
 *    - Полная автономность осмотра и лечения без обязательных зав. отделениями, ассистентов и комиссий.
 *    - Автономный расчет гарантийных сроков на композиты и анестезии.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
	ALL_PERIO_TEETH,
	calculatePsrSextants,
	calculatePatientMrd,
	createDefaultPerioTeeth,
	PSR_SEXTANTS,
} from "@dental/shared";
import {
	applyHealthyPeriodontiumPreset,
	applyGingivitisPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	PERIO_EXPRESS_PRESETS,
	type PerioExpressPresetId,
} from "../components/perio/perioMath.js";
import {
	UPPER_JAW_PRESETS,
	LOWER_JAW_PRESETS,
	OCCLUSION_PRESETS,
} from "../components/odontogram/JawOcclusionModal.js";
import {
	CANONICAL_SOAP_TEMPLATES,
	type CanonicalSoapTemplateKey,
} from "../components/VisitDiaryTemplateSelector.js";
import {
	FORM_043_PHYSIOLOGICAL_NORM,
	createForm043PhysiologicalNorm,
	createIntactOdontogramRecords,
	createSanitizedOdontogramRecords,
	createWisdomExtractedOdontogramRecords,
	calculateCompositeRestorationWarranty,
	PERIO_PATHOLOGY_PRESETS,
} from "../lib/clinicalProtocols043.js";
import { completeClinicalVisitAndAssembleEstimate } from "../components/visit/clinicalVisitWorkflow.js";
import {
	FAST_TOOTH_PRESETS,
	applyFastCariesK021Protocol,
	applyFastProHygieneProtocol,
} from "../components/odontogram/ToothStatusPalette.js";
import {
	calculatePediatricPhysiologicalNorm,
	CANONICAL_PEDIATRIC_AGE_PRESETS,
} from "../components/odontogram/pediatricDentitionEngine.js";

describe("EMR, Periodontogram & Form 043/u — Mandates 8e, 8i, 8k, 8n Inquisition Suite", () => {
	// ════════════════════════════════════════════════════════════════════════
	// БЛОК 1: МАНДАТ 8e — Автономия врача и физиологическая норма в 1 клик
	// ════════════════════════════════════════════════════════════════════════
	describe("1. Мандат 8e (Автономия врача): 1-клик норма во всех компонентах", () => {
		it("1.1. Пародонтограмма: 1-клик норма (perio_norm_express) устанавливает PSR 0 во всех 6 секстантах", () => {
			const initialTeeth = createDefaultPerioTeeth(2);
			const normTeeth = applyHealthyPeriodontiumPreset(initialTeeth);
			assert.equal(normTeeth.length, 32, "Все 32 зуба должны присутствовать");

			// Проверяем, что все участки имеют физиологическую глубину <= 2 мм и BOP = false
			for (const tooth of normTeeth) {
				assert.equal(tooth.isMissing, false);
				assert.equal(tooth.mobility, 0);
				assert.equal(tooth.furcation, 0);
				assert.equal(tooth.distoBuccal?.bleedingOnProbing, false);
				assert.equal(tooth.midBuccal?.bleedingOnProbing, false);
				assert.equal(tooth.mesioBuccal?.bleedingOnProbing, false);
				assert.ok(
					(tooth.midBuccal?.probingDepthMm ?? 0) <= 2,
					`Глубина зуба ${tooth.toothNumber} должна быть <= 2 мм`,
				);
			}

			// Проверяем расчет секстантов PSR ВОЗ: все должны быть Код 0
			const psr = calculatePsrSextants(normTeeth);
			for (const s of PSR_SEXTANTS) {
				const sextantResult = psr[s.name];
				assert.ok(sextantResult, `Секстант ${s.name} обязан существовать`);
				assert.equal(
					sextantResult.code,
					0,
					`Секстант ${s.name} при норме обязан иметь PSR Код 0`,
				);
				assert.equal(sextantResult.asterisk, false);
			}
		});

		it("1.2. Окклюзия и челюсти (JawOcclusionModal): верхняя челюсть содержит 'ju_norm' (isNorm=true)", () => {
			const norm = UPPER_JAW_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Верхняя челюсть обязана содержать пресет нормы");
			assert.equal(norm.id, "ju_norm");
			assert.match(norm.titleRu, /Норма/i);
			assert.ok(norm.soapStatusLocalis.includes("альвеолярный отросток"));
		});

		it("1.3. Окклюзия и челюсти (JawOcclusionModal): нижняя челюсть содержит 'jl_norm' (isNorm=true)", () => {
			const norm = LOWER_JAW_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Нижняя челюсть обязана содержать пресет нормы");
			assert.equal(norm.id, "jl_norm");
			assert.match(norm.titleRu, /Норма/i);
			assert.ok(norm.soapStatusLocalis.includes("альвеолярная часть"));
		});

		it("1.4. Окклюзия и челюсти (JawOcclusionModal): прикус содержит 'c_orthognathic' (isNorm=true)", () => {
			const norm = OCCLUSION_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Окклюзия обязана содержать ортогнатический прикус");
			assert.equal(norm.id, "c_orthognathic");
			assert.match(norm.titleRu, /Ортогнатический/i);
			assert.ok(norm.soapStatusLocalis.includes("ортогнатический"));
		});

		it("1.5. Форма 043/у: createForm043PhysiologicalNorm заполняет анамнез, прикус, СОПР и план нормой", () => {
			const norm = createForm043PhysiologicalNorm();
			assert.ok(norm.chiefComplaint.length > 10, "Жалобы должны содержать плановый осмотр");
			assert.ok(norm.historyOfPresentIllness.toLowerCase().includes("санирован"), "Анамнез morbi должен быть заполнен");
			assert.ok(norm.allergologicalHistory.includes("не отягощен"), "Аллергоанамнез не отягощен");
			assert.ok(norm.concomitantDiseases.toLowerCase().includes("отрицает"), "Соматические заболевания отрицает");
			assert.equal(norm.biteType, "orthognathic", "Прикус ортогнатический");
			assert.equal(norm.oralMucosaStatus.color, "pale_pink_normal", "СОПР бледно-розовая, чистая");
			assert.ok(norm.generalTreatmentPlan.length > 20, "План лечения должен содержать профгигиену");
		});

		it("1.6. Формула зубов 043/у: 1-клик пресеты формулы генерируют корректные структуры", () => {
			const intact = createIntactOdontogramRecords();
			assert.equal(Object.keys(intact).length, 32, "Все 32 зуба в интактной формуле");
			for (const toothNum of ALL_PERIO_TEETH) {
				assert.equal(intact[toothNum]?.statusCode, "healthy");
			}

			const sanitized = createSanitizedOdontogramRecords();
			assert.equal(sanitized[16]?.statusCode, "filled_satisfactory");
			assert.equal(sanitized[26]?.statusCode, "filled_satisfactory");
			assert.equal(sanitized[36]?.statusCode, "filled_satisfactory");
			assert.equal(sanitized[46]?.statusCode, "filled_satisfactory");

			const noWisdom = createWisdomExtractedOdontogramRecords();
			assert.equal(noWisdom[18]?.statusCode, "extracted_absent");
			assert.equal(noWisdom[28]?.statusCode, "extracted_absent");
			assert.equal(noWisdom[38]?.statusCode, "extracted_absent");
			assert.equal(noWisdom[48]?.statusCode, "extracted_absent");
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// БЛОК 2: МАНДАТ 8i — Амбулаторный контекст против госпитального блоата
	// ════════════════════════════════════════════════════════════════════════
	describe("2. Мандат 8i (Амбулаторный контекст): Полное отсутствие госпитального блоата", () => {
		const FORBIDDEN_HOSPITAL_TERMS = [
			"025/у",
			"025-у",
			"гемотрансфуз",
			"переливание крови",
			"койко-день",
			"паллиатив",
			"лапаротом",
			"стационар",
		];

		it("2.1. В CANONICAL_SOAP_TEMPLATES Дневника визита отсутствуют госпитальные термины", () => {
			const keys = Object.keys(CANONICAL_SOAP_TEMPLATES) as CanonicalSoapTemplateKey[];
			assert.ok(keys.length >= 13, `Ожидалось >= 13 шаблонов, получено: ${keys.length}`);

			for (const key of keys) {
				const t = CANONICAL_SOAP_TEMPLATES[key];
				const blob = `${t.title} ${t.prefilledAnamnesis ?? ""} ${t.prefilledObjective ?? ""} ${t.prefilledTreatment ?? ""}`.toLowerCase();

				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!blob.includes(term),
						`Шаблон «${key}» содержит запрещенный госпитальный термин: «${term}»`,
					);
				}
			}
		});

		it("2.2. В PERIO_EXPRESS_PRESETS пародонтограммы отсутствуют госпитальные термины", () => {
			const presetIds: PerioExpressPresetId[] = [
				"perio_norm_express",
				"pro_hygiene_express",
				"gingivitis_express",
				"periodontitis_mild_express",
				"periodontitis_moderate_express",
				"periodontitis_severe_express",
			];

			for (const id of presetIds) {
				const p = PERIO_EXPRESS_PRESETS[id];
				const blob = `${p.titleRu} ${p.defaultProtocolRu}`.toLowerCase();
				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!blob.includes(term),
						`Пресет пародонтограммы «${id}» содержит термин: «${term}»`,
					);
				}
			}
		});

		it("2.3. В пресетах челюстей и окклюзии отсутствуют термины общей хирургии и стационара", () => {
			const allPresets = [
				...UPPER_JAW_PRESETS,
				...LOWER_JAW_PRESETS,
				...OCCLUSION_PRESETS,
			];

			for (const p of allPresets) {
				const blob = `${p.titleRu} ${p.soapStatusLocalis}`.toLowerCase();
				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!blob.includes(term),
						`Пресет «${p.id}» содержит госпитальный термин: «${term}»`,
					);
				}
			}
		});

		it("2.4. Физиологическая норма Формы 043/у не содержит упоминаний 025/у или переливания крови", () => {
			const normBlob = JSON.stringify(FORM_043_PHYSIOLOGICAL_NORM).toLowerCase();
			for (const term of FORBIDDEN_HOSPITAL_TERMS) {
				assert.ok(
					!normBlob.includes(term),
					`Форма 043/у содержит запрещенный госпитальный термин: «${term}»`,
				);
			}
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// БЛОК 3: МАНДАТ 8k — CRM != Процедурный симулятор (Убийца трения)
	// ════════════════════════════════════════════════════════════════════════
	describe("3. Мандат 8k (Убийца трения): 1-клик протоколы без симуляторов кликанья", () => {
		it("3.1. Пресет 'pro_hygiene_express' генерирует комплексную запись профессиональной гигиены", () => {
			const prophy = PERIO_EXPRESS_PRESETS.pro_hygiene_express;
			assert.ok(prophy, "Пресет профгигиены должен существовать");
			assert.equal(prophy.icd10, "Z01.2");
			assert.equal(prophy.code804n, "A16.07.051");
			assert.match(prophy.titleRu, /Профгигиена/);
			assert.ok(prophy.defaultProtocolRu.includes("УЗ-скейлинг") || prophy.defaultProtocolRu.includes("ультразвук"));
			assert.ok(prophy.defaultProtocolRu.includes("Air-Flow") && prophy.defaultProtocolRu.includes("глицин"));
			assert.ok(prophy.defaultProtocolRu.includes("Bifluorid") || prophy.defaultProtocolRu.includes("фторирование"));
		});

		it("3.2. Пресеты гингивита и пародонтита 1-3 степени не требуют ручного ввода 192 точек", () => {
			const initial = createDefaultPerioTeeth(2);
			const gingivitisTeeth = applyGingivitisPreset(initial);
			assert.equal(gingivitisTeeth.length, 32);
			const gingivitisPsr = calculatePsrSextants(gingivitisTeeth);
			// При гингивите максимальный код PSR должен быть 1 или 2
			const maxGingCode = Math.max(...Object.values(gingivitisPsr).map((v) => v.code));
			assert.ok(maxGingCode >= 1 && maxGingCode <= 2, `Ожидался код PSR 1-2, фактически: ${maxGingCode}`);

			const perioMildTeeth = applyPeriodontitisMildPreset(initial);
			const perioMildPsr = calculatePsrSextants(perioMildTeeth);
			const maxMildCode = Math.max(...Object.values(perioMildPsr).map((v) => v.code));
			assert.ok(maxMildCode >= 2 && maxMildCode <= 3, `Ожидался код PSR 2-3, фактически: ${maxMildCode}`);

			const perioSevereTeeth = applyPeriodontitisSeverePreset(initial);
			const perioSeverePsr = calculatePsrSextants(perioSevereTeeth);
			const maxSevereCode = Math.max(...Object.values(perioSeverePsr).map((v) => v.code));
			assert.equal(maxSevereCode, 4, "При тяжелом пародонтите PSR должен достигать 4");
		});

		it("3.3. Детские и ортопедические экспресс-шаблоны SOAP дневника заполняются в 1 клик", () => {
			const adaptation = CANONICAL_SOAP_TEMPLATES.pediatric_adaptation;
			assert.ok(adaptation, "Детский адаптационный прием должен существовать");
			assert.equal(adaptation.category, "Детская стоматология");
			assert.equal(adaptation.defaultIcd10, "Z01.2");
			assert.ok(adaptation.prefilledTreatment?.includes("Tell-Show-Do"));

			const pulpotomy = CANONICAL_SOAP_TEMPLATES.pediatric_pulpotomy;
			assert.ok(pulpotomy);
			assert.equal(pulpotomy.category, "Детская стоматология");
			assert.equal(pulpotomy.defaultIcd10, "K04.0");
			assert.ok(pulpotomy.prefilledTreatment?.includes("Pulpotec") || pulpotomy.prefilledTreatment?.includes("МТА"));

			const zirconia = CANONICAL_SOAP_TEMPLATES.ortho_prep_zirconia_emax;
			assert.ok(zirconia);
			assert.equal(zirconia.category, "Ортопедия");
			assert.ok(
				zirconia.prefilledTreatment?.toLowerCase().includes("zro2") ||
				zirconia.prefilledTreatment?.toLowerCase().includes("e.max") ||
				zirconia.prefilledTreatment?.toLowerCase().includes("коронку"),
			);
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// БЛОК 4: МАНДАТ 8n — Суверенитет масштаба: соло-врач и небольшая клиника
	// ════════════════════════════════════════════════════════════════════════
	describe("4. Мандат 8n (Соло-врач): Автономные клинические калькуляторы без бюрократии", () => {
		it("4.1. Автономный расчет гарантии на композитные реставрации (12-24 мес.)", () => {
			// 1 поверхность (I класс) -> 24 месяца
			const w1 = calculateCompositeRestorationWarranty({
				surfacesCount: 1,
				cariesRisk: "low",
			});
			assert.equal(w1.warrantyMonths, 24, "При 1 поверхности гарантия 24 мес.");
			assert.equal(w1.serviceLifeMonths, 36, "Срок службы 36 мес.");

			// 2 поверхности (II класс, MO/OD) -> 18 месяцев
			const w2 = calculateCompositeRestorationWarranty({
				surfacesCount: 2,
				cariesRisk: "low",
			});
			assert.equal(w2.warrantyMonths, 18, "При 2 поверхностях гарантия 18 мес.");
			assert.equal(w2.serviceLifeMonths, 36, "Срок службы 36 мес.");

			// 3 поверхности (MOD) -> 12 месяцев
			const w3 = calculateCompositeRestorationWarranty({
				surfacesCount: 3,
				cariesRisk: "low",
			});
			assert.equal(w3.warrantyMonths, 12, "При 3 поверхностях гарантия 12 мес.");
			assert.equal(w3.serviceLifeMonths, 24, "Срок службы 24 мес.");

			// Высокий риск -> 12 месяцев
			const wRisk = calculateCompositeRestorationWarranty({
				surfacesCount: 1,
				cariesRisk: "high",
			});
			assert.equal(wRisk.warrantyMonths, 12, "При высоком риске гарантия 12 мес.");
		});

		it("4.2. Автономный расчет максимальной дозы карпул анестетика по массе тела (МРД)", () => {
			// Артикаин с адреналином (Ультракаин Д-С): пациент 70 кг
			const mrd70 = calculatePatientMrd({
				drugKey: "ultracain_ds",
				patientWeightKg: 70,
			});
			assert.ok(mrd70.mrdCarpules > 0, "МРД карпул должно быть > 0");
			assert.ok(mrd70.mrdCarpules >= 6 && mrd70.mrdCarpules <= 8, `Ожидалось ~7 карпул, фактически: ${mrd70.mrdCarpules}`);

			// Ребенок 20 кг
			const mrd20 = calculatePatientMrd({
				drugKey: "ultracain_ds",
				patientWeightKg: 20,
				isPediatric: true,
			});
			assert.ok(mrd20.mrdCarpules < mrd70.mrdCarpules, "МРД ребенка должно быть меньше взрослого");
			assert.ok(mrd20.mrdCarpules <= 3, `Для ребенка 20 кг ожидалось <= 3 карпул, фактически: ${mrd20.mrdCarpules}`);
		});

		it("4.3. Все канонические шаблоны являются встроенными (isBuiltIn: true) и не содержат TODO", () => {
			const keys = Object.keys(CANONICAL_SOAP_TEMPLATES) as CanonicalSoapTemplateKey[];
			for (const key of keys) {
				const t = CANONICAL_SOAP_TEMPLATES[key];
				assert.equal(t.isBuiltIn, true, `Шаблон ${key} обязан быть помечен isBuiltIn: true`);
				assert.ok(t.title.length > 3);
				assert.ok((t.prefilledAnamnesis?.length ?? 0) > 20);
				assert.ok((t.prefilledObjective?.length ?? 0) > 20);
				assert.ok((t.prefilledTreatment?.length ?? 0) > 20);

				const json = JSON.stringify(t);
				assert.ok(!json.includes("TODO"), `Шаблон ${key} не должен содержать TODO`);
			}
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// БЛОК 5: МАНДАТ 8e, 8k, 8d — Инструментальная верификация исходного кода UI
	// ════════════════════════════════════════════════════════════════════════
	describe("5. Мандаты 8e, 8k, 8d (Аудит исходного кода UI): Автономия врача, отсутствие блокировок и тач >= 44px", () => {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const webSrcDir = path.resolve(__dirname, "..");

		it("5.1. PeriodontogramChart.tsx: Тулбар 32-36px, кнопки 1-клик нормы и профгигиены, тач >= 44px", () => {
			const perioChartPath = path.join(webSrcDir, "components/perio/PeriodontogramChart.tsx");
			const perioCode = fs.readFileSync(perioChartPath, "utf-8");

			// Проверка 1-клик нормы
			assert.ok(
				perioCode.includes('data-testid="perio-toolbar-norm-1click-btn"'),
				"PeriodontogramChart должен содержать data-testid='perio-toolbar-norm-1click-btn'",
			);
			assert.ok(
				perioCode.includes("1-клик: Здоровый пародонт (Норма)"),
				"Кнопка 1-клик нормы должна называться '1-клик: Здоровый пародонт (Норма)'",
			);

			// Проверка 1-клик профгигиены
			assert.ok(
				perioCode.includes('data-testid="perio-toolbar-prophy-1click-btn"'),
				"PeriodontogramChart должен содержать data-testid='perio-toolbar-prophy-1click-btn'",
			);
			assert.ok(
				perioCode.includes("Профгигиена"),
				"Кнопка профгигиены должна присутствовать",
			);

			// Проверка тач-таргетов >= 44px и высоты тулбара 32-36px
			assert.ok(
				perioCode.includes("min-h-[44px]") && perioCode.includes("min-w-[44px]"),
				"Кнопки тулбара пародонтограммы должны иметь тач-таргеты min-h-[44px] и min-w-[44px]",
			);
			assert.ok(
				perioCode.includes("min-h-[36px]") || perioCode.includes("h-9"),
				"Тулбар пародонтограммы обязан быть однострочным плотным (32-36px, Мандат 8d)",
			);
		});

		it("5.2. JawOcclusionModal.tsx: Кнопка применения disabled={false}, авто-фоллбэк на норму и тач >= 44px", () => {
			const modalPath = path.join(webSrcDir, "components/odontogram/JawOcclusionModal.tsx");
			const modalCode = fs.readFileSync(modalPath, "utf-8");

			// Кнопка применения никогда не заблокирована
			assert.ok(
				modalCode.includes('disabled={false}'),
				"Кнопка применения JawOcclusionModal обязана иметь disabled={false} (Мандат 8e)",
			);

			// Автоматический фоллбэк на пресет нормы при пустом выборе
			assert.ok(
				modalCode.includes("ju_norm") && modalCode.includes("jl_norm") && modalCode.includes("c_orthognathic"),
				"JawOcclusionModal обязан иметь авто-фоллбэк на ju_norm, jl_norm и c_orthognathic при отсутствии ручного выбора",
			);

			// Тач-таргет >= 44px
			assert.ok(
				modalCode.includes("min-h-[44px]"),
				"Элементы ввода и кнопки JawOcclusionModal должны иметь min-h-[44px]",
			);
		});

		it("5.3. VoiceDictationAssistantModal.tsx: Кнопка 'Применить всё' disabled={false} и не блокирует врача", () => {
			const voiceModalPath = path.join(webSrcDir, "components/voice/VoiceDictationAssistantModal.tsx");
			const voiceCode = fs.readFileSync(voiceModalPath, "utf-8");

			// Кнопка применения не disabled
			assert.ok(
				voiceCode.includes("disabled={false}"),
				"Кнопка 'Применить всё' в VoiceDictationAssistantModal обязана быть disabled={false}",
			);

			// Проверка наличия информационного тоста при пустом распознавании вместо блокировки
			assert.ok(
				voiceCode.includes("Произнесите диагноз") || voiceCode.includes("showToast"),
				"Голосовой ассистент должен давать понятный тост вместо серой заблокированной кнопки",
			);
		});

		it("5.4. completeClinicalVisitAndAssembleEstimate: Пустой визит не падает, а генерирует консультацию", () => {
			const result = completeClinicalVisitAndAssembleEstimate({
				visitId: "test-visit-1",
				patientId: "patient-1",
				patientName: "Иванов Иван Иванович",
				doctorName: "Д-р Смирнов А.В.",
				diary: {
					anamnesis: "",
					statusLocalis: "",
					treatmentDescription: "",
				},
			});

			assert.ok(result, "Результат должен сформироваться");
			assert.equal(result.items.length, 1, "При пустом дневнике должна добавиться первичная консультация");
			assert.equal(result.items[0]?.code, "B01.065.001");
			assert.equal(result.totalGrossRub, 1500);
			assert.equal(result.totalNetRub, 1500);
			assert.equal(result.status, "ready_for_payment");
		});

		it("5.5. completeClinicalVisitAndAssembleEstimate: Врач имеет право на 100% скидку (гарантия/персонал)", () => {
			const result = completeClinicalVisitAndAssembleEstimate({
				visitId: "test-visit-warranty",
				patientId: "patient-2",
				patientName: "Петрова Анна Сергеевна",
				doctorName: "Д-р Смирнов А.В.",
				diary: {
					anamnesis: "Гарантийная переделка реставрации 11 зуба",
					statusLocalis: "Скол композита по режущему краю",
					treatmentDescription: "Шлифовка, полировка, коррекция реставрации",
				},
				discountPercent: 100,
			});

			assert.ok(result);
			assert.equal(result.totalNetRub, 0, "Итоговая сумма при 100% скидке должна быть 0.00 руб.");
			assert.equal(result.totalNetKop, 0, "Копейки должны быть 0");
			assert.equal(result.totalDiscountRub, result.totalGrossRub, "Скидка равна полной стоимости");
		});

		it("5.6. completeClinicalVisitAndAssembleEstimate: Автопарсинг анестезии и пломбы из дневника визита", () => {
			const result = completeClinicalVisitAndAssembleEstimate({
				visitId: "test-visit-therapy",
				patientId: "patient-3",
				patientName: "Сидоров Павел Игоревич",
				doctorName: "Д-р Смирнов А.В.",
				diary: {
					anamnesis: "Жалобы на застревание пищи в области 46 зуба",
					statusLocalis: "Зуб 46: кариозная полость на жевательной поверхности",
					treatmentDescription: "Проведена инфильтрационная анестезия Артикаин 1:200000. Препарирование полости зуба 46, пломбирование Estelite Asteria.",
				},
			});

			assert.ok(result);
			assert.ok(result.items.length >= 2, "Ожидалось не менее 2 услуг (анестезия + пломба)");
			const hasAnesthesia = result.items.some((i) => i.category === "anesthesia");
			const hasTherapy = result.items.some((i) => i.category === "therapy");
			assert.ok(hasAnesthesia, "Анестезия должна быть распознана");
			assert.ok(hasTherapy, "Терапевтическое лечение должно быть распознано");
			assert.ok(result.totalNetRub > 0, "Итоговая сумма должна быть > 0");
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// БЛОК 6: МАНДАТЫ 8e, 8k — Экспресс-пресеты одонтограммы, ToothStatusPalette и Visiograph
	// ════════════════════════════════════════════════════════════════════════
	describe("6. Мандаты 8e, 8k: 1-клик клинические экспресс-пресеты зубной формулы и молниеносный визиограф", () => {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const webSrcDir = path.resolve(__dirname, "..");

		it("6.1. FAST_TOOTH_PRESETS содержит обязательные клинические экспресс-пресеты", () => {
			assert.ok(Array.isArray(FAST_TOOTH_PRESETS), "FAST_TOOTH_PRESETS должен быть массивом");
			const ids = FAST_TOOTH_PRESETS.map((p) => p.id);
			assert.ok(ids.includes("intact_dentition"), "Должен присутствовать пресет Интактный зубной ряд");
			assert.ok(ids.includes("pro_hygiene_done"), "Должен присутствовать пресет Профгигиена выполнена");
			assert.ok(ids.includes("fast_caries_k021"), "Должен присутствовать пресет Быстрая пломба K02.1");
			assert.ok(ids.includes("wisdom_missing"), "Должен присутствовать пресет Адентия 8-ок");
		});

		it("6.2. applyFastCariesK021Protocol: Генерирует регламентный протокол 043/у и услугу A16.07.002.001", () => {
			const protocol = applyFastCariesK021Protocol(16);
			assert.ok(protocol.statusLocalis.includes("16"), "Status localis должен содержать номер зуба 16");
			assert.ok(protocol.statusLocalis.includes("кариозная полость"), "Status localis должен описывать кариозную полость");
			assert.ok(protocol.diagnosis.includes("K02.1"), "Диагноз должен содержать код МКБ K02.1");
			assert.ok(protocol.treatment.includes("Артикаин"), "Лечение должно содержать протокол анестезии");
			assert.ok(protocol.treatment.includes("композит"), "Лечение должно содержать пломбирование композитом");
			assert.equal(protocol.serviceCode, "A16.07.002.001", "Код услуги Номенклатуры 804н должен быть A16.07.002.001");
			assert.equal(protocol.price, 4500, "Стоимость пломбы должна быть 4500 руб.");
		});

		it("6.3. applyFastProHygieneProtocol: Генерирует протокол 043/у УЗ + Air-Flow и услугу A16.07.051", () => {
			const protocol = applyFastProHygieneProtocol();
			assert.ok(protocol.statusLocalis.includes("зубной камень"), "Status localis должен описывать зубные отложения");
			assert.ok(protocol.diagnosis.includes("Z01.2"), "Диагноз должен содержать Z01.2");
			assert.ok(protocol.diagnosis.includes("K05.0"), "Диагноз должен содержать K05.0");
			assert.ok(protocol.treatment.includes("ультразвуковой скейлинг"), "Лечение должно содержать УЗ-скейлинг");
			assert.ok(protocol.treatment.includes("Air-Flow"), "Лечение должно содержать воздушно-абразивную обработку");
			assert.ok(protocol.treatment.includes("Bifluorid"), "Лечение должно содержать глубокое фторирование");
			assert.equal(protocol.serviceCode, "A16.07.051", "Код услуги Номенклатуры 804н должен быть A16.07.051");
			assert.equal(protocol.price, 5500, "Стоимость профгигиены должна быть 5500 руб.");
		});

		it("6.4. ToothChart.tsx: Содержит кнопки 1-клик экспресс-действий и правильные testid", () => {
			const toothChartPath = path.resolve(__dirname, "../components/odontogram/ToothChart.tsx");
			const source = fs.readFileSync(toothChartPath, "utf-8");

			assert.ok(source.includes("tooth-chart-mark-intact-btn"), "ToothChart обязан содержать кнопку Санирован / Интактный");
			assert.ok(source.includes("tooth-chart-mark-pro-hygiene-btn"), "ToothChart обязан содержать кнопку Профгигиена");
			assert.ok(source.includes("tooth-chart-apply-fast-caries-btn"), "ToothChart обязан содержать кнопку Быстрая пломба K02.1");
			assert.ok(source.includes("tooth-chart-mark-wisdom-missing-btn"), "ToothChart обязан содержать кнопку Без 8-ок");
			assert.ok(source.includes("onMarkProHygieneDone"), "ToothChartProps обязан поддерживать onMarkProHygieneDone");
			assert.ok(source.includes("onApplyFastCariesK021"), "ToothChartProps обязан поддерживать onApplyFastCariesK021");
		});

		it("6.5. OdontogramToolbar.tsx: Содержит пункты меню 1-клик действий в инструментах", () => {
			const toolbarPath = path.resolve(__dirname, "../components/odontogram/OdontogramToolbar.tsx");
			const source = fs.readFileSync(toolbarPath, "utf-8");

			assert.ok(source.includes("tools-menu-mark-intact-btn"), "Toolbar обязан содержать пункт Интактный зубной ряд");
			assert.ok(source.includes("tools-menu-mark-wisdom-missing-btn"), "Toolbar обязан содержать пункт Адентия 8-ок");
			assert.ok(source.includes("tools-menu-mark-pro-hygiene-btn"), "Toolbar обязан содержать пункт Профгигиена");
			assert.ok(source.includes("tools-menu-apply-fast-caries-btn"), "Toolbar обязан содержать пункт Быстрая пломба K02.1");
		});

		it("6.6. VisiographAnalyzer: Мгновенное открытие снимка (<50мс) без блокировки ИИ (Мандат 8e)", () => {
			const canonicalPath = path.resolve(__dirname, "../components/visiograph/VisiographAnalyzer.tsx");
			const implPath = path.resolve(__dirname, "../components/imaging/VisiographAnalyzer.tsx");

			assert.ok(fs.existsSync(canonicalPath), "Канонический путь components/visiograph/VisiographAnalyzer.tsx обязан существовать");
			assert.ok(fs.existsSync(implPath), "Реализация components/imaging/VisiographAnalyzer.tsx обязана существовать");

			const source = fs.readFileSync(implPath, "utf-8");
			// Проверка: снимок читается сразу через processFile
			assert.ok(source.includes("processFile"), "Снимок должен обрабатываться через мгновенный processFile");
			// Проверка: ИИ запускается строго по отдельной кнопке врача
			assert.ok(source.includes("handleRunAiAnalysis"), "ИИ анализ должен запускаться только врачом через handleRunAiAnalysis");
		});
	});

	// ════════════════════════════════════════════════════════════════════════
	// БЛОК 7: МАНДАТЫ 8e, 8k, 8d — Детские пресеты по возрасту и пародонтит
	// ════════════════════════════════════════════════════════════════════════
	describe("7. Мандаты 8e, 8k, 8d: Детские возрастные пресеты (3, 6, 9, 12 лет) и тяжелый пародонтит", () => {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const webSrcDir = path.resolve(__dirname, "..");

		it("7.1. calculatePediatricPhysiologicalNorm: 3 года (молочный прикус 51–85, 0% резорбция)", () => {
			const norm3y = calculatePediatricPhysiologicalNorm("primary");
			assert.equal(norm3y.targetAgeYears, 3.0);
			assert.equal(norm3y.teethNumbers.length, 20, "Должно быть ровно 20 молочных зубов");
			assert.ok(norm3y.teethNumbers.includes(51) && norm3y.teethNumbers.includes(85));
			assert.equal(norm3y.diagnosisIcd10, "Z01.2");
			assert.ok(norm3y.statusLocalisRu.includes("Временный прикус"));
			for (const toothNum of norm3y.teethNumbers) {
				assert.equal(norm3y.resorptionStages[toothNum], 0, `Зуб ${toothNum} должен иметь 0% резорбцию`);
			}
		});

		it("7.2. calculatePediatricPhysiologicalNorm: 6 лет (первые моляры 16, 26, 36, 46 + 20 молочных)", () => {
			const norm6y = calculatePediatricPhysiologicalNorm("first_molar");
			assert.equal(norm6y.targetAgeYears, 6.0);
			assert.equal(norm6y.teethNumbers.length, 24, "Должно быть 24 зуба (4 моляра + 20 молочных)");
			assert.ok(norm6y.teethNumbers.includes(16) && norm6y.teethNumbers.includes(46));
			assert.equal(norm6y.diagnosisIcd10, "Z01.2");
			assert.ok(norm6y.statusLocalisRu.includes("16, 26, 36, 46"));
		});

		it("7.3. calculatePediatricPhysiologicalNorm: 9 лет (сменный прикус: резцы 11..42, моляры 16..46, молочные 53..85)", () => {
			const norm9y = calculatePediatricPhysiologicalNorm("mixed");
			assert.equal(norm9y.targetAgeYears, 9.0);
			assert.equal(norm9y.teethNumbers.length, 24, "Должно быть 24 зуба");
			assert.ok(norm9y.teethNumbers.includes(11) && norm9y.teethNumbers.includes(21));
			assert.ok(norm9y.teethNumbers.includes(55) && norm9y.teethNumbers.includes(85));
			assert.equal(norm9y.diagnosisIcd10, "Z01.2");
			assert.ok(norm9y.statusLocalisRu.includes("Сменный прикус"));
		});

		it("7.4. calculatePediatricPhysiologicalNorm: 12 лет (постоянный прикус 28 зубов 17..27, 47..37)", () => {
			const norm12y = calculatePediatricPhysiologicalNorm("permanent");
			assert.equal(norm12y.targetAgeYears, 12.0);
			assert.equal(norm12y.teethNumbers.length, 28, "Должно быть 28 постоянных зубов без 8-ок");
			assert.ok(norm12y.teethNumbers.includes(17) && norm12y.teethNumbers.includes(27));
			assert.ok(!norm12y.teethNumbers.includes(18) && !norm12y.teethNumbers.includes(48), "Зубы мудрости не должны входить в формулу 12 лет");
			assert.equal(norm12y.diagnosisIcd10, "Z01.2");
		});

		it("7.5. CANONICAL_PEDIATRIC_AGE_PRESETS содержит 4 канонических возраста", () => {
			assert.equal(CANONICAL_PEDIATRIC_AGE_PRESETS.length, 4);
			const ages = CANONICAL_PEDIATRIC_AGE_PRESETS.map((p) => p.ageYears);
			assert.deepEqual(ages, [3, 6, 9, 12]);
		});

		it("7.6. pediatricMixedDentitionEngine.ts реэкспортирует весь API без потери типов", async () => {
			const shimPath = path.resolve(webSrcDir, "components/odontogram/pediatricMixedDentitionEngine.ts");
			assert.ok(fs.existsSync(shimPath), "Файл pediatricMixedDentitionEngine.ts обязан существовать");
			const content = fs.readFileSync(shimPath, "utf-8");
			assert.ok(content.includes('export * from "./pediatricDentitionEngine"'));
		});

		it("7.7. PediatricMixedDentitionModal.tsx содержит кнопки 1-клик норм по возрасту и карточки", () => {
			const modalPath = path.resolve(webSrcDir, "components/odontogram/PediatricMixedDentitionModal.tsx");
			const source = fs.readFileSync(modalPath, "utf-8");
			assert.ok(source.includes("pediatric-preset-3y-btn"), "Кнопка 3 года должна присутствовать");
			assert.ok(source.includes("pediatric-preset-6y-btn"), "Кнопка 6 лет должна присутствовать");
			assert.ok(source.includes("pediatric-preset-9y-btn"), "Кнопка 9 лет должна присутствовать");
			assert.ok(source.includes("pediatric-preset-12y-btn"), "Кнопка 12 лет должна присутствовать");
			assert.ok(source.includes("pediatric-preset-saforide-btn"), "Кнопка Сафорайд должна присутствовать");
			assert.ok(source.includes("pediatric-preset-fissurit-btn"), "Кнопка Фиссурит должна присутствовать");
			assert.ok(source.includes("pediatric-preset-pulpotec-btn"), "Кнопка Пульпотек должна присутствовать");
		});

		it("7.8. PeriodontalChartingModal.tsx содержит кнопку 'Пародонтит тяжелый (6-8 мм)' (perio-preset-severe-btn)", () => {
			const perioModalPath = path.resolve(webSrcDir, "components/odontogram/PeriodontalChartingModal.tsx");
			const source = fs.readFileSync(perioModalPath, "utf-8");
			assert.ok(source.includes("perio-preset-severe-btn"), "Кнопка perio-preset-severe-btn обязана присутствовать в тулбаре");
			assert.ok(source.includes("handleApplySeverePeriodontitisPreset"), "Обработчик handleApplySeverePeriodontitisPreset обязан присутствовать");
		});

		it("7.9. VisitAnamnesisTab.tsx реализует debounced autosave для автономии врача (Мандат 8e)", () => {
			const anamnesisPath = path.resolve(webSrcDir, "components/visit/VisitAnamnesisTab.tsx");
			const source = fs.readFileSync(anamnesisPath, "utf-8");
			assert.ok(source.includes("debounce") || source.includes("setTimeout"), "VisitAnamnesisTab обязан содержать debounced сохранение");
			assert.ok(source.includes("clearTimeout"), "VisitAnamnesisTab обязан очищать таймер при размонтировании");
		});
	});
});


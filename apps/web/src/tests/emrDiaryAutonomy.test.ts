/**
 * emrDiaryAutonomy.test.ts
 *
 * DENTE Dental CRM — ЭМК, Дневник визита SOAP, форма 043/у и автономия врача
 * Декомпозиция в рамках Мандатов 8b, 8e, 8i, 8k, 8n, 8zi:
 * - Аудит дневников визитов по стандарту SOAP и 1-клик шаблоны (Мандат 8e).
 * - Подписание, debounced autosave и версионная правка («Исправленному верить»).
 * - Отсутствие чужеродного госпитального блоата в амбулаторном экране врача (Мандат 8i).
 * - Автономные клинические калькуляторы (МРД, гарантии) и расчет сметы (Мандат 8n).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { calculatePatientMrd } from "@dental/shared";
import {
	CANONICAL_SOAP_TEMPLATES,
	CLINICAL_SOAP_PRESETS,
	type CanonicalSoapTemplateKey,
} from "../components/visit/clinicalSoapPresets.js";
import {
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
} from "../components/emr/templates/clinicalDiaryTemplatesEngine.js";
import {
	PHYSIOLOGICAL_NORM_PRESET,
} from "../components/emr/templates/clinicalDiaryTemplatesCatalogData.js";
import {
	FORM_043_PHYSIOLOGICAL_NORM,
	createForm043PhysiologicalNorm,
	calculateCompositeRestorationWarranty,
} from "../lib/clinicalProtocols.js";
import { completeClinicalVisitAndAssembleEstimate } from "../components/visit/clinicalVisitWorkflow.js";
import { applyFastCariesK021Protocol } from "../components/odontogram/ToothChart.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "..");

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

describe("EMR SOAP Diary & Doctor Autonomy Suite (Mandates 8e, 8i, 8n, 8zi)", () => {
	describe("1. Дневники визита SOAP, форма 043/у и амбулаторный контекст (Мандаты 8e, 8i)", () => {
		it("1.1. Форма 043/у: createForm043PhysiologicalNorm заполняет анамнез, прикус, СОПР и план нормой", () => {
			const norm = createForm043PhysiologicalNorm();
			assert.ok(norm.chiefComplaint.length > 10, "Жалобы должны содержать плановый осмотр");
			assert.ok(norm.historyOfPresentIllness.toLowerCase().includes("санирован"), "Анамнез morbi должен быть заполнен");
			assert.ok(norm.allergologicalHistory.includes("не отягощен"), "Аллергоанамнез не отягощен");
			assert.ok(norm.concomitantDiseases.toLowerCase().includes("отрицает"), "Соматические заболевания отрицает");
			assert.equal(norm.biteType, "orthognathic", "Прикус ортогнатический");
			assert.equal(norm.oralMucosaStatus.color, "pale_pink_normal", "СОПР бледно-розовая, чистая");
			assert.ok(norm.generalTreatmentPlan.length > 20, "План лечения должен содержать профгигиену");
		});

		it("1.2. В CANONICAL_SOAP_TEMPLATES Дневника визита отсутствуют госпитальные термины", () => {
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

		it("1.3. Физиологическая норма Формы 043/у не содержит упоминаний 025/у или переливания крови", () => {
			const normBlob = JSON.stringify(FORM_043_PHYSIOLOGICAL_NORM).toLowerCase();
			for (const term of FORBIDDEN_HOSPITAL_TERMS) {
				assert.ok(
					!normBlob.includes(term),
					`Форма 043/у содержит запрещенный госпитальный термин: «${term}»`,
				);
			}
		});

		it("1.4. В CLINICAL_SOAP_PRESETS отсутствуют запрещенные госпитальные термины", () => {
			assert.ok(CLINICAL_SOAP_PRESETS.length > 0, "Ожидались пресеты SOAP");
			for (const preset of CLINICAL_SOAP_PRESETS) {
				const blob = `${preset.title} ${preset.complaint} ${preset.anamnesis} ${preset.statusLocalis} ${preset.treatmentDescription}`.toLowerCase();
				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!blob.includes(term),
						`Пресет «${preset.id}» содержит запрещенный госпитальный термин: «${term}»`,
					);
				}
			}
		});

		it("1.5. В шаблонах ЭМК (PHYSIOLOGICAL_NORM_PRESET, CLINICAL_1CLICK_TEMPLATES_CATALOG) нет госпитального блоата", () => {
			const allDiaryTemplates = [
				PHYSIOLOGICAL_NORM_PRESET,
				...CLINICAL_1CLICK_TEMPLATES_CATALOG,
			];
			for (const t of allDiaryTemplates) {
				const blob = `${t.title} ${t.defaultSubjectiveComplaints} ${t.defaultAnamnesisMorbi} ${t.defaultObjectiveStatus} ${t.defaultProcedureProtocol}`.toLowerCase();
				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!blob.includes(term),
						`Шаблон ЭМК «${t.id}» содержит запрещенный госпитальный термин: «${term}»`,
					);
				}
			}
		});

		it("1.6. Детские и ортопедические экспресс-шаблоны SOAP дневника заполняются в 1 клик", () => {
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

		it("1.7. Все канонические шаблоны являются встроенными (isBuiltIn: true) и не содержат TODO", () => {
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

	describe("2. Автономные клинические калькуляторы и сборка сметы визита (Мандаты 8e, 8n)", () => {
		it("2.1. Автономный расчет гарантии на композитные реставрации (12-24 мес.)", () => {
			const w1 = calculateCompositeRestorationWarranty({
				surfacesCount: 1,
				cariesRisk: "low",
			});
			assert.equal(w1.warrantyMonths, 24, "При 1 поверхности гарантия 24 мес.");
			assert.equal(w1.serviceLifeMonths, 36, "Срок службы 36 мес.");

			const w2 = calculateCompositeRestorationWarranty({
				surfacesCount: 2,
				cariesRisk: "low",
			});
			assert.equal(w2.warrantyMonths, 18, "При 2 поверхностях гарантия 18 мес.");
			assert.equal(w2.serviceLifeMonths, 36, "Срок службы 36 мес.");

			const w3 = calculateCompositeRestorationWarranty({
				surfacesCount: 3,
				cariesRisk: "low",
			});
			assert.equal(w3.warrantyMonths, 12, "При 3 поверхностях гарантия 12 мес.");
			assert.equal(w3.serviceLifeMonths, 24, "Срок службы 24 мес.");

			const wRisk = calculateCompositeRestorationWarranty({
				surfacesCount: 1,
				cariesRisk: "high",
			});
			assert.equal(wRisk.warrantyMonths, 12, "При высоком риске гарантия 12 мес.");
		});

		it("2.2. Автономный расчет максимальной дозы карпул анестетика по массе тела (МРД)", () => {
			const mrd70 = calculatePatientMrd({
				drugKey: "ultracain_ds",
				patientWeightKg: 70,
			});
			assert.ok(mrd70.mrdCarpules > 0, "МРД карпул должно быть > 0");
			assert.ok(mrd70.mrdCarpules >= 6 && mrd70.mrdCarpules <= 8, `Ожидалось ~7 карпул, фактически: ${mrd70.mrdCarpules}`);

			const mrd20 = calculatePatientMrd({
				drugKey: "ultracain_ds",
				patientWeightKg: 20,
				isPediatric: true,
			});
			assert.ok(mrd20.mrdCarpules < mrd70.mrdCarpules, "МРД ребенка должно быть меньше взрослого");
			assert.ok(mrd20.mrdCarpules <= 3, `Для ребенка 20 кг ожидалось <= 3 карпул, фактически: ${mrd20.mrdCarpules}`);
		});

		it("2.3. completeClinicalVisitAndAssembleEstimate: Пустой визит не падает, а генерирует консультацию", () => {
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

		it("2.4. completeClinicalVisitAndAssembleEstimate: Врач имеет право на 100% скидку (гарантия/персонал)", () => {
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

		it("2.5. completeClinicalVisitAndAssembleEstimate: Автопарсинг анестезии и пломбы из дневника визита", () => {
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

		it("2.6. applyFastCariesK021Protocol: Генерирует регламентный протокол 043/у и услугу A16.07.002.001", () => {
			const protocol = applyFastCariesK021Protocol(16);
			assert.ok(protocol.statusLocalis.includes("16"), "Status localis должен содержать номер зуба 16");
			assert.ok(protocol.statusLocalis.includes("кариозная полость"), "Status localis должен описывать кариозную полость");
			assert.ok(protocol.diagnosis.includes("K02.1"), "Диагноз должен содержать код МКБ K02.1");
			assert.ok(protocol.treatment.includes("Артикаин"), "Лечение должно содержать протокол анестезии");
			assert.ok(protocol.treatment.includes("композит"), "Лечение должно содержать пломбирование композитом");
			assert.equal(protocol.serviceCode, "A16.07.002.001", "Код услуги Номенклатуры 804н должен быть A16.07.002.001");
			assert.equal(protocol.price, 4500, "Стоимость пломбы должна быть 4500 руб.");
		});
	});

	describe("3. Врачебная автономия и ликвидация блокировок UI (Мандаты 8e, 8d, 8k, 8n)", () => {
		it("3.1. CopilotVoiceStenographer.tsx: Кнопка 'Применить в карту' disabled={false} и не блокирует врача", () => {
			const voiceModalPath = path.join(webSrcDir, "components/copilot/CopilotVoiceStenographer.tsx");
			const voiceCode = fs.readFileSync(voiceModalPath, "utf-8");

			assert.ok(
				voiceCode.includes("disabled={false}"),
				"Кнопка 'Применить в карту' в CopilotVoiceStenographer обязана быть disabled={false}",
			);
			assert.ok(
				voiceCode.includes("handleApplyAll"),
				"Голосовой стенограф приёма должен мгновенно применять распознанный протокол",
			);
		});

		it("3.2. VisiographAnalyzer: Мгновенное открытие снимка (<50мс) без блокировки ИИ (Мандат 8e)", () => {
			const implPath = path.resolve(__dirname, "../components/imaging/VisiographAnalyzer.tsx");
			const modulePath = path.resolve(__dirname, "../components/imaging/visiographAnalyzer/useVisiographAnalyzer.ts");
			assert.ok(fs.existsSync(implPath), "Реализация components/imaging/VisiographAnalyzer.tsx обязана существовать");
			const source = fs.readFileSync(implPath, "utf-8") + (fs.existsSync(modulePath) ? fs.readFileSync(modulePath, "utf-8") : "");
			assert.ok(source.includes("processFile"), "Снимок должен обрабатываться через мгновенный processFile");
			assert.ok(source.includes("handleRunAiAnalysis"), "ИИ анализ должен запускаться только врачом через handleRunAiAnalysis");
		});

		it("3.3. VisitAnamnesisTab.tsx реализует debounced autosave для автономии врача (Мандат 8e)", () => {
			const anamnesisPath = path.resolve(webSrcDir, "components/visit/VisitAnamnesisTab.tsx");
			const autosavePath = path.resolve(webSrcDir, "components/visit/anamnesisTab/useAnamnesisAutosave.ts");
			const source = fs.readFileSync(anamnesisPath, "utf-8") + (fs.existsSync(autosavePath) ? fs.readFileSync(autosavePath, "utf-8") : "");
			assert.ok(source.includes("debounce") || source.includes("setTimeout"), "VisitAnamnesisTab обязан содержать debounced сохранение");
			assert.ok(source.includes("clearTimeout"), "VisitAnamnesisTab обязан очищать таймер при размонтировании");
		});

		it("3.4. TreatmentEstimator.tsx кнопка 'В кассу (54-ФЗ)' не имеет мертвого disabled блокировщика", () => {
			const estPath = path.resolve(webSrcDir, "components/odontogram/TreatmentEstimator.tsx");
			const source = fs.readFileSync(estPath, "utf-8");
			assert.ok(!source.includes("disabled={treatmentPlanItemsForFiscalModal.length === 0}"), "Кнопка фискализации 54-ФЗ не должна быть заблокирована disabled");
			assert.ok(source.includes("В смете нет позиций с подтвержденной ценой"), "Кнопка должна выводить информативное уведомление при нажатии");
		});

		it("3.5. VisiographAnalyzer.tsx перенос находок не заблокирован при пустом выделении", () => {
			const visPath = path.resolve(webSrcDir, "components/imaging/VisiographAnalyzer.tsx");
			const applyPath = path.resolve(webSrcDir, "components/imaging/visiographAnalyzer/useVisiographAnalyzer/useVisiographAnalyzerFindingsApply.ts");
			const source = fs.readFileSync(visPath, "utf-8") + (fs.existsSync(applyPath) ? fs.readFileSync(applyPath, "utf-8") : "");
			assert.ok(!source.includes("disabled={isApplyingToChart || selectedFindingCodes.size === 0}"), "Кнопка переноса находок не должна быть заблокирована по признаку selectedFindingCodes.size === 0");
			assert.ok(source.includes("Отметьте галочками хотя бы одну находку ИИ"), "Обработчик должен уведомлять врача через тост при пустом выборе");
		});

		it("3.6. DicomViewerModal.tsx кнопки анализа и переноса находок не заблокированы мертвым disabled", () => {
			const dicomPath = path.resolve(webSrcDir, "components/imaging/DicomViewerModal.tsx");
			const source = fs.readFileSync(dicomPath, "utf-8");
			assert.ok(!source.includes("disabled={isAnalyzing || !currentImageSrc}"), "Кнопка ИИ-анализа не должна быть заблокирована по признаку !currentImageSrc");
			assert.ok(!source.includes("disabled={isApplyingToChart || selectedFindingCodes.size === 0}"), "Кнопка переноса находок не должна быть заблокирована по признаку selectedFindingCodes.size === 0");
		});

		it("3.7. OrthopedicsChairsidePanel.tsx клинический оверрайд врача снимает блокировку протоколов", () => {
			const orthoPath = path.resolve(webSrcDir, "components/orthopedics/OrthopedicsChairsidePanel.tsx");
			const source = fs.readFileSync(orthoPath, "utf-8");
			assert.ok(source.includes("disabled={isLocked && !overrideActive}") || !source.includes("disabled={isLocked"), "Кнопка протокола должна разблокироваться при overrideActive = true (Мандат 8e)");
			assert.ok(source.includes("isLocked && !overrideActive"), "Проверка блокировки в handleApplyProtocol обязана учитывать клинический оверрайд врача");
		});

		it("3.8. OrthopedicsChairsidePanel.tsx содержит 1-клик стандарты ЗТЛ, VITA Classical & 3D-Master и мгновенную отправку без барьеров", () => {
			const orthoPath = path.resolve(webSrcDir, "components/orthopedics/OrthopedicsChairsidePanel.tsx");
			const source = fs.readFileSync(orthoPath, "utf-8");
			assert.ok(source.includes("STANDARD_ZTL_ORDER_PRESETS"), "Панель ортопедии должна объявлять стандартные наряды ЗТЛ");
			assert.ok(source.includes("VITA_3D_MASTER_SHADE_GROUPS"), "Панель ортопедии должна поддерживать группы VITA 3D-Master");
			assert.ok(source.includes("data-testid=\"direct-send-lab-order-btn\""), "Панель ортопедии должна предоставлять кнопку 1-клик отправки в ЗТЛ");
			assert.ok(source.includes("data-testid=\"vita-3d-master-tab\""), "Панель ортопедии должна содержать переключатель на VITA 3D-Master");
		});

		it("3.9. documentPackages.ts: пакет направления адаптирован под стоматологический амбулаторный контекст (Форма 043/у)", () => {
			const docPackagesPath = path.resolve(webSrcDir, "utils/documentPackages.ts");
			const source = fs.readFileSync(docPackagesPath, "utf-8");
			assert.ok(source.includes("dental_medical_card_043u"), "Пакет направления обязан включать стоматологическую карту 043/у вместо поликлинической 025/у");
			assert.ok(source.includes("Стоматологический пакет направления"), "Название пакета должно отражать стоматологический профиль");
		});

		it("3.10. PatientsView.tsx: Кнопка 'Открыть приём' и запись в расписание не имеют мертвого disabled блокировщика", () => {
			const patientsViewPath = path.resolve(webSrcDir, "PatientsView.tsx");
			const source = fs.readFileSync(patientsViewPath, "utf-8");
			assert.ok(!source.includes('disabled={!selectedPatient}'), "PatientsView не должен содержать disabled={!selectedPatient}");
			assert.ok(source.includes('data-testid="patient-card-open-visit-btn"'), "Кнопка 'Открыть приём' должна присутствовать");
			assert.ok(source.includes("Выберите пациента из списка слева для открытия приёма"), "Кнопка 'Открыть приём' должна выводить информативное уведомление при нажатии");
			assert.ok(source.includes('data-testid="patient-card-book-appointment-btn"'), "Кнопка 'Записать в расписание' должна присутствовать");
			assert.ok(source.includes("Выберите пациента из списка слева для записи в расписание"), "Кнопка записи должна выводить информативное уведомление при нажатии");
		});

		it("3.11. EmkObjectiveStatusSection и EmkComplaintsSection: 0-клик пресеты нормы осмотра (санирована, прикус, слизистая)", () => {
			const objPath = path.resolve(webSrcDir, "components/visit/emk/EmkObjectiveStatusSection.tsx");
			const objSource = fs.readFileSync(objPath, "utf-8");
			assert.ok(objSource.includes('data-testid="emk-objective-norm-presets-bar"'), "Панель 0-клик норм объективного статуса обязана присутствовать");
			assert.ok(objSource.includes('data-testid="btn-emk-full-objective-norm"'), "Кнопка '0-Клик: Полная норма осмотра' обязана присутствовать");
			assert.ok(objSource.includes('data-testid="btn-emk-sanitized-norm"'), "Кнопка 'Полость рта санирована / норма' обязана присутствовать");
			assert.ok(objSource.includes('data-testid="btn-emk-bite-norm"'), "Кнопка 'Прикус физиологический / ортогнатический' обязана присутствовать");
			assert.ok(objSource.includes('data-testid="btn-emk-mucosa-norm"'), "Кнопка 'Слизистая интактна' обязана присутствовать");

			const compPath = path.resolve(webSrcDir, "components/visit/emk/EmkComplaintsSection.tsx");
			const compSource = fs.readFileSync(compPath, "utf-8");
			assert.ok(compSource.includes('data-testid="btn-emk-complaints-norm"'), "Кнопка 0-клик нормы жалоб обязана присутствовать");
			assert.ok(compSource.includes('data-testid="btn-emk-anamnesis-norm"'), "Кнопка 0-клик нормы анамнеза обязана присутствовать");
		});

		it("3.12. VisitServiceBillingWidget.tsx строго <= 800 строк и отсутствие блокирующих window.alert/confirm", () => {
			const billingWidgetPath = path.resolve(webSrcDir, "components/visit/VisitServiceBillingWidget.tsx");
			const billingSource = fs.readFileSync(billingWidgetPath, "utf-8");
			const billingLines = billingSource.split("\n").length;
			assert.ok(billingLines <= 800, `VisitServiceBillingWidget.tsx обязан быть <= 800 строк (Мандат 8b), получено: ${billingLines}`);

			const emkFiles = [
				"components/visit/emk/EmkObjectiveStatusSection.tsx",
				"components/visit/emk/EmkComplaintsSection.tsx",
				"components/visit/emk/EmkSomaticCard.tsx",
				"components/visit/emk/EmkDiaryProtocolSection.tsx",
			];
			for (const file of emkFiles) {
				const src = fs.readFileSync(path.resolve(webSrcDir, file), "utf-8");
				assert.ok(!src.includes("window.alert"), `${file} не должен содержать window.alert`);
				assert.ok(!src.includes("window.confirm"), `${file} не должен содержать window.confirm`);
			}
		});
	});
});

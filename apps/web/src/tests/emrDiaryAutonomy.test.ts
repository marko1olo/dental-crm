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
	PHYSIOLOGICAL_NORM_PRESET,
} from "../components/emr/templates/clinicalDiaryTemplatesEngine.js";
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
		it("3.1. CopilotVoiceStenographer, DicomViewerModal, OrthopedicsChairsidePanel и секции ЭМК рендерятся без мёртвых disabled-блокировок", async () => {
			const React = await import("react");
			const { renderToStaticMarkup } = await import("react-dom/server");
			const { CopilotVoiceStenographer } = await import("../components/copilot/CopilotVoiceStenographer.js");
			const { DicomViewerModal } = await import("../components/imaging/DicomViewerModal.js");
			const { OrthopedicsChairsidePanel } = await import("../components/orthopedics/OrthopedicsChairsidePanel.js");
			const { EmkObjectiveStatusSection } = await import("../components/visit/emk/EmkObjectiveStatusSection.js");
			const { EmkComplaintsSection } = await import("../components/visit/emk/EmkComplaintsSection.js");

			const voiceHtml = renderToStaticMarkup(
				React.createElement(CopilotVoiceStenographer, { isOpen: true, patientName: "Иванов И." }),
			);
			assert.equal(/<button[^>]*\bdisabled\b/i.test(voiceHtml), false);

			const dicomHtml = renderToStaticMarkup(
				React.createElement(DicomViewerModal, { isOpen: true, onClose: () => {}, patientName: "Иванов И." }),
			);
			assert.ok(dicomHtml.includes('data-testid="dicom-viewer-modal"'));
			assert.equal(dicomHtml.includes('data-testid="btn-dicom-run-ai" disabled'), false);

			const orthoHtml = renderToStaticMarkup(
				React.createElement(OrthopedicsChairsidePanel, {
					patientId: "pat-1",
					patientName: "Иванов И.",
					doctorName: "Смирнов А.В.",
				} as never),
			);
			assert.ok(orthoHtml.includes('data-testid="direct-send-lab-order-btn"'));
			assert.ok(orthoHtml.includes('data-testid="vita-3d-master-tab"'));

			const emptyForm = { complaint: "", anamnesis: "", objectiveStatus: "", diagnosis: "", treatmentPlan: "", recommendations: "" };
			const objHtml = renderToStaticMarkup(
				React.createElement(EmkObjectiveStatusSection, { visitNoteForm: emptyForm as never, updateVisitNoteField: () => {} }),
			);
			assert.ok(objHtml.includes('data-testid="emk-objective-norm-presets-bar"'));
			assert.ok(objHtml.includes('data-testid="btn-emk-full-objective-norm"'));
			assert.ok(objHtml.includes('data-testid="btn-emk-sanitized-norm"'));
			assert.ok(objHtml.includes('data-testid="btn-emk-bite-norm"'));
			assert.ok(objHtml.includes('data-testid="btn-emk-mucosa-norm"'));

			const compHtml = renderToStaticMarkup(
				React.createElement(EmkComplaintsSection, { visitNoteForm: emptyForm as never, updateVisitNoteField: () => {} }),
			);
			assert.ok(compHtml.includes('data-testid="btn-emk-complaints-norm"'));
			assert.ok(compHtml.includes('data-testid="btn-emk-anamnesis-norm"'));
		});

		it("3.2. documentPackages и PatientsView работают без блокирующих disabled-барьеров и поликлинических кодов", async () => {
			const { getDocumentPackage } = await import("../utils/documentPackages.js");
			const React = await import("react");
			const { renderToStaticMarkup } = await import("react-dom/server");
			const { PatientsView } = await import("../PatientsView.js");
			const { AppLogicProvider } = await import("../contexts/AppLogicContext.js");

			const pkg = getDocumentPackage("referral");
			assert.ok(pkg.documentKinds.includes("xray_cbct_referral"));
			assert.equal(pkg.documentKinds.some((k) => String(k) === "poly_025u"), false);

			const { AppLogicProvider: _unused, ...ctxModule } = await import("../contexts/AppLogicContext.js");
			void _unused;
			void ctxModule;
			type CtxValue = React.ComponentProps<typeof AppLogicProvider>["value"];
			const partialContext: Partial<CtxValue> = {
				dashboard: { patients: [], appointments: [], doctors: [] } as Partial<CtxValue["dashboard"]> as CtxValue["dashboard"],
				query: "",
				setQuery: () => {},
				filteredPatients: [],
				patientInsightById: new Map(),
				patientInsightRiskLabels: { low: "спокойно", watch: "контроль", high: "срочно" },
				selectedPatientId: null,
				setSelectedPatientId: () => {},
				selectedPatient: null,
				patientCoreDirty: false,
				patientCoreSaveState: "idle",
				patientCoreSaveError: null,
				patientAdministrativeProfileDirty: false,
				patientAdministrativeProfileSaveState: "idle",
				patientAdministrativeProfileSaveError: null,
				patientAdministrativeProfileValidationMessage: null,
				weekdayOptions: [],
			};
			const patientsHtml = renderToStaticMarkup(
				React.createElement(
					AppLogicProvider,
					{ value: partialContext as CtxValue },
					React.createElement(PatientsView),
				),
			);
			assert.ok(patientsHtml.includes('id="patients"') && patientsHtml.includes("patients-panel"));
			assert.equal(/<button[^>]*\sdisabled(?:=|(?=\s|>|$))/i.test(patientsHtml), false);
		});
	});
});

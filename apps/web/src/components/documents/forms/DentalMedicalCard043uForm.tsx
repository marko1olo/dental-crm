import React, { useState, useMemo, useCallback } from "react";
import { CheckCircle2, FileEdit, Printer, ShieldCheck, Sparkles, Undo2 } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateDmftFromOdontogram,
	renderForm043uHtml,
	type FullForm043uPayload,
	type ToothClinicalStatusCode,
	type ToothSurface,
	type FdiToothRecord,
	type CpitnSextantCode,
	type CpitnIndex,
	type DentalBiteType,
	dentalBiteTypeLabels,
	type OralMucosaStatus,
	toothStatusCodeLabels,
	toothStatusCodeShortMap,
} from "@dental/shared";
import {
	createForm043PhysiologicalNorm,
	createIntactOdontogramRecords,
	createSanitizedOdontogramRecords,
	createWisdomExtractedOdontogramRecords,
} from "../../../lib/clinicalProtocols043";

export interface DentalMedicalCard043uFormProps {
	initialPayload?: Partial<FullForm043uPayload> & {
		isSigned?: boolean;
		isDraft?: boolean;
		revisionCount?: number;
		revisionReason?: string;
	};
	onChange?: (payload: FullForm043uPayload) => void;
	disabled?: boolean;
}

const PERMANENT_TEETH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const PERMANENT_TEETH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const DECIDUOUS_TEETH_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const DECIDUOUS_TEETH_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const SURFACES: Array<{ key: ToothSurface; label: string }> = [
	{ key: "occlusal", label: "Оккл. (O)" },
	{ key: "vestibular", label: "Вестиб. (V)" },
	{ key: "oral", label: "Оральн. (L)" },
	{ key: "mesial", label: "Медиал. (M)" },
	{ key: "distal", label: "Дистал. (D)" },
];

const SELECTABLE_STATUSES: ToothClinicalStatusCode[] = [
	"healthy",
	"caries_media",
	"caries_profunda",
	"filled_satisfactory",
	"pulpitis_acute",
	"periodontitis_chronic",
	"crown_zirconia",
	"implant",
	"extracted_absent",
	"root_remnant",
];

const CPITN_SEXTANT_OPTIONS: Array<{ value: CpitnSextantCode; label: string; hint: string }> = [
	{ value: "0_healthy", label: "0 — Здорова (Норма)", hint: "Десна здорова, кровоточивости и карманов нет" },
	{ value: "1_bleeding", label: "1 — Кровоточивость", hint: "Кровоточивость десны при мягком зондировании" },
	{ value: "2_calculus", label: "2 — Зубной камень", hint: "Над- или поддесневой зубной камень" },
	{ value: "3_pocket_4_5mm", label: "3 — Карман 4–5 мм", hint: "Пародонтальный карман 4–5 мм" },
	{ value: "4_pocket_6mm_plus", label: "4 — Карман ≥ 6 мм", hint: "Глубокий пародонтальный карман ≥ 6 мм" },
	{ value: "x_excluded", label: "X — Секстант исключен", hint: "Менее 2 зубов в секстанте" },
];

const CPITN_TN_OPTIONS: Array<{ value: CpitnIndex["treatmentNeedCategory"]; label: string }> = [
	{ value: "0_none", label: "TN 0: Лечение не требуется (здоровый пародонт)" },
	{ value: "1_hygiene_instructions", label: "TN 1: Индивидуальная гигиена полости рта и обучение чистке" },
	{ value: "2_scaling_root_planing", label: "TN 2: Профессиональная гигиена (снятие зубных отложений) + гигиена" },
	{ value: "3_complex_periodontal", label: "TN 3: Комплексное пародонтологическое лечение (SRP / кюретаж / хирургия)" },
];

const ORAL_MUCOSA_COLORS: Array<{ value: OralMucosaStatus["color"]; label: string }> = [
	{ value: "pale_pink_normal", label: "Бледно-розовая, чистая (норма)" },
	{ value: "hyperemic_red", label: "Гиперемированная, яркая (воспаление)" },
	{ value: "cyanotic_bluish", label: "Цианотичная, синюшная (венозный застой)" },
	{ value: "anemic_pale", label: "Анемичная, бледная" },
];

const ORAL_MUCOSA_MOISTURE: Array<{ value: OralMucosaStatus["moisture"]; label: string }> = [
	{ value: "normal", label: "Умеренно увлажнена (норма)" },
	{ value: "dry_xerostomia", label: "Сухая / ксеростомия" },
	{ value: "excessive_salivation", label: "Повышенное слюноотделение (гиперсаливация)" },
];

const GINGIVAL_PAPILLAE_OPTIONS: Array<{ value: OralMucosaStatus["gingivalPapillae"]; label: string }> = [
	{ value: "normal_pointed", label: "Остроконечные, плотно прилежат к шейкам зубов (норма)" },
	{ value: "hypertrophic_swollen", label: "Гипертрофированы, отечны, цианотичны" },
	{ value: "atrophic_receded", label: "Атрофированы, рецессия десны" },
	{ value: "necrotic", label: "Некротизированы, изъязвлены" },
];

const BLEEDING_PBI_OPTIONS: Array<{ value: OralMucosaStatus["bleedingPBI"]; label: string }> = [
	{ value: "grade_0", label: "Степень 0: Кровоточивость отсутствует (норма)" },
	{ value: "grade_1", label: "Степень I: Точечные кровоизлияния через 10–30 сек." },
	{ value: "grade_2", label: "Степень II: Линейное кровотечение по десневому краю" },
	{ value: "grade_3", label: "Степень III: Кровь заполняет межзубной треугольник" },
	{ value: "grade_4", label: "Степень IV: Профузное кровотечение сразу после зондирования" },
];

export const DentalMedicalCard043uForm: React.FC<DentalMedicalCard043uFormProps> = React.memo(
	function DentalMedicalCard043uForm({ initialPayload, onChange, disabled }) {
		const [activeTab, setActiveTab] = useState<"formula" | "indices" | "anamnesis">("formula");
		const [selectedTooth, setSelectedTooth] = useState<number>(16);

		// Dental formula state: Map of toothNumber -> FdiToothRecord
		const [odontogram, setOdontogram] = useState<Record<number, FdiToothRecord>>(() => {
			const raw = initialPayload?.odontogramTeeth ?? [];
			const map: Record<number, FdiToothRecord> = {};
			for (const t of raw) {
				map[t.toothNumber] = t;
			}
			return map;
		});

		const [activeStatus, setActiveStatus] = useState<ToothClinicalStatusCode>("caries_media");

		// Live DMFT calculation
		const dmftResult = useMemo(() => {
			return calculateDmftFromOdontogram(Object.values(odontogram));
		}, [odontogram]);

		// CPITN State
		const [cpitn, setCpitn] = useState<CpitnIndex>(() => {
			return (
				initialPayload?.cpitnIndex ?? {
					sextant18_14: "0_healthy",
					sextant13_23: "0_healthy",
					sextant24_28: "0_healthy",
					sextant48_44: "0_healthy",
					sextant43_33: "0_healthy",
					sextant34_38: "0_healthy",
					treatmentNeedCategory: "0_none",
				}
			);
		});

		const [hygieneIndexOhiS, setHygieneIndexOhiS] = useState<string>(
			() => initialPayload?.hygieneIndexOhiS ?? "OHI-S = 0.8 (Хорошая)",
		);

		// Anamnesis & Complaints State
		const [chiefComplaint, setChiefComplaint] = useState<string>(
			() => initialPayload?.chiefComplaint ?? "Жалобы на боли при приеме пищи, наличие кариозной полости",
		);
		const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState<string>(
			() =>
				initialPayload?.historyOfPresentIllness ??
				"Считает себя больным в течение нескольких дней, когда впервые появились неприятные ощущения от температурных раздражителей.",
		);
		const [allergologicalHistory, setAllergologicalHistory] = useState<string>(
			() => initialPayload?.allergologicalHistory ?? "Аллергологический анамнез не отягощен. Аллергии на анестетики и медикаменты отрицает.",
		);
		const [concomitantDiseases, setConcomitantDiseases] = useState<string>(
			() => initialPayload?.concomitantDiseases ?? "Сопутствующие соматические заболевания отрицает. ВИЧ, вирусные гепатиты, туберкулез отрицает.",
		);
		const [currentMedications, setCurrentMedications] = useState<string>(
			() => initialPayload?.currentMedications ?? "Постоянный прием лекарственных препаратов отрицает.",
		);
		const [pregnancyLactationStatus, setPregnancyLactationStatus] = useState<string>(
			() => initialPayload?.pregnancyLactationStatus ?? "Нет",
		);
		const [pastDentalInterventions, setPastDentalInterventions] = useState<string>(
			() => initialPayload?.pastDentalInterventions ?? "Ранее проводилось терапевтическое лечение кариеса и профессиональная гигиена.",
		);

		// Bite State
		const [biteType, setBiteType] = useState<DentalBiteType>(
			() => initialPayload?.biteType ?? "orthognathic",
		);
		const [biteDescription, setBiteDescription] = useState<string>(
			() => initialPayload?.biteDescription ?? "Прикус ортогнатический, смыкание зубных рядов по I классу Энгля.",
		);

		// Oral Mucosa State
		const [oralMucosa, setOralMucosa] = useState<OralMucosaStatus>(() => {
			return (
				initialPayload?.oralMucosaStatus ?? {
					color: "pale_pink_normal",
					moisture: "normal",
					pathologicalElements: null,
					gingivalPapillae: "normal_pointed",
					bleedingPBI: "grade_0",
					tongueStatus: "Язык чистый, влажный, сосочки выражены умеренно",
					regionalLymphNodes: "Подчелюстные и шейные лимфоузлы не увеличены, мягкоэластичные, подвижные, безболезненные при пальпации",
					tmjFunction: "Открывание рта в полном объеме (>40 мм), свободное, безболезненное, девиации и щелчков в ВНЧС нет",
				}
			);
		});

		// X-ray & Treatment Plan State
		const [xrayFindingsDescription, setXrayFindingsDescription] = useState<string>(
			() => initialPayload?.xrayFindingsDescription ?? "Рентгенологических изменений в периапикальных тканях не выявлено.",
		);
		const [generalTreatmentPlan, setGeneralTreatmentPlan] = useState<string>(
			() =>
				initialPayload?.generalTreatmentPlan ??
				"1. Профессиональная гигиена полости рта;\n2. Санация кариозных полостей;\n3. Контрольный осмотр через 6 месяцев.",
		);

		// Clinical Autonomy & Revision State (Мандат 8e п. 4)
		const [isRevising, setIsRevising] = useState<boolean>(false);
		const [revisionCount, setRevisionCount] = useState<number>(
			() => (initialPayload as any)?.revisionCount ?? 0,
		);
		const [revisionReason, setRevisionReason] = useState<string>(
			() => (initialPayload as any)?.revisionReason ?? "Исправленному верить",
		);
		const [reviseSnapshot, setReviseSnapshot] = useState<{
			odontogram: Record<number, FdiToothRecord>;
			cpitn: CpitnIndex;
			hygieneIndexOhiS: string;
			chiefComplaint: string;
			historyOfPresentIllness: string;
			allergologicalHistory: string;
			concomitantDiseases: string;
			currentMedications: string;
			pregnancyLactationStatus: string;
			pastDentalInterventions: string;
			biteType: DentalBiteType;
			biteDescription: string;
			oralMucosa: OralMucosaStatus;
			xrayFindingsDescription: string;
			generalTreatmentPlan: string;
		} | null>(null);

		const effectiveDisabled = Boolean(disabled && !isRevising);

		const handleApplyGlobalNorm = useCallback(() => {
			const hasExistingData =
				Boolean(allergologicalHistory.trim()) ||
				Boolean(concomitantDiseases.trim()) ||
				Boolean(chiefComplaint.trim()) ||
				Boolean(historyOfPresentIllness.trim()) ||
				Boolean(currentMedications.trim()) ||
				Object.values(odontogram).some(
					(t) => t.statusCode !== "healthy" || (t.surfaces && t.surfaces.length > 0),
				);

			if (hasExistingData && !reviseSnapshot) {
				setReviseSnapshot({
					odontogram: { ...odontogram },
					cpitn: { ...cpitn },
					hygieneIndexOhiS,
					chiefComplaint,
					historyOfPresentIllness,
					allergologicalHistory,
					concomitantDiseases,
					currentMedications,
					pregnancyLactationStatus,
					pastDentalInterventions,
					biteType,
					biteDescription,
					oralMucosa: { ...oralMucosa },
					xrayFindingsDescription,
					generalTreatmentPlan,
				});
				setIsRevising(true);
			} else if (effectiveDisabled) {
				setIsRevising(true);
			}
			const intactOdonto = createIntactOdontogramRecords();
			setOdontogram(intactOdonto);

			const cleanCpitn: CpitnIndex = {
				sextant18_14: "0_healthy",
				sextant13_23: "0_healthy",
				sextant24_28: "0_healthy",
				sextant48_44: "0_healthy",
				sextant43_33: "0_healthy",
				sextant34_38: "0_healthy",
				treatmentNeedCategory: "0_none",
			};
			setCpitn(cleanCpitn);
			setHygieneIndexOhiS("OHI-S = 0.0 (Отличная гигиена полости рта)");

			const norm = createForm043PhysiologicalNorm();
			setChiefComplaint(norm.chiefComplaint);
			setHistoryOfPresentIllness(norm.historyOfPresentIllness);
			setAllergologicalHistory(norm.allergologicalHistory);
			setConcomitantDiseases(norm.concomitantDiseases);
			setCurrentMedications(norm.currentMedications);
			setPregnancyLactationStatus(norm.pregnancyLactationStatus);
			setPastDentalInterventions(norm.pastDentalInterventions);
			setBiteType(norm.biteType);
			setBiteDescription(norm.biteDescription);
			setOralMucosa(norm.oralMucosaStatus);
			setXrayFindingsDescription(norm.xrayFindingsDescription);
			setGeneralTreatmentPlan(norm.generalTreatmentPlan);

			showToast(
				"Вся Форма 043/у заполнена физиологической нормой (1 клик). Врач правит только патологию!",
				"success",
				4000,
			);
		}, [
			effectiveDisabled,
			allergologicalHistory,
			concomitantDiseases,
			chiefComplaint,
			historyOfPresentIllness,
			currentMedications,
			odontogram,
			reviseSnapshot,
			cpitn,
			hygieneIndexOhiS,
			pregnancyLactationStatus,
			pastDentalInterventions,
			biteType,
			biteDescription,
			oralMucosa,
			xrayFindingsDescription,
			generalTreatmentPlan,
		]);

		const handleBeginRevise = useCallback(() => {
			setReviseSnapshot({
				odontogram: { ...odontogram },
				cpitn: { ...cpitn },
				hygieneIndexOhiS,
				chiefComplaint,
				historyOfPresentIllness,
				allergologicalHistory,
				concomitantDiseases,
				currentMedications,
				pregnancyLactationStatus,
				pastDentalInterventions,
				biteType,
				biteDescription,
				oralMucosa: { ...oralMucosa },
				xrayFindingsDescription,
				generalTreatmentPlan,
			});
			setIsRevising(true);
			showToast(
				"Режим внесения правок («Исправленному верить»). История изменений сохраняется в журнале ревизий.",
				"info",
				4000,
			);
		}, [
			odontogram,
			cpitn,
			hygieneIndexOhiS,
			chiefComplaint,
			historyOfPresentIllness,
			allergologicalHistory,
			concomitantDiseases,
			currentMedications,
			pregnancyLactationStatus,
			pastDentalInterventions,
			biteType,
			biteDescription,
			oralMucosa,
			xrayFindingsDescription,
			generalTreatmentPlan,
		]);

		const handleCancelRevise = useCallback(() => {
			if (reviseSnapshot) {
				setOdontogram(reviseSnapshot.odontogram);
				setCpitn(reviseSnapshot.cpitn);
				setHygieneIndexOhiS(reviseSnapshot.hygieneIndexOhiS);
				setChiefComplaint(reviseSnapshot.chiefComplaint);
				setHistoryOfPresentIllness(reviseSnapshot.historyOfPresentIllness);
				setAllergologicalHistory(reviseSnapshot.allergologicalHistory);
				setConcomitantDiseases(reviseSnapshot.concomitantDiseases);
				setCurrentMedications(reviseSnapshot.currentMedications);
				setPregnancyLactationStatus(reviseSnapshot.pregnancyLactationStatus);
				setPastDentalInterventions(reviseSnapshot.pastDentalInterventions);
				setBiteType(reviseSnapshot.biteType);
				setBiteDescription(reviseSnapshot.biteDescription);
				setOralMucosa(reviseSnapshot.oralMucosa);
				setXrayFindingsDescription(reviseSnapshot.xrayFindingsDescription);
				setGeneralTreatmentPlan(reviseSnapshot.generalTreatmentPlan);
			}
			setIsRevising(false);
			setReviseSnapshot(null);
			showToast("Режим ревизии отменен, исходные данные восстановлены", "info", 3000);
		}, [reviseSnapshot]);

		const handleSaveRevision = useCallback(() => {
			setRevisionCount((c) => c + 1);
			setIsRevising(false);
			setReviseSnapshot(null);
			showToast("Исправление зафиксировано («Исправленному верить»). Ревизия 043/у сохранена.", "success", 4000);
		}, []);

		const currentToothRecord: FdiToothRecord = odontogram[selectedTooth] ?? {
			toothNumber: selectedTooth,
			statusCode: "healthy" as ToothClinicalStatusCode,
			surfaces: [] as ToothSurface[],
			mobility: "none" as const,
			furcationInvolvement: "none" as const,
		};

		const handleSurfaceToggle = (toothNumber: number, surf: ToothSurface) => {
			if (effectiveDisabled) return;
			setOdontogram((prev) => {
				const existing: FdiToothRecord = prev[toothNumber] ?? {
					toothNumber,
					statusCode: "healthy" as ToothClinicalStatusCode,
					surfaces: [] as ToothSurface[],
					mobility: "none" as const,
					furcationInvolvement: "none" as const,
				};
				const currentSurfaces = existing.surfaces ?? [];
				const hasSurf = currentSurfaces.includes(surf);
				const nextSurfaces = hasSurf
					? currentSurfaces.filter((s) => s !== surf)
					: [...currentSurfaces, surf];

				return {
					...prev,
					[toothNumber]: {
						...existing,
						surfaces: nextSurfaces,
					},
				};
			});
		};

		const handleToothStatusSet = (toothNumber: number, statusCode: ToothClinicalStatusCode) => {
			if (effectiveDisabled) return;
			setOdontogram((prev) => {
				const existing: FdiToothRecord = prev[toothNumber] ?? {
					toothNumber,
					statusCode: "healthy" as ToothClinicalStatusCode,
					surfaces: [] as ToothSurface[],
					mobility: "none" as const,
					furcationInvolvement: "none" as const,
				};
				return {
					...prev,
					[toothNumber]: {
						...existing,
						statusCode,
						surfaces: statusCode === "healthy" || statusCode === "extracted_absent" ? [] : existing.surfaces,
					},
				};
			});
		};

		// ── Dual-Layer 5-Second Local Draft Protection & BeforeUnload (IndexedDB + LocalStorage)
		const form043DraftKey = `dente_form043_draft_${initialPayload?.medicalCardNumber || "local_current"}`;

		React.useEffect(() => {
			if (effectiveDisabled) return;

			const flushDraft = () => {
				const payloadToSave: FullForm043uPayload = {
					...initialPayload,
					formNumber: "043/у",
					clinicLegalName: initialPayload?.clinicLegalName || "ООО «Денте»",
					medicalCardNumber: initialPayload?.medicalCardNumber || "043-DRAFT",
					cardOpenedDate: initialPayload?.cardOpenedDate || new Date().toISOString().slice(0, 10),
					patientFullName: initialPayload?.patientFullName || "Пациент",
					patientBirthDate: initialPayload?.patientBirthDate || "1990-01-01",
					patientSex: initialPayload?.patientSex || "male",
					attendingDoctorFullName: initialPayload?.attendingDoctorFullName || "Врач-стоматолог",
					attendingDoctorSpecialty: initialPayload?.attendingDoctorSpecialty || "Врач-стоматолог-терапевт",
					allergologicalHistory,
					concomitantDiseases,
					currentMedications,
					pregnancyLactationStatus,
					pastDentalInterventions,
					chiefComplaint,
					historyOfPresentIllness,
					odontogramTeeth: Object.values(odontogram),
					dmftIndex: dmftResult,
					cpitnIndex: cpitn,
					hygieneIndexOhiS,
					biteType,
					biteDescription,
					oralMucosaStatus: oralMucosa,
					xrayFindingsDescription,
					generalTreatmentPlan,
					soapDiaries: initialPayload?.soapDiaries || [],
					...(revisionCount > 0 || isRevising
						? {
								revisionCount: revisionCount + (isRevising ? 1 : 0),
								revisionReason: revisionReason.trim() || "Исправленному верить",
							}
						: {}),
				};

				try {
					localStorage.setItem(form043DraftKey, JSON.stringify(payloadToSave));
				} catch {
					// ignore
				}
				if (onChange) {
					onChange(payloadToSave);
				}
			};

			// Flush immediate
			flushDraft();

			// Resilient 5-second interval
			const timer = setInterval(flushDraft, 5000);
			return () => clearInterval(timer);
		}, [
			odontogram,
			dmftResult,
			cpitn,
			hygieneIndexOhiS,
			chiefComplaint,
			historyOfPresentIllness,
			allergologicalHistory,
			concomitantDiseases,
			currentMedications,
			pregnancyLactationStatus,
			pastDentalInterventions,
			biteType,
			biteDescription,
			oralMucosa,
			xrayFindingsDescription,
			generalTreatmentPlan,
			effectiveDisabled,
			isRevising,
			revisionCount,
			revisionReason,
			form043DraftKey,
			initialPayload,
			onChange,
		]);

		React.useEffect(() => {
			if (effectiveDisabled) return;

			const handleBeforeUnload = (e: BeforeUnloadEvent) => {
				const hasModifiedTeeth = Object.values(odontogram).some(
					(t) => t.statusCode !== "healthy" || (t.surfaces && t.surfaces.length > 0),
				);
				if (hasModifiedTeeth) {
					try {
						localStorage.setItem(form043DraftKey, JSON.stringify(Object.values(odontogram)));
					} catch {
						// ignore
					}
					e.preventDefault();
					e.returnValue = "В карте 043/у есть несохраненные данные зубной формулы. Закрыть вкладку?";
					return e.returnValue;
				}
			};

			window.addEventListener("beforeunload", handleBeforeUnload);
			return () => window.removeEventListener("beforeunload", handleBeforeUnload);
		}, [odontogram, effectiveDisabled, form043DraftKey]);

		return (
			<div className="document-form-container form-043u-wrapper">
				<DocumentPayloadCard
					title="Медицинская карта стоматологического пациента (Форма № 043/у)"
					description="Официальная форма Минздрава РФ с зубной формулой FDI, индексами КПУ/CPITN, анамнезом жизни, СОПР и дневниками приёма (Форма 043/у)"
				>
					<div
						className="document-form-nav-tabs"
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "16px",
							flexWrap: "wrap",
							gap: "8px",
						}}
					>
						<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
							<button
								type="button"
								className={`btn btn-secondary ${activeTab === "formula" ? "active" : ""}`}
								onClick={() => setActiveTab("formula")}
							>
								Зубная формула FDI и КПУ
							</button>
							<button
								type="button"
								className={`btn btn-secondary ${activeTab === "indices" ? "active" : ""}`}
								onClick={() => setActiveTab("indices")}
							>
								Индексы и Пародонт (CPITN)
							</button>
							<button
								type="button"
								className={`btn btn-secondary ${activeTab === "anamnesis" ? "active" : ""}`}
								onClick={() => setActiveTab("anamnesis")}
							>
								Анамнез, СОПР и План
							</button>
						</div>
						<div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
							<button
								type="button"
								data-testid="btn-043-global-norm-1click"
								className="btn btn-sm btn-success"
								onClick={handleApplyGlobalNorm}
								title="1-клик: Заполнить всю Форму 043/у физиологической нормой (зубная формула, CPITN, СОПР, анамнез). Врач правит только патологию!"
								style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
							>
								<ShieldCheck style={{ width: "16px", height: "16px" }} />
								Норма 043/у (1-клик)
							</button>
							{reviseSnapshot !== null && (
								<button
									type="button"
									data-testid="btn-043-undo-norm"
									className="btn btn-sm btn-outline-warning"
									onClick={handleCancelRevise}
									title="Отменить применение нормы и вернуть исходные записи"
									style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
								>
									<Undo2 style={{ width: "16px", height: "16px" }} />
									Отменить применение нормы
								</button>
							)}
							{(disabled || initialPayload?.isSigned) && (
								<button
									type="button"
									data-testid="btn-043-revise"
									className={`btn btn-sm ${isRevising ? "btn-warning" : "btn-outline-warning"}`}
									onClick={() => {
										if (isRevising) {
											handleCancelRevise();
										} else {
											handleBeginRevise();
										}
									}}
									title="Внести исправление в закрытую карту 043/у («Исправленному верить») без согласований начмедов (Мандат 8e)"
									style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
								>
									<FileEdit style={{ width: "16px", height: "16px" }} />
									{isRevising ? "Отменить ревизию" : "Внести исправление («Исправленному верить»)"}
								</button>
							)}
							<span
								data-testid="form043-stamp-badge"
								className={`badge ${
									isRevising || revisionCount > 0
										? "badge-warning"
										: initialPayload?.isSigned
											? "badge-success"
											: "badge-secondary"
								}`}
								style={{
									padding: "4px 8px",
									borderRadius: "4px",
									fontSize: "11px",
									fontWeight: 700,
									letterSpacing: "0.05em",
									textTransform: "uppercase",
									background:
										isRevising || revisionCount > 0
											? "rgba(245, 158, 11, 0.15)"
											: initialPayload?.isSigned
												? "rgba(16, 185, 129, 0.15)"
												: "rgba(100, 116, 139, 0.15)",
									color:
										isRevising || revisionCount > 0
											? "#b45309"
											: initialPayload?.isSigned
												? "#059669"
												: "#64748b",
									border: `1px solid ${
										isRevising || revisionCount > 0
											? "rgba(245, 158, 11, 0.4)"
											: initialPayload?.isSigned
												? "rgba(16, 185, 129, 0.4)"
												: "rgba(100, 116, 139, 0.3)"
									}`,
								}}
							>
								{isRevising || revisionCount > 0
									? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount + (isRevising ? 1 : 0)})`
									: initialPayload?.isSigned
										? "ПОДПИСАНО ВРАЧОМ"
										: "ЧЕРНОВИК"}
							</span>
							<button
								type="button"
								data-testid="btn-043-print-blank"
								className="btn btn-sm btn-outline-secondary"
								onClick={() => {
									if (typeof window !== "undefined") {
										const blankHtml = renderForm043uHtml({
											medicalCardNumber: initialPayload?.medicalCardNumber || "__________",
											cardOpenedDate: "«___» _________ 20___ г.",
											patientFullName: "________________________________________________________",
											patientBirthDate: "«___» _________ _____ г.",
											patientPhone: "+7 (___) ___-__-__",
											patientAddressRegistration: "________________________________________________________",
											chiefComplaint: "________________________________________________________",
											historyOfPresentIllness: "________________________________________________________",
											allergologicalHistory: "________________________________________________________",
											concomitantDiseases: "________________________________________________________",
											attendingDoctorFullName: initialPayload?.attendingDoctorFullName || "________________________",
											isClosed: false,
											watermarkText: "ЧЕРНОВИК (БЛАНК)",
										});
										const printWindow = window.open("", "_blank");
										if (printWindow) {
											printWindow.document.write(blankHtml);
											printWindow.document.close();
											printWindow.focus();
											printWindow.print();
										} else {
											window.print();
										}
									}
								}}
								title="Печать чистого бланка Формы 043/у со строками «________» для ручного заполнения на приёме (Мандат 8e)"
								style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
							>
								<Printer style={{ width: "16px", height: "16px" }} />
								Бланк («________»)
							</button>
							<button
								type="button"
								data-testid="btn-043-fast-print"
								className="btn btn-sm btn-outline-primary"
								onClick={() => {
									if (typeof window !== "undefined") {
										const isSigned = Boolean(initialPayload?.isSigned);
										const effectiveWatermark =
											isRevising || revisionCount > 0
												? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount + (isRevising ? 1 : 0)})`
												: isSigned
													? "ПОДПИСАНО ВРАЧОМ"
													: "ЧЕРНОВИК";
										const printHtml = renderForm043uHtml({
											...initialPayload,
											medicalCardNumber: initialPayload?.medicalCardNumber || "__________",
											cardOpenedDate: initialPayload?.cardOpenedDate || new Date().toISOString().slice(0, 10),
											patientFullName: initialPayload?.patientFullName || "Пациент",
											patientBirthDate: initialPayload?.patientBirthDate || "—",
											patientSex: initialPayload?.patientSex || "male",
											attendingDoctorFullName: initialPayload?.attendingDoctorFullName || "Врач-стоматолог",
											attendingDoctorSpecialty: initialPayload?.attendingDoctorSpecialty || "Врач-стоматолог-терапевт",
											chiefComplaint,
											historyOfPresentIllness,
											allergologicalHistory,
											concomitantDiseases,
											currentMedications,
											pregnancyLactationStatus,
											pastDentalInterventions,
											biteType,
											biteDescription,
											oralMucosaStatus: oralMucosa,
											xrayFindingsDescription,
											generalTreatmentPlan,
											odontogramTeeth: Object.values(odontogram),
											dmftIndex: dmftResult,
											cpitnIndex: cpitn,
											hygieneIndexOhiS,
											isClosed: isSigned,
											watermarkText: effectiveWatermark,
										});
										const printWindow = window.open("", "_blank");
										if (printWindow) {
											printWindow.document.write(printHtml);
											printWindow.document.close();
											printWindow.focus();
											printWindow.print();
										} else {
											window.print();
										}
									}
								}}
								title="Печать карты 043/у в любой момент (Мандат 8e)"
								style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
							>
								<Printer style={{ width: "16px", height: "16px" }} />
								Печать 043/у
							</button>
						</div>
					</div>

					{isRevising && (
						<div
							data-testid="form043-revision-banner"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "12px",
								padding: "10px 14px",
								marginBottom: "14px",
								background: "rgba(245, 158, 11, 0.12)",
								border: "1px solid rgba(245, 158, 11, 0.35)",
								borderRadius: "8px",
								flexWrap: "wrap",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<FileEdit style={{ width: "18px", height: "18px", color: "#d97706" }} />
								<div>
									<strong style={{ color: "#b45309", fontSize: "13px" }}>
										Режим ревизии («Исправленному верить»):
									</strong>
									<span style={{ fontSize: "12px", marginLeft: "6px", color: "var(--ink)" }}>
										Правки вносятся лечащим врачом без бюрократических замков и согласований начмедов (Мандат 8e).
									</span>
								</div>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
								<input
									type="text"
									data-testid="input-043-revision-reason"
									value={revisionReason}
									onChange={(e) => setRevisionReason(e.target.value)}
									placeholder="Причина правки (по умолчанию: Исправленному верить)"
									style={{ minWidth: "220px", padding: "4px 8px", fontSize: "12px" }}
								/>
								<button
									type="button"
									data-testid="btn-043-save-revision"
									className="btn btn-sm btn-primary"
									onClick={handleSaveRevision}
								>
									Зафиксировать ревизию
								</button>
								<button
									type="button"
									data-testid="btn-043-cancel-revision"
									className="btn btn-sm btn-outline-secondary"
									onClick={handleCancelRevise}
								>
									Отменить правку
								</button>
							</div>
						</div>
					)}

					{activeTab === "formula" && (
						<div className="form-043u-formula-tab">
							<div className="alert alert-info" style={{ marginBottom: "12px", padding: "10px" }}>
								<strong>Индекс интенсивности кариеса (КПУ): </strong>
								<span>
									К = {dmftResult.decayed}, П = {dmftResult.filled}, У = {dmftResult.missing} | <strong>КПУ(з) = {dmftResult.dmftTotal}</strong> ({dmftResult.intensityLevelLabel})
								</span>
							</div>

							<div
								className="odontogram-1click-presets"
								data-testid="odontogram-1click-presets-bar"
								style={{
									display: "flex",
									gap: "8px",
									flexWrap: "wrap",
									marginBottom: "12px",
									alignItems: "center",
									padding: "8px 12px",
									background: "var(--paper-soft, rgba(0,0,0,0.02))",
									borderRadius: "8px",
									border: "1px solid var(--line, #e2e8f0)",
								}}
							>
								<span style={{ fontWeight: 600, fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
									<Sparkles style={{ width: "14px", height: "14px", color: "var(--teal, #0d9488)" }} />
									1-Клик Пресеты формулы:
								</span>
								<button
									type="button"
									data-testid="btn-043-teeth-all-healthy-1click"
									className="btn btn-sm btn-outline-success"
									onClick={() => {
										setOdontogram(createIntactOdontogramRecords());
									}}
									disabled={effectiveDisabled}
									title="Все зубы здоровы / интактны (Норма) — КПУ = 0"
									style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
								>
									<CheckCircle2 style={{ width: "14px", height: "14px" }} />
									Все здоровы (Норма)
								</button>
								<button
									type="button"
									data-testid="btn-043-teeth-sanitized-1click"
									className="btn btn-sm btn-outline-secondary"
									onClick={() => {
										setOdontogram(createSanitizedOdontogramRecords());
									}}
									disabled={effectiveDisabled}
									title="Санирован (моляры удовлетворительно пломбированы)"
								>
									Санирован
								</button>
								<button
									type="button"
									data-testid="btn-043-teeth-no-wisdom-1click"
									className="btn btn-sm btn-outline-secondary"
									onClick={() => {
										setOdontogram(createWisdomExtractedOdontogramRecords());
									}}
									disabled={effectiveDisabled}
									title="Зубы мудрости (18, 28, 38, 48) отсутствуют / удалены"
								>
									Без зубов мудрости (8-ки)
								</button>
							</div>

							<div className="condition-selector-bar" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
								<span style={{ alignSelf: "center", fontWeight: 600, marginRight: "4px" }}>Быстрый статус:</span>
								{SELECTABLE_STATUSES.map((code) => (
									<button
										key={code}
										type="button"
										className={`btn btn-sm ${activeStatus === code ? "btn-primary" : "btn-outline-secondary"}`}
										onClick={() => setActiveStatus(code)}
										title={toothStatusCodeLabels[code]}
									>
										{toothStatusCodeShortMap[code]} — {toothStatusCodeLabels[code]}
									</button>
								))}
							</div>

							<div className="fdi-formula-grid" style={{ background: "var(--paper-strong, #f8fafc)", padding: "12px", borderRadius: "8px" }}>
								<div style={{ textAlign: "center", fontWeight: 700, marginBottom: "6px" }}>Верхняя челюсть (Постоянный прикус)</div>
								<div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
									{PERMANENT_TEETH_UPPER.map((t) => {
										const tooth = odontogram[t];
										const isSelected = selectedTooth === t;
										const code = tooth?.statusCode ?? "healthy";
										return (
											<div
												key={t}
												onClick={() => setSelectedTooth(t)}
												style={{
													border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
													background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
													borderRadius: "6px",
													padding: "6px 8px",
													textAlign: "center",
													cursor: "pointer",
													minWidth: "44px",
													minHeight: "44px",
													display: "flex",
													flexDirection: "column",
													justifyContent: "center",
													alignItems: "center",
												}}
											>
												<div style={{ fontSize: "13px", fontWeight: "bold" }}>{t}</div>
												<div style={{ fontSize: "12px", fontWeight: 600, color: code !== "healthy" ? "var(--bad-fg)" : "var(--ok-fg)" }}>
													{toothStatusCodeShortMap[code] || "Norm"}
												</div>
											</div>
										);
									})}
								</div>

								<div style={{ textAlign: "center", fontWeight: 700, margin: "10px 0 6px 0" }}>Нижняя челюсть (Постоянный прикус)</div>
								<div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
									{PERMANENT_TEETH_LOWER.map((t) => {
										const tooth = odontogram[t];
										const isSelected = selectedTooth === t;
										const code = tooth?.statusCode ?? "healthy";
										return (
											<div
												key={t}
												onClick={() => setSelectedTooth(t)}
												style={{
													border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
													background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
													borderRadius: "6px",
													padding: "6px 8px",
													textAlign: "center",
													cursor: "pointer",
													minWidth: "44px",
													minHeight: "44px",
													display: "flex",
													flexDirection: "column",
													justifyContent: "center",
													alignItems: "center",
												}}
											>
												<div style={{ fontSize: "13px", fontWeight: "bold" }}>{t}</div>
												<div style={{ fontSize: "12px", fontWeight: 600, color: code !== "healthy" ? "var(--bad-fg)" : "var(--ok-fg)" }}>
													{toothStatusCodeShortMap[code] || "Norm"}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{selectedTooth && (
								<div className="tooth-surface-editor" style={{ marginTop: "16px", padding: "12px", border: "1px solid var(--line)", borderRadius: "8px" }}>
									<h5>Зуб {selectedTooth}: Настройка статуса и поверхностей</h5>
									<div style={{ display: "flex", gap: "8px", margin: "10px 0", flexWrap: "wrap" }}>
										<button
											type="button"
											className="btn btn-sm btn-outline-primary"
											onClick={() => handleToothStatusSet(selectedTooth, activeStatus)}
											disabled={effectiveDisabled}
										>
											Применить статус ({toothStatusCodeShortMap[activeStatus]})
										</button>
										<button
											type="button"
											className="btn btn-sm btn-outline-danger"
											onClick={() => handleToothStatusSet(selectedTooth, "extracted_absent")}
											disabled={effectiveDisabled}
										>
											Удален (A)
										</button>
										<button
											type="button"
											className="btn btn-sm btn-outline-success"
											onClick={() => handleToothStatusSet(selectedTooth, "healthy")}
											disabled={effectiveDisabled}
										>
											Здоров (Norm)
										</button>
									</div>

									<div style={{ marginTop: "8px" }}>
										<label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Пораженные поверхности (5 поверхностей по FDI):</label>
										<div style={{ display: "flex", gap: "8px" }}>
											{SURFACES.map((s) => {
												const active = Boolean(
													currentToothRecord?.surfaces &&
														currentToothRecord.surfaces.includes(s.key),
												);
												return (
													<button
														key={s.key}
														type="button"
														className={`btn btn-sm ${active ? "btn-warning" : "btn-outline-secondary"}`}
														onClick={() => handleSurfaceToggle(selectedTooth, s.key)}
														disabled={effectiveDisabled}
													>
														{s.label}
													</button>
												);
											})}
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{activeTab === "indices" && (
						<div className="form-043u-indices-tab">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
								<h5 style={{ margin: 0 }}>Пародонтальный индекс CPITN (PSR) по 6 секстантам</h5>
								<button
									type="button"
									data-testid="btn-043-cpitn-norm-1click"
									className="btn btn-sm btn-outline-success"
									onClick={() => {
										setCpitn({
											sextant18_14: "0_healthy",
											sextant13_23: "0_healthy",
											sextant24_28: "0_healthy",
											sextant48_44: "0_healthy",
											sextant43_33: "0_healthy",
											sextant34_38: "0_healthy",
											treatmentNeedCategory: "0_none",
										});
										setHygieneIndexOhiS("OHI-S = 0.0 (Отличная гигиена полости рта)");
									}}
									disabled={effectiveDisabled}
									title="Установить норму пародонта (CPITN 0 / TN 0) и гигиены (OHI-S 0.0) в 1 клик"
								>
									1 клик: Все секстанты здоровы (Код 0 / TN 0, OHI-S = 0.0)
								</button>
							</div>

							<p className="document-form-muted" style={{ marginBottom: "14px" }}>
								Оценка состояния тканей пародонта по 6 секстантам в соответствии с рекомендациями ВОЗ. Коды: 0 — Здорова; 1 — Кровоточивость; 2 — Камень; 3 — Карман 4–5 мм; 4 — Карман ≥ 6 мм; X — Исключен.
							</p>

							<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
								<h6 style={{ fontWeight: 700, marginBottom: "8px" }}>Верхняя челюсть</h6>
								<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
									<label>
										Секстант 18–14 (Верхний правый)
										<select
											value={cpitn.sextant18_14}
											onChange={(e) => setCpitn((prev) => ({ ...prev, sextant18_14: e.target.value as CpitnSextantCode }))}
											disabled={effectiveDisabled}
										>
											{CPITN_SEXTANT_OPTIONS.map((opt) => (
												<option key={opt.value} value={opt.value} title={opt.hint}>
													{opt.label}
												</option>
											))}
										</select>
									</label>
									<label>
										Секстант 13–23 (Верхний фронтальный)
										<select
											value={cpitn.sextant13_23}
											onChange={(e) => setCpitn((prev) => ({ ...prev, sextant13_23: e.target.value as CpitnSextantCode }))}
											disabled={effectiveDisabled}
										>
											{CPITN_SEXTANT_OPTIONS.map((opt) => (
												<option key={opt.value} value={opt.value} title={opt.hint}>
													{opt.label}
												</option>
											))}
										</select>
									</label>
									<label>
										Секстант 24–28 (Верхний левый)
										<select
											value={cpitn.sextant24_28}
											onChange={(e) => setCpitn((prev) => ({ ...prev, sextant24_28: e.target.value as CpitnSextantCode }))}
											disabled={effectiveDisabled}
										>
											{CPITN_SEXTANT_OPTIONS.map((opt) => (
												<option key={opt.value} value={opt.value} title={opt.hint}>
													{opt.label}
												</option>
											))}
										</select>
									</label>
								</div>

								<h6 style={{ fontWeight: 700, marginBottom: "8px" }}>Нижняя челюсть</h6>
								<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
									<label>
										Секстант 48–44 (Нижний правый)
										<select
											value={cpitn.sextant48_44}
											onChange={(e) => setCpitn((prev) => ({ ...prev, sextant48_44: e.target.value as CpitnSextantCode }))}
											disabled={effectiveDisabled}
										>
											{CPITN_SEXTANT_OPTIONS.map((opt) => (
												<option key={opt.value} value={opt.value} title={opt.hint}>
													{opt.label}
												</option>
											))}
										</select>
									</label>
									<label>
										Секстант 43–33 (Нижний фронтальный)
										<select
											value={cpitn.sextant43_33}
											onChange={(e) => setCpitn((prev) => ({ ...prev, sextant43_33: e.target.value as CpitnSextantCode }))}
											disabled={effectiveDisabled}
										>
											{CPITN_SEXTANT_OPTIONS.map((opt) => (
												<option key={opt.value} value={opt.value} title={opt.hint}>
													{opt.label}
												</option>
											))}
										</select>
									</label>
									<label>
										Секстант 34–38 (Нижний левый)
										<select
											value={cpitn.sextant34_38}
											onChange={(e) => setCpitn((prev) => ({ ...prev, sextant34_38: e.target.value as CpitnSextantCode }))}
											disabled={effectiveDisabled}
										>
											{CPITN_SEXTANT_OPTIONS.map((opt) => (
												<option key={opt.value} value={opt.value} title={opt.hint}>
													{opt.label}
												</option>
											))}
										</select>
									</label>
								</div>
							</div>

							<div style={{ marginBottom: "16px" }}>
								<label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
									Категория потребности в пародонтологическом лечении (Treatment Need):
								</label>
								<select
									value={cpitn.treatmentNeedCategory}
									onChange={(e) => setCpitn((prev) => ({ ...prev, treatmentNeedCategory: e.target.value as CpitnIndex["treatmentNeedCategory"] }))}
									disabled={effectiveDisabled}
									style={{ width: "100%" }}
								>
									{CPITN_TN_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
									Индекс гигиены полости рта (OHI-S / Грин-Вермиллиона):
								</label>
								<input
									type="text"
									value={hygieneIndexOhiS}
									onChange={(e) => setHygieneIndexOhiS(e.target.value)}
									placeholder="например, OHI-S = 0.8 (Хорошая гигиена)"
									disabled={effectiveDisabled}
									style={{ width: "100%" }}
								/>
							</div>
						</div>
					)}

					{activeTab === "anamnesis" && (
						<div className="form-043u-anamnesis-tab">
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									marginBottom: "14px",
									padding: "10px 14px",
									background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
									borderRadius: "8px",
									border: "1px solid var(--teal-line, rgba(13, 148, 136, 0.2))",
									flexWrap: "wrap",
									gap: "8px",
								}}
							>
								<div>
									<strong style={{ color: "var(--teal-dark, #0f766e)", fontSize: "13px" }}>
										Клиническая автономия врача (Мандат 8e):
									</strong>
									<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
										Заполнение физиологической нормой в 1 клик. Врач правит только патологию.
									</div>
								</div>
								<button
									type="button"
									data-testid="btn-043-anamnesis-norm-1click"
									className="btn btn-sm btn-success"
									onClick={() => {
										const norm = createForm043PhysiologicalNorm();
										setChiefComplaint(norm.chiefComplaint);
										setHistoryOfPresentIllness(norm.historyOfPresentIllness);
										setAllergologicalHistory(norm.allergologicalHistory);
										setConcomitantDiseases(norm.concomitantDiseases);
										setCurrentMedications(norm.currentMedications);
										setPregnancyLactationStatus(norm.pregnancyLactationStatus);
										setPastDentalInterventions(norm.pastDentalInterventions);
										setBiteType(norm.biteType);
										setBiteDescription(norm.biteDescription);
										setOralMucosa(norm.oralMucosaStatus);
										setXrayFindingsDescription(norm.xrayFindingsDescription);
										setGeneralTreatmentPlan(norm.generalTreatmentPlan);
									}}
									disabled={effectiveDisabled}
									title="Заполнить анамнез, СОПР, прикус и план физиологической нормой"
									style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
								>
									<CheckCircle2 style={{ width: "16px", height: "16px" }} />
									Соматически здоров / норма (1-клик)
								</button>
							</div>

							<h5 style={{ marginBottom: "12px" }}>Жалобы и Анамнез заболевания</h5>
							<div style={{ marginBottom: "14px" }}>
								<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Жалобы пациента (Chief Complaint):</label>
								<textarea
									value={chiefComplaint}
									onChange={(e) => setChiefComplaint(e.target.value)}
									placeholder="Жалобы на боли, эстетический дефект, кровоточивость десен..."
									rows={2}
									disabled={effectiveDisabled}
									style={{ width: "100%" }}
								/>
							</div>

							<div style={{ marginBottom: "16px" }}>
								<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Анамнез настоящего заболевания (Anamnesis Morbi):</label>
								<textarea
									value={historyOfPresentIllness}
									onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
									placeholder="Когда началось заболевание, динамика, проводимое ранее лечение..."
									rows={2}
									disabled={effectiveDisabled}
									style={{ width: "100%" }}
								/>
							</div>

							<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
								Анамнез жизни и соматический статус (Anamnesis Vitae)
							</h5>
							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
								<label>
									Аллергологический анамнез
									<input
										type="text"
										value={allergologicalHistory}
										onChange={(e) => setAllergologicalHistory(e.target.value)}
										placeholder="Аллергии на лекарства, анестетики, латекс..."
										disabled={effectiveDisabled}
									/>
								</label>
								<label>
									Сопутствующие заболевания
									<input
										type="text"
										value={concomitantDiseases}
										onChange={(e) => setConcomitantDiseases(e.target.value)}
										placeholder="Гипертония, СД, ИБС, гепатиты, отрицает..."
										disabled={effectiveDisabled}
									/>
								</label>
							</div>

							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
								<label>
									Принимаемые препараты
									<input
										type="text"
										value={currentMedications}
										onChange={(e) => setCurrentMedications(e.target.value)}
										placeholder="Антикоагулянты, гипотензивные..."
										disabled={effectiveDisabled}
									/>
								</label>
								<label>
									Беременность / Лактация
									<input
										type="text"
										value={pregnancyLactationStatus}
										onChange={(e) => setPregnancyLactationStatus(e.target.value)}
										placeholder="Нет / Срок в неделях"
										disabled={effectiveDisabled}
									/>
								</label>
								<label>
									Перенесенные стом. вмешательства
									<input
										type="text"
										value={pastDentalInterventions}
										onChange={(e) => setPastDentalInterventions(e.target.value)}
										placeholder="Лечение кариеса, удаление..."
										disabled={effectiveDisabled}
									/>
								</label>
							</div>

							<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
								Прикус и Окклюзия
							</h5>
							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
								<label>
									Вид прикуса
									<select
										value={biteType}
										onChange={(e) => setBiteType(e.target.value as DentalBiteType)}
										disabled={effectiveDisabled}
									>
										{Object.entries(dentalBiteTypeLabels).map(([k, label]) => (
											<option key={k} value={k}>
												{label}
											</option>
										))}
									</select>
								</label>
								<label>
									Описание смыкания и окклюзии
									<input
										type="text"
										value={biteDescription}
										onChange={(e) => setBiteDescription(e.target.value)}
										placeholder="Смыкание моляров по I классу, перекрытие на 1/3..."
										disabled={effectiveDisabled}
									/>
								</label>
							</div>

							<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
								Состояние слизистой оболочки рта (СОПР) и Пародонта
							</h5>
							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
								<label>
									Цвет слизистой оболочки
									<select
										value={oralMucosa.color}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, color: e.target.value as OralMucosaStatus["color"] }))}
										disabled={effectiveDisabled}
									>
										{ORAL_MUCOSA_COLORS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
								<label>
									Увлажненность слизистой
									<select
										value={oralMucosa.moisture}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, moisture: e.target.value as OralMucosaStatus["moisture"] }))}
										disabled={effectiveDisabled}
									>
										{ORAL_MUCOSA_MOISTURE.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
							</div>

							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
								<label>
									Десневые сосочки и десневой край
									<select
										value={oralMucosa.gingivalPapillae}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, gingivalPapillae: e.target.value as OralMucosaStatus["gingivalPapillae"] }))}
										disabled={effectiveDisabled}
									>
										{GINGIVAL_PAPILLAE_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
								<label>
									Кровоточивость десен (индекс PBI)
									<select
										value={oralMucosa.bleedingPBI}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, bleedingPBI: e.target.value as OralMucosaStatus["bleedingPBI"] }))}
										disabled={effectiveDisabled}
									>
										{BLEEDING_PBI_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
							</div>

							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
								<label>
									Состояние языка
									<input
										type="text"
										value={oralMucosa.tongueStatus}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, tongueStatus: e.target.value }))}
										disabled={effectiveDisabled}
									/>
								</label>
								<label>
									Патологические элементы (афты, язвы, эрозии)
									<input
										type="text"
										value={oralMucosa.pathologicalElements ?? ""}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, pathologicalElements: e.target.value || null }))}
										placeholder="Отсутствуют / Афты на слизистой щеки..."
										disabled={effectiveDisabled}
									/>
								</label>
							</div>

							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
								<label>
									Регионарные лимфатические узлы
									<input
										type="text"
										value={oralMucosa.regionalLymphNodes}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, regionalLymphNodes: e.target.value }))}
										disabled={effectiveDisabled}
									/>
								</label>
								<label>
									Функция височно-нижнечелюстного сустава (ВНЧС)
									<input
										type="text"
										value={oralMucosa.tmjFunction}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, tmjFunction: e.target.value }))}
										disabled={effectiveDisabled}
									/>
								</label>
							</div>

							<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
								Рентгенодиагностика и Общий план лечения
							</h5>
							<div style={{ marginBottom: "14px" }}>
								<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Данные рентгенологических исследований / КТ:</label>
								<textarea
									value={xrayFindingsDescription}
									onChange={(e) => setXrayFindingsDescription(e.target.value)}
									rows={2}
									disabled={effectiveDisabled}
									style={{ width: "100%" }}
								/>
							</div>
							<div>
								<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Общий план лечения стоматологического больного:</label>
								<textarea
									value={generalTreatmentPlan}
									onChange={(e) => setGeneralTreatmentPlan(e.target.value)}
									rows={3}
									disabled={effectiveDisabled}
									style={{ width: "100%" }}
								/>
							</div>
						</div>
					)}
				</DocumentPayloadCard>
			</div>
		);
	},
);

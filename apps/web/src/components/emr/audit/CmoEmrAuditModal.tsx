/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO EMR QUALITY AUDIT & FORM 043/U APPROVAL MODAL HUD
 * Touch-First Interface (>= 44x44px), Order 203n & Roszdravnadzor Standard
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect } from "react";
import {
	ShieldCheck,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	FileText,
	Printer,
	Award,
	Clock,
	Check,
	X,
	MessageSquare,
	Plus,
	FileWarning,
	Activity,
	Stethoscope,
} from "lucide-react";
import {
	type EmrAuditRecord,
	type EmrAuditStatus,
	type CmoAuditRemark,
	type CmoAuditResolution,
	type AuditRecordFilters,
	type AttachedEmrDocument,
	type CompletedActItem,
	type EmrAutomatedCheckResult,
	type DoctorQualityMetrics,
	runAutomatedEmrAudit,
	calculateQualityScore,
	applyCmoAuditDecision,
	addCmoRemark,
	resolveCmoRemark,
	filterAuditRecords,
	generateCmoAuditSummaryReport,
	exportCmoAuditProtocolText,
} from "./cmoEmrAuditEngine";
import {
	CMO_STATUTORY_DEFECT_PRESETS,
	type CmoDefectPreset,
	type CmoDefectSeverity,
} from "./cmoEmrAuditPresets";
import type { VisitDiaryEntry043 } from "../emr043Types";
import "./cmoEmrAudit.css";

// ── Fallback Initial Demo Audit Records for CMO Workspace ──
export const INITIAL_DEMO_RECORDS: EmrAuditRecord[] = [
	{
		id: "audit-001",
		medicalCardId: "СТ-2026-0843",
		recordNumber: "КЭР-2026-1042",
		patientId: "pat-101",
		patientFullName: "Смирнов Алексей Владимирович",
		patientBirthDate: "1990-05-15",
		patientGender: "male",
		patientPhone: "+7 (916) 555-43-21",
		doctorStaffId: "doc-01",
		doctorFullName: "Волкова Екатерина Сергеевна",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		visitDate: "2026-08-20",
		status: "pending_review",
		cardData: {
			formNumber: "043/у",
			formOrderName: "Приказ Минздрава России от 15.12.2014 № 834н",
			clinic: {
				clinicName: "Клиника ДЕНТЕ",
				clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				clinicAddress: "г. Москва, ул. Усачёва, д. 29",
				clinicPhone: "+7 (495) 789-20-20",
				clinicOgrn: "1237700456789",
				clinicInn: "7704812345",
				licenseNumber: "ЛО-77-01-021456",
				licenseDate: "15.03.2023",
				licenseIssuer: "Департамент здравоохранения г. Москвы",
			},
			passport: {
				medicalCardNumber: "СТ-2026-0843",
				cardOpenedDate: "2026-08-20",
				patientFullName: "Смирнов Алексей Владимирович",
				patientBirthDate: "1990-05-15",
				patientSex: "male",
				patientAddressRegistration: "г. Москва, пр-кт Вернадского, д. 44, кв. 112",
				patientIdentityDocument: "Паспорт РФ 45 12 № 890123",
				primaryDiagnosisText: "Кариес дентина зуба 1.6",
				primaryDiagnosisIcd10: "K02.1",
				attendingDoctorFullName: "Волкова Екатерина Сергеевна",
				attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
			},
			anamnesis: {
				chiefComplaint: "Кратковременные боли от холодного и сладкого в зубе 1.6.",
				historyOfPresentIllness: "Беспокоит около 2 недель. Ранее не лечился.",
				medicalHistoryVitae: "Соматически здоров.",
				allergologicalHistory: "Аллергических реакций нет.",
				concomitantSomaticDiseases: "Нет",
				currentSystemicMedications: "Нет",
				pregnancyLactationStatus: "Не применимо",
				pastDentalInterventions: "Лечение кариеса в 2024 г.",
			},
			dentalStatus: {
				odontogramTeeth: [],
				dmftIndex: { decayed: 1, filled: 0, missing: 0, totalDmft: 1, decayedSurfaces: 1, filledSurfaces: 0, totalDmfs: 1, deciduousDecayed: 0, deciduousFilled: 0, deciduousExtracted: 0, totalDft: 0, intensityLevel: "very_low" },
				cpitnIndex: {
					sextant18_14: "0_healthy",
					sextant13_23: "0_healthy",
					sextant24_28: "0_healthy",
					sextant48_44: "0_healthy",
					sextant43_33: "0_healthy",
					sextant34_38: "0_healthy",
					treatmentNeedCategory: "0_none",
				},
				hygieneIndexOhiS: { debrisScore: 0.2, calculusScore: 0.2, totalScore: 0.4, ratingText: "Хорошая" },
				biteType: "orthognathic",
				biteDescription: "Ортогнатический",
				oralMucosaStatus: {
					color: "pale_pink_normal",
					moisture: "normal",
					gingivalPapillae: "normal_pointed",
					bleedingPBI: "grade_0",
					tongueStatus: "Язык чистый, влажный",
					regionalLymphNodes: "Лимфоузлы не увеличены",
					tmjFunction: "Движения в ВНЧС в полном объеме",
				},
				xrayFindingsDescription: "Дефект дентина жевательной поверхности 1.6 без признаков периодонтита.",
				xrayRadiationDoseMsv: 0.004,
			},
			generalTreatmentPlan: "1. Лечение кариеса 1.6 композитом. 2. Профосмотр через 6 мес.",
			visitDiaries: [
				{
					id: "vd-01",
					entryDate: "2026-08-20",
					toothNumber: "16",
					subjectiveComplaints: "Жалобы на кратковременные боли от холодного.",
					objectiveStatusLocalis: "Кариозная полость средней глубины на жевательной поверхности зуба 1.6.",
					assessmentDiagnosisText: "Кариес дентина зуба 1.6",
					assessmentIcd10Code: "K02.1",
					procedureProtocol: "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл. Препарирование, медикаментозная обработка 2% хлоргексидином, бондинг OptiBond FL, пломба Ceram.x Spectra ST A2, шлифовка, полировка.",
					anesthesiaDetails: "Sol. Ubistesini 4% 1.7 мл инфильтрационно",
					appliedMaterials: "Ceram.x Spectra ST A2, OptiBond FL",
					doctorFullName: "Волкова Екатерина Сергеевна",
					isSignedWithUkep: true,
					digitalSignatureHash: "a4f891b8d234e6c7901ef5b89a03b51e7845cd1209384756abcdef1234567890",
				},
			],
			epicrisis: {
				treatmentSummary: "Лечение кариеса дентина 1.6 завершено.",
				treatmentOutcome: "complete_cure",
				treatmentOutcomeLabel: "Выздоровление",
				dispensaryGroup: "D_I_healthy",
				dispensaryGroupLabel: "Д-I (Здоровые)",
				plannedRecallIntervalMonths: 6,
				preventivePlanRecommendations: "Гигиена полости рта, паста с фтором.",
				dateCompleted: "2026-08-20",
				attendingDoctorFullName: "Волкова Е.С.",
			},
		},
		attachedDocuments: [
			{ id: "doc-ids-1", type: "ids_323fz", title: "ИДС на стоматологическое терапевтическое лечение", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
			{ id: "doc-tp-1", type: "treatment_plan", title: "План лечения № ТП-843", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
		],
		completedActItems: [
			{ serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (кариес дентина)", toothNumber: "16", quantity: 1, priceRub: 5500 },
			{ serviceCode: "B01.003.004.001", serviceName: "Местная анестезия (Убистезин 4%)", toothNumber: "16", quantity: 1, priceRub: 900 },
		],
		treatmentPlanItems: [
			{ serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (кариес дентина)", toothNumber: "16", stage: "Терапевтический этап" },
			{ serviceCode: "B01.003.004.001", serviceName: "Местная анестезия (Убистезин 4%)", toothNumber: "16", stage: "Терапевтический этап" },
		],
		automatedCheckResults: [],
		automatedQualityScore: 100,
		cmoRemarks: [],
		auditHistory: [],
	},
	{
		id: "audit-002",
		medicalCardId: "СТ-2026-0850",
		recordNumber: "КЭР-2026-1043",
		patientId: "pat-102",
		patientFullName: "Иванова Марина Дмитриевна",
		patientBirthDate: "1985-11-03",
		patientGender: "female",
		patientPhone: "+7 (925) 444-12-89",
		doctorStaffId: "doc-02",
		doctorFullName: "Кузнецов Денис Игоревич",
		doctorSpecialty: "Врач-стоматолог-хирург",
		visitDate: "2026-08-21",
		status: "rejected_with_remarks",
		cardData: {
			formNumber: "043/у",
			formOrderName: "Приказ Минздрава России от 15.12.2014 № 834н",
			clinic: {
				clinicName: "Клиника ДЕНТЕ",
				clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				clinicAddress: "г. Москва, ул. Усачёва, д. 29",
				clinicPhone: "+7 (495) 789-20-20",
				clinicOgrn: "1237700456789",
				clinicInn: "7704812345",
				licenseNumber: "ЛО-77-01-021456",
				licenseDate: "15.03.2023",
				licenseIssuer: "Департамент здравоохранения г. Москвы",
			},
			passport: {
				medicalCardNumber: "СТ-2026-0850",
				cardOpenedDate: "2026-08-21",
				patientFullName: "Иванова Марина Дмитриевна",
				patientBirthDate: "1985-11-03",
				patientSex: "female",
				patientAddressRegistration: "г. Москва, ул. Вавилова, д. 18",
				patientIdentityDocument: "Паспорт РФ 45 10 № 654321",
				primaryDiagnosisText: "Дистопия и ретенция зуба 3.8",
				primaryDiagnosisIcd10: "K07.3",
				attendingDoctorFullName: "Кузнецов Денис Игоревич",
				attendingDoctorSpecialty: "Врач-стоматолог-хирург",
			},
			anamnesis: {
				chiefComplaint: "Периодические ноющие боли в области угла нижней челюсти слева.",
				historyOfPresentIllness: "Боли в течение 1 месяца.",
				medicalHistoryVitae: "Здорова.",
				allergologicalHistory: "Не отягощен.",
				concomitantSomaticDiseases: "Нет",
				currentSystemicMedications: "Нет",
				pregnancyLactationStatus: "Нет",
				pastDentalInterventions: "Удаление зуба 4.8 в 2023 г.",
			},
			dentalStatus: {
				odontogramTeeth: [],
				dmftIndex: { decayed: 0, filled: 2, missing: 1, totalDmft: 3, decayedSurfaces: 0, filledSurfaces: 2, totalDmfs: 2, deciduousDecayed: 0, deciduousFilled: 0, deciduousExtracted: 0, totalDft: 0, intensityLevel: "low" },
				cpitnIndex: {
					sextant18_14: "0_healthy",
					sextant13_23: "0_healthy",
					sextant24_28: "0_healthy",
					sextant48_44: "0_healthy",
					sextant43_33: "0_healthy",
					sextant34_38: "0_healthy",
					treatmentNeedCategory: "0_none",
				},
				hygieneIndexOhiS: { debrisScore: 0.4, calculusScore: 0.3, totalScore: 0.7, ratingText: "Удовлетворительная" },
				biteType: "orthognathic",
				biteDescription: "Ортогнатический",
				oralMucosaStatus: {
					color: "pale_pink_normal",
					moisture: "normal",
					gingivalPapillae: "normal_pointed",
					bleedingPBI: "grade_0",
					tongueStatus: "Язык чистый, влажный",
					regionalLymphNodes: "Лимфоузлы не увеличены",
					tmjFunction: "Движения в ВНЧС в полном объеме",
				},
				xrayFindingsDescription: "КЛКТ: зуб 3.8 расположен горизонтально, коронка упирается в шейку 3.7.",
				xrayRadiationDoseMsv: 0.035,
			},
			generalTreatmentPlan: "Атипичное удаление зуба 3.8.",
			visitDiaries: [
				{
					id: "vd-02",
					entryDate: "2026-08-21",
					toothNumber: "38",
					subjectiveComplaints: "Ноющие боли.",
					objectiveStatusLocalis: "Слизистая в области зуба 3.8 гиперемирована, зуб не прорезался.",
					assessmentDiagnosisText: "Ретенция зуба 3.8",
					assessmentIcd10Code: "K07.3",
					procedureProtocol: "Проведено сложное удаление зуба 3.8 с выпиливанием костного фрагмента.",
					anesthesiaDetails: "", // Дефект: отсутствует протокол анестезии
					doctorFullName: "Кузнецов Денис Игоревич",
					isSignedWithUkep: false, // Дефект: нет подписи УКЭП
				},
			],
			epicrisis: {
				treatmentSummary: "Удален зуб 3.8.",
				treatmentOutcome: "treatment_in_progress",
				treatmentOutcomeLabel: "Лечение продолжается",
				dispensaryGroup: "D_I_healthy",
				dispensaryGroupLabel: "Д-I",
				plannedRecallIntervalMonths: 1,
				preventivePlanRecommendations: "Осмотр и снятие швов через 7 дней.",
				dateCompleted: "2026-08-21",
				attendingDoctorFullName: "Кузнецов Д.И.",
			},
		},
		attachedDocuments: [
			{ id: "doc-ids-2", type: "ids_323fz", title: "ИДС на хирургическое вмешательство", isSigned: false, signedByPatient: false, signedByDoctorUkep: false },
		],
		completedActItems: [
			{ serviceCode: "A16.07.024", serviceName: "Операция удаления зуба сложное с разъединением корней", toothNumber: "38", quantity: 1, priceRub: 9500 },
		],
		treatmentPlanItems: [
			{ serviceCode: "A16.07.024", serviceName: "Операция удаления зуба сложное с разъединением корней", toothNumber: "38", stage: "Хирургический этап" },
		],
		automatedCheckResults: [],
		automatedQualityScore: 35,
		cmoRemarks: [
			{
				id: "rem-101",
				presetId: "DEF-IDS-01",
				category: "INFORMED_CONSENT_323FZ",
				severity: "critical",
				title: "Отсутствует подпись пациента в ИДС на операцию",
				comment: "Операция сложного удаления 3.8 проведена без подписанного бланка согласия ст. 20 323-ФЗ.",
				affectedSection: "ids",
				createdAt: "2026-08-21T14:30:00Z",
				isResolved: false,
				doctorStaffId: "doc-02",
			},
			{
				id: "rem-102",
				presetId: "DEF-ANES-01",
				category: "ANESTHESIA_SAFETY",
				severity: "critical",
				title: "Отсутствует протокол анестезии при хирургическом вмешательстве",
				comment: "Не указан анестетик (наименование, объем, дозировка) при проведении операции.",
				affectedSection: "anesthesia",
				createdAt: "2026-08-21T14:31:00Z",
				isResolved: false,
				doctorStaffId: "doc-02",
			},
		],
		auditHistory: [],
	},
];

export interface CmoEmrAuditModalProps {
	isOpen: boolean;
	onClose: () => void;
	records?: EmrAuditRecord[] | undefined;
	initialRecord?: EmrAuditRecord | undefined;
	onSaveRecord?: ((updated: EmrAuditRecord) => void) | undefined;
	onApproveRecord?: ((recordId: string, resolution: CmoAuditResolution) => void) | undefined;
	onRejectRecord?: ((recordId: string, resolution: CmoAuditResolution) => void) | undefined;
	currentAuditorName?: string | undefined;
	currentAuditorRole?: ("chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair") | undefined;
}

export const CmoEmrAuditModal: React.FC<CmoEmrAuditModalProps> = ({
	isOpen,
	onClose,
	records: initialRecords,
	initialRecord,
	onSaveRecord,
	onApproveRecord,
	onRejectRecord,
	currentAuditorName = "Прохоров Константин Игоревич",
	currentAuditorRole = "chief_medical_officer",
}) => {
	// Инициализация записей с автоматическим расчетом аудита
	const [records, setRecords] = useState<EmrAuditRecord[]>(() => {
		let base = initialRecords && initialRecords.length > 0 ? initialRecords : INITIAL_DEMO_RECORDS;
		if (initialRecord && !base.some((r) => r.id === initialRecord.id)) {
			base = [initialRecord, ...base];
		}
		return base.map((rec: EmrAuditRecord) => {
			const auditRes = runAutomatedEmrAudit(rec);
			return {
				...rec,
				automatedCheckResults: auditRes.results,
				automatedQualityScore: calculateQualityScore(auditRes.results, rec.cmoRemarks),
			};
		});
	});

	useEffect(() => {
		if (isOpen) {
			let base = initialRecords && initialRecords.length > 0 ? initialRecords : INITIAL_DEMO_RECORDS;
			if (initialRecord && !base.some((r) => r.id === initialRecord.id)) {
				base = [initialRecord, ...base];
			}
			setRecords(
				base.map((rec: EmrAuditRecord) => {
					const auditRes = runAutomatedEmrAudit(rec);
					return {
						...rec,
						automatedCheckResults: auditRes.results,
						automatedQualityScore: calculateQualityScore(auditRes.results, rec.cmoRemarks),
					};
				})
			);
			if (initialRecord) {
				setSelectedRecordId(initialRecord.id);
			} else if (base[0]) {
				setSelectedRecordId(base[0].id);
			}
		}
	}, [initialRecords, initialRecord, isOpen]);

	const [activeTab, setActiveTab] = useState<"queue" | "doctor_kpi" | "statutory_presets" | "protocol_preview">("queue");
	const [selectedRecordId, setSelectedRecordId] = useState<string>(() => records[0]?.id || "");
	const [filterDoctor, setFilterDoctor] = useState<string>("all");
	const [filterStatus, setFilterStatus] = useState<EmrAuditStatus | "all">("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Состояние формы замечания начмеда
	const [isAddingRemark, setIsAddingRemark] = useState<boolean>(false);
	const [selectedPresetId, setSelectedPresetId] = useState<string>("");
	const [remarkComment, setRemarkComment] = useState<string>("");
	const [remarkSeverity, setRemarkSeverity] = useState<CmoDefectSeverity>("major");
	const [cmoDecisionComment, setCmoDecisionComment] = useState<string>("");

	// Разрешение замечания врачом (диалог)
	const [resolvingRemarkId, setResolvingRemarkId] = useState<string | null>(null);
	const [doctorResolutionText, setDoctorResolutionText] = useState<string>("");

	// Выбранная текущая запись
	const selectedRecord = useMemo(() => {
		return records.find((r: EmrAuditRecord) => r.id === selectedRecordId) || records[0] || null;
	}, [records, selectedRecordId]);

	// Фильтрованный список записей
	const filteredRecords = useMemo(() => {
		const filterArgs: AuditRecordFilters = {
			status: filterStatus,
			search: searchQuery,
		};
		if (filterDoctor !== "all") {
			filterArgs.doctorStaffId = filterDoctor;
		}
		return filterAuditRecords(records, filterArgs);
	}, [records, filterDoctor, filterStatus, searchQuery]);

	// Сводные метрики и рейтинг врачей
	const summaryReport = useMemo(() => {
		return generateCmoAuditSummaryReport(records);
	}, [records]);

	// Список уникальных врачей для селектора
	const doctorOptions = useMemo(() => {
		const map = new Map<string, string>();
		for (const r of records) {
			map.set(r.doctorStaffId, r.doctorFullName);
		}
		return Array.from(map.entries()).map(([id, name]: [string, string]) => ({ id, name }));
	}, [records]);

	if (!isOpen) return null;

	// ── Обработчики действий начмеда ──

	// 1-Click Утверждение карты
	const handleApprove = () => {
		if (!selectedRecord) return;
		const updated = applyCmoAuditDecision(selectedRecord, "approved", {
			fullName: currentAuditorName,
			role: currentAuditorRole,
			comment: cmoDecisionComment || "Медицинская карта формы 043/у проверена. Соответствует Приказу № 834н и критериям качества Приказа № 203н.",
		});

		setRecords((prev: EmrAuditRecord[]) => prev.map((r: EmrAuditRecord) => (r.id === updated.id ? updated : r)));
		setCmoDecisionComment("");
		if (onSaveRecord) {
			onSaveRecord(updated);
		}
		if (onApproveRecord && updated.cmoResolution) {
			onApproveRecord(updated.id, updated.cmoResolution);
		}
	};

	// Отклонение с замечаниями
	const handleRejectWithRemarks = () => {
		if (!selectedRecord) return;
		const updated = applyCmoAuditDecision(selectedRecord, "rejected_with_remarks", {
			fullName: currentAuditorName,
			role: currentAuditorRole,
			comment: cmoDecisionComment || "Карта возвращена на доработку. Устраните выявленные дефекты оформления.",
		});

		setRecords((prev: EmrAuditRecord[]) => prev.map((r: EmrAuditRecord) => (r.id === updated.id ? updated : r)));
		setCmoDecisionComment("");
		if (onSaveRecord) {
			onSaveRecord(updated);
		}
		if (onRejectRecord && updated.cmoResolution) {
			onRejectRecord(updated.id, updated.cmoResolution);
		}
	};

	// Добавление структурированного замечания из пресета
	const handleAddStructuredRemark = () => {
		if (!selectedRecord) return;
		const preset = CMO_STATUTORY_DEFECT_PRESETS.find((p: CmoDefectPreset) => p.id === selectedPresetId);
		const title = preset ? preset.title : "Замечание службы контроля качества";
		const category = preset ? preset.category : "CLINICAL_DIARY_SOAP";
		const affectedSection = preset ? preset.targetSection : "diaries";

		const remarkPayload: Omit<CmoAuditRemark, "id" | "createdAt" | "isResolved"> = {
			category,
			severity: remarkSeverity,
			title,
			comment: remarkComment || preset?.description || "Требуется исправление",
			affectedSection,
			doctorStaffId: selectedRecord.doctorStaffId,
		};
		if (preset?.id) {
			remarkPayload.presetId = preset.id;
		}

		const updated = addCmoRemark(selectedRecord, remarkPayload);

		setRecords((prev: EmrAuditRecord[]) => prev.map((r: EmrAuditRecord) => (r.id === updated.id ? updated : r)));
		if (onSaveRecord) {
			onSaveRecord(updated);
		}
		setIsAddingRemark(false);
		setSelectedPresetId("");
		setRemarkComment("");
	};

	// Исправление замечания врачом
	const handleResolveRemarkSubmit = (remarkId: string) => {
		if (!selectedRecord || !doctorResolutionText.trim()) return;
		const updated = resolveCmoRemark(selectedRecord, remarkId, doctorResolutionText, selectedRecord.doctorFullName);
		setRecords((prev: EmrAuditRecord[]) => prev.map((r: EmrAuditRecord) => (r.id === updated.id ? updated : r)));
		if (onSaveRecord) {
			onSaveRecord(updated);
		}
		setResolvingRemarkId(null);
		setDoctorResolutionText("");
	};

	// Выбор пресета в пикере
	const handleSelectPreset = (preset: CmoDefectPreset) => {
		setSelectedPresetId(preset.id);
		setRemarkSeverity(preset.severity);
		setRemarkComment(preset.description);
	};

	return (
		<div className="cmo-audit-backdrop" role="dialog" aria-modal="true">
			<div className="cmo-audit-modal">
				{/* ── Top Header Toolbar ── */}
				<header className="cmo-audit-header">
					<div className="cmo-audit-header-title-group">
						<span className="cmo-audit-badge-cmo">
							<ShieldCheck size={16} />
							СЛУЖБА КЭР & ВРАЧЕБНАЯ КОМИССИЯ
						</span>
						<h2 className="cmo-audit-title">Экспертиза качества медицинских карт Формы 043/у</h2>
					</div>

					<div className="cmo-audit-header-stats">
						<div className="cmo-audit-stat-pill">
							<Clock size={14} className="text-amber-500" />
							<span>На проверке: <strong>{summaryReport.pendingCount}</strong></span>
						</div>
						<div className="cmo-audit-stat-pill">
							<Award size={14} className="text-[var(--teal,#0d9488)]" />
							<span>Средний балл: <strong>{summaryReport.averageQualityScore}%</strong></span>
						</div>
						<div className="cmo-audit-stat-pill">
							<CheckCircle2 size={14} className="text-[var(--ok-fg,#059669)]" />
							<span>С первого раза: <strong>{summaryReport.firstPassRateAvg}%</strong></span>
						</div>

						<button
							type="button"
							className="cmo-audit-close-btn"
							onClick={onClose}
							aria-label="Закрыть окно аудита"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* ── Navigation Tabs ── */}
				<nav className="cmo-audit-nav-tabs">
					<button
						type="button"
						className={`cmo-audit-tab-btn ${activeTab === "queue" ? "active" : ""}`}
						onClick={() => setActiveTab("queue")}
					>
						<FileText size={16} />
						Очередь проверки карт ({records.length})
					</button>
					<button
						type="button"
						className={`cmo-audit-tab-btn ${activeTab === "doctor_kpi" ? "active" : ""}`}
						onClick={() => setActiveTab("doctor_kpi")}
					>
						<Stethoscope size={16} />
						Аналитика и рейтинг врачей ({summaryReport.doctorRankings.length})
					</button>
					<button
						type="button"
						className={`cmo-audit-tab-btn ${activeTab === "statutory_presets" ? "active" : ""}`}
						onClick={() => setActiveTab("statutory_presets")}
					>
						<FileWarning size={16} />
						Критерии Росздравнадзора (Приказ 203н)
					</button>
					{selectedRecord && (
						<button
							type="button"
							className={`cmo-audit-tab-btn ${activeTab === "protocol_preview" ? "active" : ""}`}
							onClick={() => setActiveTab("protocol_preview")}
						>
							<Printer size={16} />
							Акт экспертизы КЭР #{selectedRecord.recordNumber}
						</button>
					)}
				</nav>

				{/* ── Main Tab Content ── */}
				<main className="cmo-audit-body">
					{activeTab === "queue" && (
						<div className="cmo-audit-master-detail">
							{/* ── Left Sidebar Queue ── */}
							<aside className="cmo-audit-queue-sidebar">
								<div className="cmo-audit-sidebar-filter">
									<input
										type="text"
										className="cmo-audit-search-input"
										placeholder="Поиск по пациенту, карте, врачу..."
										value={searchQuery}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
									/>

									<div style={{ display: "flex", gap: "8px" }}>
										<select
											className="cmo-audit-select-filter"
											style={{ flex: 1 }}
											value={filterStatus}
											onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as any)}
										>
											<option value="all">Все статусы ({records.length})</option>
											<option value="pending_review">На проверке</option>
											<option value="rejected_with_remarks">С замечаниями</option>
											<option value="approved">Утвержденные</option>
										</select>

										<select
											className="cmo-audit-select-filter"
											style={{ flex: 1 }}
											value={filterDoctor}
											onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterDoctor(e.target.value)}
										>
											<option value="all">Все врачи</option>
											{doctorOptions.map((doc: { id: string; name: string }) => (
												<option key={doc.id} value={doc.id}>{doc.name}</option>
											))}
										</select>
									</div>
								</div>

								<div className="cmo-audit-record-list">
									{filteredRecords.length === 0 ? (
										<div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
											Записи не найдены по выбранным фильтрам
										</div>
									) : (
										filteredRecords.map((rec: EmrAuditRecord) => {
											const isAct = rec.id === selectedRecord?.id;
											const scoreClass = rec.automatedQualityScore >= 90 ? "green" : rec.automatedQualityScore >= 70 ? "yellow" : "red";
											return (
												<div
													key={rec.id}
													className={`cmo-audit-record-card ${isAct ? "active" : ""}`}
													onClick={() => setSelectedRecordId(rec.id)}
												>
													<div className="cmo-audit-card-top">
														<span className="cmo-audit-patient-name">{rec.patientFullName}</span>
														<span className={`cmo-audit-score-pill ${scoreClass}`}>
															{rec.automatedQualityScore}%
														</span>
													</div>
													<div className="cmo-audit-card-mid">
														<span>Карта: {rec.medicalCardId}</span>
														<span>{rec.visitDate}</span>
													</div>
													<div className="cmo-audit-card-mid">
														<span style={{ fontWeight: 600 }}>{rec.doctorFullName}</span>
														<span className={`cmo-audit-status-tag ${rec.status}`}>
															{rec.status === "approved" ? "Утверждено" : rec.status === "rejected_with_remarks" ? "Замечания" : "На проверке"}
														</span>
													</div>
												</div>
											);
										})
									)}
								</div>
							</aside>

							{/* ── Right Inspector Panel ── */}
							{selectedRecord ? (
								<section className="cmo-audit-inspector">
									<div className="cmo-audit-inspector-header">
										<div>
											<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
												<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
													{selectedRecord.patientFullName}
												</h3>
												<span style={{ fontSize: "12px", color: "var(--muted)" }}>
													({selectedRecord.patientBirthDate}, {selectedRecord.patientGender === "male" ? "Муж." : "Жен."})
												</span>
												<span className={`cmo-audit-status-tag ${selectedRecord.status}`}>
													{selectedRecord.status === "approved" ? "Утверждено" : selectedRecord.status === "rejected_with_remarks" ? "Замечания КЭР" : "Ожидает решения"}
												</span>
											</div>
											<div style={{ fontSize: "13px", color: "var(--muted)", display: "flex", gap: "16px" }}>
												<span>Карта 043/у: <strong>{selectedRecord.medicalCardId}</strong></span>
												<span>Врач: <strong>{selectedRecord.doctorFullName}</strong> ({selectedRecord.doctorSpecialty})</span>
												<span>Диагноз: <strong>{selectedRecord.cardData.passport.primaryDiagnosisIcd10}</strong></span>
											</div>
										</div>

										<div style={{ textAlign: "right" }}>
											<div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
												Индекс качества КЭР
											</div>
											<div style={{ fontSize: "24px", fontWeight: 800, color: selectedRecord.automatedQualityScore >= 90 ? "var(--ok-fg)" : selectedRecord.automatedQualityScore >= 70 ? "var(--warn-fg)" : "var(--bad-fg)" }}>
												{selectedRecord.automatedQualityScore} / 100
											</div>
										</div>
									</div>

									<div className="cmo-audit-inspector-scroll">
										{/* ── 1. Автоматический чек-лист проверок ── */}
										<div className="cmo-audit-section">
											<div className="cmo-audit-section-title">
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<ShieldCheck size={16} className="text-[var(--teal,#0d9488)]" />
													<span>Автоматический аудит по Приказу № 203н и стандартам ЕГИСЗ</span>
												</div>
												<span style={{ fontSize: "12px", color: "var(--muted)" }}>
													Успешно: {selectedRecord.automatedCheckResults.filter((r: EmrAutomatedCheckResult) => r.passed).length} из {selectedRecord.automatedCheckResults.length}
												</span>
											</div>
											<div className="cmo-audit-section-body">
												<div className="cmo-audit-checks-grid">
													{selectedRecord.automatedCheckResults.map((check: EmrAutomatedCheckResult) => (
														<div
															key={check.ruleId}
															className={`cmo-audit-check-item ${check.passed ? "passed" : "failed"}`}
														>
															<div className="cmo-audit-check-header">
																<span>{check.title}</span>
																{check.passed ? (
																	<CheckCircle2 size={16} color="var(--ok-fg)" />
																) : (
																	<XCircle size={16} color="var(--bad-fg)" />
																)}
															</div>
															<div className="cmo-audit-check-detail">{check.details}</div>
															<div className="cmo-audit-check-statute">{check.statutoryRef}</div>
														</div>
													))}
												</div>
											</div>
										</div>

										{/* ── 2. Дневниковая запись приема (SOAP) ── */}
										<div className="cmo-audit-section">
											<div className="cmo-audit-section-title">
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<Activity size={16} className="text-[var(--teal,#0d9488)]" />
													<span>Клинический дневник приема (SOAP протокол)</span>
												</div>
												{selectedRecord.cardData.visitDiaries[0]?.isSignedWithUkep && (
													<span style={{ fontSize: "11px", color: "var(--ok-fg)", fontWeight: 700 }}>
														✓ ПОДПИСАНО УКЭП
													</span>
												)}
											</div>
											<div className="cmo-audit-section-body">
												{selectedRecord.cardData.visitDiaries.map((vd: VisitDiaryEntry043, i: number) => (
													<div key={vd.id || i} style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
														<div><strong>S (Жалобы):</strong> {vd.subjectiveComplaints || "—"}</div>
														<div><strong>O (Status localis):</strong> {vd.objectiveStatusLocalis || "—"}</div>
														<div><strong>A (Диагноз):</strong> {vd.assessmentIcd10Code} — {vd.assessmentDiagnosisText}</div>
														<div><strong>P (Протокол лечения):</strong> {vd.procedureProtocol || "—"}</div>
														{vd.anesthesiaDetails && (
															<div style={{ color: "var(--teal)" }}>
																<strong>Анестезия:</strong> {vd.anesthesiaDetails}
															</div>
														)}
														{vd.appliedMaterials && (
															<div><strong>Материалы:</strong> {vd.appliedMaterials}</div>
														)}
													</div>
												))}
											</div>
										</div>

										{/* ── 3. Прикрепленная юридическая и финансовая документация ── */}
										<div className="cmo-audit-section">
											<div className="cmo-audit-section-title">
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<FileText size={16} className="text-[var(--teal,#0d9488)]" />
													<span>Прикрепленная документация и согласование с актом</span>
												</div>
											</div>
											<div className="cmo-audit-section-body">
												<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
													<div>
														<h4 style={{ margin: "0 0 8px 0", fontSize: "13px" }}>Документы пациента:</h4>
														<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
															{selectedRecord.attachedDocuments.map((doc: AttachedEmrDocument) => (
																<div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", padding: "6px 10px", background: "var(--paper)", borderRadius: "6px" }}>
																	<span>{doc.title}</span>
																	{doc.isSigned && doc.signedByPatient ? (
																		<span style={{ color: "var(--ok-fg)", fontWeight: 700 }}>✓ Подписано пациентом</span>
																	) : (
																		<span style={{ color: "var(--bad-fg)", fontWeight: 700 }}>✗ Нет подписи</span>
																	)}
																</div>
															))}
														</div>
													</div>

													<div>
														<h4 style={{ margin: "0 0 8px 0", fontSize: "13px" }}>Услуги в акте выполненных работ:</h4>
														<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
															{selectedRecord.completedActItems.map((act: CompletedActItem, i: number) => (
																<div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", padding: "6px 10px", background: "var(--paper)", borderRadius: "6px", gap: "8px" }}>
																	<span style={{ minWidth: 0, wordBreak: "break-word" }}>{act.serviceName} {act.toothNumber ? `(зуб ${act.toothNumber})` : ""}</span>
																	<span style={{ fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{act.priceRub} ₽</span>
																</div>
															))}
														</div>
													</div>
												</div>
											</div>
										</div>

										{/* ── 4. Замечания Главного врача и Врачебной комиссии ── */}
										<div className="cmo-audit-section">
											<div className="cmo-audit-section-title">
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<MessageSquare size={16} className="text-[var(--teal,#0d9488)]" />
													<span>Замечания эксперта КЭР ({selectedRecord.cmoRemarks.length})</span>
												</div>
												<button
													type="button"
													className="cmo-preset-chip"
													onClick={() => setIsAddingRemark(!isAddingRemark)}
												>
													<Plus size={14} />
													Добавить замечание
												</button>
											</div>

											<div className="cmo-audit-section-body">
												{/* Форма добавления нового замечания */}
												{isAddingRemark && (
													<div className="cmo-defect-picker-box">
														<div style={{ fontSize: "13px", fontWeight: 700 }}>
															Выберите типовой дефект из справочника Росздравнадзора:
														</div>
														<div className="cmo-preset-chip-grid">
															{CMO_STATUTORY_DEFECT_PRESETS.map((preset: CmoDefectPreset) => (
																<button
																	key={preset.id}
																	type="button"
																	className={`cmo-preset-chip ${selectedPresetId === preset.id ? "active" : ""}`}
																	onClick={() => handleSelectPreset(preset)}
																>
																	<AlertTriangle size={12} color={preset.severity === "critical" ? "var(--bad-fg)" : "var(--warn-fg)"} />
																	{preset.title}
																</button>
															))}
														</div>

														<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
															<span style={{ fontSize: "12px", fontWeight: 600 }}>Критичность:</span>
															<select
																className="cmo-audit-select-filter"
																value={remarkSeverity}
																onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRemarkSeverity(e.target.value as any)}
															>
																<option value="critical">Критический (-25 б.)</option>
																<option value="major">Существенный (-15 б.)</option>
																<option value="minor">Незначительный (-5 б.)</option>
															</select>
														</div>

														<textarea
															className="cmo-audit-search-input"
															rows={3}
															placeholder="Комментарий эксперта КЭР и предписание по исправлению..."
															value={remarkComment}
															onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemarkComment(e.target.value)}
														/>

														<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
															<button
																type="button"
																className="cmo-btn cmo-btn-secondary"
																onClick={() => setIsAddingRemark(false)}
															>
																Отмена
															</button>
															<button
																type="button"
																className="cmo-btn cmo-btn-reject"
																onClick={handleAddStructuredRemark}
															>
																Зафиксировать дефект
															</button>
														</div>
													</div>
												)}

												{/* Список существующих замечаний */}
												{selectedRecord.cmoRemarks.length === 0 ? (
													<div style={{ color: "var(--muted)", fontSize: "13px", padding: "8px 0" }}>
														Замечаний нет. Карта заполнена в соответствии с клиническими рекомендациями.
													</div>
												) : (
													selectedRecord.cmoRemarks.map((rem: CmoAuditRemark) => (
														<div
															key={rem.id}
															style={{
																padding: "12px",
																borderRadius: "8px",
																border: `1px solid ${rem.isResolved ? "var(--glass-border)" : rem.severity === "critical" ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
																background: rem.isResolved ? "var(--paper)" : rem.severity === "critical" ? "rgba(220, 38, 38, 0.05)" : "rgba(202, 138, 4, 0.05)",
																display: "flex",
																flexDirection: "column",
																gap: "6px",
															}}
														>
															<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
																<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
																	<AlertTriangle size={14} color={rem.severity === "critical" ? "var(--bad-fg)" : "var(--warn-fg)"} />
																	<span style={{ fontWeight: 700, fontSize: "13px" }}>{rem.title}</span>
																	<span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 800, color: rem.severity === "critical" ? "var(--bad-fg)" : "var(--warn-fg)" }}>
																		[{rem.severity}]
																	</span>
																</div>
																{rem.isResolved ? (
																	<span style={{ fontSize: "12px", color: "var(--ok-fg)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
																		<Check size={14} /> Устранено
																	</span>
																) : (
																	<span style={{ fontSize: "12px", color: "var(--bad-fg)", fontWeight: 700 }}>
																		Требует исправления
																	</span>
																)}
															</div>

															<div style={{ fontSize: "12px", color: "var(--ink)" }}>{rem.comment}</div>

															{rem.isResolved && rem.resolutionComment && (
																<div style={{ fontSize: "12px", color: "var(--muted)", padding: "4px 8px", background: "var(--paper-strong)", borderRadius: "4px" }}>
																	<strong>Ответ врача:</strong> {rem.resolutionComment}
																</div>
															)}

															{!rem.isResolved && (
																<div style={{ marginTop: "4px" }}>
																	{resolvingRemarkId === rem.id ? (
																		<div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
																			<input
																				type="text"
																				className="cmo-audit-search-input"
																				style={{ flex: 1 }}
																				placeholder="Комментарий врача об устранении..."
																				value={doctorResolutionText}
																				onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoctorResolutionText(e.target.value)}
																			/>
																			<button
																				type="button"
																				className="cmo-btn cmo-btn-approve"
																				style={{ minHeight: "36px", padding: "4px 12px", fontSize: "12px" }}
																				onClick={() => handleResolveRemarkSubmit(rem.id)}
																			>
																				Подтвердить
																			</button>
																			<button
																				type="button"
																				className="cmo-btn cmo-btn-secondary"
																				style={{ minHeight: "36px", padding: "4px 12px", fontSize: "12px" }}
																				onClick={() => setResolvingRemarkId(null)}
																			>
																				Отмена
																			</button>
																		</div>
																	) : (
																		<button
																			type="button"
																			className="cmo-preset-chip"
																			style={{ minHeight: "32px", fontSize: "11px" }}
																			onClick={() => {
																				setResolvingRemarkId(rem.id);
																				setDoctorResolutionText("");
																			}}
																		>
																			Отметить как исправленное врачом
																		</button>
																	)}
																</div>
															)}
														</div>
													))
												)}
											</div>
										</div>
									</div>

									{/* ── Нижняя панель принятия решения начмеда ── */}
									<footer className="cmo-audit-action-bar">
										<div style={{ flex: 1, minWidth: "260px" }}>
											<input
												type="text"
												className="cmo-audit-search-input"
												style={{ width: "100%" }}
												placeholder="Заключение начмеда / предписание врачу..."
												value={cmoDecisionComment}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCmoDecisionComment(e.target.value)}
											/>
										</div>

										<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
											<button
												type="button"
												className="cmo-btn cmo-btn-secondary"
												onClick={() => setActiveTab("protocol_preview")}
											>
												<Printer size={16} />
												Печать протокола КЭР
											</button>

											<button
												type="button"
												className="cmo-btn cmo-btn-reject"
												onClick={handleRejectWithRemarks}
											>
												<XCircle size={16} />
												Вернуть с замечаниями
											</button>

											<button
												type="button"
												className="cmo-btn cmo-btn-approve"
												onClick={handleApprove}
											>
												<CheckCircle2 size={16} />
												Утвердить карту 043/у
											</button>
										</div>
									</footer>
								</section>
							) : (
								<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
									Выберите карту из списка для экспертизы
								</div>
							)}
						</div>
					)}

					{/* ── Doctor KPI Tab ── */}
					{activeTab === "doctor_kpi" && (
						<div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
							<div>
								<h3 style={{ margin: "0 0 6px 0", fontSize: "18px" }}>Рейтинг качества ведения медицинской документации</h3>
								<p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
									Анализ дефектуры и доли первичного утверждения карт без замечаний (Order 203n KPI).
								</p>
							</div>

							<div className="cmo-audit-table-wrap">
								<table className="cmo-audit-table">
									<thead>
										<tr>
											<th>Врач / Специальность</th>
											<th>Проверено карт</th>
											<th>С 1-го раза</th>
											<th>С замечаниями</th>
											<th>Возвратов</th>
											<th>Средний балл</th>
											<th>Рейтинг надежности</th>
										</tr>
									</thead>
									<tbody>
										{summaryReport.doctorRankings.map((doc: DoctorQualityMetrics) => (
											<tr key={doc.doctorStaffId}>
												<td>
													<div style={{ fontWeight: 700 }}>{doc.doctorFullName}</div>
													<div style={{ fontSize: "11px", color: "var(--muted)" }}>{doc.doctorSpecialty}</div>
												</td>
												<td>{doc.totalRecordsAudited}</td>
												<td><strong style={{ color: "var(--ok-fg)" }}>{doc.firstTimeApprovalRate}%</strong> ({doc.approvedFirstAttempt})</td>
												<td>{doc.approvedWithRemarks}</td>
												<td>{doc.rejectedCount}</td>
												<td>
													<span className={`cmo-audit-score-pill ${doc.overallQualityScoreAvg >= 90 ? "green" : doc.overallQualityScoreAvg >= 70 ? "yellow" : "red"}`}>
														{doc.overallQualityScoreAvg} / 100
													</span>
												</td>
												<td>
													{doc.complianceRating === "excellent" ? (
														<span style={{ color: "var(--ok-fg)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
															<CheckCircle2 size={14} aria-hidden="true" />
															<span>Отличный (Высокая надежность)</span>
														</span>
													) : doc.complianceRating === "good" ? (
														<span style={{ color: "var(--teal)", fontWeight: 700 }}>Хороший</span>
													) : doc.complianceRating === "satisfactory" ? (
														<span style={{ color: "var(--warn-fg)", fontWeight: 700 }}>Удовлетворительный</span>
													) : (
														<span style={{ color: "var(--bad-fg)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
															<AlertTriangle size={14} aria-hidden="true" />
															<span>Риск санкций страховой</span>
														</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ── Statutory Presets Tab ── */}
					{activeTab === "statutory_presets" && (
						<div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
							<div>
								<h3 style={{ margin: "0 0 6px 0", fontSize: "18px" }}>Справочник дефектов и нормативных критериев (Приказ № 203н)</h3>
								<p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
									Официальные критерии качества Росздравнадзора, ФОМС и страховых медицинских организаций (СМО).
								</p>
							</div>

							<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
								{CMO_STATUTORY_DEFECT_PRESETS.map((preset: CmoDefectPreset) => (
									<div key={preset.id} className="cmo-audit-section">
										<div className="cmo-audit-section-title">
											<span>{preset.title}</span>
											<span style={{ fontSize: "11px", fontWeight: 800, color: preset.severity === "critical" ? "var(--bad-fg)" : "var(--warn-fg)" }}>
												{preset.code} (-{preset.penaltyScore} б.)
											</span>
										</div>
										<div className="cmo-audit-section-body" style={{ fontSize: "12px", gap: "8px" }}>
											<p style={{ margin: 0, color: "var(--ink)" }}>{preset.description}</p>
											<div style={{ color: "var(--teal)", fontWeight: 600 }}>
												Норматив: {preset.statutoryReference}
											</div>
											<div style={{ color: "var(--muted)" }}>
												<strong>Рекомендация:</strong> {preset.recommendedAction}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* ── Printable Protocol Preview Tab ── */}
					{activeTab === "protocol_preview" && selectedRecord && (
						<div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<h3 style={{ margin: 0, fontSize: "16px" }}>
									Протокол клинико-экспертной оценки карты #{selectedRecord.medicalCardId}
								</h3>
								<button
									type="button"
									className="cmo-btn cmo-btn-approve"
									onClick={() => window.print()}
								>
									<Printer size={16} />
									Распечатать акт КЭР
								</button>
							</div>

							<pre
								style={{
									padding: "20px",
									background: "var(--paper)",
									borderRadius: "8px",
									border: "1px solid var(--glass-border)",
									fontFamily: "monospace",
									fontSize: "13px",
									lineHeight: 1.5,
									whiteSpace: "pre-wrap",
									color: "var(--ink)",
								}}
							>
								{exportCmoAuditProtocolText(selectedRecord)}
							</pre>
						</div>
					)}
				</main>
			</div>
		</div>
	);
};

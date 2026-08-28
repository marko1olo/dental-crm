/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO CLINICAL QUALITY & FORM 043/U AUDIT MODAL (WAVE 9)
 * Chief Medical Officer (Начмед) Quality Control & VKK 785n Audit HUD
 * Touch-First Ergonomics, Medical Density, Tokenized Theme, Print-Ready
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from "react";
import {
	ShieldCheck,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	FileText,
	Printer,
	Clock,
	Check,
	X,
	Plus,
	Search,
	TrendingUp,
	Users,
	FileWarning,
	Stethoscope,
	Send,
	Download,
	Sparkles,
} from "lucide-react";
import {
	type CmoQualityAuditRecord,
	type CmoAuditStatus,
	type VkkControlLevel,
	type CmoDefectRemark,
	type CmoAuditFilterParams,
	type CmoDefectPreset,
	type CmoDoctorQualityRanking,
	CMO_STATUTORY_DEFECT_PRESETS,
	runCmoQualityAudit,
	calculateFinalCmoQualityScore,
	createCmoAuditRecord,
	addCmoDefectRemark,
	resolveCmoDefectRemark,
	applyCmoResolution,
	generateVkkExpertiseAct,
	exportVkkExpertiseActText,
	filterCmoAuditRecords,
	calculateCmoDoctorRankings,
	generateCmoVkkSummaryReport,
} from "./clinicalQualityEngine";
import "./clinicalQuality.css";

// ── Realistic Russian Initial Clinical Audit Records (Cases) ──
const INITIAL_DEMO_AUDIT_RECORDS: CmoQualityAuditRecord[] = [
	createCmoAuditRecord({
		id: "audit-001",
		recordNumber: "КЭР-2026-0841",
		medicalCardId: "СТ-2026-0841",
		patientId: "pat-101",
		patientFullName: "Смирнов Алексей Владимирович",
		patientBirthDate: "1990-05-15",
		patientGender: "male",
		patientPhone: "+7 (916) 555-43-21",
		doctorStaffId: "doc-01",
		doctorFullName: "Волкова Екатерина Сергеевна",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		visitDate: "2026-08-20",
		status: "approved",
		controlLevel: "level_2_cmo_expert",
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
				chiefDoctorFullName: "Барабаш С.В.",
			},
			passport: {
				medicalCardNumber: "СТ-2026-0841",
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
				biteDescription: "Ортогнатический прикус",
				oralMucosaStatus: {
					color: "pale_pink_normal",
					moisture: "normal",
					gingivalPapillae: "normal_pointed",
					bleedingPBI: "grade_0",
					tongueStatus: "Язык чистый, влажный",
					regionalLymphNodes: "Лимфоузлы не увеличены",
					tmjFunction: "Движения в ВНЧС в полном объеме",
				},
				xrayFindingsDescription: "Дефект дентина жевательной поверхности 1.6 без изменений в периодонте.",
				xrayRadiationDoseMsv: 0.004,
			},
			generalTreatmentPlan: "1. Лечение кариеса 1.6. 2. Профосмотр через 6 мес.",
			visitDiaries: [
				{
					id: "vd-01",
					entryDate: "2026-08-20",
					toothNumber: "16",
					subjectiveComplaints: "Жалобы на кратковременные боли от холодного.",
					objectiveStatusLocalis: "Кариозная полость средней глубины на жевательной поверхности зуба 1.6, зондирование слабо болезненно по эмалево-дентинной границе.",
					assessmentDiagnosisText: "Кариес дентина зуба 1.6",
					assessmentIcd10Code: "K02.1",
					procedureProtocol: "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл (партия 24B012). Изоляция коффердамом. Препарирование кариозной полости, медикаментозная обработка 2% хлоргексидином, бондинг OptiBond FL, реставрация Ceram.x Spectra ST A2, шлифовка, полировка.",
					anesthesiaDetails: "Sol. Ubistesini 4% 1.7 мл инфильтрационно (партия 24B012)",
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
			{ id: "doc-ids-1", type: "ids_1051n", title: "ИДС на стоматологическое лечение (Приказ 1051н)", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
		],
		completedServices: [
			{ serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (кариес дентина)", toothNumber: "16", quantity: 1, priceRub: 5500 },
			{ serviceCode: "B01.003.004.001", serviceName: "Местная анестезия (Убистезин 4%)", toothNumber: "16", quantity: 1, priceRub: 900 },
		],
	}),

	createCmoAuditRecord({
		id: "audit-002",
		recordNumber: "КЭР-2026-0842",
		medicalCardId: "СТ-2026-0842",
		patientId: "pat-102",
		patientFullName: "Иванова Марина Дмитриевна",
		patientBirthDate: "1985-11-03",
		patientGender: "female",
		patientPhone: "+7 (925) 444-12-89",
		doctorStaffId: "doc-02",
		doctorFullName: "Кузнецов Денис Игоревич",
		doctorSpecialty: "Врач-стоматолог-терапевт-эндодонтист",
		visitDate: "2026-08-21",
		status: "pending_review",
		controlLevel: "level_2_cmo_expert",
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
				chiefDoctorFullName: "Барабаш С.В.",
			},
			passport: {
				medicalCardNumber: "СТ-2026-0842",
				cardOpenedDate: "2026-08-21",
				patientFullName: "Иванова Марина Дмитриевна",
				patientBirthDate: "1985-11-03",
				patientSex: "female",
				patientAddressRegistration: "г. Москва, Ломоносовский пр-кт, д. 18, кв. 45",
				patientIdentityDocument: "Паспорт РФ 45 10 № 654321",
				primaryDiagnosisText: "Хронический пульпит зуба 2.6",
				primaryDiagnosisIcd10: "K04.0",
				attendingDoctorFullName: "Кузнецов Денис Игоревич",
				attendingDoctorSpecialty: "Врач-стоматолог-терапевт-эндодонтист",
			},
			anamnesis: {
				chiefComplaint: "Приступообразные ночные боли в зубе 2.6, усиливающиеся от горячего.",
				historyOfPresentIllness: "Боли беспокоят 3 дня.",
				medicalHistoryVitae: "Хронический гастрит в анамнезе.",
				allergologicalHistory: "Аллергии нет.",
				concomitantSomaticDiseases: "Гастрит",
				currentSystemicMedications: "Нет",
				pregnancyLactationStatus: "Не беременна",
				pastDentalInterventions: "Лечение кариеса.",
			},
			dentalStatus: {
				odontogramTeeth: [],
				dmftIndex: { decayed: 2, filled: 3, missing: 0, totalDmft: 5, decayedSurfaces: 2, filledSurfaces: 3, totalDmfs: 5, deciduousDecayed: 0, deciduousFilled: 0, deciduousExtracted: 0, totalDft: 0, intensityLevel: "medium" },
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
				biteDescription: "Ортогнатический прикус",
				oralMucosaStatus: {
					color: "pale_pink_normal",
					moisture: "normal",
					gingivalPapillae: "normal_pointed",
					bleedingPBI: "grade_0",
					tongueStatus: "Чистый",
					regionalLymphNodes: "Не увеличены",
					tmjFunction: "Норма",
				},
				xrayFindingsDescription: "На контрольном снимке (визиография) 3 корневых канала зуба 2.6 плотно гомогенно обтурированы гуттаперчей и силером AH Plus строго до рентгенологического апекса.",
				xrayRadiationDoseMsv: 0.008,
			},
			generalTreatmentPlan: "1. Эндодонтическое лечение 2.6 под микроскопом с коффердамом. 2. Восстановление коронковой части.",
			visitDiaries: [
				{
					id: "vd-02",
					entryDate: "2026-08-21",
					toothNumber: "26",
					subjectiveComplaints: "Жалобы на самопроизвольные ночные боли в зубе 2.6.",
					objectiveStatusLocalis: "Глубокая кариозная полость на медиально-окклюзионной поверхности 2.6. Зондирование дна резко болезненно в одной точке. Перкуссия безболезненна.",
					assessmentDiagnosisText: "Хронический пульпит зуба 2.6",
					assessmentIcd10Code: "K04.0",
					procedureProtocol: "Мандибулярная и инфильтрационная анестезия Sol. Septanest 4% 1:100000 1.7 мл (партия 24C089). Изоляция операционного поля системой коффердам. Препарирование, раскрытие полости зуба, механическая обработка 3 корневых каналов ProTaper Gold до размера F2 под микроскопом. Ирригация 3% NaOCl с ультразвуковой активацией. Обтурация каналов методом вертикальной горячей конденсации (гуттаперча + AH Plus) до апекса. Контрольная визиография — обтурация плотная, до верхушки. Временная пломба Кавитрекс.",
					anesthesiaDetails: "Sol. Septanest 4% 1:100000 1.7 мл (серия 24C089)",
					appliedMaterials: "ProTaper Gold, NaOCl 3%, AH Plus, Gutta-percha, Cavit",
					doctorFullName: "Кузнецов Денис Игоревич",
					isSignedWithUkep: true,
					digitalSignatureHash: "b8c91d4e7f21a50438e9201bc89456789abcdef0123456789abcdef012345678",
				},
			],
			epicrisis: {
				treatmentSummary: "Эндодонтическое лечение зуба 2.6 завершено.",
				treatmentOutcome: "complete_cure",
				treatmentOutcomeLabel: "Выздоровление",
				dispensaryGroup: "D_I_healthy",
				dispensaryGroupLabel: "Д-I (Здоровые)",
				plannedRecallIntervalMonths: 6,
				preventivePlanRecommendations: "Избегать твердой пищи на стороне лечения до покрытия коронкой.",
				dateCompleted: "2026-08-21",
				attendingDoctorFullName: "Кузнецов Д.И.",
			},
		},
		attachedDocuments: [
			{ id: "doc-ids-2", type: "ids_1051n", title: "ИДС на эндодонтическое лечение (Приказ 1051н)", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-21" },
		],
		completedServices: [
			{ serviceCode: "A16.07.008.002", serviceName: "Пломбирование корневого канала зуба гуттаперчей (3 канала)", toothNumber: "26", quantity: 1, priceRub: 14500 },
			{ serviceCode: "B01.003.004.001", serviceName: "Местная анестезия (Септанест)", toothNumber: "26", quantity: 1, priceRub: 950 },
		],
	}),

	createCmoAuditRecord({
		id: "audit-003",
		recordNumber: "КЭР-2026-0843",
		medicalCardId: "СТ-2026-0843",
		patientId: "pat-103",
		patientFullName: "Петров Сергей Николаевич",
		patientBirthDate: "1978-03-22",
		patientGender: "male",
		doctorStaffId: "doc-03",
		doctorFullName: "Морозов Андрей Викторович",
		doctorSpecialty: "Врач-стоматолог-хирург",
		visitDate: "2026-08-22",
		status: "rejected_with_remarks",
		controlLevel: "level_2_cmo_expert",
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
				cardOpenedDate: "2026-08-22",
				patientFullName: "Петров Сергей Николаевич",
				patientBirthDate: "1978-03-22",
				patientSex: "male",
				patientAddressRegistration: "г. Москва, ул. Вавилова, д. 12, кв. 89",
				patientIdentityDocument: "Паспорт РФ 45 09 № 123789",
				primaryDiagnosisText: "Хронический апикальный периодонтит зуба 3.8 (показано удаление)",
				primaryDiagnosisIcd10: "K04.5",
				attendingDoctorFullName: "Морозов Андрей Викторович",
				attendingDoctorSpecialty: "Врач-стоматолог-хирург",
			},
			anamnesis: {
				chiefComplaint: "Ноющие боли в области нижнего зуба мудрости слева.",
				historyOfPresentIllness: "Зуб неоднократно болел, разрушен ниже уровня десны.",
				medicalHistoryVitae: "Здоров.",
				allergologicalHistory: "Аллергий нет.",
				concomitantSomaticDiseases: "Нет",
				currentSystemicMedications: "Нет",
				pregnancyLactationStatus: "Не применимо",
				pastDentalInterventions: "Удаления зубов без осложнений.",
			},
			dentalStatus: {
				odontogramTeeth: [],
				dmftIndex: { decayed: 3, filled: 4, missing: 1, totalDmft: 8, decayedSurfaces: 3, filledSurfaces: 4, totalDmfs: 8, deciduousDecayed: 0, deciduousFilled: 0, deciduousExtracted: 0, totalDft: 0, intensityLevel: "high" },
				cpitnIndex: {
					sextant18_14: "0_healthy",
					sextant13_23: "0_healthy",
					sextant24_28: "0_healthy",
					sextant48_44: "0_healthy",
					sextant43_33: "0_healthy",
					sextant34_38: "0_healthy",
					treatmentNeedCategory: "0_none",
				},
				hygieneIndexOhiS: { debrisScore: 0.5, calculusScore: 0.4, totalScore: 0.9, ratingText: "Удовлетворительная" },
				biteType: "orthognathic",
				biteDescription: "Норма",
				oralMucosaStatus: {
					color: "pale_pink_normal",
					moisture: "normal",
					gingivalPapillae: "normal_pointed",
					bleedingPBI: "grade_0",
					tongueStatus: "Чистый",
					regionalLymphNodes: "Не увеличены",
					tmjFunction: "Норма",
				},
				xrayFindingsDescription: "ОПТГ: коронка 3.8 разрушена, корни изогнуты.",
				xrayRadiationDoseMsv: 0.015,
			},
			generalTreatmentPlan: "1. Простое удаление зуба 3.8 под местной анестезией.",
			visitDiaries: [
				{
					id: "vd-03",
					entryDate: "2026-08-22",
					toothNumber: "38",
					subjectiveComplaints: "Жалобы на ноющие боли в 3.8.",
					objectiveStatusLocalis: "Коронка 3.8 разрушена ниже десны. Перкуссия слабо болезненна.",
					assessmentDiagnosisText: "Хронический апикальный периодонтит зуба 3.8",
					assessmentIcd10Code: "K04.5",
					procedureProtocol: "Торусальная анестезия Sol. Ultracaini DS 1.7 мл (без указания серии карпулы). Синдесмотомия, элеватором зуб 3.8 вывихнут и удален. Кюретаж лунки, гемостаз Альвостазом. Рекомендации даны.",
					anesthesiaDetails: "Sol. Ultracaini DS 1.7 мл",
					appliedMaterials: "Альвостаз",
					doctorFullName: "Морозов Андрей Викторович",
					isSignedWithUkep: true,
					digitalSignatureHash: "c9012e5f8a32b61549f0312cd9056789abcdef0123456789abcdef0123456789",
				},
			],
			epicrisis: {
				treatmentSummary: "Удаление зуба 3.8 выполнено без осложнений.",
				treatmentOutcome: "complete_cure",
				treatmentOutcomeLabel: "Выздоровление",
				dispensaryGroup: "D_I_healthy",
				dispensaryGroupLabel: "Д-I (Здоровые)",
				plannedRecallIntervalMonths: 6,
				preventivePlanRecommendations: "Холод на щеку 20 мин, не греть, ванночки с хлоргексидином со 2-го дня.",
				dateCompleted: "2026-08-22",
				attendingDoctorFullName: "Морозов А.В.",
			},
		},
		attachedDocuments: [
			{ id: "doc-ids-3", type: "ids_1051n", title: "ИДС на хирургическое вмешательство (Приказ 1051н)", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-22" },
		],
		completedServices: [
			{ serviceCode: "A16.07.001.001", serviceName: "Удаление постоянного зуба (простое)", toothNumber: "38", quantity: 1, priceRub: 3500 },
			{ serviceCode: "B01.003.004.001", serviceName: "Местная анестезия (Ультракаин)", toothNumber: "38", quantity: 1, priceRub: 900 },
		],
	}),
];

export interface CmoQualityAuditModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialRecordId?: string;
	onRecordApproved?: (recordId: string) => void;
}

export const CmoQualityAuditModal: React.FC<CmoQualityAuditModalProps> = ({
	isOpen,
	onClose,
	initialRecordId,
	onRecordApproved,
}) => {
	const [records, setRecords] = useState<CmoQualityAuditRecord[]>(INITIAL_DEMO_AUDIT_RECORDS);
	const [selectedRecordId, setSelectedRecordId] = useState<string>(initialRecordId || INITIAL_DEMO_AUDIT_RECORDS[0]?.id || "");
	const [activeTab, setActiveTab] = useState<"queue" | "inspection" | "vkk_registry" | "act_preview">("inspection");

	// Filter state
	const [filters, setFilters] = useState<CmoAuditFilterParams>({
		status: "all",
		controlLevel: "all",
		search: "",
	});

	// Custom remark state
	const [customComment, setCustomComment] = useState<string>("");
	const [customSeverity, setCustomSeverity] = useState<"critical" | "major" | "minor">("major");
	const [selectedPresetId, setSelectedPresetId] = useState<string>("");

	// Active record
	const selectedRecord = useMemo(() => {
		return records.find((r) => r.id === selectedRecordId) || records[0];
	}, [records, selectedRecordId]);

	// Filtered records
	const filteredRecords = useMemo(() => {
		return filterCmoAuditRecords(records, filters);
	}, [records, filters]);

	// Doctor rankings & KPI summary
	const vkkSummary = useMemo(() => {
		return generateCmoVkkSummaryReport(records);
	}, [records]);

	// Generated VKK Act for active record
	const currentVkkAct = useMemo(() => {
		if (!selectedRecord) return null;
		return generateVkkExpertiseAct(selectedRecord);
	}, [selectedRecord]);

	if (!isOpen) return null;

	// ── Handlers ──
	const handleApproveRecord = () => {
		if (!selectedRecord) return;
		const updated = applyCmoResolution(selectedRecord, "approved", {
			fullName: "Барабаш С.В.",
			role: "chief_medical_officer",
			controlLevel: "level_2_cmo_expert",
			comment: "Медицинская карта 043/у проверена. Замечаний нет, карта утверждена.",
		});

		setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
		onRecordApproved?.(updated.id);
	};

	const handleRejectRecord = () => {
		if (!selectedRecord) return;
		const updated = applyCmoResolution(selectedRecord, "rejected_with_remarks", {
			fullName: "Барабаш С.В.",
			role: "chief_medical_officer",
			controlLevel: "level_2_cmo_expert",
			comment: customComment || "Карта возвращена врачу на устранение выявленных дефектов ведения формы 043/у.",
			correctiveDirectives: ["Внести недостающие данные в протокол посещения в 3-дневный срок."],
		});

		setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
		setCustomComment("");
	};

	const handleReferToCommission = () => {
		if (!selectedRecord) return;
		const updated = applyCmoResolution(selectedRecord, "commission_referral", {
			fullName: "Барабаш С.В.",
			role: "chief_medical_officer",
			controlLevel: "level_3_medical_commission",
			comment: "Случай направлен на расширенное заседание Врачебной комиссии клиники.",
			correctiveDirectives: ["Назначить дату разбора на ВКК", "Подготовить клинико-экспертную справку"],
		});

		setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
	};

	const handleApplyPreset = (preset: CmoDefectPreset) => {
		if (!selectedRecord) return;
		const updated = addCmoDefectRemark(selectedRecord, {
			presetId: preset.id,
			category: preset.category,
			severity: preset.severity,
			title: preset.title,
			comment: preset.recommendedAction,
			statutoryRef: preset.statutoryReference,
			penaltyScore: preset.penaltyScore,
			affectedSection: preset.targetSection,
		});

		setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
	};

	const handleAddCustomRemark = () => {
		if (!selectedRecord || !customComment.trim()) return;
		const penalty = customSeverity === "critical" ? 25 : customSeverity === "major" ? 15 : 5;
		const updated = addCmoDefectRemark(selectedRecord, {
			category: "CLINICAL_DIARY_SOAP",
			severity: customSeverity,
			title: "Замечание главного врача (Начмеда)",
			comment: customComment.trim(),
			statutoryRef: "Приказ Минздрава России № 834н, Приказ № 785н",
			penaltyScore: penalty,
			affectedSection: "diaries",
		});

		setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
		setCustomComment("");
	};

	const handleResolveRemark = (remarkId: string) => {
		if (!selectedRecord) return;
		const updated = resolveCmoDefectRemark(selectedRecord, remarkId, "Дефект устранен лечащим врачом, данные внесены в карту.");
		setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
	};

	const handlePrintVkkAct = () => {
		window.print();
	};

	const handleCopyVkkActText = async () => {
		if (!currentVkkAct) return;
		const text = exportVkkExpertiseActText(currentVkkAct);
		try {
			await navigator.clipboard.writeText(text);
			alert("Текст Акта экспертизы ВКК 785н скопирован в буфер обмена!");
		} catch {
			// Fallback
		}
	};

	return (
		<div className="cmo-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cmo-modal-title">
			<div className="cmo-modal-container">
				{/* ── Modal Header ── */}
				<header className="cmo-header">
					<div className="cmo-header-title-row">
						<div className="cmo-header-icon-badge">
							<ShieldCheck size={22} />
						</div>
						<div>
							<h2 id="cmo-modal-title" className="cmo-header-title">
								Служба контроля качества Начмеда (ВКК Приказ № 785н & 834н)
							</h2>
							<p className="cmo-header-subtitle">
								Экспертиза медкарт 043/у · ИДС 1051н · Анестезиология (доза мг/кг и серия) · Эндодонтический апекс · Номенклатура 804н
							</p>
						</div>
					</div>
					<div className="cmo-header-actions">
						<button
							type="button"
							className="cmo-btn-close"
							onClick={onClose}
							aria-label="Закрыть модальное окно"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* ── KPI Summary Bar ── */}
				<section className="cmo-kpi-bar" aria-label="Сводные показатели контроля качества">
					<div className="cmo-kpi-card">
						<span className="cmo-kpi-label">Всего карт на экспертизе</span>
						<div className="cmo-kpi-val-row">
							<span className="cmo-kpi-val">{vkkSummary.totalAudited}</span>
							<span className="cmo-kpi-badge success">100% охват</span>
						</div>
					</div>

					<div className="cmo-kpi-card">
						<span className="cmo-kpi-label">Средний балл качества (QS)</span>
						<div className="cmo-kpi-val-row">
							<span className="cmo-kpi-val">{vkkSummary.averageQualityScore}%</span>
							<span className={`cmo-kpi-badge ${vkkSummary.averageQualityScore >= 90 ? "success" : vkkSummary.averageQualityScore >= 75 ? "warning" : "danger"}`}>
								{vkkSummary.averageQualityScore >= 90 ? "I категория" : "II категория"}
							</span>
						</div>
					</div>

					<div className="cmo-kpi-card">
						<span className="cmo-kpi-label">Одобрено с 1-го раза (First-Pass)</span>
						<div className="cmo-kpi-val-row">
							<span className="cmo-kpi-val">{vkkSummary.firstPassRateAvg}%</span>
							<span className="cmo-kpi-badge success">Норма СтАР &gt;80%</span>
						</div>
					</div>

					<div className="cmo-kpi-card">
						<span className="cmo-kpi-label">Возвращено на исправление</span>
						<div className="cmo-kpi-val-row">
							<span className="cmo-kpi-val">{vkkSummary.rejectedCount}</span>
							<span className="cmo-kpi-badge warning">{vkkSummary.rejectedCount > 0 ? "Требует внимания" : "Замечаний нет"}</span>
						</div>
					</div>
				</section>

				{/* ── Navigation Tabs ── */}
				<nav className="cmo-nav-tabs" aria-label="Разделы аудита">
					<button
						type="button"
						className={`cmo-tab-btn ${activeTab === "inspection" ? "active" : ""}`}
						onClick={() => setActiveTab("inspection")}
					>
						<Stethoscope size={16} />
						<span>Экспертиза карты 043/у</span>
						{selectedRecord && (
							<span className="cmo-tab-count-badge">{selectedRecord.recordNumber}</span>
						)}
					</button>

					<button
						type="button"
						className={`cmo-tab-btn ${activeTab === "queue" ? "active" : ""}`}
						onClick={() => setActiveTab("queue")}
					>
						<Clock size={16} />
						<span>Очередь карт на аудит</span>
						<span className="cmo-tab-count-badge">{filteredRecords.length}</span>
					</button>

					<button
						type="button"
						className={`cmo-tab-btn ${activeTab === "vkk_registry" ? "active" : ""}`}
						onClick={() => setActiveTab("vkk_registry")}
					>
						<TrendingUp size={16} />
						<span>Реестр дефектов и Рейтинг врачей (ВКК)</span>
						<span className="cmo-tab-count-badge">{vkkSummary.doctorRankings.length} вр.</span>
					</button>

					<button
						type="button"
						className={`cmo-tab-btn ${activeTab === "act_preview" ? "active" : ""}`}
						onClick={() => setActiveTab("act_preview")}
					>
						<FileText size={16} />
						<span>Акт экспертизы ВКК 785н</span>
					</button>
				</nav>

				{/* ── Modal Main Body / Tabs Content ── */}
				<main className="cmo-workspace">
					{/* ── TAB 1 & 2: Inspection & Queue Split View ── */}
					{(activeTab === "inspection" || activeTab === "queue") && (
						<>
							{/* Left Sidebar Queue */}
							<aside className="cmo-queue-sidebar">
								<div className="cmo-queue-filters">
									<input
										type="text"
										className="cmo-search-input"
										placeholder="Поиск по ФИО, № карты, диагнозу..."
										value={filters.search || ""}
										onChange={(e) => setFilters({ ...filters, search: e.target.value })}
									/>
									<div className="cmo-filter-row">
										<select
											className="cmo-filter-select"
											value={filters.status || "all"}
											onChange={(e) => setFilters({ ...filters, status: e.target.value as CmoAuditStatus | "all" })}
										>
											<option value="all">Все статусы</option>
											<option value="pending_review">На проверке</option>
											<option value="approved">Утверждено</option>
											<option value="rejected_with_remarks">Возвращено</option>
											<option value="commission_referral">Врачебная комиссия</option>
										</select>
									</div>
								</div>

								<div className="cmo-queue-list">
									{filteredRecords.map((rec) => {
										const isSelected = rec.id === selectedRecord?.id;
										const score = rec.automatedQualityScore;
										const scoreClass = score >= 90 ? "excellent" : score >= 70 ? "good" : "risk";

										return (
											<div
												key={rec.id}
												className={`cmo-card-item ${isSelected ? "active" : ""}`}
												onClick={() => {
													setSelectedRecordId(rec.id);
													if (activeTab === "queue") setActiveTab("inspection");
												}}
											>
												<div className="cmo-card-item-top">
													<span className="cmo-card-number">{rec.recordNumber}</span>
													<span className={`cmo-score-pill ${scoreClass}`}>{score}%</span>
												</div>
												<span className="cmo-card-patient-name">{rec.patientFullName}</span>
												<span className="cmo-card-doctor-name">{rec.doctorFullName} ({rec.doctorSpecialty})</span>
												<div className="cmo-card-footer">
													<span>{rec.visitDate}</span>
													<span>{rec.cardData.passport.primaryDiagnosisIcd10 || "K02"}</span>
												</div>
											</div>
										);
									})}
								</div>
							</aside>

							{/* Right Inspection Main View */}
							{selectedRecord ? (
								<section className="cmo-detail-view">
									{/* Hero Card */}
									<div className="cmo-detail-hero">
										<div className="cmo-hero-left">
											<h3 className="cmo-hero-title">
												{selectedRecord.patientFullName} · Карта № {selectedRecord.medicalCardId}
											</h3>
											<div className="cmo-hero-meta">
												<span><strong>Лечащий врач:</strong> {selectedRecord.doctorFullName}</span>
												<span><strong>Диагноз:</strong> {selectedRecord.cardData.passport.primaryDiagnosisIcd10} {selectedRecord.cardData.passport.primaryDiagnosisText}</span>
												<span><strong>Дата визита:</strong> {selectedRecord.visitDate}</span>
											</div>
										</div>

										<div className="cmo-hero-score-badge">
											<span className={`cmo-hero-score-val ${selectedRecord.automatedQualityScore >= 90 ? "excellent" : selectedRecord.automatedQualityScore >= 75 ? "good" : "risk"}`}>
												{selectedRecord.automatedQualityScore}%
											</span>
											<span className="cmo-kpi-badge success">
												{selectedRecord.status === "approved" ? "Утверждено Начмедом" : selectedRecord.status === "rejected_with_remarks" ? "Возвращено на доработку" : "Ожидает решения"}
											</span>
										</div>
									</div>

									{/* Statutory Checklist Section */}
									<div>
										<h4 className="cmo-section-title">
											<ShieldCheck size={18} color="#0284c7" />
											<span>Критерии качества Приказа Минздрава РФ № 834н, № 785н и стандартов СтАР</span>
										</h4>

										<div className="cmo-checklist-grid">
											{selectedRecord.automatedCheckResults.map((chk) => (
												<div
													key={chk.ruleId}
													className={`cmo-check-card ${chk.passed ? "passed" : "failed"}`}
												>
													<div className="cmo-check-header">
														<span className="cmo-check-title">{chk.title}</span>
														<span className={`cmo-check-status-badge ${chk.passed ? "passed" : "failed"}`}>
															{chk.passed ? "Соответствует" : `Дефект (-${chk.deduction} б.)`}
														</span>
													</div>
													<p className="cmo-check-details">{chk.details}</p>
													<span className="cmo-check-statute">{chk.statutoryRef}</span>
												</div>
											))}
										</div>
									</div>

									{/* Recorded Defects / Remarks List */}
									{selectedRecord.cmoRemarks.length > 0 && (
										<div>
											<h4 className="cmo-section-title">
												<FileWarning size={18} color="#dc2626" />
												<span>Зафиксированные дефекты оформления для Врачебной комиссии</span>
											</h4>
											<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
												{selectedRecord.cmoRemarks.map((rem) => (
													<div
														key={rem.id}
														style={{
															background: rem.isResolved ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)",
															border: `1px solid ${rem.isResolved ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
															borderRadius: "8px",
															padding: "0.75rem",
															display: "flex",
															justifyContent: "space-between",
															alignItems: "center",
														}}
													>
														<div>
															<div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--ink)" }}>
																{rem.title} {rem.isResolved && <span style={{ color: "#16a34a", fontSize: "0.75rem" }}>(Устранено)</span>}
															</div>
															<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{rem.comment}</div>
														</div>
														{!rem.isResolved && (
															<button
																type="button"
																className="cmo-btn-secondary"
																style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}
																onClick={() => handleResolveRemark(rem.id)}
															>
																<Check size={14} />
																<span>Отметить устраненным</span>
															</button>
														)}
													</div>
												))}
											</div>
										</div>
									)}

									{/* CMO Action Box */}
									<div className="cmo-action-box">
										<h4 className="cmo-section-title" style={{ margin: 0 }}>
											<Sparkles size={18} color="#0284c7" />
											<span>Инструменты Начмеда (Внесение дефектов & Резолюция)</span>
										</h4>

										{/* Quick Presets */}
										<div>
											<div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--muted)" }}>
												Быстрые пресеты дефектов по Приказу 785н (1-Click):
											</div>
											<div className="cmo-preset-selector-row">
												{CMO_STATUTORY_DEFECT_PRESETS.slice(0, 6).map((preset) => (
													<button
														key={preset.id}
														type="button"
														className="cmo-preset-chip"
														onClick={() => handleApplyPreset(preset)}
														title={preset.description}
													>
														+ [{preset.code}] {preset.title} (-{preset.penaltyScore} б.)
													</button>
												))}
											</div>
										</div>

										{/* Custom Remark Input */}
										<div style={{ display: "flex", gap: "0.5rem" }}>
											<input
												type="text"
												className="cmo-search-input"
												placeholder="Добавить индивидуальное замечание лечащему врачу..."
												value={customComment}
												onChange={(e) => setCustomComment(e.target.value)}
											/>
											<button
												type="button"
												className="cmo-btn-secondary"
												onClick={handleAddCustomRemark}
												disabled={!customComment.trim()}
											>
												<Plus size={16} />
												<span>Добавить</span>
											</button>
										</div>

										{/* Action Resolution Buttons */}
										<div className="cmo-btn-group">
											<button
												type="button"
												className="cmo-btn-success"
												onClick={handleApproveRecord}
											>
												<CheckCircle2 size={16} />
												<span>Утвердить карту 043/у</span>
											</button>

											<button
												type="button"
												className="cmo-btn-danger"
												onClick={handleRejectRecord}
											>
												<XCircle size={16} />
												<span>Вернуть на доработку</span>
											</button>

											<button
												type="button"
												className="cmo-btn-secondary"
												onClick={handleReferToCommission}
											>
												<Users size={16} />
												<span>Направить на Врачебную комиссию</span>
											</button>
										</div>
									</div>
								</section>
							) : (
								<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
									Выберите карту из списка слева для проведения экспертизы качества.
								</div>
							)}
						</>
					)}

					{/* ── TAB 3: VKK Registry & Doctor Rankings ── */}
					{activeTab === "vkk_registry" && (
						<section className="cmo-rankings-container">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div>
									<h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>
										Реестр дефектов и Рейтинг качества ведения документации врачами (ВКК)
									</h3>
									<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>
										Аналитика по Приказу Минздрава РФ № 785н на основе {vkkSummary.totalAudited} проверенных медкарт
									</p>
								</div>
							</div>

							{/* Doctor Table */}
							<table className="cmo-table">
								<thead>
									<tr>
										<th>Врач / Специальность</th>
										<th>Проверено карт</th>
										<th>Утверждено с 1-го раза</th>
										<th>Средний балл QS</th>
										<th>Категория качества</th>
										<th>Частые дефекты</th>
										<th>Предписания ВКК</th>
									</tr>
								</thead>
								<tbody>
									{vkkSummary.doctorRankings.map((doc: CmoDoctorQualityRanking) => (
										<tr key={doc.doctorStaffId}>
											<td>
												<div style={{ fontWeight: 700 }}>{doc.doctorFullName}</div>
												<div style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>{doc.doctorSpecialty}</div>
											</td>
											<td>{doc.totalAudited}</td>
											<td>
												<span style={{ fontWeight: 700, color: doc.firstPassRatePercent >= 80 ? "#16a34a" : "#d97706" }}>
													{doc.firstPassRatePercent}% ({doc.approvedFirstAttempt} карт)
												</span>
											</td>
											<td>
												<span className={`cmo-score-pill ${doc.averageQualityScore >= 90 ? "excellent" : doc.averageQualityScore >= 75 ? "good" : "risk"}`}>
													{doc.averageQualityScore}%
												</span>
											</td>
											<td>
												<span style={{ fontSize: "0.6875rem", fontWeight: 600 }}>
													{doc.complianceStatusLabel}
												</span>
											</td>
											<td>
												{doc.commonDefects.length > 0 ? (
													<div style={{ fontSize: "0.6875rem", color: "#dc2626" }}>
														{doc.commonDefects.map((d) => `${d.defectTitle} (${d.count})`).join(", ")}
													</div>
												) : (
													<span style={{ color: "#16a34a", fontSize: "0.6875rem" }}>Дефектов нет</span>
												)}
											</td>
											<td style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>
												{doc.recommendedVkkAction}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</section>
					)}

					{/* ── TAB 4: Official VKK Act Print Preview ── */}
					{activeTab === "act_preview" && currentVkkAct && (
						<section className="cmo-act-preview-container">
							<div style={{ display: "flex", gap: "0.5rem", width: "100%", maxWidth: "800px", justifyContent: "flex-end" }}>
								<button
									type="button"
									className="cmo-btn-primary"
									onClick={handlePrintVkkAct}
								>
									<Printer size={16} />
									<span>Печать Акта</span>
								</button>
								<button
									type="button"
									className="cmo-btn-secondary"
									onClick={handleCopyVkkActText}
								>
									<Download size={16} />
									<span>Копировать текст</span>
								</button>
							</div>

							{/* Official Paper Sheet */}
							<article className="cmo-act-paper">
								<h3 className="cmo-act-header-title">
									АКТ ЭКСПЕРТИЗЫ КАЧЕСТВА МЕДИЦИНСКОЙ ПОМОЩИ № {currentVkkAct.actNumber}
								</h3>
								<div className="cmo-act-subtitle">
									Внутренний контроль качества и безопасности медицинской деятельности (Приказ Минздрава РФ № 785н)<br />
									<strong>{currentVkkAct.clinicName}</strong> · Лицензия: {currentVkkAct.clinicLicense} · ОГРН: {currentVkkAct.clinicOgrn}
								</div>

								<div className="cmo-act-section">
									<div className="cmo-act-section-heading">1. Сведения о пациенте и медицинской карте:</div>
									<div>• <strong>Пациент:</strong> {currentVkkAct.patientFullName}, дата рождения: {currentVkkAct.patientBirthDate}</div>
									<div>• <strong>Медицинская карта:</strong> Форма 043/у № {currentVkkAct.medicalCardNumber}</div>
									<div>• <strong>Лечащий врач:</strong> {currentVkkAct.doctorFullName} ({currentVkkAct.doctorSpecialty})</div>
									<div>• <strong>Клинический диагноз:</strong> {currentVkkAct.clinicalDiagnosis} (Код МКБ-10: {currentVkkAct.icd10Code})</div>
									<div>• <strong>Уровень контроля качества:</strong> {currentVkkAct.controlLevelLabel}</div>
								</div>

								<div className="cmo-act-section">
									<div className="cmo-act-section-heading">2. Результаты экспертизы качества ведения медицинской документации:</div>
									<div>• <strong>Итоговый индекс качества (Quality Score):</strong> {currentVkkAct.qualityScore}%</div>
									<div>• <strong>Категория качества:</strong> {currentVkkAct.qualityCategoryLabel}</div>

									<table className="cmo-act-table">
										<thead>
											<tr>
												<th>№</th>
												<th>Код дефекта</th>
												<th>Наименование дефекта оформления</th>
												<th>НПА (Приказ)</th>
												<th>Тяжесть</th>
												<th>Вычет</th>
											</tr>
										</thead>
										<tbody>
											{currentVkkAct.defectsList.length > 0 ? (
												currentVkkAct.defectsList.map((def, idx) => (
													<tr key={def.code + idx}>
														<td>{idx + 1}</td>
														<td>{def.code}</td>
														<td>{def.title}</td>
														<td>{def.statutoryRef}</td>
														<td>{def.severity}</td>
														<td>-{def.penalty} б.</td>
													</tr>
												))
											) : (
												<tr>
													<td colSpan={6} style={{ textAlign: "center", color: "#16a34a" }}>
														Дефектов оформления и ведения медицинской карты 043/у не выявлено.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>

								<div className="cmo-act-section">
									<div className="cmo-act-section-heading">3. Экспертное заключение и предписания комиссии:</div>
									<p style={{ margin: "0.25rem 0" }}>{currentVkkAct.expertConclusion}</p>
									<div style={{ fontWeight: 700, marginTop: "0.5rem" }}>Предписания:</div>
									<ul style={{ margin: "0.25rem 0 0 1.25rem", padding: 0 }}>
										{currentVkkAct.correctivePrescriptions.map((p, idx) => (
											<li key={idx}>{p}</li>
										))}
									</ul>
								</div>

								<div className="cmo-act-signatures">
									<div>Председатель комиссии (Начмед): ________________ / {currentVkkAct.commissionChairFullName} /</div>
									<div>Члены экспертной комиссии: ________________ / {currentVkkAct.commissionMembers.join(" /\n                                ________________ / ")} /</div>
									<div>С актом экспертизы ознакомлен (Лечащий врач): ________________ / {currentVkkAct.attendingDoctorFullName} / Дата: __________</div>
								</div>
							</article>
						</section>
					)}
				</main>
			</div>
		</div>
	);
};

import React, { useState, useMemo, useCallback } from "react";
import { useAppStore } from "../../store/appStore";
import {
	Printer,
	Download,
	Copy,
	Check,
	FileText,
	User,
	HeartPulse,
	Activity,
	Calendar,
	Award,
	X,
	ShieldCheck,
	AlertCircle,
	Maximize2,
	Minimize2,
	ZoomIn,
	ZoomOut,
	ChevronRight,
	Sparkles,
} from "lucide-react";
import type {
	MedicalCardForm043uData,
	Form043PrintConfig,
	VisitDiaryEntry043,
} from "./emr043Types";
import {
	validateForm043uCompleteness,
	generatePrintableHtml043,
	generate043XmlCda,
	generate043JsonExport,
	generate043PlainText,
	formatPatientAge,
	calculateDmftIndex,
	calculateCpitnIndex,
	escapeHtml,
} from "./emr043Math";
import { dentalBiteTypeLabels, toothStatusCodeShortMap } from "@dental/shared";
import { CmoEmrAuditModal } from "./audit/CmoEmrAuditModal";
import { EmrProtocolGeneratorModal } from "./protocolGenerator/EmrProtocolGeneratorModal";
import {
	createAuditRecord,
	runAutomatedEmrAudit,
	calculateQualityScore,
	type EmrAuditRecord,
	type CmoAuditResolution,
} from "./audit/cmoEmrAuditEngine";
import "./emr043Styles.css";


export interface Form043PrintModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Partial<MedicalCardForm043uData>;
	onSave?: (data: MedicalCardForm043uData) => void;
	readOnly?: boolean;
	onOpenCmoAudit?: () => void;
	cmoAuditorName?: string;
	cmoAuditorRole?: "chief_medical_officer" | "deputy_cmo_qcr" | "medical_commission_chair";
	isLocked?: boolean;
	isDraft?: boolean;
	status?: "draft" | "signed" | "completed" | "voided" | string;
}

const DEFAULT_043_DATA: MedicalCardForm043uData = {
	formNumber: "043/у",
	formOrderName: "Приказ Минздрава России от 15.12.2014 № 834н",
	clinic: {
		clinicName: "Стоматологическая клиника «ДЕНТЕ»",
		clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicAddress: "",
		clinicPhone: "",
		clinicOgrn: "",
		clinicInn: "",
		clinicKpp: "",
		licenseNumber: "",
		licenseDate: "",
		licenseIssuer: "",
		chiefDoctorFullName: "",
	},
	passport: {
		medicalCardNumber: "",
		cardOpenedDate: "",
		patientFullName: "",
		patientBirthDate: "",
		patientSex: "male",
		patientPhone: "",
		patientEmail: "",
		patientAddressRegistration: "",
		patientAddressResidence: "",
		patientIdentityDocument: "",
		patientSnils: "",
		patientInsurancePolicy: "",
		patientInsuranceCompany: "",
		patientPrivilegeCategory: "Нет льгот",
		primaryDiagnosisText: "",
		primaryDiagnosisIcd10: "",
		attendingDoctorFullName: "",
		attendingDoctorSpecialty: "",
		attendingDoctorSnils: "",
	},
	anamnesis: {
		chiefComplaint: "",
		historyOfPresentIllness: "",
		medicalHistoryVitae: "",
		allergologicalHistory: "",
		concomitantSomaticDiseases: "",
		currentSystemicMedications: "",
		pregnancyLactationStatus: "",
		pastDentalInterventions: "",
		occupationalHazardsAndHabits: "",
	},
	dentalStatus: {
		odontogramTeeth: [
			{ toothNumber: 18, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 17, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 16, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 15, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 14, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 13, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 12, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 11, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 21, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 22, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 23, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 24, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 25, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 26, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 27, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 28, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 48, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 47, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 46, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 45, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 44, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 43, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 42, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 41, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 31, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 32, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 33, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 34, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 35, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 36, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 37, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			{ toothNumber: 38, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
		],
		dmftIndex: {
			decayed: 0,
			filled: 0,
			missing: 0,
			totalDmft: 0,
			decayedSurfaces: 0,
			filledSurfaces: 0,
			totalDmfs: 0,
			deciduousDecayed: 0,
			deciduousFilled: 0,
			deciduousExtracted: 0,
			totalDft: 0,
			intensityLevel: "very_low",
		},
		cpitnIndex: {
			sextant18_14: "0_healthy",
			sextant13_23: "0_healthy",
			sextant24_28: "0_healthy",
			sextant48_44: "0_healthy",
			sextant43_33: "0_healthy",
			sextant34_38: "0_healthy",
			treatmentNeedCategory: "0_none",
		},
		hygieneIndexOhiS: {
			debrisScore: 0,
			calculusScore: 0,
			totalScore: 0,
			ratingText: "OHI-S = 0 (Хороший уровень гигиены)",
		},
		biteType: "orthognathic",
		biteDescription: "Прикус ортогнатический, смыкание моляров и клыков по I классу Энгля, резцовое перекрытие в пределах 1/3 высоты коронки.",
		oralMucosaStatus: {
			color: "pale_pink_normal",
			moisture: "normal",
			pathologicalElements: null,
			gingivalPapillae: "normal_pointed",
			bleedingPBI: "grade_0",
			tongueStatus: "Язык чистый, влажный, сосочковый слой выражен умеренно, налета нет.",
			regionalLymphNodes: "Подчелюстные, шейные, подбородочные лимфатические узлы не пальпируются, безболезненные.",
			tmjFunction: "Открывание рта свободное, в полном объеме, движений девиации и крепитации/щелчков в суставах нет.",
		},
		xrayFindingsDescription: "",
		xrayRadiationDoseMsv: 0,
	},
	generalTreatmentPlan: "",
	visitDiaries: [],
	epicrisis: {
		treatmentSummary: "",
		treatmentOutcome: "treatment_in_progress",
		treatmentOutcomeLabel: "Лечение продолжается",
		dispensaryGroup: "D_I_healthy",
		dispensaryGroupLabel: "Д-I (Здоров)",
		plannedRecallIntervalMonths: 6,
		preventivePlanRecommendations: "",
		dateCompleted: "",
		headOfDepartmentFullName: "",
		attendingDoctorFullName: "",
	},
};

export const Form043PrintModal: React.FC<Form043PrintModalProps> = React.memo(
	function Form043PrintModal({
		isOpen,
		onClose,
		initialData,
		onSave,
		readOnly,
		onOpenCmoAudit,
		cmoAuditorName,
		cmoAuditorRole,
		isLocked,
		isDraft,
		status,
	}) {
		const dashboard = useAppStore((s) => s.dashboard);
		const profile = dashboard?.clinicSettings?.profile;
		const staff = dashboard?.clinicSettings?.staff;

		const effectiveIsDraft = Boolean(
			isDraft ||
			isLocked === false ||
			status === "draft" ||
			initialData?.isLocked === false ||
			(initialData as any)?.status === "draft" ||
			!(isLocked || initialData?.isLocked || status === "signed" || (initialData as any)?.status === "signed"),
		);

		const resolvedChiefDoctor =
			staff?.find(
				(s) =>
					s.role === "owner" ||
					(s.specialties &&
						s.specialties.some((sp) => sp.toLowerCase().includes("глав"))),
			)?.fullName ||
			profile?.signatoryName ||
			"";

		const resolvedClinic = useMemo(
			() => ({
				clinicName:
					initialData?.clinic?.clinicName ||
					profile?.clinicName ||
					DEFAULT_043_DATA.clinic.clinicName,
				clinicLegalName:
					initialData?.clinic?.clinicLegalName ||
					profile?.legalName ||
					profile?.clinicName ||
					DEFAULT_043_DATA.clinic.clinicLegalName,
				clinicAddress:
					initialData?.clinic?.clinicAddress ||
					profile?.address ||
					"",
				clinicPhone:
					initialData?.clinic?.clinicPhone ||
					profile?.phone ||
					"",
				clinicOgrn:
					initialData?.clinic?.clinicOgrn ||
					profile?.ogrn ||
					"",
				clinicInn:
					initialData?.clinic?.clinicInn ||
					profile?.inn ||
					"",
				clinicKpp:
					initialData?.clinic?.clinicKpp ||
					profile?.kpp ||
					"",
				licenseNumber:
					initialData?.clinic?.licenseNumber ||
					profile?.medicalLicenseNumber ||
					"",
				licenseDate:
					initialData?.clinic?.licenseDate ||
					profile?.medicalLicenseIssuedAt ||
					"",
				licenseIssuer:
					initialData?.clinic?.licenseIssuer ||
					profile?.medicalLicenseIssuer ||
					"",
				chiefDoctorFullName:
					initialData?.clinic?.chiefDoctorFullName ||
					resolvedChiefDoctor ||
					"",
			}),
			[initialData?.clinic, profile, resolvedChiefDoctor],
		);

		const [formData, setFormData] = useState<MedicalCardForm043uData>(() => {
			return {
				...DEFAULT_043_DATA,
				...initialData,
				clinic: {
					...DEFAULT_043_DATA.clinic,
					...resolvedClinic,
					...(initialData?.clinic || {}),
				},
				passport: { ...DEFAULT_043_DATA.passport, ...(initialData?.passport || {}) },
				anamnesis: { ...DEFAULT_043_DATA.anamnesis, ...(initialData?.anamnesis || {}) },
				dentalStatus: { ...DEFAULT_043_DATA.dentalStatus, ...(initialData?.dentalStatus || {}) },
				epicrisis: { ...DEFAULT_043_DATA.epicrisis, ...(initialData?.epicrisis || {}) },
			};
		});

		const [activeTab, setActiveTab] = useState<Form043PrintConfig["activeTab"]>("overview");
		const [zoomScale, setZoomScale] = useState<number>(1.0);
		const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
		const [copiedToast, setCopiedToast] = useState<boolean>(false);

		// Состояние модального окна экспертизы КЭР (Начмед / ВК)
		const [isCmoAuditOpen, setIsCmoAuditOpen] = useState<boolean>(false);
		const [cmoResolution, setCmoResolution] = useState<CmoAuditResolution | null>(null);

		// Состояние генератора клинических протоколов 043/у
		const [isProtocolGeneratorOpen, setIsProtocolGeneratorOpen] = useState<boolean>(false);


		// Формирование записи аудита для текущей карты
		const currentAuditRecord = useMemo<EmrAuditRecord>(() => {
			const rec = createAuditRecord({
				cardData: formData,
				medicalCardId: formData.passport.medicalCardNumber,
				patientFullName: formData.passport.patientFullName,
				patientBirthDate: formData.passport.patientBirthDate,
				patientGender: formData.passport.patientSex,
				patientPhone: formData.passport.patientPhone,
				doctorFullName: formData.passport.attendingDoctorFullName,
				doctorSpecialty: formData.passport.attendingDoctorSpecialty,
				visitDate: formData.passport.cardOpenedDate,
				attachedDocuments: [
					{
						id: "doc-ids-043",
						type: "ids_323fz",
						title: "ИДС на стоматологическое лечение (ст. 20 323-ФЗ)",
						isSigned: true,
						signedByPatient: true,
						signedByDoctorUkep: Boolean(formData.visitDiaries[0]?.isSignedWithUkep),
					},
				],
				completedActItems: formData.visitDiaries.map((vd) => ({
					serviceCode: "A16.07.002",
					serviceName: `Лечение зуба ${vd.toothNumber || "16"} (${vd.assessmentDiagnosisText})`,
					toothNumber: vd.toothNumber || "16",
					quantity: 1,
					priceRub: 4500,
				})),
				treatmentPlanItems: formData.visitDiaries.map((vd) => ({
					serviceCode: "A16.07.002",
					serviceName: `Лечение зуба ${vd.toothNumber || "16"} (${vd.assessmentDiagnosisText})`,
					toothNumber: vd.toothNumber || "16",
					stage: "Терапевтический этап",
				})),
			});
			if (cmoResolution) {
				rec.cmoResolution = cmoResolution;
				rec.status = cmoResolution.decision;
			}
			return rec;
		}, [formData, cmoResolution]);

		// Автоматический расчет показателей качества по Приказу 203н
		const auditCheckSummary = useMemo(() => {
			const audit = runAutomatedEmrAudit(currentAuditRecord);
			const score = calculateQualityScore(audit.results, currentAuditRecord.cmoRemarks);
			const passedCount = audit.results.filter((r) => r.passed).length;
			const totalCount = audit.results.length;
			const defects = audit.results.filter((r) => !r.passed);
			return { score, passedCount, totalCount, defects };
		}, [currentAuditRecord]);

		// Валидация полноты формы
		const validation = useMemo(() => {
			return validateForm043uCompleteness(formData);
		}, [formData]);

		// Индексы
		const dmft = useMemo(() => {
			return calculateDmftIndex(formData.dentalStatus.odontogramTeeth);
		}, [formData.dentalStatus.odontogramTeeth]);

		const cpitn = useMemo(() => {
			return calculateCpitnIndex(formData.dentalStatus.cpitnIndex);
		}, [formData.dentalStatus.cpitnIndex]);

		const ageText = useMemo(() => {
			return formatPatientAge(formData.passport.patientBirthDate, formData.passport.cardOpenedDate);
		}, [formData.passport.patientBirthDate, formData.passport.cardOpenedDate]);

		// Обработчик печати
		const handlePrint = useCallback(() => {
			const html = generatePrintableHtml043(formData, {
				scaleRatio: 1.0,
				isLocked: !effectiveIsDraft,
				status: effectiveIsDraft ? "draft" : "signed",
			});
			const printFrame = document.createElement("iframe");
			printFrame.style.position = "fixed";
			printFrame.style.right = "0";
			printFrame.style.bottom = "0";
			printFrame.style.width = "0";
			printFrame.style.height = "0";
			printFrame.style.border = "none";
			document.body.appendChild(printFrame);

			const doc = printFrame.contentWindow?.document;
			if (doc) {
				doc.open();
				doc.write(html);
				doc.close();
				printFrame.contentWindow?.focus();
				setTimeout(() => {
					printFrame.contentWindow?.print();
					setTimeout(() => {
						document.body.removeChild(printFrame);
					}, 1500);
				}, 400);
			}
		}, [formData]);

		// Обработчик экспорта в XML (ЕГИСЗ СЭМД 834н)
		const handleExportXml = useCallback(() => {
			const xml = generate043XmlCda(formData);
			const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `Form043u_${formData.passport.medicalCardNumber}_EGISZ.xml`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}, [formData]);

		// Обработчик экспорта в JSON
		const handleExportJson = useCallback(() => {
			const json = generate043JsonExport(formData);
			const blob = new Blob([json], { type: "application/json;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `Form043u_${formData.passport.medicalCardNumber}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}, [formData]);

		// Копирование текста в буфер
		const handleCopyText = useCallback(() => {
			const text = generate043PlainText(formData);
			navigator.clipboard.writeText(text).then(() => {
				setCopiedToast(true);
				setTimeout(() => setCopiedToast(false), 2500);
			});
		}, [formData]);

		if (!isOpen) return null;

		return (
			<div className="emr043-modal-backdrop" role="dialog" aria-modal="true">
				<div
					className="emr043-modal-window"
					style={{
						maxWidth: isFullscreen ? "99vw" : "1240px",
						height: isFullscreen ? "98vh" : "94vh",
					}}
				>
					{/* ── Верхний тулбар действий ── */}
					<header className="emr043-header-toolbar">
						<div className="emr043-header-title-group">
							<span className="emr043-header-badge">
								<FileText className="w-3.5 h-3.5" />
								Минздрав РФ № 834н
							</span>
							{effectiveIsDraft ? (
								<span className="px-2.5 py-0.5 rounded border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
									<FileText className="w-3 h-3 text-amber-600" />
									ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)
								</span>
							) : (
								<span className="px-2.5 py-0.5 rounded border border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
									<Check className="w-3 h-3 text-emerald-600" />
									ПОДПИСАНО ВРАЧОМ
								</span>
							)}
							<div>
								<h2 className="emr043-header-title">
									Медицинская карта № {formData.passport.medicalCardNumber} (Форма 043/у)
								</h2>
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
									Пациент: <strong>{formData.passport.patientFullName}</strong> ({ageText}) • Врач: <strong>{formData.passport.attendingDoctorFullName}</strong>
								</div>
							</div>
						</div>

						<div className="emr043-header-actions">
							{/* Кнопка печати (>= 44x44px) */}
							<button
								type="button"
								className="emr043-btn emr043-btn-primary"
								onClick={handlePrint}
								title="Печать или экспорт в PDF (A4)"
							>
								<Printer className="w-4 h-4" />
								<span>Печать / PDF (A4)</span>
							</button>

							{/* Экспорт в CDA R2 XML */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary"
								onClick={handleExportXml}
								title="Экспорт в HL7 CDA R2 XML для ЕГИСЗ"
							>
								<Download className="w-4 h-4" />
								<span>ЕГИСЗ (XML)</span>
							</button>

							{/* Экспорт JSON */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary"
								onClick={handleExportJson}
								title="Экспорт в структурированный JSON"
							>
								<Download className="w-4 h-4" />
								<span>JSON</span>
							</button>

							{/* Копировать текст карты */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary"
								onClick={handleCopyText}
								title="Копировать структурированный текст карты"
							>
								{copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
								<span>{copiedToast ? "Скопировано!" : "Копировать"}</span>
							</button>

							{/* Экспертиза ЭМК (Начмед / ВК) */}
							<button
								type="button"
								className={`emr043-btn ${cmoResolution?.decision === "approved" ? "emr043-btn-approved" : "emr043-btn-secondary"}`}
								onClick={() => {
									setIsCmoAuditOpen(true);
									onOpenCmoAudit?.();
								}}
								title="Экспертиза ЭМК (Начмед / ВК) по критериям Приказа Минздрава РФ № 203н"
							>
								<ShieldCheck className="w-4 h-4 text-emerald-600" />
								<span>Экспертиза ЭМК (Начмед / ВК)</span>
							</button>

							{/* Полноэкранный режим */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary emr043-btn-icon-only"
								onClick={() => setIsFullscreen(!isFullscreen)}
								title={isFullscreen ? "Свернуть" : "На весь экран"}
							>
								{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
							</button>

							{/* Закрыть */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary emr043-btn-icon-only"
								onClick={onClose}
								title="Закрыть окно"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</header>

					{/* ── Навигационные вкладки ── */}
					<nav className="emr043-nav-tabs" style={{ flexWrap: "wrap", width: "100%", padding: "8px 16px", gap: "6px" }}>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "overview" ? "active" : ""}`}
							style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("overview")}
						>
							<FileText className="w-4 h-4" />
							<span>Обзор и печать A4</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "passport" ? "active" : ""}`}
							style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("passport")}
						>
							<User className="w-4 h-4" />
							<span>1. Паспортная часть</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "anamnesis" ? "active" : ""}`}
							style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("anamnesis")}
						>
							<HeartPulse className="w-4 h-4" />
							<span>2. Анамнез и соматика</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "odontogram" ? "active" : ""}`}
							style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("odontogram")}
						>
							<Activity className="w-4 h-4" />
							<span>3. Зубная формула и индексы</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "diaries" ? "active" : ""}`}
							style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("diaries")}
						>
							<Calendar className="w-4 h-4" />
							<span>4. Дневники визитов (SOAP)</span>
							<span style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.8 }}>({formData.visitDiaries.length})</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "epicrisis" ? "active" : ""}`}
							style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("epicrisis")}
						>
							<Award className="w-4 h-4" />
							<span>5. Эпикриз и диспансеризация</span>
						</button>
					</nav>

					{/* ── Индикатор полноты данных карты ── */}
					<div className="emr043-completeness-bar emr043-non-printable">
						<ShieldCheck className={`w-5 h-5 ${validation.isComplete ? "text-emerald-600" : "text-amber-500"}`} />
						<div style={{ fontSize: "12px", fontWeight: 600 }}>
							Полнота карты по приказу 834н: <strong>{validation.completenessScore}%</strong>
						</div>
						<div className="emr043-progress-track">
							<div
								className={`emr043-progress-fill ${
									validation.completenessScore >= 90 ? "green" : validation.completenessScore >= 60 ? "yellow" : "red"
								}`}
								style={{ width: `${validation.completenessScore}%` }}
							/>
						</div>
						{validation.missingFields.length > 0 && (
							<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
								Не заполнено: {validation.missingFields.map((m) => m.label).join(", ")}
							</span>
						)}

						<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
							<span
								className={`emr043-cmo-pill ${
									auditCheckSummary.score >= 90 ? "green" : auditCheckSummary.score >= 70 ? "yellow" : "red"
								}`}
								title="Индекс качества по Приказу 203н"
							>
								КЭР: <strong>{auditCheckSummary.score}%</strong> ({auditCheckSummary.passedCount}/{auditCheckSummary.totalCount})
							</span>
							<button
								type="button"
								className="emr043-cmo-trigger-link"
								onClick={() => {
									setIsCmoAuditOpen(true);
									onOpenCmoAudit?.();
								}}
							>
								Экспертиза ЭМК (Начмед / ВК) &rarr;
							</button>
						</div>
					</div>

					{/* ── Основное содержимое вкладки ── */}
					<main className="emr043-body">
						{/* Вкладка 1: Обзор и интерактивный лист А4 */}
						{activeTab === "overview" && (
							<div className="emr043-preview-container" style={{ flexDirection: "column", alignItems: "center" }}>
								<div className="emr043-audit-status-banner emr043-non-printable" style={{ width: "100%", maxWidth: "820px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
										<div className={`emr043-audit-badge-icon ${cmoResolution?.decision === "approved" ? "approved" : "pending"}`}>
											<ShieldCheck className="w-6 h-6" />
										</div>
										<div>
											<div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
												<span>Экспертиза качества медицинской карты (Приказ&nbsp;№&nbsp;203н)</span>
												{cmoResolution ? (
													<span className={`emr043-status-badge ${cmoResolution.decision}`}>
														{cmoResolution.decision === "approved" ? "✓ Утверждено ВК / Начмед" : "⚠ Замечания КЭР"}
													</span>
												) : (
													<span className="emr043-status-badge pending">Готова к экспертизе КЭР</span>
												)}
											</div>
											<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
												{cmoResolution ? (
													<span>
														Эксперт: <strong>{cmoResolution.auditorFullName}</strong> ({cmoResolution.auditorRole}) • Оценка:&nbsp;{cmoResolution.finalQualityScore}&nbsp;%
													</span>
												) : (
													<span>
														Автоматический скоринг Росздравнадзора: <strong>{auditCheckSummary.score} / 100&nbsp;баллов</strong> ({auditCheckSummary.defects.length === 0 ? "Дефектов не выявлено" : `Выявлено дефектов: ${auditCheckSummary.defects.length}`})
													</span>
												)}
											</div>
										</div>
									</div>

									<button
										type="button"
										className="emr043-btn emr043-btn-primary"
										onClick={() => {
											setIsCmoAuditOpen(true);
											onOpenCmoAudit?.();
										}}
									>
										<ShieldCheck className="w-4 h-4" />
										<span>Экспертиза ЭМК (Начмед / ВК)</span>
									</button>
								</div>

								<div
									className="emr043-a4-sheet"
									style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
									dangerouslySetInnerHTML={{
										__html: generatePrintableHtml043(formData, {
											isLocked: !effectiveIsDraft,
											status: effectiveIsDraft ? "draft" : "signed",
										}),
									}}
								/>
							</div>
						)}

						{/* Вкладка 2: Паспортная часть */}
						{activeTab === "passport" && (
							<div>
								<div className="emr043-section-card">
									<h3 className="emr043-section-card-title">
										<User className="w-4 h-4 text-sky-600" />
										1. Паспортная часть и регистрационные данные (Приказ Минздрава № 834н)
									</h3>
									<div className="emr043-grid-2">
										<div>
											<div className="emr043-field-label">ФИО Пациента:</div>
											<div className="emr043-field-value">{formData.passport.patientFullName}</div>
										</div>
										<div>
											<div className="emr043-field-label">Пол и Дата рождения:</div>
											<div className="emr043-field-value">
												{formData.passport.patientSex === "male" ? "Мужской" : "Женский"}, {formData.passport.patientBirthDate} ({ageText})
											</div>
										</div>
										<div>
											<div className="emr043-field-label">Номер медицинской карты:</div>
											<div className="emr043-field-value font-bold text-sky-700">{formData.passport.medicalCardNumber}</div>
										</div>
										<div>
											<div className="emr043-field-label">Дата открытия карты:</div>
											<div className="emr043-field-value">{formData.passport.cardOpenedDate}</div>
										</div>
										<div>
											<div className="emr043-field-label">Документ, удостоверяющий личность:</div>
											<div className="emr043-field-value">{formData.passport.patientIdentityDocument}</div>
										</div>
										<div>
											<div className="emr043-field-label">СНИЛС пациента:</div>
											<div className="emr043-field-value">{formData.passport.patientSnils || "—"}</div>
										</div>
										<div>
											<div className="emr043-field-label">Полис ОМС / ДМС:</div>
											<div className="emr043-field-value">
												{formData.passport.patientInsurancePolicy || "—"}{" "}
												{formData.passport.patientInsuranceCompany ? `(${formData.passport.patientInsuranceCompany})` : ""}
											</div>
										</div>
										<div>
											<div className="emr043-field-label">Контактный телефон:</div>
											<div className="emr043-field-value">{formData.passport.patientPhone || "—"}</div>
										</div>
										<div style={{ gridColumn: "1 / -1" }}>
											<div className="emr043-field-label">Адрес регистрации и фактического проживания:</div>
											<div className="emr043-field-value">{formData.passport.patientAddressRegistration}</div>
										</div>
										<div style={{ gridColumn: "1 / -1" }}>
											<div className="emr043-field-label">Диагноз при первичном обращении:</div>
											<div className="emr043-field-value font-bold text-sky-800">
												{formData.passport.primaryDiagnosisText} [МКБ-10: {formData.passport.primaryDiagnosisIcd10}]
											</div>
										</div>
										<div>
											<div className="emr043-field-label">Лечащий врач:</div>
											<div className="emr043-field-value font-semibold">
												{formData.passport.attendingDoctorFullName} ({formData.passport.attendingDoctorSpecialty})
											</div>
										</div>
										<div>
											<div className="emr043-field-label">СНИЛС лечащего врача:</div>
											<div className="emr043-field-value">{formData.passport.attendingDoctorSnils || "—"}</div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Вкладка 3: Анамнез */}
						{activeTab === "anamnesis" && (
							<div>
								<div className="emr043-section-card">
									<h3 className="emr043-section-card-title">
										<HeartPulse className="w-4 h-4 text-sky-600" />
										2. Анамнез жизни и заболевания (Anamnesis vitae et morbi)
									</h3>
									<div className="emr043-grid-2">
										<div style={{ gridColumn: "1 / -1" }}>
											<div className="emr043-field-label">Жалобы при обращении:</div>
											<div className="emr043-field-value">{formData.anamnesis.chiefComplaint}</div>
										</div>
										<div style={{ gridColumn: "1 / -1" }}>
											<div className="emr043-field-label">Анамнез развития настоящего заболевания (Anamnesis morbi):</div>
											<div className="emr043-field-value">{formData.anamnesis.historyOfPresentIllness}</div>
										</div>
										<div style={{ gridColumn: "1 / -1" }}>
											<div className="emr043-field-label">Анамнез жизни (Anamnesis vitae):</div>
											<div className="emr043-field-value">{formData.anamnesis.medicalHistoryVitae}</div>
										</div>
										<div>
											<div className="emr043-field-label">Аллергологический статус:</div>
											<div className="emr043-field-value">{formData.anamnesis.allergologicalHistory}</div>
										</div>
										<div>
											<div className="emr043-field-label">Сопутствующие соматические патологии:</div>
											<div className="emr043-field-value">{formData.anamnesis.concomitantSomaticDiseases}</div>
										</div>
										<div>
											<div className="emr043-field-label">Постоянный прием медикаментов:</div>
											<div className="emr043-field-value">{formData.anamnesis.currentSystemicMedications}</div>
										</div>
										<div>
											<div className="emr043-field-label">Переносимость анестезии и стоматологических вмешательств:</div>
											<div className="emr043-field-value">{formData.anamnesis.pastDentalInterventions}</div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Вкладка 4: Зубная формула и индексы */}
						{activeTab === "odontogram" && (
							<div>
								<div className="emr043-section-card">
									<h3 className="emr043-section-card-title">
										<Activity className="w-4 h-4 text-sky-600" />
										3. Стоматологический статус, зубная формула FDI и клинические индексы
									</h3>

									<div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
										Зубная формула постоянного прикуса (FDI 11–48):
									</div>
									<div className="emr043-formula-matrix">
										{formData.dentalStatus.odontogramTeeth.slice(0, 16).map((t) => {
											const isPath = t.statusCode !== "healthy" && t.statusCode !== "filled_satisfactory";
											const isFilled = t.statusCode === "filled_satisfactory";
											return (
												<div
													key={t.toothNumber}
													className={`emr043-tooth-cell ${isPath ? "pathology" : isFilled ? "filled" : ""}`}
												>
													<div style={{ fontWeight: "bold" }}>{t.toothNumber}</div>
													<div style={{ fontSize: "10px", marginTop: "2px" }}>
														{(t.statusCode && t.statusCode in toothStatusCodeShortMap
															? toothStatusCodeShortMap[t.statusCode as keyof typeof toothStatusCodeShortMap]
															: null) || "Norm"}
													</div>
												</div>
											);
										})}
									</div>
									<div className="emr043-formula-matrix">
										{formData.dentalStatus.odontogramTeeth.slice(16, 32).map((t) => {
											const isPath = t.statusCode !== "healthy" && t.statusCode !== "filled_satisfactory";
											const isFilled = t.statusCode === "filled_satisfactory";
											return (
												<div
													key={t.toothNumber}
													className={`emr043-tooth-cell ${isPath ? "pathology" : isFilled ? "filled" : ""}`}
												>
													<div style={{ fontWeight: "bold" }}>{t.toothNumber}</div>
													<div style={{ fontSize: "10px", marginTop: "2px" }}>
														{(t.statusCode && t.statusCode in toothStatusCodeShortMap
															? toothStatusCodeShortMap[t.statusCode as keyof typeof toothStatusCodeShortMap]
															: null) || "Norm"}
													</div>
												</div>
											);
										})}
									</div>

									<div className="emr043-grid-3" style={{ marginTop: "16px" }}>
										<div className="emr043-section-card" style={{ padding: "12px" }}>
											<div className="emr043-field-label">Индекс интенсивности КПУ(з):</div>
											<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal)" }}>
												КПУ = {dmft.totalDmft}
											</div>
											<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
												К = {dmft.decayed}, П = {dmft.filled}, У = {dmft.missing}
												<br />Уровень: <strong>{dmft.intensityLevelLabel}</strong>
											</div>
										</div>

										<div className="emr043-section-card" style={{ padding: "12px" }}>
											<div className="emr043-field-label">Пародонтальный статус (CPITN):</div>
											<div style={{ fontSize: "14px", fontWeight: 700 }}>{cpitn.treatmentNeedLabel}</div>
											<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
												{cpitn.treatmentRecommendations}
											</div>
										</div>

										<div className="emr043-section-card" style={{ padding: "12px" }}>
											<div className="emr043-field-label">Индекс гигиены и прикус:</div>
											<div style={{ fontSize: "13px", fontWeight: 600 }}>{formData.dentalStatus.hygieneIndexOhiS.ratingText}</div>
											<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
												Прикус: {dentalBiteTypeLabels[formData.dentalStatus.biteType]}
											</div>
										</div>
									</div>

									<div style={{ marginTop: "14px" }}>
										<div className="emr043-field-label">Состояние СОПР, лимфоузлов и ВНЧС:</div>
										<div className="emr043-field-value">
											Слизистая оболочка полости рта: {formData.dentalStatus.oralMucosaStatus.color === "pale_pink_normal" ? "бледно-розовая, умеренно влажная" : "гиперемирована"}.
											Язык: {formData.dentalStatus.oralMucosaStatus.tongueStatus}.
											Лимфатические узлы: {formData.dentalStatus.oralMucosaStatus.regionalLymphNodes}.
											ВНЧС: {formData.dentalStatus.oralMucosaStatus.tmjFunction}.
										</div>
									</div>

									<div style={{ marginTop: "14px" }}>
										<div className="emr043-field-label">Рентгенологическое обследование:</div>
										<div className="emr043-field-value">
											{formData.dentalStatus.xrayFindingsDescription}
											{formData.dentalStatus.xrayRadiationDoseMsv ? ` (Лучевая нагрузка: ${formData.dentalStatus.xrayRadiationDoseMsv} мЗв)` : ""}
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Вкладка 5: Дневники визитов SOAP */}
						{activeTab === "diaries" && (
							<div>
								<div className="emr043-section-card">
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
										<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
											<Calendar className="w-4 h-4 text-sky-600" />
											4. Дневники клинических приёмов (Формат SOAP)
										</h3>
										<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
											<button
												type="button"
												className="emr043-btn emr043-btn-primary touch-manipulation"
												style={{ minHeight: "44px", padding: "0.45rem 1rem", fontSize: "0.85rem", background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)", color: "white", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
												onClick={() => setIsProtocolGeneratorOpen(true)}
												data-testid="form043-synthesize-diary-btn"
												title="Сформировать дневник 043/у по МКБ-10 и формуле зубов"
											>
												<Sparkles className="w-4 h-4" />
												<span>Сформировать дневник 043/у по МКБ-10 и формуле</span>
											</button>
											<button
												type="button"
												className="emr043-btn emr043-btn-secondary touch-manipulation"
												style={{ minHeight: "44px", padding: "0.45rem 1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
												onClick={() => {
													setIsCmoAuditOpen(true);
													onOpenCmoAudit?.();
												}}
											>
												<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#059669)]" />
												<span>Экспертиза ЭМК (Начмед / ВК)</span>
											</button>
										</div>
									</div>


									{formData.visitDiaries.map((diary, index) => (
										<div key={diary.id || index} className="emr043-soap-card">
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid var(--glass-border, #e2e8f0)", paddingBottom: "6px" }}>
												<div>
													<span className="emr043-soap-badge">Визит #{index + 1}</span>
													<strong>{diary.entryDate}</strong> {diary.entryTime ? `в ${diary.entryTime}` : ""}
													{diary.toothNumber && <span style={{ marginLeft: "8px", fontWeight: 600, color: "var(--teal)" }}>• Зуб FDI № {diary.toothNumber}</span>}
												</div>
												<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
													Врач: <strong>{diary.doctorFullName}</strong>
												</div>
											</div>

											<div style={{ marginBottom: "6px" }}>
												<span style={{ fontWeight: 700, color: "var(--teal)" }}>S (Subjective):</span> {diary.subjectiveComplaints}
											</div>
											<div style={{ marginBottom: "6px" }}>
												<span style={{ fontWeight: 700, color: "var(--teal)" }}>O (Objective):</span> {diary.objectiveStatusLocalis}
												{diary.eodMicroamperes ? ` [ЭОД: ${diary.eodMicroamperes} мкА]` : ""}
											</div>
											<div style={{ marginBottom: "6px" }}>
												<span style={{ fontWeight: 700, color: "var(--teal)" }}>A (Assessment):</span> <strong>{diary.assessmentDiagnosisText}</strong> [{diary.assessmentIcd10Code}]
											</div>
											<div style={{ marginBottom: "6px" }}>
												<span style={{ fontWeight: 700, color: "var(--teal)" }}>P (Plan & Protocol):</span> {diary.procedureProtocol}
											</div>
											{diary.anesthesiaDetails && (
												<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginBottom: "4px" }}>
													• Анестезия: {diary.anesthesiaDetails}
												</div>
											)}
											{diary.appliedMaterials && (
												<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginBottom: "4px" }}>
													• Материалы: {diary.appliedMaterials}
												</div>
											)}
											{diary.digitalSignatureHash && (
												<div style={{ marginTop: "8px", fontSize: "11px", color: "var(--ok-fg)", display: "flex", alignItems: "center", gap: "4px" }}>
													<ShieldCheck className="w-3.5 h-3.5" />
													<span>Заверено УКЭП (ГОСТ Р 34.10): {diary.digitalSignatureHash.slice(0, 20)}…</span>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Вкладка 6: Эпикриз и диспансеризация */}
						{activeTab === "epicrisis" && (
							<div>
								<div className="emr043-section-card">
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
										<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
											<Award className="w-4 h-4 text-sky-600" />
											5. Эпикриз, результаты лечения и план диспансерного наблюдения
										</h3>
										<button
											type="button"
											className="emr043-btn emr043-btn-secondary touch-manipulation"
											style={{ minHeight: "44px", padding: "0.45rem 1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
											onClick={() => {
												setIsCmoAuditOpen(true);
												onOpenCmoAudit?.();
											}}
										>
											<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#059669)]" />
											<span>Экспертиза ЭМК (Начмед / ВК)</span>
										</button>
									</div>
									<div className="emr043-grid-2">
										<div style={{ gridColumn: "1 / -1" }}>
											<div className="emr043-field-label">Сводка проведенного лечения (Эпикриз):</div>
											<div className="emr043-field-value">{formData.epicrisis.treatmentSummary}</div>
										</div>
										<div>
											<div className="emr043-field-label">Исход лечения:</div>
											<div className="emr043-field-value font-bold text-[var(--ok-fg,#059669)]">{formData.epicrisis.treatmentOutcomeLabel}</div>
										</div>
										<div>
											<div className="emr043-field-label">Диспансерная группа:</div>
											<div className="emr043-field-value font-bold text-sky-700">{formData.epicrisis.dispensaryGroupLabel}</div>
										</div>
										<div>
											<div className="emr043-field-label">Сроки планового контрольного осмотра:</div>
											<div className="emr043-field-value">Через {formData.epicrisis.plannedRecallIntervalMonths} месяцев</div>
										</div>
										<div>
											<div className="emr043-field-label">Дата завершения курса лечения:</div>
											<div className="emr043-field-value">{formData.epicrisis.dateCompleted}</div>
										</div>
										<div style={{ gridColumn: "1 / -1" }}>
											<div className="emr043-field-label">План профилактических мероприятий и вторичной профилактики:</div>
											<div className="emr043-field-value">{formData.epicrisis.preventivePlanRecommendations}</div>
										</div>
									</div>
								</div>

								{/* Экспертиза КЭР и заключение врачебной комиссии */}
								<div className="emr043-section-card" style={{ border: "1px dashed var(--glass-border)", background: "var(--paper)" }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
										<div>
											<div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px" }}>
												<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#059669)]" />
												<span>Заключение врачебной комиссии и службы КЭР (Приказ № 203н)</span>
											</div>
											<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginTop: "4px" }}>
												{cmoResolution ? (
													<span>
														Статус: <strong>{cmoResolution.decision === "approved" ? "Утверждено без замечаний" : "Возвращено с замечаниями"}</strong> • Эксперт: {cmoResolution.auditorFullName} ({cmoResolution.auditorRole})
													</span>
												) : (
													<span>Карта ожидает экспертного заключения Начмеда / Председателя врачебной комиссии</span>
												)}
											</div>
										</div>

										<button
											type="button"
											className="emr043-btn emr043-btn-primary touch-manipulation"
											style={{ minHeight: "44px", padding: "0.5rem 1.25rem", fontSize: "0.88rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
											onClick={() => {
												setIsCmoAuditOpen(true);
												onOpenCmoAudit?.();
											}}
										>
											<ShieldCheck className="w-4 h-4" />
											<span>Экспертиза ЭМК (Начмед / ВК)</span>
										</button>
									</div>
								</div>
							</div>
						)}
					</main>

					{/* ── CMO EMR Quality Audit & Approval Modal ── */}
					<CmoEmrAuditModal
						isOpen={isCmoAuditOpen}
						onClose={() => setIsCmoAuditOpen(false)}
						records={[currentAuditRecord]}
						onApproveRecord={(_recId, resolution) => {
							setCmoResolution(resolution);
						}}
						onRejectRecord={(_recId, resolution) => {
							setCmoResolution(resolution);
						}}
						currentAuditorName={cmoAuditorName || formData.clinic.chiefDoctorFullName || "Главный врач"}
						currentAuditorRole={cmoAuditorRole || "chief_medical_officer"}
					/>

					{/* ── EMR Form 043/u Clinical Protocol 1-Click Generator Modal ── */}
					<EmrProtocolGeneratorModal
						isOpen={isProtocolGeneratorOpen}
						onClose={() => setIsProtocolGeneratorOpen(false)}
						patientFullName={formData.passport.patientFullName}
						patientBirthDate={formData.passport.patientBirthDate}
						medicalCardNumber={formData.passport.medicalCardNumber}
						doctorFullName={formData.passport.attendingDoctorFullName}
						doctorSpecialty={formData.passport.attendingDoctorSpecialty}
						odontogramTeeth={formData.dentalStatus.odontogramTeeth}
						onApplyDiary={(newDiary) => {
							setFormData((prev) => {
								const updated = {
									...prev,
									visitDiaries: [newDiary, ...prev.visitDiaries],
								};
								onSave?.(updated);
								return updated;
							});
						}}
						onApplyBatchDiaries={(newDiaries) => {
							setFormData((prev) => {
								const updated = {
									...prev,
									visitDiaries: [...newDiaries, ...prev.visitDiaries],
								};
								onSave?.(updated);
								return updated;
							});
						}}
					/>
				</div>
			</div>
		);

	},
);

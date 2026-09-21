import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
	Maximize2,
	Minimize2,
	Sparkles,
	ZoomIn,
	ZoomOut,
	RotateCcw,
	MoreHorizontal,
} from "lucide-react";
import type {
	MedicalCardForm043uData,
	Form043PrintConfig,
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
} from "./emr043Math";
import { EmrProtocolGeneratorModal } from "./protocolGenerator/EmrProtocolGeneratorModal";
import { toothStatusCodeShortMap, dentalBiteTypeLabels } from "@dental/shared";
import "./emr043Styles.css";


export interface Form043PrintModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: Partial<MedicalCardForm043uData>;
	onSave?: (data: MedicalCardForm043uData) => void;
	readOnly?: boolean;
	onOpenProtocolGenerator?: () => void;
	isLocked?: boolean;
	isDraft?: boolean;
	status?: "draft" | "signed" | "completed" | "voided" | string;
}

export const DEFAULT_043_DATA: MedicalCardForm043uData = {
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
		onOpenProtocolGenerator,
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
		const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

		// Состояние генератора клинических протоколов 043/у
		const [isProtocolGeneratorOpen, setIsProtocolGeneratorOpen] = useState<boolean>(false);

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
				isDraft: effectiveIsDraft,
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
		}, [formData, effectiveIsDraft]);

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
			navigator.clipboard
				.writeText(text)
				.then(() => {
					setCopiedToast(true);
					setTimeout(() => setCopiedToast(false), 2500);
				})
				.catch(() => {});
		}, [formData]);

		// Мандат 8e: Заполнение незаполненных полей анамнеза и статуса физиологической нормой в 1 клик
		const handleApplyNorm043 = useCallback(() => {
			setFormData((prev) => {
				const updated: MedicalCardForm043uData = {
					...prev,
					anamnesis: {
						...prev.anamnesis,
						chiefComplaint: prev.anamnesis?.chiefComplaint?.trim()
							? prev.anamnesis.chiefComplaint
							: "Плановый профилактический осмотр, санация полости рта.",
						historyOfPresentIllness: prev.anamnesis?.historyOfPresentIllness?.trim()
							? prev.anamnesis.historyOfPresentIllness
							: "Обратился для планового профилактического осмотра и оценки гигиенического состояния полости рта.",
						medicalHistoryVitae: prev.anamnesis?.medicalHistoryVitae?.trim()
							? prev.anamnesis.medicalHistoryVitae
							: "Рос и развивался соответственно возрасту. Туберкулез, гепатиты, ВИЧ, сифилис отрицает. Наследственный анамнез не отягощен.",
						allergologicalHistory: prev.anamnesis?.allergologicalHistory?.trim()
							? prev.anamnesis.allergologicalHistory
							: "Аллергологический анамнез не отягощен. Непереносимости местных анестетиков артикаинового ряда и лекарственных средств не отмечает.",
						concomitantSomaticDiseases: prev.anamnesis?.concomitantSomaticDiseases?.trim()
							? prev.anamnesis.concomitantSomaticDiseases
							: "Соматически здоров. Хронические заболевания сердечно-сосудистой, эндокринной и дыхательной систем отрицает.",
						currentSystemicMedications: prev.anamnesis?.currentSystemicMedications?.trim()
							? prev.anamnesis.currentSystemicMedications
							: "Постоянный прием лекарственных препаратов отрицает.",
						pastDentalInterventions: prev.anamnesis?.pastDentalInterventions?.trim()
							? prev.anamnesis.pastDentalInterventions
							: "Ранее проводившиеся стоматологические вмешательства и местную анестезию переносил удовлетворительно.",
						occupationalHazardsAndHabits: prev.anamnesis?.occupationalHazardsAndHabits?.trim()
							? prev.anamnesis.occupationalHazardsAndHabits
							: "Вредных производственных факторов и вредных привычек не отмечает.",
					},
					dentalStatus: {
						...prev.dentalStatus,
						biteType: prev.dentalStatus?.biteType || "orthognathic",
						biteDescription:
							prev.dentalStatus?.biteDescription ||
							"Прикус ортогнатический, смыкание моляров и клыков по I классу Энгля, резцовое перекрытие в пределах 1/3 высоты коронки.",
						oralMucosaStatus: {
							color: prev.dentalStatus?.oralMucosaStatus?.color || "pale_pink_normal",
							moisture: prev.dentalStatus?.oralMucosaStatus?.moisture || "normal",
							pathologicalElements: prev.dentalStatus?.oralMucosaStatus?.pathologicalElements ?? null,
							gingivalPapillae: prev.dentalStatus?.oralMucosaStatus?.gingivalPapillae || "normal_pointed",
							bleedingPBI: prev.dentalStatus?.oralMucosaStatus?.bleedingPBI || "grade_0",
							tongueStatus:
								prev.dentalStatus?.oralMucosaStatus?.tongueStatus ||
								"Язык чистый, влажный, сосочковый слой выражен умеренно, налета нет.",
							regionalLymphNodes:
								prev.dentalStatus?.oralMucosaStatus?.regionalLymphNodes ||
								"Подчелюстные, шейные, подбородочные лимфатические узлы не пальпируются, безболезненные.",
							tmjFunction:
								prev.dentalStatus?.oralMucosaStatus?.tmjFunction ||
								"Открывание рта свободное, в полном объеме, движений девиации и крепитации/щелчков в суставах нет.",
						},
					},
				};
				onSave?.(updated);
				return updated;
			});
		}, [onSave]);

		// Ручное сохранение карты (Мандат 8e)
		const handleSaveForm = useCallback(() => {
			onSave?.(formData);
		}, [onSave, formData]);

		const moreMenuRef = useRef<HTMLDivElement>(null);
		useEffect(() => {
			if (!isMoreMenuOpen) return;
			const handleClickOutside = (event: MouseEvent) => {
				if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
					setIsMoreMenuOpen(false);
				}
			};
			const handleKeyDown = (event: KeyboardEvent) => {
				if (event.key === "Escape") {
					setIsMoreMenuOpen(false);
				}
			};
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleKeyDown);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
				document.removeEventListener("keydown", handleKeyDown);
			};
		}, [isMoreMenuOpen]);

		if (!isOpen) return null;

		// Anti-Matryoshka (Sin 6, Mandate 8d): Render child modals sequentially (depth strictly 1).
		if (isProtocolGeneratorOpen) {
			return (
				<EmrProtocolGeneratorModal
					isOpen={true}
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
						setIsProtocolGeneratorOpen(false);
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
						setIsProtocolGeneratorOpen(false);
					}}
				/>
			);
		}

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
								<span
									data-testid="badge-043-draft-status"
									className="px-2.5 py-0.5 rounded border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1"
								>
									<FileText className="w-3 h-3 text-amber-600" />
									ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)
								</span>
							) : (
								<span
									data-testid="badge-043-draft-status"
									className="px-2.5 py-0.5 rounded border border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1"
								>
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
							{/* Управление масштабом A4 листа (Мандат 8d) */}
							{activeTab === "overview" && (
								<div
									className="emr043-zoom-toolbar"
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "3px",
										border: "1px solid var(--glass-border, #cbd5e1)",
										borderRadius: "6px",
										padding: "2px 6px",
										background: "var(--paper, #f8fafc)",
										height: "32px",
									}}
									title="Масштаб предварительного просмотра листа Формы 043/у"
								>
									<button
										type="button"
										onClick={() => setZoomScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(1))))}
										disabled={zoomScale <= 0.5}
										title="Уменьшить масштаб (–10%)"
										style={{
											background: "transparent",
											border: "none",
											cursor: zoomScale <= 0.5 ? "not-allowed" : "pointer",
											display: "inline-flex",
											alignItems: "center",
											padding: "2px",
											color: "var(--ink, #0f172a)",
											opacity: zoomScale <= 0.5 ? 0.35 : 1,
										}}
										aria-label="Уменьшить масштаб"
									>
										<ZoomOut className="w-3.5 h-3.5" />
									</button>
									<span
										style={{
											fontSize: "11px",
											fontWeight: 700,
											fontVariantNumeric: "tabular-nums",
											minWidth: "36px",
											textAlign: "center",
											color: "var(--ink, #0f172a)",
											userSelect: "none",
										}}
									>
										{Math.round(zoomScale * 100)}%
									</span>
									<button
										type="button"
										onClick={() => setZoomScale((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(1))))}
										disabled={zoomScale >= 1.5}
										title="Увеличить масштаб (+10%)"
										style={{
											background: "transparent",
											border: "none",
											cursor: zoomScale >= 1.5 ? "not-allowed" : "pointer",
											display: "inline-flex",
											alignItems: "center",
											padding: "2px",
											color: "var(--ink, #0f172a)",
											opacity: zoomScale >= 1.5 ? 0.35 : 1,
										}}
										aria-label="Увеличить масштаб"
									>
										<ZoomIn className="w-3.5 h-3.5" />
									</button>
									{zoomScale !== 1.0 && (
										<button
											type="button"
											onClick={() => setZoomScale(1.0)}
											title="Сбросить масштаб к 100%"
											style={{
												background: "transparent",
												border: "none",
												cursor: "pointer",
												display: "inline-flex",
												alignItems: "center",
												padding: "2px",
												color: "var(--muted, #64748b)",
											}}
											aria-label="Сбросить масштаб"
										>
											<RotateCcw className="w-3 h-3" />
										</button>
									)}
								</div>
							)}

							{/* Кнопка нормы в 1 клик (Мандат 8e: 0 disabled) */}
							<button
								type="button"
								className="emr043-btn emr043-btn-secondary"
								onClick={handleApplyNorm043}
								disabled={false}
								data-testid="btn-form043-apply-norm"
								title="Заполнить незаполненные поля анамнеза и статуса физиологической нормой (Мандат 8e)"
							>
								<Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
								<span>Норма (1 клик)</span>
							</button>

							{/* Кнопка сохранения карты при наличии onSave (Мандат 8e: 0 disabled) */}
							{onSave && (
								<button
									type="button"
									className="emr043-btn emr043-btn-secondary"
									onClick={handleSaveForm}
									disabled={false}
									data-testid="btn-form043-save-card"
									title="Сохранить изменения медицинской карты"
								>
									<Check className="w-4 h-4 text-emerald-600 shrink-0" />
									<span>Сохранить</span>
								</button>
							)}

							{/* Кнопка печати (Мандат 8e: печать в любой момент, 0 disabled) */}
							<button
								type="button"
								className="emr043-btn emr043-btn-primary"
								onClick={handlePrint}
								disabled={false}
								data-testid="btn-print-043-card"
								title="Печать или экспорт в PDF (A4)"
							>
								<Printer className="w-4 h-4" />
								<span>Печать / PDF (A4)</span>
							</button>

							{/* Вторичные действия: ЕГИСЗ XML, JSON, Копирование (Закон Миллера, Мандат 8d) */}
							<div className="relative inline-flex items-center" ref={moreMenuRef}>
								<button
									type="button"
									className="emr043-btn emr043-btn-secondary emr043-btn-icon-only"
									onClick={() => setIsMoreMenuOpen((v) => !v)}
									title="Дополнительные форматы (ЕГИСЗ XML, JSON, буфер)"
									aria-label="Дополнительные форматы экспорта"
									data-testid="btn-043-more-actions"
								>
									<MoreHorizontal className="w-4 h-4" />
								</button>
								{isMoreMenuOpen && (
									<div
										className="absolute right-0 top-full mt-1 w-56 bg-[var(--paper-strong,#ffffff)] dark:bg-slate-900 border border-[var(--glass-border,#cbd5e1)] dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 text-xs text-[var(--ink,#0f172a)] dark:text-slate-100 animate-in fade-in duration-100"
										style={{ minWidth: "210px" }}
									>
										<button
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
											onClick={() => {
												handleApplyNorm043();
												setIsMoreMenuOpen(false);
											}}
											data-testid="btn-043-more-apply-norm"
											title="Заполнить незаполненные поля анамнеза и статуса нормой (Мандат 8e)"
										>
											<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
											<span>Физиологическая норма (1 клик)</span>
										</button>
										{onSave && (
											<button
												type="button"
												className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
												onClick={() => {
													handleSaveForm();
													setIsMoreMenuOpen(false);
												}}
												data-testid="btn-043-more-save"
												title="Сохранить медицинскую карту 043/у"
											>
												<Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
												<span>Сохранить карту</span>
											</button>
										)}
										<button
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
											onClick={() => {
												handleExportXml();
												setIsMoreMenuOpen(false);
											}}
											title="Экспорт в HL7 CDA R2 XML для ЕГИСЗ (СЭМД 834н)"
										>
											<Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
											<span>ЕГИСЗ СЭМД (XML)</span>
										</button>
										<button
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
											onClick={() => {
												handleExportJson();
												setIsMoreMenuOpen(false);
											}}
											title="Экспорт в структурированный JSON"
										>
											<Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
											<span>Экспорт в JSON</span>
										</button>
										<button
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
											onClick={() => {
												handleCopyText();
												setIsMoreMenuOpen(false);
											}}
											title="Копировать структурированный текст карты"
										>
											{copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />}
											<span>{copiedToast ? "Скопировано!" : "Копировать текст карты"}</span>
										</button>
									</div>
								)}
							</div>

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
					<nav className="emr043-nav-tabs" style={{ flexWrap: "nowrap", width: "100%", padding: "6px 16px", gap: "6px", overflowX: "auto" }}>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "overview" ? "active" : ""}`}
							style={{ minHeight: "44px", flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("overview")}
						>
							<FileText className="w-4 h-4" />
							<span>Обзор и печать A4</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "passport" ? "active" : ""}`}
							style={{ minHeight: "44px", flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("passport")}
						>
							<User className="w-4 h-4" />
							<span>1. Паспортная часть</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "anamnesis" ? "active" : ""}`}
							style={{ minHeight: "44px", flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("anamnesis")}
						>
							<HeartPulse className="w-4 h-4" />
							<span>2. Анамнез и соматика</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "odontogram" ? "active" : ""}`}
							style={{ minHeight: "44px", flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("odontogram")}
						>
							<Activity className="w-4 h-4" />
							<span>3. Зубная формула и индексы</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "diaries" ? "active" : ""}`}
							style={{ minHeight: "44px", flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
							onClick={() => setActiveTab("diaries")}
						>
							<Calendar className="w-4 h-4" />
							<span>4. Дневники визитов (Форма 043/у)</span>
							<span style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.8 }}>({formData.visitDiaries.length})</span>
						</button>
						<button
							type="button"
							className={`emr043-tab-btn ${activeTab === "epicrisis" ? "active" : ""}`}
							style={{ minHeight: "44px", flexShrink: 0, whiteSpace: "nowrap", padding: "6px 12px", fontSize: "0.8125rem" }}
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
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
								<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
									Не заполнено: {validation.missingFields.map((m) => m.label).join(", ")}
								</span>
								<button
									type="button"
									onClick={handleApplyNorm043}
									disabled={false}
									data-testid="btn-043-completeness-norm"
									style={{
										fontSize: "11px",
										color: "var(--teal, #0d9488)",
										background: "transparent",
										border: "none",
										textDecoration: "underline",
										cursor: "pointer",
										fontWeight: 600,
										padding: 0,
									}}
									title="Заполнить незаполненные показатели нормой в 1 клик (Мандат 8e)"
								>
									Заполнить нормой (1 клик)
								</button>
							</div>
						)}
					</div>

					{/* ── Основное содержимое вкладки ── */}
					<main className="emr043-body">
						{/* Вкладка 1: Обзор и интерактивный лист А4 */}
						{activeTab === "overview" && (
							<div className="emr043-preview-container" style={{ flexDirection: "column", alignItems: "center" }}>
								<div
									className="emr043-a4-sheet"
									style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
									dangerouslySetInnerHTML={{
										__html: generatePrintableHtml043(formData, {
											isLocked: !effectiveIsDraft,
											isDraft: effectiveIsDraft,
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
									<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
										<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
											<HeartPulse className="w-4 h-4 text-sky-600" />
											2. Анамнез жизни и заболевания (Anamnesis vitae et morbi)
										</h3>
										<button
											type="button"
											onClick={handleApplyNorm043}
											disabled={false}
											data-testid="btn-043-anamnesis-norm"
											className="emr043-btn emr043-btn-secondary"
											style={{ fontSize: "11px", padding: "4px 8px", height: "28px" }}
											title="Заполнить незаполненные графы анамнеза нормой (Мандат 8e)"
										>
											<Sparkles className="w-3.5 h-3.5 text-amber-500" />
											<span>Норма анамнеза</span>
										</button>
									</div>
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
									<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
										<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
											<Activity className="w-4 h-4 text-sky-600" />
											3. Стоматологический статус, зубная формула FDI и клинические индексы
										</h3>
										<button
											type="button"
											onClick={handleApplyNorm043}
											disabled={false}
											data-testid="btn-043-status-norm"
											className="emr043-btn emr043-btn-secondary"
											style={{ fontSize: "11px", padding: "4px 8px", height: "28px" }}
											title="Зафиксировать физиологическую норму СОПР и прикуса (Мандат 8e)"
										>
											<Sparkles className="w-3.5 h-3.5 text-amber-500" />
											<span>Норма статуса</span>
										</button>
									</div>

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

						{/* Вкладка 5: Дневники визитов (Форма 043/у) */}
						{activeTab === "diaries" && (
							<div>
								<div className="emr043-section-card">
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
										<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
											<Calendar className="w-4 h-4 text-sky-600" />
											4. Дневники клинических приёмов (Форма 043/у)
										</h3>
										<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
											<button
												type="button"
												className="emr043-btn emr043-btn-primary touch-manipulation"
												style={{ minHeight: "44px", padding: "0.45rem 1rem", fontSize: "0.85rem", background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)", color: "white", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
												onClick={() => {
													if (onOpenProtocolGenerator) {
														onClose();
														onOpenProtocolGenerator();
													} else {
														setIsProtocolGeneratorOpen(true);
													}
												}}
												data-testid="form043-synthesize-diary-btn"
												title="Сформировать дневник 043/у по МКБ-10 и формуле зубов"
											>
												<Sparkles className="w-4 h-4" />
												<span>Сформировать дневник 043/у по МКБ-10 и формуле</span>
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

							</div>
						)}
					</main>
				</div>
			</div>
		);

	},
);

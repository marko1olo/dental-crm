import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
	Camera,
	CheckCircle,
	CheckCircle2,
	X,
	Grid,
	FileText,
	RotateCw,
	FlipHorizontal,
	ZoomIn,
	ZoomOut,
	Trash2,
	Eye,
	Sliders,
	Printer,
	ChevronDown,
	ChevronUp,
	Layers,
	UploadCloud,
	Sparkles,
	Copy,
	MoveHorizontal,
	Zap,
} from "lucide-react";
import {
	ORTHODONTIC_8_ANGLES,
	ORTHODONTIC_STAGE_METADATA,
	ANGLE_CLASS_LABELS_RU,
	SMILE_ARC_LABELS_RU,
	createEmptyOrthodonticSession,
	calculateOrthodonticProtocolCompleteness,
	updateSlotPhoto,
	removeSlotPhoto,
	renderOrthodonticPresentationHtml,
	type OrthodonticPhotoSession,
	type OrthodonticAngleId,
	type OrthodonticSessionStage,
	type AngleClass,
	type SmileArcType,
	type MidlineShiftDirection,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import "../diagnostics/photoProtocol.css";

export interface OrthoClinicalPreset {
	id: string;
	label: string;
	shortLabel: string;
	suggestedStage: OrthodonticSessionStage;
	diagnosisRu: string;
	complaint: string;
	objective: string;
	treatment: string;
	recommendations: string;
}

export const ORTHO_CLINICAL_PRESETS: OrthoClinicalPreset[] = [
	{
		id: "routine_monitoring",
		label: "Плановый контроль: дуги сохранны, активация лигатур/эластиков",
		shortLabel: "Плановый контроль",
		suggestedStage: "active_monitoring",
		diagnosisRu: "К07.2 Аномалии соотношений зубных дуг. Ортодонтическое лечение",
		complaint: "Плановый визит по графику ортодонтического лечения. Жалоб на острую боль и травмирование слизистой нет.",
		objective:
			"Вестибулярная аппаратура стабильна, замки и брекеты интактны, отклеек нет. Дуги сохранены без деформаций, динамика нивелирования положительная. Состояние пародонта и слизистой оболочки в норме. Гигиена удовлетворительная.",
		treatment:
			"Осмотр, антисептическая обработка (0.05% раствор хлоргексидина). Замена эластических лигатур, проверка фиксации дуги в пазах. Коррекция межчелюстной эластической тяги. Контроль окклюзионных контактов.",
		recommendations:
			"Соблюдение гигиены полости рта (ортодонтическая щетка, ершики, ирригатор). Ношение межчелюстных эластиков по назначенной схеме 22 ч/сутки. Следующий приём через 4–5 недель.",
	},
	{
		id: "wire_change_niti",
		label: "Смена дуг: переход на следующий калибр (NiTi верх .016 / низ .014)",
		shortLabel: "Смена дуг (NiTi)",
		suggestedStage: "active_monitoring",
		diagnosisRu: "К07.3 Аномалии положения отдельных зубов. Этап нивелирования",
		complaint: "Плановый визит по графику. Жалоб нет, аппаратура сохранна.",
		objective:
			"Брекет-система зафиксирована стабильно. Завершён первичный этап нивелирования на тонких дугах. Зубные ряды готовы к переходу на дуги большего сечения.",
		treatment:
			"Снятие старых дуг и лигатур. Промывание пазов антисептиком. Введены круглые нивелирующие дуги NiTi: верхняя челюсть .016\", нижняя челюсть .014\". Дистальные концы загнуты и зашлифованы. Замки закрыты.",
		recommendations:
			"Возможна умеренная чувствительность зубов при накусывании в течение 2–3 дней (норма). Защитный ортодонтический воск при натирании. Следующая активация через 4–6 недель.",
	},
	{
		id: "aligner_tracking",
		label: "Элайнеры: контроль трекинга, аттачменты интактны, выдача сета",
		shortLabel: "Контроль элайнеров",
		suggestedStage: "active_monitoring",
		diagnosisRu: "К07.2 Аномалии соотношений зубных дуг. Элайнеротерапия",
		complaint: "Пациент жалоб не предъявляет. Отмечает комфортную адаптацию к каппам, ношение 22 ч/сутки.",
		objective:
			"Контрольный осмотр на этапе элайнеротерапии. Композитные аттачменты на верхней и нижней челюстях интактны, сколов нет. Трекинг зубов идеальный, соответствие виртуальному 3D-сетапу. Зазоры между каппой и зубами отсутствуют.",
		treatment:
			"Контроль смыкания и посадки элайнеров. Проверка контактов флоссом. Одобрен переход на следующий плановый шаг. Выдан следующий комплект капп.",
		recommendations:
			"Продолжать ношение капп 22 ч/сутки с использованием чувисов. Смена капп каждые 10–14 дней. Следующий осмотр через 6–8 недель.",
	},
	{
		id: "removable_plate_check",
		label: "Пластинка: активация кламмеров и винта (1/4 об. = 0.25 мм)",
		shortLabel: "Активация пластинки",
		suggestedStage: "active_monitoring",
		diagnosisRu: "К07.0 Основные аномалии размеров челюстей. Сужение верхней челюсти",
		complaint: "Плановый визит с пластиночным аппаратом. Режим ношения соблюдается.",
		objective:
			"Съемный пластиночный аппарат стабилен, фиксация кламмерами Адамса надежная. Слизистая оболочка под базисом бледно-розовая, без пролежней. Расширяющий винт активируется по графику.",
		treatment:
			"Очистка аппарата. Активация вестибулярной дуги и удерживающих кламмеров. Активация расширяющего винта на 1/4 оборота (0.25 мм). Проверка припасовки в полости рта.",
		recommendations:
			"Ношение пластинки не менее 20–22 часов в сутки. Поворот винта ключом 1 раз в неделю на 1/4 оборота. Следующий контрольный визит через 4 недели.",
	},
	{
		id: "debonding_retainer",
		label: "Снятие аппаратуры: полировка эмали + несъемный ретейнер (13-23, 33-43)",
		shortLabel: "Снятие + ретейнер",
		suggestedStage: "post_treatment",
		diagnosisRu: "К07.9 Челюстно-лицевая аномалия неуточненная. Ретенционный период",
		complaint: "Завершение активного этапа ортодонтического лечения. Результатом доволен.",
		objective:
			"Активное перемещение зубов завершено. Окклюзионные контакты стабильны, класс I по молярам и клыкам. Центральные линии совпадают. Десневой край симметричен.",
		treatment:
			"Атравматичное снятие брекет-системы специальными щипцами. Механическое удаление остатков адгезива твердосплавными финирами, полировка эмали пастами до блеска. Фиксация несъемного проволочного ретейнера (13-23, 33-43) на текучий композит. Глубокое фторирование.",
		recommendations:
			"Бережное отношение к ретейнеру, исключить откусывание жесткой пищи передними зубами. Сняты оттиски для изготовления ночных ретенционных капп. Контрольный осмотр через 1 месяц.",
	},
];

export function generateOrthoDiaryText(
	preset: OrthoClinicalPreset,
	session: OrthodonticPhotoSession,
	dateStr?: string,
): string {
	const effectiveDate = dateStr || new Date().toLocaleDateString("ru-RU");
	const rightMolar = ANGLE_CLASS_LABELS_RU[session.findings.angleClassMolarRight] || "I класс";
	const leftMolar = ANGLE_CLASS_LABELS_RU[session.findings.angleClassMolarLeft] || "I класс";
	const overjet = session.findings.overjetMm ? `${session.findings.overjetMm} мм` : "норма";
	const overbite = session.findings.overbiteMm ? `${session.findings.overbiteMm} мм` : "норма";
	const smileArc = SMILE_ARC_LABELS_RU[session.findings.smileArc] || "консонантная";

	const uploadedCount = Object.values(session.slots).filter((s) => Boolean(s?.imageUrl)).length;
	const photoNote =
		uploadedCount > 0
			? `Фотопротокол зафиксирован (${uploadedCount} снимков в карте)`
			: "Фотопротокол: первичный осмотр без фотофиксации (норма)";

	return `ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)
Дата приёма: ${effectiveDate}
Пациент: ${session.patientName || "Пациент"}
Врач: ${session.doctorName || "Врач-ортодонт"}
Диагноз: ${preset.diagnosisRu}

1. ЖАЛОБЫ:
${preset.complaint}

2. ОБЪЕКТИВНЫЙ СТАТУС:
${preset.objective}
• Окклюзия: моляры справа — ${rightMolar}, слева — ${leftMolar}. Сагиттальная щель (Overjet): ${overjet}, перекрытие (Overbite): ${overbite}. Дуга улыбки: ${smileArc}.
• ${photoNote}.

3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ:
${preset.treatment}

4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:
${preset.recommendations}`;
}

export interface OrthoPhotoProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	doctorName?: string;
	clinicName?: string;
	initialSession?: OrthodonticPhotoSession;
	treatmentPlanId?: string;
	treatmentPlanStageId?: string;
	treatmentStageTitle?: string;
	onSaveSession?: (session: OrthodonticPhotoSession) => void;
	onInsertProtocol043?: (protocolText: string) => void;
}

export const OrthoPhotoProtocolModal: React.FC<OrthoPhotoProtocolModalProps> = ({
	isOpen,
	onClose,
	patientId = "",
	patientName: propPatientName,
	doctorName: propDoctorName,
	clinicName: propClinicName,
	initialSession,
	treatmentPlanId,
	treatmentPlanStageId,
	treatmentStageTitle = "Ортодонтическое лечение",
	onSaveSession,
	onInsertProtocol043,
}) => {
	const patientName = (propPatientName && propPatientName.trim()) || "Пациент";
	const doctorName = (propDoctorName && propDoctorName.trim()) || "Лечащий врач-ортодонт";
	const clinicName = (propClinicName && propClinicName.trim()) || "Стоматологическая клиника";

	// Session state
	const [session, setSession] = useState<OrthodonticPhotoSession>(() => {
		if (initialSession) return initialSession;
		return createEmptyOrthodonticSession({
			patientId: patientId || "",
			patientName,
			doctorName,
			clinicName,
			stage: "pre_treatment",
			...(treatmentPlanId ? { treatmentPlanId } : {}),
			...(treatmentPlanStageId ? { treatmentPlanStageId } : {}),
			treatmentStageTitle,
		});
	});

	// UI states
	const [activeViewMode, setActiveViewMode] = useState<"grid" | "comparison">("grid");
	const [globalGuidelinesEnabled, setGlobalGuidelinesEnabled] = useState<boolean>(true);
	const [showFindingsAccordion, setShowFindingsAccordion] = useState<boolean>(false);
	const [dragOverSlotId, setDragOverSlotId] = useState<OrthodonticAngleId | null>(null);
	const [activeCategoryFilter, setActiveCategoryFilter] = useState<"all" | "extraoral" | "intraoral">("all");

	// Presets & Form 043/u
	const [activePreset, setActivePreset] = useState<OrthoClinicalPreset>(ORTHO_CLINICAL_PRESETS[0]!);
	const [insertProtocolOnSave, setInsertProtocolOnSave] = useState<boolean>(true);
	const [showPresetPreview, setShowPresetPreview] = useState<boolean>(false);

	// Split Comparison
	const [compareAngle, setCompareAngle] = useState<OrthodonticAngleId>("intraoral_frontal_occlusion");
	const [sliderPosition, setSliderPosition] = useState<number>(50);

	// File input ref
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentUploadingAngleRef = useRef<OrthodonticAngleId | null>(null);

	// Synchronize session on prop updates
	useEffect(() => {
		if (initialSession) {
			setSession(initialSession);
		} else if (isOpen) {
			setSession((prev) => {
				if (
					(patientId && prev.patientId !== patientId) ||
					(patientName && prev.patientName !== patientName) ||
					(doctorName && prev.doctorName !== doctorName) ||
					(clinicName && prev.clinicName !== clinicName)
				) {
					return {
						...prev,
						patientId: patientId || prev.patientId,
						patientName,
						doctorName,
						clinicName,
					};
				}
				return prev;
			});
		}
	}, [initialSession, isOpen, patientId, patientName, doctorName, clinicName]);

	// Completeness metric (Zero blockers!)
	const completeness = useMemo(() => {
		return calculateOrthodonticProtocolCompleteness(session);
	}, [session]);

	const currentStageMeta = ORTHODONTIC_STAGE_METADATA[session.stage];

	// Handle stage change
	const handleStageChange = useCallback((newStage: OrthodonticSessionStage) => {
		setSession((prev) => ({
			...prev,
			stage: newStage,
			updatedAt: new Date().toISOString(),
		}));
	}, []);

	// Select preset in 1 click
	const handleSelectPreset = useCallback((preset: OrthoClinicalPreset) => {
		setActivePreset(preset);
		if (preset.suggestedStage !== session.stage) {
			handleStageChange(preset.suggestedStage);
		}
		if (!session.findings.clinicalDiagnosisRu || session.findings.clinicalDiagnosisRu.trim() === "") {
			setSession((prev) => ({
				...prev,
				findings: {
					...prev.findings,
					clinicalDiagnosisRu: preset.diagnosisRu,
				},
				updatedAt: new Date().toISOString(),
			}));
		}
		showToast(`⚡ Выбран пресет: ${preset.shortLabel}`, "info");
	}, [session.stage, session.findings.clinicalDiagnosisRu, handleStageChange]);

	// 1-Click Insert SOAP into Form 043/u (Mandate 8e: zero friction)
	const handleInsertProtocol043 = useCallback(
		(presetToApply?: OrthoClinicalPreset) => {
			const targetPreset = presetToApply || activePreset || ORTHO_CLINICAL_PRESETS[0]!;
			if (!targetPreset) return;
			const fullProtocolText = generateOrthoDiaryText(targetPreset, session);

			try {
				const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
				if (setVisitNoteForm) {
					setVisitNoteForm((prev) => {
						const prevComplaint = prev.complaint || "";
						const newComplaint = prevComplaint
							? `${prevComplaint}\n\n[Ортодонтия] ${targetPreset.complaint}`
							: `[Ортодонтия] ${targetPreset.complaint}`;

						const prevObjective = prev.objectiveStatus || "";
						const newObjective = prevObjective
							? `${prevObjective}\n\n${fullProtocolText}`
							: fullProtocolText;

						const prevPlan = prev.treatmentPlan || "";
						const newPlan = prevPlan
							? `${prevPlan}\n\n[Ортодонтия] ${targetPreset.shortLabel}`
							: `[Ортодонтия] ${targetPreset.shortLabel}: ${targetPreset.recommendations}`;

						const prevDiagnosis = prev.diagnosis || "";
						const newDiagnosis = prevDiagnosis
							? `${prevDiagnosis}; ${targetPreset.diagnosisRu}`
							: targetPreset.diagnosisRu;

						return {
							...prev,
							complaint: newComplaint,
							objectiveStatus: newObjective,
							treatmentPlan: newPlan,
							diagnosis: newDiagnosis,
						};
					});
				}

				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-apply-soap-protocol", {
							detail: {
								protocolText: fullProtocolText,
								title: `Ортодонтия: ${targetPreset.shortLabel}`,
								soap: {
									complaint: targetPreset.complaint,
									objective: fullProtocolText,
									treatmentPlan: targetPreset.treatment,
									recommendations: targetPreset.recommendations,
									diagnosisIcd10: targetPreset.diagnosisRu,
								},
								mode: "smart_append",
								immediate: true,
							},
						}),
					);
				}

				if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
					navigator.clipboard.writeText(fullProtocolText).catch(() => {});
				}

				onInsertProtocol043?.(fullProtocolText);
				showToast("⚡ Протокол ортодонтии успешно внесен в дневник 043/у!", "success");
			} catch (_err) {
				if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
					navigator.clipboard.writeText(fullProtocolText).catch(() => {});
				}
				showToast("Протокол скопирован в буфер обмена", "info");
			}
		},
		[activePreset, session, onInsertProtocol043],
	);

	// File selection handler
	const handleFileSelect = useCallback(
		(angleId: OrthodonticAngleId, file: File) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const resultUrl = e.target?.result as string;
				setSession((prev) =>
					updateSlotPhoto(prev, angleId, {
						imageUrl: resultUrl,
						capturedAt: new Date().toISOString(),
						rotationDegrees: 0,
						flipHorizontal: false,
						flipVertical: false,
						brightness: 0,
						contrast: 0,
						zoom: 1,
						panX: 0,
						panY: 0,
						guidelineOverlayEnabled: true,
					}),
				);
				showToast("Снимок загружен", "success");
			};
			reader.readAsDataURL(file);
		},
		[],
	);

	const triggerUploadForAngle = (angleId: OrthodonticAngleId) => {
		currentUploadingAngleRef.current = angleId;
		fileInputRef.current?.click();
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		const file = files && files.length > 0 ? files[0] : null;
		if (file && currentUploadingAngleRef.current) {
			handleFileSelect(currentUploadingAngleRef.current, file);
		}
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	// Drag and drop handlers
	const handleDragOver = (e: React.DragEvent, angleId: OrthodonticAngleId) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOverSlotId(angleId);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOverSlotId(null);
	};

	const handleDrop = (e: React.DragEvent, angleId: OrthodonticAngleId) => {
		e.preventDefault();
		e.stopPropagation();
		setDragOverSlotId(null);

		const file = e.dataTransfer.files?.[0];
		if (file) {
			handleFileSelect(angleId, file);
		}
	};

	// Slot mutations
	const handleRotateSlot = (angleId: OrthodonticAngleId, e: React.MouseEvent) => {
		e.stopPropagation();
		const currentSlot = session.slots[angleId];
		const currentDeg = currentSlot?.rotationDegrees || 0;
		const nextDeg = (currentDeg + 90) % 360;
		setSession((prev) => updateSlotPhoto(prev, angleId, { rotationDegrees: nextDeg }));
	};

	const handleFlipHorizontal = (angleId: OrthodonticAngleId, e: React.MouseEvent) => {
		e.stopPropagation();
		const currentSlot = session.slots[angleId];
		setSession((prev) =>
			updateSlotPhoto(prev, angleId, { flipHorizontal: !currentSlot?.flipHorizontal }),
		);
	};

	const handleZoomChange = (angleId: OrthodonticAngleId, delta: number, e: React.MouseEvent) => {
		e.stopPropagation();
		const currentSlot = session.slots[angleId];
		const currentZoom = currentSlot?.zoom || 1;
		const nextZoom = Math.min(3, Math.max(0.5, Math.round((currentZoom + delta) * 10) / 10));
		setSession((prev) => updateSlotPhoto(prev, angleId, { zoom: nextZoom }));
	};

	const handleDeletePhoto = (angleId: OrthodonticAngleId, e: React.MouseEvent) => {
		e.stopPropagation();
		setSession((prev) => removeSlotPhoto(prev, angleId));
	};

	// Findings change
	const handleFindingsChange = <K extends keyof OrthodonticPhotoSession["findings"]>(
		key: K,
		value: OrthodonticPhotoSession["findings"][K],
	) => {
		setSession((prev) => ({
			...prev,
			findings: {
				...prev.findings,
				[key]: value,
			},
			updatedAt: new Date().toISOString(),
		}));
	};

	// 1-Click Export to Printable Presentation HTML / PDF
	const handleExportPresentation = () => {
		const htmlContent = renderOrthodonticPresentationHtml(session);
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(htmlContent);
			printWindow.document.close();
			printWindow.focus();
			if (printWindow.document.readyState === "complete") {
				printWindow.print();
			} else {
				printWindow.onload = () => {
					printWindow.print();
				};
			}
		}
	};

	// Save session — ZERO BLOCKERS (Mandate 8e)
	const handleSave = () => {
		if (insertProtocolOnSave) {
			handleInsertProtocol043();
		}
		if (onSaveSession) {
			onSaveSession(session);
		}
		showToast("Фотопротокол сохранен", "success");
		onClose();
	};

	if (!isOpen) return null;

	const filteredAngles = ORTHODONTIC_8_ANGLES.filter((a) => {
		if (activeCategoryFilter === "all") return true;
		return a.category === activeCategoryFilter;
	});

	return (
		<div className="ortho-photo-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
			<div
				className="ortho-photo-modal-container"
				onClick={(e) => e.stopPropagation()}
				data-testid="ortho-photo-protocol-modal"
			>
				{/* Hidden File Input */}
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileInputChange}
					accept="image/jpeg,image/png,image/webp"
					style={{ display: "none" }}
				/>

				{/* 1. Modal Header */}
				<header className="ortho-modal-header">
					<div className="ortho-header-left">
						<div className="ortho-header-icon">
							<Camera size={20} />
						</div>
						<div>
							<h2 className="ortho-header-title">Ортодонтический фотопротокол</h2>
							<div className="ortho-header-subtitle">
								<span>Пациент: <strong>{session.patientName || patientName}</strong></span>
								<span>•</span>
								<span>Врач: {session.doctorName || doctorName}</span>
								<span>•</span>
								<span>{session.clinicName || clinicName}</span>
							</div>
						</div>
					</div>

					<div className="ortho-header-actions">
						<button
							type="button"
							onClick={handleExportPresentation}
							className="ortho-tool-btn ortho-export-btn"
							title="Сформировать презентацию и распечатать в PDF"
							data-testid="export-ortho-pdf-btn"
						>
							<Printer size={15} />
							<span>Печать / PDF</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="ortho-slot-btn"
							aria-label="Закрыть модальное окно"
							data-testid="close-ortho-modal-btn"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* 2. Toolbar & Stage Switcher (Mandate 8d: 1 row 32-36px toolbar) */}
				<div className="ortho-modal-toolbar min-h-[36px] max-h-[40px] py-1 px-4 flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap shrink-0 flex-nowrap">
					{/* Stage buttons */}
					<div className="ortho-stage-selector" role="group" aria-label="Этап фотопротокола">
						<button
							type="button"
							onClick={() => handleStageChange("pre_treatment")}
							className={`ortho-stage-btn ${session.stage === "pre_treatment" ? "active-stage-pre" : ""}`}
							data-testid="stage-pre-btn"
						>
							<span>До лечения</span>
						</button>
						<button
							type="button"
							onClick={() => handleStageChange("active_monitoring")}
							className={`ortho-stage-btn ${session.stage === "active_monitoring" ? "active-stage-active" : ""}`}
							data-testid="stage-active-btn"
						>
							<span>Контроль</span>
						</button>
						<button
							type="button"
							onClick={() => handleStageChange("post_treatment")}
							className={`ortho-stage-btn ${session.stage === "post_treatment" ? "active-stage-post" : ""}`}
							data-testid="stage-post-btn"
						>
							<span>После лечения</span>
						</button>
					</div>

					{/* View mode toggle: Grid vs Comparison */}
					<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] dark:bg-slate-800 p-1 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700">
						<button
							type="button"
							onClick={() => setActiveViewMode("grid")}
							className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
								activeViewMode === "grid"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
							}`}
						>
							<Grid size={14} />
							<span>Сетка ({completeness.uploadedCount}/8)</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveViewMode("comparison")}
							className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
								activeViewMode === "comparison"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
							}`}
						>
							<MoveHorizontal size={14} />
							<span>Сплит До / После</span>
						</button>
					</div>

					{/* Filter tabs & guidelines toggle */}
					{activeViewMode === "grid" && (
						<div className="ortho-toolbar-tools">
							<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] dark:bg-slate-800 p-1 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700">
								<button
									type="button"
									onClick={() => setActiveCategoryFilter("all")}
									className={`px-2.5 py-1 text-xs font-semibold rounded ${
										activeCategoryFilter === "all"
											? "bg-[var(--teal,var(--brand-primary))] text-white"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									Все (8)
								</button>
								<button
									type="button"
									onClick={() => setActiveCategoryFilter("extraoral")}
									className={`px-2.5 py-1 text-xs font-semibold rounded ${
										activeCategoryFilter === "extraoral"
											? "bg-[var(--teal,var(--brand-primary))] text-white"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									Лицо (3)
								</button>
								<button
									type="button"
									onClick={() => setActiveCategoryFilter("intraoral")}
									className={`px-2.5 py-1 text-xs font-semibold rounded ${
										activeCategoryFilter === "intraoral"
											? "bg-[var(--teal,var(--brand-primary))] text-white"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									Зубы (5)
								</button>
							</div>

							<button
								type="button"
								onClick={() => setGlobalGuidelinesEnabled(!globalGuidelinesEnabled)}
								className={`ortho-tool-btn ${globalGuidelinesEnabled ? "active" : ""}`}
								title="Показать/скрыть сетку наложения"
								data-testid="toggle-guidelines-btn"
							>
								<Grid size={15} />
								<span>Сетка</span>
							</button>
						</div>
					)}
				</div>

				{/* 3. Modal Body */}
				<div className="ortho-modal-body">
					{/* Progress Ribbon & Completeness (Mandate 8e: informs, does not block!) */}
					<div className="ortho-plan-ribbon">
						<div className="ortho-plan-info">
							<span className="ortho-plan-badge">{currentStageMeta.shortLabelRu}</span>
							<span className="font-semibold text-xs text-[var(--ink,#0f172a)] dark:text-slate-100">
								{session.treatmentStageTitle || "Ортодонтическое лечение"}
							</span>
						</div>

						<div className="ortho-completeness-meter">
							<div className="ortho-progress-bar">
								<div
									className={`ortho-progress-fill ${completeness.isComplete ? "complete" : ""}`}
									style={{ width: `${completeness.completionPercentage}%` }}
								/>
							</div>
							<span className="ortho-progress-text">
								{completeness.uploadedCount}/8 ({completeness.completionPercentage}%)
							</span>
							<span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold ml-1">
								(Сохранение доступно при любом числе фото — Мандат 8e)
							</span>
						</div>
					</div>

					{/* 1-Click Clinical Presets Bar */}
					<div className="ortho-presets-bar" role="group" aria-label="Готовые клинические пресеты ортодонтии">
						<div className="ortho-presets-label">
							<Sparkles size={14} className="text-amber-500 shrink-0" />
							<span>1-клик пресеты 043/у:</span>
						</div>
						<div className="ortho-presets-list">
							{ORTHO_CLINICAL_PRESETS.map((preset) => {
								const isSelected = activePreset?.id === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => handleSelectPreset(preset)}
										className={`ortho-preset-pill ${isSelected ? "active" : ""}`}
										title={preset.label}
										data-testid={`ortho-preset-${preset.id}`}
									>
										<span>{preset.shortLabel}</span>
									</button>
								);
							})}
						</div>
						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={() => setShowPresetPreview(!showPresetPreview)}
								className="ortho-preset-preview-toggle"
								title={showPresetPreview ? "Скрыть предпросмотр" : "Предпросмотр дневника 043/у"}
								data-testid="toggle-preset-preview-btn"
							>
								<Eye size={13} />
								<span>{showPresetPreview ? "Скрыть" : "Текст 043/у"}</span>
							</button>
						</div>
					</div>

					{/* Optional Collapsible Preset Preview */}
					{showPresetPreview && activePreset && (
						<div className="ortho-preset-preview-box" data-testid="ortho-preset-preview-box">
							<div className="ortho-preset-preview-header">
								<span className="font-semibold text-xs text-[var(--ink,#0f172a)] dark:text-white">
									Предпросмотр структурированного протокола ({activePreset.shortLabel}):
								</span>
								<span className="text-[11px] text-teal-600 font-bold">Мандат 8e • 1 клик вставка</span>
							</div>
							<pre className="ortho-preset-preview-text">
								{generateOrthoDiaryText(activePreset, session)}
							</pre>
						</div>
					)}

					{/* View 1: 8-Slot Grid (Real photos & dropzones) */}
					{activeViewMode === "grid" && (
						<div className="ortho-8-grid">
							{filteredAngles.map((angle) => {
								const slot = session.slots[angle.id];
								const hasPhoto = Boolean(slot && slot.imageUrl);
								const isDragOver = dragOverSlotId === angle.id;
								const showGuides = globalGuidelinesEnabled && (slot?.guidelineOverlayEnabled ?? true);

								return (
									<div
										key={angle.id}
										className={`ortho-slot-card ${hasPhoto ? "has-photo" : ""} ${isDragOver ? "drag-over" : ""}`}
										onDragOver={(e) => handleDragOver(e, angle.id)}
										onDragLeave={handleDragLeave}
										onDrop={(e) => handleDrop(e, angle.id)}
										data-testid={`photo-slot-${angle.id}`}
									>
										{/* Slot Header */}
										<div className="ortho-slot-header">
											<div className="ortho-slot-title-wrap">
												<span className="ortho-slot-num">{angle.sequenceNumber}</span>
												<span className="ortho-slot-title" title={angle.titleRu}>
													{angle.titleRu}
												</span>
											</div>
											<span className="ortho-slot-category-badge">
												{angle.category === "intraoral" ? "Зубы" : "Лицо"}
											</span>
										</div>

										{/* Slot Viewport */}
										<div
											className="ortho-slot-viewport"
											onClick={() => {
												if (!hasPhoto) triggerUploadForAngle(angle.id);
											}}
										>
											{hasPhoto && slot?.imageUrl ? (
												<>
													<img
														src={slot.imageUrl}
														alt={angle.titleRu}
														className="ortho-slot-img"
														style={{
															transform: `rotate(${slot.rotationDegrees || 0}deg) scale(${slot.zoom || 1}) ${
																slot.flipHorizontal ? "scaleX(-1)" : ""
															} ${slot.flipVertical ? "scaleY(-1)" : ""}`,
															filter: `brightness(${(slot.brightness || 0) + 100}%) contrast(${
																(slot.contrast || 0) + 100
															}%)`,
														}}
													/>

													{/* Guidelines Overlay */}
													{showGuides && (
														<div className="ortho-guide-overlay">
															<div className="ortho-guide-midline" />
															<div className="ortho-guide-occlusal" />
															<div className="ortho-guide-thirds-h1" />
															<div className="ortho-guide-thirds-h2" />
														</div>
													)}
												</>
											) : (
												<div className="ortho-dropzone-empty">
													<UploadCloud className="ortho-dropzone-icon" />
													<span className="ortho-dropzone-label">Загрузить фото</span>
													<span className="ortho-dropzone-hint">{angle.shortLabelRu}</span>
												</div>
											)}
										</div>

										{/* Slot Controls Bar */}
										<div className="ortho-slot-controls">
											<button
												type="button"
												onClick={() => triggerUploadForAngle(angle.id)}
												className="ortho-slot-btn"
												title="Загрузить снимок"
												data-testid={`upload-btn-${angle.id}`}
											>
												<UploadCloud size={14} />
											</button>

											{hasPhoto ? (
												<>
													<button
														type="button"
														onClick={(e) => handleRotateSlot(angle.id, e)}
														className="ortho-slot-btn"
														title="Повернуть на 90°"
													>
														<RotateCw size={13} />
													</button>
													<button
														type="button"
														onClick={(e) => handleFlipHorizontal(angle.id, e)}
														className="ortho-slot-btn"
														title="Отразить зеркально"
													>
														<FlipHorizontal size={13} />
													</button>
													<button
														type="button"
														onClick={(e) => handleZoomChange(angle.id, 0.2, e)}
														className="ortho-slot-btn"
														title="Увеличить"
													>
														<ZoomIn size={13} />
													</button>
													<button
														type="button"
														onClick={(e) => handleZoomChange(angle.id, -0.2, e)}
														className="ortho-slot-btn"
														title="Уменьшить"
													>
														<ZoomOut size={13} />
													</button>
													<button
														type="button"
														onClick={(e) => handleDeletePhoto(angle.id, e)}
														className="ortho-slot-btn danger"
														title="Удалить снимок"
														data-testid={`delete-btn-${angle.id}`}
													>
														<Trash2 size={13} />
													</button>
												</>
											) : (
												<span className="text-[10px] text-[var(--muted,#64748b)] truncate max-w-[150px]">
													{angle.requiredEquipmentRu.slice(0, 24)}...
												</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* View 2: Split Before/After Comparison */}
					{activeViewMode === "comparison" && (
						<div className="p-4 flex flex-col gap-3">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">
									Выберите ракурс для сплит-сравнения:
								</span>
								<div className="flex items-center gap-1 overflow-x-auto">
									{ORTHODONTIC_8_ANGLES.map((a) => (
										<button
											key={a.id}
											type="button"
											onClick={() => setCompareAngle(a.id)}
											className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
												compareAngle === a.id
													? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
													: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
											}`}
										>
											{a.shortLabelRu}
										</button>
									))}
								</div>
							</div>

							<div className="relative h-72 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
								{session.slots[compareAngle]?.imageUrl ? (
									<>
										<div
											style={{ width: `${sliderPosition}%` }}
											className="h-full border-r-2 border-[var(--teal,var(--brand-primary))] overflow-hidden relative"
										>
											<img
												src={session.slots[compareAngle]?.imageUrl}
												alt="Снимок протокола"
												className="absolute inset-0 w-full h-full object-cover"
											/>
											<span className="absolute top-2 left-2 text-[10px] font-bold text-teal-300 bg-teal-950/90 px-2 py-0.5 rounded border border-teal-500/40 z-10">
												Текущий сеанс
											</span>
										</div>

										<div className="flex-1 h-full overflow-hidden relative bg-slate-900 flex items-center justify-center">
											<div className="text-center p-4">
												<UploadCloud size={24} className="text-slate-500 mx-auto mb-1" />
												<span className="text-xs text-slate-300 font-bold block">
													Сравнение с исходным снимком
												</span>
												<span className="text-[11px] text-slate-500">
													Перемещайте ползунок для контроля динамики
												</span>
											</div>
										</div>

										<input
											type="range"
											min="0"
											max="100"
											value={sliderPosition}
											onChange={(e) => setSliderPosition(Number(e.target.value))}
											aria-label="Слайдер сравнения"
											className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
										/>
										<div
											style={{ left: `${sliderPosition}%` }}
											className="absolute top-0 bottom-0 w-1 bg-[var(--teal,var(--brand-primary))] z-10 pointer-events-none flex items-center justify-center"
										>
											<div className="w-8 h-8 rounded-full bg-[var(--teal,var(--brand-primary))] text-white flex items-center justify-center shadow-lg border-2 border-white">
												<Sliders size={14} />
											</div>
										</div>
									</>
								) : (
									<div className="text-center p-4">
										<Camera size={28} className="text-slate-500 mx-auto mb-1.5" />
										<span className="text-xs font-bold text-slate-200 block">
											Снимок ракурса не загружен
										</span>
										<button
											type="button"
											onClick={() => triggerUploadForAngle(compareAngle)}
											className="mt-2 px-3 py-1 rounded-lg bg-[var(--teal,var(--brand-primary))] text-white text-xs font-bold cursor-pointer"
										>
											Загрузить снимок
										</button>
									</div>
								)}
							</div>
						</div>
					)}

					{/* 4. Clinical Diagnostics & Occlusal Parameters Accordion */}
					<div className="ortho-findings-section">
						<div
							className="ortho-findings-header"
							onClick={() => setShowFindingsAccordion(!showFindingsAccordion)}
						>
							<div className="ortho-findings-title">
								<Sliders size={16} className="text-[var(--teal,var(--brand-primary))]" />
								<span>Клиническая диагностика и окклюзионные параметры</span>
							</div>
							{showFindingsAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
						</div>

						{showFindingsAccordion && (
							<div className="ortho-findings-body">
								{/* Molar relationship */}
								<div className="ortho-field-group">
									<label className="ortho-field-label">Класс моляров (справа / слева)</label>
									<div className="grid grid-cols-2 gap-2">
										<select
											aria-label="Класс моляров справа"
											value={session.findings.angleClassMolarRight}
											onChange={(e) =>
												handleFindingsChange("angleClassMolarRight", e.target.value as AngleClass)
											}
											className="ortho-select"
										>
											<option value="class_1">Пр: I класс</option>
											<option value="class_2_div_1">Пр: II/1 класс</option>
											<option value="class_2_div_2">Пр: II/2 класс</option>
											<option value="class_3">Пр: III класс</option>
										</select>
										<select
											aria-label="Класс моляров слева"
											value={session.findings.angleClassMolarLeft}
											onChange={(e) =>
												handleFindingsChange("angleClassMolarLeft", e.target.value as AngleClass)
											}
											className="ortho-select"
										>
											<option value="class_1">Лев: I класс</option>
											<option value="class_2_div_1">Лев: II/1 класс</option>
											<option value="class_2_div_2">Лев: II/2 класс</option>
											<option value="class_3">Лев: III класс</option>
										</select>
									</div>
								</div>

								{/* Overjet & Overbite */}
								<div className="ortho-field-group">
									<label className="ortho-field-label">Сагиттальная щель (Overjet) & Перекрытие (Overbite)</label>
									<div className="grid grid-cols-2 gap-2">
										<div className="ortho-input-unit">
											<input
												type="number"
												step="0.5"
												value={session.findings.overjetMm}
												onChange={(e) =>
													handleFindingsChange("overjetMm", Number.parseFloat(e.target.value) || 0)
												}
												className="ortho-input w-full"
												placeholder="Overjet"
											/>
											<span className="text-xs text-[var(--muted,#64748b)]">мм</span>
										</div>
										<div className="ortho-input-unit">
											<input
												type="number"
												step="0.5"
												value={session.findings.overbiteMm}
												onChange={(e) =>
													handleFindingsChange("overbiteMm", Number.parseFloat(e.target.value) || 0)
												}
												className="ortho-input w-full"
												placeholder="Overbite"
											/>
											<span className="text-xs text-[var(--muted,#64748b)]">мм</span>
										</div>
									</div>
								</div>

								{/* Smile Arc */}
								<div className="ortho-field-group">
									<label className="ortho-field-label">Дуга улыбки (Smile Arc)</label>
									<select
										aria-label="Дуга улыбки"
										value={session.findings.smileArc}
										onChange={(e) =>
											handleFindingsChange("smileArc", e.target.value as SmileArcType)
										}
										className="ortho-select"
									>
										<option value="consonant">Консонантная (эстетический идеал)</option>
										<option value="flat">Уплощенная (прямая линия)</option>
										<option value="reverse">Реверсивная (инвертированная)</option>
									</select>
								</div>

								{/* Midline Shifts */}
								<div className="ortho-field-group">
									<label className="ortho-field-label">Смещение средней линии В/Ч</label>
									<div className="grid grid-cols-2 gap-2">
										<select
											aria-label="Направление смещения средней линии ВЧ"
											value={session.findings.midlineShiftUpperDirection}
											onChange={(e) =>
												handleFindingsChange(
													"midlineShiftUpperDirection",
													e.target.value as MidlineShiftDirection,
												)
											}
											className="ortho-select"
										>
											<option value="none">В норме</option>
											<option value="left">Влево</option>
											<option value="right">Вправо</option>
										</select>
										<div className="ortho-input-unit">
											<input
												type="number"
												step="0.5"
												value={session.findings.midlineShiftUpperMm}
												onChange={(e) =>
													handleFindingsChange(
														"midlineShiftUpperMm",
														Number.parseFloat(e.target.value) || 0,
													)
												}
												className="ortho-input w-full"
											/>
											<span className="text-xs text-[var(--muted,#64748b)]">мм</span>
										</div>
									</div>
								</div>

								{/* Diagnosis & Recommendations */}
								<div className="ortho-field-group col-span-2">
									<label className="ortho-field-label">Клинический диагноз и рекомендации</label>
									<input
										type="text"
										value={session.findings.clinicalDiagnosisRu}
										onChange={(e) =>
											handleFindingsChange("clinicalDiagnosisRu", e.target.value)
										}
										className="ortho-input w-full"
										placeholder="Диагноз по МКБ / СтАР"
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 5. Modal Footer: ZERO BLOCKERS */}
				<footer className="ortho-modal-footer">
					<div className="ortho-footer-left">
						<label className="ortho-insert-checkbox-label">
							<input
								type="checkbox"
								checked={insertProtocolOnSave}
								onChange={(e) => setInsertProtocolOnSave(e.target.checked)}
								className="ortho-checkbox"
								data-testid="insert-protocol-on-save-checkbox"
							/>
							<span>Вносить в дневник 043/у при сохранении</span>
						</label>
						<span className="ortho-footer-ref-hint">Форма 043/у • Приказ МЗ РФ № 834н</span>
					</div>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={() => handleInsertProtocol043()}
							className="ortho-btn-insert-043"
							title="Вставить структурированный протокол ортодонтии в дневник 043/у"
							data-testid="insert-ortho-protocol-043-btn"
						>
							<FileText size={15} />
							<span>В дневник 043/у</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="ortho-btn-secondary"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="ortho-btn-primary"
							data-testid="save-ortho-protocol-btn"
						>
							<CheckCircle size={15} />
							<span>Сохранить фотопротокол</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default OrthoPhotoProtocolModal;

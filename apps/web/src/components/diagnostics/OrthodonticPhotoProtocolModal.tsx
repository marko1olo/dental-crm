import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
	Camera,
	CheckCircle,
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
	UploadCloud,
	MoreVertical,
	Sparkles,
	Copy,
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
import "./photoProtocol.css";

export interface OrthodonticClinicalPreset {
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

export const ORTHODONTIC_CLINICAL_PRESETS: OrthodonticClinicalPreset[] = [
	{
		id: "aligner_bonding_steps_1_5",
		label: "Фиксация аттачментов + выдача элайнеров (шаги 1–5)",
		shortLabel: "Фиксация аттачментов + элайнеры (1–5)",
		suggestedStage: "pre_treatment",
		diagnosisRu: "К07.2 Аномалии соотношений зубных дуг. Элайнеротерапия (активный этап)",
		complaint: "Плановый визит для начала активного этапа элайнеротерапии. Жалоб на острую боль нет.",
		objective:
			"Прикус и смыкание зубных рядов зафиксированы в фотопротоколе. Зубные ряды подготовлены к прямой фиксации аттачментов. Состояние твердых тканей зубов и краевого пародонта удовлетворительное, гигиена полости рта хорошая. Сепарация: проведена щадящая апроксимальная сепарация эмали (IPR) в контактах по утвержденному 3D-сетапу, калибровка щупами подтверждена.",
		treatment:
			"Профессиональная гигиена и очистка поверхностей зубов пастой без фтора. Изоляция операционного поля. Избирательное кислотное протравливание эмали 37% ортофосфорной кислотой (30 сек), смывание водой, бережное высушивание. Внесение светоотверждаемой адгезивной системы, фотополимеризация. Прямая фиксация композитных аттачментов по индивидуальному шаблону светоотверждаемым микрогибридным композитом повышенной прочности. Полимеризация каждого зуба по 20 сек. Шаблон снят, остатки композита удалены финирами и полировочными головками. Проведена апроксимальная сепарация эмали (IPR). Припасован первый сет элайнеров (Шаг 1): посадка прецизионная, ретенция надежная, дефектов окклюзии нет. Элайнеры шаги 1–5 выданы пациенту на руки.",
		recommendations:
			"Элайнеры шаги 1–5 выданы, аттачменты фиксированы, сепарация выполнена. Режим ношения: строго не менее 22 часов в сутки (снимать только во время приёма пищи и чистки зубов). Смена шагов каждые 10–14 дней. Использование чувисов при надевании по 5–10 минут 3 раза в день. Хранение в защитном антибактериальном боксе, очистка мягкой щеткой и прохладной водой. Следующий контрольный осмотр: через 6–8 недель перед переходом на шаг 6.",
	},
	{
		id: "aligner_tracking_check",
		label: "Контрольный осмотр на элайнерах (трекинг идеальный, переход на следующий шаг)",
		shortLabel: "Контроль элайнеров (трекинг)",
		suggestedStage: "active_monitoring",
		diagnosisRu: "К07.2 Аномалии соотношений зубных дуг. Элайнеротерапия (мониторинг)",
		complaint:
			"Пациент жалоб не предъявляет. Отмечает комфортную адаптацию к аппаратуре и строгое соблюдение режима ношения (22 часа в сутки).",
		objective:
			"Контрольный осмотр на этапе ношения элайнеров. Композитные аттачменты на верхней и нижней челюстях визуально и инструментально интактны: сколов, дефектов фиксации и отклеек не выявлено. Трекинг перемещения зубов идеальный, полное соответствие утвержденному 3D-сетапу. Зазоры и щели между краем каппы и режущими краями зубов отсутствуют. Слизистая оболочка полости рта бледно-розовая, без признаков воспаления и натертостей.",
		treatment:
			"Контрольный осмотр окклюзии и плотности прилегания текущего шага капп. Проверка межзубных контактов флоссом. Очистка и антисептическая обработка полости рта. Одобрен переход на следующий плановый шаг элайнеров. Выдан следующий комплект капп.",
		recommendations:
			"Контрольный осмотр на элайнерах: трекинг идеальный, переход на следующий шаг разрешен. Продолжать ношение 22 ч/сутки с обязательным использованием чувисов при каждой смене капп. Соблюдать график смены элайнеров. Следующий контрольный визит через 4–6 недель.",
	},
	{
		id: "braces_niti_powerchain_activation",
		label: "Активация брекет-системы (замена дуги NiTi, эластические цепочки)",
		shortLabel: "Активация брекетов (NiTi + цепочка)",
		suggestedStage: "active_monitoring",
		diagnosisRu: "К07.3 Аномалии положения отдельных зубов. Брекет-система (активация)",
		complaint:
			"Плановый визит по графику ортодонтического лечения. Жалоб на острую боль и отклейку брекетов нет. Все элементы аппаратуры сохранны.",
		objective:
			"Вестибулярная несъемная брекет-система на верхней и нижней челюстях. Замки и брекеты стабильно фиксированы, подвижности элементов нет. Динамика нивелирования положительная, смыкание стабильно. Гигиена полости рта удовлетворительная.",
		treatment:
			"Сняты старые дуги и эластические лигатуры. Очистка и антисептическая обработка пазов брекетов (0.05% раствор хлоргексидина). Установка новых нивелирующих дуг NiTi: верхняя челюсть .016x.022\", нижняя челюсть .016\". Установлена эластическая цепочка Power Chain во фронтальном сегменте для консолидации зубного ряда и закрытия промежутков. Замки закрыты с контролем фиксации, дистальные концы дуг загнуты и зашлифованы, травма мягких тканей исключена.",
		recommendations:
			"Активация брекет-системы выполнена: замена дуги NiTi и установка эластической цепочки завершены. Тщательная гигиена (ортодонтическая щетка, ершики, ирригатор). Использование защитного воска при натирании. Исключить твердую и липкую пищу. Следующая активация через 4–5 недель.",
	},
];

export function generateOrthodonticDiaryNote(
	preset: OrthodonticClinicalPreset,
	session: OrthodonticPhotoSession,
	dateStr?: string,
): string {
	const effectiveDate = dateStr || new Date().toLocaleDateString("ru-RU");
	const rightMolar = ANGLE_CLASS_LABELS_RU[session.findings.angleClassMolarRight] || "I класс";
	const leftMolar = ANGLE_CLASS_LABELS_RU[session.findings.angleClassMolarLeft] || "I класс";
	const overjet = session.findings.overjetMm ? `${session.findings.overjetMm} мм` : "норма";
	const overbite = session.findings.overbiteMm ? `${session.findings.overbiteMm} мм` : "норма";
	const smileArc = SMILE_ARC_LABELS_RU[session.findings.smileArc] || "консонантная";

	return `ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)
Дата приёма: ${effectiveDate}
Пациент: ${session.patientName || "Пациент"}
Врач: ${session.doctorName || "Врач-ортодонт"}
Диагноз: ${preset.diagnosisRu}

1. ЖАЛОБЫ:
${preset.complaint}

2. ОБЪЕКТИВНЫЙ СТАТУС:
${preset.objective}
• Окклюзионные параметры: моляры справа — ${rightMolar}, слева — ${leftMolar}. Сагиттальная щель: ${overjet}, резцовое перекрытие: ${overbite}. Дуга улыбки: ${smileArc}.
• Фотопротокол: зафиксирован в 8 стандартных проекциях по Приказу Минздрава РФ № 834н.

3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ:
${preset.treatment}

4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:
${preset.recommendations}`;
}

export interface OrthodonticPhotoProtocolModalProps {
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

export const OrthodonticPhotoProtocolModal: React.FC<OrthodonticPhotoProtocolModalProps> = ({
	isOpen,
	onClose,
	patientId = "",
	patientName: propPatientName,
	doctorName: propDoctorName,
	clinicName: propClinicName,
	initialSession,
	treatmentPlanId,
	treatmentPlanStageId,
	treatmentStageTitle = "Этап 1: Нивелирование и выравнивание зубных рядов",
	onSaveSession,
	onInsertProtocol043,
}) => {
	const patientName = (propPatientName && propPatientName.trim()) || "Пациент";
	const doctorName = (propDoctorName && propDoctorName.trim()) || "Лечащий врач-ортодонт";
	const clinicName = (propClinicName && propClinicName.trim()) || "Стоматологическая клиника";

	// Initialize session
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

	// Global UI states
	const [globalGuidelinesEnabled, setGlobalGuidelinesEnabled] = useState<boolean>(true);
	const [showFindingsAccordion, setShowFindingsAccordion] = useState<boolean>(true);
	const [selectedSlotForZoom, setSelectedSlotForZoom] = useState<OrthodonticAngleId | null>(null);
	const [dragOverSlotId, setDragOverSlotId] = useState<OrthodonticAngleId | null>(null);
	const [activeCategoryFilter, setActiveCategoryFilter] = useState<"all" | "extraoral" | "intraoral">("all");

	// 1-Click Clinical Presets & 043 Diary State (Mandates 8e, 8k)
	const [activePreset, setActivePreset] = useState<OrthodonticClinicalPreset | null>(
		ORTHODONTIC_CLINICAL_PRESETS[0] ?? null,
	);
	const [insertProtocolOnSave, setInsertProtocolOnSave] = useState<boolean>(true);
	const [showPresetPreview, setShowPresetPreview] = useState<boolean>(false);
	// Active popover menu for photo slot card (Mandate 8d Item 3 / Miller's Law)
	const [openMenuSlotId, setOpenMenuSlotId] = useState<OrthodonticAngleId | null>(null);

	// Close slot popover menu on global click outside or Escape
	useEffect(() => {
		if (!openMenuSlotId) return;
		const handleClickOutside = () => {
			setOpenMenuSlotId(null);
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOpenMenuSlotId(null);
			}
		};
		window.addEventListener("click", handleClickOutside);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("click", handleClickOutside);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [openMenuSlotId]);

	// File input ref for uploading
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentUploadingAngleRef = useRef<OrthodonticAngleId | null>(null);

	// Sync initialSession or prop updates when modal opens
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

	// Completeness metrics
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

	// Select clinical preset in 1 click
	const handleSelectPreset = useCallback((preset: OrthodonticClinicalPreset) => {
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
		showToast(`Выбран пресет: ${preset.shortLabel}`, "info");
	}, [session.stage, session.findings.clinicalDiagnosisRu, handleStageChange]);

	// 1-Click Insert Structured Protocol into Form 043/u (Mandates 8e, 8k)
	const handleInsertProtocol043 = useCallback(
		(presetToApply?: OrthodonticClinicalPreset) => {
			const targetPreset = presetToApply || activePreset || ORTHODONTIC_CLINICAL_PRESETS[0]!;
			if (!targetPreset) return;
			const fullProtocolText = generateOrthodonticDiaryNote(targetPreset, session);

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

				// Reactive event for live SOAP note editors
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
				showToast("Протокол ортодонтии успешно внесен в дневник 043/у", "success");
			} catch (_err) {
				if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
					navigator.clipboard.writeText(fullProtocolText).catch(() => {});
				}
				showToast("Протокол скопирован в буфер обмена", "info");
			}
		},
		[activePreset, session, onInsertProtocol043],
	);

	// Fast copy to clipboard
	const handleCopyProtocolToClipboard = useCallback(() => {
		const targetPreset = activePreset || ORTHODONTIC_CLINICAL_PRESETS[0]!;
		if (!targetPreset) return;
		const fullProtocolText = generateOrthodonticDiaryNote(targetPreset, session);
		if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(fullProtocolText).then(() => {
				showToast("Протокол ортодонтии скопирован в буфер обмена", "success");
			}).catch(() => {
				showToast("Не удалось скопировать", "error");
			});
		}
	}, [activePreset, session]);

	// Handle file upload
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

	// Update clinical findings
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

	// 1-Click Export to Printable Presentation HTML / PDF (no artificial delays)
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

	const handleSave = () => {
		if (insertProtocolOnSave) {
			handleInsertProtocol043();
		}
		if (onSaveSession) {
			onSaveSession(session);
		}
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
				data-testid="orthodontic-photo-protocol-modal"
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
							<h2 className="ortho-header-title">Ортодонтический фотопротокол (8 ракурсов)</h2>
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
							className="ortho-tool-btn ortho-export-btn min-h-[44px] px-3.5 py-2 inline-flex items-center gap-2"
							title="Сформировать презентацию и распечатать в PDF"
							data-testid="export-ortho-pdf-btn"
						>
							<Printer size={15} />
							<span>Печать / PDF</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="ortho-slot-btn min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center"
							aria-label="Закрыть модальное окно"
							data-testid="close-ortho-modal-btn"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* 2. Toolbar & Stage Switcher (Mandate 8d/8p: 1 row, desktop 32-36px, mobile touch target >= 44px) */}
				<div className="ortho-modal-toolbar min-h-[44px] sm:min-h-[36px] sm:h-9 py-1 px-4 flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap shrink-0 flex-nowrap">
					{/* Stage buttons */}
					<div className="ortho-stage-selector" role="group" aria-label="Этап фотопротокола">
						<button
							type="button"
							onClick={() => handleStageChange("pre_treatment")}
							className={`ortho-stage-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-1.5 ${session.stage === "pre_treatment" ? "active-stage-pre" : ""}`}
							data-testid="stage-pre-btn"
						>
							<span>До лечения</span>
						</button>
						<button
							type="button"
							onClick={() => handleStageChange("active_monitoring")}
							className={`ortho-stage-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-1.5 ${session.stage === "active_monitoring" ? "active-stage-active" : ""}`}
							data-testid="stage-active-btn"
						>
							<span>Контроль</span>
						</button>
						<button
							type="button"
							onClick={() => handleStageChange("post_treatment")}
							className={`ortho-stage-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-1.5 ${session.stage === "post_treatment" ? "active-stage-post" : ""}`}
							data-testid="stage-post-btn"
						>
							<span>После лечения</span>
						</button>
					</div>

					{/* Filter tabs */}
					<div className="ortho-toolbar-tools">
						<div className="flex items-center gap-1 bg-[var(--paper)] p-1 rounded-lg border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setActiveCategoryFilter("all")}
								className={`px-3 py-2 min-h-[44px] sm:min-h-[28px] sm:h-7 sm:py-0.5 text-xs font-semibold rounded inline-flex items-center justify-center ${
									activeCategoryFilter === "all"
										? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Все (8)
							</button>
							<button
								type="button"
								onClick={() => setActiveCategoryFilter("extraoral")}
								className={`px-3 py-2 min-h-[44px] sm:min-h-[28px] sm:h-7 sm:py-0.5 text-xs font-semibold rounded inline-flex items-center justify-center ${
									activeCategoryFilter === "extraoral"
										? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Лицо (3)
							</button>
							<button
								type="button"
								onClick={() => setActiveCategoryFilter("intraoral")}
								className={`px-3 py-2 min-h-[44px] sm:min-h-[28px] sm:h-7 sm:py-0.5 text-xs font-semibold rounded inline-flex items-center justify-center ${
									activeCategoryFilter === "intraoral"
										? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Зубы (5)
							</button>
						</div>

						{/* Guidelines toggle */}
						<button
							type="button"
							onClick={() => setGlobalGuidelinesEnabled(!globalGuidelinesEnabled)}
							className={`ortho-tool-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-2 ${globalGuidelinesEnabled ? "active" : ""}`}
							title="Показать/скрыть сетку наложения (центральная линия и окклюзия)"
							data-testid="toggle-guidelines-btn"
						>
							<Grid size={15} />
							<span>Сетка наложения</span>
						</button>
					</div>
				</div>

				{/* 3. Modal Body */}
				<div className="ortho-modal-body">
					{/* Plan ribbon & Completeness Progress */}
					<div className="ortho-plan-ribbon">
						<div className="ortho-plan-info">
							<span className="ortho-plan-badge">{currentStageMeta.shortLabelRu}</span>
							<span className="font-semibold text-xs text-[var(--ink)]">
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
							{completeness.isReadyForConsultation && (
								<span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
									<CheckCircle size={12} />
									<span>Готов</span>
								</span>
							)}
						</div>
					</div>

					{/* 1-Click Clinical Presets Bar (Form 043/u) */}
					<div className="ortho-presets-bar" role="group" aria-label="Готовые клинические пресеты ортодонтии">
						<div className="ortho-presets-label">
							<Sparkles size={14} className="text-amber-500 shrink-0" />
							<span>1-клик пресеты 043/у:</span>
						</div>
						<div className="ortho-presets-list">
							{ORTHODONTIC_CLINICAL_PRESETS.map((preset) => {
								const isSelected = activePreset?.id === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => handleSelectPreset(preset)}
										className={`ortho-preset-pill min-h-[44px] px-3.5 py-2 inline-flex items-center gap-2 ${isSelected ? "active" : ""}`}
										title={preset.label}
										data-testid={`ortho-preset-${preset.id}`}
									>
										<span>{preset.label}</span>
									</button>
								);
							})}
						</div>
						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={() => setShowPresetPreview(!showPresetPreview)}
								className="ortho-preset-preview-toggle min-h-[44px] px-3 py-2 inline-flex items-center gap-1.5"
								title={showPresetPreview ? "Скрыть предпросмотр протокола" : "Показать предпросмотр текста для 043/у"}
								data-testid="toggle-preset-preview-btn"
							>
								<Eye size={13} />
								<span>{showPresetPreview ? "Скрыть" : "Текст 043/у"}</span>
							</button>
							<button
								type="button"
								onClick={handleCopyProtocolToClipboard}
								className="ortho-preset-copy-btn min-h-[44px] px-3 py-2 inline-flex items-center gap-1.5"
								title="Скопировать структурированный протокол в буфер обмена"
								data-testid="copy-ortho-protocol-btn"
							>
								<Copy size={13} />
								<span>Копировать</span>
							</button>
						</div>
					</div>

					{/* Optional Collapsible Preset Preview */}
					{showPresetPreview && activePreset && (
						<div className="ortho-preset-preview-box" data-testid="ortho-preset-preview-box">
							<div className="ortho-preset-preview-header">
								<span className="font-semibold text-xs text-[var(--ink)]">
									Предпросмотр структурированного протокола для Формы 043/у ({activePreset.shortLabel}):
								</span>
								<span className="text-[11px] text-[var(--muted)]">Автозаполнение • Без ручного набора</span>
							</div>
							<pre className="ortho-preset-preview-text">
								{generateOrthodonticDiaryNote(activePreset, session)}
							</pre>
						</div>
					)}

					{/* 8-Slot Grid */}
					<div className="ortho-8-grid">
						{filteredAngles.map((angle) => {
							const slot = session.slots[angle.id];
							const hasPhoto = Boolean(slot && slot.imageUrl);
							const isDragOver = dragOverSlotId === angle.id;
							const showGuides = globalGuidelinesEnabled && (slot?.guidelineOverlayEnabled ?? true);

							return (
								<div
									key={angle.id}
									className={`ortho-slot-card ${hasPhoto ? "has-photo" : ""} ${isDragOver ? "drag-over" : ""} ${
										openMenuSlotId === angle.id ? "!overflow-visible z-20" : ""
									}`}
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
													loading="lazy"
													decoding="async"
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

												{/* Clinical Guidelines Overlay */}
												{showGuides && (
													<div className="ortho-guide-overlay">
														{/* Vertical Facial/Dental Midline */}
														<div className="ortho-guide-midline" />
														{/* Horizontal Occlusal Plane */}
														<div className="ortho-guide-occlusal" />
														{/* Thirds guide */}
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

									{/* Slot Controls Bar — Miller's Law: 1-2 buttons max, desktop density (28px) */}
									<div className="ortho-slot-controls flex items-center justify-between gap-1.5 px-3 py-1.5 min-h-[38px] relative">
										<button
											type="button"
											onClick={() => triggerUploadForAngle(angle.id)}
											className="ortho-slot-btn h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-all cursor-pointer shrink-0"
											title={hasPhoto ? "Заменить снимок" : "Загрузить снимок"}
											data-testid={`upload-btn-${angle.id}`}
										>
											<UploadCloud size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
											<span>{hasPhoto ? "Заменить" : "Загрузить"}</span>
										</button>

										{hasPhoto ? (
											<div className="relative">
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														setOpenMenuSlotId((prev) => (prev === angle.id ? null : angle.id));
													}}
													className={`ortho-slot-btn w-7 h-7 inline-flex items-center justify-center rounded-md border transition-all cursor-pointer ${
														openMenuSlotId === angle.id
															? "border-[var(--teal,#0d9488)] bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)]"
															: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:border-[var(--teal,#0d9488)]"
													}`}
													title="Действия со снимком"
													aria-label="Действия со снимком"
													aria-expanded={openMenuSlotId === angle.id}
													data-testid={`slot-menu-btn-${angle.id}`}
												>
													<MoreVertical size={14} />
												</button>

												{openMenuSlotId === angle.id && (
													<div
														className="absolute right-0 bottom-full mb-1.5 z-40 w-52 p-1 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
														role="menu"
														onClick={(e) => e.stopPropagation()}
													>
														<button
															type="button"
															onClick={(e) => handleRotateSlot(angle.id, e)}
															className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
															role="menuitem"
															title="Повернуть на 90°"
														>
															<RotateCw size={13} className="text-[var(--muted,#64748b)] shrink-0" />
															<span className="flex-1">Повернуть на 90°</span>
															{slot?.rotationDegrees ? (
																<span className="text-[10px] text-[var(--muted,#64748b)] font-mono">
																	{slot.rotationDegrees}°
																</span>
															) : null}
														</button>

														<button
															type="button"
															onClick={(e) => handleFlipHorizontal(angle.id, e)}
															className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
																slot?.flipHorizontal
																	? "bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)]"
																	: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)]"
															}`}
															role="menuitem"
															title="Отразить по горизонтали"
														>
															<FlipHorizontal size={13} className="text-[var(--muted,#64748b)] shrink-0" />
															<span className="flex-1">Отразить по горизонтали</span>
															{slot?.flipHorizontal ? (
																<span className="text-[10px] font-bold text-[var(--teal,#0d9488)]">Вкл</span>
															) : null}
														</button>

														<button
															type="button"
															onClick={(e) => handleZoomChange(angle.id, 0.2, e)}
															className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
															role="menuitem"
															title="Увеличить (+20%)"
														>
															<ZoomIn size={13} className="text-[var(--muted,#64748b)] shrink-0" />
															<span className="flex-1">Увеличить (+20%)</span>
															<span className="text-[10px] text-[var(--muted,#64748b)] font-mono">
																{Math.round((slot?.zoom || 1) * 100)}%
															</span>
														</button>

														<button
															type="button"
															onClick={(e) => handleZoomChange(angle.id, -0.2, e)}
															className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
															role="menuitem"
															title="Уменьшить (-20%)"
														>
															<ZoomOut size={13} className="text-[var(--muted,#64748b)] shrink-0" />
															<span className="flex-1">Уменьшить (-20%)</span>
														</button>

														<div className="my-1 border-t border-[var(--line,#e2e8f0)]" />

														<button
															type="button"
															onClick={(e) => {
																setOpenMenuSlotId(null);
																handleDeletePhoto(angle.id, e);
															}}
															className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2 cursor-pointer"
															role="menuitem"
															title="Удалить снимок"
															data-testid={`delete-btn-${angle.id}`}
														>
															<Trash2 size={13} className="text-rose-500 shrink-0" />
															<span>Удалить снимок</span>
														</button>
													</div>
												)}
											</div>
										) : (
											<span
												className="text-[10px] text-[var(--muted,#64748b)] truncate max-w-[140px]"
												title={angle.requiredEquipmentRu}
											>
												{angle.requiredEquipmentRu.slice(0, 24)}...
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>

					{/* 4. Clinical Findings & Diagnostic Parameters */}
					<div className="ortho-findings-section">
						<div
							className="ortho-findings-header"
							onClick={() => setShowFindingsAccordion(!showFindingsAccordion)}
						>
							<div className="ortho-findings-title">
								<Sliders size={16} className="text-[var(--teal)]" />
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
											<span className="text-xs text-[var(--muted)]">мм</span>
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
											<span className="text-xs text-[var(--muted)]">мм</span>
										</div>
									</div>
								</div>

								{/* Smile Arc */}
								<div className="ortho-field-group">
									<label className="ortho-field-label">Дуга улыбки (Smile Arc)</label>
									<select
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
											<span className="text-xs text-[var(--muted)]">мм</span>
										</div>
									</div>
								</div>

								{/* Clinical Diagnosis & Plan */}
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

				{/* 5. Modal Footer */}
				<footer className="ortho-modal-footer">
					<div className="ortho-footer-left">
						<label className="ortho-insert-checkbox-label min-h-[44px] inline-flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={insertProtocolOnSave}
								onChange={(e) => setInsertProtocolOnSave(e.target.checked)}
								className="ortho-checkbox w-5 h-5 cursor-pointer"
								data-testid="insert-protocol-on-save-checkbox"
							/>
							<span>Вносить в дневник 043/у при сохранении</span>
						</label>
						<span className="ortho-footer-ref-hint">Приказ МЗ РФ № 834н</span>
					</div>

					<div className="flex items-center gap-2.5 flex-wrap">
						<button
							type="button"
							onClick={() => handleInsertProtocol043()}
							className="ortho-btn-insert-043 min-h-[44px] px-4 py-2.5 inline-flex items-center gap-2"
							title="Вставить структурированный протокол ортодонтии в дневник Формы 043/у"
							data-testid="insert-ortho-protocol-043-btn"
						>
							<FileText size={16} />
							<span>Вставить протокол ортодонтии в дневник 043/у</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="ortho-btn-secondary min-h-[44px] px-4 py-2.5 inline-flex items-center justify-center"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="ortho-btn-primary min-h-[44px] px-4 py-2.5 inline-flex items-center gap-2"
							data-testid="save-ortho-protocol-btn"
						>
							<CheckCircle size={16} />
							<span>Сохранить фотопротокол</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

// Type & Constant Aliases for Orthodontics module backwards-compatibility
export type OrthoClinicalPreset = OrthodonticClinicalPreset;
export type OrthoPhotoProtocolModalProps = OrthodonticPhotoProtocolModalProps;
export const ORTHO_CLINICAL_PRESETS = ORTHODONTIC_CLINICAL_PRESETS;
export const generateOrthoDiaryText = generateOrthodonticDiaryNote;
export const OrthoPhotoProtocolModal = OrthodonticPhotoProtocolModal;
export default OrthodonticPhotoProtocolModal;

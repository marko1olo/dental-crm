import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
	CheckCircle,
	X,
	Grid,
	Eye,
	Printer,
	Copy,
} from "lucide-react";
import { BracesBracket, AlignerTray, DentalForm043 } from "../icons/DentalIcons";
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
if (typeof document !== "undefined") {
	import("./photoProtocol.css");
}

import {
	type OrthodonticClinicalPreset,
	ORTHODONTIC_CLINICAL_PRESETS,
	generateOrthodonticDiaryNote,
} from "./orthodonticPresets";
import { OrthoFindingsAccordion } from "./OrthoFindingsAccordion";
import { OrthoPhotoSlotCard } from "./OrthoPhotoSlotCard";

export * from "./orthodonticPresets";
export * from "./OrthoFindingsAccordion";
export * from "./OrthoPhotoSlotCard";

export interface OrthodonticPhotoProtocolModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | undefined;
	patientName?: string | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
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
				showToast("Протокол ортодонтии успешно внесен в дневник приёма", "success");
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
							<BracesBracket size={20} />
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
							<AlignerTray size={14} className="text-amber-500 shrink-0" />
							<span>1-клик пресеты протоколов:</span>
						</div>
						<div className="ortho-presets-list">
							{ORTHODONTIC_CLINICAL_PRESETS.map((preset) => {
								const isSelected = activePreset?.id === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => handleSelectPreset(preset)}
										className={`ortho-preset-pill min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3.5 py-2 inline-flex items-center gap-2 ${isSelected ? "active" : ""}`}
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
								className="ortho-preset-preview-toggle min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3 py-2 inline-flex items-center gap-1.5"
								title={showPresetPreview ? "Скрыть предпросмотр протокола" : "Показать предпросмотр текста протокола"}
								data-testid="toggle-preset-preview-btn"
							>
								<Eye size={13} />
								<span>{showPresetPreview ? "Скрыть" : "Текст протокола"}</span>
							</button>
							<button
								type="button"
								onClick={handleCopyProtocolToClipboard}
								className="ortho-preset-copy-btn min-h-[44px] sm:min-h-[32px] sm:h-8 sm:py-1 px-3 py-2 inline-flex items-center gap-1.5"
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
									Предпросмотр структурированного протокола ({activePreset.shortLabel}):
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
							const isDragOver = dragOverSlotId === angle.id;

							return (
								<OrthoPhotoSlotCard
									key={angle.id}
									angle={angle}
									slot={slot}
									globalGuidelinesEnabled={globalGuidelinesEnabled}
									isDragOver={isDragOver}
									isMenuOpen={openMenuSlotId === angle.id}
									onToggleMenu={() =>
										setOpenMenuSlotId((prev) => (prev === angle.id ? null : angle.id))
									}
									onDragOver={(e) => handleDragOver(e, angle.id)}
									onDragLeave={handleDragLeave}
									onDrop={(e) => handleDrop(e, angle.id)}
									onTriggerUpload={() => triggerUploadForAngle(angle.id)}
									onRotate={(e) => handleRotateSlot(angle.id, e)}
									onFlipHorizontal={(e) => handleFlipHorizontal(angle.id, e)}
									onZoomChange={(delta, e) => handleZoomChange(angle.id, delta, e)}
									onDelete={(e) => {
										setOpenMenuSlotId(null);
										handleDeletePhoto(angle.id, e);
									}}
								/>
							);
						})}
					</div>

					{/* 4. Clinical Findings & Diagnostic Parameters */}
					<OrthoFindingsAccordion
						session={session}
						showFindingsAccordion={showFindingsAccordion}
						onToggleAccordion={() => setShowFindingsAccordion((prev) => !prev)}
						onFindingsChange={(field, value) => handleFindingsChange(field as any, value as any)}
					/>
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
							<span>Вносить в дневник приёма при сохранении</span>
						</label>
						<span className="ortho-footer-ref-hint">Клинический протокол</span>
					</div>

					<div className="flex items-center gap-2.5 flex-wrap">
						<button
							type="button"
							onClick={() => handleInsertProtocol043()}
							className="ortho-btn-insert-043 min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 py-2.5 sm:py-1.5 inline-flex items-center gap-2"
							title="Вставить структурированный протокол ортодонтии в дневник приёма"
							data-testid="insert-ortho-protocol-043-btn"
						>
							<DentalForm043 size={16} />
							<span>Вставить протокол ортодонтии в дневник</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="ortho-btn-secondary min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 py-2.5 sm:py-1.5 inline-flex items-center justify-center"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="ortho-btn-primary min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 py-2.5 sm:py-1.5 inline-flex items-center gap-2"
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

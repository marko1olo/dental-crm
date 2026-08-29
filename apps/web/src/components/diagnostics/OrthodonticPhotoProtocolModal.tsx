import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
	Camera,
	CheckCircle,
	X,
	Grid,
	FileText,
	RotateCw,
	FlipHorizontal,
	FlipVertical,
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
	Maximize2,
	AlertCircle,
} from "lucide-react";
import {
	ORTHODONTIC_8_ANGLES,
	ORTHODONTIC_ANGLES_MAP,
	ORTHODONTIC_STAGE_METADATA,
	ANGLE_CLASS_LABELS_RU,
	SMILE_ARC_LABELS_RU,
	MIDLINE_SHIFT_LABELS_RU,
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
	type OrthodonticPhotoSlotRecord,
} from "@dental/shared";
import "./photoProtocol.css";

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
}

export const OrthodonticPhotoProtocolModal: React.FC<OrthodonticPhotoProtocolModalProps> = ({
	isOpen,
	onClose,
	patientId = "pat-ortho-001",
	patientName = "Смирнова Екатерина Васильевна",
	doctorName = "Д-р Смирнов Алексей Петрович",
	clinicName = "ООО «Денте Стоматология»",
	initialSession,
	treatmentPlanId,
	treatmentPlanStageId,
	treatmentStageTitle = "Этап 1: Нивелирование и выравнивание зубных рядов",
	onSaveSession,
}) => {
	// Initialize session
	const [session, setSession] = useState<OrthodonticPhotoSession>(() => {
		if (initialSession) return initialSession;
		return createEmptyOrthodonticSession({
			patientId,
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

	// File input ref for uploading
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentUploadingAngleRef = useRef<OrthodonticAngleId | null>(null);

	// Sync initialSession updates
	useEffect(() => {
		if (initialSession) {
			setSession(initialSession);
		}
	}, [initialSession]);

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

	// 1-Click Export to Printable Presentation HTML / PDF
	const handleExportPresentation = () => {
		const htmlContent = renderOrthodonticPresentationHtml(session);
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(htmlContent);
			printWindow.document.close();
			// Auto print after small timeout for asset load
			setTimeout(() => {
				printWindow.print();
			}, 350);
		}
	};

	const handleSave = () => {
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
								<span>Пациент: <strong>{session.patientName}</strong></span>
								<span>•</span>
								<span>Врач: {session.doctorName}</span>
								<span>•</span>
								<span>{clinicName}</span>
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

				{/* 2. Toolbar & Stage Switcher */}
				<div className="ortho-modal-toolbar">
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

					{/* Filter tabs */}
					<div className="ortho-toolbar-tools">
						<div className="flex items-center gap-1 bg-[var(--paper)] p-1 rounded-lg border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setActiveCategoryFilter("all")}
								className={`px-2.5 py-1 text-xs font-semibold rounded ${
									activeCategoryFilter === "all"
										? "bg-[var(--teal)] text-white"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Все (8)
							</button>
							<button
								type="button"
								onClick={() => setActiveCategoryFilter("extraoral")}
								className={`px-2.5 py-1 text-xs font-semibold rounded ${
									activeCategoryFilter === "extraoral"
										? "bg-[var(--teal)] text-white"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Лицо (3)
							</button>
							<button
								type="button"
								onClick={() => setActiveCategoryFilter("intraoral")}
								className={`px-2.5 py-1 text-xs font-semibold rounded ${
									activeCategoryFilter === "intraoral"
										? "bg-[var(--teal)] text-white"
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
							className={`ortho-tool-btn ${globalGuidelinesEnabled ? "active" : ""}`}
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
													title="Отразить по горизонтали"
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
											<span className="text-[10px] text-[var(--muted)] truncate max-w-[150px]">
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
					<div className="text-xs text-[var(--muted)]">
						<span>8 стандартных ортодонтических проекций • Приказ Минздрава РФ № 834н</span>
					</div>

					<div className="flex items-center gap-3">
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

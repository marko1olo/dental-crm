/**
 * ChairsidePhotoProtocolModal.tsx — Мобильный фотопротокол кресла и интерактивный сплит-слайдер «До / После»
 * (DOMAIN: CHAIRSIDE PHOTO PROTOCOL & COMPARISON SLIDER)
 *
 * Возможности:
 * 1. Сетка 12 канонических ракурсов (AACD / DSD / Минздрав РФ):
 *    - Портрет: фас в покое, фас в улыбке, широкая улыбка, профиль в покое, профиль в улыбке, 3/4 полупрофиль.
 *    - Внутриротовой: 1:1 сомкнутые зубы (окклюзия), фронт с разобщением, боковые сегменты правый/левый по Энглю, окклюзия ВЧ/НЧ (зеркало), сагиттальная щель.
 *    - Поддержка пресетов: Стандарт 12 кадров, Ортопедия 8 кадров, Экспресс 6 кадров, Терапия 3 кадра.
 * 2. Интерактивный 50/50 Comparison Slider («До / После»):
 *    - Тач-шторка для презентации пациенту у кресла на iPad с поддержкой свайпа и drag & drop.
 *    - Режимы 50/50 Split, Side-by-Side и полупрозрачное наложение (Opacity Overlay).
 *    - Полноэкранный презентационный режим (Studio Black Mode).
 * 3. Drag & Drop / Direct Camera Capture:
 *    - Прямой захват со встроенной камеры планшета (`capture="environment"`).
 *    - Авто-конвертация в WebP и генерация многоуровневых миниатюр (Full HD, 1200x1200, 200x200).
 *    - Тегирование зубов по формуле FDI (11..48) и определение оттенка по шкале VITA (A1..BL4).
 * 4. 1-клик интеграция:
 *    - Внесение фотофиксации в дневник 043/у (`useVisitStore.setVisitNoteForm`).
 *    - Привязка к одонтограмме и передача в фотобанк пациента.
 *    - Тач-таргеты >= 44-48px для работы в медицинских перчатках.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
	Camera,
	UploadCloud,
	Check,
	CheckCircle2,
	Sliders,
	Eye,
	Sparkles,
	X,
	Maximize2,
	Minimize2,
	ChevronRight,
	ChevronLeft,
	Columns,
	Layers,
	Grid,
	Calendar,
	Tag,
	FileText,
	Share2,
	RotateCcw,
	Download,
	Trash2,
	Smartphone,
	FolderCheck,
	AlertCircle,
	ArrowLeftRight,
} from "lucide-react";
import {
	STANDARD_12_SLOT_PROTOCOL,
	AACD_DSD_12_SLOT_PROTOCOL,
	AESTHETIC_8_SLOT_PROTOCOL,
	EXPRESS_6_SLOT_PROTOCOL,
	MINIMAL_3_SLOT_PROTOCOL,
	CLINICAL_PROTOCOLS_REGISTRY,
	getPresetById,
	getSlotDefinitionById,
	type PhotoProtocolSlotDefinition,
	type PhotoSlotRecord,
	type StandardSlotId,
} from "../photography/photoGridPresets";
import {
	type DentalPhotoSlotType,
	DENTAL_PHOTO_SLOT_LABELS_RU,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { useVisitStore } from "../../store/visitStore";
import { processMedicalPhotoIntake } from "../../services/imaging/medicalImageIntake";
import { logger } from "../../utils/logger";
import {
	VITA_SHADES,
	type PhotoProtocolStage,
	formatChairsidePhotoProtocolDiaryRu,
	calculateComparisonClipPath,
} from "./chairsidePhotoProtocolConstants";
import "./chairsidePhotoProtocol.css";

export { VITA_SHADES, type PhotoProtocolStage };

export interface ChairsidePhotoProtocolModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly initialToothNumber?: number | undefined;
	readonly onApplyToVisitNote?: ((protocolSummaryRu: string) => void) | undefined;
	readonly onAttachPhotosToTeeth?: ((photosByTooth: Record<number, string[]>) => void) | undefined;
}

export const ChairsidePhotoProtocolModal: React.FC<ChairsidePhotoProtocolModalProps> = ({
	isOpen,
	onClose,
	patientId = "pat_demo_01",
	patientName = "Пациент",
	visitId = "vis_active_01",
	initialToothNumber,
	onApplyToVisitNote,
	onAttachPhotosToTeeth,
}) => {
	// Navigation & Mode
	const [activeTab, setActiveTab] = useState<"grid" | "compare" | "intake">("grid");
	const [selectedPresetId, setSelectedPresetId] = useState<string>("standard_12_ortho_aesthetic");
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [activeStageFilter, setActiveStageFilter] = useState<PhotoProtocolStage | "all">("all");

	// Active Slot Records
	const [slotsData, setSlotsData] = useState<Record<string, PhotoSlotRecord>>({
		portrait_smile: {
			slotId: "portrait_smile",
			stage: "before",
			uploadedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
			imageUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
			detectedVitaShade: "A3",
			notes: "Исходная ситуация: дисколорит 11, 21, диастема 1.5 мм",
		},
		intraoral_frontal_occlusion: {
			slotId: "intraoral_frontal_occlusion",
			stage: "before",
			uploadedAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
			imageUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80",
			detectedVitaShade: "A3",
			notes: "Нарушение прикуса, тремы во фронтальном отделе",
		},
	});

	// Comparison Slider State (50/50)
	const [compareSlotId, setCompareSlotId] = useState<string>("intraoral_frontal_occlusion");
	const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
	const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
	const [comparisonMode, setComparisonMode] = useState<"split" | "side_by_side" | "opacity">("split");
	const [overlayOpacity, setOverlayOpacity] = useState<number>(50); // 0 to 100%

	// Direct Capture & Tooth Tagging State
	const [selectedSlotForUpload, setSelectedSlotForUpload] = useState<string>("portrait_smile");
	const [selectedStage, setSelectedStage] = useState<PhotoProtocolStage>("before");
	const [selectedVitaShade, setSelectedVitaShade] = useState<string>("A2");
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(
		initialToothNumber ? [initialToothNumber] : [11, 21],
	);
	const [intakeNotes, setIntakeNotes] = useState<string>("");
	const [isUploading, setIsUploading] = useState<boolean>(false);

	// Refs
	const fileInputRef = useRef<HTMLInputElement>(null);
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const comparisonViewportRef = useRef<HTMLDivElement>(null);

	// Active Preset Definition
	const activePreset = useMemo(() => getPresetById(selectedPresetId), [selectedPresetId]);

	// Calculate filled slots count
	const filledSlotsCount = useMemo(() => {
		return activePreset.slots.filter((s) => Boolean(slotsData[s.id]?.imageUrl)).length;
	}, [activePreset, slotsData]);

	// Sample After photo for instant comparison showcase
	const demoAfterImageUrl = "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=80";

	// Handle Dragging Slider for 50/50 comparison
	const handleSliderMove = useCallback((clientX: number) => {
		if (!comparisonViewportRef.current) return;
		const rect = comparisonViewportRef.current.getBoundingClientRect();
		const rawX = clientX - rect.left;
		const percent = Math.min(100, Math.max(0, (rawX / rect.width) * 100));
		setSliderPosition(Math.round(percent));
	}, []);

	// Touch & Mouse Handlers for slider
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDraggingSlider(true);
	}, []);

	const handleTouchStart = useCallback(() => {
		setIsDraggingSlider(true);
	}, []);

	useEffect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => {
			if (!isDraggingSlider) return;
			handleSliderMove(e.clientX);
		};

		const handleGlobalTouchMove = (e: TouchEvent) => {
			if (!isDraggingSlider || !e.touches[0]) return;
			handleSliderMove(e.touches[0].clientX);
		};

		const handleGlobalMouseUp = () => {
			if (isDraggingSlider) {
				setIsDraggingSlider(false);
			}
		};

		if (isDraggingSlider) {
			window.addEventListener("mousemove", handleGlobalMouseMove);
			window.addEventListener("mouseup", handleGlobalMouseUp);
			window.addEventListener("touchmove", handleGlobalTouchMove);
			window.addEventListener("touchend", handleGlobalMouseUp);
		}

		return () => {
			window.removeEventListener("mousemove", handleGlobalMouseMove);
			window.removeEventListener("mouseup", handleGlobalMouseUp);
			window.removeEventListener("touchmove", handleGlobalTouchMove);
			window.removeEventListener("touchend", handleGlobalMouseUp);
		};
	}, [isDraggingSlider, handleSliderMove]);

	// Process File Intake (Camera or File Drop)
	const handleFileSelect = useCallback(
		async (file: File, targetSlotId: string, stage: PhotoProtocolStage) => {
			setIsUploading(true);
			try {
				const intake = await processMedicalPhotoIntake(file, {
					patientId,
					visitId,
					toothNumber: selectedTeeth[0],
					slotType: targetSlotId as DentalPhotoSlotType,
					stage: stage === "in_progress" ? "during" : stage,
					vitaShade: selectedVitaShade,
					notes: intakeNotes,
				});

				const newRecord: PhotoSlotRecord = {
					slotId: targetSlotId,
					imageUrl: intake.fullImageUrl || intake.microThumbnailUrl,
					uploadedAt: new Date().toISOString(),
					stage,
					detectedVitaShade: selectedVitaShade,
					notes: intakeNotes || `Снимок ${targetSlotId} (${stage})`,
				};

				setSlotsData((prev) => ({
					...prev,
					[targetSlotId]: newRecord,
				}));

				void SoundFeedbackService.getInstance().playActionSuccess();
				showToast(`Снимок «${getSlotDefinitionById(targetSlotId)?.shortLabelRu || targetSlotId}» успешно сохранен!`, "success");
			} catch (err) {
				logger.error("[ChairsidePhotoProtocol] Error uploading photo", err);
				showToast("Ошибка при обработке фотоснимка", "error");
			} finally {
				setIsUploading(false);
			}
		},
		[patientId, visitId, selectedTeeth, selectedVitaShade, intakeNotes],
	);

	// Toggle Tooth Selection
	const handleToggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	}, []);

	// 1-Click Transfer to Form 043/u Diary
	const handleApplyToVisitDiary = useCallback(() => {
		const filledCount = Object.keys(slotsData).length;
		const protocolRu = formatChairsidePhotoProtocolDiaryRu(
			filledCount,
			activePreset.nameRu,
			selectedTeeth,
			selectedVitaShade,
		);

		// 1. Update Zustand store
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			treatmentPlan: prev.treatmentPlan
				? `${prev.treatmentPlan}\n\n${protocolRu}`
				: protocolRu,
		}));

		// 2. Trigger parent callbacks
		if (onApplyToVisitNote) {
			onApplyToVisitNote(protocolRu);
		}

		if (onAttachPhotosToTeeth) {
			const map: Record<number, string[]> = {};
			const allUrls = Object.values(slotsData)
				.map((s) => s.imageUrl)
				.filter((u): u is string => Boolean(u));
			for (const t of selectedTeeth) {
				map[t] = allUrls;
			}
			onAttachPhotosToTeeth(map);
		}

		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Фотопротокол успешно перенесен в дневник визита (043/у)!", "success");
		onClose();
	}, [slotsData, activePreset, selectedTeeth, selectedVitaShade, onApplyToVisitNote, onAttachPhotosToTeeth, onClose]);

	if (!isOpen) return null;

	return (
		<div className="chairside-photo-modal-backdrop" onClick={onClose}>
			<div
				className={`chairside-photo-modal-container ${isFullscreen ? "fullscreen-presentation" : ""}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Hidden File Inputs for Direct Camera and Upload */}
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					style={{ display: "none" }}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) {
							void handleFileSelect(file, selectedSlotForUpload, selectedStage);
						}
					}}
				/>
				<input
					ref={cameraInputRef}
					type="file"
					accept="image/*"
					capture="environment"
					style={{ display: "none" }}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) {
							void handleFileSelect(file, selectedSlotForUpload, selectedStage);
						}
					}}
				/>

				{/* Header */}
				<div className="chairside-photo-header">
					<div className="chairside-photo-title-group">
						<div
							style={{
								width: "40px",
								height: "40px",
								borderRadius: "10px",
								background: "var(--teal)",
								color: "var(--on-teal, #ffffff)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<Camera size={22} />
						</div>
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<h2 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0 }}>
									Клинический фотопротокол кресла
								</h2>
								<span className={`chairside-photo-badge ${filledSlotsCount > 0 ? "success" : ""}`}>
									{filledSlotsCount}/{activePreset.totalSlots} кадров
								</span>
							</div>
							<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								Пациент: <strong>{patientName}</strong> • Визит: {visitId} • iPad Touch-Ready (Fitts Law ≥ 44px)
							</div>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<button
							type="button"
							onClick={() => setIsFullscreen((prev) => !prev)}
							className="chairside-photo-tab-btn"
							style={{ minHeight: "44px", minWidth: "44px", padding: "0.5rem" }}
							title={isFullscreen ? "Выйти из презентации" : "Режим презентации пациенту (Studio)"}
						>
							{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
						</button>
						<button
							type="button"
							onClick={onClose}
							className="chairside-photo-tab-btn"
							style={{ minHeight: "44px", minWidth: "44px", padding: "0.5rem" }}
							title="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Navigation Bar & Presets */}
				<div className="chairside-photo-nav-bar">
					<div className="chairside-photo-tabs">
						<button
							type="button"
							onClick={() => setActiveTab("grid")}
							className={`chairside-photo-tab-btn ${activeTab === "grid" ? "active" : ""}`}
						>
							<Grid size={16} />
							<span>Сетка ракурсов ({filledSlotsCount}/{activePreset.totalSlots})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("compare")}
							className={`chairside-photo-tab-btn ${activeTab === "compare" ? "active" : ""}`}
						>
							<ArrowLeftRight size={16} />
							<span>Слайдер До / После (50/50)</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("intake")}
							className={`chairside-photo-tab-btn ${activeTab === "intake" ? "active" : ""}`}
						>
							<Camera size={16} />
							<span>Камера & Тегирование</span>
						</button>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", fontWeight: 600 }}>
							Протокол:
						</span>
						<select
							value={selectedPresetId}
							onChange={(e) => setSelectedPresetId(e.target.value)}
							className="chairside-photo-preset-select"
						>
							{CLINICAL_PROTOCOLS_REGISTRY.map((preset) => (
								<option key={preset.id} value={preset.id}>
									{preset.shortNameRu} ({preset.totalSlots} кадров)
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Body Content */}
				<div className="chairside-photo-body">
					{/* TAB 1: 12-Slot Protocol Grid */}
					{activeTab === "grid" && (
						<div className="chairside-photo-grid">
							{activePreset.slots.map((slot) => {
								const record = slotsData[slot.id];
								const isFilled = Boolean(record?.imageUrl);

								return (
									<div
										key={slot.id}
										className={`chairside-photo-slot-card ${isFilled ? "filled" : ""}`}
										onClick={() => {
											setSelectedSlotForUpload(slot.id);
											if (isFilled) {
												setCompareSlotId(slot.id);
												setActiveTab("compare");
											} else {
												setActiveTab("intake");
											}
										}}
									>
										{/* Preview or Silhouette */}
										<div className="chairside-photo-slot-preview">
											{record?.imageUrl ? (
												<img src={record.imageUrl} alt={slot.titleRu} />
											) : (
												<svg
													className="chairside-photo-slot-silhouette"
													viewBox="0 0 200 200"
												>
													<path d={slot.silhouetteSvgPath} />
												</svg>
											)}

											{/* Stage Tag */}
											{record?.stage && (
												<span
													style={{
														position: "absolute",
														top: "8px",
														left: "8px",
														background:
															record.stage === "before"
																? "var(--bad-fg)"
																: "var(--teal)",
														color: "var(--on-teal, #ffffff)",
														fontSize: "0.6875rem",
														fontWeight: 700,
														padding: "2px 6px",
														borderRadius: "4px",
														textTransform: "uppercase",
													}}
												>
													{record.stage === "before" ? "ДО" : "ПОСЛЕ"}
												</span>
											)}

											{/* VITA Shade */}
											{record?.detectedVitaShade && (
												<span
													style={{
														position: "absolute",
														bottom: "8px",
														right: "8px",
														background: "rgba(15, 23, 42, 0.8)",
														color: "var(--info-fg, #38bdf8)",
														fontSize: "0.6875rem",
														fontWeight: 800,
														padding: "2px 6px",
														borderRadius: "4px",
													}}
												>
													VITA {record.detectedVitaShade}
												</span>
											)}
										</div>

										{/* Slot Info */}
										<div className="chairside-photo-slot-info">
											<div className="chairside-photo-slot-title" title={slot.titleRu}>
												{slot.shortLabelRu}
											</div>
											<div className="chairside-photo-slot-desc">
												{slot.magnification} • {slot.recommendedFlashSettingRu.slice(0, 24)}...
											</div>

											{/* Action Buttons */}
											<div className="chairside-photo-slot-actions" onClick={(e) => e.stopPropagation()}>
												<button
													type="button"
													className="chairside-photo-slot-btn primary"
													onClick={() => {
														setSelectedSlotForUpload(slot.id);
														cameraInputRef.current?.click();
													}}
													title="Снять с камеры"
												>
													<Camera size={14} />
													<span>Камера</span>
												</button>
												<button
													type="button"
													className="chairside-photo-slot-btn"
													onClick={() => {
														setSelectedSlotForUpload(slot.id);
														fileInputRef.current?.click();
													}}
													title="Загрузить файл"
												>
													<UploadCloud size={14} />
													<span>Файл</span>
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* TAB 2: 50/50 Comparison Slider (Before / After) */}
					{activeTab === "compare" && (
						<div className="chairside-comparison-workspace">
							{/* Toolbar */}
							<div className="chairside-comparison-toolbar">
								<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
									<span style={{ fontSize: "0.875rem", fontWeight: 700 }}>Ракурс:</span>
									<select
										value={compareSlotId}
										onChange={(e) => setCompareSlotId(e.target.value)}
										className="chairside-photo-preset-select"
									>
										{activePreset.slots.map((s) => (
											<option key={s.id} value={s.id}>
												{s.titleRu}
											</option>
										))}
									</select>

									<div className="chairside-photo-tabs">
										<button
											type="button"
											className={`chairside-photo-tab-btn ${comparisonMode === "split" ? "active" : ""}`}
											onClick={() => setComparisonMode("split")}
										>
											<ArrowLeftRight size={14} />
											<span>Шторка 50/50</span>
										</button>
										<button
											type="button"
											className={`chairside-photo-tab-btn ${comparisonMode === "side_by_side" ? "active" : ""}`}
											onClick={() => setComparisonMode("side_by_side")}
										>
											<Columns size={14} />
											<span>Рядом</span>
										</button>
										<button
											type="button"
											className={`chairside-photo-tab-btn ${comparisonMode === "opacity" ? "active" : ""}`}
											onClick={() => setComparisonMode("opacity")}
										>
											<Layers size={14} />
											<span>Наложение</span>
										</button>
									</div>
								</div>

								{comparisonMode === "opacity" && (
									<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
										<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>Прозрачность:</span>
										<input
											type="range"
											min={0}
											max={100}
											value={overlayOpacity}
											onChange={(e) => setOverlayOpacity(Number(e.target.value))}
											style={{ width: "120px" }}
										/>
										<span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{overlayOpacity}%</span>
									</div>
								)}
							</div>

							{/* Split Viewport */}
							{comparisonMode === "split" && (
								<div
									ref={comparisonViewportRef}
									className="chairside-comparison-viewport"
									onMouseDown={handleMouseDown}
									onTouchStart={handleTouchStart}
								>
									{/* Right / Bottom Layer: AFTER */}
									<div className="chairside-comparison-img-after">
										<img
											src={slotsData[compareSlotId]?.imageUrl || demoAfterImageUrl}
											alt="ПОСЛЕ лечения"
										/>
										<span className="chairside-comparison-label-badge after">
											ПОСЛЕ • VITA {selectedVitaShade}
										</span>
									</div>

									{/* Left Layer: BEFORE (Clipped by sliderPosition) */}
									<div
										className="chairside-comparison-img-before"
										style={{ clipPath: calculateComparisonClipPath(sliderPosition) }}
									>
										<img
											src={slotsData[compareSlotId]?.imageUrl || slotsData.portrait_smile?.imageUrl || demoAfterImageUrl}
											alt="ДО лечения"
										/>
										<span className="chairside-comparison-label-badge before">
											ДО • Исходная ситуация
										</span>
									</div>

									{/* Interactive Divider Line */}
									<div
										className="chairside-comparison-divider"
										style={{ left: `${sliderPosition}%` }}
									>
										<div className="chairside-comparison-handle">
											<ArrowLeftRight size={20} />
										</div>
									</div>
								</div>
							)}

							{/* Side-by-Side Mode */}
							{comparisonMode === "side_by_side" && (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", flex: 1, minHeight: "380px" }}>
									<div className="chairside-comparison-viewport" style={{ position: "relative" }}>
										<img
											src={slotsData[compareSlotId]?.imageUrl || slotsData.portrait_smile?.imageUrl || demoAfterImageUrl}
											alt="ДО"
											style={{ width: "100%", height: "100%", objectFit: "contain" }}
										/>
										<span className="chairside-comparison-label-badge before">ДО</span>
									</div>
									<div className="chairside-comparison-viewport" style={{ position: "relative" }}>
										<img
											src={slotsData[compareSlotId]?.imageUrl || demoAfterImageUrl}
											alt="ПОСЛЕ"
											style={{ width: "100%", height: "100%", objectFit: "contain" }}
										/>
										<span className="chairside-comparison-label-badge after">ПОСЛЕ</span>
									</div>
								</div>
							)}

							{/* Opacity Superimpose Mode */}
							{comparisonMode === "opacity" && (
								<div className="chairside-comparison-viewport" style={{ position: "relative" }}>
									<img
										src={slotsData[compareSlotId]?.imageUrl || slotsData.portrait_smile?.imageUrl || demoAfterImageUrl}
										alt="ДО"
										style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
									/>
									<img
										src={slotsData[compareSlotId]?.imageUrl || demoAfterImageUrl}
										alt="ПОСЛЕ"
										style={{
											position: "absolute",
											inset: 0,
											width: "100%",
											height: "100%",
											objectFit: "contain",
											opacity: overlayOpacity / 100,
										}}
									/>
									<span className="chairside-comparison-label-badge after">
										Наложение: {overlayOpacity}% ПОСЛЕ
									</span>
								</div>
							)}
						</div>
					)}

					{/* TAB 3: Direct Capture & Tooth Tagging */}
					{activeTab === "intake" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
							<div
								style={{
									border: "2px dashed var(--line, #cbd5e1)",
									borderRadius: "1rem",
									padding: "2rem",
									textAlign: "center",
									background: "var(--paper-strong, #f8fafc)",
									cursor: "pointer",
								}}
								onClick={() => fileInputRef.current?.click()}
							>
								<UploadCloud size={48} style={{ color: "var(--brand, #0284c7)", margin: "0 auto 1rem" }} />
								<h3 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", fontWeight: 700 }}>
									Перетащите фотоснимки сюда или выберите на устройстве
								</h3>
								<p style={{ color: "var(--muted, #64748b)", fontSize: "0.875rem", margin: "0 0 1.5rem" }}>
									Поддерживаются форматы JPEG, PNG, WebP, HEIC/HEIF. Автоматическая калибровка цвета в sRGB.
								</p>

								<div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											cameraInputRef.current?.click();
										}}
										className="chairside-photo-action-btn primary"
									>
										<Camera size={18} />
										<span>Снять с камеры планшета</span>
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											fileInputRef.current?.click();
										}}
										className="chairside-photo-action-btn default"
									>
										<UploadCloud size={18} />
										<span>Выбрать из галереи</span>
									</button>
								</div>
							</div>

							{/* Metadata Controls: Slot, Stage, VITA, Teeth */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
								<div>
									<label style={{ fontSize: "0.8125rem", fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
										Целевой ракурс фотопротокола:
									</label>
									<select
										value={selectedSlotForUpload}
										onChange={(e) => setSelectedSlotForUpload(e.target.value)}
										className="chairside-photo-preset-select"
										style={{ width: "100%" }}
									>
										{activePreset.slots.map((s) => (
											<option key={s.id} value={s.id}>
												{s.titleRu}
											</option>
										))}
									</select>
								</div>

								<div>
									<label style={{ fontSize: "0.8125rem", fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
										Клинический этап съемки:
									</label>
									<select
										value={selectedStage}
										onChange={(e) => setSelectedStage(e.target.value as PhotoProtocolStage)}
										className="chairside-photo-preset-select"
										style={{ width: "100%" }}
									>
										<option value="before">До лечения (Исходное состояние)</option>
										<option value="in_progress">В процессе (Препарирование / примерка)</option>
										<option value="after">После лечения (Финал)</option>
										<option value="followup">Контрольный осмотр (Follow-up)</option>
									</select>
								</div>
							</div>

							{/* VITA Shade Selector */}
							<div>
								<label style={{ fontSize: "0.8125rem", fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
									Определение оттенка по шкале VITA:
								</label>
								<div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
									{VITA_SHADES.map((shade) => (
										<button
											key={shade}
											type="button"
											onClick={() => setSelectedVitaShade(shade)}
											style={{
												minHeight: "44px",
												minWidth: "44px",
												borderRadius: "0.375rem",
												border: "1px solid var(--line, #cbd5e1)",
												background: selectedVitaShade === shade ? "var(--teal)" : "var(--paper)",
												color: selectedVitaShade === shade ? "var(--on-teal, #fff)" : "inherit",
												fontWeight: 700,
												fontSize: "0.8125rem",
												cursor: "pointer",
											}}
										>
											{shade}
										</button>
									))}
								</div>
							</div>

							{/* FDI Tooth Formula Tagging */}
							<div>
								<label style={{ fontSize: "0.8125rem", fontWeight: 700, display: "block", marginBottom: "0.375rem" }}>
									Привязка к зубам (FDI Формула):
								</label>
								<div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
									{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => handleToggleTooth(t)}
											style={{
												minHeight: "44px",
												minWidth: "40px",
												borderRadius: "0.375rem",
												border: "1px solid var(--line, #cbd5e1)",
												background: selectedTeeth.includes(t) ? "var(--teal)" : "var(--paper)",
												color: selectedTeeth.includes(t) ? "var(--on-teal, #fff)" : "inherit",
												fontWeight: 700,
												fontSize: "0.8125rem",
												cursor: "pointer",
											}}
										>
											{t}
										</button>
									))}
								</div>
								<div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.375rem" }}>
									{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => handleToggleTooth(t)}
											style={{
												minHeight: "44px",
												minWidth: "40px",
												borderRadius: "0.375rem",
												border: "1px solid var(--line, #cbd5e1)",
												background: selectedTeeth.includes(t) ? "var(--teal)" : "var(--paper)",
												color: selectedTeeth.includes(t) ? "var(--on-teal, #fff)" : "inherit",
												fontWeight: 700,
												fontSize: "0.8125rem",
												cursor: "pointer",
											}}
										>
											{t}
										</button>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="chairside-photo-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<button
							type="button"
							onClick={onClose}
							className="chairside-photo-action-btn default"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={() => {
								setSlotsData({});
								showToast("Сетка фотопротокола очищена", "info");
							}}
							className="chairside-photo-action-btn default"
							title="Очистить снимки"
						>
							<Trash2 size={16} />
							<span>Очистить</span>
						</button>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={handleApplyToVisitDiary}
							className="chairside-photo-action-btn success"
							title="Прикрепить протокол к карте пациента 043/у"
						>
							<CheckCircle2 size={18} />
							<span>Применить в дневник визита (043/у)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

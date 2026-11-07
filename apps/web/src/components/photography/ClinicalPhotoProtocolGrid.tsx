import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
	Camera,
	Check,
	Upload,
	SplitSquareHorizontal,
	Grid,
	Download,
	Trash2,
	RotateCw,
	Layers,
	FileText,
	Eye,
	X,
	Maximize2,
	Sparkles,
} from "lucide-react";
import {
	STANDARD_12_SLOT_PROTOCOL,
	type PhotoSlotRecord,
	type PhotoProtocolSlotDefinition,
	getSlotDefinitionById,
} from "./photoGridPresets";
import { BeforeAfterSplitSlider } from "./BeforeAfterSplitSlider";
import { showToast } from "../GlobalToast";
import { useClipboardPhotoPaste } from "./useClipboardPhotoPaste";
import { compressChairsidePhotoToBlobUrl } from "./chairsidePhotoCompressor";
import {
	DsdCanvasOverlay,
	type DsdCanvasGuideFlags,
	type DsdFacialLandmarks,
	type DsdCalibrationState,
} from "./dsd/DsdCanvasOverlay";
import { DsdMetricsSidebar } from "./dsd/DsdMetricsSidebar";
import { DEFAULT_CLINICAL_SMILE_PHOTO } from "./dsd/DsdAestheticStudioModal";
import type { DsdAnalysisData } from "@dental/shared";

export interface ClinicalPhotoProtocolGridProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialSlots?: Record<string, PhotoSlotRecord> | undefined;
	readonly onSaveProtocol?: (slots: Record<string, PhotoSlotRecord>) => void;
	readonly onClose?: () => void;
}

export const ClinicalPhotoProtocolGrid: React.FC<ClinicalPhotoProtocolGridProps> = ({
	patientId = "pat-101",
	patientName = "Пациент",
	doctorName = "Лечащий врач-ортодонт",
	clinicName = "DENTE CLINIC",
	initialSlots = {},
	onSaveProtocol,
	onClose,
}) => {
	const [slotsData, setSlotsData] = useState<Record<string, PhotoSlotRecord>>(initialSlots);
	const [activeFilter, setActiveFilter] = useState<"all" | "extraoral" | "intraoral" | "occlusal">("all");
	const [viewMode, setViewMode] = useState<"grid" | "compare" | "dsd">("grid");
	const [beforeSlotId, setBeforeSlotId] = useState<string>("portrait_rest");
	const [afterSlotId, setAfterSlotId] = useState<string>("portrait_smile");
	const [selectedSlotForZoom, setSelectedSlotForZoom] = useState<string | null>(null);

	// DSD Студия эстетического анализа
	const [dsdSlotId, setDsdSlotId] = useState<string>("portrait_smile");
	const [dsdRotationDegrees, setDsdRotationDegrees] = useState<number>(0);
	const [dsdActiveMobileTab, setDsdActiveMobileTab] = useState<"canvas" | "metrics">("canvas");
	const [dsdGuides, setDsdGuides] = useState<DsdCanvasGuideFlags>({
		bipupillary: true,
		midline: true,
		smileArc: true,
		goldenRatio: true,
		calibration: true,
	});
	const [dsdLandmarks, setDsdLandmarks] = useState<DsdFacialLandmarks>({
		leftPupil: { x: 340, y: 380 },
		rightPupil: { x: 660, y: 380 },
		midlineTop: { x: 500, y: 150 },
		midlineBottom: { x: 500, y: 850 },
		commissureLeft: { x: 280, y: 620 },
		commissureRight: { x: 720, y: 620 },
		smileArcCenter: { x: 500, y: 690 },
		incisalCenter: { x: 500, y: 670 },
		teethArchOrigin: { x: 500, y: 580 },
		teethArchWidth: 380,
		teethArchHeight: 110,
	});
	const [dsdCalibration, setDsdCalibration] = useState<DsdCalibrationState>({
		p1: { x: 450, y: 540 },
		p2: { x: 550, y: 540 },
		knownMm: 10,
	});

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const targetSlotRef = useRef<string | null>(null);
	const createdBlobUrlsRef = useRef<Set<string>>(new Set());

	// Освобождение Blob URL из памяти браузера при размонтировании (ликвидация утечек памяти PHO-04)
	useEffect(() => {
		const urls = createdBlobUrlsRef.current;
		return () => {
			urls.forEach((u) => URL.revokeObjectURL(u));
			urls.clear();
		};
	}, []);

	// 12 canonical slots from Standard 12 protocol
	const allSlots = STANDARD_12_SLOT_PROTOCOL.slots;

	// Filtered slots
	const visibleSlots = useMemo(() => {
		if (activeFilter === "extraoral") return allSlots.filter((s) => s.category === "extraoral");
		if (activeFilter === "intraoral") return allSlots.filter((s) => s.category === "intraoral_frontal" || s.category === "intraoral_lateral");
		if (activeFilter === "occlusal") return allSlots.filter((s) => s.category === "intraoral_occlusal");
		return allSlots;
	}, [allSlots, activeFilter]);

	// Loaded slots count
	const filledCount = useMemo(() => {
		return Object.values(slotsData).filter((s) => Boolean(s?.imageUrl)).length;
	}, [slotsData]);

	// Handle upload with hardware GPU compression (PHO-04)
	const handleSlotUpload = useCallback(async (slotId: string, file: File) => {
		try {
			const comp = await compressChairsidePhotoToBlobUrl(file, {
				maxDimension: 1920,
				quality: 0.85,
			}).catch(() => null);

			const blobUrl = comp ? comp.blobUrl : URL.createObjectURL(file);
			createdBlobUrlsRef.current.add(blobUrl);

			setSlotsData((prev) => {
				const existingUrl = prev[slotId]?.imageUrl;
				if (existingUrl?.startsWith("blob:")) {
					URL.revokeObjectURL(existingUrl);
					createdBlobUrlsRef.current.delete(existingUrl);
				}
				return {
					...prev,
					[slotId]: {
						slotId,
						imageUrl: blobUrl,
						uploadedAt: new Date().toISOString(),
						metadata: { fileName: file.name, fileSize: comp ? comp.sizeBytes : file.size },
					},
				};
			});
			showToast(`Снимок «${getSlotDefinitionById(slotId)?.shortLabelRu || slotId}» успешно загружен`, "success", 2500);
		} catch (err) {
			console.error("[ClinicalPhotoProtocolGrid] Upload compression failed:", err);
		}
	}, []);

	// Clipboard Paste (Ctrl+V) with hardware GPU compression (PHO-04)
	useClipboardPhotoPaste({
		enabled: true,
		onPhotoReceived: async (blob, fileName) => {
			const targetId =
				selectedSlotForZoom ||
				allSlots.find((s) => !slotsData[s.id]?.imageUrl)?.id ||
				allSlots[0]?.id ||
				"portrait_smile";

			try {
				const comp = await compressChairsidePhotoToBlobUrl(blob, {
					maxDimension: 1920,
					quality: 0.85,
				}).catch(() => null);

				const blobUrl = comp ? comp.blobUrl : URL.createObjectURL(blob);
				createdBlobUrlsRef.current.add(blobUrl);

				setSlotsData((prev) => {
					const existingUrl = prev[targetId]?.imageUrl;
					if (existingUrl?.startsWith("blob:")) {
						URL.revokeObjectURL(existingUrl);
						createdBlobUrlsRef.current.delete(existingUrl);
					}
					return {
						...prev,
						[targetId]: {
							slotId: targetId,
							imageUrl: blobUrl,
							uploadedAt: new Date().toISOString(),
							metadata: { fileName, fileSize: comp ? comp.sizeBytes : blob.size },
						},
					};
				});
				showToast(`Вставлен снимок из буфера (Ctrl+V) в ракурс «${getSlotDefinitionById(targetId)?.shortLabelRu || targetId}»`, "success", 3000);
			} catch (err) {
				console.error("[ClinicalPhotoProtocolGrid] Clipboard compression failed:", err);
			}
		},
	});

	// Trigger file upload for specific slot
	const triggerUpload = (slotId: string) => {
		targetSlotRef.current = slotId;
		fileInputRef.current?.click();
	};

	// DSD Callbacks
	const handleToggleDsdGuide = useCallback((key: keyof DsdCanvasGuideFlags) => {
		setDsdGuides((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const handleRotateDsdPhoto = useCallback((delta: number) => {
		setDsdRotationDegrees((prev) => (prev + delta) % 360);
	}, []);

	const handleAutoLevelDsd = useCallback(() => {
		const dx = dsdLandmarks.rightPupil.x - dsdLandmarks.leftPupil.x;
		const dy = dsdLandmarks.rightPupil.y - dsdLandmarks.leftPupil.y;
		const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
		setDsdRotationDegrees(-angle);
		showToast(`Горизонт фото выровнен по зрачковой линии (${(-angle).toFixed(1)}°)`, "success");
	}, [dsdLandmarks.leftPupil, dsdLandmarks.rightPupil]);

	const handleResetDsdToNorm = useCallback(() => {
		setDsdLandmarks({
			leftPupil: { x: 340, y: 380 },
			rightPupil: { x: 660, y: 380 },
			midlineTop: { x: 500, y: 150 },
			midlineBottom: { x: 500, y: 850 },
			commissureLeft: { x: 280, y: 620 },
			commissureRight: { x: 720, y: 620 },
			smileArcCenter: { x: 500, y: 690 },
			incisalCenter: { x: 500, y: 670 },
			teethArchOrigin: { x: 500, y: 580 },
			teethArchWidth: 380,
			teethArchHeight: 110,
		});
		setDsdRotationDegrees(0);
		showToast("Направляющие DSD возвращены к канонической норме", "info");
	}, []);

	const handleApplyDsd = useCallback(
		(analysis: Partial<DsdAnalysisData>) => {
			const currentSlot = slotsData[dsdSlotId];
			if (currentSlot) {
				setSlotsData((prev) => ({
					...prev,
					[dsdSlotId]: {
						...currentSlot,
						metadata: {
							...currentSlot.metadata,
							dsdAnalysis: analysis,
						},
					},
				}));
			}

			if (typeof window !== "undefined") {
				const labDetail = {
					patientId,
					patientName,
					doctorName,
					teeth: [13, 12, 11, 21, 22, 23],
					toothFdi: 11,
					material: analysis.recommendedMaterial,
					colorVita: analysis.recommendedVitaShade,
					notes: `[DSD Эстетика из фотопротокола]: Цвет ${analysis.recommendedVitaShade}, дуга ${analysis.smileArcCurvature}. ${analysis.doctorNotes || ""}`,
					dsdAnalysis: analysis,
				};
				window.dispatchEvent(new CustomEvent("dente-open-lab-order-modal", { detail: labDetail }));
				window.dispatchEvent(new CustomEvent("dente-apply-dsd-to-treatment-plan", { detail: labDetail }));
			}
			showToast("Параметры DSD успешно перенесены в заказ-наряд лаборатории и план лечения!", "success");
		},
		[slotsData, dsdSlotId, patientId, patientName, doctorName],
	);

	// Save protocol
	const handleSave = () => {
		onSaveProtocol?.(slotsData);
		showToast(`Клинический фотопротокол сохранен (${filledCount} из 12 снимков)`, "success", 3000);
		onClose?.();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-hidden"
			role="dialog"
			aria-modal="true"
			data-testid="clinical-photo-protocol-grid"
		>
			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				accept="image/*"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file && targetSlotRef.current) {
						handleSlotUpload(targetSlotRef.current, file);
					}
					if (fileInputRef.current) fileInputRef.current.value = "";
				}}
			/>

			<div className="relative w-full max-w-6xl h-[94vh] max-h-[920px] bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink)]">
				{/* Mobile Drag Handle */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-[var(--paper)]">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line)]" />
				</div>

				{/* Header */}
				<header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[var(--teal)] flex items-center justify-center border border-teal-500/20 shrink-0">
							<Camera size={18} />
						</div>
						<div>
							<h2 className="text-sm sm:text-base font-bold m-0 flex items-center gap-2">
								<span>Клинический фотопротокол ортодонта</span>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20">
									{filledCount} / 12 снимков
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate">
								{patientName} · Врач: {doctorName} · {clinicName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* View Switcher: Grid vs Compare */}
						<div className="flex items-center bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[32px] ${
									viewMode === "grid" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
								}`}
								title="Сетка 12 стандартных слотов"
							>
								<Grid size={14} />
								<span className="hidden sm:inline">Сетка 12 слотов</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("compare")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[32px] ${
									viewMode === "compare" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
								}`}
								title="Слайдер сравнения До / После"
							>
								<SplitSquareHorizontal size={14} />
								<span className="hidden sm:inline">Сравнение До/После</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("dsd")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[32px] ${
									viewMode === "dsd" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
								}`}
								title="Digital Smile Design: эстетический анализ улыбки и золотые пропорции Wheeler"
								data-testid="btn-view-mode-dsd"
							>
								<Sparkles size={14} className="text-teal-500" />
								<span className="hidden sm:inline">DSD Эстетика</span>
							</button>
						</div>

						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="secondary-button w-8 h-8 !p-0 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center shrink-0 cursor-pointer"
								title="Закрыть"
							>
								<X size={16} />
							</button>
						)}
					</div>
				</header>

				{/* Toolbar (Only for Grid mode) */}
				{viewMode === "grid" && (
					<div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] gap-2 flex-wrap shrink-0">
						<div className="flex items-center gap-1.5">
							{(
								[
									["all", "Все 12 позиций"],
									["extraoral", "Внеротовые (портрет)"],
									["intraoral", "Внутриротовые (окклюзия)"],
									["occlusal", "Окклюзионные дуги"],
								] as const
							).map(([key, label]) => (
								<button
									key={key}
									type="button"
									onClick={() => setActiveFilter(key)}
									className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer min-h-[32px] border ${
										activeFilter === key
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									{label}
								</button>
							))}
						</div>

						<span className="text-xs text-[var(--muted)] hidden md:inline">
							Совет: Нажмите на слот или нажмите <kbd className="px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] text-[10px] font-mono">Ctrl+V</kbd> для мгновенной вставки из буфера
						</span>
					</div>
				)}

				{/* Main Body */}
				<div className={`flex-1 p-2 sm:p-4 bg-[var(--paper-soft)] ${viewMode === "dsd" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>
					{viewMode === "grid" && (
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
							{visibleSlots.map((slot) => {
								const record = slotsData[slot.id];
								const isUploaded = Boolean(record?.imageUrl);

								return (
									<div
										key={slot.id}
										onClick={() => triggerUpload(slot.id)}
										className={`group relative rounded-xl border-2 transition-all p-2 flex flex-col justify-between cursor-pointer aspect-4/3 min-h-[140px] bg-[var(--paper)] ${
											isUploaded
												? "border-teal-500/40 hover:border-teal-500 shadow-xs"
												: "border-dashed border-[var(--line)] hover:border-[var(--teal)]/60 hover:bg-[var(--paper-soft)]"
										}`}
									>
										{/* Slot Header */}
										<div className="flex items-center justify-between gap-1 z-10">
											<span className="text-[11px] font-bold text-[var(--ink)] truncate">
												{slot.shortLabelRu}
											</span>
											{isUploaded ? (
												<span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-full">
													<Check size={10} />
													<span>Загружено</span>
												</span>
											) : (
												<span className="text-[10px] text-[var(--muted)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded border border-[var(--line)]">
													{slot.requiredEquipmentRu || "Слот"}
												</span>
											)}
										</div>

										{/* Content / Preview */}
										<div className="flex-1 flex items-center justify-center my-1 overflow-hidden rounded-lg relative">
											{isUploaded ? (
												<img
													src={record.imageUrl}
													alt={slot.shortLabelRu}
													className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
												/>
											) : (
												<div className="flex flex-col items-center justify-center gap-1 text-[var(--muted)]">
													<Upload size={22} className="opacity-40 group-hover:opacity-80 transition-opacity" />
													<span className="text-[11px] font-medium text-center px-1">
														Нажмите или перетащите фото
													</span>
												</div>
											)}
										</div>

										{/* Slot Footer Description */}
										<div className="flex items-center justify-between text-[10px] text-[var(--muted)] z-10">
											<span className="truncate">{slot.clinicalPurposeRu}</span>
											{isUploaded && (
												<div className="flex items-center gap-1">
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setDsdSlotId(slot.id);
															setViewMode("dsd");
														}}
														className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 text-[10px] font-bold flex items-center gap-1 transition-colors min-h-[24px]"
														title="Открыть DSD эстетический анализ этого фото"
														data-testid={`btn-dsd-slot-${slot.id}`}
													>
														<Sparkles size={10} />
														<span>DSD</span>
													</button>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setSlotsData((prev) => {
																const existingUrl = prev[slot.id]?.imageUrl;
																if (existingUrl?.startsWith("blob:")) {
																	URL.revokeObjectURL(existingUrl);
																	createdBlobUrlsRef.current.delete(existingUrl);
																}
																const next = { ...prev };
																delete next[slot.id];
																return next;
															});
														}}
														className="p-1 hover:text-red-500 rounded text-[var(--muted)] transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
														title="Удалить снимок"
													>
														<Trash2 size={12} />
													</button>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}

					{viewMode === "compare" && (
						/* Before/After Comparison View */
						<div className="flex flex-col gap-4 h-full">
							<div className="flex items-center justify-between bg-[var(--paper)] p-3 rounded-xl border border-[var(--line)] flex-wrap gap-2">
								<div className="flex items-center gap-2">
									<label className="text-xs font-bold text-[var(--muted)]">До лечения:</label>
									<select
										value={beforeSlotId}
										onChange={(e) => setBeforeSlotId(e.target.value)}
										className="bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold rounded-lg px-2.5 py-1.5 text-[var(--ink)]"
									>
										{allSlots.map((s) => (
											<option key={s.id} value={s.id}>
												{s.shortLabelRu} {slotsData[s.id]?.imageUrl ? "✓" : "(нет фото)"}
											</option>
										))}
									</select>
								</div>

								<div className="flex items-center gap-2">
									<label className="text-xs font-bold text-[var(--muted)]">После лечения:</label>
									<select
										value={afterSlotId}
										onChange={(e) => setAfterSlotId(e.target.value)}
										className="bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold rounded-lg px-2.5 py-1.5 text-[var(--ink)]"
									>
										{allSlots.map((s) => (
											<option key={s.id} value={s.id}>
												{s.shortLabelRu} {slotsData[s.id]?.imageUrl ? "✓" : "(нет фото)"}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="flex-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 flex items-center justify-center min-h-[380px]">
								<BeforeAfterSplitSlider
									beforeImageUrl={slotsData[beforeSlotId]?.imageUrl}
									afterImageUrl={slotsData[afterSlotId]?.imageUrl}
									beforeLabel={`До: ${getSlotDefinitionById(beforeSlotId)?.shortLabelRu || beforeSlotId}`}
									afterLabel={`После: ${getSlotDefinitionById(afterSlotId)?.shortLabelRu || afterSlotId}`}
									onSwap={() => {
										const tmp = beforeSlotId;
										setBeforeSlotId(afterSlotId);
										setAfterSlotId(tmp);
									}}
								/>
							</div>
						</div>
					)}

					{viewMode === "dsd" && (
						/* DSD Digital Smile Design Workspace (PHO-02..05) */
						<div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--paper)] rounded-xl border border-[var(--line)]">
							{/* DSD Sub-Header: Slot Selector & Tools */}
							<div className="flex items-center justify-between px-3 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] gap-2 flex-wrap shrink-0">
								<div className="flex items-center gap-2">
									<label className="text-xs font-bold text-[var(--muted)]">Снимок для DSD:</label>
									<select
										value={dsdSlotId}
										onChange={(e) => setDsdSlotId(e.target.value)}
										className="bg-[var(--paper)] border border-[var(--line)] text-xs font-semibold rounded-lg px-2.5 py-1.5 text-[var(--ink)] cursor-pointer"
										data-testid="select-dsd-slot"
									>
										{allSlots.map((s) => (
											<option key={s.id} value={s.id}>
												{s.shortLabelRu} {slotsData[s.id]?.imageUrl ? "✓ (загружено)" : "(нет фото)"}
											</option>
										))}
									</select>
									{!slotsData[dsdSlotId]?.imageUrl && (
										<button
											type="button"
											onClick={() => triggerUpload(dsdSlotId)}
											className="px-2 py-1 rounded bg-[var(--teal)] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer min-h-[32px]"
										>
											<Upload size={12} />
											<span>Загрузить фото для этого слота</span>
										</button>
									)}
								</div>

								{/* Mobile Segmented Control */}
								<div className="sm:hidden flex bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)]">
									<button
										type="button"
										onClick={() => setDsdActiveMobileTab("canvas")}
										className={`px-2.5 py-1 text-xs font-bold rounded ${
											dsdActiveMobileTab === "canvas" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
										}`}
									>
										Холст
									</button>
									<button
										type="button"
										onClick={() => setDsdActiveMobileTab("metrics")}
										className={`px-2.5 py-1 text-xs font-bold rounded ${
											dsdActiveMobileTab === "metrics" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
										}`}
									>
										Замеры и ЗТЛ
									</button>
								</div>
							</div>

							{/* DSD Split Workspace */}
							<div className="flex-1 flex overflow-hidden">
								<div
									className={`flex-1 relative flex items-center justify-center p-2 bg-slate-950 overflow-hidden ${
										dsdActiveMobileTab === "canvas" ? "flex" : "max-sm:hidden"
									}`}
								>
									<DsdCanvasOverlay
										imageUrl={slotsData[dsdSlotId]?.imageUrl || DEFAULT_CLINICAL_SMILE_PHOTO}
										guides={dsdGuides}
										landmarks={dsdLandmarks}
										calibration={dsdCalibration}
										rotationDegrees={dsdRotationDegrees}
										onLandmarksChange={setDsdLandmarks}
										onCalibrationChange={setDsdCalibration}
									/>
								</div>
								<div
									className={`w-full sm:w-[340px] lg:w-[380px] shrink-0 h-full border-l border-[var(--line)] bg-[var(--paper)] overflow-y-auto ${
										dsdActiveMobileTab === "metrics" ? "block" : "max-sm:hidden"
									}`}
								>
									<DsdMetricsSidebar
										landmarks={dsdLandmarks}
										calibration={dsdCalibration}
										guides={dsdGuides}
										rotationDegrees={dsdRotationDegrees}
										onToggleGuide={handleToggleDsdGuide}
										onRotatePhoto={handleRotateDsdPhoto}
										onAutoLevel={handleAutoLevelDsd}
										onApplyToTreatmentPlanAndLab={handleApplyDsd}
										onResetToNorm={handleResetDsdToNorm}
									/>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer with STRICTLY ONE Primary CTA Button (Mandate 8am: #0d9488) */}
				<footer className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper)] shrink-0 gap-3">
					<div className="text-xs text-[var(--muted)] font-medium">
						Стандарт СтАР / ITI: 12 снимков прикуса и профиля
					</div>

					<div className="flex items-center gap-2">
						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="secondary-button min-h-[44px] h-11 px-4 rounded-xl text-xs font-semibold"
							>
								Отмена
							</button>
						)}

						<button
							type="button"
							onClick={handleSave}
							className="primary-button min-h-[44px] h-11 px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer bg-[#0d9488] hover:bg-[#0f766e] text-white"
							data-testid="btn-save-photo-protocol"
						>
							<Check size={16} />
							<span>Сохранить фотопротокол ({filledCount}/12)</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ClinicalPhotoProtocolGrid;

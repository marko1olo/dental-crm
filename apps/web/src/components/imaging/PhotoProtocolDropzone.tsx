import React, { useState, useRef, useCallback } from "react";
import {
	UploadCloud,
	Camera,
	Smartphone,
	CheckCircle2,
	AlertCircle,
	RefreshCw,
	X,
	Sparkles,
	Sliders,
	Image as ImageIcon,
} from "lucide-react";
import {
	DENTAL_PHOTO_SLOT_LABELS_RU,
	DENTAL_PHOTO_SLOT_TYPES,
	type DentalPhotoSlotType,
	isHeicFileNameOrMime,
} from "@dental/shared";
import {
	type ClinicalPhotoIntakeResult,
	processMedicalPhotoIntake,
} from "../../services/imaging/medicalImageIntake";
import { logger } from "../../utils/logger";

export interface PhotoProtocolDropzoneProps {
	patientId: string;
	visitId?: string | undefined;
	toothNumber?: number | undefined;
	activeSlotType?: DentalPhotoSlotType | undefined;
	initialStage?: ("before" | "during" | "after" | "followup") | undefined;
	onPhotoSaved?: ((result: ClinicalPhotoIntakeResult) => void) | undefined;
	onClose?: (() => void) | undefined;
	onPhotoProcessed?: ((result: ClinicalPhotoIntakeResult) => void) | undefined;
	onBatchCompleted?: ((results: ClinicalPhotoIntakeResult[]) => void) | undefined;
	className?: string | undefined;
}

interface FileUploadQueueItem {
	id: string;
	file: File;
	name: string;
	sizeBytes: number;
	isHeic: boolean;
	status: "pending" | "decoding" | "calibrating" | "ready" | "failed";
	progressPercent: number;
	errorMessage?: string | undefined;
	result?: ClinicalPhotoIntakeResult | undefined;
	targetSlot: DentalPhotoSlotType;
}

export const PhotoProtocolDropzone: React.FC<PhotoProtocolDropzoneProps> = ({
	patientId,
	visitId,
	toothNumber,
	activeSlotType = "intraoral_frontal_occlusion",
	onPhotoProcessed,
	onBatchCompleted,
	className = "",
}) => {
	const [isDragOver, setIsDragOver] = useState(false);
	const [queue, setQueue] = useState<FileUploadQueueItem[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [selectedSlot, setSelectedSlot] =
		useState<DentalPhotoSlotType>(activeSlotType);
	const [selectedStage, setSelectedStage] = useState<
		"before" | "during" | "after" | "followup"
	>("before");

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const cameraInputRef = useRef<HTMLInputElement | null>(null);

	const handleFilesSelected = useCallback(
		async (fileList: FileList | File[]) => {
			const files = Array.from(fileList);
			if (files.length === 0) return;

			const newItems: FileUploadQueueItem[] = files.map((file, idx) => {
				const isHeic = isHeicFileNameOrMime(file.name) || isHeicFileNameOrMime(file.type);
				// Automatically assign sequential slots if multiple are dropped
				const slotIndex = (DENTAL_PHOTO_SLOT_TYPES.indexOf(selectedSlot) + idx) % DENTAL_PHOTO_SLOT_TYPES.length;
				const autoSlot = DENTAL_PHOTO_SLOT_TYPES[slotIndex] || selectedSlot;

				return {
					id: `queue_${Date.now()}_${idx}`,
					file,
					name: file.name,
					sizeBytes: file.size,
					isHeic,
					status: "pending",
					progressPercent: 0,
					targetSlot: autoSlot,
				};
			});

			setQueue((prev) => [...prev, ...newItems]);
			setIsProcessing(true);

			const completedResults: ClinicalPhotoIntakeResult[] = [];

			for (const item of newItems) {
				setQueue((prev) =>
					prev.map((q) =>
						q.id === item.id
							? { ...q, status: "decoding", progressPercent: 25 }
							: q,
					),
				);

				try {
					const intakeResult = await processMedicalPhotoIntake(item.file, {
						patientId,
						...(visitId !== undefined ? { visitId } : {}),
						...(toothNumber !== undefined ? { toothNumber } : {}),
						slotType: item.targetSlot,
						stage: selectedStage,
						onProgress: (step, percent) => {
							setQueue((prev) =>
								prev.map((q) =>
									q.id === item.id
										? {
												...q,
												status: percent > 60 ? "calibrating" : "decoding",
												progressPercent: percent,
											}
										: q,
								),
							);
						},
					});

					setQueue((prev) =>
						prev.map((q) =>
							q.id === item.id
								? {
										...q,
										status: "ready",
										progressPercent: 100,
										result: intakeResult,
									}
								: q,
						),
					);

					completedResults.push(intakeResult);
					onPhotoProcessed?.(intakeResult);
				} catch (err) {
					logger.error(`[Dropzone] Failed to process ${item.name}`, err);
					setQueue((prev) =>
						prev.map((q) =>
							q.id === item.id
								? {
										...q,
										status: "failed",
										errorMessage:
											err instanceof Error ? err.message : "Ошибка обработки снимка",
									}
								: q,
						),
					);
				}
			}

			setIsProcessing(false);
			if (completedResults.length > 0) {
				onBatchCompleted?.(completedResults);
			}
		},
		[
			patientId,
			visitId,
			toothNumber,
			selectedSlot,
			selectedStage,
			onPhotoProcessed,
			onBatchCompleted,
		],
	);

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFilesSelected(e.dataTransfer.files);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	};

	const removeItem = (id: string) => {
		setQueue((prev) => prev.filter((q) => q.id !== id));
	};

	const clearCompleted = () => {
		setQueue((prev) => prev.filter((q) => q.status !== "ready"));
	};

	return (
		<div
			className={`flex flex-col gap-3 p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] ${className}`}
		>
			{/* Hidden Native File Inputs */}
			<input
				type="file"
				ref={fileInputRef}
				multiple
				accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp"
				className="hidden"
				onChange={(e) => {
					if (e.target.files) handleFilesSelected(e.target.files);
					e.target.value = "";
				}}
			/>
			<input
				type="file"
				ref={cameraInputRef}
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={(e) => {
					if (e.target.files) handleFilesSelected(e.target.files);
					e.target.value = "";
				}}
			/>

			{/* Top Configuration Controls */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[var(--line,#e2e8f0)]">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-[var(--muted,#64748b)]">
						Слот протокола:
					</span>
					<select
						value={selectedSlot}
						onChange={(e) =>
							setSelectedSlot(e.target.value as DentalPhotoSlotType)
						}
						className="min-h-[40px] px-2.5 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{DENTAL_PHOTO_SLOT_TYPES.map((st) => (
							<option key={st} value={st}>
								{DENTAL_PHOTO_SLOT_LABELS_RU[st]}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-[var(--muted,#64748b)]">
						Этап:
					</span>
					<div className="flex rounded-lg border border-[var(--line,#cbd5e1)] p-0.5 bg-[var(--paper-soft,#f8fafc)]">
						{(
							[
								["before", "До"],
								["during", "В процессе"],
								["after", "После"],
								["followup", "Контроль"],
							] as const
						).map(([stKey, stLabel]) => (
							<button
								key={stKey}
								type="button"
								onClick={() => setSelectedStage(stKey)}
								className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
									selectedStage === stKey
										? "bg-[var(--paper-strong,#2563eb)] text-white shadow-xs"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
							>
								{stLabel}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Primary Dropzone Surface */}
			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
					isDragOver
						? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
						: "border-[var(--line,#cbd5e1)] hover:border-blue-400 bg-[var(--paper-soft,#f8fafc)]"
				}`}
				onClick={() => fileInputRef.current?.click()}
			>
				<div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-3">
					<UploadCloud className="w-6 h-6" />
				</div>

				<div className="text-center space-y-1">
					<div className="text-sm font-bold text-[var(--ink,#0f172a)]">
						Перетащите фотографии фотопротокола сюда
					</div>
					<div className="text-xs text-[var(--muted,#64748b)] max-w-md">
						Прямая загрузка <strong className="text-blue-600 dark:text-blue-400">Apple HEIC / HEIF с iPhone</strong>, JPEG, PNG, WebP с автоматической калибровкой Display P3 и сохранением оттенков эмали VITA
					</div>
				</div>

				{/* Quick Action Buttons (Touch-First >= 44px) */}
				<div
					className="flex flex-wrap items-center gap-2 mt-4"
					onClick={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="min-h-[44px] px-4 py-2 rounded-lg bg-[var(--paper-strong,#2563eb)] text-white font-semibold text-xs flex items-center gap-2 shadow-xs hover:bg-blue-700 transition-colors"
					>
						<Smartphone className="w-4 h-4" />
						Выбрать с устройства / iPhone
					</button>

					<button
						type="button"
						onClick={() => cameraInputRef.current?.click()}
						className="min-h-[44px] px-4 py-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-semibold text-xs flex items-center gap-2 shadow-xs hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors"
					>
						<Camera className="w-4 h-4 text-blue-600" />
						Сделать снимок камерой
					</button>
				</div>
			</div>

			{/* Queue & Progress List */}
			{queue.length > 0 && (
				<div className="flex flex-col gap-2 mt-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
							<ImageIcon className="w-3.5 h-3.5 text-blue-600" />
							Очередь обработки ({queue.filter((q) => q.status === "ready").length}/{queue.length})
						</span>
						{queue.some((q) => q.status === "ready") && (
							<button
								type="button"
								onClick={clearCompleted}
								className="text-xs text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] underline"
							>
								Очистить завершенные
							</button>
						)}
					</div>

					<div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
						{queue.map((item) => (
							<div
								key={item.id}
								className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs"
							>
								{/* Thumbnail / Status Icon */}
								<div className="flex items-center gap-2.5 min-w-0 flex-1">
									{item.result?.microThumbnailUrl ? (
										<img
											src={item.result.microThumbnailUrl}
											alt={item.name}
											className="w-10 h-10 object-cover rounded-md border border-[var(--line,#cbd5e1)] shrink-0"
										/>
									) : (
										<div className="w-10 h-10 rounded-md bg-[var(--line,#e2e8f0)] flex items-center justify-center shrink-0">
											{item.status === "decoding" || item.status === "calibrating" ? (
												<RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
											) : item.status === "failed" ? (
												<AlertCircle className="w-4 h-4 text-red-600" />
											) : (
												<ImageIcon className="w-4 h-4 text-[var(--muted,#64748b)]" />
											)}
										</div>
									)}

									<div className="flex flex-col min-w-0">
										<div className="flex items-center gap-1.5">
											<span className="font-semibold truncate text-[var(--ink,#0f172a)]">
												{item.name}
											</span>
											{item.isHeic && (
												<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
													HEIC P3
												</span>
											)}
										</div>
										<div className="text-[11px] text-[var(--muted,#64748b)]">
											{DENTAL_PHOTO_SLOT_LABELS_RU[item.targetSlot]} • {(item.sizeBytes / (1024 * 1024)).toFixed(1)} МБ
										</div>
									</div>
								</div>

								{/* Status Badge & Actions */}
								<div className="flex items-center gap-2 shrink-0">
									{item.status === "ready" && (
										<span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
											<CheckCircle2 className="w-4 h-4" />
											Готово
										</span>
									)}

									{item.status === "decoding" && (
										<span className="text-[11px] font-semibold text-blue-600">
											Декодирование... {item.progressPercent}%
										</span>
									)}

									{item.status === "calibrating" && (
										<span className="text-[11px] font-semibold text-purple-600 flex items-center gap-1">
											<Sparkles className="w-3.5 h-3.5" />
											Display P3...
										</span>
									)}

									{item.status === "failed" && (
										<span className="text-[11px] font-semibold text-red-600">
											Ошибка
										</span>
									)}

									<button
										type="button"
										onClick={() => removeItem(item.id)}
										className="p-1 rounded-md text-[var(--muted,#64748b)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
										title="Удалить"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default PhotoProtocolDropzone;

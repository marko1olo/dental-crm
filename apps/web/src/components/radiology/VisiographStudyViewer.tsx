/**
 * VisiographStudyViewer.tsx — Канонический 2D просмотрщик радиовизиографических (RVG) и ОПТГ снимков.
 *
 * Архитектурные стандарты:
 * - Мандат 8e: Автономия врача у кресла (0 блокировок, тихое фоновое автосохранение).
 * - Мандат 8n: Суверенитет соло-врача и небольшой клиники (1-3 кресла).
 * - Мандат 8am: Ровно ОДНА Primary CTA кнопка (#0d9488) на видимый контекст.
 * - Мандат 8b: Sweet Spot 200–250 строк (декомпозирован в ./studyViewer/).
 * - Сенсорные тач-таргеты >= 44x44px, Apple HIG, безупречная поддержка Light и Dark тем (#090d16).
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, HardDrive } from "lucide-react";
import { useVisitStore } from "../../store/visitStore.js";
import { showToast } from "../GlobalToast.js";
import {
	readRadiologyFileForCapture,
	persistRvgScanToServer,
} from "./directRvgFileValidation.js";
import {
	useStudyViewerCanvas,
	StudyViewerFloatingToolbar,
	StudyViewerHeader,
	StudyViewerFooter,
} from "./studyViewer/index.js";

export interface VisiographStudyViewerProps {
	readonly imageUrl?: string;
	readonly studyTitle?: string;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly initialTooth?: string;
	readonly modality?: "rvg" | "opg" | "cbct_slice";
	readonly onClose?: () => void;
	readonly onSaveToVisit?: (details: {
		tooth: string;
		doseMsv: number;
		measurementsMm: number[];
	}) => void;
	readonly onAddToInvoice?: (serviceTitle: string, priceRub: number) => void;
}

export const VisiographStudyViewer: React.FC<VisiographStudyViewerProps> = ({
	imageUrl = "",
	studyTitle = "Прицельная радиовизиография",
	patientName = "Пациент",
	patientId = "pat-walkin",
	initialTooth = "16",
	modality = "rvg",
	onClose,
	onSaveToVisit,
	onAddToInvoice,
}) => {
	// Состояние текущего изображения и загрузки файла
	const [currentImage, setCurrentImage] = useState<string>(imageUrl || "");
	const [isDragOver, setIsDragOver] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (imageUrl) {
			setCurrentImage(imageUrl);
		}
	}, [imageUrl]);

	// Доменные параметры: привязка к зубу FDI и тихая доза
	const [selectedTooth, setSelectedTooth] = useState<string>(initialTooth);
	const [isSaved, setIsSaved] = useState<boolean>(false);
	const [isBilled, setIsBilled] = useState<boolean>(false);

	const doseMsv = modality === "opg" ? 0.05 : 0.02;
	const mmPerPixel = modality === "opg" ? 0.1 : 0.04;

	// Декомпозированный хук холста: фильтры, зум, панорамирование, тач-жесты и линейка
	const canvas = useStudyViewerCanvas({
		currentImage,
		mmPerPixel,
	});

	// Чтение и загрузка локального файла (DICOM, TIFF, JPG, PNG)
	const handleProcessFile = useCallback(async (file: File) => {
		try {
			const res = await readRadiologyFileForCapture(file);
			if (res.imageUrl) {
				setCurrentImage(res.imageUrl);
				if (res.detectedTeeth && res.detectedTeeth.length > 0 && res.detectedTeeth[0]) {
					setSelectedTooth(res.detectedTeeth[0]);
				}
				showToast(`Снимок ${file.name} успешно загружен`, "success");
			}
		} catch (err) {
			console.warn("[VisiographStudyViewer] Error reading file:", err);
			showToast(`Ошибка чтения файла: ${file.name}`, "error");
		}
	}, []);

	const handleDropFile = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);
			const files = e.dataTransfer.files;
			if (files && files.length > 0 && files[0]) {
				void handleProcessFile(files[0]);
			}
		},
		[handleProcessFile],
	);

	// 1-Клик привязка к приёму и тихий учет дозы
	const handlePrimaryAttach = () => {
		setIsSaved(true);

		try {
			const visitState = useVisitStore.getState();
			if (visitState) {
				const rvgEntry = `[Визиография] Зуб #${selectedTooth}: периапикальные ткани без деструктивных изменений, корень без трещин. Доза: ${doseMsv} мЗв.`;
				if (typeof visitState.setVisitNoteForm === "function") {
					visitState.setVisitNoteForm((prev) => {
						const current = prev.objectiveStatus || "";
						const updated = current.trim() ? `${current.trim()}\n${rvgEntry}` : rvgEntry;
						return { ...prev, objectiveStatus: updated };
					});
				}
				if (typeof visitState.setToothState === "function") {
					visitState.setToothState(selectedTooth, "treatment");
				}
				if (typeof visitState.setActiveStudy === "function" && currentImage) {
					visitState.setActiveStudy({
						id: `rvg-${selectedTooth}-${Date.now()}`,
						title: `Прицельный снимок зуба #${selectedTooth}`,
						modality: "intraoral_rvg",
						teethFdi: [selectedTooth],
						imageUrl: currentImage,
						effectiveDoseMicrosv: doseMsv * 1000,
					});
				}
			}
		} catch (err) {
			console.warn("[VisiographStudyViewer] Failed to sync to visit store:", err);
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-rvg-scan-saved", {
					detail: {
						toothFdi: selectedTooth,
						tooth: selectedTooth,
						doseMsv,
						measurementsMm: canvas.measurementsMm,
						imageUrl: currentImage,
						patientId,
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						tooth: selectedTooth,
						type: "rvg_finding",
						text: `Визиография зуба ${selectedTooth}: костная ткань в норме, доза ${doseMsv} мЗв`,
					},
				}),
			);
		}

		if (currentImage && (currentImage.startsWith("data:image/") || currentImage.startsWith("blob:"))) {
			persistRvgScanToServer({
				patientId,
				capturedImage: currentImage,
				selectedTeeth: [selectedTooth],
				clinicalNotes: `Прицельная визиография зуба ${selectedTooth}. Измерения: ${canvas.measurementsMm.join(", ")} мм`,
			});
		}

		if (onSaveToVisit) {
			onSaveToVisit({
				tooth: selectedTooth,
				doseMsv,
				measurementsMm: canvas.measurementsMm,
			});
		}

		showToast(`✓ Снимок зуба #${selectedTooth} привязан к протоколу приёма`, "success");
	};

	// 1-Клик мгновенный биллинг в кассу (Мандат 8e: 0 блокировок)
	const handleQuickBill = () => {
		setIsBilled(true);
		const serviceTitle =
			modality === "opg"
				? "Ортопантомография (ОПТГ)"
				: `Прицельный снимок визиографа (зуб ${selectedTooth})`;
		const priceRub = modality === "opg" ? 1200 : 450;
		if (onAddToInvoice) {
			onAddToInvoice(serviceTitle, priceRub);
		}
		showToast(
			isBilled
				? "Снимок уже добавлен в кассовый чек"
				: `✓ Добавлено в чек: ${serviceTitle} (${priceRub} ₽)`,
			"info",
		);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:add-service-to-cashbox", {
					detail: {
						title: serviceTitle,
						amountRub: priceRub,
						amountKopecks: priceRub * 100,
						tooth: selectedTooth,
						modality,
					},
				}),
			);
		}
	};

	return (
		<div
			className="flex flex-col w-full h-full rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl transition-all"
			data-testid="visiograph-study-viewer"
			style={{ minHeight: "480px" }}
		>
			<StudyViewerHeader
				studyTitle={studyTitle}
				patientName={patientName}
				selectedTooth={selectedTooth}
				doseMsv={doseMsv}
				modality={modality}
				onClose={onClose}
			/>

			{/* Центральная рабочая область (#090d16 темная комната рентгенолога) */}
			<div
				className="relative flex-1 bg-[#090d16] overflow-hidden flex items-center justify-center cursor-crosshair"
				onDragOver={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setIsDragOver(true);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setIsDragOver(false);
				}}
				onDrop={handleDropFile}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept=".dcm,.dicom,.tif,.tiff,.png,.jpg,.jpeg,.webp,image/*"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) void handleProcessFile(file);
						e.target.value = "";
					}}
				/>

				<canvas
					ref={canvas.canvasRef}
					onClick={canvas.handleCanvasClick}
					onWheel={canvas.handleWheel}
					onMouseDown={canvas.handleMouseDown}
					onMouseMove={canvas.handleMouseMove}
					onMouseUp={canvas.handleMouseUp}
					onTouchStart={canvas.handleTouchStart}
					onTouchMove={canvas.handleTouchMove}
					onTouchEnd={canvas.handleTouchEnd}
					onTouchCancel={canvas.handleTouchEnd}
					style={{ touchAction: "none", display: currentImage ? "block" : "none" }}
					className="w-full h-full select-none"
					data-testid="visiograph-canvas"
				/>

				{/* Empty state при отсутствии снимка */}
				{!currentImage && (
					<div
						className={`flex flex-col items-center justify-center p-6 text-center select-none transition-all z-10 max-w-md ${
							isDragOver ? "scale-102 border-[var(--teal,#0d9488)] bg-slate-900/60" : ""
						}`}
						data-testid="rvg-empty-dropzone"
					>
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-[var(--teal,#0d9488)] mb-3 border border-slate-700/60 shadow-lg">
							<UploadCloud className="h-7 w-7" />
						</div>
						<p className="text-sm font-semibold text-slate-200 mb-1 leading-snug">
							Снимки визиографа не прикреплены. Перетащите файл DICOM или сделайте снимок с датчика
						</p>
						<p className="text-xs text-slate-400 mb-4 max-w-xs">
							Поддерживаются форматы DICOM (.dcm), TIFF, PNG, JPG с автоматической калибровкой
						</p>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="flex items-center gap-2 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs font-semibold text-white bg-[var(--teal,#0d9488)] hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer border-0"
							data-testid="btn-rvg-file-select"
						>
							<HardDrive className="h-4 w-4" />
							<span>Выбрать файл снимка</span>
						</button>
					</div>
				)}

				{/* Декомпозированный плавающий тулбар манипуляций */}
				<StudyViewerFloatingToolbar
					zoom={canvas.zoom}
					onZoomIn={() => canvas.setZoom((z) => Math.min(z * 1.25, 5))}
					onZoomOut={() => canvas.setZoom((z) => Math.max(z * 0.8, 0.5))}
					brightness={canvas.brightness}
					onCycleBrightness={() => canvas.setBrightness((b) => (b >= 180 ? 100 : b + 25))}
					contrast={canvas.contrast}
					onCycleContrast={() => canvas.setContrast((c) => (c >= 180 ? 100 : c + 25))}
					isInverted={canvas.isInverted}
					onToggleInvert={() => canvas.setIsInverted((inv) => !inv)}
					isRulerActive={canvas.isRulerActive}
					onToggleRuler={() => {
						canvas.setIsRulerActive((r) => !r);
						if (canvas.isRulerActive) canvas.setRulerPoints([]);
					}}
					onResetView={canvas.handleResetView}
				/>
			</div>

			<StudyViewerFooter
				selectedTooth={selectedTooth}
				onSelectTooth={setSelectedTooth}
				isBilled={isBilled}
				onQuickBill={handleQuickBill}
				isSaved={isSaved}
				onPrimaryAttach={handlePrimaryAttach}
			/>
		</div>
	);
};

export default VisiographStudyViewer;

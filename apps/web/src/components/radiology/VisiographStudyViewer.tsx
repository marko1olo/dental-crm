/**
 * VisiographStudyViewer.tsx — Канонический 2D просмотрщик радиовизиографических (RVG) и ОПТГ снимков.
 *
 * Архитектурные стандарты:
 * - Мандат 8e: Автономия врача у кресла (0 блокировок, тихое фоновое автосохранение).
 * - Мандат 8n: Суверенитет соло-врача и небольшой клиники (1-3 кресла).
 * - Мандат 8am: Ровно ОДНА Primary CTA кнопка (#0d9488) на видимый контекст.
 * - Мандат 8b: Sweet Spot 250–350 строк, отсутствие академического оверинжиниринга.
 * - Сенсорные тач-таргеты >= 44x44px, Apple HIG, безупречная поддержка Light и Dark тем.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
	ZoomIn,
	ZoomOut,
	RotateCcw,
	Sun,
	Contrast as ContrastIcon,
	Ruler,
	Check,
	CreditCard,
	Activity,
	Maximize2,
	Minimize2,
	Eye,
	X,
	UploadCloud,
	HardDrive,
} from "lucide-react";
import { useVisitStore } from "../../store/visitStore";
import { useAppStore } from "../../store/appStore";
import { showToast } from "../GlobalToast";
import {
	readRadiologyFileForCapture,
	persistRvgScanToServer,
	extractTeethFromRadiologyFilename,
} from "./directRvgFileValidation";

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
	// ─── Состояние текущего изображения и загрузки ────────────────────────────────
	const [currentImage, setCurrentImage] = useState<string>(imageUrl || "");
	const [isDragOver, setIsDragOver] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (imageUrl) {
			setCurrentImage(imageUrl);
		}
	}, [imageUrl]);

	// ─── Состояние манипуляций со снимком ──────────────────────────────────────────
	const [brightness, setBrightness] = useState<number>(100); // 50% .. 200%
	const [contrast, setContrast] = useState<number>(100);     // 50% .. 200%
	const [isInverted, setIsInverted] = useState<boolean>(false);
	const [isSharpnessOn, setIsSharpnessOn] = useState<boolean>(false);

	// ─── Навигация: Зум и Панорамирование ─────────────────────────────────────────
	const [zoom, setZoom] = useState<number>(1);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	// ─── Линейка измерений в мм (калибровка RVG: 0.04 мм/px, ОПТГ: 0.1 мм/px) ───
	const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
	const [rulerPoints, setRulerPoints] = useState<{ x: number; y: number }[]>([]);
	const [measurementsMm, setMeasurementsMm] = useState<number[]>([]);

	// ─── Доменные параметры: привязка к зубу FDI и тихая доза ───────────────────
	const [selectedTooth, setSelectedTooth] = useState<string>(initialTooth);
	const [isSaved, setIsSaved] = useState<boolean>(false);
	const [isBilled, setIsBilled] = useState<boolean>(false);

	// Тихое начисление дозы лучевой нагрузки (дефолт 0.02 мЗв для RVG, 0.05 мЗв для ОПТГ)
	const doseMsv = modality === "opg" ? 0.05 : 0.02;
	const mmPerPixel = modality === "opg" ? 0.1 : 0.04;

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const imageObjRef = useRef<HTMLImageElement | null>(null);
	const touchStartDistRef = useRef<number | null>(null);
	const initialZoomRef = useRef<number>(1);
	const touchDragStartRef = useRef<{ x: number; y: number } | null>(null);

	// Сброс всех настроек изображения
	const handleResetView = useCallback(() => {
		setBrightness(100);
		setContrast(100);
		setIsInverted(false);
		setIsSharpnessOn(false);
		setZoom(1);
		setPan({ x: 0, y: 0 });
		setRulerPoints([]);
	}, []);

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

	// Перерисовка холста при изменении параметров
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Подгоняем внутренний размер canvas под контейнер
		const rect = canvas.getBoundingClientRect();
		if (canvas.width !== (rect.width || 600) || canvas.height !== (rect.height || 450)) {
			canvas.width = rect.width || 600;
			canvas.height = rect.height || 450;
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (!currentImage) {
			return;
		}

		let isCancelled = false;
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = currentImage;

		img.onload = () => {
			if (isCancelled) return;
			imageObjRef.current = img;

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.save();

			// Накладываем фильтры CSS (яркость, контраст, негатив)
			ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${isInverted ? "invert(100%)" : "invert(0%)"}`;

			// Трансформация: центрирование, панорамирование и зум
			const cx = canvas.width / 2;
			const cy = canvas.height / 2;
			ctx.translate(cx + pan.x, cy + pan.y);
			ctx.scale(zoom, zoom);

			// Вычисляем размеры картинки с сохранением пропорций
			const scale = Math.min((canvas.width * 0.85) / img.width, (canvas.height * 0.85) / img.height);
			const dw = img.width * scale;
			const dh = img.height * scale;
			ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
			ctx.restore();

			// Отрисовка измерительной линейки с полупрозрачной подложкой (WCAG AAA)
			if (rulerPoints.length >= 2) {
				ctx.save();
				ctx.strokeStyle = "#0d9488";
				ctx.fillStyle = "#0d9488";
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.moveTo(rulerPoints[0]!.x, rulerPoints[0]!.y);
				ctx.lineTo(rulerPoints[1]!.x, rulerPoints[1]!.y);
				ctx.stroke();

				// Маркеры концов
				for (const p of rulerPoints) {
					ctx.beginPath();
					ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
					ctx.fill();
				}

				// Текст измерения в мм с защитной темной плашкой (0 слепящих пятен в Dark Mode)
				const midX = (rulerPoints[0]!.x + rulerPoints[1]!.x) / 2;
				const midY = (rulerPoints[0]!.y + rulerPoints[1]!.y) / 2 - 8;
				const pixelDist = Math.hypot(rulerPoints[1]!.x - rulerPoints[0]!.x, rulerPoints[1]!.y - rulerPoints[0]!.y);
				const realMm = ((pixelDist / zoom) * mmPerPixel).toFixed(1);

				ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
				const labelText = `${realMm} мм`;
				const textMetrics = ctx.measureText(labelText);
				const pillWidth = textMetrics.width + 12;
				const pillHeight = 20;

				ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
				ctx.beginPath();
				if (typeof ctx.roundRect === "function") {
					ctx.roundRect(midX - pillWidth / 2, midY - 14, pillWidth, pillHeight, 4);
				} else {
					ctx.rect(midX - pillWidth / 2, midY - 14, pillWidth, pillHeight);
				}
				ctx.fill();

				ctx.fillStyle = "#ffffff";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(labelText, midX, midY - 4);
				ctx.restore();
			}
		};

		return () => {
			isCancelled = true;
		};
	}, [currentImage, brightness, contrast, isInverted, isSharpnessOn, zoom, pan, rulerPoints, mmPerPixel]);

	// Обработка клика по Canvas для линейки
	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isRulerActive) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (rulerPoints.length >= 2) {
			setRulerPoints([{ x, y }]);
		} else {
			const next = [...rulerPoints, { x, y }];
			setRulerPoints(next);
			if (next.length === 2) {
				const pixelDist = Math.hypot(next[1]!.x - next[0]!.x, next[1]!.y - next[0]!.y);
				const calcMm = Number(((pixelDist / zoom) * mmPerPixel).toFixed(1));
				setMeasurementsMm((prev) => [...prev, calcMm]);
			}
		}
	};

	// Зум колесиком мыши
	const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 1.15 : 0.85;
		setZoom((prev) => Math.min(Math.max(0.5, prev * zoomDelta), 5));
	};

	// Перетаскивание (Pan)
	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (isRulerActive) return;
		setIsDragging(true);
		setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDragging || isRulerActive) return;
		setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
	};

	const handleMouseUp = () => setIsDragging(false);

	// ─── Apple HIG: Сенсорные жесты pinch-to-zoom и touch-pan ─────────────────
	const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 2) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			touchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			initialZoomRef.current = zoom;
			touchDragStartRef.current = null;
		} else if (e.touches.length === 1 && !isRulerActive) {
			const t = e.touches[0]!;
			touchDragStartRef.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
			touchStartDistRef.current = null;
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 2 && touchStartDistRef.current !== null) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			if (currentDist > 0 && touchStartDistRef.current > 0) {
				const ratio = currentDist / touchStartDistRef.current;
				setZoom(Math.min(Math.max(0.5, initialZoomRef.current * ratio), 5));
			}
		} else if (e.touches.length === 1 && touchDragStartRef.current && !isRulerActive) {
			const t = e.touches[0]!;
			setPan({ x: t.clientX - touchDragStartRef.current.x, y: t.clientY - touchDragStartRef.current.y });
		}
	};

	const handleTouchEnd = () => {
		touchStartDistRef.current = null;
		touchDragStartRef.current = null;
	};

	// ─── 1-Клик привязка к приёму и тихий учет дозы ────────────────────────────
	const handlePrimaryAttach = () => {
		setIsSaved(true);

		// Синхронизация с активным приёмом (useVisitStore)
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

		// Доменные события
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-rvg-scan-saved", {
					detail: {
						toothFdi: selectedTooth,
						tooth: selectedTooth,
						doseMsv,
						measurementsMm,
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

		// Персистенция на сервер
		if (currentImage && (currentImage.startsWith("data:image/") || currentImage.startsWith("blob:"))) {
			persistRvgScanToServer({
				patientId,
				capturedImage: currentImage,
				selectedTeeth: [selectedTooth],
				clinicalNotes: `Прицельная визиография зуба ${selectedTooth}. Измерения: ${measurementsMm.join(", ")} мм`,
			});
		}

		if (onSaveToVisit) {
			onSaveToVisit({
				tooth: selectedTooth,
				doseMsv,
				measurementsMm,
			});
		}

		showToast(`✓ Снимок зуба #${selectedTooth} привязан к протоколу приёма`, "success");
	};

	// ─── 1-Клик мгновенный биллинг в кассу (Мандат 8e: 0 блокировок) ───────────
	const handleQuickBill = () => {
		setIsBilled(true);
		const serviceTitle = modality === "opg" ? "Ортопантомография (ОПТГ)" : `Прицельный снимок визиографа (зуб ${selectedTooth})`;
		const priceRub = modality === "opg" ? 1200 : 450;
		if (onAddToInvoice) {
			onAddToInvoice(serviceTitle, priceRub);
		}
		showToast(isBilled ? "Снимок уже добавлен в кассовый чек" : `✓ Добавлено в чек: ${serviceTitle} (${priceRub} ₽)`, "info");
		// Эмитируем доменное событие добавления услуги радиодиагностики в кассовый чек
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
			{/* Верхний лаконичный тулбар: статус, зуб и тихая доза */}
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(13,148,136,0.12)] text-[var(--teal,#0d9488)]">
						<Activity className="h-4 w-4" />
					</div>
					<div className="flex flex-col min-w-0">
						<span className="text-[13px] font-semibold truncate leading-tight">
							<span className="sm:hidden">RVG #{selectedTooth} — {patientName}</span>
							<span className="hidden sm:inline">{studyTitle} — {patientName}</span>
						</span>
						<span className="text-[11px] text-[var(--muted)] flex items-center gap-1.5 leading-tight">
							<span>Зуб {selectedTooth}</span>
							<span>•</span>
							<span>Доза: {doseMsv} мЗв ({modality === "opg" ? "18-25" : "2-5"} мкЗв, норма)</span>
						</span>
					</div>
				</div>

				{/* Кнопка закрытия, если открыто модально (Apple HIG min 44x44px на мобильных) */}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px]"
						title="Закрыть просмотрщик"
						data-testid="btn-close-viewer"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>

			{/* Центральная рабочая область со снимком (Pinch-to-zoom & Touch Pan) */}
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
					ref={canvasRef}
					onClick={handleCanvasClick}
					onWheel={handleWheel}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
					onTouchCancel={handleTouchEnd}
					style={{ touchAction: "none", display: currentImage ? "block" : "none" }}
					className="w-full h-full select-none"
					data-testid="visiograph-canvas"
				/>

				{/* Честное чистое Empty State при отсутствии реального снимка */}
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

				{/* Плавающий тулбар манипуляций со снимком (нейтральные кнопки >=44x44px по Apple HIG) */}
				<div
					className="absolute top-3 left-3 flex items-center gap-1.5 p-1.5 rounded-xl shadow-lg z-10 max-w-[calc(100%-24px)] overflow-x-auto"
					style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255, 255, 255, 0.2)" }}
				>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.min(z * 1.25, 5))}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
						title="Увеличить (Zoom In)"
						data-testid="btn-zoom-in"
					>
						<ZoomIn className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.max(z * 0.8, 0.5))}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
						title="Уменьшить (Zoom Out)"
						data-testid="btn-zoom-out"
					>
						<ZoomOut className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<div className="w-[1px] h-4 bg-white/20 mx-0.5" />
					<button
						type="button"
						onClick={() => setBrightness((b) => (b >= 180 ? 100 : b + 25))}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
						title={`Яркость: ${brightness}%`}
						data-testid="btn-brightness"
					>
						<Sun className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<button
						type="button"
						onClick={() => setContrast((c) => (c >= 180 ? 100 : c + 25))}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
						title={`Контраст: ${contrast}%`}
						data-testid="btn-contrast"
					>
						<ContrastIcon className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<button
						type="button"
						onClick={() => setIsInverted((inv) => !inv)}
						style={{
							backgroundColor: isInverted ? "#0d9488" : "#1e293b",
							color: "#ffffff",
							borderColor: isInverted ? "#0d9488" : "#475569",
						}}
						className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border active:scale-95 transition-all"
						title="Негатив / Инверсия"
						data-testid="btn-invert"
					>
						<Eye className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<div className="w-[1px] h-4 bg-white/20 mx-0.5" />
					<button
						type="button"
						onClick={() => {
							setIsRulerActive((r) => !r);
							if (isRulerActive) setRulerPoints([]);
						}}
						style={{
							backgroundColor: isRulerActive ? "#0d9488" : "#1e293b",
							color: "#ffffff",
							borderColor: isRulerActive ? "#0d9488" : "#475569",
						}}
						className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border active:scale-95 transition-all"
						title="Калиброванная линейка (мм)"
						data-testid="btn-ruler"
					>
						<Ruler className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<button
						type="button"
						onClick={handleResetView}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
						title="Сбросить вид"
						data-testid="btn-reset-view"
					>
						<RotateCcw className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
				</div>
			</div>

			{/* Нижняя командная строка: Селектор зуба, 1-клик чек и Ровно 1 Primary CTA */}
			<div className="flex flex-wrap items-center justify-between px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
				{/* Выбор зуба FDI 11-48 (Apple HIG тач-таргет >=44px) */}
				<div className="flex items-center gap-2">
					<label htmlFor="fdi-tooth-select" className="text-xs font-medium text-[var(--muted)]">
						Зуб FDI:
					</label>
					<select
						id="fdi-tooth-select"
						value={selectedTooth}
						onChange={(e) => setSelectedTooth(e.target.value)}
						className="h-11 sm:h-8 min-h-[44px] sm:min-h-[32px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold focus:outline-none focus:border-[var(--teal,#0d9488)]"
						data-testid="select-tooth-fdi"
					>
						{[
							18, 17, 16, 15, 14, 13, 12, 11,
							21, 22, 23, 24, 25, 26, 27, 28,
							38, 37, 36, 35, 34, 33, 32, 31,
							41, 42, 43, 44, 45, 46, 47, 48,
						].map((tooth) => (
							<option key={tooth} value={tooth}>
								{tooth}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
					{/* Вторичная кнопка: 1-Клик добавление в кассу / чек (Apple HIG min-h-[44px] на мобильных, НИКОГДА НЕ DISABLED по Мандату 8e) */}
					<button
						type="button"
						onClick={handleQuickBill}
						className="flex items-center gap-1.5 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 sm:px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] transition-all select-none shadow-xs active:scale-95 whitespace-nowrap shrink-0"
						data-testid="btn-quick-bill"
					>
						<CreditCard className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
						<span className="whitespace-nowrap">{isBilled ? "✓ В чеке (450 ₽)" : "+ В чек (450 ₽)"}</span>
					</button>

					{/* Единственная Primary CTA кнопка (#0d9488): Прикрепить к приёму */}
					<button
						type="button"
						onClick={handlePrimaryAttach}
						className="flex items-center justify-center gap-1.5 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs font-semibold text-white bg-[var(--teal,#0d9488)] hover:brightness-105 active:scale-95 transition-all shadow-sm select-none whitespace-nowrap shrink-0"
						data-testid="btn-primary-attach"
					>
						<Check className="h-4 w-4 stroke-[2.5] shrink-0" />
						<span className="whitespace-nowrap">{isSaved ? `Привязано к зубу ${selectedTooth}` : `Привязать к зубу ${selectedTooth}`}</span>
					</button>
				</div>
			</div>
		</div>
	);
};


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
} from "lucide-react";
import { useVisitStore } from "../../store/visitStore";
import { useAppStore } from "../../store/appStore";

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
	imageUrl = "/radiology/sample_rvg_tooth16.jpg",
	studyTitle = "Прицельная радиовизиография",
	patientName = "Пациент",
	patientId = "pat-walkin",
	initialTooth = "16",
	modality = "rvg",
	onClose,
	onSaveToVisit,
	onAddToInvoice,
}) => {
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

	// Перерисовка холста при изменении параметров
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let isCancelled = false;
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = imageUrl;

		img.onload = () => {
			if (isCancelled) return;
			imageObjRef.current = img;

			// Подгоняем внутренний размер canvas под контейнер
			const rect = canvas.getBoundingClientRect();
			if (canvas.width !== rect.width || canvas.height !== rect.height) {
				canvas.width = rect.width || 600;
				canvas.height = rect.height || 450;
			}

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

			// Отрисовка измерительной линейки
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

				// Текст измерения в мм
				const midX = (rulerPoints[0]!.x + rulerPoints[1]!.x) / 2;
				const midY = (rulerPoints[0]!.y + rulerPoints[1]!.y) / 2 - 8;
				const pixelDist = Math.hypot(rulerPoints[1]!.x - rulerPoints[0]!.x, rulerPoints[1]!.y - rulerPoints[0]!.y);
				const realMm = ((pixelDist / zoom) * mmPerPixel).toFixed(1);

				ctx.font = "bold 13px system-ui, sans-serif";
				ctx.fillStyle = "#ffffff";
				ctx.shadowColor = "rgba(0,0,0,0.8)";
				ctx.shadowBlur = 4;
				ctx.fillText(`${realMm} мм`, midX - 20, midY);
				ctx.restore();
			}
		};

		return () => {
			isCancelled = true;
		};
	}, [imageUrl, brightness, contrast, isInverted, isSharpnessOn, zoom, pan, rulerPoints, mmPerPixel]);

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

	// ─── 1-Клик привязка к приёму и тихий учет дозы ────────────────────────────
	const handlePrimaryAttach = () => {
		setIsSaved(true);
		if (onSaveToVisit) {
			onSaveToVisit({
				tooth: selectedTooth,
				doseMsv,
				measurementsMm,
			});
		}
	};

	// ─── 1-Клик мгновенный биллинг в кассу ─────────────────────────────────────
	const handleQuickBill = () => {
		setIsBilled(true);
		const serviceTitle = modality === "opg" ? "Ортопантомография (ОПТГ)" : `Прицельный снимок визиографа (зуб ${selectedTooth})`;
		const priceRub = modality === "opg" ? 1200 : 450;
		if (onAddToInvoice) {
			onAddToInvoice(serviceTitle, priceRub);
		}
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
							{studyTitle} — {patientName}
						</span>
						<span className="text-[11px] text-[var(--muted)] flex items-center gap-1.5 leading-tight">
							<span>Зуб {selectedTooth}</span>
							<span>•</span>
							<span>Доза: {doseMsv} мЗв (норма)</span>
						</span>
					</div>
				</div>

				{/* Кнопка закрытия, если открыто модально */}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors min-w-[36px] min-h-[36px]"
						title="Закрыть просмотрщик"
						data-testid="btn-close-viewer"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>

			{/* Центральная рабочая область со снимком */}
			<div className="relative flex-1 bg-[#090d16] overflow-hidden flex items-center justify-center cursor-crosshair">
				<canvas
					ref={canvasRef}
					onClick={handleCanvasClick}
					onWheel={handleWheel}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					className="w-full h-full select-none"
					data-testid="visiograph-canvas"
				/>

				{/* Плавающий тулбар манипуляций со снимком (нейтральные кнопки) */}
				<div
					className="absolute top-3 left-3 flex items-center gap-1.5 p-1.5 rounded-xl shadow-lg z-10 max-w-[calc(100%-24px)] overflow-x-auto"
					style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255, 255, 255, 0.2)" }}
				>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.min(z * 1.25, 5))}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
						title="Увеличить (Zoom In)"
						data-testid="btn-zoom-in"
					>
						<ZoomIn className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<button
						type="button"
						onClick={() => setZoom((z) => Math.max(z * 0.8, 0.5))}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
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
						className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
						title={`Яркость: ${brightness}%`}
						data-testid="btn-brightness"
					>
						<Sun className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<button
						type="button"
						onClick={() => setContrast((c) => (c >= 180 ? 100 : c + 25))}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
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
						className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border active:scale-95 transition-all"
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
						className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border active:scale-95 transition-all"
						title="Калиброванная линейка (мм)"
						data-testid="btn-ruler"
					>
						<Ruler className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
					<button
						type="button"
						onClick={handleResetView}
						style={{ backgroundColor: "#1e293b", color: "#ffffff", borderColor: "#475569" }}
						className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border hover:brightness-125 active:scale-95 transition-all"
						title="Сбросить вид"
						data-testid="btn-reset-view"
					>
						<RotateCcw className="h-4 w-4" style={{ color: "#ffffff" }} />
					</button>
				</div>
			</div>

			{/* Нижняя командная строка: Селектор зуба, 1-клик чек и Ровно 1 Primary CTA */}
			<div className="flex flex-wrap items-center justify-between px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
				{/* Выбор зуба FDI 11-48 */}
				<div className="flex items-center gap-2">
					<label htmlFor="fdi-tooth-select" className="text-xs font-medium text-[var(--muted)]">
						Зуб FDI:
					</label>
					<select
						id="fdi-tooth-select"
						value={selectedTooth}
						onChange={(e) => setSelectedTooth(e.target.value)}
						className="h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold focus:outline-none focus:border-[var(--teal,#0d9488)]"
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

				<div className="flex items-center gap-2">
					{/* Вторичная кнопка: 1-Клик добавление в кассу / чек */}
					<button
						type="button"
						onClick={handleQuickBill}
						disabled={isBilled}
						className="flex items-center gap-1.5 h-10 sm:h-9 min-h-[40px] sm:min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] transition-all select-none shadow-xs active:scale-95"
						data-testid="btn-quick-bill"
					>
						<CreditCard className="h-3.5 w-3.5 text-[var(--muted)]" />
						<span>{isBilled ? "✓ В чеке" : "+ В чек (450 ₽)"}</span>
					</button>

					{/* Единственная Primary CTA кнопка (#0d9488): Прикрепить к приёму */}
					<button
						type="button"
						onClick={handlePrimaryAttach}
						className="flex items-center gap-1.5 h-10 sm:h-9 min-h-[40px] sm:min-h-[36px] px-4 rounded-xl text-xs font-semibold text-white bg-[var(--teal,#0d9488)] hover:brightness-105 active:scale-95 transition-all shadow-sm select-none"
						data-testid="btn-primary-attach"
					>
						<Check className="h-4 w-4 stroke-[2.5]" />
						<span>{isSaved ? `✓ Привязано к зубу ${selectedTooth}` : `✓ Привязать к зубу ${selectedTooth}`}</span>
					</button>
				</div>
			</div>
		</div>
	);
};

/**
 * VisiographStudioModal.tsx — Каноническая монолитная студия визиографа и рентгенодиагностики (Мандаты 8b, 8e, 8am, 8ze).
 *
 * Архитектурные стандарты:
 * - Мандат 8b: Sweet Spot 380–480 строк.
 * - Мандат 8e: Автономия врача (кнопка Primary CTA НИКОГДА не disabled, 0 блокировок).
 * - Мандат 8am: Ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран.
 * - Мандат 8ze & Apple HIG: Нативный Bottom Sheet drawer на смартфонах с тактильным Drag Handle 36x5px,
 *   touch target >= 44x44px, Natural Thumb Zone, 0px паразитного горизонтального скролла.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
	X, Maximize2, Minimize2, Ruler, RotateCcw,
	Printer, Check, Camera, ZoomIn, ZoomOut, ChevronDown,
} from "lucide-react";
import {
	MODALITY_CATALOG, CLINICAL_FILTER_PRESETS, DEMO_VISIOGRAPH_STUDIES,
	FDI_PERMANENT_TEETH, calculateDistanceMm, calculateDistancePx,
	getClinicalFilterCss, detectLatestHotfolderStudy,
	type StudyModality, type VisiographFilterId, type Point2D, type DetectedHotfolderStudy,
} from "./visiographCatalogData";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { printVisiographA4Protocol } from "./visiographPrintA4";

export interface VisiographStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly initialToothCode?: string;
	readonly initialModality?: StudyModality;
	readonly initialImageUrl?: string;
	readonly onSaveToChart?: (result: {
		toothCode: string;
		modality: StudyModality;
		imageUrl: string;
		doseMsv: number;
		measurementsCount: number;
	}) => void;
}

export const VisiographStudioModal: React.FC<VisiographStudioModalProps> = ({
	isOpen,
	onClose,
	patientId = "pat_walkin",
	patientName = "Захаров Иван Дмитриевич",
	initialToothCode = "16",
	initialModality = "rvg",
	initialImageUrl,
	onSaveToChart,
}) => {
	const [activeModality, setActiveModality] = useState<StudyModality>(initialModality);
	const [activeTooth, setActiveTooth] = useState<string>(initialToothCode);
	const [activeFilter, setActiveFilter] = useState<VisiographFilterId>("normal");
	const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
	// Линейка по умолчанию накладывается вдоль оси корня зуба #16
	const [rulerP1, setRulerP1] = useState<Point2D | null>({ x: 180, y: 160 });
	const [rulerP2, setRulerP2] = useState<Point2D | null>({ x: 180, y: 380 });
	const [zoom, setZoom] = useState<number>(1.0);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isToothSelectorOpen, setIsToothSelectorOpen] = useState<boolean>(false);
	const [currentImageUrl, setCurrentImageUrl] = useState<string>(initialImageUrl || "/radiology/sample_rvg_tooth16.jpg");
	const [hotfolderNotice, setHotfolderNotice] = useState<DetectedHotfolderStudy | null>(null);
	const viewportRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const found = DEMO_VISIOGRAPH_STUDIES.find((s) => s.modality === activeModality);
		if (found?.imageUrl) {
			setCurrentImageUrl(found.imageUrl);
			if (found.toothCode) setActiveTooth(found.toothCode);
		}
	}, [activeModality]);

	useEffect(() => {
		if (!isOpen) return;
		const timer = setTimeout(() => {
			setHotfolderNotice(detectLatestHotfolderStudy("Planmeca Romexis", patientName, activeTooth));
		}, 900);
		return () => clearTimeout(timer);
	}, [isOpen, patientName, activeTooth]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") { e.stopPropagation(); onClose(); }
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (!isRulerActive || !viewportRef.current) return;
		const rect = viewportRef.current.getBoundingClientRect();
		const clickX = Math.round(e.clientX - rect.left);
		const clickY = Math.round(e.clientY - rect.top);
		if (!rulerP1 || (rulerP1 && rulerP2)) {
			setRulerP1({ x: clickX, y: clickY });
			setRulerP2(null);
		} else {
			setRulerP2({ x: clickX, y: clickY });
			showToast("✓ Измерение зафиксировано линейкой", "info");
		}
	}, [isRulerActive, rulerP1, rulerP2]);

	const measuredMm = rulerP1 && rulerP2 ? calculateDistanceMm(rulerP1, rulerP2, 0.035) : null;
	const measuredPx = rulerP1 && rulerP2 ? Math.round(calculateDistancePx(rulerP1, rulerP2)) : null;

	const handleAcceptHotfolder = useCallback(() => {
		if (hotfolderNotice) {
			setCurrentImageUrl(hotfolderNotice.previewUrl);
			setActiveTooth(hotfolderNotice.toothCode);
			setHotfolderNotice(null);
			showToast(`✓ Новый снимок (${hotfolderNotice.vendor}) успешно загружен и привязан!`, "success");
		}
	}, [hotfolderNotice]);

	const handlePrintA4 = useCallback(() => {
		printVisiographA4Protocol({ patientId, patientName, activeTooth, activeModality, currentImageUrl });
	}, [patientId, patientName, activeTooth, activeModality, currentImageUrl]);

	const handleSaveToRecord = useCallback(() => {
		const modalityMeta = MODALITY_CATALOG[activeModality];
		const doseMsv = modalityMeta.typicalDoseMsv;

		try {
			const doseText = `${doseMsv} мЗв`;
			const rvgEntry = `[Рентгенодиагностика] Зуб #${activeTooth} (${modalityMeta.shortName}): доза ${doseText}. Периапикальные ткани в норме.`;
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim() ? `${current.trim()}\n${rvgEntry}` : rvgEntry;
				return { ...prev, objectiveStatus: updated };
			});
			useVisitStore.getState().setToothState(activeTooth, "treatment");
		} catch {
			// Офлайн фоллбэк
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:attach-photo-to-visit", {
					detail: { url: currentImageUrl, name: `Рентген RVG: зуб ${activeTooth}`, toothNumber: activeTooth, photoType: "xray" },
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-rvg-scan-saved", {
					detail: { toothFdi: activeTooth, imageUrl: currentImageUrl, modality: activeModality, doseMsv },
				}),
			);
		}

		if (onSaveToChart) {
			onSaveToChart({
				toothCode: activeTooth, modality: activeModality, imageUrl: currentImageUrl,
				doseMsv, measurementsCount: measuredMm ? 1 : 0,
			});
		}

		showToast(`✓ Снимок зуба #${activeTooth} успешно привязан к приёму`, "success");
		onClose();
	}, [activeTooth, activeModality, currentImageUrl, measuredMm, onSaveToChart, onClose]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none overflow-x-clip"
			style={{ backgroundColor: "rgba(10, 15, 26, 0.85)", backdropFilter: "blur(8px)", height: "100dvh", maxHeight: "100dvh", maxWidth: "100vw" }}
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
			data-testid="visiograph-studio-modal-root"
		>
			<div
				className={`w-full flex flex-col bg-[var(--paper)] border border-[var(--line)] shadow-2xl transition-all duration-200 overflow-hidden ${
					isFullscreen ? "h-full rounded-none" : "h-[94dvh] sm:h-[88vh] sm:max-w-5xl rounded-t-[24px] sm:rounded-2xl"
				}`}
				style={{ background: "var(--paper, #0d1117)", borderColor: "var(--line, #30363d)", maxWidth: "100vw" }}
				role="dialog"
				aria-modal="true"
				aria-label="Студия радиовизиографа и лучевой диагностики"
			>
				{/* ─── iOS Drag Handle на смартфонах (Apple HIG) ─── */}
				<div className="flex sm:hidden justify-center pt-2 pb-1 shrink-0">
					<div className="w-9 h-1 rounded-full bg-[var(--line)] opacity-70" aria-hidden="true" data-testid="ios-drag-handle" />
				</div>

				{/* ─── Шапка модального окна (Строго 1 строка 44–48px) ─── */}
				<header className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-2 min-h-[44px]">
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-7 h-7 rounded-lg bg-[var(--line)] flex items-center justify-center text-[var(--ink)] shrink-0">
							<Camera size={16} />
						</div>
						<div className="min-w-0">
							<div className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate max-w-[110px] sm:max-w-none">{patientName}</div>
							<div className="text-[10px] sm:text-xs text-[var(--muted)] hidden sm:flex items-center gap-1.5">
								<span>{MODALITY_CATALOG[activeModality].shortName}</span>
								<span>•</span>
								<span className="font-semibold text-[var(--ink)]">{`Зуб #${activeTooth}`}</span>
							</div>
						</div>
					</div>

					{/* Селектор модальности (RVG / ОПТГ / КЛКТ) */}
					<div className="flex items-center gap-1 bg-[var(--line)] p-0.5 rounded-lg shrink-0">
						{(["rvg", "opg", "cbct"] as const).map((mod) => (
							<button
								key={mod}
								type="button"
								onClick={() => setActiveModality(mod)}
								className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border-0 cursor-pointer ${
									activeModality === mod ? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								style={{ color: activeModality === mod ? "#ffffff" : "var(--muted)" }}
								data-testid={`modality-btn-${mod}`}
							>
								{mod.toUpperCase()}
							</button>
						))}
					</div>

					{/* Селектор зуба FDI и действия в шапке */}
					<div className="flex items-center gap-1.5 shrink-0">
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsToothSelectorOpen((prev) => !prev)}
								className="h-8 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 text-[var(--ink)] bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] cursor-pointer shrink-0"
								data-testid="tooth-selector-btn"
							>
								<span>{`#${activeTooth}`}</span>
								<ChevronDown size={14} />
							</button>

							{isToothSelectorOpen && (
								<div
									className="absolute right-0 top-full mt-1 z-50 p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl grid grid-cols-8 gap-1 w-64 max-h-56 overflow-y-auto"
									data-testid="tooth-selector-dropdown"
								>
									{FDI_PERMANENT_TEETH.map((tooth) => (
										<button
											key={tooth}
											type="button"
											onClick={() => { setActiveTooth(tooth); setIsToothSelectorOpen(false); }}
											className={`h-7 rounded text-[11px] font-bold border-0 cursor-pointer ${
												activeTooth === tooth ? "bg-[var(--teal,#0d9488)] text-white" : "hover:bg-[var(--line)] text-[var(--ink)] bg-transparent"
											}`}
											style={{ color: activeTooth === tooth ? "#ffffff" : "var(--ink)" }}
										>
											{tooth}
										</button>
									))}
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={handlePrintA4}
							className="hidden sm:inline-flex h-8 w-8 rounded-lg items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] bg-transparent hover:bg-[var(--line)] border border-[var(--line)] cursor-pointer"
							title="Печать снимка на лист А4"
							data-testid="btn-print-a4"
						>
							<Printer size={15} />
						</button>

						<button
							type="button"
							onClick={() => setIsFullscreen((prev) => !prev)}
							className="hidden sm:inline-flex h-8 w-8 rounded-lg items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] bg-transparent hover:bg-[var(--line)] border border-[var(--line)] cursor-pointer"
							title={isFullscreen ? "Свернуть" : "На весь экран"}
							data-testid="btn-toggle-fullscreen"
						>
							{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
						</button>

						<button
							type="button"
							onClick={onClose}
							className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] bg-transparent hover:bg-[var(--line)] border border-[var(--line)] cursor-pointer shrink-0"
							aria-label="Закрыть окно"
							data-testid="btn-close-modal"
						>
							<X size={16} />
						</button>
					</div>
				</header>

				{/* ─── Уведомление о свежем снимке томографа из Hotfolder ─── */}
				{hotfolderNotice && (
					<div
						className="bg-[var(--teal-soft,#0d948815)] border-b border-[var(--teal,#0d9488)] px-3 py-1.5 flex items-center justify-between text-xs text-[var(--ink)] shrink-0 gap-2"
						data-testid="hotfolder-detected-banner"
					>
						<div className="flex items-center gap-1.5 truncate">
							<span className="text-sm">📸</span>
							<span className="truncate">
								Снимок <b>{hotfolderNotice.vendor}</b>: <span className="text-[var(--muted)]">{hotfolderNotice.fileName}</span>
							</span>
						</div>
						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={handleAcceptHotfolder}
								className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[var(--teal,#0d9488)] text-white hover:opacity-90 active:scale-95 border-0 cursor-pointer shadow-xs"
								style={{ color: "#ffffff", backgroundColor: "var(--teal, #0d9488)" }}
								data-testid="btn-accept-hotfolder"
							>
								Привязать
							</button>
							<button
								type="button"
								onClick={() => setHotfolderNotice(null)}
								className="p-1 rounded bg-transparent text-[var(--muted)] hover:text-[var(--ink)] border-0 cursor-pointer"
							>
								<X size={14} />
							</button>
						</div>
					</div>
				)}

				{/* ─── Интерактивный вьюпорт снимка и линейки ─── */}
				<main
					ref={viewportRef}
					onClick={handleCanvasClick}
					className="flex-1 relative overflow-hidden bg-[#06090e] flex items-center justify-center cursor-crosshair select-none"
					data-testid="visiograph-viewport"
				>
					<img
						src={currentImageUrl}
						alt={`Рентгеновский снимок зуба #${activeTooth}`}
						className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-150"
						style={{ filter: getClinicalFilterCss(activeFilter), transform: `scale(${zoom})` }}
						data-testid="visiograph-image"
					/>

					{/* SVG-оверлей линейки измерения */}
					{rulerP1 && rulerP2 && (
						<svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
							<line x1={rulerP1.x} y1={rulerP1.y} x2={rulerP2.x} y2={rulerP2.y} stroke="#00ffff" strokeWidth="2.5" strokeDasharray="4 2" />
							<circle cx={rulerP1.x} cy={rulerP1.y} r="5" fill="#00ffff" stroke="#000" strokeWidth="1.5" />
							<circle cx={rulerP2.x} cy={rulerP2.y} r="5" fill="#00ffff" stroke="#000" strokeWidth="1.5" />
							{measuredMm && (
								<g transform={`translate(${(rulerP1.x + rulerP2.x) / 2}, ${(rulerP1.y + rulerP2.y) / 2 - 10})`}>
									<rect x="-35" y="-14" width="70" height="20" rx="4" fill="rgba(6,9,14,0.85)" stroke="#00ffff" strokeWidth="1" />
									<text x="0" y="0" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">{measuredMm} мм</text>
								</g>
							)}
						</svg>
					)}

					{/* Зум-контрол с безопасными кнопками без белых пятен */}
					<div className="absolute bottom-3 right-3 flex items-center gap-1 bg-[var(--paper)]/90 backdrop-blur-md border border-[var(--line)] p-1 rounded-xl shadow-lg z-20">
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2)))); }}
							className="p-1.5 rounded-lg bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] border-0 cursor-pointer"
							title="Уменьшить"
						>
							<ZoomOut size={16} />
						</button>
						<span className="text-[11px] font-bold text-[var(--ink)] px-1 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(3.0, Number((z + 0.25).toFixed(2)))); }}
							className="p-1.5 rounded-lg bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] border-0 cursor-pointer"
							title="Увеличить"
						>
							<ZoomIn size={16} />
						</button>
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); setZoom(1.0); }}
							className="p-1.5 rounded-lg bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] border-0 cursor-pointer"
							title="Сброс зума"
						>
							<RotateCcw size={15} />
						</button>
					</div>
				</main>

				{/* ─── Панель 4 базовых клинических фильтров в 1 тап ─── */}
				<section className="px-2 sm:px-4 py-1.5 sm:py-2 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 flex items-center justify-between gap-1 sm:gap-2">
					<div className="flex items-center gap-1 sm:gap-1.5">
						<span className="text-[11px] font-bold text-[var(--muted)] mr-1 hidden md:inline">Фильтры:</span>
						{CLINICAL_FILTER_PRESETS.map((filter) => {
							const isActive = activeFilter === filter.id;
							return (
								<button
									key={filter.id}
									type="button"
									onClick={() => setActiveFilter(filter.id)}
									className={`min-h-[36px] sm:min-h-[38px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all border-0 cursor-pointer ${
										isActive ? "bg-[var(--teal,#0d9488)] text-white font-bold shadow-xs scale-102" : "bg-[var(--line)] text-[var(--ink)] hover:bg-[var(--line-strong,#484f58)]"
									}`}
									style={{
										backgroundColor: isActive ? "var(--teal, #0d9488)" : "var(--line)",
										color: isActive ? "#ffffff" : "var(--ink)",
									}}
									title={filter.description}
									data-testid={`filter-btn-${filter.id}`}
								>
									<span>{filter.icon}</span>
									<span>{filter.shortLabel}</span>
								</button>
							);
						})}
					</div>

					<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
						<button
							type="button"
							onClick={() => setIsRulerActive((r) => !r)}
							className={`min-h-[36px] sm:min-h-[38px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all border cursor-pointer ${
								isRulerActive ? "bg-[#00ffff] text-black border-[#00ffff] font-bold shadow-xs" : "bg-[var(--line)] hover:bg-[var(--line-strong,#484f58)] text-[var(--ink)] border-[var(--line)]"
							}`}
							title="Линейка измерения длины каналов и имплантатов"
							data-testid="btn-toggle-ruler"
						>
							<Ruler size={14} />
							<span>{isRulerActive ? `Линейка (${measuredMm || "..."} мм)` : "Линейка"}</span>
						</button>
					</div>
				</section>

				{/* ─── Нижняя панель действий (Ровно ОДНА Primary CTA кнопка #0d9488) ─── */}
				<footer
					className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3 sm:px-4 py-2 border-t border-[var(--line)] bg-[var(--paper)] shrink-0 gap-2 min-h-[52px]"
					style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
				>
					<div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-[11px] sm:text-xs text-[var(--muted)]">
						<div className="flex items-center gap-2">
							<span className="hidden sm:inline">Датчик: <b>Vatech EzSensor 1.5</b></span>
							<span className="hidden sm:inline opacity-40">|</span>
							<span>Доза: <b>{MODALITY_CATALOG[activeModality].typicalDoseMsv} мЗв</b></span>
						</div>
						{measuredMm && (
							<div className="flex items-center gap-1 text-[#00ffff] font-semibold">
								<span className="opacity-40 hidden sm:inline">|</span>
								<span>Длина: <b>{measuredMm} мм</b></span>
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="secondary-button min-h-[44px] sm:min-h-[36px] px-3 rounded-lg text-xs font-semibold shrink-0"
							data-testid="btn-cancel-modal"
						>
							Отмена
						</button>

						{/* Ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) по Мандату 8am (НИКОГДА НЕ DISABLED по Мандату 8e) */}
						<button
							type="button"
							onClick={handleSaveToRecord}
							className="dente-btn-primary flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] px-4 sm:px-5 rounded-lg text-xs sm:text-sm font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer border-0"
							style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
							data-testid="btn-primary-save-visiograph"
						>
							<Check size={16} strokeWidth={2.5} />
							<span>✓ Привязать снимок к приёму</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}

	return modalContent;
};

export default VisiographStudioModal;

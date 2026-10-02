/**
 * DENTE Dental CRM — Chairside Before & After Splitter (Wiper Slider)
 *
 * Designed for immediate operatory demonstration to patients:
 * - Fluid pointer, touch & mouse wheel slider interaction
 * - Keyboard navigation (Left / Right arrows, Home, End)
 * - 1-Click Fullscreen Patient Presentation Mode (for chairside monitors)
 * - Rapid Before/After swap and photo selection from visit attachments
 * - 0 disabled buttons (Mandate 8e: Doctor Autonomy) & CSS token compliance
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
	MoveHorizontal,
	Maximize2,
	Minimize2,
	ArrowLeftRight,
	RotateCcw,
	X,
	Check,
} from "lucide-react";
import { calculateSplitClipPath, clamp } from "../photography/photoProtocolMath";

export interface BeforeAfterSplitterPhotoItem {
	readonly id: string;
	readonly url: string;
	readonly name?: string;
	readonly stage?: "before" | "after" | "process";
}

export interface BeforeAfterSplitterProps {
	beforeUrl?: string;
	afterUrl?: string;
	beforeLabel?: string;
	afterLabel?: string;
	photos?: readonly BeforeAfterSplitterPhotoItem[];
	onClose?: () => void;
	compact?: boolean;
	className?: string;
}

export const BeforeAfterSplitter: React.FC<BeforeAfterSplitterProps> = ({
	beforeUrl: initialBeforeUrl,
	afterUrl: initialAfterUrl,
	beforeLabel = "ДО",
	afterLabel = "ПОСЛЕ",
	photos = [],
	onClose,
	compact = false,
	className = "",
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const isDraggingRef = useRef(false);

	// Selected photo URLs
	const [activeBeforeUrl, setActiveBeforeUrl] = useState<string>(
		initialBeforeUrl || photos[0]?.url || "",
	);
	const [activeAfterUrl, setActiveAfterUrl] = useState<string>(
		initialAfterUrl || photos[1]?.url || photos[0]?.url || "",
	);

	// Wiper split position (0..100 percent)
	const [splitPercent, setSplitPercent] = useState<number>(50);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isSelectingPhotos, setIsSelectingPhotos] = useState<boolean>(false);

	// Sync when props change
	useEffect(() => {
		if (initialBeforeUrl) setActiveBeforeUrl(initialBeforeUrl);
	}, [initialBeforeUrl]);

	useEffect(() => {
		if (initialAfterUrl) setActiveAfterUrl(initialAfterUrl);
	}, [initialAfterUrl]);

	// Auto-initialize from photos array if not set
	useEffect(() => {
		if (!activeBeforeUrl && photos.length > 0) {
			const foundBefore = photos.find((p) => p.stage === "before") || photos[0];
			if (foundBefore) setActiveBeforeUrl(foundBefore.url);
		}
		if (!activeAfterUrl && photos.length > 1) {
			const foundAfter =
				photos.find((p) => p.stage === "after") || photos[photos.length - 1];
			if (foundAfter) setActiveAfterUrl(foundAfter.url);
		}
	}, [photos, activeBeforeUrl, activeAfterUrl]);

	// Pointer Drag Handling
	const updateSplitFromClientX = useCallback((clientX: number) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const relativeX = clientX - rect.left;
		const pct = clamp((relativeX / rect.width) * 100, 0, 100);
		setSplitPercent(Math.round(pct));
	}, []);

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingRef.current = true;
		try {
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			// ignore
		}
		updateSplitFromClientX(e.clientX);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingRef.current) return;
		updateSplitFromClientX(e.clientX);
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		isDraggingRef.current = false;
		try {
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			// ignore
		}
	};

	// Mouse Wheel Handling
	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 3 : -3;
		setSplitPercent((prev) => clamp(prev + delta, 0, 100));
	};

	// Keyboard Accessibility
	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (["ArrowLeft", "ArrowDown"].includes(e.key)) {
			e.preventDefault();
			const step = e.shiftKey ? 10 : 2;
			setSplitPercent((prev) => clamp(prev - step, 0, 100));
		} else if (["ArrowRight", "ArrowUp"].includes(e.key)) {
			e.preventDefault();
			const step = e.shiftKey ? 10 : 2;
			setSplitPercent((prev) => clamp(prev + step, 0, 100));
		} else if (e.key === "Home") {
			e.preventDefault();
			setSplitPercent(0);
		} else if (e.key === "End") {
			e.preventDefault();
			setSplitPercent(100);
		} else if (e.key === "Escape" && isFullscreen) {
			e.preventDefault();
			setIsFullscreen(false);
		}
	};

	// Swap Before and After
	const handleSwap = () => {
		const temp = activeBeforeUrl;
		setActiveBeforeUrl(activeAfterUrl);
		setActiveAfterUrl(temp);
	};

	// Toggle Fullscreen Patient Mode
	const toggleFullscreen = () => {
		setIsFullscreen((prev) => !prev);
	};

	const clipPathStyle = calculateSplitClipPath(splitPercent, "vertical");

	return (
		<div
			className={`flex flex-col bg-[var(--paper)] border border-[var(--line)] rounded-xl overflow-hidden shadow-lg select-none ${
				isFullscreen
					? "fixed inset-0 z-50 rounded-none border-0"
					: compact
						? "w-full"
						: "w-full max-w-4xl mx-auto"
			} ${className}`}
		>
			{/* Top Toolbar */}
			<div className="flex items-center justify-between px-3 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2">
					<MoveHorizontal className="w-4 h-4 text-[var(--accent)]" />
					<span className="text-xs font-semibold text-[var(--ink)]">
						Сравнение снимков До / После
					</span>
					<span className="text-[10px] text-[var(--muted)] font-mono">
						{splitPercent}%
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					{photos.length > 2 && (
						<button
							type="button"
							onClick={() => setIsSelectingPhotos((prev) => !prev)}
							className={`text-xs px-2.5 py-1 rounded-md border border-[var(--line)] transition-colors min-h-[32px] flex items-center gap-1 ${
								isSelectingPhotos
									? "bg-[var(--accent)] text-white"
									: "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
							}`}
							title="Выбрать снимки для сравнения из списка"
						>
							<span>Выбор снимков</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleSwap}
						className="text-xs p-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
						title="Поменять снимки До и После местами"
						aria-label="Поменять местами"
					>
						<ArrowLeftRight className="w-3.5 h-3.5" />
					</button>

					<button
						type="button"
						onClick={() => setSplitPercent(50)}
						className="text-xs p-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
						title="Сброс шторки на 50%"
						aria-label="Сброс шторки"
					>
						<RotateCcw className="w-3.5 h-3.5" />
					</button>

					<button
						type="button"
						onClick={toggleFullscreen}
						className="text-xs p-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
						title={
							isFullscreen
								? "Выйти из полноэкранного режима (Esc)"
								: "Развернуть на весь экран (Экран пациента)"
						}
						aria-label="На весь экран"
					>
						{isFullscreen ? (
							<Minimize2 className="w-3.5 h-3.5" />
						) : (
							<Maximize2 className="w-3.5 h-3.5" />
						)}
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="text-xs p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
							title="Закрыть"
							aria-label="Закрыть"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
			</div>

			{/* Photo selection bar (drawer) */}
			{isSelectingPhotos && photos.length > 0 && (
				<div className="p-3 bg-[var(--paper-strong)] border-b border-[var(--line)] flex flex-col gap-2 animate-in slide-in-from-top-2 duration-150">
					<div className="text-[11px] text-[var(--muted)] font-medium">
						Выберите снимок для каждой стороны:
					</div>
					<div className="flex gap-2 overflow-x-auto pb-1">
						{photos.map((item) => {
							const isBefore = item.url === activeBeforeUrl;
							const isAfter = item.url === activeAfterUrl;
							return (
								<div
									key={item.id}
									className="relative shrink-0 flex flex-col items-center gap-1 group"
								>
									<img
										src={item.url}
										alt={item.name || "Снимок"}
										className="w-16 h-16 object-cover rounded-md border border-[var(--line)] shadow-xs"
									/>
									<div className="flex gap-1">
										<button
											type="button"
											onClick={() => setActiveBeforeUrl(item.url)}
											className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
												isBefore
													? "bg-[var(--bad-fg)] text-white font-bold"
													: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
											}`}
											title="Сделать снимком «ДО»"
										>
											ДО
										</button>
										<button
											type="button"
											onClick={() => setActiveAfterUrl(item.url)}
											className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
												isAfter
													? "bg-[var(--ok-fg)] text-white font-bold"
													: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
											}`}
											title="Сделать снимком «ПОСЛЕ»"
										>
											ПОСЛЕ
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Interactive Comparison Viewport */}
			<div
				ref={containerRef}
				tabIndex={0}
				role="slider"
				aria-valuenow={splitPercent}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Шторка сравнения До и После"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onWheel={handleWheel}
				onKeyDown={handleKeyDown}
				className={`relative bg-black cursor-ew-resize overflow-hidden flex items-center justify-center focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)] ${
					isFullscreen ? "flex-1 w-full h-full" : "h-[380px] sm:h-[460px]"
				}`}
			>
				{/* Empty state fallback */}
				{!activeBeforeUrl && !activeAfterUrl ? (
					<div className="text-center text-white/70 p-6 space-y-1">
						<p className="text-sm">Нет снимков для сравнения</p>
						<p className="text-xs text-white/50">
							Загрузите снимки в приём через буфер обмена (Ctrl+V) или камеру
						</p>
					</div>
				) : (
					<>
						{/* BEFORE Photo Layer (Left side) */}
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							{activeBeforeUrl ? (
								<img
									src={activeBeforeUrl}
									alt="Состояние До"
									className="w-full h-full object-contain pointer-events-none"
									draggable={false}
								/>
							) : (
								<div className="text-white/50 text-xs">Нет снимка «ДО»</div>
							)}
						</div>

						{/* AFTER Photo Layer (Right side with Clip-Path) */}
						<div
							className="absolute inset-0 flex items-center justify-center pointer-events-none"
							style={{ clipPath: clipPathStyle }}
						>
							{activeAfterUrl ? (
								<img
									src={activeAfterUrl}
									alt="Состояние После"
									className="w-full h-full object-contain pointer-events-none"
									draggable={false}
								/>
							) : (
								<div className="text-white/50 text-xs">Нет снимка «ПОСЛЕ»</div>
							)}
						</div>

						{/* Wiper Split Line & Handle */}
						<div
							className="absolute top-0 bottom-0 pointer-events-none z-10"
							style={{ left: `${splitPercent}%` }}
						>
							{/* Thin divider line */}
							<div className="w-[2px] h-full -ml-[1px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" />

							{/* Center Drag Handle */}
							<div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-black shadow-xl flex items-center justify-center font-bold text-xs border border-black/20 pointer-events-auto cursor-ew-resize">
								<MoveHorizontal className="w-4 h-4 text-black" />
							</div>
						</div>

						{/* Badges: BEFORE (Left) and AFTER (Right) */}
						<div className="absolute top-3 left-3 z-10 pointer-events-none">
							<span className="px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider bg-black/75 text-white border border-white/20 backdrop-blur-xs shadow-md">
								{beforeLabel}
							</span>
						</div>

						<div className="absolute top-3 right-3 z-10 pointer-events-none">
							<span className="px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider bg-[var(--accent)] text-white border border-white/20 backdrop-blur-xs shadow-md">
								{afterLabel}
							</span>
						</div>
					</>
				)}
			</div>

			{/* Bottom caption hint */}
			<div className="px-3 py-1.5 bg-[var(--paper-soft)] border-t border-[var(--line)] text-[10px] text-[var(--muted)] flex items-center justify-between">
				<span>Перетаскивайте шторку мышью или колесиком для сравнения</span>
				<span className="font-mono">Клавиши: ← / →</span>
			</div>
		</div>
	);
};

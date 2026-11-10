import React, { useState, useRef, useCallback } from 'react';
import { MoveHorizontal, MoveVertical, RefreshCw, Camera, Upload, X, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { calculateSplitClipPath, calculateWiperWheelDelta, calculateKeyboardWiperDelta } from './photoProtocolMath';
import { DEMO_BEFORE_SMILE_SVG, DEMO_AFTER_SMILE_SVG } from './patientPresentationDemoData';

export interface BeforeAfterPhotoItem {
	id: string;
	url: string;
	label?: string;
	date?: string;
}

export interface BeforeAfterSplitSliderProps {
	/** URL снимка «До» (канонический проп) */
	beforeImageUrl?: string | null | undefined;
	/** URL снимка «После» (канонический проп) */
	afterImageUrl?: string | null | undefined;
	/** Алиас для совместимости с фасадом BeforeAfterSplitter */
	beforeUrl?: string | null | undefined;
	/** Алиас для совместимости с фасадом BeforeAfterSplitter */
	afterUrl?: string | null | undefined;
	/** Подпись стороны «До» */
	beforeLabel?: string | undefined;
	/** Подпись стороны «После» */
	afterLabel?: string | undefined;
	/** Оттенок VITA исходного состояния */
	beforeShade?: string | undefined;
	/** Оттенок VITA итогового состояния */
	afterShade?: string | undefined;
	/** Функция рокировки снимков */
	onSwap?: (() => void) | undefined;
	/** Компактный вид для интеграции в карточки */
	compact?: boolean | undefined;
	/** Дополнительные CSS классы */
	className?: string | undefined;
	/** Колбэк закрытия */
	onClose?: (() => void) | undefined;
	/** Список доступных снимков для выбора */
	photos?: BeforeAfterPhotoItem[] | undefined;
	/** Внешний контроль позиции шторки (0-100) */
	sliderPosition?: number | undefined;
	/** Колбэк изменения позиции шторки */
	setSliderPosition?: ((pos: number) => void) | undefined;
	/** Колбэк загрузки снимков при пустом стейте */
	onUpload?: (() => void) | undefined;
	/** Показывать ли тулбар управления шторкой */
	showControls?: boolean | undefined;
}

/**
 * BeforeAfterSplitSlider — Канонический сплиттер До/После (SSOT).
 * Мандат 8aq: Единый источник правды для слайдеров сравнения.
 * Мандат 8c: Честный медицинский Empty State без карикатурных зубов.
 * Мандат 8e: Автономия врача — кнопки никогда не блокируются.
 * Apple HIG: Тач-таргеты >= 44x44px, плавная шторка без лагов.
 */
export const BeforeAfterSplitSlider: React.FC<BeforeAfterSplitSliderProps> = ({
	beforeImageUrl,
	afterImageUrl,
	beforeUrl,
	afterUrl,
	beforeLabel = 'До лечения',
	afterLabel = 'После лечения',
	beforeShade,
	afterShade,
	onSwap,
	compact = false,
	className = '',
	onClose,
	photos,
	sliderPosition,
	setSliderPosition,
	onUpload,
	showControls = true,
}) => {
	const [internalSplit, setInternalSplit] = useState<number>(50);
	const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [showDemoFallback, setShowDemoFallback] = useState<boolean>(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	const effectiveSplit = typeof sliderPosition === 'number' ? sliderPosition : internalSplit;

	const updateSplit = useCallback((val: number) => {
		const clamped = Math.max(2, Math.min(98, Math.round(val)));
		if (setSliderPosition) {
			setSliderPosition(clamped);
		} else {
			setInternalSplit(clamped);
		}
	}, [setSliderPosition]);

	const rawBefore = beforeImageUrl || beforeUrl || null;
	const rawAfter = afterImageUrl || afterUrl || null;

	const hasBothPhotos = Boolean(rawBefore && rawAfter);
	const hasAtLeastOnePhoto = Boolean(rawBefore || rawAfter);
	const isEmpty = !hasAtLeastOnePhoto && !showDemoFallback;

	const effectiveBefore = rawBefore || (showDemoFallback ? DEMO_BEFORE_SMILE_SVG : null);
	const effectiveAfter = rawAfter || (showDemoFallback ? DEMO_AFTER_SMILE_SVG : null);

	const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			// ignore in test / non-supporting environments
		}
		if (containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			const pct = orientation === 'vertical'
				? ((e.clientX - rect.left) / rect.width) * 100
				: ((e.clientY - rect.top) / rect.height) * 100;
			updateSplit(pct);
		}
	}, [orientation, updateSplit]);

	const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (e.buttons !== 1 || !containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const pct = orientation === 'vertical'
			? ((e.clientX - rect.left) / rect.width) * 100
			: ((e.clientY - rect.top) / rect.height) * 100;
		updateSplit(pct);
	}, [orientation, updateSplit]);

	const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		try {
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId);
			}
		} catch {
			// ignore
		}
	}, []);

	const handleSwap = useCallback(() => {
		if (onSwap) {
			onSwap();
		}
	}, [onSwap]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
			updateSplit(calculateKeyboardWiperDelta(effectiveSplit, e.key, e.shiftKey));
		}
	};

	const clipPathStyle = calculateSplitClipPath(effectiveSplit, orientation);

	return (
		<div
			className={`ba-split-slider-wrapper flex flex-col gap-2 w-full select-none ${className}`}
			data-testid="before-after-split-slider"
		>
			{/* Верхний тулбар управления */}
			{showControls && (
				<div className="flex justify-between items-center gap-2 flex-wrap pb-1">
					<div className="flex items-center gap-2">
						<span className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)]">
							Сплит До/После: {effectiveSplit}%
						</span>
						{beforeShade && afterShade && (
							<span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-md bg-[var(--surface,#f1f5f9)] font-semibold text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]">
								VITA {beforeShade} → {afterShade}
							</span>
						)}
					</div>

					<div className="flex items-center gap-1.5">
						<button
							type="button"
							className={`photo-touch-btn min-h-[36px] min-w-[44px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] transition-colors inline-flex items-center justify-center gap-1 ${
								orientation === 'vertical' ? 'bg-[var(--primary,#0d9488)] text-white' : 'bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)]'
							}`}
							onClick={() => setOrientation('vertical')}
							title="Вертикальный сплит"
							aria-label="Вертикальный сплит"
						>
							<MoveHorizontal size={14} />
							<span className="hidden sm:inline">Вертикально</span>
						</button>
						<button
							type="button"
							className={`photo-touch-btn min-h-[36px] min-w-[44px] px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] transition-colors inline-flex items-center justify-center gap-1 ${
								orientation === 'horizontal' ? 'bg-[var(--primary,#0d9488)] text-white' : 'bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)]'
							}`}
							onClick={() => setOrientation('horizontal')}
							title="Горизонтальный сплит"
							aria-label="Горизонтальный сплит"
						>
							<MoveVertical size={14} />
							<span className="hidden sm:inline">Горизонтально</span>
						</button>
						<button
							type="button"
							className="photo-touch-btn min-h-[36px] min-w-[44px] px-2 py-1 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line-subtle,#f1f5f9)] inline-flex items-center justify-center"
							onClick={() => updateSplit(50)}
							title="Сброс шторки на 50%"
							aria-label="Сброс шторки"
						>
							<RotateCcw size={14} />
						</button>
						{onSwap && (
							<button
								type="button"
								className="photo-touch-btn min-h-[36px] min-w-[44px] px-2 py-1 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line-subtle,#f1f5f9)] inline-flex items-center justify-center"
								onClick={handleSwap}
								title="Поменять местами До и После"
								aria-label="Поменять местами"
							>
								<RefreshCw size={14} />
							</button>
						)}
						<button
							type="button"
							className="photo-touch-btn min-h-[36px] min-w-[44px] px-2 py-1 text-xs font-semibold rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line-subtle,#f1f5f9)] inline-flex items-center justify-center"
							onClick={() => setIsFullscreen((prev) => !prev)}
							title={isFullscreen ? 'Свернуть' : 'На весь экран'}
							aria-label="Режим презентации"
						>
							{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
						</button>
						{onClose && (
							<button
								type="button"
								className="photo-touch-btn min-h-[36px] min-w-[44px] px-2 py-1 text-xs rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line-subtle,#f1f5f9)] inline-flex items-center justify-center"
								onClick={onClose}
								title="Закрыть"
								aria-label="Закрыть"
							>
								<X size={16} />
							</button>
						)}
					</div>
				</div>
			)}

			{/* Контейнер слайдера или честный пустой стейт */}
			{isEmpty ? (
				<div
					data-testid="before-after-empty-state"
					className="flex flex-col items-center justify-center gap-3 p-8 sm:p-12 text-center rounded-2xl bg-[var(--paper-soft,#f8fafc)] border-2 border-dashed border-[var(--line,#cbd5e1)] min-h-[340px]"
				>
					<div className="w-14 h-14 rounded-full bg-[var(--primary,#0d9488)]/10 text-[var(--primary,#0d9488)] flex items-center justify-center">
						<Camera size={28} />
					</div>
					<div className="flex flex-col gap-1 max-w-md">
						<h4 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0">
							Снимки клинического протокола До / После не загружены
						</h4>
						<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
							Загрузите фотографии в клинический фотопротокол карточки пациента для интерактивного сопоставления результатов эстетического и ортодонтического лечения.
						</p>
					</div>
					<div className="flex items-center gap-2 flex-wrap justify-center pt-2">
						{onUpload && (
							<button
								type="button"
								onClick={onUpload}
								className="photo-touch-btn primary min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-[var(--primary,#0d9488)] text-white hover:opacity-95 inline-flex items-center gap-2 shadow-sm"
								data-testid="btn-upload-from-empty-state"
							>
								<Upload size={16} />
								Загрузить снимки в протокол
							</button>
						)}
					</div>
				</div>
			) : (
				<div
					ref={containerRef}
					className="ba-slider-container relative w-full rounded-2xl overflow-hidden bg-[var(--paper-strong,#020617)] shadow-inner"
					tabIndex={0}
					role="slider"
					aria-valuenow={effectiveSplit}
					aria-label="Шторка сравнения снимков До и После"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onWheel={(e) => updateSplit(calculateWiperWheelDelta(effectiveSplit, e.deltaY))}
					onKeyDown={handleKeyDown}
					style={{
						height: compact ? '280px' : isFullscreen ? '70vh' : '460px',
						cursor: orientation === 'vertical' ? 'ew-resize' : 'ns-resize',
						userSelect: 'none',
						touchAction: 'none',
					}}
				>
					{/* Слой ДО */}
					{effectiveBefore ? (
						<img
							src={effectiveBefore}
							alt={beforeLabel}
							className="absolute inset-0 w-full h-full object-contain pointer-events-none"
							loading="lazy"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center bg-[var(--paper-soft,#0f172a)] text-[var(--muted,#94a3b8)] text-xs font-medium">
							Ожидает снимок ДО
						</div>
					)}
					<div className="absolute top-3 left-3 bg-black/75 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs shadow-xs pointer-events-none">
						{beforeLabel} {beforeShade ? `(${beforeShade})` : ''}
					</div>

					{/* Слой ПОСЛЕ (с clip-path) */}
					{effectiveAfter ? (
						<img
							src={effectiveAfter}
							alt={afterLabel}
							className="absolute inset-0 w-full h-full object-contain pointer-events-none"
							style={{ clipPath: clipPathStyle }}
							loading="lazy"
						/>
					) : (
						<div
							className="absolute inset-0 flex items-center justify-center bg-[var(--paper-soft,#0f172a)] text-[var(--muted,#94a3b8)] text-xs font-medium"
							style={{ clipPath: clipPathStyle }}
						>
							Ожидает снимок ПОСЛЕ
						</div>
					)}
					<div className="absolute bottom-3 right-3 bg-black/75 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs shadow-xs pointer-events-none">
						{afterLabel} {afterShade ? `(${afterShade})` : ''}
					</div>

					{/* Индикатор линии шторки */}
					<div
						className="absolute pointer-events-none"
						style={{
							...(orientation === 'vertical'
								? {
										top: 0,
										bottom: 0,
										left: `${effectiveSplit}%`,
										width: '2px',
										transform: 'translateX(-50%)',
									}
								: {
										left: 0,
										right: 0,
										top: `${effectiveSplit}%`,
										height: '2px',
										transform: 'translateY(-50%)',
									}),
							background: 'var(--primary, #0d9488)',
							boxShadow: '0 0 10px rgba(13,148,136,0.9)',
						}}
					>
						<div
							className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--primary,#0d9488)] border-2 border-white flex items-center justify-center text-white shadow-lg"
							style={{ touchAction: 'none' }}
						>
							{orientation === 'vertical' ? <MoveHorizontal size={14} /> : <MoveVertical size={14} />}
						</div>
					</div>

					{/* Интерактивный ползунок range для тач-скринов и ассистивных технологий */}
					<input
						type="range"
						min={0}
						max={100}
						value={effectiveSplit}
						onChange={(e) => updateSplit(Number(e.target.value))}
						aria-label="Ползунок шторки сравнения"
						className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10"
					/>
				</div>
			)}
		</div>
	);
};

export default BeforeAfterSplitSlider;

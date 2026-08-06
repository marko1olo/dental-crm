import React, {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

interface ShadowAnalystImageSliderProps {
	imageUrl: string;
	enhanced?: boolean;
	/**
	 * Яркость, контраст, инверсия, поворот и масштаб из панели просмотра.
	 *
	 * Панель считала эти значения и передавала их в ImagingView, где их
	 * разбирали из пропсов и не применяли ни к чему. Врач крутил ползунки,
	 * нажимал поворот — снимок не менялся. Ползунки двигались, и это выглядело
	 * как работающий инструмент.
	 *
	 * Значения приходят готовой строкой CSS и попадают в переменные, чтобы
	 * сложиться с фильтром обработки в таблице стилей, а не затереть его:
	 * усиление контраста нужно поверх настроек врача, а не вместо.
	 */
	viewerStyle?: CSSProperties;
}

export function ShadowAnalystImageSlider({
	imageUrl,
	enhanced = true,
	viewerStyle,
}: ShadowAnalystImageSliderProps) {
	const [sliderPos, setSliderPos] = useState(50);
	const [isDragging, setIsDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const calcPos = useCallback((clientX: number) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		let pos = ((clientX - rect.left) / rect.width) * 100;
		pos = Math.max(0, Math.min(pos, 100));
		setSliderPos(pos);
	}, []);

	// Global mouse tracking while dragging (so it doesn't break if cursor leaves container)
	useEffect(() => {
		if (!isDragging) return;
		const onMove = (e: MouseEvent) => calcPos(e.clientX);
		const onUp = () => setIsDragging(false);
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [isDragging, calcPos]);

	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging(true);
		calcPos(e.clientX);
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (e.touches && e.touches[0]) {
			calcPos(e.touches[0].clientX);
		}
	};

	/*
	 * Настройки просмотра уходят в переменные CSS, а не в свойства картинки.
	 *
	 * Слой обработки уже несёт свой фильтр в таблице стилей. Если положить сюда
	 * filter напрямую, он этот фильтр заменит, и включённая обработка перестанет
	 * быть видна ровно в тот момент, когда врач тронет яркость. Через переменные
	 * оба фильтра складываются в одну строку прямо в CSS.
	 */
	const viewerVariables = {
		"--sa-viewer-filter": (viewerStyle?.filter as string) ?? "none",
		"--sa-viewer-transform": (viewerStyle?.transform as string) ?? "none",
	} as CSSProperties;

	if (!enhanced) {
		return (
			<div
				className="sa-image-container"
				ref={containerRef}
				style={viewerVariables}
			>
				<img
					src={imageUrl}
					alt="Рентгеновский снимок"
					className="sa-img-original"
				/>
			</div>
		);
	}

	return (
		<div
			className="sa-image-container"
			ref={containerRef}
			onMouseDown={handleMouseDown}
			onTouchMove={handleTouchMove}
			style={{
				...viewerVariables,
				cursor: isDragging ? "grabbing" : "col-resize",
			}}
		>
			{/* Исходный снимок — нижний слой */}
			<img
				src={imageUrl}
				alt="Снимок без обработки"
				className="sa-img-original"
			/>

			{/* Обработанный снимок — обрезан по положению разделителя */}
			<div
				className="sa-img-enhanced-wrapper"
				style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
			>
				<img
					src={imageUrl}
					alt="Снимок с усилением контраста"
					className="sa-img-enhanced"
				/>
			</div>

			{/* Подписи по сторонам разделителя */}
			<span className="sa-label sa-label--left">Оригинал</span>
			<span className="sa-label sa-label--right">С обработкой</span>

			{/* Divider handle */}
			<div
				className="sa-slider-handle"
				style={{ left: `${sliderPos}%` }}
				onMouseDown={handleMouseDown}
			>
				<div className="sa-slider-line" />
				<div className="sa-slider-button">
					<svg
						viewBox="0 0 24 24"
						width="14"
						height="14"
						stroke="currentColor"
						strokeWidth="2.5"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="8 17 3 12 8 7" />
						<polyline points="16 7 21 12 16 17" />
					</svg>
				</div>
			</div>
		</div>
	);
}

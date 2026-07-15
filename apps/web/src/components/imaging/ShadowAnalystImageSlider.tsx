import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ShadowAnalystImageSliderProps {
	imageUrl: string;
	enhanced?: boolean;
}

export function ShadowAnalystImageSlider({
	imageUrl,
	enhanced = true,
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

	if (!enhanced) {
		return (
			<div className="sa-image-container" ref={containerRef}>
				<img src={imageUrl} alt="X-Ray" className="sa-img-original" />
			</div>
		);
	}

	return (
		<div
			className="sa-image-container"
			ref={containerRef}
			onMouseDown={handleMouseDown}
			onTouchMove={handleTouchMove}
			style={{ cursor: isDragging ? "grabbing" : "col-resize" }}
		>
			{/* ORIGINAL — base layer */}
			<img src={imageUrl} alt="Original X-Ray" className="sa-img-original" />

			{/* ENHANCED — CSS-filtered layer, clipped to the right of slider */}
			<div
				className="sa-img-enhanced-wrapper"
				style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
			>
				<img src={imageUrl} alt="Enhanced X-Ray" className="sa-img-enhanced" />
			</div>

			{/* Labels */}
			<span className="sa-label sa-label--left">Оригинал</span>
			<span className="sa-label sa-label--right">Enhanced</span>

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

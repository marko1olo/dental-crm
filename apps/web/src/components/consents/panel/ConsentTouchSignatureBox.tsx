import { RotateCcw } from "lucide-react";
import React from "react";
import {
	getPointerCoordinates,
	renderStrokeToSvgPath,
	type SignaturePoint,
	type SignatureStroke,
} from "../signaturePadMath.js";

export interface ConsentTouchSignatureBoxProps {
	strokeColor: string;
	strokes: SignatureStroke[];
	setStrokes: React.Dispatch<React.SetStateAction<SignatureStroke[]>>;
	currentPoints: SignaturePoint[];
	setCurrentPoints: React.Dispatch<React.SetStateAction<SignaturePoint[]>>;
	isDrawing: boolean;
	setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ConsentTouchSignatureBox: React.FC<ConsentTouchSignatureBoxProps> = ({
	strokeColor,
	strokes,
	setStrokes,
	currentPoints,
	setCurrentPoints,
	isDrawing,
	setIsDrawing,
}) => {
	const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
		e.preventDefault();
		(e.target as Element).setPointerCapture?.(e.pointerId);
		const pt = getPointerCoordinates(e, e.currentTarget);
		setCurrentPoints([pt]);
		setIsDrawing(true);
	};

	const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
		if (!isDrawing) return;
		e.preventDefault();
		const pt = getPointerCoordinates(e, e.currentTarget);
		setCurrentPoints((prev) => [...prev, pt]);
	};

	const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
		if (!isDrawing) return;
		e.preventDefault();
		try {
			(e.target as Element).releasePointerCapture?.(e.pointerId);
		} catch {}
		setIsDrawing(false);
		if (currentPoints.length > 0) {
			setStrokes((prev) => [...prev, { points: currentPoints, color: strokeColor }]);
			setCurrentPoints([]);
		}
	};

	return (
		<div className="consent-touch-signature-box">
			<button
				type="button"
				className="consent-signature-clear-btn"
				data-testid="btn-clear-vector-strokes"
				onClick={() => {
					setStrokes([]);
					setCurrentPoints([]);
				}}
				title="Очистить росчерк подписи"
			>
				<RotateCcw size={13} />
				<span>Очистить</span>
			</button>

			<svg
				data-testid="consent-vector-pad-svg"
				className="consent-touch-signature-svg"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerLeave={handlePointerUp}
			>
				<line x1="20" y1="145" x2="95%" y2="145" stroke="var(--line-strong, #94a3b8)" strokeWidth="1.2" strokeDasharray="5,5" opacity="0.6" />
				{strokes.length === 0 && currentPoints.length === 0 && (
					<text x="50%" y="125" textAnchor="middle" dominantBaseline="middle" fill="var(--muted, #94a3b8)" fontSize="14" fontWeight="500" style={{ pointerEvents: "none", userSelect: "none" }}>
						Подпись пациента (распишитесь стилусом или пальцем)
					</text>
				)}
				{strokes.map((stroke, sIdx) => {
					if (stroke.points.length === 1 && stroke.points[0]) {
						return <circle key={sIdx} cx={stroke.points[0].x} cy={stroke.points[0].y} r={1.8} fill="currentColor" />;
					}
					const d = renderStrokeToSvgPath(stroke.points);
					if (!d) return null;
					return <path key={sIdx} d={d} fill="none" className="consent-signature-stroke-path" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />;
				})}
				{currentPoints.length > 1 && (
					<path d={renderStrokeToSvgPath(currentPoints)} fill="none" stroke="var(--teal, #0d9488)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
				)}
			</svg>
		</div>
	);
};

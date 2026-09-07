import type React from "react";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";

export interface Point {
	x: number;
	y: number;
	time: number;
}

export interface Stroke {
	points: Point[];
	color: string;
	width: number;
}

export interface SignaturePadProps {
	width?: number;
	height?: number;
	strokeColor?: string;
	strokeWidth?: number;
	placeholderText?: string;
	onSignatureChange?: (svgData: string, strokeCount: number) => void;
	className?: string;
}

/**
 * Converts an array of Strokes to an SVG string containing smoothed quadratic bezier curves
 */
export function strokesToSvg(
	strokes: Stroke[],
	width: number,
	height: number,
	strokeColor = "#0f172a",
): string {
	if (!strokes.length) return "";

	const paths = strokes
		.map((stroke) => {
			const pts = stroke.points;
			if (!pts || pts.length === 0) return "";
			if (pts.length === 1) {
				const pt = pts[0];
				if (!pt) return "";
				return `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${(stroke.width / 2).toFixed(1)}" fill="${stroke.color || strokeColor}" />`;
			}

			let d = `M ${pts[0]?.x.toFixed(1)} ${pts[0]?.y.toFixed(1)}`;
			for (let i = 1; i < pts.length; i++) {
				const p0 = pts[i - 1];
				const p1 = pts[i];
				if (!p0 || !p1) continue;
				const midX = (p0.x + p1.x) / 2;
				const midY = (p0.y + p1.y) / 2;
				d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
			}
			const lastPt = pts[pts.length - 1];
			if (lastPt) {
				d += ` T ${lastPt.x.toFixed(1)} ${lastPt.y.toFixed(1)}`;
			}

			return `<path d="${d}" fill="none" stroke="${stroke.color || strokeColor}" stroke-width="${stroke.width.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" />`;
		})
		.filter(Boolean)
		.join("\n  ");

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n  ${paths}\n</svg>`;
}

const DEFAULT_PORTAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 180" width="380" height="180">
  <rect width="100%" height="100%" fill="#f8fafc" stroke="#10b981" stroke-width="1.5" rx="8"/>
  <text x="190" y="80" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">ПОДПИСАНО В ПОРТАЛЕ ПАЦИЕНТА</text>
  <text x="190" y="105" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#065f46">ПЭП 63-ФЗ ст. 5 • Авторизованный вход</text>
</svg>`;

/**
 * @deprecated Legacy canvas finger-drawing eradicated per Mandates 8e, 8k, 8n (CRM != Reality Simulator).
 * Provided as 1-click PEP confirmation; no canvas drawing required.
 */
export const SignaturePadCanvas: React.FC<SignaturePadProps> = ({
	height = 180,
	placeholderText = "Подтверждение подписи в личном кабинете",
	onSignatureChange,
	className,
}) => {
	const [confirmed, setConfirmed] = useState(false);

	const handleConfirm = () => {
		setConfirmed(true);
		onSignatureChange?.(DEFAULT_PORTAL_SVG, 1);
	};

	const handleClear = () => {
		setConfirmed(false);
		onSignatureChange?.("", 0);
	};

	return (
		<div className={`signature-pad-container ${className || ""}`}>
			<div
				className="signature-pad-canvas-wrapper flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-center"
				style={{ minHeight: height }}
			>
				{confirmed ? (
					<div className="space-y-1">
						<div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
							<ShieldCheck size={16} />
							<span>✓ Подпись подтверждена (ПЭП 63-ФЗ)</span>
						</div>
						<p className="text-[11px] text-slate-500">Авторизовано через личный кабинет пациента</p>
					</div>
				) : (
					<div className="space-y-2">
						<p className="text-xs text-slate-600 dark:text-slate-300">
							{placeholderText}
						</p>
						<button
							type="button"
							onClick={handleConfirm}
							className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all cursor-pointer shadow-sm"
						>
							<ShieldCheck size={14} />
							<span>Подтвердить подпись в 1 клик (ПЭП)</span>
						</button>
					</div>
				)}
			</div>
			{confirmed && (
				<div className="flex justify-end pt-1">
					<button
						type="button"
						onClick={handleClear}
						className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
					>
						Сбросить
					</button>
				</div>
			)}
		</div>
	);
};

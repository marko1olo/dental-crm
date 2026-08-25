import React, { useState, useRef, useEffect, useMemo } from "react";
import {
	Activity,
	Contrast,
	Expand,
	Eye,
	Maximize2,
	RefreshCw,
	Scan,
	Sparkles,
	Sun,
	ZoomIn,
} from "lucide-react";
import { showToast } from "../GlobalToast";

export interface ToothRvgThumbnailProps {
	toothNumber: number;
	patientId?: string | undefined;
	scanImageUrl?: string | undefined;
	capturedAtIso?: string | undefined;
	onOpenFullRadiology?: ((toothNumber: number) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const ToothRvgThumbnail: React.FC<ToothRvgThumbnailProps> = ({
	toothNumber,
	patientId,
	scanImageUrl,
	capturedAtIso,
	onOpenFullRadiology,
	onInsertToProtocol,
}) => {
	const [isInverted, setIsInverted] = useState<boolean>(false);
	const [contrast, setContrast] = useState<number>(100);
	const [brightness, setBrightness] = useState<number>(100);
	const [isZoomedApex, setIsZoomedApex] = useState<boolean>(false);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// Synthetic clean SVG periapical X-ray pattern for fallback when no image URL provided
	const fallbackSvgDataUri = useMemo(() => {
		const isMolar = (toothNumber % 10) >= 6;
		const isLower = toothNumber > 30;
		const rootsSvg = isMolar
			? isLower
				? `<path d="M70,90 Q65,150 60,175 Q68,175 75,150 Q85,115 100,105 Q115,115 125,150 Q132,175 140,175 Q135,150 130,90 Z" fill="#111827" stroke="#94a3b8" stroke-width="2"/>
				   <circle cx="60" cy="175" r="7" fill="#ef4444" opacity="0.6"/>
				   <circle cx="140" cy="175" r="7" fill="#ef4444" opacity="0.6"/>`
				: `<path d="M60,110 Q50,50 45,25 Q55,25 65,50 Q85,85 100,95 Q115,85 135,50 Q145,25 155,25 Q150,50 140,110 Z" fill="#111827" stroke="#94a3b8" stroke-width="2"/>
				   <circle cx="45" cy="25" r="7" fill="#ef4444" opacity="0.6"/>
				   <circle cx="155" cy="25" r="7" fill="#ef4444" opacity="0.6"/>`
			: `<path d="M85,90 Q90,165 100,185 Q110,165 115,90 Z" fill="#111827" stroke="#94a3b8" stroke-width="2"/>
			   <circle cx="100" cy="185" r="8" fill="#ef4444" opacity="0.6"/>`;

		const crownSvg = isLower
			? `<path d="M55,90 C55,60 145,60 145,90 C145,110 55,110 55,90 Z" fill="#334155" stroke="#cbd5e1" stroke-width="2.5"/>`
			: `<path d="M55,110 C55,140 145,140 145,110 C145,90 55,90 55,110 Z" fill="#334155" stroke="#cbd5e1" stroke-width="2.5"/>`;

		const svgContent = `
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
				<rect width="200" height="200" fill="#030712"/>
				<!-- Bone trabeculae noise background -->
				<g opacity="0.25" stroke="#64748b" stroke-width="0.75">
					<line x1="20" y1="30" x2="60" y2="40"/>
					<line x1="140" y1="40" x2="180" y2="50"/>
					<line x1="10" y1="160" x2="50" y2="180"/>
					<line x1="150" y1="170" x2="190" y2="160"/>
					<line x1="80" y1="190" x2="120" y2="195"/>
				</g>
				${rootsSvg}
				${crownSvg}
				<text x="10" y="24" fill="#94a3b8" font-family="monospace" font-size="12" font-weight="bold">RVG #${toothNumber}</text>
				<text x="10" y="190" fill="#94a3b8" font-family="sans-serif" font-size="10">Apex 0.0 OK</text>
				<text x="140" y="190" fill="#94a3b8" font-family="monospace" font-size="10">21.5mm</text>
			</svg>
		`;

		return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
	}, [toothNumber]);

	const imageSrc = scanImageUrl || fallbackSvgDataUri;

	const handleResetFilters = () => {
		setIsInverted(false);
		setContrast(100);
		setBrightness(100);
		setIsZoomedApex(false);
	};

	const handleCopyXrayReport = () => {
		const text = `Визиографический контроль зуба #${toothNumber}: периодонтальная щель прослеживается, деструкции костной ткани в периапикальной области не выявлено. Длина канала: 21.5 мм.`;
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Заключение визиографа зуба #${toothNumber} вставлено в 043/у!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(text);
				showToast("Заключение скопировано в буфер", "success");
			} catch {
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-rvg-thumbnail">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<Scan size={18} color="var(--brand-primary, var(--teal))" />
					<h3 className="dente-warm-tool-title">
						Прицельный снимок визиографа (RVG 200×200)
					</h3>
				</div>
				<span className="dente-warm-tag info">
					Зуб #{toothNumber}
				</span>
			</div>

			{/* 200x200 Visual Display Workspace */}
			<div className="dente-rvg-display-row">
				{/* 200x200 Fixed Dimension Viewport (No CLS shift) */}
				<div className="dente-rvg-viewport-frame">
					<img
						src={imageSrc}
						alt={`RVG визиограф зуба ${toothNumber}`}
						className="dente-rvg-img"
						style={{
							filter: `invert(${isInverted ? 1 : 0}) contrast(${contrast}%) brightness(${brightness}%)`,
							transform: isZoomedApex ? "scale(1.4) translateY(-10%)" : "none",
						}}
					/>
					<div className="dente-rvg-grid-overlay pointer-events-none" />
					<div className="dente-rvg-scale-bar">
						<span>| 5мм |</span>
					</div>
				</div>

				{/* Quick Interactive Diagnostic Image Controls */}
				<div className="dente-rvg-controls-col">
					<div className="dente-rvg-btn-group">
						<button
							type="button"
							onClick={() => setIsInverted(!isInverted)}
							className={`dente-rvg-ctrl-btn ${isInverted ? "active" : ""}`}
							title="Инвертировать цвета (негатив для костных балок)"
						>
							<Contrast size={14} />
							<span>Негатив</span>
						</button>

						<button
							type="button"
							onClick={() => setIsZoomedApex(!isZoomedApex)}
							className={`dente-rvg-ctrl-btn ${isZoomedApex ? "active" : ""}`}
							title="Увеличение апекса (лупа корня)"
						>
							<ZoomIn size={14} />
							<span>Зум апекса</span>
						</button>

						<button
							type="button"
							onClick={handleResetFilters}
							className="dente-rvg-ctrl-btn"
							title="Сбросить фильтры"
						>
							<RefreshCw size={14} />
							<span>Сброс</span>
						</button>
					</div>

					{/* Sliders */}
					<div className="dente-rvg-slider-row">
						<Sun size={14} color="var(--muted, #64748b)" />
						<input
							type="range"
							min="60"
							max="160"
							value={brightness}
							onChange={(e) => setBrightness(Number(e.target.value))}
							className="dente-mini-slider"
							title="Яркость снимка"
						/>
						<span className="slider-label">{brightness}%</span>
					</div>

					<div className="dente-rvg-slider-row">
						<Contrast size={14} color="var(--muted, #64748b)" />
						<input
							type="range"
							min="60"
							max="180"
							value={contrast}
							onChange={(e) => setContrast(Number(e.target.value))}
							className="dente-mini-slider"
							title="Контраст снимка"
						/>
						<span className="slider-label">{contrast}%</span>
					</div>

					{/* Quick Launchers */}
					<div className="dente-rvg-actions-row">
						<button
							type="button"
							onClick={handleCopyXrayReport}
							className="dente-secondary-btn"
							style={{ fontSize: 11, minHeight: 36 }}
						>
							<span>Вставить в 043/у</span>
						</button>

						<button
							type="button"
							onClick={() => onOpenFullRadiology?.(toothNumber)}
							className="dente-secondary-btn"
							style={{ fontSize: 11, minHeight: 36 }}
						>
							<Maximize2 size={13} />
							<span>Студия снимков...</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ToothRvgThumbnail;

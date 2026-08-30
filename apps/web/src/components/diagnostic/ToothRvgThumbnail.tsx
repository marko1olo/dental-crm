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

	const hasImage = Boolean(scanImageUrl && scanImageUrl.trim().length > 0);
	const imageSrc = scanImageUrl || "";

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
				<div className="dente-rvg-viewport-frame" style={{ backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
					{hasImage ? (
						<>
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
						</>
					) : (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: "6px",
								padding: "12px",
								color: "#94a3b8",
								textAlign: "center",
								cursor: "pointer",
							}}
							onClick={() => onOpenFullRadiology?.(toothNumber)}
							title="Нажмите, чтобы открыть радиологию"
						>
							<Scan size={28} color="#0d9488" />
							<span style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>
								RVG #{toothNumber}
							</span>
							<span style={{ fontSize: "10px", color: "#64748b" }}>
								Снимок не загружен
							</span>
						</div>
					)}
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

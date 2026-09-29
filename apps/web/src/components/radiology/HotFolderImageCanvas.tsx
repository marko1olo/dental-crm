import React from "react";
import {
	Eye,
	FlipHorizontal,
	HardDrive,
	Image as ImageIcon,
	Minus,
	Plus,
	RotateCw,
	ShieldCheck,
	Sun,
	Zap,
} from "lucide-react";
import {
	FILTER_PRESETS,
	type FilterPresetKey,
	type HotFolderItem,
} from "./hotFolderTypes";

export interface HotFolderImageCanvasProps {
	activeItem: HotFolderItem | null;
	doseInfo: {
		microsvText: string;
		badgeClass: string;
	};
	pan: { x: number; y: number };
	zoom: number;
	rotation: number;
	flipH: boolean;
	brightness: number;
	contrast: number;
	invert: boolean;
	activePreset: FilterPresetKey;
	onMouseDownCanvas: (e: React.MouseEvent) => void;
	onApplyPreset: (key: FilterPresetKey) => void;
	setBrightness: (val: number) => void;
	setContrast: (val: number) => void;
	setInvert: React.Dispatch<React.SetStateAction<boolean>>;
	setRotation: React.Dispatch<React.SetStateAction<number>>;
	setFlipH: React.Dispatch<React.SetStateAction<boolean>>;
	setZoom: React.Dispatch<React.SetStateAction<number>>;
	onResetView: () => void;
}

export const HotFolderImageCanvas: React.FC<HotFolderImageCanvasProps> = ({
	activeItem,
	doseInfo,
	pan,
	zoom,
	rotation,
	flipH,
	brightness,
	contrast,
	invert,
	activePreset,
	onMouseDownCanvas,
	onApplyPreset,
	setBrightness,
	setContrast,
	setInvert,
	setRotation,
	setFlipH,
	setZoom,
	onResetView,
}) => {
	return (
		<main className="hfi-center-panel" data-testid="hfi-center-canvas">
			{/* Top HUD overlay */}
			<div className="hfi-canvas-top-hud">
				<div className="hfi-hud-chip">
					<HardDrive className="w-3.5 h-3.5 text-teal-400" />
					<span>
						{activeItem?.metadata.apparatusModel ?? "Vatech EzSensor HD"}
						{activeItem?.metadata.sensorResolution ? ` · ${activeItem.metadata.sensorResolution}` : ""}
					</span>
				</div>

				<div className="flex items-center gap-2">
					<div className="hfi-hud-chip">
						<Zap className="w-3.5 h-3.5 text-amber-400" />
						<span>
							{activeItem?.metadata.kv ?? 65} kV · {activeItem?.metadata.ma ?? 7.0} mA · {activeItem?.metadata.exposureSec ?? 0.08} s
						</span>
					</div>

					<div className={`hfi-hud-chip border ${doseInfo.badgeClass}`}>
						<ShieldCheck className="w-3.5 h-3.5" />
						<span>{doseInfo.microsvText} (В норме)</span>
					</div>
				</div>
			</div>

			{/* Dark Viewport Canvas Stage */}
			<div
				className="hfi-viewport-area"
				data-testid="hfi-viewport-area"
				onMouseDown={onMouseDownCanvas}
			>
				<div
					className="hfi-image-stage"
					style={{
						transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
						filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(100%)" : ""}`,
					}}
				>
					{activeItem ? (
						<img
							src={activeItem.imageUrl}
							alt={activeItem.filename}
							loading="lazy"
							decoding="async"
							className="hfi-radiology-image"
							data-testid="hfi-active-radiology-image"
							draggable={false}
						/>
					) : (
						<div className="flex flex-col items-center justify-center p-12 text-slate-500">
							<ImageIcon className="w-16 h-16 mb-2 opacity-40" />
							<p className="text-sm">Нет выбранного снимка</p>
						</div>
					)}
				</div>
			</div>

			{/* Bottom Floating Control Dock */}
			<div className="hfi-bottom-dock">
				{/* Presets row */}
				<div className="hfi-dock-pill">
					<div className="hfi-presets-strip">
						{(Object.keys(FILTER_PRESETS) as FilterPresetKey[]).map((key) => {
							const p = FILTER_PRESETS[key];
							const isSelected = activePreset === key;
							return (
								<button
									key={key}
									type="button"
									onClick={() => onApplyPreset(key)}
									className={`hfi-preset-chip ${isSelected ? "active" : ""}`}
									data-testid={`hfi-preset-chip-${key}`}
									title={p.description}
								>
									{p.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Sliders & Tools row */}
				<div className="hfi-dock-pill">
					{/* Brightness Slider */}
					<div className="hfi-slider-group">
						<span className="hfi-slider-label">
							<Sun className="w-3.5 h-3.5 text-amber-400" />
							<span>Яркость</span>
						</span>
						<input
							type="range"
							min="20"
							max="200"
							value={brightness}
							onChange={(e) => setBrightness(Number(e.target.value))}
							className="hfi-dock-slider"
							data-testid="hfi-brightness-slider"
							aria-label="Регулировка яркости"
						/>
						<span className="font-mono text-[10px] w-7 text-right">{brightness}%</span>
					</div>

					<div className="w-[1px] h-4 bg-slate-700" />

					{/* Contrast Slider */}
					<div className="hfi-slider-group">
						<span className="hfi-slider-label">
							<Eye className="w-3.5 h-3.5 text-teal-400" />
							<span>Контраст</span>
						</span>
						<input
							type="range"
							min="50"
							max="300"
							value={contrast}
							onChange={(e) => setContrast(Number(e.target.value))}
							className="hfi-dock-slider"
							data-testid="hfi-contrast-slider"
							aria-label="Регулировка контрастности"
						/>
						<span className="font-mono text-[10px] w-7 text-right">{contrast}%</span>
					</div>

					<div className="w-[1px] h-4 bg-slate-700" />

					{/* Invert Button */}
					<button
						type="button"
						onClick={() => setInvert((prev) => !prev)}
						className={`hfi-dock-btn ${invert ? "active" : ""}`}
						data-testid="hfi-invert-btn"
						title="Инвертировать ч/б (Негатив)"
					>
						<span>Негатив</span>
					</button>

					{/* Rotation */}
					<button
						type="button"
						onClick={() => setRotation((prev) => (prev + 90) % 360)}
						className="hfi-dock-btn"
						data-testid="hfi-rotate-btn"
						title="Повернуть на 90° по часовой"
					>
						<RotateCw className="w-3.5 h-3.5" />
						<span>{rotation}°</span>
					</button>

					{/* Flip Horizontal */}
					<button
						type="button"
						onClick={() => setFlipH((prev) => !prev)}
						className={`hfi-dock-btn ${flipH ? "active" : ""}`}
						data-testid="hfi-flip-btn"
						title="Зеркальное отражение по горизонтали"
					>
						<FlipHorizontal className="w-3.5 h-3.5" />
					</button>

					<div className="w-[1px] h-4 bg-slate-700" />

					{/* Zoom Controls */}
					<button
						type="button"
						onClick={() => setZoom((prev) => Math.max(50, prev - 25))}
						className="hfi-dock-btn"
						data-testid="hfi-zoom-out-btn"
						title="Уменьшить масштаб"
					>
						<Minus className="w-3.5 h-3.5" />
					</button>
					<span className="font-mono text-[10px] text-gray-300 w-8 text-center">{zoom}%</span>
					<button
						type="button"
						onClick={() => setZoom((prev) => Math.min(400, prev + 25))}
						className="hfi-dock-btn"
						data-testid="hfi-zoom-in-btn"
						title="Увеличить масштаб"
					>
						<Plus className="w-3.5 h-3.5" />
					</button>

					{/* Reset */}
					<button
						type="button"
						onClick={onResetView}
						className="hfi-dock-btn text-gray-400 hover:text-white"
						data-testid="hfi-reset-view-btn"
						title="Сбросить масштаб и положение"
					>
						<span>Сброс</span>
					</button>
				</div>
			</div>
		</main>
	);
};

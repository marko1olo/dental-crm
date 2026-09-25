import React from "react";
import {
	Activity,
	Contrast,
	Download,
	FlipHorizontal,
	Hand,
	Minus,
	Monitor,
	Plus,
	RotateCcw,
	RotateCw,
	Ruler,
	UploadCloud,
	X,
	Zap,
} from "lucide-react";

export interface Dental2DRadiologyToolbarProps {
	readonly title: string;
	readonly modalityLabel: string;
	readonly activeToothFdi: string | null;
	readonly onToggleToothSelector: () => void;
	readonly activeTool: "pan" | "ruler";
	readonly onSelectTool: (tool: "pan" | "ruler") => void;
	readonly invert: boolean;
	readonly onToggleInvert: () => void;
	readonly zoom: number;
	readonly onZoomIn: () => void;
	readonly onZoomOut: () => void;
	readonly onZoomReset: () => void;
	readonly onRotate: () => void;
	readonly flipHorizontal: boolean;
	readonly onToggleFlipHorizontal: () => void;
	readonly onApplyNorma: () => void;
	readonly isPresentationMode: boolean;
	readonly onTogglePresentationMode: () => void;
	readonly onExportImage: () => void;
	readonly onTriggerUpload: () => void;
	readonly onResetView: () => void;
	readonly onClose?: () => void;
}

export const Dental2DRadiologyToolbar: React.FC<Dental2DRadiologyToolbarProps> = ({
	title,
	modalityLabel,
	activeToothFdi,
	onToggleToothSelector,
	activeTool,
	onSelectTool,
	invert,
	onToggleInvert,
	zoom,
	onZoomIn,
	onZoomOut,
	onZoomReset,
	onRotate,
	flipHorizontal,
	onToggleFlipHorizontal,
	onApplyNorma,
	isPresentationMode,
	onTogglePresentationMode,
	onExportImage,
	onTriggerUpload,
	onResetView,
	onClose,
}) => {
	return (
		<div
			style={{
				minHeight: "36px",
				height: "36px",
				backgroundColor: "#0f172a",
				borderBottom: "1px solid #1e293b",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "0 10px",
				gap: "6px",
				flexShrink: 0,
			}}
		>
			{/* Left: Study info + FDI tooth badge */}
			<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
				<Activity size={16} color="#14b8a6" style={{ flexShrink: 0 }} />
				<span style={{ fontWeight: 700, fontSize: "12px", whiteSpace: "nowrap" }}>
					{title}
				</span>
				<span
					style={{
						fontSize: "11px",
						color: "#94a3b8",
						padding: "1px 6px",
						borderRadius: "4px",
						backgroundColor: "#1e293b",
						border: "1px solid #334155",
						whiteSpace: "nowrap",
					}}
				>
					{modalityLabel}
				</span>

				{/* 1-Click FDI Tooth Trigger Button */}
				<button
					type="button"
					data-testid="btn-toggle-fdi-selector"
					onClick={onToggleToothSelector}
					style={{
						height: "26px",
						padding: "0 8px",
						fontSize: "11px",
						fontWeight: 700,
						fontFamily: "monospace",
						borderRadius: "5px",
						border: activeToothFdi ? "1px solid #14b8a6" : "1px solid #334155",
						backgroundColor: activeToothFdi ? "#134e4a" : "#1e293b",
						color: activeToothFdi ? "#5eead4" : "#94a3b8",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
					}}
					title="1-клик выбор зуба по формуле FDI (11..48)"
				>
					<span>{activeToothFdi ? `Зуб #${activeToothFdi}` : "Выбрать зуб FDI"}</span>
				</button>
			</div>

			{/* Center: Tools (Pan, Ruler, Invert, Zoom, Presets) */}
			<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
				{/* Pan tool */}
				<button
					type="button"
					data-testid="btn-tool-pan"
					onClick={() => onSelectTool("pan")}
					style={{
						height: "28px",
						padding: "0 8px",
						fontSize: "11px",
						borderRadius: "5px",
						border: activeTool === "pan" ? "1px solid #14b8a6" : "1px solid #334155",
						backgroundColor: activeTool === "pan" ? "#134e4a" : "#1e293b",
						color: activeTool === "pan" ? "#5eead4" : "#cbd5e1",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						fontWeight: 600,
					}}
					title="Панорамирование (перемещение снимка мышью)"
				>
					<Hand size={13} />
					<span className="hidden sm:inline">Панорама</span>
				</button>

				{/* Calibrated Ruler Tool */}
				<button
					type="button"
					data-testid="btn-tool-ruler"
					onClick={() => onSelectTool("ruler")}
					style={{
						height: "28px",
						padding: "0 8px",
						fontSize: "11px",
						borderRadius: "5px",
						border: activeTool === "ruler" ? "1px solid #0284c7" : "1px solid #334155",
						backgroundColor: activeTool === "ruler" ? "#0369a1" : "#1e293b",
						color: activeTool === "ruler" ? "#bae6fd" : "#cbd5e1",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						fontWeight: 600,
					}}
					title="Калиброванная линейка (мм): кликните две точки для измерения длины канала / импланта"
				>
					<Ruler size={13} />
					<span className="hidden sm:inline">Линейка (мм)</span>
				</button>

				{/* Negative Invert Toggle */}
				<button
					type="button"
					data-testid="btn-toggle-invert"
					onClick={onToggleInvert}
					style={{
						height: "28px",
						padding: "0 8px",
						fontSize: "11px",
						borderRadius: "5px",
						border: invert ? "1px solid #a855f7" : "1px solid #334155",
						backgroundColor: invert ? "#6b21a8" : "#1e293b",
						color: invert ? "#f3e8ff" : "#cbd5e1",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
						fontWeight: 600,
					}}
					title="Негатив / Инверсия: выявление микротрещин и рентгенопрозрачных деструкций"
				>
					<Contrast size={13} />
					<span>{invert ? "Негатив ВКЛ" : "Негатив"}</span>
				</button>

				{/* Zoom Controls */}
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						backgroundColor: "#1e293b",
						borderRadius: "5px",
						border: "1px solid #334155",
						height: "28px",
						padding: "0 2px",
					}}
				>
					<button
						type="button"
						onClick={onZoomOut}
						style={{
							width: "24px",
							height: "24px",
							background: "transparent",
							border: "none",
							color: "#cbd5e1",
							cursor: "pointer",
						}}
						title="Уменьшить"
					>
						<Minus size={12} />
					</button>
					<button
						type="button"
						onClick={onZoomReset}
						style={{
							minWidth: "36px",
							height: "24px",
							background: "transparent",
							border: "none",
							color: "#e2e8f0",
							fontSize: "10px",
							fontFamily: "monospace",
							cursor: "pointer",
						}}
						title="100%"
					>
						{Math.round(zoom * 100)}%
					</button>
					<button
						type="button"
						onClick={onZoomIn}
						style={{
							width: "24px",
							height: "24px",
							background: "transparent",
							border: "none",
							color: "#cbd5e1",
							cursor: "pointer",
						}}
						title="Увеличить"
					>
						<Plus size={12} />
					</button>
				</div>

				{/* Rotate 90° */}
				<button
					type="button"
					onClick={onRotate}
					style={{
						height: "28px",
						width: "28px",
						borderRadius: "5px",
						border: "1px solid #334155",
						backgroundColor: "#1e293b",
						color: "#cbd5e1",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					title="Повернуть на 90°"
				>
					<RotateCw size={13} />
				</button>

				{/* Flip Horizontal */}
				<button
					type="button"
					onClick={onToggleFlipHorizontal}
					style={{
						height: "28px",
						width: "28px",
						borderRadius: "5px",
						border: flipHorizontal ? "1px solid #14b8a6" : "1px solid #334155",
						backgroundColor: flipHorizontal ? "#134e4a" : "#1e293b",
						color: flipHorizontal ? "#5eead4" : "#cbd5e1",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					title="Отразить по горизонтали"
				>
					<FlipHorizontal size={13} />
				</button>
			</div>

			{/* Right: Presets, Patient Presentation Mode, 1-Click Norma, Export, Close */}
			<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
				{/* 1-Click Norma Button (Mandate 8e) */}
				<button
					type="button"
					data-testid="btn-viewer-norma-043"
					onClick={onApplyNorma}
					style={{
						height: "28px",
						padding: "0 8px",
						fontSize: "11px",
						fontWeight: 600,
						borderRadius: "5px",
						border: "1px solid #10b981",
						backgroundColor: "#064e3b",
						color: "#a7f3d0",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
					}}
					title="1-клик заключение: норма на снимке (в дневник 043/у)"
				>
					<Zap size={12} color="#34d399" />
					<span className="hidden md:inline">Норма (043/у)</span>
				</button>

				{/* 1-Click Chairside Patient Presentation Mode */}
				<button
					type="button"
					data-testid="btn-chairside-presentation"
					onClick={onTogglePresentationMode}
					style={{
						height: "28px",
						padding: "0 8px",
						fontSize: "11px",
						fontWeight: 700,
						borderRadius: "5px",
						border: isPresentationMode ? "1.5px solid #f59e0b" : "1px solid #0d9488",
						backgroundColor: isPresentationMode ? "#78350f" : "#134e4a",
						color: isPresentationMode ? "#fef3c7" : "#5eead4",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
					}}
					title="Режим презентации для пациента на мониторе кресла (без лишних кнопок)"
				>
					<Monitor size={13} />
					<span>{isPresentationMode ? "Выход из презентации" : "Пациенту"}</span>
				</button>

				{/* Export PNG */}
				<button
					type="button"
					onClick={onExportImage}
					style={{
						height: "28px",
						padding: "0 8px",
						fontSize: "11px",
						fontWeight: 600,
						borderRadius: "5px",
						border: "1px solid #334155",
						backgroundColor: "#1e293b",
						color: "#e2e8f0",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
					}}
					title="Экспорт снимка с линейкой в PNG"
				>
					<Download size={13} />
					<span className="hidden lg:inline">Экспорт</span>
				</button>

				{/* Upload / replace file */}
				<button
					type="button"
					onClick={onTriggerUpload}
					style={{
						height: "28px",
						width: "28px",
						borderRadius: "5px",
						border: "1px solid #334155",
						backgroundColor: "#1e293b",
						color: "#cbd5e1",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					title="Загрузить локальный снимок (RVG/ОПТГ/DICOM)"
				>
					<UploadCloud size={13} />
				</button>

				{/* Reset */}
				<button
					type="button"
					onClick={onResetView}
					style={{
						height: "28px",
						width: "28px",
						borderRadius: "5px",
						border: "1px solid #334155",
						backgroundColor: "#1e293b",
						color: "#cbd5e1",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					title="Сбросить все настройки"
				>
					<RotateCcw size={13} />
				</button>

				{/* Close */}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						style={{
							height: "28px",
							width: "28px",
							borderRadius: "5px",
							border: "1px solid #334155",
							background: "transparent",
							color: "#94a3b8",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						title="Закрыть просмотрщик"
					>
						<X size={15} />
					</button>
				)}
			</div>
		</div>
	);
};

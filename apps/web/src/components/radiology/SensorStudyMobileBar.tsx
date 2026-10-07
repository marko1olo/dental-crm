/**
 * DENTE CRM — Mobile Floating Bottom Bar for 2D/3D Radiology & DICOM Viewer
 * Standards: Apple iOS Human Interface Guidelines (HIG), Mandate 8e, Mandate 8n.
 * Invariants:
 * 1. Touch targets strictly >= 44x44px (optimal 48x48px for gloved fingers).
 * 2. Natural Thumb Zone (bottom third of viewport).
 * 3. Glassmorphic backdrop blur (backdrop-filter: blur(20px)).
 * 4. Safe Area insets protection (env(safe-area-inset-bottom)).
 */

import React from "react";
import {
	Activity,
	Contrast,
	Layers,
	Move,
	Ruler,
	Search,
	Sliders,
	Trash2,
} from "lucide-react";

export interface SensorStudyMobileBarProps {
	readonly activeTool: "pan" | "ruler" | "curved_canal" | "magnifier" | "lesion_contour";
	readonly onSelectTool: (tool: "pan" | "ruler" | "curved_canal" | "magnifier" | "lesion_contour") => void;
	readonly invert: boolean;
	readonly onToggleInvert: () => void;
	readonly onOpenWl: () => void;
	readonly isWlOpen: boolean;
	readonly hasActiveFilters: boolean;
	readonly onOpenStudies: () => void;
	readonly isStudiesOpen: boolean;
	readonly studiesCount: number;
	readonly measurementsCount: number;
	readonly onClearMeasurements?: () => void;
}

export const SensorStudyMobileBar: React.FC<SensorStudyMobileBarProps> = ({
	activeTool,
	onSelectTool,
	invert,
	onToggleInvert,
	onOpenWl,
	isWlOpen,
	hasActiveFilters,
	onOpenStudies,
	isStudiesOpen,
	studiesCount,
	measurementsCount,
	onClearMeasurements,
}) => {
	return (
		<div
			data-testid="sensor-viewer-mobile-bottom-bar"
			className="sensor-viewer-mobile-bottom-bar"
			style={{
				position: "absolute",
				bottom: 0,
				left: 0,
				right: 0,
				zIndex: 45,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-around",
				padding: "8px 10px max(12px, env(safe-area-inset-bottom))",
				backgroundColor: "rgba(7, 11, 20, 0.94)",
				backdropFilter: "blur(20px)",
				WebkitBackdropFilter: "blur(20px)",
				borderTop: "1px solid rgba(255, 255, 255, 0.14)",
				boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)",
				userSelect: "none",
			}}
		>
			{/* 1. Рука / Панорамирование */}
			<button
				type="button"
				data-testid="mobile-btn-tool-pan"
				onClick={() => onSelectTool("pan")}
				className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer"
				style={{
					minWidth: "46px",
					minHeight: "46px",
					width: "46px",
					height: "46px",
					backgroundColor: activeTool === "pan" ? "rgba(19, 78, 74, 0.95)" : "rgba(255, 255, 255, 0.05)",
					color: activeTool === "pan" ? "#2dd4bf" : "#94a3b8",
					border: activeTool === "pan" ? "1px solid rgba(45, 212, 191, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
				}}
				title="Панорамирование (Рука)"
				aria-label="Панорамирование снимка"
				aria-pressed={activeTool === "pan"}
			>
				<Move size={19} />
				<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Рука</span>
			</button>

			{/* 2. Линейка (мм) */}
			<button
				type="button"
				data-testid="mobile-btn-tool-ruler"
				onClick={() => onSelectTool(activeTool === "ruler" ? "pan" : "ruler")}
				className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer relative"
				style={{
					minWidth: "46px",
					minHeight: "46px",
					width: "46px",
					height: "46px",
					backgroundColor: activeTool === "ruler" ? "rgba(19, 78, 74, 0.95)" : "rgba(255, 255, 255, 0.05)",
					color: activeTool === "ruler" ? "#2dd4bf" : "#94a3b8",
					border: activeTool === "ruler" ? "1px solid rgba(45, 212, 191, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
				}}
				title="Линейка (мм)"
				aria-label="Измерение расстояний в миллиметрах"
				aria-pressed={activeTool === "ruler"}
			>
				<Ruler size={19} />
				<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Линейка</span>
				{measurementsCount > 0 && (
					<span
						className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#00C853] text-[#022c15]"
						title={`Измерений: ${measurementsCount}`}
					>
						{measurementsCount}
					</span>
				)}
			</button>

			{/* 3. Лупа 2.5x */}
			<button
				type="button"
				data-testid="mobile-btn-tool-magnifier"
				onClick={() => onSelectTool(activeTool === "magnifier" ? "pan" : "magnifier")}
				className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer"
				style={{
					minWidth: "46px",
					minHeight: "46px",
					width: "46px",
					height: "46px",
					backgroundColor: activeTool === "magnifier" ? "rgba(19, 78, 74, 0.95)" : "rgba(255, 255, 255, 0.05)",
					color: activeTool === "magnifier" ? "#2dd4bf" : "#94a3b8",
					border: activeTool === "magnifier" ? "1px solid rgba(45, 212, 191, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
				}}
				title="Лупа 2.5x для микротрещин и апекса"
				aria-label="Интерактивная лупа 2.5x"
				aria-pressed={activeTool === "magnifier"}
			>
				<Search size={19} />
				<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Лупа 2.5x</span>
			</button>

			{/* 4. Инверсия (Негатив) */}
			<button
				type="button"
				data-testid="mobile-btn-tool-invert"
				onClick={onToggleInvert}
				className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer"
				style={{
					minWidth: "46px",
					minHeight: "46px",
					width: "46px",
					height: "46px",
					backgroundColor: invert ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.05)",
					color: invert ? "#34d399" : "#94a3b8",
					border: invert ? "1px solid rgba(52, 211, 153, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
				}}
				title="Инверсия (Негатив / Позитив)"
				aria-label="Инвертировать снимок в негатив"
				aria-pressed={invert}
			>
				<Contrast size={19} />
				<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Негатив</span>
			</button>

			{/* 5. Яркость / Контраст (W/L) */}
			<button
				type="button"
				data-testid="mobile-btn-tool-wl"
				onClick={onOpenWl}
				className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer"
				style={{
					minWidth: "46px",
					minHeight: "46px",
					width: "46px",
					height: "46px",
					backgroundColor: isWlOpen || hasActiveFilters ? "rgba(19, 78, 74, 0.95)" : "rgba(255, 255, 255, 0.05)",
					color: isWlOpen || hasActiveFilters ? "#2dd4bf" : "#94a3b8",
					border: isWlOpen || hasActiveFilters ? "1px solid rgba(45, 212, 191, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
				}}
				title="Яркость и контрастность (W/L)"
				aria-label="Панель яркости и контрастности"
				aria-expanded={isWlOpen}
			>
				<Sliders size={19} />
				<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>W / L</span>
			</button>

			{/* 6. Снимки (Галерея пациента) */}
			<button
				type="button"
				data-testid="mobile-btn-filmstrip-drawer"
				onClick={onOpenStudies}
				className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer relative"
				style={{
					minWidth: "46px",
					minHeight: "46px",
					width: "46px",
					height: "46px",
					backgroundColor: isStudiesOpen ? "rgba(19, 78, 74, 0.95)" : "rgba(255, 255, 255, 0.05)",
					color: isStudiesOpen ? "#2dd4bf" : "#94a3b8",
					border: isStudiesOpen ? "1px solid rgba(45, 212, 191, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
				}}
				title="Все снимки пациента"
				aria-label="Открыть галерею снимков пациента"
				aria-expanded={isStudiesOpen}
			>
				<Layers size={19} />
				<span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>Снимки</span>
				{studiesCount > 0 && (
					<span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-teal-600 text-white">
						{studiesCount}
					</span>
				)}
			</button>

			{/* Clear measurements if any */}
			{measurementsCount > 0 && onClearMeasurements && (
				<button
					type="button"
					data-testid="mobile-btn-clear-measurements"
					onClick={onClearMeasurements}
					className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer text-rose-400 hover:text-rose-300"
					style={{
						minWidth: "44px",
						minHeight: "44px",
						width: "44px",
						height: "44px",
						backgroundColor: "rgba(225, 29, 72, 0.15)",
						border: "1px solid rgba(225, 29, 72, 0.4)",
					}}
					title="Очистить измерения"
					aria-label="Очистить измерения на снимке"
				>
					<Trash2 size={18} />
					<span style={{ fontSize: "9px", fontWeight: 700, marginTop: "2px" }}>Сброс</span>
				</button>
			)}
		</div>
	);
};

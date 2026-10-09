/**
 * DENTE CRM — Radiology Report Studio Toolbar (Layer 1)
 * Standards: Apple HIG Segmented Controls for layout presets, tool buttons, zoom and CTAs.
 */

import React from "react";
import {
	Columns2,
	Download,
	FileText,
	Grid2X2,
	Image as ImageIcon,
	Printer,
	RotateCcw,
	Rows2,
	Settings,
	Square,
	Trash2,
	Type,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { RadiologyReportLayoutPreset, ReportPrintSettings } from "./types";

export interface ReportStudioToolbarProps {
	settings: ReportPrintSettings;
	activeLayout: RadiologyReportLayoutPreset;
	onApplyLayout: (layout: RadiologyReportLayoutPreset) => void;
	onAddImageFrame: () => void;
	onAddTextFrame: () => void;
	onResetFrames: () => void;
	hasSelectedFrame: boolean;
	onDeleteSelected: () => void;
	viewZoom: number;
	onZoomChange: (updater: (prev: number) => number) => void;
	onOpenSettings: () => void;
	onExportPdf: () => void;
	onPrint: () => void;
	onClose: () => void;
}

export const ReportStudioToolbar: React.FC<ReportStudioToolbarProps> = ({
	settings,
	activeLayout,
	onApplyLayout,
	onAddImageFrame,
	onAddTextFrame,
	onResetFrames,
	hasSelectedFrame,
	onDeleteSelected,
	viewZoom,
	onZoomChange,
	onOpenSettings,
	onExportPdf,
	onPrint,
	onClose,
}) => {
	return (
		<header className="radiology-report-toolbar">
			{/* Left: Branding & Page Specs */}
			<div className="radiology-report-brand">
				<div className="radiology-report-icon-box">
					<FileText className="w-4 h-4" />
				</div>
				<div>
					<h2 className="radiology-report-title">Конструктор отчетов А4</h2>
					<div className="radiology-report-subtitle">
						{settings.pageSize === "14x17_film" ? "14x17\" Пленка" : settings.pageSize} ·{" "}
						{settings.orientation === "portrait" ? "Книжная ориентация" : "Альбомная ориентация"}
					</div>
				</div>
			</div>

			{/* Center: Segmented Control Layout Switcher & Action Tools */}
			<div className="flex items-center gap-2">
				<div className="radiology-segmented-control" role="group" aria-label="Раскладка отчета">
					<button
						type="button"
						onClick={() => onApplyLayout("single")}
						className={`radiology-segment-btn ${activeLayout === "single" ? "active" : ""}`}
						title="1 снимок на лист"
					>
						<Square className="w-3.5 h-3.5" />
						<span>1 снимок</span>
					</button>
					<button
						type="button"
						onClick={() => onApplyLayout("two_vertical")}
						className={`radiology-segment-btn ${activeLayout === "two_vertical" ? "active" : ""}`}
						title="2 снимка вертикально"
						data-testid="btn-layout-two-vert"
					>
						<Rows2 className="w-3.5 h-3.5" />
						<span>2 верт.</span>
					</button>
					<button
						type="button"
						onClick={() => onApplyLayout("two_horizontal")}
						className={`radiology-segment-btn ${activeLayout === "two_horizontal" ? "active" : ""}`}
						title="2 снимка рядом (сплит)"
					>
						<Columns2 className="w-3.5 h-3.5" />
						<span>2 гориз.</span>
					</button>
					<button
						type="button"
						onClick={() => onApplyLayout("grid_four")}
						className={`radiology-segment-btn ${activeLayout === "grid_four" ? "active" : ""}`}
						title="Сетка 4 снимка"
					>
						<Grid2X2 className="w-3.5 h-3.5" />
						<span>4 снимка</span>
					</button>
				</div>

				<div className="h-5 w-px bg-zinc-700/60 mx-1" />

				{/* Insert & Reset Tools */}
				<button
					type="button"
					onClick={onAddImageFrame}
					className="radiology-tool-btn"
					data-testid="btn-add-image-frame"
					title="Добавить снимок в макет"
				>
					<ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
					<span>+ Снимок</span>
				</button>

				<button
					type="button"
					onClick={onAddTextFrame}
					className="radiology-tool-btn"
					data-testid="btn-add-text-frame"
					title="Добавить текстовый блок описания"
				>
					<Type className="w-3.5 h-3.5 text-blue-400" />
					<span>+ Текст</span>
				</button>

				<button
					type="button"
					onClick={onResetFrames}
					className="radiology-tool-btn"
					title="Сбросить макет к стандарту"
				>
					<RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
					<span>Сброс</span>
				</button>

				{hasSelectedFrame && (
					<button
						type="button"
						onClick={onDeleteSelected}
						className="radiology-tool-btn danger"
						data-testid="btn-delete-frame"
						title="Удалить выбранную рамку"
					>
						<Trash2 className="w-3.5 h-3.5" />
						<span>Удалить</span>
					</button>
				)}
			</div>

			{/* Right: Scale Zoom, Settings & Primary CTAs */}
			<div className="flex items-center gap-2">
				<div className="radiology-zoom-group">
					<button
						type="button"
						onClick={() => onZoomChange((z) => Math.max(50, z - 10))}
						className="radiology-zoom-btn"
						title="Уменьшить масштаб"
					>
						<ZoomOut className="w-3.5 h-3.5" />
					</button>
					<span className="radiology-zoom-label">{viewZoom}%</span>
					<button
						type="button"
						onClick={() => onZoomChange((z) => Math.min(150, z + 10))}
						className="radiology-zoom-btn"
						title="Увеличить масштаб"
					>
						<ZoomIn className="w-3.5 h-3.5" />
					</button>
				</div>

				<button
					type="button"
					onClick={onOpenSettings}
					className="radiology-tool-btn"
					data-testid="btn-open-print-settings"
					title="Настройки параметров листа и колонтитулов"
				>
					<Settings className="w-3.5 h-3.5 text-zinc-400" />
					<span>Параметры</span>
				</button>

				<button
					type="button"
					onClick={onExportPdf}
					className="radiology-btn-pdf"
					title="Экспорт отчета в PDF"
				>
					<Download className="w-3.5 h-3.5" />
					<span>Экспорт PDF</span>
				</button>

				<button
					type="button"
					onClick={onPrint}
					className="radiology-btn-primary"
					data-testid="btn-execute-print"
					title="Печать отчета (Ctrl+P)"
				>
					<Printer className="w-3.5 h-3.5" />
					<span>Печать (Ctrl+P)</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="radiology-tool-btn !px-2 ml-1"
					data-testid="btn-close-report-studio"
					title="Закрыть студию отчетов (Esc)"
				>
					<X className="w-4 h-4 text-zinc-400" />
				</button>
			</div>
		</header>
	);
};

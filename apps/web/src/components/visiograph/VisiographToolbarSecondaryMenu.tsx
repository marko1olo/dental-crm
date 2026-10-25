/**
 * VisiographToolbarSecondaryMenu.tsx
 * Secondary popout dropdown menu: apex WL, periapical lesion, calibration, print, export.
 */

import { Activity, AlertTriangle, FileDown, Printer, RotateCcw, Scale } from "lucide-react";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";

export interface VisiographToolbarSecondaryMenuProps {
	onCloseMenu: () => void;
	setActiveTool: (tool: ActiveVisiographToolType) => void;
	onClearDrawing: () => void;
	onPrintProtocol: () => void;
	onOpenExportModal: () => void;
	onResetAll: () => void;
}

export function VisiographToolbarSecondaryMenu({
	onCloseMenu,
	setActiveTool,
	onClearDrawing,
	onPrintProtocol,
	onOpenExportModal,
	onResetAll,
}: VisiographToolbarSecondaryMenuProps) {
	return (
		<div className="visiograph-popout-menu" style={{ right: 0, minWidth: "220px" }} role="menu">
			<button
				type="button"
				className="visiograph-popout-item"
				data-testid="btn-tool-apex"
				onClick={() => { setActiveTool("root_canal"); onClearDrawing(); onCloseMenu(); }}
			>
				<Activity size={14} className="text-emerald-500" />
				<span>Эндо-линейка (Апекс WL)</span>
			</button>
			<button
				type="button"
				className="visiograph-popout-item"
				data-testid="btn-tool-lesion"
				onClick={() => { setActiveTool("lesion"); onClearDrawing(); onCloseMenu(); }}
			>
				<AlertTriangle size={14} className="text-amber-500" />
				<span>Очаг деструкции (мм²)</span>
			</button>
			<button
				type="button"
				className="visiograph-popout-item"
				data-testid="btn-tool-calibrate"
				onClick={() => { setActiveTool("calibrate"); onClearDrawing(); onCloseMenu(); }}
			>
				<Scale size={14} className="text-teal-500" />
				<span>Калибровка по эталону</span>
			</button>
			<button
				type="button"
				className="visiograph-popout-item"
				data-testid="btn-visiograph-print-protocol"
				onClick={() => { onPrintProtocol(); onCloseMenu(); }}
			>
				<Printer size={14} />
				<span>Печать протокола (A4)</span>
			</button>
			<button
				type="button"
				className="visiograph-popout-item"
				data-testid="btn-visiograph-export-modal"
				title="Экспорт снимка (JPEG, PNG, DICOM)"
				onClick={() => { onOpenExportModal(); onCloseMenu(); }}
			>
				<FileDown size={14} />
				<span>Экспорт снимка (JPEG, PNG, DICOM)</span>
			</button>
			<div style={{ height: "1px", background: "var(--line)", margin: "2px 0" }} />
			<button
				type="button"
				className="visiograph-popout-item text-rose-400"
				onClick={() => { onResetAll(); onCloseMenu(); }}
			>
				<RotateCcw size={14} />
				<span>Сбросить настройки</span>
			</button>
		</div>
	);
}

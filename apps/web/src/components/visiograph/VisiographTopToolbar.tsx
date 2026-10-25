/**
 * VisiographTopToolbar.tsx
 * Strict 1-Row Compact 36px Toolbar for Visiograph & PACS Studio (Mandates 8d, 8e, 8n).
 * Modular decomposition <= 120 lines (Mandate 8b).
 */

import { useState } from "react";
import "./VisiographTopToolbar.css";
import { VisiographToolbarFilterCluster } from "./VisiographToolbarFilterCluster";
import { VisiographToolbarToolsCluster } from "./VisiographToolbarToolsCluster";
import { VisiographToolbarToothBinder } from "./VisiographToolbarToothBinder";
import { VisiographToolbarActionsCluster } from "./VisiographToolbarActionsCluster";
import type { SensorPresetItem, VisiographTopToolbarProps } from "./VisiographTopToolbarTypes";

export type { SensorPresetItem, VisiographTopToolbarProps };

export function VisiographTopToolbar({
	activeTool,
	setActiveTool,
	onClearDrawing,
	params,
	setParams,
	activeClinicalFilter,
	onApplyClinicalFilter,
	canvasZoom,
	setCanvasZoom,
	setCanvasRotationDeg,
	onResetAll,
	onPrintProtocol,
	onOpenExportModal,
	onClose,
	toothCode = "16",
	onToothChange,
	onAttachToVisit,
	isAttachedToVisit = false,
}: VisiographTopToolbarProps) {
	const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
	const [isToothMenuOpen, setIsToothMenuOpen] = useState(false);
	const [isAttachedLocal, setIsAttachedLocal] = useState(false);
	const [isLaunchingExternal, setIsLaunchingExternal] = useState(false);

	const handleOpenRomexisEz3d = async () => {
		setIsLaunchingExternal(true);
		try {
			await fetch("/api/imaging/launch-external-viewer", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ viewerId: "planmeca-romexis-3d" }),
			});
		} catch {
			// Fallback
		} finally {
			setIsLaunchingExternal(false);
		}
	};

	return (
		<div className="visiograph-top-toolbar" role="toolbar" aria-label="Панель инструментов визиографа">
			<VisiographToolbarFilterCluster
				params={params}
				setParams={setParams}
				activeClinicalFilter={activeClinicalFilter}
				onApplyClinicalFilter={onApplyClinicalFilter}
			/>
			<div className="visiograph-toolbar-divider" />
			<VisiographToolbarToolsCluster
				activeTool={activeTool}
				setActiveTool={setActiveTool}
				onClearDrawing={onClearDrawing}
				canvasZoom={canvasZoom}
				setCanvasZoom={setCanvasZoom}
				setCanvasRotationDeg={setCanvasRotationDeg}
			/>
			<div className="visiograph-toolbar-divider" />
			<VisiographToolbarToothBinder
				effectiveTooth={toothCode || "16"}
				isToothMenuOpen={isToothMenuOpen}
				setIsToothMenuOpen={setIsToothMenuOpen}
				onToothChange={onToothChange}
			/>
			<VisiographToolbarActionsCluster
				isLaunchingExternal={isLaunchingExternal}
				handleOpenRomexisEz3d={handleOpenRomexisEz3d}
				isToolsMenuOpen={isToolsMenuOpen}
				setIsToolsMenuOpen={setIsToolsMenuOpen}
				setActiveTool={setActiveTool}
				onClearDrawing={onClearDrawing}
				onPrintProtocol={onPrintProtocol}
				onOpenExportModal={onOpenExportModal}
				onResetAll={onResetAll}
				isAttached={isAttachedToVisit || isAttachedLocal}
				handleAttachClick={() => {
					if (onAttachToVisit) onAttachToVisit();
					else onPrintProtocol();
					setIsAttachedLocal(true);
				}}
				onClose={onClose}
			/>
		</div>
	);
}

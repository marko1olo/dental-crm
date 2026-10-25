/**
 * VisiographToolbarActionsCluster.tsx
 * Actions cluster: external 3D viewer, secondary dropdown, Dominant Emerald CTA, close button.
 */

import { Box, Check, Sliders, X } from "lucide-react";
import type React from "react";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";
import { VisiographToolbarSecondaryMenu } from "./VisiographToolbarSecondaryMenu";

export interface VisiographToolbarActionsClusterProps {
	isLaunchingExternal: boolean;
	handleOpenRomexisEz3d: () => Promise<void>;
	isToolsMenuOpen: boolean;
	setIsToolsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setActiveTool: (tool: ActiveVisiographToolType) => void;
	onClearDrawing: () => void;
	onPrintProtocol: () => void;
	onOpenExportModal: () => void;
	onResetAll: () => void;
	isAttached: boolean;
	handleAttachClick: () => void;
	onClose?: (() => void) | undefined;
}

export function VisiographToolbarActionsCluster({
	isLaunchingExternal,
	handleOpenRomexisEz3d,
	isToolsMenuOpen,
	setIsToolsMenuOpen,
	setActiveTool,
	onClearDrawing,
	onPrintProtocol,
	onOpenExportModal,
	onResetAll,
	isAttached,
	handleAttachClick,
	onClose,
}: VisiographToolbarActionsClusterProps) {
	return (
		<div className="visiograph-toolbar-cluster">
			<button
				type="button"
				className="secondary-button"
				data-testid="btn-open-romexis-ez3d"
				onClick={handleOpenRomexisEz3d}
				title="Открыть 3D исследование в нативном томографе (Romexis / Ez3D-i)"
				disabled={isLaunchingExternal}
			>
				<Box size={13} aria-hidden="true" />
				<span>Romexis / Ez3D</span>
			</button>

			<div style={{ position: "relative" }}>
				<button
					type="button"
					className="secondary-button"
					data-testid="btn-tools-dropdown"
					onClick={() => setIsToolsMenuOpen((prev) => !prev)}
					title="Дополнительные инструменты анализа"
				>
					<Sliders size={13} />
					<span>Ещё ▾</span>
				</button>

				{isToolsMenuOpen && (
					<VisiographToolbarSecondaryMenu
						onCloseMenu={() => setIsToolsMenuOpen(false)}
						setActiveTool={setActiveTool}
						onClearDrawing={onClearDrawing}
						onPrintProtocol={onPrintProtocol}
						onOpenExportModal={onOpenExportModal}
						onResetAll={onResetAll}
					/>
				)}
			</div>

			<button
				type="button"
				className={`primary-button ${isAttached ? "is-attached" : ""}`}
				data-testid="btn-attach-to-visit"
				onClick={handleAttachClick}
				title="Сохранить снимок с измерениями в карту пациента (Прикрепить к визиту)"
			>
				<Check size={14} strokeWidth={2.5} />
				<span>{isAttached ? "В приёме (в карте)" : "Сохранить в карту пациента"}</span>
			</button>

			{onClose && (
				<button type="button" className="icon-button" onClick={onClose} title="Закрыть студию" aria-label="Закрыть">
					<X size={15} />
				</button>
			)}
		</div>
	);
}

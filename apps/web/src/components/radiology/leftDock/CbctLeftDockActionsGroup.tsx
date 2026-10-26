/**
 * CbctLeftDockActionsGroup.tsx — Действия дуги, импорта DICOM и сброса (Мандат 8b).
 */

import React from "react";
import { FolderOpen, RotateCcw } from "lucide-react";
import { DentalPanoramicArch } from "../../icons/DentalIcons";
import { DockTooltip, getToolBtnClass } from "../CbctColormapFlyout";

export interface CbctLeftDockActionsGroupProps {
	readonly showDentalArch?: boolean | undefined;
	readonly onToggleDentalArch?: (() => void) | undefined;
	readonly onOpenDicomFolder?: (() => void) | undefined;
	readonly onResetView?: (() => void) | undefined;
}

export const CbctLeftDockActionsGroup: React.FC<CbctLeftDockActionsGroupProps> = ({
	showDentalArch,
	onToggleDentalArch,
	onOpenDicomFolder,
	onResetView,
}) => {
	return (
		<div className="flex flex-col gap-1 items-center">
			{onToggleDentalArch && (
				<DockTooltip text="Зубная дуга (Панорама)">
					<button
						type="button"
						onClick={onToggleDentalArch}
						className={getToolBtnClass(Boolean(showDentalArch))}
						title="Зубная дуга"
					>
						<DentalPanoramicArch className="w-4 h-4" />
					</button>
				</DockTooltip>
			)}

			{onOpenDicomFolder && (
				<DockTooltip text="Открыть папку DICOM">
					<button
						type="button"
						onClick={onOpenDicomFolder}
						className={getToolBtnClass(false)}
						title="Импорт снимков"
					>
						<FolderOpen className="w-4 h-4" />
					</button>
				</DockTooltip>
			)}

			{onResetView && (
				<DockTooltip text="Сбросить масштаб и положение">
					<button
						type="button"
						onClick={onResetView}
						className={getToolBtnClass(false)}
						title="Сброс вида"
					>
						<RotateCcw className="w-4 h-4" />
					</button>
				</DockTooltip>
			)}
		</div>
	);
};

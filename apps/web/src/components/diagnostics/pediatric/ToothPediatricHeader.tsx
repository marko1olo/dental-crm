import React from "react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { FranklRatingDefinition } from "@dental/shared";

export interface ToothPediatricHeaderProps {
	toothNumber: number;
	activeFranklDef: FranklRatingDefinition;
}

export const ToothPediatricHeader: React.FC<ToothPediatricHeaderProps> = ({
	toothNumber,
	activeFranklDef,
}) => {
	return (
		<div className="dente-warm-tool-header">
			<div className="dente-warm-tool-title-group">
				<ToothDeciduous size={18} className="text-[var(--primary)]" />
				<h3 className="dente-warm-tool-title">
					Детский прием: Шкала Франкла & Резорбция (FDI #{toothNumber})
				</h3>
			</div>
			<div
				className="dente-warm-tag"
				style={{
					backgroundColor: activeFranklDef.badgeBg,
					color: activeFranklDef.badgeColor,
					borderColor: activeFranklDef.badgeBorder,
				}}
			>
				<span>Франкл {activeFranklDef.symbol}</span>
			</div>
		</div>
	);
};

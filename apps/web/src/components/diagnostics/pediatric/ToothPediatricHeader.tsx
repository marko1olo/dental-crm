import React from "react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { FranklRatingDefinition } from "../../odontogram/pediatricDentitionEngine";

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
				<ToothDeciduous size={18} style={{ color: "#ec4899" }} />
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

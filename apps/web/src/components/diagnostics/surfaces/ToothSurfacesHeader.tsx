import React from "react";
import { ToothMolar } from "../../icons/DentalIcons";

interface ToothSurfacesHeaderProps {
	iropzCalculated: number;
}

export const ToothSurfacesHeader: React.FC<ToothSurfacesHeaderProps> = ({
	iropzCalculated,
}) => {
	return (
		<div className="dente-warm-tool-header">
			<div className="dente-warm-tool-title-group">
				<ToothMolar size={18} style={{ color: "var(--brand-primary, var(--teal))" }} />
				<h3 className="dente-warm-tool-title">
					Анатомический статус и матрица поверхностей (MOD)
				</h3>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				{iropzCalculated > 0 && (
					<span
						className={`dente-warm-tag ${iropzCalculated >= 0.6 ? "warning" : "ok"}`}
						title="Индекс разрушения окклюзионной поверхности зуба"
					>
						ИРОПЗ: {iropzCalculated.toFixed(2)} {iropzCalculated >= 0.6 ? "(Коронка Z51.8)" : ""}
					</span>
				)}
			</div>
		</div>
	);
};

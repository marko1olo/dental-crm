import React from "react";
import type { RestorativeMaterialKey } from "../../odontogram/anatomicalToothGeometries";
import type { ToothData } from "../../odontogram/ToothChart";
import { RESTORATIVE_MATERIALS } from "../toothSurfacesConstants";

interface ToothMaterialSelectorProps {
	toothData?: ToothData | undefined;
	onMaterialChange: (material: RestorativeMaterialKey) => void;
}

export const ToothMaterialSelector: React.FC<ToothMaterialSelectorProps> = ({
	toothData,
	onMaterialChange,
}) => {
	return (
		<div className="dente-material-selection-box">
			<label className="dente-field-label">Пломбировочный / ортопедический материал:</label>
			<div className="dente-materials-grid">
				{RESTORATIVE_MATERIALS.map((mat) => {
					const isSelected = (toothData?.material ?? "composite") === mat.id;
					return (
						<button
							key={mat.id}
							type="button"
							onClick={() => onMaterialChange(mat.id)}
							className={`dente-material-btn ${isSelected ? "selected" : ""}`}
						>
							<span className="material-title">{mat.label}</span>
							<span className="material-sub">{mat.subLabel}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};

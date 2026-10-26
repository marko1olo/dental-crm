import React from "react";
import type { SurfaceKey } from "../toothSurfacesConstants";

interface ToothSurfacesComboRowProps {
	currentSurfaces: SurfaceKey[];
	onSetSurfaces: (surfaces: SurfaceKey[]) => void;
	onClearSurfaces: () => void;
}

export const ToothSurfacesComboRow: React.FC<ToothSurfacesComboRowProps> = ({
	currentSurfaces,
	onSetSurfaces,
	onClearSurfaces,
}) => {
	const isMOD = currentSurfaces.includes("M") && currentSurfaces.includes("O") && currentSurfaces.includes("D");
	const isMO = currentSurfaces.includes("M") && currentSurfaces.includes("O") && !currentSurfaces.includes("D");
	const isOD = currentSurfaces.includes("O") && currentSurfaces.includes("D") && !currentSurfaces.includes("M");

	return (
		<div className="dente-surface-label-row">
			<span className="dente-surface-label">
				Выбор поверхностей поражения: <strong>{currentSurfaces.length > 0 ? currentSurfaces.join("") : "Интактно"}</strong>
			</span>
			<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
				<button
					type="button"
					onClick={() => onSetSurfaces(["M", "O", "D"])}
					className={`dente-surface-quick-combo-btn ${isMOD ? "active" : ""}`}
					title="Медиально-окклюзионно-дистальная (MOD)"
				>
					MOD
				</button>
				<button
					type="button"
					onClick={() => onSetSurfaces(["M", "O"])}
					className={`dente-surface-quick-combo-btn ${isMO ? "active" : ""}`}
					title="Медиально-окклюзионная (MO)"
				>
					MO
				</button>
				<button
					type="button"
					onClick={() => onSetSurfaces(["O", "D"])}
					className={`dente-surface-quick-combo-btn ${isOD ? "active" : ""}`}
					title="Окклюзионно-дистальная (OD)"
				>
					OD
				</button>
				<button
					type="button"
					onClick={onClearSurfaces}
					className="dente-text-action-btn"
					title="Очистить поверхности (интактно)"
				>
					Сбросить
				</button>
			</div>
		</div>
	);
};

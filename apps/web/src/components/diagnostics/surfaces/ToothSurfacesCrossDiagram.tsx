import React from "react";
import type { SurfaceKey, BlackClassificationMacro } from "../toothSurfacesConstants";
import { ToothSurfacesComboRow } from "./ToothSurfacesComboRow";
import { ToothBlackMacrosRow } from "./ToothBlackMacrosRow";

interface ToothSurfacesCrossDiagramProps {
	currentSurfaces: SurfaceKey[];
	isFrontal: boolean;
	onToggleSurface: (surface: SurfaceKey) => void;
	onSetSurfaces: (surfaces: SurfaceKey[]) => void;
	onClearSurfaces: () => void;
	onApplyMacro: (macro: BlackClassificationMacro) => void;
}

export const ToothSurfacesCrossDiagram: React.FC<ToothSurfacesCrossDiagramProps> = ({
	currentSurfaces,
	isFrontal,
	onToggleSurface,
	onSetSurfaces,
	onClearSurfaces,
	onApplyMacro,
}) => {
	return (
		<div className="dente-surface-interactive-box">
			<ToothSurfacesComboRow
				currentSurfaces={currentSurfaces}
				onSetSurfaces={onSetSurfaces}
				onClearSurfaces={onClearSurfaces}
			/>

			<div className="dente-surface-diagram-container">
				<div className="dente-surface-cross-layout">
					<button
						type="button"
						onClick={() => onToggleSurface("V")}
						className={`dente-surface-tile tile-top ${currentSurfaces.includes("V") ? "selected" : ""}`}
						title="Вестибулярная / Щечная поверхность (V/B)"
						data-testid="surface-btn-V"
					>
						<span className="tile-letter">V</span>
						<span className="tile-name">Вестиб.</span>
					</button>

					<div className="dente-surface-middle-row">
						<button
							type="button"
							onClick={() => onToggleSurface("M")}
							className={`dente-surface-tile tile-left ${currentSurfaces.includes("M") ? "selected" : ""}`}
							title="Медиальная поверхность (M)"
							data-testid="surface-btn-M"
						>
							<span className="tile-letter">M</span>
							<span className="tile-name">Медиал.</span>
						</button>

						<button
							type="button"
							onClick={() => onToggleSurface("O")}
							className={`dente-surface-tile tile-center ${currentSurfaces.includes("O") ? "selected" : ""}`}
							title={isFrontal ? "Режущий край (Incisal)" : "Окклюзионная поверхность (Occlusal)"}
							data-testid="surface-btn-O"
						>
							<span className="tile-letter">{isFrontal ? "I" : "O"}</span>
							<span className="tile-name">{isFrontal ? "Реж." : "Окклюз."}</span>
						</button>

						<button
							type="button"
							onClick={() => onToggleSurface("D")}
							className={`dente-surface-tile tile-right ${currentSurfaces.includes("D") ? "selected" : ""}`}
							title="Дистальная поверхность (D)"
							data-testid="surface-btn-D"
						>
							<span className="tile-letter">D</span>
							<span className="tile-name">Дистал.</span>
						</button>
					</div>

					<button
						type="button"
						onClick={() => onToggleSurface("L")}
						className={`dente-surface-tile tile-bottom ${currentSurfaces.includes("L") ? "selected" : ""}`}
						title="Язычная / Нёбная поверхность (L/P)"
						data-testid="surface-btn-L"
					>
						<span className="tile-letter">L</span>
						<span className="tile-name">Язычн.</span>
					</button>
				</div>
			</div>

			<ToothBlackMacrosRow onApplyMacro={onApplyMacro} />
		</div>
	);
};

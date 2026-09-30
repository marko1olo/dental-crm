import React, { useState, useMemo } from "react";
import { Check } from "lucide-react";
import { ToothMolar } from "../icons/DentalIcons";
import type { ToothData, ToothState } from "../odontogram/ToothChart";
import type { RestorativeMaterialKey } from "../odontogram/anatomicalToothGeometries";
import { showToast } from "../GlobalToast";
import {
	type SurfaceKey,
	type BlackClassificationMacro,
	BLACK_MACROS,
	RESTORATIVE_MATERIALS,
	TOOTH_STATES,
} from "./toothSurfacesConstants";
import { ToothEndoCanalsSection } from "./ToothEndoCanalsSection";

export * from "./toothSurfacesConstants";

export interface ToothSurfacesAndEndoMatrixProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const ToothSurfacesAndEndoMatrix: React.FC<ToothSurfacesAndEndoMatrixProps> = ({
	toothNumber,
	toothData,
	onUpdateTooth,
	onInsertToProtocol,
}) => {
	const currentSurfaces = useMemo<SurfaceKey[]>(() => {
		const raw = toothData?.surfaces ?? [];
		const set = new Set<SurfaceKey>();
		for (const s of raw) {
			const upper = s.toUpperCase();
			if (upper === "M" || upper === "O" || upper === "D" || upper === "V" || upper === "L") {
				set.add(upper as SurfaceKey);
			} else if (upper === "B") {
				set.add("V");
			} else if (upper === "P") {
				set.add("L");
			} else if (upper === "MOD") {
				set.add("M");
				set.add("O");
				set.add("D");
			} else if (upper === "MO") {
				set.add("M");
				set.add("O");
			} else if (upper === "DO" || upper === "OD") {
				set.add("O");
				set.add("D");
			}
		}
		return Array.from(set);
	}, [toothData?.surfaces]);

	const [showEndoTable, setShowEndoTable] = useState<boolean>(
		toothData?.state === "Pulpitis" || toothData?.state === "Periodontitis",
	);

	const isFrontal = (toothNumber % 10) <= 3;

	const handleToggleSurface = (surface: SurfaceKey) => {
		const next = currentSurfaces.includes(surface)
			? currentSurfaces.filter((s) => s !== surface)
			: [...currentSurfaces, surface];

		onUpdateTooth?.({
			surfaces: next,
			state: toothData?.state === "Healthy" ? "Caries" : toothData?.state ?? "Caries",
		});
	};

	const handleApplyMacro = (macro: BlackClassificationMacro) => {
		onUpdateTooth?.({
			surfaces: [...macro.surfaces],
			state: macro.suggestedState,
		});
		showToast(`Применен макрос: ${macro.label} (${macro.titleRu})`, "info");
	};

	const handleStateChange = (state: ToothState) => {
		onUpdateTooth?.({ state });
		if (state === "Pulpitis" || state === "Periodontitis") {
			setShowEndoTable(true);
		}
	};

	const handleMaterialChange = (material: RestorativeMaterialKey) => {
		onUpdateTooth?.({ material });
	};

	const iropzCalculated = useMemo(() => {
		const surfacesCount = currentSurfaces.length;
		if (surfacesCount === 0) return 0;
		if (surfacesCount === 1) return 0.2;
		if (surfacesCount === 2) return 0.45;
		if (surfacesCount === 3) return 0.65;
		if (surfacesCount === 4) return 0.85;
		return 1.0;
	}, [currentSurfaces]);

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-surfaces-endo-matrix">
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

			{/* 1-Click Tooth Status Buttons */}
			<div className="dente-status-chips-grid">
				{TOOTH_STATES.map((st) => {
					const isSelected = (toothData?.state ?? "Healthy") === st.id;
					return (
						<button
							key={st.id}
							type="button"
							onClick={() => handleStateChange(st.id)}
							className={`dente-touch-chip ${isSelected ? "active" : ""}`}
							style={{
								borderColor: isSelected ? st.color : undefined,
								color: isSelected ? "var(--on-teal, #ffffff)" : undefined,
								backgroundColor: isSelected ? st.color : undefined,
							}}
							data-testid={`state-chip-${st.id}`}
						>
							<span>{st.label}</span>
							{isSelected && <Check size={13} />}
						</button>
					);
				})}
			</div>

			{/* MOD 5-Surface Interactive Matrix */}
			<div className="dente-surface-interactive-box">
				<div className="dente-surface-label-row">
					<span className="dente-surface-label">
						Выбор поверхностей поражения: <strong>{currentSurfaces.length > 0 ? currentSurfaces.join("") : "Интактно"}</strong>
					</span>
					<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
						<button
							type="button"
							onClick={() =>
								onUpdateTooth?.({
									surfaces: ["M", "O", "D"],
									state: toothData?.state === "Healthy" ? "Caries" : toothData?.state ?? "Caries",
								})
							}
							className={`dente-surface-quick-combo-btn ${currentSurfaces.includes("M") && currentSurfaces.includes("O") && currentSurfaces.includes("D") ? "active" : ""}`}
							title="Медиально-окклюзионно-дистальная (MOD)"
						>
							MOD
						</button>
						<button
							type="button"
							onClick={() =>
								onUpdateTooth?.({
									surfaces: ["M", "O"],
									state: toothData?.state === "Healthy" ? "Caries" : toothData?.state ?? "Caries",
								})
							}
							className={`dente-surface-quick-combo-btn ${currentSurfaces.includes("M") && currentSurfaces.includes("O") && !currentSurfaces.includes("D") ? "active" : ""}`}
							title="Медиально-окклюзионная (MO)"
						>
							MO
						</button>
						<button
							type="button"
							onClick={() =>
								onUpdateTooth?.({
									surfaces: ["O", "D"],
									state: toothData?.state === "Healthy" ? "Caries" : toothData?.state ?? "Caries",
								})
							}
							className={`dente-surface-quick-combo-btn ${currentSurfaces.includes("O") && currentSurfaces.includes("D") && !currentSurfaces.includes("M") ? "active" : ""}`}
							title="Окклюзионно-дистальная (OD)"
						>
							OD
						</button>
						<button
							type="button"
							onClick={() => onUpdateTooth?.({ surfaces: [] })}
							className="dente-text-action-btn"
							title="Очистить поверхности (интактно)"
						>
							Сбросить
						</button>
					</div>
				</div>

				<div className="dente-surface-diagram-container">
					{/* Cross 5-surface layout: Top=V, Left=M, Center=O/I, Right=D, Bottom=L */}
					<div className="dente-surface-cross-layout">
						{/* Vestibular / Buccal */}
						<button
							type="button"
							onClick={() => handleToggleSurface("V")}
							className={`dente-surface-tile tile-top ${currentSurfaces.includes("V") ? "selected" : ""}`}
							title="Вестибулярная / Щечная поверхность (V/B)"
							data-testid="surface-btn-V"
						>
							<span className="tile-letter">V</span>
							<span className="tile-name">Вестиб.</span>
						</button>

						<div className="dente-surface-middle-row">
							{/* Mesial */}
							<button
								type="button"
								onClick={() => handleToggleSurface("M")}
								className={`dente-surface-tile tile-left ${currentSurfaces.includes("M") ? "selected" : ""}`}
								title="Медиальная поверхность (M)"
								data-testid="surface-btn-M"
							>
								<span className="tile-letter">M</span>
								<span className="tile-name">Медиал.</span>
							</button>

							{/* Occlusal / Incisal */}
							<button
								type="button"
								onClick={() => handleToggleSurface("O")}
								className={`dente-surface-tile tile-center ${currentSurfaces.includes("O") ? "selected" : ""}`}
								title={isFrontal ? "Режущий край (Incisal)" : "Окклюзионная поверхность (Occlusal)"}
								data-testid="surface-btn-O"
							>
								<span className="tile-letter">{isFrontal ? "I" : "O"}</span>
								<span className="tile-name">{isFrontal ? "Реж." : "Окклюз."}</span>
							</button>

							{/* Distal */}
							<button
								type="button"
								onClick={() => handleToggleSurface("D")}
								className={`dente-surface-tile tile-right ${currentSurfaces.includes("D") ? "selected" : ""}`}
								title="Дистальная поверхность (D)"
								data-testid="surface-btn-D"
							>
								<span className="tile-letter">D</span>
								<span className="tile-name">Дистал.</span>
							</button>
						</div>

						{/* Lingual / Palatal */}
						<button
							type="button"
							onClick={() => handleToggleSurface("L")}
							className={`dente-surface-tile tile-bottom ${currentSurfaces.includes("L") ? "selected" : ""}`}
							title="Язычная / Нёбная поверхность (L/P)"
							data-testid="surface-btn-L"
						>
							<span className="tile-letter">L</span>
							<span className="tile-name">Язычн.</span>
						</button>
					</div>
				</div>

				{/* Black Quick Classification Macros */}
				<div className="dente-macros-chips-row">
					<span className="dente-macros-title">По Блэку:</span>
					{BLACK_MACROS.map((macro) => (
						<button
							key={macro.id}
							type="button"
							onClick={() => handleApplyMacro(macro)}
							className="dente-macro-chip"
							title={macro.titleRu}
						>
							{macro.label}
						</button>
					))}
				</div>
			</div>

			{/* Restorative Material Selection */}
			<div className="dente-material-selection-box">
				<label className="dente-field-label">Пломбировочный / ортопедический материал:</label>
				<div className="dente-materials-grid">
					{RESTORATIVE_MATERIALS.map((mat) => {
						const isSelected = (toothData?.material ?? "composite") === mat.id;
						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => handleMaterialChange(mat.id)}
								className={`dente-material-btn ${isSelected ? "selected" : ""}`}
							>
								<span className="material-title">{mat.label}</span>
								<span className="material-sub">{mat.subLabel}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Root Canal & Apex Metrics Accordion delegated to ToothEndoCanalsSection */}
			<ToothEndoCanalsSection
				toothNumber={toothNumber}
				toothData={toothData}
				showEndoTable={showEndoTable}
				onToggleShowEndoTable={() => setShowEndoTable((prev) => !prev)}
				onUpdateTooth={onUpdateTooth}
				onInsertToProtocol={onInsertToProtocol}
			/>
		</div>
	);
};

export default ToothSurfacesAndEndoMatrix;

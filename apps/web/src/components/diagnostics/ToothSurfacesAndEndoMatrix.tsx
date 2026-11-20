import React from "react";
import { isPrimaryTooth } from "@dental/shared";
import type { ToothData } from "../odontogram/ToothChart";
import { ChairsideEndoQuickBar } from "../endo/ChairsideEndoQuickBar";
import { ToothSurfacesHeader } from "./surfaces/ToothSurfacesHeader";
import { ToothStateChipsRow } from "./surfaces/ToothStateChipsRow";
import { ToothSurfacesCrossDiagram } from "./surfaces/ToothSurfacesCrossDiagram";
import { ToothMaterialSelector } from "./surfaces/ToothMaterialSelector";
import { useToothSurfacesState } from "./surfaces/useToothSurfacesState";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { showToast } from "../GlobalToast";

export * from "./toothSurfacesConstants";

export interface ToothSurfacesAndEndoMatrixProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	patientId?: string | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onOpenEndoStudio?: (() => void) | undefined;
}

export const ToothSurfacesAndEndoMatrix: React.FC<ToothSurfacesAndEndoMatrixProps> = ({
	toothNumber,
	toothData,
	patientId,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenEndoStudio,
}) => {
	const {
		currentSurfaces,
		iropzCalculated,
		handleToggleSurface,
		handleSetSurfaces,
		handleClearSurfaces,
		handleApplyMacro,
		handleStateChange,
		handleMaterialChange,
	} = useToothSurfacesState({ toothData, onUpdateTooth });

	const isFrontal = (toothNumber % 10) <= 3;

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-surfaces-endo-matrix">
			<ToothSurfacesHeader iropzCalculated={iropzCalculated} />

			<ToothStateChipsRow
				toothData={toothData}
				onStateChange={handleStateChange}
			/>

			<ToothSurfacesCrossDiagram
				currentSurfaces={currentSurfaces}
				isFrontal={isFrontal}
				onToggleSurface={handleToggleSurface}
				onSetSurfaces={handleSetSurfaces}
				onClearSurfaces={handleClearSurfaces}
				onApplyMacro={handleApplyMacro}
			/>

			<ToothMaterialSelector
				toothData={toothData}
				onMaterialChange={handleMaterialChange}
			/>

			{isPrimaryTooth(toothNumber) ? (
				<div className="p-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] space-y-2" data-testid="pediatric-pulpotomy-quickbar">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--primary)]">Пульпотомия молочного зуба #{toothNumber}</span>
						<span className="text-[11px] font-medium text-[var(--ink-muted)]">МКБ-10: K04.0 (Пульпит)</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								const text = `Витальная пульпотомия молочного зуба ${toothNumber}. Ампутация коронковой пульпы, гемостаз, наложение пасты Pulpotec / MTA на устья корневых каналов, герметичная реставрация СИЦ / коронка.`;
								onInsertToProtocol?.(text);
								onUpdateTooth?.({ state: "Root_Canal_Treated" });
								showToast(`Протокол пульпотомии зуба ${toothNumber} внесен в карту`, "success", 3000);
							}}
							className="dente-btn dente-btn-secondary min-h-[36px] h-9 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
							data-testid="btn-pediatric-pulpotomy-pulpotec"
						>
							<span>✓ Пульпотомия (Pulpotec / MTA)</span>
						</button>
					</div>
				</div>
			) : (
				<ChairsideEndoQuickBar
					activeTooth={toothNumber}
					toothState={toothData?.state}
					patientId={patientId}
					onInsertToDiary={(soapText) => {
						onInsertToProtocol?.(soapText);
					}}
					onOpenFullModal={
						onOpenEndoStudio ??
						(() => {
							useUiSurfaceStore.getState().openPrimaryModal("endo_canal", { toothNumber });
						})
					}
				/>
			)}
		</div>
	);
};

export default ToothSurfacesAndEndoMatrix;

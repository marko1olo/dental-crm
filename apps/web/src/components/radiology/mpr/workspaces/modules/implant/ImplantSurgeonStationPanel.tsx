import React from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { DentalImplant } from "../../../../../icons/DentalIcons";
import type { ClinicalImplantSpec } from "../../implant/implantCatalog";
import type { ImplantBrandKey } from "../../../../implantSafetyEngine";
import type { ZakharovEdentulousToothFdi } from "../../../../zakharovRidgeAutomation";
import { ImplantBrandSelector } from "./ImplantBrandSelector";
import { ImplantDimensionsSelector } from "./ImplantDimensionsSelector";
import { ImplantPoseControls } from "./ImplantPoseControls";
import { ImplantActionButtons } from "./ImplantActionButtons";
import { ImplantNerveAndBoneHud } from "./ImplantNerveAndBoneHud";
import { ImplantRidgeMorphometryCard } from "./ImplantRidgeMorphometryCard";

export interface ImplantSurgeonStationPanelProps {
	readonly selectedBrand: string;
	readonly onSelectBrand?: ((brand: ImplantBrandKey) => void) | undefined;
	readonly clinicalImplant: ClinicalImplantSpec;
	readonly selectedDiameterMm: number;
	readonly onSelectDiameterMm?: ((diameter: number) => void) | undefined;
	readonly selectedLengthMm: number;
	readonly onSelectLengthMm?: ((length: number) => void) | undefined;
	readonly platformColor: string;
	readonly currentXOffsetMm: number;
	readonly currentDepthMm: number;
	readonly currentAngulationDeg: number;
	readonly handleUpdateXOffset: (val: number) => void;
	readonly handleUpdateDepth: (val: number) => void;
	readonly handleUpdateAngulation: (val: number) => void;
	readonly handleResetPose: () => void;
	readonly handleExportToPlan?: (() => void) | undefined;
	readonly handleExportToEmr?: (() => void) | undefined;
	readonly displayBoneClass: string;
	readonly displayMeanHU: number | null;
	readonly displayTorque: string;
	readonly displayNerveClearanceMm: number | null;
	readonly displayDrillingProtocol: string;
	readonly isNerveDanger: boolean;
	readonly isNerveWarning: boolean;
	readonly ridgeWidths: { w2: number; w4: number; w6: number; h: number; isAdequate: boolean; isDetected: boolean };
	readonly edentulousTooth: ZakharovEdentulousToothFdi;
	readonly setEdentulousTooth: (tooth: ZakharovEdentulousToothFdi) => void;
	readonly activeCrossSection?: { nearestToothFdi?: string | null } | undefined;
	readonly isEditing043: boolean;
	readonly setIsEditing043: React.Dispatch<React.SetStateAction<boolean>>;
	readonly edited043Text: string;
	readonly setEdited043Text: (text: string) => void;
	readonly edentulousData: any;
	readonly resolvedPatient: string;
}

export const ImplantSurgeonStationPanel: React.FC<ImplantSurgeonStationPanelProps> = (props) => {
	const {
		selectedBrand, onSelectBrand, clinicalImplant, selectedDiameterMm, onSelectDiameterMm,
		selectedLengthMm, onSelectLengthMm, platformColor, currentXOffsetMm, currentDepthMm,
		currentAngulationDeg, handleUpdateXOffset, handleUpdateDepth, handleUpdateAngulation,
		handleResetPose, handleExportToPlan, handleExportToEmr, displayBoneClass, displayMeanHU,
		displayTorque, displayNerveClearanceMm, displayDrillingProtocol, isNerveDanger, isNerveWarning,
		ridgeWidths, edentulousTooth, setEdentulousTooth, activeCrossSection, isEditing043,
		setIsEditing043, edited043Text, setEdited043Text, edentulousData, resolvedPatient,
	} = props;

	return (
		<div className="flex flex-col min-h-0 min-w-0 w-full h-full relative rounded-md overflow-y-auto border border-amber-500/50 bg-zinc-950 p-2 gap-1.5 shadow-xl" data-testid="cbct-implant-surgeon-station-panel">
			<div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
				<div className="flex items-center gap-1.5">
					<DentalImplant className="w-4 h-4 text-amber-400" />
					<h3 className="text-xs font-bold text-zinc-100">Станция хирурга-имплантолога</h3>
				</div>
				<div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
					<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: platformColor }} />
					<span className="text-zinc-200 font-bold">{selectedBrand.toUpperCase()}</span>
					<span className="text-zinc-400">Ø{selectedDiameterMm.toFixed(1)} × L{selectedLengthMm.toFixed(1)} мм</span>
				</div>
			</div>

			<ImplantBrandSelector selectedBrand={selectedBrand} onSelectBrand={onSelectBrand} articleNumber={clinicalImplant.articleNumber} />
			<ImplantDimensionsSelector selectedDiameterMm={selectedDiameterMm} onSelectDiameterMm={onSelectDiameterMm} selectedLengthMm={selectedLengthMm} onSelectLengthMm={onSelectLengthMm} platformColor={platformColor} />
			<ImplantPoseControls currentXOffsetMm={currentXOffsetMm} currentDepthMm={currentDepthMm} currentAngulationDeg={currentAngulationDeg} handleUpdateXOffset={handleUpdateXOffset} handleUpdateDepth={handleUpdateDepth} handleUpdateAngulation={handleUpdateAngulation} handleResetPose={handleResetPose} />
			<ImplantActionButtons handleExportToPlan={handleExportToPlan} handleExportToEmr={handleExportToEmr} />

			<details className="group rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs transition-all overflow-hidden mt-1" data-testid="cbct-implant-ai-assistant-accordion">
				<summary className="flex items-center justify-between p-2 cursor-pointer select-none hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 list-none">
					<div className="flex items-center gap-1.5 font-medium">
						<Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
						<span>Клинический ИИ-ассистент</span>
						<span className="text-[10px] text-zinc-500 font-normal">(опционально)</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-[10px] font-mono text-zinc-400">{displayBoneClass} · {displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "—"}</span>
						<ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-open:rotate-180 transition-transform shrink-0" />
					</div>
				</summary>

				<div className="p-2 pt-1 flex flex-col gap-2 border-t border-zinc-800/60">
					<ImplantNerveAndBoneHud isNerveDanger={isNerveDanger} isNerveWarning={isNerveWarning} displayNerveClearanceMm={displayNerveClearanceMm} displayBoneClass={displayBoneClass} displayMeanHU={displayMeanHU} displayTorque={displayTorque} displayDrillingProtocol={displayDrillingProtocol} />
					<ImplantRidgeMorphometryCard ridgeWidths={ridgeWidths} selectedDiameterMm={selectedDiameterMm} selectedLengthMm={selectedLengthMm} edentulousTooth={edentulousTooth} setEdentulousTooth={setEdentulousTooth} activeCrossSection={activeCrossSection} isEditing043={isEditing043} setIsEditing043={setIsEditing043} edited043Text={edited043Text} setEdited043Text={setEdited043Text} edentulousData={edentulousData} resolvedPatient={resolvedPatient} handleExportToEmr={handleExportToEmr} />
				</div>
			</details>
		</div>
	);
};

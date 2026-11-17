import React from "react";
import { CbctLeftToolDock } from "../CbctLeftToolDock.js";
import { CbctMprViewportsGrid } from "../mpr/CbctMprViewportsGrid.js";
import type { StudioViewportGridProps } from "./types.js";

export const StudioViewportGrid: React.FC<StudioViewportGridProps> = (props) => {
	return (
		<>
			<CbctLeftToolDock
				activeTool={props.activeTool}
				onSelectTool={props.onSelectTool}
				activePresetId={props.activePresetId}
				onSelectPreset={props.onSelectPreset}
				slabMode={props.slabMode}
				onSelectSlabMode={props.onSelectSlabMode}
				slabThicknessMm={props.slabThicknessMm}
				onChangeSlabThicknessMm={props.onChangeSlabThicknessMm}
				invertColors={props.invertColors}
				onToggleInvertColors={props.onToggleInvertColors}
				onResetAll={props.onResetAll}
				showDentalArch={props.showDentalArch}
				onToggleDentalArch={props.onToggleDentalArch}
				onAutoDetectArch={props.onAutoDetectArch}
			/>

			<CbctMprViewportsGrid {...props} />
		</>
	);
};

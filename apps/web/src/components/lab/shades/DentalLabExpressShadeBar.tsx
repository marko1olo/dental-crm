import React from "react";
import { DentalLab3dMasterGrid } from "./DentalLab3dMasterGrid";
import { DentalLabBleachGrid } from "./DentalLabBleachGrid";
import { DentalLabStumpGrid } from "./DentalLabStumpGrid";
import { DentalLabExpressShadeNav } from "./DentalLabExpressShadeNav";
import { DentalLabExpressClassicalGroups } from "./DentalLabExpressClassicalGroups";

export interface DentalLabExpressShadeBarProps {
	readonly shadeSystem: "classical" | "3d_master" | "bleach" | "stump";
	readonly setShadeSystem: (sys: "classical" | "3d_master" | "bleach" | "stump") => void;
	readonly currentShade: string;
	readonly onSelectShade: (shade: string) => void;
	readonly selectedStumpShade?: string | null | undefined;
	readonly onSelectStumpShade?: ((stump: string) => void) | undefined;
}

export const DentalLabExpressShadeBar: React.FC<
	DentalLabExpressShadeBarProps
> = ({
	shadeSystem,
	setShadeSystem,
	currentShade,
	onSelectShade,
	selectedStumpShade,
	onSelectStumpShade,
}) => {
	return (
		<div className="space-y-3">
			<DentalLabExpressShadeNav
				shadeSystem={shadeSystem}
				setShadeSystem={setShadeSystem}
				currentShade={currentShade}
				selectedStumpShade={selectedStumpShade}
			/>

			{shadeSystem === "classical" && (
				<DentalLabExpressClassicalGroups
					currentShade={currentShade}
					onSelectShade={onSelectShade}
				/>
			)}

			{shadeSystem === "3d_master" && (
				<DentalLab3dMasterGrid
					selectedShade={currentShade}
					onSelectShade={onSelectShade}
				/>
			)}

			{shadeSystem === "bleach" && (
				<DentalLabBleachGrid
					selectedShade={currentShade}
					onSelectShade={onSelectShade}
				/>
			)}

			{shadeSystem === "stump" && (
				<DentalLabStumpGrid
					selectedStumpShade={selectedStumpShade}
					onSelectStumpShade={onSelectStumpShade}
					mode="tab"
				/>
			)}
		</div>
	);
};

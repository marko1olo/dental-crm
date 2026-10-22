import React from "react";
import type { ShadeSystemKey } from "./dentalLabShadePickerTypes";
import { DentalLab3dMasterGrid } from "./DentalLab3dMasterGrid";
import { DentalLabBleachGrid } from "./DentalLabBleachGrid";
import { DentalLabClassicalGrid } from "./DentalLabClassicalGrid";
import { DentalLabStumpGrid } from "./DentalLabStumpGrid";

export interface DentalLabShadeSystemViewsProps {
	readonly currentSystem: ShadeSystemKey;
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
	readonly selectedStumpShade?: string | null | undefined;
	readonly onSelectStumpShade?: ((stumpShade: string) => void) | undefined;
	readonly showStumpSelector?: boolean | undefined;
}

export function DentalLabShadeSystemViews({
	currentSystem,
	selectedShade,
	onSelectShade,
	selectedStumpShade,
	onSelectStumpShade,
	showStumpSelector,
}: DentalLabShadeSystemViewsProps): React.JSX.Element {
	return (
		<>
			{currentSystem === "classical" && (
				<DentalLabClassicalGrid
					selectedShade={selectedShade}
					onSelectShade={onSelectShade}
				/>
			)}
			{currentSystem === "3d_master" && (
				<DentalLab3dMasterGrid
					selectedShade={selectedShade}
					onSelectShade={onSelectShade}
				/>
			)}
			{currentSystem === "bleach" && (
				<DentalLabBleachGrid
					selectedShade={selectedShade}
					onSelectShade={onSelectShade}
				/>
			)}
			{currentSystem === "stump" && (
				<DentalLabStumpGrid
					selectedStumpShade={selectedStumpShade}
					onSelectStumpShade={onSelectStumpShade}
					mode="tab"
				/>
			)}
			{showStumpSelector && (
				<DentalLabStumpGrid
					selectedStumpShade={selectedStumpShade}
					onSelectStumpShade={onSelectStumpShade}
					mode="inline"
				/>
			)}
		</>
	);
}

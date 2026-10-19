import React from "react";

if (typeof document !== "undefined") {
	void import("../../styles/components.css");
}

import { DentalLab3dMasterGrid } from "./shades/DentalLab3dMasterGrid";
import { DentalLabBleachGrid } from "./shades/DentalLabBleachGrid";
import { DentalLabClassicalGrid } from "./shades/DentalLabClassicalGrid";
import { DentalLabPhotoReference } from "./shades/DentalLabPhotoReference";
import { DentalLabShadeHeader } from "./shades/DentalLabShadeHeader";
import { DentalLabStumpGrid } from "./shades/DentalLabStumpGrid";

export interface DentalLabShadePickerProps {
	readonly shadeSystem?: "classical" | "3d_master" | "bleach" | "stump";
	readonly onShadeSystemChange?: (
		system: "classical" | "3d_master" | "bleach" | "stump",
	) => void;
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
	readonly selectedStumpShade?: string | null;
	readonly onSelectStumpShade?: (stumpShade: string) => void;
	readonly showStumpSelector?: boolean;
	readonly showBleachTab?: boolean;
	readonly compact?: boolean;
	readonly shadePhotoUrl?: string | null;
	readonly onShadePhotoChange?: (url: string | null) => void;
}

export function DentalLabShadePicker({
	shadeSystem = "classical",
	onShadeSystemChange,
	selectedShade,
	onSelectShade,
	selectedStumpShade,
	onSelectStumpShade,
	showStumpSelector = false,
	showBleachTab = true,
	compact: _compact = false,
	shadePhotoUrl,
	onShadePhotoChange,
}: DentalLabShadePickerProps) {
	const [internalSystem, setInternalSystem] = React.useState<
		"classical" | "3d_master" | "bleach" | "stump"
	>(shadeSystem || "classical");
	const currentSystem = onShadeSystemChange
		? shadeSystem || "classical"
		: internalSystem;

	React.useEffect(() => {
		if (shadeSystem) setInternalSystem(shadeSystem);
	}, [shadeSystem]);

	const handleTab = (sys: "classical" | "3d_master" | "bleach" | "stump") => {
		if (onShadeSystemChange) onShadeSystemChange(sys);
		else setInternalSystem(sys);
	};

	return (
		<div className="rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] p-2.5 sm:p-3 space-y-3 max-w-full overflow-x-clip">
			<DentalLabShadeHeader
				currentSystem={currentSystem}
				onSystemChange={handleTab}
				selectedShade={selectedShade}
				selectedStumpShade={selectedStumpShade}
				showBleachTab={showBleachTab}
			/>
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
			<DentalLabPhotoReference
				selectedShade={selectedShade}
				shadePhotoUrl={shadePhotoUrl}
				onShadePhotoChange={onShadePhotoChange}
			/>
		</div>
	);
}

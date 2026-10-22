import React from "react";

if (typeof document !== "undefined") {
	void import("../../styles/components.css");
}

import { DentalLab3dMasterGrid } from "./shades/DentalLab3dMasterGrid";
import { DentalLabBleachGrid } from "./shades/DentalLabBleachGrid";
import { DentalLabClassicalGrid } from "./shades/DentalLabClassicalGrid";
import { DentalLabPhotoReference } from "./shades/DentalLabPhotoReference";
import { DentalLabShadeHeader } from "./shades/DentalLabShadeHeader";
import { DentalLabStratificationSection } from "./shades/DentalLabStratificationSection";
import { DentalLabStumpGrid } from "./shades/DentalLabStumpGrid";

export interface DentalLabShadePickerProps {
	readonly shadeSystem?: ("classical" | "3d_master" | "bleach" | "stump") | undefined;
	readonly onShadeSystemChange?:
		| ((system: "classical" | "3d_master" | "bleach" | "stump") => void)
		| undefined;
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
	readonly selectedStumpShade?: string | null | undefined;
	readonly onSelectStumpShade?: ((stumpShade: string) => void) | undefined;
	readonly showStumpSelector?: boolean | undefined;
	readonly showBleachTab?: boolean | undefined;
	readonly compact?: boolean | undefined;
	readonly shadePhotoUrl?: string | null | undefined;
	readonly onShadePhotoChange?: ((url: string | null) => void) | undefined;

	// 3-Zone Stratification & Characterizations (SSOT)
	readonly showStratification?: boolean | undefined;
	readonly shadeCervical?: string | undefined;
	readonly onShadeCervicalChange?: ((s: string) => void) | undefined;
	readonly shadeBody?: string | undefined;
	readonly onShadeBodyChange?: ((s: string) => void) | undefined;
	readonly shadeIncisal?: string | undefined;
	readonly onShadeIncisalChange?: ((s: string) => void) | undefined;
	readonly translucency?: string | undefined;
	readonly onTranslucencyChange?: ((t: string) => void) | undefined;
	readonly mamelons?: boolean | undefined;
	readonly onMamelonsChange?: ((m: boolean) => void) | undefined;
	readonly calcifications?: boolean | undefined;
	readonly onCalcificationsChange?: ((c: boolean) => void) | undefined;
	readonly opalescence?: boolean | undefined;
	readonly onOpalescenceChange?: ((o: boolean) => void) | undefined;
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
	showStratification = false,
	shadeCervical,
	onShadeCervicalChange,
	shadeBody,
	onShadeBodyChange,
	shadeIncisal,
	onShadeIncisalChange,
	translucency,
	onTranslucencyChange,
	mamelons,
	onMamelonsChange,
	calcifications,
	onCalcificationsChange,
	opalescence,
	onOpalescenceChange,
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
			{(showStratification || shadeCervical !== undefined) && (
				<>
					<DentalLabStratificationSection
						currentPrimaryShade={selectedShade}
						shadeCervical={shadeCervical || selectedShade}
						setShadeCervical={onShadeCervicalChange || (() => {})}
						shadeBody={shadeBody || selectedShade}
						setShadeBody={onShadeBodyChange || onSelectShade}
						shadeIncisal={shadeIncisal || selectedShade}
						setShadeIncisal={onShadeIncisalChange || (() => {})}
						shadeStump={selectedStumpShade || ""}
						setShadeStump={onSelectStumpShade || (() => {})}
						translucency={translucency || "HT"}
						setTranslucency={onTranslucencyChange || (() => {})}
					/>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
						<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
							<input
								type="checkbox"
								checked={Boolean(mamelons)}
								onChange={(e) => onMamelonsChange?.(e.target.checked)}
								className="w-4 h-4 accent-teal-600 rounded"
								data-testid="mamelons-checkbox"
							/>
							<span className="font-semibold text-[11px]">Мамелоны края</span>
						</label>
						<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
							<input
								type="checkbox"
								checked={Boolean(calcifications)}
								onChange={(e) => onCalcificationsChange?.(e.target.checked)}
								className="w-4 h-4 accent-teal-600 rounded"
								data-testid="calcifications-checkbox"
							/>
							<span className="font-semibold text-[11px]">Кальцификаты</span>
						</label>
						{onOpalescenceChange && (
							<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
								<input
									type="checkbox"
									checked={Boolean(opalescence)}
									onChange={(e) => onOpalescenceChange(e.target.checked)}
									className="w-4 h-4 accent-teal-600 rounded"
									data-testid="opalescence-checkbox"
								/>
								<span className="font-semibold text-[11px]">Опалесценция</span>
							</label>
						)}
					</div>
				</>
			)}
		</div>
	);
}

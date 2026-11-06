import React from "react";
import type { DentalLabShadePickerProps, ShadeSystemKey } from "./shades/dentalLabShadePickerTypes";
import { DentalLabPhotoReference } from "./shades/DentalLabPhotoReference";
import { DentalLabShadeHeader } from "./shades/DentalLabShadeHeader";
import { DentalLabStratificationSection } from "./shades/DentalLabStratificationSection";
import { DentalLabCharacterizationCheckboxes } from "./shades/DentalLabCharacterizationCheckboxes";
import { DentalLabShadeSystemViews } from "./shades/DentalLabShadeSystemViews";

if (typeof document !== "undefined") {
	void import("../../styles/components.css");
}

export type { DentalLabShadePickerProps };

export interface DentalLabShadeSelectorProps {
	shadeSystem: "classical" | "3d_master" | "bleach";
	setShadeSystem: (system: "classical" | "3d_master" | "bleach") => void;
	shadeClassical: string;
	setShadeClassical: (s: string) => void;
	shade3dMaster: string;
	setShade3dMaster: (s: string) => void;
	shadeBleach: string;
	setShadeBleach: (s: string) => void;
	shadeCervical: string;
	setShadeCervical: (s: string) => void;
	shadeBody: string;
	setShadeBody: (s: string) => void;
	shadeIncisal: string;
	setShadeIncisal: (s: string) => void;
	shadeStump: string;
	setShadeStump: (s: string) => void;
	translucency: string;
	setTranslucency: (t: string) => void;
	mamelons: boolean;
	setMamelons: (m: boolean) => void;
	calcifications: boolean;
	setCalcifications: (c: boolean) => void;
	opalescence?: boolean;
	setOpalescence?: (o: boolean) => void;
	attachedImageUrl?: string | null;
	setAttachedImageUrl?: (url: string | null) => void;
}

export function DentalLabShadePicker(props: DentalLabShadePickerProps): React.JSX.Element {
	const {
		shadeSystem = "classical",
		onShadeSystemChange,
		selectedShade,
		onSelectShade,
		selectedStumpShade,
		onSelectStumpShade,
		showStumpSelector = false,
		showBleachTab = true,
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
	} = props;

	const [internalSystem, setInternalSystem] = React.useState<ShadeSystemKey>(shadeSystem || "classical");
	const currentSystem = onShadeSystemChange ? shadeSystem || "classical" : internalSystem;

	React.useEffect(() => {
		if (shadeSystem) setInternalSystem(shadeSystem);
	}, [shadeSystem]);

	const handleTab = (sys: ShadeSystemKey) => {
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

			<DentalLabShadeSystemViews
				currentSystem={currentSystem}
				selectedShade={selectedShade}
				onSelectShade={onSelectShade}
				selectedStumpShade={selectedStumpShade}
				onSelectStumpShade={onSelectStumpShade}
				showStumpSelector={showStumpSelector}
			/>

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

					<DentalLabCharacterizationCheckboxes
						mamelons={mamelons}
						onMamelonsChange={onMamelonsChange}
						calcifications={calcifications}
						onCalcificationsChange={onCalcificationsChange}
						opalescence={opalescence}
						onOpalescenceChange={onOpalescenceChange}
					/>
				</>
			)}
		</div>
	);
}

/**
 * DentalLabShadeSelector — объединенная функция селектора оттенков VITA в каноническом DentalLabShadePicker (SSOT).
 */
export function DentalLabShadeSelector(props: DentalLabShadeSelectorProps): React.JSX.Element {
	const currentPrimary =
		props.shadeSystem === "3d_master"
			? props.shade3dMaster
			: props.shadeSystem === "bleach"
				? props.shadeBleach
				: props.shadeClassical;

	const handleSelectShade = (shade: string) => {
		if (props.shadeSystem === "classical") props.setShadeClassical(shade);
		else if (props.shadeSystem === "3d_master") props.setShade3dMaster(shade);
		else props.setShadeBleach(shade);
		props.setShadeBody(shade);
	};

	const handleSystemChange = (
		sys: "classical" | "3d_master" | "bleach" | "stump",
	) => {
		if (sys !== "stump") props.setShadeSystem(sys);
	};

	return (
		<DentalLabShadePicker
			shadeSystem={props.shadeSystem}
			onShadeSystemChange={handleSystemChange}
			selectedShade={currentPrimary}
			onSelectShade={handleSelectShade}
			selectedStumpShade={props.shadeStump}
			onSelectStumpShade={props.setShadeStump}
			shadePhotoUrl={props.attachedImageUrl}
			onShadePhotoChange={props.setAttachedImageUrl}
			showStratification={true}
			shadeCervical={props.shadeCervical}
			onShadeCervicalChange={props.setShadeCervical}
			shadeBody={props.shadeBody}
			onShadeBodyChange={props.setShadeBody}
			shadeIncisal={props.shadeIncisal}
			onShadeIncisalChange={props.setShadeIncisal}
			translucency={props.translucency}
			onTranslucencyChange={props.setTranslucency}
			mamelons={props.mamelons}
			onMamelonsChange={props.setMamelons}
			calcifications={props.calcifications}
			onCalcificationsChange={props.setCalcifications}
			opalescence={props.opalescence}
			onOpalescenceChange={props.setOpalescence}
		/>
	);
}

export default DentalLabShadePicker;

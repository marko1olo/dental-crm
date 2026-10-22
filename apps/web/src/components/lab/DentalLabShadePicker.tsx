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

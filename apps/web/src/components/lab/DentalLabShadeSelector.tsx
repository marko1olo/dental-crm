import React from "react";
import { DentalLabShadePicker } from "./DentalLabShadePicker";

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

/**
 * DentalLabShadeSelector — фасад обратной совместимости,
 * делегирующий выбор цвета VITA в канонический SSOT DentalLabShadePicker.
 */
export function DentalLabShadeSelector(props: DentalLabShadeSelectorProps) {
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

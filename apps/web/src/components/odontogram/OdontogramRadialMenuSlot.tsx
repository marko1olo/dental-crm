import type React from "react";
import { dispatchOdontogramSoapAndBundle } from "./odontogramModuleConstants";
import type { ToothState } from "./ToothChart";
import { ToothRadialMenu } from "./ToothRadialMenu";

export interface OdontogramRadialMenuSlotProps {
	readonly radialMenuData: any;
	readonly setRadialMenuData: (data: any) => void;
	readonly selectedTeeth: readonly number[];
	readonly updateToothState: (
		targets: number[],
		state: ToothState,
		surfaces: readonly string[],
	) => Promise<void>;
	readonly patientId: string;
	readonly setActiveSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	readonly setEndoTooth: React.Dispatch<React.SetStateAction<number | null>>;
	readonly setContextDrawerTooth: (tooth: number | null) => void;
	readonly setIsFastCheckoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const OdontogramRadialMenuSlot: React.FC<
	OdontogramRadialMenuSlotProps
> = ({
	radialMenuData,
	setRadialMenuData,
	selectedTeeth,
	updateToothState,
	patientId,
	setActiveSurfaces,
	setEndoTooth,
	setContextDrawerTooth,
	setIsFastCheckoutOpen,
}) => {
	if (!radialMenuData) return null;

	return (
		<ToothRadialMenu
			toothNumber={radialMenuData.toothNumber}
			anchorRect={radialMenuData.anchorRect}
			currentState={radialMenuData.currentState}
			surfaces={radialMenuData.surfaces}
			onSelectState={(state, surfs) => {
				const num = radialMenuData.toothNumber;
				const targets =
					selectedTeeth.length > 0 && selectedTeeth.includes(num)
						? [...selectedTeeth]
						: [num];
				const toothSurfaces =
					surfs && surfs.length > 0 ? [...surfs] : undefined;
				void updateToothState(targets, state, toothSurfaces ?? []);
				const findingPayload =
					toothSurfaces && toothSurfaces.length > 0
						? { toothNumber: num, state, surfaces: toothSurfaces }
						: { toothNumber: num, state };
				dispatchOdontogramSoapAndBundle({
					targets,
					state,
					findings: [findingPayload],
					patientId,
				});
				setRadialMenuData(null);
			}}
			onSelectSurfaces={(surfs) => setActiveSurfaces([...surfs])}
			onOpenEndo={() => {
				setEndoTooth(radialMenuData.toothNumber);
				setRadialMenuData(null);
			}}
			onOpenTherapy={() => {
				setContextDrawerTooth(radialMenuData.toothNumber);
				setRadialMenuData(null);
			}}
			onAddToInvoice={() => {
				setIsFastCheckoutOpen(true);
				setRadialMenuData(null);
			}}
			onClose={() => setRadialMenuData(null)}
		/>
	);
};

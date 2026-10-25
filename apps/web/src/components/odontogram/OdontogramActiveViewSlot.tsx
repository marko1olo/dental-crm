import type { OdontogramViewMode } from "@dental/shared";
import type React from "react";
import { ClassicGostOdontogram } from "./ClassicGostOdontogram";
import { OdontogramLiveInvoice } from "./OdontogramLiveInvoice";
import { OdontogramStampPalette } from "./OdontogramStampPalette";
import { ToothChart, type ToothData, type ToothState } from "./ToothChart";

export interface OdontogramActiveViewSlotProps {
	readonly activeMode: OdontogramViewMode;
	readonly sharedViewProps: Record<string, unknown>;
	readonly showPulpAndCanals: boolean;
	readonly onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	readonly activeStampTool: ToothState | null;
	readonly setActiveStampTool: React.Dispatch<
		React.SetStateAction<ToothState | null>
	>;
	readonly handleQuickTriggerState: (state: ToothState) => void;
	readonly selectedTeeth: number[];
	readonly isLiveInvoiceOpen: boolean;
	readonly setIsLiveInvoiceOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly teethData: readonly ToothData[];
}

export const OdontogramActiveViewSlot: React.FC<
	OdontogramActiveViewSlotProps
> = ({
	activeMode,
	sharedViewProps,
	showPulpAndCanals,
	onQuickStateChange,
	activeStampTool,
	setActiveStampTool,
	handleQuickTriggerState,
	selectedTeeth,
	isLiveInvoiceOpen,
	setIsLiveInvoiceOpen,
	teethData,
}) => {
	return (
		<div className="flex flex-col lg:flex-row gap-3 w-full items-start">
			<div className="odontogram-active-view-slot w-full flex-1 min-w-0 flex flex-col gap-2.5">
				{activeMode === "anatomical_svg" && (
					<ToothChart
						{...sharedViewProps}
						useSurfaces={false}
						showPulpAndCanals={showPulpAndCanals}
						showPeriapicalHalos={true}
						showPeriodontalBoneLoss={true}
					/>
				)}
				{activeMode === "compact_clinical" && (
					<ToothChart
						{...sharedViewProps}
						useSurfaces={true}
						showPulpAndCanals={showPulpAndCanals}
						showPeriapicalHalos={true}
						showPeriodontalBoneLoss={true}
					/>
				)}
				{activeMode === "classic_gost" && (
					<ClassicGostOdontogram {...sharedViewProps} teethData={teethData} />
				)}

				{onQuickStateChange && (
					<OdontogramStampPalette
						activeStampTool={activeStampTool}
						setActiveStampTool={setActiveStampTool}
						onQuickStateChange={onQuickStateChange}
						handleQuickTriggerState={handleQuickTriggerState}
						selectedTeeth={selectedTeeth}
					/>
				)}
			</div>

			{isLiveInvoiceOpen && (
				<OdontogramLiveInvoice
					teethData={teethData}
					isOpen={isLiveInvoiceOpen}
					onClose={() => setIsLiveInvoiceOpen(false)}
					className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
				/>
			)}
		</div>
	);
};

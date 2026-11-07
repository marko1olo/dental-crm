import type { OdontogramViewMode } from "@dental/shared";
import type React from "react";
import { AnatomicalGate0FullArchView } from "./AnatomicalGate0FullArchView";
import { ClassicGostOdontogram } from "./ClassicGostOdontogram";
import { OdontogramBatchBar } from "./OdontogramBatchBar";
import { OdontogramLiveInvoice } from "./OdontogramLiveInvoice";
import { OdontogramQuickTextInput } from "./OdontogramQuickTextInput";
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
	readonly onSelectTeethGroup?: ((teeth: number[]) => void) | undefined;
	readonly onClearSelection?: (() => void) | undefined;
	readonly onInvertSelection?: (() => void) | undefined;
	readonly isPediatric?: boolean | undefined;
	readonly isMixed?: boolean | undefined;
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
	onSelectTeethGroup,
	onClearSelection,
	onInvertSelection,
	isPediatric,
	isMixed,
}) => {
	return (
		<div className="flex flex-col lg:flex-row gap-3 w-full items-start">
			<div className="odontogram-active-view-slot w-full flex-1 min-w-0 flex flex-col gap-2.5">
				{activeMode === "anatomical_svg" && (
					<AnatomicalGate0FullArchView
						{...sharedViewProps}
						teethData={teethData}
						selectedTeeth={selectedTeeth}
						onQuickStateChange={onQuickStateChange}
						activeStamp={activeStampTool}
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
					<>
						<OdontogramBatchBar
							selectedTeeth={selectedTeeth}
							onSelectTeethGroup={onSelectTeethGroup ?? (sharedViewProps?.onSelectTeethGroup as any)}
							onClearSelection={onClearSelection ?? (sharedViewProps?.onClearSelection as any)}
							onInvertSelection={onInvertSelection ?? (sharedViewProps?.onInvertSelection as any)}
							onQuickStateChange={onQuickStateChange}
							isPediatric={isPediatric ?? Boolean(sharedViewProps?.pediatricMode)}
							isMixed={isMixed ?? Boolean(sharedViewProps?.mixedDentition)}
						/>
						<OdontogramStampPalette
							activeStampTool={activeStampTool}
							setActiveStampTool={setActiveStampTool}
							onQuickStateChange={onQuickStateChange}
							handleQuickTriggerState={handleQuickTriggerState}
							selectedTeeth={selectedTeeth}
						/>
						<OdontogramQuickTextInput
							onApplyBatch={(batchOrTargets: any, maybeState?: any, maybeSurfaces?: any) => {
								if (!onQuickStateChange) return;
								if (Array.isArray(batchOrTargets) && batchOrTargets.length > 0 && typeof batchOrTargets[0] === "object") {
									for (const item of batchOrTargets) {
										onQuickStateChange([item.toothNumber], item.state, item.surfaces);
									}
								} else if (Array.isArray(batchOrTargets) && maybeState) {
									onQuickStateChange(batchOrTargets, maybeState, maybeSurfaces);
								}
							}}
						/>
					</>
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

import type { OdontogramViewMode } from "@dental/shared";
import type React from "react";
import { WheelerToothArch } from "./WheelerToothArch";
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
	const sharedSelectTeethGroup = typeof sharedViewProps?.onSelectTeethGroup === "function"
		? (sharedViewProps.onSelectTeethGroup as (teeth: number[]) => void)
		: undefined;
	const sharedClearSelection = typeof sharedViewProps?.onClearSelection === "function"
		? (sharedViewProps.onClearSelection as () => void)
		: undefined;
	const sharedInvertSelection = typeof sharedViewProps?.onInvertSelection === "function"
		? (sharedViewProps.onInvertSelection as () => void)
		: undefined;

	return (
		<div className="flex flex-col lg:flex-row gap-3 w-full items-start">
			<div className="odontogram-active-view-slot w-full flex-1 min-w-0 flex flex-col gap-2.5">
				{activeMode === "anatomical_svg" && (
					<WheelerToothArch
						{...sharedViewProps}
						teethData={teethData}
						selectedTeeth={selectedTeeth}
						onQuickStateChange={onQuickStateChange}
						activeStamp={activeStampTool}
						mode="interactive"
						dentitionMode={isPediatric ? "pediatric" : isMixed ? "mixed" : undefined}
						isPediatric={isPediatric}
						isMixed={isMixed}
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
					<div
						data-testid="odontogram-unified-console"
						className="odontogram-unified-console w-full flex flex-col gap-2 p-2 sm:p-2.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/50 border border-[var(--line,#e2e8f0)] dark:border-slate-800/80 shadow-2xs"
					>
						<OdontogramBatchBar
							selectedTeeth={selectedTeeth}
							onSelectTeethGroup={onSelectTeethGroup ?? sharedSelectTeethGroup}
							onClearSelection={onClearSelection ?? sharedClearSelection}
							onInvertSelection={onInvertSelection ?? sharedInvertSelection}
							onQuickStateChange={onQuickStateChange}
							isPediatric={isPediatric ?? Boolean(sharedViewProps?.pediatricMode)}
							isMixed={isMixed ?? Boolean(sharedViewProps?.mixedDentition)}
							className="bg-transparent border-0 p-0 shadow-none"
						/>
						<div className="w-full h-px bg-[var(--line,#e2e8f0)]/60 dark:bg-slate-800/60" />
						<OdontogramStampPalette
							activeStampTool={activeStampTool}
							setActiveStampTool={setActiveStampTool}
							onQuickStateChange={onQuickStateChange}
							handleQuickTriggerState={handleQuickTriggerState}
							selectedTeeth={selectedTeeth}
							className="bg-transparent border-0 p-0 shadow-none"
						/>
						<div className="w-full h-px bg-[var(--line,#e2e8f0)]/60 dark:bg-slate-800/60" />
						<OdontogramQuickTextInput
							className="bg-transparent border-0 p-0 shadow-none"
							onApplyBatch={(
								batchOrTargets: readonly { readonly toothNumber: number; readonly state: ToothState; readonly surfaces?: readonly string[] }[] | readonly number[],
								maybeState?: ToothState,
								maybeSurfaces?: readonly string[],
							) => {
								if (!onQuickStateChange) return;
								if (Array.isArray(batchOrTargets) && batchOrTargets.length > 0 && typeof batchOrTargets[0] === "object" && batchOrTargets[0] !== null) {
									for (const item of (batchOrTargets as readonly { readonly toothNumber: number; readonly state: ToothState; readonly surfaces?: readonly string[] }[])) {
										onQuickStateChange([item.toothNumber], item.state, item.surfaces);
									}
								} else if (Array.isArray(batchOrTargets) && maybeState) {
									onQuickStateChange(batchOrTargets as number[], maybeState, maybeSurfaces);
								}
							}}
						/>
					</div>
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

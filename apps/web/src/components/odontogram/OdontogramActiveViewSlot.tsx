import type { OdontogramViewMode } from "@dental/shared";
import React, { useState, useEffect, useCallback } from "react";
import { WheelerToothArch } from "./WheelerToothArch";
import { OdontogramBatchBar } from "./OdontogramBatchBar";

import { OdontogramLiveInvoice } from "./OdontogramLiveInvoice";
import { OdontogramQuickTextInput } from "./OdontogramQuickTextInput";
import { OdontogramStampPalette } from "./OdontogramStampPalette";
import { ToothChart, type ToothData, type ToothState } from "./ToothChart";
import { ORDER_804N_PROCEDURES } from "./odontogramLiveInvoiceCalculations";

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
	const [liveEstimateToast, setLiveEstimateToast] = useState<{
		toothNumbers: number[];
		state: ToothState;
		title: string;
		priceRub: number;
	} | null>(null);

	// Автоматическое скрытие тоста сметы через 5 секунд
	useEffect(() => {
		if (!liveEstimateToast) return;
		const timer = setTimeout(() => {
			setLiveEstimateToast(null);
		}, 5000);
		return () => clearTimeout(timer);
	}, [liveEstimateToast]);

	const handleInterceptedQuickStateChange = useCallback(
		(
			targets: number[],
			state: ToothState,
			surfaces?: readonly string[] | undefined,
		) => {
			onQuickStateChange?.(targets, state, surfaces);

			// Реактивное предложение добавить услугу в смету (Мандат 8ba / Дефект №3)
			const procedure = ORDER_804N_PROCEDURES[state];
			if (procedure && targets.length > 0) {
				const totalPrice = procedure.price * targets.length;
				setLiveEstimateToast({
					toothNumbers: [...targets],
					state,
					title: procedure.title,
					priceRub: totalPrice,
				});
			}
		},
		[onQuickStateChange],
	);

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
		<div className="flex flex-col lg:flex-row gap-3 w-full items-start relative">
			<div className="odontogram-active-view-slot w-full flex-1 min-w-0 flex flex-col gap-2.5">
				{(activeMode === "anatomical_svg" || activeMode === "classic_gost") && (
					<WheelerToothArch
						{...sharedViewProps}
						teethData={teethData}
						selectedTeeth={selectedTeeth}
						onQuickStateChange={handleInterceptedQuickStateChange}
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
						hideExpressActions={true}
					/>
				)}

				{/* Контекстный баннер-чип быстрого перехода в смету (Мандат 8ba) */}
				{liveEstimateToast && !isLiveInvoiceOpen && (
					<div
						data-testid="live-estimate-toast"
						className="live-estimate-toast w-full px-3.5 py-2 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-[var(--paper)] border border-[var(--primary,#0d9488)]/40 shadow-sm flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200"
					>
						<div className="flex items-center gap-2 min-w-0">
							<span className="w-2 h-2 rounded-full bg-[var(--primary,#0d9488)] shrink-0 animate-pulse" />
							<span className="text-[var(--ink-muted,#64748b)]">Добавлено в расчёт:</span>
							<span className="font-semibold text-[var(--ink,#0f172a)] dark:text-[var(--ink)] truncate">
								Зуб {liveEstimateToast.toothNumbers.join(", ")} ({liveEstimateToast.state})
							</span>
							<span className="font-mono font-medium text-[var(--primary,#0d9488)] shrink-0">
								{liveEstimateToast.priceRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<button
								type="button"
								data-testid="live-estimate-open-btn"
								onClick={() => {
									setIsLiveInvoiceOpen(true);
									setLiveEstimateToast(null);
								}}
								className="h-7 px-2.5 rounded-lg bg-[var(--primary,#0d9488)] hover:bg-[var(--primary-hover,#0f766e)] text-white text-xs font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
							>
								Показать смету
							</button>
							<button
								type="button"
								aria-label="Закрыть уведомление о смете"
								onClick={() => setLiveEstimateToast(null)}
								className="w-6 h-6 rounded-md hover:bg-[var(--paper-soft,#f1f5f9)] dark:hover:bg-[var(--paper-soft)] text-[var(--ink-muted,#94a3b8)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors text-sm"
							>
								✕
							</button>
						</div>
					</div>
				)}

				{onQuickStateChange && (
					<div
						data-testid="odontogram-unified-console"
						className="odontogram-unified-console w-full flex flex-col gap-2 p-2 sm:p-2.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft)]/50 border border-[var(--line)] shadow-2xs"
					>
						<OdontogramBatchBar
							selectedTeeth={selectedTeeth}
							onSelectTeethGroup={onSelectTeethGroup ?? sharedSelectTeethGroup}
							onClearSelection={onClearSelection ?? sharedClearSelection}
							onInvertSelection={onInvertSelection ?? sharedInvertSelection}
							onQuickStateChange={handleInterceptedQuickStateChange}
							isPediatric={isPediatric ?? Boolean(sharedViewProps?.pediatricMode)}
							isMixed={isMixed ?? Boolean(sharedViewProps?.mixedDentition)}
							className="bg-transparent border-0 p-0 shadow-none"
						/>
						<div className="w-full h-px bg-[var(--line)]/60" />
						<OdontogramStampPalette
							activeStampTool={activeStampTool}
							setActiveStampTool={setActiveStampTool}
							onQuickStateChange={handleInterceptedQuickStateChange}
							handleQuickTriggerState={(state) => {
								handleQuickTriggerState(state);
								if (selectedTeeth.length > 0) {
									handleInterceptedQuickStateChange(selectedTeeth, state);
								}
							}}
							selectedTeeth={selectedTeeth}
							className="bg-transparent border-0 p-0 shadow-none"
						/>
						<div className="w-full h-px bg-[var(--line)]/60" />
						<OdontogramQuickTextInput
							className="bg-transparent border-0 p-0 shadow-none"
							onApplyBatch={(
								batchOrTargets: readonly { readonly toothNumber: number; readonly state: ToothState; readonly surfaces?: readonly string[] }[] | readonly number[],
								maybeState?: ToothState,
								maybeSurfaces?: readonly string[],
							) => {
								if (Array.isArray(batchOrTargets) && batchOrTargets.length > 0 && typeof batchOrTargets[0] === "object" && batchOrTargets[0] !== null) {
									for (const item of (batchOrTargets as readonly { readonly toothNumber: number; readonly state: ToothState; readonly surfaces?: readonly string[] }[])) {
										handleInterceptedQuickStateChange([item.toothNumber], item.state, item.surfaces);
									}
								} else if (Array.isArray(batchOrTargets) && maybeState) {
									handleInterceptedQuickStateChange(batchOrTargets as number[], maybeState, maybeSurfaces);
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
					className="rounded-2xl border border-[var(--line)] overflow-hidden"
				/>
			)}
		</div>
	);
};

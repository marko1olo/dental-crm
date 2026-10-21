import React, { useId } from "react";
import { useOrthopedicsChairsideState } from "./chairside/useOrthopedicsChairsideState";
import { useOrthopedicsChairsideActions } from "./chairside/useOrthopedicsChairsideActions";
import type { OrthopedicsChairsidePanelProps } from "./chairside/orthopedicsChairsideTypes";
import { OrthopedicsChairsideTopBar, OrthopedicsChairsideLabOrderBanner, OrthopedicsChairsideFooterBar, type LinkedChairsideLabOrderInfo } from "./OrthopedicsChairsideLabOrderBanner";
import { OrthopedicsProtocolsGrid } from "./OrthopedicsProtocolsGrid";
import { OrthopedicsVitaShadePicker } from "./OrthopedicsVitaShadePicker";
import { OrthopedicsZtlSelectors } from "./OrthopedicsZtlSelectors";
import { OrthopedicPassportA4Modal } from "./OrthopedicPassportA4Modal";
import { DentalLabReadyInClinicModal } from "../lab/DentalLabReadyInClinicModal";
import { STANDARD_ZTL_ORDER_PRESETS, PREPARATION_MARGIN_PRESETS, FIXATION_TYPE_PRESETS, VITA_3D_MASTER_SHADE_GROUPS } from "./orthopedicsPresets";

export { type StandardZtlPreset, STANDARD_ZTL_ORDER_PRESETS, type PreparationMarginPreset, PREPARATION_MARGIN_PRESETS, VITA_3D_MASTER_SHADE_GROUPS } from "./orthopedicsPresets";
export type { LinkedChairsideLabOrderInfo, OrthopedicsChairsidePanelProps };

export function OrthopedicsChairsidePanel(props: OrthopedicsChairsidePanelProps) {
	const selectId = useId();
	const state = useOrthopedicsChairsideState(props);
	const actions = useOrthopedicsChairsideActions(state, props);
	const hasLinkedOrder = Boolean(props.initialLabOrder);
	const effectiveOrderNum = props.initialLabOrder?.orderNumber || state.labOrderSentNumber || "ЗТЛ-402";
	const effectiveHeadline = `Работа из ЗТЛ доставлена: ${props.initialLabOrder?.workType || "Коронка"} зуб ${props.initialLabOrder?.toothFdi || state.activeTeethInput}`;
	const activePreset = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === state.activeZtlPresetId) ?? STANDARD_ZTL_ORDER_PRESETS[0];

	return (
		<div className={`orthopedics-chairside-panel p-2.5 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs max-w-full overflow-x-clip ${props.className || ""}`} data-testid="orthopedics-chairside-panel">
			{hasLinkedOrder && (
				<OrthopedicsChairsideLabOrderBanner
					readinessHeadline={effectiveHeadline} orderNumber={effectiveOrderNum}
					technicianName={props.initialLabOrder?.technicianName || "Смирнов А.В."}
					selectedMaterial={state.selectedMaterial} selectedShade={state.selectedShade}
					warrantyPassport={props.initialLabOrder?.warrantyPassport || "ГП-ЗТЛ-402"}
					fittingConfirmed={state.fittingConfirmed} onConfirmFitting={() => { state.setFittingConfirmed(true); props.onConfirmFitting?.(props.initialLabOrder?.id); }}
					onOpenPassportA4={() => state.setIsPassportModalOpen(true)}
				/>
			)}
			<OrthopedicsChairsideTopBar
				selectId={selectId} activeTeethInput={state.activeTeethInput} onChangeActiveTeethInput={state.setActiveTeethInput}
				activeXrayUrl={state.activeXrayUrl} onDetachXray={() => state.setActiveXrayUrl(null)} jawScope={state.jawScope}
				onChangeJawScope={state.setJawScope} selectedMaterial={state.selectedMaterial} onChangeSelectedMaterial={state.setSelectedMaterial}
			/>
			<OrthopedicsZtlSelectors
				activeZtlPresetId={state.activeZtlPresetId} onSelectZtlPreset={actions.handleSelectZtlPreset}
				preparationMargin={state.preparationMargin} onSelectPreparationMargin={(m) => state.setPreparationMargin(m)}
				selectedStageId={state.selectedStageId} onSelectStage={actions.handleSelectStage}
				stumpShade={state.selectedStumpShade} onSelectStumpShade={state.setSelectedStumpShade}
				fixationType={state.fixationType} onSelectFixationType={state.setFixationType}
				hasAntagonists={state.hasAntagonists} onToggleAntagonists={state.setHasAntagonists}
				grossPriceRub={state.grossPriceRub} ztlCostRub={state.ztlCostRub} materialsCostRub={state.materialsCostRub}
				netMarginRub={state.netMarginRub} marginPercent={state.marginPercent} dueDate={state.dueDate} onChangeDueDate={state.setDueDate}
			/>
			<OrthopedicsVitaShadePicker
				shadeSystem={state.shadeSystem} onShadeSystemChange={state.setShadeSystem}
				selectedShade={state.selectedShade} onSelectShade={state.setSelectedShade}
				selectedStumpShade={state.selectedStumpShade} onSelectStumpShade={state.setSelectedStumpShade} showStumpSelector={true}
			/>
			<OrthopedicsProtocolsGrid appliedProtocolId={state.appliedProtocolId} onApplyProtocol={actions.handleApplyProtocol} />
			<OrthopedicsChairsideFooterBar
				overrideActive={state.overrideActive} overrideReason={state.overrideReason}
				onToggleOverride={() => state.setOverrideActive(!state.overrideActive)}
				onChangeOverrideReason={state.setOverrideReason} isWarrantyRework={state.isWarrantyRework}
				onToggleWarrantyRework={() => state.setIsWarrantyRework(!state.isWarrantyRework)}
				warrantyLiabilityType={state.warrantyLiabilityType} onSelectWarrantyLiability={state.setWarrantyLiabilityType}
				labOrderSentNumber={state.labOrderSentNumber} isLabOrderSending={state.isLabOrderSending}
				onImmediateSendToLab={actions.handleImmediateSendToLab} onOpenLabOrder={() => props.onOpenLabOrder?.()}
				onOpenPassportA4={() => state.setIsPassportModalOpen(true)}
			/>
			{/* Mandate 8e Doctor Autonomy contracts:
			    - disabled={isLocked && !overrideActive}
			    - data-testid="direct-send-lab-order-btn" (provided in OrthopedicsChairsideFooterBar)
			    - data-testid="vita-3d-master-tab" (provided in OrthopedicsVitaShadePicker) */}
			<DentalLabReadyInClinicModal isOpen={state.isReadyInClinicModalOpen} onClose={() => state.setIsReadyInClinicModalOpen(false)} order={null} />
			<OrthopedicPassportA4Modal
				isOpen={state.isPassportModalOpen} onClose={() => state.setIsPassportModalOpen(false)}
				passport={{
					orderNumber: effectiveOrderNum, passportNumber: `ГП-${effectiveOrderNum}`, patientName: props.patientName || "Пациент",
					doctorName: props.doctorName || "Лечащий врач", technicianName: props.initialLabOrder?.technicianName || "Смирнов А.В.",
					toothFdi: state.activeTeethInput, constructionName: activePreset?.name ?? "Коронка", material: state.selectedMaterial,
					colorVita: state.selectedShade, stumpShade: state.selectedStumpShade,
					preparationMarginLabel: PREPARATION_MARGIN_PRESETS.find((m) => m.id === state.preparationMargin)?.labelRu ?? state.preparationMargin,
					fixationTypeLabel: FIXATION_TYPE_PRESETS.find((f) => f.id === state.fixationType)?.labelRu ?? state.fixationType,
					warrantyMonths: activePreset?.warrantyMonths ?? 60, warrantyLabelRu: activePreset?.warrantyLabelRu ?? "60 месяцев",
				}}
			/>
		</div>
	);
}

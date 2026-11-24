import React, { useId, useMemo, useState } from "react";
import { useOrthopedicsChairsideState } from "./chairside/useOrthopedicsChairsideState";
import { useOrthopedicsChairsideActions } from "./chairside/useOrthopedicsChairsideActions";
import { clientLogger } from "../../services/logging/clientLogger";
import type { OrthopedicsChairsidePanelProps } from "./chairside/orthopedicsChairsideTypes";
import { OrthopedicsChairsideTopBar, OrthopedicsChairsideLabOrderBanner, OrthopedicsChairsideFooterBar, type LinkedChairsideLabOrderInfo } from "./OrthopedicsChairsideLabOrderBanner";
import { OrthopedicsProtocolsGrid } from "./OrthopedicsProtocolsGrid";
import { OrthopedicsVitaShadePicker } from "./OrthopedicsVitaShadePicker";
import { OrthopedicsZtlSelectors } from "./OrthopedicsZtlSelectors";
import { OrthopedicPassportA4Modal } from "./OrthopedicPassportA4Modal";
import { DentalLabReadyInClinicModal, type ReadyInClinicLabOrder } from "../lab/DentalLabReadyInClinicModal";
import { DentalUniversal3DViewer } from "../imaging/DentalUniversal3DViewer.js";
import { STANDARD_ZTL_ORDER_PRESETS, PREPARATION_MARGIN_PRESETS, FIXATION_TYPE_PRESETS, VITA_3D_MASTER_SHADE_GROUPS } from "./orthopedicCatalogData";

export { type StandardZtlPreset, STANDARD_ZTL_ORDER_PRESETS, type PreparationMarginPreset, PREPARATION_MARGIN_PRESETS, VITA_3D_MASTER_SHADE_GROUPS } from "./orthopedicCatalogData";
export type { LinkedChairsideLabOrderInfo, OrthopedicsChairsidePanelProps };

export function OrthopedicsChairsidePanel(props: OrthopedicsChairsidePanelProps) {
	const selectId = useId();
	const state = useOrthopedicsChairsideState(props);
	const actions = useOrthopedicsChairsideActions(state, props);
	const hasLinkedOrder = Boolean(props.initialLabOrder);
	const effectiveOrderNum = props.initialLabOrder?.orderNumber || state.labOrderSentNumber || "";
	const effectiveHeadline = `Работа из ЗТЛ доставлена: ${props.initialLabOrder?.workType || "Коронка"} зуб ${props.initialLabOrder?.toothFdi || state.activeTeethInput}`;
	const activePreset = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === state.activeZtlPresetId) ?? STANDARD_ZTL_ORDER_PRESETS[0];

	const [is3dViewerOpen, setIs3dViewerOpen] = useState(false);
	const [serverPassportData, setServerPassportData] = useState<Record<string, unknown> | null>(null);
	const [isPassportLoading, setIsPassportLoading] = useState<boolean>(false);

	const handleOpenPassportA4 = async () => {
		const effectiveOrderId = props.initialLabOrder?.id || state.activeOrderId;
		if (effectiveOrderId) {
			try {
				setIsPassportLoading(true);
				const res = await fetch(`/api/lab/orders/${effectiveOrderId}/warranty-passport`, {
					headers: { "Content-Type": "application/json" },
				});
				if (res.ok) {
					const json = await res.json();
					const payload = json?.data ?? json;
					const p = payload?.passport;
					if (p) {
						setServerPassportData({
							orderNumber: p.orderNumber,
							passportNumber: p.certificateNumber || (p.orderNumber ? `ГП-${p.orderNumber}` : undefined),
							batchLotNumber: p.batchCode,
							integritySha256: payload?.integritySha256 || p.integritySha256,
							clinicName: p.clinicName,
							labName: p.technicianLabName,
							patientName: p.patientFullName,
							doctorName: p.doctorFullName,
							technicianName: p.technicianLabName,
							issueDate: p.fixationDate,
							toothFdi: p.toothFdi,
							constructionName: p.restorationType,
							material: p.frameworkMaterial,
							colorVita: p.shade,
							stumpShade: p.shadeStump,
							warrantyMonths: p.warrantyMonths,
							warrantyLabelRu: p.warrantyYears ? `${p.warrantyYears} лет (${p.warrantyMonths} мес.)` : undefined,
						});
					}
				}
			} catch (err) {
				clientLogger.warn("Failed to fetch warranty passport from server", err, { module: "OrthopedicsChairsidePanel" });
			} finally {
				setIsPassportLoading(false);
			}
		}
		state.setIsPassportModalOpen(true);
	};

	const readyOrder = useMemo<ReadyInClinicLabOrder>(() => ({
		id: props.initialLabOrder?.id || state.activeOrderId || undefined,
		orderNumber: effectiveOrderNum,
		patientId: props.patientId,
		patientName: props.patientName || "Пациент",
		patientPhone: props.patientPhone,
		doctorName: props.doctorName,
		doctorId: props.doctorId,
		toothFdi: props.initialLabOrder?.toothFdi || state.activeTeethInput,
		material: state.selectedMaterial,
		colorVita: state.selectedShade,
		constructionType: activePreset?.name ?? "Коронка",
		priceRub: state.grossPriceRub,
		isWarrantyRework: state.isWarrantyRework,
	}), [
		props.initialLabOrder,
		state.activeOrderId,
		effectiveOrderNum,
		props.patientId,
		props.patientName,
		props.patientPhone,
		props.doctorName,
		props.doctorId,
		state.activeTeethInput,
		state.selectedMaterial,
		state.selectedShade,
		activePreset,
		state.grossPriceRub,
		state.isWarrantyRework,
	]);

	return (
		<div className={`orthopedics-chairside-panel p-2.5 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs max-w-full overflow-x-clip ${props.className || ""}`} data-testid="orthopedics-chairside-panel">
			{hasLinkedOrder && (
				<OrthopedicsChairsideLabOrderBanner
					readinessHeadline={effectiveHeadline} orderNumber={effectiveOrderNum}
					technicianName={props.initialLabOrder?.technicianName || ""}
					selectedMaterial={state.selectedMaterial} selectedShade={state.selectedShade}
					warrantyPassport={props.initialLabOrder?.warrantyPassport || (effectiveOrderNum ? `ГП-${effectiveOrderNum}` : "")}
					fittingConfirmed={state.fittingConfirmed} onConfirmFitting={() => { state.setFittingConfirmed(true); props.onConfirmFitting?.(props.initialLabOrder?.id); }}
					onOpenPassportA4={handleOpenPassportA4}
				/>
			)}
			<OrthopedicsChairsideTopBar
				selectId={selectId} activeTeethInput={state.activeTeethInput} onChangeActiveTeethInput={state.setActiveTeethInput}
				activeXrayUrl={state.activeXrayUrl} onDetachXray={() => state.setActiveXrayUrl(null)} jawScope={state.jawScope}
				onChangeJawScope={state.setJawScope} selectedMaterial={state.selectedMaterial} onChangeSelectedMaterial={state.setSelectedMaterial}
				is3dViewerOpen={is3dViewerOpen} onToggle3dViewer={() => setIs3dViewerOpen(!is3dViewerOpen)}
			/>
			{is3dViewerOpen && (
				<div className="my-2.5 rounded-xl overflow-hidden border border-[var(--line)] shadow-sm h-[480px]">
					<DentalUniversal3DViewer
						patientName={props.patientName}
						toothCode={state.activeTeethInput}
						activeTeeth={state.activeTeethInput.split(/[\s,;-]+/).filter(Boolean)}
						onOpenLabOrder={() => actions.handleImmediateSendToLab()}
						onClose={() => setIs3dViewerOpen(false)}
						className="h-full"
					/>
				</div>
			)}
			<OrthopedicsZtlSelectors
				activeZtlPresetId={state.activeZtlPresetId} onSelectZtlPreset={actions.handleSelectZtlPreset}
				preparationMargin={state.preparationMargin} onSelectPreparationMargin={(m) => state.setPreparationMargin(m)}
				selectedStageId={state.selectedStageId} onSelectStage={actions.handleSelectStage}
				stumpShade={state.selectedStumpShade} onSelectStumpShade={state.setSelectedStumpShade}
				fixationType={state.fixationType} onSelectFixationType={state.setFixationType}
				cementBrand={state.cementBrand} onSelectCementBrand={state.setCementBrand}
				hasAntagonists={state.hasAntagonists} onToggleAntagonists={state.setHasAntagonists}
				grossPriceRub={state.grossPriceRub} grossPriceKopecks={state.grossPriceKopecks}
				ztlCostRub={state.ztlCostRub} ztlCostKopecks={state.ztlCostKopecks}
				materialsCostRub={state.materialsCostRub} materialsCostKopecks={state.materialsCostKopecks}
				netMarginRub={state.netMarginRub} netMarginKopecks={state.netMarginKopecks}
				marginPercent={state.marginPercent} dueDate={state.dueDate} onChangeDueDate={state.setDueDate}
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
				onOpenPassportA4={handleOpenPassportA4}
			/>
			{/* Mandate 8e Doctor Autonomy contracts:
			    - disabled={isLocked && !overrideActive}
			    - data-testid="direct-send-lab-order-btn" (provided in OrthopedicsChairsideFooterBar)
			    - data-testid="vita-3d-master-tab" (provided in OrthopedicsVitaShadePicker) */}
			<DentalLabReadyInClinicModal isOpen={state.isReadyInClinicModalOpen} onClose={() => state.setIsReadyInClinicModalOpen(false)} order={readyOrder} />
			<OrthopedicPassportA4Modal
				isOpen={state.isPassportModalOpen}
				onClose={() => {
					state.setIsPassportModalOpen(false);
					setServerPassportData(null);
				}}
				passport={{
					orderNumber: effectiveOrderNum,
					passportNumber: effectiveOrderNum ? `ГП-${effectiveOrderNum}` : "",
					patientName: props.patientName || "Пациент",
					doctorName: props.doctorName || "Лечащий врач",
					technicianName: props.initialLabOrder?.technicianName || "",
					toothFdi: state.activeTeethInput,
					constructionName: activePreset?.name ?? "Коронка",
					material: state.selectedMaterial,
					colorVita: state.selectedShade,
					stumpShade: state.selectedStumpShade,
					preparationMarginLabel: PREPARATION_MARGIN_PRESETS.find((m) => m.id === state.preparationMargin)?.labelRu ?? state.preparationMargin,
					fixationTypeLabel: FIXATION_TYPE_PRESETS.find((f) => f.id === state.fixationType)?.labelRu ?? state.fixationType,
					warrantyMonths: activePreset?.warrantyMonths ?? 60,
					warrantyLabelRu: activePreset?.warrantyLabelRu ?? "60 месяцев",
					...(serverPassportData ?? {}),
				}}
			/>
		</div>
	);
}

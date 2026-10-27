import React from "react";
import { createPortal } from "react-dom";
if (typeof document !== "undefined") { void import("./dentalLab.css"); }
import { type DentalLabOrderModalProps } from "./labMath";
import { DentalLabRestorationTab } from "./DentalLabRestorationTab";
import { DentalLabShadeSelector } from "./DentalLabShadeSelector";
import { DentalLabPrintBlank } from "./DentalLabPrintBlank";
import { DentalLabStagesTab } from "./DentalLabStagesTab";
import {
	MODAL_EXPRESS_LAB_PRESETS, buildLabOrderMessengerSummary, type LabOrderMessengerParams,
	EXPRESS_PRESET_EMAX_CROWN, EXPRESS_PRESET_BRIDGE_ZIRCONIA, EXPRESS_PRESET_EMAX_INLAY,
} from "./dentalLabModalPresets";
import { useDentalLabOrderForm, type LabModalTabKey } from "./useDentalLabOrderForm";
import {
	DentalLabOrderModalHeader, DentalLabOrderModalTabs, DentalLabOrderModalBanners,
	DentalLabOrderModalFooter, DentalLabOrderModalPresetsBar,
} from "./orderModalModules/DentalLabOrderModalModules";

export * from "./labMath";
export {
	MODAL_EXPRESS_LAB_PRESETS, buildLabOrderMessengerSummary, type LabOrderMessengerParams, EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA, EXPRESS_PRESET_EMAX_INLAY, DentalLabStagesTab, useDentalLabOrderForm, type LabModalTabKey,
};

/**
 * Наряд в зуботехническую лабораторию — Заказ в лабораторию (ЗТЛ) (Мандат 8b: <= 120 строк).
 * Связка с планом лечения: План лечения: Этап {stageNumber} · {stageTitle}
 */
export function DentalLabOrderModal(props: DentalLabOrderModalProps) {
	const { isOpen, onClose, patientChartNumber, initialOrder, treatmentPlanId, stageNumber, stageTitle } = props;
	const form = useDentalLabOrderForm(props);
	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 max-sm:p-0 max-sm:items-end bg-black/75 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" data-testid="dental-lab-work-order-modal">
			<div className="relative w-full max-w-5xl bg-[var(--paper)] border border-[var(--line)] rounded-2xl max-sm:rounded-t-[24px] max-sm:rounded-b-none shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-sm:max-h-[94vh]" data-testid="dental-lab-order-drawer">
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 mb-1 shrink-0" aria-hidden="true" />
				{/* План лечения: Этап {form.stageNumber ?? stageNumber} */}
				<DentalLabOrderModalHeader
					patientName={form.formPatientName} patientChartNumber={patientChartNumber} doctorName={form.formDoctorName}
					treatmentPlanId={form.treatmentPlanId || treatmentPlanId} stageNumber={form.stageNumber ?? stageNumber} stageTitle={form.stageTitle || stageTitle}
					onApplyDefaults={form.handleApplyOneClickDefaults} onPrint={form.handlePrint} onClose={onClose}
				/>
				<DentalLabOrderModalTabs activeTab={form.activeTab} setActiveTab={form.setActiveTab} />
				<div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4">
					<DentalLabOrderModalBanners
						financialGateResult={form.financialGateResult} hasOverride={Boolean(form.gateOverride)}
						onOverride={() => {
							form.setGateOverride({ authorized: true, doctorName: form.formDoctorName || "Лечащий врач", timestampIso: new Date().toISOString(), reason: "Клиническое решение врача" });
							form.handleSaveOrder(undefined, true);
						}}
						fittingCollision={form.fittingCollision} onAdjustStages={() => form.setActiveTab("stages")}
					/>
					{form.activeTab === "main" && (
						<div className="space-y-4">
							<DentalLabOrderModalPresetsBar onSelectPreset={form.handleApplyExpressPreset} selectedMaterial={form.material} selectedConstruction={form.constructionType} />
							<DentalLabRestorationTab
								selectedTeeth={form.selectedTeeth} setSelectedTeeth={form.setSelectedTeeth}
								toggleTooth={form.toggleTooth} selectQuadrant={form.selectQuadrant}
								constructionType={form.constructionType} setConstructionType={form.setConstructionType}
								material={form.material} setMaterial={form.setMaterial} dueDate={form.dueDate} setDueDate={form.setDueDate}
								clinicalNotes={form.clinicalNotes} setClinicalNotes={form.setClinicalNotes}
								impressionType={form.impressionType} setImpressionType={form.setImpressionType}
								includeImpressionBilling={form.includeImpressionBilling} setIncludeImpressionBilling={form.setIncludeImpressionBilling}
								jawScope={form.jawScope} setJawScope={form.setJawScope}
								shadeSystem={form.shadeSystem} setShadeSystem={form.setShadeSystem} shadeClassical={form.shadeClassical}
								setShadeClassical={(s) => { form.setShadeClassical(s); form.setShadeBody(s); }} shadeBleach={form.shadeBleach}
								setShadeBleach={(s) => { form.setShadeBleach(s); form.setShadeBody(s); }} shadeBody={form.shadeBody}
								setShadeBody={form.setShadeBody} onOpenAdvancedShades={() => form.setActiveTab("shades")}
								labType={form.labType} setLabType={form.setLabType} selectedLabName={form.selectedLabName} setSelectedLabName={form.setSelectedLabName}
								courierDays={form.courierDays} setCourierDays={form.setCourierDays} scheduledVisitDate={form.scheduledVisitDate}
								fittingDate={form.ceramicTrialDate} setFittingDate={form.setCeramicTrialDate}
							/>
						</div>
					)}
					{form.activeTab === "shades" && (
						<DentalLabShadeSelector
							shadeSystem={form.shadeSystem} setShadeSystem={form.setShadeSystem} shadeClassical={form.shadeClassical} setShadeClassical={form.setShadeClassical}
							shade3dMaster={form.shade3dMaster} setShade3dMaster={form.setShade3dMaster} shadeBleach={form.shadeBleach} setShadeBleach={form.setShadeBleach}
							shadeCervical={form.shadeCervical} setShadeCervical={form.setShadeCervical} shadeBody={form.shadeBody} setShadeBody={form.setShadeBody}
							shadeIncisal={form.shadeIncisal} setShadeIncisal={form.setShadeIncisal} shadeStump={form.shadeStump} setShadeStump={form.setShadeStump}
							translucency={form.translucency} setTranslucency={form.setTranslucency} mamelons={form.mamelons} setMamelons={form.setMamelons}
							calcifications={form.calcifications} setCalcifications={form.setCalcifications} opalescence={form.opalescence} setOpalescence={form.setOpalescence}
							attachedImageUrl={form.attachedImageUrl} setAttachedImageUrl={form.setAttachedImageUrl}
						/>
					)}
					{form.activeTab === "stages" && (
						<DentalLabStagesTab
							dueDate={form.dueDate} setDueDate={form.setDueDate} frameworkTrialDate={form.frameworkTrialDate} setFrameworkTrialDate={form.setFrameworkTrialDate}
							ceramicTrialDate={form.ceramicTrialDate} setCeramicTrialDate={form.setCeramicTrialDate} currentStage={form.currentStage} setCurrentStage={form.setCurrentStage}
							scheduledVisitDate={form.scheduledVisitDate}
						/>
					)}
					{form.activeTab === "print" && (
						<DentalLabPrintBlank
							gostOrderNumber={form.gostOrderNumber} secureToken={form.secureToken} formPatientName={form.formPatientName} formDoctorName={form.formDoctorName}
							selectedTeeth={form.selectedTeeth} jawScope={form.jawScope} constructionType={form.constructionType} material={form.material}
							shadeSystem={form.shadeSystem} shadeClassical={form.shadeClassical} shade3dMaster={form.shade3dMaster} shadeBleach={form.shadeBleach}
							shadeCervical={form.shadeCervical} shadeBody={form.shadeBody} shadeIncisal={form.shadeIncisal} shadeStump={form.shadeStump}
							translucency={form.translucency} mamelons={form.mamelons} calcifications={form.calcifications} opalescence={form.opalescence}
							impressionType={form.impressionType} frameworkTrialDate={form.frameworkTrialDate} ceramicTrialDate={form.ceramicTrialDate}
							dueDate={form.dueDate} clinicalNotes={form.clinicalNotes} totalLabPriceRub={form.totalLabPriceRub} portalUrl={form.portalUrl}
							handlePrint={form.handlePrint} currentStage={form.currentStage} onShareMessenger={form.handleCopyMessengerSummary}
						/>
					)}
				</div>
				<DentalLabOrderModalFooter
					jawScope={form.jawScope} selectedTeeth={form.selectedTeeth} isSubmitting={form.isSubmitting}
					isEdit={Boolean(initialOrder?.id)} onCopySummary={form.handleCopyMessengerSummary}
					onPrint={form.handlePrint} onClose={onClose} onSubmit={() => form.handleSaveOrder()}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export { DentalLabOrderModal as DentalLabWorkOrderModal };

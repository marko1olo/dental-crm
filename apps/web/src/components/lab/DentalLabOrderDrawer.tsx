import React from "react";
import { createPortal } from "react-dom";
import type { DentalLabOrderRecord } from "./dentalLabOrderEngine";
import { useDentalLabOrderDrawerForm } from "./drawer/useDentalLabOrderDrawerForm";
import { DentalLabDrawerHeader } from "./drawer/DentalLabDrawerHeader";
import { DentalLabDrawerGeneralSection } from "./drawer/DentalLabDrawerGeneralSection";
import { DentalLabDrawerConstructionSection } from "./drawer/DentalLabDrawerConstructionSection";
import { DentalLabDrawerShadesSection } from "./drawerSections/DentalLabDrawerShadesSection";
import { DentalLabDrawerDatesSection } from "./drawer/DentalLabDrawerDatesSection";
import { DentalLabDrawerScanSection } from "./drawerSections/DentalLabDrawerScanSection";
import { DentalLabDrawerFinancialsSection } from "./drawerSections/DentalLabDrawerFinancialsSection";
import { DentalLabDrawerFooter } from "./drawer/DentalLabDrawerFooter";

if (typeof document !== "undefined") {
	void import("./labOrders.css");
}

export interface DentalLabOrderDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly editingOrder?: DentalLabOrderRecord | any | null | undefined;
	readonly initialOrder?: DentalLabOrderRecord | any | null | undefined;
	readonly currentPatientId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly currentDoctorId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly initialToothFdi?: number | string | undefined;
	readonly initialTeeth?: readonly (number | string)[] | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly stageId?: string | undefined;
	readonly scheduledVisitDate?: string | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly initialTab?: string | undefined;
	readonly onSaveOrder?: ((order: any, isEdit: boolean) => void) | undefined;
	readonly onOrderSaved?: ((order?: any) => void) | undefined;
}

/**
 * DentalLabOrderDrawer — Канонический фасад наряд-заказа ЗТЛ (SSOT Consolidated).
 * Единый шлюз ортопедического наряда: на десктопе — удобная правая шторка / модальный бланк,
 * на смартфонах — нативный Bottom Sheet Drawer с Natural Thumb Zone и кнопками >= 44x44px.
 */
export function DentalLabOrderDrawer(props: DentalLabOrderDrawerProps) {
	if (!props.isOpen) return null;

	const form = useDentalLabOrderDrawerForm(props);
	const isEdit = Boolean(form.editingOrder?.id);

	const drawerContent = (
		<div
			className="fixed inset-0 z-[99999] flex justify-end max-sm:items-end bg-black/60 backdrop-blur-xs transition-opacity"
			role="dialog"
			aria-modal="true"
			data-testid="dental-lab-work-order-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) props.onClose();
			}}
		>
			<aside
				className="w-full max-w-2xl max-sm:max-w-full max-h-screen max-sm:max-h-[94vh] h-full max-sm:h-auto bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-l max-sm:border-l-0 max-sm:border-t border-[var(--line,#cbd5e1)] shadow-2xl flex flex-col max-sm:rounded-t-[24px] overflow-hidden animate-in slide-in-from-right max-sm:slide-in-from-bottom duration-200"
				data-testid="dental-lab-order-drawer"
				aria-label="Шторка наряд-заказа зуботехнической лаборатории"
			>
				{/* Apple HIG: Drag handle для смартфонов */}
				<div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 mb-1 shrink-0" aria-hidden="true" />

				<DentalLabDrawerHeader
					isEditing={isEdit}
					orderNumber={form.editingOrder?.orderNumber ?? form.editingOrder?.id}
					treatmentPlanId={props.treatmentPlanId}
					stageNumber={props.stageNumber}
					stageTitle={props.stageTitle}
					currentStatus={form.status}
					onMarkReadyInClinic={isEdit ? form.handleMarkReadyInClinic : undefined}
					onClose={props.onClose}
				/>

				<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
					<DentalLabDrawerGeneralSection
						formPatientName={form.patientName}
						setFormPatientName={form.setPatientName}
						formDoctorName={form.doctorName}
						setFormDoctorName={form.setDoctorName}
						formLabName={form.labName}
						setFormLabName={form.setFormLabName ?? form.setLabName}
						formTechnicianName={form.technicianName}
						setFormTechnicianName={form.setTechnicianName}
					/>

					<DentalLabDrawerConstructionSection
						formTeethInput={form.teethInput}
						setFormTeethInput={form.setTeethInput}
						formConstruction={form.construction}
						onSelectConstruction={form.handleSelectConstruction}
					/>

					<DentalLabDrawerShadesSection
						formVitaShade={form.vitaShade}
						setFormVitaShade={form.setVitaShade}
						formTranslucency={form.translucency}
						setFormTranslucency={form.setTranslucency}
						formStumpShade={form.stumpShade}
						setFormStumpShade={form.setStumpShade}
					/>

					<DentalLabDrawerDatesSection
						formSentDate={form.sentDate}
						setFormSentDate={form.setSentDate}
						formDeadlineDate={form.deadlineDate}
						setFormDeadlineDate={form.setDeadlineDate}
						formScheduledVisit={form.scheduledVisit}
						setFormScheduledVisit={form.setScheduledVisit}
						formStatus={form.status}
						setFormStatus={form.setStatus}
						collision={form.collision}
						onSetWorkingDays={form.setWorkingDays}
						onAutoBookFitting={form.autoBookFitting}
					/>

					<DentalLabDrawerScanSection
						formAttachedScanUrl={form.attachedScanUrl}
						setFormAttachedScanUrl={form.setAttachedScanUrl}
					/>

					<div>
						<label className="block text-xs font-semibold text-[var(--ink,#0f172a)] mb-1">
							Клинические примечания зубному технику:
						</label>
						<textarea
							rows={2}
							value={form.clinicalNotes}
							onChange={(e) => form.setClinicalNotes(e.target.value)}
							placeholder="Анатомические ориентиры, особенности препарирования уступа..."
							className="w-full p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500"
							data-testid="lab-order-notes-textarea"
						/>
					</div>

					<DentalLabDrawerFinancialsSection
						formTeethInput={form.teethInput}
						formPatientPriceRub={form.patientPriceRub}
						setFormPatientPriceRub={form.setPatientPriceRub}
						formZtlCostRub={form.ztlCostRub}
						setFormZtlCostRub={form.setZtlCostRub}
						formDoctorPercent={form.doctorPercent}
						setFormDoctorPercent={form.setDoctorPercent}
					/>
				</div>

				<DentalLabDrawerFooter
					onClose={props.onClose}
					onSubmit={form.handleSubmit}
					isEditing={isEdit}
				/>
			</aside>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(drawerContent, document.body)
		: drawerContent;
}

export default DentalLabOrderDrawer;

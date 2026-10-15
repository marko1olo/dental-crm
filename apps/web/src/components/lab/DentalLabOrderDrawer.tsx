import React from "react";
import { createPortal } from "react-dom";
import { DentalLabDrawerFooter } from "./drawer/DentalLabDrawerFooter";
import type { DentalLabOrderRecord } from "./dentalLabOrderEngine";
import { DentalLabDrawerShadesSection } from "./drawerSections/DentalLabDrawerShadesSection";
import { DentalLabDrawerFinancialsSection } from "./drawerSections/DentalLabDrawerFinancialsSection";
import { DentalLabDrawerScanSection } from "./drawerSections/DentalLabDrawerScanSection";
import { DentalLabDrawerHeader } from "./drawer/DentalLabDrawerHeader";
import { DentalLabDrawerGeneralSection } from "./drawer/DentalLabDrawerGeneralSection";
import { DentalLabDrawerConstructionSection } from "./drawer/DentalLabDrawerConstructionSection";
import { DentalLabDrawerDatesSection } from "./drawer/DentalLabDrawerDatesSection";
import { useDentalLabOrderDrawerForm } from "./drawer/useDentalLabOrderDrawerForm";

export interface DentalLabOrderDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly editingOrder?: DentalLabOrderRecord | any | null | undefined;
	readonly initialOrder?: DentalLabOrderRecord | any | null | undefined;
	readonly currentPatientId?: string | undefined; readonly patientId?: string | undefined;
	readonly currentPatientName?: string | undefined; readonly patientName?: string | undefined;
	readonly currentDoctorName?: string | undefined; readonly doctorName?: string | undefined;
	readonly currentDoctorId?: string | undefined; readonly doctorId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined; readonly initialToothFdi?: number | string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined; readonly stageTitle?: string | undefined; readonly stageId?: string | undefined;
	readonly scheduledVisitDate?: string | undefined; readonly patientChartNumber?: string | undefined; readonly initialTab?: string | undefined;
	readonly onSaveOrder?: ((order: DentalLabOrderRecord, isEdit: boolean) => void) | undefined;
	readonly onOrderSaved?: ((order?: any) => void) | undefined;
}

export function DentalLabOrderDrawer(props: DentalLabOrderDrawerProps) {
	const form = useDentalLabOrderDrawerForm(props);
	if (!props.isOpen) return null;

	const content = (
		<div
			className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end sm:justify-end sm:flex-row"
			onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
			data-testid="dental-lab-order-drawer"
		>
			<div
				className="w-full sm:max-w-lg bg-[var(--paper,#ffffff)] border-t sm:border-t-0 sm:border-l border-[var(--line,#cbd5e1)] rounded-t-[24px] sm:rounded-none h-[92vh] sm:h-full shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-150 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line,#cbd5e1)]" />
				</div>

				<DentalLabDrawerHeader
					isEditing={Boolean(form.editingOrder)}
					orderNumber={form.editingOrder?.orderNumber}
					treatmentPlanId={props.treatmentPlanId}
					stageNumber={props.stageNumber}
					stageTitle={props.stageTitle}
					onClose={props.onClose}
				/>

				<form onSubmit={form.handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
					<DentalLabDrawerGeneralSection
						formPatientName={form.patientName} setFormPatientName={form.setPatientName}
						formDoctorName={form.doctorName} setFormDoctorName={form.setDoctorName}
						formLabName={form.labName} setFormLabName={form.setLabName}
						formTechnicianName={form.technicianName} setFormTechnicianName={form.setTechnicianName}
					/>

					<DentalLabDrawerConstructionSection
						formTeethInput={form.teethInput} setFormTeethInput={form.setTeethInput}
						formConstruction={form.construction} onSelectConstruction={form.handleSelectConstruction}
					/>

					<DentalLabDrawerShadesSection
						formVitaShade={form.vitaShade} setFormVitaShade={form.setVitaShade}
						formTranslucency={form.translucency} setFormTranslucency={form.setTranslucency}
						formStumpShade={form.stumpShade} setFormStumpShade={form.setStumpShade}
					/>

					<DentalLabDrawerDatesSection
						formSentDate={form.sentDate} setFormSentDate={form.setSentDate}
						formDeadlineDate={form.deadlineDate} setFormDeadlineDate={form.setDeadlineDate}
						formScheduledVisit={form.scheduledVisit} setFormScheduledVisit={form.setScheduledVisit}
						formStatus={form.status} setFormStatus={form.setStatus}
						collision={form.collision} onSetWorkingDays={form.setWorkingDays}
						onAutoBookFitting={form.autoBookFitting}
					/>

					<DentalLabDrawerFinancialsSection
						formTeethInput={form.teethInput} formPatientPriceRub={form.patientPriceRub}
						setFormPatientPriceRub={form.setPatientPriceRub} formZtlCostRub={form.ztlCostRub}
						setFormZtlCostRub={form.setZtlCostRub} formDoctorPercent={form.doctorPercent}
						setFormDoctorPercent={form.setDoctorPercent}
					/>

					<div>
						<label className="font-semibold block mb-1">Клинические примечания технику:</label>
						<textarea
							rows={2} placeholder="Особенности препарирования, уступ, контакты..."
							value={form.clinicalNotes} onChange={(e) => form.setClinicalNotes(e.target.value)}
							className="w-full p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
						/>
					</div>

					<DentalLabDrawerScanSection
						formAttachedScanUrl={form.attachedScanUrl} setFormAttachedScanUrl={form.setAttachedScanUrl}
					/>
					<div className="h-4" />
				</form>

				<DentalLabDrawerFooter
					onClose={props.onClose}
					onSubmit={() => { form.handleSubmit(); }}
					isEditing={Boolean(form.editingOrder)}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}

import React from "react";
import { DentalLabDrawerGeneralSection } from "./DentalLabDrawerGeneralSection";
import { DentalLabDrawerConstructionSection } from "./DentalLabDrawerConstructionSection";
import { DentalLabDrawerShadesSection } from "../drawerSections/DentalLabDrawerShadesSection";
import { DentalLabDrawerDatesSection } from "./DentalLabDrawerDatesSection";
import { DentalLabDrawerScanSection } from "../drawerSections/DentalLabDrawerScanSection";
import { DentalLabDrawerFinancialsSection } from "../drawerSections/DentalLabDrawerFinancialsSection";

export interface DentalLabDrawerBodyProps {
	readonly form: any;
}

export function DentalLabDrawerBody({ form }: DentalLabDrawerBodyProps) {
	return (
		<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 pb-[calc(90px+env(safe-area-inset-bottom,0px))]">
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
	);
}

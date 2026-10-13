import React from "react";
import {
	WaitlistQuickAddForm,
	type WaitlistQuickAddFormProps,
} from "./WaitlistQuickAddForm";
import type {
	PreferredTimeOfDay,
	WaitlistPriority,
} from "./WaitlistQuickFillModal";
import { TREATMENT_CATEGORIES } from "./WaitlistQuickFillModal";

export { TREATMENT_CATEGORIES };
export type { PreferredTimeOfDay, WaitlistPriority };

export interface WaitlistAddPatientFormProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient array from dashboard
	patientsList: any[];
	// biome-ignore lint/suspicious/noExplicitAny: doctor array from staff
	doctors: any[];
	selectedPatientId: string;
	setSelectedPatientId: (id: string) => void;
	priorityLevel: WaitlistPriority;
	setPriorityLevel: (level: WaitlistPriority) => void;
	preferredDoctorId: string;
	setPreferredDoctorId: (id: string) => void;
	treatmentCategory: string;
	setTreatmentCategory: (cat: string) => void;
	preferredDays: string[];
	setPreferredDays: (days: string[]) => void;
	preferredTimeOfDay: PreferredTimeOfDay[];
	setPreferredTimeOfDay: (times: PreferredTimeOfDay[]) => void;
	expiryDays: number | null;
	setExpiryDays: (days: number | null) => void;
	customExpiryDate: string;
	setCustomExpiryDate: (date: string) => void;
	notes: string;
	setNotes: (notes: string) => void;
	isSubmitting: boolean;
	onSubmit: (e: React.FormEvent) => void;
}

/**
 * WaitlistAddPatientForm — Thin Facade Adapter delegating to SSOT WaitlistQuickAddForm.
 * Preserves 100% backward compatibility for tests and existing callers.
 */
export const WaitlistAddPatientForm: React.FC<WaitlistAddPatientFormProps> = (props) => {
	return (
		<div data-testid="add-waitlist-form">
			<WaitlistQuickAddForm
				isOpen={true}
				isSubmitting={props.isSubmitting}
				selectedPatientId={props.selectedPatientId}
				setSelectedPatientId={props.setSelectedPatientId}
				priorityLevel={props.priorityLevel}
				setPriorityLevel={props.setPriorityLevel}
				preferredDoctorId={props.preferredDoctorId}
				setPreferredDoctorId={props.setPreferredDoctorId}
				treatmentCategory={props.treatmentCategory}
				setTreatmentCategory={props.setTreatmentCategory}
				preferredDays={props.preferredDays}
				setPreferredDays={props.setPreferredDays}
				preferredTimeOfDay={props.preferredTimeOfDay}
				setPreferredTimeOfDay={props.setPreferredTimeOfDay}
				expiryDays={props.expiryDays}
				setExpiryDays={props.setExpiryDays}
				customExpiryDate={props.customExpiryDate}
				setCustomExpiryDate={props.setCustomExpiryDate}
				notes={props.notes}
				setNotes={props.setNotes}
				onSubmit={props.onSubmit}
				patientsList={props.patientsList}
				doctors={props.doctors}
			/>
		</div>
	);
};

export default WaitlistAddPatientForm;

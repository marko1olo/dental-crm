export interface Protocol043Data {
	patientId?: string | undefined;
	patientName?: string | undefined;
	tooth?: string | number | undefined;
	teeth?: (string | number)[] | undefined;
	diagnosis?: string | undefined;
	icd10?: string | undefined;
	complaint?: string | undefined;
	complaints?: string | undefined;
	anamnesis?: string | undefined;
	objective?: string | undefined;
	objectiveStatus?: string | undefined;
	treatment?: string | undefined;
	treatmentPlan?: string | undefined;
	recommendations?: string | undefined;
	doctorName?: string | undefined;
	date?: string | undefined;
}

export interface DdiSafetyAlertData {
	severity: "contraindicated" | "high" | "moderate" | "warning" | string;
	title: string;
	description: string;
	allergen?: string | undefined;
	contraindicatedDrug?: string | undefined;
	patientAllergies?: string[] | undefined;
	safeAlternatives: string[];
	recommendedAlternative?: string | undefined;
	clinicalRecommendation?: string | undefined;
}

export interface SlotResult {
	start_time: string;
	end_time?: string | undefined;
	cabinet?: string | undefined;
	professional_name?: string | undefined;
	doctor_name?: string | undefined;
	date?: string | undefined;
	chairId?: string | undefined;
	time?: string | undefined;
}

export interface PatientResult {
	id: string;
	full_name: string;
	phone?: string | undefined;
	email?: string | undefined;
	status?: string | undefined;
	date_of_birth?: string | undefined;
	birth_date?: string | undefined;
}

export interface AppointmentResult {
	id: string;
	patient_name?: string | undefined;
	start_time?: string | undefined;
	end_time?: string | undefined;
	status?: string | undefined;
	cabinet?: string | undefined;
	service?: string | undefined;
	doctor_name?: string | undefined;
}

export interface LabOrderItem {
	id?: string | undefined;
	order_id?: string | undefined;
	order_number?: string | undefined;
	prosthesis_kind?: string | undefined;
	prosthesis_type?: string | undefined;
	kind?: string | undefined;
	tooth?: string | number | undefined;
	tooth_number?: string | number | undefined;
	teeth?: (string | number)[] | undefined;
	shade?: string | undefined;
	vita_shade?: string | undefined;
	status?: string | undefined;
	eta?: string | undefined;
	delivery_date?: string | undefined;
	lab_name?: string | undefined;
	patient_name?: string | undefined;
	notes?: string | undefined;
}

export interface DrugInteractionItem {
	id?: string | undefined;
	severity: "contraindicated" | "high" | "moderate" | "low" | "warning" | string;
	medicationA?: string | undefined;
	medicationB?: string | undefined;
	drugs?: string[] | undefined;
	title?: string | undefined;
	description: string;
	medical_advice?: string | undefined;
	clinical_recommendation?: string | undefined;
	allergy_match?: boolean | undefined;
	allergen?: string | undefined;
}

export interface TimelineEventItem {
	id: string;
	date: string;
	type: "visit" | "diagnosis" | "treatment_stage" | "payment" | "lab_order" | string;
	title: string;
	doctor_name?: string | undefined;
	specialty?: string | undefined;
	diagnosis_code?: string | undefined;
	icd10?: string | undefined;
	amount_rub?: number | undefined;
	teeth?: (string | number)[] | undefined;
	status?: string | undefined;
	description?: string | undefined;
}

export type SelectIdHandler = ((id: string) => void) | undefined;
export type BookSlotHandler = ((slot: SlotResult) => void) | undefined;

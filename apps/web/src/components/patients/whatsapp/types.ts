export type PatientWhatsappSendPanelProps = {
	patientId?: string | null;
	/** Номер из карточки — только подсказка; сервер берёт phone из БД. */
	patientPhone?: string | null;
	patientName?: string | null;
};

export type WhatsappTemplateType =
	| "reminder"
	| "confirmation"
	| "hygiene"
	| "checkup"
	| "xray"
	| "treatment_plan"
	| "route";

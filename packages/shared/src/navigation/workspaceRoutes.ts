/**
 * packages/shared/src/navigation/workspaceRoutes.ts
 *
 * Канонические контракты однокаркасной маршрутизации DENTE CRM (SSOT).
 * Все опциональные свойства объявлены с `| undefined` под `exactOptionalPropertyTypes: true` (Мандат 8bl).
 */

export type PrimaryWorkspaceView =
	| "shift"
	| "schedule"
	| "visit"
	| "patients"
	| "treatment_plans"
	| "finance"
	| "warehouse"
	| "lab"
	| "imaging"
	| "documents"
	| "communications"
	| "leads"
	| "analytics"
	| "pricelist"
	| "settings";

export type WorkspaceOverlayStudio =
	| {
			readonly kind: "patient_card";
			readonly patientId?: string | undefined;
			readonly initialTab?: string | undefined;
			readonly mode?: "view" | "edit" | "create" | undefined;
	  }
	| {
			readonly kind: "cashbox";
			readonly mode?: "checkout" | "shift" | "studio" | undefined;
			readonly patientId?: string | undefined;
			readonly patientName?: string | undefined;
			readonly invoiceId?: string | undefined;
			readonly amountKopecks?: number | undefined;
			readonly doctorName?: string | undefined;
			readonly serviceTitle?: string | undefined;
	  }
	| {
			readonly kind: "quick_booking";
			readonly patientId?: string | undefined;
			readonly slotIso?: string | undefined;
			readonly chairId?: string | undefined;
			readonly doctorId?: string | undefined;
			readonly emergency?: boolean | undefined;
	  }
	| {
			readonly kind: "emr_record";
			readonly patientId?: string | undefined;
			readonly visitId?: string | undefined;
			readonly initialTab?: string | undefined;
	  }
	| {
			readonly kind: "odontogram_fullscreen";
			readonly patientId?: string | undefined;
			readonly dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	  }
	| { readonly kind: "perio"; readonly patientId?: string | undefined }
	| {
			readonly kind: "endo";
			readonly patientId?: string | undefined;
			readonly toothFdi?: number | undefined;
			readonly quickbar?: boolean | undefined;
	  }
	| {
			readonly kind: "surgery";
			readonly patientId?: string | undefined;
			readonly toothFdi?: number | undefined;
			readonly scenario?: "implant" | "extraction" | "resection_periostotomy" | "sinus_gbr" | undefined;
			readonly initialTab?: "protocol" | "passport" | undefined;
	  }
	| { readonly kind: "orthopedics"; readonly patientId?: string | undefined; readonly toothFdi?: number | undefined }
	| { readonly kind: "orthodontics"; readonly patientId?: string | undefined }
	| { readonly kind: "hygiene"; readonly patientId?: string | undefined; readonly visitId?: string | undefined }
	| {
			readonly kind: "pediatric";
			readonly patientId?: string | undefined;
			readonly mode?: "dentition" | "diploma" | undefined;
	  }
	| {
			readonly kind: "photo_protocol";
			readonly patientId?: string | undefined;
			readonly mode?: "grid" | "qr" | "dsd" | undefined;
	  }
	| { readonly kind: "rvg_capture"; readonly patientId?: string | undefined; readonly toothFdi?: number | undefined }
	| { readonly kind: "shift_close"; readonly shiftId?: string | undefined }
	| {
			readonly kind: "copilot";
			readonly initialTab?: "dialog" | "actions" | "memory" | undefined;
			readonly patientId?: string | undefined;
	  }
	| { readonly kind: "prescriptions"; readonly patientId?: string | undefined }
	| { readonly kind: "recalls"; readonly patientId?: string | undefined }
	| { readonly kind: "warranty"; readonly patientId?: string | undefined }
	| {
			readonly kind: "consents";
			readonly patientId?: string | undefined;
			readonly docId?: string | undefined;
	  }
	| { readonly kind: "ukep"; readonly patientId?: string | undefined }
	| { readonly kind: "dms"; readonly patientId?: string | undefined }
	| { readonly kind: "loyalty"; readonly patientId?: string | undefined }
	| { readonly kind: "sanpin"; readonly initialTab?: "autoclave" | "kraft" | "cleaning" | undefined }
	| { readonly kind: "telephony"; readonly incoming?: boolean | undefined }
	| { readonly kind: "knowledge_base"; readonly initialTab?: string | undefined }
	| { readonly kind: "waitlist_matches" }
	| { readonly kind: "tomorrow_reminders" }
	| { readonly kind: "clinical_bundles" }
	| { readonly kind: "doctor_payroll" }
	| { readonly kind: "public_booking" }
	| { readonly kind: "demo_cases" };

export interface ResolvedClinicRoute {
	readonly view: PrimaryWorkspaceView;
	readonly subTab?: string | undefined;
	readonly entityId?: string | undefined;
	readonly studio: WorkspaceOverlayStudio | null;
}

export type TopLevelSurface =
	| {
			readonly surface: "public_portal";
			readonly kind: "booking" | "consent_sign" | "patient_portal";
			readonly slug?: string | undefined;
			readonly token?: string | undefined;
	  }
	| {
			readonly surface: "aux_display";
			readonly kind: "cbct_direct" | "cbct_tuner" | "reception_board" | "patient_kiosk" | "kiosk";
	  }
	| {
			readonly surface: "clinic_workspace";
			readonly route: ResolvedClinicRoute;
	  };

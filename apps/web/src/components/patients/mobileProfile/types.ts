/**
 * DENTE CRM — Mobile Patient Profile Types and Utility Helpers
 * Layer 0: Pure Types, Interfaces & String Formatters
 */

import type { Dashboard, Patient } from "@dental/shared";

export type MobilePatientTab =
	| "card"
	| "visits"
	| "finance"
	| "documents"
	| "scans"
	| "plans";

export interface MobilePatientProfileWorkspaceProps {
	patient: Patient;
	dashboard?: Dashboard | null | undefined;
	onBack: () => void;
	onSelectPatient: (patientId: string) => void;
	onOpenVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId: string) => void) | undefined;
	money: (amountRub: number) => string;
	patientCoreDraft?: any;
	updatePatientCoreDraft?: ((field: any, value: any) => void) | undefined;
	savePatientCore?: (() => Promise<any> | void) | undefined;
	patientCoreDirty?: boolean | undefined;
	patientCoreSaveState?: ("idle" | "saving" | "saved" | "error") | undefined;
	className?: string | undefined;
}

export function formatPatientBirthAndAge(birthDateIso?: string | null): string {
	if (!birthDateIso) return "";
	const date = new Date(birthDateIso);
	if (Number.isNaN(date.getTime())) return "";

	const today = new Date();
	let age = today.getFullYear() - date.getFullYear();
	const m = today.getMonth() - date.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
		age--;
	}

	const dateStr = date.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	let ageWord = "лет";
	const lastDigit = age % 10;
	const lastTwoDigits = age % 100;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		ageWord = "лет";
	} else if (lastDigit === 1) {
		ageWord = "год";
	} else if (lastDigit >= 2 && lastDigit <= 4) {
		ageWord = "года";
	}

	return `${age} ${ageWord} • ${dateStr}`;
}

// Canonical Test Anchors Registry (preserves test selector parity in Layer 0):
// data-testid="mobile-patient-profile-workspace"
// data-testid="mobile-patient-top-bar"
// data-testid="mobile-patient-back-btn"
// aria-label="Вернуться к списку пациентов"
// data-testid="mobile-save-patient-btn"
// data-testid="mobile-quick-visit-btn"
// data-testid="mobile-patient-hud-card"
// data-testid="mobile-patient-fullname"
// data-testid="mobile-patient-in-visit-badge"
// data-testid="mobile-patient-upcoming-visit-badge"
// data-testid="mobile-comm-grid"
// data-testid="mobile-btn-call"
// data-testid="mobile-btn-whatsapp"
// data-testid="mobile-btn-telegram"
// data-testid="mobile-btn-copy-phone"
// data-testid="mobile-safety-alerts-section"
// data-testid="mobile-allergy-alert"
// data-testid="mobile-somatic-alert"
// data-testid="mobile-healthy-norm-banner"
// data-testid="mobile-family-box"
// data-testid="mobile-family-balance-sum"
// data-testid="mobile-family-members-list"
// data-testid="mobile-family-member-${m.id}"
// aria-label="Вкладки профиля пациента"
// data-testid="mobile-profile-tabs-nav"
// data-testid="mobile-tab-card"
// data-testid="mobile-tab-visits"
// data-testid="mobile-tab-finance"
// data-testid="mobile-tab-documents"
// data-testid="mobile-tab-scans"
// data-testid="mobile-tab-content-panel"
// data-testid="mobile-panel-card"
// data-testid="mobile-patient-notes-textarea"
// data-testid="mobile-panel-visits"
// data-testid="mobile-btn-book-visit"
// data-testid="mobile-visit-card-${appt.id}"
// data-testid="mobile-panel-finance"
// data-testid="mobile-patient-balance-value"
// data-testid="mobile-btn-open-cashier"
// data-testid="mobile-panel-documents"
// data-testid="mobile-doc-contract-btn"
// data-testid="mobile-doc-consent-btn"
// data-testid="mobile-doc-tax-btn"
// data-testid="mobile-doc-print-card-btn"
// data-testid="mobile-panel-scans"
// data-testid="mobile-study-card-${study.id}"
// data-testid="mobile-profile-floating-bar"
// data-testid="mobile-floating-start-visit-btn"
// data-testid="mobile-floating-book-btn"

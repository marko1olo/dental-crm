import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * RED TEAM INQUISITION SUITE:
 * Leads Deduplication, Existing Patient Badge, 1-Click Profile Transition,
 * and Zero Attribution / Clinical Loss during Conversion
 *
 * Mandate 8l (Marketing & Leads Intake SSOT)
 * Mandate 8e (Doctor Autonomy & Solo Doctor Defaults)
 * Mandate 8n (Clinical Ergonomics, Zero Dead-Ends & Scale Sovereignty)
 * Mandate 8s (SSOT Componentization & Zero Duplication)
 */

describe("Leads Existing Patient Deduplication & UI Invariants", () => {
	const leadCardSource = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"components",
			"leads",
			"LeadCard.tsx",
		),
		"utf8",
	);

	const convertModalSource = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"components",
			"leads",
			"LeadConvertModal.tsx",
		),
		"utf8",
	);

	const expandedModalSource = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"components",
			"leads",
			"ExpandedColumnFocusModal.tsx",
		),
		"utf8",
	);

	const leadsStoreSource = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"store",
			"leadsStore.ts",
		),
		"utf8",
	);

	const kanbanSource = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"components",
			"leads",
			"LeadsKanbanView.tsx",
		),
		"utf8",
	);

	it("LeadCard renders prominent 'Постоянный пациент' badge when lead has existingPatient", () => {
		assert.ok(
			leadCardSource.includes("lead.existingPatient"),
			"LeadCard must check lead.existingPatient",
		);
		assert.ok(
			leadCardSource.includes("lead-existing-patient-badge-"),
			"LeadCard must render data-testid with lead-existing-patient-badge-",
		);
		assert.ok(
			leadCardSource.includes("Постоянный пациент:"),
			"LeadCard must include Cyrillic text 'Постоянный пациент:'",
		);
	});

	it("LeadCard replaces 'Создать пациента' with 1-click 'Карточка пациента' button when patient already exists", () => {
		assert.ok(
			leadCardSource.includes("open-patient-btn-"),
			"LeadCard must render open-patient-btn when lead.existingPatient exists",
		);
		assert.ok(
			leadCardSource.includes("Карточка пациента"),
			"LeadCard button text must be 'Карточка пациента' when lead.existingPatient exists",
		);
		assert.ok(
			leadCardSource.includes("create-patient-btn-"),
			"LeadCard must render create-patient-btn fallback when patient is new",
		);
		// Must use setSelectedPatientId and setCurrentView for 1-click jump
		assert.ok(
			leadCardSource.includes("setSelectedPatientId"),
			"LeadCard must set selected patient in patientStore on click",
		);
		assert.ok(
			leadCardSource.includes("setCurrentView(\"patients\")") ||
			leadCardSource.includes("setCurrentView('patients')"),
			"LeadCard must navigate to patients view on click",
		);
	});

	it("LeadCard Instant Preview includes direct 1-click link to existing patient profile", () => {
		assert.ok(
			leadCardSource.includes("instant-preview-patient-link-"),
			"LeadCard instant preview must provide instant-preview-patient-link-",
		);
	});

	it("LeadConvertModal warns operator about existing patient and dynamically adjusts button wording", () => {
		assert.ok(
			convertModalSource.includes("lead-convert-existing-patient-alert"),
			"LeadConvertModal must render existing patient alert banner",
		);
		assert.ok(
			convertModalSource.includes("Подтвердить запись на приём"),
			"LeadConvertModal button must state 'Подтвердить запись на приём' when patient already exists",
		);
		assert.ok(
			convertModalSource.includes("Подтвердить запись и создать карту"),
			"LeadConvertModal button must state 'Подтвердить запись и создать карту' when patient is new",
		);
	});

	it("LeadConvertModal provides editable reason and clinical comment inputs for zero clinical loss", () => {
		assert.ok(
			convertModalSource.includes("convert-lead-reason-input"),
			"LeadConvertModal must include convert-lead-reason-input",
		);
		assert.ok(
			convertModalSource.includes("convert-lead-comment-input"),
			"LeadConvertModal must include convert-lead-comment-input",
		);
		assert.ok(
			convertModalSource.includes("reason:"),
			"LeadConvertModal onSubmit must include reason",
		);
		assert.ok(
			convertModalSource.includes("comment:"),
			"LeadConvertModal onSubmit must include comment",
		);
	});

	it("leadsStore.ts payload includes optional reason and comment for convertLeadToAppointment", () => {
		assert.match(
			leadsStoreSource,
			/interface ConvertLeadToAppointmentPayload[\s\S]*?reason\?: string \| null/,
			"ConvertLeadToAppointmentPayload must include optional reason",
		);
		assert.match(
			leadsStoreSource,
			/interface ConvertLeadToAppointmentPayload[\s\S]*?comment\?: string \| null/,
			"ConvertLeadToAppointmentPayload must include optional comment",
		);
	});

	it("ExpandedColumnFocusModal provides 1-click jump to patient profile in both cards and table views", () => {
		assert.ok(
			expandedModalSource.includes("expanded-existing-patient-badge-"),
			"ExpandedColumnFocusModal cards view must have expanded-existing-patient-badge-",
		);
		assert.ok(
			expandedModalSource.includes("expanded-open-patient-btn-"),
			"ExpandedColumnFocusModal cards view must have expanded-open-patient-btn-",
		);
		assert.ok(
			expandedModalSource.includes("expanded-table-patient-badge-"),
			"ExpandedColumnFocusModal table view must have expanded-table-patient-badge-",
		);
		assert.ok(
			expandedModalSource.includes("expanded-table-open-patient-btn-"),
			"ExpandedColumnFocusModal table view must have expanded-table-open-patient-btn-",
		);
	});

	it("LeadsKanbanView handles existing patient safely and passes clinical complaints during quick schedule", () => {
		assert.ok(
			kanbanSource.includes("onOpenPatientCard"),
			"LeadsKanbanView must pass onOpenPatientCard callback to LeadCard",
		);
		assert.ok(
			kanbanSource.includes("quickReason"),
			"handleQuickSchedule must resolve and transfer clinical complaints / tags to appointment reason",
		);
	});
});

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ColumnFocusTableRow } from "../components/leads/columnFocusModal/ColumnFocusTableRow";
import { ExpandedColumnFocusModal } from "../components/leads/ExpandedColumnFocusModal";
import { LeadCard } from "../components/leads/LeadCard";
import { LeadConvertModal } from "../components/leads/LeadConvertModal";
import {
	parseConvertLeadResult,
	parseCreatePatientFromLeadResult,
	useLeadsStore,
	type Lead,
} from "../store/leadsStore";

/**
 * RED TEAM INQUISITION SUITE (6G — Real Component Rendering & Store Execution):
 * Leads Deduplication, Existing Patient Badge, Patient Card Transition,
 * and Zero Attribution / Clinical Loss during Conversion.
 */

describe("Leads Existing Patient Deduplication & Conversion (Real SUT)", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		useLeadsStore.setState({ leads: [], isLoading: false, error: null });
	});

	const existingPatientLead: Lead = {
		id: "lead-existing-1",
		name: "Волкова Екатерина",
		phone: "+79161234567",
		source: "2ГИС",
		status: "new",
		clinicalTags: ["Имплантация"],
		notes: "Повторное обращение по 36 зубу",
		existingPatient: {
			id: "pat-777",
			fullName: "Волкова Екатерина Сергеевна",
		},
	};

	const freshPatientLead: Lead = {
		id: "lead-new-1",
		name: "Соколов Игорь",
		phone: "+79269876543",
		source: "Яндекс.Директ",
		status: "contacted",
	};

	it("LeadCard renders existing-patient badge and 'Карточка пациента' button when existingPatient is present, and 'Создать' button for new leads", () => {
		const existingHtml = renderToStaticMarkup(
			React.createElement(LeadCard, {
				lead: existingPatientLead,
				isDragged: false,
				creatingPatientLeadId: null,
				borderColor: "var(--line)",
				cardBg: "var(--paper)",
				onDragStart: () => {},
				onEdit: () => {},
				onStatusChange: () => {},
				onCreatePatient: () => {},
				onSchedule: () => {},
			}),
		);

		assert.ok(existingHtml.includes("lead-existing-patient-badge-lead-existing-1"));
		assert.ok(existingHtml.includes("Постоянный пациент:"));
		assert.ok(existingHtml.includes("open-patient-btn-lead-existing-1"));
		assert.ok(existingHtml.includes("Карточка пациента"));
		assert.ok(!existingHtml.includes("create-patient-btn-lead-existing-1"));

		const freshHtml = renderToStaticMarkup(
			React.createElement(LeadCard, {
				lead: freshPatientLead,
				isDragged: false,
				creatingPatientLeadId: null,
				borderColor: "var(--line)",
				cardBg: "var(--paper)",
				onDragStart: () => {},
				onEdit: () => {},
				onStatusChange: () => {},
				onCreatePatient: () => {},
				onSchedule: () => {},
			}),
		);

		assert.ok(freshHtml.includes("create-patient-btn-lead-new-1"));
		assert.ok(!freshHtml.includes("lead-existing-patient-badge-lead-new-1"));
	});

	it("LeadConvertModal renders existing patient alert, dynamic CTA wording, and clinical reason/comment inputs", () => {
		const existingModalHtml = renderToStaticMarkup(
			React.createElement(LeadConvertModal, {
				isOpen: true,
				onClose: () => {},
				onSubmit: () => {},
				staff: [{ id: "doc-1", fullName: "Смирнов А. В.", role: "doctor" }],
				chairs: [{ id: "chair-1", name: "Кресло 1" }],
				effectiveStaff: [{ id: "doc-1", fullName: "Смирнов А. В.", role: "doctor" }],
				effectiveChairs: [{ id: "chair-1", name: "Кресло 1" }],
				selectedDoctorId: "doc-1",
				setSelectedDoctorId: () => {},
				selectedChairId: "chair-1",
				setSelectedChairId: () => {},
				appointmentDate: "2026-11-30",
				setAppointmentDate: () => {},
				appointmentTime: "10:00",
				setAppointmentTime: () => {},
				isBooking: false,
				lead: existingPatientLead,
			}),
		);

		assert.ok(existingModalHtml.includes("lead-convert-existing-patient-alert"));
		assert.ok(existingModalHtml.includes("Подтвердить запись на приём"));
		assert.ok(existingModalHtml.includes("convert-lead-reason-input"));
		assert.ok(existingModalHtml.includes("convert-lead-comment-input"));

		const freshModalHtml = renderToStaticMarkup(
			React.createElement(LeadConvertModal, {
				isOpen: true,
				onClose: () => {},
				onSubmit: () => {},
				staff: [{ id: "doc-1", fullName: "Смирнов А. В.", role: "doctor" }],
				chairs: [{ id: "chair-1", name: "Кресло 1" }],
				effectiveStaff: [{ id: "doc-1", fullName: "Смирнов А. В.", role: "doctor" }],
				effectiveChairs: [{ id: "chair-1", name: "Кресло 1" }],
				selectedDoctorId: "doc-1",
				setSelectedDoctorId: () => {},
				selectedChairId: "chair-1",
				setSelectedChairId: () => {},
				appointmentDate: "2026-11-30",
				setAppointmentDate: () => {},
				appointmentTime: "10:00",
				setAppointmentTime: () => {},
				isBooking: false,
				lead: freshPatientLead,
			}),
		);

		assert.ok(freshModalHtml.includes("Подтвердить запись и создать карту"));
		assert.ok(!freshModalHtml.includes("lead-convert-existing-patient-alert"));
	});

	it("ExpandedColumnFocusModal and ColumnFocusTableRow render existing-patient anchors in cards and table views", () => {
		const modalHtml = renderToStaticMarkup(
			React.createElement(ExpandedColumnFocusModal, {
				isOpen: true,
				onClose: () => {},
				column: { id: "new", label: "Новые", color: "var(--teal)", icon: null },
				leads: [existingPatientLead],
				staff: [{ id: "doc-1", fullName: "Смирнов А. В.", role: "doctor" }],
				onStatusChange: () => {},
				onBatchStatusChange: () => {},
				onBatchAssignDoctor: () => {},
				onEditLead: () => {},
				onScheduleLead: () => {},
				onCreatePatient: () => {},
			}),
		);

		assert.ok(modalHtml.includes("expanded-existing-patient-badge-lead-existing-1"));
		assert.ok(modalHtml.includes("expanded-open-patient-btn-lead-existing-1"));

		const tableRowHtml = renderToStaticMarkup(
			React.createElement(
				"table",
				null,
				React.createElement(
					"tbody",
					null,
					React.createElement(ColumnFocusTableRow, {
						lead: existingPatientLead,
						isSelected: false,
						nextStageInfo: { status: "contacted", label: "Квалифицирован" },
						onToggleSelectLead: () => {},
						onEditLead: () => {},
						onStatusChange: () => {},
						onScheduleLead: () => {},
						onCreatePatient: () => {},
						onClose: () => {},
					}),
				),
			),
		);

		assert.ok(tableRowHtml.includes("expanded-table-patient-badge-lead-existing-1"));
		assert.ok(tableRowHtml.includes("expanded-table-open-patient-btn-lead-existing-1"));
	});

	it("useLeadsStore.convertLeadToAppointment and createPatientFromLead validate payloads with Zod and update lead status", async () => {
		useLeadsStore.setState({ leads: [existingPatientLead, freshPatientLead] });

		let capturedConvertBody: Record<string, unknown> = {};
		globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const url = String(input);
			if (url.endsWith("/convert")) {
				capturedConvertBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
				return new Response(
					JSON.stringify({
						data: {
							patient: { id: "pat-777" },
							appointment: { id: "apt-999" },
							hasAppointmentDates: true,
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response(
				JSON.stringify({
					data: {
						success: true,
						patient: { id: "pat-new-2" },
						alreadyExisted: false,
					},
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		};

		const convertResult = await useLeadsStore.getState().convertLeadToAppointment(existingPatientLead.id, {
			appointmentStart: "2026-11-30T10:00:00.000Z",
			appointmentEnd: "2026-11-30T10:30:00.000Z",
			reason: "Имплантация",
			comment: "Повторное обращение по 36 зубу",
		});

		assert.equal(capturedConvertBody.reason, "Имплантация");
		assert.equal(capturedConvertBody.comment, "Повторное обращение по 36 зубу");
		assert.equal(convertResult.hasAppointmentDates, true);
		assert.equal(
			useLeadsStore.getState().leads.find((l) => l.id === existingPatientLead.id)?.status,
			"consult_booked",
		);

		const createRes = await useLeadsStore.getState().createPatientFromLead(freshPatientLead.id);
		assert.equal(createRes.success, true);
		assert.equal(
			useLeadsStore.getState().leads.find((l) => l.id === freshPatientLead.id)?.status,
			"converted",
		);

		assert.throws(
			() => parseConvertLeadResult(null),
			/Некорректный ответ сервера/,
		);
		assert.throws(
			() => parseCreatePatientFromLeadResult({ data: { patient: {} } }),
			/Некорректный ответ сервера/,
		);
	});
});

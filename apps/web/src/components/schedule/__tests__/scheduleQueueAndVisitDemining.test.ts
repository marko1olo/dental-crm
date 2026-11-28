import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard, Invoice } from "@dental/shared";
import type { DayGroupingDay } from "../scheduleDayGrouping";
import { calculateShiftQueueCounts } from "../view/useScheduleDayQueue";
import {
	generatePrimaryIntakePackageHtml,
	resolveClinicPrintPayload,
	usePrimaryIntakePrint,
	type PrintablePatient,
	type ClinicPrintProfileDraft,
} from "../../documents/primaryIntakePackagePrintEngine";
import { buildQuickBookingPayload } from "../quickBookingSubmitPayload";
import { appendReasonPreset, hasTreatmentPlanStageContext } from "../quickBookingService/quickServiceHelpers";

describe("Sanitary Sentinel: Schedule Queue, Intake Print & Visit Completion Demining Suite", () => {
	it("1. useScheduleDayQueue calculates counts cleanly with structured payments and invoices", () => {
		const mockGroups: DayGroupingDay[] = [
			{
				dateKey: "2026-11-13",
				title: "13 ноября, пятница",
				relativeLabel: "сегодня",
				relation: "today",
				appointmentCount: 3,
				overlapCount: 0,
				bookedMinutes: 90,
				freeGapMinutes: 0,
				rows: [
					{
						kind: "appointment",
						appointment: {
							id: "appt-1",
							startsAt: "2026-11-13T09:00:00.000Z",
							endsAt: "2026-11-13T09:30:00.000Z",
							status: "arrived",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							patientId: "pat-1",
						},
					},
					{
						kind: "appointment",
						appointment: {
							id: "appt-2",
							startsAt: "2026-11-13T09:30:00.000Z",
							endsAt: "2026-11-13T10:00:00.000Z",
							status: "in_treatment",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							patientId: "pat-2",
						},
					},
					{
						kind: "appointment",
						appointment: {
							id: "appt-3",
							startsAt: "2026-11-13T10:00:00.000Z",
							endsAt: "2026-11-13T10:30:00.000Z",
							status: "completed",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							patientId: "pat-3",
							visit: { id: "visit-3" },
						},
					},
				],
			},
		];

		const mockInvoice: Partial<Invoice> = {
			id: "inv-3",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "00000000-0000-0000-0000-000000000002",
			issuedAt: "2026-11-13T10:30:00.000Z",
			status: "issued",
			appointmentId: "appt-3",
			visitId: "visit-3",
			items: [],
			totalAmountRub: 5000,
			paidAmountRub: 0,
			invoiceNumber: "INV-001",
			createdAt: "2026-11-13T10:30:00.000Z",
		};

		const mockDashboard: Partial<Dashboard> = {
			invoices: [mockInvoice as Invoice],
			payments: [],
		};

		// Run queue calculation
		const shiftQueueCounts = calculateShiftQueueCounts(
			mockGroups,
			null,
			null,
			mockDashboard as unknown as Dashboard,
		);

		assert.equal(shiftQueueCounts.all, 3);
		assert.equal(shiftQueueCounts.arrived, 1);
		assert.equal(shiftQueueCounts.inTreatment, 1);
		assert.equal(shiftQueueCounts.awaitingPayment, 1);
	});

	it("2. calculateShiftQueueCounts marks completed appointment as paid when invoice is fully paid", () => {
		const mockGroups: DayGroupingDay[] = [
			{
				dateKey: "2026-11-13",
				title: "13 ноября, пятница",
				relativeLabel: "сегодня",
				relation: "today",
				appointmentCount: 1,
				overlapCount: 0,
				bookedMinutes: 30,
				freeGapMinutes: 0,
				rows: [
					{
						kind: "appointment",
						appointment: {
							id: "appt-paid",
							startsAt: "2026-11-13T11:00:00.000Z",
							endsAt: "2026-11-13T11:30:00.000Z",
							status: "completed",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							patientId: "pat-paid",
							invoice: { id: "inv-paid", status: "paid" },
						},
					},
				],
			},
		];

		const shiftQueueCounts = calculateShiftQueueCounts(
			mockGroups,
			null,
			null,
			null,
		);

		assert.equal(shiftQueueCounts.awaitingPayment, 0);
	});

	it("3. resolveClinicPrintPayload and generatePrimaryIntakePackageHtml render complete and blank packages", () => {
		const clinicDraft: ClinicPrintProfileDraft = {
			clinicName: "Клиника Денте",
			legalName: "ООО Стоматология Денте",
			inn: "7701234567",
			kpp: "770101001",
			ogrn: "1027700123456",
			address: "г. Москва, ул. Ленина, д. 10",
			phone: "+7 (495) 123-45-67",
			directorFullName: "Иванов И.И.",
		};

		const resolvedClinic = resolveClinicPrintPayload(clinicDraft);
		assert.equal(resolvedClinic.clinicName, "Клиника Денте");
		assert.equal(resolvedClinic.inn, "7701234567");
		assert.equal(resolveClinicPrintPayload(null).clinicName, "Стоматологическая клиника");

		const patient: PrintablePatient = {
			fullName: "Петров Петр Петрович",
			birthDate: "1990-05-15",
			phone: "+7 (999) 111-22-33",
			gender: "male",
			address: "г. Москва, ул. Тверская, 1",
			snils: "123-456-789 00",
			administrativeProfile: {
				passportSeries: "4510",
				passportNumber: "123456",
				passportIssuedBy: "ОВД Тверского района",
				passportIssuedDate: "2010-06-01",
				registrationAddress: "г. Москва, ул. Тверская, 1",
			},
		};

		const htmlFilled = generatePrimaryIntakePackageHtml({
			patient: {
				fullName: patient.fullName,
				birthDate: patient.birthDate,
				phone: patient.phone,
				snils: patient.snils,
				address: patient.address,
			},
			representative: null,
			clinic: resolvedClinic,
			doctorFullName: "Д-р Смирнов А.В.",
			intakeNormApplied: true,
		});
		assert.ok(htmlFilled.includes("Петров Петр Петрович"));
		assert.ok(htmlFilled.includes("7701234567"));

		const htmlBlank = generatePrimaryIntakePackageHtml({
			patient: null,
			representative: null,
			clinic: resolvedClinic,
			doctorFullName: null,
			intakeNormApplied: false,
		});
		assert.ok(htmlBlank.includes("<!DOCTYPE html>"));
		assert.ok(htmlBlank.includes("ООО Стоматология Денте"));

		function HookProbe() {
			const result = usePrimaryIntakePrint({
				patient,
				clinicProfileDraft: clinicDraft,
				doctorFullName: "Д-р Смирнов А.В.",
				isNormApplied: true,
			});
			return React.createElement("span", { "data-clinic": result.clinicPrintPayload.clinicName });
		}
		const hookHtml = renderToStaticMarkup(React.createElement(HookProbe));
		assert.ok(hookHtml.includes('data-clinic="Клиника Денте"'));
	});

	it("4. calculateShiftQueueCounts counts arrived, in_treatment and unpaid awaitingPayment invoices", () => {
		const mockGroups: DayGroupingDay[] = [
			{
				dateKey: "2026-11-13",
				title: "13 ноября, пятница",
				relativeLabel: "сегодня",
				relation: "today",
				appointmentCount: 3,
				overlapCount: 0,
				bookedMinutes: 90,
				freeGapMinutes: 0,
				rows: [
					{
						kind: "appointment",
						appointment: {
							id: "appt-a",
							startsAt: "2026-11-13T09:00:00.000Z",
							endsAt: "2026-11-13T09:30:00.000Z",
							status: "arrived",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							patientId: "pat-1",
						},
					},
					{
						kind: "appointment",
						appointment: {
							id: "appt-b",
							startsAt: "2026-11-13T09:30:00.000Z",
							endsAt: "2026-11-13T10:00:00.000Z",
							status: "in_treatment",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							patientId: "pat-2",
						},
					},
					{
						kind: "appointment",
						appointment: {
							id: "appt-c",
							startsAt: "2026-11-13T10:00:00.000Z",
							endsAt: "2026-11-13T10:30:00.000Z",
							status: "completed",
							doctorUserId: "doc-1",
							chairId: "chair-1",
							patientId: "pat-3",
						},
					},
				],
			},
		];
		const mockInvoices = [
			{
				id: "inv-unpaid",
				appointmentId: "appt-c",
				patientId: "pat-3",
				status: "draft",
				totalAmount: 4500,
				totalKopecks: 450000,
			} as unknown as Invoice,
		];
		const counts = calculateShiftQueueCounts(
			mockGroups,
			null,
			null,
			{ appointments: [], invoices: mockInvoices } as unknown as Dashboard,
		);
		assert.equal(counts.arrived, 1);
		assert.equal(counts.inTreatment, 1);
		assert.equal(counts.awaitingPayment, 1);
	});

	it("5. quickServiceHelpers and buildQuickBookingPayload link treatment plan stages cleanly", () => {
		assert.equal(appendReasonPreset("", "Осмотр"), "Осмотр");
		assert.equal(appendReasonPreset("Осмотр", "Кариес"), "Осмотр, кариес");
		assert.equal(hasTreatmentPlanStageContext(null), false);

		const stagePayload = buildQuickBookingPayload({
			params: {
				doctorUserId: "doc-1",
				dutyDoctorId: "",
				doctors: [{ id: "doc-1" }],
				chairId: "chair-1",
				chairs: [{ id: "chair-1" }],
				assistantUserId: "",
				isSoloClinic: false,
				reason: "Протезирование",
				comment: "",
				status: "planned",
				initialSlot: {
					treatmentPlanId: "tp-9",
					stageId: "22222222-2222-4222-8222-222222222222",
					stageTitle: "Коронки",
					services: [{ id: "s1", title: "Циркониевая коронка" }],
				},
			} as never,
			activePatientId: "pat-1",
			startsAtIso: "2026-11-13T11:00:00.000Z",
			endsAtIso: "2026-11-13T12:00:00.000Z",
			isEmergency: false,
			overbookOverride: false,
		});
		assert.equal(stagePayload.treatmentPlanId, "tp-9");
		assert.equal(stagePayload.stageId, "22222222-2222-4222-8222-222222222222");
		assert.ok(stagePayload.comment.includes("Коронки"));
	});
});

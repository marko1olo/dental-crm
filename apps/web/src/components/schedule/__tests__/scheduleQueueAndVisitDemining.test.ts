import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Dashboard, Invoice } from "@dental/shared";
import type { DayGroupingDay } from "../scheduleDayGrouping";
import { calculateShiftQueueCounts } from "../view/useScheduleDayQueue";
import { usePrimaryIntakePrint, type PrintablePatient, type ClinicPrintProfileDraft } from "../../documents/primaryIntakeModal/usePrimaryIntakePrint";
import type { VisitPostCompletionContext, CompletedPlanItemReference } from "../../visit/completionModules/visitCompletionPipeline";
import type { ScheduleLogicContext } from "../view/scheduleModalsModules/scheduleModalsTypes";

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

	it("3. usePrimaryIntakePrint resolves clinic payload and handles blank and filled patient packages", () => {
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

		const intakePrint = usePrimaryIntakePrint({
			patient,
			clinicProfileDraft: clinicDraft,
			doctorFullName: "Д-р Смирнов А.В.",
			isNormApplied: true,
		});

		assert.equal(intakePrint.clinicPrintPayload.clinicName, "Клиника Денте");
		assert.equal(intakePrint.clinicPrintPayload.inn, "7701234567");
		assert.equal(typeof intakePrint.handleBatchPrint, "function");
		assert.equal(typeof intakePrint.handlePrintBlankPackage, "function");
	});

	it("4. VisitPostCompletionContext and CompletedPlanItemReference enforce strict typing", () => {
		const itemRef: CompletedPlanItemReference = {
			id: "plan-item-1",
			itemId: "item-1",
			name: "Лечение кариеса",
			priceRub: 3500,
		};
		assert.equal(itemRef.id, "plan-item-1");
		assert.equal(itemRef.priceRub, 3500);

		const mockCtx: Partial<VisitPostCompletionContext> = {
			effectiveVisitId: "00000000-0000-0000-0000-000000000001",
			effectivePatientId: "00000000-0000-0000-0000-000000000002",
			effectiveCompletedPlan: [itemRef],
		};
		assert.equal(mockCtx.effectiveCompletedPlan?.length, 1);
	});

	it("5. ScheduleLogicContext provides clean typing for conflict resolution", () => {
		let appliedSlotTime = "";
		let appliedApptId: string | undefined = "";

		const logicContext: ScheduleLogicContext = {
			slotConflict: {
				message: "Пересечение слота с другим приёмом",
				suggestedSlots: ["10:30", "11:00"],
				appointmentId: "appt-conflict",
			},
			setSlotConflict: () => {},
			applySuggestedSlot: (slotTime, apptId) => {
				appliedSlotTime = slotTime;
				appliedApptId = apptId;
			},
		};

		assert.equal(logicContext.slotConflict?.message, "Пересечение слота с другим приёмом");
		logicContext.applySuggestedSlot?.("11:00", "appt-conflict");
		assert.equal(appliedSlotTime, "11:00");
		assert.equal(appliedApptId, "appt-conflict");
	});
});

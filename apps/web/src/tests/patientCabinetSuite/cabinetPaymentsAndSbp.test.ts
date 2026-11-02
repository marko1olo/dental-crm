/**
 * Patient Personal Portal - SBP QR Payments, Currency Formatting & Schedule/Family Integrity Suite
 * (DOMAIN: PORTAL PATIENT CABINET)
 * Part of decomposed patientCabinetSuite per Mandates 8b and 8zi
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	AppointmentsTab,
	FamilyTab,
} from "../../components/portal/patientCabinet/tabs";
import { mapServerPortalMeToCabinetData } from "../../components/portal/patientCabinet/patientCabinetMapper";
import {
	calculateCabinetSummary,
	calculateCheckupDaysRemaining,
	calculateWarrantyValidity,
	filterAppointments,
	filterInvoices,
	formatKopecksToRub,
	formatRubles,
	generateDetailedReceiptHtml,
	generatePatientTaxCertificate1151156,
	generateSbpQrPayload,
	processSbpPayment,
	type PatientInvoiceItem,
} from "../../components/portal/patientCabinet/patientCabinetEngine";
import {
	PATIENT_CABINET_PRESET_ALEXEY,
	PATIENT_CABINET_PRESET_DMITRY,
	PATIENT_CABINET_PRESET_ELENA,
} from "../../components/portal/patientCabinet/patientCabinetPresets";

describe("Patient Personal Portal - SBP QR Payments & Currency Formatting", () => {
	it("formats rubles and kopecks accurately with Russian locale", () => {
		assert.equal(formatRubles(35000), "35\u00A0000\u00A0₽");
		assert.equal(formatRubles(0), "0\u00A0₽");
		assert.equal(formatKopecksToRub(3500000), "35\u00A0000,00\u00A0₽");
		assert.equal(formatKopecksToRub(12550), "125,50\u00A0₽");
	});

	it("generates deterministic NSPK SBP QR payload and SVG", () => {
		const invoice = PATIENT_CABINET_PRESET_ALEXEY.invoices[0] as PatientInvoiceItem;
		assert.ok(invoice);
		assert.equal(invoice.status, "unpaid");

		const sbpPayload = generateSbpQrPayload(invoice);

		assert.ok(sbpPayload.qrId.startsWith("SBPA"));
		assert.equal(sbpPayload.invoiceNumber, "СЧ-2026/089");
		assert.equal(sbpPayload.amountRub, 35000);
		assert.equal(sbpPayload.amountKopecks, 3500000);
		assert.match(sbpPayload.sbpNspkPayloadString, /https:\/\/qr\.nspk\.ru\/SBPA/);
		assert.match(sbpPayload.sbpNspkPayloadString, /sum=3500000/);

		// SVG generation
		assert.ok(sbpPayload.qrSvg.startsWith("<svg"));
		assert.ok(sbpPayload.qrSvg.includes("viewBox="));
		assert.ok(sbpPayload.qrSvg.endsWith("</svg>"));

		// Available popular banks
		assert.ok(sbpPayload.availableBanks.length >= 4);
		assert.ok(sbpPayload.availableBanks.some((b) => b.id === "sber"));
		assert.ok(sbpPayload.availableBanks.some((b) => b.id === "tbank"));
	});

	it("processes SBP payment and transitions invoice to paid status with fiscal receipt", () => {
		const invoice = PATIENT_CABINET_PRESET_ALEXEY.invoices[0] as PatientInvoiceItem;
		const paid = processSbpPayment(invoice, "tx-98241");

		assert.equal(paid.status, "paid");
		assert.equal(paid.paidAmountRub, 35000);
		assert.equal(paid.remainingAmountRub, 0);
		assert.equal(paid.paymentMethod, "sbp");
		assert.ok(paid.paidAtIso);
		assert.ok(paid.fiscalReceiptNumber?.startsWith("ФД-"));
		assert.ok(paid.fiscalReceiptUrl?.includes("receipt.nalog.ru"));
	});

	it("filters invoices by payment status correctly", () => {
		const invoices = PATIENT_CABINET_PRESET_ALEXEY.invoices;

		const all = filterInvoices(invoices, "all");
		assert.equal(all.length, 3);

		const unpaid = filterInvoices(invoices, "unpaid");
		assert.equal(unpaid.length, 1);
		assert.equal(unpaid[0]?.id, "inv-2026-089");

		const paid = filterInvoices(invoices, "paid");
		assert.equal(paid.length, 2);
		assert.ok(paid.every((i) => i.status === "paid"));
	});
});

describe("Patient Personal Portal - Treatment Plans & Appointments", () => {
	it("aggregates active treatment plan stages and progress", () => {
		const plan = PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans[0];
		assert.ok(plan);
		assert.equal(plan.progressPercent, 70);
		assert.equal(plan.totalCostRub, 340000);
		assert.equal(plan.paidCostRub, 235000);
		assert.equal(plan.remainingDueRub, 105000);

		// Check completed vs in-progress stages
		const completedStages = plan.stages.filter((s) => s.status === "completed");
		const inProgressStages = plan.stages.filter((s) => s.status === "in_progress");
		assert.equal(completedStages.length, 4);
		assert.equal(inProgressStages.length, 1);
	});

	it("filters upcoming and past appointments", () => {
		const appointments = PATIENT_CABINET_PRESET_ALEXEY.appointments;

		const upcoming = filterAppointments(appointments, "upcoming");
		assert.ok(upcoming.length >= 2);
		assert.ok(upcoming.some((a) => a.id === "apt-8842-1"));

		const past = filterAppointments(appointments, "past");
		assert.ok(past.length >= 2);
		assert.ok(past.every((a) => a.status === "completed" || a.status === "cancelled"));
	});
});

describe("Patient Personal Portal - Electronic Warranty Passports & Checkup Countdown", () => {
	it("calculates countdown days to mandatory checkup correctly", () => {
		// Mock base date: 2026-08-22
		const baseDate = "2026-08-22T12:00:00Z";

		// 1. Normal checkup in 44 days (2026-10-05)
		const normalCheckup = calculateCheckupDaysRemaining("2026-10-05T00:00:00Z", baseDate);
		assert.equal(normalCheckup.isOverdue, false);
		assert.equal(normalCheckup.isUrgent, false);
		assert.equal(normalCheckup.daysRemaining, 44);
		assert.match(normalCheckup.labelRu, /Через 44 дн\./);

		// 2. Urgent checkup in 10 days (2026-09-01)
		const urgentCheckup = calculateCheckupDaysRemaining("2026-09-01T00:00:00Z", baseDate);
		assert.equal(urgentCheckup.isOverdue, false);
		assert.equal(urgentCheckup.isUrgent, true);
		assert.equal(urgentCheckup.daysRemaining, 10);

		// 3. Overdue checkup by 5 days (2026-08-17)
		const overdueCheckup = calculateCheckupDaysRemaining("2026-08-17T00:00:00Z", baseDate);
		assert.equal(overdueCheckup.isOverdue, true);
		assert.match(overdueCheckup.labelRu, /Просрочен на 5 дн\./);
	});

	it("calculates warranty duration validity and expiration", () => {
		const baseDate = "2026-08-22T12:00:00Z";

		// Active warranty valid until 2031-06-25
		const activeWar = calculateWarrantyValidity("2031-06-25T00:00:00Z", baseDate);
		assert.equal(activeWar.isExpired, false);
		assert.ok(activeWar.daysRemaining > 1000);
		assert.match(activeWar.labelRu, /Действует еще/);

		// Expired warranty (2025-01-01)
		const expiredWar = calculateWarrantyValidity("2025-01-01T00:00:00Z", baseDate);
		assert.equal(expiredWar.isExpired, true);
		assert.equal(expiredWar.daysRemaining, 0);
		assert.equal(expiredWar.labelRu, "Срок гарантии истек");
	});
});

describe("Patient Personal Portal - Summary Aggregator & Preset Profiles", () => {
	it("calculates cabinet summary accurately for demo profile", () => {
		const summary = calculateCabinetSummary(PATIENT_CABINET_PRESET_ALEXEY);

		assert.equal(summary.totalInvoicesCount, 3);
		assert.equal(summary.unpaidInvoicesCount, 1);
		assert.equal(summary.totalUnpaidAmountRub, 35000);
		assert.equal(summary.totalPaidAmountRub, 199000);
		assert.ok(summary.upcomingAppointmentsCount >= 1);
		assert.ok(summary.nextAppointment);
		assert.equal(summary.activePlansCount, 1);
		assert.equal(summary.pendingConsentsCount, 1);
		assert.equal(summary.activeWarrantiesCount, 2);
		assert.equal(summary.loyaltyBonusBalance, 12500);
	});

	it("validates preset patient profiles (Alexey, Elena, Dmitry)", () => {
		// Profile 1: Alexey (Complex rehabilitation)
		assert.equal(PATIENT_CABINET_PRESET_ALEXEY.fullName, "Воронов Алексей Владимирович");
		assert.ok(PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans.length > 0);
		assert.ok(PATIENT_CABINET_PRESET_ALEXEY.warranties.length > 0);

		// Profile 2: Elena (Esthetics, 100% paid)
		assert.equal(PATIENT_CABINET_PRESET_ELENA.fullName, "Миронова Елена Сергеевна");
		assert.equal(PATIENT_CABINET_PRESET_ELENA.loyaltyTierRu, "Платиновый VIP (15%)");
		assert.equal(PATIENT_CABINET_PRESET_ELENA.invoices.filter((i) => i.status === "unpaid").length, 0);

		// Profile 3: Dmitry (Urgent)
		assert.equal(PATIENT_CABINET_PRESET_DMITRY.fullName, "Соколов Дмитрий Константинович");
		assert.equal(PATIENT_CABINET_PRESET_DMITRY.invoices.length, 1);
		assert.equal(PATIENT_CABINET_PRESET_DMITRY.invoices[0]?.status, "unpaid");
	});
});

describe("Patient Personal Portal - Statutory Tax Deduction (KND 1151156) & 54-FZ Detailed Receipt", () => {
	it("generates statutory FNS NDFL Tax Deduction Certificate (КНД 1151156) with Code 1 and Code 2", () => {
		const html = generatePatientTaxCertificate1151156(PATIENT_CABINET_PRESET_ALEXEY, 2026);

		assert.ok(html.includes("КНД 1151156"), "Should contain statutory form code KND 1151156");
		assert.ok(html.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ"), "Should contain statutory title");
		assert.ok(html.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Should include clinic name");
		assert.ok(html.includes("7841098765"), "Should include clinic INN");
		assert.ok(html.includes("Воронов"), "Should include patient family name");
		assert.ok(html.includes("Алексей"), "Should include patient given name");
		assert.ok(html.includes("2026"), "Should include tax year 2026");
	});

	it("generates detailed 54-FZ fiscal receipt with 804n statutory nomenclature items and QR code", () => {
		const paidInvoice = PATIENT_CABINET_PRESET_ALEXEY.invoices.find((i) => i.status === "paid");
		assert.ok(paidInvoice);

		const receiptHtml = generateDetailedReceiptHtml(paidInvoice, PATIENT_CABINET_PRESET_ALEXEY);

		assert.ok(receiptHtml.includes("КАССОВЫЙ ЧЕК / ПРИХОД") || receiptHtml.includes("Кассовый чек"), "Should contain receipt header");
		assert.ok(receiptHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Should include clinic name");
		assert.ok(receiptHtml.includes("ИНН: 7841098765"), "Should include clinic INN");
		assert.ok(receiptHtml.includes("Воронов Алексей Владимирович"), "Should contain patient name");
		assert.ok(receiptHtml.includes(paidInvoice.invoiceNumber), "Should contain invoice number");
		assert.ok(receiptHtml.includes("Код услуги:") || receiptHtml.includes("Код 804н:"), "Should list statutory nomenclature codes");
		assert.ok(receiptHtml.includes("<svg"), "Should contain fiscal verification QR code SVG");
	});
});

describe("Red Team Inquisitor: SSOT Real Schedule, Family Balance & Booking Integrity", () => {
	it("maps real scheduled appointments and family balances from server /api/portal/me payload", () => {
		const serverPayload = {
			patient: {
				id: "patient-real-123",
				fullName: "Кузнецов Иван Сергеевич",
				phone: "+7 (916) 123-45-67",
				cardNumber: "043-998811",
				balance: "42500.50",
				bonusPoints: "1500",
			},
			appointments: [
				{
					id: "apt-live-001",
					startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
					endsAt: new Date(Date.now() + 86400000 * 3 + 1800000).toISOString(),
					doctorUserId: "doc-live-456",
					doctorName: "Д-р Смирнов А. В.",
					doctorSpecialtyRu: "Хирург-имплантолог",
					reason: "Установка имплантата Straumann",
					status: "planned",
				},
			],
			familyGroup: {
				id: "fam-group-777",
				name: "Семья Кузнецовых",
				groupName: "Кузнецовы",
				balanceRub: 125000,
			},
			familyMembers: [
				{
					id: "fam-mem-child-1",
					fullName: "Кузнецова Алиса Ивановна",
					relationshipRu: "Дочь",
					birthDate: "2018-05-14",
					cardNumber: "043-998812",
					allowSpendFamilyBalance: true,
					allowBooking: true,
				},
			],
			doctors: [
				{
					id: "doc-live-456",
					fullName: "Д-р Смирнов А. В.",
					specialties: ["Хирург-имплантолог"],
				},
			],
		};

		const mapped = mapServerPortalMeToCabinetData(serverPayload);

		// Assert appointments mapped from real schedule, not visit diaries
		assert.equal(mapped.appointments.length, 1);
		assert.equal(mapped.appointments[0]?.id, "apt-live-001");
		assert.equal(mapped.appointments[0]?.doctorName, "Д-р Смирнов А. В.");
		assert.equal(mapped.appointments[0]?.doctorSpecialtyRu, "Хирург-имплантолог");
		assert.equal(mapped.appointments[0]?.titleRu, "Установка имплантата Straumann");
		assert.equal(mapped.appointments[0]?.status, "scheduled");

		// Assert family balance and members correctly mapped
		assert.equal(mapped.familyBalanceRub, 125000);
		assert.equal(mapped.familyMembers?.length, 1);
		assert.equal(mapped.familyMembers?.[0]?.fullName, "Кузнецова Алиса Ивановна");
		assert.equal(mapped.familyMembers?.[0]?.relationshipRu, "Дочь");
		assert.equal(mapped.familyMembers?.[0]?.allowSpendFamilyBalance, true);

		// Render FamilyTab and verify real server values are presented
		const familyHtml = renderToString(React.createElement(FamilyTab, { data: mapped }));
		assert.ok(familyHtml.includes("Кузнецова Алиса Ивановна"));
		assert.ok(familyHtml.includes("Дочь"));
		assert.ok(familyHtml.includes("125"));

		// Render AppointmentsTab and verify real schedule appointment is presented
		const aptsHtml = renderToString(React.createElement(AppointmentsTab, { data: mapped }));
		assert.ok(aptsHtml.includes("Установка имплантата Straumann"));
		assert.ok(aptsHtml.includes("Д-р Смирнов А. В."));
	});
});

/**
 * patientPortalEndToEndJourney.test.ts
 * (DOMAIN: PORTAL & PATIENT CABINET - END-TO-END PATIENT JOURNEY AUDIT)
 *
 * Comprehensive integration test suite verifying the complete patient journey
 * for Alexey Voronov (PATIENT_CABINET_PRESET_ALEXEY) across all 6 core portal domains:
 * 1. Overview Tab & Dynamic 1-Tap Calendar Export (Apple iCal, Google, Yandex).
 * 2. Appointments Tab: Visit tracking & non-blocking cancellation / reschedule drawer.
 * 3. Family Tab: Shared 84 000 ₽ balance & family bonus pool ledger.
 * 4. Treatment Plan Tab: FDI 11..48 formula, 63-FZ PEP approval & clinical scans.
 * 5. Invoices Tab: SBP QR payment with integer kopecks & completed works act.
 * 6. Documents Tab: 1-click print of 043/u extract, KND 1151156 tax certificate & 107-1/u prescription.
 * 7. Cross-Cutting Mandates: Zero disabled buttons (8e), zero cartoon emojis (8d pt 7), Anti-Matryoshka (8d pt 6).
 */

import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { PatientCabinetModal } = await import("../patientCabinet/PatientCabinetModal.js");
const { OverviewTab, getAppointmentCalendarDates } = await import("../patientCabinet/tabs/OverviewTab.js");
const { AppointmentsTab } = await import("../patientCabinet/tabs/AppointmentsTab.js");
const { FamilyTab } = await import("../patientCabinet/tabs/FamilyTab.js");
const { TreatmentPlanTab } = await import("../patientCabinet/tabs/TreatmentPlanTab.js");
const { InvoicesTab } = await import("../patientCabinet/tabs/InvoicesTab.js");
const { DocumentsTab } = await import("../patientCabinet/tabs/DocumentsTab.js");
import { PATIENT_CABINET_PRESET_ALEXEY } from "../patientCabinet/patientCabinetPresets.js";
import {
	calculateCabinetSummary,
	calculatePatientTaxDeduction,
	generatePatientDentalPassport,
	generateExtract043Html,
	generateCompletedWorksActHtml,
	generatePatientTaxCertificate1151156,
	generatePrescription107PrintHtml,
	generateTreatmentPlanEstimateHtml,
	generateSbpQrPayload,
	signTreatmentPlanWithPep,
	type GeneratedDocumentSummary,
	type PatientPrescriptionItem,
} from "../patientCabinet/patientCabinetEngine.js";
import { calculateDentalHealthIndex } from "../patientFriendlyOdontogramEngine.js";

describe("Patient Portal End-to-End Journey — Alexey Voronov Full Lifecycle", () => {
	const data = { ...PATIENT_CABINET_PRESET_ALEXEY };
	const summary = calculateCabinetSummary(data);
	const healthIndex = calculateDentalHealthIndex(data.teeth || []);
	const dentalPassport = generatePatientDentalPassport(data);
	const taxDeduction = calculatePatientTaxDeduction(data.invoices || [], 2026);

	const samplePrescription: PatientPrescriptionItem = {
		id: "rx-journey-01",
		medicationName: "Амоксиклав (Амоксициллин + Клавулановая кислота)",
		dosageRu: "Таблетки диспергируемые 875 мг + 125 мг",
		instructionRu: "По 1 таблетке 2 раза в сутки каждые 12 часов во время еды. Курс 5 дней.",
		durationRu: "5 дней",
		validityDays: 15,
		dateIso: "2026-08-25",
		doctorName: "Д-р Смирнов А. В.",
		status: "active",
	};

	const sample043Extract: GeneratedDocumentSummary = {
		id: "doc-extract-043-journey",
		kind: "medical_card_extract_043",
		title: "Официальная выписка из медицинской карты 043/у",
		documentNumber: "ВЫП-043/2026-8842",
		status: "issued",
		dateIso: "2026-08-20",
		sha256: "4b82d091e9821a8c9b3e1029348ab12e09847120394850192837461524354657",
	};

	it("1. Overview Tab: Loads visit summary & verifies dynamic calendar export", () => {
		const html = renderToStaticMarkup(
			createElement(OverviewTab, {
				data,
				summary,
				healthIndex,
				nextApptCountdown: "Через 4 дня",
				onOpenTab: () => {},
				onOpenReceptionQr: () => {},
				onOpenCareMemo: () => {},
				onOpenSbpForInvoice: () => {},
				onOpenSelfCheckin: () => {},
				onOpenBooking: () => {},
				onOpenReschedule: () => {},
			}),
		);

		// Visit details
		assert.ok(html.includes("pc-next-appointment-card"), "Renders next visit card");
		assert.ok(html.includes(summary.nextAppointment?.doctorName || "Смирнов"), "Displays doctor name");
		assert.ok(html.includes("btn-reschedule-appointment"), "Renders reschedule appointment button");
		assert.ok(html.includes("btn-yandex-maps"), "Renders Yandex Maps direct navigation link");
		assert.ok(html.includes("next-appt-qr-btn"), "Renders QR entry button for clinic reception");

		// Dynamic Calendar Export Buttons
		assert.ok(html.includes('data-testid="next-appt-apple-cal-btn"'), "Renders Apple iCal export button");
		assert.ok(html.includes('data-testid="next-appt-google-cal-btn"'), "Renders Google Calendar export button");
		assert.ok(html.includes('data-testid="next-appt-yandex-cal-btn"'), "Renders Yandex Calendar export button");

		// Mathematical verification of dynamic dates
		const calDates = getAppointmentCalendarDates(summary.nextAppointment?.dateIso, summary.nextAppointment?.timeRu);
		assert.ok(!calDates.startCompact.includes("undefined"), "Dynamic start date is defined");
		assert.ok(!calDates.endCompact.includes("undefined"), "Dynamic end date is defined");
		assert.equal(calDates.startCompact.includes("20260901T113000Z"), false, "Eliminates old hardcoded static string");
	});

	it("2. Appointments Tab: Clinical schedule & non-blocking cancellation drawer", () => {
		const html = renderToStaticMarkup(
			createElement(AppointmentsTab, {
				data,
				onOpenReceptionQr: () => {},
				onOpenReschedule: () => {},
				onOpenBooking: () => {},
				onCancelAppointment: () => {},
				onShowToast: () => {},
			}),
		);

		assert.ok(html.includes("pc-appointments-tab"), "Renders appointments tab container");
		assert.ok(html.includes("Предстоящие") || html.includes("Записаться на приём"), "Contains appointments filter tabs or booking action");
		assert.ok(html.includes("Подтверждён") || html.includes("Запланирован"), "Displays status badge");
		assert.ok(html.includes("Перенести приём"), "Provides non-blocking reschedule trigger");
		assert.ok(html.includes("yandex.ru/maps") || html.includes("Карта"), "Provides navigation link");

		// Non-blocking autonomy verification
		assert.equal(
			html.includes("window.confirm") || html.includes("window.prompt"),
			false,
			"Zero blocking browser dialogs",
		);
	});

	it("3. Family Tab: Shared 84 000 ₽ balance & multi-member bonus pool", () => {
		const html = renderToStaticMarkup(
			createElement(FamilyTab, {
				data,
				onOpenBookingForMember: () => {},
				onOpenBooking: () => {},
				onShowToast: () => {},
			}),
		);

		assert.ok(html.includes("pc-family-tab"), "Renders family tab container");
		assert.ok(html.includes("Семейный депозит и бонусный пул"), "Renders family ledger banner");
		assert.ok(/84[\s\u00A0]000/.test(html), "Displays exact 84 000 ₽ shared family balance");
		assert.ok(/18[\s\u00A0]500/.test(html), "Displays exact 18 500 ₽ family bonus pool");
		assert.ok(html.includes("Воронова Екатерина Павловна"), "Renders spouse family member card");
		assert.ok(html.includes("Воронов Михаил Алексеевич"), "Renders child family member card");
		assert.ok(html.includes("Оплата с общего счета"), "Renders balance spending permission toggle");
	});

	it("4. Treatment Plan Tab: FDI 11..48 formula, 63-FZ PEP approval & clinical scans", () => {
		let approvedPlanPayload: any = null;

		const html = renderToStaticMarkup(
			createElement(TreatmentPlanTab, {
				data,
				dentalPassport,
				onPayStageWithSbp: () => {},
				onBookAppointment: () => {},
				onApproveTreatmentPlan: (plan) => {
					approvedPlanPayload = plan;
				},
				onOpenClinicalScans: () => {},
				isClinicalScansOpen: false,
			}),
		);

		// Dental formula FDI 11..48
		assert.ok(html.includes("pc-formula-card") || html.includes("pc-treatment-formula-section"), "Renders dental formula container");
		assert.ok(html.includes("plan-tooth-11") && html.includes("plan-tooth-48"), "Renders FDI 11..48 teeth elements");

		// 3-Tier Model Comparison
		assert.ok(html.includes("Базовый") || html.includes("Оптимум") || html.includes("Премиум") || html.includes("Эконом"), "Renders 3-tier comparative plans");

		// PEP 63-FZ Approval
		assert.ok(html.includes("approve-treatment-plan-btn") || html.includes("btn-approve-treatment-plan"), "Renders 1-click treatment plan approval button");
		const signedPlan = signTreatmentPlanWithPep(data.treatmentPlans[0]!, "+7 (999) 123-45-67", "123456", data.fullName);
		assert.equal(signedPlan.approvedByPatient, true, "Plan is marked approved");
		assert.ok(signedPlan.approvedAtIso, "Signature contains ISO timestamp");

		// Printable estimate HTML
		const estimateHtml = generateTreatmentPlanEstimateHtml(signedPlan, data);
		assert.ok(estimateHtml.includes("Смета к плану лечения") || estimateHtml.includes("СМЕТА УСЛУГ"), "Generates formal estimate title");
		assert.ok(estimateHtml.includes("63-ФЗ"), "Estimate mentions 63-FZ PEP statutory basis");

		// Clinical scans viewer trigger
		assert.ok(html.includes('data-testid="open-clinical-scans-btn"'), "Renders clinical scans viewer button");
		assert.ok(html.includes("Снимки КТ / ОПТГ и фотопротокол"), "Clinical scans button has informative label");
	});

	it("5. Invoices Tab: SBP QR payment with exact kopecks & completed works act", () => {
		const html = renderToStaticMarkup(
			createElement(InvoicesTab, {
				data,
				onOpenSbpForInvoice: () => {},
				onShowToast: () => {},
			}),
		);

		const unpaidInv = data.invoices.find((i) => i.status === "unpaid")!;
		const paidInv = data.invoices.find((i) => i.status === "paid")!;

		// Unpaid invoice SBP checkout
		assert.ok(html.includes(`pay-sbp-btn-${unpaidInv.id}`), "Renders 1-click SBP button for unpaid invoice");
		const sbpPayload = generateSbpQrPayload(unpaidInv, { legalName: "Стоматология ДЕНТЕ", inn: "7701234567" });
		assert.ok(sbpPayload.sbpNspkPayloadString.startsWith("https://qr.nspk.ru/"), "Generates valid NSPK SBP URL");
		assert.ok(sbpPayload.sbpNspkPayloadString.includes(`sum=${Math.round(unpaidInv.remainingAmountRub * 100)}`), "Enforces integer kopecks");

		// Paid invoice 54-FZ receipt & Act of completed works
		assert.ok(html.includes(`download-receipt-btn-${paidInv.id}`), "Renders 54-FZ receipt button");
		assert.ok(html.includes(`fns-check-link-${paidInv.id}`), "Renders FNS QR receipt link");
		assert.ok(html.includes(`print-act-btn-${paidInv.id}`), "Renders Act of completed works button");

		// Act polygraphic HTML generation
		const actHtml = generateCompletedWorksActHtml(paidInv, data);
		assert.ok(actHtml.includes("АКТ ВЫПОЛНЕННЫХ РАБОТ"), "Includes Act title");
		assert.ok(actHtml.includes("54-ФЗ"), "Includes 54-FZ fiscal reference");
		assert.ok(actHtml.includes("Заказчик (Пациент) подтверждает приемку"), "Includes patient acceptance statement");
	});

	it("6. Documents Tab: 1-click print of 043/u extract, KND 1151156 & 107-1/u prescription", () => {
		const enrichedData = {
			...data,
			documents: [sample043Extract],
			prescriptions: [samplePrescription],
		};

		const html = renderToStaticMarkup(
			createElement(DocumentsTab, {
				data: enrichedData,
				selectedTaxYear: 2026,
				onSelectTaxYear: () => {},
				taxDeductionCalc: taxDeduction,
				onStartConsentSigning: () => {},
				onOpenTaxCertificateSheet: () => {},
				onDownloadTaxCertificateDirect: () => {},
				onShowToast: () => {},
			}),
		);

		// 1-Click Form 043/u print
		assert.ok(html.includes('data-testid="print-extract-043-btn"'), "Renders 043/u extract print button");
		const extractHtml = generateExtract043Html(sample043Extract, enrichedData);
		assert.ok(extractHtml.includes("Форма № 043/у"), "Contains official 043/u header");
		assert.ok(extractHtml.includes("К02.1") || extractHtml.includes("Кариес"), "Contains ICD-10 diagnosis");

		// 1-Click Tax Certificate KND 1151156
		assert.ok(html.includes("pc-tax-deduction-widget") || html.includes("documents-tax-deduction-widget"), "Renders tax deduction summary widget");
		const taxCertHtml = generatePatientTaxCertificate1151156(enrichedData, 2026);
		assert.ok(taxCertHtml.includes("1151156"), "Mentions KND 1151156");
		assert.ok(taxCertHtml.includes("Код 1") || taxCertHtml.includes("Код 2"), "Includes service codes 1 / 2");

		// 1-Click Prescription Form 107-1/u print
		assert.ok(html.includes(`print-prescription-btn-${samplePrescription.id}`), "Renders 107-1/u prescription print button");
		const rxHtml = generatePrescription107PrintHtml(samplePrescription, enrichedData);
		assert.ok(rxHtml.includes("Форма № 107-1/у"), "Contains Form 107-1/u title");
		assert.ok(rxHtml.includes("Rp.:") || rxHtml.includes("Rp."), "Contains Latin recipe Rp.");
		assert.ok(rxHtml.includes("Signa"), "Contains dosage instructions Signa");
	});

	it("7. Full Modal Orchestration & Mandates 8e, 8d pt 7, 8d pt 6, 8s Audit", () => {
		const tabs = ["overview", "appointments", "family", "plans", "invoices", "documents"] as const;

		for (const tab of tabs) {
			const modalHtml = renderToStaticMarkup(
				createElement(PatientCabinetModal, {
					isOpen: true,
					onClose: () => {},
					initialData: data,
					initialTab: tab,
				}),
			);

			// Mandate 8e: Zero disabled buttons
			const hasDisabledButton =
				modalHtml.includes("<button disabled") ||
				modalHtml.includes('disabled=""') ||
				modalHtml.includes("<button disabled>");
			assert.equal(
				hasDisabledButton,
				false,
				`Tab '${tab}' in PatientCabinetModal must contain zero disabled buttons`,
			);

			// Mandate 8d pt 7: Zero cartoon emojis
			const emojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(
				emojiRegex.test(modalHtml),
				false,
				`Tab '${tab}' in PatientCabinetModal contains 0 raw unicode cartoon emojis`,
			);

			// Mandate 8d pt 6: Anti-Matryoshka Law (modal depth strictly 1)
			assert.equal(
				modalHtml.split('class="selfcheckin-modal-backdrop"').length - 1 <= 1,
				true,
				"Zero nested modal dialogs",
			);
		}
	});
});

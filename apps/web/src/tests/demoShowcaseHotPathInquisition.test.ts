import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	isDemoShowcaseMode,
	isDemoMode,
	setRuntimeDemoMode,
	isDemoTenant,
	isDemoPatientId,
	isDemoStudyInstanceUid,
	getDemoShowcasePatients,
	getDemoShowcaseStaff,
	getDemoShowcaseAppointments,
	getDemoDashboardAnalytics,
	getDemoExecutiveAnalytics,
	DEMO_SHOWCASE_ORG_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_ADMIN_ID,
	DEMO_CHAIR_1_ID,
	DEMO_CHAIR_2_ID,
	DEMO_CHAIR_3_ID,
	simulateDemoAppointmentStatusChange,
	simulateDemoToothClick,
	simulateDemoAddServiceToEstimate,
	switchDemoRole,
	getDemoRoleClinicalDetails,
	generateDemoDiplomaForBravery,
} from "../utils/demoModeEngine.js";
import { DEMO_ROLES } from "../components/auth/DemoTourSelector.js";
import { DemoModeBanner } from "../components/demo/DemoModeBanner.js";
import { createOfflineFallbackDashboard } from "../lib/offlineStorage.js";
import { getFilteredAppViews, getFallbackAppView } from "../utils/routeUtils.js";
import {
	CLINICAL_STANDARD_PRICE_CATALOG,
	completeClinicalVisitAndAssembleEstimate,
	extractProceduresFromDiary,
} from "../components/visit/clinicalVisitWorkflow.js";
import { CLINICAL_SOAP_PRESETS } from "../components/visit/clinicalSoapPresets.js";
import { generateSoapFromOdontogramStates } from "../lib/clinicalProtocols043.js";

describe("DEMO SHOWCASE & LIVE DOCTOR HOT-PATH INQUISITOR (8c, 8e, 8n, 8y)", () => {
	it("1. SSOT TYPE-SAFETY: guards against non-string inputs with zero TypeErrors", () => {
		// Non-string arguments must never throw TypeError: toLowerCase is not a function
		assert.equal(isDemoTenant(undefined), false);
		assert.equal(isDemoTenant(null), false);
		assert.equal(isDemoTenant({} as unknown as string), false);
		assert.equal(isDemoTenant(12345 as unknown as string), false);
		assert.equal(isDemoTenant([] as unknown as string), false);

		assert.equal(isDemoPatientId(undefined), false);
		assert.equal(isDemoPatientId(null), false);
		assert.equal(isDemoPatientId({ id: "patient" } as unknown as string), false);
		assert.equal(isDemoPatientId(9999 as unknown as string), false);

		assert.equal(isDemoStudyInstanceUid(undefined), false);
		assert.equal(isDemoStudyInstanceUid(null), false);
		assert.equal(isDemoStudyInstanceUid({ uid: "123" } as unknown as string), false);

		// Valid demo IDs must evaluate correctly
		assert.equal(isDemoTenant(DEMO_SHOWCASE_ORG_ID), true);
		assert.equal(isDemoTenant("demo-clinic-77"), true);
		assert.equal(isDemoTenant("SAMPLE_CLINIC"), true);

		assert.equal(isDemoPatientId("01a00000-0000-0000-0000-000000000001"), true);
		assert.equal(isDemoPatientId("demo_patient_1"), true);
		assert.equal(isDemoPatientId("pat-8899"), true);
		assert.equal(isDemoPatientId("real_patient_uuid_55"), false);
	});

	it("2. 6 CLINICAL DEMO ROLES: provides accurate roles, target views, and active patients", () => {
		assert.equal(DEMO_ROLES.length, 6, "Must contain exactly 6 clinical and operational roles for showcase");

		const roleMap = new Map(DEMO_ROLES.map((r) => [r.id, r]));

		// 1. Therapist
		const therapist = roleMap.get("therapist");
		assert.ok(therapist, "Therapist role must exist");
		assert.equal(therapist.role, "doctor");
		assert.equal(therapist.doctorName, "Д-р Соколов А. В.");
		assert.equal(therapist.targetView, "patients");
		assert.equal(therapist.targetPatientId, "01a00000-0000-0000-0000-000000000001");
		assert.equal(therapist.staffId, DEMO_DOCTOR_1_ID);

		// 2. Orthopedist
		const orthopedist = roleMap.get("orthopedist");
		assert.ok(orthopedist, "Orthopedist role must exist");
		assert.equal(orthopedist.role, "doctor");
		assert.equal(orthopedist.doctorName, "Д-р Орлов А. В.");
		assert.equal(orthopedist.targetView, "patients");
		assert.equal(orthopedist.targetPatientId, "01a00000-0000-0000-0000-000000000002");
		assert.equal(orthopedist.staffId, DEMO_DOCTOR_ORTHOPEDIST_ID);

		// 3. Orthodontist
		const orthodontist = roleMap.get("orthodontist");
		assert.ok(orthodontist, "Orthodontist role must exist");
		assert.equal(orthodontist.role, "doctor");
		assert.equal(orthodontist.doctorName, "Д-р Морозова Е. И.");
		assert.equal(orthodontist.targetView, "patients");
		assert.equal(orthodontist.targetPatientId, "01a00000-0000-0000-0000-000000000003");
		assert.equal(orthodontist.staffId, DEMO_DOCTOR_2_ID);

		// 4. Surgeon-implantologist
		const surgeon = roleMap.get("surgeon");
		assert.ok(surgeon, "Surgeon role must exist");
		assert.equal(surgeon.role, "doctor");
		assert.equal(surgeon.doctorName, "Д-р Громов К. Д.");
		assert.equal(surgeon.targetView, "patients");
		assert.equal(surgeon.targetPatientId, "01a00000-0000-0000-0000-000000000004");
		assert.equal(surgeon.staffId, DEMO_DOCTOR_SURGEON_ID);

		// 5. Owner / Chief Doctor
		const owner = roleMap.get("owner");
		assert.ok(owner, "Owner role must exist");
		assert.equal(owner.role, "owner");
		assert.equal(owner.doctorName, "Д-р Воронов М. С.");
		assert.equal(owner.targetView, "analytics");
		assert.equal(owner.staffId, DEMO_OWNER_ID);

		// 6. Senior Administrator
		const admin = roleMap.get("admin");
		assert.ok(admin, "Admin role must exist");
		assert.equal(admin.role, "administrator", "Role must be canonical 'administrator', NOT legacy 'admin'");
		assert.equal(admin.doctorName, "Смирнова А. П.");
		assert.equal(admin.targetView, "schedule");
		assert.equal(admin.staffId, DEMO_ADMIN_ID);
	});

	it("3. ROUTING COHESION: administrator role routes to schedule without falling into clinical shift queue", () => {
		const adminViews = getFilteredAppViews("administrator");
		assert.ok(adminViews.includes("schedule"), "Administrator must have access to schedule");
		assert.ok(adminViews.includes("patients"), "Administrator must have access to patients");
		assert.ok(adminViews.includes("finance"), "Administrator must have access to finance");
		assert.ok(!adminViews.includes("shift"), "Administrator must not be forced into doctor clinical shift queue");

		const fallbackView = getFallbackAppView("administrator");
		assert.equal(fallbackView, "schedule", "Administrator fallback view must be 'schedule'");
	});

	it("4. DEMO SHOWCASE STAFF ROSTER: guarantees 100% staff and appointment doctor references exist", () => {
		const staff = getDemoShowcaseStaff();
		assert.equal(staff.length, 6, "Must return 6 showcase staff members");

		const staffIds = new Set(staff.map((s) => s.id));
		assert.ok(staffIds.has(DEMO_DOCTOR_1_ID));
		assert.ok(staffIds.has(DEMO_DOCTOR_ORTHOPEDIST_ID));
		assert.ok(staffIds.has(DEMO_DOCTOR_2_ID));
		assert.ok(staffIds.has(DEMO_DOCTOR_SURGEON_ID));
		assert.ok(staffIds.has(DEMO_OWNER_ID));
		assert.ok(staffIds.has(DEMO_ADMIN_ID));

		for (const member of staff) {
			assert.ok(member.fullName && member.fullName.length > 0);
			assert.ok(member.role);
			assert.ok(member.specialization && member.specialization.length > 0);
			assert.equal(member.active, true);
		}

		// Verify every showcase appointment maps to an existing staff doctor
		const appointments = getDemoShowcaseAppointments();
		assert.ok(appointments.length >= 4, "Must have dense schedule with at least 4 appointments");
		for (const apt of appointments) {
			assert.ok(
				apt.doctorUserId && staffIds.has(apt.doctorUserId),
				`Appointment ${apt.id} doctorUserId ${apt.doctorUserId} must exist in showcase staff`,
			);
		}
	});

	it("5. ORTHODONTIC PATIENT PROGRESS: Patient 3 contains valid structured aligner progress JSON", () => {
		const patients = getDemoShowcasePatients();
		const patient3 = patients.find((p) => p.id === "01a00000-0000-0000-0000-000000000003");
		assert.ok(patient3, "Patient 3 (Ковалева Е. П.) must exist");

		const adminProfile = patient3.administrativeProfile as {
			orthodonticProgress?: string | null;
			loyaltyTier?: string;
		} | null;
		assert.ok(adminProfile, "Administrative profile must not be null");
		assert.ok(adminProfile.orthodonticProgress, "orthodonticProgress must be present");

		const parsedOrtho = JSON.parse(adminProfile.orthodonticProgress as string);
		assert.equal(parsedOrtho.currentAligner, 8, "Current aligner must be 8");
		assert.equal(parsedOrtho.totalAligners, 24, "Total aligners must be 24");
		assert.equal(parsedOrtho.startDate, "2026-01-15");
	});

	it("6. OFFLINE STORAGE DEMO COHESION: createOfflineFallbackDashboard hydrates full showcase in demo mode", () => {
		setRuntimeDemoMode(true);
		const demoDashboard = createOfflineFallbackDashboard();

		assert.equal(demoDashboard.clinicSettings?.staff?.length, 6, "Staff must have all 6 demo staff members");
		assert.ok(demoDashboard.appointments?.length >= 4, "Appointments must be seeded with showcase grid");
		assert.ok(demoDashboard.patients?.length >= 4, "Patients must be seeded with showcase roster");

		const doctorNames = demoDashboard.clinicSettings?.staff?.map((s) => s.fullName);
		assert.ok(doctorNames.includes("Д-р Соколов А. В."));
		assert.ok(doctorNames.includes("Д-р Орлов А. В."));
		assert.ok(doctorNames.includes("Д-р Морозова Е. И."));
		assert.ok(doctorNames.includes("Д-р Громов К. Д."));
		assert.ok(doctorNames.includes("Д-р Воронов М. С."));
		assert.ok(doctorNames.includes("Смирнова А. П."));

		setRuntimeDemoMode(null);
	});

	it("7. DOCTOR CLINICAL HOT-PATH WORKFLOW: tooth 16 caries -> SOAP diary -> 043/u -> 54-FZ billing", () => {
		// 1. Verify Caries SOAP preset exists
		const cariesSoapPreset = CLINICAL_SOAP_PRESETS.find((p) => p.id === "caries_medium");
		assert.ok(cariesSoapPreset, "caries_medium SOAP preset must exist for 1-click clinical workflow");
		assert.equal(cariesSoapPreset.icd10, "K02.1", "Must have correct ICD-10 diagnosis");
		assert.equal(cariesSoapPreset.defaultTooth, 16, "Must target tooth 16");

		// 2. Generate canonical SOAP from odontogram state (tooth 16 caries)
		const generatedSoap = generateSoapFromOdontogramStates([
			{
				toothNumber: 16,
				state: "caries",
				surfaces: ["O", "M"],
				notes: "Кариес дентина 16",
			},
		]);

		assert.ok(generatedSoap.diagnosisTooth?.includes("16"), "SOAP must specify tooth 16");
		assert.ok(generatedSoap.statusLocalis?.includes("16"), "Status localis must specify tooth 16");
		assert.ok(generatedSoap.treatmentDescription?.includes("16"), "Treatment description must mention 16");

		// 3. Complete visit and assemble estimate from diary
		const completionResult = completeClinicalVisitAndAssembleEstimate({
			visitId: "01a00000-0000-0000-0001-000000000001",
			patientId: "01a00000-0000-0000-0000-000000000001",
			patientName: "Смирнова Анна Сергеевна",
			doctorName: "Д-р Соколов А. В.",
			diary: {
				anamnesis: "Кариес зуба 16",
				statusLocalis: generatedSoap.statusLocalis || "Кариозная полость 16",
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "16",
				treatmentDescription:
					"Анестезия инфильтрационная Артикаин 1:200 000 1.7 мл, коффердам, препарирование полости, пломба световой композит",
			},
		});

		assert.equal(
			completionResult.status,
			"ready_for_payment",
			"Doctor completion must transition status to 'ready_for_payment' for Cashbox 54-FZ handoff",
		);
		assert.ok(completionResult.items.length > 0, "Estimate must have items");
		assert.ok(completionResult.totalNetRub > 0, "Total net sum in rubles must be calculated");
		assert.equal(completionResult.form043uSaved, true, "Form 043/u must be marked saved");
		assert.ok(completionResult.receiptNumber.includes("ЧЕК-"), "Must generate 54-FZ receipt number");

		const compositeItem = completionResult.items.find(
			(i) => i.code === "A16.07.002" || i.id.includes("caries"),
		);
		assert.ok(compositeItem, "Estimate must contain composite filling service for 54-FZ receipt");

		// 4. Verify catalog pricing and integrity
		const catalogCaries = CLINICAL_STANDARD_PRICE_CATALOG.caries_composite;
		assert.ok(catalogCaries, "Catalog must contain standard composite restoration");
		assert.ok(catalogCaries.priceRub > 0, "Price must be positive");
	});

	it("8. CONVERSION BANNER: renders «Ознакомительный режим: [Создать свою клинику бесплатно]»", () => {
		// Production mode: banner renders nothing
		setRuntimeDemoMode(false);
		const htmlProd = renderToStaticMarkup(React.createElement(DemoModeBanner, {}));
		assert.equal(htmlProd, "", "DemoModeBanner must render null in production");

		// Demo mode: banner renders conversion CTA and exit button
		setRuntimeDemoMode(true);
		let registeredClicked = false;
		let exitClicked = false;

		const bannerElement = React.createElement(DemoModeBanner, {
			onRegisterClinic: () => {
				registeredClicked = true;
			},
			onExitDemo: () => {
				exitClicked = true;
			},
		});

		const htmlDemo = renderToStaticMarkup(bannerElement);
		assert.ok(htmlDemo.includes('data-testid="demo-mode-banner"'), "Banner must have testid 'demo-mode-banner'");
		assert.ok(
			htmlDemo.includes('data-testid="create-clinic-free-btn"'),
			"Banner must contain CTA 'create-clinic-free-btn'",
		);
		assert.ok(
			htmlDemo.includes("Создать свою клинику бесплатно"),
			"Banner CTA button must have text 'Создать свою клинику бесплатно'",
		);
		assert.ok(htmlDemo.includes('data-testid="exit-demo-button"'), "Banner must contain 'exit-demo-button'");
		assert.ok(htmlDemo.includes("Ознакомительный режим:"), "Banner text must indicate 'Ознакомительный режим:'");

		setRuntimeDemoMode(null);
	});

	it("9. EXECUTIVE ANALYTICS: calibrated 2.45M ₽ revenue, 78% occupancy, 6 200 ₽ check & piecewise payrolls", () => {
		const analytics = getDemoDashboardAnalytics();
		assert.equal(analytics.kpis.totalRevenue, 2450000, "Revenue must be calibrated to 2.45M ₽");
		assert.equal(analytics.kpis.chairOccupancyRatePercent, 78, "Occupancy must be calibrated to 78%");
		assert.equal(analytics.kpis.averageCheck, 6200, "Average check must be 6 200 ₽");
		assert.ok(analytics.doctorProfitabilityJson.length >= 4, "Must track metrics for at least 4 doctors");

		// Verify individual doctor share percentages
		const therapistMetrics = analytics.doctorProfitabilityJson.find((d) => d.name.includes("Соколов"));
		assert.ok(therapistMetrics, "Therapist metrics must be present");
		assert.equal(therapistMetrics.revenue, 860000);
		assert.equal(therapistMetrics.doctorPayrollRub, 215000); // 25%

		const orthopedistMetrics = analytics.doctorProfitabilityJson.find((d) => d.name.includes("Орлов"));
		assert.ok(orthopedistMetrics, "Orthopedist metrics must be present");
		assert.equal(orthopedistMetrics.revenue, 750000);
		assert.equal(orthopedistMetrics.doctorPayrollRub, 150000); // 20%

		const surgeonMetrics = analytics.doctorProfitabilityJson.find((d) => d.name.includes("Громов"));
		assert.ok(surgeonMetrics, "Surgeon metrics must be present");
		assert.equal(surgeonMetrics.revenue, 420000);
		assert.equal(surgeonMetrics.doctorPayrollRub, 92400); // 22%

		const orthodontistMetrics = analytics.doctorProfitabilityJson.find((d) => d.name.includes("Морозова"));
		assert.ok(orthodontistMetrics, "Orthodontist metrics must be present");
		assert.equal(orthodontistMetrics.revenue, 300000);
		assert.equal(orthodontistMetrics.doctorPayrollRub, 66000); // 22%
	});

	it("10. INTERACTIVE CLINICAL SIMULATOR: zero-dead-ends status changes, tooth clicks, estimate add & diploma", () => {
		// 1. Appointment status mutation simulation
		const appointments = getDemoShowcaseAppointments();
		const targetApt = appointments[0]!;
		const initialStatus = targetApt.status;
		const nextStatus = initialStatus === "completed" ? "in_treatment" : "completed";

		const statusChangeResult = simulateDemoAppointmentStatusChange(targetApt.id, nextStatus);
		assert.equal(statusChangeResult.success, true);
		assert.equal(statusChangeResult.appointment?.status, nextStatus);

		// 2. Tooth click simulation
		const patientId = "01a00000-0000-0000-0000-000000000001";
		const updatedOdontogram = simulateDemoToothClick(patientId, 16, {
			state: "filling",
			titleRu: "Пломба световая композитная",
			clinicalNote: "Пломба установлена успешно в демо-симуляторе",
		});
		const tooth16 = updatedOdontogram.find((t) => t.toothNumber === 16);
		assert.ok(tooth16, "Tooth 16 must exist in odontogram");
		assert.equal(tooth16.state, "filling");
		assert.equal(tooth16.clinicalNote, "Пломба установлена успешно в демо-симуляторе");

		// 3. Estimate item addition simulation
		const updatedEstimate = simulateDemoAddServiceToEstimate(patientId, {
			code: "A16.07.051",
			name: "Профессиональная гигиена Air-Flow",
			quantity: 1,
			unitPriceRub: 4500,
			discountRub: 0,
			totalRub: 4500,
		});
		assert.ok(updatedEstimate.totalGrossRub >= 4500);
		assert.ok(updatedEstimate.items.some((i) => i.code === "A16.07.051"));

		// 4. Role switching
		const switchResult = switchDemoRole("orthopedist");
		assert.equal(switchResult.success, true);
		assert.equal(switchResult.profile?.role, "doctor");
		assert.equal(switchResult.profile?.doctorName, "Д-р Орлов А. В.");

		// 5. Clinical details retrieval for all roles
		const roles = ["therapist", "orthopedist", "orthodontist", "surgeon", "owner", "admin"];
		for (const roleKey of roles) {
			const details = getDemoRoleClinicalDetails(roleKey);
			assert.ok(details.profile, `Details profile for ${roleKey} must exist`);
			assert.ok(details.braveryDiploma, `Bravery diploma for ${roleKey} must generate cleanly`);
		}

		// 6. Bravery diploma generation
		const diploma = generateDemoDiplomaForBravery("Иванов Петя (7 лет)");
		assert.equal(diploma.patientName, "Иванов Петя (7 лет)");
		assert.ok(diploma.diplomaNumber.includes("ДИПЛОМ"));
		assert.ok(diploma.awardReasonRu.includes("мужество"));
	});
});

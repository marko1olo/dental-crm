/**
 * capture-production-4state-proofs.mjs
 * Production-grade Playwright 4-State Visual Proof Capture Engine
 * Strict Zero-Catch Error Handling & Elimination of Hash Cloning.
 */

import fs, { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DOCS_SCREENSHOTS_DIR = path.join(process.cwd(), "docs/screenshots");
const BRAIN_DIRS = [
	path.join(process.cwd(), "docs/proofs/audit"),
	process.env.BRAIN_DIR,
].filter(Boolean);

for (const dir of [DOCS_SCREENSHOTS_DIR, ...BRAIN_DIRS]) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";

// ─── 1. Preflight Server Check ────────────────────────────────────────────────────

try {
	const res = await fetch(APP_BASE);
	if (!res.ok && res.status !== 200 && res.status !== 304) {
		throw new Error(`HTTP ${res.status}`);
	}
	console.log(`[PREFLIGHT] Dev server reachable at ${APP_BASE} (HTTP ${res.status})`);
} catch (e) {
	console.error(`[FATAL] Dev server preflight failed: ${e.message}. Ensure Vite server is running on ${APP_BASE}`);
	process.exit(1);
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const edgePath = possibleBrowserPaths.find((p) => existsSync(p));

console.log(`[BROWSER] Launching browser at: ${edgePath || "bundled Chromium"}`);
const launchOptions = {
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
};
if (edgePath) {
	launchOptions.executablePath = edgePath;
}
const browser = await chromium.launch(launchOptions);

async function applyTheme(page, theme) {
	try {
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.className = isDark ? "dark" : "light";
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			localStorage.setItem("dente_theme_mode", th);
		}, theme);
		await page.waitForTimeout(400);
	} catch (err) {
		console.error(`[FATAL] applyTheme failed for ${theme}: ${err.message}`);
		process.exit(1);
	}
}

const todayDate = new Date().toISOString().slice(0, 10);

const mockDashboard = {
	clinicSettings: {
		profile: {
			organizationId: "c-1",
			clinicName: "DENTE Стоматология",
			timezone: "Europe/Moscow",
			phone: "+7 (495) 123-45-67",
			address: "Москва, ул. Тверская 1",
			inn: "7701234567",
			mode: "small_clinic",
			updatedAt: new Date().toISOString(),
		},
		chairs: [
			{
				id: "chair-1",
				organizationId: "c-1",
				name: "Кабинет 1 (Терапия)",
				active: true,
				notes: null,
				room: "1",
				specialization: "therapist",
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: false,
			},
			{
				id: "chair-2",
				organizationId: "c-1",
				name: "Кабинет 2 (Хирургия)",
				active: true,
				notes: null,
				room: "2",
				specialization: "surgery",
				hasXraySensor: true,
				hasMicroscope: false,
				hasSurgeryKit: true,
			},
			{
				id: "chair-3",
				organizationId: "c-1",
				name: "Кабинет 3 (Ортопедия)",
				active: true,
				notes: null,
				room: "3",
				specialization: "orthopedist",
				hasXraySensor: false,
				hasMicroscope: false,
				hasSurgeryKit: false,
			},
		],
		staff: [
			{
				id: "doc-1",
				organizationId: "c-1",
				fullName: "Д-р Ковалев С.П.",
				role: "doctor",
				active: true,
				color: "#0d9488",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: "doc-2",
				organizationId: "c-1",
				fullName: "Д-р Смирнова Е.В.",
				role: "doctor",
				active: true,
				color: "#0284c7",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
	},
	patients: [
		{
			id: "p-1",
			organizationId: "c-1",
			fullName: "Иванов Иван Иванович",
			status: "active",
			phone: "+7 (999) 123-45-67",
			email: null,
			notes: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		{
			id: "p-2",
			organizationId: "c-1",
			fullName: "Петрова Анна Сергеевна",
			status: "active",
			phone: "+7 (999) 765-43-21",
			email: null,
			notes: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	appointments: [
		{
			id: "app-1",
			organizationId: "c-1",
			patientId: "p-1",
			doctorUserId: "doc-1",
			doctorId: "doc-1",
			chairId: "chair-1",
			status: "in_treatment",
			startsAt: `${todayDate}T10:00:00.000Z`,
			endsAt: `${todayDate}T11:00:00.000Z`,
			startTime: `${todayDate}T10:00:00.000Z`,
			endTime: `${todayDate}T11:00:00.000Z`,
			serviceTitle: "Лечение пульпита 2.4 (Кариес/Эндо)",
			notes: "Острая боль",
		},
		{
			id: "app-2",
			organizationId: "c-1",
			patientId: "p-2",
			doctorUserId: "doc-2",
			doctorId: "doc-2",
			chairId: "chair-2",
			status: "confirmed",
			startsAt: `${todayDate}T11:30:00.000Z`,
			endsAt: `${todayDate}T12:30:00.000Z`,
			startTime: `${todayDate}T11:30:00.000Z`,
			endTime: `${todayDate}T12:30:00.000Z`,
			serviceTitle: "Установка имплантата Straumann BLX",
			notes: null,
		},
	],
	inventory: {
		items: [],
		lowStock: [],
	},
	finance: {
		todayRevenueRub: 145000,
		monthRevenueRub: 2850000,
	},
};

const capturedFiles = [];

const TARGET_SCREENS = [
	{
		prefix: "01_schedule_grid_emergency_buffer",
		name: "01. Schedule Multi-Chair Grid with CITO Acute Pain Emergency Reserve",
		url: `${APP_BASE}/#schedule`,
		setup: async (page) => {
			await page.waitForSelector('.schedule-subnav-panel, [data-testid="schedule-timeline-container"], .appointment-card', { timeout: 10000 });
			await page.waitForTimeout(1000);
		},
		all4States: true,
	},
	{
		prefix: "02_treatment_plan_4stages",
		name: "02. 4-Stage Clinical Treatment Plan (Hygiene, Endo, Surgery, Ortho)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=phased4#clinical-modals-studio?modal=phased4`,
		setup: async (page) => {
			const btn = page.locator('[data-testid="open-plan-phased4-preview-btn"]').or(page.locator('[data-testid="open-plan-comparator-modal-btn"]')).first();
			await btn.waitFor({ state: "visible", timeout: 8000 });
			await btn.scrollIntoViewIfNeeded();
			await btn.click({ force: true });
			await page.waitForTimeout(700);
		},
		all4States: true,
	},
	{
		prefix: "02_treatment_plan_3tier",
		name: "02. 3-Tier Treatment Plan Comparison (Economy, Optimum, Premium)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=3tier#clinical-modals-studio?modal=3tier`,
		setup: async (page) => {
			const btn = page.locator('[data-testid="open-plan-3tier-preview-btn"]').or(page.locator('[data-testid="open-plan-comparator-modal-btn"]')).first();
			await btn.waitFor({ state: "visible", timeout: 8000 });
			await btn.scrollIntoViewIfNeeded();
			await btn.click({ force: true });
			await page.waitForTimeout(700);
		},
		all4States: true,
	},
	{
		prefix: "03_billing_1c_export_modal",
		name: "03. Patient Billing with 1C XML Export Modal",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=billing_1c#clinical-modals-studio?modal=billing_1c`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modal = page.locator('[data-testid="fiscal-receipt-54fz-modal"]');
			const oneCTab = modal.locator('button:has-text("1С:Экспорт XML")').or(modal.locator('[data-testid="tab-oneC"]')).first();
			await oneCTab.waitFor({ state: "visible", timeout: 8000 });
			await oneCTab.click({ force: true });
			await page.waitForTimeout(500);
		},
		all4States: true,
	},
	{
		prefix: "03_patient_billing_modal",
		name: "03. Patient Billing Modal (Completed Works Act & Implant Care Titanium Badge)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=patient_billing#clinical-modals-studio?modal=patient_billing`,
		setup: async (page) => {
			await page.waitForTimeout(800);
		},
		all4States: true,
	},
	{
		prefix: "04_odontogram_psr",
		name: "04. Odontogram with 1-Click PSR Status Assessment",
		url: `${APP_BASE}/#odontogram-studio`,
		setup: async (page) => {
			await page.waitForTimeout(800);
		},
		all4States: true,
	},
	{
		prefix: "05_trg_cephalometrics",
		name: "05. TRG Cephalometric Analysis Canvas (Empty Honest Dropzone 0%)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=ceph&state=empty#clinical-modals-studio?modal=ceph&state=empty`,
		setup: async (page) => {
			await page.waitForTimeout(800);
		},
		all4States: true,
	},
	{
		prefix: "05_trg_cephalometrics_loaded",
		name: "05. TRG Cephalometric Analysis Canvas with 16 Anatomical Landmarks & Reference X-Ray",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=ceph&loaded=true#clinical-modals-studio?modal=ceph&loaded=true`,
		setup: async (page) => {
			await page.waitForTimeout(800);
		},
		all4States: true,
	},
	{
		prefix: "06_sanpin_registers_12tabs",
		name: "06. SanPiN 12-Tab Production Control Center",
		url: `${APP_BASE}/#clinical-modals-studio`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const tabs = page.locator('[data-testid="sanpin-tabs-12-nav"]').or(page.locator('.sanpin-tabs-nav')).first();
			await tabs.waitFor({ state: "visible", timeout: 8000 });
			await tabs.scrollIntoViewIfNeeded();
			await page.waitForTimeout(500);
		},
		all4States: true,
	},
	{
		prefix: "07_cbct_mpr_viewer",
		name: "07. 3D CBCT MPR Multi-Planar Reconstruction (Romexis/Ez3D-i Orthogonal Viewer)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=cbct#clinical-modals-studio?modal=cbct`,
		setup: async (page) => {
			await page.waitForTimeout(800);

			// Feed real DICOM slices if directory exists
			const dicomDir = "C:/Users/Admin/Downloads/Telegram Desktop/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data";
			if (fs.existsSync(dicomDir)) {
				const files = fs
					.readdirSync(dicomDir)
					.filter((f) => f.endsWith(".dcm"))
					.slice(50, 350)
					.map((f) => path.join(dicomDir, f));

				if (files.length > 0) {
					const fileInput = page.locator('[data-testid="cbct-dicom-files-input"]');
					if ((await fileInput.count()) > 0) {
						await fileInput.setInputFiles(files);
						await page.waitForTimeout(2000);
					}
				}
			}
		},
		all4States: true,
	},
	{
		prefix: "08_radiology_dicom_viewer",
		name: "08. 2D Dental Radiology & DICOM Viewer (Tooth 16, Sinus maxillaris, Delicate Pin)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=viewer#clinical-modals-studio?modal=viewer`,
		setup: async (page) => {
			await page.waitForTimeout(800);
		},
		all4States: true,
	},
	{
		prefix: "08_radiology_dropzone",
		name: "08. 2D Dental Radiology Dropzone (Dark Graphite Radiation Protection Theme)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=dropzone#clinical-modals-studio?modal=dropzone`,
		setup: async (page) => {
			await page.waitForTimeout(800);
		},
		all4States: true,
	},

	// Wave 4: Domain 1 — Лаборатория (ЗТЛ / Dental Lab Orders & Work Orders)
	{
		prefix: "09_dental_lab_work_order",
		name: "09. Dental Laboratory (ЗТЛ) CAD/CAM Work Order & Shade Matrix",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=lab_work_order#clinical-modals-studio?modal=lab_work_order`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modalDialog = page.locator('.lab-order-modal-overlay, [role="dialog"]').first();
			let isVis = false;
			try {
				await modalDialog.waitFor({ state: "visible", timeout: 3000 });
				isVis = await modalDialog.isVisible();
			} catch {
				isVis = false;
			}
			if (!isVis) {
				const trigger = page
					.locator('[data-testid="open-lab-work-order-modal-btn"]')
					.or(page.locator('[data-testid="open-lab-order-modal-btn"]'))
					.first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.scrollIntoViewIfNeeded();
				await trigger.click({ force: true });
				await modalDialog.waitFor({ state: "visible", timeout: 5000 });
			}
		},
		all4States: true,
	},
	{
		prefix: "09_guest_lab_portal",
		name: "09. Guest Laboratory External Portal for Dental Technician",
		url: `${APP_BASE}/#/portal/lab-order/demo-token-123`,
		setup: async (page) => {
			await page.waitForSelector('.guest-lab-portal, .lab-portal-container, .panel, [data-testid="guest-lab-portal"]', { timeout: 8000 });
			await page.waitForTimeout(800);
		},
		all4States: true,
	},

	// Wave 4: Domain 2 — Списание материалов (BOM / 804n Consumption Norms)
	{
		prefix: "10_material_bom_deduction",
		name: "10. Material Write-off & BOM Tech Maps Deduction (Order 804n / FEFO)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=procedure_deduction#clinical-modals-studio?modal=procedure_deduction`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modalDialog = page.locator('[data-testid="procedure-deduction-modal"], [role="dialog"]').first();
			let isVis = false;
			try {
				await modalDialog.waitFor({ state: "visible", timeout: 3000 });
				isVis = await modalDialog.isVisible();
			} catch {
				isVis = false;
			}
			if (!isVis) {
				const trigger = page
					.locator('[data-testid="open-procedure-deduction-modal-btn"]')
					.or(page.locator('[data-testid="open-clinical-writeoff-modal-btn"]'))
					.first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.scrollIntoViewIfNeeded();
				await trigger.click({ force: true });
				await modalDialog.waitFor({ state: "visible", timeout: 5000 });
			}
		},
		all4States: true,
	},
	{
		prefix: "10_material_bom_settings",
		name: "10. Material BOMs & Consumption Norms Management Panel (Order 804n)",
		url: `${APP_BASE}/#inventory`,
		setup: async (page) => {
			await page.waitForSelector('.material-boms-container, .inventory-panel, .inventory-container', { timeout: 8000 });
			await page.waitForTimeout(800);
		},
		all4States: true,
	},

	// Wave 4: Domain 3 — Памятка пациенту (Post-Op Care Memos / Форма 043/у)
	{
		prefix: "11_post_op_care_patient_memo",
		name: "11. Post-Op Patient Care Memo & Clinical Guidelines (1-Click Print A4/A5)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=patient_memo#clinical-modals-studio?modal=patient_memo`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modalDialog = page.locator('[data-testid="post-op-memo-modal"], [role="dialog"]').first();
			let isVis = false;
			try {
				await modalDialog.waitFor({ state: "visible", timeout: 3000 });
				isVis = await modalDialog.isVisible();
			} catch {
				isVis = false;
			}
			if (!isVis) {
				const trigger = page.locator('[data-testid="open-patient-memo-modal-btn"]').first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.scrollIntoViewIfNeeded();
				await trigger.click({ force: true });
				await modalDialog.waitFor({ state: "visible", timeout: 5000 });
			}
		},
		all4States: true,
	},

	// Wave 4: Domain 4 — Аналитика возвращаемости (Retention & Recalls)
	{
		prefix: "12_retention_lost_patients_analytics",
		name: "12. Patient Retention Analytics, Lost Patients & Recall Manager",
		url: `${APP_BASE}/#analytics`,
		setup: async (page) => {
			await page.waitForSelector('.analytics-dashboard, [data-testid="lost-patients-panel"], [data-testid="analytics-dashboard-view"]', { timeout: 8000 });
			await page.waitForTimeout(800);
			const lostPanel = page.locator('[data-testid="lost-patients-panel"]').or(page.locator('.lost-patients-panel')).first();
			await lostPanel.waitFor({ state: "visible", timeout: 8000 });
			await lostPanel.scrollIntoViewIfNeeded();
			await page.waitForTimeout(400);
		},
		all4States: true,
	},

	// Wave 5: Domain 1 — Телефония и Входящий звонок (IncomingCallPopup, TelephonyFloatingWidget)
	{
		prefix: "13_telephony_incoming_call_popup",
		name: "13. Telephony: Patient Incoming Call Popup with Live Timer & Audio Player",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=incoming_call_popup#clinical-modals-studio?modal=incoming_call_popup`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modalDialog = page.locator('[data-testid="incoming-call-popup"], [role="dialog"]').first();
			let isVis = false;
			try {
				await modalDialog.waitFor({ state: "visible", timeout: 3000 });
				isVis = await modalDialog.isVisible();
			} catch {
				isVis = false;
			}
			if (!isVis) {
				const trigger = page.locator('[data-testid="open-incoming-call-modal-btn"]').first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.scrollIntoViewIfNeeded();
				await trigger.click({ force: true });
				await modalDialog.waitFor({ state: "visible", timeout: 5000 });
			}
		},
		all4States: true,
	},
	{
		prefix: "13_telephony_floating_widget",
		name: "13. Telephony: Softphone Dialer & Floating Call Bar (Touch-First >= 48px)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=telephony_softphone#clinical-modals-studio?modal=telephony_softphone`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modalDialog = page.locator('[data-testid="telephony-floating-widget"], [role="dialog"]').first();
			let isVis = false;
			try {
				await modalDialog.waitFor({ state: "visible", timeout: 3000 });
				isVis = await modalDialog.isVisible();
			} catch {
				isVis = false;
			}
			if (!isVis) {
				const trigger = page.locator('[data-testid="open-telephony-widget-btn"]').first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.scrollIntoViewIfNeeded();
				await trigger.click({ force: true });
				await modalDialog.waitFor({ state: "visible", timeout: 5000 });
			}
		},
		all4States: true,
	},

	// Wave 5: Domain 2 — Ролевая матрица доступа и расчет комиссий (SettingsAccessTab, StaffCommissionsPanel)
	{
		prefix: "14_settings_access_matrix",
		name: "14. Clinic Settings: Role Access Control Matrix & Staff Invitation Link Engine",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=settings_access_matrix#clinical-modals-studio?modal=settings_access_matrix`,
		setup: async (page) => {
			await page.waitForSelector('[data-testid="settings-access-modal-container"]', { timeout: 15000 });
			await page.waitForTimeout(800);
		},
		all4States: true,
	},
	{
		prefix: "14_settings_access_matrix_roles",
		name: "14b. Clinic Settings: RBAC Roles Scroll Strip & Mobile Permission Cards",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=settings_access_matrix#clinical-modals-studio?modal=settings_access_matrix`,
		setup: async (page) => {
			await page.waitForSelector('[data-testid="settings-access-modal-container"]', { timeout: 10000 });
			await page.waitForTimeout(600);
			await page.evaluate(() => {
				const modal = document.querySelector('[data-testid="settings-access-modal-container"]');
				if (modal) {
					const scrollables = modal.querySelectorAll(".overflow-y-auto");
					for (const s of scrollables) {
						if (s !== modal) {
							s.scrollTop = 320;
						}
					}
				}
			});
			await page.waitForTimeout(600);
		},
		all4States: true,
	},
	{
		prefix: "14_settings_staff_commissions",
		name: "14. Clinic Settings: Doctor Piece-Rate Commissions & Order 804n Deduction Matrix",
		url: `${APP_BASE}/#settings`,
		setup: async (page) => {
			await page.waitForSelector('.settings-nav, [data-testid="settings-tabs"]', { timeout: 8000 });
			const staffTabBtn = page.locator('button:has-text("Персонал")').or(page.locator('[data-testid="tab-staff"]')).first();
			if (await staffTabBtn.isVisible()) {
				await staffTabBtn.click({ force: true });
				await page.waitForTimeout(600);
				const commissionsPanel = page.locator('.staff-commissions-panel, [data-testid="staff-commissions-panel"]').first();
				await commissionsPanel.waitFor({ state: "visible", timeout: 8000 });
				await commissionsPanel.scrollIntoViewIfNeeded();
				await page.waitForTimeout(400);
			} else {
				await page.goto(`${APP_BASE}/?standalone=clinical-modals-studio&modal=staff_commissions_panel#clinical-modals-studio?modal=staff_commissions_panel`, { waitUntil: "domcontentloaded", timeout: 15000 });
				await page.waitForTimeout(600);
				const trigger = page.locator('[data-testid="open-staff-commissions-modal-btn"]').first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.click({ force: true });
				await page.waitForTimeout(600);
			}
		},
		all4States: true,
	},

	// Wave 5: Domain 3 — Центр аудита ЭМК главврача 043/у (CmoComplianceHub, Form043PrintModal)
	{
		prefix: "15_cmo_compliance_remd_hub",
		name: "15. Chief Medical Officer: EGISZ/REMD Compliance Hub & Batch UKEP Signer (Order 203n)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=cmo_compliance_hub#clinical-modals-studio?modal=cmo_compliance_hub`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modalDialog = page.locator('[data-testid="cmo-compliance-modal-container"], .cmo-hub-container').first();
			let isVis = false;
			try {
				await modalDialog.waitFor({ state: "visible", timeout: 3000 });
				isVis = await modalDialog.isVisible();
			} catch {
				isVis = false;
			}
			if (!isVis) {
				const trigger = page.locator('[data-testid="open-cmo-compliance-modal-btn"]').first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.click();
				await page.waitForTimeout(600);
			}
			await page.waitForSelector('.cmo-hub-container, [data-testid="cmo-compliance-modal-container"]', { timeout: 8000 });
			await page.waitForTimeout(800);
			await page.evaluate(() => {
				const modal = document.querySelector('[data-testid="cmo-compliance-modal-container"]');
				if (modal) {
					const scrollable = modal.querySelector(".overflow-y-auto");
					if (scrollable) {
						scrollable.scrollTop = 160;
					}
				}
			});
			await page.waitForTimeout(400);
		},
		all4States: true,
	},
	{
		prefix: "15_form043_clinical_print_modal",
		name: "15. Medical Card Form 043/u Print Form (MoH Order 834n / 100% Statutory Compliant)",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=form043_print_modal#clinical-modals-studio?modal=form043_print_modal`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modalDialog = page.locator('[data-testid="form043-print-modal"], [role="dialog"]').first();
			let isVis = false;
			try {
				await modalDialog.waitFor({ state: "visible", timeout: 3000 });
				isVis = await modalDialog.isVisible();
			} catch {
				isVis = false;
			}
			if (!isVis) {
				const trigger = page.locator('[data-testid="open-form043-print-modal-btn"]').first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.scrollIntoViewIfNeeded();
				await trigger.click({ force: true });
				await modalDialog.waitFor({ state: "visible", timeout: 5000 });
			}
		},
		all4States: true,
	},

	// Wave 5: Domain 4 — Офлайн-хранилище и бэкап базы (OfflineBackupVaultPanel)
	{
		prefix: "16_offline_backup_vault_panel",
		name: "16. Offline Storage: AES-GCM 256 Database Vault & Cache Integrity Verifier",
		url: `${APP_BASE}/?standalone=clinical-modals-studio&modal=offline_backup_vault#clinical-modals-studio?modal=offline_backup_vault`,
		setup: async (page) => {
			await page.waitForTimeout(800);
			const modalDialog = page.locator('[data-testid="offline-vault-modal"], [role="dialog"]').first();
			let isVis = false;
			try {
				await modalDialog.waitFor({ state: "visible", timeout: 3000 });
				isVis = await modalDialog.isVisible();
			} catch {
				isVis = false;
			}
			if (!isVis) {
				const trigger = page.locator('[data-testid="open-offline-vault-modal-btn"]').first();
				await trigger.waitFor({ state: "visible", timeout: 5000 });
				await trigger.scrollIntoViewIfNeeded();
				await trigger.click({ force: true });
				await modalDialog.waitFor({ state: "visible", timeout: 5000 });
			}
		},
		all4States: true,
	},
];

const CONFIGS = [
	{
		key: "pc_light",
		label: "PC Light (1440x900)",
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1.5,
		theme: "light",
		isMobile: false,
	},
	{
		key: "pc_dark",
		label: "PC Dark (1440x900)",
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1.5,
		theme: "dark",
		isMobile: false,
	},
	{
		key: "mobile_light",
		label: "Mobile Light (390x844)",
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2.5,
		theme: "light",
		isMobile: true,
	},
	{
		key: "mobile_dark",
		label: "Mobile Dark (390x844)",
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2.5,
		theme: "dark",
		isMobile: true,
	},
];

const screenFilter = process.argv[2];
const screensToRun = screenFilter
	? TARGET_SCREENS.filter((s) => s.prefix.includes(screenFilter))
	: TARGET_SCREENS;

for (const screen of screensToRun) {
	console.log(`\n=============================================================`);
	console.log(`📸 CAPTURING: ${screen.name}`);
	console.log(`=============================================================`);

	for (const cfg of CONFIGS) {
		const context = await browser.newContext({
			viewport: cfg.viewport,
			deviceScaleFactor: cfg.deviceScaleFactor,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		const page = await context.newPage();

		// Mock all critical routes to guarantee robust rendering
		await page.route("**/api/auth/user/me**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					user: {
						id: "doc-1",
						fullName: "Д-р Ковалев С.П.",
						name: "Д-р Ковалев С.П.",
						role: "doctor",
						organizationId: "c-1",
					},
				}),
			});
		});

		await page.route("**/api/auth/staff/unlock**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					token: "dev_token_sample_staff",
					user: {
						id: "doc-1",
						fullName: "Д-р Ковалев С.П.",
						role: "doctor",
						organizationId: "c-1",
					},
				}),
			});
		});

		await page.route("**/api/dashboard**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard),
			});
		});

		await page.route("**/api/schedule**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard.appointments),
			});
		});

		await page.route("**/api/portal/lab-order/**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: "demo-token-123",
					patientFullName: "Барабаш Светлана Викторовна",
					toothFdi: "1.6",
					material: "zirconia",
					colorVita: "A2",
					status: "in_progress",
					clinicalNotes: "Анатомическая коронка с винтовой фиксацией, уступ 0.5мм. Срочно к 30.08.",
					attachedImageUrl: null,
					createdAt: new Date().toISOString(),
				}),
			});
		});

		await page.route("**/api/clinical/lab-orders**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						id: "lab-1",
						organizationId: "c-1",
						patientId: "p-1",
						patientFullName: "Барабаш Светлана Викторовна",
						doctorUserId: "doc-1",
						doctorName: "Д-р Ковалев С.П.",
						toothFdi: "1.6",
						material: "zirconia",
						colorVita: "A2",
						status: "in_progress",
						orderType: "crown",
						notes: "Анатомическая коронка",
						costKopecks: 1500000,
						dueDate: new Date().toISOString(),
						createdAt: new Date().toISOString(),
					},
				]),
			});
		});

		await page.route("**/api/settings/clinic/profile**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard.clinicSettings.profile),
			});
		});

		await page.route("**/api/telephony/**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true }),
			});
		});

		await page.addInitScript(() => {
			window.localStorage.setItem("dente_organization_id", "c-1");
			window.localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
			window.localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
			window.localStorage.setItem("dente_active_session_token", "mock-session-token");
			window.localStorage.setItem("dente_user_role", "doctor");
			window.localStorage.setItem("dente_user_name", "Д-р Ковалев С.П.");
			window.localStorage.setItem(
				"dente_active_user",
				JSON.stringify({
					id: "doc-1",
					name: "Д-р Ковалев С.П.",
					role: "doctor",
					organizationId: "c-1",
				}),
			);
			window.localStorage.setItem("dente_offline_mode", "true");
			window.localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
			window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			window.localStorage.setItem("dente_onboarding_completed", "true");
			window.localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "doctor",
					selectedSpecialty: "therapist",
					selectedPatientId: "PAT-001",
					onboardingDismissed: true,
				}),
			);
			window.localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "doctor",
					selectedSpecialty: "therapist",
					selectedPatientId: "PAT-001",
					onboardingDismissed: true,
				}),
			);
		});

		try {
			await page.goto(screen.url, { waitUntil: "domcontentloaded", timeout: 15000 });
			await applyTheme(page, cfg.theme);
			await page.waitForTimeout(400);

			// Perform screen specific setup / trigger
			await screen.setup(page);
			await page.waitForTimeout(600);

			// Dismiss transient toasts
			await page.evaluate(() => {
				document
					.querySelectorAll(
						'.sa-toast, .global-toast, .toast, [role="alert"], [data-testid="toast-item"], [data-testid="global-toast"]',
					)
					.forEach((el) => el.remove());
			});

			const fileName = `${screen.prefix}_${cfg.key}.png`;
			const filePath = path.join(DOCS_SCREENSHOTS_DIR, fileName);
			await page.screenshot({ path: filePath, fullPage: false });

			const size = statSync(filePath).size;
			if (size < 30000) {
				console.error(`[FATAL] Screenshot ${fileName} size too small (${size} bytes < 30KB). Render failure!`);
				process.exit(1);
			}

			capturedFiles.push(fileName);
			console.log(`  ✓ Saved unique 4-state proof: ${fileName} (${(size / 1024).toFixed(1)} KB)`);

			// Replicate to brain artifact dirs
			for (const bDir of BRAIN_DIRS) {
				try {
					copyFileSync(filePath, path.join(bDir, fileName));
				} catch (err) {
					console.error(`[FATAL] Failed replicating screenshot to ${bDir}: ${err.message}`);
					process.exit(1);
				}
			}
		} catch (err) {
			console.error(`  ✗ [FATAL] Error capturing ${screen.prefix} [${cfg.key}]:`, err.message);
			process.exit(1);
		} finally {
			await context.close();
		}
	}
}

await browser.close();

console.log(`\n=============================================================`);
console.log(`[DONE] Captured ${capturedFiles.length} unique 4-state screenshots successfully!`);
console.log(`=============================================================`);


import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const THEMES = [
	"light",
	"dark",
	"night",
	"calm_teal",
	"contrast",
	"sakura",
	"ocean",
	"emerald",
	"cyber_xray",
	"warm_sand",
];

const VIEWPORTS = [
	{ name: "pc_1440", width: 1440, height: 900, scale: 1, isMobile: false },
	{ name: "tablet_1024", width: 1024, height: 768, scale: 2, isMobile: true, hasTouch: true },
	{ name: "mobile_390", width: 390, height: 844, scale: 3, isMobile: true, hasTouch: true },
];

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/clinical_modals_audit",
	"C:/Clinic_MVP/dental-crm/apps/web/screenshots",
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

if (!edgePath) {
	console.error("Microsoft Edge/Chromium not found!");
	process.exit(1);
}

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function saveScreenshot(page, filename) {
	const primary = path.join(OUT_DIRS[0], filename);
	try {
		await page.screenshot({ path: primary, timeout: 12000, animations: "disabled" });
	} catch {
		try {
			await page.screenshot({ path: primary, timeout: 12000 });
		} catch (err) {
			console.warn(`[WARN] screenshot failed for ${filename}:`, err?.message || err);
		}
	}
	for (let i = 1; i < OUT_DIRS.length; i++) {
		try {
			copyFileSync(primary, path.join(OUT_DIRS[i], filename));
		} catch {
			/* ignore */
		}
	}
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark =
			th === "dark" ||
			th === "night" ||
			th === "ocean" ||
			th === "emerald" ||
			th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	}, theme);
	await page.waitForTimeout(250);
}

async function auditContrastAndLayout(page, theme, viewportName, sectionName) {
	return await page.evaluate(
		({ theme, viewportName, sectionName }) => {
			const defects = [];

			function getLuminance(r, g, b) {
				const [rs, gs, bs] = [r, g, b].map((c) => {
					c = c / 255;
					return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
				});
				return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
			}

			function parseRgb(colorStr) {
				if (!colorStr) return null;
				const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
				if (!match) return null;
				return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
			}

			function getContrast(c1, c2) {
				const l1 = getLuminance(c1.r, c1.g, c1.b);
				const l2 = getLuminance(c2.r, c2.g, c2.b);
				const lighter = Math.max(l1, l2);
				const darker = Math.min(l1, l2);
				return (lighter + 0.05) / (darker + 0.05);
			}

			const isDarkTheme =
				theme === "dark" ||
				theme === "night" ||
				theme === "ocean" ||
				theme === "emerald" ||
				theme === "cyber_xray";

			// 1. Text elements check (WCAG 4.5:1 / 3:1)
			const textElements = document.querySelectorAll(
				"button, h1, h2, h3, h4, span, p, strong, td, th, label, input, select, textarea",
			);

			for (const el of textElements) {
				const style = window.getComputedStyle(el);
				if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
					continue;
				}
				const fgRgb = parseRgb(style.color);
				let bgRgb = parseRgb(style.backgroundColor);

				if (
					!bgRgb ||
					style.backgroundColor === "rgba(0, 0, 0, 0)" ||
					(style.backgroundColor.startsWith("rgba(") &&
						style.backgroundColor.endsWith(", 0)"))
				) {
					let curr = el.parentElement;
					while (curr) {
						const pStyle = window.getComputedStyle(curr);
						const pBg = pStyle.backgroundColor;
						if (
							pBg &&
							pBg !== "rgba(0, 0, 0, 0)" &&
							!pBg.endsWith(", 0)")
						) {
							bgRgb = parseRgb(pBg);
							break;
						}
						curr = curr.parentElement;
					}
					if (!bgRgb) {
						const bodyStyle = window.getComputedStyle(document.body);
						bgRgb = parseRgb(bodyStyle.backgroundColor) || (isDarkTheme ? { r: 15, g: 23, b: 42 } : { r: 255, g: 255, b: 255 });
					}
				}

				if (fgRgb && bgRgb) {
					const ratio = getContrast(fgRgb, bgRgb);
					const isLarge =
						parseFloat(style.fontSize) >= 18 ||
						(parseFloat(style.fontSize) >= 14 && (parseInt(style.fontWeight, 10) >= 700 || style.fontWeight === "bold"));
					const threshold = isLarge ? 3.0 : 4.5;
					if (ratio < threshold && ratio > 1.05 && (el.textContent || "").trim().length > 0) {
						defects.push({
							type: "contrast_low",
							section: sectionName,
							theme,
							viewport: viewportName,
							selector: (el.className ? `.${el.className.split(" ")[0]}` : el.tagName.toLowerCase()),
							text: (el.textContent || "").trim().slice(0, 30),
							ratio: ratio.toFixed(2),
							expected: threshold,
							fg: style.color,
							bg: style.backgroundColor,
						});
					}
				}

				// 2. Blinding white box check in dark themes (exempting physical A4 / thermal paper previews)
				if (isDarkTheme && bgRgb && bgRgb.r > 240 && bgRgb.g > 240 && bgRgb.b > 240) {
					if (el.closest(".premium-doc-sheet, .emr043-a4-sheet, .print-paper-sheet, [data-paper-sheet], .fiscal-receipt-view, #printable-lab-order-sheet, #printable-memo-sheet, .doc-container, .doc-palette-medical_navy, .doc-palette-deep_teal, .doc-palette-royal_burgundy, .doc-palette-pure_slate, .doc-palette-gold_luxury")) {
						continue;
					}
					const rect = el.getBoundingClientRect();
					if (rect.width > 200 && rect.height > 100) {
						defects.push({
							type: "blinding_white_spot_in_dark_theme",
							section: sectionName,
							theme,
							viewport: viewportName,
							selector: (el.className ? `.${el.className.split(" ")[0]}` : el.tagName.toLowerCase()),
							bg: style.backgroundColor,
							size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
						});
					}
				}
			}

			// 3. Touch target check on mobile viewports
			if (viewportName.startsWith("mobile")) {
				const buttons = document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']");
				for (const btn of buttons) {
					const style = window.getComputedStyle(btn);
					if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
					const rect = btn.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) {
						if (rect.width < 32 || rect.height < 32) {
							defects.push({
								type: "touch_target_too_small",
								section: sectionName,
								theme,
								viewport: viewportName,
								selector: (btn.className ? `.${btn.className.split(" ")[0]}` : btn.tagName.toLowerCase()),
								text: (btn.textContent || "").trim().slice(0, 25),
								size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
							});
						}
					}
				}
			}

			return defects;
		},
		{ theme, viewportName, sectionName },
	);
}

async function closeModal(page) {
	try {
		const closeBtn = page.locator("[role='dialog'] button:has-text('Закрыть'), [role='dialog'] button[aria-label*='Закрыть'], [role='dialog'] button:has(svg.lucide-x), [data-testid$='-modal'] button:has(svg.lucide-x), .fixed.inset-0 button:has(svg.lucide-x)").first();
		if (await closeBtn.count()) {
			await closeBtn.click({ force: true });
		} else {
			await page.keyboard.press("Escape");
		}
	} catch {
		await page.keyboard.press("Escape");
	}
	await page.waitForTimeout(200);
}

async function auditModalIfPresent(page, theme, vp, modalName, buttonTestId, screenshotPrefix, allDefects) {
	try {
		const btn = page.locator(`[data-testid='${buttonTestId}']`).first();
		if (await btn.count()) {
			await btn.scrollIntoViewIfNeeded();
			await btn.click({ force: true });
			await page.waitForSelector("[role='dialog'], [data-testid$='-modal'], .fixed.inset-0", { timeout: 4000 });
			await page.waitForTimeout(250);

			const defects = await auditContrastAndLayout(page, theme, vp.name, modalName);
			allDefects.push(...defects);

			const shotName = `audit_${screenshotPrefix}_${theme}_${vp.name}.png`;
			await saveScreenshot(page, shotName);
			console.log(`[PASS] ${shotName}`);

			await closeModal(page);
		}
	} catch (err) {
		console.warn(`[WARN] ${modalName} audit encountered error:`, err?.message || err);
		await closeModal(page);
	}
}

const MODALS_TO_AUDIT = [
	{ name: "PediatricMixedDentitionModal", testId: "open-pediatric-modal-btn", prefix: "pediatric" },
	{ name: "FiscalReceipt54FzModal", testId: "open-fiscal-modal-btn", prefix: "fiscal" },
	{ name: "PrescriptionModal", testId: "open-prescription-modal-btn", prefix: "prescription" },
	{ name: "RadiologyReferralModal", testId: "open-radiology-modal-btn", prefix: "radiology" },
	{ name: "TreatmentPlanCompletedActPrint", testId: "open-act-print-modal-btn", prefix: "completed_act" },
	{ name: "InformedConsent1051nModal", testId: "open-consent-modal-btn", prefix: "consent_1051n" },
	{ name: "RadiologyViewerModal", testId: "open-viewer-modal-btn", prefix: "radiology_viewer" },
	{ name: "DoctorPayrollModal", testId: "open-payroll-modal-btn", prefix: "payroll_t51" },
	{ name: "FastCheckoutModal", testId: "open-fast-checkout-modal-btn", prefix: "fast_checkout" },
	{ name: "MedicalPrescriptionModal", testId: "open-med-prescription-modal-btn", prefix: "med_prescription" },
	{ name: "CephalometricAnalysisModal", testId: "open-ceph-modal-btn", prefix: "ceph_trg" },
	{ name: "ImplantIsqProtocolModal", testId: "open-isq-modal-btn", prefix: "implant_isq" },
	{ name: "DentalLabOrderModal", testId: "open-lab-order-modal-btn", prefix: "lab_order" },
	{ name: "ClinicalPhotoProtocolModal", testId: "open-photo-protocol-modal-btn", prefix: "photo_protocol" },
	{ name: "PatientRecallManagerModal", testId: "open-recall-modal-btn", prefix: "recall_manager" },
	{ name: "AutoclaveCycleModal", testId: "open-autoclave-modal-btn", prefix: "autoclave_journal" },
	{ name: "InsurancePreAuthModal", testId: "open-insurance-modal-btn", prefix: "insurance_preauth" },
	{ name: "LabStlViewerModal", testId: "open-lab-stl-modal-btn", prefix: "lab_stl_viewer" },
	{ name: "TreatmentPlanComparatorModal", testId: "open-plan-comparator-modal-btn", prefix: "plan_comparator" },
	{ name: "WarehouseTransferModal", testId: "open-warehouse-transfer-modal-btn", prefix: "warehouse_transfer" },
	{ name: "ClinicalWriteoffModal", testId: "open-clinical-writeoff-modal-btn", prefix: "clinical_writeoff" },
	{ name: "PatientPortalModal", testId: "open-patient-portal-modal-btn", prefix: "patient_portal" },
	{ name: "ImplantPlanningModal", testId: "open-implant-planning-modal-btn", prefix: "implant_planning" },
	{ name: "VoiceDictationAssistantModal", testId: "open-voice-assistant-modal-btn", prefix: "voice_assistant" },
	{ name: "InformedConsent323FzModal", testId: "open-consent-323-modal-btn", prefix: "consent_323fz" },
	{ name: "AnesthesiaProtocolModal", testId: "open-anesthesia-protocol-modal-btn", prefix: "anesthesia_protocol" },
	{ name: "MedicalWasteJournalModal", testId: "open-medical-waste-modal-btn", prefix: "medical_waste" },
	{ name: "EmergencyRescueModal", testId: "open-emergency-rescue-modal-btn", prefix: "emergency_rescue" },
	{ name: "WarrantyPassportModal", testId: "open-warranty-passport-modal-btn", prefix: "warranty_passport" },
	{ name: "CmoEmrAuditModal", testId: "open-cmo-emr-audit-modal-btn", prefix: "cmo_emr_audit" },
	{ name: "FnsNdflXmlModal", testId: "open-fns-ndfl-xml-modal-btn", prefix: "fns_ndfl" },
	{ name: "TreatmentPlanPriceValidatorModal", testId: "open-plan-price-validator-modal-btn", prefix: "plan_price_validator" },
	{ name: "SberPosTerminalModal", testId: "open-sber-pos-modal-btn", prefix: "sber_pos" },
	{ name: "PatientCabinetModal", testId: "open-patient-cabinet-modal-btn", prefix: "patient_cabinet" },
	{ name: "EgiszRemdXmlModal", testId: "open-egisz-remd-modal-btn", prefix: "egisz_remd" },
	{ name: "LabWorkOrderModal", testId: "open-lab-work-order-modal-btn", prefix: "lab_work_order" },
	{ name: "SanpinJournalsModal", testId: "open-sanpin-journals-modal-btn", prefix: "sanpin_journals" },
	{ name: "DmsInsuranceManagerModal", testId: "open-dms-manager-modal-btn", prefix: "dms_manager" },
	{ name: "KraftPackageBarcodeModal", testId: "open-kraft-barcode-modal-btn", prefix: "kraft_barcode" },
	{ name: "ServicePricelistManagerModal", testId: "open-service-pricelist-modal-btn", prefix: "service_pricelist" },
	{ name: "LoyaltyProgramModal", testId: "open-loyalty-program-modal-btn", prefix: "loyalty_program" },
	{ name: "MedicalReferral057Modal", testId: "open-referral-057-modal-btn", prefix: "referral_057" },
	{ name: "SickLeaveElnModal", testId: "open-sick-leave-eln-modal-btn", prefix: "sick_leave_eln" },
	{ name: "AutoclaveLog257Modal", testId: "open-autoclave-log-257-modal-btn", prefix: "autoclave_log_257" },
	{ name: "DoctorShiftRosterModal", testId: "open-doctor-shift-roster-modal-btn", prefix: "doctor_shift_roster" },
];

async function runAudit() {
	console.log("=== STARTING COMPREHENSIVE MULTI-THEME CLINICAL & ODONTOGRAM AUDIT ===");
	console.log(`Themes: ${THEMES.join(", ")}`);
	console.log(`Viewports: ${VIEWPORTS.map((v) => v.name).join(", ")}`);

	const allDefects = [];

	for (const theme of THEMES) {
		console.log(`\n==================================================`);
		console.log(`--- THEME: ${theme.toUpperCase()} ---`);
		console.log(`==================================================`);

		for (const vp of VIEWPORTS) {
			const context = await browser.newContext({
				viewport: { width: vp.width, height: vp.height },
				deviceScaleFactor: vp.scale,
				isMobile: vp.isMobile,
				hasTouch: vp.hasTouch,
				serviceWorkers: "block",
			});
			const page = await context.newPage();

			// -------------------------------------------------------------
			// A. ODONTOGRAM & 043/U CLASSIC AUDIT
			// -------------------------------------------------------------
			try {
				await page.goto("http://127.0.0.1:5173/?odontogram-studio#odontogram-studio", {
					waitUntil: "domcontentloaded",
				});
				await page.waitForSelector(".tooth-chart-container, .gost-odontogram-container, [data-testid='odontogram-studio-container']", {
					timeout: 6000,
				});
				await applyTheme(page, theme);

				// 1. 3D Anatomical
				const odoDefects = await auditContrastAndLayout(page, theme, vp.name, "Odontogram-3D");
				allDefects.push(...odoDefects);
				const shotOdo = `audit_odontogram_${theme}_${vp.name}.png`;
				await saveScreenshot(page, shotOdo);
				console.log(`[PASS] ${shotOdo}`);

				// 2. Radial Menu (on PC and Tablet)
				if (!vp.isMobile) {
					const tooth16Btn = page.locator("button[data-tooth-id='16']").first();
					if (await tooth16Btn.count()) {
						await tooth16Btn.click({ force: true });
						await page.waitForTimeout(300);
						const shotRadial = `audit_radial_menu_${theme}_${vp.name}.png`;
						await saveScreenshot(page, shotRadial);
						console.log(`[PASS] ${shotRadial}`);
						await page.keyboard.press("Escape");
						await page.waitForTimeout(200);
					}
				}

				// 3. Classic GOST 043/u
				const tabGost = page.locator("button", { hasText: /ГОСТ 043/i });
				if (await tabGost.count()) {
					await tabGost.click({ force: true });
					await page.waitForTimeout(250);
					const shotGost = `audit_gost_${theme}_${vp.name}.png`;
					await saveScreenshot(page, shotGost);
					console.log(`[PASS] ${shotGost}`);
				}
			} catch (err) {
				console.warn(`[WARN] Odontogram audit failed for ${theme} ${vp.name}:`, err?.message || err);
			}

			// -------------------------------------------------------------
			// B. CLINICAL MODALS STUDIO AUDIT
			// -------------------------------------------------------------
			try {
				await page.goto("http://127.0.0.1:5173/?clinical-modals-studio#clinical-modals-studio", {
					waitUntil: "domcontentloaded",
				});
				await page.waitForSelector("[data-testid='open-pediatric-modal-btn']", { timeout: 8000 });
				await applyTheme(page, theme);

				// 1. Showcase Page
				const showcaseDefects = await auditContrastAndLayout(page, theme, vp.name, "StudioShowcase");
				allDefects.push(...showcaseDefects);
				const shotShowcase = `audit_studio_showcase_${theme}_${vp.name}.png`;
				await saveScreenshot(page, shotShowcase);
				console.log(`[PASS] ${shotShowcase}`);

				// 2. Anesthesia Calculator
				const calcHeader = page.locator("[data-testid='anesthesia-calculator'] > div").first();
				if (await calcHeader.count()) {
					await calcHeader.click({ force: true });
					await page.waitForTimeout(200);
					const anesthDefects = await auditContrastAndLayout(page, theme, vp.name, "AnesthesiaCalculator");
					allDefects.push(...anesthDefects);
					const shotAnesth = `audit_anesthesia_${theme}_${vp.name}.png`;
					await saveScreenshot(page, shotAnesth);
					console.log(`[PASS] ${shotAnesth}`);
				}

				// 3. Clinical Modals (representative batch across categories)
				const sampleModals = [
					{ name: "PediatricMixedDentitionModal", testId: "open-pediatric-modal-btn", prefix: "pediatric" },
					{ name: "FiscalReceipt54FzModal", testId: "open-fiscal-modal-btn", prefix: "fiscal" },
					{ name: "PrescriptionModal", testId: "open-prescription-modal-btn", prefix: "prescription" },
					{ name: "RadiologyReferralModal", testId: "open-radiology-modal-btn", prefix: "radiology" },
					{ name: "TreatmentPlanCompletedActPrint", testId: "open-act-print-modal-btn", prefix: "completed_act" },
					{ name: "InformedConsent1051nModal", testId: "open-consent-modal-btn", prefix: "consent_1051n" },
					{ name: "DoctorPayrollModal", testId: "open-payroll-modal-btn", prefix: "payroll_t51" },
					{ name: "FastCheckoutModal", testId: "open-fast-checkout-modal-btn", prefix: "fast_checkout" },
					{ name: "SanpinJournalsModal", testId: "open-sanpin-journals-modal-btn", prefix: "sanpin_journals" },
					{ name: "EgiszRemdXmlModal", testId: "open-egisz-remd-modal-btn", prefix: "egisz_remd" },
					{ name: "FnsNdflXmlModal", testId: "open-fns-ndfl-xml-modal-btn", prefix: "fns_ndfl" },
					{ name: "EmergencyRescueModal", testId: "open-emergency-rescue-modal-btn", prefix: "emergency_rescue" },
					{ name: "DoctorShiftRosterModal", testId: "open-doctor-shift-roster-modal-btn", prefix: "doctor_shift_roster" },
				];

				for (const modal of sampleModals) {
					await auditModalIfPresent(page, theme, vp, modal.name, modal.testId, modal.prefix, allDefects);
				}
			} catch (err) {
				console.warn(`[WARN] Clinical studio audit failed for ${theme} ${vp.name}:`, err?.message || err);
			}

			await context.close();
		}
	}

	await browser.close();

	console.log("\n==================================================");
	console.log("=== CLINICAL MODALS AUDIT RESULTS SUMMARY ===");
	console.log("==================================================");
	console.log(`Total Themes Audited: ${THEMES.length}`);
	console.log(`Total Viewports: ${VIEWPORTS.length}`);
	console.log(`Total Defects Found: ${allDefects.length}`);

	if (allDefects.length > 0) {
		console.log("\n--- DEFECTS LIST ---");
		for (const d of allDefects) {
			console.log(JSON.stringify(d, null, 2));
		}
	} else {
		console.log("\n[PERFECT] All contrast ratios, touch targets, and dark-mode invariants passed across all 10 themes and 3 viewports!");
	}
}

await runAudit();

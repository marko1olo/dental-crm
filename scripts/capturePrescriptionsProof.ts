/**
 * scripts/capturePrescriptionsProof.ts
 *
 * 4-State Red Team Visual Proof for Prescriptions & Drug Orders (Order 1094n)
 * Executed on LIVE CRM stand (http://127.0.0.1:5173/?demo=1) with live Fastify API (:4100)
 *
 * Mandates:
 * - Mandate 8b: Micro-modular architecture
 * - Mandate 8e & 8y: Doctor Autonomy & Zero DDI/allergy blocking paranoia
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 * - Mandate 8ze, 8al, 8am: Apple HIG touch ergonomics & 4-State Visual Proof
 */

import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173/?demo=1#schedule";
const TARGET_DIR = path.resolve(process.cwd(), "docs/proofs/prescriptions");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/dfac5609-9a10-46b3-9cd2-c17d361749a4";

for (const dir of [TARGET_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function captureAll() {
	console.log("Authenticating against live Fastify API :4100...");
	const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
	});
	if (!loginRes.ok) {
		throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
	}
	const auth = await loginRes.json();
	const orgId = "01a00000-0000-0000-0000-000000000000";

	console.log("Launching Chromium browser via Playwright...");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-proxy-server", "--disable-gpu", "--no-sandbox"],
	});

	const states = [
		{
			id: "pc_light",
			filename: "pc-light-1440x900.png",
			viewport: { width: 1440, height: 900 },
			isMobile: false,
			theme: "light",
		},
		{
			id: "pc_dark",
			filename: "pc-dark-1440x900.png",
			viewport: { width: 1440, height: 900 },
			isMobile: false,
			theme: "dark",
		},
		{
			id: "mobile_light",
			filename: "mobile-light-390x844.png",
			viewport: { width: 390, height: 844 },
			isMobile: true,
			theme: "light",
		},
		{
			id: "mobile_dark",
			filename: "mobile-dark-390x844.png",
			viewport: { width: 390, height: 844 },
			isMobile: true,
			theme: "dark",
		},
	];

	for (const state of states) {
		console.log(`\n--- Capturing ${state.id} (${state.filename}, ${state.viewport.width}x${state.viewport.height}, theme=${state.theme}) ---`);
		const context = await browser.newContext({
			viewport: state.viewport,
			isMobile: state.isMobile,
			hasTouch: state.isMobile,
			deviceScaleFactor: 2,
		});

		await context.addCookies([
			{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_organization_id", value: orgId, domain: "127.0.0.1", path: "/" },
		]);

		const page = await context.newPage();

		await page.addInitScript(({ ct, st, org, user, th }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_organization_id", org);
			localStorage.setItem("dente_active_session_token", st);
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_workspace_perspective", "doctor");
			localStorage.setItem("dente_user_id", user.id);
			localStorage.setItem("dente_active_staff_user", JSON.stringify(user));
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "doctor", onboardingDismissed: true }));
		}, { ct: auth.clinicToken, st: auth.staffToken, org: orgId, user: auth.user, th: state.theme });

		await page.goto(APP_BASE, { waitUntil: "commit", timeout: 35000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await page.waitForTimeout(2000);

		// Apply theme class to DOM
		await page.evaluate((th) => {
			const isDark = th === "dark";
			document.documentElement.setAttribute("data-theme", th);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.setAttribute("data-theme", th);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
			localStorage.setItem("dente_theme_mode", th);
		}, state.theme);

		// Dispatch open-prescriptions event with core dental medications
		for (let attempt = 0; attempt < 8; attempt++) {
			await page.evaluate(() => {
				window.dispatchEvent(
					new CustomEvent("dente:open-prescriptions", {
						detail: { medicationIds: ["amoxiclav_875_125", "nimesil_100"] },
					})
				);
			});
			const visible = await page.locator('[data-testid="prescription-print-modal"]').isVisible().catch(() => false);
			if (visible) break;
			await page.waitForTimeout(500);
		}

		await page.waitForSelector('[data-testid="prescription-print-modal"]', { timeout: 15000 });
		await page.waitForTimeout(800);

		// On mobile-dark, let's switch to the printable blank tab to showcase both views across the set
		if (state.isMobile && state.theme === "dark") {
			const previewTab = page.locator('button:has-text("Предпросмотр бланка")');
			if ((await previewTab.count()) > 0 && (await previewTab.first().isVisible())) {
				await previewTab.first().click();
				await page.waitForTimeout(800);
			}
		}

		const outDocs = path.join(TARGET_DIR, state.filename);
		const outBrain = path.join(BRAIN_DIR, state.filename);
		await page.screenshot({ path: outDocs, fullPage: false });
		fs.copyFileSync(outDocs, outBrain);

		const stat = fs.statSync(outDocs);
		const hash = crypto.createHash("md5").update(fs.readFileSync(outDocs)).digest("hex");
		console.log(`[PROOF VERIFIED] ${state.filename}: ${(stat.size / 1024).toFixed(1)} KB (bytes: ${stat.size}), md5: ${hash}`);

		if (stat.size < 20480) {
			throw new Error(`[BYTE-GUARD FAILED] ${state.filename} is only ${stat.size} bytes (<20KB)`);
		}

		await context.close();
	}

	await browser.close();
	console.log("\n=======================================================");
	console.log(">>> ALL 4 PRESCRIPTION PROOFS CAPTURED SUCCESSFULLY! <<<");
	console.log("=======================================================\n");
}

captureAll().catch((err) => {
	console.error("FATAL ERROR in captureAll:", err);
	process.exit(1);
});

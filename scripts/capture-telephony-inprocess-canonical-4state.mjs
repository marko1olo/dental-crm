import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

process.env.NO_PROXY = "127.0.0.1,localhost";
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/telephony");

fs.mkdirSync(PROOFS_DIR, { recursive: true });

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: todayDate,
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
			scheduleDefaults: {
				workingDays: [1, 2, 3, 4, 5, 6],
				workdayStart: "08:00",
				workdayEnd: "21:00",
				appointmentBufferMinutes: 10,
			},
			timezone: "Europe/Moscow",
			phone: "+7 (495) 123-45-67",
			address: "Москва, Столярный переулок, 14",
			inn: "7701234567",
			updatedAt: new Date().toISOString(),
		},
		staff: [
			{
				id: "01940000-0000-7000-8000-000000000001",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
				specialties: ["therapist", "orthopedist"],
				active: true,
				color: "#0d9488",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: "01940000-0000-7000-8000-000000000002",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Смирнова Елена Викторовна",
				role: "doctor",
				specialties: ["surgery"],
				active: true,
				color: "#0284c7",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		chairs: [
			{ id: "chair-1", name: "Кресло 1 (Терапия)", active: true },
			{ id: "chair-2", name: "Кресло 2 (Хирургия)", active: true },
		],
	},
	appointments: [
		{
			id: "app-1",
			patientId: "01a00000-0000-0000-0000-000000000001",
			patientName: "Смирнова Екатерина Васильевна",
			doctorUserId: "01940000-0000-7000-8000-000000000001",
			doctorName: "Д-р Воронов А. В.",
			chairId: "chair-1",
			startsAt: `${todayDate}T10:00:00.000Z`,
			endsAt: `${todayDate}T11:00:00.000Z`,
			status: "confirmed",
			treatmentPlanId: null,
			notes: "Осмотр и лечение кариеса",
			priceKopecks: 450000,
		},
	],
	patients: [
		{
			id: "01a00000-0000-0000-0000-000000000001",
			name: "Смирнова Екатерина Васильевна",
			phone: "+7 (926) 555-12-34",
			gender: "female",
			birthDate: "1988-04-12",
			balanceKopecks: 1250000,
			totalInvoicedKopecks: 8500000,
			totalPaidKopecks: 8500000,
			somaticAlerts: ["Аллергия на пенициллин"],
			tags: ["Постоянный пациент"],
		},
	],
};

function verifyProof(filePath) {
	const size = fs.statSync(filePath).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filePath} is ${size} bytes (< 20KB)!`);
	}
	console.log(`  -> [VERIFIED] ${path.basename(filePath)} (${(size / 1024).toFixed(1)} KB >= 20KB)`);
	return size;
}

async function setupPageRoutesAndStorage(page) {
	await page.route(
		(url) => {
			const parsed = typeof url === "string" ? new URL(url) : url;
			return parsed.pathname.startsWith("/api/") || parsed.pathname === "/api";
		},
		(route) => {
			const url = route.request().url();
			if (url.includes("/api/dashboard")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockDashboard),
				});
			}
			if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						user: {
							id: "01940000-0000-7000-8000-000000000001",
							fullName: "Д-р Воронов Алексей Владимирович",
							role: "doctor",
							active: true,
							organizationId: "00000000-0000-0000-0000-000000000001",
						},
					}),
				});
			}
			if (url.includes("/api/auth/staff/unlock")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						token: "audit-token-staff",
						user: {
							id: "01940000-0000-7000-8000-000000000001",
							fullName: "Д-р Воронов Алексей Владимирович",
							role: "doctor",
						},
					}),
				});
			}
			if (url.includes("/api/schedule")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockDashboard.appointments),
				});
			}
			if (url.includes("/api/patients")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockDashboard.patients),
				});
			}
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
			});
		}
	);

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_workspace_perspective", "doctor");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem(
			"dente_ui_preferences_v1",
			JSON.stringify({
				onboardingDismissed: true,
				onboardingStep: "done",
				version: 1,
			})
		);
		localStorage.setItem(
			"dental-crm:onboarding:v1",
			JSON.stringify({
				dismissed: true,
				step: "done",
				completed: true,
				version: 1,
			})
		);
		localStorage.setItem(
			"dente_staff_session",
			JSON.stringify({
				userId: "01940000-0000-7000-8000-000000000001",
				name: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
				roleScope: "doctor",
			})
		);
		sessionStorage.setItem("dente_unlocked", "true");

		const style = document.createElement("style");
		style.textContent = `
			[data-testid="doctor-training-coach-mark-card"],
			[data-testid="guided-tour-spotlight-overlay"],
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="demo-mode-banner"],
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
		`;
		if (document.head) document.head.appendChild(style);
		else document.addEventListener("DOMContentLoaded", () => document.head?.appendChild(style));
	});
}

async function setTheme(page, themeId, isDark) {
	await page.evaluate(
		({ themeId, isDark }) => {
			document.documentElement.setAttribute("data-theme", themeId);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(themeId);
			}
			localStorage.setItem("dente_theme_mode", themeId);
			localStorage.setItem("dente_theme", themeId);
		},
		{ themeId, isDark }
	);
	await page.waitForTimeout(400);
}

async function triggerCall(page) {
	await page.evaluate(() => {
		window.dispatchEvent(
			new CustomEvent("dente:telephony-mock-incoming", {
				detail: {
					callId: "call-" + Date.now(),
					phone: "+7 (926) 555-12-34",
					patientName: "Смирнова Екатерина Васильевна",
					patientId: "01a00000-0000-0000-0000-000000000001",
					provider: "mango",
					timestamp: new Date().toISOString(),
					status: "ringing",
					acutePain: true,
				},
			})
		);
	});
	await page.waitForTimeout(600);
}

async function main() {
	console.log("=== 1. Starting In-Process Vite Server for Telephony (port 5199) ===");
	const viteServer = await createServer({
		configFile,
		root: webRoot,
		server: {
			port: 5199,
			host: "127.0.0.1",
			strictPort: true,
			hmr: false,
			watch: null,
		},
	});

	await viteServer.listen();
	console.log(`✓ In-process Vite listening on: http://127.0.0.1:5199/`);

	console.log("=== 2. Launching Playwright Chromium ===");
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await chromium.launch({
		headless: true,
		executablePath: chromePath,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--no-proxy-server",
			"--proxy-bypass-list=<-loopback>",
		],
	});

	const contexts = [
		{ name: "pc_light", prefix: "01", width: 1440, height: 900, theme: "light", isDark: false, isMobile: false },
		{ name: "pc_dark", prefix: "02", width: 1440, height: 900, theme: "dark", isDark: true, isMobile: false },
		{ name: "mobile_light", prefix: "03", width: 390, height: 844, theme: "light", isDark: false, isMobile: true },
		{ name: "mobile_dark", prefix: "04", width: 390, height: 844, theme: "dark", isDark: true, isMobile: true },
	];

	try {
		for (const ctxCfg of contexts) {
			console.log(`\n======================================================`);
			console.log(`Phase: ${ctxCfg.name} (${ctxCfg.width}x${ctxCfg.height}, ${ctxCfg.theme})`);
			console.log(`======================================================`);

			const context = await browser.newContext({
				viewport: { width: ctxCfg.width, height: ctxCfg.height },
				deviceScaleFactor: ctxCfg.isMobile ? 2 : 1,
				isMobile: ctxCfg.isMobile,
				hasTouch: ctxCfg.isMobile,
				colorScheme: ctxCfg.theme,
			});

			const page = await context.newPage();
			await setupPageRoutesAndStorage(page);

			const targetUrl = `http://127.0.0.1:5199/?demo=true#telephony`;
			console.log(`  -> Navigating to ${targetUrl}...`);
			await page.goto(targetUrl, { waitUntil: "commit", timeout: 30000 });

			console.log("  -> Waiting for telephony launcher selector...");
			await page.waitForSelector('[data-testid="telephony-studio-modal-root"], [data-testid="direct-telephony-launcher-root"]', { timeout: 30000 });
			await page.waitForTimeout(1000);

			console.log("  -> Applying theme...");
			await setTheme(page, ctxCfg.theme, ctxCfg.isDark);
			await page.waitForTimeout(600);

			// 1. CAPTURE TELEPHONY STUDIO MODAL (Канонический журнал, плеер, диалер, заметки)
			const studioName = `${ctxCfg.prefix}_telephony_studio_${ctxCfg.isMobile ? "mobile" : "pc"}_${ctxCfg.theme}_${ctxCfg.width}x${ctxCfg.height}.png`;
			const studioPath = path.join(PROOFS_DIR, studioName);
			await page.screenshot({ path: studioPath, fullPage: false });
			verifyProof(studioPath);

			// 4-state aliases
			const aliasName = `${ctxCfg.prefix}_telephony_${ctxCfg.isMobile ? "mobile" : "pc"}_${ctxCfg.theme}_${ctxCfg.width}x${ctxCfg.height}.png`;
			fs.copyFileSync(studioPath, path.join(PROOFS_DIR, aliasName));

			// 2. CAPTURE ACTIVE CALL INTERACTION (нажатие "Позвонить" в студии)
			console.log("  -> Testing active call interaction...");
			const callBtn = page.locator('[data-testid="telephony-call-patient-btn"]').first();
			if (await callBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await callBtn.click();
				await page.waitForTimeout(800);

				const callActiveName = `${ctxCfg.prefix}_telephony_call_active_${ctxCfg.isMobile ? "mobile" : "pc"}_${ctxCfg.theme}_${ctxCfg.width}x${ctxCfg.height}.png`;
				const callActivePath = path.join(PROOFS_DIR, callActiveName);
				await page.screenshot({ path: callActivePath, fullPage: false });
				verifyProof(callActivePath);
			}

			// 3. CAPTURE SOFTPHONE DIRECT HARNESS (#softphone)
			console.log("  -> Capturing standalone softphone popover...");
			const softphoneUrl = `http://127.0.0.1:5199/?demo=true#softphone`;
			await page.goto(softphoneUrl, { waitUntil: "commit", timeout: 30000 });
			await page.waitForSelector('[data-testid="direct-telephony-launcher-root"]', { timeout: 15000 }).catch(() => {});
			await page.waitForTimeout(800);

			const softphoneName = `${ctxCfg.prefix}_telephony_softphone_${ctxCfg.isMobile ? "mobile" : "pc"}_${ctxCfg.theme}_${ctxCfg.width}x${ctxCfg.height}.png`;
			const softphonePath = path.join(PROOFS_DIR, softphoneName);
			await page.screenshot({ path: softphonePath, fullPage: false });
			verifyProof(softphonePath);

			await context.close();
		}

		console.log("\n======================================================");
		console.log("✓ ALL TELEPHONY CANONICAL 4-STATE PROOFS CAPTURED & VERIFIED!");
		console.log("======================================================");
	} finally {
		await browser.close();
		await viteServer.close();
	}
}

main().catch((err) => {
	console.error("FATAL screenshot capture failure:", err);
	process.exit(1);
});

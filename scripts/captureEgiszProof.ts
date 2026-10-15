import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_DIR = path.resolve(process.cwd(), "docs/proofs/egisz");

if (!fs.existsSync(TARGET_DIR)) {
	fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function getAuthTokens() {
	const uniqueId = Date.now();
	const email = `doctor-egisz-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[AUTH] Setting up test clinic: ${email}`);
	try {
		const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				clinicName: "Клиника Стоматологии «ДЕНТЕ»",
				email,
				password,
				ownerName: "Д-р Барабаш Сергей Владимирович",
				ownerPin,
			}),
		});

		if (initRes.ok) {
			const initData = (await initRes.json()) as any;
			const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": initData.clinicToken,
				},
				body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
			});
			if (unlockRes.ok) {
				const unlockData = (await unlockRes.json()) as any;
				return {
					clinicToken: initData.clinicToken,
					staffToken: unlockData.staffToken,
					organizationId: initData.organizationId,
					userId: initData.ownerUserId,
				};
			}
		}
	} catch (e) {
		console.warn("Backend auth fetch failed, falling back to local credentials:", e);
	}

	return {
		clinicToken: "demo-clinic-token-egisz",
		staffToken: "demo-staff-token-egisz",
		organizationId: "00000000-0000-4000-8000-000000000000",
		userId: "00000000-0000-4000-8000-000000000001",
	};
}

async function run() {
	console.log("Acquiring auth session...");
	const auth = await getAuthTokens();
	console.log("Auth session ready.");

	console.log("Launching Google Chrome via Playwright...");
	const browser = await chromium.launch({
		executablePath: CHROME_PATH,
		headless: true,
	});

	const targets = [
		{
			id: "egisz_pc_light_1440x900",
			filename: "egisz_pc_light_1440x900.png",
			viewport: { width: 1440, height: 900 },
			isDark: false,
			isMobile: false,
			section: "queue",
		},
		{
			id: "egisz_pc_dark_1440x900",
			filename: "egisz_pc_dark_1440x900.png",
			viewport: { width: 1440, height: 900 },
			isDark: true,
			isMobile: false,
			section: "tax_deduction",
		},
		{
			id: "egisz_mobile_light_390x844",
			filename: "egisz_mobile_light_390x844.png",
			viewport: { width: 390, height: 844 },
			isDark: false,
			isMobile: true,
			section: "queue",
		},
		{
			id: "egisz_mobile_dark_390x844",
			filename: "egisz_mobile_dark_390x844.png",
			viewport: { width: 390, height: 844 },
			isDark: true,
			isMobile: true,
			section: "tax_deduction",
		},
	];

	for (const target of targets) {
		console.log(`\nCapturing ${target.id} (${target.filename})...`);
		const context = await browser.newContext({
			viewport: target.viewport,
			colorScheme: target.isDark ? "dark" : "light",
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();

		await page.addInitScript(
			({ cToken, sToken, isDark }) => {
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", sToken);
				localStorage.setItem("dente_theme_mode", isDark ? "dark" : "light");
				localStorage.setItem("dente_workspace_perspective", "doctor");
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done" })
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "doctor",
						selectedSpecialty: "therapist",
						onboardingDismissed: true,
					})
				);
			},
			{
				cToken: auth.clinicToken,
				sToken: auth.staffToken,
				isDark: target.isDark,
			}
		);

		await page.goto(`${APP_BASE}/?certificates=1#schedule`, { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(3000);
		try {
			await page.waitForSelector(".app-shell, .nav-item, nav, #root", { timeout: 10000 });
		} catch {
			// fallback
		}
		await page.waitForTimeout(1500);

		// Apply theme class to html/body with retry against navigation
		for (let retry = 0; retry < 5; retry++) {
			try {
				await page.evaluate((isDark) => {
					document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
					document.documentElement.classList.toggle("dark", isDark);
					document.documentElement.classList.toggle("light", !isDark);
					document.body.className = isDark ? "dark" : "light";
				}, target.isDark);
				break;
			} catch {
				await page.waitForTimeout(1000);
			}
		}

		// Dispatch open-egisz-certificates event with retry loop
		let modalVisible = false;
		for (let attempt = 0; attempt < 10; attempt++) {
			await page.evaluate((sec) => {
				window.dispatchEvent(
					new CustomEvent("dente:open-egisz-certificates", {
						detail: { section: sec },
					})
				);
				window.dispatchEvent(
					new CustomEvent("dente-open-egisz-certificates", {
						detail: { section: sec },
					})
				);
			}, target.section);
			modalVisible = await page
				.locator('[data-testid="egisz-certificates-hub-modal"]')
				.isVisible()
				.catch(() => false);
			if (modalVisible) break;
			await page.waitForTimeout(1000);
		}

		if (!modalVisible) {
			const debugPath = path.join(TARGET_DIR, `debug_${target.id}.png`);
			await page.screenshot({ path: debugPath });
			console.error(`Modal not visible for ${target.id}. Debug screenshot saved: ${debugPath}`);
			console.error(`Current URL: ${page.url()}`);
		}

		// Wait specifically for certificates modal
		await page.waitForSelector('[data-testid="egisz-certificates-hub-modal"]', { timeout: 15000 });
		await page.waitForTimeout(1000);

		// Switch to requested section tab
		if (target.section === "tax_deduction") {
			const taxTab = page.locator('button[role="tab"]:has-text("Справка 3-НДФЛ")');
			if ((await taxTab.count()) > 0) {
				await taxTab.first().click();
				await page.waitForTimeout(800);
			}
		} else if (target.section === "extracts") {
			const extTab = page.locator('button[role="tab"]:has-text("Выписки и справки")');
			if ((await extTab.count()) > 0) {
				await extTab.first().click();
				await page.waitForTimeout(800);
			}
		} else if (target.section === "queue") {
			const queueTab = page.locator('button[role="tab"]:has-text("Фоновый журнал")');
			if ((await queueTab.count()) > 0) {
				await queueTab.first().click();
				await page.waitForTimeout(800);
			}
		}

		await page.waitForTimeout(1000);

		const outPath = path.join(TARGET_DIR, target.filename);
		await page.screenshot({ path: outPath, fullPage: false });

		const stat = fs.statSync(outPath);
		const hash = crypto.createHash("md5").update(fs.readFileSync(outPath)).digest("hex");
		console.log(`Saved: ${outPath}`);
		console.log(`Size: ${(stat.size / 1024).toFixed(1)} KB (bytes: ${stat.size}), MD5: ${hash}`);

		if (stat.size < 20 * 1024) {
			throw new Error(`Screenshot size ${stat.size} is less than 20 KB minimum threshold!`);
		}

		await context.close();
	}

	await browser.close();
	console.log("\nAll 4 EGISZ visual proof screenshots captured successfully!");
}

run().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});

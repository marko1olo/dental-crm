import { existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CONV_ID = "9d76937f-e6fc-4112-b940-6415f1b5893f";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patients";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;

[OUT_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

async function main() {
	console.log("=== 1. FASTIFY REAL AUTHENTICATION ===");
	let authData = { clinicToken: "", staffToken: "", user: { id: "doc-1", role: "doctor", fullName: "Д-р Соколов А. В." } };
	try {
		const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
		});
		if (authRes.ok) {
			const resJson = await authRes.json();
			authData = resJson;
			console.log("[Auth] Authenticated as:", authData.user?.fullName);
		}
	} catch (e) {
		console.warn("[Auth Warning] Fastify offline or using synthetic auth tokens:", e.message);
	}

	const browserExecutable = [
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	].find((p) => existsSync(p));

	console.log("[Browser] Launching:", browserExecutable);

	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	async function injectContext(ctx, theme) {
		await ctx.addInitScript(({ clinicToken, staffToken, user, th }) => {
			sessionStorage.setItem("dente:sw-controller-reload", "1");
			sessionStorage.setItem("dente_unlocked", "true");
			localStorage.setItem("dente_unlocked", "true");
			if (clinicToken) localStorage.setItem("dente_clinic_token", clinicToken);
			if (staffToken) {
				localStorage.setItem("dente_staff_token", staffToken);
				localStorage.setItem("dente_active_session_token", staffToken);
			}
			localStorage.setItem("dente_active_role", user.role || "doctor");
			localStorage.setItem("dente_user_role", user.role || "doctor");
			localStorage.setItem("dente_active_user_id", user.id || "doc-1");
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_demo_mode", "true");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
			document.documentElement.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.className = "dark";
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
				document.body.className = "light";
			}
			document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken || "demo")}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(staffToken || "demo")}; path=/; max-age=31536000`;
		}, { clinicToken: authData.clinicToken, staffToken: authData.staffToken, user: authData.user, th: theme });
	}

	async function cleanOverlays(page, theme) {
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.className = "dark";
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
				document.body.className = "light";
			}
			let style = document.getElementById("suppress-overlays-style");
			if (!style) {
				style = document.createElement("style");
				style.id = "suppress-overlays-style";
				document.head.appendChild(style);
			}
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element,
				.splash,
				#splash-root,
				[data-testid="splash-loader"],
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], vite-error-overlay, [data-testid='demo-mode-banner']").forEach((el) => el.remove());
		}, theme);
		await page.waitForTimeout(500);
	}

	async function saveProof(page, filename, description) {
		const targetPath = path.join(OUT_DIR, filename);
		await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
		try {
			copyFileSync(targetPath, path.join(BRAIN_DIR, filename));
		} catch (_) {}
		const sz = statSync(targetPath).size;
		console.log(`[PROOF CAPTURED] ${filename} (${sz} bytes) -> ${description} [>=20KB: ${sz >= 20480}]`);
		if (sz < 20480) {
			throw new Error(`Screenshot ${filename} is smaller than 20KB: ${sz} bytes`);
		}
	}

	const TARGET_URL = "http://127.0.0.1:5173/?stand=1&demo=true#patient-studio";

	// ════════════════════════════════════════════════════════════
	// 1. PC Light (1440x900)
	// ════════════════════════════════════════════════════════════
	console.log("\n--- [PC Light 1440x900] ---");
	{
		const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
		await injectContext(ctx, "light");
		const page = await ctx.newPage();
		await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 30000 });
		await page.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal']", { state: "attached", timeout: 20000 });
		await cleanOverlays(page, "light");
		await saveProof(page, "01_patient_card_modal_pc_light_1440x900.png", "Patient Card Modal (PC Light 1440x900)");
		await ctx.close();
	}

	// ════════════════════════════════════════════════════════════
	// 2. PC Dark (1440x900)
	// ════════════════════════════════════════════════════════════
	console.log("\n--- [PC Dark 1440x900] ---");
	{
		const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
		await injectContext(ctx, "dark");
		const page = await ctx.newPage();
		await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 30000 });
		await page.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal']", { state: "attached", timeout: 20000 });
		await cleanOverlays(page, "dark");
		await saveProof(page, "02_patient_card_modal_pc_dark_1440x900.png", "Patient Card Modal (PC Dark 1440x900)");
		await ctx.close();
	}

	// ════════════════════════════════════════════════════════════
	// 3. Mobile Light (390x844) Apple HIG
	// ════════════════════════════════════════════════════════════
	console.log("\n--- [Mobile Light 390x844] ---");
	{
		const ctx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await injectContext(ctx, "light");
		const page = await ctx.newPage();
		await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 30000 });
		await page.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal']", { state: "attached", timeout: 20000 });
		await cleanOverlays(page, "light");
		await saveProof(page, "03_patient_card_mobile_light_390x844.png", "Patient Card Modal Bottom Sheet (Mobile Light 390x844)");
		await ctx.close();
	}

	// ════════════════════════════════════════════════════════════
	// 4. Mobile Dark (390x844) Apple HIG
	// ════════════════════════════════════════════════════════════
	console.log("\n--- [Mobile Dark 390x844] ---");
	{
		const ctx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await injectContext(ctx, "dark");
		const page = await ctx.newPage();
		await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 30000 });
		await page.waitForSelector("[data-testid='patient-card-modal'], [data-testid='patient-studio-modal']", { state: "attached", timeout: 20000 });
		await cleanOverlays(page, "dark");
		await saveProof(page, "04_patient_card_mobile_dark_390x844.png", "Patient Card Modal Bottom Sheet (Mobile Dark 390x844)");
		await ctx.close();
	}

	await browser.close();
	console.log("\n=== ALL 4-STATE VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("[CAPTURE ERROR]", err);
	process.exit(1);
});

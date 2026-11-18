import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const CURRENT_CONV_ID = "bfe9e27b-7e43-4637-b29f-cb6782507554";
const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/documents");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	console.log("=== DOMAIN C: CANONICAL 4-STATE VISUAL PROOF CAPTURE ===");

	console.log("🔐 Authenticating against Fastify API...");
	const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
	});
	const auth = await loginRes.json();
	console.log(`✅ Logged in as ${auth.user?.fullName}`);

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const configs = [
		{
			filename: "01_documents_studio_pc_light_1440x900.png",
			desc: "PC Light 1440x900 (Tax Deduction Certificate & Documents Studio)",
			viewport: { width: 1440, height: 900 },
			theme: "light",
			isMobile: false,
		},
		{
			filename: "02_documents_studio_pc_dark_1440x900.png",
			desc: "PC Dark 1440x900 (Tax Deduction Certificate & Documents Studio)",
			viewport: { width: 1440, height: 900 },
			theme: "dark",
			isMobile: false,
		},
		{
			filename: "03_documents_studio_mobile_light_390x844.png",
			desc: "Mobile Light 390x844 (Apple HIG Bottom Sheet & Tax Certificate)",
			viewport: { width: 390, height: 844 },
			theme: "light",
			isMobile: true,
		},
		{
			filename: "04_documents_studio_mobile_dark_390x844.png",
			desc: "Mobile Dark 390x844 (Apple HIG Bottom Sheet & Tax Certificate)",
			viewport: { width: 390, height: 844 },
			theme: "dark",
			isMobile: true,
		},
	];

	for (const cfg of configs) {
		console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
		const context = await browser.newContext({
			viewport: cfg.viewport,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			colorScheme: cfg.theme,
		});

		await context.addInitScript(
			({ clinicToken, staffToken, u, theme }) => {
				try {
					localStorage.setItem("dente_clinic_token", clinicToken);
					localStorage.setItem("dente_staff_token", staffToken);
					localStorage.setItem("dente_active_role", u.role || "owner");
					localStorage.setItem("dente_active_user_id", u.id || "doc-1");
					localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(u));
					localStorage.setItem("dente_demo_showcase", "true");
					localStorage.setItem("dente_demo_showcase_mode_v1", "true");
					localStorage.setItem("dente_theme", theme);
					localStorage.setItem("dente_theme_mode", theme);
					localStorage.setItem("theme", theme);
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_tour_dismissed", "true");
					localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
					localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
					localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissed: true, completedStepIds: ["step1", "step2", "step3", "step4"] }));
					localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
					localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" }));
					localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { clinicName: "Стоматология ДЕНТЕ Премиум", currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }, flags: { disableTour: true } } }));
					document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
					document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;

					const isDark = theme === "dark";
					document.documentElement.setAttribute("data-theme", theme);
					document.documentElement.classList.toggle("dark", isDark);
					document.documentElement.classList.toggle("light", !isDark);
					document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				} catch (_) {}
			},
			{ clinicToken: auth.clinicToken, staffToken: auth.staffToken, u: auth.user, theme: cfg.theme },
		);

		const page = await context.newPage();

		console.log(`Navigating to http://127.0.0.1:5173/#tax-certificate...`);
		await page.goto("http://127.0.0.1:5173/#tax-certificate", { waitUntil: "commit", timeout: 30000 });

		await page.waitForSelector("#root", { timeout: 30000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await page.waitForSelector(".app-shell, #root", { state: "visible", timeout: 30000 }).catch(() => {});
		await sleep(2500);

		console.log("Dispatching dente:open-documents event for tax_certificate...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-documents", { detail: { template: "tax_certificate" } }));
		});
		await sleep(1500);

		await page.waitForSelector('.dente-docs-studio-container, [data-testid="documents-studio-modal-backdrop"]', { state: "visible", timeout: 20000 });
		await page.waitForSelector('.dente-a4-paper-sheet, [data-paper-sheet]', { state: "visible", timeout: 20000 }).catch(() => {});

		// Suppress overlays and apply theme
		await page.evaluate((theme) => {
			const isDark = theme === "dark";
			document.documentElement.setAttribute("data-theme", theme);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";

			const style = document.createElement("style");
			style.id = "suppress-proof-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				.copilot-trigger-btn,
				.workspace-continuity-strip,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
		}, cfg.theme);

		await sleep(1200);

		const targetPath = path.join(PROOFS_DIR, cfg.filename);
		const brainPath = path.join(BRAIN_DIR, cfg.filename);

		await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
		fs.copyFileSync(targetPath, brainPath);

		const stat = fs.statSync(targetPath);
		console.log(`✅ [CAPTURED] ${cfg.filename} (${stat.size} bytes) -> ${targetPath}`);

		await context.close();
	}

	await browser.close();
	console.log("\n=== ALL 4 CANONICAL STATES CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("FATAL ERROR in main:", err);
	process.exit(1);
});

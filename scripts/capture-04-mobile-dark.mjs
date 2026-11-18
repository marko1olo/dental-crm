import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const CURRENT_CONV_ID = "bfe9e27b-7e43-4637-b29f-cb6782507554";
const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/documents");
const BRAIN_DIR = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
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

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		deviceScaleFactor: 2,
		colorScheme: "dark",
	});

	await context.addInitScript(
		({ clinicToken, staffToken, u }) => {
			try {
				localStorage.setItem("dente_clinic_token", clinicToken);
				localStorage.setItem("dente_staff_token", staffToken);
				localStorage.setItem("dente_active_role", u.role || "owner");
				localStorage.setItem("dente_active_user_id", u.id || "doc-1");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(u));
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_demo_showcase_mode_v1", "true");
				localStorage.setItem("dente_theme", "dark");
				localStorage.setItem("dente_theme_mode", "dark");
				localStorage.setItem("theme", "dark");
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

				document.documentElement.setAttribute("data-theme", "dark");
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.documentElement.style.colorScheme = "dark";
			} catch (_) {}
		},
		{ clinicToken: auth.clinicToken, staffToken: auth.staffToken, u: auth.user },
	);

	const page = await context.newPage();

	console.log("Navigating to http://127.0.0.1:5173/...");
	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 60000 });

	console.log("Waiting for boot state detached...");
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
	console.log("Waiting for app-shell visible...");
	await page.waitForSelector(".app-shell, #root", { state: "visible", timeout: 30000 }).catch(() => {});
	await sleep(2000);

	console.log("Dispatching dente:open-documents event for tax_certificate...");
	await page.evaluate(() => {
		window.dispatchEvent(new CustomEvent("dente:open-documents", { detail: { template: "tax_certificate" } }));
	});
	await sleep(1000);

	console.log("Waiting for documents studio modal container...");
	await page.waitForSelector('.dente-docs-studio-container, [data-testid="documents-studio-modal-backdrop"]', { state: "visible", timeout: 20000 });
	console.log("Modal is visible! Waiting for paper sheet...");
	await page.waitForSelector('.dente-a4-paper-sheet, [data-paper-sheet]', { state: "visible", timeout: 20000 }).catch(() => {});

	// Suppress overlays and apply dark theme
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		document.body.classList.add("dark");
		document.body.classList.remove("light");
		document.documentElement.style.colorScheme = "dark";

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
	});

	await sleep(1500);

	const filename = "04_documents_studio_mobile_dark_390x844.png";
	const targetPath = path.join(PROOFS_DIR, filename);
	const brainPath = path.join(BRAIN_DIR, filename);

	await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });
	fs.copyFileSync(targetPath, brainPath);

	const stat = fs.statSync(targetPath);
	console.log(`✅ [CAPTURED] ${filename} (${stat.size} bytes) -> ${targetPath}`);

	// Also re-capture 01, 02 to apply the dark-badge improvement if needed
	await browser.close();
}

main().catch((err) => {
	console.error("FATAL:", err);
	process.exit(1);
});

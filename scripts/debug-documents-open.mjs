import { chromium } from "playwright";

async function test() {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissed: true, completedStepIds: ["step1", "step2", "step3", "step4"] }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" }));
		localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { clinicName: "Стоматология ДЕНТЕ Премиум", currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }, flags: { disableTour: true } } }));
	});

	const page = await context.newPage();
	page.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
	page.on("pageerror", (err) => console.error("[BROWSER ERROR]", err));

	console.log("Navigating to http://127.0.0.1:5173/#tax-certificate...");
	await page.goto("http://127.0.0.1:5173/#tax-certificate", { waitUntil: "domcontentloaded", timeout: 60000 });
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
	await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 }).catch(() => {});
	console.log("App shell ready! Checking modal...");

	await page.waitForTimeout(2000);
	const html = await page.evaluate(() => document.body.innerHTML);
	console.log("Has modal backdrop?", html.includes("documents-studio-modal-backdrop"));
	console.log("Has fns modal?", html.includes("fns-tax-certificate-modal"));
	console.log("Has dente-docs-studio-container?", html.includes("dente-docs-studio-container"));

	if (!html.includes("documents-studio-modal-backdrop")) {
		console.log("Dispatching dente:open-documents event...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-documents", { detail: { template: "tax_certificate" } }));
		});
		await page.waitForTimeout(2000);
		const html2 = await page.evaluate(() => document.body.innerHTML);
		console.log("After dispatch: Has backdrop?", html2.includes("documents-studio-modal-backdrop"));
		console.log("After dispatch: Has fns modal?", html2.includes("fns-tax-certificate-modal"));
	}

	await browser.close();
}

test().catch(console.error);

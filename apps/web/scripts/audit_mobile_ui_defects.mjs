import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/29510b6c-103f-4931-9052-ff72f199f38a";
if (!existsSync(BRAIN_DIR)) {
	mkdirSync(BRAIN_DIR, { recursive: true });
}

const edgePaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const executablePath = edgePaths.find((p) => existsSync(p));

async function runMobileAudit() {
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});
	const page = await context.newPage();

	await page.addInitScript(() => {
		window.localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
		window.localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
		window.localStorage.setItem("dente_demo_showcase_active", "true");
		window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ onboardingDismissed: true }));
		window.localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		window.localStorage.setItem("dente_onboarding_strip_dismissed", "true");
		window.localStorage.setItem("dente_theme", "light");
		window.localStorage.setItem("dente_theme_mode", "light");
		window.localStorage.setItem("active_staff_user", JSON.stringify({
			id: "01a00000-0000-0000-0000-000000000002",
			fullName: "Д-р Соколов А. В.",
			role: "doctor",
			email: "doctor@clinic.com",
			organizationId: "01a00000-0000-0000-0000-000000000001",
			specialization: "Терапевт",
		}));
	});

	console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#visit ...");
	await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
	await page.waitForSelector(".workspace, .tooth-card, .mobile-chairside-container, .specialty-focus-bar", { timeout: 45000 });
	await page.waitForTimeout(3000);

	const steps = [
		{ id: "step1", name: "1. Жалобы" },
		{ id: "step2", name: "2. Осмотр" },
		{ id: "step3", name: "3. Диагноз" },
		{ id: "step4", name: "4. Лечение" },
	];

	for (const step of steps) {
		console.log(`\n--- Mobile Step: ${step.name} ---`);
		const stepBtn = page.locator(`button:has-text('${step.name}')`).first();
		if (await stepBtn.isVisible()) {
			await stepBtn.click();
			await page.waitForTimeout(1000);
			const shotPath = path.join(BRAIN_DIR, `audit_mobile_${step.id}.png`);
			await page.screenshot({ path: shotPath });
			console.log(`Saved screenshot for ${step.id}: ${shotPath}`);

			// Check for horizontal overflow
			const overflow = await page.evaluate(() => {
				const width = document.documentElement.clientWidth;
				return Array.from(document.querySelectorAll("*"))
					.map(el => {
						const r = el.getBoundingClientRect();
						return { tag: el.tagName, cls: el.className?.toString().slice(0, 60), r: r.right, w: width };
					})
					.filter(x => x.r > x.w + 2)
					.slice(0, 5);
			});
			if (overflow.length > 0) {
				console.log(`Horizontal overflow on ${step.id}:`, JSON.stringify(overflow, null, 2));
			}

			// Check for unstyled buttons
			const unstyled = await page.evaluate(() => {
				return Array.from(document.querySelectorAll("button"))
					.filter(b => {
						const r = b.getBoundingClientRect();
						const s = window.getComputedStyle(b);
						const isVis = r.width > 0 && r.height > 0 && s.display !== "none";
						const isClassless = !b.className || b.className.trim() === "";
						const hasDefaultBorder = s.borderStyle === "outset";
						return isVis && (isClassless || hasDefaultBorder);
					})
					.map(b => ({
						text: (b.innerText || b.getAttribute("aria-label") || "").trim().slice(0, 50),
						cls: b.className,
						parent: b.parentElement?.tagName + "." + b.parentElement?.className,
					}));
			});
			if (unstyled.length > 0) {
				console.log(`Unstyled buttons on ${step.id}:`, JSON.stringify(unstyled, null, 2));
			}
		}
	}

	await browser.close();
}

runMobileAudit().catch(console.error);

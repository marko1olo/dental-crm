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

async function runAudit() {
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
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

	console.log("Navigating to http://127.0.0.1:5173/?demo=true#visit ...");
	await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
	await page.waitForSelector(".workspace, .tooth-card, .mobile-chairside-container, .specialty-focus-bar", { timeout: 45000 });
	await page.waitForTimeout(3000);

	// Audit all buttons on the page for missing classes or default user-agent styles
	const buttonAudit = await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll("button"));
		const unstyled = [];
		for (const btn of buttons) {
			const cls = btn.getAttribute("class") || "";
			const text = (btn.innerText || btn.getAttribute("aria-label") || btn.getAttribute("title") || "").trim();
			const testId = btn.getAttribute("data-testid") || "";
			const style = window.getComputedStyle(btn);
			
			// Detect if button has default ugly borders/backgrounds or no classes
			const isClassless = !cls || cls.trim() === "";
			const hasDefaultGray = style.backgroundColor === "rgb(239, 239, 239)" || style.backgroundColor === "rgba(0, 0, 0, 0)";
			const hasDefaultBorder = style.borderStyle === "outset" || (style.borderWidth === "2px" && style.borderColor === "rgb(118, 118, 118)");
			
			// Check if element is visible
			const rect = btn.getBoundingClientRect();
			const isVisible = rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";

			if (isVisible && (isClassless || hasDefaultBorder)) {
				unstyled.push({
					text: text.slice(0, 60),
					cls,
					testId,
					width: rect.width,
					height: rect.height,
					bg: style.backgroundColor,
					border: style.border,
					parent: btn.parentElement?.className || btn.parentElement?.tagName,
				});
			}
		}
		return { totalButtons: buttons.length, unstyled };
	});

	console.log(`Total buttons found: ${buttonAudit.totalButtons}`);
	console.log(`Potentially unstyled buttons (${buttonAudit.unstyled.length}):`, JSON.stringify(buttonAudit.unstyled, null, 2));

	// Audit overflow-x horizontal drift
	const overflowAudit = await page.evaluate(() => {
		const docWidth = document.documentElement.clientWidth;
		const elements = Array.from(document.querySelectorAll("*"));
		const overflowing = [];
		for (const el of elements) {
			const rect = el.getBoundingClientRect();
			if (rect.right > docWidth + 5) {
				overflowing.push({
					tag: el.tagName,
					cls: el.className?.toString().slice(0, 80),
					right: rect.right,
					docWidth,
					diff: rect.right - docWidth,
				});
			}
		}
		return overflowing.slice(0, 10);
	});
	console.log(`Elements causing horizontal overflow (${overflowAudit.length}):`, JSON.stringify(overflowAudit, null, 2));

	// Check tabs switching and capture each tab
	const tabs = [
		{ id: "odontogram", label: "1. Зубная формула" },
		{ id: "emk", label: "2. Дневник приёма" },
		{ id: "diagnostics", label: "3. Диагностика и снимки" },
		{ id: "plan", label: "4. План лечения" },
		{ id: "consents", label: "5. Согласия" },
		{ id: "anamnesis", label: "6. Анамнез" },
	];

	for (const tab of tabs) {
		console.log(`\nTesting Tab: ${tab.label}`);
		const tabBtn = page.locator(`button:has-text('${tab.label}'), button[data-testid='visit-subtab-${tab.id}']`).first();
		if (await tabBtn.isVisible()) {
			await tabBtn.click();
			await page.waitForTimeout(1000);
			const shotPath = path.join(BRAIN_DIR, `audit_tab_${tab.id}.png`);
			await page.screenshot({ path: shotPath });
			console.log(`Saved screenshot for ${tab.id}: ${shotPath}`);

			// Check for unstyled buttons in this tab
			const tabButtonAudit = await page.evaluate(() => {
				const buttons = Array.from(document.querySelectorAll("button"));
				return buttons.filter(b => {
					const r = b.getBoundingClientRect();
					const s = window.getComputedStyle(b);
					const isVis = r.width > 0 && r.height > 0 && s.display !== "none";
					const isClassless = !b.className || b.className.trim() === "";
					const hasDefaultBorder = s.borderStyle === "outset";
					return isVis && (isClassless || hasDefaultBorder);
				}).map(b => ({
					text: (b.innerText || b.getAttribute("aria-label") || "").trim().slice(0, 50),
					cls: b.className,
					parent: b.parentElement?.tagName + "." + b.parentElement?.className,
				}));
			});
			if (tabButtonAudit.length > 0) {
				console.log(`Unstyled buttons in tab ${tab.id}:`, JSON.stringify(tabButtonAudit, null, 2));
			}
		}
	}

	await browser.close();
}

runAudit().catch(console.error);

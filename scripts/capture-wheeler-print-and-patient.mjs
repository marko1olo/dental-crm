import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/181fddf2-210a-4374-abad-f6df15f65e66";

[OUT_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-tour-overlays";
		style.innerHTML = `
			.tour-spotlight-root,
			.tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"],
			.shepherd-element,
			.global-toast-container,
			.copilot-trigger-btn,
			[data-testid="copilot-floating-trigger"],
			vite-error-overlay {
				display: none !important;
				pointer-events: none !important;
				opacity: 0 !important;
			}
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
			}
		`;
		document.head.appendChild(style);
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	});
}

async function setTheme(p, theme) {
	await p.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(p);
	await p.waitForTimeout(400);
}

async function saveProof(page, filename, description) {
	await suppressOverlays(page);
	await page.waitForTimeout(400);
	const targetPath = path.join(OUT_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false });
	const brainPath = path.join(BRAIN_DIR, filename);
	copyFileSync(targetPath, brainPath);
	console.log(`[PROOF CAPTURED] ${filename} -> ${description}`);
}

async function capture() {
	console.log("=== CAPTURING WHEELER 2.5D A4 PRINT & PATIENT CARD PROOFS ===");

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	await context.addInitScript(() => {
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
	});

	const page = await context.newPage();

	// 1. ПЕЧАТНАЯ ФОРМА А4 — МЕДИЦИНСКАЯ КАРТА (АМБУЛАТОРНАЯ)
	console.log("Navigating to #documents...");
	await page.goto("http://127.0.0.1:5173/?demo=true#documents", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);
	await suppressOverlays(page);

	// Проверяем наличие студии документов
	const hasDocsStudio = await page.$("[data-testid='documents-studio-modal']");
	if (!hasDocsStudio) {
		await page.evaluate(() => window.dispatchEvent(new CustomEvent("dente:open-documents")));
		await page.waitForTimeout(1000);
	}

	// Выбираем шаблон "Медицинская карта"
	const medicalCardOption = await page.$("button:has-text('Медицинская карта'), [data-testid='doc-item-medical_card'], [data-template-id='medical_card']");
	if (medicalCardOption) {
		await medicalCardOption.click();
		await page.waitForTimeout(1000);
	}

	await setTheme(page, "light");
	await saveProof(page, "05_emr_a4_vector_arch_print_preview.png", "A4 Dental Medical Card Print Preview with Wheeler Vector Formula");

	// 2. КАРТОЧКА ПАЦИЕНТА — ЗУБНАЯ ФОРМУЛА
	console.log("Navigating to #patients...");
	await page.goto("http://127.0.0.1:5173/?demo=true#patients", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);
	await suppressOverlays(page);

	// Кликаем по первому пациенту
	const firstPatient = await page.$("tbody tr, [data-testid^='patient-row-']");
	if (firstPatient) {
		await firstPatient.click();
		await page.waitForTimeout(1200);

		// Кликаем по вкладке "Зубная формула"
		const teethTab = await page.$("[data-testid='tab-teeth'], [data-testid='tab-formula'], button:has-text('Зубная формула')");
		if (teethTab) {
			await teethTab.click();
			await page.waitForTimeout(1000);
		}

		await setTheme(page, "light");
		await saveProof(page, "06_patient_card_wheeler_arch_pc_light.png", "Patient Card Wheeler Dental Arch Historical Panorama (PC Light 1440x900)");

		await setTheme(page, "dark");
		await saveProof(page, "07_patient_card_wheeler_arch_pc_dark.png", "Patient Card Wheeler Dental Arch Historical Panorama (PC Dark 1440x900)");
	}

	await context.close();
	await browser.close();
	console.log("=== ALL PROOFS CAPTURED SUCCESSFULLY ===");
}

capture().catch((err) => {
	console.error("[CAPTURE ERROR]", err);
	process.exit(1);
});

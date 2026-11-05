const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = "911b2226-65cb-4fc4-a6a0-88f0b41b3735";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/clinical_bridge");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function waitForAppReady(page) {
	await page.waitForFunction(() => {
		const text = document.body ? document.body.innerText : "";
		return text.length > 50;
	}, { timeout: 20000 });
	await page.waitForTimeout(1500);
}

async function saveProof(page, filename, description) {
	await page.waitForTimeout(800);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, timeout: 15000 });
	fs.copyFileSync(pDocs, pBrain);
	const size = fs.statSync(pDocs).size;
	if (size < 20000) {
		throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${size} bytes!`);
	}
	console.log(`[PROOF CAPTURED] ${filename} (${size} bytes) -> ${description}`);
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.classList.add("light");
			document.body.classList.remove("dark");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(400);
}

async function run() {
	console.log("[Clinical Bridge Proofs] Launching Playwright Chromium...");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ================= PC CONTEXT (1440x900) =================
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-token");
			localStorage.setItem("dente_staff_token", "demo-token");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_demo_mode", "true");
		});
		const pcPage = await pcContext.newPage();
		
		console.log("[Setup] Opening Visit & Odontogram on PC (1440x900)...");
		await pcPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitForAppReady(pcPage);

		// Захват 1: PC Light Visit & Odontogram
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "clinical_bridge_visit_pc_light_1440x900.png", "Визит и одонтограмма (PC Light)");

		// Захват 2: PC Dark Visit & Odontogram
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "clinical_bridge_visit_pc_dark_1440x900.png", "Визит и одонтограмма (PC Dark)");

		// Открываем Копайлот через эвент или URL
		console.log("[Setup] Opening Copilot Studio Modal on PC...");
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: { tooth: 36, patientId: "pat-36", patientName: "Кузнецов М.П." }
			}));
		});
		await pcPage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 15000 });
		await pcPage.waitForTimeout(1000);

		// Захват 3: PC Dark Copilot Studio with Visit Digest
		await saveProof(pcPage, "clinical_bridge_copilot_pc_dark_1440x900.png", "Копайлот и клинический дайджест (PC Dark)");

		// Захват 4: PC Light Copilot Studio with Visit Digest
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "clinical_bridge_copilot_pc_light_1440x900.png", "Копайлот и клинический дайджест (PC Light)");

		// СЦЕНАРИЙ А: Врач расставил зубы 16, 26, 36 на одонтограмме
		console.log("[Setup] Injecting multi-tooth clinical findings (16, 26, 36)...");
		await pcPage.evaluate(() => {
			if (window.__useVisitStore) {
				const s = window.__useVisitStore.getState();
				s.setVisitToothRecord("16", { toothNumber: 16, state: "caries", diagnosis: "Кариес дентина (Зуб 16)", diagnosisIcd10: "K02.1", treatmentPlan: "Препарирование и пломба Estelite" });
				s.setVisitToothRecord("26", { toothNumber: 26, state: "pulpitis", diagnosis: "Пульпит (Зуб 26)", diagnosisIcd10: "K04.0", treatmentPlan: "Эндодонтическая обработка и обтурация" });
				s.setVisitToothRecord("36", { toothNumber: 36, state: "caries", diagnosis: "Глубокий кариес (Зуб 36)", diagnosisIcd10: "K02.1", treatmentPlan: "Биодентин + реставрация Asteria" });
			}
		});
		await pcPage.waitForTimeout(500);

		// Захват Сценария А: Batch Multi-Tooth Digest в PC Dark & Light
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "clinical_bridge_batch_digest_pc_dark_1440x900.png", "Пакетный дайджест визита по 3 зубам (PC Dark)");

		await setTheme(pcPage, "light");
		await saveProof(pcPage, "clinical_bridge_batch_digest_pc_light_1440x900.png", "Пакетный дайджест визита по 3 зубам (PC Light)");

		await pcContext.close();

		// ================= MOBILE CONTEXT (390x844) =================
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
		});
		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-token");
			localStorage.setItem("dente_staff_token", "demo-token");
			localStorage.setItem("dente_role", "doctor");
			localStorage.setItem("dente_demo_mode", "true");
		});
		const mobPage = await mobileContext.newPage();
		
		console.log("[Setup] Opening Visit & Odontogram on Mobile (390x844)...");
		await mobPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitForAppReady(mobPage);

		// Захват 5: Mobile Light Visit
		await setTheme(mobPage, "light");
		await saveProof(mobPage, "clinical_bridge_visit_mobile_light_390x844.png", "Визит и одонтограмма (Mobile Light)");

		// Захват 6: Mobile Dark Visit
		await setTheme(mobPage, "dark");
		await saveProof(mobPage, "clinical_bridge_visit_mobile_dark_390x844.png", "Визит и одонтограмма (Mobile Dark)");

		// Открываем Копайлот на мобильном
		console.log("[Setup] Opening Copilot Studio Modal on Mobile...");
		await mobPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-copilot", {
				detail: { tooth: 36, patientId: "pat-36", patientName: "Кузнецов М.П." }
			}));
		});
		await mobPage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 15000 });
		await mobPage.waitForTimeout(1000);

		// Захват 7: Mobile Dark Copilot Studio
		await saveProof(mobPage, "clinical_bridge_copilot_mobile_dark_390x844.png", "Копайлот шторка (Mobile Dark)");

		// Захват 8: Mobile Light Copilot Studio
		await setTheme(mobPage, "light");
		await saveProof(mobPage, "clinical_bridge_copilot_mobile_light_390x844.png", "Копайлот шторка (Mobile Light)");

		// СЦЕНАРИЙ А (Mobile): Пакетный дайджест по 3 зубам
		console.log("[Setup] Injecting multi-tooth findings on Mobile...");
		await mobPage.evaluate(() => {
			if (window.__useVisitStore) {
				const s = window.__useVisitStore.getState();
				s.setVisitToothRecord("16", { toothNumber: 16, state: "caries", diagnosis: "Кариес дентина (Зуб 16)", diagnosisIcd10: "K02.1", treatmentPlan: "Препарирование и пломба Estelite" });
				s.setVisitToothRecord("26", { toothNumber: 26, state: "pulpitis", diagnosis: "Пульпит (Зуб 26)", diagnosisIcd10: "K04.0", treatmentPlan: "Эндодонтическая обработка и обтурация" });
				s.setVisitToothRecord("36", { toothNumber: 36, state: "caries", diagnosis: "Глубокий кариес (Зуб 36)", diagnosisIcd10: "K02.1", treatmentPlan: "Биодентин + реставрация Asteria" });
			}
		});
		await mobPage.waitForTimeout(500);

		await setTheme(mobPage, "dark");
		await saveProof(mobPage, "clinical_bridge_batch_digest_mobile_dark_390x844.png", "Пакетный дайджест визита на смартфоне (Mobile Dark)");

		await setTheme(mobPage, "light");
		await saveProof(mobPage, "clinical_bridge_batch_digest_mobile_light_390x844.png", "Пакетный дайджест визита на смартфоне (Mobile Light)");

		await mobileContext.close();
		console.log("[Clinical Bridge Proofs] All 8 proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Clinical Bridge Proofs Failed]", err);
	process.exit(1);
});

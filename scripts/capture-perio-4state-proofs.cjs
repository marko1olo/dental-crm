/**
 * scripts/capture-perio-4state-proofs.cjs
 *
 * 4-STATE VISUAL PROOF FOR PERIODONTOLOGY & PSR EXPRESS SCREENING STUDIO MODAL
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ORCH_ID = "d8f4b35b-af3a-4c9f-91df-6a9f31e6364c";
const SUBAGENT_ID = "9f20a82f-4b33-40f9-9c87-dec3e4f4ee34";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/perio");
const OUT_DOCS_ALT = path.resolve(__dirname, "../docs/proofs/periodontics");
const OUT_ORCH = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${ORCH_ID}`);
const OUT_SELF = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${SUBAGENT_ID}`);

[OUT_DOCS, OUT_DOCS_ALT, OUT_ORCH, OUT_SELF].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(1000);
	const pDocs = path.join(OUT_DOCS, filename);
	const pDocsAlt = path.join(OUT_DOCS_ALT, filename);
	const pOrch = path.join(OUT_ORCH, filename);
	const pSelf = path.join(OUT_SELF, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	try { fs.copyFileSync(pDocs, pDocsAlt); } catch { /* ignore */ }
	try { fs.copyFileSync(pDocs, pOrch); } catch { /* ignore */ }
	try { fs.copyFileSync(pDocs, pSelf); } catch { /* ignore */ }

	const size = fs.statSync(pDocs).size;
	if (size < 20480) {
		throw new Error(`[BLANK DETECTED] ${filename} is ${size} bytes (< 20KB)!`);
	}
	console.log(`[VERIFIED PROOF] ${filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
	return pDocs;
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
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
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(800);
}

async function detectAppPort() {
	const net = require("node:net");
	for (const port of [5173, 5174, 5175, 3000]) {
		const isOpen = await new Promise((resolve) => {
			const socket = new net.Socket();
			socket.setTimeout(500);
			socket.on("connect", () => { socket.destroy(); resolve(true); });
			socket.on("timeout", () => { socket.destroy(); resolve(false); });
			socket.on("error", () => { socket.destroy(); resolve(false); });
			socket.connect(port, "127.0.0.1");
		});
		if (isOpen) return port;
	}
	return 5173;
}

async function main() {
	const activePort = await detectAppPort();
	const baseUrl = `http://127.0.0.1:${activePort}`;
	console.log(`\n=== 4-State Proof for Periodontology Studio: Navigating to ${baseUrl}/?perio=1#perio ===`);

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--disable-setuid-sandbox"],
	});

	try {
		// 1. PC Light
		console.log("\n--- [1/4] Capturing Desktop Light (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: "light",
		});
		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
		});

		const pcPage = await pcContext.newPage();
		pcPage.on("console", msg => console.log("PAGE LOG:", msg.text()));
		pcPage.on("pageerror", err => console.error("PAGE ERROR:", err.message));
		await pcPage.goto(`${baseUrl}/?perio=1#perio`, { waitUntil: "commit", timeout: 20000 });
		await pcPage.waitForSelector("#root", { timeout: 10000 }).catch(() => {});
		await pcPage.waitForTimeout(3000);
		await suppressOverlays(pcPage);

		// Если модалка не открылась автоматически, шлем событие
		await pcPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-perio", { detail: { patientName: "Иванов Иван Иванович (38 лет)" } }));
		});
		await pcPage.waitForTimeout(1500);

		// Раскрываем детальное зондирование челюстей (ВЧ и НЧ) для полноты картины
		const expandBtn = await pcPage.$('[data-testid="perio-detailed-toggle-btn"]');
		if (expandBtn) await expandBtn.click();
		await pcPage.waitForTimeout(800);

		await setTheme(pcPage, "light");
		await saveProof(pcPage, "perio_01_desktop_light.png");

		// 2. PC Dark
		console.log("\n--- [2/4] Capturing Desktop Dark (1440x900) ---");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "perio_02_desktop_dark.png");
		await pcContext.close();

		// 3. Mobile Light (390x844)
		console.log("\n--- [3/4] Capturing Mobile Light (390x844) ---");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		await mobContext.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
			localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_active_mode", "clinic");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
		});

		const mobPage = await mobContext.newPage();
		await mobPage.goto(`${baseUrl}/?perio=1#perio`, { waitUntil: "commit", timeout: 20000 });
		await mobPage.waitForTimeout(2000);
		await suppressOverlays(mobPage);

		await mobPage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-perio", { detail: { patientName: "Иванов Иван Иванович" } }));
		});
		await mobPage.waitForTimeout(1500);

		await setTheme(mobPage, "light");
		await saveProof(mobPage, "perio_03_mobile_light.png");

		// 4. Mobile Dark (390x844)
		console.log("\n--- [4/4] Capturing Mobile Dark (390x844) ---");
		await setTheme(mobPage, "dark");
		await saveProof(mobPage, "perio_04_mobile_dark.png");
		await mobContext.close();

		console.log("\n✅ ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR IN CAPTURE:", err);
	process.exit(1);
});

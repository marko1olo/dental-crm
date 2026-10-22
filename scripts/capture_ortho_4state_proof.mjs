import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	const outDir = path.resolve(process.cwd(), "docs", "proofs", "orthodontics");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const saveScreen = (filename, buffer) => {
		const targetPath = path.join(outDir, filename);
		fs.writeFileSync(targetPath, buffer);
		const kb = (buffer.length / 1024).toFixed(1);
		console.log(`[PROOF CAPTURED] ${filename} (${kb} KB) -> ${targetPath}`);
	};

	let browser;
	try {
		browser = await chromium.launch({
			channel: "msedge",
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	} catch {
		browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
	}

	try {
		// ==========================================
		// 1. PC SESSION (1440x900) - Ortho Protocol
		// ==========================================
		console.log("\n=== PC Session: Ortho Protocol (1440x900) ===");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});
		const pcPage = await pcContext.newPage();

		await pcPage.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "live-token");
			localStorage.setItem("dente_staff_token", "live-token");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_demo_mode", "true");
		});

		console.log("Navigating to http://127.0.0.1:5173/?ortho-protocol=demo ...");
		await pcPage.goto("http://127.0.0.1:5173/?ortho-protocol=demo", { waitUntil: "domcontentloaded", timeout: 45000 });
		await pcPage.waitForSelector('[data-testid="orthodontic-visit-protocol-widget"]', { timeout: 30000 });
		await sleep(2000);

		// Suppress tours
		await pcPage.evaluate(() => {
			const style = document.createElement("style");
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				.shepherd-element { display: none !important; opacity: 0 !important; }
			`;
			document.head.appendChild(style);
		});
		await sleep(800);

		// 1.1 PC Light
		await pcPage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme", "light");
		});
		await sleep(800);
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		saveScreen("ortho_protocol_pc_light_1440x900.png", pcLightBuf);

		// 1.2 PC Dark
		await pcPage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			localStorage.setItem("dente_theme", "dark");
		});
		await sleep(800);
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		saveScreen("ortho_protocol_pc_dark_1440x900.png", pcDarkBuf);

		await pcContext.close();

		// ==========================================
		// 2. MOBILE SESSION (390x844) - Ortho Protocol
		// ==========================================
		console.log("\n=== Mobile Session: Ortho Protocol (390x844) ===");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		const mobilePage = await mobileContext.newPage();

		await mobilePage.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "live-token");
			localStorage.setItem("dente_staff_token", "live-token");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_demo_mode", "true");
		});

		console.log("Navigating mobile to http://127.0.0.1:5173/?ortho-protocol=demo ...");
		await mobilePage.goto("http://127.0.0.1:5173/?ortho-protocol=demo", { waitUntil: "domcontentloaded", timeout: 45000 });
		await mobilePage.waitForSelector('[data-testid="orthodontic-visit-protocol-widget"]', { timeout: 30000 });
		await sleep(2000);

		await mobilePage.evaluate(() => {
			const style = document.createElement("style");
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				.shepherd-element { display: none !important; opacity: 0 !important; }
			`;
			document.head.appendChild(style);
		});
		await sleep(800);

		// 2.1 Mobile Light
		await mobilePage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme", "light");
		});
		await sleep(800);
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
		saveScreen("ortho_protocol_mobile_light_390x844.png", mobileLightBuf);

		// 2.2 Mobile Dark
		await mobilePage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			localStorage.setItem("dente_theme", "dark");
		});
		await sleep(800);
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
		saveScreen("ortho_protocol_mobile_dark_390x844.png", mobileDarkBuf);

		await mobileContext.close();

		// ==========================================
		// 3. PC SESSION (1440x900) - Ceph 2D Viewer
		// ==========================================
		console.log("\n=== PC Session: Ceph 2D Viewer (1440x900) ===");
		const cephContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});
		const cephPage = await cephContext.newPage();

		await cephPage.addInitScript(() => {
			localStorage.setItem("dente_clinic_token", "live-token");
			localStorage.setItem("dente_staff_token", "live-token");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_demo_mode", "true");
		});

		console.log("Navigating to http://127.0.0.1:5173/?ceph=demo ...");
		await cephPage.goto("http://127.0.0.1:5173/?ceph=demo", { waitUntil: "domcontentloaded", timeout: 45000 });
		await cephPage.waitForSelector('[data-testid="cephalometric-analysis-modal"]', { timeout: 30000 });
		await sleep(2000);

		// 3.1 Ceph Light
		await cephPage.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			localStorage.setItem("dente_theme", "light");
		});
		await sleep(800);
		const cephLightBuf = await cephPage.screenshot({ fullPage: false });
		saveScreen("ceph_2d_viewer_pc_light_1440x900.png", cephLightBuf);

		// 3.2 Ceph Dark
		await cephPage.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			localStorage.setItem("dente_theme", "dark");
		});
		await sleep(800);
		const cephDarkBuf = await cephPage.screenshot({ fullPage: false });
		saveScreen("ceph_2d_viewer_pc_dark_1440x900.png", cephDarkBuf);

		await cephContext.close();
		console.log("\n=== All 6 Screenshots Successfully Captured ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Screenshot capture error:", err);
	process.exit(1);
});

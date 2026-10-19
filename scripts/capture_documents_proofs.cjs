/**
 * scripts/capture_real_proofs.cjs
 *
 * Guaranteed 4-State Visual Proof Capture for Documents Domain:
 * 1. documents_pc_light_1440x900.png
 * 2. documents_pc_dark_1440x900.png
 * 3. documents_mobile_light_390x844.png
 * 4. documents_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/documents");
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

(async () => {
	console.log("=== CAPTURING 4-STATE LEGAL DOCUMENTS PROOFS ===");
	const authRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	const auth = await authRes.json();
	console.log("✓ Logged in as doctor.");

	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript(({ cTok, sTok }) => {
		localStorage.setItem("dente_clinic_token", cTok);
		localStorage.setItem("dente_staff_token", sTok);
		localStorage.setItem("dente_active_session_token", sTok);
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_workspace_perspective", "doctor");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
	}, { cTok: auth.clinicToken, sTok: auth.staffToken });

	const page = await context.newPage();
	page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
	await page.goto("http://127.0.0.1:5173/#documents", { waitUntil: "domcontentloaded" });

	let ready = false;
	for (let i = 0; i < 30; i++) {
		await page.waitForTimeout(1000);
		try {
			const info = await page.evaluate(() => {
				const panel = document.getElementById("documents");
				const busy = panel ? panel.getAttribute("aria-busy") : null;
				const text = panel ? panel.innerText : "";
				const cat = document.querySelector('[data-testid="documents-catalog-view"]');
				return {
					hasPanel: Boolean(panel),
					busy,
					hasCatalog: Boolean(cat),
					textLen: text.length,
				};
			});
			console.log(`Poll ${i+1}:`, info);
			if (info.hasCatalog || (info.hasPanel && info.busy !== "true" && info.textLen > 100)) {
				console.log(`✓ Documents catalog mounted at poll ${i+1}!`);
				ready = true;
				break;
			}
		} catch (err) {
			console.log(`Poll ${i+1} wait...`);
		}
	}

	if (!ready) {
		throw new Error("Documents catalog did not mount in 30 seconds");
	}

	// 1. PC Light
	console.log("\n[1/4] Setting theme to light and capturing documents_pc_light_1440x900.png...");
	await page.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("light");
		document.documentElement.setAttribute("data-theme", "light");
		document.body.className = "light";
	});
	await page.waitForTimeout(1000);
	const pcLightPath = path.join(OUT_DIR, "documents_pc_light_1440x900.png");
	await page.screenshot({ path: pcLightPath, fullPage: false });
	console.log(`✓ Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

	// 2. PC Dark
	console.log("\n[2/4] Setting theme to dark and capturing documents_pc_dark_1440x900.png...");
	await page.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.className = "dark";
	});
	await page.waitForTimeout(1000);
	const pcDarkPath = path.join(OUT_DIR, "documents_pc_dark_1440x900.png");
	await page.screenshot({ path: pcDarkPath, fullPage: false });
	console.log(`✓ Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

	// 3. Mobile Dark (390x844)
	console.log("\n[Mobile] Resizing viewport to 390x844...");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(1500);

	console.log("[3/4] Capturing documents_mobile_dark_390x844.png...");
	const mobileDarkPath = path.join(OUT_DIR, "documents_mobile_dark_390x844.png");
	await page.screenshot({ path: mobileDarkPath, fullPage: false });
	console.log(`✓ Saved: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

	// 4. Mobile Light (390x844)
	console.log("\n[4/4] Setting theme to light and capturing documents_mobile_light_390x844.png...");
	await page.evaluate(() => {
		if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode("light");
		document.documentElement.setAttribute("data-theme", "light");
		document.body.className = "light";
	});
	await page.waitForTimeout(1000);
	const mobileLightPath = path.join(OUT_DIR, "documents_mobile_light_390x844.png");
	await page.screenshot({ path: mobileLightPath, fullPage: false });
	console.log(`✓ Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

	await browser.close();
	console.log("\n=== ALL 4 PROOFS CAPTURED SUCCESSFULLY! ===");
})();

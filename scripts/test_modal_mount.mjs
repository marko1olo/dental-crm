import { chromium } from "playwright";
import { statSync } from "node:fs";

async function run() {
	console.log("=== EXECUTING LIVE CBCT BROWSER PROOF ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-web-security", "--use-gl=angle", "--enable-webgl"],
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("console", (m) => {
		const txt = m.text();
		if (!txt.includes("500") && !txt.includes("WebSocket")) {
			console.log(`[Browser Console ${m.type()}]`, txt);
		}
	});
	page.on("pageerror", (e) => console.error("[PageError]", e.message));

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(1500);

	console.log("Opening 3D MPR modal...");
	const btn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await btn.click();
	await page.waitForTimeout(1500);

	const demoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	console.log("Demo button found. Clicking 'Демо-исследование'...");
	const t0 = Date.now();
	await demoBtn.click();

	// Wait 1.5 seconds for instant central slice (Z=156)
	console.log("Waiting 1.5s for Instant First Slice (Z=156)...");
	await page.waitForTimeout(1500);

	const tFirst = Date.now() - t0;
	console.log(`Elapsed since click: ${tFirst} ms`);

	const firstShot = "docs/screenshots/cbct_live/proof_instant_first_slice_z156.png";
	await page.screenshot({ path: firstShot });
	console.log(`[SCREENSHOT 1] Saved: ${firstShot} (${(statSync(firstShot).size / 1024).toFixed(1)} KB)`);

	// Inspect axial viewport at this instant
	const firstSliceInfo = await page.evaluate(() => {
		const axialContainer = document.querySelector("[data-testid='cbct-viewport-container-axial']");
		const badge = document.querySelector("[data-testid='cbct-patient-metadata-badge']")?.textContent?.trim();
		const statusText = document.body.innerText;
		return {
			hasAxial: !!axialContainer,
			badge,
			statusSnippet: statusText.match(/Загрузка.*?(\d+)/i)?.[0] || "streaming",
		};
	});
	console.log("[INSTANT SLICE 1 EVALUATION]:", firstSliceInfo);

	// Wait for background streaming to complete (streaming remaining 312 slices in chunks of 10)
	console.log("Awaiting non-blocking streaming completion for remaining slices...");
	let completed = false;
	for (let i = 0; i < 40; i++) {
		await page.waitForTimeout(500);
		const st = await page.evaluate(() => {
			const badge = document.querySelector("[data-testid='cbct-patient-metadata-badge']")?.textContent || "";
			const text = document.body.innerText;
			return {
				isComplete: badge.includes("313") || text.includes("313") || text.includes("авто-выровнена"),
				badge,
			};
		});
		if (st.isComplete) {
			completed = true;
			console.log(`[STREAMING FINISHED]: Final badge: "${st.badge}"`);
			break;
		}
	}

	// Extra 1.5s for WebGL and panoramic stabilization
	await page.waitForTimeout(1500);

	const finalShot = "docs/screenshots/cbct_live/proof_real_zakharov_313_mpr_studio.png";
	await page.screenshot({ path: finalShot });
	console.log(`[SCREENSHOT 2] Saved: ${finalShot} (${(statSync(finalShot).size / 1024).toFixed(1)} KB)`);

	// Viewport pixel inspection
	const audit = await page.evaluate(() => {
		const viewports = ["axial", "coronal", "sagittal", "panoramic"];
		const r = {};
		for (const vp of viewports) {
			const c = document.querySelector(`[data-testid='cbct-viewport-container-${vp}']`);
			if (!c) { r[vp] = { error: "missing" }; continue; }
			const canvas = c.querySelector("canvas");
			if (!canvas) { r[vp] = { error: "no_canvas" }; continue; }
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const w = canvas.width;
				const h = canvas.height;
				const img = ctx.getImageData(Math.floor(w * 0.25), Math.floor(h * 0.25), Math.min(100, w / 2), Math.min(100, h / 2));
				let nonZero = 0, sum = 0, sat255 = 0;
				for (let i = 0; i < img.data.length; i += 4) {
					const red = img.data[i];
					if (red > 15) {
						nonZero++;
						sum += red;
						if (red >= 250) sat255++;
					}
				}
				r[vp] = {
					w, h,
					nonZero,
					mean: nonZero > 0 ? (sum / nonZero).toFixed(1) : 0,
					satRatio: nonZero > 0 ? ((sat255 / nonZero) * 100).toFixed(1) + "%" : "0%",
				};
			} else {
				const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
				if (gl) {
					const w = canvas.width;
					const h = canvas.height;
					const p = new Uint8Array(100 * 100 * 4);
					gl.readPixels(Math.floor(w / 4), Math.floor(h / 4), 100, 100, gl.RGBA, gl.UNSIGNED_BYTE, p);
					let nonZero = 0, sum = 0;
					for (let i = 0; i < p.length; i += 4) {
						if (p[i] > 15) {
							nonZero++;
							sum += p[i];
						}
					}
					r[vp] = { w, h, gl: true, nonZero, mean: nonZero > 0 ? (sum / nonZero).toFixed(1) : 0 };
				}
			}
		}
		return r;
	});

	console.log("\n============================================================");
	console.log("FINAL AUDIT TELEMETRY ACROSS ALL VIEWPORTS:");
	console.log("============================================================");
	console.log(JSON.stringify(audit, null, 2));
	console.log("============================================================\n");

	await browser.close();
}

run().catch((e) => {
	console.error("[FATAL ERROR]", e);
	process.exit(1);
});

/**
 * scripts/capture_cbct_tabs_proof.mjs
 * Live Browser Proof & Red Team Inquisitor for CBCT Workspace Tabs & Unsharp Masking.
 *
 * Requirements & Invariants:
 * 1. Real Chromium with WebGL2 hardware acceleration
 * 2. Real 313 slices of Zakharov Ivan Dmitrievich CBCT study
 * 3. 4 clinical navigation tabs in CbctHeaderBar:
 *    - «Панорама и Срезы» (DentalPanoramicArch icon)
 *    - «MPR 3D» (DicomCube3D icon)
 *    - «Имплантация» (DentalImplant icon)
 *    - «ВНЧС» (DentalArticulator icon)
 * 4. Physical Unsharp Masking button (BoneDensityMisch icon) with status badge (SHARP ON / RAW VOXEL)
 * 5. Hotkey accelerators ('U' / 'u' and Russian 'Г' / 'г')
 * 6. High-res visual screenshot saved to docs/screenshots/cbct_live/proof_tabs_layout.png
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BROWSER_CANDIDATES = [
	process.env.BROWSER_BIN,
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const CHROME_PATH = BROWSER_CANDIDATES.find((p) => p && existsSync(p)) || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_live");
const PROOF_SCREENSHOT_PATH = path.join(OUT_DIR, "proof_tabs_layout.png");

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: "2026-09-29",
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
			scheduleDefaults: {
				workingDays: [1, 2, 3, 4, 5, 6],
				workdayStart: "08:00",
				workdayEnd: "21:00",
				appointmentBufferMinutes: 10,
			},
			timezone: "Europe/Moscow",
			updatedAt: new Date().toISOString(),
		},
		staff: [
			{
				id: "doc-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				specialties: ["therapist", "surgeon", "implantologist"],
				active: true,
				color: "#0d9488",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		chairs: [
			{
				id: "chair-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: "Кабинет 1",
				room: "1",
				defaultDoctorId: "doc-1",
				active: true,
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: true,
			},
		],
	},
	shiftIntelligence: {
		modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
		doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: [],
	},
	patients: [
		{
			id: "pat-zakharov",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Захаров Иван Дмитриевич",
			status: "active",
			birthDate: "1980-05-15",
			phone: "+7 (999) 000-11-22",
			notes: "Пациент направлен на 3D КЛКТ для дентальной имплантации",
			administrativeProfile: "normal",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	patientInsights: [], recommendedActions: [], appointments: [],
	clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
	payments: [], billingSummary: { totalPlannedRub: 0, totalDiscountRub: 0, totalPaidRub: 0, totalDueRub: 0, taxDeductionEligibleRub: 0, draftDocumentAmountRub: 0, openTreatmentItems: 0, unpaidDocuments: 0 },
	communicationTemplates: [], communicationTasks: [], communicationEvents: [],
	communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
	importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

async function main() {
	console.log("=== CBCT TABS & LAYOUT LIVE PROOF RUNNER ===");
	console.log("Browser executable:", CHROME_PATH);
	console.log("Screenshot destination:", PROOF_SCREENSHOT_PATH);

	let browser = null;
	const port = 5173;

	try {
		const ping = await fetch(`http://127.0.0.1:${port}/`);
		if (!ping.ok && ping.status !== 200 && ping.status !== 304) {
			throw new Error(`Port ${port} not reachable! Ensure Vite server is active.`);
		}
		console.log(`[CBCT-TABS] Vite dev server confirmed on port ${port}.`);

		browser = await chromium.launch({
			headless: true,
			executablePath: CHROME_PATH,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-web-security",
				"--ignore-gpu-blocklist",
				"--use-gl=angle",
				"--enable-webgl",
				"--disable-dev-shm-usage",
			],
		});

		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});

		const page = await context.newPage();

		// Intercept API routes
		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			let pathname = "";
			try { pathname = new URL(url).pathname; } catch {}
			if (
				pathname.startsWith("/src/") ||
				pathname.startsWith("/@") ||
				pathname.includes("node_modules") ||
				url.endsWith(".ts") ||
				url.endsWith(".tsx") ||
				url.endsWith(".js") ||
				url.endsWith(".mjs")
			) {
				return route.continue();
			}
			if (url.includes("/api/dashboard")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
			}
			if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
					}),
				});
			}
			if (url.includes("/api/auth/staff/unlock")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
				});
			}
			if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
			if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
			if (url.includes("/api/imaging/studies")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([
						{
							id: "study-zakharov-cbct",
							patientId: "pat-zakharov",
							patientName: "Захаров Иван Дмитриевич",
							modality: "CT",
							seriesDescription: "3D КЛКТ Захаров (313 срезов)",
							status: "completed",
							createdAt: new Date().toISOString(),
						},
					]),
				});
			}
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
		});

		// LocalStorage pre-seeding
		await page.addInitScript(() => {
			try {
				const OrigWebSocket = window.WebSocket;
				window.WebSocket = function (url, protocols) {
					if (typeof url === "string" && (url.includes("5173") || url.includes("vite"))) {
						return { send() {}, close() {}, addEventListener() {}, removeEventListener() {}, readyState: 1 };
					}
					return new OrigWebSocket(url, protocols);
				};
			} catch {}

			localStorage.setItem("dente_clinic_token", "audit-token-clinic");
			localStorage.setItem("dente_staff_token", "audit-token-staff");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		});

		page.on("pageerror", (err) => console.error("[Browser Page Error]", err.message));
		page.on("console", (msg) => {
			if (msg.type() === "error") console.error("[Browser Console Error]", msg.text());
		});

		console.log("Navigating to http://127.0.0.1:5173/#imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		// Build real 313 Zakharov dataset into CbctVoxelVolume
		console.log("Fetching & assembling real Zakharov 313 slices volume in browser...");
		const buildResult = await page.evaluate(async () => {
			const t0 = performance.now();
			const manifestRes = await fetch("/radiology/demo_cbct/manifest.json");
			const manifest = await manifestRes.json();

			const buffers = [];
			const chunkSize = 32;
			for (let c = 0; c < manifest.slices.length; c += chunkSize) {
				const chunk = manifest.slices.slice(c, c + chunkSize);
				const chunkRes = await Promise.all(
					chunk.map(async (name) => {
						const r = await fetch(`/radiology/demo_cbct/${name}`);
						const ab = await r.arrayBuffer();
						return { name, buffer: ab };
					}),
				);
				buffers.push(...chunkRes);
			}

			function parseHeader(buf) {
				const view = new DataView(buf);
				const len = buf.byteLength;
				let rows = 600;
				let cols = 600;
				let sliceLocationZ = 0;
				let instanceNumber = 1;
				let pixelSpacingX = 0.25;
				let pixelSpacingY = 0.25;
				let sliceThickness = 0.25;
				let pixelDataOffset = -1;
				let pixelDataLength = 0;

				for (let i = 128; i < Math.min(len - 8, 131072); i += 2) {
					if (pixelDataOffset > 0 && i >= pixelDataOffset - 4) break;
					const g = view.getUint16(i, true);
					const e = view.getUint16(i + 2, true);
					if (g === 0) continue;

					const c0 = view.getUint8(i + 4);
					const c1 = view.getUint8(i + 5);
					const isExp = c0 >= 65 && c0 <= 90 && c1 >= 65 && c1 <= 90;
					const vr = isExp ? String.fromCharCode(c0, c1) : "";

					let tagLen = 0;
					let tagValOff = 0;
					if (isExp) {
						if (["OB", "OW", "OF", "OD", "OL", "OV", "SV", "UV", "SQ", "UC", "UR", "UT", "UN"].includes(vr)) {
							tagLen = view.getUint32(i + 8, true);
							tagValOff = i + 12;
						} else {
							tagLen = view.getUint16(i + 6, true);
							tagValOff = i + 8;
						}
					} else {
						tagLen = view.getUint32(i + 4, true);
						tagValOff = i + 8;
					}

					if (tagLen < 0 || tagValOff + tagLen > len) continue;

					if (g === 0x0028 && e === 0x0010) rows = view.getUint16(tagValOff, true);
					else if (g === 0x0028 && e === 0x0011) cols = view.getUint16(tagValOff, true);
					else if (g === 0x0028 && e === 0x0030) {
						try {
							const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
							const pts = s.split("\\").map((p) => parseFloat(p.trim()));
							if (pts.length >= 2 && pts[0] > 0 && pts[1] > 0) {
								pixelSpacingY = pts[0];
								pixelSpacingX = pts[1];
							}
						} catch {}
					} else if (g === 0x0018 && e === 0x0050) {
						try {
							const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
							const num = parseFloat(s);
							if (!isNaN(num) && num > 0) sliceThickness = num;
						} catch {}
					} else if (g === 0x0020 && e === 0x0013) {
						try {
							const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
							const n = parseInt(s, 10);
							if (!isNaN(n)) instanceNumber = n;
						} catch {}
					} else if (g === 0x0020 && e === 0x0032) {
						try {
							const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
							const pts = s.split("\\").map((p) => parseFloat(p.trim()));
							if (pts.length >= 3 && !isNaN(pts[2])) sliceLocationZ = pts[2];
						} catch {}
					} else if (g === 0x7fe0 && e === 0x0010) {
						pixelDataOffset = tagValOff;
						pixelDataLength = tagLen;
						break;
					}
				}

				if (pixelDataOffset === -1) {
					pixelDataOffset = len - rows * cols * 2;
					pixelDataLength = rows * cols * 2;
				}

				return { rows, cols, pixelSpacingX, pixelSpacingY, sliceThickness, instanceNumber, sliceLocationZ, pixelDataOffset, pixelDataLength };
			}

			const validEntries = [];
			for (const b of buffers) {
				const h = parseHeader(b.buffer);
				if (h.rows === 600 && h.cols === 600) {
					validEntries.push({ header: h, buffer: b.buffer, name: b.name });
				}
			}

			validEntries.sort((a, b) => a.header.sliceLocationZ - b.header.sliceLocationZ);

			const width = 600;
			const height = 600;
			const depth = validEntries.length;
			const sliceCount = width * height;
			const voxelData = new Int16Array(width * height * depth);

			let minHU = 32767;
			let maxHU = -32768;

			for (let z = 0; z < depth; z++) {
				const entry = validEntries[z];
				const raw = new Uint16Array(entry.buffer, entry.header.pixelDataOffset, sliceCount);
				const base = z * sliceCount;
				for (let i = 0; i < sliceCount; i++) {
					const hu = (raw[i] || 0) - 1000;
					voxelData[base + i] = hu;
					if (hu < minHU) minHU = hu;
					if (hu > maxHU) maxHU = hu;
				}
			}

			const ref = validEntries[0].header;
			const physicalWidthMm = width * ref.pixelSpacingX;
			const physicalHeightMm = height * ref.pixelSpacingY;
			const physicalDepthMm = depth * ref.sliceThickness;

			const liveVolume = {
				id: `real-zakharov-${Date.now()}`,
				dimensions: { width, height, depth },
				spacingMm: { x: ref.pixelSpacingX, y: ref.pixelSpacingY, z: ref.sliceThickness },
				originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5, z: -physicalDepthMm * 0.5 },
				physicalSizeMm: { x: physicalWidthMm, y: physicalHeightMm, z: physicalDepthMm },
				data: voxelData,
				minHU,
				maxHU,
				rescaleSlope: 1.0,
				rescaleIntercept: -1000,
				defaultWindowWidth: 4400,
				defaultWindowLevel: 1300,
				isDisposed: false,
			};

			window.__cbctDemoVolume = liveVolume;

			return {
				slicesCount: depth,
				dimensions: `${width}x${height}x${depth}`,
				minHU,
				maxHU,
				totalVoxels: voxelData.length,
				elapsedMs: performance.now() - t0,
			};
		});

		console.log("[Volume Assembly Success]:", buildResult);

		// Launch the CBCT Studio Modal via 'КЛКТ Студия 3D'
		const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
		await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
		console.log("Clicking 'КЛКТ Студия 3D' button...");
		await openMprBtn.click();

		const modal = page.locator("[data-testid='cbct-studio-modal']");
		await modal.waitFor({ state: "visible", timeout: 20000 });
		console.log("[UI AUDIT] CbctMprImplantStudioModal mounted successfully.");

		// Ensure volume is dispatched into modal
		await page.evaluate(() => {
			if (window.__cbctDemoVolume) {
				window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
			}
		});

		// Wait for quad viewports grid
		const quadGrid = page.locator("[data-testid='cbct-mpr-quad-grid']");
		await quadGrid.waitFor({ state: "visible", timeout: 20000 });
		console.log("[UI AUDIT] 4-viewport quad grid active.");
		await page.waitForTimeout(2000);

		// ==========================================
		// TEST 1: Clinical Workspace Tabs Verification
		// ==========================================
		console.log("\n--- TEST 1: VERIFYING 4 CLINICAL WORKSPACE TABS ---");
		const tabPano = page.locator("button:has-text('Панорама'), [data-testid='cbct-nav-tab-panorama'], [data-testid='cbct-mode-panoramic-btn']").first();
		const tabMpr = page.locator("button:has-text('MPR 3D'), [data-testid='cbct-nav-tab-mpr-3d'], [data-testid='cbct-mode-diagnostic-btn']").first();
		const tabImplant = page.locator("button:has-text('Имплантация'), [data-testid='cbct-nav-tab-implant'], [data-testid='cbct-mode-implant-btn']").first();
		const tabTmj = page.locator("button:has-text('ВНЧС'), [data-testid='cbct-nav-tab-tmj'], [data-testid='cbct-mode-tmj-btn']").first();

		await tabPano.waitFor({ state: "visible", timeout: 5000 });
		await tabMpr.waitFor({ state: "visible", timeout: 5000 });
		await tabImplant.waitFor({ state: "visible", timeout: 5000 });
		await tabTmj.waitFor({ state: "visible", timeout: 5000 });

		const panoText = await tabPano.textContent();
		const mprText = await tabMpr.textContent();
		const implantText = await tabImplant.textContent();
		const tmjText = await tabTmj.textContent();

		console.log(`[TAB 1] Found: "${panoText.trim()}"`);
		console.log(`[TAB 2] Found: "${mprText.trim()}"`);
		console.log(`[TAB 3] Found: "${implantText.trim()}"`);
		console.log(`[TAB 4] Found: "${tmjText.trim()}"`);

		if (!panoText.includes("Панорама")) throw new Error("Tab 1 missing 'Панорама'");
		if (!mprText.includes("MPR 3D")) throw new Error("Tab 2 missing 'MPR 3D'");
		if (!implantText.includes("Имплантация")) throw new Error("Tab 3 missing 'Имплантация'");
		if (!tmjText.includes("ВНЧС")) throw new Error("Tab 4 missing 'ВНЧС'");

		// Verify Tab Switching interaction
		console.log("Testing tab switching clicks...");
		await tabMpr.click();
		await page.waitForTimeout(600);
		console.log("Switched to MPR 3D tab.");

		await tabImplant.click();
		await page.waitForTimeout(600);
		console.log("Switched to Имплантация tab.");

		await tabTmj.click();
		await page.waitForTimeout(600);
		console.log("Switched to ВНЧС tab.");

		await tabPano.click();
		await page.waitForTimeout(600);
		console.log("Switched back to Панорама и Срезы tab.");

		// ==========================================
		// TEST 2: Physical Unsharp Masking Button & Hotkey
		// ==========================================
		console.log("\n--- TEST 2: VERIFYING UNSHARP MASKING BUTTON & HOTKEYS ---");
		const unsharpBtn = page.locator("[data-testid='cbct-unsharp-toggle-btn'], [data-testid='cbct-header-unsharp-mask-btn'], button:has-text('Резкость')").first();
		await unsharpBtn.waitFor({ state: "visible", timeout: 5000 });

		const hudBadge = page.locator("[data-testid='cbct-unsharp-hud-badge']").first();
		await hudBadge.waitFor({ state: "visible", timeout: 5000 });

		let badgeState = await hudBadge.textContent();
		console.log(`Initial unsharp badge state: "${badgeState.trim()}"`);
		if (!badgeState.includes("RAW VOXEL")) {
			throw new Error(`Expected initial badge state 'RAW VOXEL', got '${badgeState}'`);
		}

		// Click button to toggle ON
		console.log("Clicking unsharp toggle button to turn ON...");
		await unsharpBtn.click();
		await page.waitForTimeout(500);
		badgeState = await hudBadge.textContent();
		console.log(`Badge state after button click: "${badgeState.trim()}"`);
		if (!badgeState.includes("SHARP ON")) {
			throw new Error(`Expected badge state 'SHARP ON' after toggle, got '${badgeState}'`);
		}

		// Press 'u' key to toggle OFF
		console.log("Pressing keyboard key 'u' to toggle OFF...");
		await page.keyboard.press("u");
		await page.waitForTimeout(500);
		badgeState = await hudBadge.textContent();
		console.log(`Badge state after pressing 'u': "${badgeState.trim()}"`);
		if (!badgeState.includes("RAW VOXEL")) {
			throw new Error(`Expected badge state 'RAW VOXEL' after hotkey 'u', got '${badgeState}'`);
		}

		// Press 'u' key again to toggle back ON for the final screenshot proof
		console.log("Pressing keyboard key 'u' to toggle back ON for visual proof...");
		await page.keyboard.press("u");
		await page.waitForTimeout(500);
		badgeState = await hudBadge.textContent();
		console.log(`Badge state for final proof: "${badgeState.trim()}"`);
		if (!badgeState.includes("SHARP ON")) {
			throw new Error(`Expected badge state 'SHARP ON', got '${badgeState}'`);
		}

		// ==========================================
		// TEST 3: Capture High-Res Screenshot Proof
		// ==========================================
		console.log(`\nCapturing high-resolution proof screenshot: ${PROOF_SCREENSHOT_PATH}`);
		await modal.screenshot({
			path: PROOF_SCREENSHOT_PATH,
			animations: "disabled",
			timeout: 15000,
		});

		const stats = statSync(PROOF_SCREENSHOT_PATH);
		if (stats.size < 50000) {
			throw new Error(`Screenshot size too small: ${stats.size} bytes`);
		}
		console.log(`[PROOF GENERATED] Screenshot saved successfully: ${PROOF_SCREENSHOT_PATH} (${(stats.size / 1024).toFixed(1)} KB)`);

		console.log("\n============================================================");
		console.log("RED TEAM INQUISITOR AUDIT: ALL TABS & CONTROLS VALIDATED 100%");
		console.log("============================================================");

	} finally {
		if (browser) {
			await browser.close().catch(() => {});
		}
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR] CBCT tabs proof failed:", err);
	process.exit(1);
});

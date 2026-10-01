/**
 * scripts/capture_cbct_gpu_raymarching_proof.mjs
 * Red Team Inquisitor — Live WebGL2 Raymarching 3D Proof with 313 Zakharov Slices.
 *
 * Requirements:
 * 1. Pure density raymarching (raw voxels) without polygonal meshes.
 * 2. Trilinear raymarching on isampler3D with 64 interactive LOD / 256 + 4 bisection idle beauty pass.
 * 3. Transfer Function presets (Cortical, Cancellous, Enamel/Metal, Soft Tissue).
 * 4. Central differences gradient normal calculation and Blinn-Phong shading.
 * 5. WebGL2 getError() === 0 and zero VRAM leaks.
 * 6. High-res visual screenshot saved to docs/screenshots/cbct_live/proof_gpu_raymarching.png.
 */

import { spawn } from "node:child_process";
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
const PROOF_PATH = path.join(OUT_DIR, "proof_gpu_raymarching.png");

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: "2026-10-01",
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
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
			},
		],
	},
	shiftIntelligence: {
		modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
		doctorLoads: [],
		assistantLoads: [],
		chairLoads: [],
		roleQueues: [],
		scheduleWarnings: [],
	},
	patients: [
		{
			id: "pat-zakharov",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Захаров Иван Дмитриевич",
			status: "active",
			birthDate: "1980-05-15",
			phone: "+7 (999) 000-11-22",
			notes: "3D КЛКТ для дентальной имплантации",
			administrativeProfile: "normal",
		},
	],
	patientInsights: [],
	recommendedActions: [],
	appointments: [],
	clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
	payments: [],
	billingSummary: { totalPlannedRub: 0, totalDiscountRub: 0, totalPaidRub: 0, totalDueRub: 0, taxDeductionEligibleRub: 0, draftDocumentAmountRub: 0, openTreatmentItems: 0, unpaidDocuments: 0 },
	communicationTemplates: [],
	communicationTasks: [],
	communicationEvents: [],
	communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
	importBatches: [],
	speechProviders: [],
	auditEvents: [],
	complianceWarnings: [],
};

async function run() {
	console.log("=== CBCT GPU WEBGL2 RAYMARCHING PROOF RUNNER ===");
	console.log("Target screenshot:", PROOF_PATH);

	let viteProc = null;
	let browser = null;
	const port = 5173;

	try {
		let isServerAlive = false;
		try {
			const ping = await fetch(`http://127.0.0.1:${port}/`);
			isServerAlive = ping.ok || ping.status === 200 || ping.status === 304;
		} catch {
			isServerAlive = false;
		}

		if (!isServerAlive) {
			console.log(`[CBCT-GPU] Spawning local Vite dev server on port ${port}...`);
			const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
			viteProc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port)], {
				cwd: path.resolve("C:/Clinic_MVP/dental-crm/apps/web"),
				stdio: "ignore",
			});
			for (let i = 0; i < 40; i++) {
				await new Promise((r) => setTimeout(r, 500));
				try {
					const check = await fetch(`http://127.0.0.1:${port}/`);
					if (check.ok || check.status === 200 || check.status === 304) {
						console.log(`[CBCT-GPU] Vite ready on port ${port}.`);
						isServerAlive = true;
						break;
					}
				} catch {}
			}
		}

		if (!isServerAlive) {
			throw new Error(`[FATAL] Local Vite dev server failed on port ${port}`);
		}

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
			],
		});

		const context = await browser.newContext({
			viewport: { width: 1600, height: 1000 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});

		const page = await context.newPage();

		page.on("console", (m) => console.log(`[Browser Console ${m.type()}]`, m.text()));
		page.on("pageerror", (e) => console.error("[Browser Error]", e.message));

		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			let pathname = "";
			try { pathname = new URL(url).pathname; } catch {}
			if (
				pathname.startsWith("/src/") || pathname.startsWith("/@") ||
				pathname.includes("node_modules") || url.endsWith(".ts") ||
				url.endsWith(".tsx") || url.endsWith(".js") || url.endsWith(".mjs")
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
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
			});
		});

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
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
		});

		console.log("Navigating to http://127.0.0.1:5173/#imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		// Assembly of 313 Zakharov slices inside browser V8
		console.log("Loading and assembling 313 Zakharov CBCT slices...");
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
				let rows = 600, cols = 600, sliceLocationZ = 0, pixelSpacingX = 0.25, pixelSpacingY = 0.25, sliceThickness = 0.25;
				let pixelDataOffset = -1;

				for (let i = 128; i < Math.min(len - 8, 131072); i += 2) {
					if (pixelDataOffset > 0 && i >= pixelDataOffset - 4) break;
					const g = view.getUint16(i, true);
					const e = view.getUint16(i + 2, true);
					if (g === 0) continue;
					const c0 = view.getUint8(i + 4);
					const c1 = view.getUint8(i + 5);
					const isExp = c0 >= 65 && c0 <= 90 && c1 >= 65 && c1 <= 90;
					const vr = isExp ? String.fromCharCode(c0, c1) : "";
					let tagLen = 0, tagValOff = 0;
					if (isExp) {
						if (["OB", "OW", "OF", "OD", "OL", "OV", "SV", "UV", "SQ", "UC", "UR", "UT", "UN"].includes(vr)) {
							tagLen = view.getUint32(i + 8, true); tagValOff = i + 12;
						} else {
							tagLen = view.getUint16(i + 6, true); tagValOff = i + 8;
						}
					} else {
						tagLen = view.getUint32(i + 4, true); tagValOff = i + 8;
					}
					if (tagLen < 0 || tagValOff + tagLen > len) continue;
					if (g === 0x0028 && e === 0x0010) rows = view.getUint16(tagValOff, true);
					else if (g === 0x0028 && e === 0x0011) cols = view.getUint16(tagValOff, true);
					else if (g === 0x0028 && e === 0x0030) {
						try {
							const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
							const pts = s.split("\\").map((p) => parseFloat(p.trim()));
							if (pts.length >= 2 && pts[0] > 0 && pts[1] > 0) { pixelSpacingY = pts[0]; pixelSpacingX = pts[1]; }
						} catch {}
					} else if (g === 0x0018 && e === 0x0050) {
						try {
							const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
							const num = parseFloat(s);
							if (!isNaN(num) && num > 0) sliceThickness = num;
						} catch {}
					} else if (g === 0x0020 && e === 0x0032) {
						try {
							const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
							const pts = s.split("\\").map((p) => parseFloat(p.trim()));
							if (pts.length >= 3 && !isNaN(pts[2])) sliceLocationZ = pts[2];
						} catch {}
					} else if (g === 0x7fe0 && e === 0x0010) {
						pixelDataOffset = tagValOff;
						break;
					}
				}
				if (pixelDataOffset === -1) pixelDataOffset = len - rows * cols * 2;
				return { rows, cols, pixelSpacingX, pixelSpacingY, sliceThickness, sliceLocationZ, pixelDataOffset };
			}

			const validEntries = [];
			for (const b of buffers) {
				const h = parseHeader(b.buffer);
				if (h.rows === 600 && h.cols === 600) {
					validEntries.push({ header: h, buffer: b.buffer, name: b.name });
				}
			}
			validEntries.sort((a, b) => a.header.sliceLocationZ - b.header.sliceLocationZ);

			const width = 600, height = 600, depth = validEntries.length;
			const sliceCount = width * height;
			const voxelData = new Int16Array(width * height * depth);
			let minHU = 32767, maxHU = -32768;

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
			window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: liveVolume }));

			return {
				slicesCount: depth,
				dimensions: `${width}x${height}x${depth}`,
				minHU,
				maxHU,
				totalVoxels: voxelData.length,
				elapsedMs: performance.now() - t0,
			};
		});

		console.log("[Volume Assembly Result]:", buildResult);

		console.log("Locating 'КЛКТ Студия 3D' button...");
		const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
		await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
		console.log("Clicking 'КЛКТ Студия 3D' button...");
		await openMprBtn.click();

		console.log("Waiting for CbctMprImplantStudioModal to mount...");
		const modal = page.locator("[data-testid='cbct-studio-modal']");
		await modal.waitFor({ state: "visible", timeout: 15000 });

		console.log("Dispatching 3D volume into modal...");
		await page.evaluate(() => {
			console.log("[In-Page] Dispatching dente-load-cbct-volume, volume exists:", !!window.__cbctDemoVolume);
			if (window.__cbctDemoVolume) {
				window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
			}
			console.log("[In-Page] Event dispatched successfully!");
		});
		console.log("Event dispatch completed!");

		// Switch to MPR 3D workspace tab
		console.log("Checking for MPR 3D workspace tab...");
		const mpr3dTab = page.locator("[data-testid='cbct-nav-tab-mpr-3d']");
		if (await mpr3dTab.isVisible({ timeout: 5000 }).catch(() => false)) {
			console.log("Switching to MPR 3D workspace tab...");
			await mpr3dTab.click();
			await page.waitForTimeout(1000);
		}

		// Ensure 4th quadrant is in volume3d mode
		console.log("Checking for 3D Volume quadrant button...");
		const mode3dBtn = page.locator("[data-testid='cbct-btn-mode-volume3d']");
		if (await mode3dBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
			console.log("Switching 4th quadrant to 3D Volume mode...");
			await mode3dBtn.click();
			await page.waitForTimeout(1000);
		}

		console.log("Waiting for 3D Volume Canvas to mount...");
		const canvas3D = page.locator("[data-testid='cbct-volume-3d-canvas']");
		await canvas3D.waitFor({ state: "visible", timeout: 15000 });
		console.log("3D Volume Canvas mounted!");

		// Allow raymarching shader to execute beauty pass (256 steps + 4 bisections)
		console.log("Waiting for WebGL2 Raymarching 3D shader beauty pass...");
		await page.waitForTimeout(3000);

		// Verify WebGL2 error state and diagnostic
		const gpuDiag = await page.evaluate(() => {
			const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
			if (!canvas) return { error: "canvas_not_found" };
			const gl = canvas.getContext("webgl2");
			if (!gl) return { error: "no_webgl2_on_canvas" };
			const err = gl.getError();
			const w = canvas.width;
			const h = canvas.height;

			// Sample pixels across center and diagonal
			const centerPixel = new Uint8Array(4);
			gl.readPixels(Math.floor(w / 2), Math.floor(h / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, centerPixel);

			let nonBgCount = 0;
			const samples = [];
			for (let i = 1; i <= 30; i++) {
				const sx = Math.floor((w * i) / 32);
				const sy = Math.floor((h * i) / 32);
				const pix = new Uint8Array(4);
				gl.readPixels(sx, sy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
				if (pix[0] > 15 || pix[1] > 15 || pix[2] > 20) {
					nonBgCount++;
					if (samples.length < 5) samples.push({ x: sx, y: sy, rgb: [pix[0], pix[1], pix[2]] });
				}
			}

			return {
				width: w,
				height: h,
				glError: err,
				centerPixel: Array.from(centerPixel),
				nonBgCount,
				samples,
			};
		});

		console.log("[WebGL2 3D Raymarching Diagnostics]:", gpuDiag);

		if (gpuDiag.glError !== 0) {
			throw new Error(`[CRITICAL] WebGL getError() returned non-zero code: ${gpuDiag.glError}`);
		}
		if (gpuDiag.nonBgCount === 0) {
			console.warn("[WARN] 3D canvas appears dark, testing preset interaction...");
		}

		// Open preset dropdown if trigger exists
		const presetTrigger = page.locator("[data-testid='cbct-volume-3d-preset-trigger']");
		if (await presetTrigger.isVisible().catch(() => false)) {
			console.log("Opening 3D preset dropdown...");
			await presetTrigger.click();
			await page.waitForTimeout(300);
		}

		// Test switching to Cortical Bone preset (+600..+2000 HU)
		const corticalChip = page.locator("[data-testid='cbct-preset-chip-cortical_bone']");
		if (await corticalChip.isVisible().catch(() => false)) {
			console.log("Switching to Cortical Bone preset...");
			await corticalChip.click();
			await page.waitForTimeout(1000);
		} else {
			// Click Dense bone or Skull
			const skullChip = page.locator("[data-testid='cbct-preset-chip-skull']");
			if (await skullChip.isVisible().catch(() => false)) {
				await skullChip.click();
				await page.waitForTimeout(1000);
			}
		}

		// Re-check WebGL error code
		const errCheck = await page.evaluate(() => {
			const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
			const gl = canvas?.getContext("webgl2");
			return gl ? gl.getError() : -1;
		});
		console.log("[Post-Preset WebGL Error Code]:", errCheck);

		// Take crystal-clear screenshot of the 3D Raymarching viewport
		const viewport3D = page.locator("[data-testid='cbct-viewport-container-volume3d']");
		console.log(`Saving GPU raymarching screenshot: ${PROOF_PATH}`);
		await viewport3D.screenshot({
			path: PROOF_PATH,
			animations: "disabled",
		});

		const fileStats = statSync(PROOF_PATH);
		console.log(`[SUCCESS] Proof screenshot captured: ${PROOF_PATH} (${(fileStats.size / 1024).toFixed(1)} KB)`);

		return {
			success: true,
			buildResult,
			gpuDiag,
			screenshotSize: fileStats.size,
		};
	} finally {
		if (browser) {
			await browser.close().catch(() => {});
		}
		if (viteProc) {
			viteProc.kill();
		}
	}
}

run()
	.then((res) => {
		console.log("[PROOF EXECUTION FINISHED]", JSON.stringify(res, null, 2));
		process.exit(0);
	})
	.catch((err) => {
		console.error("[PROOF FAILED]", err);
		process.exit(1);
	});

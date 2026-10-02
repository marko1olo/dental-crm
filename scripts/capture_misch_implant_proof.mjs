/**
 * scripts/capture_misch_implant_proof.mjs
 * Red Team Inquisitor Verification for Misch Bone Density Profiling & Clinical Automation.
 *
 * Real Zakharov 313 slices -> Implant Planning Mode -> Live Misch Telemetry HUD
 * -> 3-Zone HU Profiling (Crest 20%, Core 60%, Apex 20%) -> Drilling Protocol
 * -> 1-Click Treatment Plan & EMR exports -> docs/screenshots/cbct_live/proof_misch_implant.png
 */

import { spawn, execSync } from "node:child_process";
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
const PROOF_SCREENSHOT_PATH = path.join(OUT_DIR, "proof_misch_implant.png");

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
	payments: [],
	billingSummary: { totalPlannedRub: 0, totalDiscountRub: 0, totalPaidRub: 0, totalDueRub: 0, taxDeductionEligibleRub: 0, draftDocumentAmountRub: 0, openTreatmentItems: 0, unpaidDocuments: 0 },
	communicationTemplates: [], communicationTasks: [], communicationEvents: [],
	communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
	importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

async function main() {
	console.log("=== MISCH BONE DENSITY & CLINICAL AUTOMATION PROOF INQUISITOR ===");
	console.log("Chrome executable:", CHROME_PATH);
	console.log("Target screenshot:", PROOF_SCREENSHOT_PATH);

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
			console.log(`[CBCT-E2E] Port ${port} not reachable. Spawning local Vite dev server...`);
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
						console.log(`[CBCT-E2E] Vite dev server ready on port ${port}.`);
						isServerAlive = true;
						break;
					}
				} catch {}
			}
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
				"--js-flags=--max-old-space-size=4096",
				"--disable-dev-shm-usage",
			],
		});

		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});

		const page = await context.newPage();
		page.on("console", (msg) => {
			const text = msg.text();
			if (text.includes("Cbct") || text.includes("GL") || text.includes("render") || text.includes("error") || text.includes("warn") || text.includes("Volume")) {
				console.log(`[PAGE ${msg.type()}]:`, text);
			}
		});
		page.on("pageerror", (err) => console.error("[PAGE ERROR]:", err));

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
					status: 200, contentType: "application/json",
					body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" } }),
				});
			}
			if (url.includes("/api/auth/staff/unlock")) {
				return route.fulfill({
					status: 200, contentType: "application/json",
					body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
				});
			}
			if (url.includes("/api/schedule")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
			}
			if (url.includes("/api/patients")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
			}
			if (url.includes("/api/imaging/studies")) {
				return route.fulfill({
					status: 200, contentType: "application/json",
					body: JSON.stringify([{ id: "study-zakharov-cbct", patientId: "pat-zakharov", patientName: "Захаров Иван Дмитриевич", modality: "CT", seriesDescription: "3D КЛКТ Захаров (313 срезов)", status: "completed", createdAt: new Date().toISOString() }]),
				});
			}
			return route.fulfill({
				status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
			});
		});

		// Pre-seed localStorage
		await page.addInitScript(() => {
			try {
				class SafeMockWebSocket {
					constructor() { this.readyState = 1; }
					send() {}
					close() {}
					addEventListener() {}
					removeEventListener() {}
				}
				window.WebSocket = SafeMockWebSocket;
			} catch {}

			localStorage.setItem("dente_clinic_token", "audit-token-clinic");
			localStorage.setItem("dente_staff_token", "audit-token-staff");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		});

		console.log("Navigating to http://127.0.0.1:5173/#imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		// Build real Zakharov 313 volume
		console.log("Fetching & assembling real Zakharov 313-slice CBCT volume...");
		let buildResult;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				buildResult = await page.evaluate(async () => {
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
						let rows = 600, cols = 600, sliceLocationZ = 0, instanceNumber = 1;
						let pixelSpacingX = 0.25, pixelSpacingY = 0.25, sliceThickness = 0.25;
						let pixelDataOffset = -1, pixelDataLength = 0;

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
								pixelDataOffset = tagValOff; pixelDataLength = tagLen;
								break;
							}
						}
						if (pixelDataOffset === -1) {
							pixelDataOffset = len - rows * cols * 2;
							pixelDataLength = rows * cols * 2;
						}
						return { rows, cols, sliceLocationZ, instanceNumber, pixelSpacingX, pixelSpacingY, sliceThickness, pixelDataOffset, pixelDataLength };
					}

					const validEntries = [];
					for (const b of buffers) {
						const h = parseHeader(b.buffer);
						if (h.rows === 600 && h.cols === 600 && h.pixelDataOffset > 0 && (h.pixelDataOffset + 600 * 600 * 2) <= b.buffer.byteLength) {
							validEntries.push({ header: h, buffer: b.buffer, name: b.name });
						}
					}
					validEntries.sort((a, b) => a.header.sliceLocationZ - b.header.sliceLocationZ);

					const width = 600;
					const height = 600;
					const depth = validEntries.length;
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
						defaultWindowWidth: 4025,
						defaultWindowLevel: 525,
						isDisposed: false,
					};

					window.__cbctDemoVolume = liveVolume;
					return { slicesCount: depth, dimensions: `${width}x${height}x${depth}`, totalVoxels: voxelData.length, elapsedMs: performance.now() - t0 };
				});
				break;
			} catch (e) {
				if (attempt < 3 && (e.message.includes("Execution context was destroyed") || e.message.includes("navigation"))) {
					console.warn(`[WARN] Build volume retry ${attempt}...`);
					await page.waitForTimeout(3000);
					continue;
				}
				throw e;
			}
		}

		console.log("[Volume Assembly Success]:", buildResult);

		// Launch the CBCT Studio Modal
		console.log("Opening CbctMprImplantStudioModal via 'КЛКТ Студия 3D' button...");
		const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
		await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
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
		await page.waitForTimeout(2000);

		const diag = await page.evaluate(() => {
			const axialContainer = document.querySelector("[data-testid='cbct-viewport-container-axial']");
			const canvases = axialContainer ? Array.from(axialContainer.querySelectorAll("canvas")) : [];
			const baseCanvas = canvases[0];
			const overlayCanvas = canvases[1];
			let baseNonZero = 0;
			if (baseCanvas) {
				const ctx = baseCanvas.getContext("2d");
				if (ctx) {
					const data = ctx.getImageData(0, 0, Math.min(baseCanvas.width, 100), Math.min(baseCanvas.height, 100)).data;
					for (let i = 0; i < data.length; i += 4) {
						if (data[i] || data[i+1] || data[i+2] || data[i+3]) baseNonZero++;
					}
				}
			}
			return {
				canvasesCount: canvases.length,
				baseW: baseCanvas?.width,
				baseH: baseCanvas?.height,
				baseStyleW: baseCanvas?.style?.width,
				baseStyleH: baseCanvas?.style?.height,
				baseNonZero,
				overlayW: overlayCanvas?.width,
				overlayH: overlayCanvas?.height,
			};
		});
		console.log("[DIAGNOSTIC AXIAL CANVAS]:", diag);

		const glDiag = await page.evaluate(() => {
			const win = window;
			const vol = win.__cbctDemoVolume;
			if (!vol) return { error: "No volume on window" };
			const axialContainer = document.querySelector("[data-testid='cbct-viewport-container-axial']");
			const canvases = axialContainer ? Array.from(axialContainer.querySelectorAll("canvas")) : [];
			const baseCanvas = canvases[0];
			if (!baseCanvas) return { error: "No base canvas" };

			const ctx = baseCanvas.getContext("2d");
			const pixelCenter = ctx ? Array.from(ctx.getImageData(300, 300, 1, 1).data) : null;
			const pixel100 = ctx ? Array.from(ctx.getImageData(100, 100, 1, 1).data) : null;
			const pixel200 = ctx ? Array.from(ctx.getImageData(200, 200, 1, 1).data) : null;
			const pixel400 = ctx ? Array.from(ctx.getImageData(400, 400, 1, 1).data) : null;
			const centerVox = vol.data[Math.floor(vol.dimensions.depth / 2) * 600 * 600 + 300 * 600 + 300];

			// Also let's inspect the first 20 pixels around (300, 300)
			const patch = ctx ? Array.from(ctx.getImageData(280, 280, 40, 40).data) : [];
			let patchNonZeroR = 0, patchMaxR = 0;
			for (let i = 0; i < patch.length; i += 4) {
				if (patch[i] > 0) patchNonZeroR++;
				if (patch[i] > patchMaxR) patchMaxR = patch[i];
			}

			return {
				volDims: vol.dimensions,
				volVoxelCenterHU: centerVox,
				pixelCenter,
				pixel100,
				pixel200,
				pixel400,
				patchNonZeroR,
				patchMaxR,
				baseCanvasClientW: baseCanvas.clientWidth,
				baseCanvasClientH: baseCanvas.clientHeight,
				baseCanvasW: baseCanvas.width,
				baseCanvasH: baseCanvas.height,
			};
		});
		console.log("[GL DIAGNOSTIC CENTER PIXELS]:", glDiag);

		// Switch to Implant Planning workspace tab (МАНДАТ 8e)
		console.log("Switching to 'Имплантация' workspace tab...");
		const tabImplant = page.locator("button:has-text('Имплантация'), [data-tab-id='implant'], [data-testid='cbct-tab-implant'], [data-testid='cbct-mode-implant-btn']").first();
		await tabImplant.waitFor({ state: "visible", timeout: 15000 });
		await tabImplant.click();
		await page.waitForTimeout(1000);

		// Ensure right sidebar is open
		const hudLocator = page.locator("[data-testid='cbct-implant-live-telemetry-hud']");
		if (!(await hudLocator.isVisible().catch(() => false))) {
			const sidebarToggle = page.locator("[data-testid='cbct-toggle-sidebar-btn']");
			if (await sidebarToggle.isVisible().catch(() => false)) {
				console.log("Toggling sidebar open...");
				await sidebarToggle.click();
				await page.waitForTimeout(500);
			}
		}

		// Ensure right sidebar is open and telemetry HUD is visible
		console.log("Verifying Live Telemetry HUD & Misch 3-Zone Density Profile...");
		const telemetryHud = page.locator("[data-testid='cbct-implant-live-telemetry-hud']");
		await telemetryHud.waitFor({ state: "visible", timeout: 15000 });

		// Inspect all HUD elements
		const hudReport = await page.evaluate(() => {
			const classBadge = document.querySelector("[data-testid='cbct-implant-misch-class-badge']")?.textContent?.trim();
			const crestHU = document.querySelector("[data-testid='misch-zone-crest-hu']")?.textContent?.trim();
			const coreHU = document.querySelector("[data-testid='misch-zone-core-hu']")?.textContent?.trim();
			const apexHU = document.querySelector("[data-testid='misch-zone-apex-hu']")?.textContent?.trim();
			const drillingProtocol = document.querySelector("[data-testid='cbct-implant-drilling-protocol']")?.textContent?.trim();
			const nerveClearance = document.querySelector("[data-testid='cbct-implant-nerve-clearance-badge']")?.textContent?.trim();
			const ridgeBadge = document.querySelector("[data-testid='cbct-ridge-measurements-badge']")?.textContent?.trim();
			const selectedImplant = document.querySelector("[data-testid='cbct-selected-implant-card']")?.textContent?.trim();

			const quadGrid = document.querySelector("[data-testid='cbct-mpr-quad-grid']");
			const aside = document.querySelector("aside");
			const main = document.querySelector("main");

			return {
				classBadge,
				crestHU,
				coreHU,
				apexHU,
				drillingProtocol,
				nerveClearance,
				ridgeBadge,
				selectedImplant: selectedImplant?.slice(0, 100),
				quadGridRect: quadGrid ? { w: quadGrid.offsetWidth, h: quadGrid.offsetHeight } : null,
				asideRect: aside ? { w: aside.offsetWidth, h: aside.offsetHeight } : null,
				asideClass: aside?.className,
			};
		});

		console.log("\n============================================================");
		console.log("RED TEAM MISCH TELEMETRY AUDIT (LIVE HUD)");
		console.log("============================================================");
		console.log("Misch Classification Badge:", hudReport.classBadge);
		console.log("3-Zone Density [Crest 20%]:", hudReport.crestHU);
		console.log("3-Zone Density [Core 60%]:", hudReport.coreHU);
		console.log("3-Zone Density [Apex 20%]:", hudReport.apexHU);
		console.log("Clinical Drilling Protocol:", hudReport.drillingProtocol);
		console.log("IAN Nerve Clearance Badge:", hudReport.nerveClearance);
		console.log("Alveolar Ridge Measurement:", hudReport.ridgeBadge);
		console.log("Quad Grid Rect:", hudReport.quadGridRect);
		console.log("Aside Rect:", hudReport.asideRect);
		console.log("============================================================\n");

		// Test 1-Click "+ В план & смету"
		console.log("Testing 1-Click: '+ В план & смету'...");
		const addToPlanBtn = page.locator("[data-testid='cbct-implant-add-to-plan-btn'], [data-testid='add-implant-to-plan-btn']").first();
		if (await addToPlanBtn.isVisible().catch(() => false)) {
			await addToPlanBtn.click();
			await page.waitForTimeout(500);
			console.log("[1-CLICK PLAN]: Clicked successfully.");
		}

		// Test 1-Click "В ЭМК"
		console.log("Testing 1-Click: 'В ЭМК'...");
		const exportEmrBtn = page.locator("[data-testid='cbct-implant-add-to-emr-btn'], [data-testid='cbct-btn-export-emr']").first();
		if (await exportEmrBtn.isVisible().catch(() => false)) {
			await exportEmrBtn.click();
			await page.waitForTimeout(500);
			console.log("[1-CLICK EMR]: Clicked successfully.");
		}

		async function inspectViewportCanvases(pg, name) {
			const result = await pg.evaluate((viewportName) => {
				const canvases = Array.from(document.querySelectorAll("canvas"));
				const report = [];
				for (const c of canvases) {
					const ctx = c.getContext("2d");
					let nonZero = 0;
					let maxR = 0;
					if (ctx && c.width > 0 && c.height > 0) {
						try {
							const imgData = ctx.getImageData(0, 0, Math.min(c.width, 150), Math.min(c.height, 150)).data;
							for (let i = 0; i < imgData.length; i += 4) {
								if (imgData[i] || imgData[i + 1] || imgData[i + 2]) {
									nonZero++;
									if (imgData[i] > maxR) maxR = imgData[i];
								}
							}
						} catch {}
					}
					report.push({
						w: c.width,
						h: c.height,
						clientW: c.clientWidth,
						clientH: c.clientHeight,
						nonZero,
						maxR,
						className: c.className?.slice(0, 40),
					});
				}
				return { viewportName, canvasesCount: canvases.length, canvases: report };
			}, name);
			console.log(`[PIXEL AUDIT ${name}]: Canvases: ${result.canvasesCount}`);
			for (const [idx, c] of result.canvases.entries()) {
				console.log(`   Canvas #${idx}: ${c.w}x${c.h} (client: ${c.clientW}x${c.clientH}), nonZeroPixels: ${c.nonZero}, maxBrightness: ${c.maxR}/255`);
			}
			return result;
		}

		// Test Zakharov Edentulous Ridge Automation (W2/W6/H + Form 043/u)
		const ridgeAuto = page.locator("[data-testid='cbct-zakharov-ridge-automation']");
		if (await ridgeAuto.isVisible().catch(() => false)) {
			console.log("[AUDIT] Zakharov Ridge Automation visible. Testing #26, #27 and Form 043/u...");
			const btn26 = page.locator("[data-testid='cbct-ridge-tooth-26-btn']");
			if (await btn26.isVisible()) await btn26.click();

			// Test doctor inline editing
			const editToggle = page.locator("[data-testid='cbct-ridge-edit-043-toggle-btn']");
			if (await editToggle.isVisible()) {
				await editToggle.click();
				await page.waitForTimeout(300);
				const textarea = page.locator("[data-testid='cbct-ridge-043-textarea']");
				if (await textarea.isVisible()) {
					console.log("[AUDIT] Form 043/u textarea opened successfully. Doctor can edit protocol.");
				}
			}

			const export043 = page.locator("[data-testid='cbct-ridge-export-043-btn']");
			if (await export043.isVisible()) {
				await export043.click();
				await page.waitForTimeout(500);
				console.log("[1-CLICK 043/u RIDGE]: Clicked successfully.");
			}
		}

		await page.waitForTimeout(1000);
		await inspectViewportCanvases(page, "Имплантация (Workspace 4)");

		// Capture high-resolution proof screenshot
		console.log(`Capturing proof screenshot to: ${PROOF_SCREENSHOT_PATH}`);
		// Save Workspace 4: Implant proof
		const implantShotPath = path.join(OUT_DIR, "proof_workspace_implant.png");
		await modal.screenshot({
			path: implantShotPath,
			animations: "disabled",
			timeout: 15000,
		});
		console.log(`[PROOF 4 CAPTURED] proof_workspace_implant.png (${(statSync(implantShotPath).size / 1024).toFixed(1)} KB)`);

		// Switch to Workspace 1: MPR 3D
		console.log("\n--- Switching to Workspace 1: MPR 3D ---");
		const tabMpr = page.locator("button:has-text('MPR 3D'), [data-tab-id='diagnostic'], [data-testid='cbct-tab-mpr-3d'], [data-testid='cbct-mode-diagnostic-btn']").first();
		await tabMpr.waitFor({ state: "visible", timeout: 10000 });
		await tabMpr.click();
		await page.waitForTimeout(2000);
		await inspectViewportCanvases(page, "MPR 3D (Workspace 1)");

		const mprShotPath = path.join(OUT_DIR, "proof_workspace_mpr.png");
		await modal.screenshot({ path: mprShotPath, animations: "disabled" });
		console.log(`[PROOF 1 CAPTURED] proof_workspace_mpr.png (${(statSync(mprShotPath).size / 1024).toFixed(1)} KB)`);

		// Switch to Workspace 2: Панорама (with Maxilla switch & Interactive Tooth Markers)
		console.log("\n--- Switching to Workspace 2: Панорама ---");
		const tabPano = page.locator("button:has-text('Панорама'), [data-tab-id='panoramic'], [data-testid='cbct-tab-panorama'], [data-testid='cbct-mode-panoramic-btn']").first();
		await tabPano.waitFor({ state: "visible", timeout: 10000 });
		await tabPano.click();
		await page.waitForTimeout(1500);

		const switchMaxillaBtn = page.locator("[data-testid='cbct-jaw-switch-maxilla-btn']");
		if (await switchMaxillaBtn.isVisible().catch(() => false)) {
			console.log("Switching jaw to Maxilla (Upper Jaw)...");
			await switchMaxillaBtn.click();
			await page.waitForTimeout(1500);
		}

		// Test Interactive Tooth Marker click
		const toothMarker26 = page.locator("[data-testid='cbct-pano-marker-tooth-26']");
		if (await toothMarker26.isVisible().catch(() => false)) {
			console.log("Clicking interactive tooth marker #26 on OPG...");
			await toothMarker26.click();
			await page.waitForTimeout(1000);
		}

		await inspectViewportCanvases(page, "Панорама (Workspace 2)");

		const panoShotPath = path.join(OUT_DIR, "proof_workspace_pano.png");
		await modal.screenshot({ path: panoShotPath, animations: "disabled" });
		console.log(`[PROOF 2 CAPTURED] proof_workspace_pano.png (${(statSync(panoShotPath).size / 1024).toFixed(1)} KB)`);

		// Switch to Workspace 3: Эндодонтия
		console.log("\n--- Switching to Workspace 3: Эндодонтия ---");
		const tabEndo = page.locator("button:has-text('Эндодонтия'), [data-tab-id='endo'], [data-testid='cbct-tab-endo'], [data-testid='cbct-mode-endo-btn']").first();
		await tabEndo.waitFor({ state: "visible", timeout: 10000 });
		await tabEndo.click();
		await page.waitForTimeout(2000);
		await inspectViewportCanvases(page, "Эндодонтия (Workspace 3)");

		const endoShotPath = path.join(OUT_DIR, "proof_workspace_endo.png");
		await modal.screenshot({ path: endoShotPath, animations: "disabled" });
		console.log(`[PROOF 3 CAPTURED] proof_workspace_endo.png (${(statSync(endoShotPath).size / 1024).toFixed(1)} KB)`);

		console.log("\n============================================================");
		console.log("ALL 4 CBCT WORKSPACES & MISCH IMPLANT PROOFS CAPTURED!");
		console.log("============================================================");
	} finally {
		if (browser) await browser.close().catch(() => {});
		if (viteProc && viteProc.pid) {
			try { execSync(`taskkill /pid ${viteProc.pid} /T /F`, { stdio: "ignore" }); }
			catch { try { viteProc.kill(); } catch {} }
		}
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR] Inquisitor script failed:", err);
	process.exit(1);
});

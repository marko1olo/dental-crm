/**
 * scripts/capture_all_4_workspaces_proof.mjs
 * Live Proof Runner & Visual Proof Auditor for all 4 CBCT Workspaces:
 * 1. «MPR 3D» (Orthogonal 2x2 multiplanar + WebGL2 3D skull, full [⤢]/[⤡] toggles, 4-way splitters)
 * 2. «Панорама» (50% GPU OPG + 25% Axial with jaw switcher [В/Ч]/[Н/Ч] + 25% Cross-sections)
 * 3. «Эндодонтия» (Paraxial root zoom + Transverse MB2 canal detector + 3D unsharp zoom cube)
 * 4. «Имплантация» (MPR mode default + Misch D1-D5 surgeon telemetry station + EMR/Plan exports)
 */

import { existsSync, mkdirSync } from "node:fs";
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
	console.log("=== CBCT 4 WORKSPACES LIVE PROOF CAPTURE ===");
	console.log("Chrome executable:", CHROME_PATH);

	let browser = null;
	const port = 5173;

	try {
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
							seriesDescription: "3D КЛКТ Захаров (312 срезов)",
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

		console.log("Navigating to http://127.0.0.1:5173/#imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		// Build real 312 Zakharov dataset
		console.log("Assembling real 312 slices volume in browser...");
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
			return { slices: depth, dimensions: `${width}x${height}x${depth}`, elapsedMs: performance.now() - t0 };
		});

		console.log("[Volume Ready]:", buildResult);

		// Open Modal
		const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
		await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
		await openMprBtn.click();

		const modal = page.locator("[data-testid='cbct-studio-modal']");
		await modal.waitFor({ state: "visible", timeout: 20000 });

		// Inject Volume
		await page.evaluate(() => {
			if (window.__cbctDemoVolume) {
				window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
			}
		});

		await page.waitForTimeout(2000);

		const workspaces = [
			{
				name: "mpr",
				btnTestId: "cbct-mode-diagnostic-btn",
				desc: "1. MPR 3D (Orthogonal 2x2 multiplanar + WebGL2 3D skull)",
				file: "proof_workspace_mpr.png",
			},
			{
				name: "pano",
				btnTestId: "cbct-mode-panoramic-btn",
				desc: "2. Панорама (50% OPG + 25% Axial with jaw switcher [В/Ч]/[Н/Ч] + 25% Cross-sections)",
				file: "proof_workspace_pano.png",
			},
			{
				name: "endo",
				btnTestId: "cbct-mode-endo-btn",
				desc: "3. Эндодонтия (Paraxial root zoom + Transverse MB2 canal detector + 3D unsharp zoom cube)",
				file: "proof_workspace_endo.png",
			},
			{
				name: "implant",
				btnTestId: "cbct-mode-implant-btn",
				desc: "4. Имплантация (MPR default + Misch D1-D5 surgeon telemetry station)",
				file: "proof_workspace_implant.png",
			},
		];

		const capturedProofs = [];

		for (const ws of workspaces) {
			console.log(`\n--- Capturing Workspace: ${ws.desc} ---`);
			const btn = page.locator(`[data-mode-testid='${ws.btnTestId}'], [data-testid='${ws.btnTestId}']`).first();
			await btn.waitFor({ state: "visible", timeout: 5000 });
			await btn.click();
			await page.waitForTimeout(2500); // Allow WebGL rAF render

			const screenshotPath = path.join(OUT_DIR, ws.file);
			await page.screenshot({ path: screenshotPath, fullPage: false });
			console.log(`[PROOF CAPTURED] ${ws.file} saved to ${screenshotPath}`);
			capturedProofs.push({ name: ws.name, path: screenshotPath });
		}

		console.log("\n=== ALL 4 WORKSPACE PROOFS CAPTURED SUCCESSFULLY ===");
		for (const p of capturedProofs) {
			console.log(`- ${p.name}: ${p.path}`);
		}
	} catch (err) {
		console.error("[Capture Script Failed]:", err);
		process.exit(1);
	} finally {
		if (browser) await browser.close();
	}
}

main();

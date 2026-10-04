/**
 * scripts/capture_all_5_departments_proof.mjs
 * Red Team Inquisitor: Comprehensive capture of all 5 CBCT departments in Light and Dark themes.
 *
 * 1. Отдел 1: MPR Quad (2x2 мультипланарная реконструкция: Аксиал, Коронал, Сагиттал, 3D/Панорама).
 * 2. Отдел 2: Панорама ОПТГ 50/50 (PanoramicWorkspace).
 * 3. Отдел 3: Имплантологическая студия (ImplantWorkspace).
 * 4. Отдел 4: Эндодонтическая студия (EndoWorkspace).
 * 5. Отдел 5: 3D Volume Viewport (CbctVolume3DViewport - разворот 4-го квадранта).
 *
 * Output: docs/screenshots/cbct_departments/
 * - 01_mpr_quad_light.png / dark.png
 * - 02_panoramic_optg_50_50_light.png / dark.png
 * - 03_implant_studio_light.png / dark.png
 * - 04_endo_studio_light.png / dark.png
 * - 05_volume3d_viewport_light.png / dark.png
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
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");

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
	console.log("=== CBCT 5 DEPARTMENTS PROOF RUNNER ===");
	console.log("Chrome executable:", CHROME_PATH);
	console.log("Output directory:", OUT_DIR);

	const watchdog = setTimeout(() => {
		console.error("[WATCHDOG TIMEOUT 90s]: Aborting script to prevent hang");
		process.exit(1);
	}, 90000);

	let browser = null;

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
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_doctor_training_completed", "true");
			localStorage.setItem("dente_training_dismissed", "true");
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
				activeTrackId: "solo_doctor",
				currentStepIndex: 0,
				completedStepIds: ["schedule_booking", "odontogram_formula", "visit_diary_043"],
				isTourActive: false,
				isDismissedPermanently: true,
				tracksProgress: {
					solo_doctor: { completed: true, completedStepIds: ["schedule_booking", "odontogram_formula", "visit_diary_043"] },
					reception_admin: { completed: true, completedStepIds: [] },
					imaging_diagnostics: { completed: true, completedStepIds: [] },
				},
			}));
			localStorage.setItem("dente_doctor_cbct_defaults_v1", JSON.stringify({
				windowWidth: 4025,
				windowLevel: 525,
				gamma: 1.50,
				airCutoffHU: -500,
				mprThicknessMm: 1.0,
				panoThicknessMm: 1.0,
			}));
		});

		page.on("pageerror", (err) => console.error("[Browser Page Error]", err.message));
		page.on("console", (msg) => {
			const txt = msg.text();
			if (!txt.includes("WebSocket") && !txt.includes("500") && !txt.includes("Download the React DevTools")) {
				console.log(`[Browser Console ${msg.type()}]`, txt);
			}
		});

		console.log("Navigating to http://127.0.0.1:5173/#imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(1500);

		// Ensure hash stays on #imaging
		await page.evaluate(() => {
			if (window.location.hash !== "#imaging") {
				window.location.hash = "#imaging";
			}
		});
		await page.waitForTimeout(1000);

		// Inject CSS to completely disable tour overlays and coach marks
		await page.addStyleTag({
			content: `
				.tour-spotlight-root, 
				[data-testid='doctor-training-coach-mark-card'], 
				[data-testid='guided-tour-spotlight-overlay'], 
				[class*='tour-backdrop'],
				[class*='spotlight'] {
					display: none !important;
					pointer-events: none !important;
				}
			`
		});

		// Build real 312 Zakharov dataset in browser memory
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
				defaultWindowWidth: 4025,
				defaultWindowLevel: 525,
				isDisposed: false,
			};

			window.__cbctDemoVolume = liveVolume;
			return { slices: depth, dimensions: `${width}x${height}x${depth}`, elapsedMs: performance.now() - t0 };
		});

		console.log("[Volume Assembly Result]:", buildResult);

		// Open Modal
		let openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr'], button:has-text('3D MPR Студия'), [data-testid='btn-open-cbct-mpr']").first();
		if (!(await openMprBtn.isVisible())) {
			console.log("[Notice]: imaging-open-3d-mpr not visible yet, locating patient Zakharov or study card...");
			const patientRow = page.locator("tr:has-text('Захаров'), tr:has-text('Иван'), [data-testid='patient-row-0']").first();
			if (await patientRow.isVisible()) {
				await patientRow.click();
				await page.waitForTimeout(1000);
			}
			const hubCard = page.locator("[data-testid='study-card-cbct'], .cursor-pointer").first();
			if (await hubCard.isVisible()) {
				await hubCard.click();
				await page.waitForTimeout(1000);
			}
			await page.evaluate(() => {
				window.location.hash = "#imaging";
			});
			const navImaging = page.locator("a[href='#imaging'], [data-tour='imaging-nav']").first();
			if (await navImaging.isVisible()) {
				await navImaging.click({ force: true });
			}
			await page.waitForTimeout(1500);
		}

		await openMprBtn.waitFor({ state: "visible", timeout: 20000 });
		try {
			await openMprBtn.click({ force: true, timeout: 3000 });
		} catch {
			await page.evaluate(() => {
				const btn = document.querySelector("[data-testid='imaging-open-3d-mpr']");
				if (btn) btn.click();
			});
		}

		const modal = page.locator("[data-testid='cbct-studio-modal']");
		await modal.waitFor({ state: "visible", timeout: 20000 });
		console.log("[CBCT Modal Mounted]");

		// Inject Volume
		await page.evaluate(() => {
			if (window.__cbctDemoVolume) {
				window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
			}
		});

		// Wait for quad viewports grid
		console.log("Waiting for quad viewports grid to mount...");
		const quadGrid = page.locator("[data-testid='cbct-mpr-quad-grid']");
		try {
			await quadGrid.waitFor({ state: "visible", timeout: 15000 });
			console.log("[CBCT MPR Quad Grid is Active]");
		} catch {
			console.log("Quad grid not visible yet, checking if empty dropzone demo button can be clicked...");
			const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
			if (await loadDemoBtn.isVisible()) {
				await loadDemoBtn.click({ force: true });
			}
			await quadGrid.waitFor({ state: "visible", timeout: 30000 });
			console.log("[CBCT MPR Quad Grid is Active after Demo click]");
		}

		// Helper to apply theme
		async function applyTheme(theme) {
			console.log(`Setting theme to: ${theme}`);
			await page.evaluate((t) => {
				if (window.__useThemeStore) {
					window.__useThemeStore.getState().setThemeMode(t);
				}
				document.documentElement.dataset.theme = t;
				document.documentElement.classList.toggle("dark", t === "dark");
				document.documentElement.classList.toggle("light", t === "light");
				document.documentElement.style.colorScheme = t;
			}, theme);
			await page.waitForTimeout(1000);
		}

		// Helper to capture
		async function takeScreenshot(fileName) {
			const fullPath = path.join(OUT_DIR, fileName);
			await page.screenshot({ path: fullPath, fullPage: false });
			const sizeKb = (statSync(fullPath).size / 1024).toFixed(1);
			console.log(`[CAPTURED]: ${fileName} (${sizeKb} KB) -> ${fullPath}`);
			return fullPath;
		}

		const captured = [];
		const themes = ["light", "dark"];

		for (const currentTheme of themes) {
			console.log(`\n========================================`);
			console.log(`      CAPTURING DEPARTMENTS: ${currentTheme.toUpperCase()}`);
			console.log(`========================================`);
			await applyTheme(currentTheme);

			// --- Отдел 1: MPR Quad ---
			console.log(`\n--- [Отдел 1: MPR Quad (${currentTheme})] ---`);
			const mprTab = page.locator("button:has-text('MPR 3D'), [data-testid='cbct-nav-tab-mpr-3d'], [data-testid='cbct-mode-diagnostic-btn']").first();
			await mprTab.waitFor({ state: "visible", timeout: 5000 });
			await mprTab.click({ force: true });
			// Ensure quad view layout
			const quadLayoutBtn = page.locator("[data-testid='cbct-layout-quad-view']");
			if (await quadLayoutBtn.isVisible()) {
				await quadLayoutBtn.click({ force: true });
			}
			// Ensure 4th quadrant is 3D volume
			const mode3dBtnQ1 = page.locator("[data-testid='cbct-btn-mode-volume3d']");
			if (await mode3dBtnQ1.isVisible()) {
				await mode3dBtnQ1.click({ force: true });
				await page.waitForTimeout(500);
			}
			// Collapse any maximized viewport
			await page.keyboard.press("Escape");
			await page.waitForTimeout(3000);
			const f1 = await takeScreenshot(`01_mpr_quad_${currentTheme}.png`);
			captured.push(f1);

			// --- Отдел 2: Панорама ОПТГ 50/50 ---
			console.log(`\n--- [Отдел 2: Панорама ОПТГ 50/50 (${currentTheme})] ---`);
			const panoTab = page.locator("button:has-text('Панорама'), [data-testid='cbct-nav-tab-panorama'], [data-testid='cbct-mode-panoramic-btn']").first();
			await panoTab.waitFor({ state: "visible", timeout: 5000 });
			await panoTab.click({ force: true });
			await page.waitForTimeout(3000);
			const f2 = await takeScreenshot(`02_panoramic_optg_50_50_${currentTheme}.png`);
			captured.push(f2);

			// --- Отдел 3: Имплантологическая студия ---
			console.log(`\n--- [Отдел 3: Имплантологическая студия (${currentTheme})] ---`);
			const implantTab = page.locator("button:has-text('Имплантация'), [data-testid='cbct-nav-tab-implant'], [data-testid='cbct-mode-implant-btn']").first();
			await implantTab.waitFor({ state: "visible", timeout: 5000 });
			await implantTab.click({ force: true });
			await page.waitForTimeout(3000);
			const f3 = await takeScreenshot(`03_implant_studio_${currentTheme}.png`);
			captured.push(f3);

			// --- Отдел 4: Эндодонтическая студия ---
			console.log(`\n--- [Отдел 4: Эндодонтическая студия (${currentTheme})] ---`);
			const endoTab = page.locator("button:has-text('Эндодонтия'), [data-testid='cbct-nav-tab-endo'], [data-testid='cbct-mode-endo-btn']").first();
			await endoTab.waitFor({ state: "visible", timeout: 5000 });
			await endoTab.click({ force: true });
			await page.waitForTimeout(3000);
			const f4 = await takeScreenshot(`04_endo_studio_${currentTheme}.png`);
			captured.push(f4);

			// --- Отдел 5: 3D Volume Viewport (Полноэкранный разворот 4-го квадранта) ---
			console.log(`\n--- [Отдел 5: 3D Volume Viewport (${currentTheme})] ---`);
			// Return to MPR
			await mprTab.click({ force: true });
			await page.waitForTimeout(1500);
			// Switch 4th quadrant to volume3d
			const mode3dBtn = page.locator("[data-testid='cbct-btn-mode-volume3d']");
			if (await mode3dBtn.isVisible()) {
				await mode3dBtn.click({ force: true });
				await page.waitForTimeout(1500);
			}
			// Expand volume3d to fullscreen
			const expand3dBtn = page.locator("[data-testid='btn-viewport-expand-volume3d'], [data-expand-testid='btn-viewport-expand-volume3d']").first();
			if (await expand3dBtn.isVisible()) {
				await expand3dBtn.click({ force: true });
				await page.waitForTimeout(3000);
			}
			const f5 = await takeScreenshot(`05_volume3d_viewport_${currentTheme}.png`);
			captured.push(f5);

			// Collapse 3D viewport back to grid for the next cycle
			const collapse3dBtn = page.locator("[data-testid='btn-viewport-collapse-volume3d'], [data-collapse-testid='btn-viewport-collapse-volume3d']").first();
			if (await collapse3dBtn.isVisible()) {
				await collapse3dBtn.click({ force: true });
				await page.waitForTimeout(1500);
			} else {
				await page.keyboard.press("Escape");
				await page.waitForTimeout(1000);
			}
		}

		console.log("\n========================================================");
		console.log(`ALL 10 SCREENSHOTS CAPTURED SUCCESSFULLY (Total: ${captured.length})`);
		console.log("========================================================");
		for (const c of captured) {
			console.log("-", c);
		}
	} catch (err) {
		console.error("[Execution Error]:", err);
		process.exit(1);
	} finally {
		clearTimeout(watchdog);
		if (browser) await browser.close();
	}
}

main();

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
	const browser = await chromium.launch({
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

	page.on("console", (msg) => {
		const txt = msg.text();
		if (!txt.includes("WebSocket") && !txt.includes("500") && !txt.includes("Download")) {
			console.log(`[PAGE ${msg.type()}]:`, txt);
		}
	});
	page.on("pageerror", (err) => console.error("[PAGE ERROR]:", err.message));

	// Intercept API routes
	const mockDashboard = {
		patientInsights: [], recommendedActions: [], appointments: [],
		clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
		payments: [], billingSummary: { totalPlannedRub: 0, totalDiscountRub: 0, totalPaidRub: 0, totalDueRub: 0, taxDeductionEligibleRub: 0, draftDocumentAmountRub: 0, openTreatmentItems: 0, unpaidDocuments: 0 },
		communicationTemplates: [], communicationTasks: [], communicationEvents: [],
		communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
		importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
	};

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
		if (url.includes("/api/dashboard")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
		if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
			});
		}
		if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
		if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
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
		return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isTourActive: false, isDismissedPermanently: true }));
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	// Inject CSS
	await page.addStyleTag({
		content: `.tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'] { display: none !important; }`
	});

	const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await openMprBtn.click();
	await page.waitForTimeout(1000);

	// Assemble real volume in page
	console.log("Assembling volume...");
	await page.evaluate(async () => {
		const manifestRes = await fetch("/radiology/demo_cbct/manifest.json");
		const manifest = await manifestRes.json();
		const buffers = [];
		for (let c = 0; c < Math.min(manifest.slices.length, 32); c++) {
			const r = await fetch(`/radiology/demo_cbct/${manifest.slices[c]}`);
			buffers.push(await r.arrayBuffer());
		}
		// Create test volume
		const width = 600, height = 600, depth = buffers.length;
		const voxelData = new Int16Array(width * height * depth);
		for (let z = 0; z < depth; z++) {
			const raw = new Uint16Array(buffers[z], 132, width * height);
			for (let i = 0; i < width * height; i++) {
				voxelData[z * width * height + i] = (raw[i] || 0) - 1000;
			}
		}
		const liveVol = {
			id: "debug-vol",
			dimensions: { width, height, depth },
			spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
			originMm: { x: 0, y: 0, z: 0 },
			physicalSizeMm: { x: 150, y: 150, z: depth * 0.25 },
			data: voxelData,
			minHU: -1000,
			maxHU: 2000,
			rescaleSlope: 1,
			rescaleIntercept: -1000,
			isDisposed: false,
		};
		window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: liveVol }));
	});

	await page.waitForTimeout(3000);

	const diag = await page.evaluate(() => {
		const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
		if (!canvas) return { error: "no cbct-volume-3d-canvas found in DOM" };

		// Check what WebGL state says
		let glResult = {};
		try {
			const gl = canvas.getContext("webgl2");
			if (gl) {
				const pix = new Uint8Array(4);
				gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
				glResult = {
					width: canvas.width,
					height: canvas.height,
					centerPixel: Array.from(pix),
					error: gl.getError(),
				};
			} else {
				glResult = { glNull: true };
			}
		} catch (e) {
			glResult = { exception: e.message };
		}

		return {
			canvasExists: true,
			styleBg: canvas.style.backgroundColor,
			className: canvas.className,
			glResult,
		};
	});

	console.log("DIAGNOSTIC RESULT:", JSON.stringify(diag, null, 2));
	await browser.close();
}

main().catch(console.error);

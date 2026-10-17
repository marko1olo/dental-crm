/**
 * scripts/capture_clinical_tasks_proofs.cjs
 *
 * 4-State Visual Proof Capture for Clinical Tasks & Shift Handoff Hub:
 * 1. docs/proofs/tasks/pc_light_1440x900.png
 * 2. docs/proofs/tasks/pc_dark_1440x900.png
 * 3. docs/proofs/tasks/mobile_light_390x844.png
 * 4. docs/proofs/tasks/mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const proofsDir = path.resolve(__dirname, "../docs/proofs/tasks");
if (!fs.existsSync(proofsDir)) {
	fs.mkdirSync(proofsDir, { recursive: true });
}

const now = new Date();
const overdueDate = new Date(now.getTime() - 2 * 86400000).toISOString();
const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0).toISOString();
const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0, 0).toISOString();

const mockTasks = [
	{
		id: "task-overdue-1",
		organizationId: "org-1",
		patientId: "pat-showcase-1",
		patientName: "Ковалев А.В.",
		treatmentPlanId: "plan-1",
		assignedDoctorId: "doc-1",
		taskType: "custom_reminder",
		status: "pending",
		title: "Забрать коронку из зуботехнической лаборатории",
		description: "Коронка из диоксида циркония на 26 зуб к плановой примерке",
		dueAt: overdueDate,
		createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
	},
	{
		id: "task-today-1",
		organizationId: "org-1",
		patientId: "pat-showcase-1",
		patientName: "Ковалев А.В.",
		treatmentPlanId: "plan-1",
		assignedDoctorId: "doc-1",
		taskType: "postop_call",
		status: "pending",
		title: "Контрольный звонок после сложного удаления 38 зуба",
		description: "Оценить самочувствие, отек и соблюдение предписаний",
		dueAt: todayDate,
		createdAt: new Date().toISOString(),
	},
	{
		id: "task-tomorrow-1",
		organizationId: "org-1",
		patientId: "pat-showcase-1",
		patientName: "Ковалев А.В.",
		treatmentPlanId: "plan-1",
		assignedDoctorId: "doc-1",
		taskType: "order_implant",
		status: "in_progress",
		title: "Заказ имплантата и костнопластического материала",
		description: "Имплантат 4.0x10 мм + мембрана Bio-Gide",
		dueAt: tomorrowDate,
		createdAt: new Date().toISOString(),
	},
	{
		id: "task-completed-1",
		organizationId: "org-1",
		patientId: "pat-showcase-1",
		patientName: "Ковалев А.В.",
		treatmentPlanId: "plan-1",
		assignedDoctorId: "doc-1",
		taskType: "recall_hygiene",
		status: "completed",
		title: "Пригласить на плановую контрольную профгигиену",
		description: "Плановый визит через 6 месяцев",
		dueAt: overdueDate,
		createdAt: new Date(now.getTime() - 100 * 86400000).toISOString(),
	},
];

async function capture() {
	console.log("Launching Chromium for Clinical Tasks visual proof...");
	const chromePath = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
		? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
		: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

	const browser = await chromium.launch({
		executablePath: chromePath,
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	async function captureOne({ name, width, height, isMobile, theme }) {
		console.log(`\n======================================================`);
		console.log(`Capturing ${name} (${width}x${height}, ${theme}, isMobile: ${isMobile})`);
		console.log(`======================================================`);
		const context = await browser.newContext({
			viewport: { width, height },
			isMobile: !!isMobile,
			hasTouch: !!isMobile,
		});
		const page = await context.newPage();

		// Inject mock tasks and theme into localStorage before page loads
		await page.addInitScript(({ t, tasks }) => {
			localStorage.setItem("dente_clinical_tasks_v1", JSON.stringify(tasks));
			localStorage.setItem("dente_clinic_token", "live-token");
			localStorage.setItem("dente_staff_token", "live-token");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_theme_mode", t);
			localStorage.setItem("dente_workspace_theme", t);
			localStorage.setItem("dente_theme", t);
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_onboarding_strip_dismissed", "true");
			document.documentElement.setAttribute("data-theme", t);
		}, { t: theme, tasks: mockTasks });

		// Standalone clinical tasks workspace
		await page.goto("http://127.0.0.1:5173/?tasks=true", {
			waitUntil: "commit",
			timeout: 30000,
		});

		// Wait for clinical tasks hub to mount
		const hub = page.locator('[data-testid="clinical-tasks-hub"]').first();
		await hub.waitFor({ state: "visible", timeout: 45000 });
		console.log("Clinical tasks hub mounted!");

		// Apply theme cleanly to document
		await page.evaluate((t) => {
			document.documentElement.setAttribute("data-theme", t);
			document.body.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
				document.body.classList.add("dark");
				document.body.classList.remove("light");
				document.documentElement.style.colorScheme = "dark";
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
				document.body.classList.remove("dark");
				document.body.classList.add("light");
				document.documentElement.style.colorScheme = "light";
			}
		}, theme);

		await page.waitForTimeout(1000);

		const outPath = path.join(proofsDir, name);
		await page.screenshot({ path: outPath, fullPage: false });
		const stats = fs.statSync(outPath);
		console.log(`Saved screenshot ${name}: ${(stats.size / 1024).toFixed(1)} KB (target >= 20 KB: ${stats.size >= 20480 ? "PASS" : "FAIL"})`);
		if (stats.size < 20480) {
			throw new Error(`Screenshot ${name} is too small: ${stats.size} bytes`);
		}

		await context.close();
	}

	await captureOne({ name: "pc_light_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "light" });
	await captureOne({ name: "pc_dark_1440x900.png", width: 1440, height: 900, isMobile: false, theme: "dark" });
	await captureOne({ name: "mobile_light_390x844.png", width: 390, height: 844, isMobile: true, theme: "light" });
	await captureOne({ name: "mobile_dark_390x844.png", width: 390, height: 844, isMobile: true, theme: "dark" });

	await browser.close();
	console.log("\nAll 4 visual proof screenshots captured successfully!");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});

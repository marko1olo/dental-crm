import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluate, waitFor } from "./lib/cdp.mjs";
import { fetchJson } from "./lib/fetchJson.mjs";
import { spawnTracked, stopTracked } from "./lib/processTracking.mjs";
import { sleep } from "./lib/sleep.mjs";

const OUT =
	"C:/Users/Admin/.gemini/antigravity/brain/68ee88bd-584a-4a7f-948f-9353d73ce6fe/scratch/screenshots";
const webBaseUrl = "http://127.0.0.1:5173";
const apiBaseUrl = "http://127.0.0.1:4100";
const cdpPort = 9225;
const width = 1440;
const height = 900;

await mkdir(OUT, { recursive: true });

const browserCandidates = [
	process.env.BROWSER_BIN,
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const browserPath = browserCandidates.find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	"screenshot-browser-profile2",
);
await mkdir(tmpProfile, { recursive: true });

const browserProcess = spawnTracked(
	"browser",
	browserPath,
	[
		"--headless=new",
		"--disable-gpu",
		"--disable-dev-shm-usage",
		"--no-first-run",
		"--remote-allow-origins=*",
		`--remote-debugging-port=${cdpPort}`,
		`--user-data-dir=${tmpProfile}`,
		`--window-size=${width},${height}`,
		`${webBaseUrl}/#documents`,
	],
	{ stdio: ["ignore", "ignore", "pipe"] },
);

try {
	const targets = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`, 60);
	const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
	if (!pageTarget?.webSocketDebuggerUrl)
		throw new Error("No page CDP target found");

	function connectCdp(wsUrl) {
		const socket = new WebSocket(wsUrl);
		let id = 0;
		const pending = new Map();
		socket.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (!message.id) return;
			const request = pending.get(message.id);
			if (!request) return;
			pending.delete(message.id);
			if (message.error) request.reject(new Error(message.error.message));
			else request.resolve(message.result);
		};
		const opened = new Promise((resolve, reject) => {
			socket.onopen = resolve;
			socket.onerror = () => reject(new Error("CDP websocket failed"));
		});
		return {
			opened,
			send(method, params = {}) {
				id += 1;
				socket.send(JSON.stringify({ id, method, params }));
				return new Promise((resolve, reject) =>
					pending.set(id, { resolve, reject }),
				);
			},
			close() {
				socket.close();
			},
		};
	}

	const cdp = connectCdp(pageTarget.webSocketDebuggerUrl);
	await cdp.opened;
	await cdp.send("Runtime.enable");
	await cdp.send("Page.enable");
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width,
		height,
		deviceScaleFactor: 1,
		mobile: false,
	});

	async function shot(name) {
		const { data } = await cdp.send("Page.captureScreenshot", {
			format: "png",
			captureBeyondViewport: true,
		});
		await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
		console.log(`Screenshot saved: ${name}.png`);
	}

	// Wait for app to load
	await waitFor(
		cdp,
		`(() => document.readyState === "complete" && Boolean(document.querySelector(".app-shell")))()`,
		"app shell",
	);
	await sleep(2000);

	// Navigate to Plan creation - create doc via form
	// Click the first "Создать выбранный документ" button
	const createBtn = await evaluate(
		cdp,
		`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Создать выбранный'));
      if (btn) { btn.click(); return 'clicked'; }
      return 'not found';
    })()`,
	);
	console.log("Create btn:", createBtn);
	await sleep(2000);
	await shot("A01_after_create_click");

	// Now navigate directly to the treatment plan HTML preview endpoint
	// First find doc IDs via API
	const dashData = await fetch(`${apiBaseUrl}/api/dashboard`).then((r) =>
		r.json(),
	);
	console.log(
		"Docs:",
		JSON.stringify(
			dashData.documents?.map((d) => ({ id: d.id, kind: d.kind })),
		),
	);

	// Create a treatment plan with AI payload via API
	const activeVisitId = dashData.activeVisit?.id;
	const activePatientId = dashData.patients?.find(
		(p) => p.id === dashData.activeVisit?.patientId,
	)?.id;
	console.log("Active visit:", activeVisitId, "Patient:", activePatientId);

	if (activeVisitId && activePatientId) {
		// Build a simple treatment plan payload
		const treatmentPlanPayload = {
			kind: "treatment_plan",
			visitId: activeVisitId,
			patientId: activePatientId,
			payload: {
				treatmentPlan: {
					plannedAt: new Date().toLocaleDateString("ru-RU"),
					doctorFullName: "Иванова Марина Сергеевна",
					clinicalReason: "Кариес, боль при накусывании в области 36",
					diagnosisSummary: "K02.1 Кариес дентина, диагноз подтверждён",
					teethOrArea: "36",
					estimatedTotalRub: 8600,
					controlPlan: "Контрольный осмотр через 3-4 недели",
					prognosisAndLimits:
						"Прогноз благоприятный при соблюдении рекомендаций по гигиене",
					alternatives: [
						"Удаление зуба с последующей имплантацией",
						"Наблюдение без активного лечения",
					],
					risksAndLimitations: [
						"Необходимость повторного лечения",
						"Изменение диагноза после диагностики",
					],
					plannedStages: [
						{
							stageName: "Диагностика и подготовка",
							plannedTiming: "до начала лечения",
							plannedServices: "Осмотр, снимки, фото-протокол",
							estimatedAmountRub: 2000,
							clinicalNotes: "",
						},
						{
							stageName: "Основное лечение",
							plannedTiming: "по расписанию клиники",
							plannedServices: "Лечение кариеса, пломбировка канала",
							estimatedAmountRub: 6600,
							clinicalNotes: "Объём корректируется по клинической ситуации",
						},
					],
					patientFriendlyExplanation:
						"У вас кариес на зубе 36 (нижний коренной). Зуб лечим в 2 этапа: сначала диагностика, потом лечение с удалением повреждённой ткани и пломбировкой. После лечения зуб будет служить долго при хорошей гигиене.",
					patientHygieneAdvice:
						"Чистите зубы дважды в день по 3 минуты. Используйте межзубные ёршики — именно там начинается большинство кариесов. После лечения не нагружайте зуб твёрдой пищей 2 дня. Рекомендуем пасту с фтором 1450 ppm.",
				},
			},
		};

		const createResult = await fetch(`${apiBaseUrl}/api/documents`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(treatmentPlanPayload),
		});
		const createData = await createResult.json();
		console.log("Create result:", JSON.stringify(createData));

		if (createData.id) {
			const docId = createData.id;
			console.log("Treatment plan doc ID:", docId);

			// Navigate to HTML preview
			await cdp.send("Page.navigate", {
				url: `${apiBaseUrl}/api/documents/${docId}/treatment-plan-pdf?preview=1`,
			});
			await sleep(4000);
			await cdp.send("Emulation.setDeviceMetricsOverride", {
				width: 1280,
				height: 1800,
				deviceScaleFactor: 1,
				mobile: false,
			});
			await shot("B01_treatment_plan_top");

			await cdp.send("Runtime.evaluate", {
				expression: "window.scrollTo(0, 1500)",
				returnByValue: true,
			});
			await sleep(500);
			await shot("B02_treatment_plan_middle");

			await cdp.send("Runtime.evaluate", {
				expression: "window.scrollTo(0, 3500)",
				returnByValue: true,
			});
			await sleep(500);
			await shot("B03_treatment_plan_lower");

			await cdp.send("Runtime.evaluate", {
				expression: "window.scrollTo(0, 6000)",
				returnByValue: true,
			});
			await sleep(500);
			await shot("B04_treatment_plan_hygiene");

			await cdp.send("Runtime.evaluate", {
				expression: "window.scrollTo(0, document.body.scrollHeight)",
				returnByValue: true,
			});
			await sleep(500);
			await shot("B05_treatment_plan_bottom");
		}
	}

	// Navigate back to doctor UI and screenshot the documents tab
	await cdp.send("Page.navigate", { url: `${webBaseUrl}/#documents` });
	await sleep(2000);
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 1440,
		height: 900,
		deviceScaleFactor: 1,
		mobile: false,
	});
	await shot("C01_doctor_documents_view");

	// Click "Открыть" on first document card in the catalog
	const catalogClick = await evaluate(
		cdp,
		`(() => {
      // Find document catalog cards
      const openBtns = Array.from(document.querySelectorAll('.doc-catalog-item button, .catalog-doc button, [data-catalog] button'));
      const allOpenBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Открыть');
      console.log('Open buttons:', allOpenBtns.length);
      if (allOpenBtns.length > 0) { allOpenBtns[0].click(); return 'clicked Открыть #1'; }
      return 'not found';
    })()`,
	);
	console.log("Catalog click:", catalogClick);
	await sleep(2000);
	await shot("C02_after_open_doc");

	cdp.close();
} finally {
	await stopTracked(browserProcess);
}

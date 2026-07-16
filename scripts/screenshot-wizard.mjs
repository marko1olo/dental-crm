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
const cdpPort = 9226;
const width = 1440;
const height = 900;

await mkdir(OUT, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const browserPath = browserCandidates.find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	"screenshot-wizard-profile",
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

	const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
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
	await new Promise((resolve, reject) => {
		socket.onopen = resolve;
		socket.onerror = () => reject(new Error("CDP failed"));
	});

	const cdp = {
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

	// Wait for app
	await waitFor(
		cdp,
		`(() => document.readyState === "complete" && Boolean(document.querySelector(".app-shell")))()`,
		"app shell",
	);
	await sleep(3000);

	// Select treatment plan in the dropdown
	const selectResult = await evaluate(
		cdp,
		`(() => {
    const sel = document.querySelector('select');
    if (!sel) return 'no select found';
    const options = Array.from(sel.options);
    const planOpt = options.find(o => o.value === 'treatment_plan' || o.text.includes('план лечения') || o.text.toLowerCase().includes('план'));
    if (!planOpt) return 'option not found: ' + options.map(o => o.value).join(',');
    sel.value = planOpt.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return 'selected: ' + planOpt.value;
  })()`,
	);
	console.log("Select result:", selectResult);
	await sleep(1500);

	await shot("W01_step1_clinical");

	// Scroll down to see full step 1
	await cdp.send("Runtime.evaluate", {
		expression: "window.scrollTo(0, 300)",
		returnByValue: true,
	});
	await sleep(500);
	await shot("W02_step1_lower");

	// Click step 2 tab
	const step2Click = await evaluate(
		cdp,
		`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('2 ·') || b.textContent.includes('Этапы'));
    if (btn) { btn.click(); return 'clicked step 2'; }
    return 'not found';
  })()`,
	);
	console.log("Step 2 click:", step2Click);
	await sleep(800);
	await cdp.send("Runtime.evaluate", {
		expression: "window.scrollTo(0, 200)",
		returnByValue: true,
	});
	await sleep(300);
	await shot("W03_step2_stages");

	// Click step 3 tab
	const step3Click = await evaluate(
		cdp,
		`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('3 ·') || b.textContent.includes('Пациенту'));
    if (btn) { btn.click(); return 'clicked step 3'; }
    return 'not found';
  })()`,
	);
	console.log("Step 3 click:", step3Click);
	await sleep(800);
	await cdp.send("Runtime.evaluate", {
		expression: "window.scrollTo(0, 200)",
		returnByValue: true,
	});
	await sleep(300);
	await shot("W04_step3_patient");

	// Also check the "details" accordion - go back to step 1 and open it
	const step1Click = await evaluate(
		cdp,
		`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('1 ·') || b.textContent.includes('Клиника'));
    if (btn) { btn.click(); return 'clicked step 1'; }
    return 'not found';
  })()`,
	);
	await sleep(600);
	const detailsClick = await evaluate(
		cdp,
		`(() => {
    const d = document.querySelector('details');
    if (d) { d.open = true; return 'opened details'; }
    return 'no details';
  })()`,
	);
	console.log("Details:", detailsClick);
	await sleep(500);
	await cdp.send("Runtime.evaluate", {
		expression: "window.scrollTo(0, 400)",
		returnByValue: true,
	});
	await sleep(300);
	await shot("W05_step1_details_open");

	cdp.close();
} finally {
	await stopTracked(browserProcess);
}

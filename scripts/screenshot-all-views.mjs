import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT =
	"C:/Users/Admin/.gemini/antigravity/brain/68ee88bd-584a-4a7f-948f-9353d73ce6fe/scratch/screenshots";
const webBaseUrl = "http://127.0.0.1:5173";
const cdpPort = 9227;
const width = 1440;
const height = 900;

await mkdir(OUT, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserPath = browserCandidates.find((c) => existsSync(c));
if (!browserPath) throw new Error("No browser found");

const tmpProfile = path.join(
	process.env.TEMP || "C:/tmp",
	"screenshot-all-profile",
);
await mkdir(tmpProfile, { recursive: true });

const { spawn } = await import("node:child_process");
const browser = spawn(
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
		`${webBaseUrl}/`,
	],
	{ stdio: ["ignore", "ignore", "pipe"] },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTargets(retries = 30) {
	for (let i = 0; i < retries; i++) {
		try {
			const r = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
			const t = await r.json();
			if (t.length) return t;
		} catch {}
		await sleep(1000);
	}
	throw new Error("CDP not ready");
}

const targets = await getTargets();
const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
socket.onmessage = (ev) => {
	const msg = JSON.parse(ev.data);
	if (!msg.id) return;
	const req = pending.get(msg.id);
	if (!req) return;
	pending.delete(msg.id);
	if (msg.error) req.reject(new Error(msg.error.message));
	else req.resolve(msg.result);
};
await new Promise((res, rej) => {
	socket.onopen = res;
	socket.onerror = () => rej(new Error("WS fail"));
});

const cdp = {
	send(method, params = {}) {
		id++;
		socket.send(JSON.stringify({ id, method, params }));
		return new Promise((res, rej) =>
			pending.set(id, { resolve: res, reject: rej }),
		);
	},
};

await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", {
	width,
	height,
	deviceScaleFactor: 1,
	mobile: false,
});

async function shot(name) {
	const { data } = await cdp.send("Page.captureScreenshot", {
		format: "png",
		captureBeyondViewport: false,
	});
	await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
	console.log(`✓ ${name}.png`);
}

async function nav(hash) {
	await cdp.send("Runtime.evaluate", {
		expression: `window.location.hash = "${hash}"`,
		returnByValue: true,
	});
	await sleep(2500);
}

async function scrollTo(y) {
	await cdp.send("Runtime.evaluate", {
		expression: `window.scrollTo(0, ${y})`,
		returnByValue: true,
	});
	await sleep(400);
}

async function click(selector) {
	const r = await cdp.send("Runtime.evaluate", {
		expression: `(() => { const el = document.querySelector('${selector}'); if (el) { el.click(); return true; } return false; })()`,
		returnByValue: true,
	});
	return r?.result?.value;
}

// Wait for app to load
await sleep(5000);

// 1. Main shift/dashboard view
await nav("#shift");
await sleep(2000);
await shot("V01_shift_dashboard");
await scrollTo(400);
await sleep(300);
await shot("V02_shift_dashboard_lower");

// 2. Patients list
await nav("#patients");
await sleep(2000);
await shot("V03_patients_list");

// 3. Visit/appointment view (try to click first patient)
const clickedPatient = await cdp.send("Runtime.evaluate", {
	expression: `(() => {
    const links = Array.from(document.querySelectorAll('a, .patient-row, .appointment-row, tr'));
    const first = links.find(l => l.href?.includes('patient') || l.className?.includes('patient'));
    if (first) { first.click(); return 'clicked: ' + first.tagName; }
    return 'not found';
  })()`,
	returnByValue: true,
});
console.log("Patient click:", clickedPatient?.result?.value);
await sleep(2000);
await shot("V04_patient_detail");

// 4. Snap (X-ray) view
await nav("#imaging");
await sleep(2000);
await shot("V05_snaps");

// 5. Appointments
await nav("#schedule");
await sleep(2000);
await shot("V06_appointments");
await scrollTo(300);
await shot("V07_appointments_lower");

// 6. Back to docs - full page
await nav("#documents");
await sleep(2000);
await shot("V08_documents_picker");
await scrollTo(500);
await shot("V09_documents_list");

// 7. Visit view specifically - direct navigation
await nav("#visit");
await sleep(2000);
await shot("V10_visit_open");

// Open Tooth Map Modal and take screenshot
try {
	console.log("Opening Tooth Map Modal...");
	await cdp.send("Runtime.evaluate", {
		expression: `Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Открыть зубную карту')).click()`,
		awaitPromise: true,
	});
	await sleep(1000);
	await shot("V10_tooth_map_modal");

	console.log("Closing Tooth Map Modal...");
	await cdp.send("Runtime.evaluate", {
		expression: `Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('✕')).click()`,
		awaitPromise: true,
	});
	await sleep(500);
} catch (e) {
	console.error("Failed to screenshot Tooth Map Modal:", e);
}

// 8. Visit form details
await scrollTo(300);
await shot("V11_visit_form");
await scrollTo(600);
await shot("V12_visit_form_lower");

socket.close();
browser.kill();
console.log("Done");

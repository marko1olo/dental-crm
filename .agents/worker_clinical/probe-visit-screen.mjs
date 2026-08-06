// Разведка экрана «Прием» в живом браузере: что реально отрисовалось.
// Только чтение: ни одного запроса на изменение данных не отправляется,
// клики выполняются лишь по локальным переключателям вкладок.
// Черновик проверки, в дерево не коммитится.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fetchJson } from "../../scripts/lib/fetchJson.mjs";
import { findFreePort } from "../../scripts/lib/findFreePort.mjs";
import { sleep } from "../../scripts/lib/sleep.mjs";

const targetUrl = process.argv[2] ?? "http://127.0.0.1:5173/#visit";
const shotPath = process.argv[3] ?? path.join(os.tmpdir(), "probe-visit.png");
const port = await findFreePort();
const profileDir = path.join(os.tmpdir(), `probe-visit-${process.pid}`);

const browserCandidates = [
	process.env.BROWSER_BIN,
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const browserPath = browserCandidates.find((candidate) =>
	existsSync(candidate),
);
if (!browserPath) throw new Error("Браузер не найден");

const browser = spawn(
	browserPath,
	[
		"--headless=new",
		"--disable-gpu",
		"--disable-dev-shm-usage",
		"--no-first-run",
		"--no-default-browser-check",
		"--remote-allow-origins=*",
		`--remote-debugging-port=${port}`,
		`--user-data-dir=${profileDir}`,
		"--window-size=1440,1800",
		targetUrl,
	],
	{ stdio: ["ignore", "ignore", "ignore"] },
);

function connect(wsUrl) {
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
		socket.onerror = () => reject(new Error("CDP не подключился"));
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
	};
}

const evaluate = async (cdp, expression) => {
	// awaitPromise: без него асинхронное выражение отдаёт промис, а value приходит пустым.
	const response = await cdp.send("Runtime.evaluate", {
		expression,
		returnByValue: true,
		awaitPromise: true,
	});
	if (response.exceptionDetails) {
		return {
			__error: response.exceptionDetails.text ?? "исключение при вычислении",
		};
	}
	return response.result.value;
};

try {
	// Порт отладки поднимается не мгновенно: ждём с повторами, а не одной паузой.
	let targets = null;
	for (let attempt = 0; attempt < 40 && !targets; attempt += 1) {
		await sleep(1000);
		try {
			targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
		} catch {
			targets = null;
		}
	}
	if (!targets) throw new Error("браузер не открыл порт отладки");
	const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
	const cdp = connect(pageTarget.webSocketDebuggerUrl);
	await cdp.opened;
	await cdp.send("Runtime.enable");
	await cdp.send("Page.enable");
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 1440,
		height: 1800,
		deviceScaleFactor: 1,
		mobile: false,
	});
	// Вход тем же демо-доступом, что использует scripts/dente-redesign-shots.mjs
	// (адрес и пароль — из окружения, значения по умолчанию лежат в том сценарии).
	// Роль рабочего места ставим «врач»: именно её экран проверяется.
	const email = process.env.DENTE_SHOT_EMAIL || "doctor@clinic.com";
	const password = process.env.DENTE_SHOT_PASSWORD || "password";
	const session = await evaluate(
		cdp,
		`(async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ${JSON.stringify(JSON.stringify({ email, password }))}
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.clinicToken || !body?.staffToken) {
          return { ok: false, status: response.status, reason: body?.error || body?.message || 'в ответе нет токенов' };
        }
        localStorage.setItem("dente_clinic_token", body.clinicToken);
        localStorage.setItem("dente_staff_token", body.staffToken);
        if (body.user?.organizationId) localStorage.setItem("dente_clinic_tenant_id", body.user.organizationId);
        localStorage.setItem("dente_workspace_role", "doctor");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ version: 1, dismissed: true, savedAt: new Date().toISOString() }));
        localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
          version: 1,
          selectedWorkspaceRole: "doctor",
          onboardingDismissed: true,
          onboardingDismissedAt: new Date().toISOString(),
          onboardingDraftMode: false,
          savedAt: new Date().toISOString()
        }));
        localStorage.setItem("dente_onboarding_dismissed_v1", JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
        return { ok: true, status: response.status };
      } catch (error) {
        return { ok: false, status: 0, reason: error.message };
      }
    })()`,
	);
	console.log(
		JSON.stringify({
			step: "вход",
			ok: session?.ok === true,
			status: session?.status,
			reason: session?.reason ?? null,
		}),
	);
	if (session?.ok !== true)
		throw new Error("без сессии дальше смотреть нечего");

	await cdp.send("Page.navigate", { url: targetUrl });
	await sleep(11000);

	const overview = await evaluate(
		cdp,
		`(() => ({
      readyState: document.readyState,
      hash: location.hash,
      hasAppShell: Boolean(document.querySelector(".app-shell")),
      hasVisitView: Boolean(document.querySelector('[data-testid="visit-view"]')),
      hasEmkTab: Boolean(document.querySelector('[data-testid="visit-emk-tab"]')),
      emkPanels: document.querySelectorAll(".visit-note-panel").length,
      emkTextareas: document.querySelectorAll('[data-testid="visit-emk-tab"] .visit-fields textarea').length,
      emkTabButtons: document.querySelectorAll('[data-testid="visit-emk-tab"] .emk-tab-button').length,
      specialtyBars: document.querySelectorAll(".specialty-focus-bar").length,
      toothButtons: document.querySelectorAll(".tooth-row button").length,
      stampNote: document.querySelector(".tooth-stamp-note")?.textContent?.trim()?.slice(0, 200) ?? null,
      servicesChecklist: document.querySelector('[data-testid="completed-services-checklist"]')?.innerText?.slice(0, 400) ?? null,
      bodyHead: document.body.innerText.slice(0, 700)
    }))()`,
	);
	console.log(JSON.stringify({ step: "обзор", overview }, null, 1));

	// Клик по вкладке «Жалобы» внутри панели ЭМК: раньше это была кнопка-пустышка.
	const tabClick = await evaluate(
		cdp,
		`(() => {
      const buttons = Array.from(document.querySelectorAll('[data-testid="visit-emk-tab"] .emk-tab-button'));
      const complaint = buttons.find((b) => b.textContent.trim().startsWith("Жалобы"));
      if (!complaint) return { clicked: false, reason: "кнопки вкладки нет" };
      complaint.click();
      return { clicked: true };
    })()`,
	);
	await sleep(900);
	const afterTab = await evaluate(
		cdp,
		`(() => {
      const scope = document.querySelector('[data-testid="visit-emk-tab"]');
      const active = scope?.querySelector(".emk-tab-button.active")?.textContent?.trim() ?? null;
      return {
        activeTab: active,
        textareas: scope?.querySelectorAll(".visit-fields textarea").length ?? 0,
        labels: Array.from(scope?.querySelectorAll(".emk-field-container strong") ?? []).map((n) => n.textContent.trim())
      };
    })()`,
	);
	console.log(
		JSON.stringify(
			{ step: "клик по вкладке Жалобы", tabClick, afterTab },
			null,
			1,
		),
	);

	// Клик по зубу 24 без штампа: должна открыться карточка зуба.
	const toothClick = await evaluate(
		cdp,
		`(() => {
      const tooth = Array.from(document.querySelectorAll(".tooth-row button")).find((b) => b.textContent.trim() === "24");
      if (!tooth) return { clicked: false };
      tooth.click();
      return { clicked: true };
    })()`,
	);
	await sleep(700);
	const modal = await evaluate(
		cdp,
		`(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      return {
        open: Boolean(dialog),
        badge: document.querySelector("._ccm-code-badge")?.textContent?.trim() ?? null,
        firstButtons: Array.from(document.querySelectorAll("._ccm-btn")).slice(0, 4).map((b) => b.textContent.trim())
      };
    })()`,
	);
	console.log(
		JSON.stringify({ step: "клик по зубу 24", toothClick, modal }, null, 1),
	);

	const capture = await cdp.send("Page.captureScreenshot", {
		format: "png",
		captureBeyondViewport: true,
	});
	await writeFile(shotPath, Buffer.from(capture.data, "base64"));
	console.log(JSON.stringify({ step: "снимок", shotPath }));
} finally {
	browser.kill();
}

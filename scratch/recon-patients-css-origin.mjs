/**
 * КТО ВЫИГРЫВАЕТ КАСКАД. Замер вёрстки показал paddingLeft=12px у поля поиска,
 * хотя patients-redesign.css:44 просит 40px, и border-radius 4px у подсказки
 * «следующее действие», хотя main.css:9610 просит 999px. Значит правило, по
 * которому ведущий проверял отступ, до экрана не доходит — и вывод «наложения
 * нет» по этому правилу был бы неверен.
 *
 * Здесь спрашивается сам браузер: CSS.getMatchedStylesForNode отдаёт ВСЕ
 * подходящие правила в порядке каскада, с файлом и строкой. Это единственный
 * способ узнать победителя, не считая специфичность руками.
 *
 * ЗАПУСК: node scratch/recon-patients-css-origin.mjs
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const webBaseUrl = process.env.DENTE_RECON_WEB_URL || "http://127.0.0.1:5173";
const apiBaseUrl = process.env.DENTE_RECON_API_URL || "http://127.0.0.1:4100";
const cdpPort = Number(process.env.DENTE_RECON_CDP_PORT || 9378);
const OUT = "C:/Clinic_MVP/dental-crm/scratch/recon-shots";

const probe = await fetch(webBaseUrl).catch((error) => {
	throw new Error(`Веб-сервер на ${webBaseUrl} недоступен (${error.message}).`);
});
if (!probe.ok) throw new Error(`Веб-сервер ответил ${probe.status}`);
await mkdir(OUT, { recursive: true });

const loginResponse = await fetch(`${apiBaseUrl}/api/auth/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "doctor@clinic.com", password: "password" }),
});
if (!loginResponse.ok) throw new Error(`Вход отклонён: HTTP ${loginResponse.status}`);
const { clinicToken, staffToken } = await loginResponse.json();

const dashboardFile = "C:/Clinic_MVP/dental-crm/scratch/recon-dashboard-d001.json";
if (!existsSync(dashboardFile)) throw new Error(`Нет ${dashboardFile}`);
const dashboardJson = await readFile(dashboardFile, "utf8");

const browserPath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Браузер не найден");

const tmpProfile = path.join(process.env.TEMP || "C:/tmp", "dente-recon-css-profile");
await mkdir(tmpProfile, { recursive: true });
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
		"--window-size=1440,900",
		`${webBaseUrl}/`,
	],
	{ stdio: ["ignore", "ignore", "pipe"] },
);
browser.stderr?.on("data", () => {});
let shuttingDown = false;
let closeSocket = () => {};
function shutdown() {
	if (shuttingDown) return;
	shuttingDown = true;
	try {
		closeSocket();
	} catch {}
	try {
		browser.kill();
	} catch {}
}
process.on("exit", shutdown);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getPageTarget(retries = 40) {
	for (let attempt = 0; attempt < retries; attempt += 1) {
		try {
			const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
			const targets = await response.json();
			const page = targets.find((target) => target.type === "page");
			if (page) return page;
		} catch {}
		await sleep(1000);
	}
	throw new Error("Отладочный порт не отвечает");
}
const pageTarget = await getPageTarget();
const { default: WebSocket } = await import("ws");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
closeSocket = () => socket.close();
await new Promise((resolve, reject) => {
	socket.once("open", resolve);
	socket.once("error", reject);
});
let messageId = 0;
const pending = new Map();
socket.on("message", (raw) => {
	const message = JSON.parse(raw.toString());
	if (message.id && pending.has(message.id)) {
		const { resolve, reject } = pending.get(message.id);
		pending.delete(message.id);
		if (message.error) reject(new Error(JSON.stringify(message.error)));
		else resolve(message.result);
	}
});
function send(method, params = {}) {
	const id = ++messageId;
	return new Promise((resolve, reject) => {
		pending.set(id, { resolve, reject });
		socket.send(JSON.stringify({ id, method, params }));
		setTimeout(() => {
			if (pending.has(id)) {
				pending.delete(id);
				reject(new Error(`${method}: нет ответа`));
			}
		}, 30000);
	});
}
async function evaluate(expression) {
	const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
	if (result.exceptionDetails) throw new Error(`Ошибка в странице: ${result.exceptionDetails.text}`);
	return result.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("DOM.enable");
await send("CSS.enable");

for (let attempt = 0; attempt < 60; attempt += 1) {
	const origin = await evaluate(`location.origin`).catch(() => null);
	if (origin && origin.includes("127.0.0.1")) break;
	await sleep(500);
}
await evaluate(`
  (() => {
    window.localStorage.setItem("dente_clinic_token", ${JSON.stringify(clinicToken)});
    window.localStorage.setItem("dente_staff_token", ${JSON.stringify(staffToken)});
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
    return true;
  })()
`);
await send("Page.addScriptToEvaluateOnNewDocument", {
	source: `
    (() => {
      const dashboard = ${dashboardJson};
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.includes("/api/dashboard")) {
          window.__RECON_DASHBOARD_SERVED__ = (window.__RECON_DASHBOARD_SERVED__ || 0) + 1;
          return new Response(JSON.stringify(dashboard), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return originalFetch(input, init);
      };
    })();
  `,
});
await send("Page.navigate", { url: `${webBaseUrl}/` });

for (let attempt = 0; attempt < 90; attempt += 1) {
	const ready = await evaluate(`Boolean(document.querySelector('.sidebar, nav .nav-item')) && !document.body.textContent.includes("ВХОД В ЛИЧНЫЙ КАБИНЕТ")`);
	if (ready) break;
	await sleep(700);
}
await evaluate(`(() => {
  const link = document.querySelector('aside.sidebar nav a[href="#patients"], .dnt-bottom-nav a[href="#patients"]');
  if (link) { link.click(); return true; }
  window.location.hash = "#patients";
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  return false;
})()`);
for (let attempt = 0; attempt < 120; attempt += 1) {
	if (await evaluate(`Boolean(document.querySelector('.patients-search-box input'))`)) break;
	await sleep(250);
}
await sleep(1200);

/** Тема, при которой снят замер: часть правил темозависима, без неё цифра безадресна. */
const themeState = await evaluate(`
  (() => ({
    dataTheme: document.documentElement.getAttribute('data-theme'),
    classes: [...document.documentElement.classList],
  }))()
`);

const { root } = await send("DOM.getDocument", { depth: -1, pierce: false });

async function matchedFor(selector, label, props) {
	const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector });
	if (!nodeId) {
		console.log(`\n### ${label}: узел «${selector}» не найден`);
		return null;
	}
	const matched = await send("CSS.getMatchedStylesForNode", { nodeId });
	const sheets = new Map();
	const rules = [];
	for (const entry of matched.matchedCSSRules ?? []) {
		const rule = entry.rule;
		const declared = (rule.style?.cssProperties ?? []).filter((p) => props.includes(p.name));
		if (declared.length === 0) continue;
		let href = rule.styleSheetId ? sheets.get(rule.styleSheetId) : null;
		if (rule.styleSheetId && href === undefined) {
			const header = await send("CSS.getStyleSheetText", { styleSheetId: rule.styleSheetId }).catch(() => null);
			href = header ? "(inline/injected)" : "(неизвестно)";
			sheets.set(rule.styleSheetId, href);
		}
		rules.push({
			selector: rule.selectorList?.text,
			origin: rule.origin,
			media: (rule.media ?? []).map((m) => m.text).join(" && ") || null,
			line: rule.style?.range?.startLine != null ? rule.style.range.startLine + 1 : null,
			свойства: declared.map((p) => `${p.name}: ${p.value}${p.important ? " !important" : ""}${p.parsedOk === false ? " (не разобрано)" : ""}`),
		});
	}
	console.log(`\n### ${label} (${selector})`);
	console.log(`  подходящих правил, объявляющих ${props.join("/")}: ${rules.length} (порядок каскада: последнее сильнее)`);
	for (const rule of rules) {
		console.log(`   ${rule.selector}${rule.media ? ` @media ${rule.media}` : ""} [${rule.origin}] строка ${rule.line}`);
		for (const declaration of rule.свойства) console.log(`      ${declaration}`);
	}
	const inline = matched.inlineStyle?.cssProperties?.filter((p) => props.includes(p.name)) ?? [];
	if (inline.length) console.log(`   ИНЛАЙН: ${inline.map((p) => `${p.name}: ${p.value}`).join("; ")}`);
	return rules;
}

console.log(`ТЕМА НА МОМЕНТ ЗАМЕРА: ${JSON.stringify(themeState)}`);
const PAD = ["padding", "padding-left", "padding-right", "padding-top", "padding-bottom"];
const RADIUS = ["border-radius", "border", "background", "background-color", "font-weight"];

const searchRules = await matchedFor(".patients-search-box input", "ПОЛЕ ПОИСКА — отступы", PAD);
const smartRules = await matchedFor(".smart-input-wrapper input", "ПОЛЕ СОЗДАНИЯ — отступы", PAD);
const pillRules = await matchedFor(".patient-next-action", "ПОДСКАЗКА «следующее действие» — вид", RADIUS);

// Итоговые вычисленные значения — чтобы победитель каскада не расходился с картинкой.
const finalValues = await evaluate(`
  (() => {
    const pick = (sel, props) => {
      const node = document.querySelector(sel);
      if (!node) return null;
      const cs = getComputedStyle(node);
      const out = {};
      for (const p of props) out[p] = cs.getPropertyValue(p);
      return out;
    };
    return {
      поиск: pick('.patients-search-box input', ['padding-left','padding-right','padding-top','padding-bottom','box-sizing']),
      создание: pick('.smart-input-wrapper input', ['padding-left','padding-right','padding-top','padding-bottom','box-sizing']),
      подсказка: pick('.patient-next-action', ['border-radius','border-top-width','padding','font-weight','cursor','display']),
      лупа: (() => {
        const svg = document.querySelector('.patients-search-box svg');
        const input = document.querySelector('.patients-search-box input');
        if (!svg || !input) return null;
        const s = svg.getBoundingClientRect(), i = input.getBoundingClientRect();
        const cs = getComputedStyle(input);
        const textStart = i.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
        return {
          иконка_право: +s.right.toFixed(2),
          начало_текста: +textStart.toFixed(2),
          наложение_px: +(s.right - textStart).toFixed(2),
        };
      })(),
    };
  })()
`);
console.log("\n=== ИТОГОВЫЕ ВЫЧИСЛЕННЫЕ ЗНАЧЕНИЯ ===");
console.log(JSON.stringify(finalValues, null, 1));

await writeFile(
	`${OUT}/patients-css-origin.json`,
	JSON.stringify({ тема: themeState, поиск: searchRules, создание: smartRules, подсказка: pillRules, вычислено: finalValues }, null, 2),
	"utf8",
);

shutdown();
await sleep(300);
process.exit(0);

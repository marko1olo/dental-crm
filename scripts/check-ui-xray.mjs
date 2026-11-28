#!/usr/bin/env node
/**
 * scripts/check-ui-xray.mjs
 *
 * Честный ЖИВОЙ браузерный аудит фронтенда (Chromium + API PG18 + Vite).
 * Проходит реальные экраны приложения в 4 состояниях (1440x900 Light/Dark, 390x844 Light/Dark),
 * снимает живой DOM X-Ray (`dom-xray-probe.mjs`) и оценивает каждый кадр (`evaluateDomXrayReport`).
 *
 * НИКАКОГО ЗАДУВАНИЯ САХАРА:
 * если хотя бы на одном экране обрезана кнопка, FAB наехал на контрол, висит забор Primary CTA,
 * торчит неон #2dd4bf, #1e293b, низкий контраст или экран загрузки — скрипт ПАДАЕТ с Exit Code 1
 * и выводит полный манифест по каждому проваленному экрану.
 *
 * Использование:
 *   node scripts/check-ui-xray.mjs                       # Базовый пакет ключевых экранов
 *   node scripts/check-ui-xray.mjs --ids 001,002,008     # Точечные экраны из screen-targets.mjs
 *   node scripts/check-ui-xray.mjs --all-views           # Все group=views цели
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { runDomXrayProbeInPage } from "../.agents/skills/visual-audit-pipeline/scripts/dom-xray-probe.mjs";
import { SCREEN_TARGETS, THEMES, VIEWPORTS } from "../.agents/skills/visual-audit-pipeline/scripts/screen-targets.mjs";
import { evaluateDomXrayReport, formatDomXrayBlockers } from "./lib/ui-xray-rules.mjs";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const DEFAULT_IDS = new Set(["001", "002", "003", "005", "006", "007", "008", "009", "010"]);

const BROWSER_CANDIDATES = [
	process.env.BROWSER_BIN,
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function makeUuidV7() {
	const bytes = crypto.randomBytes(16);
	const ts = BigInt(Date.now());
	bytes[0] = Number((ts >> 40n) & 0xffn);
	bytes[1] = Number((ts >> 32n) & 0xffn);
	bytes[2] = Number((ts >> 24n) & 0xffn);
	bytes[3] = Number((ts >> 16n) & 0xffn);
	bytes[4] = Number((ts >> 8n) & 0xffn);
	bytes[5] = Number(ts & 0xffn);
	bytes[6] = (bytes[6] & 0x0f) | 0x70;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.toString("hex");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseArgs(argv) {
	const opts = { ids: null, groups: null, all: false, allViews: false, boot: false };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--ids") {
			const collected = [];
			while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
				collected.push(...argv[++i].split(","));
			}
			opts.ids = new Set(collected.map((s) => s.trim()).filter(Boolean));
		} else if (argv[i]?.startsWith("--ids=")) {
			opts.ids = new Set(argv[i].slice(6).split(",").map((s) => s.trim()).filter(Boolean));
		} else if (argv[i] === "--group" && argv[i + 1]) {
			opts.groups = new Set(argv[++i].split(",").map((s) => s.trim()).filter(Boolean));
		} else if (argv[i]?.startsWith("--group=")) {
			opts.groups = new Set(argv[i].slice(8).split(",").map((s) => s.trim()).filter(Boolean));
		} else if (argv[i] === "--all") {
			opts.all = true;
		} else if (argv[i] === "--all-views") {
			opts.allViews = true;
		} else if (argv[i] === "--boot") {
			opts.boot = true;
		}
	}
	return opts;
}

async function serversReachable() {
	try {
		const [apiR, webR] = await Promise.all([fetch(`${API_BASE}/api/health`), fetch(APP_BASE)]);
		return apiR.ok && (webR.ok || webR.status === 304);
	} catch {
		return false;
	}
}

async function startTempServersIfRequested(shouldBoot) {
	if (await serversReachable()) return null;
	if (!shouldBoot) {
		throw new Error(`Серверы ${API_BASE} или ${APP_BASE} не запущены! Передай --boot или подними dev-окружение.`);
	}
	const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
		stdio: "ignore",
		shell: process.platform === "win32",
		detached: false,
	});
	const deadline = Date.now() + 45_000;
	while (Date.now() < deadline) {
		if (await serversReachable()) return child;
		await wait(1000);
	}
	child.kill();
	throw new Error("Не удалось дождаться старта API/Web серверов за 45с.");
}

async function provisionLiveSession() {
	const email = `xray-${Date.now()}@dente.local`;
	const password = "AuditPassword123!";
	const ownerPin = "123456";

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "Idempotency-Key": makeUuidV7() },
		body: JSON.stringify({
			clinicName: "Клиника ДЕНТЕ X-Ray",
			email,
			password,
			ownerName: "Орлов Алексей Викторович",
			ownerPin,
		}),
	});
	if (!initRes.ok) throw new Error(`setup/init failed (${initRes.status}): ${await initRes.text()}`);
	const initJson = await initRes.json();
	const initData = initJson?.data ?? initJson;

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
			"Idempotency-Key": makeUuidV7(),
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});
	if (!unlockRes.ok) throw new Error(`staff/unlock failed (${unlockRes.status}): ${await unlockRes.text()}`);
	const unlockJson = await unlockRes.json();
	const unlockData = unlockJson?.data ?? unlockJson;

	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${unlockData.staffToken || initData.clinicToken}`,
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
		"Idempotency-Key": makeUuidV7(),
	};

	let patientId = null;
	const pRes = await fetch(`${API_BASE}/api/patients`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			fullName: "Воронова Елена Павловна",
			phone: "+7 (916) 442-18-90",
			birthDate: "1989-05-14",
		}),
	});
	if (pRes.ok) {
		const pJson = await pRes.json();
		patientId = (pJson?.data ?? pJson)?.id ?? null;
	}

	if (patientId) {
		const start = new Date();
		start.setMinutes(0, 0, 0);
		const end = new Date(start.getTime() + 3600_000);
		await fetch(`${API_BASE}/api/appointments`, {
			method: "POST",
			headers: { ...headers, "Idempotency-Key": makeUuidV7() },
			body: JSON.stringify({
				patientId,
				doctorUserId: initData.ownerUserId,
				startsAt: start.toISOString(),
				endsAt: end.toISOString(),
				reason: "Лечение кариеса",
				status: "confirmed",
			}),
		});
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		patientId,
	};
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const targets = SCREEN_TARGETS.filter((t) => {
		if (opts.ids) return opts.ids.has(t.id);
		if (opts.groups) return opts.groups.has(t.group);
		if (opts.all) return t.group !== "empty";
		if (opts.allViews) return t.group === "views";
		return DEFAULT_IDS.has(t.id);
	});

	if (targets.length === 0) {
		console.error("❌ Нет выбранных экранов для живого X-Ray аудита.");
		process.exit(1);
	}

	let tempDevChild = null;
	try {
		tempDevChild = await startTempServersIfRequested(opts.boot);
	} catch (err) {
		console.error(`❌ ${err.message}`);
		process.exit(1);
	}

	const auth = await provisionLiveSession();
	const execPath = BROWSER_CANDIDATES.find((p) => existsSync(p));
	const browser = await chromium.launch({
		headless: true,
		...(execPath ? { executablePath: execPath } : {}),
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const failures = [];
	let checkedFrames = 0;

	try {
		for (const target of targets) {
			for (const vpKey of ["desktop", "mobile"]) {
				const vp = VIEWPORTS[vpKey];
				for (const theme of THEMES) {
					const ctx = await browser.newContext({
						viewport: { width: vp.width, height: vp.height },
						deviceScaleFactor: vp.deviceScaleFactor,
						isMobile: vp.mobile,
						hasTouch: vp.mobile,
						colorScheme: theme,
					});
					const page = await ctx.newPage();
					const runtimeErrors = [];
					page.on("pageerror", (err) => runtimeErrors.push(`pageerror: ${err.message}`));
					page.on("console", (msg) => {
						if (msg.type() === "error") {
							const txt = msg.text();
							if (!txt.includes("favicon.ico")) runtimeErrors.push(`console.error: ${txt.slice(0, 140)}`);
						}
					});
					page.on("response", (res) => {
						if (res.status() >= 500 && !res.url().includes("favicon")) {
							runtimeErrors.push(`HTTP ${res.status()} ${res.url().replace(API_BASE, "")}`);
						}
					});

					try {
						if (target.group !== "portals") {
							await page.addInitScript(({ cToken, sToken, pId, thm }) => {
								localStorage.setItem("dente_clinic_token", cToken);
								localStorage.setItem("dente_staff_token", sToken);
								localStorage.setItem("dente_theme_mode", thm);
								localStorage.setItem("dente_workspace_perspective", "owner");
								localStorage.setItem("dente_user_role", "owner");
								localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
								localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
									version: 1,
									uiLanguage: "ru",
									selectedWorkspaceRole: "owner",
									selectedSpecialty: "therapist",
									selectedPatientId: pId,
									onboardingDismissed: true,
								}));
							}, { cToken: auth.clinicToken, sToken: auth.staffToken, pId: auth.patientId, thm: theme });
						}

						const hash = (target.hash || "#shift")
							.replace("{{patientId}}", auth.patientId || "")
							.replace("{{organizationId}}", auth.organizationId || "");
						const url = `${APP_BASE}/${target.urlQuery || ""}${hash}`;

						await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
						await page.waitForFunction(
							() => {
								const boot = document.querySelector(".boot-state");
								const visibleBoot = boot && window.getComputedStyle(boot).display !== "none";
								const main = document.querySelector("main, .workspace, .auth-hub-card");
								return !visibleBoot && main && (main.innerText || "").trim().length > 20;
							},
							{ timeout: 12000 },
						).catch(() => {});
						if (target.waitFor) {
							await page.waitForSelector(target.waitFor, { timeout: 6000 }).catch(() => {});
						}
						if (target.trigger) {
							if (target.trigger.type === "hotkey" && target.trigger.key) {
								await page.keyboard.press(target.trigger.key).catch(() => {});
							} else if (target.trigger.type === "event" && target.trigger.eventName) {
								await page.evaluate((ev) => window.dispatchEvent(new CustomEvent(ev)), target.trigger.eventName).catch(() => {});
							}
							if (target.trigger.waitSelector) {
								await page.waitForSelector(target.trigger.waitSelector, { timeout: 4000 }).catch(() => {});
							}
						}
						await wait(500);
						await page.evaluate((thm) => {
							document.documentElement.setAttribute("data-theme", thm);
							document.documentElement.classList.toggle("dark", thm === "dark");
							document.documentElement.classList.toggle("light", thm !== "dark");
							document.body.className = thm === "dark" ? "dark" : "light";
							document.documentElement.style.colorScheme = thm === "dark" ? "dark" : "light";
						}, theme);
						await wait(250);

						const metrics = await page.evaluate(runDomXrayProbeInPage, { isMobile: vp.mobile, theme });
						const report = evaluateDomXrayReport(metrics, {
							state: `${target.id} ${target.component} ${vp.width}x${vp.height} ${theme}`,
							viewport: vp,
							theme,
							runtimeErrors,
						});
						checkedFrames++;

						if (!report.passed) {
							console.error(`❌ [${target.id}] ${target.component} (${vp.width}x${vp.height} ${theme}) — ${report.blockers.length} блокер(ов)!`);
							failures.push({ target, vpKey, theme, report });
						} else {
							console.log(`✅ [${target.id}] ${target.component} (${vp.width}x${vp.height} ${theme}) — 0 блокеров (warnings=${report.warnings.length})`);
						}
					} finally {
						await ctx.close();
					}
				}
			}
		}
	} finally {
		await browser.close();
		if (tempDevChild && tempDevChild.pid) {
			if (process.platform === "win32") {
				spawn("taskkill", ["/pid", String(tempDevChild.pid), "/T", "/F"], { stdio: "ignore" });
			} else {
				tempDevChild.kill();
			}
		}
	}

	console.log(`\n================================================================`);
	console.log(`LIVE DOM X-RAY SUMMARY: Checked ${checkedFrames} frames | Failed frames: ${failures.length}`);
	console.log(`================================================================`);

	if (failures.length > 0) {
		const details = failures
			.map((f) => `\n=== ${f.target.id} ${f.target.component} (${f.vpKey}/${f.theme}) | Файлы: ${f.target.files.join(", ")} ===\n${formatDomXrayBlockers(f.report)}`)
			.join("\n");
		console.error(details);
		printFailureManifesto("UI_XRAY_LAYOUT", {
			details: `Провалено ${failures.length} из ${checkedFrames} живых экранов браузера. Исправь вёрстку и кнопки по координатам выше!`,
		});
		process.exit(1);
	}

	console.log(`✅ Все ${checkedFrames} живых экранов прошли браузерный DOM X-Ray без блокеров.`);
}

main().catch((err) => {
	console.error(`❌ [check-ui-xray] Fatal error: ${err.stack || err.message}`);
	process.exit(1);
});

#!/usr/bin/env node
/**
 * capture_full_audit.mjs — Боевой Playwright-коллектор Visual Audit Pipeline.
 *
 * Особенности:
 *  1. Реальная живая аутентификация (POST /api/auth/setup/init + staff/unlock) — 0 фейков.
 *  2. Богатый клинический seed (пациенты, аллергии, записи, визит, счёт) для рабочих экранов
 *     + чистая Day-0 клиника для группы `empty`.
 *  3. Маршрутизация строго по реальным hash-URL из screen-targets.mjs (SSOT).
 *  4. Для каждого кадра снимает PNG (>= 20KB, проверка MD5 на уникальность) + DOM X-Ray `.metrics.json`.
 *  5. Складывает всё в artifacts/visual-audit/round_{N}/ (в .gitignore, не замусоривает git).
 *
 * Использование:
 *  node .agents/skills/visual-audit-pipeline/scripts/capture_full_audit.mjs --round 1
 *  node .agents/skills/visual-audit-pipeline/scripts/capture_full_audit.mjs --round 1 --group views --limit 5
 *  node .agents/skills/visual-audit-pipeline/scripts/capture_full_audit.mjs --round 1 --ids 002,030,032
 *  node .agents/skills/visual-audit-pipeline/scripts/capture_full_audit.mjs --dry-run
 */

import crypto from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { SCREEN_TARGETS, THEMES, VIEWPORTS } from "./screen-targets.mjs";
import { runDomXrayProbeInPage } from "./dom-xray-probe.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const MIN_PNG_BYTES = 20480;

function parseArgs(argv) {
	const opts = {
		round: 1,
		group: null,
		ids: null,
		viewport: null,
		theme: null,
		limit: null,
		dryRun: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--round" && argv[i + 1]) opts.round = Number.parseInt(argv[++i], 10) || 1;
		else if (a === "--group" && argv[i + 1]) opts.group = argv[++i];
		else if (a === "--ids" && argv[i + 1]) opts.ids = new Set(argv[++i].split(",").map((s) => s.trim()));
		else if (a === "--viewport" && argv[i + 1]) opts.viewport = argv[++i];
		else if (a === "--theme" && argv[i + 1]) opts.theme = argv[++i];
		else if (a === "--limit" && argv[i + 1]) opts.limit = Number.parseInt(argv[++i], 10);
		else if (a === "--dry-run") opts.dryRun = true;
	}
	return opts;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const BROWSER_CANDIDATES = [
	process.env.BROWSER_BIN,
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

async function launchBrowser() {
	const executablePath = BROWSER_CANDIDATES.find((p) => existsSync(p));
	return chromium.launch({
		headless: true,
		...(executablePath ? { executablePath } : {}),
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	});
}

async function safeFetch(url, options) {
	try {
		return await fetch(url, options);
	} catch (err) {
		process.stderr.write(`[WARN] Fetch failed for ${url}: ${err?.message || String(err)}\n`);
		return null;
	}
}

async function waitForOptionalSelector(page, selector, timeoutMs) {
	try {
		await page.waitForSelector(selector, { timeout: timeoutMs });
	} catch (err) {
		process.stderr.write(`[INFO] Selector timeout (${timeoutMs}ms): ${selector} — ${err?.message || ""}\n`);
	}
}

async function provisionClinic(prefix, withSeedData) {
	const uniqueId = `${prefix}-${Date.now()}`;
	const email = `${uniqueId}@dente.local`;
	const password = "AuditPassword123!";
	const ownerPin = "123456";

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: withSeedData ? "Клиника ДЕНТЕ Премиум" : "Клиника Старт",
			email,
			password,
			ownerName: "Орлов Алексей Викторович",
			ownerPin,
		}),
	});
	if (!initRes.ok) {
		throw new Error(`setup/init failed (${initRes.status}): ${await initRes.text()}`);
	}
	const initJson = await initRes.json();
	const initData = initJson?.data ?? initJson;

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});
	if (!unlockRes.ok) {
		throw new Error(`staff/unlock failed (${unlockRes.status}): ${await unlockRes.text()}`);
	}
	const unlockJson = await unlockRes.json();
	const unlockData = unlockJson?.data ?? unlockJson;

	const auth = {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
		patientId: null,
	};

	if (withSeedData) {
		const headers = {
			"Content-Type": "application/json",
			"x-dente-clinic-token": auth.clinicToken,
			"x-dente-staff-token": auth.staffToken,
			"Idempotency-Key": crypto.randomUUID(),
		};

		// 1. Взрослый пациент с аллергией (для карточки, ЭМК, одонтограммы, кассы)
		const p1Res = await safeFetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Смирнова Екатерина Васильевна",
				phone: "+7 (916) 442-18-90",
				birthDate: "1989-05-14",
				allergies: "Лидокаин, пенициллины",
			}),
		});
		if (p1Res?.ok) {
			const p1Json = await p1Res.json();
			auth.patientId = (p1Json?.data ?? p1Json)?.id ?? null;
		}

		// 2. Второй пациент (ребёнок) + третий (для списков и очередей)
		await safeFetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
			body: JSON.stringify({
				fullName: "Волков Артём Дмитриевич",
				phone: "+7 (926) 771-03-45",
				birthDate: "2017-09-22",
			}),
		});

		// 3. Запись в расписание на сегодня
		if (auth.patientId) {
			const start = new Date();
			start.setMinutes(0, 0, 0);
			const end = new Date(start.getTime() + 60 * 60 * 1000);
			await safeFetch(`${API_BASE}/api/appointments`, {
				method: "POST",
				headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
				body: JSON.stringify({
					patientId: auth.patientId,
					doctorUserId: auth.ownerUserId,
					startsAt: start.toISOString(),
					endsAt: end.toISOString(),
					reason: "Лечение кариеса 36 зуба",
					status: "confirmed",
				}),
			});
		}
	}

	return auth;
}

function buildTargetUrl(target, auth) {
	let hash = target.hash || "#shift";
	hash = hash
		.replace("{{patientId}}", auth.patientId || "")
		.replace("{{organizationId}}", auth.organizationId || "");
	const query = target.urlQuery || "";
	return `${APP_BASE}/${query}${hash}`;
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore?.getState?.().setThemeMode) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(350);
}

async function runTrigger(page, trigger) {
	if (!trigger) return;
	if (trigger.type === "hotkey") {
		await page.keyboard.press(trigger.key);
	} else if (trigger.type === "event") {
		await page.evaluate((ev) => {
			window.dispatchEvent(new CustomEvent(ev, { detail: {} }));
		}, trigger.eventName);
	} else if (trigger.type === "click" && trigger.selector) {
		await page.locator(trigger.selector).first().click({ timeout: 5000 });
	}
	if (trigger.waitSelector) {
		await waitForOptionalSelector(page, trigger.waitSelector, 5000);
	}
	await wait(450);
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	let targets = SCREEN_TARGETS.filter((t) => {
		if (opts.group && t.group !== opts.group) return false;
		if (opts.ids && !opts.ids.has(t.id)) return false;
		return true;
	});
	if (opts.limit && opts.limit > 0) {
		targets = targets.slice(0, opts.limit);
	}

	const roundDir = path.join(REPO_ROOT, "artifacts", "visual-audit", `round_${opts.round}`);
	const shotsDir = path.join(roundDir, "shots");
	const verdictsDir = path.join(roundDir, "verdicts");
	mkdirSync(shotsDir, { recursive: true });
	mkdirSync(verdictsDir, { recursive: true });

	const vpList = opts.viewport ? [opts.viewport] : Object.keys(VIEWPORTS);
	const themeList = opts.theme ? [opts.theme] : THEMES;

	if (opts.dryRun) {
		process.stdout.write(`[DRY-RUN] Round ${opts.round} | Targets: ${targets.length}\n`);
		let totalPlanned = 0;
		for (const t of targets) {
			const tvp = (t.viewports || vpList).filter((v) => vpList.includes(v));
			const tth = (t.themes || themeList).filter((th) => themeList.includes(th));
			totalPlanned += tvp.length * tth.length;
			process.stdout.write(`  ${t.id} [${t.group}/${t.domain}] ${t.component} -> ${t.hash} (${tvp.length * tth.length} shots)\n`);
		}
		process.stdout.write(`[DRY-RUN] Total planned screenshots: ${totalPlanned}\n`);
		process.stdout.write(`[DRY-RUN] Output dir: ${shotsDir}\n`);
		return;
	}

	// Preflight API & Web
	const apiHealth = await safeFetch(`${API_BASE}/api/health`);
	if (!apiHealth?.ok) {
		process.stderr.write(`❌ API server is not reachable at ${API_BASE}. Start dev server first (npm run dev).\n`);
		process.exit(1);
	}
	const webHealth = await safeFetch(APP_BASE);
	if (!webHealth || (webHealth.status !== 200 && webHealth.status !== 304)) {
		process.stderr.write(`❌ Web server is not reachable at ${APP_BASE}. Start dev server first (npm run dev).\n`);
		process.exit(1);
	}

	const hasSeededTargets = targets.some((t) => t.group !== "empty");
	const hasEmptyTargets = targets.some((t) => t.group === "empty");
	const seededAuth = hasSeededTargets ? await provisionClinic("audit-seeded", true) : null;
	const emptyAuth = hasEmptyTargets ? await provisionClinic("audit-empty", false) : null;

	const browser = await launchBrowser();
	const manifest = [];
	const md5Registry = new Map();
	let blankCount = 0;
	let duplicateCount = 0;
	let failedCount = 0;

	try {
		for (const target of targets) {
			const auth = target.group === "empty" ? emptyAuth : seededAuth;
			if (target.requiresPatientId && !auth?.patientId) {
				console.warn(`⚠️ Skip ${target.id} (${target.component}): patientId missing`);
				continue;
			}

			const tvp = (target.viewports || vpList).filter((v) => vpList.includes(v));
			const tth = (target.themes || themeList).filter((th) => themeList.includes(th));

			for (const vpKey of tvp) {
				const vp = VIEWPORTS[vpKey];
				for (const theme of tth) {
					const baseName = `${target.id}_${target.domain}_${target.component}_${vp.width}x${vp.height}_${theme}`;
					const pngPath = path.join(shotsDir, `${baseName}.png`);
					const metricsPath = path.join(shotsDir, `${baseName}.metrics.json`);

					const context = await browser.newContext({
						viewport: { width: vp.width, height: vp.height },
						deviceScaleFactor: vp.deviceScaleFactor,
						isMobile: vp.mobile,
						hasTouch: vp.mobile,
						colorScheme: theme,
					});
					const page = await context.newPage();

					const consoleErrors = [];
					const pageErrors = [];
					const apiErrors = [];
					page.on("console", (msg) => {
						if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 240));
					});
					page.on("pageerror", (err) => {
						pageErrors.push(String(err).slice(0, 240));
					});
					page.on("response", (res) => {
						if (res.status() >= 400 && !res.url().includes("favicon")) {
							apiErrors.push(`${res.status()} ${res.url()}`);
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
							}, {
								cToken: auth.clinicToken,
								sToken: auth.staffToken,
								pId: auth.patientId,
								thm: theme,
							});
						}

						const url = buildTargetUrl(target, auth);
						await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
						if (target.waitFor) {
							await waitForOptionalSelector(page, target.waitFor, 10000);
						}
						await wait(900);
						await applyTheme(page, theme);
						await runTrigger(page, target.trigger);
						await wait(400);

						const buffer = await page.screenshot({ fullPage: false });
						writeFileSync(pngPath, buffer);

						const md5 = crypto.createHash("md5").update(buffer).digest("hex");
						const isBlank = buffer.length < MIN_PNG_BYTES;
						const duplicateOf = md5Registry.get(md5) || null;
						if (!duplicateOf) md5Registry.set(md5, baseName);
						if (isBlank) blankCount++;
						if (duplicateOf) duplicateCount++;

						const domMetrics = await page.evaluate(runDomXrayProbeInPage, {
							isMobile: vp.mobile,
							theme,
						});

						const fullMetrics = {
							targetId: target.id,
							group: target.group,
							domain: target.domain,
							component: target.component,
							title: target.title,
							url,
							viewportKey: vpKey,
							theme,
							screenshotFile: `${baseName}.png`,
							bytes: buffer.length,
							md5,
							isBlank,
							duplicateOf,
							files: target.files,
							consoleErrors: consoleErrors.slice(0, 10),
							pageErrors: pageErrors.slice(0, 10),
							apiErrors: apiErrors.slice(0, 10),
							dom: domMetrics,
						};
						writeFileSync(metricsPath, JSON.stringify(fullMetrics, null, 2), "utf8");

						manifest.push({
							baseName,
							targetId: target.id,
							domain: target.domain,
							component: target.component,
							viewportKey: vpKey,
							theme,
							bytes: buffer.length,
							md5,
							isBlank,
							duplicateOf,
							overflowPx: domMetrics.horizontalOverflowPx,
							clippedCount: domMetrics.clippedTextsCount,
							undersizedCount: domMetrics.undersizedTargetsCount,
							primaryCtas: domMetrics.primaryCtaCount,
							allCapsCount: domMetrics.allCapsViolationsCount,
							whiteBlobs: domMetrics.darkModeWhiteBlobsCount,
						});

						const statusIcon = isBlank ? "❌ BLANK" : duplicateOf ? "⚠️ DUP" : "✅";
						process.stdout.write(`${statusIcon} ${baseName}.png (${(buffer.length / 1024).toFixed(1)}KB | ovf:${domMetrics.horizontalOverflowPx}px | clip:${domMetrics.clippedTextsCount} | small:${domMetrics.undersizedTargetsCount})\n`);
					} catch (err) {
						failedCount++;
						process.stderr.write(`❌ FAILED ${baseName}: ${err.message}\n`);
					} finally {
						await context.close();
					}
				}
			}
		}
	} finally {
		await browser.close();
	}

	writeFileSync(
		path.join(roundDir, "capture_manifest.json"),
		JSON.stringify({
			round: opts.round,
			capturedAt: new Date().toISOString(),
			total: manifest.length,
			blankCount,
			duplicateCount,
			failedCount,
			items: manifest,
		}, null, 2),
		"utf8",
	);

	process.stdout.write(`\n📊 ROUND ${opts.round} CAPTURE COMPLETE: ${manifest.length} shots | blank=${blankCount} | dup=${duplicateCount} | failed=${failedCount}\n`);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(2);
});

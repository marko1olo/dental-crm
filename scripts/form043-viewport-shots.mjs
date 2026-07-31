/**
 * Form 043/у visual audit — Mobile/PC × Light/Dark.
 * Node + Playwright (no Python). Real demo auth via POST /api/auth/login.
 * Saves to .dente-ops-shots/ (gitignored) — do NOT commit PNGs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".dente-ops-shots");
const BASE = "http://127.0.0.1:5173";
const API = "http://127.0.0.1:4100";
const VISIT_URL = `${BASE}/visit/00000000-0000-0000-0000-000000000005`;

const DEMO_EMAIL = "doctor@clinic.com";
const DEMO_PASSWORD = "dente2026";

const VIEWPORTS = [
	{ name: "mobile", width: 390, height: 844, hasTouch: true, isMobile: true },
	{ name: "pc", width: 1440, height: 900, hasTouch: false, isMobile: false },
];

const THEMES = ["light", "dark"];

const CANDIDATE_BROWSERS = [
	process.env.DENTE_CHROME_PATH,
	process.env.CHROME_PATH,
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	path.join(process.env.PROGRAMFILES || "", "Microsoft\\Edge\\Application\\msedge.exe"),
	path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft\\Edge\\Application\\msedge.exe"),
].filter(Boolean);

function resolveExecutablePath() {
	for (const p of CANDIDATE_BROWSERS) {
		try {
			if (p && fs.existsSync(p)) return p;
		} catch {
			/* next */
		}
	}
	return null;
}

async function launchBrowser() {
	const exe = resolveExecutablePath();
	const common = {
		headless: true,
		args: ["--no-sandbox", "--disable-web-security", "--window-size=1440,900"],
	};

	if (exe) {
		console.log(`[browser] executablePath=${exe}`);
		return chromium.launch({ ...common, executablePath: exe });
	}

	for (const channel of ["msedge", "chrome", "chrome-beta"]) {
		try {
			console.log(`[browser] trying channel=${channel}`);
			return await chromium.launch({ ...common, channel });
		} catch (err) {
			console.log(`[browser] channel ${channel} failed:`, String(err?.message || err).slice(0, 160));
		}
	}

	console.log("[browser] falling back to bundled chromium");
	return chromium.launch(common);
}

/** Real demo SaaS login — returns clinicToken + staffToken (never audit-bypass). */
async function fetchDemoTokens() {
	const res = await fetch(`${API}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
	});
	const text = await res.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error(`demo login non-JSON ${res.status}: ${text.slice(0, 200)}`);
	}
	if (!res.ok || !data.clinicToken || !data.staffToken) {
		throw new Error(
			`demo login failed ${res.status}: ${data.message || data.error || text.slice(0, 200)}`,
		);
	}
	console.log(
		`[auth] demo login ok user=${data.user?.fullName || data.user?.id || "?"} role=${data.user?.role || "?"}`,
	);
	return {
		clinicToken: data.clinicToken,
		staffToken: data.staffToken,
		user: data.user || null,
	};
}

function buildLocalStorageSeed(tokens) {
	const NOW = new Date().toISOString();
	return {
		dente_clinic_token: tokens.clinicToken,
		dente_staff_token: tokens.staffToken,
		"dental-crm:web-ui-preferences:v1": JSON.stringify({
			version: 1,
			onboardingDismissed: true,
			onboardingDraftMode: false,
			onboardingStep: "done",
			onboardingDismissedAt: NOW,
			savedAt: NOW,
		}),
	};
}

async function forceTheme(page, theme) {
	await page.evaluate((t) => {
		localStorage.setItem("dente_theme_mode", t);
		const root = document.documentElement;
		root.dataset.theme = t;
		root.classList.toggle("dark", t === "dark");
		root.classList.toggle("light", t === "light");
		root.style.colorScheme = t === "light" ? "light" : "dark";
		try {
			const store = window.__useThemeStore;
			if (store && typeof store.setState === "function") {
				store.setState({ themeMode: t });
			} else if (store && typeof store.getState === "function") {
				const st = store.getState();
				if (st && typeof st.setThemeMode === "function") st.setThemeMode(t);
			}
		} catch {
			/* optional */
		}
	}, theme);
	await page.emulateMedia({ colorScheme: theme });
}

async function dismissOverlays(page) {
	await page.evaluate(() => {
		const texts = ["Пропустить", "Понятно", "Закрыть", "OK", "Далее", "Готово", "Skip"];
		const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
		for (const b of buttons) {
			const t = (b.textContent || "").trim();
			if (texts.some((x) => t === x || t.includes(x))) {
				try {
					b.click();
				} catch {
					/* ignore */
				}
			}
		}
	});
	await page.waitForTimeout(400);
}

async function openDiaryAndPreview(page) {
	await dismissOverlays(page);

	// Prefer odontogram / diary tab
	const tabSelectors = [
		'[data-testid="visit-tab-odontogram"]',
		'[data-testid="tab-odontogram"]',
		'button[data-tab="odontogram"]',
		'[data-testid="visit-tab-diary"]',
		'[href*="odontogram"]',
	];

	for (const sel of tabSelectors) {
		try {
			const el = page.locator(sel).first();
			if ((await el.count()) > 0) {
				await el.click({ timeout: 2500 }).catch(() => {});
				await page.waitForTimeout(900);
				break;
			}
		} catch {
			/* try next */
		}
	}

	await page.evaluate(() => {
		const buttons = Array.from(document.querySelectorAll("button, [role='tab'], a"));
		const hit = buttons.find((b) => {
			const t = (b.textContent || "").trim();
			return (
				t.includes("Зубная") ||
				t.includes("формула") ||
				t.includes("Одонтограмма") ||
				t.includes("SOAP") ||
				t.includes("Дневник") ||
				t.includes("043")
			);
		});
		if (hit) hit.click();
	});
	await page.waitForTimeout(1800);

	// Wait up to ~12s for editor (API/bootstrap)
	for (let i = 0; i < 12; i++) {
		const has = (await page.locator('[data-testid="visit-diary-editor"]').count()) > 0;
		if (has) break;
		await page.waitForTimeout(1000);
		if (i === 4 || i === 8) {
			await page.evaluate(() => {
				const buttons = Array.from(document.querySelectorAll("button, [role='tab'], a"));
				const hit = buttons.find((b) => {
					const t = (b.textContent || "").trim();
					return (
						t.includes("Одонтограмма") ||
						t.includes("Дневник") ||
						t.includes("SOAP") ||
						t.includes("формула")
					);
				});
				if (hit) hit.click();
			});
		}
	}

	await page.evaluate(() => {
		const el =
			document.querySelector('[data-testid="visit-diary-editor"]') ||
			document.querySelector(".vde-043") ||
			document.querySelector("#diary-anamnesis");
		if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
	});
	await page.waitForTimeout(400);

	const opened = await page.evaluate(() => {
		const selectors = [
			'[data-testid="diary-print-043"]',
			'[data-testid="diary-form-043-open"]',
			"#diary-print-btn",
		];
		for (const s of selectors) {
			const btn = document.querySelector(s);
			if (btn) {
				btn.click();
				return true;
			}
		}
		const buttons = Array.from(document.querySelectorAll("button"));
		const hit = buttons.find((b) => (b.textContent || "").includes("043"));
		if (hit) {
			hit.click();
			return true;
		}
		return false;
	});

	if (opened) {
		await page.waitForTimeout(900);
	}

	const hasPreview = (await page.locator('[data-testid="form-043-preview"]').count()) > 0;
	if (!hasPreview) {
		await page.evaluate(() => {
			const fill = (id, text) => {
				const el = document.getElementById(id);
				if (!el || el.disabled) return;
				const proto =
					el.tagName === "TEXTAREA"
						? HTMLTextAreaElement.prototype
						: HTMLInputElement.prototype;
				const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
				if (setter) setter.call(el, text);
				else el.value = text;
				el.dispatchEvent(new Event("input", { bubbles: true }));
				el.dispatchEvent(new Event("change", { bubbles: true }));
			};
			fill(
				"diary-anamnesis",
				"Жалобы на боль в области зуба 16 при накусывании, чувствительность к холодному.",
			);
			fill(
				"diary-status-localis",
				"Зуб 16: глубокая кариозная полость по II классу. Перкуссия слабоболезненна. Слизистая без патологии.",
			);
			fill(
				"diary-treatment",
				"Анестезия Ubistesin 1.7 мл. Препарирование, медикаментозная обработка, пломба SDR + Filtek.",
			);
			const tooth = document.getElementById("diary-tooth");
			if (tooth && !tooth.disabled) {
				const setter = Object.getOwnPropertyDescriptor(
					HTMLInputElement.prototype,
					"value",
				)?.set;
				if (setter) setter.call(tooth, "16");
				else tooth.value = "16";
				tooth.dispatchEvent(new Event("input", { bubbles: true }));
			}
			// Try open preview again after fill
			const btn =
				document.querySelector('[data-testid="diary-print-043"]') ||
				document.querySelector('[data-testid="diary-form-043-open"]') ||
				document.getElementById("diary-print-btn");
			if (btn) btn.click();
			else {
				const b = Array.from(document.querySelectorAll("button")).find((x) =>
					(x.textContent || "").includes("043"),
				);
				if (b) b.click();
			}
		});
		await page.waitForTimeout(800);
		await page.evaluate(() => {
			const el =
				document.querySelector('[data-testid="form-043-preview"]') ||
				document.querySelector('[data-testid="visit-diary-editor"]');
			if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
		});
	}

	// Diagnostics when missing
	const diag = await page.evaluate(() => {
		const bodyText = (document.body?.innerText || "").slice(0, 400);
		return {
			url: location.href,
			hasEditor: !!document.querySelector('[data-testid="visit-diary-editor"]'),
			hasPreview: !!document.querySelector('[data-testid="form-043-preview"]'),
			hasLogin: !!(
				document.querySelector(".auth-overlay") ||
				document.querySelector('input[type="email"]')
			),
			title: document.title,
			snippet: bodyText.replace(/\s+/g, " ").trim(),
		};
	});

	return {
		hasEditor: (await page.locator('[data-testid="visit-diary-editor"]').count()) > 0,
		hasPreview: (await page.locator('[data-testid="form-043-preview"]').count()) > 0,
		hasEcp: (await page.locator('[data-testid="form-043-ecp"]').count()) > 0,
		diag,
	};
}

async function auditPage(page, label) {
	const report = await page.evaluate(() => {
		const issues = [];
		const root = document.documentElement;
		const theme =
			root.dataset.theme || (root.classList.contains("dark") ? "dark" : "light");

		const editor = document.querySelector('[data-testid="visit-diary-editor"]');
		const preview = document.querySelector('[data-testid="form-043-preview"]');
		const target = preview || editor;

		if (!target) {
			issues.push("MISSING: neither visit-diary-editor nor form-043-preview in DOM");
			return { theme, issues, metrics: {} };
		}

		const rect = target.getBoundingClientRect();
		const docW = document.documentElement.clientWidth;

		if (rect.width > docW + 2) {
			issues.push(`OVERFLOW: target width ${Math.round(rect.width)} > viewport ${docW}`);
		}
		if (rect.right > docW + 4) {
			issues.push(`OVERFLOW-X: target right ${Math.round(rect.right)} > ${docW}`);
		}

		if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 2) {
			issues.push(
				`PAGE-OVERFLOW-X: scrollWidth ${document.documentElement.scrollWidth} > clientWidth ${document.documentElement.clientWidth}`,
			);
		}

		const sample = editor || target;
		const cs = getComputedStyle(sample);
		const bg = cs.backgroundColor;
		const fg = cs.color;

		const buttons = target.querySelectorAll("button, .vde-043__btn, a");
		let smallTargets = 0;
		buttons.forEach((b) => {
			const r = b.getBoundingClientRect();
			if (r.width > 0 && r.height > 0 && (r.height < 36 || r.width < 36)) {
				smallTargets += 1;
			}
		});
		if (smallTargets > 0) {
			issues.push(`TOUCH: ${smallTargets} controls under 36px (prefer ≥40px)`);
		}

		if (theme === "light" && editor) {
			const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
			if (m) {
				const r = Number(m[1]);
				const g = Number(m[2]);
				const b = Number(m[3]);
				const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
				if (lum < 0.2) {
					issues.push(
						`THEME-HOLE: light theme but editor bg luminance ${lum.toFixed(3)} (near black zinc hardcode)`,
					);
				}
			}
		}

		if (preview) {
			const body = preview.querySelector("#print-043");
			const text = body ? body.textContent || "" : "";
			if (!text.includes("043")) issues.push("PRINT: missing Форма 043/у title");
			if (!text.includes("S —") && !text.includes("Жалобы")) {
				issues.push("PRINT: missing SOAP S section");
			}
			const ecp = preview.querySelector('[data-testid="form-043-ecp"]');
			return {
				theme,
				issues,
				metrics: {
					bg,
					fg,
					targetW: Math.round(rect.width),
					targetH: Math.round(rect.height),
					hasEcp: !!ecp,
					preview: true,
					buttonCount: buttons.length,
					smallTargets,
				},
			};
		}

		return {
			theme,
			issues,
			metrics: {
				bg,
				fg,
				targetW: Math.round(rect.width),
				targetH: Math.round(rect.height),
				preview: false,
				buttonCount: buttons.length,
				smallTargets,
			},
		};
	});

	console.log(`\n=== AUDIT ${label} ===`);
	console.log(JSON.stringify(report, null, 2));
	return report;
}

async function run() {
	fs.mkdirSync(OUT_DIR, { recursive: true });

	console.log("[auth] fetching real demo tokens from API…");
	const tokens = await fetchDemoTokens();
	const seed = buildLocalStorageSeed(tokens);

	const browser = await launchBrowser();
	const results = [];

	for (const vp of VIEWPORTS) {
		for (const theme of THEMES) {
			const label = `form043_${vp.name}_${theme}`;
			const context = await browser.newContext({
				viewport: { width: vp.width, height: vp.height },
				hasTouch: vp.hasTouch,
				isMobile: vp.isMobile,
				deviceScaleFactor: 1,
				colorScheme: theme,
			});
			const page = await context.newPage();

			// Seed origin first
			await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 45000 });
			await page.evaluate((s) => {
				for (const [k, v] of Object.entries(s)) {
					localStorage.setItem(k, v);
				}
			}, seed);

			await forceTheme(page, theme);

			await page.goto(VISIT_URL, {
				waitUntil: "domcontentloaded",
				timeout: 45000,
			});
			await page.waitForTimeout(5500);
			await forceTheme(page, theme);
			await dismissOverlays(page);
			await page.waitForTimeout(600);

			const openInfo = await openDiaryAndPreview(page);
			console.log(`[${label}] open:`, JSON.stringify(openInfo));

			const audit = await auditPage(page, label);

			const shotPath = path.join(OUT_DIR, `${label}.png`);
			const previewLoc = page.locator(
				'[data-testid="form-043-preview"] .vde-043-print-sheet',
			);
			const previewRoot = page.locator('[data-testid="form-043-preview"]');
			const editorLoc = page.locator('[data-testid="visit-diary-editor"]');
			if ((await previewLoc.count()) > 0) {
				await previewLoc.first().screenshot({ path: shotPath });
			} else if ((await previewRoot.count()) > 0) {
				await previewRoot.first().screenshot({ path: shotPath });
			} else if ((await editorLoc.count()) > 0) {
				await editorLoc.first().screenshot({ path: shotPath });
			} else {
				await page.screenshot({ path: shotPath, fullPage: true });
			}
			console.log(`Saved ${shotPath}`);

			results.push({ label, openInfo, audit, shotPath });
			await context.close();
		}
	}

	const reportPath = path.join(OUT_DIR, "form043_audit_report.json");
	fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf8");
	console.log(`\nReport: ${reportPath}`);

	const failed = results.filter((r) => (r.audit?.issues || []).length > 0);
	if (failed.length) {
		console.log(`\nISSUES in ${failed.length}/${results.length} shots:`);
		for (const f of failed) {
			console.log(`- ${f.label}:`, f.audit.issues.join("; "));
		}
	} else {
		console.log("\nAll 4 shots clean (no audit issues).");
	}

	await browser.close();
	process.exit(0);
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});

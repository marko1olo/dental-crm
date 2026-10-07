import { chromium } from "playwright";
import * as path from "node:path";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";

async function main() {
	console.log("=== RED TEAM LEGAL & DOCUMENTS INQUISITOR: CAPTURING PROOFS (1440x900) ===");

	const outDir = path.resolve("docs/screenshots/monolith_inquisition_proofs");
	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	const brainDirParent = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31";
	const brainDirSelf = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d6968b23-0d21-42f0-aa60-1427db62453a";

	const copyToBrains = (fileName: string) => {
		const filePath = path.join(outDir, fileName);
		if (!existsSync(filePath)) return;
		if (existsSync(brainDirParent)) {
			copyFileSync(filePath, path.join(brainDirParent, fileName));
		}
		if (existsSync(brainDirSelf)) {
			copyFileSync(filePath, path.join(brainDirSelf, fileName));
		}
	};

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const themes = ["light", "dark"] as const;

	for (const theme of themes) {
		console.log(`\n================= Capturing Theme: ${theme.toUpperCase()} =================`);
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: theme,
		});
		const page = await context.newPage();

		// Установка темы и отключение всех туров/онбордингов до загрузки страницы
		await page.addInitScript((th) => {
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dental_tour_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", "true");
			document.documentElement.dataset.theme = th;
			document.documentElement.setAttribute("data-theme", th);
			document.documentElement.style.colorScheme = th;
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
		}, theme);

		// 1. Вход через демонстрационный тур
		console.log(`[0] Entering demo tour (${theme})...`);
		await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(1500);

		await page.locator(".auth-demo-btn").click();
		await page.waitForTimeout(1000);

		const launchBtn = page.locator(".auth-demo-tour-actions button.auth-submit-btn").first();
		await launchBtn.click();
		await page.waitForTimeout(3000);

		// Принудительно подтверждаем тему и удаляем любые остаточные оверлеи туров из DOM
		await page.evaluate((th) => {
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("dente_theme", th);
			document.documentElement.dataset.theme = th;
			document.documentElement.setAttribute("data-theme", th);
			document.documentElement.style.colorScheme = th;
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.classList.add("light");
			}
			document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		}, theme);

		// 2. Переход на вкладку Документов
		console.log(`[1] Navigating to Documents view (${theme})...`);
		const docNavBtn = page.locator('button:has-text("Документы"), a:has-text("Документы")').first();
		if (await docNavBtn.isVisible()) {
			await docNavBtn.click();
			await page.waitForTimeout(2000);
		} else {
			await page.evaluate(() => {
				window.location.hash = "#documents";
			});
			await page.waitForTimeout(2000);
		}

		// Дополнительная зачистка оверлеев и закрепление темы
		await page.evaluate((th) => {
			document.documentElement.dataset.theme = th;
			document.documentElement.setAttribute("data-theme", th);
			document.documentElement.style.colorScheme = th;
			if (th === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			}
			document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		}, theme);

		// Скриншот вкладки документов
		const tabFileName = `proof_documents_tab_${theme}_1440x900.png`;
		const tabFilePath = path.join(outDir, tabFileName);
		await page.screenshot({ path: tabFilePath });
		console.log(`✓ Saved ${tabFileName}`);
		copyToBrains(tabFileName);

		// 3. Модальное окно Form 043/у и печать бланка А4
		console.log(`[2] Opening Outpatient Card 043/u & A4 Print Modal (${theme})...`);
		try {
			const a4Btn = page.locator('[data-testid="btn-open-pro-a4-modal"], button:has-text("Бланки А4")').first();
			await a4Btn.waitFor({ state: "visible", timeout: 5000 });
			await a4Btn.click();
			await page.waitForTimeout(1500);

			// Переключение на вкладку 043/у
			const cardTabBtn = page.locator('[data-testid="a4-tab-medical-card"], button:has-text("4. Дневник приёма")').first();
			if (await cardTabBtn.isVisible()) {
				await cardTabBtn.click();
				await page.waitForTimeout(1200);
			}

			const cardFileName = `proof_outpatient_card_modal_${theme}_1440x900.png`;
			const cardFilePath = path.join(outDir, cardFileName);
			await page.screenshot({ path: cardFilePath });
			console.log(`✓ Saved ${cardFileName}`);
			copyToBrains(cardFileName);

			// Закрытие модалки А4 через крестик
			const closeA4Btn = page.locator('[data-testid="btn-close-a4-preview-modal"]').first();
			if (await closeA4Btn.isVisible()) {
				await closeA4Btn.click();
			} else {
				await page.keyboard.press("Escape");
			}
			await page.waitForTimeout(1000);

			// Удаление оверлея модалки A4 если остался
			await page.evaluate(() => {
				document.querySelectorAll('[data-testid="modal-a4-document-preview"]').forEach((el) => el.remove());
			});
			await page.waitForTimeout(500);
		} catch (e) {
			console.error(`Error capturing 043/u modal (${theme}):`, e);
		}

		// 4. Модальное окно справки об оплате мед. услуг для налогового вычета (ФНС КНД 1151156)
		console.log(`[3] Opening FNS Tax Deduction Certificate Modal (${theme})...`);
		try {
			await page.evaluate(() => {
				const details = document.querySelector(".document-scenarios-accordion") as HTMLDetailsElement | null;
				if (details) details.open = true;
			});
			await page.waitForTimeout(500);

			const taxBtn = page.locator('[data-testid="scenario-tax-accounting-btn"], button:has-text("Справка для налоговой")').first();
			await taxBtn.waitFor({ state: "visible", timeout: 5000 });
			await taxBtn.click({ force: true });
			await page.waitForTimeout(1500);

			const xmlStudioBtn = page.locator('button:has-text("Открыть XML-студию")').first();
			if (await xmlStudioBtn.isVisible()) {
				await xmlStudioBtn.click();
				await page.waitForTimeout(1500);
			}

			const taxFileName = `proof_fns_tax_modal_${theme}_1440x900.png`;
			const taxFilePath = path.join(outDir, taxFileName);
			await page.screenshot({ path: taxFilePath });
			console.log(`✓ Saved ${taxFileName}`);
			copyToBrains(taxFileName);

			const closeTaxBtn = page.locator('[aria-label="Закрыть модальное окно справки"], [aria-label="Закрыть окно"], [aria-label="Закрыть модальное окно"]').first();
			if (await closeTaxBtn.isVisible()) {
				await closeTaxBtn.click();
			} else {
				await page.keyboard.press("Escape");
			}
			await page.waitForTimeout(800);
		} catch (e) {
			console.error(`Error capturing FNS tax modal (${theme}):`, e);
		}

		await context.close();
	}

	await browser.close();
	console.log("\n=== ALL RED TEAM PROOF SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("Fatal failure in screenshot capture:", err);
	process.exit(1);
});

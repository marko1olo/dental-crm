import { chromium } from "playwright";
import * as path from "node:path";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";

async function main() {
	console.log("=== INQUISITOR PROOFS: CAPTURING DIGITAL SIGNATURE & ACT PROOFS (1440x900) ===");

	const outDir = path.resolve("docs/screenshots/monolith_inquisition_proofs");
	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	const artifactDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\022e6137-e0d9-4644-9f56-a7d0a18a8229";

	const copyToArtifacts = (fileName: string) => {
		const filePath = path.join(outDir, fileName);
		if (!existsSync(filePath)) return;
		if (existsSync(artifactDir)) {
			copyFileSync(filePath, path.join(artifactDir, fileName));
		}
	};

	// 1. Provision / Authenticate against live Fastify API
	const uniqueId = Date.now();
	const email = `inquisitor-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[AUTH] Initializing authentic clinic session: ${email}`);
	const initRes = await fetch("http://127.0.0.1:4100/api/auth/setup/init", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматологическая клиника ДЕНТЕ",
			email,
			password,
			ownerName: "Д-р Смирнов Алексей Викторович",
			ownerPin,
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Failed setup/init: HTTP ${initRes.status} - ${await initRes.text()}`);
	}
	const initData = (await initRes.json()) as any;

	const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff/unlock", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Failed staff/unlock: HTTP ${unlockRes.status} - ${await unlockRes.text()}`);
	}
	const unlockData = (await unlockRes.json()) as any;

	const authData = {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		user: {
			id: initData.ownerUserId,
			fullName: "Д-р Смирнов Алексей Викторович",
			role: "owner",
		},
	};

	console.log(`✓ Authenticated successfully as ${authData.user.fullName} (${authData.user.role})`);

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
		});
		const page = await context.newPage();

		// Set live tokens and theme
		await page.addInitScript(
			({ th, cToken, sToken, uObj }) => {
				localStorage.setItem("dente_theme", th);
				document.documentElement.setAttribute("data-theme", th);
				if (th === "dark") {
					document.documentElement.classList.add("dark");
				} else {
					document.documentElement.classList.remove("dark");
				}
				localStorage.setItem("dente_clinic_token", cToken);
				localStorage.setItem("dente_staff_token", sToken);
				localStorage.setItem("dente_workspace_perspective", "owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_active_staff_user", JSON.stringify(uObj));
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
					dismissed: true,
					step: "done",
				}));
			},
			{
				th: theme,
				cToken: authData.clinicToken,
				sToken: authData.staffToken,
				uObj: authData.user,
			},
		);

		// [1] Treatment Plan Completed Act Print Preview with honest QR & signature status
		console.log(`[1] Navigating to http://127.0.0.1:5173/treatment_act_preview.html?theme=${theme}...`);
		await page.goto(`http://127.0.0.1:5173/treatment_act_preview.html?theme=${theme}`, {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await page.waitForTimeout(1500);

		// Scroll to signature zone so that QR code, honest draft status and paper signature lines are visible
		try {
			const signZone = page.locator(".doc-sign-zone");
			if (await signZone.isVisible()) {
				await signZone.scrollIntoViewIfNeeded();
				await page.waitForTimeout(500);
			}
		} catch (e) {
			console.warn("Could not scroll to .doc-sign-zone:", e);
		}

		const actFileName = `proof_treatment_plan_act_${theme}_1440x900.png`;
		const actFilePath = path.join(outDir, actFileName);
		await page.screenshot({ path: actFilePath });
		console.log(`✓ Saved ${actFileName}`);
		copyToArtifacts(actFileName);

		// [2] Documents Registry Tab via authenticated session
		console.log(`[2] Navigating to http://127.0.0.1:5173/ (${theme})...`);
		await page.goto("http://127.0.0.1:5173/", {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await page.waitForTimeout(1000);

		const demoBtn = page.locator('.auth-demo-btn');
		if (await demoBtn.isVisible()) {
			console.log("Clicking Demo Tour button...");
			await demoBtn.click();
			await page.waitForTimeout(1000);
			const launchBtn = page.locator('.auth-demo-tour-actions button.auth-submit-btn');
			if (await launchBtn.isVisible()) {
				console.log("Launching demo tour...");
				await launchBtn.click();
				await page.waitForTimeout(3000);
			}
		}

		console.log(`Switching view to documents (${theme})...`);
		await page.evaluate(() => {
			window.location.hash = "documents";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await page.waitForTimeout(3000);

		const tabFileName = `proof_documents_tab_${theme}_1440x900.png`;
		const tabFilePath = path.join(outDir, tabFileName);
		await page.screenshot({ path: tabFilePath });
		console.log(`✓ Saved ${tabFileName}`);
		copyToArtifacts(tabFileName);

		await context.close();
	}

	await browser.close();
	console.log("\n=== ALL INQUISITION PROOF SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("Fatal failure in screenshot capture:", err);
	process.exit(1);
});

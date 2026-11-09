import path from "node:path";
import fs from "node:fs";
import { capture4StateProof } from "./lib/visualProofEngine.mjs";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/a686cc50-a6c0-4cb9-8311-4f51497018c9";
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/emr";

async function main() {
	console.log("=== Starting Master EMR Visit 4-State Proof Capture ===");

	const results = await capture4StateProof({
		domain: "emr",
		screenName: "visit_soap_emk",
		hashRoute: "#visit",
		baseUrl: "http://127.0.0.1:5173/?demo=true",
		outputDir: OUT_DIR,
		brainDir: BRAIN_DIR,
		minBytes: 20480,
		actionBeforeCapture: async (page, { state, isMobile }) => {
			// Suppress tour modals
			await page.evaluate(() => {
				const style = document.createElement("style");
				style.innerHTML = `
					.tour-spotlight-root, .tour-backdrop-clickable-zone,
					[data-testid="guided-tour-spotlight-overlay"],
					[data-testid="guided-tour-coach-mark-card"],
					[data-testid="demo-mode-banner"], .global-toast-container { display: none !important; }
				`;
				document.head.appendChild(style);
			}).catch(() => {});

			// If on intake screen, start visit
			const nextBtn = page.locator('button:has-text("Пригласить следующего"), button:has-text("Начать прием"), button:has-text("Начать приём"), .visit-intake-card').first();
			if (await nextBtn.isVisible().catch(() => false)) {
				console.log("   Clicking start visit button...");
				await nextBtn.click().catch(() => {});
				await page.waitForTimeout(1500);
			}

			// Switch to "Дневник приёма" tab
			const diaryTab = page.locator('button:has-text("Дневник приёма"), button:has-text("Дневник"), [data-testid="visit-subtab-emk"]').first();
			if (await diaryTab.isVisible().catch(() => false)) {
				console.log("   Clicking 'Дневник приёма' tab...");
				await diaryTab.click().catch(() => {});
				await page.waitForTimeout(1200);
			}
		},
	});

	// Also create canonical numbered filenames expected by Red Team audits
	const numberMap = {
		"visit_soap_emk_pc_light_1440x900.png": "01_visit_soap_emk_pc_light_1440x900.png",
		"visit_soap_emk_pc_dark_1440x900.png": "02_visit_soap_emk_pc_dark_1440x900.png",
		"visit_soap_emk_mobile_light_390x844.png": "03_visit_soap_emk_mobile_light_390x844.png",
		"visit_soap_emk_mobile_dark_390x844.png": "04_visit_soap_emk_mobile_dark_390x844.png",
	};

	for (const [srcName, dstName] of Object.entries(numberMap)) {
		const srcPath = path.join(OUT_DIR, srcName);
		const dstPath = path.join(OUT_DIR, dstName);
		if (fs.existsSync(srcPath)) {
			fs.copyFileSync(srcPath, dstPath);
			const brainDst = path.join(BRAIN_DIR, dstName);
			fs.copyFileSync(srcPath, brainDst);
			console.log(`   ✓ Mirrored: ${dstName} (${(fs.statSync(dstPath).size / 1024).toFixed(1)} KB)`);
		}
	}

	console.log("=== Master EMR Visit 4-State Proof Capture Completed Successfully ===");
}

main().catch((err) => {
	console.error("[FATAL ERROR in capture-emr-master-proofs]:", err);
	process.exit(1);
});

/**
 * scripts/generate_mandible_live_proof.mjs
 * Generates 4-state live screenshots of full mandible arch (48..41 | 31..38).
 * Mandate 8b <= 120 lines.
 */

import React from "react";
globalThis.React = React;
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { ToothMandibleFullArch } from "../apps/web/src/components/odontogram/gate0/mandible/index.ts";
import { launchBrowser } from "./gate0/gate0BrowserHelper.mjs";
import { composeMandibleProof } from "./mandible/mandibleProofComposite.mjs";
import { buildMandibleProofHtml, CLINICAL_MANDIBLE_DATA } from "./mandible/mandibleProofData.mjs";

const ORCHESTRATOR_BRAIN = "C:/Users/Admin/.gemini/antigravity/brain/a6f2b5ab-6bb4-4d96-af8a-9006a477cf49";
const OUT_DIR = resolve("docs/proofs/odontogram/mandible");
const SCRATCH_DIR = resolve("scratch");

for (const dir of [OUT_DIR, ORCHESTRATOR_BRAIN, SCRATCH_DIR]) {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function renderArchHtml(isDark) {
	const markup = renderToStaticMarkup(
		React.createElement(ToothMandibleFullArch, {
			teethData: CLINICAL_MANDIBLE_DATA,
			selectedTooth: 46,
			isDark,
			zoom: 0.52,
			badgeRadius: 11,
		}),
	);
	const subtitle = isDark ? "Темная тема · Dark Theme" : "Светлая тема · Light Theme";
	return buildMandibleProofHtml(markup, isDark, subtitle);
}

async function run() {
	console.log("[Mandible Proof] Rendering HTML files...");
	const lightHtmlPath = resolve(SCRATCH_DIR, "mandible_light.html");
	const darkHtmlPath = resolve(SCRATCH_DIR, "mandible_dark.html");
	writeFileSync(lightHtmlPath, renderArchHtml(false), "utf8");
	writeFileSync(darkHtmlPath, renderArchHtml(true), "utf8");

	console.log("[Mandible Proof] Launching browser...");
	const browser = await launchBrowser();
	try {
		const pcLightPng = resolve(OUT_DIR, "mandible_pc_light_1440x900.png");
		const pcDarkPng = resolve(OUT_DIR, "mandible_pc_dark_1440x900.png");
		const mobLightPng = resolve(OUT_DIR, "mandible_mobile_light_390x844.png");
		const mobDarkPng = resolve(OUT_DIR, "mandible_mobile_dark_390x844.png");

		const pcPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await pcPage.goto(`file:///${lightHtmlPath.replace(/\\/g, "/")}`);
		await pcPage.screenshot({ path: pcLightPng });

		await pcPage.goto(`file:///${darkHtmlPath.replace(/\\/g, "/")}`);
		await pcPage.screenshot({ path: pcDarkPng });
		await pcPage.close();

		const mobPage = await browser.newPage({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		await mobPage.goto(`file:///${lightHtmlPath.replace(/\\/g, "/")}`);
		await mobPage.screenshot({ path: mobLightPng });

		await mobPage.goto(`file:///${darkHtmlPath.replace(/\\/g, "/")}`);
		await mobPage.screenshot({ path: mobDarkPng });
		await mobPage.close();

		const masterProofPath = resolve(ORCHESTRATOR_BRAIN, "mandible_arch_live_proof.png");
		console.log("[Mandible Proof] Composing 4-state master infographic...");
		await composeMandibleProof({
			pcLightPath: pcLightPng,
			pcDarkPath: pcDarkPng,
			mobileLightPath: mobLightPng,
			mobileDarkPath: mobDarkPng,
			outPath: masterProofPath,
		});

		const sz = statSync(masterProofPath).size;
		console.log(`[Mandible Proof] Success! Master proof saved: ${masterProofPath} (${(sz / 1024).toFixed(1)} KB)`);
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Mandible Proof] Fatal error:", err);
	process.exit(1);
});

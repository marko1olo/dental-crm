/**
 * scripts/gate1/gate1BrowserHelper.mjs
 * Browser launch, overlay suppression, and stand controls.
 * Mandate 8b <= 120 lines.
 */

import { existsSync } from "node:fs";
import { chromium } from "playwright";

export async function launchBrowser() {
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const executablePath = existsSync(chromePath)
		? chromePath
		: existsSync(edgePath)
		? edgePath
		: undefined;

	return chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});
}

export async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-gate1-overlays";
			style.innerHTML = `
				vite-error-overlay,
				.global-toast-container,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="demo-mode-banner"] {
					display: none !important;
					pointer-events: none !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .global-toast-container").forEach((el) => el.remove());
		});
	} catch {}
}

export async function switchTheme(page, targetTheme) {
	await page.evaluate((target) => {
		document.documentElement.setAttribute("data-theme", target);
		if (target === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
	}, targetTheme);
	await suppressOverlays(page);
	await page.waitForTimeout(400);
}

export async function setZoom(page, zoomLevel) {
	await page.evaluate((z) => {
		const btns = Array.from(document.querySelectorAll("button")).filter(
			(b) => b.innerText.trim() === `${z}x`
		);
		if (btns.length > 0) btns[0].click();
	}, zoomLevel);
	await page.waitForTimeout(400);
}

export async function setTooth(page, toothNumber) {
	await page.evaluate((num) => {
		const targetLabel = String(num);
		const btns = Array.from(document.querySelectorAll("button")).filter(
			(b) => b.innerText.includes(targetLabel)
		);
		if (btns.length > 0) btns[0].click();
	}, toothNumber);
	await page.waitForTimeout(400);
}

export async function selectPreset(page, presetId) {
	await page.evaluate((id) => {
		const btn = document.querySelector(`button[data-preset-id="${id}"]`);
		if (btn) {
			btn.click();
		} else {
			const btns = Array.from(document.querySelectorAll("button"));
			const match = btns.find((b) => b.innerText.toLowerCase().includes(id.toLowerCase()));
			if (match) match.click();
		}
	}, presetId);
	await page.waitForTimeout(400);
}

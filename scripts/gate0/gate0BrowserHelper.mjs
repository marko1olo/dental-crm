/**
 * scripts/gate0/gate0BrowserHelper.mjs
 * Browser launch, overlay suppression, and stand controls for Gate 0 Tooth 46.
 * Mandate 8b <= 120 lines.
 */

import { existsSync } from "node:fs";
import { chromium } from "playwright";

export async function launchBrowser() {
	const chromePath =
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const edgePath =
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
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
			style.id = "suppress-gate0-overlays";
			style.innerHTML = `
				vite-error-overlay, .global-toast-container,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="demo-mode-banner"] { display: none !important; pointer-events: none !important; }
				*, *::before, *::after { animation: none !important; transition: none !important; }
			`;
			document.head.appendChild(style);
			document
				.querySelectorAll("vite-error-overlay, .global-toast-container")
				.forEach((el) => el.remove());
		});
	} catch {}
}

export async function switchTheme(page, targetTheme) {
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			await page.evaluate((target) => {
				const btn = Array.from(document.querySelectorAll("button")).find(
					(b) => {
						const t = b.innerText.trim();
						return (
							t === "Светлая" || t === "Тёмная" || t === "Dark" || t === "Light"
						);
					},
				);
				if (btn) {
					const isDark =
						btn.innerText.trim() === "Тёмная" ||
						btn.innerText.trim() === "Dark";
					if ((target === "dark" && !isDark) || (target === "light" && isDark))
						btn.click();
				}
				document.documentElement.setAttribute("data-theme", target);
				document.documentElement.classList.toggle("dark", target === "dark");
				document.documentElement.classList.toggle("light", target === "light");
			}, targetTheme);
			await suppressOverlays(page);
			await page.waitForTimeout(300);
			return;
		} catch (err) {
			if (attempt === 3) throw err;
			await page.waitForTimeout(350);
		}
	}
}

export async function setZoom(page, zoomLevel) {
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			await page.evaluate((z) => {
				const btns = Array.from(document.querySelectorAll("button")).filter(
					(b) => b.innerText.trim() === `${z}x`,
				);
				if (btns.length > 0) btns[0].click();
			}, zoomLevel);
			await page.waitForTimeout(300);
			return;
		} catch (err) {
			if (attempt === 3) throw err;
			await page.waitForTimeout(350);
		}
	}
}

export async function selectPreset(page, presetId) {
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			await page.evaluate((id) => {
				const btn = document.querySelector(`button[data-preset-id="${id}"]`);
				if (btn) return btn.click();
				const match = Array.from(document.querySelectorAll("button")).find(
					(b) => b.innerText.toLowerCase().includes(id.toLowerCase()),
				);
				if (match) match.click();
			}, presetId);
			await page.waitForTimeout(350);
			return;
		} catch (err) {
			if (attempt === 3) throw err;
			await page.waitForTimeout(350);
		}
	}
}

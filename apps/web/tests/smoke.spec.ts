import { expect, test } from "@playwright/test";

test("Smoke test - Main page loads without errors", async ({ page }) => {
	const errors: string[] = [];

	page.on("pageerror", (err) => {
		errors.push(`PageError: ${err.message}\nStack: ${err.stack}`);
		console.log("PAGE ERROR:", err.message, err.stack);
	});

	page.on("console", (msg) => {
		if (msg.type() === "error") {
			const text = msg.text();
			const location = msg.location();
			const fullError = `${text} at ${location.url}:${location.lineNumber}:${location.columnNumber}`;
			errors.push(fullError);
			console.log("BROWSER ERROR:", fullError);
		}
	});

	console.log("Navigating to http://127.0.0.1:5173...");
	await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });

	console.log("Taking screenshot...");
	try {
		await page.screenshot({
			path: "C:/Users/Admin/.gemini/antigravity/brain/a4816d4c-324b-4377-a1a5-7447446ea0af/screenshot_main.png",
			fullPage: false,
			animations: "disabled",
			timeout: 15000,
		});
	} catch (_e) {
		console.log("Screenshot timed out or failed, ignoring.");
	}

	console.log("Checking for errors...");
	if (errors.length > 0) {
		console.error("Found errors:", errors);
	}

	expect(errors).toEqual([]);
});

import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (m) => console.log(`[CONSOLE ${m.type()}]:`, m.text()));
page.on("pageerror", (e) => console.log("[PAGE ERROR]:", e.stack || e.message));

await page.goto("http://127.0.0.1:5174/?demo=true#pricelist", { waitUntil: "commit" });

const renderResult = await page.evaluate(async () => {
	try {
		const React = await import("react");
		const ReactDOM = await import("react-dom/client");
		const { AppShell } = await import("/src/AppShell.tsx");

		const testDiv = document.createElement("div");
		testDiv.id = "test-shell-root";
		document.body.appendChild(testDiv);

		const root = ReactDOM.createRoot(testDiv);
		root.render(React.createElement(AppShell));
		return { success: true };
	} catch (e) {
		return { success: false, error: e.message, stack: e.stack };
	}
});

console.log("Render result:", JSON.stringify(renderResult, null, 2));
await page.waitForTimeout(3000);

const domCheck = await page.evaluate(() => {
	return {
		hasTestRoot: !!document.getElementById("test-shell-root"),
		testRootHtml: document.getElementById("test-shell-root")?.innerHTML.slice(0, 500),
		hasPricelistModal: !!document.querySelector('[data-testid="service-pricelist-studio-modal"]'),
		allModals: Array.from(document.querySelectorAll('[role="dialog"]')).map((d) => d.className),
	};
});

console.log("DOM check:", JSON.stringify(domCheck, null, 2));
await browser.close();

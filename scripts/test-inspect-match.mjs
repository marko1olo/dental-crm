import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (m) => console.log("LOG:", m.text()));
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

let reqCount = 0;
let respCount = 0;
const pendingUrls = new Set();
page.on("request", (req) => {
	reqCount++;
	pendingUrls.add(req.url());
});
page.on("response", (res) => {
	respCount++;
	pendingUrls.delete(res.url());
});

console.log("Navigating...");
await page.goto("http://127.0.0.1:5173/?stand=pricelist#pricelist", { waitUntil: "commit" });

for (let i = 0; i < 35; i++) {
	await page.waitForTimeout(1000);
	const res = await page.evaluate(() => {
		const root = document.querySelector("#root");
		const modal = document.querySelector(".pricelist-studio-modal, [data-testid=\"service-pricelist-studio-modal\"]");
		const bootState = document.querySelector(".boot-state");
		return {
			rootChildren: root ? root.children.length : 0,
			hasModal: !!modal,
			firstTag: root && root.firstElementChild ? root.firstElementChild.className : null,
			bootText: bootState ? bootState.innerText.replace(/\n+/g, " ") : null,
		};
	});
	const pendingSample = Array.from(pendingUrls).slice(0, 3).map(u => u.split("/").slice(-2).join("/"));
	console.log(`[T+${i + 1}s] reqs: ${reqCount}, resps: ${respCount}, pending: ${pendingUrls.size} (${pendingSample.join(", ")}) status:`, JSON.stringify(res));
	if (i === 25) {
		const htmlDump = await page.evaluate(() => {
			return {
				body: document.body.innerHTML.slice(0, 1000),
				root: document.querySelector("#root")?.innerHTML.slice(0, 500),
				allModals: Array.from(document.querySelectorAll("[role='dialog'], .pricelist-studio-modal, [class*='modal']")).map(el => el.className),
			};
		});
		console.log("HTML DUMP AT T+26s:", JSON.stringify(htmlDump, null, 2));
	}
}
await browser.close();

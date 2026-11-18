import { chromium } from "playwright";

async function inspect() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage();
	await page.goto("http://127.0.0.1:5173/?standalone=doctor-payroll-report#doctor-payroll-report", {
		waitUntil: "commit",
	});
	await page.waitForSelector('[data-testid="doctor-payroll-report"]');
	
	const debugInfo = await page.evaluate(() => {
		const el1 = document.querySelector('[data-testid="payroll-role-doctors"]');
		const el2 = document.querySelector('[data-testid="payroll-role-assistants"]');
		const rect1 = el1?.getBoundingClientRect();
		const rect2 = el2?.getBoundingClientRect();
		const style1 = el1 ? window.getComputedStyle(el1) : null;
		const style2 = el2 ? window.getComputedStyle(el2) : null;
		
		// Find any elements overlapping rect2
		const elementsAtPoint = rect2 ? document.elementsFromPoint(rect2.left + 10, rect2.top + 10) : [];
		
		return {
			el1: {
				html: el1?.outerHTML,
				rect: rect1,
				bg: style1?.backgroundColor,
				color: style1?.color,
				classes: el1?.className
			},
			el2: {
				html: el2?.outerHTML,
				rect: rect2,
				bg: style2?.backgroundColor,
				color: style2?.color,
				classes: el2?.className
			},
			elementsAtPoint: elementsAtPoint.map(e => ({ tag: e.tagName, id: e.id, class: e.className, testid: e.getAttribute('data-testid') }))
		};
	});
	
	console.log("DEBUG INFO:", JSON.stringify(debugInfo, null, 2));
	await browser.close();
}

inspect().catch(console.error);

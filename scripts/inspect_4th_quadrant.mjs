import { chromium } from "playwright";

async function inspect() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-web-security",
			"--ignore-gpu-blocklist",
			"--use-gl=angle",
			"--enable-webgl",
			"--disable-dev-shm-usage",
		],
	});

	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
			activeTrackId: "solo_doctor",
			currentStepIndex: 0,
			completedStepIds: ["schedule_booking", "odontogram_formula", "visit_diary_043"],
			isTourActive: false,
			isDismissedPermanently: true,
			tracksProgress: {
				solo_doctor: { completed: true, completedStepIds: ["schedule_booking", "odontogram_formula", "visit_diary_043"] },
				reception_admin: { completed: true, completedStepIds: [] },
				imaging_diagnostics: { completed: true, completedStepIds: [] },
			},
		}));
	});

	await page.goto("http://127.0.0.1:5173/#imaging");
	await page.waitForTimeout(1500);

	await page.addStyleTag({
		content: `.tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay'] { display: none !important; }`
	});

	const btn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await btn.click({ force: true });
	await page.waitForTimeout(2000);

	const demoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	if (await demoBtn.isVisible()) {
		await demoBtn.click({ force: true });
		await page.waitForTimeout(3000);
	}

	const info = await page.evaluate(() => {
		const canvas = document.querySelector("[data-testid='cbct-volume-3d-canvas']");
		const container = document.querySelector("[data-testid='cbct-viewport-container-volume3d']");
		const overlayCanvas = document.querySelector("[data-testid='cbct-volume-3d-overlay-canvas']");

		function getDetails(el) {
			if (!el) return null;
			const rect = el.getBoundingClientRect();
			const cs = window.getComputedStyle(el);
			return {
				tagName: el.tagName,
				id: el.id,
				className: el.className,
				rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
				bg: cs.backgroundColor,
				color: cs.color,
				display: cs.display,
				opacity: cs.opacity,
				zIndex: cs.zIndex,
			};
		}

		// Also check all children of container
		const children = [];
		if (container) {
			for (const child of container.querySelectorAll("*")) {
				const cs = window.getComputedStyle(child);
				if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") {
					children.push({
						tag: child.tagName,
						class: child.className,
						bg: cs.backgroundColor,
					});
				}
			}
		}

		return {
			container: getDetails(container),
			canvas: getDetails(canvas),
			overlayCanvas: getDetails(overlayCanvas),
			coloredChildren: children,
		};
	});

	console.log("INSPECTION INFO:", JSON.stringify(info, null, 2));
	await browser.close();
}

inspect();

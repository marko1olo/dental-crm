import { chromium } from "playwright";

async function main() {
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
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	// Remove overlays
	await page.evaluate(() => {
		document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	});

	// Build real 312 Zakharov dataset in browser memory
	console.log("Assembling real 312 slices volume in browser...");
	const buildResult = await page.evaluate(async () => {
		const t0 = performance.now();
		const manifestRes = await fetch("/radiology/demo_cbct/manifest.json");
		const manifest = await manifestRes.json();

		const buffers = [];
		const chunkSize = 32;
		for (let c = 0; c < manifest.slices.length; c += chunkSize) {
			const chunk = manifest.slices.slice(c, c + chunkSize);
			const chunkRes = await Promise.all(
				chunk.map(async (name) => {
					const r = await fetch(`/radiology/demo_cbct/${name}`);
					const ab = await r.arrayBuffer();
					return { name, buffer: ab };
				}),
			);
			buffers.push(...chunkRes);
		}

		function parseHeader(buf) {
			const view = new DataView(buf);
			const len = buf.byteLength;
			let rows = 600;
			let cols = 600;
			let sliceLocationZ = 0;
			let instanceNumber = 1;
			let pixelSpacingX = 0.25;
			let pixelSpacingY = 0.25;
			let sliceThickness = 0.25;
			let pixelDataOffset = -1;
			let pixelDataLength = 0;

			for (let i = 128; i < Math.min(len - 8, 131072); i += 2) {
				if (pixelDataOffset > 0 && i >= pixelDataOffset - 4) break;
				const g = view.getUint16(i, true);
				const e = view.getUint16(i + 2, true);
				if (g === 0) continue;

				const c0 = view.getUint8(i + 4);
				const c1 = view.getUint8(i + 5);
				const isExp = c0 >= 65 && c0 <= 90 && c1 >= 65 && c1 <= 90;
				const vr = isExp ? String.fromCharCode(c0, c1) : "";

				let tagLen = 0;
				let tagValOff = 0;
				if (isExp) {
					if (["OB", "OW", "OF", "OD", "OL", "OV", "SV", "UV", "SQ", "UC", "UR", "UT", "UN"].includes(vr)) {
						tagLen = view.getUint32(i + 8, true);
						tagValOff = i + 12;
					} else {
						tagLen = view.getUint16(i + 6, true);
						tagValOff = i + 8;
					}
				} else {
					tagLen = view.getUint32(i + 4, true);
					tagValOff = i + 8;
				}

				if (tagLen < 0 || tagValOff + tagLen > len) continue;

				if (g === 0x0028 && e === 0x0010) rows = view.getUint16(tagValOff, true);
				else if (g === 0x0028 && e === 0x0011) cols = view.getUint16(tagValOff, true);
				else if (g === 0x0028 && e === 0x0030) {
					try {
						const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
						const pts = s.split("\\").map((p) => parseFloat(p.trim()));
						if (pts.length >= 2 && pts[0] > 0 && pts[1] > 0) {
							pixelSpacingY = pts[0];
							pixelSpacingX = pts[1];
						}
					} catch {}
				} else if (g === 0x0018 && e === 0x0050) {
					try {
						const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
						const num = parseFloat(s);
						if (!isNaN(num) && num > 0) sliceThickness = num;
					} catch {}
				} else if (g === 0x0020 && e === 0x0013) {
					try {
						const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
						const n = parseInt(s, 10);
						if (!isNaN(n)) instanceNumber = n;
					} catch {}
				} else if (g === 0x0020 && e === 0x0032) {
					try {
						const s = new TextDecoder("ascii").decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
						const pts = s.split("\\").map((p) => parseFloat(p.trim()));
						if (pts.length >= 3 && !isNaN(pts[2])) sliceLocationZ = pts[2];
					} catch {}
				} else if (g === 0x7fe0 && e === 0x0010) {
					pixelDataOffset = tagValOff;
					pixelDataLength = tagLen;
					break;
				}
			}

			if (pixelDataOffset === -1) {
				pixelDataOffset = len - rows * cols * 2;
				pixelDataLength = rows * cols * 2;
			}

			return { rows, cols, pixelSpacingX, pixelSpacingY, sliceThickness, instanceNumber, sliceLocationZ, pixelDataOffset, pixelDataLength };
		}

		const validEntries = [];
		for (const b of buffers) {
			const h = parseHeader(b.buffer);
			if (h.rows === 600 && h.cols === 600) {
				validEntries.push({ header: h, buffer: b.buffer, name: b.name });
			}
		}

		validEntries.sort((a, b) => a.header.sliceLocationZ - b.header.sliceLocationZ);

		const width = 600;
		const height = 600;
		const depth = validEntries.length;
		const sliceCount = width * height;
		const voxelData = new Int16Array(width * height * depth);

		let minHU = 32767;
		let maxHU = -32768;

		for (let z = 0; z < depth; z++) {
			const entry = validEntries[z];
			const raw = new Uint16Array(entry.buffer, entry.header.pixelDataOffset, sliceCount);
			const base = z * sliceCount;
			for (let i = 0; i < sliceCount; i++) {
				const hu = (raw[i] || 0) - 1000;
				voxelData[base + i] = hu;
				if (hu < minHU) minHU = hu;
				if (hu > maxHU) maxHU = hu;
			}
		}

		const ref = validEntries[0].header;
		const physicalWidthMm = width * ref.pixelSpacingX;
		const physicalHeightMm = height * ref.pixelSpacingY;
		const physicalDepthMm = depth * ref.sliceThickness;

		const liveVolume = {
			id: `real-zakharov-${Date.now()}`,
			dimensions: { width, height, depth },
			spacingMm: { x: ref.pixelSpacingX, y: ref.pixelSpacingY, z: ref.sliceThickness },
			originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5, z: -physicalDepthMm * 0.5 },
			physicalSizeMm: { x: physicalWidthMm, y: physicalHeightMm, z: physicalDepthMm },
			data: voxelData,
			minHU,
			maxHU,
			rescaleSlope: 1.0,
			rescaleIntercept: -1000,
			defaultWindowWidth: 4400,
			defaultWindowLevel: 1300,
			isDisposed: false,
		};

		window.__cbctDemoVolume = liveVolume;
		return { slices: depth, dimensions: `${width}x${height}x${depth}`, elapsedMs: performance.now() - t0 };
	});
	console.log("Volume assembled:", buildResult);

	// Click to open modal
	await page.evaluate(() => {
		const btn = document.querySelector("[data-testid='imaging-open-3d-mpr']");
		if (btn) btn.click();
	});

	const modal = page.locator("[data-testid='cbct-studio-modal']");
	await modal.waitFor({ state: "visible", timeout: 15000 });
	console.log("Modal opened!");

	// Inject Volume
	await page.evaluate(() => {
		if (window.__cbctDemoVolume) {
			window.dispatchEvent(new CustomEvent("dente-load-cbct-volume", { detail: window.__cbctDemoVolume }));
		}
	});

	await page.waitForTimeout(3000);

	const dropzone = page.locator("[data-testid='cbct-empty-volume-dropzone']");
	console.log("Is dropzone visible:", await dropzone.isVisible());

	await page.screenshot({ path: "test_volume_rendered.png" });
	console.log("Captured test_volume_rendered.png!");
	await browser.close();
}

main().catch(console.error);

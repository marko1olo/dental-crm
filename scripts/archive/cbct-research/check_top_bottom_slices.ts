import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const validSlices = manifest.slices.filter(
	(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
);

const width = 600;
const height = 600;
const sliceCount = width * height;

async function renderCheck() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 800, height: 450 } });

	const sLow = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[15]));
	const rawLow = new Uint16Array(sLow.buffer, sLow.byteOffset + sLow.byteLength - sliceCount * 2, sliceCount);

	const sHigh = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[290]));
	const rawHigh = new Uint16Array(sHigh.buffer, sHigh.byteOffset + sHigh.byteLength - sliceCount * 2, sliceCount);

	function makeRgba(raw: Uint16Array) {
		const rgba = new Uint8ClampedArray(sliceCount * 4);
		for (let i = 0; i < sliceCount; i++) {
			const hu = raw[i] - 1000;
			let norm = (hu - (-500)) / (2000 - (-500));
			if (norm < 0) norm = 0;
			if (norm > 1) norm = 1;
			const v = Math.round(norm * 255);
			rgba[i * 4] = v;
			rgba[i * 4 + 1] = v;
			rgba[i * 4 + 2] = v;
			rgba[i * 4 + 3] = 255;
		}
		return Array.from(rgba);
	}

	const rgbaLow = makeRgba(rawLow);
	const rgbaHigh = makeRgba(rawHigh);

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<body style="margin:0; background:#111; color:#fff; font-family:sans-serif; display:flex; gap:20px; padding:20px;">
			<div>
				<h3>Slice 15 (Z = -35 mm)</h3>
				<canvas id="c1" width="600" height="600" style="width:350px;"></canvas>
			</div>
			<div>
				<h3>Slice 290 (Z = +33.5 mm)</h3>
				<canvas id="c2" width="600" height="600" style="width:350px;"></canvas>
			</div>
			<script>
				const c1 = document.getElementById("c1").getContext("2d");
				const im1 = c1.createImageData(600, 600);
				im1.data.set(new Uint8ClampedArray(${JSON.stringify(rgbaLow)}));
				c1.putImageData(im1, 0, 0);

				const c2 = document.getElementById("c2").getContext("2d");
				const im2 = c2.createImageData(600, 600);
				im2.data.set(new Uint8ClampedArray(${JSON.stringify(rgbaHigh)}));
				c2.putImageData(im2, 0, 0);
			</script>
		</body>
		</html>
	`);

	await page.waitForTimeout(500);
	await page.screenshot({ path: "docs/screenshots/cbct_live/check_top_bottom_slices.png" });
	await browser.close();
	console.log("Screenshot written to docs/screenshots/cbct_live/check_top_bottom_slices.png");
}

renderCheck().catch(console.error);

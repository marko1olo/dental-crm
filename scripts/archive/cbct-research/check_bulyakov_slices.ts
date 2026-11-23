import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";

async function main() {
	const filePath = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const rawBuf = readFileSync(filePath);
	const arrayBuf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);

	const zLevels = [1.9, 6.0, 9.0, 11.5];
	const width = vol.dimensions.width;
	const height = vol.dimensions.height;

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const page = await browser.newPage({ viewport: { width: 900, height: 900 } });

	const slabsData = zLevels.map((z) => {
		const slab = extractAxialMIPSlab(vol, z, 4.0);
		const wl = 1100;
		const ww = 2800;
		const low = wl - ww / 2;
		const high = wl + ww / 2;
		const rgba = new Uint8ClampedArray(width * height * 4);
		for (let i = 0; i < width * height; i++) {
			const hu = slab.data[i] ?? -1000;
			let norm = (hu - low) / (high - low);
			if (norm < 0) norm = 0;
			if (norm > 1) norm = 1;
			const v = Math.round(norm * 255);
			const idx = i * 4;
			rgba[idx] = v;
			rgba[idx + 1] = v;
			rgba[idx + 2] = v;
			rgba[idx + 3] = 255;
		}
		return { z, bytes: Array.from(rgba) };
	});

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<body style="background:#09090b; color:#fff; display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:10px;">
			${slabsData.map((s, idx) => `
				<div>
					<h3>Z = ${s.z} mm</h3>
					<canvas id="c-${idx}" width="${width}" height="${height}" style="width:100%; border:1px solid #333;"></canvas>
				</div>
			`).join("")}
			<script>
				const slabs = ${JSON.stringify(slabsData)};
				const w = ${width};
				const h = ${height};
				slabs.forEach((s, idx) => {
					const c = document.getElementById("c-" + idx);
					const ctx = c.getContext("2d");
					const img = ctx.createImageData(w, h);
					img.data.set(new Uint8ClampedArray(s.bytes));
					ctx.putImageData(img, 0, 0);
				});
			</script>
		</body>
		</html>
	`);

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "bulyakov_z_slices_check.png");
	await page.screenshot({ path: outPath });
	console.log(`Saved slice comparison to: ${outPath}`);

	await browser.close();
}

main().catch(console.error);

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const slices = manifest.slices;

const validSlices = slices.filter((s: string) => {
	const filePath = path.resolve("apps/web/public/radiology/demo_cbct", s);
	return readFileSync(filePath).byteLength >= 720000;
});

const width = 600;
const height = 600;
const depth = validSlices.length;
const sliceCount = width * height;
const voxelData = new Int16Array(width * height * depth);

console.log(`Loading ${depth} slices...`);
for (let z = 0; z < depth; z++) {
	const filePath = path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]);
	const fileBuffer = readFileSync(filePath);
	const rawOffset = fileBuffer.byteLength - sliceCount * 2;
	const raw = new Uint16Array(fileBuffer.buffer, fileBuffer.byteOffset + rawOffset, sliceCount);
	const base = z * sliceCount;
	for (let i = 0; i < sliceCount; i++) {
		voxelData[base + i] = (raw[i] || 0) - 1000;
	}
}

const pixelSpacing = 0.25;
const sliceThickness = 0.25;
const physicalDepthMm = depth * sliceThickness;
const physicalWidthMm = width * pixelSpacing;
const physicalHeightMm = height * pixelSpacing;

const volume: any = {
	dimensions: { width, height, depth },
	spacingMm: { x: pixelSpacing, y: pixelSpacing, z: sliceThickness },
	originMm: {
		x: -physicalWidthMm * 0.5,
		y: -physicalHeightMm * 0.5,
		z: -physicalDepthMm * 0.5,
	},
	data: voxelData,
	isDisposed: false,
};

async function main() {
	const outDir = path.resolve("docs/screenshots/cbct_live/mip_checks");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 640, height: 640 } });

	const configs = [
		{ centerZ: 0.0, thickness: 14.0, name: "old_baseline_z0_t14" },
		{ centerZ: 5.0, thickness: 14.0, name: "z5_t14" },
		{ centerZ: 5.0, thickness: 10.0, name: "z5_t10" },
		{ centerZ: 5.0, thickness: 8.0, name: "z5_t8" },
		{ centerZ: 5.0, thickness: 6.0, name: "z5_t6" },
		{ centerZ: 5.5, thickness: 6.0, name: "z5.5_t6" },
		{ centerZ: 6.0, thickness: 6.0, name: "z6_t6" },
	];

	for (const cfg of configs) {
		const mip = extractAxialMIPSlab(volume, cfg.centerZ, cfg.thickness);

		const wl = 1000;
		const ww = 2500;
		const low = wl - ww / 2;
		const high = wl + ww / 2;
		const rgba = new Uint8ClampedArray(width * height * 4);

		for (let i = 0; i < sliceCount; i++) {
			const hu = mip.data[i];
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

		await page.setContent(`
			<html>
			<body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center;">
				<canvas id="c" width="${width}" height="${height}"></canvas>
			</body>
			</html>
		`);
		await page.evaluate(({ w, h, bytes, title }) => {
			const canvas = document.getElementById("c") as HTMLCanvasElement;
			const ctx = canvas.getContext("2d")!;
			const imgData = ctx.createImageData(w, h);
			imgData.data.set(new Uint8ClampedArray(bytes));
			ctx.putImageData(imgData, 0, 0);

			ctx.font = "bold 18px monospace";
			ctx.fillStyle = "#22d3ee";
			ctx.fillText(title, 20, 35);
		}, { w: width, h: height, bytes: Array.from(rgba), title: `Z = ${cfg.centerZ}mm, Thickness = ${cfg.thickness}mm` });

		const outPath = path.join(outDir, `${cfg.name}.png`);
		const canvasEl = await page.locator("#c");
		await canvasEl.screenshot({ path: outPath });
		console.log(`Saved: ${outPath}`);
	}

	await browser.close();
}

main().catch(console.error);

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

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
const originZ = -physicalDepthMm * 0.5;

async function renderCheck(sliceIdx: number, title: string, filename: string) {
	const base = sliceIdx * sliceCount;
	const wl = 1000, ww = 2500;
	const low = wl - ww / 2, high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(width * height * 4);

	for (let i = 0; i < sliceCount; i++) {
		const hu = voxelData[base + i];
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

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 640, height: 640 } });

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

		ctx.font = "bold 20px monospace";
		ctx.fillStyle = "#22d3ee";
		ctx.fillText(title, 20, 35);
	}, { w: width, h: height, bytes: Array.from(rgba), title });

	const outDir = path.resolve("docs/screenshots/cbct_live/slice_checks");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, filename);

	const canvasEl = await page.locator("#c");
	await canvasEl.screenshot({ path: outPath });
	console.log(`Saved: ${outPath}`);

	await browser.close();
}

async function main() {
	await renderCheck(184, "Slice 184 (Z = +7.0 mm)", "slice_184_z7.png");
	await renderCheck(186, "Slice 186 (Z = +7.5 mm)", "slice_186_z7.5.png");
}

main().catch(console.error);
